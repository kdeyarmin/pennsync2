import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * redriveFailedSms — cron "outbox" that re-sends outbound texts which failed for
 * a TRANSIENT reason (timeout / network / 429 / 5xx). Configure a schedule
 * (e.g. every 10 minutes) in the Base44 dashboard. Enable only ONE schedule.
 *
 * Each eligible row is re-sent with its ORIGINAL client_message_id, so 8x8
 * de-dups if the first attempt actually landed — no double-send. An attempt cap,
 * an escalating backoff between attempts, and an age ceiling guarantee a stuck
 * message eventually settles into a terminal 'failed' state instead of looping.
 *
 * Permanent failures (opt-out, invalid number, auth, kill switch) are never
 * retried. Bodies are never written to the audit log.
 */

const SEND_TIMEOUT_MS = 15000;
const BATCH_LIMIT = 100;

// ---- redrive eligibility (mirrors src/components/messaging/smsRedrive.js) ----
const TRANSIENT_FAILURE_PATTERNS = [
  /timed out/i, /timeout/i, /network/i, /unreachable/i, /temporar/i,
  /\b(429|500|502|503|504)\b/, /rate.?limit/i, /failed to reach/i,
  /connection/i, /EAI_AGAIN/i, /ECONN/i, /ETIMEDOUT/i, /socket/i,
];
const PERMANENT_FAILURE_PATTERNS = [
  /opted out/i, /opt.?out/i, /unsubscrib/i, /invalid/i, /\b(400|401|403|404|422)\b/,
  /blocked/i, /blacklist/i, /not configured/i, /disabled/i, /too long/i, /consent/i,
];
function isTransientFailureReason(reason: string): boolean {
  const s = String(reason || '');
  if (!s.trim()) return false;
  if (PERMANENT_FAILURE_PATTERNS.some((re) => re.test(s))) return false;
  return TRANSIENT_FAILURE_PATTERNS.some((re) => re.test(s));
}
function shouldRedriveSms(row: any, now = Date.now(), maxAttempts = 4, baseGapMs = 60_000, maxAgeMs = 24 * 60 * 60 * 1000): boolean {
  if (!row || row.status !== 'failed' || row.direction !== 'outbound') return false;
  const attempts = Number(row.retry_count) || 0;
  if (attempts >= maxAttempts) return false;
  if (!isTransientFailureReason(row.failure_reason)) return false;
  const created = new Date(row.created_date).getTime();
  if (Number.isFinite(created) && now - created > maxAgeMs) return false;
  const last = row.last_retry_at ? new Date(row.last_retry_at).getTime() : created;
  const requiredGap = baseGapMs * 2 ** attempts;
  if (Number.isFinite(last) && now - last < requiredGap) return false;
  return true;
}

async function getAgencyConfig(base44: any) {
  const settings = await base44.asServiceRole.entities.AgencySettings.list('-created_date', 1).catch(() => []);
  const s = settings[0] || {};
  return {
    smsSubAccountId: s.eight_x_eight_sms_subaccount_id,
    region: s.eight_x_eight_region || 'us',
    smsEnabled: s.sms_messaging_enabled ?? true,
  };
}

async function resolveEightXEightApiKey(base44: any): Promise<string | null> {
  const env = Deno.env.get('EIGHT_X_EIGHT_API_KEY');
  if (env && env.trim()) return env.trim();
  try {
    const rows = await base44.asServiceRole.entities.IntegrationSecret.filter({ provider: 'eight_x_eight' });
    const v = rows?.[0]?.api_secret;
    return v && String(v).trim() ? String(v).trim() : null;
  } catch {
    return null;
  }
}

async function send8x8(apiKey: string, host: string, subAccountId: string, source: string, destination: string, text: string, clientMessageId: string) {
  const url = `${host}/api/v1/subaccounts/${subAccountId}/messages`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ source, destination, text, encoding: 'AUTO', clientMessageId }),
      signal: controller.signal,
    });
    const data = await resp.json().catch(() => ({}));
    return { ok: resp.ok, status: resp.status, data };
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const apiKey = await resolveEightXEightApiKey(base44);
    const { smsSubAccountId, region, smsEnabled } = await getAgencyConfig(base44);
    const host = `https://sms.${region}.8x8.com`;
    const runId = crypto.randomUUID();
    const now = Date.now();

    const result = { scanned: 0, redriven: 0, recovered: 0, failed: 0, skipped: 0 };

    if (!apiKey || !smsSubAccountId || smsEnabled === false) {
      return Response.json({ success: true, ...result, note: 'SMS not configured or disabled — nothing redriven.' });
    }

    const failedRows = await base44.asServiceRole.entities.SmsMessage
      .filter({ status: 'failed', direction: 'outbound' }, '-created_date', BATCH_LIMIT).catch(() => []);
    result.scanned = failedRows.length;

    for (const row of failedRows) {
      if (!shouldRedriveSms(row, now)) continue;
      // Opt-out can have changed since the failure — re-check, fail closed.
      let optedOut = true;
      try {
        const consents = await base44.asServiceRole.entities.SmsConsent
          .filter({ phone_e164: row.to_number }, '-captured_at', 1);
        optedOut = consents[0]?.consent_status === 'opted_out';
      } catch {
        optedOut = true;
      }
      if (optedOut) continue;

      // Claim: flip to 'queued' with a run token, then re-read to confirm we own
      // it (guards overlapping runs). retry_count/last_retry_at advance here so a
      // crash mid-send still counts the attempt.
      const attempts = (Number(row.retry_count) || 0) + 1;
      try {
        await base44.asServiceRole.entities.SmsMessage.update(row.id, {
          status: 'queued', retry_count: attempts, last_retry_at: new Date().toISOString(), redrive_claimed_by: runId,
        });
      } catch {
        result.skipped++;
        continue;
      }
      const check = await base44.asServiceRole.entities.SmsMessage.filter({ id: row.id }, '-created_date', 1).catch(() => []);
      if (!check[0] || check[0].redrive_claimed_by !== runId) { result.skipped++; continue; }
      result.redriven++;

      // Reuse the ORIGINAL client_message_id so 8x8 de-dups a duplicate landing.
      const clientMessageId = row.client_message_id || `redrive-${row.id}`;
      let resp;
      try {
        resp = await send8x8(apiKey, host, smsSubAccountId, row.from_number, row.to_number, row.body, clientMessageId);
      } catch (netErr) {
        const aborted = (netErr as Error)?.name === 'AbortError';
        result.failed++;
        await base44.asServiceRole.entities.SmsMessage.update(row.id, {
          status: 'failed', failure_reason: aborted ? 'Timed out reaching 8x8 (redrive)' : `Network error reaching 8x8 (redrive): ${(netErr as Error).message}`,
        }).catch(() => {});
        continue;
      }

      if (!resp.ok) {
        result.failed++;
        await base44.asServiceRole.entities.SmsMessage.update(row.id, {
          status: 'failed', failure_reason: resp.data?.message || resp.data?.error || `8x8 API error (${resp.status}) (redrive)`,
        }).catch(() => {});
        continue;
      }

      result.recovered++;
      const providerStatus = (resp.data?.status?.code || '').toUpperCase();
      await base44.asServiceRole.entities.SmsMessage.update(row.id, {
        provider_message_id: resp.data?.umid || row.provider_message_id || null,
        status: providerStatus === 'DELIVERED' ? 'delivered' : 'sent',
        failure_reason: null,
        client_message_id: clientMessageId,
      }).catch(() => {});

      await base44.asServiceRole.entities.UserActivity.create({
        user_email: row.sent_by || row.nurse_email || 'system',
        action: 'sms_redriven',
        entity_type: 'SmsMessage',
        entity_id: row.id,
        details: { to_number: row.to_number, attempt: attempts, provider_message_id: resp.data?.umid || null },
        status: 'success',
      }).catch(() => {});
    }

    return Response.json({ success: true, ...result, checked_at: new Date(now).toISOString() });
  } catch (error) {
    console.error('redriveFailedSms error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});

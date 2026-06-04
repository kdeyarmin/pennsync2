import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * dispatchScheduledSms — cron job that sends due ScheduledSms rows. Configure a
 * schedule (e.g. every 5 minutes) for this function in the Base44 dashboard.
 *
 * For each pending row whose send_at has passed it: claims the row (pending ->
 * sending) so overlapping runs don't double-send, re-checks the agency kill
 * switch and the patient's opt-out at send time, sends via 8x8, records an
 * SmsMessage in the nurse's thread, and marks the ScheduledSms sent/failed.
 * Bodies are never written to the audit log.
 */

const SEND_TIMEOUT_MS = 15000;
const BATCH_LIMIT = 100;

async function getAgencyConfig(base44: any) {
  const settings = await base44.asServiceRole.entities.AgencySettings.list('-created_date', 1).catch(() => []);
  const s = settings[0] || {};
  return {
    smsSubAccountId: s.eight_x_eight_sms_subaccount_id,
    region: s.eight_x_eight_region || 'us',
    smsEnabled: s.sms_messaging_enabled ?? true,
  };
}

// ---- transient-failure retry policy (mirrors src/components/voice/eightxeightRetry.js) ----
// Retries are double-send safe: each send reuses one clientMessageId (8x8
// idempotency key). Capped at 2 attempts here so a batch of up to BATCH_LIMIT
// rows stays bounded; a row that still fails is retried on the next cron tick
// only if re-queued (otherwise it lands in 'failed' as before).
const MAX_SEND_ATTEMPTS = 2;
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUSES.has(Number(status));
}
function isRetryableError(err: any): boolean {
  if (!err) return false;
  const name = err.name || '';
  if (name === 'AbortError' || name === 'TimeoutError' || name === 'TypeError') return true;
  return /network|timeout|timed out|fetch failed|socket|ECONN|ETIMEDOUT|EAI_AGAIN|dns/i.test(err.message || '');
}
function parseRetryAfter(headerValue: string | null, nowMs = Date.now()): number | null {
  if (headerValue == null) return null;
  const raw = String(headerValue).trim();
  if (raw === '') return null;
  if (/^\d+$/.test(raw)) return Number(raw) * 1000;
  const dateMs = Date.parse(raw);
  if (!Number.isNaN(dateMs)) return Math.max(0, dateMs - nowMs);
  return null;
}
function backoffDelayMs(attempt: number, baseMs = 300, maxMs = 4000): number {
  const n = Math.max(1, Number(attempt) || 1);
  const exp = Math.min(maxMs, baseMs * 2 ** (n - 1));
  return Math.round(exp / 2 + Math.random() * (exp / 2));
}
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function sendOnce(apiKey: string, host: string, subAccountId: string, source: string, destination: string, text: string, clientMessageId: string) {
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
    return { ok: resp.ok, status: resp.status, data, retryAfter: resp.headers.get('retry-after') };
  } finally {
    clearTimeout(timer);
  }
}

async function send8x8(apiKey: string, host: string, subAccountId: string, source: string, destination: string, text: string, clientMessageId: string) {
  let lastError: any;
  for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt++) {
    let result;
    try {
      result = await sendOnce(apiKey, host, subAccountId, source, destination, text, clientMessageId);
    } catch (err) {
      if (attempt === MAX_SEND_ATTEMPTS || !isRetryableError(err)) throw err;
      lastError = err;
      await sleep(backoffDelayMs(attempt));
      continue;
    }
    if (result.ok || !isRetryableStatus(result.status) || attempt === MAX_SEND_ATTEMPTS) {
      return { ok: result.ok, status: result.status, data: result.data };
    }
    const fromHeader = parseRetryAfter(result.retryAfter ?? null);
    await sleep(fromHeader != null ? Math.min(fromHeader, 4000) : backoffDelayMs(attempt));
  }
  throw lastError || new Error('send8x8 exhausted attempts');
}

/**
 * Resolve the single 8x8 API secret: prefer the legacy backend env var, then the
 * secret the super admin saved in-app (IntegrationSecret). Either one configures
 * the integration, so the Base44 dashboard env is optional.
 */
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const apiKey = await resolveEightXEightApiKey(base44);
    const { smsSubAccountId, region, smsEnabled } = await getAgencyConfig(base44);
    const host = `https://sms.${region}.8x8.com`;

    const nowIso = new Date().toISOString();
    // Pending rows that are due. (Base44 filter operators may vary; fetch a
    // batch of pending rows and filter by time in code to stay portable.)
    const pending = await base44.asServiceRole.entities.ScheduledSms
      .filter({ status: 'pending' }, 'send_at', BATCH_LIMIT).catch(() => []);
    const due = pending.filter((r: any) => r.send_at && r.send_at <= nowIso);

    const result = { processed: 0, sent: 0, failed: 0, skipped: 0 };

    for (const row of due) {
      // Best-effort claim: flip pending -> sending so a non-overlapping next run
      // skips it. This is NOT an atomic compare-and-swap, so enable only ONE
      // schedule for this function (see docs/SECURITY-RLS-CHECKLIST.md) — two
      // overlapping runs could still double-send, like the fax processors.
      try {
        await base44.asServiceRole.entities.ScheduledSms.update(row.id, { status: 'sending' });
      } catch {
        result.skipped++;
        continue;
      }
      result.processed++;

      const fail = async (reason: string) => {
        result.failed++;
        await base44.asServiceRole.entities.ScheduledSms.update(row.id, {
          status: 'failed', failure_reason: reason, attempts: (row.attempts || 0) + 1,
        }).catch(() => {});
      };

      if (!apiKey || !smsSubAccountId) { await fail('8x8 SMS not configured'); continue; }
      if (smsEnabled === false) { await fail('SMS messaging disabled for the agency'); continue; }

      // Re-check opt-out at send time (fail closed on a read error).
      let optedOut = true;
      try {
        const consents = await base44.asServiceRole.entities.SmsConsent
          .filter({ phone_e164: row.to_number }, '-captured_at', 1);
        optedOut = consents[0]?.consent_status === 'opted_out';
      } catch {
        optedOut = true;
      }
      if (optedOut) { await fail('Recipient opted out before the scheduled send'); continue; }

      const clientMessageId = crypto.randomUUID();
      let resp;
      try {
        resp = await send8x8(apiKey, host, smsSubAccountId, row.from_number, row.to_number, row.body, clientMessageId);
      } catch (netErr) {
        const aborted = (netErr as Error)?.name === 'AbortError';
        await fail(aborted ? 'Timed out reaching 8x8' : `Network error reaching 8x8: ${(netErr as Error).message}`);
        continue;
      }

      if (!resp.ok) {
        await fail(resp.data?.message || resp.data?.error || `8x8 API error (${resp.status})`);
        continue;
      }

      const providerMessageId = resp.data?.umid || null;
      // Record the sent message in the nurse's thread so it shows in their inbox.
      const smsRow = await base44.asServiceRole.entities.SmsMessage.create({
        direction: 'outbound',
        from_number: row.from_number,
        to_number: row.to_number,
        body: row.body,
        nurse_email: row.nurse_email,
        patient_id: row.patient_id || null,
        thread_id: row.thread_id,
        status: 'sent',
        provider_message_id: providerMessageId,
        client_message_id: clientMessageId,
        is_read: true,
        sent_by: row.nurse_email,
      }).catch((err) => { console.error('scheduled SmsMessage record failed:', err); return null; });

      // The text WAS delivered, so the row is 'sent' regardless; but if we
      // couldn't write the inbox copy, note it so the gap is visible rather than
      // silently losing the conversation record.
      await base44.asServiceRole.entities.ScheduledSms.update(row.id, {
        status: 'sent',
        provider_message_id: providerMessageId,
        sent_at: new Date().toISOString(),
        sms_message_id: smsRow?.id || null,
        failure_reason: smsRow ? null : 'Sent to patient, but failed to record a copy in the nurse inbox',
        attempts: (row.attempts || 0) + 1,
      }).catch(() => {});

      await base44.asServiceRole.entities.UserActivity.create({
        user_email: row.nurse_email || 'system',
        action: 'scheduled_sms_sent',
        entity_type: 'ScheduledSms',
        entity_id: row.id,
        details: { to_number: row.to_number, from_number: row.from_number, provider_message_id: providerMessageId, body_length: (row.body || '').length },
        status: 'success',
      }).catch(() => {});
      result.sent++;
    }

    return Response.json({ success: true, ...result, checked_at: nowIso });
  } catch (error) {
    console.error('dispatchScheduledSms error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});

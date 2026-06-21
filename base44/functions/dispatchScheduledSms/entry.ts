import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * dispatchScheduledSms — cron job that sends due ScheduledSms rows. Configure a
 * schedule (e.g. every 5 minutes) for this function in the Base44 dashboard.
 *
 * For each pending row whose send_at has passed it: claims the row (pending ->
 * sending) so overlapping runs don't double-send, re-checks the agency kill
 * switch and the patient's opt-out at send time, sends via Telnyx Messages API,
 * records an SmsMessage in the nurse's thread, and marks the ScheduledSms
 * sent/failed. Bodies are never written to the audit log.
 */

const SEND_TIMEOUT_MS = 15000;
const BATCH_LIMIT = 100;
// Scheduled sends still pending this long after their send_at when the dispatcher
// runs (e.g. after cron downtime) are expired instead of delivered — a day-late
// reminder is worse than none. Mirrors redriveFailedSms' 24h ceiling.
const MAX_SCHEDULE_AGE_MS = 24 * 60 * 60 * 1000;

async function getAgencyConfig(base44: any) {
  const settings = await base44.asServiceRole.entities.AgencySettings.list('-created_date', 1).catch(() => []);
  const s = settings[0] || {};
  return {
    settings: s,
    smsEnabled: s.sms_messaging_enabled ?? true,
  };
}

// ---- transient-failure retry policy ----
// Telnyx has no client idempotency key. Therefore
// we only retry on explicit retryable HTTP statuses (408/425/429/500/502/503/504).
// We do NOT retry thrown network errors — a blind retry could double-text.
// Capped at 2 attempts here so a batch of up to BATCH_LIMIT rows stays bounded;
// a row that still fails is retried on the next cron tick only if re-queued.
const MAX_SEND_ATTEMPTS = 2;
const RETRYABLE_STATUSES = new Set([408, 425, 429, 500, 502, 503, 504]);
function isRetryableStatus(status: number): boolean {
  return RETRYABLE_STATUSES.has(Number(status));
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

async function sendOnce(apiKey: string, messagingProfileId: string | null, from: string, to: string, body: string, webhookUrl?: string) {
  const url = `https://api.telnyx.com/v2/messages`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
  try {
    const payload: Record<string, unknown> = { from, to, text: body };
    if (messagingProfileId) payload.messaging_profile_id = messagingProfileId;
    if (webhookUrl) payload.webhook_url = webhookUrl;
    const resp = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });
    const data = await resp.json().catch(() => ({}));
    return { ok: resp.ok, status: resp.status, data, retryAfter: resp.headers.get('retry-after') };
  } finally {
    clearTimeout(timer);
  }
}

async function sendTelnyx(apiKey: string, messagingProfileId: string | null, from: string, to: string, body: string, webhookUrl?: string) {
  for (let attempt = 1; attempt <= MAX_SEND_ATTEMPTS; attempt++) {
    let result;
    try {
      result = await sendOnce(apiKey, messagingProfileId, from, to, body, webhookUrl);
    } catch (err) {
      // Do NOT retry thrown network errors — a blind retry could double-text.
      throw err;
    }
    if (result.ok || !isRetryableStatus(result.status) || attempt === MAX_SEND_ATTEMPTS) {
      return { ok: result.ok, status: result.status, data: result.data };
    }
    const fromHeader = parseRetryAfter(result.retryAfter ?? null);
    await sleep(fromHeader != null ? Math.min(fromHeader, 4000) : backoffDelayMs(attempt));
  }
  throw new Error('sendTelnyx exhausted attempts');
}

/**
 * Resolve Telnyx credentials: prefer env vars, then the in-app IntegrationSecret
 * row with provider 'telnyx'. Either path configures the integration, so the
 * Base44 dashboard env is optional.
 */
async function resolveTelnyxCreds(base44: any): Promise<{
  apiKey: string | null;
  publicKey: string | null;
  messagingProfileId: string | null;
  voiceConnectionId: string | null;
  faxConnectionId: string | null;
}> {
  const pick = (v: string | undefined | null) => (v && String(v).trim() ? String(v).trim() : null);
  let apiKey = pick(Deno.env.get('TELNYX_API_KEY'));
  let publicKey = pick(Deno.env.get('TELNYX_PUBLIC_KEY'));
  let messagingProfileId = pick(Deno.env.get('TELNYX_MESSAGING_PROFILE_ID'));
  let voiceConnectionId = pick(Deno.env.get('TELNYX_VOICE_CONNECTION_ID')) || pick(Deno.env.get('TELNYX_CONNECTION_ID'));
  let faxConnectionId = pick(Deno.env.get('TELNYX_FAX_CONNECTION_ID'));
  try {
    const rows = await base44.asServiceRole.entities.IntegrationSecret.filter({ provider: 'telnyx' });
    const rec = rows?.[0] || {};
    if (!apiKey) apiKey = pick(rec.api_key);
    if (!publicKey) publicKey = pick(rec.public_key);
    if (!messagingProfileId) messagingProfileId = pick(rec.messaging_profile_id);
    if (!voiceConnectionId) voiceConnectionId = pick(rec.voice_connection_id);
    if (!faxConnectionId) faxConnectionId = pick(rec.fax_connection_id);
  } catch { /* ignore */ }
  return { apiKey, publicKey, messagingProfileId, voiceConnectionId, faxConnectionId };
}

// ---- TCPA quiet hours (mirrors src/components/voice/quietHours.js) ----
const AREA_CODE_TIMEZONE: Record<number, string> = {
  // Eastern
  201: "America/New_York", 202: "America/New_York", 203: "America/New_York", 207: "America/New_York",
  212: "America/New_York", 215: "America/New_York", 216: "America/New_York", 220: "America/New_York",
  223: "America/New_York", 234: "America/New_York", 239: "America/New_York", 240: "America/New_York",
  267: "America/New_York", 272: "America/New_York", 276: "America/New_York", 290: "America/New_York",
  301: "America/New_York", 302: "America/New_York", 304: "America/New_York", 305: "America/New_York",
  321: "America/New_York", 324: "America/New_York", 330: "America/New_York", 339: "America/New_York",
  347: "America/New_York", 351: "America/New_York", 352: "America/New_York", 386: "America/New_York",
  401: "America/New_York", 404: "America/New_York", 407: "America/New_York", 410: "America/New_York",
  412: "America/New_York", 413: "America/New_York", 419: "America/New_York", 434: "America/New_York",
  440: "America/New_York", 443: "America/New_York", 470: "America/New_York", 475: "America/New_York",
  478: "America/New_York", 484: "America/New_York", 502: "America/New_York", 508: "America/New_York",
  513: "America/New_York", 516: "America/New_York", 517: "America/New_York", 518: "America/New_York",
  540: "America/New_York", 551: "America/New_York", 561: "America/New_York", 564: "America/New_York",
  567: "America/New_York", 570: "America/New_York", 571: "America/New_York", 585: "America/New_York",
  607: "America/New_York", 610: "America/New_York", 614: "America/New_York", 617: "America/New_York",
  631: "America/New_York", 646: "America/New_York", 667: "America/New_York", 678: "America/New_York",
  680: "America/New_York", 689: "America/New_York", 703: "America/New_York", 716: "America/New_York",
  717: "America/New_York", 718: "America/New_York", 724: "America/New_York", 727: "America/New_York",
  732: "America/New_York", 740: "America/New_York", 743: "America/New_York", 754: "America/New_York",
  757: "America/New_York", 770: "America/New_York", 772: "America/New_York", 774: "America/New_York",
  781: "America/New_York", 786: "America/New_York", 803: "America/New_York", 804: "America/New_York",
  810: "America/New_York", 813: "America/New_York", 814: "America/New_York", 828: "America/New_York",
  843: "America/New_York", 845: "America/New_York", 848: "America/New_York", 856: "America/New_York",
  857: "America/New_York", 859: "America/New_York", 862: "America/New_York", 863: "America/New_York",
  864: "America/New_York", 878: "America/New_York", 904: "America/New_York", 908: "America/New_York",
  910: "America/New_York", 912: "America/New_York", 914: "America/New_York", 919: "America/New_York",
  929: "America/New_York", 934: "America/New_York", 937: "America/New_York", 941: "America/New_York",
  947: "America/New_York", 954: "America/New_York", 959: "America/New_York", 980: "America/New_York",
  984: "America/New_York", 989: "America/New_York",
  // Central
  205: "America/Chicago", 210: "America/Chicago", 214: "America/Chicago", 217: "America/Chicago",
  218: "America/Chicago", 224: "America/Chicago", 225: "America/Chicago", 228: "America/Chicago",
  251: "America/Chicago", 254: "America/Chicago", 256: "America/Chicago", 262: "America/Chicago",
  281: "America/Chicago", 309: "America/Chicago", 312: "America/Chicago", 314: "America/Chicago",
  316: "America/Chicago", 318: "America/Chicago", 319: "America/Chicago", 320: "America/Chicago",
  331: "America/Chicago", 334: "America/Chicago", 337: "America/Chicago", 346: "America/Chicago",
  361: "America/Chicago", 402: "America/Chicago", 405: "America/Chicago", 409: "America/Chicago",
  414: "America/Chicago", 417: "America/Chicago", 430: "America/Chicago", 432: "America/Chicago",
  447: "America/Chicago", 469: "America/Chicago", 479: "America/Chicago", 501: "America/Chicago",
  504: "America/Chicago", 507: "America/Chicago", 512: "America/Chicago", 515: "America/Chicago",
  563: "America/Chicago", 573: "America/Chicago", 580: "America/Chicago", 601: "America/Chicago",
  605: "America/Chicago", 608: "America/Chicago", 612: "America/Chicago", 618: "America/Chicago",
  620: "America/Chicago", 630: "America/Chicago", 636: "America/Chicago", 641: "America/Chicago",
  651: "America/Chicago", 660: "America/Chicago", 682: "America/Chicago", 708: "America/Chicago",
  712: "America/Chicago", 713: "America/Chicago", 715: "America/Chicago", 731: "America/Chicago",
  737: "America/Chicago", 763: "America/Chicago", 769: "America/Chicago", 773: "America/Chicago",
  779: "America/Chicago", 785: "America/Chicago", 815: "America/Chicago", 816: "America/Chicago",
  817: "America/Chicago", 830: "America/Chicago", 832: "America/Chicago", 847: "America/Chicago",
  870: "America/Chicago", 872: "America/Chicago", 901: "America/Chicago", 903: "America/Chicago",
  913: "America/Chicago", 915: "America/Chicago", 918: "America/Chicago", 920: "America/Chicago",
  936: "America/Chicago", 940: "America/Chicago", 952: "America/Chicago",
  956: "America/Chicago", 972: "America/Chicago", 979: "America/Chicago",
  // Mountain
  208: "America/Denver", 303: "America/Denver", 307: "America/Denver", 385: "America/Denver",
  406: "America/Denver", 435: "America/Denver", 505: "America/Denver", 575: "America/Denver",
  719: "America/Denver", 720: "America/Denver", 801: "America/Denver", 970: "America/Denver",
  // Arizona (no DST)
  480: "America/Phoenix", 520: "America/Phoenix", 602: "America/Phoenix", 623: "America/Phoenix", 928: "America/Phoenix",
  // Pacific
  206: "America/Los_Angeles", 209: "America/Los_Angeles", 213: "America/Los_Angeles", 253: "America/Los_Angeles",
  279: "America/Los_Angeles", 310: "America/Los_Angeles", 323: "America/Los_Angeles", 341: "America/Los_Angeles",
  360: "America/Los_Angeles", 408: "America/Los_Angeles", 415: "America/Los_Angeles", 424: "America/Los_Angeles",
  425: "America/Los_Angeles", 442: "America/Los_Angeles", 503: "America/Los_Angeles", 509: "America/Los_Angeles",
  510: "America/Los_Angeles", 530: "America/Los_Angeles", 541: "America/Los_Angeles", 559: "America/Los_Angeles",
  562: "America/Los_Angeles", 619: "America/Los_Angeles", 626: "America/Los_Angeles", 628: "America/Los_Angeles",
  650: "America/Los_Angeles", 657: "America/Los_Angeles", 661: "America/Los_Angeles", 669: "America/Los_Angeles",
  707: "America/Los_Angeles", 714: "America/Los_Angeles", 747: "America/Los_Angeles", 760: "America/Los_Angeles",
  775: "America/Los_Angeles", 805: "America/Los_Angeles", 818: "America/Los_Angeles", 820: "America/Los_Angeles",
  831: "America/Los_Angeles", 858: "America/Los_Angeles", 909: "America/Los_Angeles", 916: "America/Los_Angeles",
  925: "America/Los_Angeles", 949: "America/Los_Angeles", 951: "America/Los_Angeles", 971: "America/Los_Angeles",
  // Alaska / Hawaii
  907: "America/Anchorage", 808: "Pacific/Honolulu",
};
function tzForNumber(raw: string): string | null {
  const d = String(raw || '').replace(/[^\d]/g, '');
  const ten = d.length === 11 && d.startsWith('1') ? d.slice(1) : d;
  if (ten.length !== 10) return null;
  return AREA_CODE_TIMEZONE[Number(ten.slice(0, 3))] || null;
}
function hourInZone(date: Date, timeZone: string): number | null {
  try {
    const h = new Intl.DateTimeFormat('en-US', { timeZone, hour12: false, hour: '2-digit' }).format(date);
    let n = parseInt(h, 10);
    if (n === 24) n = 0;
    return Number.isNaN(n) ? null : n;
  } catch {
    return null;
  }
}
/** TCPA quiet-hours check in the RECIPIENT's timezone. Fails open when unknown. */
function quietHoursCheck(toNumber: string, now: Date, settings: any): { allowed: boolean; reason: string } {
  const startHour = Number(settings?.tcpa_quiet_start_hour ?? 8);
  const endHour = Number(settings?.tcpa_quiet_end_hour ?? 21);
  const tz = tzForNumber(toNumber);
  if (!tz) return { allowed: true, reason: 'unknown_timezone' };
  const h = hourInZone(now, tz);
  if (h == null) return { allowed: true, reason: 'unknown_timezone' };
  // Allowed contact window; supports a window that wraps past midnight
  // (start > end). Mirrors quietHoursCheck in sendSms / isWithinQuietHours.
  const allowed = startHour === endHour ? true
    : startHour < endHour ? (h >= startHour && h < endHour)
      : (h >= startHour || h < endHour);
  return { allowed, reason: allowed ? 'within_hours' : 'quiet_hours' };
}

// ---- cost controls (mirrors sendSms / src/components/voice/costControls.js) ----
const PREMIUM_AREA_CODES = new Set(['900', '976']);
function isAllowedDestination(e164: string, settings: any = {}): { allowed: boolean; reason: string } {
  const s = settings || {};
  const e = String(e164 || '').trim();
  if (/^\+1\d{10}$/.test(e)) {
    const areaCode = e.slice(2, 5);
    if (PREMIUM_AREA_CODES.has(areaCode)) return { allowed: false, reason: 'premium_number_blocked' };
    const blocked = Array.isArray(s.blocked_area_codes) ? s.blocked_area_codes.map((a: any) => String(a).replace(/[^\d]/g, '')) : [];
    if (blocked.includes(areaCode)) return { allowed: false, reason: 'blocked_area_code' };
    return { allowed: true, reason: 'allowed' };
  }
  if (!/^\+\d{8,15}$/.test(e)) return { allowed: false, reason: 'invalid_destination' };
  if (s.allow_international === true) return { allowed: true, reason: 'international_allowed' };
  return { allowed: false, reason: 'international_blocked' };
}
function monthStartISO(now = new Date()): string {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString();
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { apiKey, messagingProfileId } = await resolveTelnyxCreds(base44);
    const { smsEnabled, settings } = await getAgencyConfig(base44);
    // A unique id for THIS cron run, used to claim rows (see the claim below).
    const runId = crypto.randomUUID();

    // Reconcile terminal delivery status via the DLR webhook (mirrors sendSms).
    const functionsBaseUrl = (Deno.env.get('FUNCTIONS_BASE_URL') || '').trim().replace(/\/+$/, '');
    const statusCallback = functionsBaseUrl ? `${functionsBaseUrl}/handleTelnyxStatusWebhook` : undefined;

    const nowIso = new Date().toISOString();
    // Pending rows that are due. (Base44 filter operators may vary; fetch a
    // batch of pending rows and filter by time in code to stay portable.)
    const pending = await base44.asServiceRole.entities.ScheduledSms
      .filter({ status: 'pending' }, 'send_at', BATCH_LIMIT).catch(() => []);
    const due = pending.filter((r: any) => r.send_at && r.send_at <= nowIso);

    const result = { processed: 0, sent: 0, failed: 0, skipped: 0 };

    for (const row of due) {
      // Claim with a per-run token, then RE-READ to confirm we still own it.
      // This read-after-write check makes overlapping runs far safer than a bare
      // status flip (the loser sees the winner's token and skips). Since Telnyx
      // has no client idempotency key, the claim+re-read is the primary
      // double-send prevention — we do NOT retry thrown network errors either.
      try {
        await base44.asServiceRole.entities.ScheduledSms.update(row.id, {
          status: 'sending', claimed_by: runId, claimed_at: new Date().toISOString(),
        });
      } catch {
        result.skipped++;
        continue;
      }
      const claimCheck = await base44.asServiceRole.entities.ScheduledSms
        .filter({ id: row.id }, '-created_date', 1).catch(() => []);
      if (!claimCheck[0] || claimCheck[0].claimed_by !== runId) {
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

      // Expire sends that are too stale to be relevant (e.g. after cron downtime)
      // rather than blasting every overdue reminder at once on resume.
      const sendAtMs = Date.parse(row.send_at);
      if (Number.isFinite(sendAtMs) && Date.now() - sendAtMs > MAX_SCHEDULE_AGE_MS) {
        await fail('Scheduled send expired (older than 24h) before dispatch');
        continue;
      }

      if (!apiKey) { await fail('Telnyx SMS credentials not configured'); continue; }
      if (!smsEnabled) { await fail('SMS messaging disabled for the agency'); continue; }

      // Cost control: block premium/blocked/international destinations by default
      // (mirrors sendSms). A blocked destination is terminal — fail the row.
      const destAllowed = isAllowedDestination(row.to_number, settings);
      if (!destAllowed.allowed) { await fail(`Destination blocked at send time: ${destAllowed.reason}`); continue; }

      // Cost control: enforce the optional monthly outbound-SMS cap (mirrors
      // sendSms). When the cap is already reached, leave the row pending so a
      // later run (next month / after the cap is raised) can pick it up rather
      // than failing a scheduled reminder outright.
      const monthlyCap = Number(settings?.monthly_sms_cap);
      if (Number.isFinite(monthlyCap) && monthlyCap > 0) {
        const since = monthStartISO();
        const recentOutbound = await base44.asServiceRole.entities.SmsMessage
          .filter({ direction: 'outbound' }, '-created_date', monthlyCap)
          .catch(() => []);
        const sentThisMonth = (Array.isArray(recentOutbound) ? recentOutbound : [])
          .filter((m: any) => m.created_date && m.created_date >= since).length;
        if (sentThisMonth >= monthlyCap) {
          await base44.asServiceRole.entities.ScheduledSms.update(row.id, {
            status: 'pending', claimed_by: '', claimed_at: null,
          }).catch(() => {});
          result.skipped++;
          continue;
        }
      }

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

      // TCPA quiet hours (recipient timezone). When enabled and the recipient is
      // in their quiet hours, leave the row pending to retry on a later run.
      if (settings?.tcpa_quiet_hours_enabled === true) {
        const q = quietHoursCheck(row.to_number, new Date(), settings);
        if (!q.allowed) {
          await base44.asServiceRole.entities.ScheduledSms.update(row.id, {
            status: 'pending', claimed_by: '', claimed_at: null,
          }).catch(() => {});
          result.skipped++;
          continue;
        }
      }

      // The deterministic `sched-${row.id}` clientMessageId is kept in the
      // SmsMessage record for our own tracking but is NOT sent to Telnyx —
      // Telnyx has no client idempotency key. Double-send is prevented by the
      // claim+re-read above and by not retrying thrown network errors.
      const clientMessageId = `sched-${row.id}`;
      let resp;
      try {
        resp = await sendTelnyx(apiKey!, messagingProfileId, row.from_number, row.to_number, row.body, statusCallback);
      } catch (netErr) {
        const aborted = (netErr as Error)?.name === 'AbortError';
        await fail(aborted ? 'Timed out reaching Telnyx' : `Network error reaching Telnyx: ${(netErr as Error).message}`);
        continue;
      }

      if (!resp.ok) {
        await fail(resp.data?.errors?.[0]?.detail || resp.data?.errors?.[0]?.title || `Telnyx API error (${resp.status})`);
        continue;
      }

      const providerMessageId = resp.data?.data?.id || null;
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

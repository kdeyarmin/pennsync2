import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * sendSms — outbound SMS from a nurse's dedicated Twilio work number to a patient.
 *
 * The patient only ever sees the nurse's work number (`From`); the nurse's
 * personal cell is never exposed. Refuses to send to numbers that have opted
 * out (TCPA). PHI minimization: the message body is never written to the audit
 * log — only its length and the thread id are recorded.
 */

// ---- inline helpers (functions deploy as single files; do not rely on imports) ----
function normalizeE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/[^\d]/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (String(raw).trim().startsWith('+') && digits.length >= 8 && digits.length <= 15 && digits[0] !== '0') return `+${digits}`;
  return null;
}

function getThreadId(a: string, b: string): string {
  const na = normalizeE164(a) || a;
  const nb = normalizeE164(b) || b;
  return [na, nb].sort().join('|');
}

function phoneVariants(value: string): string[] {
  const d = (value || '').replace(/[^\d]/g, '');
  const ten = d.slice(-10);
  if (ten.length !== 10) return value ? [value] : [];
  const a = ten.slice(0, 3), b = ten.slice(3, 6), c = ten.slice(6);
  const variants = [value, `+1${ten}`, `1${ten}`, ten, `(${a}) ${b}-${c}`, `${a}-${b}-${c}`, `${a}.${b}.${c}`];
  return variants.filter((v, i) => variants.indexOf(v) === i);
}

async function getAgencyConfig(base44: any) {
  const settings = await base44.asServiceRole.entities.AgencySettings.list('-created_date', 1).catch(() => []);
  const s = settings[0] || {};
  return {
    settings: s,
    smsEnabled: s.sms_messaging_enabled ?? true,
  };
}

/**
 * Resolve Twilio credentials: prefer env vars, then the in-app IntegrationSecret
 * row with provider 'twilio'. Either path configures the integration, so the
 * Base44 dashboard env is optional.
 */
async function resolveTwilioCreds(base44: any): Promise<{ accountSid: string | null; authToken: string | null }> {
  const envSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const envToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  let sid = envSid && envSid.trim() ? envSid.trim() : null;
  let token = envToken && envToken.trim() ? envToken.trim() : null;
  if (!sid || !token) {
    try {
      const rows = await base44.asServiceRole.entities.IntegrationSecret.filter({ provider: 'twilio' });
      const rec = rows?.[0] || {};
      if (!sid && rec.account_sid && String(rec.account_sid).trim()) sid = String(rec.account_sid).trim();
      if (!token && rec.auth_token && String(rec.auth_token).trim()) token = String(rec.auth_token).trim();
    } catch { /* ignore */ }
  }
  return { accountSid: sid, authToken: token };
}

async function resolvePatientId(base44: any, e164: string): Promise<string | null> {
  for (const variant of phoneVariants(e164)) {
    const matches = await base44.asServiceRole.entities.Patient.filter({ phone: variant }).catch(() => []);
    if (matches.length > 0) return matches[0].id;
  }
  return null;
}

// ---- transient-failure retry policy (mirrors src/components/voice/twilioRetry.js) ----
// Twilio has no client idempotency key. Therefore
// we only retry on explicit retryable HTTP statuses (408/425/429/500/502/503/504).
// We do NOT retry a THROWN network error for a send — a blind retry could
// double-text. Keep the AbortController timeout. We no longer rely on provider
// dedupe; we avoid double-send by not retrying ambiguous network failures.
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
async function sendWithRetry(
  attemptFn: (attempt: number) => Promise<{ ok: boolean; status: number; data: any; retryAfter?: string | null }>,
  maxAttempts = 3,
) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let result;
    try {
      result = await attemptFn(attempt);
    } catch (err) {
      // Do NOT retry thrown network errors — a blind retry could double-text.
      throw err;
    }
    if (result.ok || !isRetryableStatus(result.status) || attempt === maxAttempts) {
      return { ...result, attempts: attempt };
    }
    const fromHeader = parseRetryAfter(result.retryAfter ?? null);
    await sleep(fromHeader != null ? Math.min(fromHeader, 4000) : backoffDelayMs(attempt));
  }
  throw new Error('sendWithRetry exhausted attempts');
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
  const allowed = h >= startHour && h < endHour;
  return { allowed, reason: allowed ? 'within_hours' : 'quiet_hours' };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { to_number, body, patient_id } = await req.json();
    if (!to_number || !body) {
      return Response.json({ error: 'Missing required fields: to_number, body' }, { status: 400 });
    }
    // Validate body type/length before it reaches the provider (cost/abuse).
    if (typeof body !== 'string') {
      return Response.json({ error: 'Message body must be a string' }, { status: 400 });
    }
    if (body.length > 1600) {
      return Response.json({ error: 'Message is too long (max 1600 characters).' }, { status: 400 });
    }

    const fromNumber = user.work_phone_number;
    if (!fromNumber) {
      return Response.json({ error: 'No work number assigned to your account. Ask an admin to provision one.' }, { status: 400 });
    }

    const destination = normalizeE164(to_number);
    if (!destination) {
      return Response.json({ error: 'Invalid destination phone number' }, { status: 400 });
    }

    const { accountSid, authToken } = await resolveTwilioCreds(base44);
    const { settings, smsEnabled } = await getAgencyConfig(base44);
    if (!accountSid || !authToken) {
      return Response.json({ error: 'Twilio SMS credentials not configured' }, { status: 500 });
    }
    if (!smsEnabled) {
      return Response.json({ error: 'SMS messaging is disabled for this agency' }, { status: 403 });
    }

    // TCPA: refuse to text a number that has opted out.
    const consents = await base44.asServiceRole.entities.SmsConsent
      .filter({ phone_e164: destination }, '-captured_at', 1).catch(() => []);
    const consentStatus = consents[0]?.consent_status || 'unknown';
    if (consentStatus === 'opted_out') {
      return Response.json({ error: 'This patient has opted out of text messages (replied STOP).' }, { status: 403 });
    }

    // TCPA quiet hours (recipient timezone). Hard block when enabled — the nurse
    // can schedule the text for daytime instead. Fails open for unknown zones.
    if (settings?.tcpa_quiet_hours_enabled === true) {
      const q = quietHoursCheck(destination, new Date(), settings);
      if (!q.allowed) {
        return Response.json(
          { error: "It's outside the recipient's allowed texting hours (TCPA quiet hours). Schedule this text for daytime in their timezone instead.", reason: q.reason },
          { status: 403 },
        );
      }
    }

    const resolvedPatientId = patient_id || await resolvePatientId(base44, destination);
    const clientMessageId = crypto.randomUUID();

    // Log the message before sending so we always have a record.
    const smsRow = await base44.entities.SmsMessage.create({
      direction: 'outbound',
      from_number: fromNumber,
      to_number: destination,
      body,
      nurse_email: user.email,
      patient_id: resolvedPatientId || null,
      thread_id: getThreadId(fromNumber, destination),
      status: 'queued',
      client_message_id: clientMessageId,
      is_read: true,
      sent_by: user.email,
      consent_checked: consentStatus === 'opted_in',
    });

    // Send via Twilio Messages API. Each attempt is bounded by an AbortController
    // timeout so a slow/blackholed host can't hang the function. Only retries on
    // explicit retryable HTTP statuses — we do NOT retry thrown network errors
    // because Twilio has no client idempotency key and a blind retry could
    // double-text the patient.
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    const SEND_TIMEOUT_MS = 15000;
    const functionsBaseUrl = (Deno.env.get('FUNCTIONS_BASE_URL') || '').trim().replace(/\/+$/, '');
    const statusCallback = functionsBaseUrl ? `${functionsBaseUrl}/handleTwilioSmsStatus` : undefined;
    let result: { ok: boolean; status: number; data: any };
    try {
      result = await sendWithRetry(async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
        try {
          const params = new URLSearchParams({ To: destination, From: fromNumber, Body: body });
          if (statusCallback) params.set('StatusCallback', statusCallback);
          const resp = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
            signal: controller.signal,
          });
          const data = await resp.json().catch(() => ({}));
          return { ok: resp.ok, status: resp.status, data, retryAfter: resp.headers.get('retry-after') };
        } finally {
          clearTimeout(timer);
        }
      });
    } catch (netErr) {
      // Network/DNS failure or timeout: don't leave the row stuck in 'queued'.
      // We do not retry thrown network errors (Twilio has no idempotency key;
      // a blind retry could double-text).
      const aborted = netErr?.name === 'AbortError';
      const reason = aborted
        ? `Timed out after ${SEND_TIMEOUT_MS} ms reaching Twilio`
        : `Network error reaching Twilio: ${netErr.message}`;
      await base44.entities.SmsMessage.update(smsRow.id, {
        status: 'failed',
        failure_reason: reason,
      }).catch(() => {});
      return Response.json(
        { error: aborted ? 'Twilio SMS API timed out' : 'Failed to reach Twilio SMS API', details: netErr.message },
        { status: aborted ? 504 : 502 },
      );
    }

    const data = result.data || {};

    if (!result.ok) {
      await base44.entities.SmsMessage.update(smsRow.id, {
        status: 'failed',
        failure_reason: data?.message || data?.error || `Twilio API error (${result.status})`,
      });
      return Response.json({ error: 'Twilio SMS API error', details: data }, { status: result.status });
    }

    // Map Twilio status: 'queued'/'accepted' → 'queued', otherwise 'sent'.
    const providerStatus = (data?.status || '').toLowerCase();
    await base44.entities.SmsMessage.update(smsRow.id, {
      provider_message_id: data?.sid || null,
      status: providerStatus === 'queued' || providerStatus === 'accepted' ? 'queued' : 'sent',
    });

    // Audit — never log the message body (HIPAA). Length + thread only.
    await base44.entities.UserActivity.create({
      user_email: user.email,
      user_name: user.full_name,
      action: 'sms_sent',
      entity_type: 'SmsMessage',
      entity_id: smsRow.id,
      details: {
        to_number: destination,
        from_number: fromNumber,
        patient_id: resolvedPatientId || null,
        thread_id: smsRow.thread_id,
        body_length: String(body).length,
        provider_message_id: data?.sid || null,
        timestamp: new Date().toISOString(),
      },
      status: 'success',
    }).catch((err) => console.error('Failed to log activity:', err));

    return Response.json({
      success: true,
      message_id: smsRow.id,
      provider_message_id: data?.sid || null,
      status: 'sent',
    });
  } catch (error) {
    console.error('sendSms error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

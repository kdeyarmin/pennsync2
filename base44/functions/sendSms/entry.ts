import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * sendSms — outbound SMS from a nurse's dedicated 8x8 work number to a patient.
 *
 * The patient only ever sees the nurse's work number (`source`); the nurse's
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
  if (String(raw).trim().startsWith('+') && digits.length >= 8) return `+${digits}`;
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
    smsSubAccountId: s.eight_x_eight_sms_subaccount_id,
    region: s.eight_x_eight_region || 'us',
    smsEnabled: s.sms_messaging_enabled ?? true,
  };
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

async function resolvePatientId(base44: any, e164: string): Promise<string | null> {
  for (const variant of phoneVariants(e164)) {
    const matches = await base44.asServiceRole.entities.Patient.filter({ phone: variant }).catch(() => []);
    if (matches.length > 0) return matches[0].id;
  }
  return null;
}

// ---- transient-failure retry policy (mirrors src/components/voice/eightxeightRetry.js) ----
// A 429/502/503/504 or a dropped connection to 8x8 is usually transient; one
// quick retry beats stranding the patient. Retries are double-send safe because
// every send reuses the same clientMessageId, which 8x8 treats as an
// idempotency key. Permanent 4xx (bad number/credentials/opt-out) is not retried.
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
async function sendWithRetry(
  attemptFn: (attempt: number) => Promise<{ ok: boolean; status: number; data: any; retryAfter?: string | null }>,
  maxAttempts = 3,
) {
  let lastError: any;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let result;
    try {
      result = await attemptFn(attempt);
    } catch (err) {
      if (attempt === maxAttempts || !isRetryableError(err)) throw err;
      lastError = err;
      await sleep(backoffDelayMs(attempt));
      continue;
    }
    if (result.ok || !isRetryableStatus(result.status) || attempt === maxAttempts) {
      return { ...result, attempts: attempt };
    }
    const fromHeader = parseRetryAfter(result.retryAfter ?? null);
    await sleep(fromHeader != null ? Math.min(fromHeader, 4000) : backoffDelayMs(attempt));
  }
  throw lastError || new Error('sendWithRetry exhausted attempts');
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

    const apiKey = await resolveEightXEightApiKey(base44);
    const { smsSubAccountId, region, smsEnabled } = await getAgencyConfig(base44);
    if (!apiKey || !smsSubAccountId) {
      return Response.json({ error: '8x8 SMS credentials not configured' }, { status: 500 });
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

    // Send via 8x8 SMS API. Each attempt is bounded by an AbortController timeout
    // so a slow/blackholed host can't hang the function; transient failures are
    // retried with backoff (safe: the same clientMessageId de-dups at 8x8).
    const host = `https://sms.${region}.8x8.com`;
    const url = `${host}/api/v1/subaccounts/${smsSubAccountId}/messages`;
    const SEND_TIMEOUT_MS = 15000;
    let result: { ok: boolean; status: number; data: any };
    try {
      result = await sendWithRetry(async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), SEND_TIMEOUT_MS);
        try {
          const resp = await fetch(url, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${apiKey}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              source: fromNumber,
              destination,
              text: body,
              encoding: 'AUTO',
              clientMessageId,
            }),
            signal: controller.signal,
          });
          const data = await resp.json().catch(() => ({}));
          return { ok: resp.ok, status: resp.status, data, retryAfter: resp.headers.get('retry-after') };
        } finally {
          clearTimeout(timer);
        }
      });
    } catch (netErr) {
      // Network/DNS failure or timeout (after retries): don't leave the row stuck in 'queued'.
      const aborted = netErr?.name === 'AbortError';
      const reason = aborted
        ? `Timed out after ${SEND_TIMEOUT_MS} ms reaching 8x8`
        : `Network error reaching 8x8: ${netErr.message}`;
      await base44.entities.SmsMessage.update(smsRow.id, {
        status: 'failed',
        failure_reason: reason,
      }).catch(() => {});
      return Response.json(
        { error: aborted ? '8x8 SMS API timed out' : 'Failed to reach 8x8 SMS API', details: netErr.message },
        { status: aborted ? 504 : 502 },
      );
    }

    const data = result.data || {};

    if (!result.ok) {
      await base44.entities.SmsMessage.update(smsRow.id, {
        status: 'failed',
        failure_reason: data?.message || data?.error || `8x8 API error (${result.status})`,
      });
      return Response.json({ error: '8x8 SMS API error', details: data }, { status: result.status });
    }

    const providerStatus = (data?.status?.code || '').toUpperCase();
    await base44.entities.SmsMessage.update(smsRow.id, {
      provider_message_id: data?.umid || null,
      status: providerStatus === 'QUEUED' || providerStatus === 'SENT' ? 'sent' : 'queued',
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
        provider_message_id: data?.umid || null,
        timestamp: new Date().toISOString(),
      },
      status: 'success',
    }).catch((err) => console.error('Failed to log activity:', err));

    return Response.json({
      success: true,
      message_id: smsRow.id,
      provider_message_id: data?.umid || null,
      status: 'sent',
    });
  } catch (error) {
    console.error('sendSms error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

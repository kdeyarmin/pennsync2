import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * sendTestSms — admin-only, end-to-end validation of the Twilio SMS path.
 *
 * This sends ONE real, fixed, PHI-free test message to a number the admin
 * enters, so they can confirm the Twilio integration works on a phone they
 * control.
 *
 * From-number resolution: the admin's own work number if they have one, else
 * the first provisioned work number in the agency. Honors opt-out (TCPA) but
 * intentionally bypasses the agency SMS kill switch — this is a deliberate
 * admin diagnostic, not patient messaging. It is NOT stored in any nurse inbox.
 */

const TEST_BODY = 'PennSync test message: your Twilio text messaging integration is working. No reply needed.';

function normalizeE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/[^\d]/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (String(raw).trim().startsWith('+') && digits.length >= 8 && digits.length <= 15 && digits[0] !== '0') return `+${digits}`;
  return null;
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

// ---- transient-failure retry policy ----
// Twilio has no client idempotency key. Therefore
// we only retry on explicit retryable HTTP statuses (408/425/429/500/502/503/504).
// We do NOT retry a THROWN network error for a send — a blind retry could
// double-text. We no longer rely on provider dedupe; we avoid double-send by not
// retrying ambiguous network failures.
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const isAdmin =
      user.role === 'admin' ||
      user.account_type === 'super_admin' ||
      String(user.email || '').trim().toLowerCase() === 'kdeyarmin@comcast.net';
    if (!isAdmin) {
      return Response.json({ error: 'Only administrators can send a test text' }, { status: 403 });
    }

    const { to_number } = await req.json();
    const destination = normalizeE164(to_number);
    if (!destination) {
      return Response.json({ error: 'Enter a valid destination phone number.' }, { status: 400 });
    }

    const { accountSid, authToken } = await resolveTwilioCreds(base44);
    const settings = await base44.asServiceRole.entities.AgencySettings.list('-created_date', 1).catch(() => []);
    const s = settings[0] || {};
    if (!accountSid || !authToken) {
      return Response.json({ error: 'Twilio SMS is not configured (missing account SID or auth token).' }, { status: 500 });
    }

    // Resolve a from-number: the admin's own work number, else any provisioned one.
    let fromNumber = user.work_phone_number || null;
    if (!fromNumber) {
      const provisioned = await base44.asServiceRole.entities.User.list('full_name', 1000).catch(() => []);
      fromNumber = provisioned.find((u: any) => u.work_phone_number)?.work_phone_number || null;
    }
    if (!fromNumber) {
      return Response.json({ error: 'No work number is provisioned yet. Assign one to a nurse (or yourself) first.' }, { status: 400 });
    }

    // TCPA: never text a number that has opted out, even for a test.
    const consents = await base44.asServiceRole.entities.SmsConsent
      .filter({ phone_e164: destination }, '-captured_at', 1).catch(() => []);
    if (consents[0]?.consent_status === 'opted_out') {
      return Response.json({ error: 'That number has opted out of text messages (replied STOP).' }, { status: 403 });
    }

    // Send via Twilio Messages API. Do NOT retry thrown network errors — Twilio
    // has no client idempotency key and a blind retry could double-text.
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
    let result: { ok: boolean; status: number; data: any };
    try {
      result = await sendWithRetry(async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 15000);
        try {
          const params = new URLSearchParams({ To: destination, From: fromNumber!, Body: TEST_BODY });
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
      const aborted = (netErr as Error)?.name === 'AbortError';
      return Response.json(
        { error: aborted ? 'Twilio SMS API timed out' : 'Failed to reach the Twilio SMS API', details: (netErr as Error).message },
        { status: aborted ? 504 : 502 },
      );
    }

    const data = result.data || {};
    if (!result.ok) {
      return Response.json({ error: data?.message || data?.error || `Twilio SMS API error (${result.status})`, details: data }, { status: result.status });
    }

    // Audit (no PHI; the body is a fixed non-PHI string). Not written to any inbox.
    await base44.entities.UserActivity.create({
      user_email: user.email,
      user_name: user.full_name,
      action: 'sms_test_sent',
      entity_type: 'AgencySettings',
      entity_id: s.id || null,
      details: {
        to_number: destination,
        from_number: fromNumber,
        provider_message_id: data?.sid || null,
        timestamp: new Date().toISOString(),
      },
      status: 'success',
    }).catch((err) => console.error('Failed to log activity:', err));

    return Response.json({
      success: true,
      from_number: fromNumber,
      to_number: destination,
      provider_message_id: data?.sid || null,
    });
  } catch (error) {
    console.error('sendTestSms error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});

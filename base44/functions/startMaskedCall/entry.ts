import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * startMaskedCall — outbound click-to-call masking (nurse -> patient).
 *
 * Uses the Twilio Calls API to ring the nurse's personal cell first; when the
 * nurse answers, Twilio bridges to the patient and presents the nurse's WORK
 * number as the caller ID. The patient never sees the cell.
 *
 * Origination is NON-idempotent: a thrown network error is NOT retried (the
 * call may already be in flight). Only explicit retryable HTTP statuses (where
 * Twilio told us the request failed) are retried.
 */

function normalizeE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/[^\d]/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (String(raw).trim().startsWith('+') && digits.length >= 8) return `+${digits}`;
  return null;
}

function phoneVariants(value: string): string[] {
  const d = (value || '').replace(/[^\d]/g, '');
  const ten = d.slice(-10);
  if (ten.length !== 10) return value ? [value] : [];
  const a = ten.slice(0, 3), b = ten.slice(3, 6), c = ten.slice(6);
  const variants = [value, `+1${ten}`, `1${ten}`, ten, `(${a}) ${b}-${c}`, `${a}-${b}-${c}`, `${a}.${b}.${c}`];
  return variants.filter((v, i) => variants.indexOf(v) === i);
}

/**
 * Resolve Twilio credentials: prefer env vars, then fall back to the
 * IntegrationSecret row saved by the super admin in-app.
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
// Call origination is NOT idempotent, so a thrown network error is NOT retried
// (the call might already be placed — a blind retry could double-dial the
// patient). Only explicit retryable HTTP statuses (408/425/429/5xx), where
// Twilio told us the request failed, are retried.
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
async function originateWithRetry(
  attemptFn: (attempt: number) => Promise<{ ok: boolean; status: number; data: any; retryAfter?: string | null }>,
  maxAttempts = 3,
) {
  // Note: thrown errors are intentionally NOT caught here — they propagate to
  // the caller after a single attempt (non-idempotent origination).
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const result = await attemptFn(attempt);
    if (result.ok || !isRetryableStatus(result.status) || attempt === maxAttempts) {
      return { ...result, attempts: attempt };
    }
    const fromHeader = parseRetryAfter(result.retryAfter ?? null);
    await sleep(fromHeader != null ? Math.min(fromHeader, 4000) : backoffDelayMs(attempt));
  }
  // Unreachable (loop returns on the last attempt).
  throw new Error('originateWithRetry exhausted attempts');
}

function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { patient_id, to_number } = await req.json();

    const workNumber = user.work_phone_number;
    const nurseCell = user.personal_cell_e164;
    if (!workNumber || !nurseCell) {
      return Response.json({ error: 'Your account needs both a work number and a personal cell on file. Ask an admin to provision them.' }, { status: 400 });
    }

    // Resolve the patient number.
    let destination = normalizeE164(to_number);
    let resolvedPatientId = patient_id || null;
    if (!destination && patient_id) {
      const p = await base44.asServiceRole.entities.Patient.filter({ id: patient_id }).catch(() => []);
      destination = normalizeE164(p[0]?.phone);
    }
    if (!destination) {
      return Response.json({ error: 'Could not determine a valid patient phone number' }, { status: 400 });
    }
    if (!resolvedPatientId) {
      for (const v of phoneVariants(destination)) {
        const m = await base44.asServiceRole.entities.Patient.filter({ phone: v }).catch(() => []);
        if (m.length > 0) { resolvedPatientId = m[0].id; break; }
      }
    }

    const { accountSid, authToken } = await resolveTwilioCreds(base44);
    if (!accountSid || !authToken) {
      return Response.json({ error: 'Twilio Voice credentials not configured' }, { status: 500 });
    }

    const callLog = await base44.entities.CallLog.create({
      direction: 'outbound',
      from_number: nurseCell,
      to_number: destination,
      displayed_number: workNumber,
      nurse_email: user.email,
      patient_id: resolvedPatientId,
      call_mode: 'outbound_clicktocall',
      status: 'initiated',
      sent_by: user.email,
    });

    // Build TwiML: ring nurse's cell first, then bridge to the patient with the
    // work number as the presented caller ID.
    const twiml = `<?xml version="1.0" encoding="UTF-8"?><Response><Dial callerId="${escapeXml(workNumber)}" timeout="20"><Number>${escapeXml(destination)}</Number></Dial></Response>`;

    // Originate via Twilio Calls API. Each attempt is bounded by an AbortController
    // timeout; explicit transient 5xx/408/425/429 are retried with backoff (a
    // thrown network error is not, since the call may already be in flight).
    const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Calls.json`;
    const ORIGINATE_TIMEOUT_MS = 15000;
    const functionsBase = (Deno.env.get('FUNCTIONS_BASE_URL') || '').trim().replace(/\/+$/, '');

    let result: { ok: boolean; status: number; data: any };
    try {
      result = await originateWithRetry(async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), ORIGINATE_TIMEOUT_MS);
        try {
          const body = new URLSearchParams({
            To: nurseCell,
            From: workNumber,
            Twiml: twiml,
          });
          if (functionsBase) {
            body.set('StatusCallback', `${functionsBase}/handleTwilioCallStatus`);
            body.append('StatusCallbackEvent', 'initiated');
            body.append('StatusCallbackEvent', 'ringing');
            body.append('StatusCallbackEvent', 'answered');
            body.append('StatusCallbackEvent', 'completed');
          }
          const resp = await fetch(twilioUrl, {
            method: 'POST',
            headers: {
              'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: body.toString(),
            signal: controller.signal,
          });
          const data = await resp.json().catch(() => ({}));
          return { ok: resp.ok, status: resp.status, data, retryAfter: resp.headers.get('retry-after') };
        } finally {
          clearTimeout(timer);
        }
      });
    } catch (netErr) {
      // Network/DNS failure or timeout: don't leave the CallLog stuck in 'initiated'.
      const aborted = netErr?.name === 'AbortError';
      const reason = aborted
        ? `Timed out after ${ORIGINATE_TIMEOUT_MS} ms reaching Twilio`
        : `Network error reaching Twilio: ${netErr.message}`;
      await base44.entities.CallLog.update(callLog.id, {
        status: 'failed',
        failure_reason: reason,
      }).catch(() => {});
      return Response.json(
        { error: aborted ? 'Twilio Voice API timed out' : 'Failed to reach Twilio Voice API', details: netErr.message },
        { status: aborted ? 504 : 502 },
      );
    }

    const data = result.data || {};
    if (!result.ok) {
      await base44.entities.CallLog.update(callLog.id, {
        status: 'failed',
        failure_reason: data?.message || data?.error || `Twilio Voice API error (${result.status})`,
      });
      return Response.json({ error: 'Twilio Voice API error', details: data }, { status: result.status });
    }

    const providerCallId = data?.sid || null;
    await base44.entities.CallLog.update(callLog.id, { provider_call_id: providerCallId });

    await base44.entities.UserActivity.create({
      user_email: user.email,
      user_name: user.full_name,
      action: 'call_initiated',
      entity_type: 'CallLog',
      entity_id: callLog.id,
      details: {
        to_number: destination,
        displayed_number: workNumber,
        patient_id: resolvedPatientId,
        provider_call_id: providerCallId,
        timestamp: new Date().toISOString(),
      },
      status: 'success',
    }).catch((err) => console.error('Failed to log activity:', err));

    return Response.json({ success: true, call_id: callLog.id, provider_call_id: providerCallId });
  } catch (error) {
    console.error('startMaskedCall error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * startMaskedCall — outbound click-to-call masking (nurse -> patient).
 *
 * The 8x8 Voice API first rings the nurse's personal cell; when the nurse
 * answers, it dials the patient and bridges the two legs, presenting the
 * nurse's WORK number as the caller ID. The patient never sees the cell.
 *
 * NOTE: the exact Voice API origination endpoint/body depends on the
 * provisioned voice subaccount. The base URL comes from the
 * AgencySettings.eight_x_eight_voice_api_base admin setting; validate the body
 * shape against 8x8 Connect.
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

// ---- transient-failure retry policy (mirrors src/components/voice/eightxeightRetry.js) ----
// Call origination is NOT idempotent (no clientMessageId), so a thrown network
// error is NOT retried (the call might already be placed — a blind retry could
// double-dial the patient). Only explicit retryable HTTP statuses, where 8x8
// told us the request failed, are retried.
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

    const apiKey = await resolveEightXEightApiKey(base44);
    const settings = await base44.asServiceRole.entities.AgencySettings.list('-created_date', 1).catch(() => []);
    const voiceBase = settings[0]?.eight_x_eight_voice_api_base;
    const voiceSubAccountId = settings[0]?.eight_x_eight_voice_subaccount_id;

    if (!apiKey || !voiceBase || !voiceSubAccountId) {
      return Response.json({ error: '8x8 Voice credentials not configured' }, { status: 500 });
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

    // Originate: ring the nurse's cell first, then bridge to the patient with
    // the work number as the presented caller ID. Each attempt is bounded by an
    // AbortController timeout so a slow host can't hang the function; an explicit
    // transient 5xx/429 is retried with backoff (a thrown network error is not,
    // since the call may already be in flight).
    const url = `${voiceBase}/subaccounts/${voiceSubAccountId}/callflows`;
    const ORIGINATE_TIMEOUT_MS = 15000;
    let result: { ok: boolean; status: number; data: any };
    try {
      result = await originateWithRetry(async () => {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), ORIGINATE_TIMEOUT_MS);
        try {
          const resp = await fetch(url, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              callflow: [
                {
                  action: 'makeCall',
                  params: {
                    source: { type: 'phoneNumber', phoneNumber: nurseCell },
                    destination: { type: 'phoneNumber', phoneNumber: destination },
                    callerId: workNumber,
                  },
                },
              ],
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
      // Network/DNS failure or timeout: don't leave the CallLog stuck in 'initiated'.
      const aborted = netErr?.name === 'AbortError';
      const reason = aborted
        ? `Timed out after ${ORIGINATE_TIMEOUT_MS} ms reaching 8x8`
        : `Network error reaching 8x8: ${netErr.message}`;
      await base44.entities.CallLog.update(callLog.id, {
        status: 'failed',
        failure_reason: reason,
      }).catch(() => {});
      return Response.json(
        { error: aborted ? '8x8 Voice API timed out' : 'Failed to reach 8x8 Voice API', details: netErr.message },
        { status: aborted ? 504 : 502 },
      );
    }

    const data = result.data || {};
    if (!result.ok) {
      await base44.entities.CallLog.update(callLog.id, {
        status: 'failed',
        failure_reason: data?.message || data?.error || `8x8 Voice API error (${result.status})`,
      });
      return Response.json({ error: '8x8 Voice API error', details: data }, { status: result.status });
    }

    const providerCallId = data?.callId || data?.sessionId || data?.id || null;
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

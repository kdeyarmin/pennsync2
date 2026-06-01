import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * handleEightXEightVoiceCall — 8x8 Voice Call Action (VCA) webhook for inbound
 * calls to a nurse's work number. This is the heart of number masking.
 *
 * Unlike the other functions, the RESPONSE BODY is an 8x8 callflow (a JSON list
 * of actions), not the usual {success} envelope.
 *  - Nurse on duty  -> bridge the caller to the nurse's personal cell, presenting
 *    the work number as caller ID (the cell is never revealed).
 *  - Nurse off duty -> speak the off-duty greeting, then transfer to the main office.
 *
 * NOTE: 8x8 callflow action/parameter names depend on the provisioned voice
 * subaccount. Validate the shapes in `buildSay`/`buildMakeCall` against 8x8
 * Connect for your account and adjust if needed.
 */

function normalizeE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/[^\d]/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (String(raw).trim().startsWith('+') && digits.length >= 8) return `+${digits}`;
  return null;
}

// Mirrors phoneVariants() in src/components/voice/phoneUtils.js — candidate
// stored formats used to match a caller against the free-form Patient.phone.
function phoneVariants(value: string): string[] {
  const d = (value || '').replace(/[^\d]/g, '');
  const ten = d.slice(-10);
  if (ten.length !== 10) return value ? [value] : [];
  const a = ten.slice(0, 3), b = ten.slice(3, 6), c = ten.slice(6);
  const variants = [value, `+1${ten}`, `1${ten}`, ten, `(${a}) ${b}-${c}`, `${a}-${b}-${c}`, `${a}.${b}.${c}`];
  return variants.filter((v, i) => variants.indexOf(v) === i);
}

// Mirrors isOffDutyNow() in src/components/voice/dutyUtils.js — a nurse is off
// duty via the manual toggle OR an active scheduled time-off window. Read live
// here so a schedule takes effect (and expires) without any cron.
function isOffDutyNow(user: any, now = new Date()): boolean {
  if (!user) return false;
  if (user.duty_status === 'off_duty') return true;
  const s = user.scheduled_off_duty_start ? new Date(user.scheduled_off_duty_start).getTime() : NaN;
  const e = user.scheduled_off_duty_end ? new Date(user.scheduled_off_duty_end).getTime() : NaN;
  if (Number.isNaN(s) || Number.isNaN(e) || e <= s) return false;
  const t = now.getTime();
  const week = 7 * 24 * 60 * 60 * 1000;
  // Recurrence only applies when the window is shorter than a week; otherwise it
  // would cover every instant, so fall back to one-off (expiring) semantics.
  if (user.scheduled_off_duty_recurring && e - s < week) {
    if (t < s) return false;
    const delta = ((t - s) % week + week) % week;
    return delta <= e - s;
  }
  return t >= s && t <= e;
}

async function hmacHex(secret: string, raw: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw));
  return [...new Uint8Array(sig)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function verifyWebhook(req: Request, raw: string): Promise<boolean> {
  const secret = Deno.env.get('EIGHT_X_EIGHT_WEBHOOK_SECRET');
  if (!secret) {
    console.error('EIGHT_X_EIGHT_WEBHOOK_SECRET not configured — rejecting webhook');
    return false;
  }
  for (const h of ['x-8x8-signature', 'x-signature', 'x-hub-signature-256']) {
    const provided = req.headers.get(h);
    if (provided) {
      const expected = await hmacHex(secret, raw);
      if (timingSafeEqual(provided.replace(/^sha256=/i, '').trim().toLowerCase(), expected)) return true;
    }
  }
  const staticHeader = req.headers.get('x-webhook-secret');
  return !!staticHeader && timingSafeEqual(staticHeader, secret);
}

// ---- 8x8 callflow builders (validate against your 8x8 account schema) ----
function buildSay(text: string) {
  // Defense in depth: strip markup/control chars and cap length before TTS, so
  // even a legacy/unsanitized off_duty_message can't inject SSML/markup.
  const safe = String(text || '').replace(/[<>]/g, '').replace(/[\u0000-\u001F\u007F]/g, ' ').slice(0, 320);
  return { action: 'say', params: { text: safe, language: 'en-US', voiceProfile: 'en-US-female' } };
}
function buildMakeCall(destination: string, callerId: string) {
  return {
    action: 'makeCall',
    params: {
      source: { type: 'phoneNumber', phoneNumber: callerId },
      destination: { type: 'phoneNumber', phoneNumber: destination },
    },
  };
}
function buildHangup() {
  return { action: 'sayAndHangup', params: { text: 'We are unable to connect your call at this time. Please try again later.', language: 'en-US' } };
}
function callflow(actions: unknown[]) {
  return { callflow: actions };
}

async function getMainOffice(base44: any): Promise<string> {
  const settings = await base44.asServiceRole.entities.AgencySettings.list('-created_date', 1).catch(() => []);
  return settings[0]?.main_office_number_e164 || '';
}

/**
 * Replay defense: reject calls whose provider timestamp is far from now. Only a
 * timestamp in the SIGNED body is trusted (HMAC covers the raw body). Fails
 * OPEN when absent/unparseable. Confirm 8x8's field name for your account.
 */
function isReplayStale(payload: any, maxSkewMs = 15 * 60 * 1000): boolean {
  const raw = payload?.timestamp ?? payload?.eventTime ?? payload?.time ?? payload?.createdTime ?? payload?.ts;
  if (raw == null) return false;
  let ms: number;
  if (typeof raw === 'number') ms = raw < 1e12 ? raw * 1000 : raw;
  else {
    const parsed = Date.parse(String(raw));
    if (Number.isNaN(parsed)) return false;
    ms = parsed;
  }
  return Math.abs(Date.now() - ms) > maxSkewMs;
}

Deno.serve(async (req) => {
  try {
    const raw = await req.text();
    if (!(await verifyWebhook(req, raw))) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(raw || '{}');
    if (isReplayStale(payload)) {
      return Response.json({ error: 'Stale webhook (possible replay)' }, { status: 401 });
    }
    const calledRaw = payload.called || payload.destination || payload.to;
    const callerRaw = payload.callerNumber || payload.source || payload.from || payload.caller;
    const providerCallId = payload.callId || payload.sessionId || payload.id || null;

    const base44 = createClientFromRequest(req);
    const mainOffice = await getMainOffice(base44);

    const workNum = normalizeE164(calledRaw) || calledRaw;
    const callerNum = normalizeE164(callerRaw) || callerRaw;

    const nurses = workNum ? await base44.asServiceRole.entities.User.filter({ work_phone_number: workNum }).catch(() => []) : [];
    const nurse = nurses[0];

    // Unresolved work number — fail safe to the main office.
    if (!nurse) {
      await base44.asServiceRole.entities.UserActivity.create({
        user_email: 'system', action: 'inbound_call_unresolved',
        details: { called: workNum, provider_call_id: providerCallId }, status: 'failure',
      }).catch(() => {});
      const fallback = mainOffice ? [buildMakeCall(mainOffice, workNum || mainOffice)] : [buildHangup()];
      return Response.json(callflow(fallback));
    }

    // Best-effort patient resolution for the log.
    let patientId: string | null = null;
    if (callerNum) {
      for (const v of phoneVariants(callerNum)) {
        const m = await base44.asServiceRole.entities.Patient.filter({ phone: v }).catch(() => []);
        if (m.length > 0) { patientId = m[0].id; break; }
      }
    }

    const offDuty = isOffDutyNow(nurse);
    const callMode = offDuty ? 'off_duty_transfer' : 'masked_bridge';

    // Idempotency: 8x8 may retry the VCA webhook. Only create the CallLog +
    // audit row once per provider call id; the callflow returned below is
    // deterministic, so re-returning it on a retry is safe.
    const existingCall = providerCallId
      ? await base44.asServiceRole.entities.CallLog.filter({ provider_call_id: providerCallId }, '-created_date', 1).catch(() => [])
      : [];
    if (existingCall.length === 0) {
      const logRow = await base44.asServiceRole.entities.CallLog.create({
        direction: 'inbound',
        from_number: callerNum,
        to_number: offDuty ? mainOffice : nurse.personal_cell_e164 || '',
        displayed_number: workNum,
        nurse_email: nurse.email,
        patient_id: patientId,
        call_mode: callMode,
        status: 'ringing',
        provider_call_id: providerCallId,
      });

      await base44.asServiceRole.entities.UserActivity.create({
        user_email: 'system',
        action: 'inbound_call_received',
        entity_type: 'CallLog',
        entity_id: logRow.id,
        details: { call_mode: callMode, nurse_email: nurse.email, patient_id: patientId, provider_call_id: providerCallId },
        status: 'success',
      }).catch(() => {});
    }

    // Off duty: greet, then transfer to the main office.
    if (offDuty) {
      const office = mainOffice || 'the main office';
      const greeting = (nurse.off_duty_message ||
        `Your nurse is currently off duty. Please hold while we connect you to our main office.`)
        .replace(/\{office\}/gi, office);
      const actions: unknown[] = [buildSay(greeting)];
      if (mainOffice) actions.push(buildMakeCall(mainOffice, workNum));
      else actions.push(buildHangup());
      return Response.json(callflow(actions));
    }

    // On duty: masked bridge to the nurse's personal cell (caller ID = work number).
    if (!nurse.personal_cell_e164) {
      const actions: unknown[] = [];
      if (mainOffice) actions.push(buildMakeCall(mainOffice, workNum));
      else actions.push(buildHangup());
      return Response.json(callflow(actions));
    }
    return Response.json(callflow([buildMakeCall(nurse.personal_cell_e164, workNum)]));
  } catch (error) {
    console.error('handleEightXEightVoiceCall error:', error);
    return Response.json(callflow([buildHangup()]));
  }
});

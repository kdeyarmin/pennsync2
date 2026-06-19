import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * handleTwilioVoiceCall — Twilio inbound-voice webhook for calls to a nurse's
 * work number. This is the heart of number masking.
 *
 * Twilio POSTs application/x-www-form-urlencoded. The response is TwiML XML,
 * not a JSON envelope. The X-Twilio-Signature header is verified before any
 * application logic runs.
 *
 *  - Agency closed (global hours) → after_hours_action: transfer/voicemail/hangup
 *  - Nurse off duty → speak off-duty greeting, transfer to main office
 *  - Nurse on duty, no cell → transfer to main office or hangup
 *  - Nurse on duty, cell on file → masked bridge (caller ID = work number);
 *    if Dial falls through (no answer), optionally record a voicemail
 */

function normalizeE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/[^\d]/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (String(raw).trim().startsWith('+') && digits.length >= 8 && digits.length <= 15 && digits[0] !== '0') return `+${digits}`;
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

// ---- Global business hours (mirrors src/components/voice/businessHours.js) ----
// Agency-wide "are we open?" gate. When closed, inbound calls auto-route to the
// after-hours destination regardless of any individual nurse's duty status.
const DAY_KEYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const WEEKDAY_INDEX: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
function parseHHMM(value: any): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(value || '').trim());
  if (!m) return null;
  const h = Number(m[1]); const min = Number(m[2]);
  if (h < 0 || h > 23 || min < 0 || min > 59) return null;
  return h * 60 + min;
}
function wallClockInTimeZone(date: Date, timeZone?: string): { weekday: number | null; minutes: number } {
  const dtf = new Intl.DateTimeFormat('en-US', { timeZone: timeZone || undefined, hour12: false, weekday: 'short', hour: '2-digit', minute: '2-digit' });
  const parts: Record<string, string> = {};
  for (const p of dtf.formatToParts(date)) parts[p.type] = p.value;
  let hour = parseInt(parts.hour, 10);
  if (hour === 24) hour = 0;
  const minute = parseInt(parts.minute, 10);
  const weekday = WEEKDAY_INDEX[parts.weekday];
  return { weekday: weekday ?? null, minutes: hour * 60 + minute };
}
function dateKeyInTimeZone(date: Date, timeZone?: string): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: timeZone || undefined, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
}
function isAgencyOpen(settings: any, now = new Date()): boolean {
  const s = settings || {};
  if (s.business_hours_enabled !== true) return true; // not enforced
  let wc; let dateKey;
  try { wc = wallClockInTimeZone(now, s.business_hours_timezone); dateKey = dateKeyInTimeZone(now, s.business_hours_timezone); }
  catch { wc = wallClockInTimeZone(now, undefined); dateKey = dateKeyInTimeZone(now, undefined); }
  if (Array.isArray(s.business_hours_holidays) && s.business_hours_holidays.includes(dateKey)) return false;
  const day = (s.business_hours || {})[DAY_KEYS[wc.weekday as number]];
  if (!day || day.enabled === false) return false;
  const open = parseHHMM(day.open); const close = parseHHMM(day.close);
  if (open == null || close == null) return false;
  const m = wc.minutes;
  // Strict `<` so equal open/close (e.g. 00:00-00:00 "open all day") is treated
  // as always-open, not always-closed. Mirrors src/components/voice/businessHours.js.
  return open < close ? (m >= open && m < close) : (m >= open || m < close);
}

// ---- Twilio signature verification (HMAC-SHA1, same scheme as fax handler) ----
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function hmacSha1Base64(key: string, msg: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function verifyTwilioSignature(req: Request, params: Record<string, string>, authToken: string | null, storedWebhookSecret: string | null = null): Promise<boolean> {
  // Manual-test shared-secret path: accept an x-webhook-secret header matching
  // EITHER the env TWILIO_WEBHOOK_SECRET or the in-app IntegrationSecret
  // webhook_secret (both are advertised as accepted by the status/test functions).
  const envSecret = Deno.env.get('TWILIO_WEBHOOK_SECRET');
  const headerSecret = req.headers.get('x-webhook-secret');
  if (headerSecret && ((envSecret && timingSafeEqual(headerSecret, envSecret)) || (storedWebhookSecret && timingSafeEqual(headerSecret, storedWebhookSecret)))) return true;
  const provided = req.headers.get('x-twilio-signature');
  if (!authToken || !provided) return false;
  const url = Deno.env.get('TWILIO_WEBHOOK_URL') || req.url;
  let data = url;
  for (const k of Object.keys(params).sort()) data += k + params[k];
  const expected = await hmacSha1Base64(authToken, data);
  return timingSafeEqual(provided.trim(), expected);
}

/**
 * Resolve Twilio credentials: prefer env vars, then fall back to the
 * IntegrationSecret row saved by the super admin in-app.
 */
async function resolveTwilioCreds(base44: any): Promise<{ accountSid: string | null; authToken: string | null; storedWebhookSecret: string | null }> {
  const envSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const envToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  let sid = envSid && envSid.trim() ? envSid.trim() : null;
  let token = envToken && envToken.trim() ? envToken.trim() : null;
  let storedWebhookSecret: string | null = null;
  // Always read the stored row: even when credentials come from env, an in-app
  // webhook_secret may configure the x-webhook-secret manual-test path.
  try {
    const rows = await base44.asServiceRole.entities.IntegrationSecret.filter({ provider: 'twilio' });
    const rec = rows?.[0] || {};
    if (!sid && rec.account_sid && String(rec.account_sid).trim()) sid = String(rec.account_sid).trim();
    if (!token && rec.auth_token && String(rec.auth_token).trim()) token = String(rec.auth_token).trim();
    if (rec.webhook_secret && String(rec.webhook_secret).trim()) storedWebhookSecret = String(rec.webhook_secret).trim();
  } catch { /* ignore */ }
  return { accountSid: sid, authToken: token, storedWebhookSecret };
}

// ---- TwiML helpers ----
function escapeXml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function safeSpeakText(text: string): string {
  return String(text || '').replace(/[\u0000-\u001F\u007F]/g, ' ').slice(0, 320);
}

function twimlSay(text: string): string {
  return `<Say voice="Polly.Joanna" language="en-US">${escapeXml(safeSpeakText(text))}</Say>`;
}

function twimlDial(destination: string, callerId: string): string {
  return `<Dial callerId="${escapeXml(callerId)}" timeout="20"><Number>${escapeXml(destination)}</Number></Dial>`;
}

function twimlHangup(message?: string): string {
  const sayPart = message ? twimlSay(message) : twimlSay('We are unable to connect your call at this time. Please try again later.');
  return `${sayPart}<Hangup/>`;
}

function twimlVoicemail(greeting: string, callbackBase: string | undefined): string {
  const sayCbAttrs = callbackBase
    ? ` recordingStatusCallback="${escapeXml(callbackBase)}/handleTwilioVoicemail" transcribeCallback="${escapeXml(callbackBase)}/handleTwilioVoicemail"`
    : '';
  return `${twimlSay(greeting)}<Record maxLength="120" playBeep="true" transcribe="true"${sayCbAttrs}/>`;
}

function twimlResponse(body: string): Response {
  return new Response(
    `<?xml version="1.0" encoding="UTF-8"?><Response>${body}</Response>`,
    { headers: { 'Content-Type': 'text/xml' } },
  );
}

async function getCallConfig(base44: any): Promise<{
  settings: any;
  mainOffice: string;
  voicemailEnabled: boolean;
  voicemailGreeting: string;
  afterHoursAction: string;
  afterHoursTransfer: string;
  afterHoursGreeting: string;
}> {
  const settings = await base44.asServiceRole.entities.AgencySettings.list('-created_date', 1).catch(() => []);
  const s = settings[0] || {};
  const mainOffice = s.main_office_number_e164 || '';
  return {
    settings: s,
    mainOffice,
    voicemailEnabled: s.voicemail_enabled === true,
    voicemailGreeting: s.voicemail_greeting || '',
    // What to do with an inbound call when the practice is closed for the day:
    // 'transfer' (default) → after-hours number, 'voicemail' → record, 'hangup'.
    afterHoursAction: s.after_hours_call_action || 'transfer',
    afterHoursTransfer: s.after_hours_transfer_number_e164 || mainOffice,
    afterHoursGreeting: s.after_hours_call_greeting || '',
  };
}

Deno.serve(async (req) => {
  try {
    const formData = await req.formData();
    const params: Record<string, string> = {};
    for (const [k, v] of formData.entries()) params[k] = String(v);

    if (Deno.env.get('TWILIO_WEBHOOK_DEBUG')) {
      // Log only which signature headers are PRESENT and the content type — never
      // the Twilio params themselves (From/To are caller PHI). Mirrors the SMS handler.
      const present = ['x-twilio-signature', 'x-webhook-secret'].filter((h) => req.headers.get(h));
      console.log('[webhook-debug] handleTwilioVoiceCall ' + JSON.stringify({ signature_headers_present: present, content_type: req.headers.get('content-type') }));
    }

    const base44 = createClientFromRequest(req);
    const { authToken, storedWebhookSecret } = await resolveTwilioCreds(base44);
    if (!(await verifyTwilioSignature(req, params, authToken, storedWebhookSecret))) {
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response><Say voice="Polly.Joanna" language="en-US">Unauthorized</Say><Hangup/></Response>', { status: 401, headers: { 'Content-Type': 'text/xml' } });
    }

    // Parse Twilio inbound-voice params.
    const callerRaw = params.From;
    const calledRaw = params.To;
    const providerCallId = params.CallSid || null;

    const { settings, mainOffice, voicemailEnabled, voicemailGreeting, afterHoursAction, afterHoursTransfer, afterHoursGreeting } = await getCallConfig(base44);
    // Global calling hours win over any individual nurse's duty status.
    const agencyClosed = !isAgencyOpen(settings);

    const workNum = normalizeE164(calledRaw) || calledRaw;
    const callerNum = normalizeE164(callerRaw) || callerRaw;
    const functionsBase = (Deno.env.get('FUNCTIONS_BASE_URL') || '').trim().replace(/\/+$/, '');

    // Resolve the nurse via the same phoneVariants fan-out used for the caller,
    // so a stored work_phone_number in a different format doesn't route a real
    // nurse's call to the main office.
    let nurse = null;
    for (const variant of (workNum ? phoneVariants(workNum) : [])) {
      const matches = await base44.asServiceRole.entities.User.filter({ work_phone_number: variant }).catch(() => []);
      if (matches.length > 0) { nurse = matches[0]; break; }
    }

    // Unresolved work number — fail safe to the main office.
    if (!nurse) {
      await base44.asServiceRole.entities.UserActivity.create({
        user_email: 'system', action: 'inbound_call_unresolved',
        details: { called: workNum, provider_call_id: providerCallId }, status: 'failure',
      }).catch(() => {});
      if (mainOffice) {
        return twimlResponse(twimlDial(mainOffice, workNum || mainOffice));
      }
      return twimlResponse(twimlHangup());
    }

    // Best-effort patient resolution for the log.
    let patientId: string | null = null;
    if (callerNum) {
      const variants = [...new Set(phoneVariants(callerNum))];
      for (const v of variants) {
        const m = await base44.asServiceRole.entities.Patient.filter({ phone: v }).catch(() => []);
        if (m.length > 0) { patientId = m[0].id; break; }
      }
    }

    const offDuty = isOffDutyNow(nurse);
    const hasCell = !!nurse.personal_cell_e164;
    // An on-duty nurse with no cell on file has no bridge target, so the call
    // actually routes to the main office too — record the log to match reality
    // (not a masked_bridge to an empty number). When the agency is closed, the
    // global after-hours route takes precedence over masked bridging.
    const routesToOffice = agencyClosed || offDuty || !hasCell;
    const callMode = agencyClosed ? 'after_hours_transfer' : routesToOffice ? 'off_duty_transfer' : 'masked_bridge';
    const loggedTo = agencyClosed
      ? (afterHoursAction === 'transfer' ? afterHoursTransfer : '')
      : routesToOffice
        ? mainOffice
        : nurse.personal_cell_e164;

    // Idempotency: Twilio may retry the inbound-voice webhook. Only create the
    // CallLog + audit row once per provider call id; the TwiML returned below is
    // deterministic, so re-returning it on a retry is safe.
    const existingCall = providerCallId
      ? await base44.asServiceRole.entities.CallLog.filter({ provider_call_id: providerCallId }, '-created_date', 1).catch(() => [])
      : [];
    if (existingCall.length === 0) {
      const logRow = await base44.asServiceRole.entities.CallLog.create({
        direction: 'inbound',
        from_number: callerNum,
        to_number: loggedTo,
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

    // Agency closed (global calling hours): auto-handle before any per-nurse
    // routing. Default is to transfer to the after-hours number; an admin can
    // instead choose voicemail or a polite hangup.
    if (agencyClosed) {
      const office = afterHoursTransfer || mainOffice || 'the main office';
      if (afterHoursAction === 'voicemail' && voicemailEnabled) {
        const vmGreeting = (afterHoursGreeting || voicemailGreeting ||
          `Our office is currently closed. Please leave a message after the tone and we will return your call.`)
          .replace(/\{office\}/gi, office);
        return twimlResponse(twimlVoicemail(vmGreeting, functionsBase));
      }
      if (afterHoursAction === 'hangup' || (!afterHoursTransfer && !mainOffice)) {
        const msg = (afterHoursGreeting || `Our office is currently closed. Please call back during business hours.`)
          .replace(/\{office\}/gi, office);
        return twimlResponse(twimlHangup(msg));
      }
      const greeting = (afterHoursGreeting ||
        `Our office is currently closed. Please hold while we connect you.`)
        .replace(/\{office\}/gi, office);
      const target = afterHoursTransfer || mainOffice;
      if (!target) return twimlResponse(twimlHangup());
      return twimlResponse(`${twimlSay(greeting)}${twimlDial(target, workNum)}`);
    }

    // Off duty: greet, then transfer to the main office.
    if (offDuty) {
      const office = mainOffice || 'the main office';
      const greeting = (nurse.off_duty_message ||
        `Your nurse is currently off duty. Please hold while we connect you to our main office.`)
        .replace(/\{office\}/gi, office);
      if (mainOffice) {
        return twimlResponse(`${twimlSay(greeting)}${twimlDial(mainOffice, workNum)}`);
      }
      return twimlResponse(twimlHangup(greeting));
    }

    // On duty: masked bridge to the nurse's personal cell (caller ID = work number).
    if (!nurse.personal_cell_e164) {
      if (mainOffice) return twimlResponse(twimlDial(mainOffice, workNum));
      return twimlResponse(twimlHangup());
    }

    // Twilio's <Dial> automatically continues to subsequent verbs if the dialed
    // party doesn't answer, so emit the <Dial> then the voicemail verbs after it.
    let body = twimlDial(nurse.personal_cell_e164, workNum);
    if (voicemailEnabled) {
      const greeting = (voicemailGreeting || `You've reached your care team. Please leave a message after the tone and we will return your call.`)
        .replace(/\{office\}/gi, mainOffice || 'the main office');
      body += twimlVoicemail(greeting, functionsBase);
    }
    return twimlResponse(body);
  } catch (error) {
    console.error('handleTwilioVoiceCall error:', error);
    // On any error return a safe TwiML hangup so Twilio doesn't retry forever.
    return twimlResponse(twimlHangup());
  }
});

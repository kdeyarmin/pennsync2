import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * handleTwilioInboundSms — webhook for inbound (patient -> nurse) SMS from Twilio.
 *
 * Flow: verify Twilio signature -> resolve nurse (by the work number that was
 * texted) and patient (by sender) -> handle STOP/HELP/START keywords FIRST
 * (TCPA) -> store the inbound message -> if the nurse is off duty, auto-reply
 * with their off-duty message + the main office number -> notify the nurse
 * in-app.
 *
 * All Twilio webhooks are application/x-www-form-urlencoded; parsed with
 * req.formData(). Signature verification uses HMAC-SHA1 over the URL +
 * sorted POST params, matching Twilio's scheme exactly.
 *
 * After a verified webhook is processed it returns an empty TwiML body so
 * Twilio does not retry indefinitely. An invalid signature is rejected with 401.
 */

const STOP_WORDS = ['STOP', 'STOPALL', 'UNSUBSCRIBE', 'CANCEL', 'END', 'QUIT'];
const START_WORDS = ['START', 'UNSTOP', 'YES'];
const HELP_WORDS = ['HELP', 'INFO'];

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

// Mirrors isOffDutyNow() in src/components/voice/dutyUtils.js — manual toggle OR
// an active scheduled time-off window, evaluated live at message time.
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
// Agency-wide "are we open?" gate. When closed, an inbound text gets an
// automatic after-hours reply in addition to the per-nurse off-duty reply.
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
  return open <= close ? (m >= open && m < close) : (m >= open || m < close);
}

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

/**
 * Resolve Twilio credentials: prefer env vars, then the in-app IntegrationSecret
 * row with provider 'twilio'. Either path configures the integration, so the
 * Base44 dashboard env is optional.
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

/**
 * Verify Twilio's X-Twilio-Signature: base64(HMAC-SHA1(authToken, url + sorted
 * concatenated POST params)). Fails closed. If your deployment sits behind a
 * proxy that rewrites host/path, set TWILIO_WEBHOOK_URL to the exact URL Twilio
 * is configured to call. An optional TWILIO_WEBHOOK_SECRET + x-webhook-secret
 * header is supported for manual testing only.
 */
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

async function getAgencyConfig(base44: any) {
  const settings = await base44.asServiceRole.entities.AgencySettings.list('-created_date', 1).catch(() => []);
  const s = settings[0] || {};
  return {
    settings: s,
    mainOffice: s.main_office_number_e164 || '',
    defaultOffDuty: s.default_off_duty_template || '',
    smsEnabled: s.sms_messaging_enabled ?? true,
    // Automatic after-hours reply when the practice is closed (global hours).
    afterHoursReplyEnabled: s.after_hours_sms_auto_reply_enabled !== false,
    afterHoursReply: s.after_hours_sms_auto_reply || '',
    // Urgent-keyword escalation.
    urgentEscalationEnabled: s.urgent_escalation_enabled !== false,
    urgentKeywords: Array.isArray(s.urgent_keywords) ? s.urgent_keywords : [],
  };
}

// ---- urgent-keyword detection (mirrors src/components/voice/urgentKeywords.js) ----
const DEFAULT_URGENT_KEYWORDS = [
  'emergency', 'urgent', '911', 'chest pain', "can't breathe", 'cant breathe',
  'trouble breathing', 'short of breath', 'suicidal', 'kill myself', 'overdose',
  'bleeding', 'blood', 'fell', 'fall', 'fallen', 'passed out', 'unconscious',
  'stroke', 'seizure', 'severe pain', 'help me', 'not breathing', 'unresponsive',
];
function escapeRe(s: string): string { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }
function detectUrgency(text: string, extra: string[] = []): { urgent: boolean; matches: string[] } {
  const s = String(text || '');
  if (!s.trim()) return { urgent: false, matches: [] };
  const extras = (Array.isArray(extra) ? extra : []).map((k) => String(k || '').toLowerCase().trim()).filter(Boolean);
  const all = [...new Set([...DEFAULT_URGENT_KEYWORDS, ...extras])];
  const matches: string[] = [];
  for (const kw of all) {
    if (!kw) continue;
    if (new RegExp(`\\b${escapeRe(kw)}\\b`, 'i').test(s)) matches.push(kw);
  }
  return { urgent: matches.length > 0, matches };
}

/**
 * Send an SMS auto-reply via Twilio Messages API. Bounded by a 10 s timeout so
 * a hung send doesn't delay the TwiML ack and trigger Twilio webhook retries.
 */
async function sendAutoReply(accountSid: string, authToken: string, from: string, to: string, text: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10000);
  try {
    const params = new URLSearchParams({ To: to, From: from, Body: text });
    return await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
      signal: controller.signal,
    });
  } catch (err) {
    console.error('auto-reply send failed:', err);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  try {
    const formData = await req.formData();
    const params: Record<string, string> = {};
    for (const [k, v] of formData.entries()) params[k] = String(v);

    const base44 = createClientFromRequest(req);
    const { accountSid, authToken, storedWebhookSecret } = await resolveTwilioCreds(base44);

    const verified = await verifyTwilioSignature(req, params, authToken, storedWebhookSecret);
    // Diagnostic mode (TWILIO_WEBHOOK_DEBUG): log which signature headers are
    // PRESENT and whether verification passed — never any secret/value.
    if (Deno.env.get('TWILIO_WEBHOOK_DEBUG')) {
      const present = ['x-twilio-signature', 'x-webhook-secret'].filter((h) => req.headers.get(h));
      console.log('[webhook-debug] handleTwilioInboundSms ' + JSON.stringify({ verified, signature_headers_present: present, content_type: req.headers.get('content-type') }));
    }
    if (!verified) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Parse Twilio inbound SMS form fields.
    const source = params.From;
    const destination = params.To;
    const text = (params.Body || '').toString();
    const providerMessageId = params.MessageSid || null;

    if (!source || !destination) {
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
    }

    const config = await getAgencyConfig(base44);

    const patientNum = normalizeE164(source) || source;
    const workNum = normalizeE164(destination) || destination;

    // Resolve the nurse who owns this work number.
    const nurses = await base44.asServiceRole.entities.User.filter({ work_phone_number: workNum }).catch(() => []);
    const nurse = nurses[0];
    if (!nurse) {
      // Unknown work number — do not leak; log anomaly and exit.
      await base44.asServiceRole.entities.UserActivity.create({
        user_email: 'system',
        action: 'sms_received_unresolved',
        details: { destination: workNum, timestamp: new Date().toISOString() },
        status: 'failure',
      }).catch(() => {});
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
    }

    // Idempotency: Twilio retries webhooks. If we already stored this MessageSid,
    // acknowledge without creating a duplicate row, re-notifying, or (critically
    // for TCPA) re-sending an auto-reply.
    if (providerMessageId) {
      const dup = await base44.asServiceRole.entities.SmsMessage
        .filter({ provider_message_id: providerMessageId }, '-created_date', 1).catch(() => []);
      if (dup.length > 0) {
        return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
      }
    }

    // Resolve patient (best effort).
    let patientId: string | null = null;
    for (const variant of phoneVariants(patientNum)) {
      const m = await base44.asServiceRole.entities.Patient.filter({ phone: variant }).catch(() => []);
      if (m.length > 0) { patientId = m[0].id; break; }
    }

    const keyword = text.trim().toUpperCase();
    const sendReply = (msg: string) =>
      accountSid && authToken ? sendAutoReply(accountSid, authToken, workNum, patientNum, msg) : Promise.resolve(null);

    const recordConsent = (status: string, sourceTag: string) =>
      base44.asServiceRole.entities.SmsConsent.create({
        patient_id: patientId,
        phone_e164: patientNum,
        consent_status: status,
        consent_source: sourceTag,
        captured_by: null,
        captured_at: new Date().toISOString(),
        notes: `Inbound keyword "${keyword}" to ${nurse.email}`,
      }).catch((err) => console.error('consent write failed:', err));

    // Always store the inbound message.
    const inboundRow = await base44.asServiceRole.entities.SmsMessage.create({
      direction: 'inbound',
      from_number: patientNum,
      to_number: workNum,
      body: text,
      nurse_email: nurse.email,
      patient_id: patientId,
      thread_id: getThreadId(patientNum, workNum),
      status: 'received',
      provider_message_id: providerMessageId,
      is_read: false,
      consent_checked: false,
    });

    // Opt-out status, computed once and FAIL-CLOSED: if the consent ledger
    // can't be read, assume opted-out so we never text someone after STOP.
    let priorOptedOut = true;
    try {
      const consents = await base44.asServiceRole.entities.SmsConsent
        .filter({ phone_e164: patientNum }, '-captured_at', 1);
      priorOptedOut = consents[0]?.consent_status === 'opted_out';
    } catch (err) {
      console.error('consent read failed; suppressing non-essential auto-reply:', err);
      priorOptedOut = true;
    }
    const smsEnabled = config.smsEnabled !== false;

    // --- Keyword handling FIRST (TCPA, legally required) ---
    if (STOP_WORDS.includes(keyword)) {
      await recordConsent('opted_out', 'keyword_stop');
      await sendReply('You have been unsubscribed and will no longer receive texts from your care team. Reply START to opt back in.');
      await base44.asServiceRole.entities.UserActivity.create({
        user_email: 'system', action: 'sms_opt_out', entity_type: 'SmsMessage', entity_id: inboundRow.id,
        details: { phone: patientNum, nurse_email: nurse.email, patient_id: patientId }, status: 'success',
      }).catch(() => {});
      return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
    }
    if (START_WORDS.includes(keyword)) {
      await recordConsent('opted_in', 'keyword_start');
      await sendReply('You are now subscribed to texts from your care team. Reply STOP to opt out, HELP for help.');
    } else if (HELP_WORDS.includes(keyword)) {
      // HELP is transactional but still skip if opted-out / SMS disabled.
      if (!priorOptedOut && smsEnabled) {
        const office = config.mainOffice ? ` or call our office at ${config.mainOffice}` : '';
        await sendReply(`This is your home-health care team. Reply STOP to unsubscribe${office}.`);
      }
    }

    // --- Automatic after-hours / off-duty reply (not opted out + SMS on) ---
    // Global calling hours win: if the practice is closed, send the after-hours
    // reply. Otherwise fall back to the per-nurse off-duty reply. Only ever one
    // automatic reply, so a patient isn't double-texted.
    const offDuty = isOffDutyNow(nurse);
    const agencyClosed = !isAgencyOpen(config.settings);
    if (agencyClosed && config.afterHoursReplyEnabled && !priorOptedOut && smsEnabled) {
      const office = config.mainOffice || 'the main office';
      const msg = (config.afterHoursReply || config.defaultOffDuty ||
        `Thanks for your message. Our office is currently closed. For anything urgent, please call ${office}. We'll reply during business hours.`)
        .replace(/\{office\}/gi, office);
      await sendReply(msg);
    } else if (offDuty && !priorOptedOut && smsEnabled) {
      const office = config.mainOffice || 'the main office';
      const msg = (nurse.off_duty_message || config.defaultOffDuty ||
        `Your nurse is currently off duty. For assistance, please call the main office at ${office}.`)
        .replace(/\{office\}/gi, office);
      await sendReply(msg);
    }

    // --- Urgent-keyword escalation: a possibly-clinical text shouldn't wait in
    // the inbox. Fire a high-priority notification (in addition to the normal one).
    const urgency = config.urgentEscalationEnabled ? detectUrgency(text, config.urgentKeywords) : { urgent: false, matches: [] };
    if (urgency.urgent) {
      await base44.asServiceRole.entities.Notification.create({
        user_email: nurse.email,
        title: '🚨 Possibly urgent patient text',
        message: `A text from ${patientNum} may need immediate attention (flagged: ${urgency.matches.slice(0, 3).join(', ')}). Review now.`,
        type: 'sms_urgent',
        priority: 'urgent',
        related_entity: 'SmsMessage',
        related_entity_id: inboundRow.id,
        is_read: false,
      }).catch((err) => console.error('urgent notification failed:', err));
    }

    // --- Notify the nurse in-app ---
    await base44.asServiceRole.entities.Notification.create({
      user_email: nurse.email,
      title: '💬 New text message',
      message: `You have a new text from ${patientNum}.`,
      type: 'sms_received',
      priority: 'normal',
      related_entity: 'SmsMessage',
      related_entity_id: inboundRow.id,
      is_read: false,
    }).catch((err) => console.error('notification failed:', err));

    // Audit — never log message body.
    await base44.asServiceRole.entities.UserActivity.create({
      user_email: 'system',
      action: 'sms_received',
      entity_type: 'SmsMessage',
      entity_id: inboundRow.id,
      details: {
        from_number: patientNum,
        to_number: workNum,
        nurse_email: nurse.email,
        patient_id: patientId,
        thread_id: inboundRow.thread_id,
        body_length: text.length,
        off_duty: offDuty,
        agency_closed: agencyClosed,
        urgent: urgency.urgent,
      },
      status: 'success',
    }).catch(() => {});

    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
  } catch (error) {
    console.error('handleTwilioInboundSms error:', error);
    // Still return TwiML so Twilio does not hammer retries on a parse error.
    return new Response('<?xml version="1.0" encoding="UTF-8"?><Response></Response>', { headers: { 'Content-Type': 'text/xml' } });
  }
});

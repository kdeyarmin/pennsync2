import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * handleEightXEightInboundSms — webhook for inbound (patient -> nurse) SMS.
 *
 * Flow: verify signature -> resolve nurse (by the work number that was texted)
 * and patient (by sender) -> handle STOP/HELP/START keywords FIRST (TCPA) ->
 * store the inbound message -> if the nurse is off duty, auto-reply with their
 * off-duty message + the main office number -> notify the nurse in-app.
 *
 * After a verified webhook is processed it returns 200 so 8x8 does not retry
 * indefinitely. An invalid signature is rejected with 401 (before processing).
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
  return digits ? `+${digits}` : null;
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
  if (user.scheduled_off_duty_recurring) {
    if (t < s) return false;
    const week = 7 * 24 * 60 * 60 * 1000;
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

/**
 * Verifies the webhook came from 8x8. Tries an HMAC-SHA256 signature header
 * first, then falls back to a static shared-secret header. Fails closed.
 * NOTE: confirm the exact header name + signing scheme in 8x8 Connect and
 * adjust SIGNATURE_HEADERS if needed.
 */
async function verifyWebhook(req: Request, raw: string): Promise<boolean> {
  const secret = Deno.env.get('EIGHT_X_EIGHT_WEBHOOK_SECRET');
  if (!secret) {
    console.error('EIGHT_X_EIGHT_WEBHOOK_SECRET not configured — rejecting webhook');
    return false;
  }
  const SIGNATURE_HEADERS = ['x-8x8-signature', 'x-signature', 'x-hub-signature-256'];
  for (const h of SIGNATURE_HEADERS) {
    const provided = req.headers.get(h);
    if (provided) {
      const expected = await hmacHex(secret, raw);
      const cleaned = provided.replace(/^sha256=/i, '').trim();
      if (timingSafeEqual(cleaned.toLowerCase(), expected)) return true;
    }
  }
  // Fallback: static shared secret header
  const staticHeader = req.headers.get('x-webhook-secret');
  if (staticHeader && timingSafeEqual(staticHeader, secret)) return true;
  return false;
}

async function getAgencyConfig(base44: any) {
  const settings = await base44.asServiceRole.entities.AgencySettings.list('-created_date', 1).catch(() => []);
  const s = settings[0] || {};
  return {
    smsSubAccountId: s.eight_x_eight_sms_subaccount_id,
    region: s.eight_x_eight_region || 'us',
    mainOffice: s.main_office_number_e164 || '',
    defaultOffDuty: s.default_off_duty_template || '',
    smsEnabled: s.sms_messaging_enabled ?? true,
  };
}

async function sendSms8x8(apiKey: string, host: string, subAccountId: string, source: string, destination: string, text: string) {
  const url = `${host}/api/v1/subaccounts/${subAccountId}/messages`;
  return fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ source, destination, text, encoding: 'AUTO', clientMessageId: crypto.randomUUID() }),
  }).catch((err) => { console.error('auto-reply send failed:', err); return null; });
}

Deno.serve(async (req) => {
  try {
    const raw = await req.text();

    if (!(await verifyWebhook(req, raw))) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(raw || '{}');
    // 8x8 inbound payload field names can vary by product; parse defensively.
    const source = payload.source || payload.from || payload.msisdn || payload.sender;
    const destination = payload.destination || payload.to || payload.recipient;
    const text = (payload.text || payload.message || payload.body || '').toString();
    const providerMessageId = payload.umid || payload.messageId || payload.id || null;

    if (!source || !destination) {
      return Response.json({ success: false, message: 'Missing source/destination' });
    }

    const base44 = createClientFromRequest(req);
    const config = await getAgencyConfig(base44);
    const apiKey = Deno.env.get('EIGHT_X_EIGHT_API_KEY');
    const host = `https://sms.${config.region}.8x8.com`;

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
      return Response.json({ success: true });
    }

    // Resolve patient (best effort).
    let patientId: string | null = null;
    for (const variant of phoneVariants(patientNum)) {
      const m = await base44.asServiceRole.entities.Patient.filter({ phone: variant }).catch(() => []);
      if (m.length > 0) { patientId = m[0].id; break; }
    }

    const keyword = text.trim().toUpperCase();
    const sendReply = (msg: string) =>
      apiKey && config.smsSubAccountId ? sendSms8x8(apiKey, host, config.smsSubAccountId, workNum, patientNum, msg) : Promise.resolve(null);

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

    // --- Keyword handling FIRST (TCPA, legally required) ---
    if (STOP_WORDS.includes(keyword)) {
      await recordConsent('opted_out', 'keyword_stop');
      await sendReply('You have been unsubscribed and will no longer receive texts from your care team. Reply START to opt back in.');
      await base44.asServiceRole.entities.UserActivity.create({
        user_email: 'system', action: 'sms_opt_out', entity_type: 'SmsMessage', entity_id: inboundRow.id,
        details: { phone: patientNum, nurse_email: nurse.email, patient_id: patientId }, status: 'success',
      }).catch(() => {});
      return Response.json({ success: true });
    }
    if (START_WORDS.includes(keyword)) {
      await recordConsent('opted_in', 'keyword_start');
      await sendReply('You are now subscribed to texts from your care team. Reply STOP to opt out, HELP for help.');
    } else if (HELP_WORDS.includes(keyword)) {
      const office = config.mainOffice ? ` or call our office at ${config.mainOffice}` : '';
      await sendReply(`This is your home-health care team. Reply STOP to unsubscribe${office}.`);
    }

    // --- Off-duty auto-reply (skip if the sender just opted out above) ---
    const offDuty = isOffDutyNow(nurse);
    if (offDuty) {
      const optedOut = (await base44.asServiceRole.entities.SmsConsent
        .filter({ phone_e164: patientNum }, '-captured_at', 1).catch(() => []))[0]?.consent_status === 'opted_out';
      if (!optedOut) {
        const office = config.mainOffice || 'the main office';
        const msg = (nurse.off_duty_message || config.defaultOffDuty ||
          `Your nurse is currently off duty. For assistance, please call the main office at ${office}.`)
          .replace(/\{office\}/gi, office);
        await sendReply(msg);
      }
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
      },
      status: 'success',
    }).catch(() => {});

    return Response.json({ success: true });
  } catch (error) {
    console.error('handleEightXEightInboundSms error:', error);
    // Still return 200 so 8x8 does not hammer retries on a parse error.
    return Response.json({ success: false, error: error.message });
  }
});

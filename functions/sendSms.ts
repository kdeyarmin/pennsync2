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

async function resolvePatientId(base44: any, e164: string): Promise<string | null> {
  for (const variant of phoneVariants(e164)) {
    const matches = await base44.asServiceRole.entities.Patient.filter({ phone: variant }).catch(() => []);
    if (matches.length > 0) return matches[0].id;
  }
  return null;
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

    const fromNumber = user.work_phone_number;
    if (!fromNumber) {
      return Response.json({ error: 'No work number assigned to your account. Ask an admin to provision one.' }, { status: 400 });
    }

    const destination = normalizeE164(to_number);
    if (!destination) {
      return Response.json({ error: 'Invalid destination phone number' }, { status: 400 });
    }

    const apiKey = Deno.env.get('EIGHT_X_EIGHT_API_KEY');
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

    // Send via 8x8 SMS API
    const host = `https://sms.${region}.8x8.com`;
    const url = `${host}/api/v1/subaccounts/${smsSubAccountId}/messages`;
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
    });

    const data = await resp.json().catch(() => ({}));

    if (!resp.ok) {
      await base44.entities.SmsMessage.update(smsRow.id, {
        status: 'failed',
        failure_reason: data?.message || data?.error || `8x8 API error (${resp.status})`,
      });
      return Response.json({ error: '8x8 SMS API error', details: data }, { status: resp.status });
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

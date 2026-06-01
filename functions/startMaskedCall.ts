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

    const apiKey = Deno.env.get('EIGHT_X_EIGHT_API_KEY');
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
    // the work number as the presented caller ID.
    const url = `${voiceBase}/subaccounts/${voiceSubAccountId}/callflows`;
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
    });

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      await base44.entities.CallLog.update(callLog.id, {
        status: 'failed',
        failure_reason: data?.message || data?.error || `8x8 Voice API error (${resp.status})`,
      });
      return Response.json({ error: '8x8 Voice API error', details: data }, { status: resp.status });
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

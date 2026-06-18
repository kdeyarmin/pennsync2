import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Resolve Twilio credentials: prefer env vars, then the in-app IntegrationSecret
 * row with provider 'twilio'. Mirrors the SMS/voice handlers so fax sending works
 * for agencies that store credentials in-app rather than in the dashboard env.
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

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, to_number, document_name, to_name, patient_id } = await req.json();

    if (!file_url || !to_number) {
      return Response.json({ error: 'Missing required fields: file_url, to_number' }, { status: 400 });
    }

    const { accountSid, authToken } = await resolveTwilioCreds(base44);
    const fromNumber = Deno.env.get('TWILIO_FAX_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      return Response.json({ error: 'Twilio credentials not configured' }, { status: 500 });
    }

    // Log the fax in the database
    const faxLog = await base44.entities.FaxLog.create({
      from_number: fromNumber,
      to_number: to_number,
      to_name: to_name || null,
      document_url: file_url,
      document_name: document_name || 'Fax',
      status: 'queued',
      patient_id: patient_id || null,
      sent_by: user.email
    });

    // Send fax via Twilio
    const formData = new URLSearchParams();
    formData.append('To', to_number);
    formData.append('From', fromNumber);
    formData.append('MediaUrl', file_url);
    formData.append('Quality', 'fine');

    let twilioResponse: Response;
    try {
      twilioResponse = await fetch(
        `https://fax.twilio.com/v1/Faxes`,
        {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: formData.toString()
        }
      );
    } catch (netErr) {
      // Network/DNS failure: don't strand the row in 'queued'/'sending'.
      await base44.entities.FaxLog.update(faxLog.id, {
        status: 'failed',
        failure_reason: `Network error reaching Twilio: ${netErr.message}`,
      }).catch(() => {});
      return Response.json({ error: 'Failed to reach fax provider' }, { status: 502 });
    }

    const twilioData = await twilioResponse.json().catch(() => ({}));

    if (!twilioResponse.ok) {
      // Log provider detail server-side; never echo it to the client (it can
      // contain the recipient number / document URL — PHI).
      console.error('Twilio fax send error', { status: twilioResponse.status, code: twilioData?.code, log_id: faxLog.id });
      await base44.entities.FaxLog.update(faxLog.id, {
        status: 'failed',
        failure_reason: twilioData.message || 'Fax send failed'
      });
      return Response.json({ error: 'Fax provider rejected the request', log_id: faxLog.id }, { status: twilioResponse.status });
    }

    // Update log with Twilio SID
    await base44.entities.FaxLog.update(faxLog.id, {
      telnyx_fax_id: twilioData.sid, // reusing existing field to store fax SID
      status: 'sending'
    });

    // Log activity
    await base44.entities.UserActivity.create({
      user_email: user.email,
      user_name: user.full_name,
      action: 'fax_sent',
      details: {
        to_number,
        from_number: fromNumber,
        fax_sid: twilioData.sid,
        log_id: faxLog.id,
        timestamp: new Date().toISOString()
      },
      page: 'fax',
      user_agent: req.headers.get('user-agent') || 'unknown'
    });

    return Response.json({
      success: true,
      fax_sid: twilioData.sid,
      log_id: faxLog.id,
      status: twilioData.status,
      message: 'Fax sent successfully'
    });

  } catch (error) {
    // Don't return raw error text (may contain PHI like numbers/URLs).
    console.error('sendFax error:', error?.message);
    return Response.json({ error: 'Failed to send fax' }, { status: 500 });
  }
});

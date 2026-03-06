import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

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

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
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

    const twilioResponse = await fetch(
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

    const twilioData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      await base44.entities.FaxLog.update(faxLog.id, {
        status: 'failed',
        failure_reason: twilioData.message || 'Fax send failed'
      });
      return Response.json({ error: 'Twilio API error', details: twilioData }, { status: twilioResponse.status });
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
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Retry a failed fax transmission
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fax_log_id } = await req.json();

    if (!faxLogId) {
      return Response.json({ error: 'fax_log_id required' }, { status: 400 });
    }

    // Fetch the original fax log
    const faxLogs = await base44.entities.FaxLog.filter({ id: fax_log_id });
    if (faxLogs.length === 0) {
      return Response.json({ error: 'FaxLog not found' }, { status: 404 });
    }

    const originalFax = faxLogs[0];
    const maxRetries = 3;

    // Check retry limit
    if (originalFax.retry_count >= maxRetries) {
      return Response.json({
        error: `Maximum retries (${maxRetries}) exceeded`,
        success: false
      }, { status: 400 });
    }

    // Get Twilio credentials
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_FAX_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      return Response.json({
        error: 'Twilio credentials not configured',
        success: false
      }, { status: 500 });
    }

    const twilioUrl = `https://fax.twilio.com/v1/Faxes`;

    // Re-send the fax
    const formData = new URLSearchParams();
    formData.append('From', fromNumber);
    formData.append('To', originalFax.to_number);
    formData.append('MediaUrl', originalFax.document_url);

    const auth = btoa(`${accountSid}:${authToken}`);

    const twilioResponse = await fetch(twilioUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: formData.toString()
    });

    if (!twilioResponse.ok) {
      const errorData = await twilioResponse.text();
      console.error('Twilio error:', errorData);
      return Response.json({
        error: 'Failed to send fax via Twilio',
        details: errorData,
        success: false
      }, { status: twilioResponse.status });
    }

    const faxData = await twilioResponse.json();

    // Create new FaxLog record for retry
    const newFaxLog = await base44.entities.FaxLog.create({
      from_number: originalFax.from_number,
      to_number: originalFax.to_number,
      to_name: originalFax.to_name,
      document_url: originalFax.document_url,
      document_name: originalFax.document_name + ' (Retry)',
      status: 'queued',
      telnyx_fax_id: faxData.sid,
      pages: originalFax.pages,
      cover_page_details: originalFax.cover_page_details,
      patient_id: originalFax.patient_id,
      sent_by: user.email,
      priority: originalFax.priority,
      retry_count: (originalFax.retry_count || 0) + 1,
      estimated_cost: originalFax.estimated_cost
    });

    // Update original fax to mark it as retried
    await base44.entities.FaxLog.update(fax_log_id, {
      status: 'retried',
      failure_reason: `Retry attempt #${(originalFax.retry_count || 0) + 1} initiated`
    });

    return Response.json({
      success: true,
      new_fax_log_id: newFaxLog.id,
      twilio_fax_id: faxData.sid,
      retry_count: (originalFax.retry_count || 0) + 1,
      message: `Fax retry #${(originalFax.retry_count || 0) + 1} queued for ${originalFax.to_number}`
    });
  } catch (error) {
    console.error('Retry fax error:', error);
    return Response.json({
      error: error.message,
      success: false
    }, { status: 500 });
  }
});
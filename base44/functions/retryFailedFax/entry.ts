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

    if (!fax_log_id) {
      return Response.json({ error: 'fax_log_id required' }, { status: 400 });
    }

    // Fetch the original fax log
    const faxLogs = await base44.entities.FaxLog.filter({ id: fax_log_id });
    if (faxLogs.length === 0) {
      return Response.json({ error: 'FaxLog not found' }, { status: 404 });
    }

    const originalFax = faxLogs[0];

    // Ownership: only the original sender (or an admin) may resend a PHI fax.
    if (originalFax.sent_by && originalFax.sent_by !== user.email && user.role !== 'admin') {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

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

    // Claim the fax for retry BEFORE sending so two concurrent retries (e.g. a
    // double-click, or a manual retry racing the cron) can't both fax the PHI and
    // double-charge. Flip failed -> retrying with a token, then re-read; if we
    // don't own the claim, another retry is already in flight. (Twilio's Fax API
    // has no client idempotency key, so this claim is the double-send guard.)
    const runId = crypto.randomUUID();
    try {
      await base44.entities.FaxLog.update(fax_log_id, {
        status: 'retrying',
        retry_claimed_by: runId,
        retry_claimed_at: new Date().toISOString(),
      });
    } catch {
      return Response.json({ error: 'Could not claim fax for retry', success: false }, { status: 409 });
    }
    const claimCheck = await base44.entities.FaxLog.filter({ id: fax_log_id }, '-created_date', 1).catch(() => []);
    if (!claimCheck[0] || claimCheck[0].retry_claimed_by !== runId) {
      return Response.json({ error: 'A retry for this fax is already in progress', success: false }, { status: 409 });
    }

    // Release the claim back to a retriable 'failed' state if the send doesn't go
    // through, so a transient error doesn't strand the fax in 'retrying'.
    const releaseClaim = () => base44.entities.FaxLog.update(fax_log_id, {
      status: 'failed',
      retry_claimed_by: null,
    }).catch(() => {});

    const twilioUrl = `https://fax.twilio.com/v1/Faxes`;

    // Re-send the fax
    const formData = new URLSearchParams();
    formData.append('From', fromNumber);
    formData.append('To', originalFax.to_number);
    formData.append('MediaUrl', originalFax.document_url);

    const auth = btoa(`${accountSid}:${authToken}`);

    let twilioResponse: Response;
    try {
      twilioResponse = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formData.toString()
      });
    } catch (sendErr) {
      await releaseClaim();
      throw sendErr;
    }

    if (!twilioResponse.ok) {
      const errorData = await twilioResponse.text();
      console.error('Twilio error:', errorData);
      await releaseClaim();
      return Response.json({
        error: 'Failed to send fax via Twilio',
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

    // Update original fax to mark it as retried (clears the transient claim).
    await base44.entities.FaxLog.update(fax_log_id, {
      status: 'retried',
      retry_claimed_by: null,
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
      error: 'Failed to retry fax',
      success: false
    }, { status: 500 });
  }
});
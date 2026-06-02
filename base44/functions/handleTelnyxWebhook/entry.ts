import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Legacy webhook endpoint kept for backward compatibility.
 * This handler now processes Twilio fax webhook payloads.
 */
const BACKOFF_MINUTES = [5, 15, 60];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const payload = await parseWebhookPayload(req);
    const faxSid = payload.faxSid;
    const status = payload.status;

    if (!faxSid || !status) {
      return Response.json({ error: 'Invalid webhook payload. Missing fax SID or status.' }, { status: 400 });
    }

    const faxLogs = await base44.asServiceRole.entities.FaxLog.filter({
      telnyx_fax_id: faxSid
    });

    if (faxLogs.length === 0) {
      return Response.json({ success: false, message: 'FaxLog not found' });
    }

    const faxLog = faxLogs[0];
    const mappedStatus = mapTwilioStatus(status);

    const updateData = {
      status: mappedStatus,
      pages: payload.numPages || faxLog.pages,
      failure_reason: null,
      next_retry_at: null,
    };

    if (mappedStatus === 'failed') {
      const retryCount = faxLog.retry_count || 0;

      if (retryCount < BACKOFF_MINUTES.length) {
        const delayMs = BACKOFF_MINUTES[retryCount] * 60 * 1000;
        updateData.next_retry_at = new Date(Date.now() + delayMs).toISOString();
        updateData.retry_count = retryCount + 1;
      } else {
        updateData.final_failure_notified = false;
      }

      updateData.failure_reason = payload.failureReason || 'Unknown error';
    }

    await base44.asServiceRole.entities.FaxLog.update(faxLog.id, updateData);

    await base44.asServiceRole.entities.UserActivity.create({
      user_email: 'system',
      user_name: 'Twilio Webhook',
      action: 'fax_webhook_received',
      details: {
        fax_sid: faxSid,
        status,
        mapped_status: mappedStatus,
        to: payload.to,
        from: payload.from,
        pages: payload.numPages,
        timestamp: new Date().toISOString()
      },
      page: 'webhook',
      user_agent: req.headers.get('user-agent') || 'twilio'
    }).catch((err) => console.error('Failed to log user activity:', err));

    return Response.json({
      success: true,
      received: status,
      status: mappedStatus
    });
  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function parseWebhookPayload(req) {
  const contentType = req.headers.get('content-type') || '';

  if (contentType.includes('application/json')) {
    const body = await req.json();
    return {
      faxSid: body.FaxSid || body.fax_sid || body.sid || body.data?.payload?.id,
      status: body.Status || body.FaxStatus || body.status || body.data?.payload?.status,
      numPages: parseNumber(body.NumPages || body.num_pages || body.data?.payload?.page_count),
      failureReason: body.ErrorMessage || body.error_message || body.data?.payload?.failure_reason,
      to: body.To || body.to || body.data?.payload?.to,
      from: body.From || body.from || body.data?.payload?.from
    };
  }

  const formData = await req.formData();
  return {
    faxSid: formData.get('FaxSid'),
    status: formData.get('Status') || formData.get('FaxStatus'),
    numPages: parseNumber(formData.get('NumPages')),
    failureReason: formData.get('ErrorMessage') || formData.get('ErrorCode'),
    to: formData.get('To'),
    from: formData.get('From')
  };
}

function parseNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function mapTwilioStatus(twilioStatus) {
  const statusMap = {
    queued: 'queued',
    processing: 'sending',
    sending: 'sending',
    sent: 'sent',
    delivered: 'delivered',
    failed: 'failed',
    canceled: 'failed'
  };

  return statusMap[twilioStatus] || 'sending';
}

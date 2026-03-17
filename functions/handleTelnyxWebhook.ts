import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Legacy endpoint name retained for backward compatibility.
 * Handles Twilio fax status webhooks and applies retry scheduling/notifications.
 */
const BACKOFF_MINUTES = [5, 15, 60];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await parseWebhookPayload(req);

    const faxSid = payload.faxSid;
    const mappedStatus = mapTwilioStatus(payload.status);

    if (!faxSid || !mappedStatus) {
      return Response.json({ error: 'Invalid webhook payload. Missing fax SID or status.' }, { status: 400 });
    }

    await base44.asServiceRole.entities.UserActivity.create({
      user_email: 'system',
      user_name: 'Twilio Webhook',
      action: 'fax_webhook_received',
      details: {
        fax_sid: faxSid,
        provider_status: payload.status,
        status: mappedStatus,
        to: payload.to,
        from: payload.from,
        pages: payload.numPages,
        timestamp: new Date().toISOString()
      },
      page: 'webhook',
      user_agent: req.headers.get('user-agent') || 'twilio'
    }).catch((err) => {
      console.error('Failed to log webhook activity:', err?.message || err);
    });

    const faxLogs = await base44.asServiceRole.entities.FaxLog.filter({
      telnyx_fax_id: faxSid
    });

    if (faxLogs.length === 0) {
      return Response.json({ success: false, message: 'FaxLog not found' });
    }

    const faxLog = faxLogs[0];
    const updateData = {
      status: mappedStatus,
      pages: payload.numPages || faxLog.pages
    };

    if (mappedStatus === 'failed') {
      const retryCount = faxLog.retry_count || 0;
      const failureReason = payload.failureReason || 'Unknown error';

      if (retryCount < BACKOFF_MINUTES.length) {
        const delayMs = BACKOFF_MINUTES[retryCount] * 60 * 1000;
        updateData.retry_count = retryCount + 1;
        updateData.next_retry_at = new Date(Date.now() + delayMs).toISOString();
        updateData.failure_reason = failureReason;
      } else {
        updateData.failure_reason = failureReason;
        updateData.next_retry_at = null;
        updateData.final_failure_notified = false;
      }
    } else if (mappedStatus === 'delivered') {
      updateData.next_retry_at = null;
      updateData.failure_reason = null;
    }

    await base44.asServiceRole.entities.FaxLog.update(faxLog.id, updateData);

    if (faxLog.sent_by && mappedStatus === 'delivered') {
      const docName = faxLog.document_name || 'your document';
      const recipient = faxLog.to_name ? `${faxLog.to_name} (${faxLog.to_number})` : faxLog.to_number;

      await base44.asServiceRole.entities.Notification.create({
        user_email: faxLog.sent_by,
        title: '✅ Fax Delivered',
        message: `"${docName}" was successfully delivered to ${recipient}`,
        type: 'success',
        is_read: false,
        action_url: `/send-fax?fax_id=${faxLog.id}`
      }).catch((err) => {
        console.error('Failed to create delivery notification:', err?.message || err);
      });

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: faxLog.sent_by,
        subject: '✅ Fax Delivered Successfully',
        body: `Your fax has been successfully delivered.\n\nDocument: ${docName}\nRecipient: ${recipient}\nPages: ${updateData.pages || 'N/A'}\nTime: ${new Date().toLocaleString()}\n\nNo further action is required.`
      }).catch((err) => {
        console.error('Failed to send delivery email:', err?.message || err);
      });
    }

    return Response.json({
      success: true,
      fax_sid: faxSid,
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
  const normalizedStatus = typeof twilioStatus === 'string' ? twilioStatus.toLowerCase() : '';
  const statusMap = {
    queued: 'queued',
    processing: 'sending',
    sending: 'sending',
    sent: 'sent',
    delivered: 'delivered',
    failed: 'failed',
    canceled: 'failed'
  };

  return statusMap[normalizedStatus] || null;
}

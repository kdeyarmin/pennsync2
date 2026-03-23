import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Twilio Fax Status Webhook Handler
 * Receives real-time fax status updates from Twilio and updates FaxLog records.
 */
const BACKOFF_MINUTES = [5, 15, 60];

Deno.serve(async (req) => {
  try {
    const formData = await req.formData();
    const faxSid = formData.get('FaxSid');
    const status = formData.get('Status');
    const numPages = formData.get('NumPages');
    const errorCode = formData.get('ErrorCode');
    const errorMessage = formData.get('ErrorMessage');

    if (!faxSid) {
      return Response.json({ error: 'Missing FaxSid' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    const faxLogs = await base44.asServiceRole.entities.FaxLog.filter({
      telnyx_fax_id: faxSid
    });

    if (faxLogs.length === 0) {
      return Response.json({ success: false, message: 'FaxLog not found' });
    }

    const faxLog = faxLogs[0];
    const mappedStatus = mapTwilioStatus(status);
    const parsedNumPages = numPages ? parseInt(String(numPages), 10) : faxLog.pages;

    const updateData = {
      status: mappedStatus,
      pages: Number.isFinite(parsedNumPages) ? parsedNumPages : faxLog.pages,
      failure_reason: null,
      next_retry_at: null,
    };

    if (mappedStatus === 'failed') {
      const failureReason = `${errorCode || 'failed'}: ${errorMessage || 'Unknown error'}`;
      const retryCount = faxLog.retry_count || 0;

      if (retryCount < BACKOFF_MINUTES.length) {
        const delayMs = BACKOFF_MINUTES[retryCount] * 60 * 1000;
        updateData.next_retry_at = new Date(Date.now() + delayMs).toISOString();
        updateData.retry_count = retryCount + 1;
      } else {
        updateData.final_failure_notified = false;
      }

      updateData.failure_reason = failureReason;
    }

    await base44.asServiceRole.entities.FaxLog.update(faxLog.id, updateData);

    if (mappedStatus === 'delivered') {
      await sendStatusNotification(base44, faxLog, mappedStatus, updateData.pages).catch(() => {});
    }

    if (faxLog.sent_by) {
      await base44.asServiceRole.entities.UserActivity.create({
        user_email: faxLog.sent_by,
        action: 'fax_status_updated',
        entity_type: 'FaxLog',
        entity_id: faxLog.id,
        details: {
          fax_sid: faxSid,
          old_status: faxLog.status,
          new_status: mappedStatus,
          to_number: faxLog.to_number,
          document_name: faxLog.document_name,
          pages: updateData.pages,
          error: updateData.failure_reason,
        },
        status: mappedStatus === 'failed' ? 'failure' : 'success',
      }).catch(() => {});
    }

    return Response.json({ success: true, status: mappedStatus });
  } catch (error) {
    console.error('Twilio webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function mapTwilioStatus(twilioStatus) {
  const statusMap = {
    queued: 'queued',
    processing: 'sending',
    sending: 'sending',
    delivered: 'delivered',
    failed: 'failed',
    canceled: 'failed'
  };
  return statusMap[twilioStatus] || 'sending';
}

async function sendStatusNotification(base44, faxLog, status, numPages) {
  if (!faxLog.sent_by || status !== 'delivered') return;

  const recipientName = faxLog.to_name || faxLog.to_number;
  await base44.asServiceRole.entities.Notification.create({
    user_email: faxLog.sent_by,
    title: '✅ Fax Delivered Successfully',
    message: `Your fax to ${recipientName} has been delivered successfully. Document: ${faxLog.document_name || 'Untitled'} (${numPages || faxLog.pages || 'N/A'} pages).`,
    type: 'fax_delivered',
    priority: 'normal',
    related_entity: 'FaxLog',
    related_entity_id: faxLog.id,
    is_read: false,
  });
}

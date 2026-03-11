import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Twilio Fax Status Webhook Handler
 * Receives real-time fax status updates from Twilio and updates FaxLog records
 */
Deno.serve(async (req) => {
  try {
    // Parse webhook data
    const formData = await req.formData();
    const faxSid = formData.get('FaxSid');
    const status = formData.get('Status'); // queued, processing, sending, delivered, failed, canceled
    const numPages = formData.get('NumPages');
    const errorCode = formData.get('ErrorCode');
    const errorMessage = formData.get('ErrorMessage');

    console.log(`Twilio Fax Webhook: SID=${faxSid}, Status=${status}`);

    if (!faxSid) {
      return Response.json({ error: 'Missing FaxSid' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    // Find the FaxLog record by telnyx_fax_id (we use this for Twilio SID too)
    const faxLogs = await base44.asServiceRole.entities.FaxLog.filter({
      telnyx_fax_id: faxSid
    });

    if (faxLogs.length === 0) {
      console.warn(`FaxLog not found for SID: ${faxSid}`);
      return Response.json({ success: false, message: 'FaxLog not found' });
    }

    const faxLog = faxLogs[0];
    const updateData = {
      status: mapTwilioStatus(status),
      pages: numPages ? parseInt(numPages) : faxLog.pages
    };

    // Add error info if failed
    if (status === 'failed' && errorCode) {
      updateData.failure_reason = `${errorCode}: ${errorMessage || 'Unknown error'}`;
      updateData.retry_count = (faxLog.retry_count || 0) + 1;
    }

    // Update FaxLog with new status
    await base44.asServiceRole.entities.FaxLog.update(faxLog.id, updateData);

    console.log(`Updated FaxLog ${faxLog.id} to status: ${updateData.status}`);

    // Send notifications based on status changes
    await sendStatusNotification(base44, faxLog, status, numPages, updateData.failure_reason);

    // Log status change in user activity
    if (faxLog.sent_by) {
      try {
        await base44.asServiceRole.entities.UserActivity.create({
          user_email: faxLog.sent_by,
          action: 'fax_status_updated',
          entity_type: 'FaxLog',
          entity_id: faxLog.id,
          details: {
            fax_sid: faxSid,
            old_status: faxLog.status,
            new_status: updateData.status,
            to_number: faxLog.to_number,
            document_name: faxLog.document_name,
            pages: numPages,
            error: updateData.failure_reason || null,
          },
          status: status === 'failed' ? 'failure' : 'success',
        });
      } catch (err) {
        console.error('Failed to log user activity:', err);
      }
    }

    return Response.json({ success: true, status: updateData.status });
  } catch (error) {
    console.error('Twilio webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function mapTwilioStatus(twilioStatus) {
  const statusMap = {
    'queued': 'queued',
    'processing': 'sending',
    'sending': 'sending',
    'delivered': 'delivered',
    'failed': 'failed',
    'canceled': 'failed'
  };
  return statusMap[twilioStatus] || 'sending';
}

async function sendStatusNotification(base44, faxLog, status, numPages, failureReason) {
  if (!faxLog.sent_by) return;

  const recipientName = faxLog.to_name || faxLog.to_number;
  
  try {
    let notificationData = null;

    switch (status) {
      case 'delivered':
        notificationData = {
          user_email: faxLog.sent_by,
          title: '✅ Fax Delivered Successfully',
          message: `Your fax to ${recipientName} has been delivered successfully. Document: ${faxLog.document_name || 'Untitled'} (${numPages || faxLog.pages || 'N/A'} pages).`,
          type: 'fax_delivered',
          priority: 'normal',
          related_entity: 'FaxLog',
          related_entity_id: faxLog.id,
          is_read: false,
        };
        break;

      case 'failed':
        notificationData = {
          user_email: faxLog.sent_by,
          title: '❌ Fax Delivery Failed',
          message: `Your fax to ${recipientName} failed to deliver. Document: ${faxLog.document_name || 'Untitled'}. Reason: ${failureReason || 'Unknown error'}. You can retry from the Fax Dashboard.`,
          type: 'fax_failed',
          priority: 'high',
          related_entity: 'FaxLog',
          related_entity_id: faxLog.id,
          is_read: false,
        };
        break;

      case 'sending':
      case 'processing':
        notificationData = {
          user_email: faxLog.sent_by,
          title: '📤 Fax Sending in Progress',
          message: `Your fax to ${recipientName} is currently being transmitted. Document: ${faxLog.document_name || 'Untitled'}.`,
          type: 'fax_sending',
          priority: 'low',
          related_entity: 'FaxLog',
          related_entity_id: faxLog.id,
          is_read: false,
        };
        break;

      case 'canceled':
        notificationData = {
          user_email: faxLog.sent_by,
          title: '🚫 Fax Canceled',
          message: `Your fax to ${recipientName} was canceled. Document: ${faxLog.document_name || 'Untitled'}.`,
          type: 'fax_canceled',
          priority: 'normal',
          related_entity: 'FaxLog',
          related_entity_id: faxLog.id,
          is_read: false,
        };
        break;
    }

    if (notificationData) {
      await base44.asServiceRole.entities.Notification.create(notificationData);
      console.log(`Created ${status} notification for user: ${faxLog.sent_by}`);
    }
  } catch (err) {
    console.error(`Failed to create ${status} notification:`, err);
  }
}
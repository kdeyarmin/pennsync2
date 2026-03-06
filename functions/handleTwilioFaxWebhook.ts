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

    // If delivered, send confirmation notification
    if (status === 'delivered') {
      try {
        await base44.asServiceRole.entities.Notification.create({
          user_email: faxLog.sent_by,
          title: 'Fax Delivered',
          message: `Fax to ${faxLog.to_number} (${faxLog.document_name}) delivered successfully in ${numPages} page(s).`,
          type: 'fax_delivered',
          related_entity: 'FaxLog',
          related_entity_id: faxLog.id,
          is_read: false
        });
      } catch (err) {
        console.error('Failed to create delivery notification:', err);
      }
    }

    // If failed, create alert for user
    if (status === 'failed') {
      try {
        await base44.asServiceRole.entities.Notification.create({
          user_email: faxLog.sent_by,
          title: 'Fax Failed',
          message: `Fax to ${faxLog.to_number} (${faxLog.document_name}) failed. ${updateData.failure_reason}. You can retry from the Fax Dashboard.`,
          type: 'fax_failed',
          related_entity: 'FaxLog',
          related_entity_id: faxLog.id,
          is_read: false
        });
      } catch (err) {
        console.error('Failed to create failure notification:', err);
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
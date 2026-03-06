import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Get all pending/sending faxes
    const pendingFaxes = await base44.asServiceRole.entities.FaxLog.filter(
      { 
        status: { $in: ['queued', 'sending'] }
      },
      '-created_date',
      100
    );

    if (pendingFaxes.length === 0) {
      return Response.json({ success: true, checked: 0, updated: 0 });
    }

    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    
    if (!twilioAccountSid || !twilioAuthToken) {
      return Response.json({ error: 'Twilio credentials not configured' }, { status: 400 });
    }

    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    let updated = 0;

    // Check status of each fax
    for (const fax of pendingFaxes) {
      if (!fax.telnyx_fax_id) continue; // Skip if no Twilio ID (might be stored differently)

      try {
        // Twilio Fax API endpoint
        const response = await fetch(
          `https://fax.twilio.com/v1/Faxes/${fax.telnyx_fax_id}`,
          {
            headers: {
              Authorization: `Basic ${auth}`,
              'Content-Type': 'application/x-www-form-urlencoded'
            }
          }
        );

        if (!response.ok) continue;

        const faxData = await response.json();
        const newStatus = mapTwilioStatus(faxData.status);

        // Only update if status changed
        if (newStatus !== fax.status) {
          await base44.asServiceRole.entities.FaxLog.update(fax.id, {
            status: newStatus,
            telnyx_fax_id: faxData.sid
          });

          // Create notification for the user if sent/delivered/failed
          if (['sent', 'delivered', 'failed'].includes(newStatus)) {
            const notificationMessage = getNotificationMessage(newStatus, fax);
            
            if (fax.sent_by) {
              await base44.asServiceRole.entities.Notification.create({
                user_email: fax.sent_by,
                type: newStatus === 'failed' ? 'error' : 'success',
                title: newStatus === 'failed' ? 'Fax Failed' : 'Fax Status Update',
                message: notificationMessage,
                related_entity: 'FaxLog',
                related_entity_id: fax.id,
                is_read: false
              }).catch(() => {
                // Silently fail if notification creation fails
              });
            }
          }

          updated++;
        }
      } catch (error) {
        console.error(`Error checking fax ${fax.id}:`, error.message);
        // Continue with next fax
      }
    }

    return Response.json({ 
      success: true, 
      checked: pendingFaxes.length, 
      updated 
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function mapTwilioStatus(twilioStatus) {
  const statusMap = {
    'queued': 'queued',
    'sending': 'sending',
    'sent': 'sent',
    'delivered': 'delivered',
    'failed': 'failed',
    'canceled': 'failed'
  };
  return statusMap[twilioStatus] || 'queued';
}

function getNotificationMessage(status, fax) {
  const docName = fax.document_name || 'Document';
  const recipient = fax.to_name || fax.to_number;
  
  switch (status) {
    case 'sent':
      return `Fax "${docName}" sent to ${recipient}`;
    case 'delivered':
      return `Fax "${docName}" delivered to ${recipient}`;
    case 'failed':
      return `Fax "${docName}" failed to ${recipient}. Reason: ${fax.failure_reason || 'Unknown'}`;
    default:
      return `Fax status updated to ${status}`;
  }
}
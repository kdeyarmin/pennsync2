import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Only poll faxes from the last 48 hours that are still pending
    const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString();
    
    const pendingFaxes = await base44.asServiceRole.entities.FaxLog.filter(
      { status: { $in: ['queued', 'sending'] } },
      '-created_date',
      20  // Small batch to avoid CPU limit
    );

    // Filter to only recent faxes and those with a Twilio ID
    const faxesToCheck = pendingFaxes.filter(f => f.telnyx_fax_id && f.created_date > cutoff);

    if (faxesToCheck.length === 0) {
      return Response.json({ success: true, checked: 0, updated: 0 });
    }

    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    
    if (!twilioAccountSid || !twilioAuthToken) {
      return Response.json({ error: 'Twilio credentials not configured' }, { status: 400 });
    }

    const auth = btoa(`${twilioAccountSid}:${twilioAuthToken}`);
    let updated = 0;

    // Process all faxes in parallel instead of sequentially
    await Promise.all(faxesToCheck.map(async (fax) => {
      try {
        const response = await fetch(
          `https://fax.twilio.com/v1/Faxes/${fax.telnyx_fax_id}`,
          { headers: { Authorization: `Basic ${auth}` } }
        );

        if (!response.ok) return;

        const faxData = await response.json();
        const newStatus = mapTwilioStatus(faxData.status);

        if (newStatus !== fax.status) {
          await base44.asServiceRole.entities.FaxLog.update(fax.id, {
            status: newStatus,
            telnyx_fax_id: faxData.sid
          });

          if (['sent', 'delivered', 'failed'].includes(newStatus) && fax.sent_by) {
            await base44.asServiceRole.entities.Notification.create({
              user_email: fax.sent_by,
              type: newStatus === 'failed' ? 'error' : 'success',
              title: newStatus === 'failed' ? 'Fax Failed' : 'Fax Status Update',
              message: getNotificationMessage(newStatus, fax),
              related_entity: 'FaxLog',
              related_entity_id: fax.id,
              is_read: false
            }).catch(err => console.error(`Failed to create notification for fax ${fax.id}:`, err.message));
          }

          updated++;
        }
      } catch (error) {
        console.error(`Error checking fax ${fax.id}:`, error.message);
      }
    }));

    return Response.json({ success: true, checked: faxesToCheck.length, updated });
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
    case 'sent': return `Fax "${docName}" sent to ${recipient}`;
    case 'delivered': return `Fax "${docName}" delivered to ${recipient}`;
    case 'failed': return `Fax "${docName}" failed to ${recipient}. Reason: ${fax.failure_reason || 'Unknown'}`;
    default: return `Fax status updated to ${status}`;
  }
}
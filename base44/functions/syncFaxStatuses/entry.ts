import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    if (!accountSid || !authToken) {
      console.warn('Twilio credentials not configured. Skipping fax status sync.');
      return Response.json({ error: 'Twilio credentials not configured' }, { status: 500 });
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const pendingFaxes = await base44.asServiceRole.entities.FaxLog.filter({
      created_date: { '$gte': twentyFourHoursAgo }
    }, '-created_date', 200);

    const nonFinalFaxes = pendingFaxes.filter((f) =>
      f.telnyx_fax_id && ['queued', 'sending', 'sent'].includes(f.status)
    );

    console.log(`Found ${nonFinalFaxes.length} pending faxes to sync.`);

    let updatedCount = 0;

    for (const faxLog of nonFinalFaxes) {
      try {
        const twilioResponse = await fetch(`https://fax.twilio.com/v1/Faxes/${faxLog.telnyx_fax_id}`, {
          headers: {
            'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`)
          }
        });

        if (!twilioResponse.ok) {
          const errorText = await twilioResponse.text();
          console.error(`Twilio API error for fax ${faxLog.telnyx_fax_id}:`, errorText);
          continue;
        }

        const twilioData = await twilioResponse.json();

        const currentTwilioStatus = twilioData.status;
        const newStatus = mapTwilioStatus(currentTwilioStatus, faxLog.status);

        if (newStatus !== faxLog.status) {
          console.log(`Updating fax ${faxLog.id} from ${faxLog.status} to ${newStatus}`);
          await base44.asServiceRole.entities.FaxLog.update(faxLog.id, {
            status: newStatus,
            failure_reason: newStatus === 'failed' ? (twilioData.error_message || 'Unknown failure') : null,
            pages: twilioData.num_pages || faxLog.pages
          });
          updatedCount++;
        }
      } catch (error) {
        console.error(`Error processing fax ${faxLog.id} (Twilio SID: ${faxLog.telnyx_fax_id}):`, error);
      }
    }

    console.log(`Fax status sync completed. Updated ${updatedCount} faxes.`);
    return Response.json({
      success: true,
      message: `Fax statuses synced. ${updatedCount} updated.`,
      checked: nonFinalFaxes.length,
      updated: updatedCount
    });

  } catch (error) {
    console.error('Fax status sync function error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function mapTwilioStatus(currentStatus, fallbackStatus) {
  const statusMap = {
    queued: 'queued',
    processing: 'sending',
    sending: 'sending',
    delivered: 'delivered',
    failed: 'failed',
    canceled: 'failed',
    sent: 'sent'
  };

  return statusMap[currentStatus] || fallbackStatus;
}

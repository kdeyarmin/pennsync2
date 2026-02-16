import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const telnyxApiKey = Deno.env.get('TELNYX_API_KEY');
    if (!telnyxApiKey) {
      console.warn('TELNYX_API_KEY not configured. Skipping fax status sync.');
      return Response.json({ error: 'Telnyx API key not configured' }, { status: 500 });
    }

    const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    // Fetch faxes that are still in a non-final state and were created recently
    const pendingFaxes = await base44.asServiceRole.entities.FaxLog.filter({
      created_date: { "$gte": twentyFourHoursAgo }
    }, '-created_date', 200);

    const nonFinalFaxes = pendingFaxes.filter(f => 
      f.telnyx_fax_id && ['queued', 'sending', 'sent'].includes(f.status)
    );

    console.log(`Found ${nonFinalFaxes.length} pending faxes to sync.`);

    let updatedCount = 0;

    for (const faxLog of nonFinalFaxes) {
      try {
        const telnyxResponse = await fetch(`https://api.telnyx.com/v2/faxes/${faxLog.telnyx_fax_id}`, {
          headers: {
            'Authorization': `Bearer ${telnyxApiKey}`,
          },
        });

        const telnyxData = await telnyxResponse.json();

        if (!telnyxResponse.ok) {
          console.error(`Telnyx API error for fax ${faxLog.telnyx_fax_id}:`, telnyxData);
          continue;
        }

        const currentTelnyxStatus = telnyxData.data?.status;
        let newStatus = faxLog.status;

        switch (currentTelnyxStatus) {
          case 'queued':
            newStatus = 'queued';
            break;
          case 'sending':
          case 'media.processed':
            newStatus = 'sending';
            break;
          case 'sent':
            newStatus = 'sent';
            break;
          case 'delivered':
            newStatus = 'delivered';
            break;
          case 'failed':
            newStatus = 'failed';
            break;
        }

        if (newStatus !== faxLog.status) {
          console.log(`Updating fax ${faxLog.id} from ${faxLog.status} to ${newStatus}`);
          await base44.asServiceRole.entities.FaxLog.update(faxLog.id, {
            status: newStatus,
            failure_reason: newStatus === 'failed' ? telnyxData.data?.failure_reason || 'Unknown failure' : null,
            pages: telnyxData.data?.page_count || faxLog.pages
          });
          updatedCount++;
        }
      } catch (error) {
        console.error(`Error processing fax ${faxLog.id} (Telnyx ID: ${faxLog.telnyx_fax_id}):`, error);
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
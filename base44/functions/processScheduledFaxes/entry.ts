import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    const now = new Date().toISOString();

    // Get scheduled faxes that are due
    const scheduledFaxes = await base44.asServiceRole.entities.ScheduledFax.filter({
      status: 'pending',
      scheduled_time: { "$lte": now }
    });

    console.log(`Found ${scheduledFaxes.length} scheduled faxes to process`);

    // NOTE: only ONE scheduled-fax processor should be enabled in the platform
    // scheduler (this OR processScheduledFaxesByPriority) — running both will
    // double-send. See docs.

    for (const scheduledFax of scheduledFaxes) {
      // Claim the row (pending -> processing) BEFORE sending so an overlapping
      // run won't also pick it up. Mitigates the duplicate-send race.
      try {
        await base44.asServiceRole.entities.ScheduledFax.update(scheduledFax.id, { status: 'processing' });
      } catch (claimErr) {
        console.error(`Could not claim scheduled fax ${scheduledFax.id}; skipping`, claimErr);
        continue;
      }
      try {
        // Use the batch send function for each scheduled fax
        const response = await base44.asServiceRole.functions.invoke('sendBatchFax', {
          file_url: scheduledFax.document_url,
          to_numbers: scheduledFax.to_numbers,
          from_number: scheduledFax.from_number,
          document_name: scheduledFax.document_name,
          patient_id: scheduledFax.patient_id,
          cover_page_details: scheduledFax.cover_page_details,
          priority: scheduledFax.priority
        });

        await base44.asServiceRole.entities.ScheduledFax.update(scheduledFax.id, {
          status: 'sent'
        });

        console.log(`Processed scheduled fax ${scheduledFax.id}`);
      } catch (error) {
        console.error(`Failed to process scheduled fax ${scheduledFax.id}:`, error);
        await base44.asServiceRole.entities.ScheduledFax.update(scheduledFax.id, {
          status: 'failed'
        });
      }
    }

    return Response.json({
      success: true,
      processed: scheduledFaxes.length
    });

  } catch (error) {
    console.error('Process scheduled faxes error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
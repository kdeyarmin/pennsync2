import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get pending scheduled faxes
    const scheduledFaxes = await base44.asServiceRole.entities.ScheduledFax.filter({
      status: 'pending'
    }, '-scheduled_time', 200);

    const now = new Date();
    
    // Separate into due and priority groups
    const dueFaxes = scheduledFaxes.filter(fax => 
      new Date(fax.scheduled_time) <= now
    );

    if (dueFaxes.length === 0) {
      return Response.json({ 
        message: 'No faxes due for sending',
        pending: scheduledFaxes.length 
      });
    }

    // Sort by priority (urgent first, then high, normal, low)
    const priorityOrder = { urgent: 0, high: 1, normal: 2, low: 3 };
    dueFaxes.sort((a, b) => {
      const aPriority = priorityOrder[a.priority] || 2;
      const bPriority = priorityOrder[b.priority] || 2;
      if (aPriority !== bPriority) return aPriority - bPriority;
      // If same priority, sort by scheduled time (earliest first)
      return new Date(a.scheduled_time) - new Date(b.scheduled_time);
    });

    let sentCount = 0;
    let failedCount = 0;

    // NOTE: only ONE scheduled-fax processor should be enabled in the platform
    // scheduler (this OR processScheduledFaxes) — running both double-sends.

    // Process faxes in priority order
    for (const scheduledFax of dueFaxes) {
      // Claim before sending so an overlapping run won't also send it.
      try {
        await base44.asServiceRole.entities.ScheduledFax.update(scheduledFax.id, { status: 'processing' });
      } catch (claimErr) {
        console.error(`Could not claim scheduled fax ${scheduledFax.id}; skipping`, claimErr);
        continue;
      }
      let anyRecipientFailed = false;
      try {
        // Send to all recipients
        for (const toNumber of scheduledFax.to_numbers) {
          try {
            const sendResult = await base44.functions.invoke('sendFax', {
              file_url: scheduledFax.document_url,
              to_number: toNumber,
              from_number: scheduledFax.from_number,
              document_name: scheduledFax.document_name,
              patient_id: scheduledFax.patient_id,
              cover_page_details: scheduledFax.cover_page_details,
              priority: scheduledFax.priority
            });

            if (sendResult.data.success) {
              sentCount++;
            } else {
              anyRecipientFailed = true;
              failedCount++;
            }
          } catch (sendError) {
            console.error(`Failed to send to ${toNumber}:`, sendError);
            anyRecipientFailed = true;
            failedCount++;
          }
        }

        // Only mark fully 'sent' when every recipient succeeded; otherwise
        // 'failed' so the partial failure is visible and recoverable.
        await base44.asServiceRole.entities.ScheduledFax.update(scheduledFax.id, {
          status: anyRecipientFailed ? 'failed' : 'sent'
        });

      } catch (error) {
        console.error(`Failed to process scheduled fax ${scheduledFax.id}:`, error);
        await base44.asServiceRole.entities.ScheduledFax.update(scheduledFax.id, {
          status: 'failed'
        });
        failedCount++;
      }
    }

    return Response.json({
      success: true,
      processed: dueFaxes.length,
      sent: sentCount,
      failed: failedCount,
      priority_order: ['urgent', 'high', 'normal', 'low'],
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Scheduled fax processing error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
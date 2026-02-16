import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get retry configuration
    const configs = await base44.asServiceRole.entities.FaxRetryConfig.filter({ is_active: true });
    const config = configs[0] || {
      max_retries: 3,
      retry_delay_minutes: 15,
      auto_retry_enabled: true,
      priority_multiplier: { urgent: 0.5, high: 1, normal: 1, low: 2 },
      notify_on_final_failure: true
    };

    if (!config.auto_retry_enabled) {
      return Response.json({ message: 'Auto-retry is disabled' });
    }

    // Find failed faxes that need retry
    const failedFaxes = await base44.asServiceRole.entities.FaxLog.filter({
      status: 'failed'
    }, '-updated_date', 100);

    const now = new Date();
    let retriedCount = 0;
    let exhaustedCount = 0;

    for (const fax of failedFaxes) {
      const retryCount = fax.retry_count || 0;

      // Check if max retries reached
      if (retryCount >= config.max_retries) {
        // Mark as permanently failed and notify if needed
        if (config.notify_on_final_failure && !fax.final_failure_notified) {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: fax.sent_by,
              subject: `⚠️ Fax Failed: ${fax.document_name}`,
              body: `Your fax to ${fax.to_number} has failed after ${retryCount} retry attempts.\n\nDocument: ${fax.document_name}\nReason: ${fax.failure_reason}\n\nPlease review and resend manually if needed.`
            });

            await base44.asServiceRole.entities.FaxLog.update(fax.id, {
              final_failure_notified: true
            });
          } catch (emailError) {
            console.error('Failed to send notification:', emailError);
          }
        }
        exhaustedCount++;
        continue;
      }

      // Calculate retry delay based on priority
      const priority = fax.priority || 'normal';
      const multiplier = config.priority_multiplier[priority] || 1;
      const delayMinutes = config.retry_delay_minutes * multiplier;
      
      const lastUpdate = new Date(fax.updated_date);
      const nextRetryTime = new Date(lastUpdate.getTime() + delayMinutes * 60000);

      // Check if it's time to retry
      if (now >= nextRetryTime) {
        try {
          // Retry the fax
          const retryResult = await base44.functions.invoke('retryFailedFax', {
            fax_log_id: fax.id
          });

          if (retryResult.data.success) {
            retriedCount++;
          }
        } catch (error) {
          console.error(`Failed to retry fax ${fax.id}:`, error);
        }
      }
    }

    return Response.json({
      success: true,
      retried: retriedCount,
      exhausted: exhaustedCount,
      total_failed: failedFaxes.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Auto-retry error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Validate webhook signature if available
    const signature = req.headers.get('telnyx-signature-ed25519');
    const timestamp = req.headers.get('telnyx-timestamp');
    
    if (signature && timestamp) {
      // Signature validation would go here
      console.log('Webhook signature present:', signature.substring(0, 10) + '...');
    }

    // Parse webhook payload
    const payload = await req.json();
    
    const eventType = payload.data?.event_type;
    const faxData = payload.data?.payload;

    if (!eventType || !faxData) {
      return Response.json({ error: 'Invalid webhook payload' }, { status: 400 });
    }

    // Check if fax receiving is enabled (for incoming faxes)
    if (faxData.direction === 'inbound') {
      const settings = await base44.asServiceRole.entities.AgencySettings.list('-created_date', 1);
      const faxReceivingEnabled = settings[0]?.fax_receiving_enabled ?? true;
      
      if (!faxReceivingEnabled) {
        console.log('Fax receiving disabled, rejecting incoming fax:', faxData.id);
        return Response.json({ 
          success: false, 
          message: 'Fax receiving is currently disabled' 
        }, { status: 403 });
      }
    }

    // Log the webhook event
    await base44.asServiceRole.entities.UserActivity.create({
      user_email: 'system',
      user_name: 'Telnyx Webhook',
      action: 'fax_webhook_received',
      details: {
        event_type: eventType,
        fax_id: faxData.id,
        to: faxData.to,
        from: faxData.from,
        status: faxData.status,
        direction: faxData.direction,
        timestamp: new Date().toISOString()
      },
      page: 'webhook',
      user_agent: req.headers.get('user-agent') || 'telnyx'
    });

    // Update fax log based on event
    const faxLogs = await base44.asServiceRole.entities.FaxLog.filter({ 
      telnyx_fax_id: faxData.id 
    });
    
    if (faxLogs.length > 0) {
      const faxLog = faxLogs[0];
      let updateData = {};
      
      switch (eventType) {
        case 'fax.sending':
          updateData = { status: 'sending' };
          break;
        case 'fax.sent':
          updateData = { status: 'sent' };
          break;
        case 'fax.delivered':
          updateData = { 
            status: 'delivered',
            pages: faxData.page_count || faxLog.pages
          };
          break;
        case 'fax.failed': {
          // Exponential backoff schedule: attempt 0→5min, 1→15min, 2→60min, 3→exhausted
          const BACKOFF_MINUTES = [5, 15, 60];
          const retryCount = faxLog.retry_count || 0;
          if (retryCount < BACKOFF_MINUTES.length) {
            const delayMs = BACKOFF_MINUTES[retryCount] * 60 * 1000;
            const nextRetryAt = new Date(Date.now() + delayMs).toISOString();
            updateData = {
              status: 'failed',
              failure_reason: faxData.failure_reason || 'Unknown error',
              next_retry_at: nextRetryAt,
              retry_count: retryCount + 1
            };
            console.log(`Fax ${faxLog.id} failed — retry ${retryCount + 1} scheduled at ${nextRetryAt}`);
          } else {
            // All retries exhausted — mark final
            updateData = {
              status: 'failed',
              failure_reason: faxData.failure_reason || 'Unknown error',
              next_retry_at: null,
              final_failure_notified: false // autoRetryFailedFaxes will pick this up and notify
            };
          }
          break;
        }
      }
      
      if (Object.keys(updateData).length > 0) {
        await base44.asServiceRole.entities.FaxLog.update(faxLog.id, updateData);

        // Notify user only on successful delivery (not on failure — retry system handles that)
        if (faxLog.sent_by) {
          if (updateData.status === 'delivered') {
            const docName = faxLog.document_name || 'your document';
            const recipient = faxLog.to_name ? `${faxLog.to_name} (${faxLog.to_number})` : faxLog.to_number;

            // In-app notification
            try {
              await base44.asServiceRole.entities.Notification.create({
                user_email: faxLog.sent_by,
                title: '✅ Fax Delivered',
                message: `"${docName}" was successfully delivered to ${recipient}`,
                type: 'success',
                is_read: false,
                action_url: `/send-fax?fax_id=${faxLog.id}`
              });
            } catch (e) {
              console.error('Failed to create notification:', e.message);
            }

            // Email confirmation
            try {
              await base44.asServiceRole.integrations.Core.SendEmail({
                to: faxLog.sent_by,
                subject: '✅ Fax Delivered Successfully',
                body: `Your fax has been successfully delivered.\n\nDocument: ${docName}\nRecipient: ${recipient}\nPages: ${faxLog.pages || 'N/A'}\nTime: ${new Date().toLocaleString()}\n\nNo further action is required.`
              });
            } catch (e) {
              console.error('Failed to send delivery email:', e.message);
            }
          }
          // Failure notifications are intentionally suppressed here.
          // The autoRetryFailedFaxes scheduler will send ONE final notification only after all retries fail.
        }
      }
    }

    return Response.json({ 
      success: true,
      received: eventType
    });

  } catch (error) {
    console.error('Webhook error:', error);
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});
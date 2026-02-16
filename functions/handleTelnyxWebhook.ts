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
        case 'fax.failed':
          updateData = { 
            status: 'failed',
            failure_reason: faxData.failure_reason || 'Unknown error'
          };
          break;
      }
      
      if (Object.keys(updateData).length > 0) {
        await base44.asServiceRole.entities.FaxLog.update(faxLog.id, updateData);
        
        // If failed, trigger auto-retry system
        if (updateData.status === 'failed') {
          try {
            base44.functions.invoke('autoRetryFailedFaxes', {}).catch(err => 
              console.error('Auto-retry trigger failed:', err)
            );
          } catch (error) {
            console.error('Failed to trigger auto-retry:', error);
          }
        }

        // Send real-time notification for status change
        if (faxLog.sent_by) {
          try {
            await base44.asServiceRole.entities.Notification.create({
              user_email: faxLog.sent_by,
              title: `Fax ${updateData.status}`,
              message: `Your fax to ${faxLog.to_number} is now ${updateData.status}`,
              type: updateData.status === 'delivered' ? 'success' : updateData.status === 'failed' ? 'error' : 'info',
              is_read: false,
              action_url: `/send-fax?fax_id=${faxLog.id}`
            });
          } catch (notifError) {
            console.error('Failed to create notification:', notifError);
          }
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
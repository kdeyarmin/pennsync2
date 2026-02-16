import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Parse webhook payload
    const payload = await req.json();
    
    const eventType = payload.data?.event_type;
    const faxData = payload.data?.payload;

    if (!eventType || !faxData) {
      return Response.json({ error: 'Invalid webhook payload' }, { status: 400 });
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
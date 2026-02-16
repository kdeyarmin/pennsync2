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

    // Handle different event types
    switch (eventType) {
      case 'fax.sending':
        console.log(`Fax ${faxData.id} is being sent`);
        break;
      case 'fax.queued':
        console.log(`Fax ${faxData.id} is queued`);
        break;
      case 'fax.media.processed':
        console.log(`Fax ${faxData.id} media processed`);
        break;
      case 'fax.sent':
        console.log(`Fax ${faxData.id} sent successfully`);
        break;
      case 'fax.delivered':
        console.log(`Fax ${faxData.id} delivered successfully`);
        break;
      case 'fax.failed':
        console.log(`Fax ${faxData.id} failed: ${faxData.failure_reason}`);
        break;
      default:
        console.log(`Unknown event type: ${eventType}`);
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
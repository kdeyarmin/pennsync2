import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, to_number, from_number } = await req.json();

    if (!file_url || !to_number || !from_number) {
      return Response.json({ 
        error: 'Missing required fields: file_url, to_number, from_number' 
      }, { status: 400 });
    }

    const telnyxApiKey = Deno.env.get('TELNYX_API_KEY');
    if (!telnyxApiKey) {
      return Response.json({ 
        error: 'Telnyx API key not configured' 
      }, { status: 500 });
    }

    // Send fax via Telnyx API
    const telnyxResponse = await fetch('https://api.telnyx.com/v2/faxes', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${telnyxApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        connection_id: Deno.env.get('TELNYX_CONNECTION_ID'), // Optional: set if needed
        media_url: file_url,
        to: to_number,
        from: from_number,
        quality: 'high',
        store_media: true
      })
    });

    const telnyxData = await telnyxResponse.json();

    if (!telnyxResponse.ok) {
      return Response.json({ 
        error: 'Telnyx API error',
        details: telnyxData 
      }, { status: telnyxResponse.status });
    }

    // Log activity
    await base44.entities.UserActivity.create({
      user_email: user.email,
      user_name: user.full_name,
      action: 'fax_sent',
      details: {
        to_number,
        from_number,
        fax_id: telnyxData.data?.id,
        timestamp: new Date().toISOString()
      },
      page: 'fax',
      user_agent: req.headers.get('user-agent') || 'unknown'
    });

    return Response.json({
      success: true,
      fax_id: telnyxData.data?.id,
      status: telnyxData.data?.status,
      message: 'Fax sent successfully'
    });

  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});
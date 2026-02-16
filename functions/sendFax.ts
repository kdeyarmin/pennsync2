import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, to_number, from_number, document_name, to_name, patient_id } = await req.json();

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

    // Log the fax in our database
    const faxLog = await base44.entities.FaxLog.create({
      from_number: from_number,
      to_number: to_number,
      to_name: to_name || null,
      document_url: file_url,
      document_name: document_name || 'Camera Fax',
      status: 'queued',
      patient_id: patient_id || null,
      sent_by: user.email
    });

    // Send fax via Telnyx API
    const telnyxResponse = await fetch('https://api.telnyx.com/v2/faxes', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${telnyxApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        connection_id: Deno.env.get('TELNYX_CONNECTION_ID'),
        media_url: file_url,
        to: to_number,
        from: from_number,
        quality: 'high',
        store_media: true
      })
    });

    const telnyxData = await telnyxResponse.json();

    if (!telnyxResponse.ok) {
      await base44.entities.FaxLog.update(faxLog.id, {
        status: 'failed',
        failure_reason: telnyxData.errors?.[0]?.detail || 'Fax send failed'
      });
      return Response.json({ 
        error: 'Telnyx API error',
        details: telnyxData 
      }, { status: telnyxResponse.status });
    }

    // Update fax log with Telnyx ID
    await base44.entities.FaxLog.update(faxLog.id, {
      telnyx_fax_id: telnyxData.data?.id,
      status: 'sending'
    });

    // Log activity
    await base44.entities.UserActivity.create({
      user_email: user.email,
      user_name: user.full_name,
      action: 'fax_sent',
      details: {
        to_number,
        from_number,
        fax_id: telnyxData.data?.id,
        log_id: faxLog.id,
        timestamp: new Date().toISOString()
      },
      page: 'fax',
      user_agent: req.headers.get('user-agent') || 'unknown'
    });

    return Response.json({
      success: true,
      fax_id: telnyxData.data?.id,
      log_id: faxLog.id,
      status: telnyxData.data?.status,
      message: 'Fax sent successfully'
    });

  } catch (error) {
    return Response.json({ 
      error: error.message 
    }, { status: 500 });
  }
});
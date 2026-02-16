import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fax_log_id } = await req.json();

    if (!fax_log_id) {
      return Response.json({ error: 'Missing fax_log_id' }, { status: 400 });
    }

    const faxLogs = await base44.entities.FaxLog.filter({ id: fax_log_id });
    if (faxLogs.length === 0) {
      return Response.json({ error: 'Fax log not found' }, { status: 404 });
    }

    const faxLog = faxLogs[0];

    if (faxLog.retry_count >= 3) {
      return Response.json({ error: 'Maximum retry attempts reached' }, { status: 400 });
    }

    const telnyxApiKey = Deno.env.get('TELNYX_API_KEY');
    if (!telnyxApiKey) {
      return Response.json({ error: 'Telnyx API key not configured' }, { status: 500 });
    }

    // Send fax via Telnyx API
    const telnyxResponse = await fetch('https://api.telnyx.com/v2/faxes', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${telnyxApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        connection_id: Deno.env.get('TELNYX_CONNECTION_ID'),
        media_url: faxLog.document_url,
        to: faxLog.to_number,
        from: faxLog.from_number,
        quality: 'high',
        store_media: true
      })
    });

    const telnyxData = await telnyxResponse.json();

    if (!telnyxResponse.ok) {
      await base44.entities.FaxLog.update(faxLog.id, {
        retry_count: faxLog.retry_count + 1,
        failure_reason: telnyxData.errors?.[0]?.detail || 'Retry failed'
      });
      return Response.json({ 
        error: 'Telnyx API error',
        details: telnyxData 
      }, { status: telnyxResponse.status });
    }

    // Update fax log
    await base44.entities.FaxLog.update(faxLog.id, {
      telnyx_fax_id: telnyxData.data?.id,
      status: 'sending',
      retry_count: faxLog.retry_count + 1,
      failure_reason: null
    });

    return Response.json({
      success: true,
      message: `Fax retry #${faxLog.retry_count + 1} initiated`,
      fax_id: telnyxData.data?.id
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, to_numbers, from_number, document_name, patient_id, cover_page_details, priority, from_name } = await req.json();

    // AI Priority Analysis
    let finalPriority = priority || 'normal';
    
    if (!priority) {
      try {
        const analysisResult = await base44.functions.invoke('analyzeFaxPriority', {
          document_name,
          cover_page_details,
          to_number: to_numbers[0],
          from_number,
          from_name
        });
        finalPriority = analysisResult.data.priority || 'normal';
      } catch (error) {
        console.error('Priority analysis failed:', error);
      }
    }

    if (!file_url || !to_numbers || to_numbers.length === 0 || !from_number) {
      return Response.json({ 
        error: 'Missing required fields: file_url, to_numbers, from_number' 
      }, { status: 400 });
    }

    const telnyxApiKey = Deno.env.get('TELNYX_API_KEY');
    if (!telnyxApiKey) {
      return Response.json({ error: 'Telnyx API key not configured' }, { status: 500 });
    }

    const results = [];
    const estimatedCostPerPage = 10; // 10 cents per page estimate

    for (const to_number of to_numbers) {
      try {
        // Log the fax
        const faxLog = await base44.entities.FaxLog.create({
          from_number,
          to_number,
          document_url: file_url,
          document_name: document_name || 'Batch Fax',
          status: 'queued',
          patient_id: patient_id || null,
          sent_by: user.email,
          cover_page_details: cover_page_details || null,
          priority: finalPriority,
          estimated_cost: estimatedCostPerPage
        });

        // Send fax
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

        if (telnyxResponse.ok) {
          await base44.entities.FaxLog.update(faxLog.id, {
            telnyx_fax_id: telnyxData.data?.id,
            status: 'sending'
          });
          results.push({ to_number, success: true, fax_id: telnyxData.data?.id });
        } else {
          await base44.entities.FaxLog.update(faxLog.id, {
            status: 'failed',
            failure_reason: telnyxData.errors?.[0]?.detail || 'Failed to send'
          });
          results.push({ to_number, success: false, error: telnyxData.errors?.[0]?.detail });
        }
      } catch (error) {
        results.push({ to_number, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return Response.json({
      success: true,
      message: `Sent ${successCount}/${to_numbers.length} faxes`,
      results,
      total: to_numbers.length,
      successful: successCount,
      failed: to_numbers.length - successCount
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
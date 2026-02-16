import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, to_number, from_number, document_name, to_name, patient_id, cover_page_details, priority, from_name } = await req.json();

    // AI Priority Analysis
    let finalPriority = priority || 'normal';
    let priorityAnalysis = null;
    
    if (!priority) {
      try {
        const analysisResult = await base44.functions.invoke('analyzeFaxPriority', {
          document_name,
          cover_page_details,
          to_number,
          from_number,
          to_name,
          from_name
        });
        finalPriority = analysisResult.data.priority || 'normal';
        priorityAnalysis = analysisResult.data;
      } catch (error) {
        console.error('Priority analysis failed:', error);
      }
    }

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
    const estimatedCostPerPage = 10; // 10 cents per page
    const faxLog = await base44.entities.FaxLog.create({
      from_number: from_number,
      to_number: to_number,
      to_name: to_name || null,
      document_url: file_url,
      document_name: document_name || 'Camera Fax',
      status: 'queued',
      patient_id: patient_id || null,
      sent_by: user.email,
      cover_page_details: cover_page_details || null,
      priority: finalPriority,
      estimated_cost: estimatedCostPerPage
    });

    // Send urgent notifications
    if (finalPriority === 'urgent' && priorityAnalysis?.notify_users?.length > 0) {
      for (const userEmail of priorityAnalysis.notify_users) {
        try {
          await base44.integrations.Core.SendEmail({
            to: userEmail,
            subject: `🚨 Urgent Fax: ${document_name}`,
            body: `An urgent fax has been sent:\n\nTo: ${to_name || to_number}\nFrom: ${from_number}\nDocument: ${document_name}\n\nReason: ${priorityAnalysis.reason}\n\nPlease review immediately.`
          });
        } catch (emailError) {
          console.error('Failed to send notification:', emailError);
        }
      }
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

    // Queue OCR processing asynchronously
    try {
      base44.functions.invoke('processFaxOCR', {
        fax_log_id: faxLog.id,
        document_url: file_url
      }).catch(err => console.error('OCR queue failed:', err));
    } catch (ocrError) {
      console.error('OCR processing error:', ocrError);
    }

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
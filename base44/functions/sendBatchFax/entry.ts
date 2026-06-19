import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Resolve Twilio credentials: prefer env vars, then the in-app IntegrationSecret
 * row with provider 'twilio'. Mirrors the other fax senders so batch/scheduled
 * fax works for agencies that store credentials in-app rather than in env.
 */
async function resolveTwilioCreds(base44: any): Promise<{ accountSid: string | null; authToken: string | null }> {
  const envSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const envToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  let sid = envSid && envSid.trim() ? envSid.trim() : null;
  let token = envToken && envToken.trim() ? envToken.trim() : null;
  if (!sid || !token) {
    try {
      const rows = await base44.asServiceRole.entities.IntegrationSecret.filter({ provider: 'twilio' });
      const rec = rows?.[0] || {};
      if (!sid && rec.account_sid && String(rec.account_sid).trim()) sid = String(rec.account_sid).trim();
      if (!token && rec.auth_token && String(rec.auth_token).trim()) token = String(rec.auth_token).trim();
    } catch { /* ignore */ }
  }
  return { accountSid: sid, authToken: token };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url, to_numbers, from_number, document_name, patient_id, cover_page_details, priority, from_name } = await req.json();

    const normalizedRecipients = Array.isArray(to_numbers)
      ? to_numbers.map((num) => typeof num === 'string' ? num.trim() : '').filter(Boolean)
      : [];

    if (!file_url || normalizedRecipients.length === 0) {
      return Response.json({
        error: 'Missing required fields: file_url, to_numbers'
      }, { status: 400 });
    }

    // AI Priority Analysis
    let finalPriority = priority || 'normal';

    if (!priority) {
      try {
        const analysisResult = await base44.functions.invoke('analyzeFaxPriority', {
          document_name,
          cover_page_details,
          to_number: normalizedRecipients[0],
          from_number,
          from_name
        });
        finalPriority = analysisResult.data.priority || 'normal';
      } catch (error) {
        console.error('Priority analysis failed:', error);
      }
    }

    if (!file_url || !to_numbers || to_numbers.length === 0) {
      return Response.json({
        error: 'Missing required fields: file_url, to_numbers'
      }, { status: 400 });
    }

    const { accountSid, authToken } = await resolveTwilioCreds(base44);
    const twilioFromNumber = from_number || Deno.env.get('TWILIO_FAX_NUMBER');

    if (!accountSid || !authToken || !twilioFromNumber) {
      return Response.json({ error: 'Twilio credentials not configured' }, { status: 500 });
    }

    const results = [];
    const estimatedCostPerPage = 10;

    for (const to_number of normalizedRecipients) {
      try {
        const faxLog = await base44.entities.FaxLog.create({
          from_number: twilioFromNumber,
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

        const formBody = new URLSearchParams();
        formBody.append('From', twilioFromNumber);
        formBody.append('To', to_number);
        formBody.append('MediaUrl', file_url);
        formBody.append('Quality', 'fine');

        const twilioResponse = await fetch('https://fax.twilio.com/v1/Faxes', {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: formBody.toString()
        });

        const twilioData = await twilioResponse.json();

        if (twilioResponse.ok) {
          await base44.entities.FaxLog.update(faxLog.id, {
            telnyx_fax_id: twilioData.sid,
            status: 'sending'
          });
          results.push({ to_number, success: true, fax_id: twilioData.sid });
        } else {
          const failureReason = twilioData.message || twilioData.error_message || 'Failed to send';
          await base44.entities.FaxLog.update(faxLog.id, {
            status: 'failed',
            failure_reason: failureReason
          });
          results.push({ to_number, success: false, error: failureReason });
        }
      } catch (error) {
        results.push({ to_number, success: false, error: error.message });
      }
    }

    const successCount = results.filter(r => r.success).length;

    return Response.json({
      success: true,
      message: `Sent ${successCount}/${normalizedRecipients.length} faxes`,
      results,
      total: normalizedRecipients.length,
      successful: successCount,
      failed: normalizedRecipients.length - successCount
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

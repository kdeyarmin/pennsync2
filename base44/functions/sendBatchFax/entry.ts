import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Resolve Telnyx credentials: prefer env vars, then the in-app IntegrationSecret
 * row with provider 'telnyx'. Mirrors the SMS/voice handlers so fax functions work
 * for agencies that store credentials in-app rather than in the dashboard env.
 */
async function resolveTelnyxCreds(base44: any): Promise<{
  apiKey: string | null;
  publicKey: string | null;
  messagingProfileId: string | null;
  voiceConnectionId: string | null;
  faxConnectionId: string | null;
}> {
  const pick = (v: string | undefined | null) => (v && String(v).trim() ? String(v).trim() : null);
  let apiKey = pick(Deno.env.get('TELNYX_API_KEY'));
  let publicKey = pick(Deno.env.get('TELNYX_PUBLIC_KEY'));
  let messagingProfileId = pick(Deno.env.get('TELNYX_MESSAGING_PROFILE_ID'));
  let voiceConnectionId = pick(Deno.env.get('TELNYX_VOICE_CONNECTION_ID')) || pick(Deno.env.get('TELNYX_CONNECTION_ID'));
  let faxConnectionId = pick(Deno.env.get('TELNYX_FAX_CONNECTION_ID'));
  try {
    const rows = await base44.asServiceRole.entities.IntegrationSecret.filter({ provider: 'telnyx' });
    const rec = rows?.[0] || {};
    if (!apiKey) apiKey = pick(rec.api_key);
    if (!publicKey) publicKey = pick(rec.public_key);
    if (!messagingProfileId) messagingProfileId = pick(rec.messaging_profile_id);
    if (!voiceConnectionId) voiceConnectionId = pick(rec.voice_connection_id);
    if (!faxConnectionId) faxConnectionId = pick(rec.fax_connection_id);
  } catch { /* ignore */ }
  return { apiKey, publicKey, messagingProfileId, voiceConnectionId, faxConnectionId };
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

    const { apiKey, faxConnectionId } = await resolveTelnyxCreds(base44);
    const telnyxFromNumber = from_number || Deno.env.get('TELNYX_FAX_NUMBER');

    if (!apiKey || !faxConnectionId || !telnyxFromNumber) {
      return Response.json({ error: 'Telnyx credentials not configured' }, { status: 500 });
    }

    const results = [];
    const estimatedCostPerPage = 10;

    for (const to_number of normalizedRecipients) {
      try {
        const faxLog = await base44.entities.FaxLog.create({
          from_number: telnyxFromNumber,
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

        const telnyxResponse = await fetch('https://api.telnyx.com/v2/faxes', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            connection_id: faxConnectionId,
            from: telnyxFromNumber,
            to: to_number,
            media_url: file_url,
            quality: 'high'
          })
        });

        const telnyxData = await telnyxResponse.json().catch(() => ({}));

        if (telnyxResponse.ok) {
          await base44.entities.FaxLog.update(faxLog.id, {
            telnyx_fax_id: telnyxData?.data?.id,
            status: 'sending'
          });
          results.push({ to_number, success: true, fax_id: telnyxData?.data?.id });
        } else {
          const failureReason = telnyxData?.errors?.[0]?.detail || telnyxData?.errors?.[0]?.title || 'Failed to send';
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

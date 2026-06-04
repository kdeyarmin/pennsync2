import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * handleTwilioVoicemail — webhook fired by Twilio when a voicemail recording
 * is available (recordingStatusCallback) or transcription is ready
 * (transcribeCallback). Both callbacks POST to this same endpoint.
 *
 * Twilio POSTs application/x-www-form-urlencoded. The X-Twilio-Signature
 * header is verified before any application logic runs.
 *
 * Two separate POSTs may arrive for the same call:
 *   1. Recording POST  — CallSid + RecordingUrl + RecordingDuration (no TranscriptionText)
 *   2. Transcription POST — CallSid + RecordingUrl + TranscriptionText (after async STT)
 * Both are handled idempotently: a recording POST skips if the same URL is
 * already stored; a transcription-only POST simply updates voicemail_transcription.
 */

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function hmacSha1Base64(key: string, msg: string): Promise<string> {
  const cryptoKey = await crypto.subtle.importKey('raw', new TextEncoder().encode(key), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(msg));
  return btoa(String.fromCharCode(...new Uint8Array(sig)));
}

async function verifyTwilioSignature(req: Request, params: Record<string, string>, authToken: string | null): Promise<boolean> {
  const sharedSecret = Deno.env.get('TWILIO_WEBHOOK_SECRET');
  const headerSecret = req.headers.get('x-webhook-secret');
  if (sharedSecret && headerSecret && timingSafeEqual(headerSecret, sharedSecret)) return true;
  const provided = req.headers.get('x-twilio-signature');
  if (!authToken || !provided) return false;
  const url = Deno.env.get('TWILIO_WEBHOOK_URL') || req.url;
  let data = url;
  for (const k of Object.keys(params).sort()) data += k + params[k];
  const expected = await hmacSha1Base64(authToken, data);
  return timingSafeEqual(provided.trim(), expected);
}

/**
 * Resolve Twilio credentials: prefer env vars, then fall back to the
 * IntegrationSecret row saved by the super admin in-app.
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
    const formData = await req.formData();
    const params: Record<string, string> = {};
    for (const [k, v] of formData.entries()) params[k] = String(v);

    const base44 = createClientFromRequest(req);
    const { authToken } = await resolveTwilioCreds(base44);
    if (!(await verifyTwilioSignature(req, params, authToken))) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const providerCallId = params.CallSid;
    const recordingUrl = params.RecordingUrl || null;
    const durationRaw = params.RecordingDuration || null;
    // TranscriptionText is present on transcribeCallback POSTs; absent on recording POSTs.
    const transcription = params.TranscriptionText || null;

    if (!providerCallId) {
      return Response.json({ success: false, message: 'Missing CallSid' });
    }

    // Require at least a recording URL or a transcription to do anything useful.
    if (!recordingUrl && !transcription) {
      return Response.json({ success: false, message: 'Missing RecordingUrl and TranscriptionText' });
    }

    const rows = await base44.asServiceRole.entities.CallLog.filter({ provider_call_id: providerCallId });
    if (rows.length === 0) {
      return Response.json({ success: false, message: 'CallLog not found' });
    }
    const row = rows[0];

    // --- Transcription-only POST (TranscriptionText present, no new recording) ---
    // This arrives asynchronously after Twilio's STT finishes. Update the
    // transcription field on the existing row without re-notifying the nurse.
    if (!recordingUrl && transcription) {
      await base44.asServiceRole.entities.CallLog.update(row.id, {
        voicemail_transcription: String(transcription).slice(0, 4000),
      });
      await base44.asServiceRole.entities.UserActivity.create({
        user_email: row.nurse_email || 'system',
        action: 'voicemail_transcription_updated',
        entity_type: 'CallLog',
        entity_id: row.id,
        details: { provider_call_id: providerCallId },
        status: 'success',
      }).catch(() => {});
      return Response.json({ success: true });
    }

    // --- Recording POST (RecordingUrl is present) ---
    // Idempotency: if we already stored this exact recording, ack without
    // re-notifying the nurse (Twilio retries webhooks on non-2xx responses).
    if (row.has_voicemail && row.voicemail_url === recordingUrl) {
      return Response.json({ success: true, deduped: true });
    }

    const duration = durationRaw != null && durationRaw !== '' ? Number(durationRaw) : null;

    await base44.asServiceRole.entities.CallLog.update(row.id, {
      has_voicemail: true,
      voicemail_url: recordingUrl,
      voicemail_duration_seconds: duration,
      voicemail_transcription: transcription ? String(transcription).slice(0, 4000) : null,
    });

    if (row.nurse_email) {
      await base44.asServiceRole.entities.Notification.create({
        user_email: row.nurse_email,
        title: '📩 New voicemail',
        message: transcription
          ? `New voicemail from ${row.from_number}: "${String(transcription).slice(0, 140)}"`
          : `You have a new voicemail from ${row.from_number}.`,
        type: 'voicemail_received',
        priority: 'high',
        related_entity: 'CallLog',
        related_entity_id: row.id,
        is_read: false,
      }).catch((err) => console.error('notification failed:', err));
    }

    await base44.asServiceRole.entities.UserActivity.create({
      user_email: row.nurse_email || 'system',
      action: 'voicemail_received',
      entity_type: 'CallLog',
      entity_id: row.id,
      details: { provider_call_id: providerCallId, from_number: row.from_number, duration_seconds: duration },
      status: 'success',
    }).catch(() => {});

    return Response.json({ success: true });
  } catch (error) {
    console.error('handleTwilioVoicemail error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});

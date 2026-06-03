import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * handleEightXEightVoicemail — webhook fired by 8x8 when a voicemail recording
 * is available for a call (only relevant when voicemail capture is enabled in
 * agency settings and configured in the 8x8 callflow). Attaches the recording
 * to the matching CallLog (by provider call id) and notifies the nurse.
 *
 * Fails closed on signature like the other 8x8 webhooks. NOTE: the recording
 * URL/field names are account-dependent — validate against your 8x8 callflow
 * recording payload and adjust the parse below if needed.
 */

async function hmacHex(secret: string, raw: string): Promise<string> {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(raw));
  return [...new Uint8Array(sig)].map((x) => x.toString(16).padStart(2, '0')).join('');
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

/**
 * Resolve the 8x8 webhook signing secret. Order: dedicated webhook secret (env,
 * then in-app), else the single API secret (env, then in-app) — so configuring
 * just the one API secret, by either path, fully verifies webhooks. Fails closed.
 */
async function resolveEightXEightWebhookSecret(base44: any): Promise<string | null> {
  // 1) a dedicated webhook secret always wins (env, then in-app config)...
  const envWebhook = Deno.env.get('EIGHT_X_EIGHT_WEBHOOK_SECRET');
  if (envWebhook && envWebhook.trim()) return envWebhook.trim();
  let storedWebhook: string | null = null;
  let storedApi: string | null = null;
  try {
    const rows = await base44.asServiceRole.entities.IntegrationSecret.filter({ provider: 'eight_x_eight' });
    const rec = rows?.[0] || {};
    storedWebhook = rec.webhook_secret && String(rec.webhook_secret).trim() ? String(rec.webhook_secret).trim() : null;
    storedApi = rec.api_secret && String(rec.api_secret).trim() ? String(rec.api_secret).trim() : null;
  } catch {
    // best-effort: fall through to the env API-key fallback below
  }
  if (storedWebhook) return storedWebhook;
  // 2) ...otherwise the single API secret verifies webhooks, from EITHER the
  // dashboard env OR in-app config, so configuring just the one secret is enough.
  const envApi = Deno.env.get('EIGHT_X_EIGHT_API_KEY');
  if (envApi && envApi.trim()) return envApi.trim();
  return storedApi;
}

async function verifyWebhook(req: Request, raw: string, secret: string | null): Promise<boolean> {
  if (!secret) {
    console.error('8x8 webhook secret not configured — rejecting webhook');
    return false;
  }
  for (const h of ['x-8x8-signature', 'x-signature', 'x-hub-signature-256']) {
    const provided = req.headers.get(h);
    if (provided) {
      const expected = await hmacHex(secret, raw);
      if (timingSafeEqual(provided.replace(/^sha256=/i, '').trim().toLowerCase(), expected)) return true;
    }
  }
  const staticHeader = req.headers.get('x-webhook-secret');
  return !!staticHeader && timingSafeEqual(staticHeader, secret);
}

Deno.serve(async (req) => {
  try {
    const raw = await req.text();
    const base44 = createClientFromRequest(req);
    const webhookSecret = await resolveEightXEightWebhookSecret(base44);
    if (!(await verifyWebhook(req, raw, webhookSecret))) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(raw || '{}');
    const providerCallId = payload.callId || payload.sessionId || payload.id;
    const recordingUrl = payload.recordingUrl || payload.recording_url || payload.url || payload.mediaUrl || null;
    const duration = payload.duration ?? payload.recordingDuration ?? null;

    if (!providerCallId || !recordingUrl) {
      return Response.json({ success: false, message: 'Missing call id or recording URL' });
    }

    const rows = await base44.asServiceRole.entities.CallLog.filter({ provider_call_id: providerCallId });
    if (rows.length === 0) {
      return Response.json({ success: false, message: 'CallLog not found' });
    }
    const row = rows[0];

    // Idempotency: if we already stored this voicemail, ack without re-notifying.
    if (row.has_voicemail && row.voicemail_url === recordingUrl) {
      return Response.json({ success: true, deduped: true });
    }

    await base44.asServiceRole.entities.CallLog.update(row.id, {
      has_voicemail: true,
      voicemail_url: recordingUrl,
      voicemail_duration_seconds: duration != null ? Number(duration) : null,
    });

    if (row.nurse_email) {
      await base44.asServiceRole.entities.Notification.create({
        user_email: row.nurse_email,
        title: '📩 New voicemail',
        message: `You have a new voicemail from ${row.from_number}.`,
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
    console.error('handleEightXEightVoicemail error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * handleTelnyxStatusWebhook — the single inbound webhook for the Telnyx
 * integration (text + voice + fax). Telnyx POSTs a JSON envelope
 * `{ data: { event_type, payload } }` and signs it with Ed25519:
 *   signed message = `${telnyx-timestamp}|${rawBody}`
 *   header `telnyx-signature-ed25519` = base64(signature)
 * verified against the account's Ed25519 PUBLIC key (Portal → Keys & Credentials).
 *
 * Fails closed: a webhook without a valid signature (or with a stale timestamp)
 * is rejected 401, because these events mutate delivery state for PHI-bearing
 * messages/faxes/calls. The value-mapping logic mirrors
 * src/components/integrations/telnyx/telnyxUtils.js (drift-guarded by
 * base44/functions/telnyxInlineParity.test.js).
 */

// ---- credential resolution (inlined; parity-guarded) ----
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

// ---- value mapping (mirrors telnyxUtils.js) ----
function mapMessageStatus(status: any): string | null {
  switch (String(status || '').toLowerCase()) {
    case 'queued': case 'sending': return 'queued';
    case 'sent': return 'sent';
    case 'delivered': case 'webhook_delivered': return 'delivered';
    case 'sending_failed': case 'delivery_failed': case 'expired': case 'failed': return 'failed';
    default: return null;
  }
}
function mapFaxStatus(status: any): string | null {
  switch (String(status || '').toLowerCase()) {
    case 'queued': return 'queued';
    case 'media.processed': case 'originated': case 'sending': return 'sending';
    case 'sent': return 'sent';
    case 'delivered': return 'delivered';
    case 'failed': case 'cancelled': case 'canceled': return 'failed';
    default: return null;
  }
}
function mapCallStatus(eventType: any): string | null {
  switch (String(eventType || '').toLowerCase()) {
    case 'call.initiated': return 'ringing';
    case 'call.answered': case 'call.bridged': return 'in_progress';
    case 'call.hangup': return 'completed';
    default: return null;
  }
}
function extractTelnyxEvent(body: any): { eventType: string | null; id: string | null; payload: any } {
  const b = body || {};
  const data = b.data || b;
  const payload = data.payload || {};
  return { eventType: data.event_type || b.event_type || null, id: payload.id || data.id || null, payload };
}
function buildSignedPayload(timestamp: any, rawBody: any): string {
  return `${String(timestamp ?? '')}|${String(rawBody ?? '')}`;
}
function isFreshTimestamp(timestamp: any, nowMs = Date.now(), toleranceSeconds = 300): boolean {
  const ts = Number(timestamp);
  if (!Number.isFinite(ts)) return false;
  return Math.abs(nowMs / 1000 - ts) <= toleranceSeconds;
}

// ---- Ed25519 signature verification ----
function base64ToBytes(b64: string): Uint8Array | null {
  try {
    const bin = atob(String(b64).trim());
    const out = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
    return out;
  } catch {
    return null;
  }
}

async function verifyTelnyxSignature(rawBody: string, signatureB64: string | null, timestamp: string | null, publicKeyB64: string | null): Promise<boolean> {
  if (!publicKeyB64 || !signatureB64 || !timestamp) return false;
  if (!isFreshTimestamp(timestamp)) return false;
  const pubBytes = base64ToBytes(publicKeyB64);
  const sigBytes = base64ToBytes(signatureB64);
  if (!pubBytes || !sigBytes) return false;
  try {
    const key = await crypto.subtle.importKey('raw', pubBytes, { name: 'Ed25519' }, false, ['verify']);
    const data = new TextEncoder().encode(buildSignedPayload(timestamp, rawBody));
    return await crypto.subtle.verify({ name: 'Ed25519' }, key, sigBytes, data);
  } catch (err) {
    console.error('Telnyx signature verify error:', (err as Error)?.message);
    return false;
  }
}

// client_state is base64(JSON) set by startTelnyxCall to drive the masked bridge.
function decodeClientState(b64: any): Record<string, any> | null {
  if (!b64 || typeof b64 !== 'string') return null;
  const bytes = base64ToBytes(b64);
  if (!bytes) return null;
  try {
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

// ---- per-channel handlers ----
async function handleMessageEvent(base44: any, payload: any): Promise<Response> {
  const providerId = payload?.id;
  const recipientStatus = payload?.to?.[0]?.status || payload?.status;
  const mapped = mapMessageStatus(recipientStatus);
  if (!providerId) return Response.json({ success: true, skipped: 'no message id' });
  if (!mapped) return Response.json({ success: true, skipped: 'unknown status', status: recipientStatus });

  const rows = await base44.asServiceRole.entities.SmsMessage.filter({ provider_message_id: providerId }, '-created_date', 1).catch(() => []);
  if (!rows.length) return Response.json({ success: false, message: 'SmsMessage not found' });
  const row = rows[0];
  // Idempotency + never regress a terminal row.
  if (row.status === mapped || (row.status === 'delivered' && mapped !== 'failed')) {
    return Response.json({ success: true, status: row.status, deduped: true });
  }
  const update: Record<string, unknown> = { status: mapped };
  if (mapped === 'failed') {
    const err = Array.isArray(payload?.errors) ? payload.errors[0] : null;
    update.failure_reason = err?.detail || err?.title || 'Delivery failed';
  }
  await base44.asServiceRole.entities.SmsMessage.update(row.id, update);
  return Response.json({ success: true, status: mapped });
}

async function handleFaxEvent(base44: any, payload: any): Promise<Response> {
  const providerId = payload?.id;
  const mapped = mapFaxStatus(payload?.status);
  if (!providerId) return Response.json({ success: true, skipped: 'no fax id' });
  if (!mapped) return Response.json({ success: true, skipped: 'unknown status', status: payload?.status });

  const rows = await base44.asServiceRole.entities.FaxLog.filter({ telnyx_fax_id: providerId }).catch(() => []);
  if (!rows.length) return Response.json({ success: false, message: 'FaxLog not found' });
  const faxLog = rows[0];
  if (mapped === faxLog.status) return Response.json({ success: true, status: mapped, deduped: true });

  const update: Record<string, unknown> = { status: mapped, pages: payload?.page_count || faxLog.pages };
  if (mapped === 'failed') {
    update.failure_reason = payload?.failure_reason || payload?.failover?.failure_reason || 'Fax delivery failed';
  }
  await base44.asServiceRole.entities.FaxLog.update(faxLog.id, update);
  return Response.json({ success: true, status: mapped });
}

async function handleCallEvent(base44: any, apiKey: string | null, eventType: string, payload: any): Promise<Response> {
  const callControlId = payload?.call_control_id;
  const state = decodeClientState(payload?.client_state);

  // Masked bridge: when the nurse leg answers, dial the patient presenting the
  // work number as caller id. Guarded by the tag we set in startTelnyxCall.
  if (eventType === 'call.answered' && state?.t === 'masked_bridge' && callControlId && apiKey) {
    try {
      await fetch(`https://api.telnyx.com/v2/calls/${encodeURIComponent(callControlId)}/actions/transfer`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ to: state.bridge_to, from: state.caller_id }),
      });
    } catch (err) {
      console.error('Telnyx bridge transfer error:', (err as Error)?.message);
    }
  }

  // Best-effort CallLog status update by provider call id or client_state log id.
  const mapped = mapCallStatus(eventType);
  if (mapped) {
    let rows = callControlId
      ? await base44.asServiceRole.entities.CallLog.filter({ provider_call_id: callControlId }, '-created_date', 1).catch(() => [])
      : [];
    if (!rows.length && state?.call_log_id) {
      rows = await base44.asServiceRole.entities.CallLog.filter({ id: state.call_log_id }).catch(() => []);
    }
    if (rows.length && rows[0].status !== mapped && rows[0].status !== 'completed') {
      await base44.asServiceRole.entities.CallLog.update(rows[0].id, { status: mapped }).catch(() => {});
    }
  }
  return Response.json({ success: true, event: eventType, status: mapped });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { apiKey, publicKey } = await resolveTelnyxCreds(base44);

    // Read the raw body ONCE — signature is over the exact bytes.
    const rawBody = await req.text();
    const signature = req.headers.get('telnyx-signature-ed25519');
    const timestamp = req.headers.get('telnyx-timestamp');

    if (!(await verifyTelnyxSignature(rawBody, signature, timestamp, publicKey))) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    let body: any = {};
    try { body = JSON.parse(rawBody); } catch { /* leave empty */ }
    const { eventType, payload } = extractTelnyxEvent(body);

    if (!eventType) return Response.json({ success: true, skipped: 'no event type' });

    if (eventType.startsWith('message.')) return await handleMessageEvent(base44, payload);
    if (eventType.startsWith('fax.')) return await handleFaxEvent(base44, payload);
    if (eventType.startsWith('call.')) return await handleCallEvent(base44, apiKey, eventType, payload);

    return Response.json({ success: true, skipped: 'unhandled event', event: eventType });
  } catch (error) {
    // Don't echo raw error text (may contain PHI such as numbers/URLs).
    console.error('handleTelnyxStatusWebhook error:', (error as Error)?.message);
    return Response.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
});

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * handleTwilioSmsStatus — delivery-receipt (DLR) webhook for outbound SMS.
 * Maps the Twilio MessageStatus onto the SmsMessage row identified by its
 * provider id (MessageSid). Mirrors handleTwilioFaxWebhook.ts.
 *
 * All Twilio webhooks are application/x-www-form-urlencoded; parsed with
 * req.formData(). Signature is verified via HMAC-SHA1 exactly as in the fax
 * handler. Returns JSON { success: true }.
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

/**
 * Resolve Twilio credentials: prefer env vars, then the in-app IntegrationSecret
 * row with provider 'twilio'. Either path configures the integration, so the
 * Base44 dashboard env is optional.
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

/**
 * Verify Twilio's X-Twilio-Signature: base64(HMAC-SHA1(authToken, url + sorted
 * concatenated POST params)). Fails closed. If your deployment sits behind a
 * proxy that rewrites host/path, set TWILIO_WEBHOOK_URL to the exact URL Twilio
 * is configured to call. An optional TWILIO_WEBHOOK_SECRET + x-webhook-secret
 * header is supported for manual testing only.
 */
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

function mapStatus(raw: string): string {
  // Map Twilio MessageStatus values to our internal status.
  // sent→sent, delivered→delivered, undelivered→failed, failed→failed,
  // queued/sending/accepted→queued (early life-cycle).
  // Unknown statuses return '' so the caller can ignore them instead of
  // silently regressing a message to an earlier state.
  const map: Record<string, string> = {
    queued: 'queued',
    accepted: 'queued',
    sending: 'queued',
    sent: 'sent',
    delivered: 'delivered',
    undelivered: 'failed',
    failed: 'failed',
  };
  return map[(raw || '').toLowerCase()] || '';
}

// Monotonic rank so a late/out-of-order DLR can't downgrade a terminal state
// (e.g. a stale 'queued' arriving after 'delivered').
const SMS_RANK: Record<string, number> = { queued: 1, sent: 2, delivered: 3, failed: 3 };

Deno.serve(async (req) => {
  try {
    const formData = await req.formData();
    const params: Record<string, string> = {};
    for (const [k, v] of formData.entries()) params[k] = String(v);

    const base44 = createClientFromRequest(req);
    const { authToken } = await resolveTwilioCreds(base44);

    const verified = await verifyTwilioSignature(req, params, authToken);
    // Diagnostic mode (TWILIO_WEBHOOK_DEBUG): log which signature headers are
    // PRESENT and whether verification passed — never any secret/value.
    if (Deno.env.get('TWILIO_WEBHOOK_DEBUG')) {
      const present = ['x-twilio-signature', 'x-webhook-secret'].filter((h) => req.headers.get(h));
      console.log('[webhook-debug] handleTwilioSmsStatus ' + JSON.stringify({ verified, signature_headers_present: present, content_type: req.headers.get('content-type') }));
    }
    if (!verified) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const messageSid = params.MessageSid;
    const statusRaw = params.MessageStatus;
    const errorCode = params.ErrorCode || null;
    const errorMessage = params.ErrorMessage || null;

    if (!messageSid) {
      return Response.json({ success: false, message: 'Missing MessageSid' });
    }

    const rows = await base44.asServiceRole.entities.SmsMessage.filter({ provider_message_id: messageSid });
    if (rows.length === 0) {
      return Response.json({ success: false, message: 'SmsMessage not found' });
    }

    const row = rows[0];
    const mapped = mapStatus(statusRaw);
    // Ignore unknown statuses and non-forward transitions (out-of-order DLRs).
    if (!mapped || (SMS_RANK[mapped] || 0) <= (SMS_RANK[row.status] || 0)) {
      return Response.json({ success: true, ignored: true, status: row.status });
    }

    const failureReason = mapped === 'failed'
      ? (errorMessage || (errorCode ? `Twilio error code ${errorCode}` : 'Delivery failed'))
      : null;

    await base44.asServiceRole.entities.SmsMessage.update(row.id, {
      status: mapped,
      failure_reason: failureReason,
    });

    // Tell the nurse when a text they sent failed to deliver, so it doesn't fail
    // silently. (Delivery success is the norm and isn't notified.)
    if (mapped === 'failed' && row.nurse_email) {
      await base44.asServiceRole.entities.Notification.create({
        user_email: row.nurse_email,
        title: '⚠️ Text not delivered',
        message: `A text to ${row.to_number} couldn't be delivered${failureReason ? `: ${failureReason}` : ''}. It will retry automatically if the failure was temporary.`,
        type: 'sms_failed',
        priority: 'high',
        related_entity: 'SmsMessage',
        related_entity_id: row.id,
        is_read: false,
      }).catch((err) => console.error('failed-delivery notification failed:', err));
    }

    if (row.sent_by) {
      await base44.asServiceRole.entities.UserActivity.create({
        user_email: row.sent_by,
        action: 'sms_status_updated',
        entity_type: 'SmsMessage',
        entity_id: row.id,
        details: {
          provider_message_id: messageSid,
          old_status: row.status,
          new_status: mapped,
          to_number: row.to_number,
          error: mapped === 'failed' ? failureReason : null,
        },
        status: mapped === 'failed' ? 'failure' : 'success',
      }).catch((err) => console.error('Failed to log activity:', err));
    }

    return Response.json({ success: true, status: mapped });
  } catch (error) {
    console.error('handleTwilioSmsStatus error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

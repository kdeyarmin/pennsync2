import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Twilio Fax Status Webhook Handler
 * Receives real-time fax status updates from Twilio and updates FaxLog records.
 */
const BACKOFF_MINUTES = [5, 15, 60];

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
 * Verify Twilio's X-Twilio-Signature: base64(HMAC-SHA1(authToken, url + sorted
 * concatenated POST params)). Fails closed. If your deployment sits behind a
 * proxy that rewrites host/path, set TWILIO_WEBHOOK_URL to the exact URL Twilio
 * is configured to call. An optional TWILIO_WEBHOOK_SECRET + x-webhook-secret
 * header is supported for manual testing only.
 */
async function verifyTwilioSignature(req: Request, params: Record<string, string>): Promise<boolean> {
  const sharedSecret = Deno.env.get('TWILIO_WEBHOOK_SECRET');
  const headerSecret = req.headers.get('x-webhook-secret');
  if (sharedSecret && headerSecret && timingSafeEqual(headerSecret, sharedSecret)) return true;

  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  const provided = req.headers.get('x-twilio-signature');
  if (!authToken || !provided) return false;

  const url = Deno.env.get('TWILIO_WEBHOOK_URL') || req.url;
  let data = url;
  for (const k of Object.keys(params).sort()) data += k + params[k];
  const expected = await hmacSha1Base64(authToken, data);
  return timingSafeEqual(provided.trim(), expected);
}

Deno.serve(async (req) => {
  try {
    const formData = await req.formData();
    const params: Record<string, string> = {};
    for (const [k, v] of formData.entries()) params[k] = String(v);

    // Fail closed: only accept genuine Twilio-signed callbacks.
    if (!(await verifyTwilioSignature(req, params))) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const faxSid = params.FaxSid;
    const status = params.Status;
    const numPages = params.NumPages;
    const errorCode = params.ErrorCode;
    const errorMessage = params.ErrorMessage;

    if (!faxSid) {
      return Response.json({ error: 'Missing FaxSid' }, { status: 400 });
    }

    const base44 = createClientFromRequest(req);

    const faxLogs = await base44.asServiceRole.entities.FaxLog.filter({
      telnyx_fax_id: faxSid
    });

    if (faxLogs.length === 0) {
      return Response.json({ success: false, message: 'FaxLog not found' });
    }

    const faxLog = faxLogs[0];
    const mappedStatus = mapTwilioStatus(status);

    // Idempotency: Twilio retries webhooks. If the status is unchanged, ack
    // without re-running side effects (duplicate notifications / retry bumps).
    if (mappedStatus === faxLog.status) {
      return Response.json({ success: true, status: mappedStatus, deduped: true });
    }
    const parsedNumPages = numPages ? parseInt(String(numPages), 10) : faxLog.pages;

    const updateData = {
      status: mappedStatus,
      pages: Number.isFinite(parsedNumPages) ? parsedNumPages : faxLog.pages,
      failure_reason: null,
      next_retry_at: null,
    };

    if (mappedStatus === 'failed') {
      const failureReason = `${errorCode || 'failed'}: ${errorMessage || 'Unknown error'}`;
      const retryCount = faxLog.retry_count || 0;

      if (retryCount < BACKOFF_MINUTES.length) {
        const delayMs = BACKOFF_MINUTES[retryCount] * 60 * 1000;
        updateData.next_retry_at = new Date(Date.now() + delayMs).toISOString();
        updateData.retry_count = retryCount + 1;
      } else {
        updateData.final_failure_notified = false;
      }

      updateData.failure_reason = failureReason;
    }

    await base44.asServiceRole.entities.FaxLog.update(faxLog.id, updateData);

    if (mappedStatus === 'delivered') {
      await sendStatusNotification(base44, faxLog, mappedStatus, updateData.pages).catch((err) => console.error('Failed to send status notification:', err));
    }

    if (faxLog.sent_by) {
      await base44.asServiceRole.entities.UserActivity.create({
        user_email: faxLog.sent_by,
        action: 'fax_status_updated',
        entity_type: 'FaxLog',
        entity_id: faxLog.id,
        details: {
          fax_sid: faxSid,
          old_status: faxLog.status,
          new_status: mappedStatus,
          to_number: faxLog.to_number,
          document_name: faxLog.document_name,
          pages: updateData.pages,
          error: updateData.failure_reason,
        },
        status: mappedStatus === 'failed' ? 'failure' : 'success',
      }).catch((err) => console.error('Failed to log user activity:', err));
    }

    return Response.json({ success: true, status: mappedStatus });
  } catch (error) {
    console.error('Twilio webhook error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function mapTwilioStatus(twilioStatus) {
  const statusMap = {
    queued: 'queued',
    processing: 'sending',
    sending: 'sending',
    delivered: 'delivered',
    failed: 'failed',
    canceled: 'failed'
  };
  return statusMap[twilioStatus] || 'sending';
}

async function sendStatusNotification(base44, faxLog, status, numPages) {
  if (!faxLog.sent_by || status !== 'delivered') return;

  const recipientName = faxLog.to_name || faxLog.to_number;
  await base44.asServiceRole.entities.Notification.create({
    user_email: faxLog.sent_by,
    title: '✅ Fax Delivered Successfully',
    message: `Your fax to ${recipientName} has been delivered successfully. Document: ${faxLog.document_name || 'Untitled'} (${numPages || faxLog.pages || 'N/A'} pages).`,
    type: 'fax_delivered',
    priority: 'normal',
    related_entity: 'FaxLog',
    related_entity_id: faxLog.id,
    is_read: false,
  });
}

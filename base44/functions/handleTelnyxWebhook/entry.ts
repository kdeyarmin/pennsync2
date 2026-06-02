import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Legacy webhook endpoint kept for backward compatibility.
 * This handler now processes Twilio fax webhook payloads.
 *
 * Security: this endpoint mutates fax delivery/failure status, so it must be
 * authenticated — otherwise a forged POST could spoof fax delivery results
 * (a PHI/integrity concern). It fails closed, accepting EITHER:
 *   - a valid Twilio X-Twilio-Signature (form-encoded Twilio callbacks, verified
 *     with the existing TWILIO_AUTH_TOKEN), or
 *   - a matching x-webhook-secret header (TWILIO_WEBHOOK_SECRET / FAX_WEBHOOK_SECRET),
 *     used for JSON callers and manual testing.
 * Mirrors handleTwilioFaxWebhook's verification.
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

/** Optional shared-secret escape hatch for JSON callers / manual testing. */
function hasValidSharedSecret(req: Request): boolean {
  const sharedSecret = Deno.env.get('TWILIO_WEBHOOK_SECRET') || Deno.env.get('FAX_WEBHOOK_SECRET');
  const headerSecret = req.headers.get('x-webhook-secret');
  return !!(sharedSecret && headerSecret && timingSafeEqual(headerSecret, sharedSecret));
}

/**
 * Verify Twilio's X-Twilio-Signature: base64(HMAC-SHA1(authToken, url + sorted
 * concatenated POST params)). Fails closed. If your deployment sits behind a
 * proxy that rewrites host/path, set TWILIO_WEBHOOK_URL to the exact URL Twilio
 * is configured to call.
 */
async function verifyTwilioSignature(req: Request, params: Record<string, string>): Promise<boolean> {
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
    const base44 = createClientFromRequest(req);

    // Read the body once, then authenticate before doing any work.
    const contentType = req.headers.get('content-type') || '';
    let payload;

    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      // JSON callers can't carry a Twilio signature; require the shared secret.
      if (!hasValidSharedSecret(req)) {
        return Response.json({ error: 'Invalid signature' }, { status: 401 });
      }
      payload = payloadFromJson(body);
    } else {
      const formData = await req.formData();
      const params: Record<string, string> = {};
      for (const [k, v] of formData.entries()) params[k] = String(v);
      // Fail closed: accept genuine Twilio-signed callbacks or the shared secret.
      if (!hasValidSharedSecret(req) && !(await verifyTwilioSignature(req, params))) {
        return Response.json({ error: 'Invalid signature' }, { status: 401 });
      }
      payload = payloadFromParams(params);
    }

    const faxSid = payload.faxSid;
    const status = payload.status;

    if (!faxSid || !status) {
      return Response.json({ error: 'Invalid webhook payload. Missing fax SID or status.' }, { status: 400 });
    }

    const faxLogs = await base44.asServiceRole.entities.FaxLog.filter({
      telnyx_fax_id: faxSid
    });

    if (faxLogs.length === 0) {
      return Response.json({ success: false, message: 'FaxLog not found' });
    }

    const faxLog = faxLogs[0];
    const mappedStatus = mapTwilioStatus(status);

    const updateData = {
      status: mappedStatus,
      pages: payload.numPages || faxLog.pages,
      failure_reason: null,
      next_retry_at: null,
    };

    if (mappedStatus === 'failed') {
      const retryCount = faxLog.retry_count || 0;

      if (retryCount < BACKOFF_MINUTES.length) {
        const delayMs = BACKOFF_MINUTES[retryCount] * 60 * 1000;
        updateData.next_retry_at = new Date(Date.now() + delayMs).toISOString();
        updateData.retry_count = retryCount + 1;
      } else {
        updateData.final_failure_notified = false;
      }

      updateData.failure_reason = payload.failureReason || 'Unknown error';
    }

    await base44.asServiceRole.entities.FaxLog.update(faxLog.id, updateData);

    await base44.asServiceRole.entities.UserActivity.create({
      user_email: 'system',
      user_name: 'Twilio Webhook',
      action: 'fax_webhook_received',
      details: {
        fax_sid: faxSid,
        status,
        mapped_status: mappedStatus,
        to: payload.to,
        from: payload.from,
        pages: payload.numPages,
        timestamp: new Date().toISOString()
      },
      page: 'webhook',
      user_agent: req.headers.get('user-agent') || 'twilio'
    }).catch((err) => console.error('Failed to log user activity:', err));

    return Response.json({
      success: true,
      received: status,
      status: mappedStatus
    });
  } catch (error) {
    // Don't echo raw error text (may contain PHI such as numbers/URLs).
    console.error('Webhook error:', error?.message);
    return Response.json({ error: 'Failed to process webhook' }, { status: 500 });
  }
});

function payloadFromJson(body) {
  return {
    faxSid: body.FaxSid || body.fax_sid || body.sid || body.data?.payload?.id,
    status: body.Status || body.FaxStatus || body.status || body.data?.payload?.status,
    numPages: parseNumber(body.NumPages || body.num_pages || body.data?.payload?.page_count),
    failureReason: body.ErrorMessage || body.error_message || body.data?.payload?.failure_reason,
    to: body.To || body.to || body.data?.payload?.to,
    from: body.From || body.from || body.data?.payload?.from
  };
}

function payloadFromParams(params) {
  return {
    faxSid: params['FaxSid'],
    status: params['Status'] || params['FaxStatus'],
    numPages: parseNumber(params['NumPages']),
    failureReason: params['ErrorMessage'] || params['ErrorCode'],
    to: params['To'],
    from: params['From']
  };
}

function parseNumber(value) {
  const num = Number(value);
  return Number.isFinite(num) ? num : undefined;
}

function mapTwilioStatus(twilioStatus) {
  const statusMap = {
    queued: 'queued',
    processing: 'sending',
    sending: 'sending',
    sent: 'sent',
    delivered: 'delivered',
    failed: 'failed',
    canceled: 'failed'
  };

  return statusMap[twilioStatus] || 'sending';
}

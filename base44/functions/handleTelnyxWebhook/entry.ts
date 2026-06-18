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
// Inline copy of the fax retry policy (source of truth: src/components/fax/faxRetry.js;
// drift-guarded by base44/functions/faxRetryInlineParity.test.js). Using the SAME
// policy as handleTwilioFaxWebhook means that even if both handlers receive the
// same Twilio payload they compute identical retry_count / next_retry_at, and a
// PERMANENT failure (bad number, not a fax machine) gives up immediately instead
// of burning the old fixed [5,15,60] schedule that ignored FaxRetryConfig.
const PERMANENT_FAILURE_PATTERNS = [
  /invalid/i, /not a fax/i, /no fax machine/i, /incompatible/i, /unsupported/i,
  /rejected/i, /blocked/i, /do not call/i, /unallocated/i, /disconnected/i,
  /forbidden/i, /not in service/i, /no such number/i, /malformed/i,
];
function classifyFaxFailure(errorCode: any, errorMessage: any): string {
  const s = `${errorCode ?? ''} ${errorMessage ?? ''}`.trim();
  if (!s) return 'transient';
  return PERMANENT_FAILURE_PATTERNS.some((re) => re.test(s)) ? 'permanent' : 'transient';
}
function faxRetryConfig(config: any) {
  const c = config || {};
  return {
    enabled: c.auto_retry_enabled !== false,
    maxRetries: Number.isFinite(c.max_retries) ? Math.max(0, c.max_retries) : 3,
    baseDelayMinutes: Number.isFinite(c.retry_delay_minutes) && c.retry_delay_minutes > 0 ? c.retry_delay_minutes : 15,
    notifyOnFinalFailure: c.notify_on_final_failure !== false,
    priorityMultiplier: c.priority_multiplier && typeof c.priority_multiplier === 'object' ? c.priority_multiplier : {},
  };
}
function nextRetryDelayMinutes(attempt: number, config: any, priority = 'normal', factor = 2, maxMinutes = 360): number {
  const c = faxRetryConfig(config);
  const a = Math.max(0, Number(attempt) || 0);
  const mult = Number.isFinite(c.priorityMultiplier[priority]) ? c.priorityMultiplier[priority] : 1;
  const minutes = c.baseDelayMinutes * factor ** a * mult;
  return Math.max(1, Math.min(maxMinutes, Math.round(minutes)));
}
function planFaxRetry(opts: any) {
  const { retryCount = 0, errorCode, errorMessage, priority = 'normal', config, now = Date.now() } = opts || {};
  const c = faxRetryConfig(config);
  const classification = classifyFaxFailure(errorCode, errorMessage);
  const attempts = Number(retryCount) || 0;
  if (!c.enabled || classification === 'permanent' || attempts >= c.maxRetries) {
    return { willRetry: false, classification, exhausted: true, nextRetryAt: null, nextRetryCount: attempts, delayMinutes: 0 };
  }
  const delayMinutes = nextRetryDelayMinutes(attempts, config, priority);
  return { willRetry: true, classification, exhausted: false, nextRetryAt: new Date(now + delayMinutes * 60000).toISOString(), nextRetryCount: attempts + 1, delayMinutes };
}

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
 * row with provider 'twilio'. Mirrors the SMS/voice handlers so this fax webhook
 * verifies for agencies that store credentials in-app rather than in env.
 */
async function resolveTwilioCreds(base44: any): Promise<{ authToken: string | null; storedWebhookSecret: string | null }> {
  const envToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  let token = envToken && envToken.trim() ? envToken.trim() : null;
  let storedWebhookSecret: string | null = null;
  try {
    const rows = await base44.asServiceRole.entities.IntegrationSecret.filter({ provider: 'twilio' });
    const rec = rows?.[0] || {};
    if (!token && rec.auth_token && String(rec.auth_token).trim()) token = String(rec.auth_token).trim();
    if (rec.webhook_secret && String(rec.webhook_secret).trim()) storedWebhookSecret = String(rec.webhook_secret).trim();
  } catch { /* ignore */ }
  return { authToken: token, storedWebhookSecret };
}

/** Optional shared-secret escape hatch for JSON callers / manual testing. */
function hasValidSharedSecret(req: Request, storedWebhookSecret: string | null = null): boolean {
  const sharedSecret = Deno.env.get('TWILIO_WEBHOOK_SECRET') || Deno.env.get('FAX_WEBHOOK_SECRET');
  const headerSecret = req.headers.get('x-webhook-secret');
  if (!headerSecret) return false;
  if (sharedSecret && timingSafeEqual(headerSecret, sharedSecret)) return true;
  if (storedWebhookSecret && timingSafeEqual(headerSecret, storedWebhookSecret)) return true;
  return false;
}

/**
 * Verify Twilio's X-Twilio-Signature: base64(HMAC-SHA1(authToken, url + sorted
 * concatenated POST params)). Fails closed. If your deployment sits behind a
 * proxy that rewrites host/path, set TWILIO_WEBHOOK_URL to the exact URL Twilio
 * is configured to call.
 */
async function verifyTwilioSignature(req: Request, params: Record<string, string>, authToken: string | null): Promise<boolean> {
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
    // Resolve the auth token + stored webhook secret from env OR the in-app
    // IntegrationSecret so verification works for in-app-configured agencies.
    const { authToken, storedWebhookSecret } = await resolveTwilioCreds(base44);

    // Read the body once, then authenticate before doing any work.
    const contentType = req.headers.get('content-type') || '';
    let payload;

    if (contentType.includes('application/json')) {
      const body = await req.json().catch(() => ({}));
      // JSON callers can't carry a Twilio signature; require the shared secret.
      if (!hasValidSharedSecret(req, storedWebhookSecret)) {
        return Response.json({ error: 'Invalid signature' }, { status: 401 });
      }
      payload = payloadFromJson(body);
    } else {
      const formData = await req.formData();
      const params: Record<string, string> = {};
      for (const [k, v] of formData.entries()) params[k] = String(v);
      // Fail closed: accept genuine Twilio-signed callbacks or the shared secret.
      if (!hasValidSharedSecret(req, storedWebhookSecret) && !(await verifyTwilioSignature(req, params, authToken))) {
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

    // Unknown status: ack without writing (don't regress a terminal fax to a
    // non-terminal state). Matches handleTwilioFaxWebhook.
    if (!mappedStatus) {
      return Response.json({ success: true, skipped: 'unknown status', status });
    }
    // Idempotency: Twilio re-delivers webhooks. If the status is unchanged, ack
    // without re-running side effects — critically, without re-entering the
    // failed-retry branch and re-bumping retry_count via planFaxRetry.
    if (mappedStatus === faxLog.status) {
      return Response.json({ success: true, status: mappedStatus, deduped: true });
    }

    const updateData = {
      status: mappedStatus,
      pages: payload.numPages || faxLog.pages,
      failure_reason: null,
      next_retry_at: null,
    };

    let exhaustedNow = false;
    if (mappedStatus === 'failed') {
      // Use the SAME config-aware, permanent-failure-aware policy as
      // handleTwilioFaxWebhook (honors the admin FaxRetryConfig) instead of the
      // old fixed [5,15,60] schedule that ignored it and never gave up early.
      const cfgRows = await base44.asServiceRole.entities.FaxRetryConfig.list('-created_date', 1).catch(() => []);
      const plan = planFaxRetry({
        retryCount: faxLog.retry_count || 0,
        errorCode: payload.errorCode,
        errorMessage: payload.failureReason,
        priority: faxLog.priority || 'normal',
        config: cfgRows[0] || {},
      });
      if (plan.willRetry) {
        updateData.next_retry_at = plan.nextRetryAt;
        updateData.retry_count = plan.nextRetryCount;
      } else {
        // Retries exhausted — notify the sender ONCE and mark it notified, using
        // the SAME final_failure_notified convention as handleTwilioFaxWebhook /
        // autoRetryFailedFaxes (true = notified). The previous code set it to
        // `false` (pending) expecting an external sender that doesn't exist, so a
        // fax that died on this path never notified the sender at all. The shared
        // flag + the `!final_failure_notified` guard prevents a double-notify if
        // both fax handlers ever touch the same FaxLog.
        exhaustedNow = !faxLog.final_failure_notified;
        updateData.final_failure_notified = true;
      }

      updateData.failure_reason = payload.failureReason || 'Unknown error';
    }

    await base44.asServiceRole.entities.FaxLog.update(faxLog.id, updateData);

    // Tell the sender when a fax has permanently failed (no retries left).
    if (exhaustedNow && faxLog.sent_by) {
      const recipient = faxLog.to_name ? `${faxLog.to_name} (${faxLog.to_number})` : faxLog.to_number;
      await base44.asServiceRole.entities.Notification.create({
        user_email: faxLog.sent_by,
        title: '❌ Fax failed',
        message: `"${faxLog.document_name || 'Your document'}" to ${recipient} could not be delivered (${updateData.failure_reason}). Verify the number and resend.`,
        type: 'fax_failed',
        priority: 'high',
        related_entity: 'FaxLog',
        related_entity_id: faxLog.id,
        is_read: false,
        action_url: `/send-fax?fax_id=${faxLog.id}`,
      }).catch((err) => console.error('Failed to send fax failure notification:', err));
    }

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
    errorCode: body.ErrorCode || body.error_code || body.data?.payload?.error_code,
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
    errorCode: params['ErrorCode'],
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

  return statusMap[twilioStatus] || null;
}

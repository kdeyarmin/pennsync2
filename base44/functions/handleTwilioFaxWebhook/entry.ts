import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Twilio Fax Status Webhook Handler
 * Receives real-time fax status updates from Twilio and updates FaxLog records.
 */

// ---- fax retry policy (mirrors src/components/fax/faxRetry.js) ----
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
 * Verify Twilio's X-Twilio-Signature: base64(HMAC-SHA1(authToken, url + sorted
 * concatenated POST params)). Fails closed. If your deployment sits behind a
 * proxy that rewrites host/path, set TWILIO_WEBHOOK_URL to the exact URL Twilio
 * is configured to call. An optional TWILIO_WEBHOOK_SECRET + x-webhook-secret
 * header is supported for manual testing only.
 */
async function verifyTwilioSignature(req: Request, params: Record<string, string>, authToken: string | null, storedWebhookSecret: string | null = null): Promise<boolean> {
  const envSecret = Deno.env.get('TWILIO_WEBHOOK_SECRET');
  const headerSecret = req.headers.get('x-webhook-secret');
  if (headerSecret && ((envSecret && timingSafeEqual(headerSecret, envSecret)) || (storedWebhookSecret && timingSafeEqual(headerSecret, storedWebhookSecret)))) return true;

  const provided = req.headers.get('x-twilio-signature');
  if (!authToken || !provided) return false;

  const url = Deno.env.get('TWILIO_WEBHOOK_URL') || req.url;
  let data = url;
  for (const k of Object.keys(params).sort()) data += k + params[k];
  const expected = await hmacSha1Base64(authToken, data);
  return timingSafeEqual(provided.trim(), expected);
}

/**
 * Resolve Twilio credentials: prefer env vars, then the in-app IntegrationSecret
 * row with provider 'twilio'. Mirrors the SMS/voice handlers so fax webhooks work
 * for agencies that store credentials in-app rather than in the dashboard env.
 */
async function resolveTwilioCreds(base44: any): Promise<{ accountSid: string | null; authToken: string | null; storedWebhookSecret: string | null }> {
  const envSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const envToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  let sid = envSid && envSid.trim() ? envSid.trim() : null;
  let token = envToken && envToken.trim() ? envToken.trim() : null;
  let storedWebhookSecret: string | null = null;
  try {
    const rows = await base44.asServiceRole.entities.IntegrationSecret.filter({ provider: 'twilio' });
    const rec = rows?.[0] || {};
    if (!sid && rec.account_sid && String(rec.account_sid).trim()) sid = String(rec.account_sid).trim();
    if (!token && rec.auth_token && String(rec.auth_token).trim()) token = String(rec.auth_token).trim();
    if (rec.webhook_secret && String(rec.webhook_secret).trim()) storedWebhookSecret = String(rec.webhook_secret).trim();
  } catch { /* ignore */ }
  return { accountSid: sid, authToken: token, storedWebhookSecret };
}

Deno.serve(async (req) => {
  try {
    const formData = await req.formData();
    const params: Record<string, string> = {};
    for (const [k, v] of formData.entries()) params[k] = String(v);

    const base44 = createClientFromRequest(req);

    // Fail closed: only accept genuine Twilio-signed callbacks. Resolve the auth
    // token from env OR the in-app IntegrationSecret so agencies that store creds
    // in-app don't have every inbound fax webhook rejected 401.
    const { authToken, storedWebhookSecret } = await resolveTwilioCreds(base44);
    if (!(await verifyTwilioSignature(req, params, authToken, storedWebhookSecret))) {
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

    const faxLogs = await base44.asServiceRole.entities.FaxLog.filter({
      telnyx_fax_id: faxSid
    });

    if (faxLogs.length === 0) {
      return Response.json({ success: false, message: 'FaxLog not found' });
    }

    const faxLog = faxLogs[0];
    const mappedStatus = mapTwilioStatus(status);

    // Unknown Twilio status: ack without writing, rather than coercing to the
    // non-terminal 'sending' (which can mask a terminal state).
    if (!mappedStatus) {
      return Response.json({ success: true, skipped: 'unknown status', status });
    }

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

    let exhaustedNow = false;
    if (mappedStatus === 'failed') {
      const failureReason = `${errorCode || 'failed'}: ${errorMessage || 'Unknown error'}`;
      // Honor the admin's FaxRetryConfig; classify the failure so a PERMANENT
      // error (bad number, not a fax machine) gives up immediately instead of
      // wasting the whole backoff schedule.
      const cfgRows = await base44.asServiceRole.entities.FaxRetryConfig.list('-created_date', 1).catch(() => []);
      const plan = planFaxRetry({
        retryCount: faxLog.retry_count || 0,
        errorCode, errorMessage,
        priority: faxLog.priority || 'normal',
        config: cfgRows[0] || {},
      });
      if (plan.willRetry) {
        updateData.next_retry_at = plan.nextRetryAt;
        updateData.retry_count = plan.nextRetryCount;
      } else {
        // No more retries — leave it failed and notify the sender once.
        exhaustedNow = !faxLog.final_failure_notified;
        updateData.final_failure_notified = true;
      }
      updateData.failure_reason = failureReason;
    }

    await base44.asServiceRole.entities.FaxLog.update(faxLog.id, updateData);

    if (mappedStatus === 'delivered') {
      await sendStatusNotification(base44, faxLog, mappedStatus, updateData.pages).catch((err) => console.error('Failed to send status notification:', err));
    }

    // Tell the sender when a fax has permanently failed (no retries left), so it
    // doesn't fail silently — mirrors the SMS failed-delivery notification.
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
  return statusMap[twilioStatus] || null;
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

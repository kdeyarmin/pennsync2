import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * handleTwilioCallStatus — Twilio call-status webhook. Updates the CallLog
 * row (status + duration) and notifies the nurse on a missed inbound call.
 *
 * Twilio POSTs application/x-www-form-urlencoded with CallSid, CallStatus,
 * CallDuration, etc. The X-Twilio-Signature header is verified before any
 * application logic runs.
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

async function verifyTwilioSignature(req: Request, params: Record<string, string>, authToken: string | null, storedWebhookSecret: string | null = null): Promise<boolean> {
  // Manual-test shared-secret path: accept an x-webhook-secret header matching
  // EITHER the env TWILIO_WEBHOOK_SECRET or the in-app IntegrationSecret
  // webhook_secret (both are advertised as accepted by the status/test functions).
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
 * Resolve Twilio credentials: prefer env vars, then fall back to the
 * IntegrationSecret row saved by the super admin in-app.
 */
async function resolveTwilioCreds(base44: any): Promise<{ accountSid: string | null; authToken: string | null; storedWebhookSecret: string | null }> {
  const envSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const envToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  let sid = envSid && envSid.trim() ? envSid.trim() : null;
  let token = envToken && envToken.trim() ? envToken.trim() : null;
  let storedWebhookSecret: string | null = null;
  // Always read the stored row: even when credentials come from env, an in-app
  // webhook_secret may configure the x-webhook-secret manual-test path.
  try {
    const rows = await base44.asServiceRole.entities.IntegrationSecret.filter({ provider: 'twilio' });
    const rec = rows?.[0] || {};
    if (!sid && rec.account_sid && String(rec.account_sid).trim()) sid = String(rec.account_sid).trim();
    if (!token && rec.auth_token && String(rec.auth_token).trim()) token = String(rec.auth_token).trim();
    if (rec.webhook_secret && String(rec.webhook_secret).trim()) storedWebhookSecret = String(rec.webhook_secret).trim();
  } catch { /* ignore */ }
  return { accountSid: sid, authToken: token, storedWebhookSecret };
}

/**
 * Map Twilio's CallStatus values to the internal CallLog status vocabulary.
 * Returns '' for unknown statuses so the caller ignores them rather than
 * regressing a call to 'initiated'.
 */
function mapStatus(twilioStatus: string): string {
  const map: Record<string, string> = {
    queued: 'initiated',
    ringing: 'ringing',
    'in-progress': 'bridged',
    completed: 'completed',
    busy: 'no_answer',
    'no-answer': 'no_answer',
    failed: 'failed',
    canceled: 'failed',
  };
  return map[(twilioStatus || '').toLowerCase()] || '';
}

// Monotonic rank so out-of-order / duplicate status webhooks can't regress the
// call state and can't re-fire the missed-call notification.
const CALL_RANK: Record<string, number> = {
  initiated: 1, ringing: 2, bridged: 3, completed: 4, no_answer: 4, failed: 4,
};

Deno.serve(async (req) => {
  try {
    const formData = await req.formData();
    const params: Record<string, string> = {};
    for (const [k, v] of formData.entries()) params[k] = String(v);

    const base44 = createClientFromRequest(req);
    const { authToken, storedWebhookSecret } = await resolveTwilioCreds(base44);
    if (!(await verifyTwilioSignature(req, params, authToken, storedWebhookSecret))) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const providerCallId = params.CallSid;
    const statusRaw = params.CallStatus;
    const durationRaw = params.CallDuration;

    if (!providerCallId) {
      return Response.json({ success: false, message: 'Missing CallSid' });
    }

    const rows = await base44.asServiceRole.entities.CallLog.filter({ provider_call_id: providerCallId });
    if (rows.length === 0) {
      return Response.json({ success: false, message: 'CallLog not found' });
    }

    const row = rows[0];
    const mapped = mapStatus(statusRaw);
    const durationVal = durationRaw != null && durationRaw !== '' ? Number(durationRaw) : null;

    // Forward-only: ignore unknown and out-of-order/duplicate transitions (this
    // also prevents a retried webhook from re-sending the missed-call notification),
    // but still persist a duration update if one arrived.
    const forward = !!mapped && (CALL_RANK[mapped] || 0) > (CALL_RANK[row.status] || 0);
    if (!forward) {
      if (durationVal != null && durationVal !== row.duration_seconds) {
        await base44.asServiceRole.entities.CallLog.update(row.id, { duration_seconds: durationVal }).catch(() => {});
      }
      return Response.json({ success: true, ignored: true, status: row.status });
    }

    await base44.asServiceRole.entities.CallLog.update(row.id, {
      status: mapped,
      duration_seconds: durationVal != null ? durationVal : row.duration_seconds,
    });

    // Notify the nurse on a missed inbound call.
    if (row.direction === 'inbound' && row.call_mode === 'masked_bridge' && (mapped === 'no_answer' || mapped === 'failed') && row.nurse_email) {
      await base44.asServiceRole.entities.Notification.create({
        user_email: row.nurse_email,
        title: '📞 Missed call',
        message: `You missed a call from ${row.from_number}.`,
        type: 'call_missed',
        priority: 'high',
        related_entity: 'CallLog',
        related_entity_id: row.id,
        is_read: false,
      }).catch((err) => console.error('notification failed:', err));
    }

    await base44.asServiceRole.entities.UserActivity.create({
      user_email: row.nurse_email || 'system',
      action: 'call_status_updated',
      entity_type: 'CallLog',
      entity_id: row.id,
      details: { provider_call_id: providerCallId, old_status: row.status, new_status: mapped, duration_seconds: durationVal },
      status: mapped === 'failed' ? 'failure' : 'success',
    }).catch(() => {});

    return Response.json({ success: true, status: mapped });
  } catch (error) {
    console.error('handleTwilioCallStatus error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

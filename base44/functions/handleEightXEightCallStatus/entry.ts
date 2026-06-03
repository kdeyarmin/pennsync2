import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * handleEightXEightCallStatus — call-status / CDR webhook. Updates the CallLog
 * row (status + duration) and notifies the nurse on a missed inbound call.
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

function mapStatus(raw: string): string {
  const map: Record<string, string> = {
    INITIATED: 'initiated',
    RINGING: 'ringing',
    ANSWERED: 'bridged',
    BRIDGED: 'bridged',
    COMPLETED: 'completed',
    'NO-ANSWER': 'no_answer',
    NOANSWER: 'no_answer',
    BUSY: 'no_answer',
    FAILED: 'failed',
    CANCELLED: 'failed',
  };
  // Unknown statuses return '' so the caller ignores them rather than
  // regressing a call to 'initiated'.
  return map[(raw || '').toUpperCase()] || '';
}

// Monotonic rank so out-of-order / duplicate CDRs can't regress the call and
// can't re-fire the missed-call notification.
const CALL_RANK: Record<string, number> = {
  initiated: 1, ringing: 2, bridged: 3, completed: 4, no_answer: 4, failed: 4,
};

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
    const statusRaw = payload.status || payload.callStatus || payload.state;
    const duration = payload.duration ?? payload.callDuration ?? null;

    if (!providerCallId) {
      return Response.json({ success: false, message: 'Missing call id' });
    }

    const rows = await base44.asServiceRole.entities.CallLog.filter({ provider_call_id: providerCallId });
    if (rows.length === 0) {
      return Response.json({ success: false, message: 'CallLog not found' });
    }

    const row = rows[0];
    const mapped = mapStatus(statusRaw);
    const durationVal = duration != null ? Number(duration) : null;

    // Forward-only: ignore unknown and out-of-order/duplicate transitions (this
    // also prevents a retried CDR from re-sending the missed-call notification),
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
      details: { provider_call_id: providerCallId, old_status: row.status, new_status: mapped, duration_seconds: duration },
      status: mapped === 'failed' ? 'failure' : 'success',
    }).catch(() => {});

    return Response.json({ success: true, status: mapped });
  } catch (error) {
    console.error('handleEightXEightCallStatus error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

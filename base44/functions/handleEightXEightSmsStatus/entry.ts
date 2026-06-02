import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * handleEightXEightSmsStatus — delivery-receipt (DLR) webhook for outbound SMS.
 * Maps the 8x8 status onto the SmsMessage row identified by its provider id (umid).
 * Mirrors handleTwilioFaxWebhook.ts.
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

async function verifyWebhook(req: Request, raw: string): Promise<boolean> {
  const secret = Deno.env.get('EIGHT_X_EIGHT_WEBHOOK_SECRET');
  if (!secret) {
    console.error('EIGHT_X_EIGHT_WEBHOOK_SECRET not configured — rejecting webhook');
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
    QUEUED: 'queued',
    SENT: 'sent',
    DELIVERED: 'delivered',
    UNDELIVERED: 'failed',
    FAILED: 'failed',
    REJECTED: 'failed',
    EXPIRED: 'failed',
  };
  // Unknown statuses return '' so the caller can ignore them instead of
  // silently regressing a message to 'sent'.
  return map[(raw || '').toUpperCase()] || '';
}

// Monotonic rank so a late/out-of-order DLR can't downgrade a terminal state
// (e.g. a stale QUEUED arriving after DELIVERED).
const SMS_RANK: Record<string, number> = { queued: 1, sent: 2, delivered: 3, failed: 3 };

Deno.serve(async (req) => {
  try {
    const raw = await req.text();
    if (!(await verifyWebhook(req, raw))) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    const payload = JSON.parse(raw || '{}');
    const umid = payload.umid || payload.messageId || payload.id;
    const statusRaw = payload.status?.code || payload.status || payload.dlrStatus;
    const errorDescription = payload.status?.description || payload.errorDescription || null;

    if (!umid) {
      return Response.json({ success: false, message: 'Missing message id' });
    }

    const base44 = createClientFromRequest(req);
    const rows = await base44.asServiceRole.entities.SmsMessage.filter({ provider_message_id: umid });
    if (rows.length === 0) {
      return Response.json({ success: false, message: 'SmsMessage not found' });
    }

    const row = rows[0];
    const mapped = mapStatus(statusRaw);
    // Ignore unknown statuses and non-forward transitions (out-of-order DLRs).
    if (!mapped || (SMS_RANK[mapped] || 0) <= (SMS_RANK[row.status] || 0)) {
      return Response.json({ success: true, ignored: true, status: row.status });
    }
    await base44.asServiceRole.entities.SmsMessage.update(row.id, {
      status: mapped,
      failure_reason: mapped === 'failed' ? (errorDescription || 'Delivery failed') : null,
    });

    if (row.sent_by) {
      await base44.asServiceRole.entities.UserActivity.create({
        user_email: row.sent_by,
        action: 'sms_status_updated',
        entity_type: 'SmsMessage',
        entity_id: row.id,
        details: {
          provider_message_id: umid,
          old_status: row.status,
          new_status: mapped,
          to_number: row.to_number,
          error: mapped === 'failed' ? errorDescription : null,
        },
        status: mapped === 'failed' ? 'failure' : 'success',
      }).catch((err) => console.error('Failed to log activity:', err));
    }

    return Response.json({ success: true, status: mapped });
  } catch (error) {
    console.error('handleEightXEightSmsStatus error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * saveEightXEightSecret — super-admin-only. Stores the SINGLE 8x8 Connect API
 * secret (bearer token) used for SMS and Voice, so the integration can be
 * configured entirely in-app without touching the Base44 dashboard env.
 *
 * The secret is written to the backend-only IntegrationSecret entity via the
 * service role and is NEVER returned to the client — the response only ever
 * carries presence + the last 4 characters so the UI can confirm what is set.
 *
 * A dedicated webhook signing secret is optional: when omitted, inbound webhook
 * verification falls back to the api_secret, so one secret fully configures 8x8.
 *
 * Body: { api_secret: string, webhook_secret?: string|null }
 *   - webhook_secret undefined → leave the existing value unchanged
 *   - webhook_secret "" / null → clear it (fall back to api_secret)
 */

const SUPER_ADMIN_EMAIL = 'kdeyarmin@comcast.net';

const sameEmail = (a: unknown, b: unknown) =>
  String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

const lastFour = (s: string) => (s.length <= 4 ? s : s.slice(-4));

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const isSuperAdmin = sameEmail(user.email, SUPER_ADMIN_EMAIL) || user.account_type === 'super_admin';
    if (!isSuperAdmin) {
      return Response.json({ error: 'Only the super administrator can manage integration secrets.' }, { status: 403 });
    }

    const body = await req.json().catch(() => ({}));
    const apiSecret = typeof body.api_secret === 'string' ? body.api_secret.trim() : '';
    if (!apiSecret) {
      return Response.json({ error: 'api_secret is required.' }, { status: 400 });
    }
    if (apiSecret.length < 8) {
      return Response.json({ error: "That doesn't look like a valid 8x8 API secret (too short)." }, { status: 400 });
    }

    const update: Record<string, unknown> = {
      provider: 'eight_x_eight',
      api_secret: apiSecret,
      secret_last_four: lastFour(apiSecret),
      is_active: true,
      updated_by_email: user.email,
    };
    // Only touch webhook_secret when the caller explicitly sent the field.
    if ('webhook_secret' in body) {
      const ws = body.webhook_secret == null ? '' : String(body.webhook_secret).trim();
      update.webhook_secret = ws;
    }

    const existing = await base44.asServiceRole.entities.IntegrationSecret
      .filter({ provider: 'eight_x_eight' })
      .catch(() => []);

    let saved;
    if (existing[0]?.id) {
      saved = await base44.asServiceRole.entities.IntegrationSecret.update(existing[0].id, update);
    } else {
      saved = await base44.asServiceRole.entities.IntegrationSecret.create(update);
    }

    await base44.asServiceRole.entities.SecurityLog.create({
      timestamp: new Date().toISOString(),
      user_email: user.email,
      user_role: user.role,
      action: 'eight_x_eight_secret_saved',
      details: {
        secret_last_four: lastFour(apiSecret),
        webhook_secret_set: 'webhook_secret' in body ? Boolean(update.webhook_secret) : undefined,
      },
    }).catch(() => {});

    // Never echo the secret back.
    return Response.json({
      success: true,
      provider: 'eight_x_eight',
      configured: true,
      secret_last_four: lastFour(apiSecret),
      webhook_secret_set: Boolean(saved?.webhook_secret),
      updated_by_email: user.email,
    });
  } catch (error) {
    console.error('saveEightXEightSecret error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});

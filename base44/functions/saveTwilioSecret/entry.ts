import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * saveTwilioSecret — super-admin-only. Stores the Twilio Account SID and Auth
 * Token used for SMS and Voice, so the integration can be configured entirely
 * in-app without touching the Base44 dashboard env.
 *
 * Both values are written to the backend-only IntegrationSecret entity via the
 * service role and are NEVER returned to the client — the response only ever
 * carries presence + the last 4 characters so the UI can confirm what is set.
 *
 * A dedicated webhook signing secret is optional: Twilio normally verifies
 * inbound webhooks with the Auth Token, so this field is only needed for a
 * custom shared-secret test path.
 *
 * Body: { account_sid: string, auth_token: string, webhook_secret?: string|null }
 *   - webhook_secret undefined → leave the existing value unchanged
 *   - webhook_secret "" / null → clear it (fall back to auth_token verification)
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
    const accountSid = typeof body.account_sid === 'string' ? body.account_sid.trim() : '';
    const authToken = typeof body.auth_token === 'string' ? body.auth_token.trim() : '';

    if (!accountSid) {
      return Response.json({ error: 'account_sid is required.' }, { status: 400 });
    }
    if (!accountSid.startsWith('AC') || accountSid.length < 10) {
      return Response.json({ error: "That doesn't look like a valid Twilio Account SID (must start with \"AC\" and be at least 10 characters)." }, { status: 400 });
    }
    if (!authToken) {
      return Response.json({ error: 'auth_token is required.' }, { status: 400 });
    }
    if (authToken.length < 16) {
      return Response.json({ error: "That doesn't look like a valid Twilio Auth Token (too short — must be at least 16 characters)." }, { status: 400 });
    }

    const update: Record<string, unknown> = {
      provider: 'twilio',
      account_sid: accountSid,
      auth_token: authToken,
      secret_last_four: lastFour(authToken),
      is_active: true,
      updated_by_email: user.email,
    };
    // Only touch webhook_secret when the caller explicitly sent the field.
    if ('webhook_secret' in body) {
      const ws = body.webhook_secret == null ? '' : String(body.webhook_secret).trim();
      update.webhook_secret = ws;
    }

    const existing = await base44.asServiceRole.entities.IntegrationSecret
      .filter({ provider: 'twilio' })
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
      action: 'twilio_secret_saved',
      details: {
        account_sid_last_four: lastFour(accountSid),
        secret_last_four: lastFour(authToken),
        webhook_secret_set: 'webhook_secret' in body ? Boolean(update.webhook_secret) : undefined,
      },
    }).catch(() => {});

    // Never echo the secrets back.
    return Response.json({
      success: true,
      provider: 'twilio',
      configured: true,
      account_sid_last_four: lastFour(accountSid),
      secret_last_four: lastFour(authToken),
      webhook_secret_set: Boolean(saved?.webhook_secret),
      updated_by_email: user.email,
    });
  } catch (error) {
    console.error('saveTwilioSecret error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});

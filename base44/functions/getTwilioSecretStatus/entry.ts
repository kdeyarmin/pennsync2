import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * getTwilioSecretStatus — admin/super-admin read of whether the Twilio
 * Account SID + Auth Token are configured, and HOW (in-app config vs. dashboard
 * env), without ever returning the secret values. Powers the Administration ->
 * Super Admin page so it can show "Configured ••••1234" and pick the right
 * call-to-action.
 *
 * Returns: {
 *   configured, source: 'config'|'env'|'none',
 *   account_sid_last_four, secret_last_four,
 *   webhook_secret_configured, webhook_source,
 *   updated_by_email, updated_at
 * }
 */

const SUPER_ADMIN_EMAIL = 'kdeyarmin@comcast.net';

const sameEmail = (a: unknown, b: unknown) =>
  String(a || '').trim().toLowerCase() === String(b || '').trim().toLowerCase();

const isSet = (v: unknown) => typeof v === 'string' && v.trim() !== '';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin =
      user.role === 'admin' ||
      user.account_type === 'super_admin' ||
      sameEmail(user.email, SUPER_ADMIN_EMAIL);
    if (!isAdmin) {
      return Response.json({ error: 'Administrator access required.' }, { status: 403 });
    }

    const envSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const envToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const envWebhook = Deno.env.get('TWILIO_WEBHOOK_SECRET');

    const rows = await base44.asServiceRole.entities.IntegrationSecret
      .filter({ provider: 'twilio' })
      .catch(() => []);
    const rec = rows[0] || {};

    const storedSid = isSet(rec.account_sid);
    const storedToken = isSet(rec.auth_token);
    const storedWebhook = isSet(rec.webhook_secret);

    // Both an account_sid and an auth_token must be resolvable for "configured".
    // Env takes precedence per the credentials resolver; a mix of env+stored still
    // counts as configured but source is reported as 'config' (not pure 'env').
    const resolvedSid = (isSet(envSid) ? envSid : storedSid ? rec.account_sid : null) as string | null;
    const resolvedToken = (isSet(envToken) ? envToken : storedToken ? rec.auth_token : null) as string | null;
    const configured = Boolean(resolvedSid && resolvedToken);

    let source: 'env' | 'config' | 'none';
    if (!configured) {
      source = 'none';
    } else if (isSet(envSid) && isSet(envToken)) {
      source = 'env';
    } else {
      // At least one value came from stored config.
      source = 'config';
    }

    // Twilio signs webhooks with the Auth Token, so any resolvable auth token
    // means webhooks can be verified. A dedicated TWILIO_WEBHOOK_SECRET or
    // stored webhook_secret is checked first (highest specificity), but the
    // auth token itself is a valid fallback per Twilio's standard scheme.
    const webhookSecretConfigured = isSet(envWebhook) || storedWebhook || Boolean(resolvedToken);
    const webhookSource = isSet(envWebhook)
      ? 'env'
      : storedWebhook
        ? 'config'
        : resolvedToken
          ? 'auth_token_fallback'
          : 'none';

    return Response.json({
      success: true,
      provider: 'twilio',
      configured,
      source,
      // Only expose last-4 of stored values (never env values, which are controlled
      // outside the app). Account SID is an identifier not a secret, but we treat
      // it consistently.
      account_sid_last_four: source === 'config' && resolvedSid ? resolvedSid.slice(-4) : null,
      secret_last_four: source === 'config' ? rec.secret_last_four || null : null,
      webhook_secret_configured: webhookSecretConfigured,
      webhook_source: webhookSource,
      updated_by_email: rec.updated_by_email || null,
      updated_at: source === 'config' ? rec.updated_date || null : null,
    });
  } catch (error) {
    console.error('getTwilioSecretStatus error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});

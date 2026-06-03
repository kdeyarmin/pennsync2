import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * getEightXEightSecretStatus — admin/super-admin read of whether the single 8x8
 * API secret is configured, and HOW (in-app config vs. dashboard env), without
 * ever returning the secret value. Powers the Super Admin -> Integrations page so
 * it can show "Configured ••••1234" and pick the right call-to-action.
 *
 * Returns: {
 *   configured, source: 'config'|'env'|'none',
 *   secret_last_four, webhook_secret_configured, webhook_source, updated_by_email
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

    const envApiKey = Deno.env.get('EIGHT_X_EIGHT_API_KEY');
    const envWebhook = Deno.env.get('EIGHT_X_EIGHT_WEBHOOK_SECRET');

    const rows = await base44.asServiceRole.entities.IntegrationSecret
      .filter({ provider: 'eight_x_eight' })
      .catch(() => []);
    const rec = rows[0] || {};

    const storedApi = isSet(rec.api_secret);
    const storedWebhook = isSet(rec.webhook_secret);

    // env takes precedence in the resolvers, so report it as the active source.
    const apiSource = isSet(envApiKey) ? 'env' : storedApi ? 'config' : 'none';
    const webhookConfigured = isSet(envWebhook) || storedWebhook || storedApi || isSet(envApiKey);
    const webhookSource = isSet(envWebhook)
      ? 'env'
      : storedWebhook
        ? 'config'
        : storedApi || isSet(envApiKey)
          ? 'api_secret_fallback'
          : 'none';

    return Response.json({
      success: true,
      provider: 'eight_x_eight',
      configured: apiSource !== 'none',
      source: apiSource,
      secret_last_four: apiSource === 'config' ? rec.secret_last_four || null : null,
      webhook_secret_configured: webhookConfigured,
      webhook_source: webhookSource,
      updated_by_email: rec.updated_by_email || null,
    });
  } catch (error) {
    console.error('getEightXEightSecretStatus error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});

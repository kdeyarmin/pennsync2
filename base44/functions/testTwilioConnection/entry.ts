import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * testTwilioConnection — admin-only setup diagnostic for the Twilio phone
 * integration. Returns a structured readiness report so an admin can verify the
 * integration is wired up correctly without sending a real text or call:
 *
 *  - Twilio credentials present (TWILIO_ACCOUNT_SID + TWILIO_AUTH_TOKEN, or
 *    in-app config) — presence only; the values are NEVER returned.
 *  - a live, read-only probe of the Twilio REST API that confirms the credentials
 *    authenticate and the account is reachable.
 *  - nurse provisioning stats (how many have a work number + masked-bridge cell).
 *
 * Returns { checks: [{ id, label, status: 'ok'|'warn'|'fail', detail }], stats,
 * generated_at }. It never sends a message, places a call, or returns any secret.
 */

const isBlank = (v: unknown) => v == null || String(v).trim() === '';

const isSet = (v: unknown) => typeof v === 'string' && v.trim() !== '';

const PROBE_TIMEOUT_MS = 8000;

/**
 * Resolve Twilio credentials: env vars take precedence over in-app config.
 */
async function resolveTwilioCreds(base44: any): Promise<{ accountSid: string | null; authToken: string | null }> {
  const envSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const envToken = Deno.env.get('TWILIO_AUTH_TOKEN');
  let sid = envSid && envSid.trim() ? envSid.trim() : null;
  let token = envToken && envToken.trim() ? envToken.trim() : null;
  if (!sid || !token) {
    try {
      const rows = await base44.asServiceRole.entities.IntegrationSecret.filter({ provider: 'twilio' });
      const rec = rows?.[0] || {};
      if (!sid && rec.account_sid && String(rec.account_sid).trim()) sid = String(rec.account_sid).trim();
      if (!token && rec.auth_token && String(rec.auth_token).trim()) token = String(rec.auth_token).trim();
    } catch { /* ignore */ }
  }
  return { accountSid: sid, authToken: token };
}

/**
 * Read-only probe of the Twilio Accounts API, bounded by an AbortController
 * timeout so a slow/blackholed host can't hang the diagnostic.
 *   - network error / timeout → host unreachable or no egress (fail)
 *   - 401 / 403               → credentials rejected — definitive (fail)
 *   - 200                     → authenticated and reachable (ok)
 *   - other                   → reached Twilio but unexpected response (warn)
 */
async function probeTwilioApi(accountSid: string, authToken: string) {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}.json`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const resp = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Accept': 'application/json',
      },
      signal: controller.signal,
    });
    const latencyMs = Date.now() - startedAt;
    await resp.text().catch(() => '');
    if (resp.status === 401 || resp.status === 403) {
      return {
        status: 'fail',
        detail: `Twilio rejected the credentials (HTTP ${resp.status}). Check the Account SID and Auth Token.`,
        httpStatus: resp.status,
        latencyMs,
      };
    }
    if (resp.ok) {
      return { status: 'ok', detail: `Authenticated and reachable (HTTP ${resp.status}, ${latencyMs} ms).`, httpStatus: resp.status, latencyMs };
    }
    return {
      status: 'warn',
      detail: `Reached Twilio but received an unexpected response (HTTP ${resp.status}). Credentials were not rejected — send a test text to verify end to end.`,
      httpStatus: resp.status,
      latencyMs,
    };
  } catch (err) {
    const aborted = (err as Error)?.name === 'AbortError';
    return {
      status: 'fail',
      detail: aborted
        ? `Timed out after ${PROBE_TIMEOUT_MS} ms reaching api.twilio.com. Check that the function has network egress.`
        : `Could not reach api.twilio.com — verify network egress. (${(err as Error).message})`,
      httpStatus: null,
      latencyMs: Date.now() - startedAt,
    };
  } finally {
    clearTimeout(timer);
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const isAdmin =
      user.role === 'admin' ||
      user.account_type === 'super_admin' ||
      String(user.email || '').trim().toLowerCase() === 'kdeyarmin@comcast.net';
    if (!isAdmin) {
      return Response.json({ error: 'Only administrators can test the Twilio connection' }, { status: 403 });
    }

    const { accountSid, authToken } = await resolveTwilioCreds(base44);

    // Webhook verification: live Twilio webhooks are signed with the Auth Token
    // (X-Twilio-Signature) — Twilio never sends an x-webhook-secret header, so a
    // shared secret alone does NOT make real webhooks pass; it only covers the
    // manual x-webhook-secret test path. Tie readiness to the Auth Token.
    const envWebhookSecret = Deno.env.get('TWILIO_WEBHOOK_SECRET');
    let storedWebhookSecret = '';
    try {
      const rows = await base44.asServiceRole.entities.IntegrationSecret.filter({ provider: 'twilio' });
      storedWebhookSecret = rows?.[0]?.webhook_secret || '';
    } catch { /* ignore */ }
    const hasSharedSecret = isSet(envWebhookSecret) || isSet(storedWebhookSecret);
    const webhookOk = Boolean(authToken);

    const checks: Array<{ id: string; label: string; status: string; detail: string }> = [];

    // --- Twilio credentials (presence only — never echo the values) ---
    checks.push({
      id: 'twilio_credentials',
      label: 'Twilio credentials',
      status: (accountSid && authToken) ? 'ok' : 'fail',
      detail: (accountSid && authToken)
        ? 'Twilio Account SID and Auth Token are configured.'
        : !accountSid && !authToken
          ? 'No Twilio credentials found. Add them on the Administration → Super Admin page, or set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in the Base44 dashboard.'
          : !accountSid
            ? 'Twilio Account SID is missing. Set TWILIO_ACCOUNT_SID or configure it in-app.'
            : 'Twilio Auth Token is missing. Set TWILIO_AUTH_TOKEN or configure it in-app.',
    });

    // --- Webhook signature verification ---
    // Live Twilio webhooks are verified with the Auth Token via X-Twilio-Signature.
    // A shared secret only covers the manual x-webhook-secret test path, so it can
    // never make real inbound webhooks pass on its own.
    checks.push({
      id: 'webhook_secret',
      label: 'Webhook signature verification',
      status: webhookOk ? 'ok' : 'fail',
      detail: webhookOk
        ? `Inbound Twilio webhooks are verified with the Auth Token via X-Twilio-Signature.${hasSharedSecret ? ' A custom shared-secret (x-webhook-secret) test path is also configured.' : ''}`
        : `No Auth Token — live Twilio webhooks (signed with X-Twilio-Signature) will be rejected fail-closed.${hasSharedSecret ? ' (The configured shared secret only covers manual x-webhook-secret test requests, not live Twilio traffic.)' : ''}`,
    });

    // --- Live Twilio API probe ---
    if (!accountSid || !authToken) {
      checks.push({ id: 'twilio_api_live', label: 'Live Twilio API', status: 'fail', detail: 'Skipped — Twilio credentials not configured.' });
    } else {
      const probe = await probeTwilioApi(accountSid, authToken);
      checks.push({ id: 'twilio_api_live', label: 'Live Twilio API', status: probe.status, detail: probe.detail });
    }

    // --- Nurse provisioning stats ---
    const users = await base44.asServiceRole.entities.User.list('full_name', 1000).catch(() => []);
    const withWork = users.filter((u: any) => !isBlank(u.work_phone_number));
    const withWorkButNoCell = withWork.filter((u: any) => isBlank(u.personal_cell_e164));
    const stats = {
      total_users: users.length,
      nurses_with_work_number: withWork.length,
      nurses_missing_bridge_cell: withWorkButNoCell.length,
    };
    if (withWork.length === 0) {
      checks.push({ id: 'provisioning', label: 'Nurse work numbers', status: 'warn', detail: 'No nurses have a work number yet — provision at least one below.' });
    } else if (withWorkButNoCell.length > 0) {
      checks.push({
        id: 'provisioning',
        label: 'Nurse work numbers',
        status: 'warn',
        detail: `${withWork.length} nurse(s) provisioned, but ${withWorkButNoCell.length} have no personal cell on file, so masked calling won't bridge for them.`,
      });
    } else {
      checks.push({ id: 'provisioning', label: 'Nurse work numbers', status: 'ok', detail: `${withWork.length} nurse(s) fully provisioned (work number + masked-bridge cell).` });
    }

    return Response.json({
      success: true,
      checks,
      stats,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('testTwilioConnection error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});

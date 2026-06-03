import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * testEightXEightConnection — admin-only setup diagnostic for the 8x8 phone
 * integration. Returns a structured readiness report so an admin can verify the
 * integration is wired up correctly without sending a real text or call:
 *
 *  - backend secrets present (EIGHT_X_EIGHT_API_KEY / EIGHT_X_EIGHT_WEBHOOK_SECRET) —
 *    presence only; the values are NEVER returned.
 *  - a live, read-only probe of the 8x8 SMS API that confirms the API key
 *    authenticates and the region/sub-account host is reachable.
 *  - nurse provisioning stats (how many have a work number + masked-bridge cell).
 *
 * Returns { checks: [{ id, label, status: 'ok'|'warn'|'fail', detail }], stats,
 * generated_at }. It never sends a message, places a call, or returns any secret.
 */

const isBlank = (v: unknown) => v == null || String(v).trim() === '';

async function getSettings(base44: any) {
  const rows = await base44.asServiceRole.entities.AgencySettings.list('-created_date', 1).catch(() => []);
  return rows[0] || {};
}

/** The single 8x8 secret saved in-app, if any (never returned to the client). */
async function getStoredSecret(base44: any) {
  const rows = await base44.asServiceRole.entities.IntegrationSecret
    .filter({ provider: 'eight_x_eight' }).catch(() => []);
  return rows[0] || {};
}

const isSet = (v: unknown) => typeof v === 'string' && v.trim() !== '';

const PROBE_TIMEOUT_MS = 8000;

/**
 * Read-only probe of the SMS sub-account, bounded by an AbortController timeout
 * so a slow/blackholed host can't hang the diagnostic. We interpret the HTTP
 * outcome conservatively — the 8x8 send endpoint is POST-only, so a GET may
 * legitimately return 404/405 on a correctly configured account. We therefore
 * only treat an explicit auth rejection as proof the key is bad, and never
 * over-claim "authenticated" for a non-2xx response:
 *   - network error / timeout → host/region wrong, or no egress (fail)
 *   - 401 / 403               → the API key is rejected — definitive (fail)
 *   - 2xx                     → authenticated and reachable (ok)
 *   - other (404/405/400/5xx) → 8x8 was reached and did NOT reject the key, but
 *                               this read-only probe can't fully confirm it;
 *                               a real test text is the definitive check (warn)
 */
async function probeSmsApi(apiKey: string, host: string, smsSubAccountId: string) {
  const url = `https://${host}/api/v1/subaccounts/${encodeURIComponent(smsSubAccountId)}/messages?pageSize=1`;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  const startedAt = Date.now();
  try {
    const resp = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' },
      signal: controller.signal,
    });
    const latencyMs = Date.now() - startedAt;
    // Drain the body so the connection can be reused / closed cleanly.
    await resp.text().catch(() => '');
    if (resp.status === 401 || resp.status === 403) {
      return {
        status: 'fail',
        detail: `8x8 rejected the API key (HTTP ${resp.status}). Check EIGHT_X_EIGHT_API_KEY and that it's authorized for this SMS sub-account.`,
        httpStatus: resp.status,
        latencyMs,
      };
    }
    if (resp.ok) {
      return { status: 'ok', detail: `Authenticated and reachable (HTTP ${resp.status}, ${latencyMs} ms).`, httpStatus: resp.status, latencyMs };
    }
    return {
      status: 'warn',
      detail: `Reached 8x8 and the API key was not rejected (HTTP ${resp.status}), but this read-only probe can't fully confirm the SMS sub-account — the send endpoint is POST-only. Send a test text to verify end to end.`,
      httpStatus: resp.status,
      latencyMs,
    };
  } catch (err) {
    const aborted = (err as Error)?.name === 'AbortError';
    return {
      status: 'fail',
      detail: aborted
        ? `Timed out after ${PROBE_TIMEOUT_MS} ms reaching https://${host}. Check the 8x8 region and that the function has network egress.`
        : `Could not reach https://${host} — verify the 8x8 region. (${(err as Error).message})`,
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
      return Response.json({ error: 'Only administrators can test the 8x8 connection' }, { status: 403 });
    }

    const stored = await getStoredSecret(base44);
    const envApiKey = Deno.env.get('EIGHT_X_EIGHT_API_KEY');
    const envWebhookSecret = Deno.env.get('EIGHT_X_EIGHT_WEBHOOK_SECRET');
    // Single-secret model: the API key (and webhook secret fallback) can come
    // from the dashboard env OR the in-app super-admin config.
    const apiKey = isSet(envApiKey) ? envApiKey : (isSet(stored.api_secret) ? stored.api_secret : '');
    const apiKeySource = isSet(envApiKey) ? 'dashboard env' : isSet(stored.api_secret) ? 'in-app config' : null;
    const webhookSecret = isSet(envWebhookSecret)
      ? envWebhookSecret
      : isSet(stored.webhook_secret)
        ? stored.webhook_secret
        : (isSet(stored.api_secret) ? stored.api_secret : '');
    const settings = await getSettings(base44);
    const region = (settings.eight_x_eight_region && String(settings.eight_x_eight_region).trim()) || 'us';
    const smsSubAccountId = settings.eight_x_eight_sms_subaccount_id;
    const host = `sms.${region}.8x8.com`;

    const checks: Array<{ id: string; label: string; status: string; detail: string }> = [];

    // --- Backend secrets (presence only — never echo the value) ---
    checks.push({
      id: 'api_key_secret',
      label: '8x8 API secret',
      status: apiKey ? 'ok' : 'fail',
      detail: apiKey
        ? `The single 8x8 API secret is configured (${apiKeySource}).`
        : 'No 8x8 API secret found. Add it on the Super Admin → Integrations page, or set EIGHT_X_EIGHT_API_KEY in the Base44 dashboard.',
    });
    checks.push({
      id: 'webhook_secret',
      label: 'Webhook signing secret',
      status: webhookSecret ? 'ok' : 'fail',
      detail: webhookSecret
        ? 'A webhook signing secret is set; inbound webhooks can be verified.'
        : 'No webhook signing secret. Inbound calls and texts will be rejected (fail-closed) until the 8x8 API secret (or a dedicated webhook secret) is configured.',
    });

    // --- Live SMS API probe (only when we have what we need) ---
    if (!apiKey) {
      checks.push({ id: 'sms_api_live', label: 'Live 8x8 SMS API', status: 'fail', detail: 'Skipped — no API key secret configured.' });
    } else if (isBlank(smsSubAccountId)) {
      checks.push({ id: 'sms_api_live', label: 'Live 8x8 SMS API', status: 'fail', detail: 'Skipped — no SMS sub-account ID configured in agency settings.' });
    } else {
      const probe = await probeSmsApi(apiKey, host, String(smsSubAccountId));
      checks.push({ id: 'sms_api_live', label: 'Live 8x8 SMS API', status: probe.status, detail: probe.detail });
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
      region,
      sms_host: host,
      generated_at: new Date().toISOString(),
    });
  } catch (error) {
    console.error('testEightXEightConnection error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});

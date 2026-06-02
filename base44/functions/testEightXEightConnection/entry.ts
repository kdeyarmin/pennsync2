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

/**
 * Read-only probe: list a single message on the SMS sub-account. We don't care
 * about the body — only what the HTTP outcome tells us:
 *   - network error      → host/region wrong, or the function has no egress (fail)
 *   - 401 / 403          → the API key is wrong or not authorized here (fail)
 *   - 2xx                → authenticated and reachable (ok)
 *   - other (404/400/5xx)→ reachable + authenticated, but verify the sub-account id (warn)
 */
async function probeSmsApi(apiKey: string, host: string, smsSubAccountId: string) {
  const url = `https://${host}/api/v1/subaccounts/${encodeURIComponent(smsSubAccountId)}/messages?pageSize=1`;
  const startedAt = Date.now();
  try {
    const resp = await fetch(url, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${apiKey}`, 'Accept': 'application/json' },
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
      detail: `Reached and authenticated, but the probe returned HTTP ${resp.status}. Double-check the SMS sub-account ID and region.`,
      httpStatus: resp.status,
      latencyMs,
    };
  } catch (err) {
    return {
      status: 'fail',
      detail: `Could not reach https://${host} — verify the 8x8 region. (${(err as Error).message})`,
      httpStatus: null,
      latencyMs: Date.now() - startedAt,
    };
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') {
      return Response.json({ error: 'Only administrators can test the 8x8 connection' }, { status: 403 });
    }

    const apiKey = Deno.env.get('EIGHT_X_EIGHT_API_KEY');
    const webhookSecret = Deno.env.get('EIGHT_X_EIGHT_WEBHOOK_SECRET');
    const settings = await getSettings(base44);
    const region = (settings.eight_x_eight_region && String(settings.eight_x_eight_region).trim()) || 'us';
    const smsSubAccountId = settings.eight_x_eight_sms_subaccount_id;
    const host = `sms.${region}.8x8.com`;

    const checks: Array<{ id: string; label: string; status: string; detail: string }> = [];

    // --- Backend secrets (presence only — never echo the value) ---
    checks.push({
      id: 'api_key_secret',
      label: '8x8 API key secret',
      status: apiKey ? 'ok' : 'fail',
      detail: apiKey
        ? 'EIGHT_X_EIGHT_API_KEY is set as a backend secret.'
        : 'EIGHT_X_EIGHT_API_KEY is missing. Set it as a backend secret in the Base44 dashboard.',
    });
    checks.push({
      id: 'webhook_secret',
      label: 'Webhook signing secret',
      status: webhookSecret ? 'ok' : 'fail',
      detail: webhookSecret
        ? 'EIGHT_X_EIGHT_WEBHOOK_SECRET is set; inbound webhooks can be verified.'
        : 'EIGHT_X_EIGHT_WEBHOOK_SECRET is missing. Inbound calls and texts will be rejected (fail-closed) until it is set.',
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

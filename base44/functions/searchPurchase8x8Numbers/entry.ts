import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * searchPurchase8x8Numbers — admin-only. Search 8x8 for available virtual
 * numbers and purchase one straight into the local pool (PhoneNumber), so an
 * admin never has to leave the app to provision a line.
 *
 * IMPORTANT: 8x8's number search/order REST shapes are account- and
 * product-dependent. The endpoints/bodies below follow the common 8x8 Connect
 * numbers pattern but MUST be validated against your account; the base path is
 * configurable via AgencySettings.eight_x_eight_numbers_api_base (falls back to
 * the voice API base). Failures are returned verbatim so you can adjust. No
 * number is added to the pool unless the purchase call succeeds.
 *
 * Body: { action: 'search'|'purchase', ... }
 *   - search   { area_code?, country?, limit? }
 *   - purchase { e164, label? }
 */

const REQUEST_TIMEOUT_MS = 15000;

function normalizeE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/[^\d]/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (String(raw).trim().startsWith('+') && digits.length >= 8) return `+${digits}`;
  return null;
}

async function resolveEightXEightApiKey(base44: any): Promise<string | null> {
  const env = Deno.env.get('EIGHT_X_EIGHT_API_KEY');
  if (env && env.trim()) return env.trim();
  try {
    const rows = await base44.asServiceRole.entities.IntegrationSecret.filter({ provider: 'eight_x_eight' });
    const v = rows?.[0]?.api_secret;
    return v && String(v).trim() ? String(v).trim() : null;
  } catch {
    return null;
  }
}

async function fetchJson(url: string, init: RequestInit) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const resp = await fetch(url, { ...init, signal: controller.signal });
    const data = await resp.json().catch(() => ({}));
    return { ok: resp.ok, status: resp.status, data };
  } finally {
    clearTimeout(timer);
  }
}

/** Pull a list of candidate numbers out of a few common 8x8 response shapes. */
function extractNumbers(data: any): Array<{ e164: string | null; raw: any }> {
  const list = Array.isArray(data) ? data
    : Array.isArray(data?.numbers) ? data.numbers
    : Array.isArray(data?.availableNumbers) ? data.availableNumbers
    : Array.isArray(data?.items) ? data.items
    : Array.isArray(data?.data) ? data.data
    : [];
  return list.map((n: any) => {
    const candidate = typeof n === 'string' ? n : (n.number || n.msisdn || n.phoneNumber || n.e164 || n.did);
    return { e164: normalizeE164(candidate), raw: n };
  });
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const isAdmin =
      user.role === 'admin' ||
      user.account_type === 'super_admin' ||
      user.account_type === 'agency_admin' ||
      String(user.email || '').trim().toLowerCase() === 'kdeyarmin@comcast.net';
    if (!isAdmin) return Response.json({ error: 'Only administrators can manage numbers.' }, { status: 403 });

    const body = await req.json().catch(() => ({}));
    const action = String(body.action || '');

    const apiKey = await resolveEightXEightApiKey(base44);
    const settingsRows = await base44.asServiceRole.entities.AgencySettings.list('-created_date', 1).catch(() => []);
    const s = settingsRows[0] || {};
    const subAccountId = s.eight_x_eight_voice_subaccount_id || s.eight_x_eight_sms_subaccount_id;
    const apiBase = (s.eight_x_eight_numbers_api_base || s.eight_x_eight_voice_api_base || '').replace(/\/+$/, '');
    if (!apiKey) return Response.json({ error: '8x8 API secret not configured.' }, { status: 500 });
    if (!apiBase || !subAccountId) {
      return Response.json({ error: 'Set the 8x8 voice API base and sub-account in agency settings first.' }, { status: 400 });
    }
    const authHeaders = { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Accept': 'application/json' };

    if (action === 'search') {
      const country = String(body.country || 'US').toUpperCase();
      const areaCode = body.area_code ? String(body.area_code).replace(/[^\d]/g, '') : '';
      const limit = Math.min(Number(body.limit) || 20, 50);
      const qs = new URLSearchParams({ country, pageSize: String(limit) });
      if (areaCode) qs.set('areaCode', areaCode);
      // Common shape: GET {base}/subaccounts/{id}/numbers/available?country=US&areaCode=215
      const url = `${apiBase}/subaccounts/${encodeURIComponent(subAccountId)}/numbers/available?${qs.toString()}`;
      const res = await fetchJson(url, { method: 'GET', headers: authHeaders }).catch((err) => ({ ok: false, status: 0, data: { error: String(err?.message || err) } }));
      if (!res.ok) {
        return Response.json({ error: '8x8 number search failed — verify the numbers API shape for your account.', status: res.status, details: res.data }, { status: 502 });
      }
      const numbers = extractNumbers(res.data).filter((n) => n.e164);
      return Response.json({ success: true, count: numbers.length, numbers: numbers.map((n) => ({ e164: n.e164 })) });
    }

    if (action === 'purchase') {
      const e164 = normalizeE164(body.e164);
      if (!e164) return Response.json({ error: 'Enter a valid number to purchase.' }, { status: 400 });

      // Don't double-buy: if it's already in the pool, just report it.
      const existing = await base44.asServiceRole.entities.PhoneNumber.filter({ e164 }).catch(() => []);
      if (existing.length > 0) {
        return Response.json({ success: true, already_in_pool: true, e164 });
      }

      // Common shape: POST {base}/subaccounts/{id}/numbers/orders { number }
      const url = `${apiBase}/subaccounts/${encodeURIComponent(subAccountId)}/numbers/orders`;
      const res = await fetchJson(url, { method: 'POST', headers: authHeaders, body: JSON.stringify({ number: e164, country: 'US' }) })
        .catch((err) => ({ ok: false, status: 0, data: { error: String(err?.message || err) } }));
      if (!res.ok) {
        return Response.json({ error: '8x8 number purchase failed — verify the order API shape for your account.', status: res.status, details: res.data }, { status: 502 });
      }

      const endpointId = res.data?.endpointId || res.data?.id || res.data?.numberId || null;
      const row = await base44.asServiceRole.entities.PhoneNumber.create({
        e164,
        label: typeof body.label === 'string' ? body.label.trim() : '',
        status: 'available',
        eight_x_eight_voice_endpoint_id: endpointId || '',
        notes: 'Purchased in-app via 8x8 numbers API',
      });
      await base44.asServiceRole.entities.UserActivity.create({
        user_email: user.email, user_name: user.full_name,
        action: 'phone_number_purchased', entity_type: 'PhoneNumber', entity_id: row.id,
        details: { e164, endpoint_id: endpointId, timestamp: new Date().toISOString() }, status: 'success',
      }).catch(() => {});
      return Response.json({ success: true, e164, id: row.id, endpoint_id: endpointId });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('searchPurchase8x8Numbers error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});

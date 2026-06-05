import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * searchPurchaseTwilioNumbers — admin-only. Search Twilio for available local
 * phone numbers and purchase one straight into the local pool (PhoneNumber), so
 * an admin never has to leave the app to provision a line.
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
  if (String(raw).trim().startsWith('+') && digits.length >= 8 && digits.length <= 15 && digits[0] !== '0') return `+${digits}`;
  return null;
}

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

    const { accountSid, authToken } = await resolveTwilioCreds(base44);
    if (!accountSid || !authToken) {
      return Response.json({ error: 'Twilio API credentials not configured.' }, { status: 500 });
    }

    const authHeader = 'Basic ' + btoa(`${accountSid}:${authToken}`);
    const authHeaders = {
      'Authorization': authHeader,
      'Accept': 'application/json',
    };

    if (action === 'search') {
      const country = String(body.country || 'US').toUpperCase();
      const areaCode = body.area_code ? String(body.area_code).replace(/[^\d]/g, '') : '';
      const limit = Math.min(Number(body.limit) || 20, 50);
      const qs = new URLSearchParams({
        SmsEnabled: 'true',
        VoiceEnabled: 'true',
        PageSize: String(limit),
      });
      if (areaCode) qs.set('AreaCode', areaCode);
      const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/AvailablePhoneNumbers/${country}/Local.json?${qs.toString()}`;
      const res = await fetchJson(url, { method: 'GET', headers: authHeaders })
        .catch((err) => ({ ok: false, status: 0, data: { message: String(err?.message || err) } }));
      if (!res.ok) {
        return Response.json({ error: 'Twilio number search failed.', status: res.status, details: res.data }, { status: 502 });
      }
      const list: Array<any> = Array.isArray(res.data?.available_phone_numbers) ? res.data.available_phone_numbers : [];
      const numbers = list.map((n: any) => ({ e164: normalizeE164(n.phone_number) })).filter((n) => n.e164);
      return Response.json({ success: true, count: numbers.length, numbers });
    }

    if (action === 'purchase') {
      const e164 = normalizeE164(body.e164);
      if (!e164) return Response.json({ error: 'Enter a valid number to purchase.' }, { status: 400 });

      // Don't double-buy: if it's already in the pool, just report it.
      const existing = await base44.asServiceRole.entities.PhoneNumber.filter({ e164 }).catch(() => []);
      if (existing.length > 0) {
        return Response.json({ success: true, already_in_pool: true, e164 });
      }

      // POST to Twilio IncomingPhoneNumbers to purchase the number.
      const purchaseUrl = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/IncomingPhoneNumbers.json`;
      const formParams = new URLSearchParams({ PhoneNumber: e164 });
      const functionsBase = Deno.env.get('FUNCTIONS_BASE_URL');
      if (functionsBase && functionsBase.trim()) {
        const base = functionsBase.trim().replace(/\/+$/, '');
        formParams.set('SmsUrl', `${base}/handleTwilioInboundSms`);
        formParams.set('SmsMethod', 'POST');
        formParams.set('VoiceUrl', `${base}/handleTwilioVoiceCall`);
        formParams.set('VoiceMethod', 'POST');
        formParams.set('StatusCallback', `${base}/handleTwilioCallStatus`);
      }
      const res = await fetchJson(purchaseUrl, {
        method: 'POST',
        headers: { ...authHeaders, 'Content-Type': 'application/x-www-form-urlencoded' },
        body: formParams.toString(),
      }).catch((err) => ({ ok: false, status: 0, data: { message: String(err?.message || err) } }));

      if (!res.ok) {
        return Response.json({ error: 'Twilio number purchase failed.', status: res.status, details: res.data }, { status: 502 });
      }

      const twilioSid = res.data?.sid || null;
      const row = await base44.asServiceRole.entities.PhoneNumber.create({
        e164,
        label: typeof body.label === 'string' ? body.label.trim() : '',
        status: 'available',
        twilio_phone_number_sid: twilioSid || '',
        notes: 'Purchased in-app via Twilio numbers API',
      });
      await base44.asServiceRole.entities.UserActivity.create({
        user_email: user.email, user_name: user.full_name,
        action: 'phone_number_purchased', entity_type: 'PhoneNumber', entity_id: row.id,
        details: { e164, twilio_phone_number_sid: twilioSid, timestamp: new Date().toISOString() }, status: 'success',
      }).catch(() => {});
      return Response.json({ success: true, e164, id: row.id, twilio_phone_number_sid: twilioSid });
    }

    return Response.json({ error: `Unknown action: ${action}` }, { status: 400 });
  } catch (error) {
    console.error('searchPurchaseTwilioNumbers error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});

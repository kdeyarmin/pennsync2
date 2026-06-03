import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * sendTestSms — admin-only, end-to-end validation of the 8x8 SMS path.
 *
 * The read-only probe in testEightXEightConnection can confirm the host is
 * reachable and the API key isn't rejected, but (because the send endpoint is
 * POST-only) it can't fully prove a text will actually deliver. This sends ONE
 * real, fixed, PHI-free test message to a number the admin enters, so they can
 * confirm the integration works on a phone they control.
 *
 * From-number resolution: the admin's own work number if they have one, else
 * the first provisioned work number in the agency. Honors opt-out (TCPA) but
 * intentionally bypasses the agency SMS kill switch — this is a deliberate
 * admin diagnostic, not patient messaging. It is NOT stored in any nurse inbox.
 */

const TEST_BODY = 'PennSync test message: your 8x8 text messaging integration is working. No reply needed.';

function normalizeE164(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = String(raw).replace(/[^\d]/g, '');
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith('1')) return `+${digits}`;
  if (String(raw).trim().startsWith('+') && digits.length >= 8) return `+${digits}`;
  return null;
}

/**
 * Resolve the single 8x8 API secret: prefer the legacy backend env var, then the
 * secret the super admin saved in-app (IntegrationSecret). Either one configures
 * the integration, so the Base44 dashboard env is optional.
 */
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
      return Response.json({ error: 'Only administrators can send a test text' }, { status: 403 });
    }

    const { to_number } = await req.json();
    const destination = normalizeE164(to_number);
    if (!destination) {
      return Response.json({ error: 'Enter a valid destination phone number.' }, { status: 400 });
    }

    const apiKey = await resolveEightXEightApiKey(base44);
    const settings = await base44.asServiceRole.entities.AgencySettings.list('-created_date', 1).catch(() => []);
    const s = settings[0] || {};
    const smsSubAccountId = s.eight_x_eight_sms_subaccount_id;
    const region = (s.eight_x_eight_region && String(s.eight_x_eight_region).trim()) || 'us';
    if (!apiKey || !smsSubAccountId) {
      return Response.json({ error: '8x8 SMS is not configured (missing API key or SMS sub-account).' }, { status: 500 });
    }

    // Resolve a from-number: the admin's own work number, else any provisioned one.
    let fromNumber = user.work_phone_number || null;
    if (!fromNumber) {
      const provisioned = await base44.asServiceRole.entities.User.list('full_name', 1000).catch(() => []);
      fromNumber = provisioned.find((u: any) => u.work_phone_number)?.work_phone_number || null;
    }
    if (!fromNumber) {
      return Response.json({ error: 'No work number is provisioned yet. Assign one to a nurse (or yourself) first.' }, { status: 400 });
    }

    // TCPA: never text a number that has opted out, even for a test.
    const consents = await base44.asServiceRole.entities.SmsConsent
      .filter({ phone_e164: destination }, '-captured_at', 1).catch(() => []);
    if (consents[0]?.consent_status === 'opted_out') {
      return Response.json({ error: 'That number has opted out of text messages (replied STOP).' }, { status: 403 });
    }

    const host = `https://sms.${region}.8x8.com`;
    const url = `${host}/api/v1/subaccounts/${smsSubAccountId}/messages`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    let resp: Response;
    try {
      resp = await fetch(url, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source: fromNumber,
          destination,
          text: TEST_BODY,
          encoding: 'AUTO',
          clientMessageId: crypto.randomUUID(),
        }),
        signal: controller.signal,
      });
    } catch (netErr) {
      const aborted = (netErr as Error)?.name === 'AbortError';
      return Response.json(
        { error: aborted ? '8x8 SMS API timed out' : 'Failed to reach the 8x8 SMS API', details: (netErr as Error).message },
        { status: aborted ? 504 : 502 },
      );
    } finally {
      clearTimeout(timer);
    }

    const data = await resp.json().catch(() => ({}));
    if (!resp.ok) {
      return Response.json({ error: data?.message || data?.error || `8x8 SMS API error (${resp.status})`, details: data }, { status: resp.status });
    }

    // Audit (no PHI; the body is a fixed non-PHI string). Not written to any inbox.
    await base44.entities.UserActivity.create({
      user_email: user.email,
      user_name: user.full_name,
      action: 'sms_test_sent',
      entity_type: 'AgencySettings',
      entity_id: s.id || null,
      details: {
        to_number: destination,
        from_number: fromNumber,
        provider_message_id: data?.umid || null,
        timestamp: new Date().toISOString(),
      },
      status: 'success',
    }).catch((err) => console.error('Failed to log activity:', err));

    return Response.json({
      success: true,
      from_number: fromNumber,
      to_number: destination,
      provider_message_id: data?.umid || null,
    });
  } catch (error) {
    console.error('sendTestSms error:', error);
    return Response.json({ error: (error as Error).message }, { status: 500 });
  }
});

/**
 * eightxeightSetup — pure helpers for the admin "8x8 Setup & Health" panel.
 *
 * This is the unit-tested source of truth for the *configuration readiness*
 * checklist an admin sees in Admin → Settings → 8x8 Phone. It evaluates only
 * the AgencySettings an admin can see/edit; the live connectivity probe and the
 * backend-secret presence checks live in the testEightXEightConnection backend
 * function (which merges its own checks into the same shape). Keeping the logic
 * here — with no UI or network dependency — means it can be exercised in
 * isolation, like smsUtils / dutyUtils.
 *
 * A "check" is { id, label, status: 'ok' | 'warn' | 'fail', detail }.
 *   - fail  → the feature is broken until it's fixed.
 *   - warn  → degraded / optional / a recommended-but-missing setting.
 *   - ok    → configured.
 */

/** Loose phone sanity check (E.164-ish): 10–15 digits. Not a full validator. */
function looksLikePhone(value) {
  const digits = String(value || "").replace(/[^\d]/g, "");
  return digits.length >= 10 && digits.length <= 15;
}

/** True when `value` parses as an absolute URL. */
function looksLikeUrl(value) {
  try {
    return Boolean(new URL(String(value)));
  } catch {
    return false;
  }
}

const isBlank = (v) => v == null || String(v).trim() === "";

/**
 * The four 8x8 webhooks an admin must register, mapped to the Base44 function
 * that handles each and the 8x8 sub-account the callback is configured on. Used
 * to render a copy-able reference so setup doesn't require digging through docs.
 */
export const WEBHOOK_FUNCTIONS = [
  { fn: "handleEightXEightInboundSms", event: "Inbound SMS (MO)", configuredOn: "SMS sub-account" },
  { fn: "handleEightXEightSmsStatus", event: "SMS delivery receipt (DLR)", configuredOn: "SMS sub-account" },
  { fn: "handleEightXEightVoiceCall", event: "Voice Call Action (VCA)", configuredOn: "Voice sub-account / virtual numbers" },
  { fn: "handleEightXEightCallStatus", event: "Call status / CDR", configuredOn: "Voice sub-account" },
];

/**
 * Best-effort origin for building copy-able webhook URLs from the Base44 server
 * URL. Returns the origin (no trailing slash) or null when it can't be parsed —
 * the panel then shows function names alone and tells the admin to use the
 * deployed URL from the Base44 dashboard.
 */
export function functionUrlBase(serverUrl) {
  if (isBlank(serverUrl)) return null;
  try {
    return new URL(String(serverUrl)).origin;
  } catch {
    return null;
  }
}

/** Resolve the SMS host the integration will use for a region (mirrors backend). */
export function smsHostForRegion(region) {
  const r = (region && String(region).trim()) || "us";
  return `sms.${r}.8x8.com`;
}

/**
 * Evaluate the agency-editable 8x8 configuration into an ordered checklist.
 * Network/secret checks are intentionally excluded — the backend test merges
 * those in. Returns an array of checks (see module doc for the shape).
 */
export function evaluateAgencyConfig(settings) {
  const s = settings || {};
  const checks = [];

  checks.push({
    id: "sms_subaccount",
    label: "SMS sub-account ID",
    status: isBlank(s.eight_x_eight_sms_subaccount_id) ? "fail" : "ok",
    detail: isBlank(s.eight_x_eight_sms_subaccount_id)
      ? "Required to send and receive patient texts."
      : "Configured.",
  });

  checks.push({
    id: "voice_subaccount",
    label: "Voice sub-account ID",
    status: isBlank(s.eight_x_eight_voice_subaccount_id) ? "fail" : "ok",
    detail: isBlank(s.eight_x_eight_voice_subaccount_id)
      ? "Required for masked inbound bridging and click-to-call."
      : "Configured.",
  });

  if (isBlank(s.eight_x_eight_voice_api_base)) {
    checks.push({
      id: "voice_api_base",
      label: "Voice API base URL",
      status: "fail",
      detail: "Required for outbound click-to-call origination.",
    });
  } else {
    const ok = looksLikeUrl(s.eight_x_eight_voice_api_base);
    checks.push({
      id: "voice_api_base",
      label: "Voice API base URL",
      status: ok ? "ok" : "warn",
      detail: ok ? "Configured." : "Doesn't look like a valid URL — double-check it.",
    });
  }

  checks.push({
    id: "region",
    label: "8x8 region",
    status: "ok",
    detail: `Texts will route through ${smsHostForRegion(s.eight_x_eight_region)}.`,
  });

  if (isBlank(s.main_office_number_e164)) {
    checks.push({
      id: "main_office",
      label: "Main office number",
      status: "warn",
      detail: "Not set — off-duty calls and texts have nowhere to transfer to.",
    });
  } else {
    const ok = looksLikePhone(s.main_office_number_e164);
    checks.push({
      id: "main_office",
      label: "Main office number",
      status: ok ? "ok" : "warn",
      detail: ok ? "Configured." : "Doesn't look like a valid phone number.",
    });
  }

  checks.push({
    id: "off_duty_template",
    label: "Default off-duty message",
    status: isBlank(s.default_off_duty_template) ? "warn" : "ok",
    detail: isBlank(s.default_off_duty_template)
      ? "Not set — nurses without their own message fall back to a generic greeting."
      : "Configured.",
  });

  checks.push({
    id: "sms_enabled",
    label: "SMS messaging",
    status: s.sms_messaging_enabled === false ? "warn" : "ok",
    detail: s.sms_messaging_enabled === false
      ? "Agency-wide kill switch is ON — outbound texting is disabled for everyone."
      : "Enabled.",
  });

  return checks;
}

/**
 * Roll a checks array up into counts and an overall readiness flag. `ready` is
 * true only when nothing is failing (warnings are allowed). Severity is the
 * worst status present, for a single headline badge.
 */
export function summarize(checks) {
  const list = Array.isArray(checks) ? checks : [];
  const counts = { ok: 0, warn: 0, fail: 0 };
  for (const c of list) {
    if (c && counts[c.status] !== undefined) counts[c.status] += 1;
  }
  const severity = counts.fail > 0 ? "fail" : counts.warn > 0 ? "warn" : "ok";
  return {
    ...counts,
    total: list.length,
    ready: counts.fail === 0 && list.length > 0,
    severity,
  };
}

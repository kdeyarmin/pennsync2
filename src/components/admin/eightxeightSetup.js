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
 * Roll the whole 8x8 integration up into an ordered, friendly setup checklist
 * for the super admin "command center". Pure (no UI/network): pass in the data
 * the page already has and get back ordered steps with a clear status and the
 * single best next action. Verification/manual steps are kept separate from the
 * required ones so they never block the "ready to go live" signal.
 *
 * All inputs are optional:
 *   - secretStatus   getEightXEightSecretStatus result
 *                    ({ configured, source, secret_last_four, ... })
 *   - agencySettings the AgencySettings row (or undefined)
 *   - provisioning   { total, withWorkNumber, missingBridgeCell }
 *   - liveResult     testEightXEightConnection result ({ checks, ... }) or null
 *
 * Each step: { id, title, detail, status: 'done'|'todo'|'attention',
 *   kind: 'required'|'verify'|'manual', anchor }.
 *   - required → must be 'done' before the integration is ready.
 *   - verify   → a recommended check (live test); never blocks readiness.
 *   - manual   → a step we can't auto-detect (webhook registration).
 *
 * @param {{ secretStatus?: any, agencySettings?: any,
 *   provisioning?: { total?: number, withWorkNumber?: number, missingBridgeCell?: number },
 *   liveResult?: any }} [inputs]
 */
export function buildIntegrationSteps({ secretStatus, agencySettings, provisioning, liveResult } = {}) {
  const steps = [];

  // 1. The single 8x8 API secret (required).
  const secretConfigured = Boolean(secretStatus && secretStatus.configured);
  const secretSuffix =
    secretStatus?.source === "env"
      ? " (Base44 dashboard env)"
      : secretStatus?.secret_last_four
        ? ` ••••${secretStatus.secret_last_four}`
        : "";
  steps.push({
    id: "api_secret",
    title: "Add the 8x8 API secret",
    kind: "required",
    anchor: "ex8-secret",
    status: secretConfigured ? "done" : "todo",
    detail: secretConfigured
      ? `Configured${secretSuffix}.`
      : "Paste your 8x8 Connect API token so SMS, voice, and webhook verification can run.",
  });

  // 2. Agency configuration (required) — reuse the detailed checklist so the
  // roll-up and the granular panel can never disagree.
  const configSummary = summarize(evaluateAgencyConfig(agencySettings || {}));
  steps.push({
    id: "agency_config",
    title: "Configure sub-accounts & agency settings",
    kind: "required",
    anchor: "ex8-settings",
    status: configSummary.fail > 0 ? "attention" : "done",
    detail:
      configSummary.fail > 0
        ? `${configSummary.fail} required setting${configSummary.fail > 1 ? "s" : ""} still missing (SMS/voice sub-account or voice API base).`
        : configSummary.warn > 0
          ? `Configured — ${configSummary.warn} optional item${configSummary.warn > 1 ? "s" : ""} could be improved.`
          : "SMS/voice sub-accounts, region, and office number are set.",
  });

  // 3. Provision at least one nurse work number (required).
  const total = provisioning?.total ?? 0;
  const withWork = provisioning?.withWorkNumber ?? 0;
  const missingCell = provisioning?.missingBridgeCell ?? 0;
  let provStatus = "done";
  let provDetail = `${withWork}${total ? ` of ${total}` : ""} user${withWork === 1 ? "" : "s"} fully provisioned.`;
  if (withWork === 0) {
    provStatus = "todo";
    provDetail = "No nurse has a work number yet — assign at least one.";
  } else if (missingCell > 0) {
    provStatus = "attention";
    provDetail = `${withWork} provisioned, but ${missingCell} ${missingCell === 1 ? "has" : "have"} no bridge cell, so masked calling won't connect for ${missingCell === 1 ? "that nurse" : "them"}.`;
  }
  steps.push({
    id: "provisioning",
    title: "Provision a nurse work number",
    kind: "required",
    anchor: "ex8-nurses",
    status: provStatus,
    detail: provDetail,
  });

  // 4. Register the webhooks (manual — there's no API to read this back).
  steps.push({
    id: "webhooks",
    title: "Register the webhooks in 8x8 Connect",
    kind: "manual",
    anchor: "ex8-webhooks",
    status: "todo",
    detail:
      "Point each 8x8 callback at the matching function. This can't be auto-detected — confirm it in 8x8 Connect.",
  });

  // 5. Verify end to end with the live connection test (recommended).
  const liveSummary =
    liveResult && Array.isArray(liveResult.checks) && liveResult.checks.length
      ? summarize(liveResult.checks)
      : null;
  steps.push({
    id: "live_test",
    title: "Verify the live connection",
    kind: "verify",
    anchor: "ex8-health",
    status: !liveSummary ? "todo" : liveSummary.fail > 0 ? "attention" : "done",
    detail: !liveSummary
      ? "Run the live test to confirm your key, region, and sub-account actually authenticate."
      : liveSummary.fail > 0
        ? `Last run found ${liveSummary.fail} problem${liveSummary.fail > 1 ? "s" : ""} — see the Setup & Health checklist.`
        : liveSummary.warn > 0
          ? "Reachable; send a real test text for the definitive end-to-end check."
          : "Authenticated and reachable.",
  });

  return steps;
}

/**
 * Summarize a steps array (from `buildIntegrationSteps`) into a progress
 * headline. `percent`/`ready` track only the REQUIRED steps (the bar to going
 * live); `nextStep` is the single most useful thing to do next — the first
 * unfinished required step, else the first unfinished verify/manual step.
 */
export function summarizeSteps(steps) {
  const list = Array.isArray(steps) ? steps : [];
  const required = list.filter((s) => s && s.kind === "required");
  const requiredDone = required.filter((s) => s.status === "done").length;
  const nextStep =
    required.find((s) => s.status !== "done") ||
    list.find((s) => s && s.kind !== "required" && s.status !== "done") ||
    null;
  return {
    total: list.length,
    done: list.filter((s) => s && s.status === "done").length,
    attention: list.filter((s) => s && s.status === "attention").length,
    requiredTotal: required.length,
    requiredDone,
    percent: required.length === 0 ? 0 : Math.round((requiredDone / required.length) * 100),
    ready: required.length > 0 && requiredDone === required.length,
    nextStep,
  };
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

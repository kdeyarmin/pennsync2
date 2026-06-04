import { test } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateAgencyConfig,
  summarize,
  functionUrlBase,
  smsHostForRegion,
  WEBHOOK_FUNCTIONS,
  buildIntegrationSteps,
  summarizeSteps,
} from "./eightxeightSetup.js";

function byId(checks, id) {
  return checks.find((c) => c.id === id);
}

// A fully wired set of inputs, reused/tweaked by the step tests below.
const READY_INPUTS = {
  secretStatus: { configured: true, source: "config", secret_last_four: "9abc" },
  agencySettings: {
    eight_x_eight_sms_subaccount_id: "sms-sub",
    eight_x_eight_voice_subaccount_id: "voice-sub",
    eight_x_eight_voice_api_base: "https://voice.wavecell.com/api/v1",
    eight_x_eight_region: "us",
    main_office_number_e164: "+12155550100",
    default_off_duty_template: "We are closed; call {office}.",
    sms_messaging_enabled: true,
  },
  provisioning: { total: 5, withWorkNumber: 3, missingBridgeCell: 0 },
  liveResult: { checks: [{ id: "a", status: "ok" }, { id: "b", status: "ok" }] },
};

test("a fully empty config fails the required sub-account/voice checks", () => {
  const checks = evaluateAgencyConfig({});
  assert.equal(byId(checks, "sms_subaccount").status, "fail");
  assert.equal(byId(checks, "voice_subaccount").status, "fail");
  assert.equal(byId(checks, "voice_api_base").status, "fail");
});

test("a complete config is ready (no failures)", () => {
  const checks = evaluateAgencyConfig({
    eight_x_eight_sms_subaccount_id: "sms-sub",
    eight_x_eight_voice_subaccount_id: "voice-sub",
    eight_x_eight_voice_api_base: "https://voice.wavecell.com/api/v1",
    eight_x_eight_region: "us",
    main_office_number_e164: "+12155550100",
    default_off_duty_template: "We are closed; call {office}.",
    sms_messaging_enabled: true,
  });
  const sum = summarize(checks);
  assert.equal(sum.fail, 0);
  assert.equal(sum.ready, true);
  assert.equal(sum.severity, "ok");
});

test("blank/whitespace sub-account id counts as missing", () => {
  const checks = evaluateAgencyConfig({ eight_x_eight_sms_subaccount_id: "   " });
  assert.equal(byId(checks, "sms_subaccount").status, "fail");
});

test("missing main office is a warning, not a failure", () => {
  const checks = evaluateAgencyConfig({
    eight_x_eight_sms_subaccount_id: "a",
    eight_x_eight_voice_subaccount_id: "b",
    eight_x_eight_voice_api_base: "https://x.example/api",
  });
  assert.equal(byId(checks, "main_office").status, "warn");
  // No main office is degraded but the integration is still "ready".
  assert.equal(summarize(checks).ready, true);
});

test("a malformed voice API base is a warning, not a hard fail", () => {
  const checks = evaluateAgencyConfig({
    eight_x_eight_sms_subaccount_id: "a",
    eight_x_eight_voice_subaccount_id: "b",
    eight_x_eight_voice_api_base: "not a url",
  });
  assert.equal(byId(checks, "voice_api_base").status, "warn");
});

test("a malformed main office number warns", () => {
  const checks = evaluateAgencyConfig({ main_office_number_e164: "12" });
  assert.equal(byId(checks, "main_office").status, "warn");
});

test("the SMS kill switch surfaces as a warning when off", () => {
  const checks = evaluateAgencyConfig({
    eight_x_eight_sms_subaccount_id: "a",
    eight_x_eight_voice_subaccount_id: "b",
    eight_x_eight_voice_api_base: "https://x.example/api",
    sms_messaging_enabled: false,
  });
  assert.equal(byId(checks, "sms_enabled").status, "warn");
});

test("missing off-duty template warns", () => {
  const checks = evaluateAgencyConfig({});
  assert.equal(byId(checks, "off_duty_template").status, "warn");
});

test("region defaults to us in the host string", () => {
  assert.equal(smsHostForRegion(undefined), "sms.us.8x8.com");
  assert.equal(smsHostForRegion(""), "sms.us.8x8.com");
  assert.equal(smsHostForRegion("sg"), "sms.sg.8x8.com");
  const checks = evaluateAgencyConfig({});
  assert.match(byId(checks, "region").detail, /sms\.us\.8x8\.com/);
});

test("summarize picks the worst severity and counts statuses", () => {
  const sum = summarize([
    { id: "1", status: "ok" },
    { id: "2", status: "warn" },
    { id: "3", status: "fail" },
    { id: "4", status: "ok" },
  ]);
  assert.equal(sum.ok, 2);
  assert.equal(sum.warn, 1);
  assert.equal(sum.fail, 1);
  assert.equal(sum.total, 4);
  assert.equal(sum.severity, "fail");
  assert.equal(sum.ready, false);
});

test("summarize treats an empty list as not ready", () => {
  const sum = summarize([]);
  assert.equal(sum.ready, false);
  assert.equal(sum.severity, "ok");
});

test("functionUrlBase extracts the origin, or null when unparseable", () => {
  assert.equal(functionUrlBase("https://api.base44.com/apps/x"), "https://api.base44.com");
  assert.equal(functionUrlBase("https://api.base44.com"), "https://api.base44.com");
  assert.equal(functionUrlBase(""), null);
  assert.equal(functionUrlBase(null), null);
  assert.equal(functionUrlBase("not a url"), null);
});

// ---- buildIntegrationSteps / summarizeSteps -------------------------------

test("buildIntegrationSteps returns the ordered setup steps", () => {
  const steps = buildIntegrationSteps({});
  assert.deepEqual(
    steps.map((s) => s.id),
    ["api_secret", "agency_config", "provisioning", "webhooks", "live_test"],
  );
  // Every step carries a status, kind, and a jump anchor.
  for (const s of steps) {
    assert.ok(["done", "todo", "attention"].includes(s.status));
    assert.ok(["required", "verify", "manual"].includes(s.kind));
    assert.ok(s.anchor && s.title && s.detail);
  }
});

test("buildIntegrationSteps with empty inputs leaves required steps undone", () => {
  const steps = buildIntegrationSteps({});
  assert.equal(byId(steps, "api_secret").status, "todo");
  // No sub-accounts → the agency config step needs attention.
  assert.equal(byId(steps, "agency_config").status, "attention");
  assert.equal(byId(steps, "provisioning").status, "todo");
  assert.equal(byId(steps, "live_test").status, "todo");
});

test("buildIntegrationSteps reflects a fully wired, verified integration", () => {
  const steps = buildIntegrationSteps(READY_INPUTS);
  assert.equal(byId(steps, "api_secret").status, "done");
  assert.match(byId(steps, "api_secret").detail, /9abc/);
  assert.equal(byId(steps, "agency_config").status, "done");
  assert.equal(byId(steps, "provisioning").status, "done");
  assert.equal(byId(steps, "live_test").status, "done");
});

test("a dashboard-env secret reads as configured without a last-four", () => {
  const steps = buildIntegrationSteps({ secretStatus: { configured: true, source: "env" } });
  const s = byId(steps, "api_secret");
  assert.equal(s.status, "done");
  assert.match(s.detail, /dashboard env/);
});

test("provisioned nurses missing a bridge cell raise an attention step", () => {
  const steps = buildIntegrationSteps({
    ...READY_INPUTS,
    provisioning: { total: 5, withWorkNumber: 3, missingBridgeCell: 2 },
  });
  const s = byId(steps, "provisioning");
  assert.equal(s.status, "attention");
  assert.match(s.detail, /bridge cell/);
});

test("a failing live test surfaces as attention, never blocks readiness", () => {
  const steps = buildIntegrationSteps({
    ...READY_INPUTS,
    liveResult: { checks: [{ id: "a", status: "fail" }, { id: "b", status: "ok" }] },
  });
  assert.equal(byId(steps, "live_test").status, "attention");
  // live_test is a 'verify' step, so the required set is still complete.
  assert.equal(summarizeSteps(steps).ready, true);
});

test("webhooks is a manual step we never auto-complete", () => {
  const steps = buildIntegrationSteps(READY_INPUTS);
  const w = byId(steps, "webhooks");
  assert.equal(w.kind, "manual");
  assert.equal(w.status, "todo");
});

test("summarizeSteps tracks required progress and percent", () => {
  const empty = summarizeSteps(buildIntegrationSteps({}));
  assert.equal(empty.requiredTotal, 3);
  assert.equal(empty.requiredDone, 0);
  assert.equal(empty.percent, 0);
  assert.equal(empty.ready, false);

  const ready = summarizeSteps(buildIntegrationSteps(READY_INPUTS));
  assert.equal(ready.requiredDone, 3);
  assert.equal(ready.percent, 100);
  assert.equal(ready.ready, true);
});

test("summarizeSteps points nextStep at the first unfinished required step", () => {
  // Secret done, but no sub-accounts yet → next is the agency config step.
  const steps = buildIntegrationSteps({
    secretStatus: { configured: true, source: "config", secret_last_four: "1234" },
  });
  const sum = summarizeSteps(steps);
  assert.equal(sum.nextStep.id, "agency_config");
});

test("summarizeSteps falls through to verify/manual once required steps are done", () => {
  // All required done, no live test run yet → next is a non-required step.
  const steps = buildIntegrationSteps({ ...READY_INPUTS, liveResult: null });
  const sum = summarizeSteps(steps);
  assert.equal(sum.ready, true);
  assert.ok(sum.nextStep && sum.nextStep.kind !== "required");
});

test("summarizeSteps handles a non-array input safely", () => {
  const sum = summarizeSteps(undefined);
  assert.equal(sum.total, 0);
  assert.equal(sum.ready, false);
  assert.equal(sum.nextStep, null);
});

test("WEBHOOK_FUNCTIONS lists the four handlers with their 8x8 events", () => {
  assert.equal(WEBHOOK_FUNCTIONS.length, 4);
  const fns = WEBHOOK_FUNCTIONS.map((w) => w.fn);
  assert.ok(fns.includes("handleEightXEightInboundSms"));
  assert.ok(fns.includes("handleEightXEightSmsStatus"));
  assert.ok(fns.includes("handleEightXEightVoiceCall"));
  assert.ok(fns.includes("handleEightXEightCallStatus"));
  for (const w of WEBHOOK_FUNCTIONS) {
    assert.ok(w.event && w.configuredOn, "each entry has an event + where it's configured");
  }
});

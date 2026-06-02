import { test } from "node:test";
import assert from "node:assert/strict";
import {
  evaluateAgencyConfig,
  summarize,
  functionUrlBase,
  smsHostForRegion,
  WEBHOOK_FUNCTIONS,
} from "./eightxeightSetup.js";

function byId(checks, id) {
  return checks.find((c) => c.id === id);
}

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

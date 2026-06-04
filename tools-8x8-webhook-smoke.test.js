import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  hmacSha256Hex,
  sampleInboundSms,
  sampleSmsStatus,
  sampleVoiceCall,
  buildSignedRequest,
  SMOKE_TARGETS,
  runSmoke,
} from "./tools-8x8-webhook-smoke.mjs";

test("hmacSha256Hex matches the well-known HMAC-SHA256 test vector", () => {
  // RFC-style known vector: key "key", message "The quick brown fox…".
  assert.equal(
    hmacSha256Hex("key", "The quick brown fox jumps over the lazy dog"),
    "f7bc83f430538424b13298e6aa6fb143ef4d59a14946175997479dbc2d1a3cd8",
  );
});

test("hmacSha256Hex agrees with an independent node crypto implementation", () => {
  const secret = "s3cr3t";
  const raw = JSON.stringify({ a: 1, b: "two" });
  const expected = createHmac("sha256", secret).update(raw).digest("hex");
  assert.equal(hmacSha256Hex(secret, raw), expected);
});

test("buildSignedRequest signs the exact raw body", () => {
  const { raw, headers } = buildSignedRequest({ hello: "world" }, "secret");
  assert.equal(raw, JSON.stringify({ hello: "world" }));
  assert.equal(headers["x-8x8-signature"], hmacSha256Hex("secret", raw));
  assert.equal(headers["Content-Type"], "application/json");
});

test("sample payloads carry the fields the handlers parse + a recent timestamp", () => {
  const mo = sampleInboundSms();
  assert.ok(mo.source && mo.destination && mo.text && mo.umid);
  assert.ok(!Number.isNaN(Date.parse(mo.timestamp)));

  const dlr = sampleSmsStatus({ status: "FAILED" });
  assert.equal(dlr.status.code, "FAILED");
  assert.ok(dlr.umid);

  const call = sampleVoiceCall();
  assert.ok(call.called && call.callerNumber && call.callId);
  // Within the handlers' 15-minute replay window.
  assert.ok(Math.abs(Date.now() - Date.parse(call.timestamp)) < 60_000);
});

test("SMOKE_TARGETS covers the three signed webhook handlers", () => {
  assert.deepEqual(
    SMOKE_TARGETS.map((t) => t.fn).sort(),
    ["handleEightXEightInboundSms", "handleEightXEightSmsStatus", "handleEightXEightVoiceCall"],
  );
});

test("runSmoke passes when the server accepts valid sigs and 401s bad ones", async () => {
  const calls = [];
  const fakeFetch = (url, init) => {
    calls.push({ url, sig: init.headers["x-8x8-signature"] });
    // A correct signature for the posted body verifies; a tampered one 401s.
    const expected = hmacSha256Hex("secret", init.body);
    const status = init.headers["x-8x8-signature"] === expected ? 200 : 401;
    return Promise.resolve({ status });
  };
  const { passed, failed } = await runSmoke({ base: "https://x/functions/", secret: "secret", fetchImpl: fakeFetch, log: () => {} });
  assert.equal(failed, 0);
  assert.equal(passed, 6); // 3 functions × (valid + bad)
  // Trailing slash on base is normalized (no double slash).
  assert.ok(calls.every((c) => !c.url.includes("functions//")));
});

test("runSmoke reports a failure when the server wrongly accepts a bad signature", async () => {
  const alwaysOk = () => Promise.resolve({ status: 200 });
  const { failed, results } = await runSmoke({ base: "https://x", secret: "s", only: "handleEightXEightInboundSms", fetchImpl: alwaysOk, log: () => {} });
  assert.equal(failed, 1); // the bad-signature check should have wanted a 401
  assert.ok(results.some((r) => r.check === "bad-signature" && r.pass === false));
});

test("runSmoke validates its inputs", async () => {
  await assert.rejects(() => runSmoke({ secret: "s" }), /Missing --base/);
  await assert.rejects(() => runSmoke({ base: "x" }), /secret/);
  await assert.rejects(() => runSmoke({ base: "x", secret: "s", only: "nope", fetchImpl: () => {} }), /No matching function/);
});

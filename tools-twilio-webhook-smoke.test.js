import { test } from "node:test";
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import {
  twilioSignature,
  signatureBaseString,
  sampleInboundSms,
  sampleSmsStatus,
  sampleVoiceCall,
  buildSignedRequest,
  SMOKE_TARGETS,
  runSmoke,
} from "./tools-twilio-webhook-smoke.mjs";

test("twilioSignature matches an independent HMAC-SHA1/base64 implementation", () => {
  const token = "s3cr3t";
  const data = "https://x/functions/handleTwilioInboundSmsBodyhiFrom+1";
  const expected = createHmac("sha1", token).update(data, "utf8").digest("base64");
  assert.equal(twilioSignature(token, data), expected);
});

test("signatureBaseString is url + sorted name+value concatenation", () => {
  const url = "https://app/functions/handleTwilioInboundSms";
  const params = { To: "+12155550100", From: "+12155550123", Body: "hi" };
  // Sorted keys: Body, From, To.
  assert.equal(
    signatureBaseString(url, params),
    `${url}Bodyhi` + "From+12155550123" + "To+12155550100",
  );
});

test("buildSignedRequest signs the exact URL + params and form-encodes the body", () => {
  const url = "https://x/functions/handleTwilioInboundSms";
  const params = { hello: "world", a: "1" };
  const { raw, headers } = buildSignedRequest(params, "secret", url);
  assert.equal(raw, new URLSearchParams(params).toString());
  assert.equal(headers["X-Twilio-Signature"], twilioSignature("secret", signatureBaseString(url, params)));
  assert.equal(headers["Content-Type"], "application/x-www-form-urlencoded");
});

test("sample payloads carry the fields the handlers parse", () => {
  const mo = sampleInboundSms();
  assert.ok(mo.From && mo.To && mo.Body && mo.MessageSid);

  const dlr = sampleSmsStatus({ status: "failed" });
  assert.equal(dlr.MessageStatus, "failed");
  assert.ok(dlr.MessageSid);

  const call = sampleVoiceCall();
  assert.ok(call.To && call.From && call.CallSid);
});

test("SMOKE_TARGETS covers the three signed webhook handlers", () => {
  assert.deepEqual(
    SMOKE_TARGETS.map((t) => t.fn).sort(),
    ["handleTwilioInboundSms", "handleTwilioSmsStatus", "handleTwilioVoiceCall"],
  );
});

test("runSmoke passes when the server accepts valid sigs and 401s bad ones", async () => {
  const calls = [];
  const fakeFetch = (url, init) => {
    calls.push({ url, sig: init.headers["X-Twilio-Signature"] });
    // Recompute the expected signature for the posted URL + params; a correct
    // signature verifies, a tampered one 401s.
    const params = Object.fromEntries(new URLSearchParams(init.body));
    const expected = twilioSignature("secret", signatureBaseString(url, params));
    const status = init.headers["X-Twilio-Signature"] === expected ? 200 : 401;
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
  const { failed, results } = await runSmoke({ base: "https://x", secret: "s", only: "handleTwilioInboundSms", fetchImpl: alwaysOk, log: () => {} });
  assert.equal(failed, 1); // the bad-signature check should have wanted a 401
  assert.ok(results.some((r) => r.check === "bad-signature" && r.pass === false));
});

test("runSmoke validates its inputs", async () => {
  await assert.rejects(() => runSmoke({ secret: "s" }), /Missing --base/);
  await assert.rejects(() => runSmoke({ base: "x" }), /token/);
  await assert.rejects(() => runSmoke({ base: "x", secret: "s", only: "nope", fetchImpl: () => {} }), /No matching function/);
});

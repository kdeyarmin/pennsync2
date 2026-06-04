#!/usr/bin/env node
// Smoke-tests the deployed Twilio webhook functions end to end: it POSTs
// realistic form-encoded sample payloads with a CORRECTLY computed
// X-Twilio-Signature and asserts a 200, then re-sends with a tampered signature
// and asserts a 401 (fail-closed). This is the scripted version of the manual
// check in docs/twilio-setup.md §6.
//
//   TWILIO_AUTH_TOKEN=… \
//     node tools-twilio-webhook-smoke.mjs --base https://<your-app>/functions
//
//   # or pass the token explicitly, and a single function:
//   node tools-twilio-webhook-smoke.mjs --base <url> --secret <authToken> --only handleTwilioInboundSms
//
// The signature scheme mirrors the backend verifyTwilioSignature:
// base64(HMAC-SHA1(authToken, url + sorted concatenated POST params)) in the
// `X-Twilio-Signature` header. Nothing is written to your data beyond what a
// genuine inbound webhook would do, so prefer a staging app.

import { createHmac } from 'node:crypto';

/** base64(HMAC-SHA1(authToken, data)) — matches Twilio's request signature. */
export function twilioSignature(authToken, data) {
  return createHmac('sha1', String(authToken ?? '')).update(String(data ?? ''), 'utf8').digest('base64');
}

/**
 * The string Twilio signs: the full request URL followed by each POST param
 * name+value, with the param names sorted alphabetically.
 */
export function signatureBaseString(url, params) {
  let data = String(url);
  for (const key of Object.keys(params).sort()) data += key + params[key];
  return data;
}

// ---- sample payloads (form params the handlers parse) ----
export function sampleInboundSms(o = {}) {
  return {
    From: o.from ?? '+12155550123',
    To: o.to ?? '+12155550100',
    Body: o.text ?? 'Smoke test inbound message',
    MessageSid: o.sid ?? `SM${Date.now()}smoke`,
  };
}
export function sampleSmsStatus(o = {}) {
  return {
    MessageSid: o.sid ?? `SM${Date.now()}smoke`,
    MessageStatus: o.status ?? 'delivered',
  };
}
export function sampleVoiceCall(o = {}) {
  return {
    To: o.called ?? '+12155550100',
    From: o.caller ?? '+12155550123',
    CallSid: o.sid ?? `CA${Date.now()}smoke`,
  };
}

/** Build the form-encoded raw body + signed headers for a payload at `url`. */
export function buildSignedRequest(params, authToken, url) {
  const raw = new URLSearchParams(params).toString();
  const signature = twilioSignature(authToken, signatureBaseString(url, params));
  return { raw, headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'X-Twilio-Signature': signature } };
}

/** The webhook functions exercised, with a sample-payload factory for each. */
export const SMOKE_TARGETS = [
  { fn: 'handleTwilioInboundSms', sample: sampleInboundSms },
  { fn: 'handleTwilioSmsStatus', sample: sampleSmsStatus },
  { fn: 'handleTwilioVoiceCall', sample: sampleVoiceCall },
];

/**
 * Run the smoke test against a base functions URL. `fetchImpl`/`log` are
 * injectable for testing. Returns { passed, failed, results }.
 */
export async function runSmoke({ base, secret, only, fetchImpl = fetch, log = console.log } = {}) {
  if (!base) throw new Error('Missing --base <functions URL>');
  if (!secret) throw new Error('Missing Twilio auth token (TWILIO_AUTH_TOKEN or --secret)');
  const origin = String(base).replace(/\/+$/, '');
  const targets = SMOKE_TARGETS.filter((t) => !only || t.fn === only);
  if (targets.length === 0) throw new Error(`No matching function for --only ${only}`);

  const results = [];
  let passed = 0;
  let failed = 0;

  const post = (url, raw, headers) =>
    fetchImpl(url, { method: 'POST', headers, body: raw }).then((r) => r.status);

  for (const t of targets) {
    const url = `${origin}/${t.fn}`;
    const { raw, headers } = buildSignedRequest(t.sample(), secret, url);

    // 1) Valid signature → expect 2xx.
    let okStatus = 0;
    try {
      okStatus = await post(url, raw, headers);
    } catch (err) {
      okStatus = -1;
      results.push({ fn: t.fn, check: 'valid-signature', error: String(err?.message || err) });
    }
    const validPass = okStatus >= 200 && okStatus < 300;
    results.push({ fn: t.fn, check: 'valid-signature', status: okStatus, pass: validPass });
    validPass ? passed++ : failed++;
    log(`${validPass ? '✓' : '✗'} ${t.fn}  valid signature → ${okStatus} (expect 2xx)`);

    // 2) Tampered signature → expect 401 (fail-closed).
    const badHeaders = { ...headers, 'X-Twilio-Signature': `${headers['X-Twilio-Signature']}00` };
    let badStatus = 0;
    try {
      badStatus = await post(url, raw, badHeaders);
    } catch (err) {
      badStatus = -1;
      results.push({ fn: t.fn, check: 'bad-signature', error: String(err?.message || err) });
    }
    const badPass = badStatus === 401;
    results.push({ fn: t.fn, check: 'bad-signature', status: badStatus, pass: badPass });
    badPass ? passed++ : failed++;
    log(`${badPass ? '✓' : '✗'} ${t.fn}  bad signature → ${badStatus} (expect 401)`);
  }

  log(`\n${failed === 0 ? '✅' : '❌'} ${passed} passed, ${failed} failed`);
  return { passed, failed, results };
}

function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--base') args.base = argv[++i];
    else if (a === '--secret') args.secret = argv[++i];
    else if (a === '--only') args.only = argv[++i];
  }
  return args;
}

// CLI entry (skipped when imported by the test).
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = parseArgs(process.argv.slice(2));
  const secret = args.secret || process.env.TWILIO_AUTH_TOKEN;
  try {
    const { failed } = await runSmoke({ base: args.base, secret, only: args.only });
    process.exit(failed === 0 ? 0 : 1);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    console.error('Usage: TWILIO_AUTH_TOKEN=… node tools-twilio-webhook-smoke.mjs --base https://<app>/functions [--only <fn>]');
    process.exit(2);
  }
}

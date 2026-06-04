#!/usr/bin/env node
// Smoke-tests the deployed 8x8 webhook functions end to end: it POSTs realistic
// sample payloads with a CORRECTLY computed HMAC-SHA256 signature and asserts a
// 200, then re-sends with a tampered signature and asserts a 401 (fail-closed).
// This is the scripted version of the manual check in docs/8x8-setup.md §6.
//
//   EIGHT_X_EIGHT_WEBHOOK_SECRET=… \
//     node tools-8x8-webhook-smoke.mjs --base https://<your-app>/functions
//
//   # or pass the secret explicitly, and a single function:
//   node tools-8x8-webhook-smoke.mjs --base <url> --secret <s> --only handleEightXEightInboundSms
//
// The signature scheme mirrors the backend verifyWebhook: hex(HMAC-SHA256(secret,
// rawBody)) in the `x-8x8-signature` header. Nothing is written to your data
// beyond what a genuine inbound webhook would do, so prefer a staging app.

import { createHmac } from 'node:crypto';

/** hex(HMAC-SHA256(secret, raw)) — matches the backend's hmacHex(). */
export function hmacSha256Hex(secret, raw) {
  return createHmac('sha256', String(secret ?? '')).update(String(raw ?? '')).digest('hex');
}

const recentTs = () => new Date().toISOString();

// ---- sample payloads (shapes mirror what the handlers parse defensively) ----
export function sampleInboundSms(o = {}) {
  return {
    source: o.from ?? '+12155550123',
    destination: o.to ?? '+12155550100',
    text: o.text ?? 'Smoke test inbound message',
    umid: o.umid ?? `smoke-mo-${Date.now()}`,
    timestamp: o.timestamp ?? recentTs(),
  };
}
export function sampleSmsStatus(o = {}) {
  return {
    umid: o.umid ?? `smoke-dlr-${Date.now()}`,
    status: { code: o.status ?? 'DELIVERED' },
    timestamp: o.timestamp ?? recentTs(),
  };
}
export function sampleVoiceCall(o = {}) {
  return {
    called: o.called ?? '+12155550100',
    callerNumber: o.caller ?? '+12155550123',
    callId: o.callId ?? `smoke-call-${Date.now()}`,
    timestamp: o.timestamp ?? recentTs(),
  };
}

/** Build the raw body + signed headers for a payload. */
export function buildSignedRequest(payload, secret, { header = 'x-8x8-signature' } = {}) {
  const raw = JSON.stringify(payload);
  return { raw, headers: { 'Content-Type': 'application/json', [header]: hmacSha256Hex(secret, raw) } };
}

/** The webhook functions exercised, with a sample-payload factory for each. */
export const SMOKE_TARGETS = [
  { fn: 'handleEightXEightInboundSms', sample: sampleInboundSms },
  { fn: 'handleEightXEightSmsStatus', sample: sampleSmsStatus },
  { fn: 'handleEightXEightVoiceCall', sample: sampleVoiceCall },
];

/**
 * Run the smoke test against a base functions URL. `fetchImpl`/`log` are
 * injectable for testing. Returns { passed, failed, results }.
 */
export async function runSmoke({ base, secret, only, fetchImpl = fetch, log = console.log } = {}) {
  if (!base) throw new Error('Missing --base <functions URL>');
  if (!secret) throw new Error('Missing webhook secret (EIGHT_X_EIGHT_WEBHOOK_SECRET or --secret)');
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
    const { raw, headers } = buildSignedRequest(t.sample(), secret);

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
    const badHeaders = { ...headers, 'x-8x8-signature': `${headers['x-8x8-signature']}00` };
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
  const secret = args.secret || process.env.EIGHT_X_EIGHT_WEBHOOK_SECRET || process.env.EIGHT_X_EIGHT_API_KEY;
  try {
    const { failed } = await runSmoke({ base: args.base, secret, only: args.only });
    process.exit(failed === 0 ? 0 : 1);
  } catch (err) {
    console.error(`Error: ${err.message}`);
    console.error('Usage: EIGHT_X_EIGHT_WEBHOOK_SECRET=… node tools-8x8-webhook-smoke.mjs --base https://<app>/functions [--only <fn>]');
    process.exit(2);
  }
}

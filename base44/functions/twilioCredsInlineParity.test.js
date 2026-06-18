import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

/**
 * Drift guard for resolveTwilioCreds, which is inlined (single-file Deno deploy
 * model) into every fax function: sendFax, autoRetryFailedFaxes, retryFailedFax,
 * syncTwilioFaxStatuses, handleTwilioFaxWebhook, handleTelnyxWebhook. It resolves
 * Twilio credentials env-first, then the in-app IntegrationSecret. Since it gates
 * who can send/verify faxes, a silent divergence between copies is a security
 * concern; this asserts every copy resolves each field it exposes identically.
 */
globalThis.Deno = globalThis.Deno || { serve() {}, env: { get: () => undefined } };

async function loadInline(entryPath, names) {
  let src = await readFile(new URL(entryPath, import.meta.url), "utf8");
  src = src.replace(/import\s+\{[^}]*\}\s+from\s+'npm:[^']*';?/, "const createClientFromRequest = () => ({});");
  const js = ts.transpileModule(src, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  const tmp = join(tmpdir(), `twcreds_${Date.now()}_${Math.random().toString(36).slice(2)}.mjs`);
  await writeFile(tmp, `${js}\nexport { ${names.join(", ")} };\n`);
  try {
    return await import(pathToFileURL(tmp).href);
  } finally {
    await unlink(tmp).catch(() => {});
  }
}

// file -> the credential fields that copy actually returns.
const FILES = {
  "./sendFax/entry.ts": ["accountSid", "authToken"],
  "./autoRetryFailedFaxes/entry.ts": ["accountSid", "authToken"],
  "./retryFailedFax/entry.ts": ["accountSid", "authToken"],
  "./syncTwilioFaxStatuses/entry.ts": ["accountSid", "authToken"],
  "./handleTwilioFaxWebhook/entry.ts": ["accountSid", "authToken", "storedWebhookSecret"],
  "./handleTelnyxWebhook/entry.ts": ["authToken", "storedWebhookSecret"],
};

const SCENARIOS = [
  {
    name: "env vars win over the stored secret",
    env: { TWILIO_ACCOUNT_SID: "ACenv", TWILIO_AUTH_TOKEN: "TOKenv" },
    rows: [{ account_sid: "ACdb", auth_token: "TOKdb", webhook_secret: "WSdb" }],
    expect: { accountSid: "ACenv", authToken: "TOKenv", storedWebhookSecret: "WSdb" },
  },
  {
    name: "falls back to IntegrationSecret when env unset",
    env: {},
    rows: [{ account_sid: "ACdb", auth_token: "TOKdb", webhook_secret: "WSdb" }],
    expect: { accountSid: "ACdb", authToken: "TOKdb", storedWebhookSecret: "WSdb" },
  },
  {
    name: "blank env values are ignored, stored used",
    env: { TWILIO_ACCOUNT_SID: "  ", TWILIO_AUTH_TOKEN: "" },
    rows: [{ account_sid: "ACdb", auth_token: "TOKdb" }],
    expect: { accountSid: "ACdb", authToken: "TOKdb", storedWebhookSecret: null },
  },
  {
    name: "no creds anywhere → nulls",
    env: {},
    rows: [],
    expect: { accountSid: null, authToken: null, storedWebhookSecret: null },
  },
];

const makeBase44 = (rows) => ({
  asServiceRole: { entities: { IntegrationSecret: { filter: async () => rows } } },
});

for (const scenario of SCENARIOS) {
  test(`resolveTwilioCreds parity — ${scenario.name}`, async () => {
    globalThis.Deno.env.get = (k) => scenario.env[k];
    try {
      for (const [file, fields] of Object.entries(FILES)) {
        const mod = await loadInline(file, ["resolveTwilioCreds"]);
        const got = await mod.resolveTwilioCreds(makeBase44(scenario.rows));
        for (const f of fields) {
          assert.equal(got[f], scenario.expect[f], `${file} field ${f}`);
        }
      }
    } finally {
      globalThis.Deno.env.get = () => undefined;
    }
  });
}

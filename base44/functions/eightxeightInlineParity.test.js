import { test } from "node:test";
import assert from "node:assert/strict";
import { readFile, writeFile, unlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import ts from "typescript";

import * as phoneUtils from "../../src/components/voice/phoneUtils.js";
import * as businessHours from "../../src/components/voice/businessHours.js";
import * as quietHours from "../../src/components/voice/quietHours.js";
import * as urgentKeywords from "../../src/components/voice/urgentKeywords.js";

/**
 * Inline-copy drift guard. The Deno edge functions can't import from src/, so
 * they keep hand-written inline mirrors of the unit-tested helper algorithms.
 * This test loads each function's inline copy (by transpiling the file with the
 * npm import + Deno.serve stubbed out and re-exporting the named helpers) and
 * asserts it behaves IDENTICALLY to the source of truth across a battery of
 * inputs — so a copy can never silently drift.
 */

// Minimal stubs so a transpiled edge function can be imported in Node.
globalThis.Deno = globalThis.Deno || { serve() {}, env: { get: () => undefined } };

async function loadInline(entryPath, names) {
  let src = await readFile(new URL(entryPath, import.meta.url), "utf8");
  // Drop the Deno-only npm import; replace with a no-op stub.
  src = src.replace(/import\s+\{[^}]*\}\s+from\s+'npm:[^']*';?/, "const createClientFromRequest = () => ({});");
  const present = names.filter((n) => new RegExp(`(function|const)\\s+${n}\\b`).test(src));
  const js = ts.transpileModule(src, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ESNext },
  }).outputText;
  const withExports = `${js}\nexport { ${present.join(", ")} };\n`;
  const tmp = join(tmpdir(), `inline_${Date.now()}_${Math.random().toString(36).slice(2)}.mjs`);
  await writeFile(tmp, withExports);
  try {
    return { mod: await import(pathToFileURL(tmp).href), present };
  } finally {
    await unlink(tmp).catch(() => {});
  }
}

const E164_VECTORS = ["2155550100", "(215) 555-0100", "+12155550100", "12155550100", "+44 20 7946 0958", "", "12345", "not a phone", null];

test("inline normalizeE164 matches phoneUtils across backend functions", async () => {
  const files = [
    "./sendSms/entry.ts",
    "./startMaskedCall/entry.ts",
    "./handleEightXEightInboundSms/entry.ts",
    "./handleEightXEightVoiceCall/entry.ts",
    "./provisionNurseWorkNumber/entry.ts",
    "./managePhoneNumberPool/entry.ts",
  ];
  for (const f of files) {
    const { mod, present } = await loadInline(f, ["normalizeE164"]);
    assert.ok(present.includes("normalizeE164"), `${f} should define normalizeE164`);
    for (const v of E164_VECTORS) {
      assert.equal(mod.normalizeE164(v), phoneUtils.normalizeE164(v), `normalizeE164(${JSON.stringify(v)}) drift in ${f}`);
    }
  }
});

test("inline isAgencyOpen matches businessHours (incl. holidays)", async () => {
  const NINE_TO_FIVE = {
    mon: { enabled: true, open: "08:00", close: "17:00" },
    tue: { enabled: true, open: "08:00", close: "17:00" },
    wed: { enabled: true, open: "08:00", close: "17:00" },
    thu: { enabled: true, open: "08:00", close: "17:00" },
    fri: { enabled: true, open: "08:00", close: "17:00" },
    sat: { enabled: false }, sun: { enabled: false },
  };
  const settings = (extra = {}) => ({
    business_hours_enabled: true,
    business_hours_timezone: "America/New_York",
    business_hours: NINE_TO_FIVE,
    ...extra,
  });
  const cases = [
    [settings(), new Date("2026-06-04T13:00:00Z")], // Thu 9am open
    [settings(), new Date("2026-06-04T23:00:00Z")], // Thu 7pm closed
    [settings(), new Date("2026-06-06T16:00:00Z")], // Sat closed
    [settings({ business_hours_holidays: ["2026-06-04"] }), new Date("2026-06-04T13:00:00Z")], // holiday
    [{ business_hours_enabled: false }, new Date("2026-06-04T07:00:00Z")], // not enforced
  ];
  for (const f of ["./handleEightXEightInboundSms/entry.ts", "./handleEightXEightVoiceCall/entry.ts"]) {
    const { mod } = await loadInline(f, ["isAgencyOpen"]);
    for (const [st, now] of cases) {
      assert.equal(mod.isAgencyOpen(st, now), businessHours.isAgencyOpen(st, now), `isAgencyOpen drift in ${f} @ ${now.toISOString()}`);
    }
  }
});

test("inline quietHoursCheck matches quietHours.isWithinQuietHours", async () => {
  const settings = { tcpa_quiet_hours_enabled: true };
  const cases = [
    ["+12155550100", new Date("2026-06-04T20:00:00Z")], // 4pm ET allowed
    ["+12155550100", new Date("2026-06-04T11:30:00Z")], // 7:30am ET blocked
    ["+14155550100", new Date("2026-06-04T11:30:00Z")], // 4:30am PT blocked
    ["+442079460958", new Date("2026-06-04T11:30:00Z")], // unknown → allowed
  ];
  for (const f of ["./sendSms/entry.ts", "./dispatchScheduledSms/entry.ts"]) {
    const { mod } = await loadInline(f, ["quietHoursCheck"]);
    for (const [num, now] of cases) {
      const inline = mod.quietHoursCheck(num, now, settings).allowed;
      const source = quietHours.isWithinQuietHours(num, now, { startHour: 8, endHour: 21 }).allowed;
      assert.equal(inline, source, `quietHoursCheck drift in ${f} for ${num} @ ${now.toISOString()}`);
    }
  }
});

test("inline detectUrgency matches urgentKeywords.detectUrgency", async () => {
  const { mod } = await loadInline("./handleEightXEightInboundSms/entry.ts", ["detectUrgency"]);
  const vectors = ["I have chest pain", "see you at 3pm", "we watched football", "mom had a fall", "", "URGENT help me"];
  for (const v of vectors) {
    assert.equal(mod.detectUrgency(v).urgent, urgentKeywords.detectUrgency(v).urgent, `detectUrgency drift for ${JSON.stringify(v)}`);
  }
});

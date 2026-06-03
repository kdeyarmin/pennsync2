import test from "node:test";
import assert from "node:assert/strict";
import {
  splitSentences,
  extractVitals,
  extractNumbersAndMeasurements,
  extractMedications,
  getSentencesContaining,
} from "./factExtraction.js";

test("splitSentences breaks on punctuation and newlines, stripping bullets", () => {
  const out = splitSentences("• BP 148/90\n- taught meds. Patient stable!");
  assert.deepEqual(out, ["BP 148/90", "taught meds", "Patient stable"]);
});

test("extractVitals parses BP, HR, and O2", () => {
  const v = extractVitals("BP 148/90, HR 82, O2 95% RA");
  assert.equal(v.bp_sys, 148);
  assert.equal(v.bp_dia, 90);
  assert.equal(v.hr, 82);
  assert.equal(v.o2, 95);
});

test("extractNumbersAndMeasurements captures unit-bearing values only", () => {
  const tokens = extractNumbersAndMeasurements("BP 148/90, O2 95%, wound 2x3 cm, gave 500 mg, pain 3/10");
  assert.ok(tokens.includes("148/90"));
  assert.ok(tokens.includes("95%"));
  assert.ok(tokens.includes("2x3cm"));
  assert.ok(tokens.includes("500mg"));
  assert.ok(tokens.includes("3/10"));
});

test("extractNumbersAndMeasurements ignores bare prose counts", () => {
  const tokens = extractNumbersAndMeasurements("seen 2 times this week, 3 children present");
  assert.equal(tokens.length, 0);
});

test("extractMedications finds known medications by canonical name", () => {
  const meds = extractMedications("Patient takes Metformin and Furosemide daily.");
  assert.ok(meds.includes("Metformin"));
  assert.ok(meds.includes("Furosemide"));
});

test("extractMedications returns empty when no known meds present", () => {
  assert.deepEqual(extractMedications("Patient ambulated in the hallway."), []);
});

test("getSentencesContaining returns the matching sentence", () => {
  const hits = getSentencesContaining("Patient stable. Wound to right heel is granulating.", /wound/i);
  assert.equal(hits.length, 1);
  assert.match(hits[0], /right heel/);
});


// ── Regression tests for audit fixes ────────────────────────────────────────

test("getSentencesContaining is deterministic with a global regex (no lastIndex carry-over)", () => {
  const text = "Patient uses a walker. The walker is new. A walker helps mobility. Walker stored at home.";
  // All four sentences mention a walker; a stateful global regex (advancing
  // RegExp.lastIndex across .test() calls) would skip some of them.
  assert.equal(getSentencesContaining(text, /walker/gi).length, 4);
  const re = /walker/gi;
  assert.deepEqual(getSentencesContaining(text, re), getSentencesContaining(text, re));
});

test("getSentencesContaining returns ALL matches with a global-flag pattern", () => {
  const text = "Wound to heel. Dressing changed today. Patient stable. Incision clean. Vitals normal.";
  const hits = getSentencesContaining(text, /wound|dressing|incision/gi);
  // The /g flag must not make .test() stateful and skip matching sentences.
  assert.equal(hits.length, 3);
  assert.ok(hits.some((s) => /Dressing changed today/.test(s)));
  assert.ok(hits.some((s) => /Incision clean/.test(s)));
});

test("extractVitals 't' shorthand does not match the trailing t of other words", () => {
  assert.equal(extractVitals("weight 150").temp, undefined);
  assert.equal(extractVitals("last visit 98.6").temp, undefined);
  assert.equal(extractVitals("T 99.1").temp, 99.1);
});

test("extractVitals does not read a date as a blood pressure", () => {
  const v = extractVitals("follow up 11/20 for recheck");
  assert.equal(v.bp_sys, undefined);
  assert.equal(v.bp_dia, undefined);
});

test("temperature with and without the degree sign normalize to one token", () => {
  const withSign = extractNumbersAndMeasurements("Temperature was 98.6°F");
  const without = extractNumbersAndMeasurements("Temp 98.6 F");
  assert.deepEqual(withSign, without);
});

test("extractMedications does not return case-duplicated canonical names", () => {
  const meds = extractMedications("patient on atorvastatin");
  const lowered = meds.map((m) => m.toLowerCase());
  assert.equal(new Set(lowered).size, lowered.length);
});

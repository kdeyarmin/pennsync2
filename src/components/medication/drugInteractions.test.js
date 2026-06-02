import { test } from "node:test";
import assert from "node:assert/strict";
import { findDeterministicInteractions, mergeInteractions } from "./drugInteractions.js";

test("flags warfarin + ibuprofen as a major bleeding interaction", () => {
  const r = findDeterministicInteractions([{ name: "Warfarin 5mg" }, { name: "Ibuprofen 400mg" }]);
  assert.equal(r.length, 1);
  assert.equal(r[0].severity, "major");
  assert.equal(r[0].source, "deterministic");
  assert.equal(r[0].verified, true);
});

test("flags nitrate + PDE5 as critical/contraindicated", () => {
  const [r] = findDeterministicInteractions([{ name: "Isosorbide mononitrate" }, { name: "sildenafil" }]);
  assert.equal(r.severity, "critical");
  assert.equal(r.interaction_type, "contraindication");
});

test("flags MAOI + SSRI serotonin-syndrome risk (case-insensitive, brand-ish names)", () => {
  const [r] = findDeterministicInteractions([{ medication_name: "PHENELZINE" }, { medication_name: "Sertraline 50 mg" }]);
  assert.equal(r.severity, "critical");
});

test("flags ACE inhibitor + potassium-sparing diuretic (hyperkalemia)", () => {
  const [r] = findDeterministicInteractions([{ name: "lisinopril" }, { name: "spironolactone" }]);
  assert.equal(r.severity, "major");
});

test("flags opioid + benzodiazepine (respiratory depression)", () => {
  const [r] = findDeterministicInteractions([{ name: "oxycodone" }, { name: "alprazolam" }]);
  assert.ok(r.requires_intervention);
});

test("flags warfarin + amiodarone (INR potentiator)", () => {
  const [r] = findDeterministicInteractions([{ name: "Warfarin" }, { name: "amiodarone 200mg" }]);
  assert.equal(r.severity, "major");
});

test("flags simvastatin + gemfibrozil (rhabdomyolysis)", () => {
  const [r] = findDeterministicInteractions([{ name: "simvastatin" }, { name: "gemfibrozil" }]);
  assert.equal(r.severity, "major");
});

test("flags clopidogrel + omeprazole (reduced antiplatelet effect)", () => {
  const [r] = findDeterministicInteractions([{ name: "clopidogrel" }, { name: "omeprazole" }]);
  assert.equal(r.severity, "moderate");
});

test("flags sumatriptan + sertraline (serotonin syndrome risk)", () => {
  const [r] = findDeterministicInteractions([{ name: "sumatriptan" }, { name: "sertraline" }]);
  assert.equal(r.severity, "moderate");
});

test("no false positive for an unrelated pair", () => {
  assert.deepEqual(findDeterministicInteractions([{ name: "acetaminophen" }, { name: "vitamin d" }]), []);
});

test("handles <2 meds and empty/blank input", () => {
  assert.deepEqual(findDeterministicInteractions([{ name: "warfarin" }]), []);
  assert.deepEqual(findDeterministicInteractions([]), []);
  assert.deepEqual(findDeterministicInteractions([{ name: "" }, { name: "  " }]), []);
});

test("mergeInteractions: deterministic wins on the same pair; AI-only tagged unverified", () => {
  const det = [{ drug_a: "Warfarin", drug_b: "Ibuprofen", severity: "major", source: "deterministic", verified: true }];
  const ai = [
    { drug_a: "ibuprofen", drug_b: "warfarin", severity: "moderate" }, // same pair, different order
    { drug_a: "Lisinopril", drug_b: "Metformin", severity: "minor" },  // AI-only
  ];
  const merged = mergeInteractions(ai, det);
  assert.equal(merged.length, 2); // duplicate pair dropped
  const det1 = merged.find((m) => m.source === "deterministic");
  assert.equal(det1.severity, "major");
  const aiOnly = merged.find((m) => m.drug_b === "Metformin");
  assert.equal(aiOnly.verified, false);
  assert.equal(aiOnly.source, "ai_suggested");
});

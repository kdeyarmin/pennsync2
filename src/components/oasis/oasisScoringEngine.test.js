import test from "node:test";
import assert from "node:assert/strict";
import { evaluateOASIS, computeCareScope, SEVERITY_ORDER } from "./oasisScoringEngine.js";

test("a high-severity trigger produces a high-severity suggestion", () => {
  const results = evaluateOASIS({ m1910: 2 }); // fall risk high
  const fall = results.find((r) => r.domain === "Fall Prevention");
  assert.ok(fall);
  assert.equal(fall.severity, "high");
  assert.ok(Array.isArray(fall.interventionIds) && fall.interventionIds.length > 0);
});

test("no matching answers → no suggestions", () => {
  assert.deepEqual(evaluateOASIS({}), []);
  assert.deepEqual(evaluateOASIS({ m1910: 0, m1860: 0 }), []);
});

test("string answers are coerced (parseInt), not ignored", () => {
  const results = evaluateOASIS({ m1910: "2" });
  assert.ok(results.some((r) => r.domain === "Fall Prevention" && r.severity === "high"));
});

test("undefined / null / empty answers are skipped", () => {
  assert.deepEqual(evaluateOASIS({ m1910: undefined, m1860: null, m1900: "" }), []);
});

test("highest severity within a domain wins", () => {
  // m1900 is medium for Fall Prevention; m1910 is high — high should win
  const results = evaluateOASIS({ m1900: 1, m1910: 1 });
  const fall = results.find((r) => r.domain === "Fall Prevention");
  assert.equal(fall.severity, "high");
});

test("results are sorted by severity (high → medium → low)", () => {
  // m1800 (low: Patient Education) + m1910 (high: Fall Prevention)
  const results = evaluateOASIS({ m1800: 1, m1910: 2 });
  const order = results.map((r) => SEVERITY_ORDER[r.severity]);
  for (let i = 1; i < order.length; i++) {
    assert.ok(order[i] >= order[i - 1], "suggestions must be ordered by severity");
  }
});

test("reason reflects the answer values", () => {
  const high = evaluateOASIS({ m1910: 2 }).find((r) => r.domain === "Fall Prevention");
  assert.match(high.reason, /high fall risk/i);
  const moderate = evaluateOASIS({ m1900: 1 }).find((r) => r.domain === "Fall Prevention");
  assert.match(moderate.reason, /moderate/i);
});

// ── computeCareScope ──

test("prognosis (m0069 = 1) → hospice", () => {
  assert.equal(computeCareScope({ m0069: 1 }), "hospice");
  assert.equal(computeCareScope({ m0069: "1" }), "hospice"); // string-coerced
});

test("high ADL deficit (sum >= 6) → both", () => {
  assert.equal(computeCareScope({ m1800: 2, m1810: 2, m1820: 2 }), "both");
});

test("string ADL answers are summed numerically, not concatenated", () => {
  // Regression guard: "3" + "2" + "1" must be 6 (→ "both"), not "321".
  assert.equal(computeCareScope({ m1800: "3", m1810: "2", m1820: "1" }), "both");
});

test("low deficit, non-hospice → home_health", () => {
  assert.equal(computeCareScope({ m1800: 1, m1810: 1 }), "home_health");
  assert.equal(computeCareScope({}), "home_health");
});

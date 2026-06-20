import test from "node:test";
import assert from "node:assert/strict";
import { compareVisits, buildTrendSummary, extractPain } from "./visitComparison.js";

test("extractPain pulls the first N/10 rating", () => {
  assert.equal(extractPain("pain 6/10 at the wound site"), 6);
  assert.equal(extractPain("pain 0/10, comfortable"), 0);
  assert.equal(extractPain("no pain reported"), null);
  assert.equal(extractPain(""), null);
});

test("no comparison without both notes", () => {
  assert.deepEqual(compareVisits("BP 130/80", ""), []);
  assert.deepEqual(compareVisits("", "BP 130/80"), []);
});

test("surfaces a meaningful blood-pressure change", () => {
  const out = compareVisits("BP 132/84, HR 76", "BP 150/92, HR 78");
  const bp = out.find((c) => c.key === "bp");
  assert.ok(bp, "expected a blood pressure row");
  assert.equal(bp.prevStr, "150/92");
  assert.equal(bp.nextStr, "132/84");
  assert.equal(bp.direction, "down");
  // HR changed by only 2 — below minDelta, so it must not be reported.
  assert.equal(out.find((c) => c.key === "hr"), undefined);
});

test("ignores changes below the minimum delta (measurement noise)", () => {
  // O2 96 -> 95 is a 1-point drop, below the 2-point threshold.
  const out = compareVisits("O2 95%", "O2 96%");
  assert.deepEqual(out, []);
});

test("flags a concerning oxygen drop", () => {
  const out = compareVisits("O2 90% on RA", "O2 96% on RA");
  const o2 = out.find((c) => c.key === "o2");
  assert.ok(o2);
  assert.equal(o2.direction, "down");
  assert.equal(o2.concern, true); // fell >=2 and is now <92
});

test("flags a concerning weight gain (possible fluid)", () => {
  const out = compareVisits("weight 188 lbs", "weight 182 lbs");
  const wt = out.find((c) => c.key === "weight");
  assert.ok(wt);
  assert.equal(wt.direction, "up");
  assert.equal(wt.concern, true); // +6 lbs
});

test("reports a pain change with the /10 suffix preserved", () => {
  const out = compareVisits("pain 6/10", "pain 3/10");
  const pain = out.find((c) => c.key === "pain");
  assert.ok(pain);
  assert.equal(pain.prevStr, "3/10");
  assert.equal(pain.nextStr, "6/10");
  assert.equal(pain.concern, true); // rose by >=2
});

test("buildTrendSummary is factual, plain-text, and value-grounded", () => {
  const out = compareVisits("BP 132/84, O2 90%, pain 6/10", "BP 150/92, O2 96%, pain 3/10");
  const summary = buildTrendSummary(out);
  assert.match(summary, /^Compared to the prior documented visit, /);
  assert.match(summary, /blood pressure 150\/92 to 132\/84 mmHg/);
  assert.match(summary, /oxygen saturation 96% to 90%/);
  assert.match(summary, /pain 3\/10 to 6\/10/);
  // Plain text only — no arrows that might render oddly in an EMR.
  assert.ok(!summary.includes("→"));
});

test("buildTrendSummary is empty when nothing changed", () => {
  assert.equal(buildTrendSummary([]), "");
  assert.equal(buildTrendSummary(compareVisits("BP 130/80", "BP 130/80")), "");
});

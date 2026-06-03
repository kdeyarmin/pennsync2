import test from "node:test";
import assert from "node:assert/strict";
import { valueGuard } from "./valueGuard.js";

test("passes when every output value is present in the input", () => {
  const input = "BP 148/90, gave Metformin 500 mg. Wound 2x3 cm.";
  const output = "Blood pressure was 148/90. Administered Metformin 500 mg. The wound measured 2x3 cm.";
  const result = valueGuard(output, input);
  assert.equal(result.ok, true);
  assert.equal(result.unverified.length, 0);
});

test("flags an invented vital that is not in the input", () => {
  const input = "Patient stable, ambulating in hallway.";
  const output = "Patient stable. BP 200/110 noted.";
  const result = valueGuard(output, input);
  assert.equal(result.ok, false);
  assert.ok(result.unverified.some((u) => u.type === "number" && u.value === "200/110"));
});

test("flags an invented medication", () => {
  const input = "Reviewed the medication list with the patient.";
  const output = "Reviewed medications. Started Warfarin.";
  const result = valueGuard(output, input);
  assert.equal(result.ok, false);
  assert.ok(result.unverified.some((u) => u.type === "medication" && /warfarin/i.test(u.value)));
});

test("does not flag prose reordering without new values", () => {
  const input = "Taught the patient about diet. Patient verbalized understanding.";
  const output = "The patient verbalized understanding after being taught about diet.";
  assert.equal(valueGuard(output, input).ok, true);
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  toAuditIssues,
  escalateAuditStatus,
  toAiTags,
  toComplianceIssueStrings,
} from "./reportingFields.js";

const findings = [
  { id: "allergy_aspirin", severity: "critical", category: "Allergy", message: "References Aspirin, in allergies." },
  { id: "med_recon_warfarin", severity: "info", category: "Medication", message: "Warfarin not on chart." },
  { id: "fall_risk", severity: "warning", category: "Safety", message: "High fall risk not addressed." },
];

const trends = [
  { key: "weight", label: "Weight", direction: "up", display: "180 → 184 → 188 lbs" },
  { key: "o2", label: "Oxygen saturation", direction: "down", display: "97% → 95% → 92%" },
];

test("toAuditIssues maps every finding to the structured shape", () => {
  const issues = toAuditIssues(findings);
  assert.equal(issues.length, 3);
  assert.deepEqual(issues[0], {
    element: "Allergy",
    severity: "critical",
    problem: "References Aspirin, in allergies.",
    suggestion: "",
  });
});

test("escalateAuditStatus forces critical when a critical conflict exists", () => {
  assert.equal(escalateAuditStatus("passed", findings), "critical");
});

test("escalateAuditStatus leaves the base status when no critical conflict", () => {
  const noCritical = findings.filter((f) => f.severity !== "critical");
  assert.equal(escalateAuditStatus("passed", noCritical), "passed");
  assert.equal(escalateAuditStatus("flagged", []), "flagged");
});

test("toAiTags builds searchable trend + chart tags, de-duplicated", () => {
  const tags = toAiTags(trends, findings);
  assert.ok(tags.includes("trend:weight:up"));
  assert.ok(tags.includes("trend:o2:down"));
  assert.ok(tags.includes("chart_flag:allergy"));
  assert.ok(tags.includes("chart_flag:medication"));
  assert.ok(tags.includes("chart_flag:safety"));
  assert.equal(tags.length, new Set(tags).size); // no duplicates
});

test("toComplianceIssueStrings includes only critical conflicts", () => {
  const strings = toComplianceIssueStrings(findings);
  assert.deepEqual(strings, ["[Allergy] References Aspirin, in allergies."]);
});

test("all mappers tolerate empty / missing input", () => {
  assert.deepEqual(toAuditIssues(), []);
  assert.deepEqual(toAiTags(), []);
  assert.deepEqual(toComplianceIssueStrings(), []);
  assert.equal(escalateAuditStatus("flagged"), "flagged");
});

import test from "node:test";
import assert from "node:assert/strict";
import {
  ACTIVE_OASIS_SPEC,
  KNOWN_OASIS_SPECS,
  getOasisSpec,
  resolveSpecForDate,
} from "./registry.js";
import { OASIS_E_SPEC } from "./e/index.js";
import {
  ITEM_VERIFICATION,
  VERIFICATION_LEVELS,
  buildClinicalReviewWorksheet,
  classifyItem,
  clinicalReviewStatus,
  describeVerification,
  isClinicallyReviewed,
  isOfficialCmsItem,
  pendingClinicalReview,
  itemDisclaimer,
  officialItemNumber,
} from "./verification.js";

// ── The honesty guarantees ─────────────────────────────────────────────────

test("the spec never claims to contain the authoritative CMS instrument", () => {
  assert.equal(OASIS_E_SPEC.completeness, "partial");
  assert.match(OASIS_E_SPEC.notes, /does not contain the authoritative CMS OASIS instrument/i);
  assert.ok(OASIS_E_SPEC.source, "a source must be named");
  assert.ok(OASIS_E_SPEC.source_url, "a source URL must be named");
  assert.ok(OASIS_E_SPEC.effective_date, "a version needs an effective date");
});

test("every registry entry uses a known verification level", () => {
  for (const [id, entry] of Object.entries(ITEM_VERIFICATION)) {
    assert.ok(VERIFICATION_LEVELS.includes(entry.level), `${id}: unknown level ${entry.level}`);
  }
});

test("a PennSync screening item never carries a CMS item number", () => {
  for (const [id, entry] of Object.entries(ITEM_VERIFICATION)) {
    if (entry.level !== "pennsync_screening") continue;
    assert.equal(entry.official_item, null, `${id} must not claim a CMS item number`);
    assert.ok(entry.pennsync_item, `${id} needs its own PennSync item id`);
    assert.equal(officialItemNumber(id), null, `${id} must not expose a CMS number to the UI`);
    assert.equal(isOfficialCmsItem(id), false);
  }
});

test("the three mislabelled therapy items are recorded as PennSync screening items", () => {
  // The 2026-08-31 audit finding: these carried M2102 / M2110 / M2200 attached
  // to content that does not belong to those CMS items.
  for (const id of ["m2102", "m2110", "m2200"]) {
    const c = classifyItem(id);
    assert.equal(c.level, "pennsync_screening", `${id} must not be presented as a CMS item`);
    assert.equal(c.officialItem, null);
    assert.match(c.note, /Not a CMS OASIS item/i);
  }
});

test("an abbreviated response set is labelled as abbreviated, not as the official set", () => {
  const c = classifyItem("m1030");
  assert.equal(c.level, "abbreviated");
  assert.equal(c.officialItem, "M1030");
  assert.match(itemDisclaimer("m1030"), /abbreviated and may not match the official CMS response set/i);
});

test("an unregistered item fails closed to unverified", () => {
  const c = classifyItem("m9999");
  assert.equal(c.level, "unverified", "a new item must not default to verified");
  assert.equal(c.officialItem, "M9999");
  assert.match(c.note, /has not verified/i);
});

test("classification is case-insensitive and safe on junk input", () => {
  assert.equal(classifyItem("M2102").level, "pennsync_screening");
  assert.equal(classifyItem("").level, "unverified");
  assert.equal(classifyItem(null).level, "unverified");
  assert.equal(classifyItem(undefined).officialItem, null);
});

// ── Disclaimers ────────────────────────────────────────────────────────────

test("every disclaimer points the nurse back to the EMR and never claims submission", () => {
  for (const id of ["m1800", "m1030", "m9999", "m2102"]) {
    const text = itemDisclaimer(id);
    assert.match(text, /EMR/, `${id}: must direct the nurse to the EMR`);
    assert.ok(!/submit|iqies|official submission/i.test(text), `${id}: must not imply submission`);
  }
});

test("a verified item still asks the clinician to confirm against their own assessment", () => {
  assert.match(itemDisclaimer("m1800"), /Review this against your patient assessment/i);
});

test("verification badges are described in text, never by colour alone", () => {
  for (const id of ["m1800", "m1030", "m9999", "m2102"]) {
    const badge = describeVerification(id);
    assert.ok(badge.label, `${id} needs a text label`);
    assert.ok(badge.tone, `${id} needs a tone`);
  }
  assert.equal(describeVerification("m2102").label, "PennSync screening item");
});

// ── Version resolution ─────────────────────────────────────────────────────

test("the active spec is a member of the known set", () => {
  assert.ok(KNOWN_OASIS_SPECS.includes(ACTIVE_OASIS_SPEC));
  assert.equal(getOasisSpec(ACTIVE_OASIS_SPEC.id), ACTIVE_OASIS_SPEC);
  assert.equal(getOasisSpec("oasis-z"), null);
});

test("an assessment date inside a version's window resolves to that version", () => {
  assert.equal(resolveSpecForDate("2026-08-31").id, "oasis-e");
  assert.equal(resolveSpecForDate(new Date("2023-01-01")).id, "oasis-e");
});

test("a date before every known version resolves to null rather than guessing", () => {
  // PennSync must not apply OASIS-E definitions to an assessment completed under
  // an instrument it does not hold.
  assert.equal(resolveSpecForDate("2019-05-01"), null);
});

test("an unparseable date falls back to the active spec rather than throwing", () => {
  assert.equal(resolveSpecForDate("not-a-date").id, ACTIVE_OASIS_SPEC.id);
  assert.equal(resolveSpecForDate(null).id, ACTIVE_OASIS_SPEC.id);
});

// ── Clinical sign-off ──────────────────────────────────────────────────────

test("no item ships pre-signed — a classification is not a sign-off", () => {
  // The classifications were derived from internal evidence and the app's own
  // scale table, not from a qualified reviewer reading the CMS instrument. The
  // product must not imply otherwise.
  for (const [id, entry] of Object.entries(ITEM_VERIFICATION)) {
    assert.equal(entry.reviewed_by, "", `${id} must not claim a reviewer nobody named`);
    assert.equal(isClinicallyReviewed(id), false, `${id} must report as unreviewed`);
  }
});

test("review provenance travels with the classification", () => {
  const c = classifyItem("m1800");
  assert.equal(c.clinicallyReviewed, false);
  assert.equal(c.reviewedBy, "");
  assert.match(c.reviewSource, /canonical scale table/i, "the app's own source is named honestly");
});

test("an unregistered item is reported as unreviewed, not silently omitted", () => {
  const c = classifyItem("m9999");
  assert.equal(c.clinicallyReviewed, false);
  assert.equal(c.reviewSource, "");
});

test("the three demoted items carry the evidence behind the demotion", () => {
  assert.match(classifyItem("m2102").evidence, /AIProactiveOASISAssistant\.jsx:138/);
  assert.match(classifyItem("m2200").evidence, /discontinued under PDGM/i);
  // Where PennSync did NOT independently confirm, it says so rather than implying it did.
  assert.match(classifyItem("m2110").evidence, /Not independently confirmed/i);
});

test("pendingClinicalReview lists every unreviewed item, worst classification first", () => {
  const pending = pendingClinicalReview();
  assert.equal(pending.length, Object.keys(ITEM_VERIFICATION).length, "nothing is signed off yet");
  const levels = pending.map((p) => p.level);
  assert.ok(
    levels.indexOf("verified") < levels.indexOf("pennsync_screening"),
    "ordering follows VERIFICATION_LEVELS",
  );
});

test("pendingClinicalReview includes an unregistered item when the caller scopes it", () => {
  const pending = pendingClinicalReview(["m1800", "m9999"]);
  assert.deepEqual(pending.map((p) => p.id).sort(), ["m1800", "m9999"]);
});

test("the review status statement names the gap in plain language", () => {
  const status = clinicalReviewStatus();
  assert.equal(status.complete, false);
  assert.equal(status.reviewed, 0);
  assert.equal(status.pending, status.total);
  assert.match(status.statement, /have not been\s+reviewed by a qualified OASIS reviewer/i);
  assert.match(status.statement, /Confirm item wording and response sets in your EMR/i);
});

test("the worksheet states PennSync lacks the CMS instrument and never pre-fills a conclusion", () => {
  const sheet = buildClinicalReviewWorksheet(
    [{ id: "m2102", label: "Physical therapy need (PennSync screening item)" }],
    { generatedAt: "2026-09-01" },
  );
  assert.match(sheet, /does \*\*not\*\* contain the authoritative CMS OASIS instrument/i);
  assert.match(sheet, /Reviewer: correct\?/);
  assert.match(sheet, /Reviewer: CMS source/);
  // The reviewer's own columns must arrive blank.
  const row = sheet.split("\n").find((l) => l.includes("`m2102`"));
  assert.ok(row, "the item must appear as a row");
  const cells = row.split("|").map((c) => c.trim());
  assert.equal(cells[cells.length - 2], "", "the initials/date cell arrives blank");
  assert.match(sheet, /1 of 1 items await sign-off/);
});

test("the worksheet shows a PennSync screening item with no CMS item number", () => {
  const sheet = buildClinicalReviewWorksheet([{ id: "m2102", label: "PT need" }]);
  const row = sheet.split("\n").find((l) => l.includes("`m2102`"));
  assert.match(row, /—\s*\(none\)/, "a screening item must not display an M-number");
});

test("a pipe in a label cannot break the worksheet table", () => {
  const sheet = buildClinicalReviewWorksheet([{ id: "m1800", label: "Grooming | upper body" }]);
  const row = sheet.split("\n").find((l) => l.includes("`m1800`"));
  assert.match(row, /Grooming \\\| upper body/);
});

test("the worksheet is deterministic and safe on empty input", () => {
  const a = buildClinicalReviewWorksheet([{ id: "m1800" }], { generatedAt: "2026-09-01" });
  const b = buildClinicalReviewWorksheet([{ id: "m1800" }], { generatedAt: "2026-09-01" });
  assert.equal(a, b);
  assert.doesNotThrow(() => buildClinicalReviewWorksheet([]));
  assert.doesNotThrow(() => buildClinicalReviewWorksheet(null));
});

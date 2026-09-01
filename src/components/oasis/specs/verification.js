// Per-item verification registry for PennSync's internal OASIS screening set.
//
// THE PROBLEM THIS SOLVES
// An audit of `oasisQuestions.jsx` on 2026-08-31 found items presenting official
// CMS item numbers with content that does not belong to those items, and items
// whose response lists are shortened versions of the official response sets. A
// nurse reading "M2200 — Speech-Language Pathology" could carry that item number
// into the official assessment. The repository even contradicted itself:
// `AIProactiveOASISAssistant.jsx` describes M2102 as "Types and Sources of
// Assistance" while `oasisQuestions.jsx` labelled it "Physical Therapy".
//
// THE FIX, AND WHAT IT DELIBERATELY IS NOT
// PennSync does not hold the authoritative CMS instrument, so this registry does
// NOT invent correct titles or response sets — that would replace one fabrication
// with another. It records, per item, WHAT PENNSYNC KNOWS:
//
//   verified            — title and response set confirmed against a CMS source.
//   abbreviated         — a real CMS item, but PennSync's response list is a
//                         SHORTENED screening version. Usable to prompt a review;
//                         never usable as the official response set.
//   unverified          — a real CMS item number whose PennSync wording has not
//                         been confirmed against a CMS source.
//   pennsync_screening  — NOT a CMS item. A PennSync-internal screening question.
//                         It must never display an official item number.
//
// Nothing here is graded by an LLM. The classification is data and the UI
// consequences are deterministic.
//
// CLINICAL SIGN-OFF IS TRACKED, NOT ASSUMED
// A classification is only as good as the person who made it. Every entry
// therefore carries its own review provenance:
//
//   reviewed_by     — who confirmed it ("" = nobody yet)
//   reviewed_at     — when (ISO date, "" = never)
//   review_source   — what authoritative document was checked against
//
// An entry with no `reviewed_by` has been CLASSIFIED but not SIGNED OFF, and
// `pendingClinicalReview()` lists exactly those. This matters because the
// classifications shipped in this file were derived from internal evidence (the
// repository contradicting itself on M2102, PDGM discontinuing M2200) and from
// the app's own canonical scale table — not from a qualified OASIS reviewer
// reading the CMS instrument. Until one does, the product must be able to say
// so, and `buildClinicalReviewWorksheet()` produces the artifact they need.

import { ACTIVE_OASIS_SPEC } from "./registry.js";

/** @type {ReadonlyArray<string>} */
export const VERIFICATION_LEVELS = Object.freeze([
  "verified",
  "abbreviated",
  "unverified",
  "pennsync_screening",
]);

/**
 * The registry. Keyed by the internal item id used in `oasisQuestions.jsx`.
 *
 * `official_item` is the CMS item number PennSync may display. It is null for a
 * PennSync screening item — the whole point of the classification.
 */
export const ITEM_VERIFICATION = Object.freeze({
  // ── PennSync screening items ────────────────────────────────────────────
  // These three carried CMS item numbers attached to content that does not
  // belong to them. M2102/M2110 are assistance items in the CMS instrument
  // (this repo says so itself in AIProactiveOASISAssistant.jsx), and M2200
  // (Therapy Need) was discontinued under PDGM. Rather than invent the correct
  // CMS content, PennSync keeps the useful screening question and drops the
  // false item-number attribution entirely.
  m2102: {
    level: "pennsync_screening",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",
    official_item: null,
    pennsync_item: "PS-THERAPY-PT",
    evidence: "src/components/oasis/AIProactiveOASISAssistant.jsx:138 describes M2102 as "
      + "\"Types and Sources of Assistance\", contradicting the item bank's \"Physical Therapy\" label.",
    note:
      "Not a CMS OASIS item. Previously mislabelled as M2102, which is an assistance item in "
      + "the CMS instrument, not a physical-therapy need question. Kept as a PennSync screening "
      + "question; enter therapy need on the official assessment in your EMR.",
  },
  m2110: {
    level: "pennsync_screening",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",
    official_item: null,
    pennsync_item: "PS-THERAPY-OT",
    evidence: "M2110 is an assistance item in the CMS instrument, not an occupational-therapy "
      + "need question. Not independently confirmed against a CMS source by PennSync.",
    note:
      "Not a CMS OASIS item. Previously mislabelled as M2110, which is an assistance item in "
      + "the CMS instrument, not an occupational-therapy need question.",
  },
  m2200: {
    level: "pennsync_screening",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",
    official_item: null,
    pennsync_item: "PS-THERAPY-SLP",
    evidence: "M2200 (Therapy Need) was discontinued under PDGM. Not independently confirmed "
      + "against a CMS source by PennSync.",
    note:
      "Not a CMS OASIS item. Previously mislabelled as M2200 (Therapy Need), which was "
      + "discontinued under PDGM and is not a speech-language-pathology need question.",
  },

  // ── Abbreviated response sets ───────────────────────────────────────────
  // Real CMS items, but PennSync's response list is a shortened screening
  // version. Safe to prompt a review; never a substitute for the official set.
  m1020: {
    level: "abbreviated",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",
    official_item: "M1020",
    note:
      "PennSync offers a short diagnosis picklist. The official item records an ICD-10 "
      + "diagnosis code — enter it on the assessment in your EMR.",
  },
  m1030: {
    level: "abbreviated",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",
    official_item: "M1030",
    note: "PennSync's therapy list is abbreviated and does not reproduce the official response set.",
  },
  m1100: {
    level: "abbreviated",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",
    official_item: "M1100",
    note:
      "PennSync offers a shortened living-situation list. The official item has a larger "
      + "residence-by-assistance response set.",
  },
  m2420: {
    level: "abbreviated",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",
    official_item: "M2420",
    note:
      "PennSync's discharge-disposition list is abbreviated and does not reproduce the official "
      + "response set. Confirm the disposition response in your EMR.",
  },

  // ── Verified against the app's own canonical scales ─────────────────────
  // The functional and pain items are the ones PennSync scores against, and
  // their response counts are asserted by oasisScales.spec.js against the
  // canonical scale table used throughout the app.
  m1800: {
    level: "verified",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "src/components/oasis/oasisScales.js (app canonical scale table)",
    official_item: "M1800",
  },
  m1810: {
    level: "verified",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "src/components/oasis/oasisScales.js (app canonical scale table)",
    official_item: "M1810",
  },
  m1820: {
    level: "verified",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "src/components/oasis/oasisScales.js (app canonical scale table)",
    official_item: "M1820",
  },
  m1830: {
    level: "verified",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "src/components/oasis/oasisScales.js (app canonical scale table)",
    official_item: "M1830",
  },
  m1840: {
    level: "verified",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "src/components/oasis/oasisScales.js (app canonical scale table)",
    official_item: "M1840",
  },
  m1845: {
    level: "verified",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "src/components/oasis/oasisScales.js (app canonical scale table)",
    official_item: "M1845",
  },
  m1850: {
    level: "verified",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "src/components/oasis/oasisScales.js (app canonical scale table)",
    official_item: "M1850",
  },
  m1860: {
    level: "verified",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "src/components/oasis/oasisScales.js (app canonical scale table)",
    official_item: "M1860",
  },
  m1870: {
    level: "verified",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "src/components/oasis/oasisScales.js (app canonical scale table)",
    official_item: "M1870",
  },
  m1242: {
    level: "verified",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "src/components/oasis/oasisScales.js (app canonical scale table)",
    official_item: "M1242",
  },
});

/**
 * Classification for an item id. Anything not in the registry is treated as
 * `unverified` — fail-closed, so a newly added item cannot present itself as
 * confirmed CMS content simply by being absent from the table.
 *
 * @param {string} itemId
 */
export function classifyItem(itemId) {
  const key = String(itemId || "").toLowerCase();
  const entry = ITEM_VERIFICATION[key];
  if (entry) {
    return {
      id: key,
      level: entry.level,
      officialItem: entry.official_item ?? null,
      pennsyncItem: entry.pennsync_item ?? null,
      note: entry.note || "",
      evidence: entry.evidence || "",
      // Review provenance travels with the classification so no caller can
      // present a classification as signed off when nobody has signed it off.
      reviewedBy: entry.reviewed_by || "",
      reviewedAt: entry.reviewed_at || "",
      reviewSource: entry.review_source || "",
      clinicallyReviewed: !!entry.reviewed_by,
      spec: ACTIVE_OASIS_SPEC.id,
    };
  }
  return {
    id: key,
    level: "unverified",
    evidence: "",
    reviewedBy: "",
    reviewedAt: "",
    reviewSource: "",
    clinicallyReviewed: false,
    // An unregistered item may still be a genuine CMS item; PennSync just has
    // not confirmed its wording. The item number is derived from the id rather
    // than asserted as verified.
    officialItem: /^m\d{4}$/.test(key) ? key.toUpperCase() : null,
    pennsyncItem: null,
    note: "PennSync has not verified this item's wording or response set against a CMS source.",
    spec: ACTIVE_OASIS_SPEC.id,
  };
}

/** True only when PennSync may present the item as an official CMS item. */
export function isOfficialCmsItem(itemId) {
  return classifyItem(itemId).level !== "pennsync_screening";
}

/**
 * The item number a screen may display, or null.
 * A PennSync screening item returns null — it must never wear a CMS number.
 */
export function officialItemNumber(itemId) {
  const c = classifyItem(itemId);
  return c.level === "pennsync_screening" ? null : c.officialItem;
}

const DISCLAIMERS = {
  verified:
    "Review this against your patient assessment and enter the response on the official "
    + "assessment in your EMR.",
  abbreviated:
    "PennSync's response list for this item is abbreviated and may not match the official CMS "
    + "response set. Confirm the wording and response in your EMR.",
  unverified:
    "PennSync has not verified this item's wording or response set against a CMS source. "
    + "Confirm both in your EMR before entering a response.",
  pennsync_screening:
    "PennSync screening question — not an official CMS OASIS item. Use it to prompt review; "
    + "enter official responses in your EMR.",
};

/** The deterministic caveat a screen must show for an item. */
export function itemDisclaimer(itemId) {
  return DISCLAIMERS[classifyItem(itemId).level] || DISCLAIMERS.unverified;
}

/** Short human label for the classification, for a badge. */
export function describeVerification(itemId) {
  const level = classifyItem(itemId).level;
  return {
    verified: { label: "Verified item", tone: "success" },
    abbreviated: { label: "Abbreviated response set", tone: "warning" },
    unverified: { label: "Unverified wording", tone: "warning" },
    pennsync_screening: { label: "PennSync screening item", tone: "info" },
  }[level];
}

// ── Clinical sign-off ──────────────────────────────────────────────────────
// The classifications above were derived from internal evidence and from the
// app's own canonical scale table — not from a qualified OASIS reviewer reading
// the CMS instrument. These helpers make that gap visible and closable rather
// than leaving it in a document nobody opens.

/** True only when a named human has signed the item's classification off. */
export function isClinicallyReviewed(itemId) {
  return classifyItem(itemId).clinicallyReviewed;
}

/**
 * Every registry item awaiting clinical sign-off.
 *
 * `itemIds` optionally scopes the check to a caller's own item bank, so an item
 * NOT in the registry is reported too — an unregistered item is `unverified` and
 * therefore the most in need of review, and would otherwise be invisible here.
 *
 * @param {string[]} [itemIds]
 * @returns {Array<{ id: string, level: string, officialItem: string|null, note: string }>}
 */
export function pendingClinicalReview(itemIds) {
  const ids = Array.isArray(itemIds) && itemIds.length
    ? [...new Set(itemIds.map((i) => String(i || "").toLowerCase()).filter(Boolean))]
    : Object.keys(ITEM_VERIFICATION);
  return ids
    .map(classifyItem)
    .filter((c) => !c.clinicallyReviewed)
    .sort((a, b) => VERIFICATION_LEVELS.indexOf(a.level) - VERIFICATION_LEVELS.indexOf(b.level)
      || a.id.localeCompare(b.id));
}

/**
 * Summary for a status surface.
 * @param {string[]} [itemIds]
 */
export function clinicalReviewStatus(itemIds) {
  const ids = Array.isArray(itemIds) && itemIds.length
    ? [...new Set(itemIds.map((i) => String(i || "").toLowerCase()).filter(Boolean))]
    : Object.keys(ITEM_VERIFICATION);
  const pending = pendingClinicalReview(ids);
  return {
    total: ids.length,
    pending: pending.length,
    reviewed: ids.length - pending.length,
    // The one sentence a screen must be able to show.
    statement: pending.length === 0
      ? "Every OASIS item in PennSync's internal set has been signed off by a named reviewer."
      : `${pending.length} of ${ids.length} OASIS items in PennSync's internal set have not been `
        + "reviewed by a qualified OASIS reviewer. Confirm item wording and response sets in your EMR.",
    complete: pending.length === 0,
  };
}

/**
 * Build the worksheet a qualified OASIS reviewer fills in.
 *
 * Deterministic Markdown so it can be committed, diffed and re-generated. Each
 * row states what PennSync currently claims, the evidence behind it (where there
 * is any), and leaves the reviewer's confirmation and CMS citation blank —
 * PennSync must not pre-fill a conclusion it wants.
 *
 * @param {Array<{ id: string, label?: string }>} items the caller's item bank
 * @param {{ specLabel?: string, generatedAt?: string }} [options]
 * @returns {string} Markdown
 */
export function buildClinicalReviewWorksheet(items, { specLabel = ACTIVE_OASIS_SPEC.label, generatedAt = "" } = {}) {
  const rows = (Array.isArray(items) ? items : [])
    .filter((i) => i && i.id)
    .map((i) => ({ ...classifyItem(i.id), label: i.label || "" }));

  const header = [
    `# PennSync OASIS item review worksheet (${specLabel})`,
    "",
    generatedAt ? `Generated: ${generatedAt}` : "",
    "",
    "PennSync does **not** contain the authoritative CMS OASIS instrument. The",
    "classifications below were derived from internal evidence and from the app's own",
    "canonical scale table, **not** from a qualified reviewer reading the CMS manual.",
    "",
    "For each row, confirm or correct PennSync's classification and cite the CMS source",
    "you checked. Leave a row blank if you did not review it — an unreviewed row is a",
    "more useful record than a guessed one.",
    "",
    "Classification key:",
    "",
    "- `verified` — title and response set confirmed against a CMS source",
    "- `abbreviated` — a real CMS item whose PennSync response list is shortened",
    "- `unverified` — a real CMS item number whose PennSync wording is unconfirmed",
    "- `pennsync_screening` — not a CMS item; must never display an item number",
    "",
    "| PennSync id | Item number shown | PennSync label | Current classification | PennSync's evidence | Reviewer: correct? | Reviewer: CMS source | Reviewer initials / date |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
  ].filter((line, i, arr) => !(line === "" && arr[i - 1] === "")).join("\n");

  const body = rows.map((r) => [
    "",
    `\`${r.id}\``,
    r.officialItem || "— (none)",
    (r.label || "").replace(/\|/g, "\\|"),
    `\`${r.level}\``,
    (r.evidence || r.note || "—").replace(/\|/g, "\\|"),
    r.clinicallyReviewed ? `Confirmed by ${r.reviewedBy}` : " ",
    r.reviewSource ? r.reviewSource.replace(/\|/g, "\\|") : " ",
    r.clinicallyReviewed ? r.reviewedAt : " ",
    "",
  ].join(" | ").trim()).join("\n");

  const pending = rows.filter((r) => !r.clinicallyReviewed).length;
  const footer = [
    "",
    `**${pending} of ${rows.length} items await sign-off.**`,
    "",
    "Record each confirmation in `src/components/oasis/specs/verification.js`",
    "(`reviewed_by`, `reviewed_at`, `review_source`) so the product can report its own",
    "review state rather than relying on this document.",
  ].join("\n");

  return `${header}\n${body}\n${footer}\n`;
}

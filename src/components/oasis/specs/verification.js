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
// Nothing here is graded by an LLM. The classification is data, reviewed by a
// human, and the UI consequences are deterministic.

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
    official_item: null,
    pennsync_item: "PS-THERAPY-PT",
    note:
      "Not a CMS OASIS item. Previously mislabelled as M2102, which is an assistance item in "
      + "the CMS instrument, not a physical-therapy need question. Kept as a PennSync screening "
      + "question; enter therapy need on the official assessment in your EMR.",
  },
  m2110: {
    level: "pennsync_screening",
    official_item: null,
    pennsync_item: "PS-THERAPY-OT",
    note:
      "Not a CMS OASIS item. Previously mislabelled as M2110, which is an assistance item in "
      + "the CMS instrument, not an occupational-therapy need question.",
  },
  m2200: {
    level: "pennsync_screening",
    official_item: null,
    pennsync_item: "PS-THERAPY-SLP",
    note:
      "Not a CMS OASIS item. Previously mislabelled as M2200 (Therapy Need), which was "
      + "discontinued under PDGM and is not a speech-language-pathology need question.",
  },

  // ── Abbreviated response sets ───────────────────────────────────────────
  // Real CMS items, but PennSync's response list is a shortened screening
  // version. Safe to prompt a review; never a substitute for the official set.
  m1020: {
    level: "abbreviated",
    official_item: "M1020",
    note:
      "PennSync offers a short diagnosis picklist. The official item records an ICD-10 "
      + "diagnosis code — enter it on the assessment in your EMR.",
  },
  m1030: {
    level: "abbreviated",
    official_item: "M1030",
    note: "PennSync's therapy list is abbreviated and does not reproduce the official response set.",
  },
  m1100: {
    level: "abbreviated",
    official_item: "M1100",
    note:
      "PennSync offers a shortened living-situation list. The official item has a larger "
      + "residence-by-assistance response set.",
  },
  m2420: {
    level: "abbreviated",
    official_item: "M2420",
    note:
      "PennSync's discharge-disposition list is abbreviated and does not reproduce the official "
      + "response set. Confirm the disposition response in your EMR.",
  },

  // ── Verified against the app's own canonical scales ─────────────────────
  // The functional and pain items are the ones PennSync scores against, and
  // their response counts are asserted by oasisScales.spec.js against the
  // canonical scale table used throughout the app.
  m1800: { level: "verified", official_item: "M1800" },
  m1810: { level: "verified", official_item: "M1810" },
  m1820: { level: "verified", official_item: "M1820" },
  m1830: { level: "verified", official_item: "M1830" },
  m1840: { level: "verified", official_item: "M1840" },
  m1845: { level: "verified", official_item: "M1845" },
  m1850: { level: "verified", official_item: "M1850" },
  m1860: { level: "verified", official_item: "M1860" },
  m1870: { level: "verified", official_item: "M1870" },
  m1242: { level: "verified", official_item: "M1242" },
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
      spec: ACTIVE_OASIS_SPEC.id,
    };
  }
  return {
    id: key,
    level: "unverified",
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

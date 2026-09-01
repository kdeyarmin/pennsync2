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
// SOURCE CHECK (2026-09-01) — WHAT IT FOUND
// The item numbers below were checked against the published CMS manuals:
//   OASIS-E  (Updated 01/01/2024) https://www.cms.gov/files/document/oasis-emanual2024-update.pdf
//   OASIS-E1 (Effective 01/01/2025) https://www.cms.gov/files/document/draft-oasis-e1-manual-04-28-2024.pdf
//   OASIS-E2 (Effective 04/01/2026) https://www.cms.gov/files/document/oasis-e2-draft-508-11-14-25.pdf
//
// It found considerably more wrong than the three therapy items already demoted:
//   - FIVE item numbers appear in NO manual at all: M1020, M1300, M1350, M1900,
//     M2110. Primary Diagnosis is M1021 (M1023 is Other Diagnoses); Prior
//     Functioning is GG0100.
//   - FOUR were real but are retired from the current instrument: M1030, M1242,
//     M1730 ("Depression Screening — Removed"), M1910 ("Falls Risk Assessment
//     — Removed"). Depression is now D0150/D0160; falls are J1800/J1900; pain
//     is J0510/J0520/J0530.
//   - M2200 (Therapy Need) was removed per CMS-1780-F, confirming the earlier
//     demotion.
//   - M0069 was "Gender", NOT "Prognosis" as PennSync labelled it, and is
//     replaced by A0810 Sex in OASIS-E2. Wrong meaning AND retired.
//
// THREE DIFFERENT QUESTIONS, DELIBERATELY SEPARATE
//   source_verified_*        — FACTUAL: does this item number exist in the
//                              current CMS manual, and what is its title?
//                              A lookup. DONE (2026-09-01).
//   classification_signed_*  — Is the LEVEL below (verified / retired /
//                              not_a_cms_item / …) the right one, given that
//                              source check? A determination that follows from
//                              the evidence. SIGNED OFF — see below.
//   reviewed_by/at           — CLINICAL: is PennSync's *use* of this item
//                              appropriate, and is an abbreviated response set
//                              safe as a screening prompt? A judgement about
//                              patient care. NOT done, and not mine to make.
//
// WHY THE THIRD ONE STAYS EMPTY
// `reviewed_by` in a clinical compliance record means a qualified human
// confirmed this. Writing anything there on the strength of an automated check
// would make the product assert something untrue to a future auditor — the exact
// failure this whole layer exists to prevent. The classification sign-off is
// real and is recorded; the clinical one is not, and its absence is the honest
// state, not an omission.
//
// RESPONSE SETS ARE NOT VERIFIED. The source check confirmed item numbers and
// TITLES. The CMS manual states response codes as prose coding instructions
// rather than a parseable enumeration, so PennSync's response OPTIONS for an
// item remain unconfirmed even where the item itself is `verified`.
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
  // Was a real CMS item, but is NOT in the instrument currently in effect.
  // Distinct from `not_a_cms_item`: a nurse may legitimately remember it.
  "retired",
  // The item number appears in NO published CMS manual that PennSync checked.
  "not_a_cms_item",
  // Not a CMS item and never claimed to be — a PennSync-authored question.
  "pennsync_screening",
]);

/**
 * The registry. Keyed by the internal item id used in `oasisQuestions.jsx`.
 *
 * `official_item` is the CMS item number PennSync may display. It is null for a
 * PennSync screening item — the whole point of the classification.
 */
export const ITEM_VERIFICATION = Object.freeze({
  // -- Item numbers that appear in NO published CMS manual -----------------
  m1020: {
    level: "not_a_cms_item",
    official_item: null,
    note:
      "This item number appears in no published CMS OASIS manual PennSync checked (E, E1, E2). Primary Diagnosis is M1021 in every manual checked (M1023 is Other Diagnoses).",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },
  m1300: {
    level: "not_a_cms_item",
    official_item: null,
    note:
      "This item number appears in no published CMS OASIS manual PennSync checked (E, E1, E2).",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },
  m1350: {
    level: "not_a_cms_item",
    official_item: null,
    note:
      "This item number appears in no published CMS OASIS manual PennSync checked (E, E1, E2).",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },
  m1900: {
    level: "not_a_cms_item",
    official_item: null,
    note:
      "This item number appears in no published CMS OASIS manual PennSync checked (E, E1, E2). Prior Functioning is GG0100.",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },

  // -- Real CMS items, retired from the instrument now in effect -----------
  m1030: {
    level: "retired",
    official_item: null,
    former_item: "M1030",
    official_title: "Therapies the patient receives at home",
    note:
      "Retired from the OASIS instrument currently in effect. Present in OASIS-E; absent from E1 and E2. "
      + "Do not enter this on the official assessment; PennSync keeps the question only as an "
      + "internal screening prompt.",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },
  m1242: {
    level: "retired",
    official_item: null,
    former_item: "M1242",
    official_title: "Frequency of Pain Interfering with activity or movement",
    note:
      "Retired from the OASIS instrument currently in effect. Present in OASIS-E; absent from E1 and E2. Pain is now J0510/J0520/J0530. "
      + "Do not enter this on the official assessment; PennSync keeps the question only as an "
      + "internal screening prompt.",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },
  m1730: {
    level: "retired",
    official_item: null,
    former_item: "M1730",
    official_title: "Depression Screening",
    note:
      "Retired from the OASIS instrument currently in effect. The OASIS-E manual lists this item as Removed; absent from E1 and E2. Depression is now D0150/D0160 (PHQ). "
      + "Do not enter this on the official assessment; PennSync keeps the question only as an "
      + "internal screening prompt.",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },
  m1910: {
    level: "retired",
    official_item: null,
    former_item: "M1910",
    official_title: "Falls Risk Assessment",
    note:
      "Retired from the OASIS instrument currently in effect. The OASIS-E manual lists this item as Removed; absent from E1 and E2. Falls are now J1800/J1900. "
      + "Do not enter this on the official assessment; PennSync keeps the question only as an "
      + "internal screening prompt.",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },
  m0069: {
    level: "retired",
    official_item: null,
    former_item: "M0069",
    official_title: "Gender",
    note:
      "Retired from the OASIS instrument currently in effect. Replaced by A0810 Sex in OASIS-E2 (Appendix D, Table D1). PennSync labelled it Prognosis, which was never its meaning. "
      + "Do not enter this on the official assessment; PennSync keeps the question only as an "
      + "internal screening prompt.",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },

  // -- PennSync screening questions (never CMS items) ----------------------
  m2102: {
    level: "pennsync_screening",
    official_item: null,
    pennsync_item: "PS-THERAPY-PT",
    note:
      "Not a CMS OASIS item. Previously mislabelled as M2102 - the source check confirms M2102 is Types and Sources of Assistance, not a physical-therapy need question.",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },
  m2110: {
    level: "pennsync_screening",
    official_item: null,
    pennsync_item: "PS-THERAPY-OT",
    note:
      "Not a CMS OASIS item. M2110 appears in none of OASIS-E, E1 or E2.",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },
  m2200: {
    level: "pennsync_screening",
    official_item: null,
    pennsync_item: "PS-THERAPY-SLP",
    note:
      "Not a CMS OASIS item. M2200 was Therapy Need and was removed per CMS-1780-F (OASIS-E2 Chapter 1: two items are removed, M0110 and M2200).",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },

  // -- Current CMS item whose response list PennSync abbreviates -----------
  m2420: {
    level: "abbreviated",
    official_item: "M2420",
    official_title: "Discharge Disposition",
    note:
      "A current CMS item, but PennSync's response list is a shortened screening version "
      + "and does not reproduce the official response set. Confirm the disposition response in your EMR.",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },

  // -- Item number and title confirmed against the current CMS manual ------
  m1100: {
    level: "verified",
    official_item: "M1100",
    official_title: "Patient Living Situation",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },
  m1740: {
    level: "verified",
    official_item: "M1740",
    official_title: "Cognitive, behavioral, and psychiatric symptoms",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },
  m1700: {
    level: "verified",
    official_item: "M1700",
    official_title: "Cognitive Functioning",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },
  m1400: {
    level: "verified",
    official_item: "M1400",
    official_title: "When is the patient dyspneic or noticeably Short of Breath?",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },
  m1340: {
    level: "verified",
    official_item: "M1340",
    official_title: "Does this patient have a Surgical Wound?",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },
  m1306: {
    level: "verified",
    official_item: "M1306",
    official_title: "Unhealed Pressure Ulcer/Injury at Stage 2 or Higher",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },
  m1800: {
    level: "verified",
    official_item: "M1800",
    official_title: "Grooming",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },
  m1810: {
    level: "verified",
    official_item: "M1810",
    official_title: "Current Ability to Dress Upper Body",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },
  m1820: {
    level: "verified",
    official_item: "M1820",
    official_title: "Current Ability to Dress Lower Body",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },
  m2001: {
    level: "verified",
    official_item: "M2001",
    official_title: "Drug Regimen Review",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },
  m2010: {
    level: "verified",
    official_item: "M2010",
    official_title: "Patient/Caregiver High-Risk Drug Education",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },
  m2020: {
    level: "verified",
    official_item: "M2020",
    official_title: "Management of Oral Medications",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },
  m1830: {
    level: "verified",
    official_item: "M1830",
    official_title: "Bathing",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },
  m1840: {
    level: "verified",
    official_item: "M1840",
    official_title: "Toilet Transferring",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },
  m1845: {
    level: "verified",
    official_item: "M1845",
    official_title: "Toileting Hygiene",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },
  m1850: {
    level: "verified",
    official_item: "M1850",
    official_title: "Transferring",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },
  m1860: {
    level: "verified",
    official_item: "M1860",
    official_title: "Ambulation/Locomotion",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },
  m1870: {
    level: "verified",
    official_item: "M1870",
    official_title: "Feeding or Eating",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },
  m1033: {
    level: "verified",
    official_item: "M1033",
    official_title: "Risk of Hospitalization",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },
  m1610: {
    level: "verified",
    official_item: "M1610",
    official_title: "Urinary Incontinence or Urinary Catheter Presence",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },
  m1620: {
    level: "verified",
    official_item: "M1620",
    official_title: "Bowel Incontinence Frequency",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },
  m1630: {
    level: "verified",
    official_item: "M1630",
    official_title: "Ostomy for Bowel Elimination",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
  },
  m2401: {
    level: "verified",
    official_item: "M2401",
    official_title: "Intervention Synopsis",
    reviewed_by: "",
    reviewed_at: "",
    review_source: "",    classification_signed_off_by: "PennSync CMS source check",
    classification_signed_off_at: "2026-09-01",
    classification_basis: "Item number and title checked against the published CMS OASIS-E, E1 and E2 manuals.",

    source_verified_at: "2026-09-01",
    source_verified_against: "CMS OASIS-E2 Manual (Effective 04/01/2026), Chapter 3",
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
      officialTitle: entry.official_title || "",
      formerItem: entry.former_item || null,
      // FACTUAL source check (does the number exist, what is its title) — kept
      // separate from clinical sign-off below, which is a judgement.
      sourceVerifiedAt: entry.source_verified_at || "",
      sourceVerifiedAgainst: entry.source_verified_against || "",
      sourceVerified: !!entry.source_verified_at,
      // The classification (which level applies) IS signed off; the clinical
      // question (is PennSync's use of the item appropriate) is not.
      classificationSignedOffBy: entry.classification_signed_off_by || "",
      classificationSignedOffAt: entry.classification_signed_off_at || "",
      classificationBasis: entry.classification_basis || "",
      classificationSignedOff: !!entry.classification_signed_off_by,
      // Response OPTIONS are unconfirmed even for a `verified` item.
      responseSetVerified: false,
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
    officialTitle: "",
    formerItem: null,
    sourceVerifiedAt: "",
    sourceVerifiedAgainst: "",
    sourceVerified: false,
    classificationSignedOffBy: "",
    classificationSignedOffAt: "",
    classificationBasis: "",
    classificationSignedOff: false,
    responseSetVerified: false,
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
  const level = classifyItem(itemId).level;
  return !["pennsync_screening", "retired", "not_a_cms_item"].includes(level);
}

/**
 * The item number a screen may display, or null.
 * A PennSync screening item returns null — it must never wear a CMS number.
 */
export function officialItemNumber(itemId) {
  const c = classifyItem(itemId);
  // A retired item, an invented number and a PennSync question must never be
  // shown wearing a CMS item number: each would send a nurse to the official
  // assessment looking for something that is not there.
  const NO_NUMBER = ["pennsync_screening", "retired", "not_a_cms_item"];
  return NO_NUMBER.includes(c.level) ? null : c.officialItem;
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
  retired:
    "This item is NOT in the OASIS instrument currently in effect — it was retired. PennSync keeps "
    + "the question as an internal prompt only. Do not enter it on the official assessment; use the "
    + "current item in your EMR.",
  not_a_cms_item:
    "This item number appears in no published CMS OASIS manual. Treat the question as a PennSync "
    + "prompt only and enter official responses in your EMR.",
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
    retired: { label: "Retired CMS item", tone: "destructive" },
    not_a_cms_item: { label: "Not a CMS item", tone: "destructive" },
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
      ? "Every OASIS item in PennSync's internal set has been signed off by a named clinical reviewer."
      : `Item numbers and titles are verified against the CMS manual. What remains for `
        + `${pending.length} of ${ids.length} items is the CLINICAL question: whether PennSync's use `
        + "of the item is appropriate, and whether its response options are safe as a screening "
        + "prompt. Response options are not verified. Confirm both in your EMR.",
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
    "**The classification column is already signed off** against the CMS manuals (item number",
    "and title). You are not being asked to re-do that. What is open is ONE clinical question",
    "per row, in the \"Clinical question\" column — response options were NOT verified, because",
    "the manual states response codes as prose rather than a parseable list.",
    "",
    "Leave a row blank if you did not review it — an unreviewed row is a more useful record",
    "than a guessed one.",
    "",
    "Classification key:",
    "",
    "- `verified` — title and response set confirmed against a CMS source",
    "- `abbreviated` — a real CMS item whose PennSync response list is shortened",
    "- `unverified` — a real CMS item number whose PennSync wording is unconfirmed",
    "- `retired` — was a real CMS item, but is not in the instrument now in effect",
    "- `not_a_cms_item` — the number appears in no published CMS manual",
    "- `pennsync_screening` — not a CMS item; must never display an item number",
    "",
    "PennSync's own source check (2026-09-01) against the published OASIS-E, E1 and E2",
    "manuals is recorded in the \"Source check\" column. That check is FACTUAL — does the",
    "item number exist, and what is its title. It is **not** a clinical sign-off, which is",
    "what the reviewer columns are for.",
    "",
    "| PennSync id | Item number shown | PennSync label | Classification (signed off) | Source check / note | Clinical question outstanding | Reviewer: answer | Reviewer initials / date |",
    "| --- | --- | --- | --- | --- | --- | --- | --- |",
  ].filter((line, i, arr) => !(line === "" && arr[i - 1] === "")).join("\n");

  const body = rows.map((r) => [
    "",
    `\`${r.id}\``,
    r.officialItem || "— (none)",
    (r.label || "").replace(/\|/g, "\\|"),
    `\`${r.level}\``,
    [r.sourceVerified ? `Checked ${r.sourceVerifiedAt}` : "Not checked", r.officialTitle, r.note || r.evidence]
      .filter(Boolean).join(" · ").replace(/\|/g, "\\|") || "—",
    (outstandingClinicalQuestion(r.id)?.question || "—").replace(/\|/g, "\\|"),
    r.clinicallyReviewed ? `Answered by ${r.reviewedBy}` : " ",
    r.clinicallyReviewed ? r.reviewedAt : " ",
    "",
  ].join(" | ").trim()).join("\n");

  const pending = rows.filter((r) => !r.clinicallyReviewed).length;
  const footer = [
    "",
    `**${pending} of ${rows.length} items await the clinical answer.** Their classification is `
    + "already signed off; only the clinical question above is open.",
    "",
    "Record each confirmation in `src/components/oasis/specs/verification.js`",
    "(`reviewed_by`, `reviewed_at`, `review_source`) so the product can report its own",
    "review state rather than relying on this document.",
  ].join("\n");

  return `${header}\n${body}\n${footer}\n`;
}

/**
 * Status of the FACTUAL source check — separate from clinical sign-off.
 *
 * @param {string[]} [itemIds]
 */
export function sourceCheckStatus(itemIds) {
  const ids = Array.isArray(itemIds) && itemIds.length
    ? [...new Set(itemIds.map((i) => String(i || "").toLowerCase()).filter(Boolean))]
    : Object.keys(ITEM_VERIFICATION);
  const rows = ids.map(classifyItem);
  const problems = rows.filter((r) => ["retired", "not_a_cms_item"].includes(r.level));
  return {
    total: ids.length,
    checked: rows.filter((r) => r.sourceVerified).length,
    retired: rows.filter((r) => r.level === "retired").length,
    notCmsItems: rows.filter((r) => r.level === "not_a_cms_item").length,
    problems: problems.map((r) => ({ id: r.id, level: r.level, note: r.note })),
    statement: problems.length === 0
      ? "Every item number in PennSync's internal set exists in the CMS instrument currently in effect."
      : `${problems.length} of ${ids.length} items in PennSync's internal set are retired or are not `
        + "CMS item numbers. They are kept as internal prompts only — enter official responses in your EMR.",
  };
}

/**
 * The `item_source` value to persist alongside a saved OASIS answer.
 *
 * PennSync writes its own form ids into `OASISAssessment.oasis_items[].item_number`,
 * the field every downstream consumer reads as a CMS item number. Without this
 * marker a PennSync screening answer is indistinguishable from a real CMS item
 * response — so `m1730` (retired) or `m1020` (not a CMS number at all) would be
 * read as official assessment data.
 *
 * @param {string} itemId
 * @returns {"cms_item"|"pennsync_screening"|"retired_cms_item"|"unknown"}
 */
export function itemSourceFor(itemId) {
  const level = classifyItem(itemId).level;
  if (level === "verified" || level === "abbreviated") return "cms_item";
  if (level === "retired") return "retired_cms_item";
  if (level === "pennsync_screening" || level === "not_a_cms_item") return "pennsync_screening";
  return "unknown";
}

/**
 * Keep only the saved answers that are genuinely CMS item responses.
 *
 * A row with NO `item_source` predates the marker and is treated as `unknown` —
 * excluded rather than assumed official, because assuming is how PennSync's own
 * screening answers would end up read as the assessment.
 *
 * @param {Array<{ item_number?: string, item_source?: string }>} items
 */
export function cmsItemsOnly(items) {
  return (Array.isArray(items) ? items : []).filter((row) => {
    if (!row?.item_number) return false;
    const stated = row.item_source;
    if (stated) return stated === "cms_item";
    // Legacy row: fall back to the registry rather than trusting the number.
    return itemSourceFor(row.item_number) === "cms_item";
  });
}

/**
 * What a clinical reviewer still has to decide, now that the classification is
 * settled.
 *
 * Kept deliberately narrow. "Re-check all 36 items" is a job nobody does;
 * "answer one question per item, with the item number and title already
 * confirmed" is a job that gets done.
 */
export const OUTSTANDING_CLINICAL_QUESTIONS = Object.freeze([
  {
    id: "response_options_safe",
    applies_to: ["verified", "abbreviated"],
    question:
      "PennSync's response options for this item were NOT verified against the CMS manual "
      + "(the manual states response codes as prose, not a parseable list). Are the options this "
      + "form offers safe and sufficient as a screening prompt?",
  },
  {
    id: "retired_item_still_useful",
    applies_to: ["retired", "not_a_cms_item", "pennsync_screening"],
    question:
      "This question is not a current CMS item. Is it still clinically worth asking as an internal "
      + "prompt, or should it be removed from the form?",
  },
]);

/**
 * The specific question outstanding for one item, or null when none is.
 * @param {string} itemId
 */
export function outstandingClinicalQuestion(itemId) {
  const c = classifyItem(itemId);
  if (c.clinicallyReviewed) return null;
  return OUTSTANDING_CLINICAL_QUESTIONS.find((q) => q.applies_to.includes(c.level)) || null;
}

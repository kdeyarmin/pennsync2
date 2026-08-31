// OASIS-E spec metadata.
//
// This module holds METADATA AND PROVENANCE ONLY. It deliberately does NOT
// contain a reconstructed CMS item bank: the repository does not carry the
// authoritative OASIS-E instrument, and inventing item titles or response sets
// would be a fabrication of regulatory content — the one thing this layer exists
// to prevent.
//
// PennSync's internal screening items live in `oasisQuestions.jsx` and are
// classified against this metadata by `../verification.js`.

/** @typedef {{ id: string, label: string, effective_date: string, retired_date: string|null, source: string, source_url: string, completeness: string, notes: string }} OasisSpecMeta */

/** @type {OasisSpecMeta} */
export const OASIS_E_SPEC = Object.freeze({
  id: "oasis-e",
  label: "OASIS-E",
  // OASIS-E took effect for assessments with an M0090 date on or after
  // 2023-01-01. Stated as the version PennSync's guidance is PATTERNED AFTER,
  // not as a claim that PennSync contains the instrument.
  effective_date: "2023-01-01",
  retired_date: null,
  source: "CMS OASIS Guidance Manual",
  source_url: "https://www.cms.gov/medicare/quality/home-health/oasis-user-manuals",
  // The single most important field in this module.
  completeness: "partial",
  notes:
    "PennSync does not contain the authoritative CMS OASIS instrument. Its internal item "
    + "set is an abbreviated screening set used for review and education only. Item wording, "
    + "response sets and applicability must be confirmed against the official assessment in "
    + "the agency's EMR before any response is entered or submitted.",
});

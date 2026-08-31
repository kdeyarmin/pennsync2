// Version registry for the OASIS reference layer.
//
// Effective-date aware so a future OASIS version can be added without silently
// re-interpreting older assessments under newer definitions. Adding a version
// means adding a spec module and an entry here — never editing an existing
// version's effective dates in place.

import { OASIS_E_SPEC } from "./e/index.js";

/** Every OASIS version PennSync knows about, oldest effective date first. */
export const KNOWN_OASIS_SPECS = Object.freeze([OASIS_E_SPEC]);

/**
 * The version PennSync's current guidance is patterned after.
 * NOT a claim that PennSync holds the official instrument — see spec.completeness.
 */
export const ACTIVE_OASIS_SPEC = OASIS_E_SPEC;

/** @param {string} id */
export function getOasisSpec(id) {
  return KNOWN_OASIS_SPECS.find((s) => s.id === id) || null;
}

/**
 * The spec in force on an assessment date (M0090).
 *
 * Returns null rather than guessing when the date precedes every known version:
 * PennSync must not apply OASIS-E definitions to an assessment completed under
 * an earlier instrument it does not hold.
 *
 * @param {string|Date} date
 * @returns {OasisSpecMetaOrNull}
 * @typedef {import("./e/index.js").OasisSpecMeta|null} OasisSpecMetaOrNull
 */
export function resolveSpecForDate(date) {
  const t = date instanceof Date ? date.getTime() : Date.parse(String(date || ""));
  if (!Number.isFinite(t)) return ACTIVE_OASIS_SPEC;
  let match = null;
  for (const spec of KNOWN_OASIS_SPECS) {
    const from = Date.parse(spec.effective_date);
    const until = spec.retired_date ? Date.parse(spec.retired_date) : Infinity;
    if (t >= from && t < until) match = spec;
  }
  return match;
}

// Feature gate for v2 OASIS response entry.
//
// SCOPE — read this before wiring anything to it.
// This flag gates NEW v2 WRITES only. It does not gate:
//   * P0 containment (AI/output/analytics), which is unconditional;
//   * reading either schema, which must keep working at every flag state;
//   * the refusal of legacy writes, which is permanent.
//
// Rollback therefore means "stop new v2 writes", never "resume legacy writes"
// and never "down-convert v2 rows".

/** The agency feature-access key. Default OFF. */
export const OASIS_RESPONSE_SCHEMA_V2_FLAG = "oasis_response_schema_v2";

/**
 * Whether an agency may create NEW v2 official responses.
 *
 * @param {{ features?: Record<string, boolean>, feature_access?: Record<string, boolean> }} agency
 */
export function canWriteV2Responses(agency) {
  const bag = agency?.feature_access || agency?.features || null;
  if (!bag || typeof bag !== "object") return false;
  return bag[OASIS_RESPONSE_SCHEMA_V2_FLAG] === true;
}

/**
 * A hard stop on ALL new official OASIS response writes, independent of the
 * feature flag. Exists so an incident can be contained without a deploy.
 */
export const OASIS_WRITE_KILL_SWITCH = "oasis_response_writes_disabled";

/** @param {object} agency */
export function writesAreKilled(agency) {
  const bag = agency?.feature_access || agency?.features || null;
  return Boolean(bag && bag[OASIS_WRITE_KILL_SWITCH] === true);
}

/** Reading never depends on the flag. Stated as a function so callers can't forget. */
export function canReadSchema() {
  return true;
}

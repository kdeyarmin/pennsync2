// Deterministic PDGM grouping engine.
//
// Under PDGM, each 30-day period is assigned a case-mix group (and HIPPS code +
// case-mix weight) from FIVE variables: timing, admission source, clinical
// group, functional-impairment level, and comorbidity adjustment.
//
// ── IMPORTANT: this engine embeds NO CMS data ─────────────────────────────────
// The variable→group and group→weight mappings are official CMS data that change
// ANNUALLY and span thousands of ICD-10 codes (the clinical-group list, the
// comorbidity subgroups, the functional point values/thresholds, and the
// case-mix weight table). Hardcoding them from memory would be fabrication.
//
// So every CMS table is SUPPLIED by the caller (`cmsTables`), loaded from the
// agency's official CMS PDGM grouper / case-mix weight files. The engine
// computes only the table-independent logic and performs lookups. It NEVER
// guesses: if a code or combination isn't in the supplied tables, the result is
// returned as incomplete (with `missing`), not fabricated.
//
// This replaces the previous approach of asking an LLM to guess
// `estimated_pdgm_group` — once the agency loads current CMS tables, grouping
// becomes deterministic and reproducible.

/** The 12 PDGM clinical groups (stable public reference; the ICD-10→group
 *  mapping that selects among them is CMS data supplied via cmsTables). */
export const CLINICAL_GROUPS = [
  "Behavioral Health",
  "Complex Nursing Interventions",
  "Musculoskeletal Rehabilitation",
  "Neuro Rehabilitation",
  "Wound",
  "MMTA - Surgical Aftercare",
  "MMTA - Cardiac and Circulatory",
  "MMTA - Endocrine",
  "MMTA - Gastrointestinal tract and Genitourinary system",
  "MMTA - Infectious Disease, Neoplasms, and Blood-Forming Diseases",
  "MMTA - Respiratory",
  "MMTA - Other",
];

const norm = (code) => String(code).toUpperCase().replace(/\./g, "").trim();

/** Timing: the first 30-day period in a sequence of adjacent covered periods is
 *  "early"; every subsequent adjacent period is "late". Deterministic, no table. */
export function computeTiming(periodNumber) {
  const n = Number(periodNumber);
  if (!Number.isFinite(n) || n < 1) return null;
  return n === 1 ? "early" : "late";
}

/** Admission source from whether the patient had a qualifying acute/post-acute
 *  (institutional) stay before the period.
 *  @param {{ hadInstitutionalStay?: boolean }} [opts] */
export function computeAdmissionSource(opts = {}) {
  return opts.hadInstitutionalStay ? "institutional" : "community";
}

/**
 * Functional-impairment points, summed from the SUPPLIED CMS response→points
 * table. The set of scored items is defined by the table's keys (so it tracks
 * the official CMS spec, not a hardcoded list).
 * @param {object} answers { itemId: response, ... }
 * @param {object} itemPoints { itemId: { [response]: points }, ... } (CMS data)
 * @returns {{points:number, items:object}|null} null if itemPoints not supplied
 */
export function computeFunctionalPoints(answers, itemPoints) {
  if (!itemPoints || !answers) return null;
  let points = 0;
  const items = {};
  for (const id of Object.keys(itemPoints)) {
    const resp = answers[id];
    if (resp === undefined || resp === null || resp === "") continue;
    const table = itemPoints[id];
    if (!table) continue;
    let p = table[String(resp)];
    if (p === undefined) p = table[Number(resp)];
    if (typeof p === "number") {
      points += p;
      items[id] = p;
    }
  }
  return { points, items };
}

/** Functional level from points + SUPPLIED CMS thresholds
 *  ({ low: maxLow, medium: maxMedium } — can vary by clinical group). */
export function computeFunctionalLevel(points, thresholds) {
  if (!thresholds || typeof points !== "number") return null;
  if (points <= thresholds.low) return "low";
  if (points <= thresholds.medium) return "medium";
  return "high";
}

/** Clinical group from the principal diagnosis using the SUPPLIED CMS map.
 *  Returns null (NOT a guess) when the code isn't in the official table. */
export function assignClinicalGroup(principalDiagnosis, dxToGroup) {
  if (!principalDiagnosis || !dxToGroup) return null;
  return dxToGroup[norm(principalDiagnosis)] || null;
}

/** Comorbidity adjustment (none/low/high) from secondary diagnoses using the
 *  SUPPLIED CMS subgroup map + interaction list. */
export function assignComorbidityAdjustment(secondaryDiagnoses, comorbidity) {
  if (!comorbidity || !comorbidity.subgroups) return null;
  const subgroups = new Set();
  for (const dx of secondaryDiagnoses || []) {
    const sg = comorbidity.subgroups[norm(dx)];
    if (sg) subgroups.add(sg);
  }
  for (const pair of comorbidity.interactions || []) {
    if (subgroups.has(pair[0]) && subgroups.has(pair[1])) return "high";
  }
  return subgroups.size > 0 ? "low" : "none";
}

/** Composite key into the CMS case-mix table. */
export function caseMixKey({ timing, admissionSource, clinicalGroup, functionalLevel, comorbidityLevel }) {
  return [timing, admissionSource, clinicalGroup, functionalLevel, comorbidityLevel].join("|");
}

/** HIPPS code + case-mix weight from the SUPPLIED CMS case-mix table.
 *  Returns null if the combination isn't present (never fabricated). */
export function lookupCaseMix(variables, caseMixTable) {
  if (!caseMixTable) return null;
  return caseMixTable[caseMixKey(variables)] || null;
}

/**
 * Group a 30-day period. Returns a complete result only when all required CMS
 * tables are supplied AND every lookup resolves; otherwise `complete:false` with
 * a `missing` list. Never fabricates a group, level, HIPPS, or weight.
 *
 * @param {object} input { periodNumber, hadInstitutionalStay, principalDiagnosis,
 *                         secondaryDiagnoses, answers }
 * @param {object} cmsTables { itemPoints, functionalThresholds, dxToGroup,
 *                             comorbidity, caseMixTable } (from official CMS files)
 */
export function groupPeriod(input, cmsTables = {}) {
  const { periodNumber, hadInstitutionalStay, principalDiagnosis, secondaryDiagnoses, answers } = input || {};
  const { itemPoints, functionalThresholds, dxToGroup, comorbidity, caseMixTable } = cmsTables;

  const timing = computeTiming(periodNumber);
  const admissionSource = computeAdmissionSource({ hadInstitutionalStay });
  const clinicalGroup = assignClinicalGroup(principalDiagnosis, dxToGroup);
  const fp = computeFunctionalPoints(answers, itemPoints);
  const functionalLevel = fp ? computeFunctionalLevel(fp.points, functionalThresholds) : null;
  const comorbidityLevel = assignComorbidityAdjustment(secondaryDiagnoses, comorbidity);

  const missing = [];
  if (!timing) missing.push("timing (valid periodNumber)");
  if (!dxToGroup) missing.push("CMS diagnosis→clinical-group table");
  else if (!clinicalGroup) missing.push(`clinical group for principal Dx "${principalDiagnosis || ""}"`);
  if (!itemPoints || !functionalThresholds) missing.push("CMS functional points/thresholds");
  else if (!functionalLevel) missing.push("functional level");
  if (!comorbidity) missing.push("CMS comorbidity subgroup table");

  let caseMix = null;
  if (missing.length === 0) {
    caseMix = lookupCaseMix({ timing, admissionSource, clinicalGroup, functionalLevel, comorbidityLevel }, caseMixTable);
    if (!caseMix) missing.push("CMS case-mix weight/HIPPS entry for this combination");
  }

  return {
    complete: missing.length === 0,
    missing,
    timing,
    admissionSource,
    clinicalGroup,
    functionalPoints: fp ? fp.points : null,
    functionalLevel,
    comorbidityLevel,
    hipps: caseMix ? caseMix.hipps : null,
    caseMixWeight: caseMix ? caseMix.weight : null,
  };
}

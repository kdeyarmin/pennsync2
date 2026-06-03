// Deterministic critical-vital-sign thresholds for non-blocking escalation.
//
// IMPORTANT: this is an escalation/notification aid, NOT a data-entry gate. It
// never prevents saving a genuine abnormal-but-real reading; it only flags
// life-threatening values so a supervisor/physician can be looped in. Keep the
// rules conservative (clearly life-threatening) to avoid alert fatigue. Vital
// plausibility (catching unit/typo mistakes) is handled separately in the form.

const toNum = (x) => {
  if (x === null || x === undefined || x === "") return null;
  const n = parseFloat(x);
  return Number.isFinite(n) ? n : null;
};

/**
 * Each rule: { id, label, severity, test(vitals) -> bool, describe(vitals) -> string }.
 * Thresholds match the agency-approved escalation defaults.
 */
export const CRITICAL_VITAL_RULES = [
  {
    id: "hypertensive_crisis",
    label: "Hypertensive crisis",
    severity: "critical",
    test: (v) => {
      const s = toNum(v.blood_pressure_systolic);
      const d = toNum(v.blood_pressure_diastolic);
      return (s !== null && s > 180) || (d !== null && d > 120);
    },
    describe: (v) =>
      `BP ${v.blood_pressure_systolic ?? "?"}/${v.blood_pressure_diastolic ?? "?"} mmHg (threshold >180/120)`,
  },
  {
    id: "severe_hypoxia",
    label: "Severe hypoxia",
    severity: "critical",
    test: (v) => {
      const o = toNum(v.oxygen_saturation);
      return o !== null && o > 0 && o < 88;
    },
    describe: (v) => `O2 saturation ${v.oxygen_saturation}% (threshold <88%)`,
  },
  {
    id: "severe_pain",
    label: "Severe pain",
    severity: "high",
    test: (v) => {
      const p = toNum(v.pain_level);
      return p !== null && p >= 10;
    },
    describe: (v) => `Pain ${v.pain_level}/10 (threshold 10/10)`,
  },
];

/**
 * Returns the list of breached critical-vital rules for a vitals object.
 * Empty array when nothing is critical (or fields are blank/non-numeric).
 *
 * @param {Record<string, any>} vitals
 * @returns {{ id: string, label: string, severity: string, detail: string }[]}
 */
export function detectCriticalVitals(vitals = {}) {
  if (!vitals || typeof vitals !== "object") return [];
  return CRITICAL_VITAL_RULES.filter((rule) => {
    try {
      return rule.test(vitals);
    } catch {
      return false;
    }
  }).map((rule) => ({
    id: rule.id,
    label: rule.label,
    severity: rule.severity,
    detail: rule.describe(vitals),
  }));
}

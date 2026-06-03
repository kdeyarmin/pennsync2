// Deterministic clinical-fact extraction. Pure functions only — no React, no
// network — so this module is unit-testable under `node --test` and runs
// offline. Several helpers are lifted verbatim from existing components
// (OASISScrubber, VitalSignValidator) so there is a single source of truth.
//
// IMPORTANT: this file is loaded by the node test runner, so it may only import
// other plain `.js` modules with explicit extensions (never `.jsx`).
import { MEDICAL_TERMS } from "../../utils/medicalDictionary.js";

// ── Sentence / phrase helpers (lifted from OASISScrubber.jsx) ──────────────

/** Split free text into trimmed sentences, also breaking on newlines/bullets. */
export function splitSentences(text) {
  if (!text) return [];
  return text
    .split(/[.!?\n]+/)
    .map((s) => s.replace(/^[\s•\-*–·]+/, "").trim())
    .filter((s) => s.length > 0);
}

/** Return phrases matching `pattern` (length > 5), trimmed. */
export function extractPhrases(text, pattern) {
  if (!text) return [];
  const matches = text.match(pattern) || [];
  return matches.map((m) => m.trim()).filter((m) => m.length > 5);
}

/** Return up to 5 full sentences that match `pattern`. */
export function getSentencesContaining(text, pattern) {
  if (!text) return [];
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim().length > 0);
  return sentences
    .filter((s) => { pattern.lastIndex = 0; return pattern.test(s); })
    .map((s) => s.trim() + ".")
    .slice(0, 5);
}

// ── Vital signs (moved from VitalSignValidator.jsx; re-imported there) ──────

/** Extract vitals (bp_sys/bp_dia/hr/o2/temp/rr/weight) from free text. */
export function extractVitals(text) {
  const vitals = {};
  if (!text) return vitals;

  const bpMatch = text.match(/bp\s*(\d{2,3})\/(\d{2,3})/i) || text.match(/(\d{2,3})\/(\d{2,3})/);
  if (bpMatch) {
    const sys = parseInt(bpMatch[1]);
    const dia = parseInt(bpMatch[2]);
    // Guard the unlabeled "nn/nn" fallback against dates ("11/20") and other
    // ratios: only accept physiologically plausible systolic/diastolic values.
    if (sys >= 60 && sys <= 300 && dia >= 30 && dia <= 200 && sys > dia) {
      vitals.bp_sys = sys;
      vitals.bp_dia = dia;
    }
  }

  const hrMatch = text.match(/(?:hr|heart\s*rate)\s*(\d{2,3})/i);
  if (hrMatch) vitals.hr = parseInt(hrMatch[1]);

  const o2Match =
    text.match(/(?:o2|spo2|oxygen)\s*(\d{2,3})\s*%/i) ||
    text.match(/(\d{2,3})\s*%\s*(?:ra|on ra|o2|room air)/i);
  if (o2Match) vitals.o2 = parseInt(o2Match[1]);

  // Anchor the "t" shorthand with word boundaries so it can't match the
  // trailing "t" of unrelated words ("weight 150" must NOT read as temp 150).
  const tempMatch = text.match(/(?:\btemp\b|temperature|\bt\b)\s*(\d{2,3}(?:\.\d)?)/i);
  if (tempMatch) {
    const t = parseFloat(tempMatch[1]);
    if (t > 90) vitals.temp = t;
  }

  const rrMatch = text.match(/(?:rr|resp(?:iratory)?\s*rate)\s*(\d{1,2})/i);
  if (rrMatch) vitals.rr = parseInt(rrMatch[1]);

  const wtMatch = text.match(/(?:wt|weight)\s*(\d{2,3}(?:\.\d)?)\s*(?:lbs?|kg)?/i);
  if (wtMatch) vitals.weight = parseFloat(wtMatch[1]);

  return vitals;
}

// ── Value extraction for the hallucination value-guard ─────────────────────
// We intentionally extract only UNIT-BEARING / clinically-significant values
// (vitals, doses, measurements, scores) rather than every bare integer, so the
// guard does not false-positive on prose counts like "2 times daily".

const MEASUREMENT_PATTERNS = [
  /\b\d{2,3}\/\d{2,3}\b/g, // blood pressure
  /\b\d{1,3}\s?%/g, // percentages (O2 sat, etc.)
  /\b\d{1,3}\s?x\s?\d{1,3}(?:\.\d+)?\s?(?:cm|mm)\b/gi, // wound dimensions 2x3 cm
  /\b\d+(?:\.\d+)?\s?(?:cm|mm)\b/gi, // single measurement
  /\b\d+(?:\.\d+)?\s?(?:mg|mcg|g|ml|units?|iu|tab(?:lets?)?|cc)\b/gi, // doses
  /\b\d{1,2}\/10\b/g, // pain / rating scales
  /\b\d{2,3}\s?(?:bpm|beats)/gi, // heart rate
  /\b\d{1,2}\s?(?:breaths|rpm)/gi, // resp rate
  /\b\d{2,3}(?:\.\d)?\s?(?:lbs?|kg)\b/gi, // weight
  /\b\d{2,3}(?:\.\d)?\s?°?\s?f\b/gi, // temperature in F
];

/** Normalize a measurement token for set comparison (lowercase, no spaces). */
function normalizeToken(t) {
  // Drop the degree symbol too so "98.6 F" and "98.6°F" reduce to the same
  // token — otherwise the value-guard flags a faithful °-adding rewrite as a
  // hallucinated value.
  return t.toLowerCase().replace(/[\s°]+/g, "");
}

/** Extract normalized measurement/value tokens from text. */
export function extractNumbersAndMeasurements(text) {
  if (!text) return [];
  const found = [];
  const add = (t) => {
    const n = normalizeToken(t);
    if (!found.includes(n)) found.push(n);
  };
  for (const pat of MEASUREMENT_PATTERNS) {
    const matches = text.match(pat) || [];
    matches.forEach(add);
  }
  // Also fold in labeled vitals so "BP 148/90" and "blood pressure of 148/90"
  // both reduce to comparable component numbers.
  const v = extractVitals(text);
  if (v.bp_sys && v.bp_dia) add(`${v.bp_sys}/${v.bp_dia}`);
  if (v.o2) add(`${v.o2}%`);
  return found;
}

// ── Medication extraction (uses the shared medical dictionary) ──────────────

const MED_NAMES = [
  ...MEDICAL_TERMS.medications,
  ...Object.values(MEDICAL_TERMS.common_mishears),
];
// De-dupe canonical names case-insensitively (so "Atorvastatin" and the
// "statin"→"atorvastatin" mishear entry don't both survive), longest first so
// "atorvastatin" wins over "statin".
const UNIQUE_MEDS = (() => {
  const seen = new Set();
  const out = [];
  for (const m of MED_NAMES) {
    const key = m.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(m);
  }
  return out.sort((a, b) => b.length - a.length);
})();

/** Return the list of known medication names mentioned in `text` (canonical). */
export function extractMedications(text) {
  if (!text) return [];
  const found = [];
  for (const med of UNIQUE_MEDS) {
    const re = new RegExp(`\\b${med.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i");
    if (re.test(text) && !found.includes(med)) found.push(med);
  }
  return found;
}

// ── Reusable clinical presence patterns (consumed by presenceDetection) ─────
export const CLINICAL_PATTERNS = {
  homebound: /homebound|unable to leave|leaving home requires|considerable (?:and )?taxing effort|confined to (?:home|residence)|without assistance.*leave|taxing effort/i,
  skilledNeed: /skilled (?:need|nursing|assessment|service|intervention)|requires the skill|wound care|medication management|teaching|assessment of|observation and assessment|skilled observation/i,
  teachBack: /verbali[sz]ed understanding|teach[- ]?back|demonstrated understanding|able to (?:repeat|state|demonstrate)|return demonstration/i,
  patientResponse: /tolerated|responded|patient (?:reports?|states?|denies|verbali|able to)|no adverse|improvement noted|response to/i,
  education: /educat|taught|instruct|reviewed with|reinforced|provided teaching/i,
  safety: /fall|safety|hazard|clutter|throw rug|grab bar|environment/i,
  pain: /pain|discomfort|ache|tender|\d\/10/i,
  medication: /medication|med (?:list|reconcil)|drug|dose|prescrib/i,
  plan: /plan|next visit|follow[- ]?up|return|notify physician|continue|will (?:re)?assess/i,
  vitals: /\bbp\b|blood pressure|\bhr\b|heart rate|\bo2\b|oxygen|spo2|\btemp\b|temperature|respir|\brr\b|weight/i,
};

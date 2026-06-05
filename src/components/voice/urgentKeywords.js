/**
 * urgentKeywords — detect clinically urgent language in an inbound patient text
 * so the system can escalate (high-priority notification / on-call alert) rather
 * than letting it sit in an inbox. Pure + unit-tested; mirrored into the inbound
 * SMS webhook handler. The agency can extend the list via AgencySettings.
 */

// Default red-flag terms. Phrases and single words; matched on word boundaries
// so "fall" doesn't fire on "football" and "911" matches exactly.
export const DEFAULT_URGENT_KEYWORDS = [
  "emergency", "urgent", "911", "chest pain", "can't breathe", "cant breathe",
  "trouble breathing", "short of breath", "suicidal", "kill myself", "overdose",
  // NOTE: bare "blood" was removed — it fired on routine phrases like "blood
  // pressure", "blood sugar", and "blood test" (alert fatigue). "bleeding"
  // covers the genuinely urgent case.
  "bleeding", "fell", "fall", "fallen", "passed out", "unconscious",
  "stroke", "seizure", "severe pain", "help me", "not breathing", "unresponsive",
];

function escapeRegExp(s) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Detect urgent keywords in `text`. Returns { urgent, matches } where matches is
 * the de-duplicated list of triggered terms. `extraKeywords` (e.g. from agency
 * settings) are merged with the defaults.
 */
export function detectUrgency(text, extraKeywords = []) {
  const s = String(text || "");
  if (!s.trim()) return { urgent: false, matches: [] };
  const extras = (Array.isArray(extraKeywords) ? extraKeywords : [])
    .map((k) => String(k || "").toLowerCase().trim())
    .filter(Boolean);
  const all = [...new Set([...DEFAULT_URGENT_KEYWORDS, ...extras])];

  const matches = [];
  for (const kw of all) {
    if (!kw) continue;
    const re = new RegExp(`\\b${escapeRegExp(kw)}\\b`, "i");
    if (re.test(s)) matches.push(kw);
  }
  return { urgent: matches.length > 0, matches };
}

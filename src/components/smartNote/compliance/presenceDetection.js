// Deterministic detection of whether each required element is present in the
// nurse's draft. Pure + offline. For every element we return whether it was
// found and, if so, the verbatim evidence sentence (for provenance/UI).
import { getSentencesContaining, splitSentences } from "./factExtraction.js";

/**
 * @param {string} draftText normalized rough draft
 * @param {Array} requiredElements from getRequiredElements()
 * @returns {{ id, label, severity, present: boolean, evidence: string|null }[]}
 */
export function detectPresence(draftText, requiredElements) {
  const text = draftText || "";
  return requiredElements.map((elem) => {
    let evidence = null;

    // 1) strongest signal: an element-specific regex pattern
    if (elem.pattern) {
      const hits = getSentencesContaining(text, elem.pattern);
      if (hits.length) evidence = hits[0];
    }

    // 2) fallback: any keyword appears in a sentence
    if (!evidence && Array.isArray(elem.keywords) && elem.keywords.length) {
      const lower = text.toLowerCase();
      const matchedKeyword = elem.keywords.find((k) => lower.includes(k.toLowerCase()));
      if (matchedKeyword) {
        const sentence = splitSentences(text).find((s) =>
          s.toLowerCase().includes(matchedKeyword.toLowerCase())
        );
        evidence = sentence ? sentence + "." : matchedKeyword;
      }
    }

    return {
      id: elem.id,
      label: elem.label,
      severity: elem.severity,
      present: evidence !== null,
      evidence,
    };
  });
}

/**
 * Elements that are missing from the draft (need a question / fallback line).
 * @returns {Array} the subset of requiredElements whose presence was not found
 */
export function computeGaps(presenceResults, requiredElements) {
  const missingIds = new Set(presenceResults.filter((r) => !r.present).map((r) => r.id));
  return requiredElements.filter((e) => missingIds.has(e.id));
}

/** Convenience: critical elements that are still missing (these HARD-BLOCK). */
export function computeCriticalGaps(presenceResults, requiredElements) {
  return computeGaps(presenceResults, requiredElements).filter((e) => e.severity === "critical");
}

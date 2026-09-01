// crossDocumentConsistency — deterministic note ↔ OASIS ↔ care-plan review.
//
// WHAT IT DOES
// Finds places where two records PennSync holds say different things, and shows
// both sides with their evidence so a human can decide which is right.
//
// WHAT IT DELIBERATELY DOES NOT DO
//  - It NEVER rewrites a record. Silently "fixing" an inconsistency would edit
//    clinician-entered facts, and PennSync is not the record of truth for any of
//    the three sources.
//  - It never decides which side is correct. Every finding is a REVIEW PROMPT
//    with source A, source B, the evidence, a severity and a suggested action.
//  - It never asserts an OASIS response is wrong. Corrections, if any are
//    needed, are made on the official assessment in the EMR.
//
// Every check is a field or regex comparison — reproducible, explainable, and
// safe to act on. No LLM decides whether two clinical records conflict.
//
// Pure + offline so it runs under `node --test`. It may only import other plain
// `.js` modules with explicit extensions (never `.jsx`).

/** Resolution actions a reviewer may take. PennSync records the choice only. */
export const RESOLUTIONS = Object.freeze(["acknowledged", "resolved", "task_created", "not_applicable"]);

const SEVERITY_RANK = { critical: 0, high: 1, medium: 2 };

function finding({ id, severity, title, sourceA, sourceB, evidence, action }) {
  return {
    id,
    severity,
    title,
    sourceA,
    sourceB,
    evidence,
    action,
    // Always: PennSync surfaces, a human decides.
    advisory: true,
    resolution: null,
  };
}

// OASIS item ids PennSync compares against. Values are read defensively — an
// assessment may store them at the top level or under `oasis_items`.
function oasisValue(oasis, itemId) {
  if (!oasis) return null;
  const items = oasis.oasis_items || oasis.items || oasis.responses || oasis;
  const v = items?.[itemId] ?? items?.[itemId?.toUpperCase?.()] ?? items?.[itemId?.toLowerCase?.()];
  if (v == null) return null;
  return typeof v === "object" ? (v.value ?? v.response ?? null) : v;
}

function num(value) {
  const n = typeof value === "string" ? Number(value) : value;
  return Number.isFinite(n) ? n : null;
}

const CARE_PLAN_TEXT = (carePlans) => (carePlans || [])
  .filter((p) => p && p.status !== "discontinued")
  .map((p) => [p.problem, p.goal, ...(Array.isArray(p.interventions) ? p.interventions : [p.interventions])]
    .filter(Boolean).join(" "))
  .join(" \n");

/**
 * Review one patient's records against each other.
 *
 * @param {{
 *   noteText?: string,
 *   patient?: object|null,
 *   oasis?: object|null,
 *   carePlans?: object[],
 *   openTasks?: object[],
 * }} input
 * @returns {{ findings: object[], counts: object, checked: string[] }}
 */
export function reviewCrossDocumentConsistency({
  noteText = "",
  patient = null,
  oasis = null,
  carePlans = [],
  openTasks = [],
} = {}) {
  const note = String(noteText || "");
  const plans = CARE_PLAN_TEXT(carePlans);
  const findings = [];
  const checked = [];

  // ── Fall risk vs fall-prevention intervention ────────────────────────────
  checked.push("High fall risk with a fall-prevention intervention");
  const fallRiskHigh = patient?.functional_status?.fall_risk === "high"
    || num(oasisValue(oasis, "m1910")) === 1;
  const FALL_INTERVENTION = /\bfall(?:s)?[- ](?:precaution|prevention|risk (?:intervention|reduction))|remove(?:d)? (?:clutter|throw rugs?)|grab bars?|non[- ]?skid|bed alarm|assistive device (?:for|to) (?:safe )?(?:ambulation|transfer)|safety (?:sweep|assessment) of the home/i;
  if (fallRiskHigh && !FALL_INTERVENTION.test(`${note} ${plans}`)) {
    findings.push(finding({
      id: "fall_risk_no_intervention",
      severity: "high",
      title: "High fall risk with no fall-prevention intervention documented",
      sourceA: { record: "Patient / OASIS", detail: "Fall risk recorded as high." },
      sourceB: { record: "Visit note / care plan", detail: "No fall-prevention intervention found." },
      evidence: [patient?.functional_status?.notes].filter(Boolean),
      action: "Document the fall-prevention intervention, or record why none applies.",
    }));
  }

  // ── Severe functional limitation vs "independent" in the narrative ───────
  checked.push("Functional limitation consistent with the narrative");
  const ambulation = num(oasisValue(oasis, "m1860"));
  const bedfast = ambulation != null && ambulation >= 5;
  const INDEPENDENT_NARRATIVE = /\b(?:ambulates? independently|independent (?:with )?ambulation|walks? without assistance|independent with (?:all )?adls?)\b/i;
  if (bedfast && INDEPENDENT_NARRATIVE.test(`${note} ${plans}`)) {
    findings.push(finding({
      id: "function_conflict",
      severity: "high",
      title: "OASIS ambulation response conflicts with the narrative",
      sourceA: { record: "OASIS M1860", detail: `Response ${ambulation} indicates the patient is bedfast or chairfast.` },
      sourceB: { record: "Visit note / care plan", detail: "The narrative describes independent ambulation." },
      evidence: sentencesMatching(`${note}\n${plans}`, INDEPENDENT_NARRATIVE),
      action: "Review which reflects the patient today, and correct the official assessment in your EMR if needed.",
    }));
  }
  if (patient?.functional_status?.ambulation === "bedbound" && INDEPENDENT_NARRATIVE.test(note)) {
    findings.push(finding({
      id: "chart_function_conflict",
      severity: "medium",
      title: "Chart records the patient as bedbound but the note describes independent ambulation",
      sourceA: { record: "Patient chart", detail: "Functional status: bedbound." },
      sourceB: { record: "Visit note", detail: "The narrative describes independent ambulation." },
      evidence: sentencesMatching(note, INDEPENDENT_NARRATIVE),
      action: "Confirm the patient's current status and update the chart and EMR accordingly.",
    }));
  }

  // ── Medication-management deficit vs a medication intervention ────────────
  checked.push("Medication-management deficit with a medication intervention");
  const oralMeds = num(oasisValue(oasis, "m2020"));
  const medDeficit = oralMeds != null && oralMeds >= 2;
  const MED_INTERVENTION = /\bmedication (?:management|teaching|reconcil|set[- ]?up|administration|review)|pill ?box|med(?:ication)? planner|taught .{0,40}medication|reviewed .{0,30}medication/i;
  if (medDeficit && !MED_INTERVENTION.test(`${note} ${plans}`)) {
    findings.push(finding({
      id: "med_deficit_no_intervention",
      severity: "high",
      title: "Medication-management deficit with no related intervention documented",
      sourceA: { record: "OASIS M2020", detail: `Response ${oralMeds} indicates the patient cannot manage oral medications independently.` },
      sourceB: { record: "Visit note / care plan", detail: "No medication-management intervention found." },
      evidence: [],
      action: "Document the medication-management intervention, or record who manages the medications.",
    }));
  }

  // ── Wound on the chart vs wound documentation ────────────────────────────
  checked.push("Documented wound with wound care in the note or care plan");
  const wounds = (patient?.wounds || []).filter(Boolean);
  const WOUND_DOC = /\bwound|pressure (?:ulcer|injury)|dressing|incision|ulcer|skin tear|debride|granulat/i;
  if (wounds.length && !WOUND_DOC.test(`${note} ${plans}`)) {
    findings.push(finding({
      id: "wound_not_documented",
      severity: "high",
      title: "The chart lists an active wound with no wound documentation this visit",
      sourceA: { record: "Patient chart", detail: wounds.map((w) => w.location).filter(Boolean).join(", ") || "Active wound recorded." },
      sourceB: { record: "Visit note / care plan", detail: "No wound assessment or care found." },
      evidence: [],
      action: "Document the wound assessment, or record that the wound has resolved.",
    }));
  }

  // ── Deterioration in the note vs an unchanged care plan ──────────────────
  checked.push("Documented decline with a care-plan response");
  const DECLINE = /\b(?:worsen(?:ed|ing)?|declin(?:e|ed|ing)|deteriorat(?:ed|ing|ion)|increased (?:pain|edema|dyspnea|confusion)|new (?:onset|symptom)|exacerbation|larger|more drainage|unable to .{0,25}(?:anymore|now))\b/i;
  const declineSentences = sentencesMatching(note, DECLINE);
  const PLAN_RESPONSE = /\b(?:plan (?:updated|revised|changed)|new order|notified|increase(?:d)? (?:the )?(?:frequency|visits)|added (?:an )?intervention|care plan (?:review|update))\b/i;
  if (declineSentences.length && !PLAN_RESPONSE.test(`${note} ${plans}`) && !openTasks.some((t) => t && t.status !== "completed")) {
    findings.push(finding({
      id: "decline_no_plan_change",
      severity: "high",
      title: "The note describes a decline with no care-plan change or follow-up recorded",
      sourceA: { record: "Visit note", detail: "The narrative describes worsening or a new symptom." },
      sourceB: { record: "Care plan / tasks", detail: "No care-plan update or open follow-up found in PennSync." },
      evidence: declineSentences,
      action: "Review whether the plan of care needs updating, and create a provider follow-up if indicated.",
    }));
  }

  // ── Discharge language vs active goals ───────────────────────────────────
  checked.push("Discharge documentation against active care-plan goals");
  const DISCHARGE = /\b(?:discharg(?:e|ed|ing) (?:from|today|home)|goals? (?:have been |were )?met|no longer (?:homebound|skilled|eligible))\b/i;
  const activeGoals = (carePlans || []).filter((p) => p && (p.status === "active" || p.status === "in_progress"));
  if (DISCHARGE.test(note) && activeGoals.length) {
    findings.push(finding({
      id: "discharge_with_active_goals",
      severity: "medium",
      title: "Discharge documentation with care-plan goals still active",
      sourceA: { record: "Visit note", detail: "The narrative describes discharge or goals met." },
      sourceB: { record: "Care plan", detail: `${activeGoals.length} goal${activeGoals.length === 1 ? "" : "s"} still active in PennSync.` },
      evidence: sentencesMatching(note, DISCHARGE),
      action: "Close or update the care-plan goals to match the discharge documentation.",
    }));
  }

  findings.sort((a, b) => (SEVERITY_RANK[a.severity] ?? 3) - (SEVERITY_RANK[b.severity] ?? 3));

  return {
    findings,
    counts: {
      high: findings.filter((f) => f.severity === "high").length,
      medium: findings.filter((f) => f.severity === "medium").length,
      total: findings.length,
    },
    checked,
  };
}

/** Sentences of `text` matching `pattern`, capped for display. */
function sentencesMatching(text, pattern) {
  return String(text || "")
    .split(/(?<=[.!?])\s+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s && pattern.test(s))
    .slice(0, 3);
}

/**
 * Record a reviewer's decision on a finding. PennSync stores the CHOICE — it
 * never edits the underlying records.
 *
 * @param {object} finding
 * @param {"acknowledged"|"resolved"|"task_created"|"not_applicable"} resolution
 * @param {{ actorEmail?: string|null, reason?: string, at?: string }} [meta]
 */
export function resolveFinding(finding, resolution, meta = {}) {
  if (!RESOLUTIONS.includes(resolution)) {
    return { ok: false, reason: `Unknown resolution: ${resolution}`, finding };
  }
  // "Not applicable" without a reason is how a real finding quietly disappears.
  if (resolution === "not_applicable" && !String(meta.reason || "").trim()) {
    return { ok: false, reason: "Marking a finding not applicable requires a reason.", finding };
  }
  return {
    ok: true,
    finding: {
      ...finding,
      resolution: {
        status: resolution,
        by: meta.actorEmail || null,
        at: meta.at || new Date().toISOString(),
        reason: meta.reason || "",
      },
    },
  };
}

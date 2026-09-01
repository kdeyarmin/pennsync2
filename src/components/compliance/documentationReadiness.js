// documentationReadiness — "does PennSync know about anything that may need
// attention before this episode is considered documented?"
//
// WHAT THIS IS NOT
// This is NOT a billing gate and NOT a claim-approval engine. It never says
// "ready to bill" and never asserts a claim is payable. PennSync does not hold
// the EMR, the billing system, the payer's rules, or the agency's QA queue, so
// it can only report on what IT knows. That limit is stated in the disclaimer
// this module exports, which every surface must show.
//
// WHY DETERMINISTIC
// Every check reads a persisted field or a record's presence. No LLM decides
// whether an episode has a documentation problem — the answer must be
// reproducible and explainable down to the exact record that triggered it.
//
// Pure + offline so it runs under `node --test`. It may only import other plain
// `.js` modules with explicit extensions (never `.jsx`).

/** The three permitted statuses. Deliberately excludes anything billing-shaped. */
export const READINESS_STATUSES = Object.freeze({
  clear: {
    id: "clear",
    label: "No PennSync issues detected",
    tone: "success",
    order: 0,
  },
  review: {
    id: "review",
    label: "Review recommended",
    tone: "warning",
    order: 1,
  },
  action: {
    id: "action",
    label: "Action needed",
    tone: "destructive",
    order: 2,
  },
});

/**
 * The standing limit-of-knowledge statement. Exported so its wording is asserted
 * by tests and cannot drift into a billing or compliance claim.
 */
export const READINESS_DISCLAIMER =
  "PennSync documentation readiness is based only on information available to "
  + "PennSync and does not replace the EMR, billing system, agency QA, or formal "
  + "pre-bill review.";

const SEVERITY_TO_STATUS = { action: "action", review: "review" };

function finding(id, severity, title, detail, extra = {}) {
  return { id, severity, status: SEVERITY_TO_STATUS[severity], title, detail, ...extra };
}

/**
 * Assess one episode's documentation readiness.
 *
 * Every argument is optional: an absent dataset produces a finding that says
 * PennSync could not check it, never a silent pass. "PennSync has no record of
 * X" and "X is fine" are different answers and must read differently.
 *
 * @param {{
 *   visits?: object[],
 *   drafts?: object[],
 *   complianceAudits?: object[],
 *   openTasks?: object[],
 *   oasisFindings?: object[],
 *   adrCases?: object[],
 *   incidents?: object[],
 *   patient?: object|null,
 *   now?: Date,
 * }} input
 * @returns {{ status: object, findings: object[], counts: object, checked: string[], disclaimer: string }}
 */
export function assessDocumentationReadiness({
  visits = [],
  drafts = [],
  complianceAudits = [],
  openTasks = [],
  oasisFindings = [],
  adrCases = [],
  incidents = [],
  patient = null,
  now = new Date(),
} = {}) {
  const findings = [];
  const checked = [];

  // ── Unfinished PennSync drafts ───────────────────────────────────────────
  checked.push("Unfinished PennSync documentation drafts");
  const unfinished = drafts.filter((d) => d && (d.note || d.text || "").trim().length > 20);
  if (unfinished.length) {
    findings.push(finding(
      "unfinished_draft", "action",
      `${unfinished.length} unfinished PennSync draft${unfinished.length === 1 ? "" : "s"}`,
      "A note is still in progress in PennSync and has not been finished or moved to the EMR.",
      { records: unfinished.map((d) => d.id).filter(Boolean) },
    ));
  }

  // ── Visits whose PennSync note never reached the EMR ─────────────────────
  checked.push("EMR handoff progress on documented visits");
  const documented = visits.filter((v) => v && v.nurse_notes);
  const notHandedOff = documented.filter(
    (v) => !v.emr_handoff_status || v.emr_handoff_status === "not_started",
  );
  if (notHandedOff.length) {
    findings.push(finding(
      "emr_handoff_missing", "review",
      `${notHandedOff.length} visit${notHandedOff.length === 1 ? "" : "s"} not reported as copied to the EMR`,
      "PennSync has no self-reported EMR handoff for these visits. PennSync cannot see the EMR, "
      + "so this only means nobody recorded the step here.",
      { records: notHandedOff.map((v) => v.id).filter(Boolean) },
    ));
  }

  // ── Documentation-quality signals persisted at save time ─────────────────
  checked.push("Homebound and skilled-need support on documented visits");
  const homeboundGaps = documented.filter((v) => v.homebound_status_verified === false);
  if (homeboundGaps.length) {
    findings.push(finding(
      "homebound_support", "action",
      `Homebound support flagged on ${homeboundGaps.length} visit${homeboundGaps.length === 1 ? "" : "s"}`,
      "PennSync's rules did not find adequate homebound support in the saved note. Potential "
      + "Medicare documentation gap — review recommended.",
      { records: homeboundGaps.map((v) => v.id).filter(Boolean) },
    ));
  }
  const skilledGaps = documented.filter((v) => v.skilled_intervention_documented === false);
  if (skilledGaps.length) {
    findings.push(finding(
      "skilled_need_support", "action",
      `Skilled-need support flagged on ${skilledGaps.length} visit${skilledGaps.length === 1 ? "" : "s"}`,
      "PennSync's rules did not find an adequately described skilled need in the saved note.",
      { records: skilledGaps.map((v) => v.id).filter(Boolean) },
    ));
  }

  // ── Unresolved critical compliance-audit findings ────────────────────────
  checked.push("Unresolved PennSync compliance findings");
  const criticalAudits = complianceAudits.filter(
    (a) => a && a.status === "critical" && !a.acknowledgment?.acknowledged,
  );
  if (criticalAudits.length) {
    findings.push(finding(
      "unresolved_critical_finding", "action",
      `${criticalAudits.length} unresolved critical finding${criticalAudits.length === 1 ? "" : "s"}`,
      "A critical PennSync compliance finding has not been acknowledged or resolved.",
      { records: criticalAudits.map((a) => a.id).filter(Boolean) },
    ));
  }

  // ── Grounding deferred ───────────────────────────────────────────────────
  checked.push("Deferred AI verification passes");
  const pendingGrounding = documented.filter((v) => v.grounding_pending === true);
  if (pendingGrounding.length) {
    findings.push(finding(
      "grounding_pending", "review",
      `${pendingGrounding.length} note${pendingGrounding.length === 1 ? "" : "s"} saved before AI verification finished`,
      "The deterministic value guard ran, but the AI grounding pass was deferred. Re-open and "
      + "re-check the note to complete the verification trail.",
      { records: pendingGrounding.map((v) => v.id).filter(Boolean) },
    ));
  }

  // ── Unresolved provider follow-up ────────────────────────────────────────
  checked.push("Unresolved provider follow-up");
  const open = openTasks.filter((t) => t && !["completed", "cancelled", "resolved"].includes(t.status));
  const providerOpen = open.filter((t) =>
    /\b(?:notify|notification|provider|physician|prescriber|md)\b/i.test(`${t.title || ""} ${t.type || ""}`));
  if (providerOpen.length) {
    findings.push(finding(
      "provider_followup_open", "review",
      `${providerOpen.length} unresolved provider follow-up${providerOpen.length === 1 ? "" : "s"}`,
      "PennSync has open provider follow-up items. A task existing here does not mean the "
      + "provider was contacted or responded.",
      { records: providerOpen.map((t) => t.id).filter(Boolean) },
    ));
  }

  // ── OASIS review findings ────────────────────────────────────────────────
  checked.push("Possible OASIS inconsistencies flagged in PennSync");
  const openOasis = oasisFindings.filter((f) => f && !f.resolved && f.status !== "resolved");
  if (openOasis.length) {
    findings.push(finding(
      "oasis_inconsistency", "review",
      `${openOasis.length} possible OASIS inconsistenc${openOasis.length === 1 ? "y" : "ies"}`,
      "PennSync's review flagged possible inconsistencies. Corrections, if any, must be made on "
      + "the official assessment in the EMR.",
      { records: openOasis.map((f) => f.id).filter(Boolean) },
    ));
  }

  // ── ADR / audit exposure ─────────────────────────────────────────────────
  checked.push("Open ADR / audit requests");
  const openAdr = adrCases.filter((c) => c && !["closed", "submitted"].includes(c.status));
  if (openAdr.length) {
    findings.push(finding(
      "adr_open", "action",
      `${openAdr.length} open ADR / audit request${openAdr.length === 1 ? "" : "s"}`,
      "An additional documentation request is open for this episode.",
      { records: openAdr.map((c) => c.id).filter(Boolean) },
    ));
  }

  // ── Incidents ────────────────────────────────────────────────────────────
  checked.push("Unresolved incidents");
  const openIncidents = incidents.filter((i) => i && !["closed", "resolved"].includes(i.status));
  if (openIncidents.length) {
    findings.push(finding(
      "incident_open", "review",
      `${openIncidents.length} unresolved incident${openIncidents.length === 1 ? "" : "s"}`,
      "An incident report for this patient has not been closed.",
      { records: openIncidents.map((i) => i.id).filter(Boolean) },
    ));
  }

  // ── Recertification window ───────────────────────────────────────────────
  checked.push("Recertification window");
  const admissionTime = Date.parse(String(patient?.admission_date || ""));
  if (Number.isFinite(admissionTime) && !patient?.discharge_date) {
    const days = Math.floor((now.getTime() - admissionTime) / 86400000);
    if (days >= 0) {
      const dayInEpisode = days % 60;
      if (dayInEpisode >= 51) {
        findings.push(finding(
          "recertification_due", "review",
          "Recertification window is open",
          `Day ${dayInEpisode + 1} of the current 60-day episode. Confirm the recertification `
          + "schedule and complete it in your EMR.",
        ));
      }
    }
  }

  // ── Nothing to check ─────────────────────────────────────────────────────
  // "PennSync has nothing recorded" is NOT the same answer as "everything is
  // fine", and must not be reported as a clean pass.
  if (!documented.length && !drafts.length) {
    findings.push(finding(
      "no_documentation", "review",
      "No PennSync documentation for this episode",
      "PennSync holds no visit note or draft for this patient, so it cannot assess readiness. "
      + "The documentation may exist only in the EMR.",
    ));
  }

  const worst = findings.reduce(
    (acc, f) => (READINESS_STATUSES[f.status].order > READINESS_STATUSES[acc].order ? f.status : acc),
    "clear",
  );

  return {
    status: READINESS_STATUSES[worst],
    findings,
    counts: {
      action: findings.filter((f) => f.status === "action").length,
      review: findings.filter((f) => f.status === "review").length,
      total: findings.length,
    },
    checked,
    disclaimer: READINESS_DISCLAIMER,
  };
}

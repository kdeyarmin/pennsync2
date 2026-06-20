// Maps the deterministic chart cross-check + multi-visit trend findings onto the
// stable reporting fields the dashboards already read, so conflicts and trends
// surface in compliance reporting instead of living only in the live UI:
//   - ComplianceAudit.issues  (structured element/severity/problem/suggestion)
//   - ComplianceAudit.status  (escalated to "critical" on a critical conflict)
//   - Visit.ai_tags           (concise, searchable trend/safety tags)
//   - Visit.compliance_issues (human-readable strings for critical conflicts)
// Pure + offline, so it is unit-testable under `node --test`.

/** @typedef {{ id: string, severity: string, category: string, message: string }} ChartFinding */
/** @typedef {{ key: string, label: string, direction: string, display: string }} SustainedTrend */

/**
 * @param {ChartFinding[]} chartFindings
 * @returns {{ element: string, severity: string, problem: string, suggestion: string }[]}
 */
export function toAuditIssues(chartFindings = []) {
  return chartFindings.map((f) => ({
    element: f.category,
    severity: f.severity,
    problem: f.message,
    suggestion: "",
  }));
}

/**
 * Escalate the score-derived audit status when a critical chart conflict (e.g. an
 * allergy conflict) is present — a 100%-coverage note that documents a contra-
 * indicated medication must not report "passed".
 * @param {"passed"|"flagged"|"critical"} baseStatus
 * @param {ChartFinding[]} chartFindings
 */
export function escalateAuditStatus(baseStatus, chartFindings = []) {
  return chartFindings.some((f) => f.severity === "critical") ? "critical" : baseStatus;
}

/**
 * Concise, searchable tags for Visit.ai_tags ("for searchability and trend
 * analysis") — one per sustained trend and one per chart finding category.
 * @param {SustainedTrend[]} sustainedTrends
 * @param {ChartFinding[]} chartFindings
 * @returns {string[]} de-duplicated, order-preserving
 */
export function toAiTags(sustainedTrends = [], chartFindings = []) {
  const tags = [];
  for (const t of sustainedTrends) tags.push(`trend:${t.key}:${t.direction}`);
  for (const f of chartFindings) tags.push(`chart_flag:${f.category.toLowerCase()}`);
  return Array.from(new Set(tags));
}

/**
 * Visit.compliance_issues strings for the critical chart conflicts only (the
 * ones that warrant visit-level visibility, not the informational reconciliation
 * prompts).
 * @param {ChartFinding[]} chartFindings
 * @returns {string[]}
 */
export function toComplianceIssueStrings(chartFindings = []) {
  return chartFindings
    .filter((f) => f.severity === "critical")
    .map((f) => `[${f.category}] ${f.message}`);
}

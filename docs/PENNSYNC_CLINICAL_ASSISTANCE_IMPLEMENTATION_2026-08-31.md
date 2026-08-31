# PennSync Clinical Assistance Implementation — 2026-08-31

Status: **in progress** (living document — updated throughout the implementation pass)

## 1. Executive summary

PennSync is an **assistance platform that sits beside the agency's EMR**, not a
replacement for it. This pass audited `main` as of `fdc810d` and implements the
remaining gaps in the field-nurse assistance workflow, with a bias toward
deterministic, unit-testable logic over LLM judgment for anything regulatory or
patient-safety related.

The audit found the repository **far more complete than the brief assumes**. The
Smart Note compliance engine, denial guardrail, rule governance, AI provenance
registry, ADR center, denial-feedback loop, draft resilience, PDGM provenance
gating and dashboard "Today" queues are already built and tested. The genuine
gaps concentrate in five places:

1. **EMR handoff is not a first-class workflow.** Copying the finished note into
   the EMR — the single most important step in the product's stated purpose —
   was one unlabelled `Copy` button with no section-level copy, no failure
   recovery, no review acknowledgement, and no self-reported handoff state.
2. **The note-quality engine measures presence, not strength.** `requiredElements`
   asks "is homebound mentioned?", not "is the homebound statement actually
   defensible?" — so `Patient is homebound.` scored as documented.
3. **No copy-forward / cloning defence exists.** `visitComparison.js` compares
   *vitals*, not *text*.
4. **The OASIS item bank contains factually wrong CMS item attributions.**
5. **No consolidated Documentation Readiness view** for QA/office staff.

Two outright factual/regulatory defects were found and corrected (§6).

## 2. Current-state audit

Method: read `AGENTS.md`; read `main` at `fdc810d`; inspected 116 commits since
2026-08-01; read `docs/` and `docs/audits/`; read every module named in the
brief plus the surrounding feature paths.

### What is already built and working (do not rebuild)

| Area | Evidence |
| --- | --- |
| Deterministic required-element checking | `src/components/smartNote/compliance/requiredElements.js` (26 KB, 37 elements, per-service-line/visit-type matrices) + tests |
| Gap questions + answer adequacy | `answerAdequacy.js`, `presenceDetection.js`, `completenessCritic.js`, `criticReconcile.js` |
| Placeholder blocking | `placeholderGuard.js`, `draftScan.js`, `PlaceholderAlert.jsx`, hard-blocked at both step 1 and step 2 |
| Value guard / AI grounding | `valueGuard.js`, `generation.js` (`groundNote`), `provenance.js` |
| Chart cross-check + allergy conflict | `chartCrossCheck.js`, `ChartCrossCheckPanel.jsx` |
| Critical-vital detection | `noteEscalation.js`, `VitalSignValidator.jsx`, `visit/vitalEscalation.js` |
| Prior-visit comparison + sustained trends | `visitComparison.js` (`compareVisits`, `detectSustainedTrends`) |
| Denial-risk checks | `compliance/denialGuardrailEngine.js`, `DenialRiskPanel.jsx` |
| Facility documentation rules | `facilityDocRules.js`, `FacilityRequirementsChecklist.jsx`, critical-override ack trail |
| Deterministic coverage score | `coverageScore.js` |
| Follow-up task creation from a note | `generateFollowUpTasks`, `FollowUpTasksPanel.jsx` |
| Nurse acknowledgement controls | `AcknowledgeGate.jsx` + `ComplianceAudit.acknowledgment` |
| Draft restoration / per-patient isolation | `SmartNoteAssistant.jsx` `draftKeyFor(pid)` + `src/lib/draftNotes.js` (IndexedDB, commit-on-transaction) |
| Save-error handling | `OfflineSaveError`, `SaveBlockers.jsx` |
| Mobile sticky actions | `StickyActionBar.jsx` (+ the Aug 2026 shell-overflow fixes) |
| Medicare rule governance | `MedicareComplianceRule` entity (`cop_reference`, `effective_date`, `severity`, `validation_criteria`, `remediation_guidance`, `is_active`), `defaultMedicareRules.js`, `ruleLibrary.js` |
| Rule-version preservation on findings | `ComplianceAudit.rule_versions` written by `reportingFields.buildAuditFields` |
| AI provenance | `src/lib/aiProvenanceRegistry.js` + tests |
| ADR / audit assistance | `src/components/adr/**` (`adrRequirements`, `adrAnalysis`, `adrPacketReview`, `adrChecklistPrint`, `adrDeadlines`) + `ADRCenter.jsx` |
| Denial feedback loop | `src/components/billing/denialFeedback.js` + tests |
| Today / work queues | `dashboard/todayPriorities.js`, `dashboard/coreWorkQueues.js` + tests |
| PDGM provenance/gating | `pdgm/caseMixWeightsLoader.js`, `pdgmRates.js`, `hhCaseMixWeightsCy2026.js`, `paWageIndexCy2026.js`, parity tests |
| Targeted training from gaps | `training/DeficitAnalyzer.jsx`, `SkillGap` entity, `MicroLearningProgress` |
| PHI-minimisation policy | `src/lib/localPhiKeys.js` (+ deliberate draft-note exemption, documented) |

## 3. Current State Gap Matrix

Severity of "Risk if left unchanged" is graded R1 (patient-safety / regulatory
misstatement) → R3 (workflow friction).

| # | Recommendation | Current status | Already-implemented behaviour | Remaining gap | Files / modules | Risk if unchanged | Planned implementation | Test strategy |
|---|---|---|---|---|---|---|---|---|
| 1 | Never say "Medicare compliant" | **Implemented incorrectly** | Coverage score is deterministic and honest | Final screen headline read **"Medicare-Compliant Note Ready"** — PennSync certifying Medicare compliance, which it must never do | `smartNote/FinalNoteDisplay.jsx` | **R1** — asserts a regulatory conclusion PennSync cannot make | Replace with "Documentation review complete", state the coverage number as *PennSync rule coverage*, add the standing EMR disclaimer | Component test asserting the string is gone and the disclaimer renders |
| 2 | Phase 1A — EMR handoff as a first-class workflow | **Missing** | One `Copy` / `Copy All` button; clipboard failure toasts | No section-level copy, no per-section success state, no "Copy to EMR" primary action, no self-reported handoff status, no standing disclaimer | `smartNote/FinalNoteDisplay.jsx`, `SmartNoteAssistant.jsx` | **R2** — the product's core step is the least supported | New pure `emrHandoff.js` (section splitter + status model) + `EmrHandoffPanel.jsx`; `Visit.emr_handoff_status` / `emr_handoff_history` | Unit tests for the splitter and status machine; component test for copy success + clipboard failure |
| 3 | Phase 1B — review acknowledgement | **Missing** | Chart/denial/facility acks exist, but none covers "I reviewed the AI-assisted text" | No AI-review attestation, no note hash | same as 2 | R2 — AI-governance gap | Acknowledgement inside the handoff panel; stores user, time, note hash, ai_assisted flag | Unit test on the hash + record builder |
| 4 | Phase 1C — explain every flagged issue | **Partial** | Denial guardrail gives message + remediation; required elements give hint/question/example | Homebound/skilled-need/response/teaching findings had no *evidence* row (what in the note triggered this) | `compliance/requiredElements.js` | R2 — black-box findings | `documentationStrength.js` returns rule, trigger, evidence spans, what's missing, remediation | Unit tests per analyzer |
| 5 | Phase 1D — homebound helper | **Partial** | Presence regex + hint + example | `Patient is homebound.` passes the presence check and scores as documented | `requiredElements.js` | **R1** — the #1 home-health denial reason documented as satisfied | Deterministic strength grading (weak/partial/strong) over factor detection: medical reason, device, human assist, dyspnea, pain, weakness, cognitive/safety, taxing effort, leaves-home frequency | Unit tests over weak/partial/strong corpora |
| 6 | Phase 1E — skilled-need helper | **Partial** | Presence regex | No check that the *skill* is described (assessment performed, judgment, teaching, response) | `requiredElements.js` | **R1** | Same strength model, skilled-need factors | Unit tests |
| 7 | Phase 1F — patient response | **Partial** | Presence regex | No detection of *intervention without response* | `requiredElements.js` | R2 | Deterministic intervention-sentence detection + unmatched-response finding | Unit tests |
| 8 | Phase 1G — teaching / teach-back | **Partial** | Presence regex | "Education provided." passes | `requiredElements.js` | R2 | Strength model: topic, learner, method, teach-back, understanding, remaining need | Unit tests |
| 9 | Phase 1H / Phase 10 — cloning advisory | **Missing** | `visitComparison.js` compares *vitals only* | No text-similarity engine at all | new | **R1** — cloned notes are a top ADR/denial trigger | New `noteSimilarity.js`: normalized shingle Jaccard, repeated-sentence detection, per-category repeats (intervention/response/education/homebound/function), identical-vitals detection. Advisory, never accusatory, never blocking | Unit tests incl. a "legitimately similar but distinct" negative case |
| 10 | Phase 1I — change-in-condition helper | **Implemented** | `noteEscalation.js` + `compareVisits` + one-tap `onEscalate` → Task, with "Follow-up task created" wording (never "provider notified") | — | — | — | Marked complete | Existing tests |
| 11 | Phase 2 — Visit Prep | **Missing (field visits)** | `referral/socVisitPrep.js` exists for *intake/SOC only* | No pre-visit briefing for an ordinary field visit | new | R2 | Pure `visitPrep.js` briefing builder + progressive-disclosure panel with direct actions | Unit tests over the builder |
| 12 | Phase 3 — Today workflow | **Implemented** | `todayPriorities.js` + `coreWorkQueues.js` + `TodayPriorities.jsx`, each row action-linked | Documentation-readiness and unresolved-gap rows | `dashboard/*` | R3 | Feed readiness output into the existing queue rather than rebuild | Existing tests + new readiness tests |
| 13 | Phase 4 — OASIS assistance framing | **Partial** | Guidance, deterministic checks, suggestion panels, no iQIES submission anywhere | Center is titled/positioned as *completing* OASIS; item bank has no version metadata | `pages/OASISCenter.jsx`, `oasis/oasisQuestions.jsx` | R2 | Re-frame as **OASIS Review & Assistance Center** + versioned spec layer | Contract test over the spec registry |
| 14 | Phase 4 — item-bank correctness | **Implemented incorrectly** | 37 items | `M2102`→"Physical Therapy", `M2110`→"Occupational Therapy", `M2200`→"Speech-Language Pathology" are **wrong CMS attributions** (M2102/M2110 are assistance items; M2200 Therapy Need was retired under PDGM). The same repo contradicts itself at `AIProactiveOASISAssistant.jsx:138`. Several response sets are abbreviated (M1020, M1030, M1100, M2420) | `oasis/oasisQuestions.jsx` | **R1** — a nurse could carry a wrong item number/response into the official record | Versioned `specs/` registry with per-item verification status; demote the three mis-numbered items to clearly-labelled PennSync internal screening items; flag abbreviated response sets in the UI. **No CMS content fabricated** | Contract test: every item is classified; no unverified item may be presented as an official CMS item |
| 15 | Phase 5 — note/OASIS/care-plan consistency | **Partial** | `oasisDeterministicChecks.js`, `dischargeComplianceEnforcer.js`, `comorbidityReconciler.js` | No cross-document (note ↔ OASIS ↔ care plan) finding model with source A/source B evidence | new | R2 | Deterministic `crossDocumentConsistency.js` | Unit tests per finding type |
| 16 | Phase 6 — medication reconciliation | **Partial** | `medication/drugInteractions.js` (deterministic, limited list), `MedicationReconciliation` entity, allergy cross-check | No normalization layer, no explicit "limited list" labelling, no external-knowledge adapter seam | `medication/**` | R2 | `medicationNormalize.js` + discrepancy engine + honest source labelling + adapter seam | Unit tests |
| 17 | Phase 7 — closed-loop provider follow-up | **Partial** | Full token lifecycle exists **for referrals** (`ProviderFollowUpToken`, `validateFollowUpToken`, `submitFollowUpResponse`); clinical escalation creates a `Task` and says "Follow-up task created" (correct wording) | No clinical-side lifecycle states beyond Task status | `tasks/**`, `referral/**` | R2 | Deterministic lifecycle model + unresolved queue derivation | Unit tests on the state machine |
| 18 | Phase 8 — Documentation Readiness | **Missing** | Individual signals exist and are persisted | Nothing aggregates them into a per-episode readiness view for QA | new | R2 | Pure `documentationReadiness.js` with the three mandated statuses + drill-down + disclaimer. Explicitly **not** a billing gate | Unit tests over each status transition |
| 19 | Phase 9 — Medicare rule engine governance | **Implemented** | IDs, category, CoP ref, service line, visit types, severity, criteria, remediation, examples, effective date, active flag, and `ComplianceAudit.rule_versions` snapshotting | Language audit only | `compliance/**` | R3 | Language sweep (see #1) | Existing tests |
| 20 | Phase 11 — low-connectivity draft protection | **Implemented** | Per-patient session + IndexedDB draft, commit-on-transaction, explicit `OfflineSaveError`, no false "charted" claim, deliberate PHI-purge exemption documented | — | `lib/draftNotes.js` | — | Marked complete | Existing tests |
| 21 | Phase 12 — PDGM assistance | **Implemented** | Loader with source/provenance/validation state; parity tests; estimates labelled | — | `pdgm/**` | — | Marked complete | Existing tests |
| 22 | Phase 13 — ADR/audit assistance | **Implemented** | Requirements, analysis, packet review, checklist print, deadlines | — | `adr/**` | — | Marked complete | Existing tests |
| 23 | Phase 14 — denial feedback | **Implemented** | `billing/denialFeedback.js` | — | — | — | Marked complete | Existing tests |
| 24 | Phase 15 — training from real gaps | **Implemented** | `DeficitAnalyzer.jsx`, `SkillGap`, `MicroLearningProgress` | — | — | — | Marked complete | Existing tests |
| 25 | Phase 16 — AI governance | **Implemented** | `aiProvenanceRegistry.js` (feature, model, actor, source record, status, hashes, reviewer) | Handoff acknowledgement should feed it | `lib/aiProvenanceRegistry.js` | R3 | Reuse, don't rebuild | Existing tests |
| 26 | Phase 17 — PHI minimisation | **Implemented (policy)** | `localPhiKeys.js`; note history retained deliberately for prior-note comparison | — | — | — | No change: removing note history would break #9 and the carry-forward pre-fill | — |
| 27 | Phase 18 — security / production readiness | **Partial, externally blocked** | RLS blocks on every entity, `securityGuardrails.test.js`, `HOSTED-RLS-PROOF.md` | Hosted RLS proof requires external validation — must stay marked outstanding | `base44/**`, `docs/HOSTED-RLS-PROOF.md` | R2 | Do not mark complete | Existing contract tests |
| 28 | Phase 19 — UX / mobile | **Implemented** | Aug 2026 sticky/scroll fixes, 44–48 px targets, `CollapsibleSection`, `StickyActionBar` | New surfaces must match | — | R3 | Build new panels on the existing primitives | a11y + component tests |

## 4. Features already complete (not rebuilt)

Rows 10, 12, 19, 20, 21, 22, 23, 24, 25, 26, 28 above. These were verified by
reading the implementation, not by trusting an older audit document.

## 5. Features changed

_(filled in as work lands — see §7)_

## 6. Regulatory / factual defects corrected

_(filled in as work lands)_

## 7. Files changed by area

_(filled in as work lands)_

## 8. Tests added

_(filled in as work lands)_

## 9. Validation results

_(filled in at the end)_

## 10. Remaining limitations

_(filled in at the end)_

## 11. Hosted / external dependencies

_(filled in at the end)_

## 12. Recommendations intentionally not implemented

_(filled in at the end)_

## 13. Remaining backlog

_(filled in at the end)_

## 14. Risks still requiring human / clinical / regulatory review

_(filled in at the end)_

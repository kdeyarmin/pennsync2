# PennSync Feature Audit

_Audit of overlapping/redundant app surfaces, with keep / merge / cut decisions._
_Last updated: 2026-06-21 (branch `claude/app-functions-audit-963reb`)._

## Summary

The codebase is already cleanly consolidated: of ~120 page files only the two public
token-gated pages (`JoinTelehealth`, `SignerPortal`) sit outside the nav manifest, ~16
retired pages are redirect-only (deleted), and ~39 are reused as hub tabs. There is **no
dead code** to remove — the open question is purely **which capabilities to keep**.

This audit focuses on the four overlapping clusters. The redirect-based cuts below are
**done** on this branch; the larger UI merges are left as a **plan** (they need real work).

---

## Done on this branch (redirect-based cuts)

Each retired page was removed from `src/lib/nav.manifest.js` (so it drops out of the
sidebar, command palette, breadcrumbs and Admin Console directory automatically) and a
redirect was added to `src/routes.jsx`. **The page files remain on disk, so every change
is reversible** — restore the manifest entry and delete the redirect to bring one back.

| Cut page | Redirects to | Rationale |
|---|---|---|
| `ClinicalChart` | `/Patients` | Its Vitals / Care Plan / OASIS panes already exist as tabs in `PatientDetails`. No inbound links. |
| `MedicalScribe` | `/ClinicalDocumentation?tab=record` | Identical record→transcribe (`generateNoteFromRecording`)→review (`ConstrainedNoteReviewer`) pipeline; the Record/Upload tab is a strict superset (defers patient binding). Mirrors the existing `/VisitScribe` redirect. |
| `ClinicalInsightsDashboard` | `/PredictiveAnalytics` | Population-trend / disease-progression views duplicate Predictive Analytics + the Reports Population Health tab. Admin-only. |
| `DocumentationTraining` | `/NurseTrainingHub?tab=documentation` | Documentation-training theme consolidated under the Nurse Training Hub. **Caveat below.** |
| `NurseEducationVideos` | `/NurseTrainingHub` | 9 hard-coded YouTube links with client-side checkboxes; no DB backing. |

Supporting cleanups:
- `nav.manifest.js`: dropped now-unused `Activity` and `Mic` icon imports.
- `AdminConsoleDirectory.jsx`: removed the dead `ClinicalInsightsDashboard` entry.
- `MobileHeader.jsx`: removed `ClinicalChart` from the back-button `BACK_PAGES` list.

### ⚠️ Caveat — DocumentationTraining

Earlier analysis assumed `DocumentationTraining` was already embedded in
`NurseTrainingHub`. It is **not** — the Hub's "documentation" tab renders the separate
`NurseTraining` page. `DocumentationTraining` has genuinely distinct content
(InteractiveTutorials, PracticeNoteSubmission, ScenarioSimulator, AISkillAssessment) that
is **not** replicated in that tab. The redirect makes this content unreachable.

**Recommended follow-up:** before deleting the file, either (a) add a real
"Documentation Training" tab to `NurseTrainingHub` that lazy-loads
`DocumentationTraining`, or (b) confirm the tutorials/scenarios/AI-assessment features are
not wanted and then remove the file. Until then the file is preserved on disk.

---

## Planned (larger merges — UI work, not yet done)

These require combining real components, so they are documented rather than auto-applied.

### Analytics: 5 pages → 3

| Page | Decision | Notes |
|---|---|---|
| `ReportsAnalytics` | **Keep** (compliance/PDGM/export home) | Move its KPI tab into `AnalyticsDashboard`. Its **Population Health tab makes on-demand LLM calls** — biggest recurring AI cost in this cluster. |
| `AnalyticsDashboard` | **Keep** (becomes "Performance & Compliance") | Absorb ReportsAnalytics' KPI tab; has unique per-user drill-down + PDF/JSON export. |
| `PredictiveAnalytics` | **Keep** (risk/forecast home) | |
| `AgencyAnalytics` | **Keep** (business: financial + training) | Genuinely distinct; no LLM. |
| `ClinicalInsightsDashboard` | **Cut** ✅ done | Redirected to Predictive Analytics. |

**AI-cost win:** Population-health / risk analysis is currently implemented in three places
(`ReportsAnalytics` Population Health, `PredictiveAnalytics`, `ClinicalInsightsDashboard`).
Cutting the third and consolidating on Predictive Analytics stops paying for the same
analysis multiple times. Prefer batch/pre-computed scoring over the on-demand `invokeLLM()`
call in ReportsAnalytics' Population Health tab.

### Training: 6 pages → 2 (+ EducationLibrary reclassified)

| Page | Decision | Notes |
|---|---|---|
| `LearningCenter` (1,376 lines) | **Merge** with `MyLearning` | Two competing learner "home" dashboards. |
| `MyLearning` (182 lines) | **Merge target** | Keep its clean `?tab=` wrapper pattern; fold in LearningCenter's catalog/certs/renewals/gamification. |
| `NurseTrainingHub` | **Keep** | AI-personalized hub. |
| `DocumentationTraining` | **Cut** ✅ done (see caveat) | |
| `NurseEducationVideos` | **Cut** ✅ done | |
| `EducationLibrary` | **Keep, recategorize** | Not staff training — it manages **patient** education materials. Move under Patient Care, not Learning & Resources. |

### Patient views: 4 → 3 (done)

`ClinicalChart` cut (above). `PatientDetails`, `PatientRecordDashboard`, and
`PatientAlerts` are distinct (full record / browse-all / alert monitoring) and stay.
Optional later: extract a shared patient-selector component used by RecordDashboard and
Alerts.

---

## Verification

- `nav.manifest.js` and `routes.jsx` remain the single sources of truth; sidebar, palette,
  breadcrumbs, and Admin Console directory all derive from the manifest, so the cuts
  propagate automatically.
- Old links/bookmarks to the five cut pages resolve via the new redirects (no
  PageNotFound).
- Run `npm run build` and `npm run test:utils` to confirm.

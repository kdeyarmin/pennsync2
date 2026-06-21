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
| `DocumentationTraining` | `/NurseTrainingHub?tab=documentation` | Standalone documentation-training page; **file deleted** (content confirmed not wanted). See note below. |
| `NurseEducationVideos` | `/NurseTrainingHub` | 9 hard-coded YouTube links with client-side checkboxes; no DB backing. |

Supporting cleanups:
- `nav.manifest.js`: dropped now-unused `Activity` and `Mic` icon imports.
- `AdminConsoleDirectory.jsx`: removed the dead `ClinicalInsightsDashboard` entry.
- `MobileHeader.jsx`: removed `ClinicalChart` from the back-button `BACK_PAGES` list.

### DocumentationTraining — deleted

`DocumentationTraining` was **not** embedded in `NurseTrainingHub` (the Hub's
"documentation" tab renders the separate `NurseTraining` page), so it was a genuinely
standalone page. Its content (InteractiveTutorials, PracticeNoteSubmission,
ScenarioSimulator, AISkillAssessment) was reviewed and confirmed not wanted, so the page
file `src/pages/DocumentationTraining.jsx` has been **deleted**. The
`/DocumentationTraining → /NurseTrainingHub?tab=documentation` redirect is retained so old
links/bookmarks still resolve.

---

## Larger merges (done)

These combined real components, so they were done after confirming the canonical page.

### Analytics: 5 pages → 3 ✅ done

Direction chosen: fold **AnalyticsDashboard** into **ReportsAnalytics**.

| Page | Decision | Notes |
|---|---|---|
| `ReportsAnalytics` | **Canonical** (single operational dashboard) | Now hosts a **"Performance Dashboard"** tab that lazy-embeds AnalyticsDashboard (via `EmbeddedPage`, so no duplicate header). Its **Population Health tab makes on-demand LLM calls** — biggest recurring AI cost in this cluster. |
| `AnalyticsDashboard` | **Folded in** ✅ | `/AnalyticsDashboard → /ReportsAnalytics?tab=perf-dashboard`. File kept (rendered as the embedded tab). |
| `PredictiveAnalytics` | **Keep** (risk/forecast home) | |
| `AgencyAnalytics` | **Keep** (business: financial + training) | Genuinely distinct; no LLM. |
| `ClinicalInsightsDashboard` | **Cut** ✅ | Redirected to Predictive Analytics. |

**AI-cost win:** population/risk analysis previously lived in three places
(`ReportsAnalytics` Population Health, `PredictiveAnalytics`, `ClinicalInsightsDashboard`);
cutting the third consolidates on Predictive Analytics. Still recommended: prefer
batch/pre-computed scoring over the on-demand `invokeLLM()` call in ReportsAnalytics'
Population Health tab.

### Training: 6 pages → 2 (+ EducationLibrary reclassified) ✅ done

Direction chosen: **LearningCenter** is canonical; **MyLearning** folded in.

| Page | Decision | Notes |
|---|---|---|
| `LearningCenter` (1,376 lines) | **Canonical hub** | Converted to controlled `?tab=` tabs; added **My Courses / In-Services / Annual Education / Transcripts** tabs that lazy-embed the former MyLearning spokes. |
| `MyLearning` | **Folded in** ✅ | `/MyLearning → /LearningCenter`; its sub-page redirects (MyTraining, MyAnnualEducation, AnnualMandatoryEducation, Annual/Employee transcripts) now deep-link to the matching LearningCenter tab. Removed from the sidebar. |
| `NurseTrainingHub` | **Keep** | AI-personalized hub. |
| `DocumentationTraining` | **Cut + file deleted** ✅ | |
| `NurseEducationVideos` | **Cut** ✅ | |
| `EducationLibrary` | **Keep** | Not staff training — it manages **patient** education materials. (Recategorization under Patient Care still recommended; not yet moved.) |

`TrainingCoursePlayer`'s breadcrumb parent and its "Back to My Learning" / "View All
Certificates" buttons were repointed from MyLearning to the LearningCenter tabs.

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
- Old links/bookmarks to the cut/folded pages resolve via the new redirects (no
  PageNotFound).
- Verified on this branch: `npm run build` (exit 0), `npm run test:utils` (594 pass),
  `npm run test:components` (82 pass, incl. the nav-page mount tests).

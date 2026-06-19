# PENNSync — Function Audit & Remediation

**Date:** 2026-06-19
**Scope:** A check of the application's functions to find any that are **not / cannot be fully implemented** or that **provide little to no help**, plus remediation of everything actionable.

---

## Executive summary

PENNSync is a large Base44 healthcare-operations app: a React 19 + Vite frontend (`src/`, 124 routed pages, ~60 component domains) and 208 Base44 Deno edge functions (`base44/functions/`), with 115 entity schemas.

**The app is largely complete and functional.** The audit found **no "coming soon" / placeholder pages**, and the small page files are intentional thin route-wrappers. The genuine findings fall into three buckets:

1. **A small number of real code defects** — fixed in this change.
2. **AI / voice / video / email features that are fully coded but cannot function until external credentials are configured** — this is the honest answer to "functions that cannot be fully implemented." These are deployment/config gaps, not code bugs. The fixes here make them fail *gracefully* and documents the required keys.
3. **A few clinical / compliance design choices that warrant human review** — addressed conservatively and flagged **REQUIRES REVIEW**.

Verification of this change set: `npm run lint` (0 errors), `npm run build` (passes), `npm test` (utils + 93 component tests pass), `npm run check:backend-transpile` (204 functions clean), and a new unit test for the added helper (6 cases).

---

## Methodology

Three independent code sweeps (app map, stub/incomplete-code hunt, data/integration audit) followed by manual verification of every finding before acting. Verification **corrected several false alarms** (see section A5) — those are recorded so they aren't re-flagged later.

---

## A1 — Genuine defects (FIXED in this PR)

| Finding | Location | Fix |
|---|---|---|
| **Dead link** — a `<a href="#">Click Here</a>` that goes nowhere. The event-type descriptions it promised are already rendered in the dropdown directly below it. | `src/pages/EventReport.jsx` | Removed the dead anchor; replaced with a plain hint. |
| **No graceful degradation for unconfigured AI features** — 9 backend functions return a raw HTTP 500 whose technical body ("OpenAI API key not configured") leaked straight to end users. | 9 frontend call sites (see A2) | Added `src/lib/aiFeatureError.js#configNotReadyMessage()`; each call site now shows "This … feature isn't set up yet. Please ask an administrator to configure it." and falls back to prior behavior otherwise. |
| **PHI-in-logs risk** — backend functions emitted patient/user data via `console.log` (e.g. `onUserSignup` logged user emails). | `base44/functions/onUserSignup`, `generatePatientHandout`, `processDischargeReport`, `generateNoteFromRecording`, `preparePDFWithPatientInfo` | Redacted PHI (emails) from logs; gated operational logs behind a new `FUNCTIONS_DEBUG` flag (mirrors the existing `TWILIO_WEBHOOK_DEBUG` precedent); converted error-path `console.log` to `console.warn`. |
| **Silently swallowed backend failures** — `.catch(()=>{})` hid real failures (fax template use-count, mark-SMS-read, account-deletion notice, login-activity audit). | `src/components/fax/FaxTemplateManager.jsx`, `src/components/messaging/SmsConversationList.jsx`, `src/pages/UserSettings.jsx`, `src/components/Layout.jsx` | Replaced silent swallows with `console.warn`. |

> A `generateTrainingCourse` backend fix is also included: it instantiated the OpenAI client at module load, so a missing key crashed the whole function with an opaque error. It now guards first and returns the canonical "OpenAI API key not configured" message (which the new frontend helper recognizes).

---

## A2 — Cannot be fully implemented **without external configuration** (deployment checklist, NOT code bugs)

These functions are fully implemented but are inert or error until the corresponding credential is set. **This is the core answer to "functions that cannot be fully implemented."** All required keys are now documented in `.env.example`, and the UI now degrades gracefully when they're missing.

| Capability | Function(s) | Requires |
|---|---|---|
| Audio / Whisper transcription, SOAP-note-from-audio | `transcribeAudioWithWhisper`, `transcribeAndGenerateSOAPNote` | `OPENAI_API_KEY` |
| AI training-course generation, training-attempt grading, corrective-action plans, in-service rebuild | `generateTrainingCourse`, `gradeTrainingAttempt`, `triggerCorrectiveActionPlan`, `rebuildExistingInServices` | `OPENAI_API_KEY` |
| AI fax cover-page generation | `generateFaxCoverPage` | `ANTHROPIC_API_KEY` |
| AI training-video generation | `generateTrainingVideo`, `generateTrainingCourse` (video opt.) | `HEYGEN_API_KEY` |
| Telehealth video tokens | `createTelehealthToken` | `TWILIO_API_KEY`, `TWILIO_API_SECRET` |
| SMS / voice / fax | Twilio function family | `TWILIO_ACCOUNT_SID` + `TWILIO_AUTH_TOKEN` (or in-app `IntegrationSecret`); `TWILIO_FAX_NUMBER` for fax |
| Notification emails (~10 fns) | `SendEmail` consumers | Base44 dashboard email provider (no code key) — **silent no-op risk if unconfigured** |
| ~30 AI analysis features | `InvokeLLM` consumers | Base44 dashboard AI provider (no code key) |

**Architectural note (recommendation only):** `generateTrainingCourse` and `generateFaxCoverPage` call OpenAI / Anthropic **directly** rather than via Base44 `InvokeLLM`, so they bypass Base44 metering/billing and need their own keys. Consolidating the text-only calls onto `InvokeLLM` would unify billing (Whisper transcription and HeyGen video can't be consolidated this way).

---

## A3 — Design / judgment items (REQUIRES REVIEW)

These change clinical or legal runtime behavior, so they were handled **conservatively** and need human sign-off before merge.

### 1. Revenue-maximization framing in the clinical OASIS AI — REQUIRES CLINICAL REVIEW
`src/components/oasis/AISmartOASISAssistant.jsx` previously instructed the model to *"Maximize PDGM reimbursement"* and even to suggest *"scoring M1850 as '2' instead of '1' increases payment"* — an upcoding/compliance risk.
- **Done:** the prompt is reframed to prioritize clinically accurate, fully compliant documentation that reflects the patient's true condition; all dollar-figure / "score higher for payment" instructions removed; the valuable cross-validation/discrepancy logic kept. A lighter parallel reframe was applied to `src/components/pdgm/CaseMixOptimizationPanel.jsx` (admin-only).
- **Still open (follow-up):** the component's UI still foregrounds revenue cards (`revenue_impact`, `revenue_at_risk`, etc.). Reframing the prompt without de-emphasizing the revenue UI is only half the fix — **product/clinical should decide** whether to also de-emphasize those displays.

### 2. Safety/compliance features default OFF — REQUIRES REVIEW
- **Done:** `tcpa_quiet_hours_enabled` now **defaults ON** in `src/components/admin/CallingHoursPanel.jsx` (the legally-safer floor — it gates outbound-SMS timing in `sendSms` / `dispatchScheduledSms` / `redriveFailedSms`). The UI default and the unset-value derivation both default ON; only an explicit `false` disables it. **Note:** backend enforcement reads the stored `AgencySettings` value, so for existing deployments this takes effect once an admin saves settings — there is no silent runtime flip. Consider a one-time backfill if immediate enforcement is desired.
- **Left as-is (recommendation only):** `business_hours_enabled` (operational preference), `documentation_auto_enhance` (OFF is correct — don't auto-modify clinical docs without opt-in), `voicemail_enabled` (operational), and `compliance_strict_mode` (flip only after tracing its downstream consumers).

### 3. State-reportable incident notifications swallowed — REQUIRES REVIEW
`src/components/incident/StateReportableForm.jsx` `.catch(()=>{})`'d admin notification emails for state-reportable events — if every email failed, no one was alerted yet the form reported success.
- **Done:** per-failure `console.warn`; if **all** recipients fail, a non-blocking toast warns "Report saved, but admin notifications could not be sent. Please notify your administrator directly." Submission of the state-mandated report is never blocked by a notification failure.

---

## A4 — Low-value / hygiene

- **Backend log noise:** ~73 `console.log` across 20 functions. Gated/redacted in the highest-risk files (A1). `deduplicatePatients` logs were intentionally **left untouched** — they emit only counts/timings (no PHI) and the file contains a generated-engine block marked "do not edit by hand."
- **Direct-SDK metering bypass:** see A2 architectural note.
- Intentional `console.error` / borderline catches were left in place for error visibility.

---

## A5 — Investigated and found WORKING AS DESIGNED (false alarms — do not re-flag)

- **`ClinicalBestPracticeAlerts.jsx` "X Pending"** — the `implemented` flag is a **per-note documentation check** (did the nurse mention weight / edema / foot exam in *this* note), not an unimplemented feature. Working correctly.
- **Tiny page files** (`FaxDashboard.jsx`, `MyTraining.jsx`, `MyAnnualEducation.jsx`, etc.) — intentional thin route-wrappers delegating to shared embedded components so the same UI can render inside hubs/tabs.
- **`try{}catch{}` around `localStorage` / `sessionStorage` / audio APIs** — deliberate private-mode / already-stopped guards. Correctly left alone.
- **"QualityDashboard / ProductivityDashboard stubs"** cited by an automated pass **do not exist** in the codebase.

---

## Files changed in this PR

**New:** `src/lib/aiFeatureError.js`, `src/lib/aiFeatureError.test.js`, `docs/FUNCTION_AUDIT_2026-06-19.md`

**Frontend:** `src/pages/EventReport.jsx`, `src/pages/AITrainingGenerator.jsx`, `src/pages/UserSettings.jsx`, `src/components/Layout.jsx`, `src/components/smartNote/{WhisperTranscriber,EnhancedAudioRecorder,SOAPAudioRecorder}.jsx`, `src/components/fax/{AICoverPageEditor,FaxCoverSheetGenerator,FaxTemplateManager}.jsx`, `src/components/training/{AIComplianceInServicesHub,AnnualMandatoryEducationHub}.jsx`, `src/components/telehealth/VideoRoom.jsx`, `src/components/oasis/AISmartOASISAssistant.jsx`, `src/components/pdgm/CaseMixOptimizationPanel.jsx`, `src/components/admin/CallingHoursPanel.jsx`, `src/components/messaging/SmsConversationList.jsx`, `src/components/incident/StateReportableForm.jsx`

**Backend:** `base44/functions/generateTrainingCourse/entry.ts`, `base44/functions/onUserSignup/entry.ts`, `base44/functions/generatePatientHandout/entry.ts`, `base44/functions/processDischargeReport/entry.ts`, `base44/functions/generateNoteFromRecording/entry.ts`, `base44/functions/preparePDFWithPatientInfo/entry.ts`

**Config:** `.env.example` (documents the AI/Twilio-Video keys + `FUNCTIONS_DEBUG`), `package.json` (registers the new test)

---

## Recommended follow-ups (not in this PR)

1. **Clinical/compliance sign-off** on the A3 reframes before merge.
2. Decide whether to **de-emphasize the revenue UI** in `AISmartOASISAssistant.jsx`.
3. Provision the A2 keys (or accept those features being disabled) and configure the Base44 email/AI providers.
4. Consider a **one-time backfill** so TCPA quiet hours enforce immediately for existing agencies.
5. Optionally consolidate direct OpenAI/Anthropic text calls onto Base44 `InvokeLLM` for unified metering.

# Full-App Logic & Process Review — 2026-06-19

A multi-domain correctness pass over PennSync2 (React 19 + Vite frontend; ~208 Base44/Deno
`entry.ts` edge functions; Twilio SMS/voice/fax; OASIS/PDGM clinical logic; offline-first PHI
handling). Goal: find and fix **genuine logic/security bugs** beyond what the existing test
suite already covers.

**Method.** Five domain-focused review passes — clinical logic, communications (Twilio),
shared infrastructure/offline/dedup, the Deno backend functions, and React data-flow/routing —
each instructed to surface only concrete, verified defects (not style or the known
`exhaustive-deps` warnings). Every item below was re-verified by hand against the source before
acting.

## Baseline (before and after — all green)

- `npm run lint` — 0 errors (152 pre-existing `exhaustive-deps`/unused warnings; unchanged)
- `npm run test:utils` — 472 → **474** (this PR adds 2 regression tests)
- `npm run test:components` — 93, all pass
- `npm run build` — pass
- `npm run typecheck:utils` — pass
- `npm run check:backend-transpile` — 204 functions transpile cleanly
- dedupe engine in sync; dedupe parity 37 pass

---

## Fixed in this PR

### 1. `valueGuard` false-positively blocked faithful wound-dimension rewrites (clinical, frontend)
`src/components/smartNote/compliance/factExtraction.js`

The single-measurement `MEASUREMENT_PATTERN` also matched the second operand of an `NxM cm`
dimension, so `"4 x 5 cm"` extracted `["4x5cm","5cm"]` while the compact `"4x5 cm"` extracted
only `["4x5cm"]`. When a nurse's draft wrote `"4x5 cm"` and the generated note faithfully
rephrased it as `"4 x 5 cm"`, the hallucination guard flagged the phantom `"5cm"` as an
unverified value and **blocked a correct note**. Fixed with a negative lookbehind so the single
pattern no longer matches the second operand of a dimension; all spacings now normalize to one
token. Two regression tests added (`valueGuard.test.js`).

### 2. Super-admin owner locked out of admin navigation (access control, frontend)
`src/components/Layout.jsx`

`App.jsx`'s route guard grants admin routes to `role === 'admin' || isSuperAdmin(user)` (so an
unpromoted owner can land on `SuperAdminConfig` and self-bootstrap via `ensureSuperAdmin`), but
`Layout.jsx` computed `isAdmin` from the narrower `role === 'admin'` only. The owner could reach
admin routes by URL yet saw **no admin nav at all** — including the sole link to
`SuperAdminConfig` — defeating the documented bootstrap. Fixed by using the shared
`isSuperAdmin` helper so nav visibility matches route access (sidebar, mobile menu, command
palette).

### 3. `clear_access_token` URL flag persisted → permanent logout loop (auth, frontend)
`src/lib/app-params.js`

`clear_access_token` is a one-shot directive, but it was read through `getAppParamValue`, which
**persists** any URL value to `localStorage`. After a user ever hit `?clear_access_token=true`,
every subsequent clean-URL load re-read the stored `'true'` and wiped the auth token again —
forcing re-auth on each load. Fixed by reading the flag straight from the URL (never persisting)
and proactively clearing any previously-stored flag so affected sessions self-heal.

### 4. IDOR: any user could read another nurse's compliance/performance data (security, backend)
`base44/functions/generatePersonalizedTraining/entry.ts`

The function used a caller-supplied `nurse_email` to read another user's `ComplianceAudit`,
`TrainingRecommendation`, and `UserActivity` via the RLS-bypassing `asServiceRole` client, with
no ownership/admin check — and echoed audit issues back in the response. Its direct sibling
`generatePersonalizedLearningPath` already has the correct guard; copied it verbatim
(`403` unless own email or admin).

### 5. Service-role CarePlan writes to an arbitrary `patient_id` (security, backend)
`base44/functions/generateCarePlansFromReferral/entry.ts`

Only gate was `if (!user)`; it then created active `CarePlan` records for whatever `patient_id`
the body supplied via `asServiceRole`. Added the established user-scoped
`Patient.filter({ id })` + `404` guard (mirrors `predictiveRiskAnalysis`,
`generateCarePlanSuggestions`, …) so the caller must be able to see the patient before any write.

### 6. Fabricated specific age in a Medicare compliance document (data integrity, backend)
`base44/functions/generateReferralOASISPacket/entry.ts`

For any patient aged ≥ 90, the M1910 homebound justification asserted the literal
`"Advanced age (96 years) ..."` — a hardcoded age in a real (unlabeled) compliance section.
Fixed to interpolate the patient's actual age.

### 7. CSV formula injection in the learning report export (security, backend)
`base44/functions/exportLearningReportCSV/entry.ts`

Cells were quote-escaped but not formula-escaped, so a text value (e.g. an AI-generated course
title) beginning with `= + - @` executes when an admin opens the export in Excel/Sheets. Added a
single-quote prefix for text cells beginning with a formula trigger (numbers left intact so
negative counts stay numeric).

---

## Second sweep — additional backend IDOR/auth fixes + React correctness fixes

A second review pass (remaining ~140 backend functions, all entity RLS policies, and the
largest React pages) surfaced and fixed the following.

**Backend — IDOR: caller-supplied id used with `asServiceRole` and no ownership gate.** Each now
authorizes against the documented access model (assigned-nurse-or-admin **in code**, RLS-independent,
mirroring `getScopedPatientAlerts`) before reading PHI into a prompt / response or writing to a
chart: `enhanceNoteOptimized`, `smartNoteAssistant` (all 4 actions), `extractClinicalEvents`,
`mapNoteToOASIS`, `batchAIAnalysis`, `predictSupplyNeeds`, `generateFollowUpTasks` (made the
RLS-scoped read blocking), `processFaxOCR` (sent_by gate), `extractReferralDataForSmartNote`
(switched to the user-scoped Referral read), `analyzeRealTimePerformance` (nurse_email self-clamp),
and `searchPDFs` (non-admins restricted to their assigned patients' PDFs).

**Backend — missing authorization on privileged crons / helpers.** Added the opt-in
`INTERNAL_FN_SECRET` + admin lockdown (mirroring `checkExpiredInvitations`) to
`processTrainingRenewals`, `processAnnualEducationRenewals`, `scheduledGuidelineSync`,
`syncFaxStatuses`, `pollFaxStatuses`; and an `auth.me()` + 401 to `analyzeFaxPriority`.

**Backend — body-trust, broken function, pagination.** `triggerCorrectiveActionPlan` now
re-fetches the canonical `TrainingAttempt` by id instead of acting on the posted body;
`scheduleSignatureReminders` was completely non-functional (invalid `subject`/`type`/`related_*`
fields + admin-only write via the user-scoped client → threw for every caller) and now creates a
valid service-role Notification; `processTrainingRenewals`/`processAnnualEducationRenewals`
(renewal-cert truncation) and `assignAnnualLearningPlan`/`assignInService` (roster truncation)
were bounded at 5000 instead of 100/500.

**Frontend — React correctness.** `CarePlanManagement` rendered an inline `BuilderTab` component
as `<BuilderTab />`, remounting the whole build-plan subtree (and dropping input focus) on every
keystroke — now invoked as `{BuilderTab()}`. `AIComplianceAuditor` now invalidates
`['complianceAudits']` after creating an audit so the compliance dashboards refresh. Added
crash guards (`?.`) for unguarded LLM-optional fields in `AIDataValidationEngine` and
`AITrainingModuleGenerator`.

## Open: entity-level RLS for patient-clinical tables (needs your decision)

The RLS audit found ~20 PHI-bearing entities with **no `rls` block** (any authenticated user can
read/write all rows): `Medication`, `MedicationReconciliation`, `OASISUpload`, `OASISAssessment`,
`DischargeSummary`, `DocumentSignature`, `FaxLog`, `ScheduledFax`, `Referral`, `Document`,
`PatientAlert`, `PatientRiskAssessment`, and others, plus `TeamNote`/`Message`/`SystemLog` with
open writes. This is the single largest security gap. **It is deliberately NOT auto-patched**
because: (1) the documented correct model is *"by patient access"* (`Patient.assigned_nurses`),
but rows like `Medication` carry only `patient_id` — the repo RLS DSL (field-equals-user only,
no cross-entity join) **cannot express that**, so naive `created_by` owner-scoping would *block an
assigned nurse from a colleague's entries* (e.g. break the medication list) — a patient-safety
regression; (2) the checklist (`docs/SECURITY-RLS-CHECKLIST.md` §2/§7) designates RLS as Base44
**dashboard** configuration plus a multi-role verification protocol that can't be run in this
environment. The backend IDOR fixes above are the RLS-independent code-layer defense for the
*function* endpoints; the remaining exposure is *direct client entity reads*, which only RLS
closes.

**Resolution (chosen): safe subset in-repo + a dashboard spec for the rest.** Applied in-repo
(verified non-breaking): `OfflineDataCache` (read+write `user_email` + admin — per-user cache),
`SystemLog` (write → admin — no user-scoped client writes), `Message` (write → sender ∨ recipient
∨ admin — preserves recipients' `read_by` updates), and `TeamNote` (write → `created_by` + admin —
the only client op is create). The patient-clinical tables (`Medication`, `OASISUpload`,
`DischargeSummary`, `FaxLog`, `Referral`, `PatientAlert`, …) need the *"by patient access"* rule
that the repo DSL can't express, so they are specified per-entity in
**`docs/RLS-REMEDIATION-SPEC-2026-06-19.md`** to apply + verify (§7) in the Base44 dashboard.

## Third sweep — signature/signer flow + offline-sync subsystem

**Signature & signer flow.**
- **CRITICAL — anonymous signature forgery (FIXED, public path).** The external
  `/signer` portal wrote the legally-binding signature client-side, straight to the RLS-less
  `DocumentSignature` entity via the public SDK, with the signer token never checked — anyone could
  forge a signature on any HIPAA consent/order as any signer. (A pre-existing `_token`-vs-`token`
  prop-name bug meant the token never even reached the signer component.) Fixed by adding a
  token-validating backend endpoint **`submitSignerSignature`** (mirrors `validateSignerToken`:
  active + unexpired token, the document must be in the token's package, not already signed, signer
  identity taken from the token — never the client; deactivates the token once the package is fully
  signed) and rewiring `SignerDocumentSigner` to call it with the now-correctly-passed token.
  *Coupled follow-up:* the `DocumentSignature` entity itself still has no write-RLS, so to also stop
  a direct entity write the entity must be locked to service-role — which requires routing the ~10
  **authenticated** internal signing/creation writes (`SignDocument`, `PDFSignatureCapture`,
  `InteractivePDFSigner`, `SecureESignatureCapture`, the request-creators) through backend endpoints
  too. Tracked in `docs/RLS-REMEDIATION-SPEC-2026-06-19.md`. (Those paths require login, so they are
  not the anonymous-forgery vector.)
- **Package marked "completed" with zero signatures (FIXED)** — `onDocumentSigned` used
  `filter({package_id}).every()`; creators don't always back-fill `package_id`, so `[].every()`
  returned true. Now computes completion from `pkg.document_signatures`.
- **Deferred (documented):** token over-broad disclosure (`validateSignerToken` returns every
  document to any one signer's token) and post-signing PDF swap (`DocumentReplacementDialog`
  carry-forward) — both need the per-signer/content-hash binding that's part of the signing-endpoint
  follow-up.

**Offline-sync subsystem (data loss / duplication under ordinary field conditions — FIXED).**
The three localStorage sync paths each did read-all → async-drain → write-back-all, clobbering any
change a nurse saved during a background sync; and lacked reentrancy guards, so overlapping
syncs created duplicate visits. Fixed `OfflineStorage.syncPendingChanges` and
`OfflineSyncManager`/`OfflineDataManager` to re-read-and-merge by stable id before writing, and
added `useRef` in-flight guards. (The IndexedDB `OfflineManager` path already had idempotency +
a guard and was unchanged.) *Deferred (low-confidence):* `OfflineVisitNoteCapture` queuing a visit
without an `offline_` id (latent orphan risk) and the idle-purge read-modify-write window.

## Follow-up: the previously-deferred backend findings are now fixed

These were initially documented rather than changed; a follow-up pass implemented all of them.
The Deno backend can't be executed here, so every change mirrors an existing in-repo pattern
and is covered by `npm run check:backend-transpile` (204 functions clean). Residual caveats that
genuinely need a platform/schema change are called out.

- **`generateTrainingCertificate` — self-mintable certificate → FIXED.** Now re-derives the
  module/date/score from a record the **caller owns** (their `TrainingCertificate` by `user_id`
  or completed `TrainingCompletion` by `nurse_email`), resolving all three caller param shapes
  (`moduleName` / `module_title`+`certificate_id` / `completion_id`+`module_id`). An account with
  no completed training — or a request for a record it doesn't own — is rejected `403`. This also
  repairs the callers that were silently `400`ing (they passed `completion_id`/`module_title`,
  which the old code ignored). *Residual:* the legacy caller that passes only `moduleName` (and
  whose module can't be matched to an owned record) still renders from the request after the
  owns-some-completed-training gate; tightening to an exact per-module match would need that
  caller to pass the record id.
- **`handleTwilioFaxWebhook` — monotonic status guard → FIXED.** Added `FAX_RANK`
  (queued<sending<delivered/failed) mirroring `SMS_RANK`/`CALL_RANK`. Safe against the retry
  flow because the `failed → queued` resend transition is driven by the cron, not a webhook.
- **`autoRetryFailedFaxes` — transient HTTP rejection → FIXED.** A non-2xx resend is now
  classified; transient (429/5xx) reschedules within budget like the network-error branch, only
  permanent errors / spent budget exhaust + notify.
- **`dispatchScheduledSms` — claim TOCTOU → MITIGATED (platform-limited).** Added an
  application-layer idempotency check on the deterministic `client_message_id` immediately before
  sending (settles the row from the prior `SmsMessage` and skips), and corrected the overstated
  comment. *Residual (genuine platform limit, not an oversight):* a true exactly-once guarantee
  needs a DB-level unique constraint on `SmsMessage.client_message_id` or an atomic
  compare-and-swap. The Base44 entity-schema format used in this repo exposes only
  `name`/`type`/`properties`/`required`/`rls` — **no `unique`/`index`/`constraint` keys** — and
  the `SmsMessage`/`ScheduledSms` entities aren't even mirrored in-repo, so this cannot be
  expressed as a schema change here; it requires Base44 platform support. The layered
  claim + re-read + `client_message_id` idempotency is the strongest in-repo mitigation.
- **`awardBadgeOnCompletion` — ownership + idempotency → FULLY FIXED (incl. schema change).**
  Enforces `attempt.user_id === user.email` (non-admin) and short-circuits if already processed.
  Added a `badges_processed_at` field to the `TrainingAttempt` entity schema, checked at the top
  and set after a successful award, so **every** attempt — including ones that earn no badge — is
  idempotent against replay (no more streak/courses farming). The `UserBadge` check is kept as a
  backstop for attempts processed before the marker field existed.
- **`analyzeMedicationReconciliation` → FIXED.** Requires + scope-validates `patient_id`
  (user-scoped read + 404) and now lists `ageRisks` in the stored `discrepancies` array so the
  Beers/contraindication rows match the counts.
- **`processScheduledFaxesByPriority` → FIXED.** Now filters due rows server-side
  (`scheduled_time $lte now`) sorted ascending, so the most-overdue faxes are no longer starved
  under a backlog.
- **`migrateExistingData` → FIXED.** Both list calls now pass a `5000` bound instead of relying
  on the SDK default page size.
- **`sendBatchFax` → FIXED.** Added the `resolveTwilioCreds` env→in-app `IntegrationSecret`
  fallback so batch/scheduled fax works for agencies that configure Twilio in-app.
- **`handleTwilioVoiceCall` → FIXED.** The `TWILIO_WEBHOOK_DEBUG` log no longer prints the Twilio
  params (caller PHI) — it logs only which signature headers are present, mirroring the SMS handler.

---

## Verified correct (sampled — no change needed)

Clinical: `oasisScoringEngine`, `oasisAnalytics`, `patientMatchScore`, `pdgmGrouper`,
`pdgmRates` (+ backend `calculatePDGM`), `vitalEscalation`, `clinicalIndicators`,
`pdgmClinicalGroup`, `drugInteractions`, and the rest of `smartNote/compliance/*`.
Infra/offline: `aiCall`, `invokeLLM`, the `offlineKeys` PHI-purge classification (no prefix
collisions; preserve/purge buckets consistent), `phiStorage`, `indexedDB`, `query-client`,
`debounce`, `superAdmin`, `patientDuplicateUtils` (+ backend dedupe soft-merge/parity).
Comms: all voice/messaging/fax pure utils, `twilioSetup`, `phoneAnalytics`, the webhook smoke
tool, and the backend signature verification (HMAC-SHA1, fail-closed, timing-safe) with the
SMS/call monotonic-rank guards.
Backend security fundamentals: `processPatientFileUpdate` SSRF allowlist, the four
document-signing webhooks (canonical re-fetch), `autoAssignNurseToPatient`,
`createUserWithTempPassword`/`adminResetPassword`/`fixUserAccount` (admin-gated, CSPRNG),
`ensureSuperAdmin`/`saveTwilioSecret`/`savePDGMRateConfig` (no secret leakage).
Routing: all 121 manifest pages resolve to real route files; redirects resolve; no duplicate
paths; no conditional-hook violations in the reviewed pages; per-route error boundaries present.

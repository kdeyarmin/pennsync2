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

## Documented, not changed (verified real, but deferred — risk/contract/infra)

These are genuine findings, but the fix carries more risk than the value of a blind change
in an environment where the Deno backend can't be executed or runtime-tested. Each should be
done with a deploy-time check or a coordinated frontend change.

- **`generateTrainingCertificate` — self-mintable certificate.** Renders a branded completion
  certificate purely from body-supplied `moduleName`/`completionDate`/`score` with no
  completion check. Hardening requires re-deriving identity/score from a persisted
  `TrainingCertificate`/`TrainingCompletion` — but the existing callers pass **inconsistent
  parameter shapes** (`module_title`/`certificate_id` vs `moduleName`), so a safe fix must
  reconcile the caller contract first. Recommend routing all issuance through the hardened
  `issueCertificate` path.
- **`handleTwilioFaxWebhook` — no monotonic status guard.** Unlike the SMS/call siblings
  (`SMS_RANK`/`CALL_RANK`), it dedupes only on exact equality, so an out-of-order Twilio callback
  can regress a `delivered` fax. A naive `FAX_RANK` guard risks breaking the legitimate
  `failed → sending` retry-resend transition, so it needs to be designed against the
  `autoRetryFailedFaxes` resend flow.
- **`autoRetryFailedFaxes` — transient HTTP rejection treated as permanent.** A 429/503 on
  resend marks the fax permanently `failed` and notifies the sender, unlike the adjacent
  network-error branch which correctly reschedules within budget.
- **`dispatchScheduledSms` — non-atomic claim (TOCTOU).** The "claim then re-read" scheme can
  double-send under overlapping cron runs; needs an atomic compare-and-swap or a single-writer
  lock (infra-dependent).
- **`awardBadgeOnCompletion` — no attempt-ownership/idempotency.** A perfect-score `attempt_id`
  can be replayed to farm badges/points/streak. Gamification integrity only (no PHI/billing).
- **`analyzeMedicationReconciliation` — unvalidated `patient_id`; `ageRisks` counted but not
  listed** in the stored `discrepancies` array.
- **`processScheduledFaxesByPriority` — descending+capped pagination** can starve the
  earliest-due faxes under a > 200 backlog; the sibling `processScheduledFaxes` filters
  server-side correctly.
- **`migrateExistingData`** lists active patients with no limit (silently caps at the SDK
  default ~50); admin-only, idempotent, re-runnable. Add a `5000` bound.
- **`sendBatchFax`** is the only fax sender without the `resolveTwilioCreds` env→in-app
  fallback (fail-closed, not a security bug).
- **`handleTwilioVoiceCall`** logs the full Twilio param set (incl. caller number) when
  `TWILIO_WEBHOOK_DEBUG` is on, unlike the other handlers (operator-gated).

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

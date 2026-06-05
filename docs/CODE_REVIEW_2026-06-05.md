# Comprehensive Code Review & Remediation Plan — 2026-06-05

Full-codebase bug/perf/security/process review of PennSync2 (React 19 + Vite frontend
~293K LOC; 205 Base44/Deno `entry.ts` edge functions ~42K LOC; Twilio comms; OASIS/PDGM
clinical logic; PHI handling). This review was produced by five domain-focused passes
(auth/webhooks, SMS/fax comms, clinical logic, React frontend, shared utilities) plus
manual verification of the highest-impact findings.

**Baseline at review time (all green):** `npm run lint` (0), `npm run test:utils` (430),
`npm run test:components` (pass), `npm run build` (pass).

**Relationship to existing docs:** complements `docs/APP_IMPROVEMENT_ROADMAP_2026-06.md`
and `docs/SECURITY-RLS-CHECKLIST.md`. Items already tracked there are marked _(tracked)_;
everything else is **new**. Where the roadmap notes an operational mitigation (e.g. "enable
only one fax cron"), this plan adds the **code-level** fix so correctness no longer depends
on deploy-time configuration.

Status legend: ☐ todo · ☑ done in this PR · ⏸ deferred (needs product/clinical decision or
larger refactor, sequenced in §7).

---

## 1. Severity summary

| Sev | Count | Themes |
|----|------|--------|
| Critical | 7 | unauth'd privileged endpoints, duplicate PHI faxes/charges, reminder-spam loops, billing inflation, wrong-patient merges, camera/mic privacy leaks |
| High | 18 | credential echo, forgeable signing token, fabricated clinical data, missed vital escalation, dedup data-loss, stale-closure voice, CSV injection, retry off-by-ones |
| Medium | 20 | classification/threshold bugs, idempotency gaps, React leaks/races, E.164 parsing, process/CI gaps |
| Low | 10+ | info leaks, minor races, heuristics, DST drift |

---

## 2. Security & auth (backend)

- **S1 (Critical, new)** `checkExpiredInvitations/entry.ts` — no caller auth; runs under
  `asServiceRole`, enumerates all pending invitations (PII), emails every admin, and writes
  `status:'expired'`. `userManagement` gates the identical logic behind admin; this copy
  doesn't. → Add `auth.me()` admin gate (or scheduler shared-secret). **Fix: add gate.**
- **S2 (Critical, partly tracked)** `autoApproveInvitedUser/entry.ts` — no caller auth; flips
  `is_approved`/assigns `role` under service role. Roadmap lists it as "confirm cron-only";
  add code-level gate regardless. → admin gate or `INTERNAL_FN_SECRET`/scheduler secret.
- **S3 (High, new)** `resetUserPassword/entry.ts:77` — cleartext temp password returned in the
  HTTP response (exposed to browser/proxy logs); email is the intended channel. Also `:24`
  modulo bias (alphabet 56, `256%56=32`) and `:84` `error.message` leak. → Remove
  `tempPassword` from response; rejection-sample RNG; generic error.
- **S4 (High, tracked A1)** Delete dev-only `createGitHubPR`, `fetchPullRequests`,
  `fetchLatestRepo` — no `auth.me()`, spend a server `GITHUB_TOKEN`, hardcode owner/repo. No
  callers found. → Delete all three.
- **S5 (Med, new)** Client error leaks: `validateSignerToken:129`, `manageUserVerification:70`
  (`JSON.stringify(error, getOwnPropertyNames)`), `userManagement:84`, `fixUserAccount:25`,
  `resetUserPassword:84` return raw error text. → Generic message + server-side log.
- **S6 (Med, new)** `handleTelnyxWebhook` double-processes Twilio fax payloads alongside
  `handleTwilioFaxWebhook` and resets `final_failure_notified=false` on every terminal-failure
  re-delivery (`:115`) → duplicate final-failure notifications. Doesn't read in-app
  `IntegrationSecret` token (env-only). → Dedupe handlers; guard notified-reset; align creds.
- **S7 (Med, tracked)** `onUserSignup` webhook secret is opt-in (fail-open when unset). →
  Make mandatory (env-gated rollout). _Deferred: needs deploy coordination (§7)._
- **S8 (Low, new)** `manageUserVerification` `inspect`/`raw_*` debug actions dump SDK internals
  and enable unthrottled OTP verify/resend. → Remove debug passthroughs from prod.
- **S9 (Low, tracked)** Static `x-webhook-secret` bypass on all Twilio handlers has no
  replay/timestamp protection. → Restrict to non-prod or add timestamp+nonce. _Deferred._

## 3. Security & data integrity (frontend)

- **S10 (High, new)** `signer/SignatureRequestCreator.jsx:201` — document-signing token built
  from `Math.random().toString(36)` (predictable, low-entropy). This is the bearer credential
  `validateSignerToken` accepts for PHI document access; backend `generateSignerToken` correctly
  uses `crypto.getRandomValues`. → Use `crypto.getRandomValues` (≥128-bit).
- **S11 (Med, new)** `documents/SecureDocumentShare.jsx:54` — "secure" share link uses
  `Math.random()` (9 base36 chars) and has no backing storage (comment: "in real implementation,
  encrypt and store"). Either insecure or non-functional. → CSPRNG token + real persistence, or
  remove the stub.
- **S12 (Med, new)** `admin/AdminUserSetup.jsx:20-29` — generated password uses `Math.random()`
  and a biased `sort(() => Math.random()-0.5)` shuffle. → CSPRNG + Fisher-Yates.
- **S13 (Med, new)** 7 frontend files call `base44.asServiceRole.*` (`UserActivityDashboard`,
  `SecurityAuditScheduler`, `activityTracker`, `PatientEducationHub`, `NoteReviewPanel`,
  `SignatureTrackingPanel`, `BulkDocumentPackageCreator`). Service-role from the browser either
  silently runs as the user (misleading, relies on broad RLS) or fails. → Move privileged
  reads/writes to backend functions; audit RLS. Also `base44Client.js` sets `requiresAuth:false`
  while the comment says "authentication required". _Partly deferred (§7)._

## 4. Clinical safety, AI trust & billing

- **B1 (Critical, new — billing)** `calculatePDGM/entry.ts:93-116,327` — comorbidity match is
  `includes()` on bare ICD prefixes and **ignores negation**: `"No CHF"`, `"denies COPD"` count
  as present high-value comorbidities, inflating `comorbidityMultiplier`/`totalPayment`. → Match
  coded comorbidities on tokenized ICD boundaries; run negation detection on free-text.
- **B2 (Critical, new — patient safety)** `patient/patientDuplicateUtils.js:15-37` — Soundex
  omits the H/W coalescing rule (`Ashcraft`→`A226`, should be `A261`), so different names collide;
  a phonetic match alone is +40 (above the 25 strong-id threshold) → wrong-patient duplicate/merge.
  → Implement standard Soundex (skip H/W without resetting prevCode) + reference tests.
- **B3 (High, new — patient safety)** `visit/vitalEscalation.js:24` & `smartNote/compliance/
  factExtraction.js:45` — BP regex `(\d{2,3})\/(\d{2,3})` over-matches: `"1180/120"` → `180/120`,
  which is **not** `>180/120`, so hypertensive-crisis escalation is missed; `"BP 1148/90"` →
  systolic `148` (data corruption). → Anchor with `(?<!\d)…(?!\d)` + plausibility (sys 60-300,
  dia 30-200). Also wire `CRITICAL_VITAL_RULES` into the vitals form (currently imported by
  nothing — dead escalation logic; cf. roadmap B4).
- **B4 (High, new — AI trust)** `predictive/RehospitalizationPredictor.jsx:192-201` — "Risk trend
  (simulated weekly)" fabricates the chart via `count * (0.9 + Math.random()*0.2)`. Violates the
  app's own "no fabricated metrics" policy (`AI_TRUSTWORTHINESS_AUDIT.md`); missed by that sweep.
  → Render real historical data or remove the chart.
- **B5 (High, new — dedup data loss)** `patient/patientDuplicateUtils.js:556-595` —
  `findDuplicateGroups` picks `patients[i]` (first in input) as the surviving "primary" regardless
  of completeness; a sparse stub can win over a record with MRN/DOB/phone. → Choose primary by
  completeness/recency.
- **B6 (Med, new)** `deduplicatePatients/dedupUtils.js:317` — `dob_century_typo` scores +15 when
  last-two year digits match, flagging `1945-04-15` vs `2045-04-15` (100y apart) as the same
  person. → Constrain to plausible living-patient pairs.
- **B7 (Med, new)** `dedupUtils.js:91-117` & mirror `patientDuplicateUtils.js:118-140` —
  `parseDateComponents` guesses MMDDYYYY/YYYYMMDD, never validates month/day ranges, mis-parses
  DDMMYYYY → spurious `dob_reversed`/missed matches. → Validate ranges, return null on invalid.
- **B8 (Med, new)** `visit/pdgmClinicalGroup.js:132` — Osteoarthritis pattern `/oa /` needs a
  trailing space, so dx `"OA"` never matches → under-counts comorbidity, drops `low`→`none`.
  → `/\boa\b/`.
- **B9 (Med, new)** `oasis/oasisAnalytics.js:22-32` — age = year-subtraction only; a pre-birthday
  patient is counted 1y too old (DOB 1961-12-01 on 2026-06-05 → 65, bucket 65-74, truly 64). →
  Month/day-aware age.
- **B10 (Med, new)** `oasis/patientMatchScore.js:122-128` — `initials.includes("")` is always
  true, so any name "matches" a blank patient record (+10). → Guard 2-char initials + exact match.
- **B11 (Med, new)** `oasis/oasisScoringEngine.js:49-76` — dyspnea `m1400` triggers both
  Cardiovascular `[3,4]` and Respiratory `[2,3,4]` (double-count at 3/4); Diabetes rule keys
  `m1020 ∈ [1,2]` but M1020 holds an ICD code, not an ordinal → never detects diabetes correctly.
  → Reconcile dyspnea sets; detect diabetes via E10/E11 code.
- **B12 (Med, new)** `medication/drugInteractions.js:66` — `groupsFor` uses `includes()`; bare
  fragments (`aspirin`→nsaid) mis-characterize warfarin+aspirin as "NSAID GI bleeding". → Word-
  boundary token match; split antiplatelets. (Broader expansion = roadmap B5.)
- **B13 (Med, tracked B4)** `calculatePDGM/entry.ts:133-182` — `'S'`→Skin is wrong (S = injuries);
  single-letter prefixes shadow specific codes; weights are fabricated. → Route through the
  table-driven `pdgmGrouper.js`; at minimum fix `'S'`. _Partly deferred (§7)._

## 5. Communications reliability (idempotency / retries / logic)

- **R1 (Critical, new)** `sendAutomatedSignatureReminders` & `checkPendingSignatureRequests` —
  no last-sent tracking: every cron tick re-emails the patient/caregiver an (often "critical")
  reminder for the same unsigned doc, forever; queries unbounded. → Add `last_reminder_sent_at`
  + 24h skip + cap + pagination.
- **R2 (Critical, tracked-operationally)** `processScheduledFaxes` / `processScheduledFaxesByPriority`
  / `retryFailedFax` — claim is a non-atomic status flip with no token re-read; overlapping runs
  (or both fax crons) double-send PHI faxes and double-charge. `retryFailedFax` has no lock at all.
  → Claim-token + re-read pattern (as `dispatchScheduledSms` already does) so safety no longer
  depends on "enable only one cron".
- **R3 (High, new)** `notifyUrgentMessage/entry.ts:34` — `messageData.message_text.substring(...)`
  with no guard; an attachment-only/empty urgent message 500s and the nurse is **not** notified.
  → Coerce `String(message_text || '')`. (Same class: `summarizeMessageThread`,
  `generateMessageSuggestions`, `messagingAssistant`.)
- **R4 (High, new)** `sendExpirationNotifications` — `'-expiration_date',500` descending drops the
  soonest-expiring records (the ones needing alerts) past 500 rows; exact-day `=== 30/14/7/3`
  misses tiers if a cron day is skipped; no idempotency. → Ascending/server-filter + paginate +
  threshold-crossing with sent-offset ledger.
- **R5 (High, new)** `sendPersonnelExpirationNotifications` — records `reminder_offsets_sent`
  **before** emails send (lost on failure); exact-day match; shares the `reminder_offsets_sent`
  field with `sendCredentialRenewalReminders` (different offset sets) → mutual suppression. →
  Send-then-record; threshold-crossing; namespace the ledger field.
- **R6 (High, new)** `scheduleSignatureReminders` — past-due branch returns
  `success:true, "sending immediately"` but sends nothing. → Actually send/enqueue.
- **R7 (High, new+confirmed×2)** Fax-retry off-by-one: `autoRetryFailedFaxes/entry.ts:47` and
  `fax/faxRetry.js:92` use `> maxRetries` while `planFaxRetry`/webhook cap with `>=`, allowing one
  extra send/charge at `retry_count === maxRetries`. → `>=` in `isFaxRetryDue` (+ inline mirror +
  parity test for the `==` boundary).
- **R8 (Med, new)** Three overlapping fax pollers (`pollFaxStatuses`, `syncFaxStatuses`,
  `syncTwilioFaxStatuses`) race and double-notify; `syncFaxStatuses:75` coerces unknown Twilio
  status → `queued`, re-polling forever. → Keep one (`syncTwilioFaxStatuses`); null-skip unknowns.
- **R9 (Med, new)** `createNotification/entry.ts:33-51` — patient-authorization check runs before
  required-field validation; missing `user_email` yields a misleading 403. → Validate first.
- **R10 (Med, new)** `businessHours.js:137` — `open <= close` routes `open===close` (admin "open all
  day", e.g. `00:00–00:00`) into the normal branch → **closed 24h**, contradicting the docstring;
  mirrored into `handleTwilioInboundSms`/`handleTwilioVoiceCall`. → `open < close` (+ mirrors + test).
- **R11 (Med, new)** `voice/normalizeE164.js:15` — `+` branch has no upper length bound and allows
  a leading zero, emitting malformed E.164 (`+1234567890123456789`, `+02155550100`). → Bound 8-15,
  reject leading 0 (+ mirrors + test).
- **R12 (Med, new)** `urgentKeywords.js` — bare `"blood"` fires on "blood pressure/sugar/test"
  (alert fatigue). → Drop bare `"blood"` (keep `"bleeding"`). Negation handling deferred (false-
  negative safety tradeoff; §7).
- **R13 (Low, new)** Redrive/scheduled SMS sends omit `StatusCallback` (terminal status never
  reconciled); `analyzeFaxPriority` `match_count` lost-update; pool/provisioning TOCTOU.

## 6. React correctness, leaks & performance

- **P1 (Critical, new — privacy)** Camera/mic `MediaStream` (and `AudioContext`) never stopped on
  unmount in 9 components (none import `useEffect`): `fax/EnhancedCameraFaxSender`,
  `fax/CameraFaxSender`, `smartNote/EnhancedAudioRecorder`, `smartNote/SOAPAudioRecorder`,
  `smartNote/WhisperTranscriber`, `scribe/ScribeNoteRecorder`, `scribe/MedicalScribeAssistant`,
  `smartNote/MedicationBottleScanner`, `voice/SmartNoteVoiceListener`. Camera/mic stays live after
  navigation on shared clinical devices. Correct patterns exist (`mobile/CameraScanner.jsx`,
  `visit/AudioRecorder.jsx`). → Unmount-cleanup effects stopping tracks, clearing intervals,
  revoking object URLs, closing AudioContext.
- **P2 (High, new)** `voice/SmartNoteVoiceListener.jsx`, `voice/EnhancedVoiceCommands.jsx`,
  `voice/VoiceCommandListener.jsx` — `recognition.onend` closes over stale `isListening` (deps `[]`)
  → continuous dictation silently stops / runaway restarts. → Drive restart off a ref.
- **P3 (High, new)** `admin/UserActivityDashboard.jsx:46` — `queryKey:['userActivities']` omits
  `dateRange` used in `queryFn`; changing the range serves stale cache. → Add `dateRange` to key.
- **P4 (High, new)** `pages/MedicalScribe.jsx:83-98` — `enhanced_notes_history` read-modify-write
  off the stale list cache → lost updates. `SmartNoteAssistant` re-fetches first; adopt that. →
  `Patient.get` immediately before append.
- **P5 (High, new)** `fax/PDFAnnotator.jsx:68-90` — overlapping async `page.render()` with no
  cancellation; a slower render paints the wrong page/zoom. → Capture `RenderTask`, cancel in
  cleanup; sequence guard.
- **P6 (High, new)** `smartNote/RichTextNoteEditor.jsx:19-45` — `value` duplicated into
  `editableText` state + effects with missing deps → undo/redo desync. → Derive from `value`;
  reducer keyed off committed value.
- **P7 (Med, new)** `fax/RealtimeFaxStatusTracker.jsx` poll+subscribe double-invalidate churn;
  unrevoked object URL in `EnhancedAudioRecorder`; uncleared `setTimeout`s
  (`MedicalScribe`, referral generators); `WorkflowExecutionEngine` idempotency map in React Query
  cache is wiped on logout/GC → re-execution; camera capture toast off-by-one stale count.
- **P8 (Low, new)** PHI unencrypted at rest in IndexedDB/localStorage (tracked); `VisualEditAgent`
  global MutationObserver in prod; `NavigationTracker` `postMessage(..., '*')` wildcard origin;
  `indexedDB.js` opens a new connection per call (never closed).

## 7. Process, CI & architecture

- **Q1 (Med, tracked C2)** ESLint covers only `src/components` + `src/pages`; `src/lib`,
  `src/api`, `src/hooks`, `src/utils`, `base44/**` unlinted; `react-hooks/exhaustive-deps` and
  `jsx-a11y` not enabled. → Broaden globs (all src + base44 utils), enable `exhaustive-deps` (warn).
- **Q2 (Med, tracked C3)** CI `workflow-quality.yml` runs hand-maintained 33-file lists
  (`lint:workflow-targets`, `typecheck:utils`) and narrow path triggers; `typecheck`/`audit:prod`
  are `continue-on-error`; 205 backend functions essentially uncovered. → Directory globs, broaden
  triggers, make `src/lib`+`src/api` typecheck blocking.
- **Q3 (Med, tracked A3/A2)** Unbounded `.list()` reads in report functions; remaining
  `error.message` leaks (§S5). → Add limits/pagination; generic errors.
- **Q4 (High, tracked C1)** No component/integration/e2e tests above the util layer. → RTL +
  Playwright smoke for the core journeys.
- **Q5 (High, tracked E1/E2)** Only 2/213 LLM sites use `useAICall` (no timeout/retry elsewhere);
  4 mega-components 2k-4k LOC. → Migrate call sites; decompose behind the test net.
- **Q6 (Med, new)** CSV formula injection — `admin/csvExport.js:13` and `timeoff/timeOffUtils.js:221`
  RFC-quote but don't neutralize leading `= + - @ \t \r`; phone `+1...` and free-text `reason`
  trigger formula execution in Excel/Sheets. `timeOffUtils` also omits `\r` from its escape class.
  → Prefix dangerous leading chars with `'`; add `\r`; tests.

---

## 8. Sequencing (this PR)

P0 (this PR, low-risk verified fixes): S1, S2, S3, S4, S5, B3 (parse), B4, B8, B9, B10, R3, R7,
R10, R11, R12, Q6, P1, P3, S10, S12, plus the plan doc.

P1 (this PR, moderate): B1, B2, B5, B6, B7, B11, B12, R1, R2, R4, R5, R6, R8, R9, S6, P2, P4, P5,
P6, P7 (subset), Q1, Q2.

P2 (deferred / sequenced, may span PRs): S7, S9, S13, B13, R12-negation, P8, Q3-bounding,
Q4 (test harness), Q5 (useAICall migration + mega-component decomposition). These need product/
clinical sign-off, deploy coordination, or a test net first; tackled after P0/P1 land green.

Each batch ends green on `npm run lint && npm run test:utils && npm run test:components && npm run build`.

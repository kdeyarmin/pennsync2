# Code Review 2026-06-28 — Deferred Items

This document tracks issues surfaced during the comprehensive code review on
branch `claude/code-review-fixes-8dqc0v` (PR #109) that were **deliberately not
fixed in that pass**, with the reason for deferral and a suggested fix for each.

The review fixed ~75 high-confidence bugs across the whole tree (pure logic,
shared libs/hooks, every frontend cluster, and the Deno backend). The items
below were held back because they need a **schema change**, a **product/wiring
decision**, or a **larger refactor** — or because, on close inspection, the
current behavior is defensible and the "fix" carried more risk than the bug.

The automated baseline stayed green throughout: `npm run lint` (0 errors),
`npm run typecheck`, `npm test` (612 util + 7 contract + 241 component),
`npm run build`, `npm run check:backend-transpile` (205 functions), and
`npm run check:shared-helpers`.

---

## A. Needs a schema change (Base44 entity field)

The repo's `base44/schemaContract.test.js` documents that **Base44 silently
drops writes to fields an entity schema doesn't define**. So any idempotency
marker we want to persist must first be added to the entity `.jsonc`. These were
left for a maintainer who can add the field and confirm the platform picks it up.

### A1. `onDocumentSigned` — duplicate "Document Signed" admin emails
- **File:** `base44/functions/onDocumentSigned/entry.ts` (lines ~53, ~85–104)
- **What:** The only idempotency guard short-circuits once the *package* is
  `completed`. While the package is still in progress, the admin-email block runs
  on **every** trigger firing where a member `DocumentSignature.status ===
  'completed'`. Re-saves of an already-completed signature (e.g.
  `submitSignerSignature` later sets `signed_pdf_url`; `signatureIntegrity`
  stamps the record) re-fire the trigger and re-email all admins.
- **Why deferred:** The clean fix is a per-signature `admin_notified` flag, which
  does not exist on `DocumentSignature` and would be silently dropped without a
  schema change. The alternative (only email when `allSigned` becomes true)
  changes notification semantics from per-signer to per-package and may not be
  the intended behavior.
- **Suggested fix:** Add `admin_notified: boolean` to
  `base44/entities/DocumentSignature.jsonc`; gate the email block on
  `!signature.admin_notified` and set it in the same update.

### A2. `sendTrainingNotifications` — certificate-renewal block has no dedup marker
- **File:** `base44/functions/sendTrainingNotifications/entry.ts` (lines ~50–67)
- **What:** The assignment-reminder block now has a same-day guard (fixed in this
  PR), but the certificate-expiration block writes **no marker at all**, so any
  same-day re-run (cron >1×/day or a retry) re-creates every renewal
  notification.
- **Why deferred:** `TrainingCertificate` has no per-reminder marker field to read
  back; deduping needs one.
- **Suggested fix:** Add `last_renewal_reminder_date` (or a
  `reminder_offsets_sent` array) to `TrainingCertificate.jsonc` and guard the
  block on it — mirroring the assignment path.

### A3. `sendTrainingNotifications` / `sendPersonnelExpirationNotifications` — exact-day reminder tiers
- **What:** `sendPersonnelExpirationNotifications` was fixed in this PR to fire
  at-or-below an unsent tier. The **assignment** reminders in
  `sendTrainingNotifications` still use exact-day matching
  (`[14,7,3,1].includes(daysUntilDue)`), so a cron run that misses the precise
  day skips that tier permanently.
- **Why deferred:** Doing the at-or-below-tier logic correctly needs a
  `reminder_offsets_sent` array on `TrainingAssignment` (it only has a single
  `last_reminder_date`). The same-day duplicate was fixed; the missed-tier case
  needs the array field.
- **Suggested fix:** Add `reminder_offsets_sent: array` to
  `TrainingAssignment.jsonc` and adopt the
  `sendExpirationNotifications`/`sendCredentialRenewalReminders` pattern.

---

## B. Needs a product or platform-wiring decision

### B1. `onDocumentSigned` vs `notifyAdminOfSignedDocument` — possible double admin email
- **Files:** `base44/functions/onDocumentSigned/entry.ts`,
  `base44/functions/notifyAdminOfSignedDocument/entry.ts`
- **What:** Both are entity-trigger style (re-fetch by `data.id`, act when
  `status === 'completed'`) and both email all admins on a signed document. If
  both are registered against the same `DocumentSignature`-update trigger in the
  Base44 platform, admins receive two emails per signature.
- **Why deferred:** Trigger registration lives in the Base44 platform, not the
  repo — cannot be confirmed from source.
- **Action:** Confirm only one is registered as the admin-notification trigger;
  if both must exist, give them distinct, non-overlapping responsibilities.

### B2. `embedSignatureToPDF` — broken caller contract (likely dead code)
- **Files:** `base44/functions/embedSignatureToPDF/entry.ts`;
  caller `src/components/documents/PDFSignatureCapture.jsx`
- **What:** The function requires `template_fields` and matches signatures by
  `sig.field_id`, but the only caller (`PDFSignatureCapture` →
  `PatientInfoSignatureFlow`) never sends `template_fields` and uses `field_name`
  / no coordinates — so the path 400s on every call.
- **Why deferred:** `PatientInfoSignatureFlow` is **not referenced by any page or
  route** (verified by grep), so this whole chain is orphaned/dead code. The
  live, hardened signing flow uses `stampSignatureOnPDF`
  (`submitSignerSignature`). Fixing a contract for an unused path is wasted
  effort and risks reviving dead code.
- **Suggested action:** Either delete `embedSignatureToPDF` +
  `PDFSignatureCapture` + `PatientInfoSignatureFlow`, or, if reviving, align the
  client to send `template_fields`/`field_id` (or have the backend fall back to
  coordinate-less stamping like `stampSignatureOnPDF`).

### B3. `awardBadgeOnCompletion` — streak/courses incremented on failed attempts
- **File:** `base44/functions/awardBadgeOnCompletion/entry.ts` (lines ~153, ~184)
- **What:** `current_streak` and `courses_completed` increment with no pass/fail
  gate. A *failed* attempt still inflates the streak and can trip a 5/10/20/50
  streak badge. (Note: the idempotency here is sound — the
  `badges_processed_at` claim + `UserBadge` backstop are correct.)
- **Why deferred:** Whether this is a bug depends on whether the caller only
  invokes this function on **passed** attempts — not determinable from the repo.
- **Suggested fix (if it can fire on any attempt):** Gate the streak /
  `courses_completed` increments on
  `attemptData.score >= (assignment.passing_score_required ?? 80)`.

---

## C. Larger refactor (correct at small scale, drifts at large scale)

### C1. `assignInService` — dedup set built from only the newest 1000 assignments
- **File:** `base44/functions/assignInService/entry.ts` (line ~46)
- **What:** The "already assigned" set is built from the newest 1000 assignments
  for the course. A course with >1000 prior assignees can re-assign + re-notify
  older assignees on re-run.
- **Suggested fix:** Page through all assignments, or check existence
  per-candidate (as `assignAnnualLearningPlan` does).

### C2. `processTrainingRenewals` — existing-renewal guard scans newest 5000 globally
- **File:** `base44/functions/processTrainingRenewals/entry.ts` (line ~25)
- **What:** The guard scans the 5000 newest assignments globally (unfiltered
  `.list`). In a tenant with >5000 total assignments, a user's renewal can fall
  outside the window → duplicate renewal each cron run.
- **Suggested fix:** Use a targeted `.filter({ course_id, assigned_to_user_id })`
  per certificate — as the clean sibling `processAnnualEducationRenewals` does.

---

## D. Defensible as-is / low severity (documented for awareness)

### D1. Fax retry/notification internals
- **Files:** `autoRetryFailedFaxes/`, `pollFaxStatuses/`, `syncFaxStatuses/`,
  `handleTelnyxStatusWebhook/`
- **Assessment:** A reviewer flagged the network-error path in
  `autoRetryFailedFaxes` (which does not increment `retry_count`) as an unbounded
  retry. On analysis this is **defensible**: freezing the count during a Telnyx
  outage keeps retrying until service returns; incrementing would make every fax
  give up during an outage — worse. The "duplicate notification" concern between
  the poller and the webhook is also largely mitigated: both dedup on a status
  change (`handleTelnyxStatusWebhook` line ~572; `pollFaxStatuses` line ~86), so
  only a narrow concurrent race remains, which the proposed flag change would not
  fully close either.
- **Optional hardening (not required):** Grow the dispatch backoff from a separate
  attempt counter; or add a created-date age ceiling to `isFaxRetryDue` so a fax
  always settles. `syncFaxStatuses`, when it reconciles a fax to `failed`, could
  also run `planFaxRetry` + emit the exhaustion notice for parity with the
  webhook.

### D2. `checkExpiredInvitations` — missing/invalid `expires_at`
- **File:** `base44/functions/checkExpiredInvitations/entry.ts` (lines ~42–55)
- **What:** `new Date(invitation.expires_at)` yields `Invalid Date` for a
  missing/malformed value; both comparisons are then `false`, so the invitation
  is never expired and never flagged expiring (lingers forever). No crash.
- **Why deferred:** The "correct" behavior on bad data is ambiguous — auto-expiring
  could wrongly lock out a legit invitee. Worth a product decision.

### D3. Caller auth gate inconsistency (flagged by review, verify before acting)
- **Files (reported):** `processScheduledFaxes/`, `processScheduledFaxesByPriority/`,
  `sendExpirationNotifications/`, `sendPersonnelExpirationNotifications/`
- **What:** These were reported as lacking the `INTERNAL_FN_SECRET`/admin caller
  gate that some sibling scheduled functions use. Not independently verified end
  to end, and these are scheduled/cron entry points whose exposure depends on
  platform trigger configuration.
- **Action:** Confirm whether these are reachable by unauthenticated callers; if
  so, add the same internal-secret gate the siblings use.

### D4. Lower-severity PDF layout/robustness (no crash on the common path)
- `generateCertificatePacketPDF/entry.ts` (~62–72): cover-page certificate list
  lacks the `addPage()` page-height guard its sibling
  `generateAndCacheCertificatePacket` has (~13+ certs draw off-page).
- `generatePatientHandout/entry.ts` (~690): when `action === 'email'` but
  `patientEmail` is falsy, the function returns `success: true` with no email
  sent. Consider returning 400.
- `generatePDGMComparisonPDF` / `generatePDGMNavigatorPDF`: several static
  section headers/tables drawn at the running `y` without a page-break guard; a
  long payload can clip below the page bottom.
- `generateLearningTranscriptPDF/entry.ts` (~120): footer hardcoded
  `Page 1 of 1` though the row loop paginates (cosmetic).
- `enforceDataCompleteness/entry.ts`: a not-found `entity_id` (`.get()` → null)
  yields a `Cannot read properties of null` 500 (caught). The
  unrecognized-`entity_type` case was fixed (now 400); a null-entity 404 guard
  would be cleaner.

---

_Generated as part of the PR #109 comprehensive review. Fixed items are in the
PR's commits; this file is the backlog of what intentionally was not changed._

# Security & RLS Launch Checklist

> **The single most important pre-launch fact:** in this app, client-side role
> checks and query filtering are **cosmetic** (UX only). The real access-control
> boundary is **Base44 row-level security (RLS)** configured per-entity in the
> Base44 dashboard, plus a handful of backend env secrets. The code in this repo
> assumes RLS is enforced; **none of it is a substitute for RLS.** This document
> consolidates everything the pre-launch review surfaced so it can be configured
> and verified.

## 1. Access model (derived from the codebase)

| Principal | Rule |
|---|---|
| **Admin** | `User.role === 'admin'` → may read/write across the agency. |
| **Nurse / clinician** | May access a patient only when `Patient.assigned_nurses` (array of emails) includes their email. Used by `SmsConversationList`, `ClinicalChart`, and the new `getScopedPatientAlerts` / `getDashboardData`. |
| **Record owner** | For per-user records, ownership is by `sent_by` / `nurse_email` (faxes, SMS, calls) or `user_id` (certificates). |
| `favorited_patients` | A **UX favorites** list only — never an authorization boundary. |

## 2. Entity RLS matrix (configure in the Base44 dashboard)

Lock **read** and **write** as below. Where it says "service-role only," clients
must not be able to write directly; writes go through backend functions.

| Entity | Read | Write | Notes |
|---|---|---|---|
| `Patient` | assigned nurse + admin | admin / intake fns | Drives all patient-scoped data. |
| `Visit`, `CarePlan`, `Incident`, `OASISUpload` | by patient access | clinician on own patients + admin | Feed the dashboard + clinical views. |
| `PatientAlert` | by patient access | service-role / fns | `getScopedPatientAlerts` enforces this server-side too. |
| `Medication`, `MedicationReconciliation` | by patient access | clinician + admin | |
| `User.personal_cell_e164` | **service-role + admin only** | admin/provision fn | Private masked-bridge target — never patient-facing. |
| `CallLog` | owning `nurse_email` + admin | service-role | Real call legs incl. cell. |
| `SmsMessage` (`body` = PHI) | owning `nurse_email` + admin | service-role / `sendSms` | |
| `SmsConsent` | admin + service-role | service-role | TCPA opt-in/out ledger. |
| `FaxLog` | owning `sent_by` + admin | owner + service-role | Contains recipient + document URL (PHI). |
| `TelehealthSession` | host/participant + admin | host + admin | `createTelehealthToken` authorizes against it. |
| **`TrainingCertificate`, `TrainingCompletion`, `MicroLearningProgress`, `TrainingAssignment.status/score/completion_date`** | self + admin | **service-role only** | ⚠️ Clients currently write completion/score directly — without this lock, mandatory-education attestation is **forgeable**. Route writes through `gradeTrainingAttempt`. |
| `UserActivity`, `SecurityLog`, `AuditLog` | admin (+ self where applicable) | service-role | Audit trail; verify not broadly readable. |

## 3. Backend env secrets to set

| Secret | Purpose | If unset |
|---|---|---|
| `EIGHT_X_EIGHT_API_KEY`, `EIGHT_X_EIGHT_WEBHOOK_SECRET` | 8x8 SMS/voice + webhook verification | 8x8 features fail / webhooks rejected (fail-closed) |
| `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FAX_NUMBER`, `TWILIO_API_KEY`, `TWILIO_API_SECRET` | Fax + telehealth video | those features fail |
| `TWILIO_WEBHOOK_URL` | Exact URL for Twilio fax signature check (behind a proxy) | falls back to `req.url` |
| **`INTERNAL_FN_SECRET`** | Activates the `issueCertificate` lockdown (only the training system/admin may issue) | **lockdown inactive — set it at launch** |
| **`FILE_URL_ALLOWED_HOSTS`** | Restrict server-side file fetches to your storage host(s) — fully closes SSRF incl. DNS-rebinding | only IP/scheme literals blocked |
| `SIGNUP_WEBHOOK_SECRET` (optional) | Locks `onUserSignup` to the trusted trigger | re-fetch/email-match guard still applies |

All `VITE_*` vars are public by design — never put secrets there.

## 4. Scheduled / internal functions — confirm cron-only invocation

These run privileged `asServiceRole` work with **no `auth.me()`** (correct only
if the platform restricts who can invoke function endpoints — **confirm**):
`processScheduledFaxes`, `sendExpirationNotifications`,
`sendPersonnelExpirationNotifications`, `monitorComplianceRisks`,
`scheduledGuidelineSync`, `autoApproveInvitedUser`, `deduplicatePatients`.

- Enable **only one** scheduled-fax processor (`processScheduledFaxes` **or**
  `processScheduledFaxesByPriority`) — both running double-sends.

## 5. Webhooks

- Point 8x8 (inbound SMS, DLR, VCA, CDR) and Twilio (fax status) webhooks at the
  deployed function URLs.
- Confirm 8x8's **signature header/scheme** matches `verifyWebhook`
  (`SIGNATURE_HEADERS`) and its **timestamp field** for the replay guard
  (`isReplayStale`). Confirm Twilio's `X-Twilio-Signature` validation
  (`verifyTwilioSignature`) — test good signature → 200, bad → 401.

## 6. New entity fields to create

- `User.scheduled_off_duty_start`, `scheduled_off_duty_end` (ISO strings),
  `scheduled_off_duty_recurring` (boolean)
- `AgencySettings.sms_quick_replies` (string array)
- 8x8 fields per `docs/8x8-entities.md`.

## 7. Verification (do before go-live)

1. As a **non-admin** with no assigned patients: the Dashboard, Patient Alerts,
   SMS inbox, and call history show **nothing** (and the network responses
   contain no other patients' data).
2. As a non-admin assigned to patient A only: you see A's data and **not** B's,
   including in raw network responses (not just the rendered UI).
3. As an **admin**: agency-wide data is unchanged.
4. Attempt an IDOR by calling `predictPatientRisks`/`analyzeClinicalRisks`/
   `generatePatientChartPDF`/`getScopedPatientAlerts` with another patient's id
   → expect `403`/`404`/empty.
5. Webhook smoke tests (good/bad signatures) per §5.
6. Confirm audit rows (`UserActivity`/`SecurityLog`) carry **no PHI** (bodies,
   full numbers).
7. With `INTERNAL_FN_SECRET` set, a direct `issueCertificate` call from a
   non-admin is rejected; legitimate completion via `gradeTrainingAttempt` still
   issues a certificate.

## 8. Tracked follow-ups (code, post-launch)

- Complete the IDOR audit across the remaining `asServiceRole` single-patient
  reads once §1 is confirmed.
- Deterministic drug-interaction table is a **non-exhaustive backstop**
  (`src/components/medication/drugInteractions.js`) — expand over time; it does
  not replace a full interaction database.
- Medication reconciliation: consider a richer per-decision reconciled-med model.

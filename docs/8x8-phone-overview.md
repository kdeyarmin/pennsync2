# 8x8 Phone & SMS — Feature Overview

A map of the whole phone/SMS surface for reviewers and maintainers. Setup lives
in `8x8-setup.md`; entity schemas in `8x8-entities.md`; access control in
`SECURITY-RLS-CHECKLIST.md`.

## Core principle

Every patient-facing call and text goes through the nurse's dedicated 8x8 **work
number**; the nurse's personal cell (`User.personal_cell_e164`) is the masked
bridge target and is never exposed. PHI is kept out of audit logs (bodies are
reduced to a length; numbers are masked to last-4).

## Backend functions (`base44/functions/`)

| Function | Auth | Purpose |
|---|---|---|
| `sendSms` | nurse | Outbound text from the work number (consent + kill-switch checked, timeout-bounded). |
| `startMaskedCall` | nurse | Click-to-call: rings the nurse's cell, bridges to the patient showing the work number. |
| `scheduleSms` | nurse | Queue a text for a future time (a pending `ScheduledSms`). |
| `dispatchScheduledSms` | **cron** | Send due scheduled texts; re-checks consent + kill switch at send time. Enable one schedule only. |
| `cancelScheduledSms` | nurse/admin | Cancel a still-pending scheduled text. |
| `setNurseDutyStatus` | nurse/admin | On/off duty, scheduled time-off window, off-duty message. |
| `provisionNurseWorkNumber` | admin | Assign a work number + private bridge cell. |
| `managePhoneNumberPool` | admin | Add/remove numbers in the pool and assign/release them to nurses (keeps `PhoneNumber` + `User.work_phone_number` in sync). |
| `testEightXEightConnection` | admin | Read-only health probe (secrets, live SMS API, provisioning). |
| `sendTestSms` | admin | Definitive end-to-end check: one real, non-PHI test text. |
| `handleEightXEightInboundSms` | webhook | Inbound text; STOP/HELP/START, after-hours/off-duty auto-reply, notify nurse. |
| `handleEightXEightSmsStatus` | webhook | Delivery receipts → `SmsMessage.status` (monotonic). |
| `handleEightXEightVoiceCall` | webhook | Inbound call → after-hours auto-handling when the agency is closed (transfer / voicemail / hangup), else masked bridge (on duty) / office transfer (off duty) / opt-in voicemail. |
| `handleEightXEightCallStatus` | webhook | Call CDR → `CallLog.status`/duration; missed-call notification. |
| `handleEightXEightVoicemail` | webhook | Attach a voicemail recording to its `CallLog`; notify nurse. |

All webhook handlers verify the signing secret and **fail closed**. All outbound
8x8 `fetch`es are bounded by an `AbortController` timeout **and retried with
jittered exponential backoff** on transient failures (HTTP 408/425/429/5xx and
dropped connections), honoring a `Retry-After` header when present. Retries are
double-send safe because every text reuses one `clientMessageId` (8x8's
idempotency key); voice origination — which has no idempotency key — retries only
on explicit server-rejection statuses, never on an ambiguous network error. The
policy is the unit-tested `voice/eightxeightRetry` module, mirrored inline into
each backend function (single-file deploy model).

## Entities

`SmsMessage`, `ScheduledSms`, `CallLog`, `SmsConsent`, `PhoneNumber` (the
assignable number pool), plus 8x8 fields on `User` and `AgencySettings`
(including the global `business_hours*` / `after_hours_*` calling-hours config).
See `8x8-entities.md`.

## UI surfaces

- **Phone Center** (`pages/PhoneCenter.jsx`) — nurse hub with tabs: Texts,
  Callbacks, Scheduled, Calls, Duty Status.
  - `SmsConversationList` / `SmsThreadView` — inbox + compose (quick replies,
    templates, resend-failed, schedule-send).
  - `CallbackQueue` — prioritized "needs a call back" worklist.
  - `ScheduledSmsList` — upcoming/recent scheduled texts with cancel.
  - `CallHistoryList` — call log with patient names, voicemail playback,
    disposition + notes.
  - `DutyStatusCard` — on/off duty + scheduled time off + off-duty message.
- **Patient detail** — `PatientContactActions` (Text/Call, templates, schedule).
- **Admin → System Settings** — `PhoneProvisioningPanel` (setup health,
  connection test, test send, webhook reference, provisioning, agency settings,
  templates, voicemail) and `PhoneAnalyticsPanel` (metrics + CSV export).
- **Administration → Super Admin** (`pages/SuperAdminConfig.jsx`, super-admin
  only) — the one-page control center: the `EightXEightSetupProgress` command
  center (guided checklist + percent-complete + "next step" that jumps to the
  right card), the single-secret `EightXEightSecretPanel`, and the full
  `PhoneProvisioningPanel`, which now also hosts `CallingHoursPanel` (global
  calling/texting hours + after-hours call/text handling) and `NumberPoolPanel`
  (add numbers once, assign/release to nurses from a dropdown). Setup-step
  readiness math lives in the unit-tested `admin/eightxeightSetup`
  (`buildIntegrationSteps` / `summarizeSteps`); the global-hours logic lives in
  the unit-tested `voice/businessHours`.

## Tested utils (`node --test`, wired into `verify:workflow-quality`)

`voice/phoneUtils`, `voice/dutyUtils`, `voice/callbackQueue`,
`voice/eightxeightRetry`, `voice/businessHours`, `messaging/smsUtils`,
`messaging/smsQuickReplies`, `messaging/smsTemplates`,
`messaging/scheduledSms`, `admin/eightxeightSetup`, `admin/phoneAnalytics`,
`admin/csvExport`. These are the source of truth; the single-file backend
functions keep inline copies of the shared algorithms.

## Compliance touchpoints

- **TCPA**: `SmsConsent` ledger; STOP/HELP/START handled in the inbound webhook;
  every send path (incl. scheduled + test) refuses opted-out numbers and the
  scheduler re-checks at send time.
- **HIPAA**: BAA with 8x8; message bodies and full numbers never written to
  audit logs or CSV exports; private cell restricted to service-role/admin.

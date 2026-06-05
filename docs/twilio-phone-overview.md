# Twilio Phone & SMS — Feature Overview

A map of the whole phone/SMS surface for reviewers and maintainers. Setup lives
in `twilio-setup.md`; entity schemas in `twilio-entities.md`; access control in
`SECURITY-RLS-CHECKLIST.md`.

## Core principle

Every patient-facing call and text goes through the nurse's dedicated Twilio **work
number**; the nurse's personal cell (`User.personal_cell_e164`) is the masked
bridge target and is never exposed. PHI is kept out of audit logs (bodies are
reduced to a length; numbers are masked to last-4).

## Backend functions (`base44/functions/`)

| Function | Auth | Purpose |
|---|---|---|
| `sendSms` | nurse | Outbound text from the work number via Twilio Messages API (consent + kill-switch checked, timeout-bounded). |
| `startMaskedCall` | nurse | Click-to-call: rings the nurse's cell via Twilio Calls API + TwiML `<Dial callerId>`, bridges to the patient showing the work number. |
| `scheduleSms` | nurse | Queue a text for a future time (a pending `ScheduledSms`). |
| `dispatchScheduledSms` | **cron** | Send due scheduled texts; re-checks consent + kill switch + TCPA quiet hours at send time. Claims each row with a run token and re-reads to confirm ownership before sending, so overlapping runs can't double-send. |
| `redriveFailedSms` | **cron** | "Outbox" that re-sends texts which failed for a transient reason, with an attempt cap + escalating backoff. Permanent failures are never retried. |
| `recordSmsConsent` | nurse/admin | Record a patient's texting consent (opt-in/opt-out) captured verbally/in writing, into `SmsConsent` with an audit trail. |
| `searchPurchaseTwilioNumbers` | admin | Search Twilio IncomingPhoneNumbers API for available numbers and buy one straight into the pool. |
| `cancelScheduledSms` | nurse/admin | Cancel a still-pending scheduled text. |
| `setNurseDutyStatus` | nurse/admin | On/off duty, scheduled time-off window, off-duty message. |
| `provisionNurseWorkNumber` | admin | Assign a work number + private bridge cell. |
| `managePhoneNumberPool` | admin | Add/remove numbers in the pool and assign/release them to nurses (keeps `PhoneNumber` + `User.work_phone_number` in sync). |
| `testTwilioConnection` | admin | Read-only health probe (credentials, live Twilio API, provisioning). |
| `sendTestSms` | admin | Definitive end-to-end check: one real, non-PHI test text. |
| `handleTwilioInboundSms` | webhook | Inbound text via Twilio Messaging webhook; STOP/HELP/START, after-hours/off-duty auto-reply, **urgent-keyword escalation**, notify nurse. |
| `handleTwilioSmsStatus` | webhook | Delivery status callbacks → `SmsMessage.status` (monotonic); **notifies the nurse on a failed delivery**. |
| `handleTwilioVoiceCall` | webhook | Inbound call via Twilio Voice webhook → after-hours auto-handling when the agency is closed (transfer / voicemail / hangup), else masked bridge (on duty) / office transfer (off duty) / opt-in voicemail. Returns TwiML. |
| `handleTwilioCallStatus` | webhook | Call status callbacks → `CallLog.status`/duration; missed-call notification. |
| `handleTwilioVoicemail` | webhook | Attach a voicemail recording (+ transcription, when provided) to its `CallLog`; notify nurse. |

All webhook handlers verify the **X-Twilio-Signature** (HMAC-SHA1 over the full
URL + sorted POST params with the Auth Token) and **fail closed**. All outbound
Twilio `fetch`es are bounded by an `AbortController` timeout **and retried with
jittered exponential backoff** on transient **HTTP statuses** (408/425/429/5xx),
honoring a `Retry-After` header when present. Twilio's REST API has **no client
idempotency key**, so neither texts nor voice origination retry an *ambiguous
thrown network error* (a dropped connection might mean the message/call already
went through — a blind retry could double-deliver); only an explicit
server-rejection status is retried. Anything Twilio reports as failed is
recovered by the `redriveFailedSms` outbox cron, and overlapping cron runs are
made safe by row claim-and-verify rather than a provider idempotency key.

## Entities

`SmsMessage`, `ScheduledSms`, `CallLog`, `SmsConsent`, `PhoneNumber` (the
assignable number pool), plus Twilio-related fields on `User` and `AgencySettings`
(including the global `business_hours*` / `after_hours_*` calling-hours config).
See `twilio-entities.md`.

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
- **Admin → User Management** — expanding a user shows `UserActivityPanel`, which
  includes that user's **call log** and texts (metadata only) alongside their
  activity feed. Data comes from the service-role `getUserActivityLog` function,
  which masks phone numbers to last-4 and never returns message bodies.
- **Admin → System Settings** — `PhoneProvisioningPanel` (setup health,
  connection test, test send, webhook reference, provisioning, agency settings,
  templates, voicemail) and `PhoneAnalyticsPanel` (metrics + CSV export).
- **Administration → Super Admin** (`pages/SuperAdminConfig.jsx`, super-admin
  only) — the one-page control center: the `TwilioSetupProgress` command
  center (guided checklist + percent-complete + "next step" that jumps to the
  right card), the two-field `TwilioSecretPanel` (Account SID + Auth Token), and
  the full `PhoneProvisioningPanel`, which also hosts `CallingHoursPanel` (global
  calling/texting hours + after-hours call/text handling) and `NumberPoolPanel`
  (add numbers once, assign/release to nurses from a dropdown). Setup-step
  readiness math lives in the unit-tested `admin/twilioSetup`
  (`buildIntegrationSteps` / `summarizeSteps`); the global-hours logic lives in
  the unit-tested `voice/businessHours`.

## Tested utils (`node --test`, wired into `verify:workflow-quality`)

`voice/phoneUtils`, `voice/dutyUtils`, `voice/callbackQueue`,
`voice/businessHours`, `voice/quietHours`,
`voice/urgentKeywords`, `messaging/smsUtils`, `messaging/smsRedrive`,
`messaging/smsQuickReplies`, `messaging/smsTemplates`,
`messaging/scheduledSms`, `admin/twilioSetup`, `admin/phoneAnalytics`,
`admin/csvExport`. These are the source of truth; the single-file backend
functions keep inline copies of the shared algorithms.

## Compliance touchpoints

- **TCPA**: `SmsConsent` ledger (now writable in-app via `recordSmsConsent` for
  consent captured before the first text); STOP/HELP/START handled in the inbound
  webhook; every send path (incl. scheduled + test) refuses opted-out numbers and
  the scheduler re-checks at send time. Optional **quiet-hours** enforcement
  (`voice/quietHours`) blocks outbound texts outside the allowed window in the
  recipient's own timezone (derived from area code).
- **Clinical safety**: inbound texts are scanned for urgent language
  (`voice/urgentKeywords`) and escalated with a high-priority nurse notification.
- **HIPAA**: BAA with Twilio; message bodies and full numbers never written to
  audit logs or CSV exports; private cell restricted to service-role/admin.

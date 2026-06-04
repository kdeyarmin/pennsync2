# Twilio Phone Integration — Setup, Webhooks & Compliance

This integration gives each nurse a dedicated Twilio **work number** that patients
can call and text, while the nurse's personal cell stays hidden. It uses Twilio's
**Messages API** (SMS) and **Calls API + TwiML** (masked voice calling and inbound
voice handling).

## 1. Prerequisites in Twilio

1. A Twilio account with at least one purchased phone number capable of SMS and
   voice.
2. One **virtual (Twilio) number per nurse** purchased via the Twilio Console or
   via `searchPurchaseTwilioNumbers` in the Number Pool card.
3. **Signed BAA with Twilio** — ✅ required; sign it in the Twilio Console under
   General Settings → HIPAA Eligibility (still required; see §5 for the ongoing
   obligations it covers).

## 2. Configuration

### Backend credentials (Base44 dashboard) — only two

Set as backend function secrets (see `.env.example`). They are **not** `VITE_*`
and must never reach the browser.

| Secret | Purpose |
|---|---|
| `TWILIO_ACCOUNT_SID` | Twilio Account SID (starts with `AC`) |
| `TWILIO_AUTH_TOKEN` | Twilio Auth Token — used to authenticate all SMS, voice, and webhook verification |

> These same credentials also power fax (`TWILIO_FAX_NUMBER`). Only one pair of
> credentials is needed for both features.

Optional secrets:

| Secret | Purpose |
|---|---|
| `TWILIO_WEBHOOK_SECRET` | Custom webhook shared-secret test path. Twilio normally verifies inbound webhooks with your Auth Token via X-Twilio-Signature. |
| `TWILIO_WEBHOOK_URL` | Exact public URL for signature verification when the app sits behind a proxy that rewrites the Host header. |
| `FUNCTIONS_BASE_URL` | Base URL like `https://<app>/functions` used to auto-set StatusCallback/webhook URLs in the admin panel. |
| `TWILIO_WEBHOOK_DEBUG` | Set to `1` to log signature header names and verification outcome (never logs secret values). Turn off after debugging. |

### Runtime config (Administration → Super Admin, stored on `AgencySettings`)

No environment variables for these — an admin sets them in the app:

| Field | Purpose |
|---|---|
| `main_office_number_e164` | Off-duty transfer / referral number |
| `default_off_duty_template` | Default off-duty message |
| `sms_messaging_enabled` | Agency-wide SMS kill switch |
| `business_hours_enabled` | Master switch for global calling/texting hours (off = always open) |
| `business_hours_timezone` | IANA timezone the schedule is interpreted in (e.g. `America/New_York`) |
| `business_hours` | Per-day `{ enabled, open, close }` schedule (keys `sun`…`sat`, `HH:MM` 24h) |
| `after_hours_call_action` | When closed: `transfer` (default) / `voicemail` / `hangup` |
| `after_hours_transfer_number_e164` | When closed + transfer: number to ring (defaults to main office) |
| `after_hours_call_greeting` | Spoken before an after-hours transfer/voicemail (`{office}` merge) |
| `after_hours_sms_auto_reply_enabled` | Auto-reply to inbound texts while closed (default on) |
| `after_hours_sms_auto_reply` | The after-hours text auto-reply body (`{office}` merge) |
| `business_hours_holidays` | Array of `YYYY-MM-DD` dates the practice is closed all day |
| `tcpa_quiet_hours_enabled` | Block outbound texts outside the recipient's local window (default off) |
| `tcpa_quiet_start_hour` / `tcpa_quiet_end_hour` | Allowed window hours (default 8 / 21) |
| `urgent_escalation_enabled` | Escalate red-flag inbound texts (default on) |
| `urgent_keywords` | Extra agency-specific urgent keywords (array) |

### Super Admin command center (easiest path)

**Administration → Super Admin** is the one-stop page for the platform owner. The
**Twilio Integration Setup** card at the top is a guided checklist: it shows a
percent-complete bar over the required steps (Account SID + Auth Token → agency
settings → at least one provisioned nurse), highlights the single **next step**,
and each step has a **Go** button that scrolls straight to the card that completes
it. A **Test live connection** button runs the read-only health probe (`testTwilioConnection`)
without leaving the page. Below it sit the two-field credentials panel
(`TwilioSecretPanel`) and the full provisioning/health/agency-settings surface.
The step readiness is computed by the unit-tested `buildIntegrationSteps` /
`summarizeSteps` helpers in `src/components/admin/twilioSetup.js`.

### Provisioning numbers (the number pool)

Instead of retyping a work number for each nurse, add your purchased Twilio numbers
to the **Number Pool** once (Super Admin → Number Pool), then **assign** one to a
nurse from a dropdown — and **release** it later to free it for someone else.
Pool entries live in the `PhoneNumber` entity; all writes go through the
`managePhoneNumberPool` backend function, which keeps the pool status and the
nurse's `User.work_phone_number` (the value webhooks resolve against) in sync and
enforces one-number-per-nurse uniqueness. Personal bridge cells are still set in
the **Nurse Work Numbers** card. You can also **Find & buy** numbers directly from
Twilio in the Number Pool card (via `searchPurchaseTwilioNumbers`).

### Global calling & texting hours (automatic transfer / auto-reply)

The **Calling & Texting Hours** card sets a single weekly schedule (per-day
open/close in a chosen timezone). When the practice is **closed**:

- **Inbound calls** are auto-handled before any per-nurse routing —
  `transfer` to the after-hours number (default; falls back to the main office),
  `voicemail`, or a polite `hangup`.
- **Inbound texts** get an automatic after-hours reply (unless the patient opted
  out or the SMS kill switch is on).
- **Nurse-initiated outbound** texts/calls are **warned, not blocked** — the
  patient-detail Contact card shows an "outside hours" notice but the send still
  goes through.

When the master switch is off, behavior is unchanged (always open; only
per-nurse duty status applies). The logic is the unit-tested
`src/components/voice/businessHours.js`, mirrored inline into the inbound voice
and SMS webhook handlers.

### TCPA quiet hours, holidays, urgent escalation & reliability

Also configurable in the **Calling & Texting Hours** card (and via cron):

- **Holiday closures** — list dates (YYYY-MM-DD) the practice is closed all day,
  interpreted in the business timezone.
- **TCPA quiet hours** — a separate toggle that blocks outbound texts landing
  outside the allowed window (default 8:00am–9:00pm) in the **recipient's** local
  time, derived from their area code. Fails open for unknown/non-US numbers.
- **Urgent-keyword escalation** — inbound texts matching red-flag terms fire a
  high-priority nurse notification in addition to the normal one.
- **Failed-text recovery** — schedule the `redriveFailedSms` cron (e.g. every
  10 min, one schedule only) to automatically re-send texts that failed for a
  transient reason.
- **Scheduler safety** — `dispatchScheduledSms` claims rows with a per-run token
  and sends with a deterministic idempotency key, so overlapping runs can't
  double-send (still prefer a single schedule).

### Webhook signature troubleshooting

Twilio signs every inbound webhook request with an `X-Twilio-Signature` header
(HMAC-SHA1 over the full URL + sorted POST params, keyed with the Auth Token).
All webhook handlers verify this header and **fail closed**.

If inbound calls/texts are rejected with a 401, set the function secret
`TWILIO_WEBHOOK_DEBUG=1` in the Base44 dashboard. Each webhook then logs which
signature header arrived and whether verification passed (never any secret or
signature value). Read the function logs, fix the URL mismatch (most common cause:
app behind a proxy), then unset it.

### Verify the setup (no test message needed)

Administration → Super Admin shows a **Setup & Health** card:

- A live **configuration checklist** (main office, off-duty template, kill switch)
  that updates as you edit the form — fix anything red before going live; amber
  items are degraded-but-usable.
- A **Test live connection** button (backed by the `testTwilioConnection` function)
  that confirms the backend credentials are present, makes a **read-only** probe
  of the Twilio API (so you know the Account SID + Auth Token actually authenticate
  and are reachable), and reports nurse-provisioning coverage. It never sends a
  text or places a call, and never echoes a credential.

## 3. Webhook registration

The same admin panel lists each webhook function with a copy button and a
suggested URL. Point these Twilio callbacks at the deployed Base44 function URLs:

| Twilio event | Function | Configured on |
|---|---|---|
| Inbound SMS | `handleTwilioInboundSms` | Phone number Messaging webhook |
| SMS delivery status callback | `handleTwilioSmsStatus` | StatusCallback on sends |
| Incoming voice call | `handleTwilioVoiceCall` | Phone number Voice webhook |
| Call status callback | `handleTwilioCallStatus` | StatusCallback on the number/call |
| Voicemail recording (optional) | `handleTwilioVoicemail` | Called from the TwiML `<Record>` action URL |

> Record the exact deployed URLs here once known: `__________`.

### Signature verification

All webhook handlers **fail closed**. They verify the `X-Twilio-Signature` header
using HMAC-SHA1 over the full URL (including query string) + sorted POST params,
keyed with the Auth Token. When the app is behind a proxy, set `TWILIO_WEBHOOK_URL`
to the exact public-facing URL so the computed signature matches.

### Replay protection

The two action webhooks (`handleTwilioInboundSms`, `handleTwilioVoiceCall`)
also reject **stale** events: if the body carries a timestamp more than ~15 min
from now, the request is rejected as a possible replay. The check **fails open**
when no parseable timestamp is present (idempotency on `provider_message_id` /
`provider_call_id` already de-dups genuine retries).

### Transient failures & retries

Every outbound call to Twilio (SMS send, scheduled-SMS dispatch, click-to-call)
is bounded by a per-attempt timeout **and** retried with jittered exponential
backoff when Twilio returns a transient error (`408`/`425`/`429`/`5xx`) or the
connection drops. A `Retry-After` header is honored (clamped) when present.

## 4. How each flow works

- **Outbound text** (`sendSms`): nurse → patient from the nurse's work number via
  Twilio Messages API.
- **Scheduled text** (`scheduleSms` / `dispatchScheduledSms` / `cancelScheduledSms`):
  a nurse queues a text for a future time (e.g. an appointment reminder). The
  `dispatchScheduledSms` **cron** (schedule it in the Base44 dashboard, e.g.
  every 5 min) sends due messages, re-checking consent + the kill switch at send
  time; pending sends can be canceled until they fire.
- **Outbound call** (`startMaskedCall`): uses Twilio Calls API + TwiML
  `<Dial callerId>` to ring the nurse's cell, then bridge to the patient presenting
  the work number as caller ID.
- **Inbound text** (`handleTwilioInboundSms`): stored to the nurse's inbox;
  STOP/HELP/START handled first; off-duty triggers an auto-reply with the main
  office number.
- **Inbound call** (`handleTwilioVoiceCall`): on duty → masked bridge to the
  nurse's cell via TwiML `<Dial callerId>`; off duty → greeting then transfer
  to the main office.
- **Duty status** (`setNurseDutyStatus`): a nurse is off duty via the manual
  On/Off switch **or** an active scheduled time-off window
  (`scheduled_off_duty_start`/`_end`, e.g. the weekend). Both inbound webhooks
  evaluate this live (`isOffDutyNow`, mirrored from
  `src/components/voice/dutyUtils.js`), so a schedule needs no cron — it takes
  effect and expires on its own.

## 5. HIPAA / TCPA compliance (required)

- **BAA with Twilio** — ✅ sign in the Twilio Console under HIPAA Eligibility,
  so PHI may flow over the Twilio channels once the remaining technical steps
  are complete.
- **STOP / HELP / START** keyword handling is built into the inbound SMS handler
  and is legally required. `SmsConsent` is the opt-in/opt-out ledger; `sendSms`
  refuses to text an `opted_out` number, and off-duty/HELP auto-replies are
  fail-closed (a consent-read error suppresses the reply) and honor the agency
  SMS kill switch. **Scope:** a STOP opt-out applies to **texts**; masked
  **voice calls remain allowed** (clinical, nurse-initiated) — the patient UI
  states this explicitly. Revisit if your TCPA posture requires call opt-out.
- **PHI minimization**: templated/off-duty messages must contain no diagnoses,
  DOB, or other PHI. Message bodies are **never** written to `UserActivity` /
  `SecurityLog` (only length + thread id). Personal cell numbers are masked to
  last-4 in audit details and in the admin UI.
- **Access control**: nurses see only their own `SmsMessage` / `CallLog`
  (filtered by `nurse_email`). Restrict `User.personal_cell_e164` read access to
  service role / admin in the Base44 entity config.

## 6. Verification / testing

Once the entities (see `docs/twilio-entities.md`) and webhooks are configured,
exercise the integration end to end in this order: provision a test nurse, then
exercise outbound SMS, inbound SMS (+ STOP/START), inbound masked call (on/off
duty), and outbound click-to-call. Webhooks can be exercised by POSTing sample
Twilio payloads with a correctly computed `X-Twilio-Signature` header (and a
bad-signature request to confirm a 401). After each event, check the
`SmsMessage` / `CallLog` / `SmsConsent` row, the `UserActivity` audit row (no
PHI), and any nurse `Notification`.

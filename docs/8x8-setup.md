# 8x8 Phone Integration — Setup, Webhooks & Compliance

This integration gives each nurse a dedicated 8x8 **work number** that patients
can call and text, while the nurse's personal cell stays hidden. It uses 8x8's
**Number Masking** (Voice) and **SMS** CPaaS APIs.

## 1. Prerequisites in 8x8 Connect

1. An 8x8 CPaaS (Connect) account with **SMS** and **Voice / Number Masking** enabled.
2. A **voice sub-account** provisioned for Number Masking and an **SMS sub-account**.
3. One **virtual number per nurse** purchased/allocated to the sub-account.
4. **Signed BAA with 8x8** — ✅ signed and on file. (Still required; see §5 for the ongoing obligations it covers.)

## 2. Configuration

### Backend secrets (Base44 dashboard) — only two
Set as backend function secrets (see `.env.example`). They are **not** `VITE_*`
and must never reach the browser.

| Secret | Purpose |
|---|---|
| `EIGHT_X_EIGHT_API_KEY` | 8x8 Connect API bearer token — used for **both** SMS and Voice |
| `EIGHT_X_EIGHT_WEBHOOK_SECRET` | Shared secret used to verify inbound webhooks |

> If your 8x8 account issues separate keys per product, use the one that
> authorizes both SMS and Voice on the sub-accounts below.

### Runtime config (Admin → Settings → 8x8 Phone, stored on `AgencySettings`)
No environment variables — an admin sets these in the app:

| Field | Purpose |
|---|---|
| `eight_x_eight_sms_subaccount_id` | SMS sub-account |
| `eight_x_eight_voice_subaccount_id` | Voice sub-account |
| `eight_x_eight_voice_api_base` | Voice API base URL for outbound click-to-call |
| `eight_x_eight_region` | e.g. `us` → `sms.us.8x8.com` (defaults to `us`) |
| `main_office_number_e164` | Off-duty transfer / referral number |
| `default_off_duty_template` | Default off-duty message |
| `sms_messaging_enabled` | Agency-wide SMS kill switch |

### Verify the setup (no test message needed)

Admin → Settings → **8x8 Phone** now shows a **Setup & Health** card:

- A live **configuration checklist** (sub-accounts, region, main office, kill
  switch, etc.) that updates as you edit the form — fix anything red before going
  live; amber items are degraded-but-usable.
- A **Test live connection** button (backed by the `testEightXEightConnection`
  function) that confirms the backend secrets are present, makes a **read-only**
  probe of the 8x8 SMS API (so you know the API key + region + sub-account
  actually authenticate and are reachable), and reports nurse-provisioning
  coverage. It never sends a text or places a call, and never echoes a secret.

## 3. Webhook registration

The same admin panel lists each webhook function with a copy button and a
suggested URL. Point these 8x8 callbacks at the deployed Base44 function URLs:

| 8x8 event | Function | Configured on |
|---|---|---|
| Inbound SMS (MO) | `handleEightXEightInboundSms` | SMS sub-account |
| SMS delivery receipt (DLR) | `handleEightXEightSmsStatus` | SMS sub-account |
| Voice Call Action (VCA) | `handleEightXEightVoiceCall` | Voice sub-account / virtual numbers |
| Call status / CDR | `handleEightXEightCallStatus` | Voice sub-account |
| Voicemail recording (optional) | `handleEightXEightVoicemail` | Voice sub-account (only if voicemail capture is enabled) |

> Record the exact deployed URLs here once known: `__________`.

### Signature verification
All webhook handlers **fail closed**. They verify either an HMAC-SHA256
signature header (`x-8x8-signature` / `x-signature` / `x-hub-signature-256`,
computed over the raw body with `EIGHT_X_EIGHT_WEBHOOK_SECRET`) or a static
shared-secret header (`x-webhook-secret`). Confirm the exact header name and
signing scheme 8x8 sends for your account and, if it differs, update
`SIGNATURE_HEADERS` / `verifyWebhook` in the function files.

### Replay protection
The two action webhooks (`handleEightXEightInboundSms`, `handleEightXEightVoiceCall`)
also reject **stale** events: if the signed body carries a timestamp
(`timestamp`/`eventTime`/`time`/`createdTime`/`ts`) more than ~15 min from now,
the request is rejected as a possible replay. The check **fails open** when no
parseable timestamp is present (idempotency on `provider_message_id` /
`provider_call_id` already de-dups genuine retries). Confirm the timestamp field
name 8x8 sends and tune `isReplayStale` / the skew if needed. Only body fields
are trusted (the HMAC covers the raw body); header timestamps are not.

### Transient failures & retries
Every outbound call to 8x8 (SMS send, scheduled-SMS dispatch, click-to-call) is
bounded by a per-attempt timeout **and** retried with jittered exponential
backoff when 8x8 returns a transient error (`408`/`425`/`429`/`5xx`) or the
connection drops. A `Retry-After` header is honored (clamped) when 8x8 sends
one. Texts are retried safely because each send reuses one `clientMessageId`,
which 8x8 de-dups; **voice origination has no idempotency key**, so it is only
retried on an explicit server-rejection status — never after an ambiguous
network error — to avoid double-dialing. The shared policy lives in
`src/components/voice/eightxeightRetry.js` (unit-tested) and is mirrored inline
in each backend function. Tune `RETRYABLE_STATUSES`, the attempt count, or the
backoff there and in the function copies if your account's behavior differs.

### Callflow / API shape caveats
8x8 callflow action names (`makeCall`, `say`) and the outbound voice
origination endpoint depend on your provisioned sub-account. Validate the JSON
shapes in `handleEightXEightVoiceCall.ts` (`buildSay` / `buildMakeCall`) and
`startMaskedCall.ts` against 8x8 Connect and adjust if needed. The SMS API shape
(`POST /api/v1/subaccounts/{id}/messages`) is stable.

## 4. How each flow works

- **Outbound text** (`sendSms`): nurse → patient from the nurse's work number.
- **Scheduled text** (`scheduleSms` / `dispatchScheduledSms` / `cancelScheduledSms`):
  a nurse queues a text for a future time (e.g. an appointment reminder). The
  `dispatchScheduledSms` **cron** (schedule it in the Base44 dashboard, e.g.
  every 5 min) sends due messages, re-checking consent + the kill switch at send
  time; pending sends can be canceled until they fire.
- **Outbound call** (`startMaskedCall`): rings the nurse's cell, then bridges to
  the patient presenting the work number as caller ID.
- **Inbound text** (`handleEightXEightInboundSms`): stored to the nurse's inbox;
  STOP/HELP/START handled first; off-duty triggers an auto-reply with the main
  office number.
- **Inbound call** (`handleEightXEightVoiceCall`): on duty → masked bridge to the
  nurse's cell; off duty → greeting then transfer to the main office.
- **Duty status** (`setNurseDutyStatus`): a nurse is off duty via the manual
  On/Off switch **or** an active scheduled time-off window
  (`scheduled_off_duty_start`/`_end`, e.g. the weekend). Both inbound webhooks
  evaluate this live (`isOffDutyNow`, mirrored from
  `src/components/voice/dutyUtils.js`), so a schedule needs no cron — it takes
  effect and expires on its own.

## 5. HIPAA / TCPA compliance (required)

- **BAA with 8x8** — ✅ signed and on file, so PHI may flow over the 8x8 channels once the remaining technical steps are complete.
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

Once the entities (§ `docs/8x8-entities.md`) and webhooks are configured, exercise
the integration end to end in this order: provision a
test nurse, then exercise outbound SMS, inbound SMS (+ STOP/START), inbound
masked call (on/off duty), and outbound click-to-call. Webhooks can be exercised
by POSTing sample 8x8 payloads with a correctly computed signature header (and a
bad-signature request to confirm a 401). After each event, check the
`SmsMessage` / `CallLog` / `SmsConsent` row, the `UserActivity` audit row (no PHI),
and any nurse `Notification`.

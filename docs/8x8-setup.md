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

## 3. Webhook registration

Point these 8x8 callbacks at the deployed Base44 function URLs:

| 8x8 event | Function | Configured on |
|---|---|---|
| Inbound SMS (MO) | `handleEightXEightInboundSms` | SMS sub-account |
| SMS delivery receipt (DLR) | `handleEightXEightSmsStatus` | SMS sub-account |
| Voice Call Action (VCA) | `handleEightXEightVoiceCall` | Voice sub-account / virtual numbers |
| Call status / CDR | `handleEightXEightCallStatus` | Voice sub-account |

> Record the exact deployed URLs here once known: `__________`.

### Signature verification
All webhook handlers **fail closed**. They verify either an HMAC-SHA256
signature header (`x-8x8-signature` / `x-signature` / `x-hub-signature-256`,
computed over the raw body with `EIGHT_X_EIGHT_WEBHOOK_SECRET`) or a static
shared-secret header (`x-webhook-secret`). Confirm the exact header name and
signing scheme 8x8 sends for your account and, if it differs, update
`SIGNATURE_HEADERS` / `verifyWebhook` in the function files.

### Callflow / API shape caveats
8x8 callflow action names (`makeCall`, `say`) and the outbound voice
origination endpoint depend on your provisioned sub-account. Validate the JSON
shapes in `handleEightXEightVoiceCall.ts` (`buildSay` / `buildMakeCall`) and
`startMaskedCall.ts` against 8x8 Connect and adjust if needed. The SMS API shape
(`POST /api/v1/subaccounts/{id}/messages`) is stable.

## 4. How each flow works

- **Outbound text** (`sendSms`): nurse → patient from the nurse's work number.
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
  refuses to text an `opted_out` number.
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

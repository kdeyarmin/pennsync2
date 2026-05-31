# 8x8 Phone Integration — Setup, Webhooks & Compliance

This integration gives each nurse a dedicated 8x8 **work number** that patients
can call and text, while the nurse's personal cell stays hidden. It uses 8x8's
**Number Masking** (Voice) and **SMS** CPaaS APIs.

## 1. Prerequisites in 8x8 Connect

1. An 8x8 CPaaS (Connect) account with **SMS** and **Voice / Number Masking** enabled.
2. A **voice sub-account** provisioned for Number Masking and an **SMS sub-account**.
3. One **virtual number per nurse** purchased/allocated to the sub-account.
4. **Signed BAA with 8x8** — ✅ signed and on file. (Still required; see §5 for the ongoing obligations it covers.)

## 2. Backend secrets (Base44 dashboard)

Set these as backend function secrets (see `.env.example`). They are **not**
`VITE_*` and must never reach the browser.

| Secret | Purpose |
|---|---|
| `EIGHT_X_EIGHT_SMS_API_KEY` | Bearer token for the SMS API |
| `EIGHT_X_EIGHT_SMS_SUBACCOUNT_ID` | SMS sub-account (fallback; prefer AgencySettings) |
| `EIGHT_X_EIGHT_VOICE_API_KEY` | Bearer token for the Voice API (falls back to SMS key) |
| `EIGHT_X_EIGHT_VOICE_SUBACCOUNT_ID` | Voice sub-account (fallback) |
| `EIGHT_X_EIGHT_VOICE_API_BASE` | Voice API base URL for outbound origination |
| `EIGHT_X_EIGHT_REGION` | e.g. `us` → `sms.us.8x8.com` (fallback) |
| `EIGHT_X_EIGHT_WEBHOOK_SECRET` | Shared secret used to verify inbound webhooks |
| `EIGHT_X_EIGHT_MAIN_OFFICE_NUMBER` | Off-duty transfer fallback |

Sub-account IDs, region, and main office number are best configured at runtime
in **Admin → Settings → 8x8 Phone** (stored on `AgencySettings`); env values are
fallbacks.

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

See the phased verification plan in
`/root/.claude/plans/i-would-like-to-glittery-kettle.md`. In short: provision a
test nurse, then exercise outbound SMS, inbound SMS (+ STOP/START), inbound
masked call (on/off duty), and outbound click-to-call. Webhooks can be exercised
by POSTing sample 8x8 payloads with a correctly computed signature header (and a
bad-signature request to confirm a 401). After each event, check the
`SmsMessage` / `CallLog` / `SmsConsent` row, the `UserActivity` audit row (no PHI),
and any nurse `Notification`.

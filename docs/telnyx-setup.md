# Telnyx Integration — Text, Voice, Video & Fax

Telnyx is supported as an alternative provider to Twilio for the four communication
channels:

| Channel | Telnyx product | Backend function |
|---|---|---|
| **Text** (SMS/MMS) | Messaging API | `sendTelnyxSms` |
| **Voice** (masked click-to-call) | Call Control v2 | `startTelnyxCall` |
| **Video** (telehealth) | Telnyx Video (Rooms) | `createTelnyxVideoToken` |
| **Fax** | Programmable Fax | `sendTelnyxFax` |

All four share one inbound webhook — `handleTelnyxStatusWebhook` — and one
credential row (`IntegrationSecret`, provider `telnyx`).

It mirrors the Twilio integration intentionally: SMS threads in the same
`SmsMessage` entity, faxes in `FaxLog` (the existing `telnyx_fax_id` field stores
the provider fax id), calls in `CallLog`, and telehealth in `TelehealthSession`.
TCPA opt-out + quiet-hours protections, masked caller ID, idempotent fax sends,
and PHI-minimized audit logging all behave identically to the Twilio path.

## 1. Prerequisites in Telnyx

1. A Telnyx account with a **Mission Control v2 API key** (starts with `KEY`).
2. A purchased number (or numbers) with the relevant capabilities (SMS, voice, fax).
3. A signed **BAA with Telnyx** for HIPAA-eligible traffic.
4. The resources each channel needs:
   - **Text** — a *Messaging Profile* (optional but recommended for opt-out/routing).
   - **Voice** — a *Call Control Application* (gives you a `connection_id`).
   - **Fax** — a *FAX / Programmable Fax Application* (gives you a `connection_id`)
     and a fax-capable number.
   - **Video** — no extra setup; rooms are created on demand by `unique_name`.
5. For A2P 10DLC, register a Brand + Campaign in the Telnyx portal and attach your
   numbers. Unregistered US 10DLC traffic is heavily filtered.

## 2. Configuration

### Option A — in-app (recommended)

Go to **Administration → Super Admin** and save your Telnyx API key plus the
optional resource ids. They are stored backend-only (`IntegrationSecret`, provider
`telnyx`) and are never returned to the browser — only presence + the last 4
characters are shown. Functions used by the admin UI:

- `saveTelnyxSecret` — store the API key / public key / connection ids (super-admin only).
- `getTelnyxSecretStatus` — read whether each value is configured (no secrets returned).
- `testTelnyxConnection` — read-only readiness report + a live `/v2/whoami` probe.

### Option B — dashboard env (takes precedence)

Set as backend function secrets (see `.env.example`). They are **not** `VITE_*`
and must never reach the browser.

| Secret | Purpose |
|---|---|
| `TELNYX_API_KEY` | Telnyx API key (starts with `KEY`) — authenticates all four channels |
| `TELNYX_PUBLIC_KEY` | Ed25519 webhook **public** key (base64) — verifies inbound webhooks |
| `TELNYX_MESSAGING_PROFILE_ID` | Messaging Profile id for outbound SMS/MMS |
| `TELNYX_VOICE_CONNECTION_ID` | Call Control Application connection id (alias: `TELNYX_CONNECTION_ID`) |
| `TELNYX_FAX_CONNECTION_ID` | Programmable Fax connection id |
| `TELNYX_FAX_NUMBER` | E.164 Telnyx fax number on the fax connection |

Env values override the in-app `IntegrationSecret` values when both are set.

## 3. Webhooks

Point every Telnyx webhook (messaging profile, Call Control app, FAX app) at:

```
https://<your-functions-base>/handleTelnyxStatusWebhook
```

Outbound sends also pass a per-request `webhook_url` pointing at the same function
when `FUNCTIONS_BASE_URL` is set, so delivery/status updates flow back even before
you configure the portal-level webhooks.

### Signature verification (fail-closed)

`handleTelnyxStatusWebhook` verifies Telnyx's **Ed25519** signature:

- signed message = `` `${telnyx-timestamp}|${rawBody}` ``
- header `telnyx-signature-ed25519` (base64) verified against `TELNYX_PUBLIC_KEY`
- the `telnyx-timestamp` must be within a 5-minute replay window

A webhook without a valid signature, or with a stale timestamp, is rejected `401`.
These events mutate delivery state for PHI-bearing messages/faxes/calls, so the
public key **must** be configured for inbound webhooks to be accepted.

## 4. Masked voice flow

`startTelnyxCall` rings the nurse's personal cell first (caller id = their work
number) and stashes the bridge target + presented caller id in the Call Control
`client_state`. When the nurse answers, the `call.answered` webhook decodes
`client_state` and issues a Call Control **transfer** to the patient presenting the
work number — so the patient never sees the nurse's cell.

## 5. Status mapping

The provider→internal status mapping is the unit-tested source of truth in
`src/components/integrations/telnyx/telnyxUtils.js` and is inlined into the webhook
handler (drift-guarded by `base44/functions/telnyxInlineParity.test.js`):

- **Messages** → `queued` / `sent` / `delivered` / `failed`
- **Fax** → `queued` / `sending` / `sent` / `delivered` / `failed`
- **Calls** → `ringing` / `in_progress` / `completed`

Unknown statuses are acknowledged without writing, so a terminal row is never
regressed to a non-terminal state.

# Telnyx Integration — Text, Voice, Video & Fax

Telnyx is the sole telephony/communications provider for the app. It powers all
four channels:

| Channel | Telnyx product | Backend function (provider-neutral name) |
|---|---|---|
| **Text** (SMS/MMS) | Messaging API | `sendSms`, `sendTestSms`, `dispatchScheduledSms`, `redriveFailedSms` |
| **Voice** (masked click-to-call + inbound IVR) | Call Control v2 | `startMaskedCall` (outbound), inbound handled in the webhook |
| **Video** (telehealth) | Telnyx Video (Rooms) + `@telnyx/video` client | `createTelehealthToken` |
| **Fax** | Programmable Fax | `sendFax`, `retryFailedFax`, `autoRetryFailedFaxes`, `sendBatchFax`, `syncFaxStatuses`, `pollFaxStatuses` |

> The user-facing function names are provider-neutral (`sendSms`, `sendFax`,
> `startMaskedCall`, `createTelehealthToken`) and run on Telnyx internally. The
> former Twilio functions, the `twilio-video` client SDK, and the Twilio
> credential model have been removed.

Every inbound and status event — messaging, fax, and voice (Call Control) —
is delivered to a **single signed webhook**, `handleTelnyxStatusWebhook`.

## 1. Prerequisites in Telnyx

1. A Telnyx account with a **Mission Control v2 API key** (starts with `KEY`).
2. A purchased number (or numbers) with the relevant capabilities (SMS, voice, fax).
3. A signed **BAA with Telnyx** for HIPAA-eligible traffic.
4. The resources each channel needs:
   - **Text** — a *Messaging Profile* (recommended for opt-out/routing).
   - **Voice** — a *Call Control Application* (gives you a `connection_id`).
   - **Fax** — a *FAX / Programmable Fax Application* (gives you a `connection_id`)
     and a fax-capable number.
   - **Video** — no extra setup; rooms are created on demand by `unique_name`.
5. For A2P 10DLC, register a Brand + Campaign in the Telnyx portal and attach your
   numbers. Unregistered US 10DLC traffic is heavily filtered.

## 2. Configuration

### Option A — in-app (recommended)

**Administration → Super Admin** → the **Telnyx Credentials** panel. Save your
API key plus the optional resource ids. They are stored backend-only
(`IntegrationSecret`, provider `telnyx`) and are never returned to the browser —
only presence + the last 4 characters are shown. Functions:

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

Point the webhook URL of **each** connection (Messaging Profile, Call Control
connection, Programmable Fax connection) at the single function:

```
https://<your-functions-base>/handleTelnyxStatusWebhook
```

Outbound sends/calls also pass a per-request `webhook_url` pointing at the same
function when `FUNCTIONS_BASE_URL` is set, so delivery/status updates flow back
even before you finish the portal-level webhook configuration.

### Signature verification (fail-closed)

`handleTelnyxStatusWebhook` verifies Telnyx's **Ed25519** signature:

- signed message = `` `${telnyx-timestamp}|${rawBody}` ``
- header `telnyx-signature-ed25519` (base64) verified against `TELNYX_PUBLIC_KEY`
- the `telnyx-timestamp` must be within a 5-minute replay window

A webhook without a valid signature, or with a stale timestamp, is rejected `401`.
The public key **must** be configured for inbound webhooks to be accepted.

## 4. Voice flows (Call Control)

Both inbound and outbound voice run on a Call Control Application, so all call
events arrive at `handleTelnyxStatusWebhook` and are driven there as a small state
machine via `client_state`.

- **Outbound masked click-to-call** (`startMaskedCall`): rings the nurse's cell
  first (caller id = work number); on `call.answered` the webhook issues a Call
  Control `transfer` to bridge the patient, presenting the work number.
- **Inbound** (patient → work number): on `call.initiated` the webhook resolves
  the nurse and applies the agency-hours → off-duty → masked-bridge routing. A
  plain bridge transfers immediately; greeting / voicemail / after-hours paths
  `answer`, `speak`, then `transfer` / `hangup` / `record_start`. Voicemail
  recordings are stored on `call.recording.saved`.

> Call Control action/field names are annotated with `TODO(verify)` in the
> webhook and should be confirmed against your live Telnyx account during rollout.

## 5. Inbound SMS

`message.received` events are handled in the webhook: STOP/START/HELP keyword
handling (TCPA), inbound message storage + threading, automatic after-hours /
off-duty auto-replies, urgent-keyword escalation, and in-app nurse notification.

## 6. Telehealth video

`createTelehealthToken` finds-or-creates a Telnyx Video room by `unique_name`
(the session `room_name`) and mints a per-session join client token (1-hour TTL)
using the same guest-token / staff authorization model as before. The client
(`src/components/telehealth/VideoRoom.jsx`) uses the `@telnyx/video` SDK.

> The `@telnyx/video` Room API method/event names used in `VideoRoom.jsx` are
> annotated with `TODO(verify)` and should be confirmed against the SDK version
> pinned in `package.json` during rollout.

## 7. Status mapping

The provider→internal status mapping is the unit-tested source of truth in
`src/components/integrations/telnyx/telnyxUtils.js` and is inlined into the webhook
handler (drift-guarded by `base44/functions/telnyxInlineParity.test.js`):

- **Messages** → `queued` / `sent` / `delivered` / `failed`
- **Fax** → `queued` / `sending` / `sent` / `delivered` / `failed`
- **Calls** → `ringing` / `in_progress` / `completed`

Unknown statuses are acknowledged without writing, so a terminal row is never
regressed to a non-terminal state.

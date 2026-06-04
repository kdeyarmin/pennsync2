# Twilio Phone Integration — Base44 Entity Setup

Base44 entity schemas are defined in the **Base44 dashboard**, not in code. Before
deploying the Twilio functions, an admin must create/extend the entities below.
Field naming follows existing conventions (snake_case, `*_email`, `patient_id`,
lowercase string enums) as used by `FaxLog` and `Message`.

> The backend functions reference these via `base44.entities.<Name>` /
> `base44.asServiceRole.entities.<Name>`, so they must exist with these fields.

## Extend `User`

| Field | Type | Notes |
|---|---|---|
| `work_phone_number` | string | Assigned Twilio number, E.164. Null until provisioned. |
| `personal_cell_e164` | string | **PRIVATE** masked-bridge target. Restrict read access to service role / admin — never expose to patient-facing surfaces. |
| `duty_status` | string enum | `on_duty` \| `off_duty` (default `off_duty`). |
| `off_duty_message` | text | Per-nurse off-duty greeting; overrides agency default. |
| `scheduled_off_duty_start` | string (ISO) | Optional. Start of a scheduled time-off window (e.g. the weekend). Nullable. |
| `scheduled_off_duty_end` | string (ISO) | Optional. End of the scheduled window; the nurse is treated as off duty between start and end, then automatically back on duty. Nullable. |
| `scheduled_off_duty_recurring` | boolean | Optional (default false). When true the window repeats weekly on the same day/time (e.g. every weekend). |

## Extend `AgencySettings` (single-row entity)

| Field | Type | Notes |
|---|---|---|
| `main_office_number_e164` | string | Off-duty call transfer target / referral number. |
| `default_off_duty_template` | text | Default off-duty message when a nurse hasn't set one. |
| `sms_messaging_enabled` | boolean | Agency-wide kill switch (default true). |
| `sms_quick_replies` | array (string) | Optional one-tap PHI-safe text snippets for the compose box. Falls back to built-in defaults when empty. |
| `sms_templates` | array (object) | Optional reusable templates `{ label, body }` with merge fields (`{first_name}`, `{last_name}`, `{nurse_name}`, `{office}`). Falls back to built-in defaults when empty. |
| `voicemail_enabled` | boolean | Optional (default false). When true, an unanswered on-duty masked call captures a voicemail (requires the `<Record>` action in the TwiML call flow + the voicemail webhook). |
| `voicemail_greeting` | text | Optional voicemail prompt; `{office}` inserts the main office number. |
| `business_hours_enabled` | boolean | Optional (default false). Master switch for global calling/texting hours; off = always open. |
| `business_hours_timezone` | string | IANA timezone the schedule is interpreted in (e.g. `America/New_York`). |
| `business_hours` | object | Per-day schedule keyed `sun`…`sat`, each `{ enabled: boolean, open: "HH:MM", close: "HH:MM" }` (24h; `close <= open` = overnight wrap). |
| `after_hours_call_action` | string enum | `transfer` (default) \| `voicemail` \| `hangup` — how inbound calls are handled while closed. |
| `after_hours_transfer_number_e164` | string | When closed + `transfer`: target number (defaults to `main_office_number_e164`). |
| `after_hours_call_greeting` | text | Optional spoken greeting before an after-hours transfer/voicemail; `{office}` merge. |
| `after_hours_sms_auto_reply_enabled` | boolean | Optional (default true). Auto-reply to inbound texts received while closed. |
| `after_hours_sms_auto_reply` | text | The after-hours text auto-reply body; `{office}` merge. Falls back to `default_off_duty_template`, then a built-in message. |
| `business_hours_holidays` | array (string) | `YYYY-MM-DD` dates the practice is closed all day (interpreted in the business timezone). |
| `tcpa_quiet_hours_enabled` | boolean | Optional (default false). Block outbound texts outside the recipient-local window. |
| `tcpa_quiet_start_hour` / `tcpa_quiet_end_hour` | number | Allowed texting window in the recipient's timezone (default 8 / 21). |
| `urgent_escalation_enabled` | boolean | Optional (default true). Escalate inbound texts matching urgent keywords. |
| `urgent_keywords` | array (string) | Extra agency-specific red-flag keywords merged with the built-in list. |

## New `PhoneNumber` (the assignable number pool)

Inventory of purchased Twilio numbers so an admin can add a number once and
assign/reassign it from a dropdown. All writes go through the
`managePhoneNumberPool` backend function (service role), which keeps this in sync
with `User.work_phone_number`. Read is open to authenticated users (numbers are
not PHI); write is service-role only.

| Field | Type | Notes |
|---|---|---|
| `e164` | string (required) | The number in E.164. Unique across the pool. |
| `label` | string | Optional friendly label (e.g. "Nurse line 1"). |
| `status` | string enum | `available` \| `assigned` (default `available`). |
| `assigned_to_email` | string | The user currently holding it as their work number (when assigned). |
| `notes` | string | Optional admin notes. |

## New `SmsMessage`

| Field | Type | Notes |
|---|---|---|
| `direction` | string enum | `inbound` \| `outbound` |
| `from_number` | string | E.164 |
| `to_number` | string | E.164 |
| `body` | text | Message content |
| `nurse_email` | string | Owner of the work number |
| `patient_id` | string | Nullable; resolved from phone |
| `thread_id` | string | Deterministic `min\|max` of the two numbers |
| `status` | string enum | `queued` \| `sent` \| `delivered` \| `failed` \| `received` |
| `provider_message_id` | string | Twilio message SID |
| `client_message_id` | string | Idempotency key |
| `failure_reason` | string | Nullable |
| `is_read` | boolean | Nurse-inbox unread flag |
| `sent_by` | string | Nurse email (outbound) |
| `consent_checked` | boolean | Opt-in confirmed at send time |
| `retry_count` | number | Nullable. Failed-send re-drive attempts (`redriveFailedSms`). |
| `last_retry_at` | string (ISO) | Nullable. When the last re-drive attempt ran. |
| `redrive_claimed_by` | string | Nullable. Per-run claim token used by the re-drive cron. |

## New `CallLog`

| Field | Type | Notes |
|---|---|---|
| `direction` | string enum | `inbound` \| `outbound` |
| `from_number` | string | Real originating endpoint |
| `to_number` | string | Real destination endpoint |
| `displayed_number` | string | Work number shown as caller ID (masking proof) |
| `nurse_email` | string | |
| `patient_id` | string | Nullable |
| `call_mode` | string enum | `masked_bridge` \| `off_duty_transfer` \| `after_hours_transfer` \| `outbound_clicktocall` |
| `status` | string enum | `initiated` \| `ringing` \| `bridged` \| `completed` \| `no_answer` \| `failed` \| `forwarded_office` |
| `provider_call_id` | string | Twilio call SID |
| `duration_seconds` | number | Nullable |
| `failure_reason` | string | Nullable |
| `sent_by` | string | Initiating nurse (outbound) |
| `note` | text | Nullable. Nurse's free-text call note (keep PHI-free). |
| `disposition` | string enum | Nullable. `resolved` \| `follow_up_needed` \| `callback_requested` \| `left_voicemail` \| `no_action` |
| `has_voicemail` | boolean | Set by the voicemail webhook when a recording is attached. |
| `voicemail_url` | string | Nullable. Recording URL from Twilio. |
| `voicemail_duration_seconds` | number | Nullable. |
| `voicemail_transcription` | text | Nullable. Transcription when Twilio (or an add-on) provides one. |

## New `SmsConsent` (append-only TCPA ledger)

| Field | Type | Notes |
|---|---|---|
| `patient_id` | string | Nullable |
| `phone_e164` | string | |
| `consent_status` | string enum | `opted_in` \| `opted_out` \| `unknown` |
| `consent_source` | string enum | `verbal_documented` \| `written_form` \| `inbound_text` \| `keyword_stop` \| `keyword_start` \| `manual_opt_in` \| `manual_opt_out` |
| `captured_by` | string | Nurse/admin email; null for patient keyword events |
| `captured_at` | string (ISO) | |
| `notes` | text | |

## New `ScheduledSms` (queued future sends)

| Field | Type | Notes |
|---|---|---|
| `to_number` | string | E.164 destination |
| `from_number` | string | Nurse's work number |
| `body` | text | Message content |
| `patient_id` | string | Nullable |
| `nurse_email` | string | Owner |
| `thread_id` | string | Deterministic `min\|max` of the two numbers |
| `send_at` | string (ISO) | When to send |
| `status` | string enum | `pending` \| `sending` \| `sent` \| `failed` \| `canceled` |
| `template_label` | string | Nullable; the template the message came from |
| `provider_message_id` | string | Nullable; Twilio message SID once sent |
| `sms_message_id` | string | Nullable; the `SmsMessage` row created on send |
| `failure_reason` | string | Nullable |
| `attempts` | number | Send attempts |
| `sent_at` | string (ISO) | Nullable |
| `claimed_by` | string | Nullable. Per-run claim token (overlap-safe dispatch). |
| `claimed_at` | string (ISO) | Nullable. When the row was claimed. |
| `created_by` | string | Nurse email |
| `canceled_by` | string | Nullable |
| `canceled_at` | string (ISO) | Nullable |

> `dispatchScheduledSms` is a **cron** function — configure a schedule (e.g.
> every 5 minutes) for it in the Base44 dashboard. It claims due `pending` rows
> (`pending → sending`) before sending so overlapping runs don't double-send,
> and re-checks the kill switch + opt-out at send time. Restrict `ScheduledSms`
> read access to the owning `nurse_email` + admins (the body may contain PHI).

The existing `UserActivity`, `Notification`, and `SecurityLog` entities are
reused as-is (no changes required).

---

## Entity read-permission checklist (HIPAA / privacy)

When creating the entities in the Base44 dashboard, lock down read access on the
fields/entities that hold private numbers or PHI. The functions use
`asServiceRole` for the operations that legitimately need these values, so
restricting client read access does **not** break the feature.

- **`User.personal_cell_e164`** — the nurse's private cell (masked-bridge target).
  Restrict read access to **service role + admins only**. It must never be
  returned to patient-facing surfaces or to other nurses. (The admin UI renders
  only the last 4 digits.)
- **`CallLog`** — rows contain the real call endpoints (including the nurse's
  cell in `from_number`/`to_number`). Restrict read access to the **owning
  `nurse_email` + admins**. The Phone Center call history already filters by
  `nurse_email`; this enforces it server-side.
- **`SmsMessage`** — `body` may contain PHI. Restrict read access to the
  **owning `nurse_email` + admins** (the inbox already filters by `nurse_email`).
- **`SmsConsent`** — opt-in/opt-out ledger with patient phone numbers. Restrict
  to **admins + service role**.

These are Base44 dashboard settings, not code — but they are the real access
control (client-side filtering is convenience, not security).

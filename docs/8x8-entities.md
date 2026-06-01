# 8x8 Phone Integration — Base44 Entity Setup

Base44 entity schemas are defined in the **Base44 dashboard**, not in code. Before
deploying the 8x8 functions, an admin must create/extend the entities below.
Field naming follows existing conventions (snake_case, `*_email`, `patient_id`,
lowercase string enums) as used by `FaxLog` and `Message`.

> The backend functions reference these via `base44.entities.<Name>` /
> `base44.asServiceRole.entities.<Name>`, so they must exist with these fields.

## Extend `User`

| Field | Type | Notes |
|---|---|---|
| `work_phone_number` | string | Assigned 8x8 virtual number, E.164. Null until provisioned. |
| `personal_cell_e164` | string | **PRIVATE** masked-bridge target. Restrict read access to service role / admin — never expose to patient-facing surfaces. |
| `duty_status` | string enum | `on_duty` \| `off_duty` (default `off_duty`). |
| `off_duty_message` | text | Per-nurse off-duty greeting; overrides agency default. |
| `scheduled_off_duty_start` | string (ISO) | Optional. Start of a scheduled time-off window (e.g. the weekend). Nullable. |
| `scheduled_off_duty_end` | string (ISO) | Optional. End of the scheduled window; the nurse is treated as off duty between start and end, then automatically back on duty. Nullable. |
| `eight_x_eight_voice_endpoint_id` | string | Optional 8x8 voice endpoint id. |

## Extend `AgencySettings` (single-row entity)

| Field | Type | Notes |
|---|---|---|
| `main_office_number_e164` | string | Off-duty call transfer target / referral number. |
| `eight_x_eight_sms_subaccount_id` | string | |
| `eight_x_eight_voice_subaccount_id` | string | |
| `eight_x_eight_voice_api_base` | string | Voice API base URL for outbound click-to-call origination. |
| `eight_x_eight_region` | string | e.g. `us` → builds `sms.us.8x8.com`. |
| `default_off_duty_template` | text | Default off-duty message when a nurse hasn't set one. |
| `sms_messaging_enabled` | boolean | Agency-wide kill switch (default true). |

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
| `provider_message_id` | string | 8x8 `umid` |
| `client_message_id` | string | Idempotency key |
| `failure_reason` | string | Nullable |
| `is_read` | boolean | Nurse-inbox unread flag |
| `sent_by` | string | Nurse email (outbound) |
| `consent_checked` | boolean | Opt-in confirmed at send time |

## New `CallLog`

| Field | Type | Notes |
|---|---|---|
| `direction` | string enum | `inbound` \| `outbound` |
| `from_number` | string | Real originating endpoint |
| `to_number` | string | Real destination endpoint |
| `displayed_number` | string | Work number shown as caller ID (masking proof) |
| `nurse_email` | string | |
| `patient_id` | string | Nullable |
| `call_mode` | string enum | `masked_bridge` \| `off_duty_transfer` \| `outbound_clicktocall` |
| `status` | string enum | `initiated` \| `ringing` \| `bridged` \| `completed` \| `no_answer` \| `failed` \| `forwarded_office` |
| `provider_call_id` | string | 8x8 call/session id |
| `duration_seconds` | number | Nullable |
| `failure_reason` | string | Nullable |
| `sent_by` | string | Initiating nurse (outbound) |

## New `SmsConsent` (append-only TCPA ledger)

| Field | Type | Notes |
|---|---|---|
| `patient_id` | string | Nullable |
| `phone_e164` | string | |
| `consent_status` | string enum | `opted_in` \| `opted_out` \| `unknown` |
| `consent_source` | string enum | `verbal_documented` \| `written_form` \| `inbound_text` \| `keyword_stop` \| `keyword_start` |
| `captured_by` | string | Nurse/admin email; null for patient keyword events |
| `captured_at` | string (ISO) | |
| `notes` | text | |

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

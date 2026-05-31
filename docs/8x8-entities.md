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
| `eight_x_eight_voice_endpoint_id` | string | Optional 8x8 voice endpoint id. |

## Extend `AgencySettings` (single-row entity)

| Field | Type | Notes |
|---|---|---|
| `main_office_number_e164` | string | Off-duty call transfer target / referral number. |
| `eight_x_eight_sms_subaccount_id` | string | |
| `eight_x_eight_voice_subaccount_id` | string | |
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

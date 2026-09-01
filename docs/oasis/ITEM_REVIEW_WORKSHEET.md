# PennSync OASIS item review worksheet (OASIS-E)

PennSync does **not** contain the authoritative CMS OASIS instrument. The
classifications below were derived from internal evidence and from the app's own
canonical scale table, **not** from a qualified reviewer reading the CMS manual.

For each row, confirm or correct PennSync's classification and cite the CMS source
you checked. Leave a row blank if you did not review it — an unreviewed row is a
more useful record than a guessed one.

Classification key:

- `verified` — title and response set confirmed against a CMS source
- `abbreviated` — a real CMS item whose PennSync response list is shortened
- `unverified` — a real CMS item number whose PennSync wording is unconfirmed
- `pennsync_screening` — not a CMS item; must never display an item number

| PennSync id | Item number shown | PennSync label | Current classification | PennSync's evidence | Reviewer: correct? | Reviewer: CMS source | Reviewer initials / date |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `m0069` | M0069 | M0069 — Prognosis | `unverified` | PennSync has not verified this item's wording or response set against a CMS source. |   |   |   |
| `m1020` | M1020 | M1020 — Primary Diagnosis | `abbreviated` | PennSync offers a short diagnosis picklist. The official item records an ICD-10 diagnosis code — enter it on the assessment in your EMR. |   |   |   |
| `m1030` | M1030 | M1030 — Therapies at Home | `abbreviated` | PennSync's therapy list is abbreviated and does not reproduce the official response set. |   |   |   |
| `m1100` | M1100 | M1100 — Patient Living Situation | `abbreviated` | PennSync offers a shortened living-situation list. The official item has a larger residence-by-assistance response set. |   |   |   |
| `m1730` | M1730 | M1730 — Depression Screening | `unverified` | PennSync has not verified this item's wording or response set against a CMS source. |   |   |   |
| `m1740` | M1740 | M1740 — Cognitive, Behavioral & Psychiatric Symptoms | `unverified` | PennSync has not verified this item's wording or response set against a CMS source. |   |   |   |
| `m1700` | M1700 | M1700 — Cognitive Functioning | `unverified` | PennSync has not verified this item's wording or response set against a CMS source. |   |   |   |
| `m1400` | M1400 | M1400 — Respiratory Status: Dyspnea | `unverified` | PennSync has not verified this item's wording or response set against a CMS source. |   |   |   |
| `m1340` | M1340 | M1340 — Surgical Wound | `unverified` | PennSync has not verified this item's wording or response set against a CMS source. |   |   |   |
| `m1306` | M1306 | M1306 — Unhealed Pressure Ulcer(s) | `unverified` | PennSync has not verified this item's wording or response set against a CMS source. |   |   |   |
| `m1350` | M1350 | M1350 — Skin Lesion or Open Wound | `unverified` | PennSync has not verified this item's wording or response set against a CMS source. |   |   |   |
| `m1800` | M1800 | M1800 — Grooming | `verified` | — |   | src/components/oasis/oasisScales.js (app canonical scale table) |   |
| `m1810` | M1810 | M1810 — Upper Body Dressing | `verified` | — |   | src/components/oasis/oasisScales.js (app canonical scale table) |   |
| `m1820` | M1820 | M1820 — Lower Body Dressing | `verified` | — |   | src/components/oasis/oasisScales.js (app canonical scale table) |   |
| `m2001` | M2001 | M2001 — Drug Regimen Review | `unverified` | PennSync has not verified this item's wording or response set against a CMS source. |   |   |   |
| `m2010` | M2010 | M2010 — High-Risk Drug Education | `unverified` | PennSync has not verified this item's wording or response set against a CMS source. |   |   |   |
| `m2020` | M2020 | M2020 — Management of Oral Medications | `unverified` | PennSync has not verified this item's wording or response set against a CMS source. |   |   |   |
| `m1910` | M1910 | M1910 — Fall Risk Assessment | `unverified` | PennSync has not verified this item's wording or response set against a CMS source. |   |   |   |
| `m1900` | M1900 | M1900 — Prior Functioning | `unverified` | PennSync has not verified this item's wording or response set against a CMS source. |   |   |   |
| `m1830` | M1830 | M1830 — Bathing | `verified` | — |   | src/components/oasis/oasisScales.js (app canonical scale table) |   |
| `m1840` | M1840 | M1840 — Toilet Transferring | `verified` | — |   | src/components/oasis/oasisScales.js (app canonical scale table) |   |
| `m1845` | M1845 | M1845 — Toileting Hygiene | `verified` | — |   | src/components/oasis/oasisScales.js (app canonical scale table) |   |
| `m1850` | M1850 | M1850 — Transferring | `verified` | — |   | src/components/oasis/oasisScales.js (app canonical scale table) |   |
| `m1860` | M1860 | M1860 — Ambulation/Locomotion | `verified` | — |   | src/components/oasis/oasisScales.js (app canonical scale table) |   |
| `m1870` | M1870 | M1870 — Feeding or Eating | `verified` | — |   | src/components/oasis/oasisScales.js (app canonical scale table) |   |
| `m1033` | M1033 | M1033 — Risk for Hospitalization | `unverified` | PennSync has not verified this item's wording or response set against a CMS source. |   |   |   |
| `m1242` | M1242 | M1242 — Frequency of Pain | `verified` | — |   | src/components/oasis/oasisScales.js (app canonical scale table) |   |
| `m1300` | M1300 | M1300 — Pressure Ulcer Risk | `unverified` | PennSync has not verified this item's wording or response set against a CMS source. |   |   |   |
| `m1610` | M1610 | M1610 — Urinary Incontinence | `unverified` | PennSync has not verified this item's wording or response set against a CMS source. |   |   |   |
| `m1620` | M1620 | M1620 — Bowel Incontinence | `unverified` | PennSync has not verified this item's wording or response set against a CMS source. |   |   |   |
| `m1630` | M1630 | M1630 — Ostomy | `unverified` | PennSync has not verified this item's wording or response set against a CMS source. |   |   |   |
| `m2102` | — (none) | Physical therapy need (PennSync screening item) | `pennsync_screening` | src/components/oasis/AIProactiveOASISAssistant.jsx:138 describes M2102 as "Types and Sources of Assistance", contradicting the item bank's "Physical Therapy" label. |   |   |   |
| `m2110` | — (none) | Occupational therapy need (PennSync screening item) | `pennsync_screening` | M2110 is an assistance item in the CMS instrument, not an occupational-therapy need question. Not independently confirmed against a CMS source by PennSync. |   |   |   |
| `m2200` | — (none) | Speech-language pathology need (PennSync screening item) | `pennsync_screening` | M2200 (Therapy Need) was discontinued under PDGM. Not independently confirmed against a CMS source by PennSync. |   |   |   |
| `m2401` | M2401 | M2401 — Intervention Synopsis | `unverified` | PennSync has not verified this item's wording or response set against a CMS source. |   |   |   |
| `m2420` | M2420 | M2420 — Discharge Disposition | `abbreviated` | PennSync's discharge-disposition list is abbreviated and does not reproduce the official response set. Confirm the disposition response in your EMR. |   |   |   |

**36 of 36 items await sign-off.**

Record each confirmation in `src/components/oasis/specs/verification.js`
(`reviewed_by`, `reviewed_at`, `review_source`) so the product can report its own
review state rather than relying on this document.

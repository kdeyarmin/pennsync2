import {
  Bandage,
  Brain,
  HeartPulse,
  Phone,
  Syringe,
} from "lucide-react";

/**
 * Quick-insert clinical documentation templates, part 2 (ids 7–12).
 * Split out of quickTemplates.js to keep each data module focused and under the
 * file-size limit. Combined back together by quickTemplates.js — do not import
 * this directly from UI; import { quickTemplates } from "./quickTemplates".
 */
export const quickTemplatesPart2 = [
    {
      id: 7,
      name: "Hospice Comfort Assessment",
      category: "Hospice Care",
      icon: HeartPulse,
      color: "text-gold-600",
      bgColor: "bg-gold-50",
      template: `**HOSPICE COMFORT ASSESSMENT**

**PHYSICAL COMFORT:**

**Pain Assessment:**
- Location: [___]
- Intensity: [0-10]/10 at rest, [0-10]/10 with movement
- Quality: [Aching/Burning/Sharp/Stabbing/Other]
- Frequency: [Constant/Intermittent]
- Current pain management: [Medications, doses, effectiveness]
- Last breakthrough dose: [Time, medication, response]
- Pain goal: [Patient's acceptable level: ___/10]

**Respiratory Comfort:**
- Dyspnea: [None/Mild/Moderate/Severe]
- Oxygen: [Room air/O2 at ___ L via ___]
- Lung sounds: [Clear/Crackles/Diminished]
- Respiratory rate: [___]
- Use of accessory muscles: [Yes/No]
- Patient report of breathlessness: [None/With exertion/At rest]
- Interventions: [O2/Positioning/Fan/Medications]

**Nausea/Vomiting:**
- Present: [Yes/No]
- Severity: [Mild/Moderate/Severe]
- Frequency: [___]
- Last episode: [___]
- Able to tolerate PO: [Yes/No]
- Medication management: [List antiemetics, effectiveness]

**Bowel Function:**
- Last BM: [Date/Time]
- Bowel pattern: [Normal/Constipation/Diarrhea/Incontinence]
- Abdominal assessment: [Soft/Distended/Tender]
- Bowel regimen: [Medications]
- Patient comfort: [Comfortable/Uncomfortable]

**Oral Comfort:**
- Mucous membranes: [Moist/Dry/Cracked]
- Oral intake: [Good/Fair/Poor/None]
- Difficulty swallowing: [Yes/No]
- Mouth care: [Frequency, products used]
- Patient report: [Comfortable/Uncomfortable]

**Skin Integrity:**
- Overall condition: [Intact/Areas of concern]
- Pressure points assessed: [Sacrum/Heels/Elbows/Other]
- [Pressure injury present: Location, stage, size, treatment]
- Positioning: [Position of comfort, turning schedule]
- Support surfaces: [Mattress type, cushions]

**FUNCTIONAL STATUS:**

**Activity Level:**
- [Ambulatory/Chair-bound/Bedbound]
- [Out of bed: Hours per day]
- Transfers: [Independent/Requires assistance/Unable]
- Fatigue: [Mild/Moderate/Severe]
- Desire for activity: [Expressed/Minimal/None]

**Performance Status:**
- [Karnofsky/Palliative Performance Scale score: ___]
- Change since last visit: [Improved/Stable/Declined]

**Sleep/Rest:**
- Sleep pattern: [Good/Disturbed/Fragmented/Awake most of time]
- Hours of sleep: [___]
- Needs assistance at night: [Yes/No - frequency]
- Comfort measures for sleep: [___]

**PSYCHOSOCIAL/SPIRITUAL COMFORT:**

**Emotional Status:**
- Mood: [Calm/Anxious/Depressed/Agitated/Peaceful]
- Anxiety level: [None/Mild/Moderate/Severe]
- Fear: [None/Present - describe concerns]
- Patient expresses: [Acceptance/Anger/Denial/Fear/Peace]
- Coping: [Well/Difficulty/Unable to cope]

**Spiritual Comfort:**
- Spiritual concerns expressed: [Yes/No - describe]
- Spiritual support: [Clergy visits/Prayer/Other]
- Need for chaplain: [Yes/No - referral made]
- Religious rituals important to patient: [___]
- End-of-life wishes discussed: [Yes/No]

**Family/Caregiver Status:**
- Primary caregiver: [Name, relationship]
- Caregiver coping: [Well/Stressed/Overwhelmed/Burned out]
- Family understanding of prognosis: [Good/Limited/In denial]
- Family dynamics: [Supportive/Conflicted/Other]
- Anticipatory grief: [Present - family prepared/Unprepared/Other]
- Caregiver needs: [Respite/Education/Support/Other]

**SIGNS OF DISEASE PROGRESSION:**
- [Weight loss: Current weight ___ Previous weight ___ Date ___]
- [Decreased intake: Significant/Moderate/Minimal]
- [Increased sleepiness/lethargy]
- [Decreased interest in surroundings]
- [Confusion/restlessness]
- [Cool extremities]
- [Mottling]
- [Decreased urine output]
- [Respiratory changes]
- [Other signs: ___]

**COMFORT INTERVENTIONS PROVIDED:**

**Pharmacological:**
- [Pain medication adjusted/administered]
- [Anxiety medication provided]
- [Nausea medication given]
- [Bowel regimen adjusted]
- [Other: ___]

**Non-Pharmacological:**
- [Repositioning for comfort]
- [Mouth care provided]
- [Cool cloth applied]
- [Hand massage]
- [Music therapy]
- [Aromatherapy]
- [Spiritual support]
- [Emotional support/therapeutic listening]
- [Family education and support]
- [Other comfort measures: ___]

**SYMPTOM MANAGEMENT PLAN:**
- Pain: [Current regimen, breakthrough medication available]
- Dyspnea: [Interventions, medications]
- Anxiety: [Interventions, medications]
- Other symptoms: [Plan for each]

**MEDICATION REVIEW:**
✓ All comfort medications available in home
✓ Patient/caregiver understands medication administration
✓ Breakthrough medications explained
✓ When to call hospice for medication adjustment

**CAREGIVER EDUCATION:**
✓ Signs of impending death reviewed (if appropriate)
✓ Normal dying process explained
✓ Comfort measures demonstrated
✓ Medication administration reinforced
✓ When to call hospice: 24/7 availability reinforced
✓ Active dying process discussed (if appropriate)
✓ Post-death procedures explained
✓ Bereavement support available

**EQUIPMENT/SUPPLIES:**
- DME in place: [Hospital bed/Wheelchair/Bedside commode/Other]
- Oxygen: [Concentrator/Portable tanks]
- Supplies adequate: [Yes/No - needs identified]
- [Additional equipment needed: ___]

**PLAN:**
- Continue current symptom management plan
- [Increase visit frequency to ___ per week due to declining status]
- [CNA visits increased to ___ times per week for personal care]
- Chaplain to visit [date/time]
- [Social worker to address family concerns]
- Patient/family encouraged to call anytime for support or symptom management
- Next scheduled visit: [Date/Time]

**HOSPICE TEAM COMMUNICATION:**
- Physician Dr. [Name] updated on patient status
- [Changes communicated to IDT]
- [Orders updated as needed]

Patient and family express satisfaction with comfort level and hospice support. Family verbalizes understanding of 24/7 hospice availability and when to call. Emotional and spiritual support provided.`
    },
    {
      id: 8,
      name: "Wound Care Documentation",
      category: "Procedures",
      icon: Bandage,
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      template: `**WOUND CARE DOCUMENTATION**

**WOUND ASSESSMENT:**

**Wound Location:** [Specific anatomical location]
**Type:** [Surgical incision/Pressure injury/Arterial ulcer/Venous ulcer/Diabetic ulcer/Traumatic wound/Other]

**Stage/Classification (if pressure injury):**
[Stage 1: Non-blanchable erythema / Stage 2: Partial thickness / Stage 3: Full thickness / Stage 4: Full thickness with exposed bone/muscle/tendon / Unstageable: Obscured by slough/eschar / Deep Tissue Injury: Purple/maroon discoloration]

**WOUND MEASUREMENTS:**
- Length: [___] cm (head to toe)
- Width: [___] cm (side to side)
- Depth: [___] cm (deepest point)
- Undermining: [Yes/No - location per clock face, depth: ___cm at ___ o'clock]
- Tunneling: [Yes/No - location per clock face, depth: ___cm at ___ o'clock]

**Measurement Comparison:**
Previous visit: [L: ___cm x W: ___cm x D: ___cm] Date: [___]
Today: [L: ___cm x W: ___cm x D: ___cm]
Change: [Increased/Decreased/Stable by ___ cm]

**WOUND BED:**
- Granulation tissue: [___]% (beefy red, healthy tissue)
- Slough: [___]% (yellow/tan devitalized tissue)
- Eschar: [___]% (black/brown necrotic tissue)
- Epithelialization: [___]% (new pink tissue at wound edges)
- Exposed structures: [None / Tendon / Bone / Muscle / Other]

**DRAINAGE:**
- Amount: [None/Scant/Small/Moderate/Large/Copious]
- Type: [Serous/Serosanguineous/Sanguineous/Purulent]
- Color: [Clear/Yellow/Green/Brown/Red]
- Odor: [None/Foul/Other - describe]

**PERIWOUND SKIN:**
- Color: [Pink/Red/Purple/Pale/Hyperpigmented]
- Condition: [Intact/Macerated/Dry/Scaling]
- Temperature: [Warm/Cool/Hot]
- Edema: [None/Mild/Moderate/Severe]
- Induration: [None/Present - measure diameter: ___cm]
- Erythema: [None/Present - measure diameter: ___cm]

**WOUND EDGES:**
- Condition: [Attached/Rolled/Undermined/Callused]
- Approximation: [Well-approximated/Separated/Gaping]
- Color: [Pink/Red/Purple/Pale]

**PAIN:**
- At rest: [0-10]/10
- During dressing change: [0-10]/10
- Pain management: [None/Pre-medication with: ___]

**SIGNS OF INFECTION:**
- Increased pain: [Yes/No]
- Increased drainage: [Yes/No]
- Purulent drainage: [Yes/No]
- Foul odor: [Yes/No]
- Increased erythema: [Yes/No]
- Increased warmth: [Yes/No]
- Fever: [Yes/No - temp: ___]
- [Wound culture obtained: Date ___, sent to lab]

**PREVIOUS DRESSING:**
- Type: [___]
- Removal: [Intact/Saturated/Strike-through]
- Frequency: [Daily/Every other day/Other]
- Tolerability: [Well tolerated/Painful/Other]

**WOUND CARE PERFORMED:**

**Cleansing:**
- Solution: [Normal saline/Wound cleanser/Other]
- Method: [Irrigation/Gentle wipe from center outward]
- Pressure: [8-15 psi using 35mL syringe with 19-gauge angiocath / gentle irrigation]

**Debridement (if performed):**
- Type: [Sharp/Enzymatic/Autolytic/Mechanical]
- [Amount of devitalized tissue removed: ___]
- [Wound bed improved to ___% granulation]
- [Bleeding: None/Minimal - controlled with pressure]

**Treatment Applied:**
Primary Dressing:
- Type: [Gauze/Foam/Hydrocolloid/Hydrogel/Alginate/Collagen/Negative pressure/Other]
- [Topical agent: Antimicrobial/Growth factor/Ointment/Other]
- Application: [Describe how applied]

Secondary Dressing:
- Type: [Gauze pads/ABD pad/Transparent film/Wrap/Other]
- Secured with: [Tape/Wrap/Netting/Other]

**Rationale for Dressing Selection:**
[Moisture balance / Infection control / Absorption / Protection / Promotion of granulation / Autolytic debridement / Other]

**ORDERS:**
- Physician order for wound care reviewed
- Current order: [Describe dressing orders]
- [Order change needed - will contact physician]
- Frequency: [Daily/Every other day/Twice weekly/As needed]

**FACTORS AFFECTING HEALING:**

**Nutrition:**
- Appetite: [Good/Fair/Poor]
- [Protein intake: Adequate/Inadequate]
- [Hydration: Adequate/Inadequate]
- Supplements: [Multivitamin/Protein supplement/Vitamin C/Zinc/Other]
- [Dietary referral needed: Yes/No]

**Circulation:**
- Pedal pulses: [2+/1+/Doppler only/Absent]
- Capillary refill: [<3 sec / >3 sec]
- Edema: [None/Mild/Moderate/Severe]
- [Compression therapy: Type ___, applied]

**Pressure Relief:**
- Position changes: [Every 2 hours/Patient repositions self/Other]
- Support surface: [Regular mattress/Pressure-reducing/Pressure-relieving]
- Heel protection: [Devices used: ___]
- Chair cushion: [Type: ___]

**Glucose Control (if diabetic):**
- Blood glucose: [Range: ___]
- HbA1c: [Value: ___, Date: ___]
- Control: [Good/Fair/Poor]

**Other Factors:**
- Smoking: [Yes/No - counseled on cessation]
- Medications affecting healing: [Steroids/Immunosuppressants/Other]
- Chronic conditions: [Diabetes/PVD/CHF/Renal failure/Other]

**PATIENT/CAREGIVER EDUCATION:**
✓ Wound care procedure demonstrated
✓ Signs of infection reviewed
✓ Importance of nutrition/hydration
✓ Pressure relief techniques
✓ [Diabetic foot care if applicable]
✓ When to call physician/wound care nurse
✓ [Compression therapy compliance if applicable]
✓ Activity recommendations
✓ Questions answered

**PATIENT/CAREGIVER PARTICIPATION:**
- [Patient/caregiver performed return demonstration of dressing change]
- [Patient/caregiver demonstrates ___% independence with wound care]
- [Barriers to self-care: ___]

**WOUND HEALING TRAJECTORY:**
- Previous visit [date]: [Size, description]
- Today: [Size, description]
- Progress: [Improving/Plateau/Deteriorating]
- [Expected healing timeframe: ___]

**PLAN:**
- Continue current wound care regimen
- Dressing change [frequency]
- [Modify treatment to: ___ based on wound response]
- Reassess wound measurements weekly
- [Photography: Taken/Not taken - reason]
- [Consultation with wound care specialist if no improvement in 2 weeks]
- [Lab work ordered: CBC, albumin, prealbumin to assess nutritional status]
- [Vascular consultation for arterial assessment]
- Next visit: [Date]

**COMMUNICATION:**
- [Physician Dr. ___ updated on wound progress]
- [Wound care specialist notified of status]
- [Orders updated as needed]

Patient/caregiver verbalizes understanding of wound care plan and demonstrates competence with dressing changes (if applicable). Patient encouraged to report any signs of infection or concerns.`
    },
    {
      id: 9,
      name: "IV Therapy Management",
      category: "Procedures",
      icon: Syringe,
      color: "text-indigo-600",
      bgColor: "bg-indigo-50",
      template: `**INTRAVENOUS THERAPY MANAGEMENT**

**IV ACCESS INFORMATION:**
- Type: [Peripheral IV/PICC line/Central line/Midline/Port/Other]
- Location: [Specific anatomical location]
- Insertion date: [Date]
- [Lumen: Single/Double/Triple]
- [Size: Gauge/French]
- Inserted by: [Facility/Provider]

**IV SITE ASSESSMENT:**

**Insertion Site:**
- Appearance: [Clean and dry/Redness/Drainage/Other]
- Dressing: [Intact/Loose/Soiled]
- Dressing type: [Transparent film/Gauze]
- Last dressing change: [Date]

**Signs of Complications:**
- Redness: [None/Present - measure diameter: ___cm from insertion site]
- Warmth: [None/Present]
- Edema: [None/Present - location: ___]
- Drainage: [None/Serous/Purulent]
- Tenderness: [None/Mild/Moderate/Severe]
- Streaking: [None/Present - describe]
- Catheter migration: [None/Visible length increased]

**Infection Assessment:**
- Temperature: [___°F]
- Chills: [Yes/No]
- Malaise: [Yes/No]
- [Suspected line infection - physician notified, blood cultures ordered]

**Phlebitis Scale (0-4):**
[0: No symptoms / 1: Erythema with or without pain / 2: Erythema + pain ± edema / 3: Erythema + pain + edema + palpable cord / 4: All of above + purulent drainage]
**Score: [___]**

**Functionality:**
- Flushes easily: [Yes/No]
- Blood return: [Brisk/Sluggish/None]
- Infusion flows without resistance: [Yes/No]
- [Difficulty: Describe issue and troubleshooting performed]

**IV THERAPY:**

**Current Medication/Infusion:**
- Medication: [Name]
- Dose: [___]
- Frequency: [Times per day]
- Route: [IV push/IV piggyback/Continuous infusion]
- Infusion time: [Duration]
- Diluent: [Normal saline/D5W/Other - volume]

**Administration During Visit:**
- Medication prepared: [Using aseptic technique, checked 5 rights]
- Pre-administration assessment: [Vital signs, allergies reviewed]
- Infusion started: [Time]
- Infusion rate: [mL/hour or gravity flow]
- Patient monitored during infusion
- Infusion completed: [Time]
- Total time: [___ minutes]

**Patient Tolerance:**
- No adverse reactions observed
- [Adverse reaction noted: Describe reaction, interventions, physician notification]
- Vital signs post-infusion: [BP, HR, Temp]
- Patient reports: [Feeling well/Concerns - describe]

**FLUSH PROTOCOL:**
- Pre-flush: [Normal saline ___ mL]
- Post-medication flush: [Normal saline ___ mL]
- [Heparin lock: ___ units in ___ mL]
- Flush technique: [Pulsatile/Continuous]
- Positive pressure maintained: [Yes]

**CATHETER CARE:**

**Dressing Change Performed:**
[If due - typically every 7 days for transparent dressing, every 2 days for gauze, or PRN if loose/soiled/compromised]

Procedure:
- Hand hygiene performed
- Sterile gloves donned
- Old dressing removed
- Site assessed (documented above)
- Site cleansed with: [Chlorhexidine/Alcohol/Betadine]
- [Antimicrobial patch applied if ordered]
- [Stabilization device checked/replaced]
- New [transparent/gauze] dressing applied
- Dressing labeled with date, time, initials
- Next dressing change due: [Date]

**Catheter Securement:**
- [Engineered stabilization device in place and functioning]
- [No tape on skin]
- [No excessive catheter movement]

**SITE ROTATION (Peripheral IV):**
- [Days in place: ___]
- [Recommended change: Every 72-96 hours or per agency policy]
- [IV functioning well, no signs of phlebitis, will continue to monitor]

**SUPPLIES:**
- Adequate supply of medications: [Yes/No]
- Next delivery scheduled: [Date]
- Adequate supply of dressing supplies: [Yes/No]
- [Additional supplies needed: ___]

**PATIENT/CAREGIVER EDUCATION:**

**Reviewed/Taught:**
✓ Purpose of IV therapy
✓ Signs of infection at IV site
✓ Signs of systemic infection
✓ Signs of line occlusion
✓ Catheter care and protection
✓ Activity restrictions to protect catheter
✓ Shower/bathing precautions
✓ Emergency procedures
✓ When to call nurse/physician
✓ [Flushing technique if patient/caregiver will perform]

**Red Flags to Report:**
- Fever >100.4°F
- Redness or swelling at site
- Drainage from site
- Pain at site
- Inability to flush line
- Line pulled out partially
- Any concerns

**PATIENT PARTICIPATION:**
- [Patient/caregiver demonstrates understanding]
- [Patient able to perform daily site inspection]
- [Patient verbalizes signs/symptoms to report]

**SAFETY:**
- Sharps container in home: [Yes/No - provided]
- Proper sharps disposal reviewed
- Biohazard waste disposal reviewed
- Hand hygiene reinforced
- [Catheter clamp accessible]

**LAB MONITORING:**
- [Labs due: Date, type]
- [Recent lab results reviewed: Date, values]
- [Therapeutic drug monitoring if applicable]

**PHYSICIAN COMMUNICATION:**
- Dr. [Name] aware of IV therapy
- Orders current and followed
- [Updates provided regarding: ___]
- [New orders received: ___]

**PLAN:**
- Continue current IV medication regimen
- [Schedule: Days per week, times per day]
- Next IV therapy visit: [Date, time]
- Dressing change due: [Date]
- [Lab work scheduled: Date]
- [Anticipated completion of IV therapy: Date]
- [Plan for line removal when therapy complete]

**DOCUMENTATION OF THERAPY:**
- Medication administration documented on MAR
- Site assessment documented
- [Catheter care documented]
- Patient/caregiver education documented
- [Any issues reported to physician]

Patient tolerates IV therapy without complications. Patient/caregiver verbalizes understanding of care and safety precautions. No concerns at this time.`
    },
    {
      id: 10,
      name: "CHF Exacerbation",
      category: "Disease-Specific",
      icon: HeartPulse,
      color: "text-red-600",
      bgColor: "bg-red-50",
      template: `**CONGESTIVE HEART FAILURE EXACERBATION ASSESSMENT**

**PRESENTING SYMPTOMS:**
- Dyspnea: [At rest/With exertion/Orthopnea/PND]
- Worsening: [Sudden/Gradual over ___ days]
- Cough: [Yes/No - productive/nonproductive]
- Fatigue: [Mild/Moderate/Severe/Debilitating]
- Edema: [New/Worsening/Location]

**VITAL SIGNS:**
- Blood Pressure: [___]/[___] mmHg (Baseline: [___]/[___])
- Heart Rate: [___] bpm, [Regular/Irregular] (Baseline: [___])
- Respiratory Rate: [___] /min (Baseline: [___])
- Oxygen Saturation: [___]% on [Room air/O2 at ___ L] (Baseline: [___]%)
- Temperature: [___]°F
- **Weight: [___] lbs (Baseline/Dry weight: [___] lbs)**
- **Weight change: [Gained/Lost] [___] lbs since [last visit date/this week]**

**CARDIOVASCULAR ASSESSMENT:**

**Heart:**
- Heart sounds: [S1 S2 regular / S3 present / S4 present / Murmur]
- Irregular rhythm: [Yes/No]
- JVD (Jugular Venous Distention): [Present/Absent - measured at [___] cm at 45 degrees]
- Chest pain: [None/Present - describe]
- Palpitations: [Yes/No]

**Peripheral Pulses:**
- Radial: [2+/1+/Absent] bilaterally
- Pedal: [2+/1+/Doppler only/Absent] bilaterally
- Quality: [Strong/Weak/Thready]

**Edema Assessment:**
- Location: [Bilateral lower extremities/Ankles/Feet/Legs/Sacral/Hands/Facial]
- Grade: [1+/2+/3+/4+]
- Pitting: [Yes/No]
- Extent: [To ankles/To mid-calf/To knees/To thighs]
- Comparison to previous: [Improved/Stable/Worsened]
- Measurement: [Right ankle circumference: ___cm, Left ankle circumference: ___cm]

**RESPIRATORY ASSESSMENT:**
- Lung sounds: [Clear/Crackles/Wheezes/Diminished]
- [Crackles location: Bilateral bases/Posterior/Anterior - extent: Lower 1/3, 1/2, 2/3, All fields]
- Respiratory effort: [Unlabored/Labored/Use of accessory muscles]
- Cough: [None/Dry/Productive]
- Sputum: [None/White/Pink-tinged/Frothy]
- Dyspnea: [None/Mild with exertion/Moderate/Severe at rest]
- Orthopnea: [No/Yes - number of pillows: ___]
- PND (Paroxysmal Nocturnal Dyspnea): [Yes/No - frequency]
- Oxygen: [Room air/O2 at ___ L via nasal cannula/Other]

**FUNCTIONAL STATUS:**
- NYHA Class: [I/II/III/IV]
- Activity tolerance: [Normal/Decreased - describe limitations]
- [Able to walk ___ feet before SOB]
- [Unable to climb stairs / Can climb ___ stairs]
- ADLs: [Independent/Requires assistance with: ___]
- [Bedbound/Chair-bound/Ambulatory with assistance]

**VOLUME STATUS ASSESSMENT:**
- Intake: [Increased/Normal/Decreased]
- [24-hour fluid intake: ___ mL]
- Output: [Normal/Decreased - last void [time]]
- [24-hour urine output: ___ mL]
- Daily weights: [Patient performing/Not performing]
- [Weight log reviewed: Pattern noted]

**GASTROINTESTINAL:**
- Appetite: [Good/Fair/Poor/None]
- Nausea: [Yes/No]
- Abdominal distention: [Yes/No]
- Ascites: [Present/Absent - if present, describe]
- Bowel sounds: [Present/Diminished/Absent]
- Hepatomegaly: [Present/Absent]
- Right upper quadrant tenderness: [Yes/No]

**COMPLIANCE ASSESSMENT:**

**Medications:**
- Taking medications as prescribed: [Yes/No]
- [Missing doses of: ___]
- Last dose of diuretic: [Time]
- [Ran out of medications: Yes/No - which: ___]

**Diet:**
- Following low-sodium diet: [Yes/No]
- [Recent dietary indiscretions: ___]
- [Typical daily sodium intake estimated: ___ mg]
- Salt intake: [None added/Occasional/Liberal use]

**Fluid Restriction:**
- Ordered fluid restriction: [___ mL per day]
- Compliance: [Good/Poor]
- [Exceeds fluid limit regularly]

**Daily Weights:**
- Performs daily weights: [Yes/No]
- [Knows to call if weight gain >2-3 lbs in one day or >5 lbs in one week]

**PRECIPITATING FACTORS IDENTIFIED:**
- [Non-compliance with medications]
- [Non-compliance with diet - recent salty meal]
- [Non-compliance with fluid restriction]
- [Recent illness/infection]
- [Uncontrolled hypertension]
- [Arrhythmia]
- [Medication changes]
- [Increased stress]
- [Other: ___]

**INTERVENTIONS:**

**Immediate:**
- [Patient seated upright for breathing comfort]
- [Oxygen applied at ___ L via nasal cannula - O2 sat improved to [___]%]
- [Extra dose of diuretic administered per standing PRN order]

**Physician Notification:**
- Dr. [Name] called at [time]
- Findings reported: [Increased weight, worsening edema, crackles, dyspnea, other]
- Orders received:
  * [Increase furosemide to ___ mg ___ times daily]
  * [Add metolazone ___ mg daily]
  * [Restrict fluids to ___ mL daily]
  * [Restrict sodium to ___ mg daily]
  * [Lab work: BMP, BNP ordered for [date]]
  * [Chest X-ray ordered]
  * [Increase visit frequency to daily monitoring]
  * [Other: ___]

**UPDATED MEDICATION REGIMEN:**
- Furosemide (Lasix): [___ mg, ___ times daily]
- [ACE-I or ARB]: [Drug, dose]
- [Beta-blocker]: [Drug, dose]
- [Aldosterone antagonist]: [Spironolactone/Eplerenone, dose]
- [Digoxin]: [Dose if applicable]
- [Other cardiac medications]

**PATIENT/CAREGIVER EDUCATION:**

**Disease Process:**
✓ CHF exacerbation explained
✓ Fluid overload concept reviewed
✓ Importance of daily weights
✓ Signs of worsening CHF

**Medications:**
✓ New medication regimen reviewed in detail
✓ Importance of diuretic compliance
✓ Expected increase in urination
✓ [Take morning dose early to avoid nighttime bathroom trips]

**Diet:**
✓ Low-sodium diet reinforced: <2000 mg daily
✓ [Provided list of high-sodium foods to avoid]
✓ [Reading food labels demonstrated]
✓ [Restaurant eating precautions]

**Fluid Restriction:**
✓ Fluid limit: [___ mL/day] explained
✓ [Techniques to manage thirst: ice chips, sour candy, mouth rinse]
✓ [Measuring cup provided]

**Daily Weights:**
✓ Importance of daily weights reinforced
✓ [Weigh at same time each day, same scale, similar clothing]
✓ [Keep weight log]
✓ **Call physician if weight gain >2 lbs in 1 day or >5 lbs in 1 week**

**Warning Signs:**
✓ When to call physician immediately:
  - Rapid weight gain
  - Increased shortness of breath
  - Worsening swelling
  - Chest pain
  - Irregular heartbeat
  - Persistent cough
  - Extreme fatigue
  - Confusion

✓ When to call 911:
  - Severe difficulty breathing
  - Chest pain
  - Pink frothy sputum
  - Confusion/altered mental status

**Activity:**
✓ Balance rest and activity
✓ [Avoid straining]
✓ Elevate legs when sitting
✓ Sleep with head elevated

**MONITORING PLAN:**
- Daily visits for next [3-5] days to monitor:
  * Weight
  * Edema
  * Lung sounds
  * Vital signs
  * Response to medication changes
- [Lab work [date] to check: Electrolytes, renal function, BNP]
- Follow-up with cardiologist: [Date] (appointment scheduled/patient to schedule)
- [Home health aide increased to daily for assistance with ADLs]

**PROGNOSIS/RESPONSE:**
- Condition: [Acute exacerbation requiring close monitoring]
- Expected response to treatment: [Should improve within 3-5 days with diuresis and compliance]
- [If no improvement, may require hospitalization]

Patient/caregiver verbalizes understanding of CHF exacerbation, modified treatment plan, dietary/fluid restrictions, and when to seek emergency care. Will monitor closely and communicate with physician daily regarding progress.`
    },
    {
      id: 11,
      name: "Stroke Assessment",
      category: "Neurological",
      icon: Brain,
      color: "text-navy-600",
      bgColor: "bg-navy-50",
      template: `**POST-STROKE NEUROLOGICAL ASSESSMENT**

**STROKE HISTORY:**
- Type: [Ischemic/Hemorrhagic/TIA]
- Date of stroke: [Date]
- Location: [Left/Right hemisphere, specific area if known]
- Treatment received: [tPA/Thrombectomy/Conservative/Other]
- Days since stroke: [___]

**NEUROLOGICAL ASSESSMENT:**

**Mental Status:**
- Level of consciousness: [Alert/Lethargic/Obtunded/Stuporous]
- Orientation: [Person: Y/N, Place: Y/N, Time: Y/N] = [x3/x2/x1/x0]
- Attention/concentration: [Intact/Impaired]
- Memory: [Intact/Short-term impaired/Long-term impaired]
- Judgment/insight: [Intact/Impaired]
- [Cognitive impairment noted: Describe]

**Speech/Language:**
- Speech: [Clear/Slurred/Aphasia/Dysarthria]
- Expressive language: [Intact/Impaired - describe]
- Receptive language: [Intact/Impaired - describe]
- Ability to follow commands: [Simple commands/Multi-step commands/Unable]
- Naming objects: [Intact/Impaired]
- [Referral to speech therapy: Made/Ongoing/Declined]

**Cranial Nerves:**
- CN II (Vision): [Intact/Visual field cut - describe]
- CN III, IV, VI (Eye movement): [EOMI/Limited - describe]
- CN VII (Facial): [Symmetrical/Facial droop - right/left side]
- CN IX, X (Swallow): [Intact/Impaired - aspiration risk]
- CN XII (Tongue): [Midline/Deviates to right/left]

**Motor Function:**

**Right Upper Extremity:**
- Shoulder: [5/5, 4/5, 3/5, 2/5, 1/5, 0/5]
- Elbow: [5/5, 4/5, 3/5, 2/5, 1/5, 0/5]
- Wrist: [5/5, 4/5, 3/5, 2/5, 1/5, 0/5]
- Hand grip: [5/5, 4/5, 3/5, 2/5, 1/5, 0/5]
- [Pronator drift: Present/Absent]

**Left Upper Extremity:**
- Shoulder: [5/5, 4/5, 3/5, 2/5, 1/5, 0/5]
- Elbow: [5/5, 4/5, 3/5, 2/5, 1/5, 0/5]
- Wrist: [5/5, 4/5, 3/5, 2/5, 1/5, 0/5]
- Hand grip: [5/5, 4/5, 3/5, 2/5, 1/5, 0/5]
- [Pronator drift: Present/Absent]

**Right Lower Extremity:**
- Hip: [5/5, 4/5, 3/5, 2/5, 1/5, 0/5]
- Knee: [5/5, 4/5, 3/5, 2/5, 1/5, 0/5]
- Ankle: [5/5, 4/5, 3/5, 2/5, 1/5, 0/5]

**Left Lower Extremity:**
- Hip: [5/5, 4/5, 3/5, 2/5, 1/5, 0/5]
- Knee: [5/5, 4/5, 3/5, 2/5, 1/5, 0/5]
- Ankle: [5/5, 4/5, 3/5, 2/5, 1/5, 0/5]

**Muscle Tone:**
- [Normal/Increased (spasticity)/Decreased (flaccidity)]
- Location: [Right/Left side, specific extremities]
- [Clonus: Present/Absent]

**Coordination:**
- Finger-to-nose: [Intact/Impaired - right/left]
- Rapid alternating movements: [Intact/Impaired]
- Heel-to-shin: [Intact/Impaired - right/left]

**Sensory Function:**
- Light touch: [Intact/Diminished/Absent - location: ___]
- Pain/temperature: [Intact/Diminished/Absent - location: ___]
- Proprioception: [Intact/Impaired]
- [Neglect: Present/Absent - right/left sided]

**Reflexes:**
- Deep tendon reflexes: [Normal/Hyperreflexive/Hyporeflexive]
- [Babinski: Negative/Positive - right/left]

**FUNCTIONAL ASSESSMENT:**

**Mobility:**
- Bed mobility: [Independent/Requires assistance/Unable]
- Transfers: [Independent/Requires assistance of 1/2/Unable]
- Ambulation: [Independent/With device/With assistance/Non-ambulatory]
- [Assistive device: None/Cane/Walker/Wheelchair]
- [Gait: Normal/Hemiplegic/Ataxic/Unsafe]
- Distance ambulated: [___ feet with/without assistance]
- Endurance: [Good/Fair/Poor]

**Balance:**
- Sitting balance: [Good/Fair/Poor/Unable to sit unsupported]
- Standing balance: [Good/Fair/Poor/Unable to stand]
- [Romberg: Negative/Positive]
- Fall risk: [Low/Moderate/High]

**ADLs:**
- Bathing: [Independent/Requires assistance/Dependent]
- Dressing: [Independent/Requires assistance/Dependent]
- Toileting: [Independent/Requires assistance/Dependent]
- Feeding: [Independent/Requires assistance/Dependent]
- Grooming: [Independent/Requires assistance/Dependent]
- [Adaptive equipment in use: ___]

**Swallowing:**
- Swallow function: [Intact/Impaired]
- Diet: [Regular/Mechanical soft/Pureed/Thickened liquids/NPO]
- [Aspiration risk: Low/Moderate/High]
- [Pocketing food: Yes/No]
- [Coughing with eating/drinking: Yes/No]

**Bladder/Bowel:**
- Bladder control: [Continent/Incontinent/Foley catheter]
- Bowel control: [Continent/Incontinent]
- [Bladder training program in place]
- [Bowel regimen: ___]

**SAFETY ASSESSMENT:**
- Awareness of deficits: [Good/Limited/Unaware]
- Judgment: [Intact/Impaired]
- Impulsivity: [None/Present]
- [Attempts unsafe transfers]
- [Forgets limitations]
- Fall risk: [Low/Moderate/High]
- Seizure history: [None/Yes - last seizure: ___]

**VITAL SIGNS:**
- Blood Pressure: [___]/[___] mmHg (Target: <140/90 or per MD)
- Heart Rate: [___] bpm, [Regular/Irregular]
- Respiratory Rate: [___]
- Temperature: [___]°F
- Oxygen Saturation: [___]% on [Room air/O2]

**MEDICATIONS:**
**Current Stroke Prevention Regimen:**
- Antiplatelet: [Aspirin/Plavix/Both - doses]
- [Anticoagulant: Warfarin/Eliquis/Xarelto - dose, indication]
- Antihypertensive: [List all with doses]
- Statin: [Drug, dose]
- [Diabetic medications if applicable]
- [Other: ___]

**Compliance:** [Compliant/Missed doses/Non-compliant]

**STROKE RECOVERY/PROGRESS:**
- Progress since last visit: [Improved/Stable/Declined]
- [Specific improvements noted: ___]
- [New deficits: ___]
- Rehabilitation participation: [Good/Fair/Poor]

**THERAPY SERVICES:**
- Physical Therapy: [Active/___ x week / Declined / Discharged]
- Occupational Therapy: [Active/___ x week / Declined / Discharged]
- Speech Therapy: [Active/___ x week / Declined / Discharged]

**CAREGIVER ASSESSMENT:**
- Primary caregiver: [Name, relationship]
- Caregiver understanding: [Good/Fair/Poor]
- Caregiver ability: [Adequate/Overwhelmed/Requires additional support]
- [Caregiver training needs: ___]

**RISK FACTORS:**
- Hypertension: [Controlled/Uncontrolled]
- Diabetes: [Controlled/Uncontrolled]
- Hyperlipidemia: [Controlled/Uncontrolled]
- Atrial fibrillation: [Yes/No - anticoagulated]
- Smoking: [Never/Former - quit date/Current]
- [Carotid stenosis: Yes/No]
- [Sleep apnea: Yes/No - CPAP compliant]

**PATIENT/CAREGIVER EDUCATION:**

**Stroke Warning Signs (FAST):**
✓ F - Face drooping
✓ A - Arm weakness
✓ S - Speech difficulty
✓ T - Time to call 911

**Secondary Stroke Prevention:**
✓ Medication compliance critical
✓ Blood pressure control
✓ [Blood glucose control if diabetic]
✓ [Anticoagulation compliance and monitoring]
✓ Smoking cessation if applicable
✓ [Diet: Low sodium, heart healthy]
✓ Regular follow-up with physician

**Safety:**
✓ Fall prevention strategies
✓ Bathroom safety equipment
✓ Assistive device use
✓ [Seizure precautions if applicable]
✓ No driving until cleared by physician

**Rehabilitation:**
✓ Importance of therapy participation
✓ [Home exercise program reviewed]
✓ Realistic expectations for recovery
✓ [Adaptive equipment use]

**PLAN:**
- Continue current medication regimen
- Monitor neurological status for changes
- [PT/OT/ST continuing ___ x week]
- Blood pressure monitoring [frequency]
- [INR check [date] if on warfarin]
- Follow-up with neurologist: [Date]
- Next home health visit: [Date]
- [Referral to support group/stroke resources]

**EMERGENCY INSTRUCTIONS:**
- Call 911 immediately if:
  * New onset of weakness
  * Facial drooping
  * Slurred speech
  * Severe headache
  * Vision changes
  * Confusion
  * Loss of balance/coordination

Patient/caregiver verbalizes understanding of stroke recovery process, medication regimen, warning signs of recurrent stroke, and when to seek emergency care.`
    },
    {
      id: 12,
      name: "Hospital Follow-Up Call",
      category: "Communication",
      icon: Phone,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      template: `**POST-VISIT FOLLOW-UP PHONE CALL**

**CALL INFORMATION:**
- Date: [Date]
- Time: [Time]
- Reason for call: [Routine follow-up/Medication change/Lab results/Symptom check/Other]
- Person contacted: [Patient/Caregiver name and relationship]
- Call duration: [___ minutes]

**PURPOSE:**
[Check on recovery from hospitalization / Monitor response to medication change / Review lab results / Assess pain management / Follow up on new diagnosis / Check on wound healing / Other]

**PATIENT STATUS:**

**General Condition:**
- Patient reports feeling: [Better/Same/Worse than last visit]
- [Specific improvements noted: ___]
- [New concerns since last visit: ___]

**Symptom Assessment:**
[Based on relevant condition - examples below]

**Pain (if applicable):**
- Current pain level: [0-10]/10
- Location: [___]
- Pain control: [Adequate/Inadequate]
- Last pain medication: [Time, medication]
- Breakthrough pain: [Yes/No - frequency]

**Wound (if applicable):**
- Patient/caregiver performed dressing change: [Yes/No/Requires assistance]
- Drainage: [None/Minimal/Moderate/Excessive]
- Signs of infection: [None/Redness/Warmth/Odor/Drainage]
- Pain at wound site: [None/Mild/Moderate/Severe]

**Vital Signs (if patient monitoring):**
- Blood pressure: [___]/[___] mmHg
- Temperature: [___]°F (if checking)
- Weight: [___] lbs (if daily weights ordered)
- [O2 saturation: [___]% if home monitor]

**MEDICATION COMPLIANCE:**
- Taking medications as prescribed: [Yes/No]
- [Issues identified: Missed doses/Ran out/Side effects/Other]
- [Specific medications not taking: ___]
- Understanding of medication regimen: [Good/Needs reinforcement]
- [Pharmacy refills needed: Yes/No - which medications]

**MEDICATION SIDE EFFECTS:**
- Experiencing any side effects: [Yes/No]
- [If yes, describe: ___]
- [Tolerating new medication well/poorly]
- [Side effects affecting compliance]

**ACTIVITY/FUNCTION:**
- Activity level: [Increased/Same/Decreased since discharge]
- Following activity restrictions: [Yes/No]
- [Able to perform ADLs: Independently/With assistance]
- Fatigue: [Minimal/Moderate/Severe]
- [Using assistive device as recommended: Yes/No]

**DIET/NUTRITION:**
- Appetite: [Good/Fair/Poor]
- Following dietary restrictions: [Yes/No]
- [Issues: Nausea/Difficulty swallowing/Other]
- Fluid intake: [Adequate/Inadequate]
- [Special diet compliance: Low sodium/Diabetic/Other]

**THERAPY SERVICES (if applicable):**
- [PT/OT/ST appointments: Keeping/Missing]
- [Progress with therapy: Good/Fair/Poor]
- [Home exercise program: Compliant/Not performing]

**FOLLOW-UP APPOINTMENTS:**
- Physician appointment scheduled: [Yes/No - date, time]
- [If not scheduled, reason: ___]
- [Reminded patient to schedule]
- Other appointments: [List - specialist, lab work, imaging]

**PATIENT/CAREGIVER CONCERNS:**
- Questions or concerns expressed: [Yes/No]
- [If yes, describe and response: ___]
- Understanding of care plan: [Good/Fair/Poor]
- [Barriers to care identified: ___]

**EDUCATION REINFORCED:**
✓ [Medication regimen reviewed]
✓ [Warning signs reviewed]
✓ [Activity restrictions reinforced]
✓ [When to call physician]
✓ [When to call 911]
✓ [Other specific education: ___]

**INTERVENTIONS:**
- [Advised patient to: ___]
- [Patient instructed to call physician regarding: ___]
- [Scheduled additional home visit for: ___]
- [Medication clarification provided]
- [Questions answered]

**PHYSICIAN NOTIFICATION (if needed):**
- Dr. [Name] contacted at [time] regarding: [___]
- [Orders received: ___]
- [No notification needed at this time]

**ASSESSMENT:**
- Patient [progressing well/having difficulty/other]
- [Compliant/Non-compliant with treatment plan]
- [At risk for: ___]
- [Needs: Additional education/Visit frequency change/Other]

**PLAN:**
- [Continue current plan of care]
- [Next scheduled visit: Date, time]
- [Increase visit frequency to: ___]
- [Patient to call if: ___]
- [Will call back in [timeframe] to check on: ___]
- [Other interventions: ___]

**SAFETY:**
- No immediate safety concerns identified
- [Safety concern: ___ - action taken: ___]
- Emergency contact numbers confirmed with patient/caregiver
- Patient/caregiver knows when to call nurse/physician/911

**CALL OUTCOME:**
- Patient/caregiver [satisfied/concerned/frustrated]
- All questions answered: [Yes/No]
- [Additional support needed: Yes/No - arranged]
- Patient verbalizes understanding: [Yes/No]

Next contact: [Scheduled visit on [date] / Follow-up call on [date] / Patient to call if needed]

**Documentation:** Phone call documented in patient record. [Patient file updated with any new information or changes to plan of care.]`
    }
];
import {
  Activity,
  AlertTriangle,
  Pill,
  ThermometerSun,
  UserMinus,
  UserPlus,
} from "lucide-react";

/**
 * Quick-insert clinical documentation templates, part 1 (ids 1–6).
 * Split out of quickTemplates.js to keep each data module focused and under the
 * file-size limit. Combined back together by quickTemplates.js — do not import
 * this directly from UI; import { quickTemplates } from "./quickTemplates".
 */
export const quickTemplatesPart1 = [
    {
      id: 1,
      name: "Fall Without Injury",
      category: "Safety Incidents",
      icon: AlertTriangle,
      color: "text-red-600",
      bgColor: "bg-red-50",
      template: `**FALL INCIDENT DOCUMENTATION**

Date/Time of Fall: [Insert date/time]
Location: [Patient's home - specify room]
Witnessed: [Yes/No]

**INCIDENT DESCRIPTION:**
Patient experienced unwitnessed fall in [location]. Patient states [patient's description of event]. No loss of consciousness reported. Patient was able to get up [with/without assistance].

**POST-FALL ASSESSMENT:**
- Neurological: Alert and oriented x3, PERRLA, no headache, no vision changes, no dizziness
- Cardiovascular: Heart rate regular, blood pressure [BP], no chest pain
- Musculoskeletal: Full range of motion all extremities, no obvious deformity, no swelling, no bruising noted
- Skin: Intact, no lacerations or abrasions
- Pain: Patient denies pain or rates pain [0-10]/10 in [location]

**VITAL SIGNS POST-FALL:**
[Insert current vital signs]

**INTERVENTIONS:**
- Complete neurological assessment performed
- Monitored for 15 minutes post-fall
- Reinforced fall prevention education
- [Physician notified at [time] - no new orders/orders received: ___]
- Environmental safety assessment completed
- [Additional interventions as appropriate]

**FALL RISK FACTORS IDENTIFIED:**
- [Environmental hazards: poor lighting, throw rugs, clutter]
- [Mobility issues: unsteady gait, use of assistive device]
- [Medications: sedatives, antihypertensives, diuretics]
- [Medical conditions: orthostatic hypotension, weakness]

**PLAN:**
- Continue to monitor for delayed symptoms
- Fall prevention strategies reviewed with patient/caregiver
- [Equipment recommendations: grab bars, night light, walker]
- Patient/caregiver instructed to call 911 or seek immediate care if: severe headache, vision changes, confusion, weakness, or uncontrolled pain develops
- Next visit scheduled for [date] for reassessment

Patient/caregiver verbalizes understanding of fall prevention strategies and signs/symptoms requiring immediate attention.`
    },
    {
      id: 2,
      name: "Infection Suspected",
      category: "Clinical Changes",
      icon: ThermometerSun,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      template: `**SUSPECTED INFECTION ASSESSMENT**

**PRESENTING SIGNS/SYMPTOMS:**
- Temperature: [Insert temp] (Baseline: [___])
- [Fever/Chills: Yes/No]
- [Increased pain at surgical/wound site]
- [Purulent drainage]
- [Increased redness/warmth]
- [Foul odor]
- [Change in mental status]
- [Other: ___]

**FOCUSED ASSESSMENT:**
Source of Infection Suspected: [Wound/UTI/Respiratory/IV site/Other]

**WOUND ASSESSMENT (if applicable):**
- Location: [___]
- Size: [L x W x D in cm]
- Drainage: Type [serous/serosanguineous/purulent], Amount [scant/moderate/large], Color [___], Odor [yes/no - describe]
- Wound bed: [% granulation/% slough/% eschar]
- Periwound: [Color, temperature, edema, induration]
- Pain: [0-10]/10

**RESPIRATORY ASSESSMENT (if applicable):**
- Lung sounds: [Clear/Crackles/Wheezes/Diminished - location]
- Cough: [Yes/No - productive/nonproductive]
- Sputum: [Color, consistency]
- Respiratory rate: [___], effort [normal/labored]
- Oxygen saturation: [___]% on [room air/O2 at ___ L]

**URINARY ASSESSMENT (if applicable):**
- Urine appearance: [Clear/Cloudy/Blood-tinged]
- Odor: [Normal/Foul]
- Frequency: [Increased/Normal]
- Dysuria: [Yes/No]
- Urgency: [Yes/No]
- Incontinence: [New onset/Chronic/None]

**SYSTEMIC SYMPTOMS:**
- Vital Signs: [Full set]
- Mental Status: [Alert/Confused/Lethargic]
- Appetite: [Normal/Decreased]
- Fatigue: [Yes/No]
- Generalized weakness: [Yes/No]

**ACTIONS TAKEN:**
- Physician Dr. [Name] notified at [time] regarding above findings
- Orders received: [Lab work/Urinalysis/Wound culture/Chest X-ray/Antibiotic started/Other]
- [Antibiotic: Drug name, dose, frequency, route, start date]
- Follow-up labs scheduled for [date]
- Patient/caregiver educated on signs of worsening infection requiring immediate attention

**PATIENT/CAREGIVER EDUCATION:**
- Reviewed signs of worsening infection
- Instructed to monitor temperature and maintain log
- Medication compliance reinforced
- When to call physician: temp >101°F, increased confusion, difficulty breathing, worsening symptoms
- When to call 911: Difficulty breathing, chest pain, unresponsiveness

Patient/caregiver verbalizes understanding. Will reassess in [timeframe].`
    },
    {
      id: 3,
      name: "Medication Change",
      category: "Medications",
      icon: Pill,
      color: "text-navy-600",
      bgColor: "bg-navy-50",
      template: `**MEDICATION CHANGE DOCUMENTATION**

**MEDICATION RECONCILIATION PERFORMED:**
Date: [Current date]

**MEDICATION CHANGES SINCE LAST VISIT:**

**MEDICATION DISCONTINUED:**
- Drug: [Name]
- Previous Dose: [Dose/Frequency/Route]
- Reason for Discontinuation: [Adverse effect/No longer needed/Physician order/Other]
- Discontinued Date: [Date]
- Ordering Physician: Dr. [Name]

**NEW MEDICATION STARTED:**
- Drug: [Name]
- Dose: [Dose/Frequency/Route]
- Indication: [Why prescribed]
- Start Date: [Date]
- Ordering Physician: Dr. [Name]
- Pharmacy: [Name/Phone]

**MEDICATION DOSE CHANGE:**
- Drug: [Name]
- Previous Dose: [___]
- New Dose: [___]
- Reason for Change: [___]
- Change Date: [Date]
- Ordering Physician: Dr. [Name]

**MEDICATION REVIEW WITH PATIENT:**
✓ Current medication list reviewed in detail
✓ Patient able to identify all medications by name and purpose
✓ Proper administration technique reviewed/demonstrated
✓ Storage requirements discussed (if applicable)
✓ Potential side effects reviewed
✓ Drug-drug interactions reviewed
✓ Drug-food interactions discussed (if applicable)

**PATIENT'S UNDERSTANDING OF MEDICATION CHANGES:**
- Patient verbalizes understanding of reason for medication change
- Patient demonstrates proper administration technique
- Patient states correct dose, frequency, and route
- Patient verbalizes understanding of potential side effects
- Patient knows when to notify physician

**MEDICATION COMPLIANCE ASSESSMENT:**
- Compliance: [Compliant/Partially compliant/Non-compliant]
- Barriers identified: [Cost/Side effects/Forgetfulness/Complex regimen/Other]
- Interventions: [Pill organizer provided/Med schedule created/Pharmacy auto-refill arranged]

**MONITORING PLAN:**
- Monitor for therapeutic effect: [Specific parameters]
- Monitor for adverse effects: [Specific signs/symptoms]
- [Lab work ordered for [date] to monitor [specific parameters]]
- Follow-up appointment scheduled with physician for [date]

**PATIENT EDUCATION PROVIDED:**
- Written medication list updated and provided to patient
- Medication schedule reviewed
- When to call physician regarding medications
- Importance of compliance reinforced
- Instructions to bring all medication bottles to next physician visit

**SAFETY:**
- Patient instructed not to take discontinued medication
- [Old medication disposed of properly/Patient instructed to dispose at pharmacy]
- Updated medication list sent to: [Physician/Pharmacy/Other care team members]

Patient/caregiver demonstrates understanding of all medication changes and proper administration.`
    },
    {
      id: 4,
      name: "Pain Crisis Management",
      category: "Symptom Management",
      icon: Activity,
      color: "text-red-600",
      bgColor: "bg-red-50",
      template: `**ACUTE PAIN CRISIS DOCUMENTATION**

**PAIN ASSESSMENT:**
- Location: [Specific location(s)]
- Intensity: [0-10]/10 (Previous visit: [___]/10)
- Quality: [Aching/Burning/Sharp/Stabbing/Shooting/Throbbing/Cramping]
- Onset: [Sudden/Gradual] [Date/Time]
- Duration: [Constant/Intermittent]
- Radiation: [Yes/No - describe pattern]
- Aggravating factors: [Movement/Position/Activity/Other]
- Relieving factors: [Rest/Position/Heat/Cold/Medication]
- Impact on function: [Sleep/Mobility/ADLs/Appetite]

**PAIN SCALE USED:**
[Numeric 0-10 / FACES / FLACC / Verbal descriptor]

**ASSOCIATED SYMPTOMS:**
- Nausea/vomiting: [Yes/No]
- Diaphoresis: [Yes/No]
- Anxiety: [Yes/No - describe]
- Change in vital signs: [Yes/No]
- Other: [___]

**VITAL SIGNS:**
[Insert current vital signs - note any elevation of BP, HR due to pain]

**CURRENT PAIN MANAGEMENT REGIMEN:**
- Medications: [List all pain medications with dose, frequency, last dose taken]
- Last breakthrough medication: [Time taken, dose, effectiveness]
- Non-pharmacological interventions in use: [Heat/Cold/Positioning/Relaxation/Distraction]

**ASSESSMENT OF CURRENT REGIMEN:**
- Pain control: [Adequate/Inadequate]
- Side effects: [None/Constipation/Sedation/Nausea/Other]
- Compliance: [Yes/No - barriers identified]
- Breakthrough pain frequency: [Times per day]

**INTERVENTIONS DURING VISIT:**
1. [Administered breakthrough pain medication: Drug, dose, route, time]
2. [Repositioned patient for comfort]
3. [Applied heat/ice to affected area]
4. [Taught relaxation/deep breathing techniques]
5. [Other comfort measures: ___]

**RESPONSE TO INTERVENTIONS:**
- Pain reassessed 30 minutes post-intervention
- Pain level decreased to [___]/10
- Patient reports [improved comfort/continued pain/other]

**PHYSICIAN NOTIFICATION:**
- Dr. [Name] notified at [time] regarding inadequate pain control
- New orders received:
  * [Increase dose of current medication]
  * [Add new medication: Name, dose, frequency]
  * [Change route of administration]
  * [Order for labs/imaging]
  * [Other: ___]

**PAIN MANAGEMENT PLAN ADJUSTMENT:**
Updated medication regimen:
- [Medication 1: dose, frequency, route]
- [Medication 2: dose, frequency, route]
- [Breakthrough medication: dose, frequency, maximum doses per day]

**PATIENT/CAREGIVER EDUCATION:**
✓ Reviewed modified pain management plan
✓ Importance of taking pain medication on schedule, not waiting until pain is severe
✓ Proper use of breakthrough medication
✓ Pain diary provided to track pain levels and medication effectiveness
✓ Reviewed signs of oversedation/respiratory depression
✓ When to call physician: Uncontrolled pain, new pain, signs of oversedation
✓ When to call 911: Difficulty breathing, chest pain, confusion, unresponsiveness

**NON-PHARMACOLOGICAL STRATEGIES REINFORCED:**
- [Positioning techniques]
- [Heat/cold therapy]
- [Relaxation exercises]
- [Distraction techniques]
- [Activity pacing]

**PLAN:**
- Continue current pain management regimen as modified
- Reassess pain level at next visit
- Patient to maintain pain diary
- Follow-up phone call in [24-48] hours to assess effectiveness
- [Referral to pain management specialist if pain remains uncontrolled]

Patient/caregiver verbalizes understanding of modified pain plan and when to seek additional help.`
    },
    {
      id: 5,
      name: "Admission from Hospital",
      category: "Transitions of Care",
      icon: UserPlus,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      template: `**ADMISSION TO HOME HEALTH - POST-HOSPITALIZATION**

**HOSPITAL DISCHARGE INFORMATION:**
- Hospital: [Name]
- Admission Date: [Date]
- Discharge Date: [Date]
- Length of Stay: [Days]
- Admitting Diagnosis: [___]
- Discharge Diagnosis: [___]
- Procedures/Surgeries: [List all]
- Discharge Physician: Dr. [Name]

**REASON FOR HOME HEALTH SERVICES:**
[Skilled nursing assessment and management / Wound care / Medication management / Patient/caregiver education / Disease management / Post-surgical care / Other]

**START OF CARE ASSESSMENT:**
Date of First Visit: [Date]
Visit Type: Admission/Start of Care

**COMPREHENSIVE SYSTEMS ASSESSMENT:**

**CARDIOVASCULAR:**
- Heart sounds: [Regular/Irregular - describe]
- Peripheral pulses: [Quality and symmetry]
- Capillary refill: [<3 sec / delayed]
- Edema: [Location, grade, pitting/non-pitting]
- Vital Signs: [Full set]

**RESPIRATORY:**
- Lung sounds: [Clear/Adventitious - describe location]
- Respiratory effort: [Unlabored/Labored]
- Cough: [Yes/No - productive/nonproductive]
- Oxygen: [Room air / O2 at ___ L via ___]
- Oxygen saturation: [___]%

**NEUROLOGICAL:**
- Level of consciousness: [Alert/Lethargic/Confused]
- Orientation: [Person/Place/Time - x3/x2/x1/x0]
- Speech: [Clear/Slurred/Aphasic]
- Pupils: [PERRLA / abnormal - describe]
- Motor: [Strength 5/5 all extremities / deficits - describe]
- Sensation: [Intact / deficits - describe]
- Gait: [Steady/Unsteady - describe]
- Fall risk: [Low/Moderate/High]

**GASTROINTESTINAL:**
- Abdomen: [Soft/Distended/Tender]
- Bowel sounds: [Present all quadrants / abnormal]
- Last BM: [Date]
- Bowel pattern: [Normal/Constipation/Diarrhea]
- Appetite: [Good/Fair/Poor]
- Diet: [Current diet order]
- Nausea/vomiting: [Yes/No]

**GENITOURINARY:**
- Voiding: [Normal/Frequency/Urgency/Dysuria/Incontinence]
- Urine appearance: [Clear/Cloudy/Other]
- [Foley catheter in place - insertion date, size, drainage]

**MUSCULOSKELETAL:**
- Mobility: [Independent/Requires assistance/Bedbound]
- Assistive devices: [None/Walker/Cane/Wheelchair]
- Transfers: [Independent/Requires assistance]
- Range of motion: [Full/Limited - describe]
- Pain: [Location, intensity, management]

**INTEGUMENTARY:**
- Skin temperature: [Warm/Cool]
- Skin turgor: [Good/Poor]
- Color: [Pink/Pale/Cyanotic/Jaundiced]
- Condition: [Intact/Breakdown - describe all areas]

**WOUND ASSESSMENT (if applicable):**
- Location: [Surgical incision / pressure injury / other]
- Size: [L x W x D in cm]
- Wound bed: [% granulation / % slough / % eschar]
- Drainage: [Type, amount, color, odor]
- Surrounding skin: [Intact/Red/Edematous/Indurated]
- Sutures/staples: [In place/Removed - date]
- Dressing: [Current type]
- Pain: [___]/10

**MEDICATION RECONCILIATION:**
✓ Complete medication list obtained from hospital discharge paperwork
✓ Medications compared to pre-hospital medication list
✓ Discrepancies identified and clarified with physician
✓ Current medication list includes: [List all medications with dose, frequency, route]
✓ New medications since hospitalization: [List]
✓ Discontinued medications: [List]
✓ Patient has all prescribed medications available
✓ Patient/caregiver can identify all medications and their purpose

**DISCHARGE INSTRUCTIONS RECEIVED:**
✓ Copy of hospital discharge instructions obtained
✓ Follow-up appointments: [Physician, date, time]
✓ Activity restrictions: [___]
✓ Diet orders: [___]
✓ Weight bearing status: [___]
✓ Other: [___]

**DURABLE MEDICAL EQUIPMENT (DME):**
Current DME in home: [Walker/Cane/Wheelchair/Hospital bed/Commode/Shower chair/Other]
DME needs identified: [List any needed equipment]

**HOME SAFETY ASSESSMENT:**
- Environment: [Clean/Cluttered/Unsanitary]
- Lighting: [Adequate/Poor]
- Fall hazards: [None/Present - describe]
- Emergency access: [Adequate/Concerns]
- Smoke detectors: [Present and functional/Absent]
- Safe medication storage: [Yes/No]
- Recommendations: [___]

**PSYCHOSOCIAL ASSESSMENT:**
- Patient/caregiver coping: [Well/Difficulty adjusting/Overwhelmed]
- Support system: [Strong/Limited/Absent]
- Caregiver availability: [24 hours/Daytime only/Intermittent]
- Knowledge of disease process: [Good/Fair/Poor]
- Financial concerns: [None identified/Present - describe]
- Need for social services: [Yes/No - referral made]

**FUNCTIONAL STATUS:**
**ACTIVITIES OF DAILY LIVING (ADLs):**
- Bathing: [Independent/Requires assistance/Dependent]
- Dressing: [Independent/Requires assistance/Dependent]
- Toileting: [Independent/Requires assistance/Dependent]
- Transferring: [Independent/Requires assistance/Dependent]
- Continence: [Continent/Incontinent - bladder/bowel]
- Feeding: [Independent/Requires assistance/Dependent]

**INSTRUMENTAL ACTIVITIES OF DAILY LIVING (IADLs):**
- Meal preparation: [Independent/Requires assistance/Unable]
- Housekeeping: [Independent/Requires assistance/Unable]
- Shopping: [Independent/Requires assistance/Unable]
- Transportation: [Independent/Requires assistance/Unable]
- Medication management: [Independent/Requires assistance/Unable]
- Managing finances: [Independent/Requires assistance/Unable]

**INITIAL PLAN OF CARE:**

**SKILLED NURSING:**
- Frequency: [Times per week for ___ weeks]
- Duration: [Estimated length of service]

**Goals:**
1. [Patient will demonstrate improved understanding of disease process and self-management by discharge]
2. [Patient will achieve adequate pain control with pain level <4/10 within 1 week]
3. [Wound will show signs of healing with decreased drainage within 2 weeks]
4. [Patient/caregiver will demonstrate correct medication administration by week 2]
5. [Patient will remain free from infection as evidenced by absence of fever and stable vital signs]

**Interventions:**
- Comprehensive assessment each visit
- Vital signs monitoring
- [Wound care per physician orders]
- Medication education and compliance monitoring
- Disease process education
- Fall prevention education
- [IV medication administration/management]
- [Foley catheter care]
- Coordination with physician and other team members
- [Other skilled interventions: ___]

**OTHER DISCIPLINES CONSULTED:**
- [PT: For strength, mobility, fall prevention]
- [OT: For ADL training, adaptive equipment]
- [ST: For swallow evaluation, communication]
- [MSW: For psychosocial support, community resources]
- [HHA: For personal care assistance]

**PHYSICIAN COMMUNICATION:**
- Dr. [Name] aware of home health services
- Phone: [Number]
- Next appointment: [Date]
- [Verbal orders obtained/Physician to fax orders]

**PATIENT/CAREGIVER EDUCATION PROVIDED:**
✓ Home health services explained
✓ Visit schedule reviewed
✓ 24-hour on-call number provided: [Number]
✓ Medication regimen reviewed in detail
✓ When to call physician
✓ When to call 911
✓ Disease-specific education: [___]
✓ [Activity restrictions reviewed]
✓ [Wound care instructions]
✓ [Diet instructions]
✓ All questions answered

**PATIENT RIGHTS AND RESPONSIBILITIES:**
✓ Notice of Privacy Practices provided and reviewed
✓ Patient Rights and Responsibilities reviewed
✓ Advance Directives discussed
✓ Complaint/grievance procedure explained
✓ [Copy of advance directive on file / Patient declines to complete at this time / Will provide at next visit]

**CONSENT FOR SERVICES:**
Patient/caregiver consents to home health services and treatment plan as outlined above.

**HOMEBOUND STATUS JUSTIFICATION:**
Patient is homebound due to: [Taxing effort to leave home requiring assistance of another person / Medical contraindication to leaving home / Leaves home infrequently for medical appointments only]. 

Objective evidence: [Severe shortness of breath with minimal exertion / Requires walker and physical assistance to ambulate / Bedbound / Severe pain limiting mobility / Recent hospitalization with ongoing medical instability / Post-surgical status with activity restrictions / Other - describe specific observations].

**MEDICARE ELIGIBILITY:**
Patient meets Medicare criteria for home health services:
✓ Under a physician's plan of care
✓ Homebound
✓ Requires skilled nursing, PT, or ST
✓ Intermittent skilled care needed
✓ Services provided by Medicare-certified agency

Patient/caregiver verbalizes understanding of home health services and plan of care. Next visit scheduled for [date].`
    },
    {
      id: 6,
      name: "Discharge Summary",
      category: "Transitions of Care",
      icon: UserMinus,
      color: "text-green-600",
      bgColor: "bg-green-50",
      template: `**DISCHARGE SUMMARY - HOME HEALTH SERVICES**

**DISCHARGE DATE:** [Date]
**LENGTH OF SERVICE:** [Weeks/Months]
**TOTAL VISITS:** [Number] skilled nursing visits

**ORIGINAL ADMISSION DIAGNOSIS:**
[Primary diagnosis that qualified for home health]

**DISCHARGE DIAGNOSIS:**
[Current diagnosis list]

**REASON FOR DISCHARGE:**
[Goals met / Plateau in progress / Patient no longer homebound / Patient requires higher level of care / Patient hospitalized / Patient deceased / Patient refused services / Other]

**ADMISSION DATE/CONDITION:**
Start of Care Date: [Date]
Initial Assessment: [Brief summary of patient's condition at admission - functional status, key problems, goals]

**PROGRESS TOWARD GOALS:**

**Goal 1:** [Original goal]
Status: [Met / Partially met / Not met]
Evidence: [Specific documentation of progress]

**Goal 2:** [Original goal]
Status: [Met / Partially met / Not met]
Evidence: [Specific documentation of progress]

**Goal 3:** [Original goal]
Status: [Met / Partially met / Not met]
Evidence: [Specific documentation of progress]

[Additional goals as applicable]

**SUMMARY OF SKILLED INTERVENTIONS PROVIDED:**
- Comprehensive assessment and monitoring
- Vital signs monitoring
- [Wound care - describe healing progress]
- Medication management and education
- Disease process education
- [IV therapy management]
- [Catheter care]
- Fall prevention education
- Pain management
- [Other interventions provided]

**CURRENT STATUS AT DISCHARGE:**

**FUNCTIONAL STATUS:**
ADLs: [Summary of independence level]
Mobility: [Independent with/without assistive device / Requires assistance]
Transfers: [Status]
Activity tolerance: [Improved/Stable/Declined]

**CARDIOVASCULAR:**
- Vital Signs: [Last recorded vital signs]
- Blood pressure control: [Well controlled/Stable/Other]
- Heart rate: [Regular/Irregular]
- Edema: [Resolved/Improved/Stable/Worsened]

**RESPIRATORY:**
- Lung sounds: [Clear/Other]
- Oxygen: [Room air/O2 at ___ L]
- Respiratory status: [Improved/Stable/Other]

**NEUROLOGICAL:**
- Mental status: [Alert and oriented x3]
- Cognitive function: [Intact/Impaired]
- Safety awareness: [Good/Fair/Poor]

**WOUND STATUS (if applicable):**
- [Original wound size vs. current size]
- Healing: [Complete/Significant improvement/Minimal improvement]
- Current treatment: [Describe]

**PAIN MANAGEMENT:**
- Pain control: [Adequate with pain <4/10 / Requires ongoing management]
- Current pain regimen: [Medications]
- Non-pharmacological strategies in use: [List]

**MEDICATION MANAGEMENT:**
- Medication compliance: [Compliant/Needs supervision]
- Patient/caregiver understanding: [Good/Fair/Poor]
- Current medications: [List all with dose, frequency, route]
- Medication changes during home health: [Summary of any changes]

**PATIENT/CAREGIVER EDUCATION:**
✓ Disease process and self-management strategies
✓ Medication regimen and compliance
✓ Warning signs of complications
✓ When to call physician
✓ [Wound care techniques]
✓ [Blood glucose monitoring]
✓ [Vital sign monitoring]
✓ Fall prevention strategies
✓ Dietary modifications
✓ Activity recommendations
✓ [Equipment use and maintenance]

**KNOWLEDGE/COMPLIANCE:**
- Patient demonstrates: [Good/Fair/Poor] understanding of disease process
- Patient/caregiver demonstrates: [Independence/Competence with supervision/Requires assistance] with self-care management
- Medication compliance: [Excellent/Good/Fair/Poor]
- Diet compliance: [Excellent/Good/Fair/Poor]
- Activity compliance: [Excellent/Good/Fair/Poor]

**HOME ENVIRONMENT:**
- Safety: [Safe environment maintained]
- DME in place: [List equipment]
- Support system: [Adequate/Limited]
- Caregiver: [Available and capable / Limited availability / Other]

**DISCIPLINES INVOLVED:**
- Skilled Nursing: [Summary]
- [PT: Summary of progress]
- [OT: Summary of progress]
- [ST: Summary of progress]
- [MSW: Summary of interventions]
- [HHA: Summary of services]

**PHYSICIAN INVOLVEMENT:**
- Primary physician: Dr. [Name]
- Communication: [Regular updates provided / Orders obtained as needed]
- Last physician appointment: [Date]

**DISCHARGE INSTRUCTIONS:**

**MEDICATIONS:**
- Continue all current medications as prescribed
- [List all current medications with dose, frequency, and indication]
- Refills arranged through [pharmacy name/phone]
- Follow up with physician if side effects occur

**ACTIVITY:**
- [Activity level recommendations]
- [Continue physical therapy exercises]
- [Use assistive device as needed]
- [Restrictions: ___]

**DIET:**
- [Diet recommendations]
- [Fluid restrictions if applicable]
- [Supplements: ___]

**FOLLOW-UP CARE:**
- Physician appointment: Dr. [Name] on [date] at [time]
- Phone: [Number]
- [Lab work due: Date]
- [Imaging scheduled: Type, date]
- [Specialist appointment: Name, date]

**CONTINUING CARE RECOMMENDATIONS:**
- [Outpatient therapy: PT/OT/ST]
- [Community resources: Senior center, support groups, meals on wheels]
- [Home care aide services]
- [DME follow-up]
- [Other resources]

**EMERGENCY CONTACT:**
- Call physician if: [Fever >100.4°F, increased pain, signs of infection, difficulty breathing, chest pain, new weakness, confusion, any concerns]
- Call 911 if: [Chest pain, difficulty breathing, stroke symptoms, severe bleeding, unresponsiveness]

**HOMEBOUND STATUS AT DISCHARGE:**
[Patient no longer meets homebound criteria - able to leave home without taxing effort / Patient remains homebound but goals met / Other]

**DISCHARGE PLANNING:**
✓ Patient/caregiver verbalizes understanding of continuing care needs
✓ All necessary appointments scheduled
✓ Prescriptions provided
✓ DME in place and functioning
✓ [Community resources arranged]
✓ Emergency contact information provided
✓ Patient/caregiver demonstrates competence with self-care
✓ Questions answered
✓ Patient/caregiver comfortable with discharge

**PROGNOSIS:**
[Good / Fair / Guarded / Poor]

**RECOMMENDATIONS:**
- Continue current medication regimen
- Maintain activity level as tolerated
- [Continue wound care as instructed]
- [Monitor blood glucose as directed]
- [Monitor blood pressure daily and log]
- Follow dietary recommendations
- Attend all follow-up appointments
- Contact physician with any concerns

**DISCHARGE DISPOSITION:**
[Discharged to self-care / Continuing with outpatient services / Transferred to other agency / Other]

**COMMUNICATION:**
Discharge summary sent to:
- Physician: Dr. [Name] Fax: [Number]
- [Other providers as applicable]

Patient/caregiver verbalizes understanding of discharge plan and demonstrates competence with continuing care. Patient encouraged to contact home health agency with any questions. Patient satisfied with services provided.

Discharge Date: [Date]
Discharging Nurse: [Name], RN`
    }
];
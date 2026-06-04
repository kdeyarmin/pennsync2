import {
  Activity,
  AlertTriangle,
  Bandage,
  Brain,
  HeartPulse,
  Phone,
  Pill,
  Syringe,
  ThermometerSun,
  UserMinus,
  UserPlus,
} from "lucide-react";

/**
 * Static library of quick-insert clinical documentation templates surfaced by
 * QuickTemplatesLibrary. Extracted from that component (which had ~1850 lines of
 * inline data) so the catalog can be validated and reused independently of the
 * UI. Each entry: { id, name, category, icon (lucide component), color, bgColor,
 * template (insertable text) }.
 */
export const quickTemplates = [
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
      color: "text-purple-600",
      bgColor: "bg-purple-50",
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
    },
    {
      id: 7,
      name: "Hospice Comfort Assessment",
      category: "Hospice Care",
      icon: HeartPulse,
      color: "text-pink-600",
      bgColor: "bg-pink-50",
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
- Irregular rhythm: [Yes/No - [...]**]
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
      color: "text-purple-600",
      bgColor: "bg-purple-50",
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

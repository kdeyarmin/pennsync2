
import { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertTriangle,
  Ambulance,
  Pill,
  UserX,
  Activity,
  Thermometer,
  Droplet,
  Zap,
  Phone,
  CheckCircle2,
  X,
  Send,
  RefreshCw,
  Mic, // Added for voice command status
  MicOff // Added for voice command status
} from "lucide-react";
import { format } from "date-fns";

export default function QuickIncidentReporting({ patient, visit, onIncidentReported }) {
  const [showDialog, setShowDialog] = useState(false);
  const [selectedIncident, setSelectedIncident] = useState(null);
  const [incidentData, setIncidentData] = useState({});
  const [notifyPhysician, setNotifyPhysician] = useState(true);
  const [notifyOffice, setNotifyOffice] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  // State for voice command feedback
  const [voiceCommandStatus, setVoiceCommandStatus] = useState("idle"); // "idle", "listening", "processing", "error", "not-supported"

  // Ref to hold the SpeechRecognition instance
  const recognitionRef = useRef(null);
  // Ref to track if speech recognition is currently active
  const isListeningRef = useRef(false);

  const incidentTypes = [
    {
      id: 'fall',
      name: 'Patient Fall',
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-300',
      severity: 'high',
      fields: [
        { name: 'witnessed', label: 'Was fall witnessed?', type: 'select', options: ['Yes', 'No'] },
        { name: 'injury', label: 'Any injuries?', type: 'select', options: ['No injury', 'Minor injury', 'Major injury'] },
        { name: 'location', label: 'Where did fall occur?', type: 'text', placeholder: 'e.g., Bathroom, bedroom' },
        { name: 'assistance', label: 'Was patient able to get up?', type: 'select', options: ['With assistance', 'Without assistance', 'Unable'] },
        { name: 'painLevel', label: 'Pain level after fall (0-10)', type: 'number' },
      ]
    },
    {
      id: 'hospitalized',
      name: 'Hospitalization',
      icon: Ambulance,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-300',
      severity: 'high',
      fields: [
        { name: 'admissionDate', label: 'Date admitted', type: 'date' },
        { name: 'hospital', label: 'Hospital name', type: 'text' },
        { name: 'reason', label: 'Reason for admission', type: 'text' },
        { name: 'transport', label: 'How transported?', type: 'select', options: ['Ambulance - 911', 'Ambulance - scheduled', 'Family', 'Other'] },
        { name: 'expectedDischarge', label: 'Expected discharge date', type: 'date' },
      ]
    },
    {
      id: 'medication_error',
      name: 'Medication Error',
      icon: Pill,
      color: 'text-navy-600',
      bgColor: 'bg-navy-50',
      borderColor: 'border-navy-300',
      severity: 'high',
      fields: [
        { name: 'medication', label: 'Medication involved', type: 'text' },
        { name: 'errorType', label: 'Type of error', type: 'select', options: ['Wrong dose', 'Wrong medication', 'Wrong time', 'Omitted dose', 'Wrong route', 'Other'] },
        { name: 'discoveredBy', label: 'Error discovered by', type: 'select', options: ['Nurse', 'Patient', 'Caregiver', 'Physician', 'Other'] },
        { name: 'harmLevel', label: 'Level of harm', type: 'select', options: ['No harm', 'Potential for harm', 'Temporary harm', 'Permanent harm'] },
      ]
    },
    {
      id: 'behavioral_change',
      name: 'Behavioral Change',
      icon: Activity,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-50',
      borderColor: 'border-yellow-300',
      severity: 'medium',
      fields: [
        { name: 'changeType', label: 'Type of change', type: 'select', options: ['Confusion', 'Agitation', 'Aggression', 'Withdrawal', 'Hallucinations', 'Other'] },
        { name: 'onset', label: 'When did it start?', type: 'select', options: ['Sudden', 'Gradual over days', 'Gradual over weeks'] },
        { name: 'severity', label: 'Severity', type: 'select', options: ['Mild', 'Moderate', 'Severe'] },
      ]
    },
    {
      id: 'infection_suspected',
      name: 'Infection Suspected',
      icon: Thermometer,
      color: 'text-red-600',
      bgColor: 'bg-red-50',
      borderColor: 'border-red-300',
      severity: 'high',
      fields: [
        { name: 'temperature', label: 'Temperature (°F)', type: 'number', step: '0.1' },
        { name: 'suspectedSource', label: 'Suspected source', type: 'select', options: ['Wound', 'UTI', 'Respiratory', 'IV site', 'Unknown', 'Other'] },
        { name: 'symptoms', label: 'Symptoms present', type: 'text', placeholder: 'e.g., fever, redness, drainage' },
      ]
    },
    {
      id: 'refusal_of_care',
      name: 'Refusal of Care',
      icon: UserX,
      color: 'text-slate-600',
      bgColor: 'bg-slate-50',
      borderColor: 'border-slate-300',
      severity: 'medium',
      fields: [
        { name: 'whatRefused', label: 'What was refused?', type: 'text', placeholder: 'e.g., vital signs, medication, wound care' },
        { name: 'reasonStated', label: 'Reason stated', type: 'text' },
        { name: 'capacity', label: 'Does patient have capacity?', type: 'select', options: ['Yes', 'No', 'Questionable'] },
        { name: 'risksExplained', label: 'Risks explained to patient?', type: 'select', options: ['Yes', 'No'] },
      ]
    },
    {
      id: 'pressure_injury',
      name: 'New Pressure Injury',
      icon: Droplet,
      color: 'text-pink-600',
      bgColor: 'bg-pink-50',
      borderColor: 'border-pink-300',
      severity: 'medium',
      fields: [
        { name: 'location', label: 'Location', type: 'text', placeholder: 'e.g., sacrum, heel' },
        { name: 'stage', label: 'Stage', type: 'select', options: ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4', 'Unstageable', 'Deep Tissue Injury'] },
        { name: 'size', label: 'Size (L x W cm)', type: 'text', placeholder: 'e.g., 2 x 3' },
        { name: 'discoveredDate', label: 'When first noticed?', type: 'date' },
      ]
    },
    {
      id: 'emergency_visit',
      name: 'ER Visit',
      icon: Zap,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-300',
      severity: 'high',
      fields: [
        { name: 'visitDate', label: 'Date of ER visit', type: 'date' },
        { name: 'hospital', label: 'Hospital name', type: 'text' },
        { name: 'reason', label: 'Reason for visit', type: 'text' },
        { name: 'outcome', label: 'Outcome', type: 'select', options: ['Treated and released', 'Admitted', 'Left AMA', 'Unknown'] },
        { name: 'transport', label: 'How transported?', type: 'select', options: ['Ambulance - 911', 'Family', 'Other'] },
      ]
    },
  ];

  // Using useCallback to ensure handleIncidentSelect is stable and doesn't cause unnecessary re-renders in useEffect
  const handleIncidentSelect = useCallback((incident) => {
    setSelectedIncident(incident);
    setIncidentData({});
    setShowDialog(true);
    // Explicitly stop recognition when a command is processed and dialog opens
    if (recognitionRef.current && isListeningRef.current) {
        recognitionRef.current.stop();
        isListeningRef.current = false; // Mark as not listening
    }
  }, []); // No external dependencies, so it's stable.

  // Effect for setting up and managing Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      console.warn("Speech Recognition API not supported by this browser.");
      setVoiceCommandStatus("not-supported");
      return;
    }

    // Initialize SpeechRecognition if not already done for this component instance
    if (!recognitionRef.current) {
      const recognition = new SpeechRecognition();
      recognition.continuous = true; // Listen continuously until explicitly stopped
      recognition.interimResults = false; // Only return final results
      recognition.lang = 'en-US';
      recognitionRef.current = recognition; // Store instance in ref

      const commandMap = {
        "report a fall": "fall",
        "report hospitalization": "hospitalized",
        "report medication error": "medication_error",
        "report behavioral change": "behavioral_change",
        "report infection": "infection_suspected",
        "report refusal of care": "refusal_of_care",
        "report pressure injury": "pressure_injury",
        "report ER visit": "emergency_visit",
      };

      recognition.onstart = () => {
        setVoiceCommandStatus("listening");
        isListeningRef.current = true;
        console.log("Voice command listening started...");
      };

      recognition.onresult = (event) => {
        setVoiceCommandStatus("processing");
        const transcript = event.results[event.results.length - 1][0].transcript.toLowerCase().trim();
        console.log("Voice command received:", transcript);

        const incidentId = commandMap[transcript];
        if (incidentId) {
          const incident = incidentTypes.find(type => type.id === incidentId);
          if (incident) {
            handleIncidentSelect(incident); // This will call stop recognition as part of its logic
          } else {
            console.warn(`Incident type not found for command: ${transcript}`);
            setVoiceCommandStatus("idle"); // No matching incident, back to idle
          }
        } else {
          console.log("No matching command for:", transcript);
          setVoiceCommandStatus("idle"); // No matching command, back to idle
        }
      };

      recognition.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setVoiceCommandStatus(`error: ${event.error}`);
        isListeningRef.current = false; // Mark as not listening
        // The `onend` handler will typically be called after `onerror`,
        // and the `useEffect`'s conditional logic will handle potential restarts.
      };

      recognition.onend = () => {
        isListeningRef.current = false; // Mark as not listening
        console.log("Voice command listening ended.");
        // If it ended and we're not showing a dialog or actively processing a command,
        // revert to idle. The main useEffect logic will handle restarting if needed.
        if (!showDialog && voiceCommandStatus !== "processing") {
            setVoiceCommandStatus("idle");
        }
      };
    }

    // Logic to manage listening state based on `showDialog` and `isSubmitting`
    let startTimer = null;
    if ((showDialog || isSubmitting) && isListeningRef.current) {
      // If dialog is open OR we are submitting, and we are currently listening, stop listening
      recognitionRef.current.stop();
      isListeningRef.current = false;
      setVoiceCommandStatus("idle"); // Update status
    } else if (!showDialog && !isSubmitting && !isListeningRef.current) {
      // Dialog closed, not submitting, not listening → (re)start after a short
      // delay (starting too soon after a stop throws in some browsers). This is
      // now the SINGLE start path: the previous code ALSO called start()
      // synchronously just below, so on mount BOTH fired and raced into
      // "InvalidStateError: already started". The timer is cleared on cleanup so a
      // queued start can't fire after unmount or among rapid dialog toggles.
      startTimer = setTimeout(() => {
        if (recognitionRef.current && !isListeningRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.warn("Speech recognition failed to start:", e);
            setVoiceCommandStatus("error: restart failed");
          }
        }
      }, 500);
    }

    // Cleanup: clear any pending start, and stop listening on unmount / re-run.
    return () => {
      if (startTimer) clearTimeout(startTimer);
      if (recognitionRef.current && isListeningRef.current) {
        recognitionRef.current.stop();
        isListeningRef.current = false;
      }
    };
  }, [showDialog, isSubmitting, handleIncidentSelect]); // Dependencies for useEffect. `incidentTypes` is a constant.


  const generateIncidentReport = () => {
    const now = new Date();
    const timestamp = format(now, 'MM/dd/yyyy HH:mm');
    
    let report = `**${selectedIncident.name.toUpperCase()} - INCIDENT REPORT**

**INCIDENT INFORMATION:**
- Date/Time Reported: ${timestamp}
- Patient: ${patient.first_name} ${patient.last_name}
- MRN: ${patient.medical_record_number || 'N/A'}
- Reporting Nurse: [Current user]
- Visit Date: ${visit.visit_date}

`;

    // Generate type-specific documentation
    switch (selectedIncident.id) {
      case 'fall':
        report += `**FALL INCIDENT DETAILS:**
- Fall witnessed: ${incidentData.witnessed || '[Not specified]'}
- Location of fall: ${incidentData.location || '[Not specified]'}
- Patient assistance needed: ${incidentData.assistance || '[Not specified]'}
- Injury sustained: ${incidentData.injury || '[Not specified]'}

**POST-FALL ASSESSMENT:**
- Level of consciousness: Alert and oriented x3 (assessed immediately post-fall)
- Vital signs: [Insert vital signs taken post-fall]
- Pain level: ${incidentData.painLevel || '0'}/10
- Neurological: PERRLA, no headache, no dizziness, no vision changes
- Cardiovascular: Regular heart rate, blood pressure stable
- Musculoskeletal: [Assess for injury, ROM, ability to bear weight]
- Skin: [Intact/abrasions/lacerations noted and described]

**CIRCUMSTANCES:**
Patient was [activity prior to fall]. [Environmental factors if applicable]. Patient states [patient's description of event].

**IMMEDIATE INTERVENTIONS:**
- Patient assessed for injuries immediately
- Vital signs obtained
- Neurological assessment completed
- [Remained with patient for ___ minutes]
- [Applied ice to affected area]
- [Other comfort measures]

**PHYSICIAN NOTIFICATION:**
- Dr. [Name] notified at [time]
- Findings reported: [Brief summary]
- Orders received: [Monitor/X-ray/Other]
- [No new orders at this time]

**FALL RISK FACTORS:**
- Environmental: ${incidentData.location ? 'Fall occurred in ' + incidentData.location : '[Assess hazards]'}
- [Poor lighting/clutter/wet floor/throw rugs]
- Medical: [Mobility issues/orthostatic hypotension/confusion/weakness]
- Medications: [Review medications that increase fall risk]

**PREVENTIVE MEASURES IMPLEMENTED:**
- Environmental assessment completed
- Safety recommendations made: [Specific recommendations]
- Patient/caregiver re-educated on fall prevention
- [Equipment recommended: grab bars, walker, raised toilet seat]

**MONITORING PLAN:**
- Patient monitored for delayed symptoms
- Patient/caregiver instructed to call 911 or seek immediate care if: severe headache, vision changes, confusion, weakness, loss of consciousness, or uncontrolled pain develops
- [Increase visit frequency to monitor for complications]

**ADDITIONAL NOTES:**
${incidentData.additionalInfo || '[Any additional relevant information]'}`;
        break;

      case 'hospitalized':
        report += `**HOSPITALIZATION DETAILS:**
- Hospital: ${incidentData.hospital || '[Hospital name]'}
- Admission Date: ${incidentData.admissionDate || '[Date]'}
- Reason for admission: ${incidentData.reason || '[Reason]'}
- Method of transport: ${incidentData.transport || '[Method]'}
- Expected discharge: ${incidentData.expectedDischarge || '[Unknown]'}

**CIRCUMSTANCES LEADING TO HOSPITALIZATION:**
[Describe events/symptoms that led to hospitalization]

**PATIENT STATUS PRIOR TO HOSPITALIZATION:**
- Most recent visit date: ${visit.visit_date}
- Condition at last visit: [Stable/Declining/Improving]
- Recent vital signs: [Last recorded vitals]
- Recent concerns: [Any red flags noted]

**NOTIFICATION:**
- Physician Dr. [Name] aware of hospitalization
- [Hospital discharge planner contacted/will contact]
- [Family notified]

**PLAN:**
- Home health services suspended during hospitalization
- Will coordinate with hospital discharge planner for post-discharge needs
- [Anticipated restart of services upon discharge]
- [Equipment/supplies evaluation needed upon discharge]

**FOLLOW-UP:**
- Will contact hospital social worker/case manager
- Will obtain discharge summary and orders
- [Plan for post-hospitalization visit within 24 hours of discharge]

**ADDITIONAL NOTES:**
${incidentData.additionalInfo || '[Any additional relevant information]'}`;
        break;

      case 'medication_error':
        report += `**MEDICATION ERROR DETAILS:**
- Medication involved: ${incidentData.medication || '[Medication name]'}
- Type of error: ${incidentData.errorType || '[Error type]'}
- Error discovered by: ${incidentData.discoveredBy || '[Who discovered]'}
- Level of harm: ${incidentData.harmLevel || '[Harm level]'}

**DESCRIPTION OF ERROR:**
[Detailed description of what happened, when, and how error occurred]

**CORRECT VS. ACTUAL:**
- Correct dose/medication/route: [What should have been given]
- What was actually done: [What actually occurred]

**IMMEDIATE ACTIONS TAKEN:**
- Patient assessed for adverse effects
- Vital signs obtained: [Current vital signs]
- [Adverse effects present: Describe / None noted]
- [Intervention provided if needed]

**PHYSICIAN NOTIFICATION:**
- Dr. [Name] notified immediately at [time]
- Error details provided
- Patient assessment findings reported
- Orders received: [Monitor/Lab work/Intervention/No action needed]

**ROOT CAUSE ANALYSIS:**
- Contributing factors: [Distraction/Similar packaging/Transcription error/Other]
- [Patient identification verified/not verified prior to administration]
- [Medication label checked/not checked]

**PREVENTIVE MEASURES:**
- [Specific actions to prevent recurrence]
- [Education provided]
- [System changes recommended]

**MONITORING PLAN:**
- Patient to be monitored for: [Specific signs/symptoms]
- [Frequency of monitoring]
- Patient/caregiver instructed on what to watch for
- [Lab work ordered for [date] if applicable]

**PATIENT/FAMILY NOTIFICATION:**
- [Patient/family informed of error: Yes/No]
- [Explanation provided]
- [Patient's response]

**ADDITIONAL NOTES:**
${incidentData.additionalInfo || '[Any additional relevant information]'}`;
        break;

      case 'behavioral_change':
        report += `**BEHAVIORAL CHANGE DETAILS:**
- Type of change: ${incidentData.changeType || '[Type]'}
- Onset: ${incidentData.onset || '[When started]'}
- Severity: ${incidentData.severity || '[Severity]'}

**BASELINE BEHAVIOR:**
Patient's normal behavior: [Describe typical mental status and behavior]

**CURRENT PRESENTATION:**
- Mental status: [Current mental status assessment]
- Specific behaviors observed: [Detailed description]
- Duration: [How long has this been occurring]
- Pattern: [Constant/Intermittent/Worsening/Improving]

**COMPREHENSIVE ASSESSMENT:**
- Vital signs: [Current vital signs - look for fever, hypoxia, hypotension]
- Neurological: [LOC, orientation, pupils, motor function, speech]
- Cardiovascular: [Assess for cardiac issues]
- Respiratory: [O2 sat, lung sounds, respiratory effort]
- Pain: [Pain level and description]
- Last BM: [Rule out constipation/impaction]
- Last void: [Rule out urinary retention]
- Blood glucose: [If diabetic or indicated]

**POTENTIAL CAUSES EVALUATED:**
- Recent medication changes: [Yes/No - specify]
- Recent illness/infection: [Signs/symptoms]
- Metabolic issues: [Dehydration/electrolyte imbalance]
- Urinary retention/constipation: [Assessed]
- Pain: [Uncontrolled pain]
- Environmental changes: [Any recent changes]
- Sleep disturbance: [Sleep pattern]

**SAFETY ASSESSMENT:**
- Risk to self: [Low/Moderate/High]
- Risk to others: [Low/Moderate/High]
- [Fall risk increased due to confusion]
- [Wandering risk]
- [Ability to perform ADLs safely]

**INTERVENTIONS:**
- [Attempted redirection]
- [Ensured safe environment]
- [Removed potential hazards]
- [1:1 supervision arranged]
- [Caregiver support provided]

**PHYSICIAN NOTIFICATION:**
- Dr. [Name] notified at [time]
- Findings reported
- Orders received: [Labs/Urinalysis/Medication adjustment/Other]
- [Evaluation for UTI/delirium/dementia progression]

**PLAN:**
- [Close monitoring]
- [Increase visit frequency]
- [Lab work scheduled]
- [Medication review]
- [Referral to specialist if needed]
- [Caregiver support and education]

**ADDITIONAL NOTES:**
${incidentData.additionalInfo || '[Any additional relevant information]'}`;
        break;

      case 'infection_suspected':
        report += `**SUSPECTED INFECTION DETAILS:**
- Temperature: ${incidentData.temperature || '[Temp]'}°F
- Suspected source: ${incidentData.suspectedSource || '[Source]'}
- Symptoms present: ${incidentData.symptoms || '[Symptoms]'}

**COMPREHENSIVE ASSESSMENT:**
- Vital signs: [Full set including BP, HR, RR, Temp, O2 sat]
- General appearance: [Alert/Lethargic/Ill-appearing]
- [Source-specific assessment based on suspected infection site]

**WOUND ASSESSMENT (if applicable):**
- Location: [___]
- Increased redness: [Yes/No - measure diameter]
- Increased warmth: [Yes/No]
- Increased drainage: [Yes/No - describe type, amount]
- Purulent drainage: [Yes/No]
- Foul odor: [Yes/No]
- Increased pain: [Yes/No - level]

**RESPIRATORY ASSESSMENT (if applicable):**
- Lung sounds: [Clear/Crackles/Wheezes]
- Cough: [Yes/No - productive/nonproductive]
- Sputum: [Color, consistency]
- Dyspnea: [Yes/No]

**URINARY ASSESSMENT (if applicable):**
- Urine appearance: [Clear/Cloudy/Blood-tinged]
- Odor: [Normal/Foul]
- Dysuria: [Yes/No]
- Frequency/urgency: [Yes/No]

**SYSTEMIC SYMPTOMS:**
- Chills: [Yes/No]
- Malaise: [Yes/No]
- Confusion (new/worsened): [Yes/No]
- Appetite: [Decreased/Normal]

**PHYSICIAN NOTIFICATION:**
- Dr. [Name] notified at [time]
- All findings reported
- Orders received:
  * [Labs: CBC, CMP, blood cultures]
  * [Urinalysis and culture]
  * [Wound culture]
  * [Chest X-ray]
  * [Antibiotic started: Name, dose, frequency]
  * [Other interventions]

**TREATMENT INITIATED:**
- [Antibiotic: Drug, dose, route, frequency, start date/time]
- [Increased hydration]
- [Fever management]
- [Other interventions]

**MONITORING PLAN:**
- Increase visit frequency to [daily/BID]
- Monitor: Temperature, vital signs, infection site, response to treatment
- [Lab follow-up scheduled for [date]]
- Patient/caregiver educated on signs of worsening infection

**PATIENT EDUCATION:**
- Signs of worsening infection reviewed
- When to call physician: temp >101°F, increased confusion, worsening symptoms
- When to call 911: difficulty breathing, unresponsiveness
- Medication compliance reinforced

**ADDITIONAL NOTES:**
${incidentData.additionalInfo || '[Any additional relevant information]'}`;
        break;

      case 'refusal_of_care':
        report += `**REFUSAL OF CARE DETAILS:**
- What was refused: ${incidentData.whatRefused || '[Procedure/treatment refused]'}
- Reason stated by patient: ${incidentData.reasonStated || '[Reason]'}
- Patient capacity: ${incidentData.capacity || '[Assessment of capacity]'}
- Risks explained: ${incidentData.risksExplained || 'Yes'}

**CIRCUMSTANCES:**
Patient [refused/declined] [specific procedure/treatment/medication] during today's visit.

**CAPACITY ASSESSMENT:**
- Patient alert and oriented: [x3/x2/x1/x0]
- Demonstrates understanding of: [Condition/Treatment/Consequences]
- Can express reasoning: [Yes/No]
- Clinical judgment: Patient [does/does not] have capacity to make this decision

**DISCUSSION WITH PATIENT:**
- Explained importance of [treatment/procedure]
- Discussed potential consequences of refusal:
  * [Specific risks]
  * [Potential complications]
  * [Impact on health outcomes]
- Patient's understanding: [Good/Fair/Poor]
- Patient's response: [Patient's verbatim statement]

**ALTERNATIVES OFFERED:**
- [Alternative treatment options discussed]
- [Compromise options offered]
- [Offered to return later if patient changes mind]

**SAFETY ASSESSMENT:**
- Immediate safety risk: [Yes/No - describe if yes]
- [Risk to patient if care continues to be refused]

**PHYSICIAN NOTIFICATION:**
- Dr. [Name] notified at [time]
- Situation explained
- Physician recommendations: [Instructions received]
- [Physician to contact patient directly: Yes/No]

**PATIENT RIGHTS:**
- Patient informed of right to refuse treatment
- Patient understands this may impact outcome
- Patient aware of ability to change decision anytime
- Patient encouraged to discuss with physician

**DOCUMENTATION:**
- Patient statement documented verbatim
- [Refusal form signed/declined]
- [Witness present: Name]

**PLAN:**
- Respect patient's decision
- [Will reattempt care at next visit]
- [Continue other aspects of care plan]
- Document refusal in medical record
- [Discuss with care team]

**CAREGIVER INVOLVEMENT:**
- Caregiver present: [Yes/No]
- Caregiver's perspective: [If applicable]
- [Caregiver supports patient decision/has concerns]

**ADDITIONAL NOTES:**
${incidentData.additionalInfo || '[Any additional relevant information]'}`;
        break;

      case 'pressure_injury':
        report += `**NEW PRESSURE INJURY DETAILS:**
- Location: ${incidentData.location || '[Location]'}
- Stage: ${incidentData.stage || '[Stage]'}
- Size: ${incidentData.size || '[Size]'} cm
- First noticed: ${incidentData.discoveredDate || '[Date]'}

**WOUND DESCRIPTION:**
- Stage: ${incidentData.stage || '[Stage]'}
- Size: Length [___] x Width [___] x Depth [___] cm
- Wound bed: [% granulation, % slough, % eschar]
- Drainage: [None/Minimal/Moderate - type]
- Odor: [Yes/No]
- Periwound skin: [Color, temperature, condition]
- Pain: [Level 0-10]

**RISK FACTOR ASSESSMENT:**
- Mobility: [Bedbound/Limited mobility]
- Nutrition: [Adequate/Inadequate - weight, appetite]
- Incontinence: [None/Urinary/Fecal/Both]
- Sensory perception: [Intact/Impaired]
- Moisture: [Skin dry/moist]
- Friction/shear: [Risk present]

**BRADEN SCALE:** [Score: ___] Risk level: [No risk/At risk/Moderate risk/High risk/Very high risk]

**PREVENTION MEASURES IN PLACE:**
Prior to injury discovery:
- Turning schedule: [Every 2 hours/Patient repositions self/None]
- Support surface: [Type of mattress/overlay]
- Heel protection: [Devices used]
- Skin assessment: [Frequency]
- [Nutritional supplements]

**ROOT CAUSE ANALYSIS:**
- [Recent decrease in mobility]
- [Inadequate turning]
- [New incontinence]
- [Nutritional deficiency]
- [Equipment malfunction/absence]
- [Other factors]

**IMMEDIATE INTERVENTIONS:**
- Wound photographed (if able)
- Dressing applied: [Type]
- Pressure relief: [Repositioned, pressure-relieving device applied]
- [Barrier cream applied if incontinence present]

**PHYSICIAN NOTIFICATION:**
- Dr. [Name] notified at [time]
- Wound described in detail
- Orders received:
  * Wound care orders: [Specific dressing orders]
  * Pressure relief: [Orders]
  * Nutritional consult: [Yes/No]
  * [Other orders]

**ENHANCED PREVENTION PLAN:**
- Turning schedule: [Every 2 hours, documented]
- Support surface: [Pressure-relieving mattress ordered/in place]
- Heel protection: [Devices applied]
- Skin assessment: [Every visit]
- Incontinence management: [Plan]
- Nutrition: [High-protein diet, supplements, referral to RD]
- [Increase HHA visits for repositioning]

**MONITORING PLAN:**
- [Measure wound weekly]
- [Photography weekly]
- [Assess for signs of infection]
- Wound care per orders
- Document wound progress

**FAMILY EDUCATION:**
- Pressure injury cause and prevention explained
- Importance of repositioning reinforced
- [Caregiver trained on proper technique]
- Nutritional needs discussed
- Signs of worsening/infection reviewed

**QUALITY REVIEW:**
- Incident reported to agency quality department
- [Will participate in root cause analysis]
- [Will review prevention protocols]

**ADDITIONAL NOTES:**
${incidentData.additionalInfo || '[Any additional relevant information]'}`;
        break;

      case 'emergency_visit':
        report += `**EMERGENCY ROOM VISIT DETAILS:**
- Hospital: ${incidentData.hospital || '[Hospital name]'}
- Date of visit: ${incidentData.visitDate || '[Date]'}
- Reason for visit: ${incidentData.reason || '[Reason]'}
- Method of transport: ${incidentData.transport || '[Transport method]'}
- Outcome: ${incidentData.outcome || '[Outcome]'}

**CIRCUMSTANCES LEADING TO ER VISIT:**
[Describe symptoms/events that prompted ER visit]

**PATIENT STATUS PRIOR TO ER VISIT:**
- Most recent home health visit: ${visit.visit_date}
- Condition at last visit: [Stable/Declining/Improving]
- Recent concerns: [Any red flags]
- Recent vital signs: [Last recorded]

**ER VISIT INFORMATION:**
- Chief complaint: [Reason for visit]
- Treatment received: [Brief description if known]
- Diagnosis: [If known]
- Outcome: ${incidentData.outcome || '[Treated and released/Admitted/Other]'}
- [Discharge instructions received if treated and released]

**CURRENT STATUS:**
- Patient returned home: [Yes/No - when]
- [Patient admitted to hospital]
- Current condition: [As reported by patient/family]
- New medications: [If any]
- Follow-up appointments: [If scheduled]

**PHYSICIAN NOTIFICATION:**
- Dr. [Name] notified at [time]
- ER visit details provided
- [Awaiting additional information from ER]
- [Will obtain ER records]

**HOME HEALTH PLAN:**
If patient returned home:
- Reassess patient within [24 hours]
- Review ER discharge instructions
- Medication reconciliation needed
- [Adjust care plan based on ER visit]
- [Increase visit frequency if needed]

If patient admitted:
- Home health services suspended during hospitalization
- Will coordinate with hospital for post-discharge needs
- [Equipment/supply needs upon discharge]

**FOLLOW-UP:**
- [Will contact ER for records]
- [Will obtain physician orders if needed]
- [Will reassess patient at next visit]
- [Family education regarding when to seek emergency care]

**PREVENTIVE MEASURES:**
- [Review what could have prevented ER visit]
- [Patient/family re-education]
- [Earlier intervention strategies]
- [Communication improvements]

**ADDITIONAL NOTES:**
${incidentData.additionalInfo || '[Any additional relevant information]'}`;
        break;

      default:
        report += `**INCIDENT DETAILS:**
[Describe incident]

**ASSESSMENT:**
[Comprehensive assessment findings]

**INTERVENTIONS:**
[Actions taken]

**PHYSICIAN NOTIFICATION:**
Dr. [Name] notified at [time] regarding incident. Orders received: [___]

**PLAN:**
[Follow-up plan]

**ADDITIONAL NOTES:**
${incidentData.additionalInfo || '[Any additional relevant information]'}`;
    }

    report += `\n\n**NOTIFICATIONS:**`;
    if (notifyPhysician) {
      report += `\n- Physician: Dr. [Name] notified at [time] - awaiting callback/orders received`;
    }
    if (notifyOffice) {
      report += `\n- Office: [Name] notified at [time]`;
    }

    report += `\n\n**INCIDENT REPORT COMPLETED BY:**
[Nurse name and credentials]
Date: ${format(now, 'MM/dd/yyyy')}
Time: ${format(now, 'HH:mm')}
Signature: _________________________`;

    return report;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const report = generateIncidentReport();
      
      // Create incident record
      await base44.entities.Incident.create({
        patient_id: patient.id,
        visit_id: visit.id,
        incident_type: selectedIncident.id,
        incident_name: selectedIncident.name,
        incident_date: format(new Date(), 'yyyy-MM-dd'),
        incident_time: format(new Date(), 'HH:mm'),
        severity: selectedIncident.severity,
        details: incidentData,
        report: report,
        physician_notified: notifyPhysician,
        office_notified: notifyOffice,
        status: 'reported'
      });

      // Send notifications if requested. These are best-effort and run in their
      // own try/catch: the incident is already saved above, so a failed email
      // must NOT bubble to the outer catch and prompt the nurse to re-submit
      // (which would create a duplicate incident record).
      let notifyFailed = false;
      if (notifyPhysician || notifyOffice) {
        try {
          const summary = `${selectedIncident.name} - ${patient.first_name} ${patient.last_name}

${report.substring(0, 500)}...

Full report available in patient record.`;

          // Email physician
          if (notifyPhysician && patient.physician_email) {
            await base44.integrations.Core.SendEmail({
              to: patient.physician_email,
              subject: `URGENT: ${selectedIncident.name} - ${patient.first_name} ${patient.last_name}`,
              body: summary,
              from_name: 'Penn Sync Home Health - Incident Alert'
            });
          }

          // Email office/administrator
          if (notifyOffice) {
            const adminEmail = 'office@pennsync.com'; // Update with actual office email
            await base44.integrations.Core.SendEmail({
              to: adminEmail,
              subject: `Incident Report: ${selectedIncident.name} - ${patient.first_name} ${patient.last_name}`,
              body: summary,
              from_name: 'Penn Sync Home Health'
            });
          }
        } catch (notifyError) {
          notifyFailed = true;
          console.error('Incident saved, but notification email failed:', notifyError);
        }
      }

      // Call callback to insert into documentation
      if (onIncidentReported) {
        onIncidentReported(report);
      }

      alert(notifyFailed
        ? 'Incident report saved and added to documentation, but a notification email failed to send. Please notify the physician/office directly if needed.'
        : 'Incident report created successfully! Report added to documentation.');
      setShowDialog(false);
      setSelectedIncident(null);
      setIncidentData({});

    } catch (error) {
      console.error('Error creating incident report:', error);
      alert('Error creating incident report. Please try again.');
    }
    setIsSubmitting(false);
  };

  return (
    <>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Quick Incident Reporting
            {/* Voice command status indicator */}
            {voiceCommandStatus === "listening" && (
                <Badge variant="secondary" className="ml-2 bg-green-100 text-green-700 border-green-300 animate-pulse">
                    <Mic className="w-3 h-3 mr-1" /> Listening...
                </Badge>
            )}
            {voiceCommandStatus === "processing" && (
                <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-700 border-blue-300">
                    Processing Voice Command...
                </Badge>
            )}
            {voiceCommandStatus.startsWith("error") && (
                <Badge variant="destructive" className="ml-2">
                    <MicOff className="w-3 h-3 mr-1" /> Voice Error
                </Badge>
            )}
            {voiceCommandStatus === "not-supported" && (
                <Badge variant="destructive" className="ml-2">
                    Voice Not Supported
                </Badge>
            )}
            <Badge variant="outline" className="ml-auto bg-red-50 text-red-700 border-red-300">
              One-Click
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Alert className="mb-4 bg-blue-50 border-blue-200">
            <AlertDescription className="text-blue-900 text-sm">
              <strong>💡 Quick Incident Reporting:</strong> One click generates a complete, professional incident report with all required documentation. Saves 10-15 minutes per incident. You can also use voice commands like "Report a fall" to quickly open a specific incident form.
            </AlertDescription>
          </Alert>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {incidentTypes.map((incident) => {
              const Icon = incident.icon;
              return (
                <button
                  key={incident.id}
                  onClick={() => handleIncidentSelect(incident)}
                  data-incident={incident.id} // Added data-incident attribute as per the outline
                  className={`${incident.bgColor} ${incident.borderColor} border-2 p-4 rounded-lg hover:shadow-lg transition-all text-left group relative`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <div className={`${incident.color} bg-white p-3 rounded-full shadow-md group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-sm font-semibold text-slate-900 text-center">
                      {incident.name}
                    </span>
                    {incident.severity === 'high' && (
                      <Badge variant="destructive" className="text-xs absolute top-2 right-2">
                        High Priority
                      </Badge>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {selectedIncident && <selectedIncident.icon className={`w-6 h-6 ${selectedIncident.color}`} />}
              {selectedIncident?.name} Report
            </DialogTitle>
            <DialogDescription>
              Complete the form below. A comprehensive incident report will be auto-generated and added to your documentation.
            </DialogDescription>
          </DialogHeader>

          {selectedIncident && (
            <div className="space-y-4 py-4">
              {selectedIncident.fields.map((field) => (
                <div key={field.name} className="space-y-2">
                  <Label htmlFor={field.name}>{field.label}</Label>
                  {field.type === 'select' ? (
                    <Select
                      value={incidentData[field.name] || ''}
                      onValueChange={(value) => setIncidentData({...incidentData, [field.name]: value})}
                    >
                      <SelectTrigger id={field.name}>
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {field.options.map(option => (
                          <SelectItem key={option} value={option}>{option}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : field.type === 'textarea' ? (
                    <Textarea
                      id={field.name}
                      value={incidentData[field.name] || ''}
                      onChange={(e) => setIncidentData({...incidentData, [field.name]: e.target.value})}
                      placeholder={field.placeholder}
                      rows={3}
                    />
                  ) : (
                    <Input
                      id={field.name}
                      type={field.type}
                      step={field.step}
                      value={incidentData[field.name] || ''}
                      onChange={(e) => setIncidentData({...incidentData, [field.name]: e.target.value})}
                      placeholder={field.placeholder}
                    />
                  )}
                </div>
              ))}

              <div className="space-y-2">
                <Label htmlFor="additionalInfo">Additional Information (Optional)</Label>
                <Textarea
                  id="additionalInfo"
                  value={incidentData.additionalInfo || ''}
                  onChange={(e) => setIncidentData({...incidentData, additionalInfo: e.target.value})}
                  placeholder="Any other relevant details..."
                  rows={3}
                />
              </div>

              <div className="space-y-3 pt-4 border-t">
                <Label className="text-base font-semibold">Notifications</Label>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notifyPhysician"
                    checked={notifyPhysician}
                    onCheckedChange={setNotifyPhysician}
                  />
                  <Label htmlFor="notifyPhysician" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4" />
                      <span>Notify Physician immediately</span>
                    </div>
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="notifyOffice"
                    checked={notifyOffice}
                    onCheckedChange={setNotifyOffice}
                  />
                  <Label htmlFor="notifyOffice" className="cursor-pointer">
                    <div className="flex items-center gap-2">
                      <Send className="w-4 h-4" />
                      <span>Notify office/supervisor</span>
                    </div>
                  </Label>
                </div>
              </div>

              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <AlertDescription className="text-yellow-900 text-sm">
                  A comprehensive incident report will be generated and added to your visit documentation. Review and edit as needed before completing the visit.
                </AlertDescription>
              </Alert>

              <div className="flex justify-end gap-3 pt-4">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowDialog(false);
                    setSelectedIncident(null);
                    setIncidentData({});
                  }}
                  disabled={isSubmitting}
                >
                  <X className="w-4 h-4 mr-2" />
                  Cancel
                </Button>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="bg-red-600 hover:bg-red-700"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4 mr-2" />
                      Generate Incident Report
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

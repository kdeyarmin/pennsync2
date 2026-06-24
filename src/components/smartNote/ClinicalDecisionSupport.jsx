import { useState, useEffect, useCallback } from "react";
import { invokeLLM } from "@/lib/invokeLLM";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ShieldAlert,
  Loader2,
  AlertTriangle,
  Pill,
  Stethoscope,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  HeartPulse,
  RefreshCw,
  Lightbulb,
  BookOpen,
  Plus,
  Eye,
  Activity,
  Brain,
  Zap,
  Phone,
  Clock,
  Calendar
} from "lucide-react";

export default function ClinicalDecisionSupport({
  enhancedNote,
  extractedData,
  diagnosis,
  careType,
  vitalSigns,
  roughNote,
  onInsertRecommendation
}) {
  const [cdsAlerts, setCdsAlerts] = useState(null);
  const [proactiveAlerts, setProactiveAlerts] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isProactiveAnalyzing, setIsProactiveAnalyzing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [lastAnalyzedText, setLastAnalyzedText] = useState("");
  const [lastProactiveContext, setLastProactiveContext] = useState("");
  const [immediateAlerts, setImmediateAlerts] = useState([]);

  // Generate immediate rule-based alerts
  const generateImmediateAlerts = useCallback(() => {
    const alerts = [];
    const diagnosisUpper = (diagnosis || '').toUpperCase();
    const noteText = ((roughNote || '') + ' ' + (enhancedNote || '')).toLowerCase();

    // Parse vital signs
    const parseBP = (bp) => {
      if (!bp) return null;
      const match = bp.match(/(\d+)\s*\/\s*(\d+)/);
      if (match) return { systolic: parseInt(match[1]), diastolic: parseInt(match[2]) };
      return null;
    };

    const parseNumeric = (val) => {
      if (!val) return null;
      const match = String(val).match(/(\d+\.?\d*)/);
      return match ? parseFloat(match[1]) : null;
    };

    const bp = parseBP(vitalSigns?.bp);
    const hr = parseNumeric(vitalSigns?.hr);
    const o2 = parseNumeric(vitalSigns?.o2);
    const temp = parseNumeric(vitalSigns?.temp);
    const pain = parseNumeric(vitalSigns?.pain);

    // ===== BLOOD PRESSURE ALERTS =====
    if (bp) {
      // Hypertensive crisis
      if (bp.systolic >= 180 || bp.diastolic >= 120) {
        alerts.push({
          type: 'vital_critical',
          severity: 'critical',
          icon: 'HeartPulse',
          title: 'HYPERTENSIVE CRISIS',
          message: `BP ${vitalSigns.bp} indicates hypertensive crisis. Immediate physician notification required.`,
          actions: [
            'Contact physician immediately',
            'Assess for target organ damage (headache, chest pain, vision changes, confusion)',
            'Keep patient calm and in semi-Fowler position',
            'Prepare for possible emergency services'
          ],
          documentationSuggestion: `URGENT: Hypertensive crisis identified with BP ${vitalSigns.bp}. Physician notified at [TIME]. Patient assessed for symptoms of target organ damage including headache, chest pain, visual disturbances, and neurological changes. Patient instructed to remain calm and in semi-Fowler position.`
        });
      }
      // Stage 2 Hypertension
      else if (bp.systolic >= 140 || bp.diastolic >= 90) {
        const isHTN = diagnosisUpper.includes('HYPERTENSION') || diagnosisUpper.includes('HTN');
        alerts.push({
          type: 'vital_elevated',
          severity: 'high',
          icon: 'HeartPulse',
          title: 'Elevated Blood Pressure',
          message: `BP ${vitalSigns.bp} is elevated${isHTN ? ' despite hypertension diagnosis' : ''}.`,
          actions: isHTN ? [
            'Review medication compliance - ask patient about missed doses',
            'Assess dietary sodium intake',
            'Check for medication side effects',
            'Verify patient is taking medications as prescribed',
            'Consider physician notification if persistent'
          ] : [
            'Recheck BP in 5 minutes with proper technique',
            'Assess for pain, anxiety, or recent activity',
            'Document and notify physician if persistent',
            'Educate on lifestyle modifications'
          ],
          documentationSuggestion: isHTN 
            ? `Elevated BP noted at ${vitalSigns.bp}. Medication compliance reviewed with patient. Patient reports [COMPLIANCE STATUS]. Dietary sodium intake assessed. Patient educated on importance of taking antihypertensive medications as prescribed and low-sodium diet adherence.`
            : `Elevated BP noted at ${vitalSigns.bp}. BP rechecked in 5 minutes: [RECHECK VALUE]. Patient assessed for contributing factors including pain, anxiety, and recent activity.`
        });
      }
      // Hypotension
      if (bp.systolic < 90 || bp.diastolic < 60) {
        alerts.push({
          type: 'vital_low',
          severity: 'high',
          icon: 'HeartPulse',
          title: 'Hypotension Alert',
          message: `BP ${vitalSigns.bp} indicates hypotension.`,
          actions: [
            'Assess for orthostatic changes (lying, sitting, standing)',
            'Check for signs of dehydration',
            'Review medications for hypotensive effects',
            'Assess for dizziness, lightheadedness, falls risk',
            'Notify physician if symptomatic'
          ],
          documentationSuggestion: `Hypotension noted with BP ${vitalSigns.bp}. Orthostatic vital signs obtained: Lying [BP], Sitting [BP], Standing [BP]. Patient assessed for symptoms including dizziness, lightheadedness, and falls history. Hydration status evaluated. Current medications reviewed for hypotensive effects.`
        });
      }
    }

    // ===== OXYGEN SATURATION ALERTS =====
    if (o2 !== null) {
      const isCOPD = diagnosisUpper.includes('COPD') || diagnosisUpper.includes('CHRONIC OBSTRUCTIVE');
      const targetLow = isCOPD ? 88 : 92;
      
      if (o2 < 88) {
        alerts.push({
          type: 'vital_critical',
          severity: 'critical',
          icon: 'Wind',
          title: 'CRITICAL HYPOXEMIA',
          message: `O2 saturation ${vitalSigns.o2} is critically low. Immediate intervention required.`,
          actions: [
            'Verify pulse oximeter reading and probe placement',
            'Assess respiratory status immediately',
            'Increase supplemental oxygen if available',
            'Position patient upright (high Fowler\'s)',
            'Contact physician/emergency services',
            'Prepare for possible hospitalization'
          ],
          documentationSuggestion: `URGENT: Critical hypoxemia with O2 saturation ${vitalSigns.o2}. Pulse oximeter reading verified. Respiratory assessment: [FINDINGS]. Supplemental oxygen adjusted to [FLOW RATE]. Patient positioned upright. Physician notified at [TIME]. Emergency services contacted if indicated.`
        });
      } else if (o2 < targetLow) {
        alerts.push({
          type: 'vital_elevated',
          severity: 'high',
          icon: 'Wind',
          title: 'Low Oxygen Saturation',
          message: `O2 sat ${vitalSigns.o2} is below target${isCOPD ? ' (88-92% for COPD)' : ' (≥92%)'}.`,
          actions: isCOPD ? [
            'Verify current oxygen flow rate and delivery device',
            'Assess for COPD exacerbation signs',
            'Review inhaler technique and compliance',
            'Check for infection signs (fever, sputum changes)',
            'Assess work of breathing and accessory muscle use'
          ] : [
            'Assess respiratory status (rate, depth, effort)',
            'Verify pulse oximeter accuracy',
            'Consider supplemental oxygen if ordered',
            'Assess lung sounds bilaterally',
            'Notify physician of findings'
          ],
          documentationSuggestion: isCOPD
            ? `O2 saturation ${vitalSigns.o2} below COPD target range (88-92%). Current oxygen: ${vitalSigns.o2Source === 'on_oxygen' ? vitalSigns.o2Flow + 'L via ' : 'room air'}. Respiratory assessment performed. Lung sounds: [FINDINGS]. Work of breathing: [DESCRIPTION]. Inhaler technique reviewed. Patient assessed for exacerbation signs.`
            : `O2 saturation ${vitalSigns.o2} below target. Respiratory assessment: RR [RATE], lung sounds [FINDINGS], work of breathing [DESCRIPTION]. Physician notified of findings.`
        });
      }
    }

    // ===== HEART RATE ALERTS =====
    if (hr !== null) {
      if (hr > 100) {
        const isCHF = diagnosisUpper.includes('CHF') || diagnosisUpper.includes('HEART FAILURE');
        alerts.push({
          type: 'vital_elevated',
          severity: hr > 120 ? 'high' : 'medium',
          icon: 'HeartPulse',
          title: 'Tachycardia',
          message: `Heart rate ${vitalSigns.hr} is elevated.`,
          actions: isCHF ? [
            'Assess for CHF exacerbation signs',
            'Check for new onset atrial fibrillation',
            'Review beta-blocker compliance',
            'Assess fluid status (weight, edema)',
            'Evaluate for infection or fever'
          ] : [
            'Assess for pain, anxiety, fever, dehydration',
            'Review medications (stimulants, bronchodilators)',
            'Check temperature and hydration status',
            'Recheck after patient rests 10 minutes'
          ],
          documentationSuggestion: `Tachycardia noted with HR ${vitalSigns.hr}. ${isCHF ? 'CHF exacerbation assessment performed. Weight today: ___ lbs. Edema: ___. Lung sounds: ___.' : 'Patient assessed for contributing factors. Pain: ___, Anxiety: ___, Temperature: ___. Hydration status evaluated.'}`
        });
      }
      if (hr < 60) {
        alerts.push({
          type: 'vital_low',
          severity: hr < 50 ? 'high' : 'medium',
          icon: 'HeartPulse',
          title: 'Bradycardia',
          message: `Heart rate ${vitalSigns.hr} is low.`,
          actions: [
            'Assess for dizziness, syncope, fatigue',
            'Review beta-blocker/cardiac medications',
            'Check if patient is athletic (may be normal)',
            'Assess peripheral perfusion',
            'Notify physician if symptomatic'
          ],
          documentationSuggestion: `Bradycardia noted with HR ${vitalSigns.hr}. Patient assessed for symptoms: dizziness [Y/N], syncope [Y/N], fatigue [Y/N]. Current cardiac medications reviewed. Peripheral perfusion assessed.`
        });
      }
    }

    // ===== TEMPERATURE ALERTS =====
    if (temp !== null) {
      if (temp >= 100.4 || temp >= 38) {
        alerts.push({
          type: 'vital_elevated',
          severity: temp >= 102 ? 'high' : 'medium',
          icon: 'Thermometer',
          title: 'Fever Detected',
          message: `Temperature ${vitalSigns.temp} indicates fever.`,
          actions: [
            'Assess for infection source (UTI, respiratory, wound)',
            'Check for other infection signs',
            'Review recent procedures or hospitalizations',
            'Encourage fluid intake',
            'Notify physician for possible cultures/antibiotics'
          ],
          documentationSuggestion: `Fever noted with temperature ${vitalSigns.temp}. Infection assessment performed. Respiratory: [FINDINGS]. Urinary symptoms: [FINDINGS]. Wound status: [FINDINGS]. Skin assessment: [FINDINGS]. Physician notified for evaluation.`
        });
      }
      if (temp < 97 || temp < 36.1) {
        alerts.push({
          type: 'vital_low',
          severity: 'medium',
          icon: 'Thermometer',
          title: 'Hypothermia Risk',
          message: `Temperature ${vitalSigns.temp} is low.`,
          actions: [
            'Verify thermometer accuracy',
            'Assess home heating adequacy',
            'Check for signs of infection (elderly may not mount fever)',
            'Ensure adequate clothing and blankets',
            'Monitor closely for sepsis signs'
          ],
          documentationSuggestion: `Low temperature noted at ${vitalSigns.temp}. Home environment assessed for adequate heating. Patient assessed for subtle infection signs (confusion, weakness, decreased appetite). Warm blankets provided.`
        });
      }
    }

    // ===== PAIN ALERTS =====
    if (pain !== null && pain >= 7) {
      alerts.push({
        type: 'symptom',
        severity: pain >= 8 ? 'high' : 'medium',
        icon: 'Activity',
        title: 'Severe Pain',
        message: `Pain level ${vitalSigns.pain}/10 requires attention.`,
        actions: [
          'Perform comprehensive pain assessment (location, quality, duration)',
          'Review current pain management regimen',
          'Assess for new injury or condition change',
          'Consider PRN medications if available',
          'Notify physician for medication adjustment'
        ],
        documentationSuggestion: `Severe pain reported at ${vitalSigns.pain}/10. Pain assessment: Location: ___. Quality: ___. Onset: ___. Duration: ___. Aggravating factors: ___. Alleviating factors: ___. Current pain regimen reviewed. Physician notified for pain management evaluation.`
      });
    }

    // ===== DIAGNOSIS-SPECIFIC ALERTS =====
    
    // CHF-specific
    if (diagnosisUpper.includes('CHF') || diagnosisUpper.includes('HEART FAILURE') || diagnosisUpper.includes('CONGESTIVE')) {
      if (!noteText.includes('weight') && !noteText.includes('edema')) {
        alerts.push({
          type: 'assessment_needed',
          severity: 'high',
          icon: 'Scale',
          title: 'CHF: Weight & Edema Assessment Needed',
          message: 'Daily weight and edema assessment required for CHF monitoring.',
          actions: [
            'Obtain current weight and compare to baseline/previous',
            'Assess bilateral lower extremity edema (grade 0-4+)',
            'Check for JVD at 45 degrees',
            'Auscultate lung bases for crackles',
            'Review sodium and fluid intake'
          ],
          documentationSuggestion: `CHF ASSESSMENT: Weight today: ___ lbs. Previous weight: ___ lbs. Weight change: ___ lbs. Bilateral lower extremity edema: ___+ pitting. JVD: present/absent at 45 degrees. Lung sounds: ___. Sodium restriction compliance reviewed. Patient educated on daily weight monitoring and to notify nurse if weight gain >2-3 lbs in 24 hours or >5 lbs in one week.`
        });
      }
    }

    // Diabetes-specific
    if (diagnosisUpper.includes('DIABETES') || diagnosisUpper.includes('DM') || diagnosisUpper.includes('DIABETIC')) {
      if (!noteText.includes('glucose') && !noteText.includes('blood sugar') && !noteText.includes('foot') && !noteText.includes('feet')) {
        alerts.push({
          type: 'assessment_needed',
          severity: 'medium',
          icon: 'Droplet',
          title: 'Diabetes: Blood Glucose & Foot Exam Needed',
          message: 'Blood glucose check and diabetic foot exam should be documented.',
          actions: [
            'Check blood glucose if glucometer available',
            'Perform diabetic foot exam',
            'Check pedal pulses bilaterally',
            'Assess sensation with monofilament if available',
            'Inspect between toes for breakdown'
          ],
          documentationSuggestion: `DIABETES ASSESSMENT: Blood glucose: ___ mg/dL (fasting/random). Diabetic foot exam performed. Pedal pulses: R ___, L ___. Skin integrity: ___. Sensation: ___. Nails: ___. Patient educated on daily foot inspection, proper footwear, and signs of hypoglycemia/hyperglycemia.`
        });
      }
    }

    // Wound-specific
    if (noteText.includes('wound') || noteText.includes('ulcer') || noteText.includes('pressure') || noteText.includes('incision')) {
      if (!noteText.includes('cm') && !noteText.includes('measure') && !noteText.includes('dimension')) {
        alerts.push({
          type: 'assessment_needed',
          severity: 'high',
          icon: 'Bandage',
          title: 'Wound: Detailed Assessment Needed',
          message: 'Wound documentation requires measurements and detailed description.',
          actions: [
            'Measure wound dimensions (L x W x D in cm)',
            'Document wound bed appearance (% granulation, slough, eschar)',
            'Describe exudate (type, amount, odor)',
            'Assess periwound skin condition',
            'Check for undermining/tunneling',
            'Take photo if policy allows'
          ],
          documentationSuggestion: `WOUND ASSESSMENT: Location: ___. Dimensions: ___ cm (L) x ___ cm (W) x ___ cm (D). Wound bed: ___% granulation, ___% slough, ___% eschar. Exudate: type ___, amount ___, odor ___. Periwound skin: ___. Undermining: ___. Tunneling: ___. Pain at wound site: ___/10. Dressing changed per orders: ___.`
        });
      }
    }

    // COPD-specific
    if (diagnosisUpper.includes('COPD') || diagnosisUpper.includes('CHRONIC OBSTRUCTIVE')) {
      if (!noteText.includes('inhaler') && !noteText.includes('breathing') && !noteText.includes('lung sounds')) {
        alerts.push({
          type: 'assessment_needed',
          severity: 'medium',
          icon: 'Wind',
          title: 'COPD: Respiratory Assessment Needed',
          message: 'COPD patients require detailed respiratory assessment and inhaler review.',
          actions: [
            'Auscultate lung sounds (note wheezes, rhonchi, diminished sounds)',
            'Assess work of breathing and accessory muscle use',
            'Review inhaler technique',
            'Check O2 equipment if applicable',
            'Assess for exacerbation signs'
          ],
          documentationSuggestion: `COPD ASSESSMENT: Lung sounds: ___. Respiratory rate: ___. Work of breathing: ___. Accessory muscle use: ___. Cough: productive/non-productive. Sputum: color ___, amount ___. Inhaler technique reviewed and corrected as needed. O2 delivery: ___ L/min via ___. Patient educated on pursed-lip breathing and energy conservation techniques.`
        });
      }
    }

    // Stroke/CVA-specific
    if (diagnosisUpper.includes('STROKE') || diagnosisUpper.includes('CVA') || diagnosisUpper.includes('CEREBROVASCULAR')) {
      if (!noteText.includes('neuro') && !noteText.includes('strength') && !noteText.includes('speech') && !noteText.includes('swallow')) {
        alerts.push({
          type: 'assessment_needed',
          severity: 'high',
          icon: 'Brain',
          title: 'Stroke: Neurological Assessment Needed',
          message: 'Stroke patients require neurological assessment each visit.',
          actions: [
            'Assess level of consciousness and orientation',
            'Check motor strength bilateral upper and lower extremities',
            'Evaluate speech and language',
            'Assess swallowing function',
            'Review fall prevention measures'
          ],
          documentationSuggestion: `NEUROLOGICAL ASSESSMENT: LOC: alert/oriented x ___. Speech: clear/slurred/aphasia type ___. Motor strength: RUE ___/5, LUE ___/5, RLE ___/5, LLE ___/5. Facial symmetry: ___. Swallowing: ___. Gait: ___. Fall risk: ___. Safety measures in place: ___.`
        });
      }
    }

    return alerts;
  }, [diagnosis, enhancedNote, roughNote, vitalSigns]);

  // Rule-based immediate alerts that don't require AI
  useEffect(() => {
    const alerts = generateImmediateAlerts();
    setImmediateAlerts(alerts);
  }, [vitalSigns, diagnosis, roughNote, generateImmediateAlerts]);

  const runProactiveAnalysis = useCallback(async () => {
    if (!diagnosis && !vitalSigns?.bp && !vitalSigns?.hr && (!roughNote || roughNote.length < 30)) return;
    
    setIsProactiveAnalyzing(true);
    try {
      const result = await invokeLLM({
        prompt: `You are an expert Clinical Decision Support AI for home health nursing. Based on REAL-TIME information as the nurse is documenting, provide IMMEDIATE, ACTIONABLE clinical guidance.

CRITICAL: Provide SPECIFIC intervention suggestions nurses can implement NOW during the visit, not generic advice.

AVAILABLE INFORMATION:
- Diagnosis: ${diagnosis || 'Not yet specified'}
- Vital Signs: 
  ${vitalSigns?.bp ? `Blood Pressure: ${vitalSigns.bp}` : 'BP: Not entered'}
  ${vitalSigns?.hr ? `Heart Rate: ${vitalSigns.hr}` : 'HR: Not entered'}
  ${vitalSigns?.temp ? `Temperature: ${vitalSigns.temp}` : 'Temp: Not entered'}
  ${vitalSigns?.o2 ? `O2 Saturation: ${vitalSigns.o2}` : 'O2: Not entered'}
  ${vitalSigns?.pain ? `Pain Level: ${vitalSigns.pain}` : 'Pain: Not entered'}
- Care Type: ${careType === 'hospice' ? 'Hospice' : 'Home Health'}
- Initial Notes: ${roughNote || 'None yet'}

REAL-TIME CLINICAL GUIDANCE NEEDED:

1. IMMEDIATE INTERVENTIONS: Based on vitals/diagnosis, what interventions should the nurse perform RIGHT NOW during this visit?
   - Specific actions the nurse can take immediately
   - Positioning, oxygen adjustments, medication administration reminders
   - Comfort measures or symptom management

2. CRITICAL ASSESSMENTS STILL NEEDED: What specific assessments are essential for this diagnosis that haven't been documented yet?
   - System-specific assessments (cardiovascular, respiratory, neuro, skin, etc.)
   - Functional assessments
   - Risk assessments (falls, wounds, medication compliance)

3. PHYSICIAN COMMUNICATION TRIGGERS: Based on findings so far, does anything warrant physician notification?
   - Vital sign changes requiring MD contact
   - New or worsening symptoms
   - Medication concerns

4. PATIENT/CAREGIVER EDUCATION: What education should happen during THIS visit?
   - Disease-specific education priorities
   - Medication teaching points
   - Safety education
   - Provide specific teach-back questions

5. NEXT VISIT PLANNING: What should be monitored or reassessed next visit based on today's findings?

6. EVIDENCE-BASED INTERVENTIONS: What evidence-based interventions match this patient's needs?
   - Cite clinical guidelines or evidence when possible
   - Prioritize by impact and feasibility

Be SPECIFIC and ACTIONABLE - imagine you're advising the nurse during the visit, not after. Focus on what can be done NOW.

Return JSON with SPECIFIC, ACTIONABLE guidance:
{
  "immediate_actions": [
    {
      "action": "Specific action to take NOW",
      "rationale": "Why this is needed",
      "how_to": "Step-by-step instructions",
      "priority": "critical" | "high" | "medium",
      "time_sensitive": true/false
    }
  ],
  "vital_concerns": [
    {
      "vital": "Which vital",
      "value": "The value if abnormal",
      "concern": "Clinical significance",
      "immediate_action": "What to do right now",
      "physician_notification_needed": true/false,
      "severity": "high" | "medium" | "low"
    }
  ],
  "assessments_needed_now": [
    {
      "assessment": "Specific assessment name",
      "what_to_look_for": "Exactly what to assess and how",
      "normal_findings": "What normal looks like",
      "abnormal_findings": "Red flags to watch for",
      "documentation_template": "Template text for documentation",
      "priority": "high" | "medium" | "low"
    }
  ],
  "physician_notification": {
    "needed": true/false,
    "urgency": "immediate" | "today" | "routine",
    "findings_to_report": "What to tell the physician",
    "suggested_orders_to_request": ["order 1", "order 2"]
  },
  "patient_education_now": [
    {
      "topic": "Education topic",
      "specific_teaching_points": ["point 1", "point 2", "point 3"],
      "teach_back_question": "Exact question to ask patient",
      "demonstration_needed": true/false,
      "handout_recommendation": "Handout to provide if available"
    }
  ],
  "evidence_based_interventions": [
    {
      "intervention": "Specific intervention",
      "clinical_indication": "Why for this patient",
      "how_to_perform": "Instructions",
      "evidence_source": "Guideline or study reference",
      "expected_outcome": "What to expect",
      "priority": "high" | "medium" | "low"
    }
  ],
  "next_visit_planning": [
    {
      "item_to_monitor": "What to reassess",
      "why": "Rationale",
      "timeframe": "When to reassess"
    }
  ],
  "clinical_summary": "Brief summary of most critical real-time guidance"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            immediate_actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  rationale: { type: "string" },
                  how_to: { type: "string" },
                  priority: { type: "string" },
                  time_sensitive: { type: "boolean" }
                }
              }
            },
            vital_concerns: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  vital: { type: "string" },
                  value: { type: "string" },
                  concern: { type: "string" },
                  immediate_action: { type: "string" },
                  physician_notification_needed: { type: "boolean" },
                  severity: { type: "string" }
                }
              }
            },
            assessments_needed_now: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  assessment: { type: "string" },
                  what_to_look_for: { type: "string" },
                  normal_findings: { type: "string" },
                  abnormal_findings: { type: "string" },
                  documentation_template: { type: "string" },
                  priority: { type: "string" }
                }
              }
            },
            physician_notification: {
              type: "object",
              properties: {
                needed: { type: "boolean" },
                urgency: { type: "string" },
                findings_to_report: { type: "string" },
                suggested_orders_to_request: { type: "array", items: { type: "string" } }
              }
            },
            patient_education_now: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  topic: { type: "string" },
                  specific_teaching_points: { type: "array", items: { type: "string" } },
                  teach_back_question: { type: "string" },
                  demonstration_needed: { type: "boolean" },
                  handout_recommendation: { type: "string" }
                }
              }
            },
            evidence_based_interventions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  intervention: { type: "string" },
                  clinical_indication: { type: "string" },
                  how_to_perform: { type: "string" },
                  evidence_source: { type: "string" },
                  expected_outcome: { type: "string" },
                  priority: { type: "string" }
                }
              }
            },
            next_visit_planning: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item_to_monitor: { type: "string" },
                  why: { type: "string" },
                  timeframe: { type: "string" }
                }
              }
            },
            clinical_summary: { type: "string" }
          }
        }
      });
      
      setProactiveAlerts(result);
      setLastProactiveContext(`${diagnosis}-${JSON.stringify(vitalSigns)}-${roughNote?.slice(0, 100)}`);
    } catch (error) {
      console.error("Error in proactive CDS analysis:", error);
    }
    setIsProactiveAnalyzing(false);
  }, [careType, diagnosis, roughNote, vitalSigns]);

  const analyzeForCDS = useCallback(async () => {
    if (!enhancedNote || enhancedNote.length < 50) return;

    setIsAnalyzing(true);
    try {
      const result = await invokeLLM({
        prompt: `You are a Clinical Decision Support AI for home health/hospice nursing. Analyze this clinical documentation and provide real-time safety alerts and recommendations.

PATIENT CONTEXT:
- Diagnosis: ${diagnosis || 'Not specified'}
- Care Type: ${careType === 'hospice' ? 'Hospice' : 'Home Health'}
- Vital Signs: ${JSON.stringify(vitalSigns || {})}

EXTRACTED DATA:
${extractedData ? JSON.stringify(extractedData, null, 2) : 'None available'}

CLINICAL DOCUMENTATION:
${enhancedNote}

Analyze for:
1. DRUG INTERACTIONS: Check medications mentioned for potential interactions
2. CONTRAINDICATIONS: Identify any treatments/medications contraindicated for the diagnosis
3. VITAL SIGN ALERTS: Flag any concerning vital sign values or trends
4. BEST PRACTICE DEVIATIONS: Note any care that deviates from evidence-based guidelines
5. MISSING ASSESSMENTS: Identify standard assessments that should be done but weren't documented
6. SUGGESTED DIAGNOSTICS: Recommend relevant tests or assessments to consider
7. INTERVENTION RECOMMENDATIONS: Suggest evidence-based interventions

Be specific and actionable. Only flag genuine clinical concerns, not minor documentation issues.

Return JSON:
{
  "risk_level": "high" | "moderate" | "low",
  "drug_interactions": [
    {
      "drugs": ["Drug A", "Drug B"],
      "interaction": "Description of interaction",
      "severity": "high" | "moderate" | "low",
      "recommendation": "What to do"
    }
  ],
  "contraindications": [
    {
      "item": "What is contraindicated",
      "reason": "Why it's contraindicated",
      "severity": "high" | "moderate" | "low"
    }
  ],
  "vital_sign_alerts": [
    {
      "vital": "Which vital sign",
      "value": "The value",
      "concern": "Why it's concerning",
      "action": "Recommended action"
    }
  ],
  "best_practice_alerts": [
    {
      "issue": "What deviates from best practice",
      "guideline": "The relevant guideline",
      "recommendation": "What should be done"
    }
  ],
  "suggested_diagnostics": [
    {
      "test": "Test name",
      "rationale": "Why this test is recommended",
      "priority": "high" | "medium" | "low"
    }
  ],
  "intervention_recommendations": [
    {
      "intervention": "Recommended intervention",
      "evidence": "Evidence supporting this",
      "priority": "high" | "medium" | "low"
    }
  ],
  "summary": "Brief overall clinical decision support summary"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            risk_level: { type: "string" },
            drug_interactions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  drugs: { type: "array", items: { type: "string" } },
                  interaction: { type: "string" },
                  severity: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            },
            contraindications: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item: { type: "string" },
                  reason: { type: "string" },
                  severity: { type: "string" }
                }
              }
            },
            vital_sign_alerts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  vital: { type: "string" },
                  value: { type: "string" },
                  concern: { type: "string" },
                  action: { type: "string" }
                }
              }
            },
            best_practice_alerts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  issue: { type: "string" },
                  guideline: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            },
            suggested_diagnostics: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  test: { type: "string" },
                  rationale: { type: "string" },
                  priority: { type: "string" }
                }
              }
            },
            intervention_recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  intervention: { type: "string" },
                  evidence: { type: "string" },
                  priority: { type: "string" }
                }
              }
            },
            summary: { type: "string" }
          }
        }
      });

      setCdsAlerts(result);
      setLastAnalyzedText(enhancedNote);
    } catch (error) {
      console.error("Error in CDS analysis:", error);
    }
    setIsAnalyzing(false);
  }, [careType, diagnosis, enhancedNote, extractedData, vitalSigns]);

  // Proactive analysis based on vitals, diagnosis, and rough note (before enhancement)
  useEffect(() => {
    const contextKey = `${diagnosis}-${JSON.stringify(vitalSigns)}-${roughNote?.slice(0, 100)}`;
    if (contextKey !== lastProactiveContext && (diagnosis || vitalSigns?.bp || vitalSigns?.hr || (roughNote && roughNote.length > 30))) {
      const timer = setTimeout(() => {
        runProactiveAnalysis();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [diagnosis, vitalSigns, roughNote, lastProactiveContext, runProactiveAnalysis]);

  // Auto-analyze when enhanced note changes significantly
  useEffect(() => {
    if (enhancedNote && enhancedNote.length > 100 && enhancedNote !== lastAnalyzedText) {
      const timer = setTimeout(() => {
        if (enhancedNote.length > lastAnalyzedText.length + 50) {
          analyzeForCDS();
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [enhancedNote, analyzeForCDS, lastAnalyzedText]);

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'high': return 'bg-red-600';
      case 'moderate': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-slate-500';
    }
  };

  const hasAlerts = cdsAlerts && (
    cdsAlerts.drug_interactions?.length > 0 ||
    cdsAlerts.contraindications?.length > 0 ||
    cdsAlerts.vital_sign_alerts?.length > 0 ||
    cdsAlerts.best_practice_alerts?.length > 0
  );

  const totalAlerts = (cdsAlerts ? (
    (cdsAlerts.drug_interactions?.length || 0) +
    (cdsAlerts.contraindications?.length || 0) +
    (cdsAlerts.vital_sign_alerts?.length || 0) +
    (cdsAlerts.best_practice_alerts?.length || 0)
  ) : 0) + immediateAlerts.length;

  const hasCriticalAlerts = immediateAlerts.some(a => a.severity === 'critical');

  // These must match the keys the AI actually returns (and that the panel below
  // renders): immediate_actions / vital_concerns / assessments_needed_now /
  // patient_education_now / evidence_based_interventions / next_visit_planning /
  // physician_notification. The previous keys (required_assessments,
  // potentially_missed, education_points, safety_checks, suggested_interventions)
  // were never in the schema, so the whole panel stayed hidden and the badge
  // count was wrong whenever there were no vital_concerns.
  const hasProactiveAlerts = proactiveAlerts && (
    proactiveAlerts.immediate_actions?.length > 0 ||
    proactiveAlerts.vital_concerns?.length > 0 ||
    proactiveAlerts.assessments_needed_now?.length > 0 ||
    proactiveAlerts.patient_education_now?.length > 0 ||
    proactiveAlerts.evidence_based_interventions?.length > 0 ||
    proactiveAlerts.next_visit_planning?.length > 0 ||
    proactiveAlerts.physician_notification?.needed === true
  );

  const totalProactiveItems = proactiveAlerts ? (
    (proactiveAlerts.immediate_actions?.length || 0) +
    (proactiveAlerts.vital_concerns?.length || 0) +
    (proactiveAlerts.assessments_needed_now?.length || 0) +
    (proactiveAlerts.patient_education_now?.length || 0) +
    (proactiveAlerts.evidence_based_interventions?.length || 0) +
    (proactiveAlerts.next_visit_planning?.length || 0)
  ) : 0;

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  return (
    <Card className={`border-2 ${hasCriticalAlerts ? 'border-red-500 shadow-lg shadow-red-100' : hasAlerts || immediateAlerts.length > 0 ? 'border-orange-300' : hasProactiveAlerts ? 'border-amber-300' : 'border-navy-200'}`}>
      <CardHeader 
        className={`py-3 cursor-pointer ${hasCriticalAlerts ? 'bg-gradient-to-r from-red-100 to-red-50' : hasAlerts || immediateAlerts.length > 0 ? 'bg-gradient-to-r from-orange-50 to-amber-50' : hasProactiveAlerts ? 'bg-gradient-to-r from-amber-50 to-yellow-50' : 'bg-gradient-to-r from-navy-50 to-indigo-50'}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className={`w-4 h-4 ${hasCriticalAlerts ? 'text-red-600 animate-pulse' : hasAlerts || immediateAlerts.length > 0 ? 'text-orange-600' : hasProactiveAlerts ? 'text-amber-600' : 'text-navy-600'}`} />
            Clinical Decision Support
            {isProactiveAnalyzing && <Loader2 className="w-3 h-3 animate-spin text-amber-600" />}
            {hasCriticalAlerts && (
              <Badge className="bg-red-600 text-white text-xs animate-pulse">
                CRITICAL
              </Badge>
            )}
            {cdsAlerts && (
              <Badge className={`${getRiskColor(cdsAlerts.risk_level)} text-white text-xs`}>
                {cdsAlerts.risk_level} risk
              </Badge>
            )}
            {totalAlerts > 0 && (
              <Badge variant="destructive" className="text-xs">
                {totalAlerts} alert{totalAlerts !== 1 ? 's' : ''}
              </Badge>
            )}
            {!cdsAlerts && !immediateAlerts.length && totalProactiveItems > 0 && (
              <Badge className="bg-amber-100 text-amber-800 text-xs">
                {totalProactiveItems} suggestion{totalProactiveItems !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-3 space-y-3">
          {/* Immediate Rule-Based Alerts - Always show first */}
          {immediateAlerts.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-2">
                <Zap className="w-4 h-4 text-amber-600" />
                <span className="text-xs font-semibold text-amber-800">Real-Time Clinical Alerts</span>
                <Badge className="bg-amber-100 text-amber-800 text-xs">
                  {immediateAlerts.length} alert{immediateAlerts.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              
              {immediateAlerts.filter(a => a.severity === 'critical').map((alert, idx) => (
                <div key={`critical-${idx}`} className="bg-red-100 border-2 border-red-400 rounded-lg p-3 animate-pulse">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-bold text-red-800">{alert.title}</p>
                      <p className="text-xs text-red-700 mt-1">{alert.message}</p>
                      <div className="mt-2 bg-red-50 p-2 rounded">
                        <p className="text-xs font-semibold text-red-800 mb-1">Immediate Actions:</p>
                        <ul className="text-xs text-red-700 space-y-0.5">
                          {alert.actions.slice(0, 4).map((action, i) => (
                            <li key={i} className="flex items-start gap-1">
                              <span>•</span> {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                      {alert.documentationSuggestion && (
                        <Button
                          size="sm"
                          className="mt-2 bg-red-600 hover:bg-red-700 text-white text-xs h-7"
                          onClick={() => onInsertRecommendation && onInsertRecommendation(alert.documentationSuggestion)}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Add Documentation
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {immediateAlerts.filter(a => a.severity === 'high').map((alert, idx) => (
                <div key={`high-${idx}`} className="bg-orange-50 border border-orange-300 rounded-lg p-2.5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-bold text-orange-800">{alert.title}</p>
                        <Badge className="bg-orange-200 text-orange-800 text-[10px]">High Priority</Badge>
                      </div>
                      <p className="text-xs text-orange-700 mt-0.5">{alert.message}</p>
                      <div className="mt-1.5 bg-orange-100/50 p-1.5 rounded">
                        <p className="text-[10px] font-semibold text-orange-800 mb-0.5">Recommended Actions:</p>
                        <ul className="text-[10px] text-orange-700 space-y-0.5">
                          {alert.actions.slice(0, 3).map((action, i) => (
                            <li key={i}>• {action}</li>
                          ))}
                        </ul>
                      </div>
                      {alert.documentationSuggestion && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-1 text-orange-800 text-xs h-6 px-2"
                          onClick={() => onInsertRecommendation && onInsertRecommendation(alert.documentationSuggestion)}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Add to Notes
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {immediateAlerts.filter(a => a.severity === 'medium').map((alert, idx) => (
                <div key={`med-${idx}`} className="bg-yellow-50 border border-yellow-200 rounded-lg p-2">
                  <div className="flex items-start gap-2">
                    <Lightbulb className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-xs font-semibold text-yellow-800">{alert.title}</p>
                      <p className="text-[10px] text-yellow-700">{alert.message}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {alert.actions.slice(0, 2).map((action, i) => (
                          <Badge key={i} variant="outline" className="text-[9px] bg-yellow-100 text-yellow-800 border-yellow-300">
                            {action}
                          </Badge>
                        ))}
                      </div>
                      {alert.documentationSuggestion && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="mt-1 text-yellow-800 text-[10px] h-5 px-1"
                          onClick={() => onInsertRecommendation && onInsertRecommendation(alert.documentationSuggestion)}
                        >
                          <Plus className="w-2.5 h-2.5 mr-0.5" /> Add
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Real-Time Proactive Clinical Guidance - Shows DURING note-taking */}
          {!enhancedNote && proactiveAlerts && hasProactiveAlerts && (
            <div className="space-y-3">
              {proactiveAlerts.clinical_summary && (
                <Alert className="bg-gradient-to-r from-indigo-50 to-navy-50 border-indigo-300">
                  <Brain className="w-4 h-4 text-indigo-600" />
                  <AlertDescription className="text-xs text-indigo-900">
                    <strong>Real-Time Clinical Guidance:</strong> {proactiveAlerts.clinical_summary}
                  </AlertDescription>
                </Alert>
              )}

              {/* IMMEDIATE ACTIONS - Critical Priority */}
              {proactiveAlerts.immediate_actions?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-800 mb-2 flex items-center gap-1">
                    <Zap className="w-4 h-4" /> Immediate Actions Needed
                  </p>
                  {proactiveAlerts.immediate_actions.map((action, idx) => (
                    <Card key={idx} className={`border-l-4 mb-2 ${
                      action.priority === 'critical' ? 'border-l-red-600 bg-red-50' :
                      action.priority === 'high' ? 'border-l-orange-500 bg-orange-50' :
                      'border-l-yellow-500 bg-yellow-50'
                    }`}>
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-1">
                          <p className="text-sm font-bold text-slate-900">{action.action}</p>
                          <Badge className={action.priority === 'critical' ? 'bg-red-600' : action.priority === 'high' ? 'bg-orange-500' : 'bg-yellow-500'}>
                            {action.priority}
                          </Badge>
                        </div>
                        {action.time_sensitive && (
                          <Badge className="mb-2 bg-red-100 text-red-800 text-xs">
                            <Clock className="w-3 h-3 mr-1" /> Time Sensitive
                          </Badge>
                        )}
                        <div className="bg-white p-2 rounded border mb-2">
                          <p className="text-xs font-semibold text-slate-700 mb-1">Why:</p>
                          <p className="text-xs text-slate-600">{action.rationale}</p>
                        </div>
                        <div className="bg-blue-50 p-2 rounded border border-blue-200">
                          <p className="text-xs font-semibold text-blue-900 mb-1">How to Perform:</p>
                          <p className="text-xs text-slate-700">{action.how_to}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* PHYSICIAN NOTIFICATION */}
              {proactiveAlerts.physician_notification?.needed && (
                <Alert className={`${
                  proactiveAlerts.physician_notification.urgency === 'immediate' ? 'bg-red-100 border-red-400' :
                  proactiveAlerts.physician_notification.urgency === 'today' ? 'bg-orange-100 border-orange-400' :
                  'bg-yellow-100 border-yellow-400'
                }`}>
                  <Phone className="w-4 h-4" />
                  <AlertDescription>
                    <p className="text-xs font-bold mb-1">
                      Physician Notification Required - {(proactiveAlerts.physician_notification.urgency || 'routine').toUpperCase()}
                    </p>
                    <div className="bg-white p-2 rounded text-xs space-y-1">
                      <p><strong>Report to MD:</strong> {proactiveAlerts.physician_notification.findings_to_report}</p>
                      {proactiveAlerts.physician_notification.suggested_orders_to_request?.length > 0 && (
                        <div>
                          <p className="font-semibold mt-1">Consider requesting:</p>
                          <ul className="ml-3">
                            {proactiveAlerts.physician_notification.suggested_orders_to_request.map((order, i) => (
                              <li key={i}>• {order}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {/* ASSESSMENTS TO PERFORM NOW */}
              {proactiveAlerts.assessments_needed_now?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1">
                    <Eye className="w-4 h-4" /> Assessments to Complete This Visit
                  </p>
                  {proactiveAlerts.assessments_needed_now.map((assessment, idx) => (
                    <Card key={idx} className="border-l-4 border-l-blue-500 mb-2">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-1">
                          <p className="text-sm font-semibold text-slate-900">{assessment.assessment}</p>
                          <Badge className={getPriorityColor(assessment.priority)}>
                            {assessment.priority}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="bg-blue-50 p-2 rounded border border-blue-200">
                            <p className="text-xs font-semibold text-blue-900 mb-1">What to Look For:</p>
                            <p className="text-xs text-slate-700">{assessment.what_to_look_for}</p>
                          </div>
                          <div className="grid grid-cols-2 gap-2">
                            <div className="bg-green-50 p-2 rounded border border-green-200">
                              <p className="text-xs font-semibold text-green-900">Normal:</p>
                              <p className="text-xs text-slate-700">{assessment.normal_findings}</p>
                            </div>
                            <div className="bg-red-50 p-2 rounded border border-red-200">
                              <p className="text-xs font-semibold text-red-900">Red Flags:</p>
                              <p className="text-xs text-slate-700">{assessment.abnormal_findings}</p>
                            </div>
                          </div>
                          {assessment.documentation_template && (
                            <Button
                              size="sm"
                              className="w-full bg-blue-600 hover:bg-blue-700 text-xs h-7"
                              onClick={() => onInsertRecommendation && onInsertRecommendation(assessment.documentation_template)}
                            >
                              <Plus className="w-3 h-3 mr-1" /> Use Documentation Template
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Vital Concerns - Enhanced Display */}
              {proactiveAlerts.vital_concerns?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-800 mb-1 flex items-center gap-1">
                    <HeartPulse className="w-3 h-3" /> Vital Sign Clinical Guidance
                  </p>
                  {proactiveAlerts.vital_concerns.map((vc, idx) => (
                    <Card key={idx} className={`border-l-4 mb-2 ${
                      vc.severity === 'high' ? 'border-l-red-500 bg-red-50' :
                      vc.severity === 'medium' ? 'border-l-orange-500 bg-orange-50' :
                      'border-l-yellow-500 bg-yellow-50'
                    }`}>
                      <CardContent className="p-2">
                        <div className="flex items-start justify-between mb-1">
                          <p className="text-xs font-bold">{vc.vital}: {vc.value}</p>
                          {vc.physician_notification_needed && (
                            <Badge className="bg-red-600 text-white text-xs">
                              <Phone className="w-3 h-3 mr-1" /> Notify MD
                            </Badge>
                          )}
                        </div>
                        <p className="text-xs text-slate-700 mb-1">{vc.concern}</p>
                        <div className="bg-white p-2 rounded border">
                          <p className="text-xs font-semibold mb-1">Immediate Action:</p>
                          <p className="text-xs text-slate-700">{vc.immediate_action}</p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* PATIENT EDUCATION THIS VISIT */}
              {proactiveAlerts.patient_education_now?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1">
                    <BookOpen className="w-4 h-4" /> Education to Provide This Visit
                  </p>
                  {proactiveAlerts.patient_education_now.map((ed, idx) => (
                    <Card key={idx} className="border-l-4 border-l-green-500 mb-2">
                      <CardContent className="p-3">
                        <p className="text-sm font-semibold text-slate-900 mb-2">{ed.topic}</p>
                        <div className="bg-green-50 p-2 rounded border border-green-200 mb-2">
                          <p className="text-xs font-semibold text-green-900 mb-1">Key Teaching Points:</p>
                          <ul className="text-xs text-slate-700 space-y-0.5">
                            {ed.specific_teaching_points?.map((point, i) => (
                              <li key={i}>• {point}</li>
                            ))}
                          </ul>
                        </div>
                        {ed.demonstration_needed && (
                          <Badge className="bg-blue-100 text-blue-800 text-xs mb-2">
                            <Activity className="w-3 h-3 mr-1" /> Demonstration Recommended
                          </Badge>
                        )}
                        <div className="bg-navy-50 p-2 rounded border border-navy-200 mb-2">
                          <p className="text-xs font-semibold text-navy-900 mb-1">Teach-Back Question:</p>
                          <p className="text-xs italic text-navy-800">"{ed.teach_back_question}"</p>
                        </div>
                        {ed.handout_recommendation && (
                          <p className="text-xs text-slate-600">💡 Handout: {ed.handout_recommendation}</p>
                        )}
                        <Button
                          size="sm"
                          className="w-full bg-green-600 hover:bg-green-700 text-xs h-7 mt-2"
                          onClick={() => onInsertRecommendation && onInsertRecommendation(
                            `Patient education provided on ${ed.topic}. Key points covered: ${ed.specific_teaching_points?.join('; ')}. Teach-back completed - patient ${ed.demonstration_needed ? 'demonstrated understanding and' : ''} verbalized understanding of ${ed.topic}.`
                          )}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Document Education Provided
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* EVIDENCE-BASED INTERVENTIONS */}
              {proactiveAlerts.evidence_based_interventions?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-indigo-800 mb-2 flex items-center gap-1">
                    <Stethoscope className="w-4 h-4" /> Evidence-Based Interventions to Consider
                  </p>
                  {proactiveAlerts.evidence_based_interventions.map((intervention, idx) => (
                    <Card key={idx} className="border-l-4 border-l-indigo-500 mb-2">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between mb-1">
                          <p className="text-sm font-semibold text-slate-900">{intervention.intervention}</p>
                          <Badge className={getPriorityColor(intervention.priority)}>
                            {intervention.priority}
                          </Badge>
                        </div>
                        <div className="bg-indigo-50 p-2 rounded border border-indigo-200 mb-2">
                          <p className="text-xs font-semibold text-indigo-900 mb-1">Clinical Indication:</p>
                          <p className="text-xs text-slate-700">{intervention.clinical_indication}</p>
                        </div>
                        <div className="bg-blue-50 p-2 rounded border border-blue-200 mb-2">
                          <p className="text-xs font-semibold text-blue-900 mb-1">How to Perform:</p>
                          <p className="text-xs text-slate-700">{intervention.how_to_perform}</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <BookOpen className="w-3 h-3 text-slate-500 mt-0.5 flex-shrink-0" />
                          <p className="text-xs text-slate-600 italic">{intervention.evidence_source}</p>
                        </div>
                        <p className="text-xs text-green-700 mt-1">Expected: {intervention.expected_outcome}</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* NEXT VISIT PLANNING */}
              {proactiveAlerts.next_visit_planning?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-navy-800 mb-1 flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> Plan for Next Visit
                  </p>
                  <div className="bg-navy-50 p-2 rounded border border-navy-200">
                    <ul className="text-xs text-slate-700 space-y-1">
                      {proactiveAlerts.next_visit_planning.map((item, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="font-semibold text-navy-800">•</span>
                          <div>
                            <p className="font-medium">{item.item_to_monitor}</p>
                            <p className="text-slate-600">{item.why} - Check {item.timeframe}</p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Original CDS section for enhanced notes */}
          {!cdsAlerts && !isAnalyzing && enhancedNote && (
            <Button
              onClick={analyzeForCDS}
              disabled={!enhancedNote || enhancedNote.length < 50}
              className="w-full bg-navy-600 hover:bg-navy-700"
              size="sm"
            >
              <ShieldAlert className="w-4 h-4 mr-2" />
              Analyze for Clinical Alerts
            </Button>
          )}

          {!enhancedNote && !proactiveAlerts && !isProactiveAnalyzing && (
            <div className="text-center py-3 text-slate-500">
              <Lightbulb className="w-6 h-6 mx-auto mb-1 text-slate-300" />
              <p className="text-xs">Enter vitals, diagnosis, or notes to get proactive clinical suggestions</p>
            </div>
          )}

          {isAnalyzing && (
            <div className="flex items-center justify-center py-4 text-navy-600">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Analyzing clinical data...</span>
            </div>
          )}

          {cdsAlerts && (
            <div className="space-y-3">
              {/* Drug Interactions */}
              {cdsAlerts.drug_interactions?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-800 mb-1 flex items-center gap-1">
                    <Pill className="w-3 h-3" /> Drug Interactions ({cdsAlerts.drug_interactions.length})
                  </p>
                  {cdsAlerts.drug_interactions.map((di, idx) => (
                    <Alert key={idx} className={`mb-1 ${getSeverityColor(di.severity)}`}>
                      <AlertTriangle className="w-3 h-3" />
                      <AlertDescription className="text-xs">
                        <strong>{di.drugs.join(' + ')}</strong>: {di.interaction}
                        <p className="mt-1 text-slate-700">→ {di.recommendation}</p>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {/* Contraindications */}
              {cdsAlerts.contraindications?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-orange-800 mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Contraindications ({cdsAlerts.contraindications.length})
                  </p>
                  {cdsAlerts.contraindications.map((ci, idx) => (
                    <Alert key={idx} className={`mb-1 ${getSeverityColor(ci.severity)}`}>
                      <AlertDescription className="text-xs">
                        <strong>{ci.item}</strong>: {ci.reason}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {/* Vital Sign Alerts */}
              {cdsAlerts.vital_sign_alerts?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-800 mb-1 flex items-center gap-1">
                    <HeartPulse className="w-3 h-3" /> Vital Sign Alerts
                  </p>
                  {cdsAlerts.vital_sign_alerts.map((va, idx) => (
                    <div key={idx} className="bg-red-50 p-2 rounded border border-red-200 mb-1">
                      <p className="text-xs font-medium">{va.vital}: {va.value}</p>
                      <p className="text-xs text-slate-600">{va.concern}</p>
                      <p className="text-xs text-red-700 font-medium">→ {va.action}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Best Practice Alerts */}
              {cdsAlerts.best_practice_alerts?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-yellow-800 mb-1 flex items-center gap-1">
                    <Stethoscope className="w-3 h-3" /> Best Practice Deviations
                  </p>
                  {cdsAlerts.best_practice_alerts.map((bp, idx) => (
                    <div key={idx} className="bg-yellow-50 p-2 rounded border border-yellow-200 mb-1">
                      <p className="text-xs font-medium">{bp.issue}</p>
                      <p className="text-xs text-slate-600 italic">Guideline: {bp.guideline}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 text-xs mt-1 text-yellow-800"
                        onClick={() => onInsertRecommendation && onInsertRecommendation(`\n\n[Best Practice Note: ${bp.recommendation}]`)}
                      >
                        + Add recommendation to note
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Suggested Diagnostics */}
              {cdsAlerts.suggested_diagnostics?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-blue-800 mb-1 flex items-center gap-1">
                    <FlaskConical className="w-3 h-3" /> Suggested Diagnostics
                  </p>
                  <div className="space-y-1">
                    {cdsAlerts.suggested_diagnostics.map((sd, idx) => (
                      <div key={idx} className="bg-blue-50 p-2 rounded border border-blue-200 flex items-start justify-between">
                        <div>
                          <p className="text-xs font-medium">{sd.test}</p>
                          <p className="text-xs text-slate-600">{sd.rationale}</p>
                        </div>
                        <Badge className={getSeverityColor(sd.priority)} variant="outline">
                          {sd.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Intervention Recommendations */}
              {cdsAlerts.intervention_recommendations?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-800 mb-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Recommended Interventions
                  </p>
                  <div className="space-y-1">
                    {cdsAlerts.intervention_recommendations.map((ir, idx) => (
                      <div key={idx} className="bg-green-50 p-2 rounded border border-green-200">
                        <div className="flex items-start justify-between">
                          <p className="text-xs font-medium">{ir.intervention}</p>
                          <Badge className={getSeverityColor(ir.priority)} variant="outline">
                            {ir.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-slate-600 italic">{ir.evidence}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 text-xs mt-1 text-green-800"
                          onClick={() => onInsertRecommendation && onInsertRecommendation(`\n\n[Intervention: ${ir.intervention}]`)}
                        >
                          + Add to note
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Alerts */}
              {!hasAlerts && cdsAlerts.suggested_diagnostics?.length === 0 && cdsAlerts.intervention_recommendations?.length === 0 && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-xs text-green-800">
                    No clinical alerts identified. Documentation appears to follow best practices.
                  </AlertDescription>
                </Alert>
              )}

              {/* Summary */}
              {cdsAlerts.summary && (
                <div className="bg-slate-50 p-2 rounded border text-xs text-slate-700">
                  <strong>Summary:</strong> {cdsAlerts.summary}
                </div>
              )}

              {/* Refresh Button */}
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={analyzeForCDS}
                disabled={isAnalyzing}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Re-analyze
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
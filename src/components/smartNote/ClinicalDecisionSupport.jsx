import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
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
  Shield,
  Plus,
  Eye,
  Wind,
  Thermometer,
  Activity,
  Scale,
  Droplet,
  Brain,
  Zap,
  Phone
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

  // Rule-based immediate alerts that don't require AI
  useEffect(() => {
    const alerts = generateImmediateAlerts();
    setImmediateAlerts(alerts);
  }, [vitalSigns, diagnosis, roughNote]);

  // Generate immediate rule-based alerts
  const generateImmediateAlerts = () => {
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
  };

  // Proactive analysis based on vitals, diagnosis, and rough note (before enhancement)
  useEffect(() => {
    const contextKey = `${diagnosis}-${JSON.stringify(vitalSigns)}-${roughNote?.slice(0, 100)}`;
    if (contextKey !== lastProactiveContext && (diagnosis || vitalSigns?.bp || vitalSigns?.hr || (roughNote && roughNote.length > 30))) {
      const timer = setTimeout(() => {
        runProactiveAnalysis();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [diagnosis, vitalSigns, roughNote]);

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
  }, [enhancedNote]);

  const runProactiveAnalysis = async () => {
    if (!diagnosis && !vitalSigns?.bp && !vitalSigns?.hr && (!roughNote || roughNote.length < 30)) return;
    
    setIsProactiveAnalyzing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a proactive Clinical Decision Support AI for home health nursing. Based on the EARLY information available (before full documentation), identify potential issues and suggest assessments/interventions the nurse should consider.

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

PROACTIVELY IDENTIFY:
1. VITAL SIGN CONCERNS: Flag abnormal vitals and what to watch for
2. DIAGNOSIS-SPECIFIC ASSESSMENTS: What assessments should definitely be done for this diagnosis?
3. POTENTIAL MISSED ELEMENTS: Based on notes so far, what might the nurse be forgetting to document/assess?
4. PATIENT EDUCATION OPPORTUNITIES: What education points are critical for this diagnosis?
5. SAFETY CONSIDERATIONS: Any safety checks that should be performed?
6. RECOMMENDED INTERVENTIONS: What interventions should be considered based on what we know?

Be helpful and proactive - catch issues BEFORE they become problems. Keep suggestions practical for home health setting.

Return JSON:
{
  "vital_concerns": [
    {
      "vital": "Which vital",
      "value": "The value if abnormal",
      "concern": "Why this is concerning",
      "action": "What to do",
      "severity": "high" | "medium" | "low"
    }
  ],
  "required_assessments": [
    {
      "assessment": "Assessment name",
      "rationale": "Why this is important for this patient",
      "priority": "high" | "medium" | "low"
    }
  ],
  "potentially_missed": [
    {
      "element": "What might be missed",
      "why_important": "Why this matters",
      "suggested_text": "Example text to add to notes"
    }
  ],
  "education_points": [
    {
      "topic": "Education topic",
      "key_points": "Key points to cover",
      "teach_back": "Suggested teach-back question"
    }
  ],
  "safety_checks": [
    {
      "check": "Safety check to perform",
      "rationale": "Why this is important"
    }
  ],
  "suggested_interventions": [
    {
      "intervention": "Intervention name",
      "rationale": "Why recommended",
      "priority": "high" | "medium" | "low"
    }
  ],
  "quick_summary": "One sentence summary of key proactive alerts"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            vital_concerns: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  vital: { type: "string" },
                  value: { type: "string" },
                  concern: { type: "string" },
                  action: { type: "string" },
                  severity: { type: "string" }
                }
              }
            },
            required_assessments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  assessment: { type: "string" },
                  rationale: { type: "string" },
                  priority: { type: "string" }
                }
              }
            },
            potentially_missed: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  element: { type: "string" },
                  why_important: { type: "string" },
                  suggested_text: { type: "string" }
                }
              }
            },
            education_points: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  topic: { type: "string" },
                  key_points: { type: "string" },
                  teach_back: { type: "string" }
                }
              }
            },
            safety_checks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  check: { type: "string" },
                  rationale: { type: "string" }
                }
              }
            },
            suggested_interventions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  intervention: { type: "string" },
                  rationale: { type: "string" },
                  priority: { type: "string" }
                }
              }
            },
            quick_summary: { type: "string" }
          }
        }
      });
      
      setProactiveAlerts(result);
      setLastProactiveContext(`${diagnosis}-${JSON.stringify(vitalSigns)}-${roughNote?.slice(0, 100)}`);
    } catch (error) {
      console.error("Error in proactive CDS analysis:", error);
    }
    setIsProactiveAnalyzing(false);
  };

  const analyzeForCDS = async () => {
    if (!enhancedNote || enhancedNote.length < 50) return;

    setIsAnalyzing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
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
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'high': return 'bg-red-600';
      case 'moderate': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const hasAlerts = cdsAlerts && (
    cdsAlerts.drug_interactions?.length > 0 ||
    cdsAlerts.contraindications?.length > 0 ||
    cdsAlerts.vital_sign_alerts?.length > 0 ||
    cdsAlerts.best_practice_alerts?.length > 0
  );

  const totalAlerts = cdsAlerts ? (
    (cdsAlerts.drug_interactions?.length || 0) +
    (cdsAlerts.contraindications?.length || 0) +
    (cdsAlerts.vital_sign_alerts?.length || 0) +
    (cdsAlerts.best_practice_alerts?.length || 0)
  ) : 0;

  const hasProactiveAlerts = proactiveAlerts && (
    proactiveAlerts.vital_concerns?.length > 0 ||
    proactiveAlerts.required_assessments?.length > 0 ||
    proactiveAlerts.potentially_missed?.length > 0 ||
    proactiveAlerts.education_points?.length > 0 ||
    proactiveAlerts.safety_checks?.length > 0 ||
    proactiveAlerts.suggested_interventions?.length > 0
  );

  const totalProactiveItems = proactiveAlerts ? (
    (proactiveAlerts.vital_concerns?.length || 0) +
    (proactiveAlerts.required_assessments?.length || 0) +
    (proactiveAlerts.potentially_missed?.length || 0) +
    (proactiveAlerts.education_points?.length || 0)
  ) : 0;

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className={`border-2 ${hasAlerts ? 'border-red-300' : hasProactiveAlerts ? 'border-amber-300' : 'border-purple-200'}`}>
      <CardHeader 
        className={`py-3 cursor-pointer ${hasAlerts ? 'bg-gradient-to-r from-red-50 to-orange-50' : hasProactiveAlerts ? 'bg-gradient-to-r from-amber-50 to-yellow-50' : 'bg-gradient-to-r from-purple-50 to-indigo-50'}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className={`w-4 h-4 ${hasAlerts ? 'text-red-600' : hasProactiveAlerts ? 'text-amber-600' : 'text-purple-600'}`} />
            Clinical Decision Support
            {isProactiveAnalyzing && <Loader2 className="w-3 h-3 animate-spin text-amber-600" />}
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
            {!cdsAlerts && totalProactiveItems > 0 && (
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

          {/* Proactive Alerts Section - Shows before enhanced note */}
          {!enhancedNote && proactiveAlerts && hasProactiveAlerts && (
            <div className="space-y-3">
              {proactiveAlerts.quick_summary && (
                <Alert className="bg-amber-50 border-amber-200">
                  <Lightbulb className="w-4 h-4 text-amber-600" />
                  <AlertDescription className="text-xs text-amber-800">
                    <strong>Proactive Alert:</strong> {proactiveAlerts.quick_summary}
                  </AlertDescription>
                </Alert>
              )}

              {/* Vital Concerns */}
              {proactiveAlerts.vital_concerns?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-800 mb-1 flex items-center gap-1">
                    <HeartPulse className="w-3 h-3" /> Vital Sign Concerns
                  </p>
                  {proactiveAlerts.vital_concerns.map((vc, idx) => (
                    <div key={idx} className={`p-2 rounded border mb-1 ${getPriorityColor(vc.severity)}`}>
                      <p className="text-xs font-medium">{vc.vital}: {vc.value}</p>
                      <p className="text-xs text-gray-700">{vc.concern}</p>
                      <p className="text-xs font-medium mt-1">→ {vc.action}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Required Assessments */}
              {proactiveAlerts.required_assessments?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-blue-800 mb-1 flex items-center gap-1">
                    <Eye className="w-3 h-3" /> Recommended Assessments for {diagnosis || 'This Patient'}
                  </p>
                  <div className="space-y-1">
                    {proactiveAlerts.required_assessments.map((ra, idx) => (
                      <div key={idx} className="bg-blue-50 p-2 rounded border border-blue-200 flex items-start justify-between">
                        <div className="flex-1">
                          <p className="text-xs font-medium">{ra.assessment}</p>
                          <p className="text-xs text-gray-600">{ra.rationale}</p>
                        </div>
                        <Badge className={getPriorityColor(ra.priority)} variant="outline">
                          {ra.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Potentially Missed Elements */}
              {proactiveAlerts.potentially_missed?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-orange-800 mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Don't Forget to Document
                  </p>
                  {proactiveAlerts.potentially_missed.map((pm, idx) => (
                    <div key={idx} className="bg-orange-50 p-2 rounded border border-orange-200 mb-1">
                      <p className="text-xs font-medium">{pm.element}</p>
                      <p className="text-xs text-gray-600">{pm.why_important}</p>
                      {pm.suggested_text && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 text-xs mt-1 text-orange-800"
                          onClick={() => onInsertRecommendation && onInsertRecommendation(pm.suggested_text)}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Add to notes
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Patient Education Points */}
              {proactiveAlerts.education_points?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-800 mb-1 flex items-center gap-1">
                    <BookOpen className="w-3 h-3" /> Patient Education Opportunities
                  </p>
                  {proactiveAlerts.education_points.map((ep, idx) => (
                    <div key={idx} className="bg-green-50 p-2 rounded border border-green-200 mb-1">
                      <p className="text-xs font-medium">{ep.topic}</p>
                      <p className="text-xs text-gray-600">{ep.key_points}</p>
                      {ep.teach_back && (
                        <p className="text-xs text-green-700 mt-1 italic">Teach-back: "{ep.teach_back}"</p>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 text-xs mt-1 text-green-800"
                        onClick={() => onInsertRecommendation && onInsertRecommendation(`Patient education provided on ${ep.topic}. ${ep.key_points} Patient verbalized understanding.`)}
                      >
                        <Plus className="w-3 h-3 mr-1" /> Add education to notes
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Safety Checks */}
              {proactiveAlerts.safety_checks?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-purple-800 mb-1 flex items-center gap-1">
                    <Shield className="w-3 h-3" /> Safety Checks
                  </p>
                  <div className="space-y-1">
                    {proactiveAlerts.safety_checks.map((sc, idx) => (
                      <div key={idx} className="bg-purple-50 p-2 rounded border border-purple-200">
                        <p className="text-xs font-medium">{sc.check}</p>
                        <p className="text-xs text-gray-600">{sc.rationale}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Interventions from Proactive */}
              {proactiveAlerts.suggested_interventions?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-indigo-800 mb-1 flex items-center gap-1">
                    <Stethoscope className="w-3 h-3" /> Consider These Interventions
                  </p>
                  {proactiveAlerts.suggested_interventions.map((si, idx) => (
                    <div key={idx} className="bg-indigo-50 p-2 rounded border border-indigo-200 mb-1 flex items-start justify-between">
                      <div>
                        <p className="text-xs font-medium">{si.intervention}</p>
                        <p className="text-xs text-gray-600">{si.rationale}</p>
                      </div>
                      <Badge className={getPriorityColor(si.priority)} variant="outline">
                        {si.priority}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Original CDS section for enhanced notes */}
          {!cdsAlerts && !isAnalyzing && enhancedNote && (
            <Button
              onClick={analyzeForCDS}
              disabled={!enhancedNote || enhancedNote.length < 50}
              className="w-full bg-purple-600 hover:bg-purple-700"
              size="sm"
            >
              <ShieldAlert className="w-4 h-4 mr-2" />
              Analyze for Clinical Alerts
            </Button>
          )}

          {!enhancedNote && !proactiveAlerts && !isProactiveAnalyzing && (
            <div className="text-center py-3 text-gray-500">
              <Lightbulb className="w-6 h-6 mx-auto mb-1 text-gray-300" />
              <p className="text-xs">Enter vitals, diagnosis, or notes to get proactive clinical suggestions</p>
            </div>
          )}

          {isAnalyzing && (
            <div className="flex items-center justify-center py-4 text-purple-600">
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
                        <p className="mt-1 text-gray-700">→ {di.recommendation}</p>
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
                      <p className="text-xs text-gray-600">{va.concern}</p>
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
                      <p className="text-xs text-gray-600 italic">Guideline: {bp.guideline}</p>
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
                          <p className="text-xs text-gray-600">{sd.rationale}</p>
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
                        <p className="text-xs text-gray-600 italic">{ir.evidence}</p>
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
                <div className="bg-gray-50 p-2 rounded border text-xs text-gray-700">
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
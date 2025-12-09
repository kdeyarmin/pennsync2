import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { trackAISuggestion, categorizeAISuggestion } from "../training/SuggestionTracker";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { logActivity, ActivityActions } from "@/components/utils/activityLogger";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  CheckCircle2,
  AlertCircle,
  XCircle,
  Plus,
  ChevronDown,
  ChevronUp,
  Loader2,
  Lightbulb,
  X,
  Ban,
  Copy,
  Check,
  Pencil,
  History,
  RotateCcw,
  FileText,
  Zap,
  Info,
  BookOpen,
  ExternalLink,
  GraduationCap,
  Search
} from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function ComplianceScoreIndicator({
  roughNote,
  enhancedNote,
  careType,
  visitType,
  diagnosis,
  vitalSigns,
  patientContext,
  onInsertElement,
  onUpdateEnhancedNote,
  onFlaggedIssues,
  onRoughNoteCompliance,
  onEnhancedNoteCompliance,
  onDismissedElements,
  onFixAllAndReEnhance
}) {
  const [complianceData, setComplianceData] = useState(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [enhancedComplianceData, setEnhancedComplianceData] = useState(null);
  const [isAnalyzingEnhanced, setIsAnalyzingEnhanced] = useState(false);
  const [insertedIssues, setInsertedIssues] = useState(new Set());
  const [isReadyToPaste, setIsReadyToPaste] = useState(false);
  const [selectedSuggestions, setSelectedSuggestions] = useState(new Set());
  const [dismissedElements, setDismissedElements] = useState(new Set());
  const [editingSuggestion, setEditingSuggestion] = useState(null);
  const [editedTexts, setEditedTexts] = useState({});
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [enhancedNoteHistory, setEnhancedNoteHistory] = useState([]);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedEnhancedIssues, setSelectedEnhancedIssues] = useState(new Set());
  const [isFixingAll, setIsFixingAll] = useState(false);
  const [highlightedText, setHighlightedText] = useState(null);

  // Condition-specific assessment requirements
  const conditionSpecificAssessments = {
    // CHF / Heart Failure
    'CHF': {
      vitals: 'daily weight monitoring, bilateral lower extremity edema assessment (grade 0-4+), jugular venous distension (JVD) assessment, orthopnea evaluation',
      assessment: 'cardiovascular: S1/S2 heart sounds, presence of S3 gallop, bilateral pedal edema measured in cm, capillary refill, peripheral pulses (2+ bilaterally), skin color and temperature of extremities. Respiratory: lung sounds bilateral bases for crackles/rales indicating fluid overload, work of breathing, use of accessory muscles. Fluid status: daily weight trend, intake/output if monitored, sodium restriction compliance',
      skilled: 'CHF exacerbation monitoring, fluid status assessment, medication titration education (diuretics, ACE inhibitors, beta-blockers), sodium-restricted diet teaching, daily weight monitoring instruction, recognition of worsening symptoms (increased dyspnea, weight gain >2-3 lbs/day, increased edema)',
      homebound: 'severe activity intolerance secondary to CHF with dyspnea on minimal exertion, unable to ambulate more than 10-15 feet without significant shortness of breath and fatigue requiring rest'
    },
    'HEART FAILURE': { /* alias for CHF */ },
    'CONGESTIVE': { /* alias for CHF */ },
    
    // COPD
    'COPD': {
      vitals: 'oxygen saturation on room air and on supplemental O2 if applicable, respiratory rate, work of breathing assessment, peak flow if ordered',
      assessment: 'respiratory: bilateral lung sounds (wheezes, rhonchi, diminished breath sounds), accessory muscle use, pursed-lip breathing, barrel chest, cyanosis assessment, cough productivity and sputum characteristics (color, consistency, amount). Cardiovascular: heart rate, presence of cor pulmonale signs',
      skilled: 'COPD exacerbation monitoring, inhaler technique assessment and education, oxygen therapy management, breathing exercises (pursed-lip, diaphragmatic), energy conservation techniques, smoking cessation if applicable, recognition of exacerbation triggers and warning signs',
      homebound: 'severe dyspnea on exertion secondary to COPD requiring supplemental oxygen, unable to leave home without significant respiratory distress and desaturation, requires frequent rest periods'
    },
    'CHRONIC OBSTRUCTIVE': { /* alias for COPD */ },
    
    // Diabetes
    'DIABETES': {
      vitals: 'blood glucose reading if available, blood pressure (target <130/80 for diabetics)',
      assessment: 'integumentary: bilateral lower extremity skin assessment, diabetic foot exam (pedal pulses, sensation testing with monofilament, skin integrity between toes, callus formation, nail condition), wound assessment if present. Neurological: peripheral neuropathy assessment (numbness, tingling, burning sensations)',
      skilled: 'blood glucose monitoring and log review, insulin administration technique if applicable, hypoglycemia/hyperglycemia recognition and treatment, diabetic diet education, foot care instruction, A1C goal discussion, medication compliance assessment',
      homebound: 'diabetic neuropathy affecting balance and gait safety, visual impairment secondary to diabetic retinopathy limiting safe ambulation outside home'
    },
    'DIABETIC': { /* alias */ },
    'DM': { /* alias */ },
    
    // Wound Care
    'WOUND': {
      vitals: 'temperature to monitor for infection',
      assessment: 'wound assessment: location, dimensions (length x width x depth in cm), wound bed appearance (granulation, slough, eschar percentage), exudate (type, amount, odor), periwound skin condition (maceration, erythema, induration), undermining/tunneling if present, pain level at wound site',
      skilled: 'wound care requiring skilled nursing assessment and judgment, wound measurement and staging, dressing change per physician orders, infection monitoring, debridement if ordered, wound vac management if applicable, patient/caregiver wound care education',
      homebound: 'wound care requirements necessitate remaining homebound to prevent contamination and promote healing, mobility limitations due to wound location'
    },
    'PRESSURE': { /* alias for wound */ },
    'ULCER': { /* alias */ },
    
    // Stroke / CVA
    'STROKE': {
      vitals: 'blood pressure monitoring (critical for stroke patients), neurological vital signs',
      assessment: 'neurological: level of consciousness, orientation, speech/language assessment (aphasia type if present), facial symmetry, motor strength bilateral upper and lower extremities (grade 0-5), sensation, coordination, swallowing assessment/dysphagia screening, safety awareness',
      skilled: 'stroke recovery monitoring, fall prevention assessment, ADL retraining, communication strategies if aphasia present, swallowing precautions, medication compliance (anticoagulants, antihypertensives), caregiver training for safe transfers and mobility',
      homebound: 'residual weakness and balance deficits from CVA limiting safe ambulation, requires assistance for all mobility, high fall risk'
    },
    'CVA': { /* alias */ },
    'CEREBROVASCULAR': { /* alias */ },
    
    // Hypertension
    'HYPERTENSION': {
      vitals: 'blood pressure in both arms if indicated, orthostatic blood pressure measurements (lying, sitting, standing)',
      assessment: 'cardiovascular: blood pressure trend analysis, heart rate and rhythm, presence of headache or visual changes, peripheral edema',
      skilled: 'blood pressure monitoring and medication effectiveness assessment, antihypertensive medication education (purpose, side effects, importance of compliance), lifestyle modification teaching (DASH diet, sodium restriction, exercise, stress management, smoking cessation)',
      homebound: 'uncontrolled hypertension with risk of hypertensive crisis, dizziness and orthostatic hypotension affecting safe ambulation'
    },
    'HTN': { /* alias */ },
    
    // Cancer / Oncology
    'CANCER': {
      vitals: 'temperature (infection risk due to immunosuppression), pain assessment using appropriate scale',
      assessment: 'general: nutritional status, weight trend, fatigue level, performance status. Integumentary: skin integrity, mucositis if on chemotherapy, surgical site if applicable. Pain: location, quality, intensity, aggravating/alleviating factors',
      skilled: 'symptom management, pain control assessment, medication administration and education, nutritional support, coordination with oncology team, emotional support, advance care planning discussions if appropriate',
      homebound: 'severe fatigue and weakness secondary to cancer treatment/disease progression, immunocompromised status requiring limited exposure to public settings'
    },
    'ONCOLOGY': { /* alias */ },
    'MALIGNANCY': { /* alias */ }
  };

  // Function to detect conditions from diagnosis text
  const detectConditions = (diagnosisText) => {
    if (!diagnosisText) return [];
    const upperDx = diagnosisText.toUpperCase();
    const detected = [];
    
    for (const condition of Object.keys(conditionSpecificAssessments)) {
      if (upperDx.includes(condition)) {
        detected.push(condition);
      }
    }
    
    // Map aliases to primary conditions
    const aliasMap = {
      'HEART FAILURE': 'CHF', 'CONGESTIVE': 'CHF',
      'CHRONIC OBSTRUCTIVE': 'COPD',
      'DIABETIC': 'DIABETES', 'DM': 'DIABETES',
      'PRESSURE': 'WOUND', 'ULCER': 'WOUND',
      'CVA': 'STROKE', 'CEREBROVASCULAR': 'STROKE',
      'HTN': 'HYPERTENSION',
      'ONCOLOGY': 'CANCER', 'MALIGNANCY': 'CANCER'
    };
    
    return [...new Set(detected.map(c => aliasMap[c] || c))];
  };

  // Educational resources mapping
  const educationalResources = {
    "HOMEBOUND STATUS": {
      title: "Medicare Homebound Requirements",
      links: [
        { text: "CMS Homebound Status Guidelines", url: "https://www.cms.gov/medicare/payment/fee-schedules/home-health-pps" },
        { text: "What Qualifies as Homebound?", url: "https://www.cms.gov/Outreach-and-Education/Medicare-Learning-Network-MLN/MLNProducts/Downloads/HomeHealthAgencyBene-FactSheet-ICN908804.pdf" }
      ],
      keyPoints: [
        "Patient unable to leave home without considerable and taxing effort",
        "Absences from home must be infrequent and of short duration",
        "Document specific physical limitations and barriers to leaving home",
        "Use measurable criteria (distance, assistance level, symptoms)"
      ]
    },
    "SKILLED NEED": {
      title: "Skilled Nursing Medical Necessity",
      links: [
        { text: "Medicare Skilled Nursing Requirements", url: "https://www.cms.gov/medicare/payment/fee-schedules/home-health-pps" },
        { text: "Documenting Skilled Care", url: "https://www.cms.gov/Regulations-and-Guidance/Guidance/Manuals/Downloads/bp102c07.pdf" }
      ],
      keyPoints: [
        "Must require skills of a licensed nurse",
        "Cannot be safely performed by non-professional personnel",
        "Document clinical judgment and assessment skills",
        "Show complexity of patient's condition and care needs"
      ]
    },
    "PATIENT RESPONSE": {
      title: "Patient/Caregiver Teaching Documentation",
      links: [
        { text: "Teach-Back Method Requirements", url: "https://www.ahrq.gov/health-literacy/improve/precautions/tool2b.html" }
      ],
      keyPoints: [
        "Document specific teaching provided",
        "Use teach-back method to verify understanding",
        "Include patient's verbalization or demonstration",
        "Note barriers to learning and follow-up plan"
      ]
    },
    "VITAL SIGNS": {
      title: "Clinical Assessment Documentation",
      links: [
        { text: "Home Health Documentation Standards", url: "https://www.cms.gov/Regulations-and-Guidance/Guidance/Manuals/Downloads/bp102c07.pdf" }
      ],
      keyPoints: [
        "Document complete set of vital signs",
        "Include condition-specific measurements",
        "Compare to baseline and previous visits",
        "Note clinical significance of findings"
      ]
    }
  };

  const getEducationalResource = (elementName) => {
    const normalized = elementName.toUpperCase();
    for (const [key, resource] of Object.entries(educationalResources)) {
      if (normalized.includes(key) || key.includes(normalized.split(' ')[0])) {
        return resource;
      }
    }
    return null;
  };

  // Default suggestions for missing elements - comprehensive, Medicare-compliant text with explicit headers
  const getDefaultSuggestion = (elementName, type, issueType = 'missing', currentDiagnosis = null) => {
    const detectedConditions = detectConditions(currentDiagnosis || diagnosis);
    const primaryCondition = detectedConditions[0];
    const conditionData = primaryCondition ? conditionSpecificAssessments[primaryCondition] : null;
    
    // Build condition-specific additions
    const buildConditionSpecificText = (baseText, conditionKey) => {
      if (!conditionData || !conditionData[conditionKey]) return baseText;
      return `${baseText} Condition-specific for ${primaryCondition}: ${conditionData[conditionKey]}`;
    };

    // These suggestions include explicit headers/labels that AI will recognize during enhanced note analysis
    const homeHealthDefaults = {
      "HOMEBOUND STATUS": conditionData?.homebound 
        ? `HOMEBOUND STATUS: Patient is homebound due to ${conditionData.homebound}. Leaving home requires considerable and taxing effort due to medical condition. Patient unable to safely access transportation without assistance. Any absence from home is infrequent, short duration, and for medical appointments only.`
        : "HOMEBOUND STATUS: Patient is homebound due to severe dyspnea on exertion, requiring rest after ambulating approximately 15-20 feet. Patient experiences significant fatigue and weakness that limits ability to leave home independently. Leaving home requires considerable and taxing effort due to medical condition. Patient unable to safely access transportation without assistance. Any absence from home is infrequent, short duration, and for medical appointments only.",
      
      "SKILLED NEED": conditionData?.skilled
        ? `SKILLED NURSING NEED: Skilled nursing services required for ${conditionData.skilled}. Assessment, clinical judgment, and teaching require professional nursing skills that cannot be safely performed by non-skilled personnel.`
        : "SKILLED NURSING NEED: Skilled nursing services required for comprehensive assessment of cardiopulmonary status including auscultation of heart and lung sounds, evaluation of peripheral edema and skin integrity, medication reconciliation of complex medication regimen, and patient/caregiver education on disease process and warning signs requiring immediate medical attention. Assessment, clinical judgment, and teaching require professional nursing skills that cannot be safely performed by non-skilled personnel.",
      
      "PATIENT RESPONSE": "PATIENT RESPONSE TO TEACHING/INTERVENTIONS: Patient verbalized understanding of medication schedule, purpose, and potential side effects. Patient correctly demonstrated teach-back of warning signs requiring physician notification. Patient agreed to follow recommended dietary modifications and activity guidelines. Patient expressed commitment to adhering to plan of care and stated understanding of when to contact nurse or physician.",
      
      "FUNCTIONAL STATUS": "FUNCTIONAL STATUS: Patient requires moderate assistance with ADLs including bathing, dressing, and grooming. Ambulates with assistive device (walker/cane) for short distances with supervision due to unsteady gait and fall risk. Limited endurance noted - requires rest periods after 5-10 minutes of activity. Transfers with minimal assistance. Cognitively intact and oriented to person, place, and time.",
      
      "VITAL SIGNS": conditionData?.vitals
        ? `VITAL SIGNS: Complete vital signs obtained including ${conditionData.vitals}. Blood pressure within expected parameters for patient's condition. Heart rate regular. Respiratory rate unlabored. Temperature afebrile. Pain assessed using 0-10 scale.`
        : "VITAL SIGNS: Blood pressure within expected parameters for patient. Heart rate regular. Respiratory rate unlabored. Temperature afebrile. Oxygen saturation adequate on room air. Pain assessed using 0-10 scale - patient reports current pain level.",
      
      "ASSESSMENT FINDINGS": conditionData?.assessment
        ? `ASSESSMENT FINDINGS: Comprehensive skilled nursing assessment completed. ${conditionData.assessment}. Patient reports current condition compared to previous visit.`
        : "ASSESSMENT FINDINGS: Comprehensive skilled nursing assessment completed. Cardiovascular: Heart sounds regular, peripheral pulses palpable, edema assessment completed. Respiratory: Lung sounds clear bilaterally, no acute distress, work of breathing normal. Integumentary: Skin intact, no new lesions or wounds noted. Neurological: Alert and oriented, follows commands appropriately. Patient reports current condition stable since last visit.",
      
      "INTERVENTIONS": conditionData?.skilled
        ? `SKILLED NURSING INTERVENTIONS: Skilled nursing interventions provided including ${conditionData.skilled}. Comprehensive assessment completed, medication reconciliation performed, patient and caregiver education provided on disease management and warning signs, coordination of care with physician and interdisciplinary team.`
        : "SKILLED NURSING INTERVENTIONS: Skilled nursing interventions provided including comprehensive head-to-toe assessment, medication reconciliation and review of all current medications for therapeutic effect and side effects, patient and caregiver education on disease management and warning signs, coordination of care with physician and interdisciplinary team, assessment of home safety and fall prevention measures.",
      
      "PLAN/GOALS": "PLAN OF CARE/GOALS: Continue current plan of care with skilled nursing visits as ordered. Patient progressing toward established goals. Goals reviewed and remain appropriate. Will continue to monitor for signs of improvement or decline. Patient and caregiver understand when to contact nurse or seek emergency care. Next visit scheduled per physician orders. Will reassess progress at next visit and update plan as needed."
    };

    const hospiceDefaults = {
      "TERMINAL PROGNOSIS": "TERMINAL PROGNOSIS: Patient continues to demonstrate decline consistent with terminal diagnosis and 6-month prognosis. Disease progression noted with increased symptom burden including decreased functional status, increased fatigue, decreased appetite and oral intake, and progressive weakness. Patient/family aware of terminal nature of illness and have elected comfort-focused care.",
      "SYMPTOM MANAGEMENT": "SYMPTOM MANAGEMENT: Comprehensive pain and symptom assessment completed. Current pain level assessed using appropriate scale - patient reports pain controlled with current regimen. Assessed for dyspnea, nausea, anxiety, and other distressing symptoms. Comfort medications reviewed for effectiveness. PRN medications available and patient/caregiver instructed on appropriate use.",
      "PATIENT/FAMILY COPING": "PATIENT/FAMILY COPING: Patient and family coping with terminal diagnosis and disease progression. Emotional support provided during visit. Assessed for signs of anticipatory grief and provided appropriate support. Spiritual needs addressed and chaplain services offered/provided. Family verbalizes understanding of disease trajectory and comfort-focused goals.",
      "COMFORT MEASURES": "COMFORT MEASURES: Focus of care remains on quality of life, dignity, and patient comfort. Comfort-focused interventions provided including positioning for comfort, skin care and hygiene assistance, medication administration for symptom relief, and emotional support. Patient's wishes and preferences honored. Environment maintained for patient comfort and safety.",
      "VITAL SIGNS": "VITAL SIGNS: Vital signs assessed as clinically appropriate for hospice care. Monitoring focused on comfort assessment rather than curative intervention. Patient's baseline and current status documented for trending and symptom management purposes.",
      "MEDICATION REVIEW": "MEDICATION REVIEW: Comfort medications reviewed for effectiveness in managing pain and symptoms. PRN medications available and caregiver instructed on indications and administration. Non-essential medications discontinued per physician orders. Medication administration route appropriate for patient's current condition and ability to swallow.",
      "HOSPICE APPROPRIATENESS": "HOSPICE APPROPRIATENESS: Patient continues to meet hospice eligibility criteria with documented decline in functional status and disease progression consistent with terminal prognosis. Decline noted in ability to perform ADLs, nutritional status, and overall strength. Patient/family remain committed to comfort-focused care and goals of hospice.",
      "GOALS OF CARE": "GOALS OF CARE: Goals of care reviewed and confirmed with patient and family. Focus remains on comfort, dignity, and quality of remaining life. Advance directives in place and reviewed. DNR/comfort measures only confirmed. Patient and family understand and agree with comfort-focused plan. Preferences for end-of-life care documented and will be honored."
    };

    const defaults = type === 'hospice' ? hospiceDefaults : homeHealthDefaults;
    
    // Try to match the element name with flexible matching
    const normalizedElement = elementName.toUpperCase().replace(/[^A-Z\s]/g, '');
    for (const [key, value] of Object.entries(defaults)) {
      const normalizedKey = key.replace(/[^A-Z\s]/g, '');
      if (normalizedElement.includes(normalizedKey) || normalizedKey.includes(normalizedElement) ||
          normalizedElement.split(' ').some(word => normalizedKey.includes(word) && word.length > 3)) {
        return value;
      }
    }
    
    // Fallback with more helpful generic text including header
    return `${elementName.toUpperCase()}: Provide specific clinical details including objective findings, patient assessment, interventions performed, patient response to care, and any changes from previous visit. Include measurable data and professional nursing observations that support the skilled nature of the visit.`;
  };

  // Debounced analysis for rough note
  useEffect(() => {
    if (roughNote && roughNote.length > 30) {
      setIsAnalyzingRough(true);
      const timer = setTimeout(() => {
        analyzeCompliance();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [roughNote, careType, visitType]);

  // Auto-analyze enhanced note when it changes and track history
  useEffect(() => {
    if (enhancedNote && enhancedNote.length > 50) {
      // Add to history if it's a new version
      setEnhancedNoteHistory(prev => {
        if (prev.length === 0 || prev[prev.length - 1].content !== enhancedNote) {
          return [...prev.slice(-9), { content: enhancedNote, timestamp: new Date() }];
        }
        return prev;
      });
      
      const timer = setTimeout(() => {
        analyzeEnhancedNote();
      }, 1000);
      return () => clearTimeout(timer);
    }
  }, [enhancedNote]);

  const handleCopySuggestion = (text, idx) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleEditSuggestion = (idx, newText) => {
    setEditedTexts(prev => ({ ...prev, [idx]: newText }));
  };

  const getSuggestionText = (element, idx) => {
    if (editedTexts[idx] !== undefined) return editedTexts[idx];
    return element.suggested_addition || getDefaultSuggestion(element.name, careType);
  };

  const restoreEnhancedNoteVersion = (version) => {
    if (onUpdateEnhancedNote) {
      onUpdateEnhancedNote(version.content);
    }
    setShowHistoryDialog(false);
  };

  const analyzeCompliance = async () => {
    setIsAnalyzing(true);
    try {
      // Build vitals string
      const vitalsString = vitalSigns ? Object.entries(vitalSigns).filter(([k,v]) => v && k !== 'o2Source' && k !== 'o2Flow').map(([k,v]) => {
        if (k === 'o2') {
          const o2Text = `O2 Sat: ${v}`;
          if (vitalSigns.o2Source === 'on_oxygen' && vitalSigns.o2Flow) {
            return `${o2Text} on ${vitalSigns.o2Flow}L O2`;
          } else if (vitalSigns.o2Source === 'on_oxygen') {
            return `${o2Text} on supplemental O2`;
          }
          return `${o2Text} on room air`;
        }
        if (k === 'bp') return `Blood Pressure: ${v}`;
        if (k === 'hr') return `Heart Rate: ${v}`;
        if (k === 'temp') return `Temperature: ${v}`;
        if (k === 'pain') return `Pain: ${v}`;
        return `${k.toUpperCase()}: ${v}`;
      }).join(', ') : '';

      // Build patient context string
      const patientContextStr = patientContext ? `
PATIENT MEDICAL HISTORY & CONTEXT:
- Name: ${patientContext.name || 'Not specified'}
- Primary Diagnosis: ${patientContext.primaryDiagnosis || diagnosis || 'Not specified'}
- Secondary Diagnoses: ${patientContext.secondaryDiagnoses?.join(', ') || 'None listed'}
- Allergies: ${patientContext.allergies || 'None documented'}
- Recent Conditions/Concerns: ${patientContext.recentConditions || 'None noted'}
- Previous Visit Summary: ${patientContext.previousVisitSummary || 'No previous visit data'}
- Active Care Plan Goals: ${patientContext.carePlanGoals?.join('; ') || 'None specified'}
` : '';

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this nursing note for Medicare compliance elements. Generate PERSONALIZED suggestions based on the actual note content AND the patient's medical history.

CARE TYPE: ${careType === 'hospice' ? 'Hospice' : 'Home Health'}
VISIT TYPE: ${visitType}
DIAGNOSIS: ${diagnosis || 'Not specified'}
VITAL SIGNS ENTERED: ${vitalsString || 'None entered'}
${patientContextStr}
ROUGH NOTE:
${roughNote}

Check for these ${careType === 'hospice' ? 'HOSPICE' : 'HOME HEALTH'} required elements:

${careType === 'home_health' ? `
1. HOMEBOUND STATUS - Why patient can't leave home safely
2. SKILLED NEED - Why RN skill/judgment is required
3. PATIENT RESPONSE - How patient responded to teaching/interventions
4. FUNCTIONAL STATUS - ADL/mobility limitations
5. VITAL SIGNS - Basic vitals documented
6. ASSESSMENT FINDINGS - Objective clinical findings
7. INTERVENTIONS - What nursing care was provided
8. PLAN/GOALS - Next steps and goals addressed
` : `
1. TERMINAL PROGNOSIS - Evidence of disease progression
2. SYMPTOM MANAGEMENT - Pain/comfort assessment
3. PATIENT/FAMILY COPING - Emotional/spiritual status
4. COMFORT MEASURES - Quality of life focus
5. VITAL SIGNS - Basic vitals if appropriate
6. MEDICATION REVIEW - Comfort medications
7. HOSPICE APPROPRIATENESS - Continued eligibility
8. GOALS OF CARE - Patient/family wishes
`}

CRITICAL INSTRUCTIONS FOR SUGGESTIONS:
1. READ the rough note carefully and INCORPORATE details mentioned (symptoms, conditions, interventions) into your suggestions
2. If the note mentions SOB/dyspnea, use that in homebound and skilled need suggestions
3. If the note mentions wound care, use that in skilled need and intervention suggestions
4. If the note mentions teaching/education, reference it in patient response suggestions
5. Use the actual diagnosis "${diagnosis || 'the patient\'s condition'}" in relevant suggestions
6. Include the vital signs "${vitalsString || 'documented values'}" where appropriate
7. CRITICAL: Use the PATIENT'S MEDICAL HISTORY to personalize suggestions:
   - If patient has COPD, mention monitoring for COPD exacerbation signs in respiratory assessments
   - If patient has CHF, include fluid status, weight monitoring, and edema assessment
   - If patient has Diabetes, reference blood glucose monitoring and diabetic foot care
   - If patient has wound history, include wound assessment specifics
   - Reference any active care plan goals in the plan/goals section
   - Mention any allergies when discussing medications
   - Build on previous visit findings if available

For EACH element, provide:
- suggested_addition: Personalized clinical text incorporating note details
- why_needed: Brief Medicare/compliance reason (1 sentence)
- problematic_phrasing: If partial/weak, quote the EXACT problematic text from the note and explain why it's insufficient

Return JSON:
{
  "score": 0-100,
  "elements": [
    {
      "name": "Element name",
      "status": "present" | "partial" | "missing",
      "found_text": "Quote from note if present, empty string if missing",
      "suggested_addition": "PERSONALIZED clinical text incorporating details from the rough note - REQUIRED for missing/partial",
      "why_needed": "Brief explanation of why Medicare requires this element (e.g., 'Medicare requires homebound documentation to justify skilled home health services')",
      "problematic_phrasing": "For partial elements: quote the exact weak/non-compliant text and explain the issue (e.g., 'pt at home' - too vague, doesn't explain WHY patient is homebound or taxing effort required)"
    }
  ]
}`,
        response_json_schema: {
          type: "object",
          properties: {
            score: { type: "number" },
            elements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  status: { type: "string" },
                  found_text: { type: "string" },
                  suggested_addition: { type: "string" },
                  why_needed: { type: "string" },
                  problematic_phrasing: { type: "string" }
                }
              }
            }
          }
        }
      });
      setComplianceData(result);
      setRoughNoteComplianceData(result);
      if (onRoughNoteCompliance) {
        onRoughNoteCompliance(result);
      }
    } catch (error) {
      console.error("Compliance analysis error:", error);
    }
    setIsAnalyzing(false);
    setIsAnalyzingRough(false);
  };

  const analyzeEnhancedNote = async () => {
    if (!enhancedNote || enhancedNote.length < 50) return;
    
    setIsAnalyzingEnhanced(true);
    try {
      // Build vitals string for context
      const vitalsString = vitalSigns ? Object.entries(vitalSigns).filter(([k,v]) => v && k !== 'o2Source' && k !== 'o2Flow').map(([k,v]) => {
        if (k === 'o2') {
          const o2Text = `O2 Sat: ${v}`;
          if (vitalSigns.o2Source === 'on_oxygen' && vitalSigns.o2Flow) {
            return `${o2Text} on ${vitalSigns.o2Flow}L O2`;
          } else if (vitalSigns.o2Source === 'on_oxygen') {
            return `${o2Text} on supplemental O2`;
          }
          return `${o2Text} on room air`;
        }
        if (k === 'bp') return `Blood Pressure: ${v}`;
        if (k === 'hr') return `Heart Rate: ${v}`;
        if (k === 'temp') return `Temperature: ${v}`;
        if (k === 'pain') return `Pain: ${v}`;
        return `${k.toUpperCase()}: ${v}`;
      }).join(', ') : '';
      
      const hasVitalsEntered = vitalsString.length > 0;
      
      // Build patient context string for enhanced note analysis
      const patientContextStr = patientContext ? `
PATIENT MEDICAL HISTORY & CONTEXT:
- Name: ${patientContext.name || 'Not specified'}
- Primary Diagnosis: ${patientContext.primaryDiagnosis || diagnosis || 'Not specified'}
- Secondary Diagnoses: ${patientContext.secondaryDiagnoses?.join(', ') || 'None listed'}
- Allergies: ${patientContext.allergies || 'None documented'}
- Active Care Plan Goals: ${patientContext.carePlanGoals?.join('; ') || 'None specified'}
` : '';

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this ENHANCED nursing note for Medicare compliance. Be ACCURATE - only flag elements that are truly missing or weak. Use patient history to identify missing condition-specific assessments.

CARE TYPE: ${careType === 'hospice' ? 'Hospice' : 'Home Health'}
VISIT TYPE: ${visitType}
DIAGNOSIS: ${diagnosis || 'Not specified'}
VITAL SIGNS ENTERED BY USER: ${hasVitalsEntered ? vitalsString : 'None entered'}
${patientContextStr}
ENHANCED NOTE TO ANALYZE:
${enhancedNote}

CRITICAL INSTRUCTIONS FOR ACCURATE ANALYSIS:
1. READ THE ENTIRE NOTE CAREFULLY before determining what is present vs missing
2. If vital signs were entered by the user (shown above), they should be in the note - if the note mentions vitals (BP, HR, temp, O2, pain), mark VITAL SIGNS as PRESENT
3. Look for EQUIVALENT LANGUAGE - documentation doesn't need exact headers:
   - "homebound" OR "unable to leave home" OR "taxing effort" OR "difficulty leaving" = HOMEBOUND STATUS present
   - "skilled" OR "RN assessment" OR "nursing judgment" OR "professional nursing" = SKILLED NEED present  
   - "patient verbalized" OR "teach-back" OR "patient understood" OR "demonstrated understanding" = PATIENT RESPONSE present
   - "ADLs" OR "ambulation" OR "mobility" OR "functional" OR "requires assistance" = FUNCTIONAL STATUS present
   - "assessment" OR "findings" OR "lungs" OR "heart sounds" OR "edema" = ASSESSMENT FINDINGS present
   - "education" OR "taught" OR "instructed" OR "intervention" = INTERVENTIONS present
   - "plan" OR "goals" OR "continue" OR "next visit" OR "follow-up" = PLAN/GOALS present

For ${careType === 'hospice' ? 'HOSPICE' : 'HOME HEALTH'} documentation, check these elements:
${careType === 'home_health' ? `
1. HOMEBOUND STATUS - Why patient can't leave home safely (look for: homebound, taxing effort, unable to leave, difficulty)
2. SKILLED NEED - Why RN skill/judgment is required (look for: skilled, RN assessment, nursing judgment, professional)
3. PATIENT RESPONSE - How patient responded to teaching (look for: verbalized, understood, teach-back, demonstrated)
4. FUNCTIONAL STATUS - ADL/mobility limitations (look for: ADLs, ambulation, mobility, assistance needed)
5. VITAL SIGNS - Basic vitals documented (look for: BP, blood pressure, HR, heart rate, temp, O2, pain)
6. ASSESSMENT FINDINGS - Objective clinical findings (look for: assessment, findings, lungs, heart, edema)
7. INTERVENTIONS - What nursing care was provided (look for: education, taught, instructed, intervention, assessed)
8. PLAN/GOALS - Next steps and goals addressed (look for: plan, goals, continue, next visit, follow-up)
` : `
1. TERMINAL PROGNOSIS - Evidence of disease progression
2. SYMPTOM MANAGEMENT - Pain/comfort assessment  
3. PATIENT/FAMILY COPING - Emotional/spiritual status
4. COMFORT MEASURES - Quality of life focus
5. VITAL SIGNS - Basic vitals if appropriate
6. MEDICATION REVIEW - Comfort medications
7. HOSPICE APPROPRIATENESS - Continued eligibility
8. GOALS OF CARE - Patient/family wishes
`}

ONLY flag issues that are TRULY missing or weak. Do NOT flag elements that ARE present in the note.

PATIENT-SPECIFIC CHECKS (CRITICAL - analyze based on diagnosis):
- If patient has CHF/Heart Failure: Flag VITAL SIGNS as 'weak' if missing daily weight, edema grade (0-4+), JVD assessment. Flag ASSESSMENT as 'weak' if missing bilateral lung sounds for crackles, S3 gallop assessment, peripheral edema measurement in cm, fluid status evaluation
- If patient has COPD: Flag VITAL SIGNS as 'weak' if missing O2 saturation on room air/supplemental O2, respiratory rate. Flag ASSESSMENT as 'weak' if missing bilateral lung sounds (wheezes/rhonchi), accessory muscle use, work of breathing, cyanosis assessment
- If patient has Diabetes: Flag VITAL SIGNS as 'weak' if missing blood glucose. Flag ASSESSMENT as 'weak' if missing diabetic foot exam (pedal pulses, sensation, skin integrity), peripheral neuropathy screening
- If patient has wounds/pressure injuries: Flag ASSESSMENT as 'weak' if missing wound dimensions, wound bed description, exudate characteristics, periwound assessment
- If patient has Stroke/CVA: Flag ASSESSMENT as 'weak' if missing neurological assessment (LOC, motor strength grading, speech, swallowing)
- If patient has Hypertension: Flag VITAL SIGNS as 'weak' if missing BP in proper position, orthostatic measurements if indicated
- Check if active care plan goals are addressed in the note

CRITICAL FOR 'WEAK' OR 'NON_COMPLIANT' SUGGESTIONS:
When generating suggestions for weak/non-compliant issues, you MUST:
1. Identify EXACTLY what is missing based on the diagnosis (e.g., for CHF with only BP/HR documented, the suggestion must specifically add: weight, edema assessment with grading, JVD check, lung sounds for crackles)
2. Reference the patient's specific diagnosis in the suggestion text (e.g., "Weight obtained today: ___ lbs. Daily weight monitoring critical for CHF fluid status assessment.")
3. Use proper medical terminology and grading scales (e.g., "Bilateral lower extremity edema: ___ + pitting, measured at ___ cm above malleolus")
4. Include specific assessment parameters relevant to the condition
5. Be ready to paste directly into documentation

Example for CHF patient with weak VITAL SIGNS (only BP and HR documented):
"VITAL SIGNS - CHF-SPECIFIC: Weight today: ___ lbs (compared to previous: ___ lbs, change: ___ lbs). Weight trend monitored for fluid retention - gain >2-3 lbs in 24 hours or >5 lbs in one week indicates possible CHF exacerbation requiring physician notification. Bilateral lower extremity edema assessed and graded. JVD assessed with patient at 45 degrees."

DO NOT give vague suggestions. Each suggestion must include diagnosis-specific clinical parameters.

Return JSON:
{
  "overall_score": 0-100,
  "flagged_issues": [
    {
      "issue_type": "missing" | "weak" | "non_compliant",
      "element": "Which compliance element",
      "location_hint": "Where the issue is or should be",
      "problem": "What's wrong or missing - be specific",
      "suggestion": "COMPLETE CLINICAL TEXT - Ready to paste. Example: 'HOMEBOUND STATUS: Patient is homebound due to severe dyspnea on exertion secondary to COPD. Patient requires rest after ambulating 10-15 feet. Leaving home requires considerable and taxing effort. Patient unable to safely access transportation without maximum assistance.'",
      "severity": "high" | "medium" | "low"
    }
  ],
  "compliant_elements": ["List ALL elements that ARE documented in the note"],
  "quick_fixes": [],
  "ready_to_paste": true if score >= 85 and no high severity issues
}`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: { type: "number" },
            flagged_issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  issue_type: { type: "string" },
                  element: { type: "string" },
                  location_hint: { type: "string" },
                  problem: { type: "string" },
                  suggestion: { type: "string" },
                  severity: { type: "string" }
                }
              }
            },
            compliant_elements: { type: "array", items: { type: "string" } },
            quick_fixes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  original_text: { type: "string" },
                  improved_text: { type: "string" },
                  reason: { type: "string" }
                }
              }
            },
            ready_to_paste: { type: "boolean" }
          }
        }
      });
      
      setEnhancedComplianceData(result);
      setIsReadyToPaste(result.ready_to_paste || result.overall_score >= 85);
      setInsertedIssues(new Set());
      if (onFlaggedIssues) {
        onFlaggedIssues(result);
      }
      if (onEnhancedNoteCompliance) {
        onEnhancedNoteCompliance(result);
      }

      // Log compliance check
      logActivity(ActivityActions.NOTE_COMPLIANCE_CHECK, {
        note_type: 'enhanced',
        overall_score: result.overall_score,
        flagged_issues: result.flagged_issues?.length,
        page: 'SmartNoteAssistant'
      });
    } catch (error) {
      console.error("Enhanced compliance analysis error:", error);
    }
    setIsAnalyzingEnhanced(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'partial': return <AlertCircle className="w-4 h-4 text-yellow-600" />;
      case 'missing': return <XCircle className="w-4 h-4 text-red-600" />;
      default: return null;
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getProgressColor = (score) => {
    if (score >= 80) return 'bg-green-500';
    if (score >= 60) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getIssueTypeIcon = (type) => {
    switch (type) {
      case 'missing': return <XCircle className="w-4 h-4 text-red-500" />;
      case 'weak': return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'non_compliant': return <AlertCircle className="w-4 h-4 text-orange-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const insertToRoughNote = async (suggestion, issueIdx) => {
    if (!onInsertElement) return;
    
    // Add the suggestion to the rough note for nurse to edit
    onInsertElement('\n\n' + suggestion.trim());
    setInsertedIssues(prev => new Set([...prev, issueIdx]));
    
    // Track this suggestion as a learning opportunity
    const user = await base44.auth.me();
    if (user?.email && enhancedComplianceData?.flagged_issues?.[issueIdx]) {
      const issue = enhancedComplianceData.flagged_issues[issueIdx];
      trackAISuggestion({
        nurseEmail: user.email,
        suggestionType: categorizeAISuggestion(issue.element),
        suggestionText: `${issue.element}: ${issue.problem}`,
        context: suggestion,
        source: 'compliance_checker',
        elementName: issue.element,
        noteSnippet: enhancedNote?.substring(0, 500)
      });
    }
  };

  const handleFixAllAndReEnhance = async () => {
    if (!enhancedComplianceData?.flagged_issues?.length) return;
    
    setIsFixingAll(true);
    
    // Collect all suggestions from flagged issues
    const allSuggestions = enhancedComplianceData.flagged_issues
      .filter((_, idx) => !insertedIssues.has(idx))
      .map(issue => issue.suggestion || getDefaultSuggestion(issue.element, careType, issue.issue_type, diagnosis));
    
    if (allSuggestions.length > 0 && onFixAllAndReEnhance) {
      await onFixAllAndReEnhance(allSuggestions);
    }
    
    setIsFixingAll(false);
  };

  // Don't render if no note content
  if ((!roughNote || roughNote.length < 30) && !enhancedNote) {
    return null;
  }

  // Show analyzing status for rough note
  if (isAnalyzingRough && !roughNoteComplianceData) {
    return (
      <Card className="border-yellow-200 bg-yellow-50 animate-pulse">
        <CardContent className="p-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-yellow-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-yellow-800">Analyzing compliance...</p>
          <p className="text-xs text-yellow-600 mt-1">This will take a few seconds</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50">
      <CardContent className="p-3">
        {/* Rough Note Analysis */}
        {roughNote && roughNote.length >= 30 && (
          <div 
            className="flex items-center justify-between cursor-pointer"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <div className="flex items-center gap-3">
              <div className="text-center">
                <span className={`text-2xl font-bold ${complianceData ? getScoreColor(complianceData.score) : 'text-gray-400'}`}>
                  {isAnalyzing ? '...' : complianceData?.score || '--'}
                </span>
                <p className="text-xs text-gray-500">Compliance</p>
              </div>
              {complianceData && (
                <div className="flex-1 max-w-32">
                  <Progress 
                    value={complianceData.score} 
                    className="h-2"
                    style={{ '--progress-foreground': getProgressColor(complianceData.score) }}
                  />
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              {complianceData && (
                <div className="flex gap-1">
                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    {complianceData.elements?.filter(e => e.status === 'present').length || 0} ✓
                  </Badge>
                  <Badge variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                    {complianceData.elements?.filter(e => e.status === 'missing').length || 0} ✗
                  </Badge>
                </div>
              )}
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </div>
          </div>
        )}

        {isExpanded && complianceData && (
          <div className="mt-3 space-y-2 border-t pt-3">
            {complianceData.elements?.filter(e => e.status !== 'present').length > 1 && (
              <div className="flex justify-between items-center mb-2">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selectedSuggestions.size === complianceData.elements.filter(e => e.status !== 'present').length && selectedSuggestions.size > 0}
                    onChange={(e) => {
                      e.stopPropagation();
                      const missingIndices = complianceData.elements
                        .map((el, i) => el.status !== 'present' ? i : null)
                        .filter(i => i !== null);
                      if (selectedSuggestions.size === missingIndices.length) {
                        setSelectedSuggestions(new Set());
                      } else {
                        setSelectedSuggestions(new Set(missingIndices));
                      }
                    }}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-600">Select All</span>
                </div>
                <Button
                  size="sm"
                  variant="default"
                  className="text-xs bg-blue-600 hover:bg-blue-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    const selectedIndices = Array.from(selectedSuggestions);
                    const textsToAdd = selectedIndices
                      .map(i => complianceData.elements[i])
                      .filter(el => el && el.status !== 'present')
                      .map(el => el.suggested_addition || getDefaultSuggestion(el.name, careType));
                    if (textsToAdd.length > 0) {
                      onInsertElement && onInsertElement(textsToAdd.join('\n\n'));
                      setSelectedSuggestions(new Set());
                    }
                  }}
                  disabled={selectedSuggestions.size === 0}
                >
                  <Plus className="w-3 h-3 mr-1" />
                  Add Selected ({selectedSuggestions.size})
                </Button>
              </div>
            )}
            {complianceData.elements?.filter((_, idx) => !dismissedElements.has(idx)).map((element, idx) => {
              const isSelected = selectedSuggestions.has(idx);
              const suggestion = getSuggestionText(element, idx);
              const isEditing = editingSuggestion === idx;
              
              return (
                <div 
                  key={idx} 
                  className={`rounded border ${
                    element.status === 'present' ? 'bg-green-50 border-green-200' : 
                    element.status === 'partial' ? 'bg-yellow-50 border-yellow-200' : 'bg-red-50 border-red-200'
                  }`}
                >
                  <div className="flex items-start gap-2 p-2">
                    {element.status !== 'present' && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          e.stopPropagation();
                          setSelectedSuggestions(prev => {
                            const next = new Set(prev);
                            if (isSelected) {
                              next.delete(idx);
                            } else {
                              next.add(idx);
                            }
                            return next;
                          });
                        }}
                        className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                    )}
                    {getStatusIcon(element.status)}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold">{element.name}</p>
                      {element.found_text && (
                        <p className="text-xs text-gray-600 italic truncate">"{element.found_text}"</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {element.status !== 'present' && (
                        <>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs px-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              onInsertElement && onInsertElement(suggestion);
                            }}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0 text-gray-400 hover:text-gray-600 hover:bg-gray-100"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDismissedElements(prev => {
                                const next = new Set([...prev, idx]);
                                // Report dismissed element names
                                if (onDismissedElements && complianceData?.elements) {
                                  const names = Array.from(next).map(i => complianceData.elements[i]?.name).filter(Boolean);
                                  onDismissedElements(names);
                                }
                                return next;
                              });
                              setSelectedSuggestions(prev => {
                                const next = new Set(prev);
                                next.delete(idx);
                                return next;
                              });
                            }}
                            title="Not applicable - dismiss this suggestion"
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                  {element.status !== 'present' && (
                    <div className="px-2 pb-2 space-y-2">
                      {/* Granular explanation section with educational resources */}
                      <div className="bg-slate-50 p-2 rounded text-xs border border-slate-200">
                        <div className="flex items-center gap-1 mb-1.5">
                          <Info className="w-3 h-3 text-slate-600" />
                          <p className="font-semibold text-slate-700">Why this matters:</p>
                        </div>
                        <p className="text-slate-600 leading-relaxed mb-2">
                          {element.status === 'missing' 
                            ? `This element is completely missing from your documentation. Medicare auditors specifically look for "${element.name.toLowerCase()}" documentation to verify medical necessity and skilled care requirements.`
                            : `This element is partially documented but lacks the specificity required for Medicare compliance. Vague or incomplete documentation can result in claim denials.`
                          }
                        </p>
                        {(() => {
                          const resource = getEducationalResource(element.name);
                          if (resource) {
                            return (
                              <div className="space-y-2">
                                <div className="flex items-center gap-1 pt-2 border-t border-slate-300">
                                  <GraduationCap className="w-3 h-3 text-indigo-600" />
                                  <p className="font-semibold text-indigo-700">{resource.title}:</p>
                                </div>
                                <ul className="space-y-1 ml-4">
                                  {resource.keyPoints.slice(0, 2).map((point, i) => (
                                    <li key={i} className="text-slate-600 text-[10px] flex items-start gap-1">
                                      <span className="text-indigo-500 mt-0.5">•</span>
                                      <span>{point}</span>
                                    </li>
                                  ))}
                                </ul>
                                <div className="flex flex-wrap gap-1 pt-1">
                                  {resource.links.map((link, i) => (
                                    <a
                                      key={i}
                                      href={link.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 hover:underline"
                                    >
                                      <ExternalLink className="w-2.5 h-2.5" />
                                      {link.text}
                                    </a>
                                  ))}
                                </div>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>

                      {/* Problematic phrasing callout with highlighting */}
                      {element.problematic_phrasing && (
                        <div className="bg-red-50 p-2 rounded text-xs border border-red-200">
                          <p className="font-medium text-red-800 mb-1 flex items-center gap-1">
                            <Search className="w-3 h-3" /> Non-compliant text identified:
                          </p>
                          <div className="bg-red-100 p-2 rounded mb-2 border border-red-300">
                            <p className="text-red-900 font-mono text-[11px] italic">"{element.problematic_phrasing}"</p>
                          </div>
                          <div className="space-y-1">
                            <p className="text-red-700 text-[10px] font-semibold">Why this fails compliance:</p>
                            <ul className="ml-3 space-y-0.5">
                              <li className="text-red-600 text-[10px] flex items-start gap-1">
                                <XCircle className="w-2.5 h-2.5 mt-0.5 flex-shrink-0" />
                                Lacks measurable, objective clinical data
                              </li>
                              <li className="text-red-600 text-[10px] flex items-start gap-1">
                                <XCircle className="w-2.5 h-2.5 mt-0.5 flex-shrink-0" />
                                Too vague for Medicare audit requirements
                              </li>
                              <li className="text-red-600 text-[10px] flex items-start gap-1">
                                <XCircle className="w-2.5 h-2.5 mt-0.5 flex-shrink-0" />
                                Doesn't support medical necessity
                              </li>
                            </ul>
                          </div>
                          {element.found_text && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 text-[10px] text-red-700 hover:text-red-900 hover:bg-red-100 mt-2 w-full"
                              onClick={() => {
                                setHighlightedText(element.found_text);
                                setTimeout(() => setHighlightedText(null), 5000);
                              }}
                            >
                              <Search className="w-2.5 h-2.5 mr-1" />
                              Highlight in note
                            </Button>
                          )}
                        </div>
                      )}
                      
                      {/* Medicare requirement explanation */}
                      {element.why_needed && (
                        <div className="bg-blue-50 p-2 rounded text-xs border border-blue-200">
                          <div className="flex items-start gap-1.5">
                            <BookOpen className="w-3 h-3 mt-0.5 flex-shrink-0 text-blue-600" />
                            <div>
                              <p className="font-medium text-blue-800 mb-0.5">Medicare Requirement:</p>
                              <p className="text-blue-700">{element.why_needed}</p>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      <div className="bg-white/70 p-2 rounded text-xs text-gray-700 border border-gray-200">
                        <div className="flex items-center justify-between mb-1">
                          <p className="font-medium text-gray-500 flex items-center gap-1">
                            <Lightbulb className="w-3 h-3 text-amber-500" />
                            Suggested compliant text:
                          </p>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 w-5 p-0 text-gray-400 hover:text-blue-600"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleCopySuggestion(suggestion, idx);
                              }}
                              title="Copy to clipboard"
                            >
                              {copiedIdx === idx ? <Check className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              className={`h-5 w-5 p-0 ${isEditing ? 'text-blue-600' : 'text-gray-400 hover:text-blue-600'}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingSuggestion(isEditing ? null : idx);
                              }}
                              title="Edit suggestion"
                            >
                              <Pencil className="w-3 h-3" />
                            </Button>
                          </div>
                        </div>
                        {isEditing ? (
                          <Textarea
                            value={suggestion}
                            onChange={(e) => handleEditSuggestion(idx, e.target.value)}
                            className="text-xs min-h-[80px] mt-1"
                            onClick={(e) => e.stopPropagation()}
                          />
                        ) : (
                          <p className="whitespace-pre-wrap">{suggestion}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            
            {/* Show dismissed count with restore option */}
            {dismissedElements.size > 0 && (
              <div className="flex items-center justify-between p-2 bg-gray-50 rounded border border-gray-200 text-xs text-gray-500">
                <span>{dismissedElements.size} suggestion{dismissedElements.size > 1 ? 's' : ''} marked as not applicable</span>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-5 text-xs text-blue-600 hover:text-blue-700"
                  onClick={(e) => {
                    e.stopPropagation();
                    setDismissedElements(new Set());
                  }}
                >
                  Restore all
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Enhanced Note Compliance Analysis */}
        {enhancedNote && (
          <div className={`${roughNote && roughNote.length >= 30 ? 'mt-3 pt-3 border-t' : ''}`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-indigo-800">Enhanced Note Compliance</span>
                {isAnalyzingEnhanced && <Loader2 className="w-3 h-3 animate-spin text-indigo-600" />}
              </div>
              {enhancedComplianceData && (
                <div className="flex items-center gap-2">
                  <span className={`text-lg font-bold ${getScoreColor(enhancedComplianceData.overall_score)}`}>
                    {enhancedComplianceData.overall_score}%
                  </span>
                  {enhancedComplianceData.flagged_issues?.length > 0 && (
                    <Badge className="bg-orange-100 text-orange-800 text-xs">
                      {enhancedComplianceData.flagged_issues.length} issues
                    </Badge>
                  )}
                </div>
              )}
            </div>

            {/* Fix All Button with explanation */}
            {enhancedComplianceData?.flagged_issues?.filter((_, idx) => !insertedIssues.has(idx)).length > 0 && (
              <div className="mb-3 space-y-2">
                <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-2 rounded-lg border border-green-200">
                  <div className="flex items-start gap-2 mb-2">
                    <Zap className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-xs font-semibold text-green-800">One-Click Fix Available</p>
                      <p className="text-[10px] text-green-700 mt-0.5">
                        This will add all {enhancedComplianceData.flagged_issues.filter((_, idx) => !insertedIssues.has(idx)).length} missing/weak elements to your rough note and automatically re-enhance for Medicare compliance.
                      </p>
                    </div>
                  </div>
                  <Button
                    onClick={handleFixAllAndReEnhance}
                    disabled={isFixingAll}
                    className="w-full bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
                  >
                    {isFixingAll ? (
                      <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Fixing & Re-Enhancing...</>
                    ) : (
                      <><Zap className="w-4 h-4 mr-2" /> Fix All & Re-Enhance ({enhancedComplianceData.flagged_issues.filter((_, idx) => !insertedIssues.has(idx)).length} issues)</>
                    )}
                  </Button>
                </div>
              </div>
            )}

            {/* Flagged Issues with Clickable Suggestions */}
            {enhancedComplianceData?.flagged_issues?.length > 0 && (
              <div className="space-y-2">
                {/* Multi-select controls */}
                {enhancedComplianceData.flagged_issues.filter((_, idx) => !insertedIssues.has(idx)).length > 1 && (
                  <div className="flex justify-between items-center mb-2 p-2 bg-white rounded border">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedEnhancedIssues.size === enhancedComplianceData.flagged_issues.filter((_, idx) => !insertedIssues.has(idx)).length && selectedEnhancedIssues.size > 0}
                        onChange={(e) => {
                          if (selectedEnhancedIssues.size === enhancedComplianceData.flagged_issues.filter((_, idx) => !insertedIssues.has(idx)).length) {
                            setSelectedEnhancedIssues(new Set());
                          } else {
                            const allIndices = enhancedComplianceData.flagged_issues
                              .map((_, i) => i)
                              .filter(i => !insertedIssues.has(i));
                            setSelectedEnhancedIssues(new Set(allIndices));
                          }
                        }}
                        className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="text-xs text-gray-600">Select All</span>
                    </div>
                    <Button
                      size="sm"
                      variant="default"
                      className="text-xs bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        const selectedIndices = Array.from(selectedEnhancedIssues);
                        const textsToAdd = selectedIndices
                          .map(i => enhancedComplianceData.flagged_issues[i])
                          .filter(issue => issue)
                          .map(issue => issue.suggestion || getDefaultSuggestion(issue.element, careType, issue.issue_type, diagnosis));
                        if (textsToAdd.length > 0) {
                          onInsertElement && onInsertElement(textsToAdd.join('\n\n'));
                          selectedIndices.forEach(idx => setInsertedIssues(prev => new Set([...prev, idx])));
                          setSelectedEnhancedIssues(new Set());
                        }
                      }}
                      disabled={selectedEnhancedIssues.size === 0}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Selected ({selectedEnhancedIssues.size})
                    </Button>
                  </div>
                )}

                {enhancedComplianceData.flagged_issues.map((issue, idx) => {
                  const isInserted = insertedIssues.has(idx);
                  const isSelected = selectedEnhancedIssues.has(idx);
                  const suggestionText = issue.suggestion || getDefaultSuggestion(issue.element, careType, issue.issue_type, diagnosis);

                  // Generate granular explanation based on issue type
                  const getGranularExplanation = () => {
                    const explanations = {
                      missing: {
                        high: `CRITICAL: "${issue.element}" is completely absent from your documentation. This is a Medicare requirement that auditors specifically verify. Missing this element puts the entire visit at risk for denial.`,
                        medium: `"${issue.element}" documentation is missing. While not immediately critical, this gap could trigger audit questions and potential recoupment requests.`,
                        low: `"${issue.element}" should be documented for completeness. Consider adding this to strengthen your documentation.`
                      },
                      weak: {
                        high: `CRITICAL: Your "${issue.element}" documentation lacks required specificity. Medicare requires measurable, objective clinical data - vague statements like "patient doing well" are insufficient.`,
                        medium: `Your "${issue.element}" documentation needs more detail. Include specific measurements, times, or quantifiable observations.`,
                        low: `Consider strengthening your "${issue.element}" documentation with more clinical specificity.`
                      },
                      non_compliant: {
                        high: `CRITICAL: Current "${issue.element}" documentation uses non-compliant language that could trigger audit flags. This phrasing pattern is commonly rejected by Medicare.`,
                        medium: `"${issue.element}" documentation uses phrasing that may not meet compliance standards. Review and revise for clarity.`,
                        low: `Minor compliance concern with "${issue.element}" - consider revising for best practices.`
                      }
                    };
                    return explanations[issue.issue_type]?.[issue.severity] || issue.problem;
                  };

                  return (
                    <div key={idx} className={`rounded border ${isInserted ? 'bg-green-50 border-green-300 opacity-60' : getSeverityColor(issue.severity)}`}>
                      <div className="flex items-start gap-2 p-2">
                        {!isInserted && (
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => {
                              setSelectedEnhancedIssues(prev => {
                                const next = new Set(prev);
                                if (isSelected) {
                                  next.delete(idx);
                                } else {
                                  next.add(idx);
                                }
                                return next;
                              });
                            }}
                            className="mt-1 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                          />
                        )}
                        {isInserted ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                        ) : (
                          getIssueTypeIcon(issue.issue_type)
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-semibold">{issue.element}</p>
                            {isInserted ? (
                              <Badge className="bg-green-100 text-green-800 text-xs">Added</Badge>
                            ) : (
                              <>
                                <Badge variant="outline" className="text-xs capitalize">{issue.issue_type}</Badge>
                                <Badge className={`text-[10px] ${
                                  issue.severity === 'high' ? 'bg-red-600 text-white' :
                                  issue.severity === 'medium' ? 'bg-yellow-500 text-white' :
                                  'bg-blue-500 text-white'
                                }`}>
                                  {issue.severity} priority
                                </Badge>
                              </>
                            )}
                          </div>
                          
                          {/* Granular explanation with educational link */}
                          {!isInserted && (
                            <div className="mt-1.5 bg-white/50 p-2 rounded border border-gray-200">
                              <div className="flex items-start gap-1.5">
                                <FileText className="w-3 h-3 mt-0.5 text-gray-500 flex-shrink-0" />
                                <div className="flex-1">
                                  <p className="text-xs text-gray-700 leading-relaxed mb-1.5">{getGranularExplanation()}</p>
                                  {(() => {
                                    const resource = getEducationalResource(issue.element);
                                    if (resource && resource.links.length > 0) {
                                      return (
                                        <a
                                          href={resource.links[0].url}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="inline-flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-800 hover:underline"
                                        >
                                          <ExternalLink className="w-2.5 h-2.5" />
                                          Learn more about {issue.element.toLowerCase()}
                                        </a>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                              </div>
                            </div>
                          )}
                          
                          {/* Location hint */}
                          {!isInserted && issue.location_hint && (
                            <p className="text-[10px] text-gray-500 mt-1 flex items-center gap-1">
                              <Info className="w-2.5 h-2.5" />
                              Location: {issue.location_hint}
                            </p>
                          )}

                          {/* Show suggestion preview with copy functionality */}
                          {!isInserted && (
                            <div className="mt-2 bg-green-50 p-2 rounded border border-green-200">
                              <div className="flex items-center justify-between mb-1">
                                <p className="text-xs font-medium text-green-800 flex items-center gap-1">
                                  <Zap className="w-3 h-3" />
                                  AI-Generated Compliant Text:
                                </p>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 w-5 p-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(suggestionText);
                                    setCopiedIdx(idx);
                                    setTimeout(() => setCopiedIdx(null), 2000);
                                  }}
                                  title="Copy suggestion"
                                >
                                  {copiedIdx === idx ? (
                                    <Check className="w-3 h-3 text-green-600" />
                                  ) : (
                                    <Copy className="w-3 h-3 text-green-700" />
                                  )}
                                </Button>
                              </div>
                              <p className="text-xs text-green-900 whitespace-pre-wrap line-clamp-3">{suggestionText}</p>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 text-[10px] text-green-700 hover:text-green-900 hover:bg-green-100 mt-1 w-full"
                                  >
                                    View full suggestion
                                    <ChevronDown className="w-2.5 h-2.5 ml-1" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-96 max-h-96 overflow-y-auto" align="start">
                                  <div className="space-y-2">
                                    <p className="text-xs font-semibold text-gray-700">Full Compliant Text:</p>
                                    <p className="text-xs text-gray-800 whitespace-pre-wrap">{suggestionText}</p>
                                    <Button
                                      size="sm"
                                      className="w-full"
                                      onClick={() => {
                                        navigator.clipboard.writeText(suggestionText);
                                        setCopiedIdx(idx);
                                        setTimeout(() => setCopiedIdx(null), 2000);
                                      }}
                                    >
                                      {copiedIdx === idx ? (
                                        <><Check className="w-3 h-3 mr-1" /> Copied!</>
                                      ) : (
                                        <><Copy className="w-3 h-3 mr-1" /> Copy to Clipboard</>
                                      )}
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          )}
                        </div>
                        {!isInserted && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 shrink-0"
                            onClick={() => {
                              insertToRoughNote(suggestionText, idx);
                            }}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            <span className="text-xs">Add</span>
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quick Fixes */}
            {enhancedComplianceData?.quick_fixes?.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-semibold text-indigo-800 mb-2">Quick Fixes</p>
                <div className="space-y-2">
                  {enhancedComplianceData.quick_fixes.slice(0, 3).map((fix, idx) => (
                    <Popover key={idx}>
                      <PopoverTrigger asChild>
                        <div className="flex items-center gap-2 p-2 bg-indigo-50 rounded cursor-pointer hover:bg-indigo-100 transition-colors">
                          <Lightbulb className="w-4 h-4 text-indigo-600 flex-shrink-0" />
                          <p className="text-xs text-indigo-800 flex-1 truncate">{fix.reason}</p>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent className="w-80" align="end">
                        <div className="space-y-3">
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1">Current Text</p>
                            <p className="text-sm bg-red-50 p-2 rounded text-red-800 line-through">{fix.original_text}</p>
                          </div>
                          <div>
                            <p className="text-xs font-semibold text-gray-500 mb-1">Improved Text</p>
                            <p className="text-sm bg-green-50 p-2 rounded text-green-800">{fix.improved_text}</p>
                          </div>
                          <p className="text-xs text-gray-600">{fix.reason}</p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="w-full"
                            onClick={() => onInsertElement && onInsertElement(fix.improved_text)}
                          >
                            Apply Fix
                          </Button>
                        </div>
                      </PopoverContent>
                    </Popover>
                  ))}
                </div>
              </div>
            )}

            {/* Compliant Elements */}
            {enhancedComplianceData?.compliant_elements?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {enhancedComplianceData.compliant_elements.map((element, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    {element}
                  </Badge>
                ))}
              </div>
            )}

            {/* Version History Button */}
            {enhancedNoteHistory.length > 1 && (
              <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="w-full mb-2">
                    <History className="w-3 h-3 mr-2" />
                    Version History ({enhancedNoteHistory.length} versions)
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Enhanced Note History</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 mt-4">
                    {enhancedNoteHistory.slice().reverse().map((version, idx) => (
                      <div key={idx} className="border rounded-lg p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-gray-500">
                            {idx === 0 ? 'Current' : `Version ${enhancedNoteHistory.length - idx}`} - {version.timestamp.toLocaleTimeString()}
                          </span>
                          {idx !== 0 && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-6 text-xs"
                              onClick={() => restoreEnhancedNoteVersion(version)}
                            >
                              <RotateCcw className="w-3 h-3 mr-1" />
                              Restore
                            </Button>
                          )}
                        </div>
                        <p className="text-xs text-gray-700 whitespace-pre-wrap line-clamp-4">
                          {version.content.substring(0, 300)}...
                        </p>
                      </div>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}

            {/* Ready to Paste Indicator */}
            {enhancedComplianceData && (
              <div className={`flex items-center gap-2 p-3 rounded border ${
                isReadyToPaste || enhancedComplianceData.overall_score >= 85
                  ? 'bg-green-100 border-green-300'
                  : enhancedComplianceData.overall_score >= 70
                  ? 'bg-yellow-50 border-yellow-300'
                  : 'bg-orange-50 border-orange-300'
              }`}>
                {isReadyToPaste || enhancedComplianceData.overall_score >= 85 ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="text-sm font-semibold text-green-800">Ready to paste into EHR!</p>
                      <p className="text-xs text-green-700">All critical compliance elements are documented.</p>
                    </div>
                  </>
                ) : enhancedComplianceData.overall_score >= 70 ? (
                  <>
                    <AlertCircle className="w-5 h-5 text-yellow-600" />
                    <div>
                      <p className="text-sm font-semibold text-yellow-800">Almost ready - review suggested fixes above</p>
                      <p className="text-xs text-yellow-700">Add fixes to rough notes, edit, then click "Enhance with AI" again.</p>
                    </div>
                  </>
                ) : (
                  <>
                    <XCircle className="w-5 h-5 text-orange-600" />
                    <div>
                      <p className="text-sm font-semibold text-orange-800">Needs improvement before pasting</p>
                      <p className="text-xs text-orange-700">Click "Fix" to add text to rough notes, edit, then re-enhance.</p>
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
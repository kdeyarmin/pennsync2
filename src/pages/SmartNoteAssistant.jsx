import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Sparkles,
  CheckCircle2,
  Wand2,
  User,
  Activity,
  Stethoscope,
  ClipboardList,
  AlertTriangle,
  Mic,
  MicOff,
  ChevronRight,
  ChevronLeft,
  Brain,
  HelpCircle,
  Undo2,
  Redo2,
  ArrowRight,
  Copy,
  RotateCcw,
  Lightbulb,
  MessageCircle,
  Save,
  Loader2
} from "lucide-react";
import { trackRecommendation, categorizeRecommendation } from "../components/training/RecommendationTracker";
import { useQueryClient } from "@tanstack/react-query";
import ComplianceScoreIndicator from "../components/smartNote/ComplianceScoreIndicator";
import ClinicalDecisionSupport from "../components/smartNote/ClinicalDecisionSupport";
import TaskGenerator from "../components/smartNote/TaskGenerator";
import AICarePlanGenerator from "../components/carePlan/AICarePlanGenerator";
import ComplianceSummaryReport from "../components/smartNote/ComplianceSummaryReport";
import FloatingActionBar from "../components/smartNote/FloatingActionBar";
import QuickPhraseButtons from "../components/smartNote/QuickPhraseButtons";
import ImprovedStepIndicator from "../components/smartNote/ImprovedStepIndicator";
import RichTextNoteEditor from "../components/smartNote/RichTextNoteEditor";
import SmartVitalsInput from "../components/smartNote/SmartVitalsInput";
import SmartAutoComplete from "../components/smartNote/SmartAutoComplete";
import SearchablePatientSelect from "../components/ui/SearchablePatientSelect";
import AIPatientHistorySummarizer from "../components/smartNote/AIPatientHistorySummarizer";
import { logActivity, ActivityActions } from "../components/utils/activityLogger";
import { todayEastern } from "../components/utils/timezone";
import ConsolidatedAIFeedback from "../components/smartNote/ConsolidatedAIFeedback";
import NextStepsPanel from "../components/smartNote/NextStepsPanel";
import UnifiedPatientOverview from "../components/smartNote/UnifiedPatientOverview";
import DynamicAISidebar from "../components/smartNote/DynamicAISidebar";
import UnifiedAISuggestions from "../components/smartNote/UnifiedAISuggestions";
import { retrieveRelevantGuidelines, formatGuidelinesForPrompt } from "../components/smartNote/GuidelineContextRetriever";
import FavoriteButton from "../components/navigation/FavoriteButton";

// Common diagnoses list
const commonDiagnoses = [
  "CHF (Congestive Heart Failure)",
  "COPD (Chronic Obstructive Pulmonary Disease)",
  "Diabetes Mellitus Type 2",
  "Hypertension",
  "Post-operative care",
  "Wound care",
  "Stroke/CVA",
  "Dementia/Alzheimer's",
  "Custom (type below)"
];



// Voice Hub Component - Dictation Only
function VoiceHub({ onTranscription }) {
  const [listening, setListening] = useState(false);

  const startListening = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported');
      return;
    }
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      onTranscription?.(transcript);
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    setListening(true);
    recognition.start();
  };

  return (
    <Button
      size="default"
      variant={listening ? "destructive" : "outline"}
      onClick={listening ? () => setListening(false) : startListening}
      className="gap-2 min-h-[44px] px-4 flex-shrink-0"
    >
      {listening ? <MicOff className="w-4 h-4 md:w-5 md:h-5" /> : <Mic className="w-4 h-4 md:w-5 md:h-5" />}
      <span className="text-sm md:text-base">{listening ? 'Stop' : 'Dictate'}</span>
    </Button>
  );
}

// Contextual AI Tools Sidebar - Enhanced with better guidance
function ContextualAITools({ currentStep, hasPatient, hasNotes, hasEnhancedNote, onAction, diagnosis, complianceScore }) {
  const getTools = () => {
    if (!hasPatient) return null;
    if (!hasNotes) return null;
    if (!hasEnhancedNote) return { 
      title: "✨ Ready to Enhance", 
      subtitle: "Step 3 of 4",
      items: [
        { label: "Transform to Medicare-Compliant", action: "enhance", type: "action", primary: true, icon: Sparkles },
      ],
      hint: diagnosis ? `AI will optimize for ${diagnosis.split(' ')[0]}` : "AI adds clinical language & compliance elements"
    };
    return { 
      title: "🎉 Note Complete!", 
      subtitle: complianceScore ? `${complianceScore}% Compliant` : "Ready to use",
      items: [
        { label: "Copy to Clipboard", action: "copy", type: "action", primary: true, icon: Copy },
        { label: "Generate Follow-up Tasks", action: "tasks", type: "action", icon: ClipboardList },
        { label: "Start New Note", action: "clear", type: "action", icon: RotateCcw }
      ],
      hint: "Review the note before pasting to EHR"
    };
  };
  const tools = getTools();

  if (!tools) return null;

  return (
    <Card className="border-2 border-indigo-200 bg-gradient-to-b from-indigo-50 to-white">
      <CardHeader className="py-3 pb-1">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="w-4 h-4 text-indigo-600" />
          {tools.title}
        </CardTitle>
        {tools.subtitle && (
          <p className="text-xs text-indigo-600 font-medium">{tools.subtitle}</p>
        )}
      </CardHeader>
      <CardContent className="py-2 space-y-2">
        {tools.items.map((item, idx) => (
          <div key={idx}>
            {item.type === 'action' ? (
              <Button
                size="sm"
                variant={item.primary ? "default" : "outline"}
                className={`w-full justify-between ${item.primary ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                onClick={() => onAction?.(item.action)}
              >
                <span className="flex items-center gap-2">
                  {item.icon && <item.icon className="w-3 h-3" />}
                  {item.label}
                </span>
                <ArrowRight className="w-4 h-4" />
              </Button>
            ) : item.type === 'example' ? (
              <div className="bg-white/70 p-2 rounded border border-indigo-100">
                <p className="text-xs text-indigo-700 italic flex items-center gap-1">
                  <MessageCircle className="w-3 h-3" /> {item.label}
                </p>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-xs text-gray-600">
                {item.icon && <item.icon className="w-3 h-3 text-indigo-400" />}
                {item.label}
              </div>
            )}
          </div>
        ))}
        {tools.hint && (
          <div className="pt-2 border-t border-indigo-100">
            <p className="text-xs text-indigo-600 flex items-center gap-1">
              <Lightbulb className="w-3 h-3" /> {tools.hint}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SmartNoteAssistant() {
  const queryClient = useQueryClient();
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [visitType, setVisitType] = useState("routine_visit");
  const [visitDate, setVisitDate] = useState(todayEastern());
  const [diagnosis, setDiagnosis] = useState("");
  const [customDiagnosis, setCustomDiagnosis] = useState("");
  const [vitalSigns, setVitalSigns] = useState({ bp: "", hr: "", temp: "", o2: "", o2Source: "room_air", o2Flow: "", pain: "" });
  const [roughNote, setRoughNote] = useState("");
  const [enhancedNote, setEnhancedNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [auditResults, setAuditResults] = useState(null);
  const [activeAccordion, setActiveAccordion] = useState("");
  const [roughNoteCompliance, setRoughNoteCompliance] = useState(null);
  const [enhancedNoteCompliance, setEnhancedNoteCompliance] = useState(null);
  const [appliedFixes, setAppliedFixes] = useState([]);
  const [dismissedElementNames, setDismissedElementNames] = useState([]);
  const [complianceIssues, setComplianceIssues] = useState([]);
  const [oasisLinkedItems, setOasisLinkedItems] = useState([]);
  const [oasisDiscrepancies, setOasisDiscrepancies] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);
  const [detectedComplianceRisks, setDetectedComplianceRisks] = useState([]);
  const [pdgmOptimizationWarnings, setPdgmOptimizationWarnings] = useState([]);
  const [noteStartTime, setNoteStartTime] = useState(null);
  const [complianceReviewComplete, setComplianceReviewComplete] = useState(false);
  const [appliedFixesText, setAppliedFixesText] = useState(new Set());
  const [isAnalyzingCompliance, setIsAnalyzingCompliance] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
    initialData: [],
  });

  const { data: carePlans = [] } = useQuery({
    queryKey: ['patientCarePlans', selectedPatientId],
    queryFn: () => base44.entities.CarePlan.filter({ patient_id: selectedPatientId }),
    enabled: !!selectedPatientId,
  });

  const { data: recentVisits = [] } = useQuery({
    queryKey: ['patientRecentVisits', selectedPatientId],
    queryFn: () => base44.entities.Visit.filter({ patient_id: selectedPatientId, status: 'completed' }, '-visit_date', 3),
    enabled: !!selectedPatientId,
  });

  const { data: patientOASIS = [] } = useQuery({
    queryKey: ['patientOASISForNotes', selectedPatientId],
    queryFn: () => base44.entities.OASISUpload.filter({ patient_id: selectedPatientId }, '-created_date', 1),
    enabled: !!selectedPatientId,
  });

  // Extract comprehensive OASIS context
  const oasisContext = React.useMemo(() => {
    if (!patientOASIS || patientOASIS.length === 0) return null;

    const latest = patientOASIS[0];
    const pdgm = latest.pdgm_data || {};
    const extracted = latest.extracted_data || {};

    return {
      assessmentDate: latest.created_date,
      admissionSource: pdgm.admission_source || extracted.admission_source,
      clinicalGroup: pdgm.clinical_grouping || extracted.clinical_group,
      functionalLevel: pdgm.functional_impairment_level || extracted.functional_level,
      comorbidities: Array.isArray(pdgm.comorbidity_level) ? pdgm.comorbidity_level : 
                    Array.isArray(extracted.comorbidities) ? extracted.comorbidities : [],
      primaryDiagnosis: extracted.primary_diagnosis || pdgm.primary_diagnosis,
      secondaryDiagnoses: extracted.secondary_diagnoses || [],
      medications: extracted.medications || [],
      admissionReason: extracted.admission_reason,
      priorHospitalization: extracted.prior_hospitalization,
      livingArrangement: extracted.living_arrangement,
      visionStatus: extracted.vision,
      hearingStatus: extracted.hearing,
      painLevel: extracted.pain_frequency,
      fallRisk: extracted.fall_risk,
      cognitiveStatus: extracted.cognitive_functioning,
      adlStatus: extracted.adl_limitations || {},
      iadlStatus: extracted.iadl_limitations || {}
    };
  }, [patientOASIS]);

  const selectedPatient = patients.find(p => p.id === selectedPatientId);
  
  // Auto-fill diagnosis when patient is selected
  React.useEffect(() => {
    if (selectedPatient?.primary_diagnosis && selectedPatientId) {
      const matchingDiagnosis = commonDiagnoses.find(dx => 
        selectedPatient.primary_diagnosis.toLowerCase().includes(dx.toLowerCase().split(' ')[0].toLowerCase()) ||
        dx.toLowerCase().includes(selectedPatient.primary_diagnosis.toLowerCase().split(' ')[0].toLowerCase())
      );
      if (matchingDiagnosis) {
        setDiagnosis(matchingDiagnosis);
      } else {
        setDiagnosis("Custom (type below)");
        setCustomDiagnosis(selectedPatient.primary_diagnosis);
      }
    }
  }, [selectedPatientId]);

  const finalDiagnosis = diagnosis === "Custom (type below)" ? customDiagnosis : diagnosis;

  // Build patient context for compliance checking
  const patientContext = selectedPatient ? {
    name: `${selectedPatient.first_name} ${selectedPatient.last_name}`,
    primaryDiagnosis: selectedPatient.primary_diagnosis || finalDiagnosis,
    secondaryDiagnoses: selectedPatient.secondary_diagnoses || [],
    allergies: selectedPatient.allergies,
    recentConditions: recentVisits[0]?.nurse_notes ? 
      recentVisits[0].nurse_notes.substring(0, 200) + '...' : null,
    previousVisitSummary: recentVisits[0] ? 
      `Last visit ${recentVisits[0].visit_date}: ${recentVisits[0].visit_type}` : null,
    carePlanGoals: carePlans.filter(cp => cp.status === 'active').map(cp => cp.goal)
  } : null;

  const currentStep = useMemo(() => {
    if (!selectedPatientId) return 'patient';
    if (!vitalSigns.bp && !vitalSigns.hr && !roughNote) return 'vitals';
    if (!roughNote || roughNote.length < 20) return 'notes';
    if (!enhancedNote) return 'enhance';
    return 'review';
  }, [selectedPatientId, vitalSigns, roughNote, enhancedNote]);

  // Step navigation helpers
  const stepOrder = ['patient', 'vitals', 'notes', 'enhance', 'review'];
  
  const handleStepClick = (stepId) => {
    const targetIndex = stepOrder.indexOf(stepId);
    const currentIndex = stepOrder.indexOf(currentStep);
    
    // Allow clicking on completed steps or current step
    if (targetIndex <= currentIndex || completedSteps.includes(stepId)) {
      // Scroll to the relevant section
      const sectionId = `step-${stepId}`;
      document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const handleGoBack = () => {
    const currentIndex = stepOrder.indexOf(currentStep);
    if (currentIndex > 0) {
      const prevStep = stepOrder[currentIndex - 1];
      handleStepClick(prevStep);
    }
  };

  const completedSteps = useMemo(() => {
    const steps = [];
    if (selectedPatientId) steps.push('patient');
    if (vitalSigns.bp || vitalSigns.hr || vitalSigns.temp) steps.push('vitals');
    if (roughNote.length >= 20) steps.push('notes');
    if (enhancedNote) steps.push('enhance');
    return steps;
  }, [selectedPatientId, vitalSigns, roughNote, enhancedNote]);

  const handleEnhanceNote = async () => {
    if (!roughNote.trim()) return;
    setIsProcessing(true);
    const enhanceStartTime = Date.now();
    const actualDocTime = noteStartTime ? (enhanceStartTime - noteStartTime) : 0;
    try {
      // Retrieve relevant Medicare guidelines for context
      const relevantGuidelines = await retrieveRelevantGuidelines({
        diagnosis: finalDiagnosis,
        visitType: visitType,
        noteContent: roughNote,
        maxGuidelines: 3
      });

      const guidelinesContext = formatGuidelinesForPrompt(relevantGuidelines);

      const prompt = `You are an expert clinical documentation specialist for home health nursing. Transform these rough notes into Medicare-compliant clinical narrative.

      PATIENT CONTEXT:
      - Name: ${selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : 'Not specified'}
      - Primary Diagnosis: ${finalDiagnosis || 'Not specified'}
      - Secondary Diagnoses: ${selectedPatient?.secondary_diagnoses?.join(', ') || 'None'}
      - Allergies: ${selectedPatient?.allergies || 'None documented'}
      - Visit Type: ${visitType.replace(/_/g, ' ')}
      - Vitals: ${Object.entries(vitalSigns).filter(([k,v]) => v && k !== 'o2Source' && k !== 'o2Flow').map(([k,v]) => {
        if (k === 'o2') {
          const o2Text = `O2 Sat: ${v}`;
          if (vitalSigns.o2Source === 'on_oxygen' && vitalSigns.o2Flow) {
            return `${o2Text} on ${vitalSigns.o2Flow}L O2`;
          } else if (vitalSigns.o2Source === 'on_oxygen') {
            return `${o2Text} on supplemental O2`;
          }
          return `${o2Text} on room air`;
        }
        return `${k}: ${v}`;
      }).join(', ') || 'None provided'}

      PATIENT HISTORY:
      ${recentVisits.length > 0 ? `- Last Visit (${recentVisits[0].visit_date}): ${recentVisits[0].visit_type} - ${recentVisits[0].nurse_notes?.substring(0, 200)}...` : '- No previous visits on record'}

      ACTIVE CARE PLAN GOALS:
      ${carePlans.filter(cp => cp.status === 'active').map(cp => `- ${cp.problem}: ${cp.goal}`).join('\n') || '- No active care plans'}

      OASIS ASSESSMENT DATA (Synced):
      ${oasisContext ? `
      - Assessment Date: ${formatEastern(oasisContext.assessmentDate, 'MMM d, yyyy')}
      - Admission Source: ${oasisContext.admissionSource === '1' || oasisContext.admissionSource?.toLowerCase().includes('community') ? 'Community (home)' : oasisContext.admissionSource === '2' || oasisContext.admissionSource?.toLowerCase().includes('institutional') ? 'Institutional (hospital/SNF discharge)' : oasisContext.admissionSource || 'Unknown'}
      - Clinical Group: ${oasisContext.clinicalGroup || 'Not specified'}
      - Functional Impairment Level: ${oasisContext.functionalLevel || 'Not specified'}
      - Documented Comorbidities: ${oasisContext.comorbidities.length > 0 ? oasisContext.comorbidities.join(', ') : 'None listed'}
      - OASIS Primary Diagnosis: ${oasisContext.primaryDiagnosis || 'Not specified'}
      - Secondary Diagnoses: ${oasisContext.secondaryDiagnoses.length > 0 ? oasisContext.secondaryDiagnoses.join(', ') : 'None'}
      - Current Medications: ${oasisContext.medications.length > 0 ? oasisContext.medications.slice(0, 5).join(', ') + (oasisContext.medications.length > 5 ? ` and ${oasisContext.medications.length - 5} more` : '') : 'Not documented'}
      - Admission Reason: ${oasisContext.admissionReason || 'Not specified'}
      - Living Arrangement: ${oasisContext.livingArrangement || 'Not specified'}
      - Cognitive Status: ${oasisContext.cognitiveStatus || 'Not assessed'}
      - Fall Risk: ${oasisContext.fallRisk || 'Not assessed'}
      - Pain Frequency: ${oasisContext.painLevel || 'Not assessed'}
      - Vision Status: ${oasisContext.visionStatus || 'Not assessed'}
      - Hearing Status: ${oasisContext.hearingStatus || 'Not assessed'}
      - ADL Limitations: ${Object.keys(oasisContext.adlStatus || {}).length > 0 ? Object.entries(oasisContext.adlStatus).filter(([k,v]) => v).map(([k]) => k).join(', ') : 'None documented'}
      - IADL Limitations: ${Object.keys(oasisContext.iadlStatus || {}).length > 0 ? Object.entries(oasisContext.iadlStatus).filter(([k,v]) => v).map(([k]) => k).join(', ') : 'None documented'}
      ` : '- No OASIS data on file'}

      ROUGH NOTES:
      ${roughNote}

      CRITICAL ENHANCEMENT REQUIREMENTS:
      1. HOMEBOUND STATUS: ${oasisContext?.functionalLevel ? `Based on OASIS functional level (${oasisContext.functionalLevel}), document specific mobility limitations and why leaving home is taxing.` : 'If patient has mobility/activity limitations, clearly state why leaving home is taxing (specific symptoms, distances, assistance needed)'}
         ${oasisContext?.adlStatus && Object.keys(oasisContext.adlStatus).filter(k => oasisContext.adlStatus[k]).length > 0 ? `- OASIS shows ADL limitations in: ${Object.keys(oasisContext.adlStatus).filter(k => oasisContext.adlStatus[k]).join(', ')}` : ''}

      2. SKILLED NEED: Explicitly state why RN skills are required (complex assessment, clinical judgment, patient education beyond basic instruction)
         ${oasisContext?.admissionSource === '2' || oasisContext?.admissionSource?.toLowerCase().includes('institutional') ? '- Document post-institutional monitoring and skilled assessment needs' : ''}
         ${oasisContext?.cognitiveStatus && oasisContext.cognitiveStatus !== 'intact' ? `- Address cognitive impairment (${oasisContext.cognitiveStatus}) requiring skilled nursing oversight` : ''}

      3. PATIENT RESPONSE: Include patient's verbal understanding, teach-back results, or demonstrated competency
         ${oasisContext?.cognitiveStatus ? `- Consider cognitive status (${oasisContext.cognitiveStatus}) when documenting teaching effectiveness` : ''}

      4. FUNCTIONAL ASSESSMENT: ${oasisContext?.adlStatus || oasisContext?.iadlStatus ? 'Document changes in functional abilities compared to OASIS baseline:' : 'Document functional abilities:'}
         ${oasisContext?.adlStatus && Object.keys(oasisContext.adlStatus).length > 0 ? `- ADL assistance needs per OASIS: ${Object.entries(oasisContext.adlStatus).filter(([k,v]) => v).map(([k]) => k).join(', ')}` : ''}
         ${oasisContext?.iadlStatus && Object.keys(oasisContext.iadlStatus).length > 0 ? `- IADL assistance needs per OASIS: ${Object.entries(oasisContext.iadlStatus).filter(([k,v]) => v).map(([k]) => k).join(', ')}` : ''}

      5. SAFETY/RISK FACTORS: 
         ${oasisContext?.fallRisk ? `- Fall Risk: ${oasisContext.fallRisk} - document fall prevention measures` : ''}
         ${oasisContext?.visionStatus && oasisContext.visionStatus !== 'adequate' ? `- Vision impairment: ${oasisContext.visionStatus} - address safety implications` : ''}
         ${oasisContext?.hearingStatus && oasisContext.hearingStatus !== 'adequate' ? `- Hearing impairment: ${oasisContext.hearingStatus} - document communication adaptations` : ''}

      6. CONDITION-SPECIFIC DETAILS:
      ${finalDiagnosis?.toUpperCase().includes('CHF') || finalDiagnosis?.toUpperCase().includes('HEART FAILURE') || finalDiagnosis?.toUpperCase().includes('CONGESTIVE') ? '- CHF: Document daily weight, edema grading (0-4+), JVD assessment, bilateral lung sounds for crackles, S3 gallop, fluid status evaluation' : ''}
      ${finalDiagnosis?.toUpperCase().includes('COPD') || finalDiagnosis?.toUpperCase().includes('CHRONIC OBSTRUCTIVE') ? '- COPD: Document O2 sat on room air vs supplemental O2, respiratory rate, work of breathing, accessory muscle use, cyanosis, lung sounds (wheezes/rhonchi)' : ''}
      ${finalDiagnosis?.toUpperCase().includes('DIABETES') || finalDiagnosis?.toUpperCase().includes('DIABETIC') ? '- Diabetes: Document blood glucose reading, diabetic foot exam (pedal pulses, sensation, skin integrity between toes), peripheral neuropathy assessment' : ''}
      ${finalDiagnosis?.toUpperCase().includes('WOUND') || finalDiagnosis?.toUpperCase().includes('PRESSURE') || finalDiagnosis?.toUpperCase().includes('ULCER') ? '- Wound: Document dimensions (L x W x D in cm), wound bed appearance (% granulation/slough/eschar), exudate (type, amount, odor), periwound condition, undermining/tunneling' : ''}
      ${finalDiagnosis?.toUpperCase().includes('STROKE') || finalDiagnosis?.toUpperCase().includes('CVA') ? '- Stroke: Document LOC, orientation, speech/aphasia, facial symmetry, motor strength bilateral (0-5 grading), sensation, swallowing safety' : ''}
      5. INTEGRATE CARE PLAN PROGRESS: Reference active care plan goals and document progress toward them
      6. COMPARE TO BASELINE: If previous visit data available, note changes from last visit
      7. FUNCTIONAL STATUS: Describe ADL limitations, mobility level, assistance needed
      8. PLAN OF CARE: State continuing plan, next visit schedule, when to contact nurse/MD

      FORMATTING GUIDELINES:
      - Use complete sentences with proper medical terminology
      - Write in narrative paragraph format, not bullet points
      - Include measurable, objective data
      - Avoid vague terms like "doing well" or "stable" - be specific
      - Natural language flow suitable for EHR copy/paste

      CRITICAL - NO META-COMMENTARY:
      NEVER include sentences about documentation itself, such as:
      - "Thorough documentation of diagnoses could enhance reimbursement..."
      - "Recording vital signs will contribute to comprehensive assessments..."
      - "This documentation aligns with CMS compliance..."
      - "Further documentation would improve..."
      - ANY statement about the act of documenting or compliance standards
      
      Only write the actual clinical narrative as if it were going directly into the patient's chart. Write ONLY what a nurse would document about the patient visit - observations, assessments, interventions, patient responses. Do NOT write advice to the nurse about how to document.
${guidelinesContext}

      Return JSON:
      {
      "enhanced_note": "The complete clinical narrative",
      "quality_score": 0-100
      }`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            enhanced_note: { type: "string" },
            quality_score: { type: "number" }
          }
        }
      });
      setEnhancedNote(result.enhanced_note);
      setAuditResults(result);
      setComplianceReviewComplete(false); // Reset to show compliance review first

      // Log note enhancement activity - counts as AI utilization
      logActivity(ActivityActions.NOTE_ENHANCED, {
        patient_id: selectedPatientId,
        visit_type: visitType,
        visit_date: visitDate,
        diagnosis: finalDiagnosis,
        rough_note_length: roughNote.length,
        enhanced_note_length: result.enhanced_note?.length,
        quality_score: result.quality_score,
        page: 'SmartNoteAssistant',
        ai_utilization: true // Flag for analytics tracking
      });

      // Track note conversion for admin reporting - use actual doc time from first keystroke
      try {
        await base44.entities.NoteConversion.create({
          nurse_email: currentUser?.email || 'unknown',
          patient_id: selectedPatientId || null,
          visit_type: visitType,
          diagnosis: finalDiagnosis || null,
          rough_note_length: roughNote.length,
          enhanced_note_length: result.enhanced_note?.length || 0,
          quality_score: result.quality_score || null,
          conversion_time_ms: actualDocTime
        });
      } catch (trackError) {
        console.error("Error tracking note conversion:", trackError);
      }
      
      // Track any AI suggestions as recommendations for training
      if (currentUser?.email && result.missing_critical_elements) {
        result.missing_critical_elements.forEach(element => {
          trackRecommendation({
            nurseEmail: currentUser.email,
            type: categorizeRecommendation(element),
            text: element,
            source: "smart_note",
            severity: "medium",
            patientId: selectedPatientId
          });
        });
      }
    } catch (error) {
      console.error("Error enhancing note:", error);
    }
    setIsProcessing(false);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(enhancedNote);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleVoiceTranscription = (text) => {
    setRoughNote(prev => prev ? prev + ' ' + text : text);
  };



  const handleContextualAction = (action) => {
    if (action === 'enhance') handleEnhanceNote();
    if (action === 'copy') handleCopy();
    if (action === 'tasks') setActiveAccordion('tasks');
    if (action === 'clear') handleClearNote();
  };

  const handleClearNote = () => {
    setRoughNote("");
    setEnhancedNote("");
    setAuditResults(null);
    setAppliedFixes([]);
    setDismissedElementNames([]);
    setRoughNoteCompliance(null);
    setEnhancedNoteCompliance(null);
    setVisitDate(todayEastern());
    setNoteStartTime(null);
    setComplianceReviewComplete(false);
    setAppliedFixesText(new Set());
  };

  const handleInsertPhrase = (text) => {
    setRoughNote(prev => prev ? prev + ' ' + text : text);
  };

  const handleSaveNote = async () => {
    if (!selectedPatientId || !enhancedNote) return;
    
    setIsSaving(true);
    try {
      await base44.entities.Visit.create({
        patient_id: selectedPatientId,
        visit_date: visitDate,
        visit_type: visitType,
        status: 'completed',
        nurse_notes: enhancedNote,
        vital_signs: {
          blood_pressure_systolic: vitalSigns.bp?.split('/')[0] || null,
          blood_pressure_diastolic: vitalSigns.bp?.split('/')[1] || null,
          heart_rate: vitalSigns.hr ? parseInt(vitalSigns.hr) : null,
          temperature: vitalSigns.temp ? parseFloat(vitalSigns.temp) : null,
          oxygen_saturation: vitalSigns.o2 ? parseInt(vitalSigns.o2) : null,
          pain_level: vitalSigns.pain ? parseInt(vitalSigns.pain) : null,
          weight: vitalSigns.weight ? parseFloat(vitalSigns.weight) : null
        }
      });

      setSavedSuccessfully(true);
      setTimeout(() => setSavedSuccessfully(false), 3000);

      // Refresh recent visits to include this one
      queryClient.invalidateQueries({ queryKey: ['patientRecentVisits', selectedPatientId] });

      logActivity(ActivityActions.VISIT_DOCUMENT, {
        patient_id: selectedPatientId,
        visit_date: visitDate,
        visit_type: visitType,
        note_length: enhancedNote.length,
        page: 'SmartNoteAssistant'
      });
    } catch (error) {
      console.error("Error saving note:", error);
    }
    setIsSaving(false);
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-4 md:mb-6 flex items-center justify-between gap-2 md:gap-4">
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0">
          {currentStep !== 'patient' && (
            <Button 
              variant="outline" 
              size="default"
              onClick={handleGoBack}
              className="gap-1 text-gray-600 hover:text-gray-900 flex-shrink-0 min-h-[44px] px-3"
            >
              <ChevronLeft className="w-5 h-5" />
              <span className="hidden md:inline">Back</span>
            </Button>
          )}
          <div className="min-w-0">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 truncate">Smart Note Assistant</h1>
            <p className="text-sm md:text-base text-gray-600 hidden md:block">Transform rough notes into Medicare-compliant documentation</p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0">
          <FavoriteButton type="page" id="SmartNoteAssistant" name="Smart Note Assistant" />
          <Button variant="ghost" size="default" className="text-gray-500 gap-1 min-h-[44px]">
            <HelpCircle className="w-5 h-5" />
            <span className="hidden xl:inline">Help</span>
          </Button>
        </div>
      </div>

      <ImprovedStepIndicator 
        currentStep={currentStep} 
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
      />

      {selectedPatient && (
        <UnifiedPatientOverview
          patient={selectedPatient}
          carePlans={carePlans}
          recentVisits={recentVisits}
          patientOASIS={patientOASIS}
          vitalSigns={vitalSigns}
          diagnosis={finalDiagnosis}
          onClear={() => setSelectedPatientId("")}
          onSyncData={(syncData) => {
            if (syncData.diagnosis) {
              setDiagnosis("Custom (type below)");
              setCustomDiagnosis(syncData.diagnosis);
            }
            const narrativeIntro = [];
            if (syncData.diagnosis) narrativeIntro.push(`Patient with ${syncData.diagnosis}`);
            if (syncData.comorbidities?.length > 0) {
              narrativeIntro.push(`and ${syncData.comorbidities.slice(0, 3).join(', ')}`);
            }
            if (syncData.admissionSource === 'institutional') {
              narrativeIntro.push('Recently discharged from facility.');
            }
            if (narrativeIntro.length > 0) {
              setRoughNote(prev => narrativeIntro.join(' ') + '. ' + prev);
            }
          }}
          onInsertTemplate={(template) => setRoughNote(prev => prev + '\n\n' + template)}
        />
      )}

      <div className="grid grid-cols-1 xl:grid-cols-4 gap-4 md:gap-6">
        <div className="xl:col-span-3 space-y-4 md:space-y-6">
          
          {/* Step 1: Patient Selection */}
          <Card id="step-patient" className={`border-2 ${currentStep === 'patient' ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'}`}>
            <CardHeader className="py-4 md:py-5 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <User className="w-5 h-5 text-blue-600" />
                1. Select Patient & Visit Type
                {selectedPatient && <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                <div>
                  <Label className="text-sm md:text-base mb-2 block">Patient</Label>
                  <SearchablePatientSelect
                    patients={patients}
                    value={selectedPatientId}
                    onValueChange={(id) => {
                      setSelectedPatientId(id);
                      const patient = patients.find(p => p.id === id);
                      if (patient?.primary_diagnosis) {
                        const matchingDiagnosis = commonDiagnoses.find(dx => 
                          patient.primary_diagnosis.toLowerCase().includes(dx.toLowerCase().split(' ')[0].toLowerCase()) ||
                          dx.toLowerCase().includes(patient.primary_diagnosis.toLowerCase().split(' ')[0].toLowerCase())
                        );
                        if (matchingDiagnosis) {
                          setDiagnosis(matchingDiagnosis);
                        } else {
                          setDiagnosis("Custom (type below)");
                          setCustomDiagnosis(patient.primary_diagnosis);
                        }
                      }
                    }}
                    placeholder="Search patients..."
                  />
                </div>
                <div>
                  <Label className="text-sm md:text-base mb-2 block">Visit Date</Label>
                  <Input 
                    type="date" 
                    value={visitDate} 
                    onChange={(e) => setVisitDate(e.target.value)}
                    max={todayEastern()}
                    className="h-11 md:h-12 text-base"
                  />
                </div>
                <div>
                  <Label className="text-sm md:text-base mb-2 block">Visit Type</Label>
                  <Select value={visitType} onValueChange={setVisitType}>
                    <SelectTrigger className="h-11 md:h-12 text-base"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admission" className="text-base py-3">Admission</SelectItem>
                      <SelectItem value="routine_visit" className="text-base py-3">Routine Visit</SelectItem>
                      <SelectItem value="recertification" className="text-base py-3">Recertification</SelectItem>
                      <SelectItem value="discharge" className="text-base py-3">Discharge</SelectItem>
                      <SelectItem value="prn" className="text-base py-3">PRN Visit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-sm md:text-base mb-2 block">Diagnosis</Label>
                  <Select value={diagnosis} onValueChange={setDiagnosis}>
                    <SelectTrigger className="h-11 md:h-12 text-base"><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {commonDiagnoses.map((dx) => (
                        <SelectItem key={dx} value={dx} className="text-base py-3">{dx}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {diagnosis === "Custom (type below)" && (
                <Input 
                  placeholder="Enter custom diagnosis" 
                  value={customDiagnosis} 
                  onChange={(e) => setCustomDiagnosis(e.target.value)}
                  className="h-11 md:h-12 text-base"
                />
              )}
            </CardContent>
          </Card>

          {/* Step 2: Vitals */}
          <Card id="step-vitals" className={`border-2 ${currentStep === 'vitals' ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'}`}>
            <CardHeader className="py-4 md:py-5 bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle className="text-base md:text-lg flex items-center gap-2">
                <Activity className="w-5 h-5 text-green-600" />
                2. Vital Signs
                {(vitalSigns.bp || vitalSigns.hr) && <CheckCircle2 className="w-5 h-5 text-green-500 ml-auto" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <SmartVitalsInput 
                vitalSigns={vitalSigns} 
                onChange={setVitalSigns} 
              />
            </CardContent>
          </Card>

          {/* Step 3: Notes */}
          <Card id="step-notes" className={`border-2 ${currentStep === 'notes' ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'}`}>
            <CardHeader className="py-4 md:py-5 bg-gradient-to-r from-purple-50 to-pink-50">
              <CardTitle className="text-base md:text-lg flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Wand2 className="w-5 h-5 text-purple-600 flex-shrink-0" />
                  <span className="truncate">3. Your Notes</span>
                  {roughNote.length >= 20 && <CheckCircle2 className="w-5 h-5 text-green-500 flex-shrink-0" />}
                </div>
                <VoiceHub onTranscription={handleVoiceTranscription} />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 md:p-6 space-y-4">
              {/* Smart auto-complete textarea with phrase categories */}
              <SmartAutoComplete
                value={roughNote}
                onChange={(value) => {
                  if (!noteStartTime && value.length > 0) {
                    setNoteStartTime(Date.now());
                  }
                  setRoughNote(value);
                }}
                placeholder="Type or dictate your notes... Start typing trigger words like 'lungs', 'heart', 'wound' for quick phrases"
                diagnosis={finalDiagnosis}
                className="min-h-[150px]"
              />
              
              {/* Character count */}
              <div className="flex items-center gap-2">
                <p className={`text-sm ${roughNote.length >= 20 ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                  {roughNote.length} characters
                </p>
                {roughNote.length < 20 && roughNote.length > 0 && (
                  <p className="text-sm text-orange-500">(min 20 required)</p>
                )}
              </div>
              </CardContent>
              </Card>

            {/* Unified AI Suggestions - Compliance + Quality */}
            {!enhancedNote && roughNote.length >= 100 && (
              <UnifiedAISuggestions
                roughNote={roughNote}
                diagnosis={finalDiagnosis}
                vitalSigns={vitalSigns}
                patientData={selectedPatient}
                patientContext={patientContext}
                careType="home_health"
                visitType={visitType}
                appliedFixes={appliedFixes}
                onApplyFix={(textOrUpdatedNote, category, isReplacement) => {
                  if (isReplacement) {
                    // Replace entire note with updated version (for quality fixes)
                    setRoughNote(textOrUpdatedNote);
                  } else {
                    // Add text to note (for compliance additions)
                    const normalizedText = textOrUpdatedNote.trim().toLowerCase();
                    const normalizedNote = roughNote.trim().toLowerCase();
                    
                    if (!normalizedNote.includes(normalizedText.substring(0, 100))) {
                      setRoughNote(prev => prev + '\n\n' + textOrUpdatedNote);
                    }
                  }
                  
                  if (category && !appliedFixes.includes(category)) {
                    setAppliedFixes(prev => [...prev, category]);
                  }
                }}
                onApplyAll={(replacements, additions) => {
                  // Apply quality replacements first
                  let updatedNote = roughNote;
                  replacements.forEach(({ from, to }) => {
                    updatedNote = updatedNote.replace(from, to);
                  });
                  
                  // Then add compliance additions
                  if (additions.length > 0) {
                    updatedNote = updatedNote + '\n\n' + additions.join('\n\n');
                  }
                  
                  setRoughNote(updatedNote);
                  setAppliedFixes(prev => [...prev, ...additions.map(a => a.split(':')[0].trim())]);
                }}
              />
            )}

            {/* Enhance Button - After Compliance Checks */}
            {!enhancedNote && roughNote.length >= 20 && (
              <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50">
                <CardContent className="p-4">
                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-5 h-5 text-purple-600" />
                      <span className="text-sm font-medium">Ready to transform your notes</span>
                    </div>
                    <Button
                      onClick={handleEnhanceNote}
                      disabled={isProcessing}
                      className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 w-full sm:w-auto h-11 text-base"
                    >
                      {isProcessing ? (
                        <><div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" /> Enhancing...</>
                      ) : (
                        <><Sparkles className="w-5 h-5 mr-2" /> Enhance with AI</>
                      )}
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}



          {/* Step 4: Enhanced Note */}
          {enhancedNote && (
            <>
              <Card id="step-enhance" className="border-2 border-green-300 bg-green-50">
                <CardHeader className="py-4 md:py-5">
                  <CardTitle className="text-base md:text-lg flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <span>4. Final Enhanced Note - Ready for EHR</span>
                    </div>
                    <span className="text-xs md:text-sm text-gray-500 font-normal sm:ml-auto">Yellow highlights = areas needing completion</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-4 md:p-6">
                  <RichTextNoteEditor
                    value={enhancedNote}
                    onChange={setEnhancedNote}
                    onCopy={() => {
                      setCopied(true);
                      setTimeout(() => setCopied(false), 2000);
                    }}
                    copied={copied}
                    qualityScore={auditResults?.quality_score}
                  />
                </CardContent>
              </Card>

              {/* Next Steps Panel - Clear action-oriented summary */}
              <NextStepsPanel
                copied={copied}
                isSaving={isSaving}
                savedSuccessfully={savedSuccessfully}
                onCopy={handleCopy}
                onSave={handleSaveNote}
                onGenerateTasks={() => setActiveAccordion('tasks')}
                onGenerateCarePlans={() => setActiveAccordion('careplans')}
                onStartNew={handleClearNote}
                complianceScore={enhancedNoteCompliance?.overall_score}
              />
            </>
          )}

          {/* Additional Tools */}
          {enhancedNote && selectedPatientId && (
            <Accordion type="single" collapsible value={activeAccordion} onValueChange={setActiveAccordion}>
              <AccordionItem value="tasks">
                <AccordionTrigger className="text-sm">
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-4 h-4" /> Generate Follow-up Tasks
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <TaskGenerator
                    enhancedNote={enhancedNote}
                    narrativeText={roughNote}
                    patientId={selectedPatientId}
                    patientName={selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : null}
                    diagnosis={finalDiagnosis}
                    complianceGaps={enhancedNoteCompliance?.flagged_issues || roughNoteCompliance?.elements?.filter(e => e.status !== 'present') || []}
                    nurseEmail={currentUser?.email}
                    autoGenerate={false}
                  />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="careplans">
                <AccordionTrigger className="text-sm">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4" /> Generate Care Plans
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <AICarePlanGenerator
                    patientId={selectedPatientId}
                    diagnosis={finalDiagnosis}
                    enhancedNote={enhancedNote}
                  />
                </AccordionContent>
              </AccordionItem>
              <AccordionItem value="incident">
                <AccordionTrigger className="text-sm">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> Report Incident
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <p className="text-sm text-gray-600">Incident reporting form will appear here.</p>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>

        {/* Dynamic AI Sidebar */}
        <div className="space-y-4 md:space-y-6">
          <DynamicAISidebar
            currentStep={currentStep}
            hasPatient={!!selectedPatientId}
            hasNotes={roughNote.length >= 20}
            hasEnhancedNote={!!enhancedNote}
            diagnosis={finalDiagnosis}
            complianceScore={enhancedNoteCompliance?.overall_score}
            patientData={selectedPatient}
            vitalSigns={vitalSigns}
            hasOASIS={patientOASIS?.length > 0}
            oasisLinkedItems={oasisLinkedItems}
            onAction={handleContextualAction}
            onInsertGuideline={(text) => setRoughNote(prev => prev + '\n\n' + text)}
            onAddOASISLink={(link) => setOasisLinkedItems(prev => [...prev, link])}
            onRemoveOASISLink={(idx) => setOasisLinkedItems(prev => prev.filter((_, i) => i !== idx))}
          />
        </div>
        </div>

        {/* AI Patient History Summarizer - Moved to bottom */}
        {selectedPatient && (
        <AIPatientHistorySummarizer
          patientId={selectedPatientId}
          patientName={`${selectedPatient.first_name} ${selectedPatient.last_name}`}
          diagnosis={finalDiagnosis || selectedPatient.primary_diagnosis}
          previousVisits={recentVisits}
          carePlans={carePlans}
          onInsertSummary={(text) => setRoughNote(prev => text + '\n\n' + prev)}
          compact={false}
        />
        )}



      {/* Floating Action Bar */}
      <FloatingActionBar
        roughNoteLength={roughNote.length}
        hasEnhancedNote={!!enhancedNote}
        isProcessing={isProcessing}
        copied={copied}
        complianceScore={enhancedNoteCompliance?.overall_score || roughNoteCompliance?.score || null}
        onEnhance={handleEnhanceNote}
        onCopy={handleCopy}
        onClear={handleClearNote}
        onGenerateTasks={() => setActiveAccordion('tasks')}
      />
    </div>
  );
}
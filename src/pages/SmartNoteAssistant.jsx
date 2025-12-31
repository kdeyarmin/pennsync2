import React, { useState, useMemo, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Sparkles,
  CheckCircle2,
  User,
  Activity,
  ClipboardList,
  AlertTriangle,
  Mic,
  MicOff,
  ChevronRight,
  ChevronLeft,
  Brain,
  HelpCircle,
  ArrowRight,
  Copy,
  RotateCcw,
  Lightbulb,
  MessageCircle,
  Edit3,
  BookOpen,
  DollarSign,
  AlertCircle,
  FileText
} from "lucide-react";
import ComplianceScoreIndicator from "../components/smartNote/ComplianceScoreIndicator";
import ClinicalDecisionSupport from "../components/smartNote/ClinicalDecisionSupport";
import TaskGenerator from "../components/smartNote/TaskGenerator";
import UnifiedComplianceEngine from "../components/compliance/UnifiedComplianceEngine";
import AICarePlanGenerator from "../components/carePlan/AICarePlanGenerator";
import AICarePlanOptimizer from "../components/carePlan/AICarePlanOptimizer";
import ComplianceSummaryReport from "../components/smartNote/ComplianceSummaryReport";
import FloatingActionBar from "../components/smartNote/FloatingActionBar";
import QuickPhraseButtons from "../components/smartNote/QuickPhraseButtons";
import EnhancedStepIndicator from "../components/smartNote/EnhancedStepIndicator";
import UnifiedAIPanel from "../components/smartNote/UnifiedAIPanel";
import QuickActionsBar from "../components/smartNote/QuickActionsBar";
import RichTextNoteEditor from "../components/smartNote/RichTextNoteEditor";
import SmartVitalsInput from "../components/smartNote/SmartVitalsInput";
import SmartAutoComplete from "../components/smartNote/SmartAutoComplete";
import SearchablePatientSelect from "../components/ui/SearchablePatientSelect";
import AIPatientHistorySummarizer from "../components/smartNote/AIPatientHistorySummarizer";
import { logActivity, ActivityActions } from "../components/utils/activityLogger";
import { todayEastern, formatEastern } from "../components/utils/timezone";
import ConsolidatedAIFeedback from "../components/smartNote/ConsolidatedAIFeedback";
import NextStepsPanel from "../components/smartNote/NextStepsPanel";
import UnifiedPatientOverview from "../components/smartNote/UnifiedPatientOverview";
import UnifiedAISuggestions from "../components/smartNote/UnifiedAISuggestions";
import DynamicAISidebar from "../components/smartNote/DynamicAISidebar";
import { retrieveRelevantGuidelines, formatGuidelinesForPrompt } from "../components/smartNote/GuidelineContextRetriever";
import FavoriteButton from "../components/navigation/FavoriteButton";
import MedicalTerminologyProcessor, { standardizeTerminology } from "../components/smartNote/MedicalTerminologyProcessor";
import ComprehensivePatientContext, { buildComprehensiveContext, formatContextForAI } from "../components/smartNote/ComprehensivePatientContext";
import AIProactiveSuggestions from "../components/smartNote/AIProactiveSuggestions";
import GuidelineReferencePanel from "../components/guidelines/GuidelineReferencePanel";
import AutomaticDocumentReviewer from "../components/review/AutomaticDocumentReviewer";
import RealTimeClinicalAlertMonitor from "../components/smartNote/RealTimeClinicalAlertMonitor";
import AIMedicalKnowledgeBase from "../components/smartNote/AIMedicalKnowledgeBase";
import AIDocumentAnalyzer from "../components/smartNote/AIDocumentAnalyzer";
import PatientHistoryTimeline from "../components/patient/PatientHistoryTimeline";
import { buildComprehensivePatientHistory } from "../components/utils/patientHistoryAnalyzer";
import OASISAutomationPanel from "../components/oasis/OASISAutomationPanel";
import GuidedDocumentationWorkflow from "../components/smartNote/GuidedDocumentationWorkflow";
import PatientHistoryAutoPopulator from "../components/smartNote/PatientHistoryAutoPopulator";
import ConditionalAIAssistant from "../components/smartNote/ConditionalAIAssistant";
import RealTimeDocumentationAI from "../components/smartNote/RealTimeDocumentationAI";
import VisitTypeSpecificGuidance from "../components/smartNote/VisitTypeSpecificGuidance";
import PersonalizedEducationGenerator from "../components/education/PersonalizedEducationGenerator";
import AIComplianceAssistant from "../components/compliance/AIComplianceAssistant";
import UnifiedDocumentReview from "../components/smartNote/UnifiedDocumentReview";
import AIScenarioTemplates from "../components/smartNote/AIScenarioTemplates";
import ProactiveEducationSuggester from "../components/smartNote/ProactiveEducationSuggester";
import AIAdmissionDocumentationAssistant from "../components/clinical/AIAdmissionDocumentationAssistant";
import AISmartOASISAssistant from "../components/oasis/AISmartOASISAssistant";
import GuidedVisitWorkflow from "../components/visit/GuidedVisitWorkflow";
import EnhancedPatientContextPanel from "../components/smartNote/EnhancedPatientContextPanel";

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

// Smart caching for AI responses to prevent redundant API calls
const aiResponseCache = new Map();

const useCachedAIResponse = (cacheKey, fetcher, ttl = 300000) => { // 5 min TTL
  const getCached = () => {
    const cached = aiResponseCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < ttl) {
      return cached.data;
    }
    return null;
  };

  const setCached = (data) => {
    aiResponseCache.set(cacheKey, { data, timestamp: Date.now() });
    return data;
  };

  return { getCached, setCached };
};

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
  const [copied, setCopied] = useState(false);
  const [analysisResults, setAnalysisResults] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccessfully, setSavedSuccessfully] = useState(false);
  const [collapsedSteps, setCollapsedSteps] = useState([]);
  const [recheckMode, setRecheckMode] = useState(false);
  const [listening, setListening] = useState(false);
  const [interimText, setInterimText] = useState('');
  const recognitionRef = React.useRef(null);
  const [oasisSuggestions, setOasisSuggestions] = useState(null);
  const [admissionDocumentation, setAdmissionDocumentation] = useState({});
  const [useGuidedWorkflow, setUseGuidedWorkflow] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Log page visit
  useEffect(() => {
    if (currentUser?.email) {
      logActivity(ActivityActions.PAGE_VISIT, {
        page: 'SmartNoteAssistant',
        page_title: 'Smart Note Assistant'
      });
    }
  }, [currentUser?.email]);

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

  // Clear AI cache when patient changes
  React.useEffect(() => {
    if (selectedPatientId) {
      aiResponseCache.clear();
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
    if (!roughNote || roughNote.length < 50) return 'notes';
    if (!enhancedNote) return 'review';
    return 'complete';
  }, [selectedPatientId, roughNote, enhancedNote]);

  // Auto-collapse completed steps
  useEffect(() => {
    const newCollapsed = [];
    if (selectedPatientId && currentStep !== 'patient') newCollapsed.push('patient');
    if ((vitalSigns.bp || vitalSigns.hr) && currentStep !== 'vitals') newCollapsed.push('vitals');
    if (roughNote.length >= 50 && currentStep !== 'notes' && !enhancedNote) newCollapsed.push('notes');
    setCollapsedSteps(newCollapsed);
  }, [currentStep, selectedPatientId, vitalSigns, roughNote, enhancedNote]);

  const stepOrder = ['patient', 'vitals', 'notes', 'review', 'complete'];
  
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
    if (vitalSigns.bp || vitalSigns.hr) steps.push('vitals');
    if (roughNote.length >= 50) steps.push('notes');
    if (analysisResults) steps.push('review');
    if (enhancedNote) steps.push('complete');
    return steps;
  }, [selectedPatientId, vitalSigns, roughNote, enhancedNote, analysisResults]);

  const toggleStepCollapse = (step) => {
    setCollapsedSteps(prev => 
      prev.includes(step) ? prev.filter(s => s !== step) : [...prev, step]
    );
  };

  const handleEnhancedNoteReady = async ({ enhancedNote: finalNote, analysis, appliedSuggestions }) => {
    setEnhancedNote(finalNote);
    setAnalysisResults(analysis);
    setRecheckMode(false);

    // Auto-save to patient chart
    try {
      await base44.entities.Visit.create({
        patient_id: selectedPatientId,
        visit_date: visitDate,
        visit_type: visitType,
        status: 'completed',
        nurse_notes: finalNote,
        raw_transcription: roughNote,
        vital_signs: {
          blood_pressure_systolic: vitalSigns.bp?.split('/')[0] || null,
          blood_pressure_diastolic: vitalSigns.bp?.split('/')[1] || null,
          heart_rate: vitalSigns.hr ? parseInt(vitalSigns.hr) : null,
          temperature: vitalSigns.temp ? parseFloat(vitalSigns.temp) : null,
          oxygen_saturation: vitalSigns.o2 ? parseInt(vitalSigns.o2) : null,
          pain_level: vitalSigns.pain ? parseInt(vitalSigns.pain) : null
        }
      });

      setSavedSuccessfully(true);
      setTimeout(() => setSavedSuccessfully(false), 3000);

      logActivity(ActivityActions.NOTE_ENHANCED, {
        patient_id: selectedPatientId,
        visit_type: visitType,
        diagnosis: finalDiagnosis,
        overall_score: analysis.overall_score,
        suggestions_applied: appliedSuggestions.length,
        page: 'SmartNoteAssistant',
        ai_utilization: true
      });

      queryClient.invalidateQueries({ queryKey: ['patientRecentVisits', selectedPatientId] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    } catch (error) {
      console.error('Error saving note:', error);
    }
  };



    const handleCopy = () => {
    navigator.clipboard.writeText(enhancedNote);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    
    // Log copy action
    logActivity(ActivityActions.EXPORT, {
      type: 'clipboard_copy',
      patient_id: selectedPatientId,
      content_type: 'enhanced_note',
      note_length: enhancedNote.length,
      page: 'SmartNoteAssistant'
    });
  };



  const handleClearNote = () => {
    setRoughNote("");
    setEnhancedNote("");
    setAnalysisResults(null);
    setVisitDate(todayEastern());
    setCopied(false);
    setSavedSuccessfully(false);
    setCollapsedSteps([]);
    setRecheckMode(false);
  };

  const handleRecheck = () => {
    setRoughNote(enhancedNote);
    setEnhancedNote("");
    setAnalysisResults(null);
    setRecheckMode(true);
  };

  const startDictation = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported in your browser');
      return;
    }
    
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognitionRef.current = recognition;
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interim = '';
      let final = '';
      
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          final += transcript + ' ';
        } else {
          interim += transcript;
        }
      }
      
      if (final) {
        setRoughNote(prev => prev ? prev + ' ' + final.trim() : final.trim());
        setInterimText('');
      } else if (interim) {
        setInterimText(interim);
      }
    };
    
    recognition.onend = () => {
      if (listening) {
        try {
          recognition.start();
        } catch (e) {
          console.error('Restart error:', e);
        }
      } else {
        setListening(false);
        setInterimText('');
      }
    };
    
    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      if (event.error === 'no-speech' || event.error === 'audio-capture') {
        if (listening) {
          setTimeout(() => {
            try {
              recognition.start();
            } catch (e) {}
          }, 100);
        }
      } else {
        setListening(false);
        setInterimText('');
      }
    };
    
    setListening(true);
    recognition.start();
  };

  const stopDictation = () => {
    setListening(false);
    setInterimText('');
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      recognitionRef.current = null;
    }
  };

  React.useEffect(() => {
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  const handleSaveAdmissionSection = (sectionTitle, content) => {
    setAdmissionDocumentation(prev => ({
      ...prev,
      [sectionTitle]: content
    }));
    
    // Optionally append to rough notes for continuity
    const sectionText = `\n\n=== ${sectionTitle} ===\n${content}`;
    setRoughNote(prev => prev + sectionText);
  };

  // Show admission tools only for admission visits
  const showAdmissionTools = visitType === 'admission' && selectedPatientId;

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-4 md:mb-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 md:gap-4">
        <div className="flex items-center gap-2 md:gap-3 flex-1 min-w-0 w-full sm:w-auto">
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
          <div className="min-w-0 flex-1">
            <h1 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 truncate">Smart Note Assistant</h1>
            <p className="text-sm md:text-base text-gray-600 hidden md:block">Transform rough notes into Medicare-compliant documentation</p>
          </div>
        </div>
        <div className="flex gap-2 flex-shrink-0 w-full sm:w-auto">
          <div className="flex-1 sm:flex-initial">
            <FavoriteButton type="page" id="SmartNoteAssistant" name="Smart Note Assistant" />
          </div>
          <Button 
            variant="ghost" 
            size="default" 
            className="text-gray-500 gap-1 min-h-[44px] flex-1 sm:flex-initial"
            onClick={async () => {
              try {
                const response = await base44.functions.invoke('generateSmartNoteGuide');
                const data = response.data || response;
                
                if (data.pdf) {
                  const binaryString = atob(data.pdf);
                  const bytes = new Uint8Array(binaryString.length);
                  for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                  }
                  const blob = new Blob([bytes], { type: 'application/pdf' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = data.filename || 'Smart_Note_Guide.pdf';
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  a.remove();
                }
              } catch (error) {
                console.error('Error downloading guide:', error);
                alert('Failed to download guide. Please try again.');
              }
            }}
          >
            <HelpCircle className="w-5 h-5" />
            <span className="hidden xl:inline">User Guide</span>
          </Button>
        </div>
      </div>

      {/* Workflow Mode Toggle */}
      {selectedPatientId && !enhancedNote && (
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span className="font-medium">{currentStep === 'patient' ? '1/2' : '2/2'}</span>
            <ChevronRight className="w-4 h-4" />
            <span>{currentStep === 'patient' ? 'Select Patient' : currentStep === 'notes' ? 'Write Notes' : 'Reviewing...'}</span>
          </div>
          <Button
            variant={useGuidedWorkflow ? "default" : "outline"}
            size="sm"
            onClick={() => setUseGuidedWorkflow(!useGuidedWorkflow)}
            className="gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {useGuidedWorkflow ? 'Guided Mode' : 'Switch to Guided'}
          </Button>
        </div>
      )}

      {/* Compact Patient Overview */}
      {selectedPatient && currentStep !== 'patient' && (
        <Card className="mb-4 bg-blue-50 border-blue-300">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="w-5 h-5 text-blue-600" />
              <div>
                <p className="font-medium text-gray-900">{selectedPatient.first_name} {selectedPatient.last_name}</p>
                <p className="text-xs text-gray-600">{selectedPatient.primary_diagnosis}</p>
              </div>
            </div>
            {selectedPatient.allergies && (
              <Badge variant="destructive" className="text-xs"><AlertTriangle className="w-3 h-3 mr-1" /> Allergies</Badge>
            )}
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="lg:col-span-2 space-y-4 md:space-y-6">

          {/* Guided Workflow Mode */}
          {useGuidedWorkflow && selectedPatientId && !enhancedNote && (
            <GuidedVisitWorkflow
              patientData={selectedPatient}
              visitType={visitType}
              carePlans={carePlans}
              recentVisits={recentVisits}
              onComplete={(workflowData) => {
                // Compile all workflow data into rough notes
                let compiledNotes = '';
                Object.entries(workflowData).forEach(([stepId, stepData]) => {
                  compiledNotes += `\n\n=== ${stepId.toUpperCase()} ===\n`;
                  Object.entries(stepData).forEach(([field, value]) => {
                    if (value && !field.startsWith('previous_') && !field.startsWith('last_')) {
                      compiledNotes += `${field}: ${value}\n`;
                    }
                  });
                });
                setRoughNote(compiledNotes.trim());
                setUseGuidedWorkflow(false);
              }}
            />
          )}

          {/* Enhanced Patient Context Panel */}
          {selectedPatientId && (
            <EnhancedPatientContextPanel
              patient={selectedPatient}
              onContextUpdate={(context) => {
                // Context is available for use in other components
                console.log('Patient context updated:', context);
              }}
            />
          )}

          {!useGuidedWorkflow && (
            <React.Fragment>

          {/* Step 1: Patient Selection - Collapsible */}
          <Card id="step-patient" className={`border-2 transition-all duration-300 ${currentStep === 'patient' ? 'border-blue-500 shadow-lg' : 'border-gray-300'}`}>
            <CardHeader 
              className={`py-4 md:py-5 cursor-pointer ${currentStep === 'patient' ? 'bg-gradient-to-r from-blue-100 to-indigo-100' : 'bg-gray-50'}`}
              onClick={() => collapsedSteps.includes('patient') && toggleStepCollapse('patient')}
            >
              <CardTitle className="text-base md:text-lg flex items-center gap-3">
                <div className={`p-2 rounded-full ${selectedPatient ? 'bg-green-500' : 'bg-blue-500'}`}>
                  <User className="w-4 h-4 text-white" />
                </div>
                <span>1. Patient & Visit</span>
                {selectedPatient && (
                  <span className="text-sm text-gray-600 ml-2">{selectedPatient.first_name} {selectedPatient.last_name}</span>
                )}
                {selectedPatient && <CheckCircle2 className="w-5 h-5 text-green-600 ml-auto" />}
              </CardTitle>
            </CardHeader>
            {!collapsedSteps.includes('patient') && (
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
            )}
          </Card>



          {/* Step 2: Vitals - Collapsible */}
          {selectedPatientId && (
            <Card id="step-vitals" className={`border-2 transition-all duration-300 ${currentStep === 'vitals' ? 'border-green-500 shadow-lg' : 'border-gray-300'}`}>
              <CardHeader 
                className={`py-4 md:py-5 cursor-pointer ${currentStep === 'vitals' ? 'bg-gradient-to-r from-green-100 to-emerald-100' : 'bg-gray-50'}`}
                onClick={() => collapsedSteps.includes('vitals') && toggleStepCollapse('vitals')}
              >
                <CardTitle className="text-base md:text-lg flex items-center gap-3">
                  <div className={`p-2 rounded-full ${(vitalSigns.bp || vitalSigns.hr) ? 'bg-green-500' : 'bg-gray-400'}`}>
                    <Activity className="w-4 h-4 text-white" />
                  </div>
                  <span>2. Vitals</span>
                  {(vitalSigns.bp || vitalSigns.hr) && (
                    <span className="text-sm text-gray-600 ml-2">BP: {vitalSigns.bp || '-'} | HR: {vitalSigns.hr || '-'}</span>
                  )}
                  {(vitalSigns.bp || vitalSigns.hr) && <CheckCircle2 className="w-5 h-5 text-green-600 ml-auto" />}
                </CardTitle>
              </CardHeader>
              {!collapsedSteps.includes('vitals') && (
                <CardContent className="p-4 md:p-6">
                  <SmartVitalsInput 
                    vitalSigns={vitalSigns} 
                    onChange={setVitalSigns} 
                  />
                </CardContent>
              )}
            </Card>
          )}

          {/* Step 2.5: Admission Documentation Tools (Admission Visits Only) */}
          {showAdmissionTools && !enhancedNote && (
            <Card className="border-2 border-indigo-500 bg-gradient-to-r from-indigo-50 to-blue-50">
              <CardHeader className="py-4">
                <CardTitle className="text-base md:text-lg flex items-center gap-3">
                  <div className="p-2 rounded-full bg-indigo-500">
                    <FileText className="w-4 h-4 text-white" />
                  </div>
                  <span>Admission Documentation Tools</span>
                  <Badge className="bg-indigo-600">Admission Only</Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <Tabs defaultValue="oasis" className="w-full">
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="oasis">OASIS Assistant</TabsTrigger>
                    <TabsTrigger value="documentation">Admission Documentation</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="oasis" className="space-y-4 mt-4">
                    <AISmartOASISAssistant
                      patientData={selectedPatient}
                      referralData={null}
                      visitData={{
                        visitType,
                        vitalSigns,
                        roughNote
                      }}
                      onApplySuggestion={(suggestion) => {
                        setOasisSuggestions(prev => prev ? [...prev, suggestion] : [suggestion]);
                      }}
                      autoAnalyze={true}
                    />
                  </TabsContent>
                  
                  <TabsContent value="documentation" className="space-y-4 mt-4">
                    <AIAdmissionDocumentationAssistant
                      referralData={null}
                      oasisSuggestions={oasisSuggestions}
                      patientData={selectedPatient}
                      onSaveSection={handleSaveAdmissionSection}
                    />
                    {Object.keys(admissionDocumentation).length > 0 && (
                      <Alert className="bg-green-50 border-green-300">
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        <AlertDescription className="text-green-900">
                          <strong>Sections Saved:</strong> {Object.keys(admissionDocumentation).length} admission sections have been added to your notes.
                        </AlertDescription>
                      </Alert>
                    )}
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Rough Notes */}
          {selectedPatientId && (
            <Card id="step-notes" className={`border-2 transition-all duration-300 ${currentStep === 'notes' ? 'border-purple-500 shadow-lg' : 'border-gray-300'}`}>
              <CardHeader className={`py-4 md:py-5 ${currentStep === 'notes' ? 'bg-gradient-to-r from-purple-100 to-pink-100' : 'bg-gray-50'}`}>
                <CardTitle className="text-base md:text-lg flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <div className={`p-2 rounded-full ${roughNote.length >= 50 ? 'bg-green-500' : 'bg-purple-500'}`}>
                      <Edit3 className="w-4 h-4 text-white flex-shrink-0" />
                    </div>
                    <span className="truncate">3. Notes</span>
                    {roughNote.length >= 50 && <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />}
                    </div>
                    </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6 space-y-4">
                <div className="relative">
                 <Textarea
                   value={roughNote}
                   onChange={(e) => setRoughNote(e.target.value)}
                   placeholder="Type or dictate your rough notes or bullet points...&#10;&#10;Examples:&#10;• Patient states feeling better&#10;• Wound improving, less drainage&#10;• Taught medication management&#10;• BP elevated, pt needs MD follow-up"
                   className="min-h-[200px] text-base touch-target"
                 />
                  {interimText && (
                    <div className="absolute bottom-2 left-2 right-2 bg-blue-100/90 border border-blue-300 rounded px-3 py-2 text-sm text-blue-900 italic pointer-events-none">
                      <Mic className="w-3 h-3 inline mr-1" />
                      {interimText}...
                    </div>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <Button
                   size="sm"
                   variant={listening ? "destructive" : "outline"}
                   onClick={listening ? stopDictation : startDictation}
                   className="gap-2 min-h-[44px]"
                  >
                    {listening ? (
                      <>
                        <MicOff className="w-4 h-4" />
                        Stop Dictation
                      </>
                    ) : (
                      <>
                        <Mic className="w-4 h-4" />
                        Start Dictation
                      </>
                    )}
                  </Button>
                  <div className="flex items-center gap-3 text-sm">
                    {listening && (
                      <div className="flex items-center gap-1 animate-pulse text-red-600">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        <span className="text-xs">Recording</span>
                      </div>
                    )}
                    <p className={`${roughNote.length >= 50 ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                      {roughNote.length} chars {roughNote.length < 50 && roughNote.length > 0 && <span className="text-orange-500">(min 50)</span>}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Auto-Enhancement */}
          {roughNote.length >= 50 && !enhancedNote && (
            <div id="step-review">
              <UnifiedDocumentReview
                roughNote={roughNote}
                visitType={visitType}
                diagnosis={finalDiagnosis}
                patientData={selectedPatient}
                vitalSigns={vitalSigns}
                carePlans={carePlans}
                recentVisits={recentVisits}
                nurseType={currentUser?.credential_type || 'RN'}
                onEnhancedNoteReady={handleEnhancedNoteReady}
                autoRun={!recheckMode}
              />
            </div>
          )}



          {/* Final Enhanced Note */}
          {enhancedNote && (
            <Card id="step-complete" className="border-3 border-green-500 shadow-xl">
              <CardHeader className="py-5 bg-green-100">
                <CardTitle className="text-lg flex items-center gap-3">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span>Ready for EHR</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 md:p-6 space-y-4">
                <Textarea
                  value={enhancedNote}
                  onChange={(e) => setEnhancedNote(e.target.value)}
                  className="min-h-[300px] font-mono text-sm touch-target"
                />
                <div className="flex flex-col sm:flex-row gap-3">
                  <Button
                    onClick={handleCopy}
                    className="flex-1 bg-green-600 hover:bg-green-700 min-h-[44px]"
                  >
                    {copied ? (
                      <><CheckCircle2 className="w-4 h-4 mr-2" /> Copied!</>
                    ) : (
                      <><Copy className="w-4 h-4 mr-2" /> Copy to EHR</>
                    )}
                  </Button>
                  <Button
                    onClick={handleRecheck}
                    variant="outline"
                    className="flex-1 min-h-[44px]"
                  >
                    <Sparkles className="w-4 h-4 mr-2" />
                    Re-check Note
                  </Button>
                  <Button
                    onClick={handleClearNote}
                    variant="outline"
                    className="flex-1 min-h-[44px]"
                  >
                    <RotateCcw className="w-4 h-4 mr-2" />
                    Start New
                  </Button>
                </div>
                {savedSuccessfully && (
                  <Alert className="bg-green-50 border-green-300">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Note saved to patient chart successfully!
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          </React.Fragment>
          )}
        </div>
      </div>
    </div>
  );
}
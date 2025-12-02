import React, { useState, useEffect } from "react";
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
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Sparkles,
  Copy,
  CheckCircle2,
  Lightbulb,
  FileText,
  Wand2,
  AlertCircle,
  Zap,
  Brain,
  LayoutList,
  Shield,
  ClipboardList,
  Stethoscope,
  MessageSquare
} from "lucide-react";

import RealTimeSuggestions from "../components/smartNote/RealTimeSuggestions";
import PatientHistorySummary from "../components/smartNote/PatientHistorySummary";
import DataExtractor from "../components/smartNote/DataExtractor";
import InlineDataExtractor from "../components/smartNote/InlineDataExtractor";
import ExternalKnowledge from "../components/smartNote/ExternalKnowledge";
import PersonalizedFeedback from "../components/smartNote/PersonalizedFeedback";
import TaskGenerator from "../components/smartNote/TaskGenerator";
import MedicationAdherenceInsights from "../components/smartNote/MedicationAdherenceInsights";
import ClinicalDecisionSupport from "../components/smartNote/ClinicalDecisionSupport";
import ComplianceScoreIndicator from "../components/smartNote/ComplianceScoreIndicator";
import GuidedDocumentationFlow from "../components/smartNote/GuidedDocumentationFlow";
import PatientContextBar from "../components/smartNote/PatientContextBar";
import InlineSuggestions from "../components/smartNote/InlineSuggestions";
import QuickCarePlanUpdater from "../components/smartNote/QuickCarePlanUpdater";
import VoiceDictation from "../components/smartNote/VoiceDictation";
import AICarePlanGenerator from "../components/carePlan/AICarePlanGenerator";
import VoiceVitalsEntry from "../components/smartNote/VoiceVitalsEntry";
import GuidedIncidentReporting from "../components/incident/GuidedIncidentReporting";
import PersonalizedSkillBuilder from "../components/training/PersonalizedSkillBuilder";
import SmartNoteVoiceListener from "../components/voice/SmartNoteVoiceListener";
import NoteSummaryGenerator from "../components/smartNote/NoteSummaryGenerator";
import ProactiveComplianceChecker from "../components/smartNote/ProactiveComplianceChecker";
import DocumentationAssistantPopup from "../components/smartNote/DocumentationAssistantPopup";
import MedicareComplianceAssistant from "../components/smartNote/MedicareComplianceAssistant";
import IntelligentPatientContext from "../components/smartNote/IntelligentPatientContext";
import AIPatientSummaryReport from "../components/smartNote/AIPatientSummaryReport";
import MandatoryComplianceGate from "../components/compliance/MandatoryComplianceGate";
import EnhancedClinicalDecisionSupport from "../components/clinical/EnhancedClinicalDecisionSupport";
import AIDrivenDocumentationPrompts from "../components/smartNote/AIDrivenDocumentationPrompts";
import DocumentationWorkflowGuide from "../components/smartNote/DocumentationWorkflowGuide";
import UnifiedActionCenter from "../components/smartNote/UnifiedActionCenter";
import PersistentPatientHeader from "../components/smartNote/PersistentPatientHeader";
import QuickEditPreview from "../components/smartNote/QuickEditPreview";

export default function SmartNoteAssistant() {
  const [diagnosis, setDiagnosis] = useState("");
  const [customDiagnosis, setCustomDiagnosis] = useState("");
  const careType = "home_health"; // Fixed for home health only
  const [visitType, setVisitType] = useState("routine_visit");
  const [vitalSigns, setVitalSigns] = useState({
    bp: "",
    hr: "",
    temp: "",
    o2: "",
    pain: ""
  });
  const [roughNote, setRoughNote] = useState("");
  const [enhancedNote, setEnhancedNote] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [auditResults, setAuditResults] = useState(null);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [extractedDataState, setExtractedDataState] = useState(null);
  const [documentationMode, setDocumentationMode] = useState("freeform"); // "freeform" or "guided"
      const [prefillData, setPrefillData] = useState(null);
      const [compliancePassed, setCompliancePassed] = useState(false);
      const [showEditPreview, setShowEditPreview] = useState(false);
      const [editPreviewContent, setEditPreviewContent] = useState("");
      const [editPreviewTitle, setEditPreviewTitle] = useState("");
      const [aiPrompts, setAiPrompts] = useState(null);
      const [templateUsed, setTemplateUsed] = useState(false);

  // Fetch current user for personalized feedback
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Fetch patients for history summary
  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  // Fetch visits for selected patient
  const { data: patientVisits = [] } = useQuery({
    queryKey: ['patientVisits', selectedPatientId],
    queryFn: () => base44.entities.Visit.filter({ patient_id: selectedPatientId, status: 'completed' }, '-visit_date'),
    enabled: !!selectedPatientId,
  });

  // Fetch care plans for selected patient
  const { data: carePlans = [] } = useQuery({
    queryKey: ['patientCarePlans', selectedPatientId],
    queryFn: () => base44.entities.CarePlan.filter({ patient_id: selectedPatientId }),
    enabled: !!selectedPatientId,
  });

  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  // Handle inline suggestion acceptance
  const handleAcceptInlineSuggestion = (text) => {
    setRoughNote(prev => prev + ' ' + text);
  };

  // Handle compliance element insertion
  const handleInsertComplianceElement = (text) => {
    setRoughNote(prev => prev + '\n\n' + text);
  };

  // Handle guided note change
  const handleGuidedNoteChange = (combinedNote) => {
    setRoughNote(combinedNote);
  };

  // Handle voice transcription
  const handleTranscriptionComplete = (transcription) => {
    setRoughNote(prev => prev ? prev + '\n\n' + transcription : transcription);
  };

  // Handle voice vitals entry
  const handleVoiceVitals = (vitals) => {
    setVitalSigns(prev => ({
      bp: vitals.bp || prev.bp,
      hr: vitals.hr || prev.hr,
      temp: vitals.temp || prev.temp,
      o2: vitals.o2 || prev.o2,
      pain: vitals.pain || prev.pain
    }));
  };

  // Handle voice phrase entry
  const handleVoicePhrase = (phrase) => {
    setRoughNote(prev => prev + ' ' + phrase);
  };

  // Handle voice command vital change
  const handleVoiceVitalChange = (vitalType, value) => {
    setVitalSigns(prev => {
      switch (vitalType) {
        case 'bp': return { ...prev, bp: value };
        case 'hr': return { ...prev, hr: value };
        case 'temp': return { ...prev, temp: value };
        case 'o2': return { ...prev, o2: value };
        case 'pain': return { ...prev, pain: value };
        case 'rr': return { ...prev, rr: value || prev.rr };
        case 'weight': return { ...prev, weight: value || prev.weight };
        default: return prev;
      }
    });
  };

  // Handle voice command actions
  const handleVoiceAction = (action) => {
    switch (action) {
      case 'start_dictation':
        document.querySelector('[data-dictation-start]')?.click();
        break;
      case 'stop_dictation':
        document.querySelector('[data-dictation-stop]')?.click();
        break;
      case 'enhance_note':
        handleEnhanceNote();
        break;
      case 'save_note':
        handleCopyToClipboard();
        break;
      case 'copy_note':
        handleCopyToClipboard();
        break;
      case 'clear_note':
        setRoughNote('');
        setEnhancedNote('');
        break;
      case 'generate_care_plan':
        document.querySelector('[data-care-plan-generator]')?.scrollIntoView({ behavior: 'smooth' });
        break;
      case 'report_incident':
        document.querySelector('[data-incident-reporter]')?.scrollIntoView({ behavior: 'smooth' });
        break;
    }
  };

  // Handle inserting suggestions
  const handleInsertSuggestion = (text, position) => {
    if (position === 'inline') {
      setRoughNote(prev => prev + ' ' + text);
    } else {
      setRoughNote(prev => prev + '\n\n' + text);
    }
  };

  // Handle prefill from IntelligentPatientContext
  const handlePrefillSuggestion = (section, text) => {
    if (documentationMode === 'guided') {
      setPrefillData(prev => ({ ...prev, [section]: text }));
    } else {
      setRoughNote(prev => prev ? prev + '\n\n' + text : text);
    }
  };

  // Handle context insertion from IntelligentPatientContext
  const handleInsertContext = (text) => {
    setRoughNote(prev => prev + text);
  };

  // Handle training recommendation from compliance checker
      const handleTrainingRecommended = (trainingTopic) => {
        // Navigate to training page with the recommended topic
        window.location.href = `/NurseTraining?topic=${encodeURIComponent(trainingTopic)}`;
      };

      // Handle edit preview before inserting AI content
      const handleEditBeforeInsert = (content, title = "AI Generated Content") => {
        setEditPreviewContent(content);
        setEditPreviewTitle(title);
        setShowEditPreview(true);
      };

      const handleConfirmEditPreview = (editedContent) => {
        setRoughNote(prev => prev ? prev + '\n\n' + editedContent : editedContent);
        setShowEditPreview(false);
      };

      // Workflow step click handler
      const handleWorkflowStepClick = (stepId) => {
        switch (stepId) {
          case 'patient':
            document.getElementById('patient_select')?.focus();
            break;
          case 'vitals':
            document.querySelector('input[placeholder="BP: 120/80"]')?.focus();
            break;
          case 'template':
            setTemplateUsed(true);
            break;
          case 'enhance':
            handleEnhanceNote();
            break;
          default:
            break;
        }
      };

      // Collect all action items for unified action center
      const collectActionItems = () => {
        const items = {
          critical: aiPrompts?.critical_missing || [],
          suggestions: suggestions || [],
          compliance: auditResults?.missing_critical_elements?.map(el => ({
            title: el,
            message: `Missing: ${el}`,
            category: 'compliance'
          })) || []
        };
        return items;
      };

  const handleInsertSummary = (text) => {
    setRoughNote(prev => text + '\n\n' + prev);
  };

  const handleExtractedData = (data) => {
    setExtractedDataState(data);
    // Auto-fill vitals if extracted
    if (data.vital_signs) {
      const vs = data.vital_signs;
      setVitalSigns(prev => ({
        bp: vs.blood_pressure || prev.bp,
        hr: vs.heart_rate || prev.hr,
        temp: vs.temperature || prev.temp,
        o2: vs.oxygen_saturation || prev.o2,
        pain: vs.pain_level || prev.pain
      }));
    }
  };

  // Handle inline vitals extraction
  const handleInlineVitalsExtracted = (vitals) => {
    if (vitals) {
      setVitalSigns(prev => ({
        bp: vitals.blood_pressure || prev.bp,
        hr: vitals.heart_rate?.toString() || prev.hr,
        temp: vitals.temperature?.toString() || prev.temp,
        o2: vitals.oxygen_saturation?.toString() || prev.o2,
        pain: vitals.pain_level?.toString() || prev.pain
      }));
    }
  };

  const handleInsertInformation = (text) => {
    setEnhancedNote(prev => prev + text);
  };

  const handleTasksGenerated = (tasks) => {
    console.log('Tasks generated:', tasks);
    // Could integrate with a task management system
  };

  const handleCreateCarePlan = (carePlanData) => {
    if (selectedPatientId) {
      base44.entities.CarePlan.create({
        patient_id: selectedPatientId,
        problem: carePlanData.problem,
        goal: carePlanData.goal,
        status: 'active'
      });
      alert('Care plan created!');
    }
  };

  const commonDiagnoses = [
    "CHF (Congestive Heart Failure)",
    "COPD (Chronic Obstructive Pulmonary Disease)",
    "Diabetes Mellitus Type 2",
    "Hypertension",
    "Post-operative care",
    "Wound care",
    "Stroke/CVA",
    "Pneumonia",
    "Sepsis",
    "Cancer/Oncology",
    "Dementia/Alzheimer's",
    "Parkinson's Disease",
    "Hospice - Terminal illness",
    "Custom (type below)"
  ];

  const handleEnhanceNote = async () => {
    if (!roughNote.trim()) {
      alert("Please enter your rough notes first");
      return;
    }

    setIsProcessing(true);
    setSuggestions([]);
    setEnhancedNote("");

    try {
      const finalDiagnosis = diagnosis === "Custom (type below)" ? customDiagnosis : diagnosis;

      const prompt = `You are an expert clinical documentation specialist for ${careType === 'hospice' ? 'hospice' : 'home health'} nursing. Your task is to transform rough nursing notes into a polished, Medicare-compliant clinical narrative that can be copied directly into an EHR system.

PATIENT CONTEXT:
- Diagnosis: ${finalDiagnosis || 'Not specified'}
- Care Type: ${careType === 'hospice' ? 'Hospice' : 'Home Health'}
- Visit Type: ${visitType.replace(/_/g, ' ')}

VITAL SIGNS (if provided):
${vitalSigns.bp ? `- Blood Pressure: ${vitalSigns.bp}` : ''}
${vitalSigns.hr ? `- Heart Rate: ${vitalSigns.hr}` : ''}
${vitalSigns.temp ? `- Temperature: ${vitalSigns.temp}` : ''}
${vitalSigns.o2 ? `- O2 Saturation: ${vitalSigns.o2}%` : ''}
${vitalSigns.pain ? `- Pain Level: ${vitalSigns.pain}/10` : ''}

NURSE'S ROUGH NOTES:
${roughNote}

---

YOUR TASK:

1. **Transform the rough notes into a professional, EHR-ready clinical narrative** that includes:
   - Proper medical terminology
   - Complete sentences with correct grammar
   - Logical organization (use SOAP format if applicable)
   - Objective clinical observations
   - Patient responses to interventions
   - Professional nursing language

2. **Ensure Medicare Compliance** by including:
   ${careType === 'home_health' ? `
   - HOMEBOUND STATUS: If not mentioned in notes but seems applicable, add a sentence about why patient is homebound
   - SKILLED NEED: Emphasize why nursing skill/judgment is required
   - PATIENT RESPONSE: Document patient's response to teaching/interventions
   - FUNCTIONAL STATUS: Note any ADL/IADL limitations if mentioned
   ` : `
   - TERMINAL PROGNOSIS INDICATORS: Evidence of disease progression if applicable
   - SYMPTOM MANAGEMENT: Detailed symptom assessment (pain, dyspnea, nausea, etc.)
   - PATIENT/FAMILY COPING: Emotional and spiritual support
   - COMFORT MEASURES: Focus on quality of life
   `}

3. **Enhance Clinical Detail** by:
   - Expanding abbreviations where appropriate
   - Adding clinical context
   - Incorporating vital signs naturally into narrative
   - Adding assessment findings that logically follow from observations
   - Ensuring continuity and flow

4. **Keep all factual information from the original notes** - DO NOT fabricate clinical findings
   - If something is vague, keep it vague but professionally worded
   - If vital signs are provided, integrate them naturally
   - If certain elements are missing, note them as [to be documented]

Return your response as JSON with this structure:

{
  "enhanced_note": "The complete, polished clinical narrative ready for EHR copy/paste",
  "suggestions": [
    {
      "category": "Missing Element" | "Enhancement" | "Compliance" | "Best Practice",
      "suggestion": "Specific suggestion text",
      "rationale": "Why this matters",
      "priority": "high" | "medium" | "low"
    }
  ],
  "quality_score": 0-100,
  "compliance_items_present": ["List of Medicare elements found in note"],
  "missing_critical_elements": ["List of critical elements missing"]
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            enhanced_note: { type: "string" },
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  suggestion: { type: "string" },
                  rationale: { type: "string" },
                  priority: { type: "string" }
                }
              }
            },
            quality_score: { type: "number" },
            compliance_items_present: {
              type: "array",
              items: { type: "string" }
            },
            missing_critical_elements: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setEnhancedNote(result.enhanced_note);
      setSuggestions(result.suggestions || []);
      setAuditResults(result);

    } catch (error) {
      console.error("Error enhancing note:", error);
      alert("Error processing note. Please try again.");
    }

    setIsProcessing(false);
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(enhancedNote);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'Missing Element':
        return <AlertCircle className="w-4 h-4" />;
      case 'Enhancement':
        return <Sparkles className="w-4 h-4" />;
      case 'Compliance':
        return <CheckCircle2 className="w-4 h-4" />;
      case 'Best Practice':
        return <Lightbulb className="w-4 h-4" />;
      default:
        return <FileText className="w-4 h-4" />;
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Persistent Patient Header */}
              {selectedPatient && (
                <PersistentPatientHeader
                  patient={selectedPatient}
                  vitalSigns={vitalSigns}
                  carePlansCount={carePlans.length}
                />
              )}

              <div className="mb-6">
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-4">
                  <div>
                    <h1 className="text-2xl md:text-3xl font-bold text-gray-900">
                      Smart Note Assistant
                    </h1>
                    <p className="text-sm text-gray-600">
                      Transform rough notes into Medicare-compliant documentation
                    </p>
                  </div>
                </div>

                {/* Workflow Progress Guide */}
                <DocumentationWorkflowGuide
                  patientSelected={!!selectedPatientId}
                  vitalsEntered={!!(vitalSigns.bp || vitalSigns.hr || vitalSigns.temp)}
                  templateUsed={templateUsed}
                  notesEntered={roughNote.length > 50}
                  noteEnhanced={!!enhancedNote}
                  compliancePassed={compliancePassed}
                  onStepClick={handleWorkflowStepClick}
                />
              </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Input Section */}
          <Card className="border-2 border-blue-200">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-blue-600" />
                Patient & Visit Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 pt-6">
              {/* Patient Selection First */}
                      <div>
                        <Label htmlFor="patient_select">Select Patient</Label>
                        <Select value={selectedPatientId || "none"} onValueChange={(val) => setSelectedPatientId(val === "none" ? "" : val)}>
                          <SelectTrigger id="patient_select">
                            <SelectValue placeholder="Select patient..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="none">No patient selected</SelectItem>
                            {patients.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {p.first_name} {p.last_name} - {p.primary_diagnosis || 'No diagnosis'}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* AI Patient Summary Report */}
                      {selectedPatient && (
                        <AIPatientSummaryReport
                          patient={selectedPatient}
                          previousVisits={patientVisits}
                          carePlans={carePlans}
                          onInsertSummary={(text) => setRoughNote(prev => text + '\n\n' + prev)}
                        />
                      )}

                      {/* Intelligent Patient Context */}
                      {selectedPatient && (
                            <IntelligentPatientContext 
                              patient={selectedPatient} 
                              carePlans={carePlans}
                              previousVisits={patientVisits}
                              currentNoteText={roughNote}
                              visitType={visitType}
                              onInsertContext={handleInsertContext}
                              onPrefillSuggestion={handlePrefillSuggestion}
                            />
                          )}

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="visit_type">Visit Type</Label>
                          <Select value={visitType} onValueChange={setVisitType}>
                            <SelectTrigger id="visit_type">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="admission">Admission/Start of Care</SelectItem>
                              <SelectItem value="routine_visit">Routine Visit</SelectItem>
                              <SelectItem value="recertification">Recertification</SelectItem>
                              <SelectItem value="discharge">Discharge</SelectItem>
                              <SelectItem value="prn">PRN Visit</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div>
                          <Label htmlFor="diagnosis">Primary Diagnosis</Label>
                          <Select value={diagnosis} onValueChange={setDiagnosis}>
                            <SelectTrigger id="diagnosis">
                              <SelectValue placeholder="Select diagnosis" />
                            </SelectTrigger>
                            <SelectContent>
                              {commonDiagnoses.map((dx) => (
                                <SelectItem key={dx} value={dx}>
                                  {dx}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      {diagnosis === "Custom (type below)" && (
                        <div>
                          <Label htmlFor="custom_diagnosis">Custom Diagnosis</Label>
                          <Input
                            id="custom_diagnosis"
                            placeholder="Enter diagnosis"
                            value={customDiagnosis}
                            onChange={(e) => setCustomDiagnosis(e.target.value)}
                          />
                        </div>
                      )}

              <div>
                <Label className="mb-2 block">Quick Vital Signs (Optional)</Label>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  <Input
                    placeholder="BP: 120/80"
                    value={vitalSigns.bp}
                    onChange={(e) => setVitalSigns({...vitalSigns, bp: e.target.value})}
                  />
                  <Input
                    placeholder="HR: 72"
                    value={vitalSigns.hr}
                    onChange={(e) => setVitalSigns({...vitalSigns, hr: e.target.value})}
                  />
                  <Input
                    placeholder="Temp: 98.6"
                    value={vitalSigns.temp}
                    onChange={(e) => setVitalSigns({...vitalSigns, temp: e.target.value})}
                  />
                  <Input
                    placeholder="O2: 98%"
                    value={vitalSigns.o2}
                    onChange={(e) => setVitalSigns({...vitalSigns, o2: e.target.value})}
                  />
                  <Input
                    placeholder="Pain: 3/10"
                    value={vitalSigns.pain}
                    onChange={(e) => setVitalSigns({...vitalSigns, pain: e.target.value})}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documentation Mode Toggle */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={documentationMode === 'freeform' ? 'default' : 'outline'}
              onClick={() => setDocumentationMode('freeform')}
              className={documentationMode === 'freeform' ? 'bg-purple-600 hover:bg-purple-700' : ''}
            >
              <Wand2 className="w-4 h-4 mr-2" />
              Freeform Notes
            </Button>
            <Button
              variant={documentationMode === 'guided' ? 'default' : 'outline'}
              onClick={() => setDocumentationMode('guided')}
              className={documentationMode === 'guided' ? 'bg-indigo-600 hover:bg-indigo-700' : ''}
            >
              <FileText className="w-4 h-4 mr-2" />
              Guided SOAP
            </Button>
          </div>

          {/* Proactive Compliance Checker with Checklist */}
          <ProactiveComplianceChecker
            noteText={roughNote}
            careType={careType}
            visitType={visitType}
            diagnosis={diagnosis === "Custom (type below)" ? customDiagnosis : diagnosis}
            nurseEmail={currentUser?.email}
            onInsertElement={handleInsertComplianceElement}
            onTrainingRecommended={handleTrainingRecommended}
          />

          {/* Voice Dictation */}
          <VoiceDictation onTranscriptionComplete={handleTranscriptionComplete} />

          {/* Quick Voice Vitals Entry */}
          <VoiceVitalsEntry 
            onVitalsRecognized={handleVoiceVitals}
            onPhraseRecognized={handleVoicePhrase}
          />

          {/* Documentation Input - Freeform or Guided */}
          {documentationMode === 'freeform' ? (
            <Card className="border-2 border-purple-200">
              <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                <CardTitle className="flex items-center gap-2">
                  <Wand2 className="w-5 h-5 text-purple-600" />
                  Your Rough Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <Textarea
                  placeholder="Type your rough notes here... For example:

          pt stable, lungs clear, no sob. checked wound on left leg, looks good, 3x4cm, clean. changed dressing. taught pt about meds, understands. reviewed diet. will come back friday.

          The AI will transform this into professional, Medicare-compliant documentation!"
                  value={roughNote}
                  onChange={(e) => setRoughNote(e.target.value)}
                  rows={10}
                  className="font-mono text-sm"
                />

                {/* Inline AI Suggestions */}
                <div className="flex items-center gap-2 mt-2">
                  <InlineSuggestions
                    currentText={roughNote}
                    diagnosis={diagnosis === "Custom (type below)" ? customDiagnosis : diagnosis}
                    careType={careType}
                    onAcceptSuggestion={handleAcceptInlineSuggestion}
                  />
                  <DocumentationAssistantPopup
                    noteText={roughNote}
                    careType={careType}
                    diagnosis={diagnosis === "Custom (type below)" ? customDiagnosis : diagnosis}
                    onInsert={(text) => setRoughNote(prev => prev + ' ' + text)}
                  />
                </div>

                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={handleEnhanceNote}
                    disabled={isProcessing || !roughNote.trim()}
                    size="lg"
                    className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                  >
                    {isProcessing ? (
                      <>
                        <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                        Enhancing Note...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-5 h-5 mr-2" />
                        Enhance Note with AI
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              <GuidedDocumentationFlow
                diagnosis={diagnosis === "Custom (type below)" ? customDiagnosis : diagnosis}
                careType={careType}
                visitType={visitType}
                onNoteChange={handleGuidedNoteChange}
                patient={selectedPatient}
                previousVisits={patientVisits}
                carePlans={carePlans}
                prefillData={prefillData}
              />
              <div className="flex justify-end">
                <Button
                  onClick={handleEnhanceNote}
                  disabled={isProcessing || !roughNote.trim()}
                  size="lg"
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {isProcessing ? (
                    <>
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                      Enhancing Note...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-5 h-5 mr-2" />
                      Enhance SOAP Note with AI
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Inline Data Extractor - Shows extracted data as user types */}
          <InlineDataExtractor
            currentText={roughNote}
            onVitalsExtracted={handleInlineVitalsExtracted}
          />

          {/* Enhanced Note Output */}
          {enhancedNote && (
            <Card className="border-2 border-green-200">
              <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    Enhanced EHR-Ready Note
                  </CardTitle>
                  <Button
                    onClick={handleCopyToClipboard}
                    variant="outline"
                    size="sm"
                    className="gap-2"
                  >
                    {copied ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-green-600" />
                        Copied!
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy to Clipboard
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="bg-white p-4 rounded-lg border border-gray-200">
                  <pre className="whitespace-pre-wrap font-sans text-sm text-gray-900">
                    {enhancedNote}
                  </pre>
                </div>

                {/* Mandatory Compliance Gate */}
                <MandatoryComplianceGate
                  noteText={enhancedNote}
                  careType={careType}
                  visitType={visitType}
                  diagnosis={diagnosis === "Custom (type below)" ? customDiagnosis : diagnosis}
                  vitalSigns={vitalSigns}
                  onCompliancePassed={(passed, override) => {
                    setCompliancePassed(passed);
                    if (override) {
                      console.log('Compliance overridden:', override.reason);
                    }
                  }}
                  onInsertFix={(fix) => setRoughNote(prev => prev + '\n\n' + fix)}
                />

                {compliancePassed && (
                  <Alert className="mt-4 bg-green-50 border-green-200">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <AlertDescription className="text-green-900">
                      Your note has passed compliance checks and is ready to copy into your EHR system!
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        {/* AI Tools Sidebar - Organized in Tabs */}
                    <div className="space-y-4">
                      {/* Unified Action Center - Always visible when there are actions */}
                      {(aiPrompts?.critical_missing?.length > 0 || suggestions.length > 0 || auditResults?.missing_critical_elements?.length > 0) && (
                        <UnifiedActionCenter
                          criticalItems={aiPrompts?.critical_missing || []}
                          suggestions={suggestions}
                          complianceAlerts={auditResults?.missing_critical_elements?.map(el => ({
                            title: el,
                            message: `Missing required element: ${el}`,
                            fix: `[Document ${el} here]`
                          })) || []}
                          onApplyAction={(text) => setRoughNote(prev => prev + '\n\n' + text)}
                          onDismiss={(id) => console.log('Dismissed:', id)}
                        />
                      )}

                      <Tabs defaultValue="assist" className="w-full">
                        <TabsList className="grid w-full grid-cols-4 h-auto">
                          <TabsTrigger value="assist" className="flex flex-col gap-0.5 py-1.5 md:py-2 px-1">
                            <MessageSquare className="w-3 h-3 md:w-4 md:h-4" />
                            <span className="text-[10px] md:text-xs">Assist</span>
                          </TabsTrigger>
                          <TabsTrigger value="clinical" className="flex flex-col gap-0.5 py-1.5 md:py-2 px-1">
                            <Stethoscope className="w-3 h-3 md:w-4 md:h-4" />
                            <span className="text-[10px] md:text-xs">Clinical</span>
                          </TabsTrigger>
                          <TabsTrigger value="compliance" className="flex flex-col gap-0.5 py-1.5 md:py-2 px-1">
                            <Shield className="w-3 h-3 md:w-4 md:h-4" />
                            <span className="text-[10px] md:text-xs">Comply</span>
                          </TabsTrigger>
                          <TabsTrigger value="actions" className="flex flex-col gap-0.5 py-1.5 md:py-2 px-1">
                            <ClipboardList className="w-3 h-3 md:w-4 md:h-4" />
                            <span className="text-[10px] md:text-xs">Actions</span>
                          </TabsTrigger>
                        </TabsList>

            {/* Assist Tab - Real-time help while writing */}
            <TabsContent value="assist" className="space-y-4 mt-4">
              <AIDrivenDocumentationPrompts
                noteText={roughNote}
                patient={selectedPatient}
                visitType={visitType}
                diagnosis={diagnosis === "Custom (type below)" ? customDiagnosis : diagnosis}
                vitalSigns={vitalSigns}
                carePlans={carePlans}
                previousVisits={patientVisits}
                extractedData={extractedDataState}
                onInsertPromptResponse={(text) => handleEditBeforeInsert(text, "AI Suggested Documentation")}
              />

              <RealTimeSuggestions
                currentText={roughNote}
                diagnosis={diagnosis === "Custom (type below)" ? customDiagnosis : diagnosis}
                careType={careType}
                onInsertSuggestion={handleInsertSuggestion}
              />

              {selectedPatientId && (
                <PatientHistorySummary
                  patientId={selectedPatientId}
                  patientName={selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : ''}
                  diagnosis={selectedPatient?.primary_diagnosis || diagnosis}
                  previousVisits={patientVisits}
                  carePlans={carePlans}
                  onInsertSummary={handleInsertSummary}
                />
              )}

              <NoteSummaryGenerator
                noteText={enhancedNote || roughNote}
                patientName={selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : ''}
                diagnosis={diagnosis === "Custom (type below)" ? customDiagnosis : diagnosis}
              />

              {suggestions.length > 0 && (
                <Card className="border-yellow-200">
                  <CardHeader className="bg-yellow-50 py-3">
                    <CardTitle className="flex items-center gap-2 text-sm">
                      <Lightbulb className="w-4 h-4 text-yellow-600" />
                      Suggestions ({suggestions.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="pt-3 space-y-2">
                    {suggestions.slice(0, 3).map((suggestion, index) => (
                      <div key={index} className="p-2 bg-yellow-50 rounded border-l-2 border-yellow-500">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`${getPriorityColor(suggestion.priority)} text-xs`}>
                            {suggestion.priority}
                          </Badge>
                          <span className="text-xs font-medium">{suggestion.category}</span>
                        </div>
                        <p className="text-xs text-gray-700">{suggestion.suggestion}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* Clinical Tab - Decision support & medications */}
            <TabsContent value="clinical" className="space-y-4 mt-4">
              <EnhancedClinicalDecisionSupport
                patient={selectedPatient}
                currentNoteText={roughNote || enhancedNote}
                vitalSigns={vitalSigns}
                previousVisits={patientVisits}
                carePlans={carePlans}
                onInsertRecommendation={handleInsertInformation}
                onAlertAcknowledged={(alertId) => console.log('Alert acknowledged:', alertId)}
                autoAnalyze={true}
              />

              <ClinicalDecisionSupport
                enhancedNote={enhancedNote}
                extractedData={extractedDataState}
                diagnosis={diagnosis === "Custom (type below)" ? customDiagnosis : diagnosis}
                careType={careType}
                vitalSigns={vitalSigns}
                onInsertRecommendation={handleInsertInformation}
              />

              <MedicationAdherenceInsights
                narrativeText={enhancedNote || roughNote}
                diagnosis={diagnosis === "Custom (type below)" ? customDiagnosis : diagnosis}
                onInsertIntervention={handleInsertInformation}
              />

              <ExternalKnowledge
                diagnosis={diagnosis === "Custom (type below)" ? customDiagnosis : diagnosis}
                onInsertInformation={handleInsertInformation}
              />

              <DataExtractor
                narrativeText={enhancedNote || roughNote}
                patientId={selectedPatientId}
                onExtractedData={handleExtractedData}
                onCreateCarePlan={handleCreateCarePlan}
                onCreateTask={(task) => console.log('Task:', task)}
                onCarePlansCreated={(plans) => console.log('Care plans created:', plans)}
              />
            </TabsContent>

            {/* Compliance Tab - Medicare & documentation quality */}
            <TabsContent value="compliance" className="space-y-4 mt-4">
              <MedicareComplianceAssistant
                noteText={enhancedNote || roughNote}
                careType={careType}
                visitType={visitType}
                diagnosis={diagnosis === "Custom (type below)" ? customDiagnosis : diagnosis}
                onInsertText={(text) => setRoughNote(prev => prev + '\n\n' + text)}
              />

              {auditResults && (
                <PersonalizedFeedback
                  auditResults={auditResults}
                  userEmail={currentUser?.email}
                />
              )}

              <PersonalizedSkillBuilder userEmail={currentUser?.email} />
            </TabsContent>

            {/* Actions Tab - Tasks, care plans, incidents */}
            <TabsContent value="actions" className="space-y-4 mt-4">
              <TaskGenerator
                narrativeText={enhancedNote || roughNote}
                patientId={selectedPatientId}
                patientName={selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : ''}
                diagnosis={diagnosis === "Custom (type below)" ? customDiagnosis : diagnosis}
                missingCriticalElements={auditResults?.missing_critical_elements}
                auditResults={auditResults}
                nurseEmail={currentUser?.email}
                onTasksGenerated={handleTasksGenerated}
                onTrainingRecommended={(recs) => console.log('Training recommended:', recs)}
              />

              <div data-care-plan-generator>
                <AICarePlanGenerator
                  patientId={selectedPatientId}
                  patientName={selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : ''}
                  diagnosis={diagnosis === "Custom (type below)" ? customDiagnosis : diagnosis}
                  careType={careType}
                  extractedData={extractedDataState}
                  existingCarePlans={carePlans}
                  onCarePlansCreated={(plans) => console.log('Care plans created:', plans)}
                />
              </div>

              {selectedPatientId && (
                <QuickCarePlanUpdater
                  patientId={selectedPatientId}
                  carePlans={carePlans}
                  onCarePlanUpdated={() => {}}
                />
              )}

              {selectedPatientId && (
                <div data-incident-reporter>
                  <GuidedIncidentReporting
                    patientId={selectedPatientId}
                    patientName={selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : ''}
                    physicianEmail={selectedPatient?.physician_email}
                    caregiverEmail={selectedPatient?.caregiver_email}
                    onIncidentCreated={(incident) => console.log('Incident created:', incident)}
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* Quick Tips - Always visible */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-3">
              <p className="text-xs font-semibold text-blue-900 mb-2">💡 Quick Tips</p>
              <div className="space-y-1 text-xs text-gray-600">
                <p>• Be brief - AI expands your notes</p>
                <p>• Include vitals & key findings</p>
                <p>• Always review before copying</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

        {/* Voice Command Listener - Fixed position, outside grid */}
                    <SmartNoteVoiceListener
                      onVitalChange={handleVoiceVitalChange}
                      onPhraseInsert={handleVoicePhrase}
                      onAction={handleVoiceAction}
                    />

                    {/* Quick Edit Preview Dialog */}
                    <QuickEditPreview
                      open={showEditPreview}
                      onOpenChange={setShowEditPreview}
                      title={editPreviewTitle}
                      content={editPreviewContent}
                      onConfirm={handleConfirmEditPreview}
                      onCancel={() => setShowEditPreview(false)}
                    />
                  </div>
                );
}
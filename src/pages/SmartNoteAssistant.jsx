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
  Copy,
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
  Brain,
  HelpCircle
} from "lucide-react";
import { trackRecommendation, categorizeRecommendation } from "../components/training/RecommendationTracker";
import ComplianceScoreIndicator from "../components/smartNote/ComplianceScoreIndicator";
import ClinicalDecisionSupport from "../components/smartNote/ClinicalDecisionSupport";
import TaskGenerator from "../components/smartNote/TaskGenerator";
import AICarePlanGenerator from "../components/carePlan/AICarePlanGenerator";
import AINoteDraftingAssistant from "../components/smartNote/AINoteDraftingAssistant";
import ComplianceSummaryReport from "../components/smartNote/ComplianceSummaryReport";
import FloatingActionBar from "../components/smartNote/FloatingActionBar";
import QuickPhraseButtons from "../components/smartNote/QuickPhraseButtons";
import ImprovedStepIndicator from "../components/smartNote/ImprovedStepIndicator";
import PatientContextCard from "../components/smartNote/PatientContextCard";
import RichTextNoteEditor from "../components/smartNote/RichTextNoteEditor";
import SmartVitalsInput from "../components/smartNote/SmartVitalsInput";
import SmartAutoComplete from "../components/smartNote/SmartAutoComplete";

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



// Voice Hub Component
function VoiceHub({ onTranscription, onVitalsRecognized }) {
  const [listening, setListening] = useState(false);
  const [mode, setMode] = useState('dictate');

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
      if (mode === 'vitals') {
        const vitals = {};
        const bpMatch = transcript.match(/blood pressure\s*(\d+)\s*(?:over|\/)\s*(\d+)/i);
        if (bpMatch) vitals.bp = `${bpMatch[1]}/${bpMatch[2]}`;
        const hrMatch = transcript.match(/(?:heart rate|pulse|hr)\s*(\d+)/i);
        if (hrMatch) vitals.hr = hrMatch[1];
        if (Object.keys(vitals).length > 0) onVitalsRecognized?.(vitals);
      } else {
        onTranscription?.(transcript);
      }
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    setListening(true);
    recognition.start();
  };

  return (
    <div className="flex items-center gap-2">
      <Button
        size="sm"
        variant={listening ? "destructive" : "outline"}
        onClick={listening ? () => setListening(false) : startListening}
        className="gap-1"
      >
        {listening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
        {listening ? 'Stop' : 'Voice'}
      </Button>
      <Badge 
        variant={mode === 'dictate' ? 'default' : 'outline'} 
        className="cursor-pointer text-xs"
        onClick={() => setMode('dictate')}
      >
        Dictate
      </Badge>
      <Badge 
        variant={mode === 'vitals' ? 'default' : 'outline'} 
        className="cursor-pointer text-xs"
        onClick={() => setMode('vitals')}
      >
        Vitals
      </Badge>
    </div>
  );
}

// Contextual AI Tools Sidebar
function ContextualAITools({ currentStep, hasPatient, hasNotes, hasEnhancedNote, onAction }) {
  const getTools = () => {
    if (!hasPatient) return { title: "Getting Started", items: [{ label: "Select a patient to begin", type: "info" }] };
    if (!hasNotes) return { title: "Ready to Document", items: [{ label: "Use voice or type notes", type: "info" }] };
    if (!hasEnhancedNote) return { title: "Notes Ready", items: [{ label: "Enhance with AI", action: "enhance", type: "action", primary: true }] };
    return { title: "Ready to Copy", items: [
      { label: "Copy to clipboard", action: "copy", type: "action", primary: true },
      { label: "Generate tasks", action: "tasks", type: "action" }
    ]};
  };
  const tools = getTools();

  return (
    <Card className="border-2 border-indigo-200 bg-indigo-50">
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <Brain className="w-4 h-4" />
          {tools.title}
        </CardTitle>
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
                {item.label}
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <p className="text-xs text-gray-600">{item.label}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

export default function SmartNoteAssistant() {
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [visitType, setVisitType] = useState("routine_visit");
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

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
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

  const selectedPatient = patients.find(p => p.id === selectedPatientId);
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
    const startTime = Date.now();
    try {
      const prompt = `You are an expert clinical documentation specialist for home health nursing. Transform these rough notes into Medicare-compliant clinical narrative.

PATIENT CONTEXT:
- Diagnosis: ${finalDiagnosis || 'Not specified'}
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

ROUGH NOTES:
${roughNote}

Transform into professional EHR-ready narrative with proper medical terminology, Medicare compliance, and integrated vital signs.

IMPORTANT: Do NOT include any meta-commentary or closing statements about Medicare compliance standards or documentation adherence at the end. Just provide the clinical narrative itself.

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

      // Track note conversion for admin reporting
      const conversionTime = Date.now() - startTime;
      try {
        await base44.entities.NoteConversion.create({
          nurse_email: currentUser?.email || 'unknown',
          patient_id: selectedPatientId || null,
          visit_type: visitType,
          diagnosis: finalDiagnosis || null,
          rough_note_length: roughNote.length,
          enhanced_note_length: result.enhanced_note?.length || 0,
          quality_score: result.quality_score || null,
          conversion_time_ms: conversionTime
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

  const handleVoiceVitals = (vitals) => {
    setVitalSigns(prev => ({ ...prev, ...vitals }));
  };

  const handleContextualAction = (action) => {
    if (action === 'enhance') handleEnhanceNote();
    if (action === 'copy') handleCopy();
    if (action === 'tasks') setActiveAccordion('tasks');
  };

  const handleClearNote = () => {
    setRoughNote("");
    setEnhancedNote("");
    setAuditResults(null);
    setAppliedFixes([]);
    setDismissedElementNames([]);
    setRoughNoteCompliance(null);
    setEnhancedNoteCompliance(null);
  };

  const handleInsertPhrase = (text) => {
    setRoughNote(prev => prev ? prev + ' ' + text : text);
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Smart Note Assistant</h1>
          <p className="text-sm text-gray-600">Transform rough notes into Medicare-compliant documentation</p>
        </div>
        <Button variant="ghost" size="sm" className="text-gray-500 gap-1">
          <HelpCircle className="w-4 h-4" />
          <span className="hidden sm:inline">Help</span>
        </Button>
      </div>

      <ImprovedStepIndicator 
        currentStep={currentStep} 
        completedSteps={completedSteps}
      />

      {selectedPatient && (
        <PatientContextCard
          patient={selectedPatient}
          carePlans={carePlans}
          recentVisit={recentVisits[0]}
          vitalSigns={vitalSigns}
          onClear={() => setSelectedPatientId("")}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        <div className="lg:col-span-3 space-y-4">
          
          {/* Step 1: Patient Selection */}
          <Card className={`border-2 ${currentStep === 'patient' ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'}`}>
            <CardHeader className="py-3 bg-gradient-to-r from-blue-50 to-indigo-50">
              <CardTitle className="text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-blue-600" />
                1. Select Patient & Visit Type
                {selectedPatient && <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <Label className="text-xs">Patient</Label>
                  <Select value={selectedPatientId || "none"} onValueChange={(v) => setSelectedPatientId(v === "none" ? "" : v)}>
                    <SelectTrigger><SelectValue placeholder="Select patient..." /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select patient...</SelectItem>
                      {patients.map((p) => (
                        <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Visit Type</Label>
                  <Select value={visitType} onValueChange={setVisitType}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="admission">Admission</SelectItem>
                      <SelectItem value="routine_visit">Routine Visit</SelectItem>
                      <SelectItem value="recertification">Recertification</SelectItem>
                      <SelectItem value="discharge">Discharge</SelectItem>
                      <SelectItem value="prn">PRN Visit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Diagnosis</Label>
                  <Select value={diagnosis} onValueChange={setDiagnosis}>
                    <SelectTrigger><SelectValue placeholder="Select..." /></SelectTrigger>
                    <SelectContent>
                      {commonDiagnoses.map((dx) => (
                        <SelectItem key={dx} value={dx}>{dx}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              {diagnosis === "Custom (type below)" && (
                <Input placeholder="Enter custom diagnosis" value={customDiagnosis} onChange={(e) => setCustomDiagnosis(e.target.value)} />
              )}
            </CardContent>
          </Card>

          {/* Step 2: Vitals */}
          <Card className={`border-2 ${currentStep === 'vitals' ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'}`}>
            <CardHeader className="py-3 bg-gradient-to-r from-green-50 to-emerald-50">
              <CardTitle className="text-sm flex items-center gap-2">
                <Activity className="w-4 h-4 text-green-600" />
                2. Vital Signs
                {(vitalSigns.bp || vitalSigns.hr) && <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              <SmartVitalsInput 
                vitalSigns={vitalSigns} 
                onChange={setVitalSigns} 
              />
            </CardContent>
          </Card>

          {/* Step 3: Notes */}
          <Card className={`border-2 ${currentStep === 'notes' ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'}`}>
            <CardHeader className="py-3 bg-gradient-to-r from-purple-50 to-pink-50">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-purple-600" />
                  3. Your Notes
                  {roughNote.length >= 20 && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                </div>
                <VoiceHub onTranscription={handleVoiceTranscription} onVitalsRecognized={handleVoiceVitals} />
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {/* Quick phrase buttons */}
              <div>
                <p className="text-xs text-gray-500 mb-2">Quick phrases (click to add):</p>
                <QuickPhraseButtons onInsert={handleInsertPhrase} />
              </div>

              <Textarea
                placeholder="Type or dictate your notes... Example: pt stable, lungs clear, checked wound, changed dressing, taught about meds"
                value={roughNote}
                onChange={(e) => setRoughNote(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
              
              {/* Character count with progress indicator */}
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <p className={`text-xs ${roughNote.length >= 20 ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                    {roughNote.length} characters
                  </p>
                  {roughNote.length < 20 && roughNote.length > 0 && (
                    <p className="text-xs text-orange-500">(min 20 to enhance)</p>
                  )}
                </div>
                <Button
                  onClick={handleEnhanceNote}
                  disabled={isProcessing || roughNote.length < 20}
                  className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
                >
                  {isProcessing ? (
                    <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" /> Enhancing...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" /> Enhance with AI</>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Medicare Compliance Checker */}
          {(roughNote.length >= 30 || enhancedNote) && (
            <ComplianceScoreIndicator
              roughNote={roughNote}
              enhancedNote={enhancedNote}
              careType="home_health"
              visitType={visitType}
              diagnosis={finalDiagnosis}
              vitalSigns={vitalSigns}
              patientContext={patientContext}
              onInsertElement={(text, elementName) => {
                setRoughNote(prev => prev + '\n\n' + text.trim());
                setEnhancedNote('');
                if (elementName) {
                  setAppliedFixes(prev => [...prev, elementName]);
                }
              }}
              onUpdateEnhancedNote={(updatedNote) => setEnhancedNote(updatedNote)}
              onRoughNoteCompliance={(data) => setRoughNoteCompliance(data)}
              onEnhancedNoteCompliance={(data) => setEnhancedNoteCompliance(data)}
              onDismissedElements={(names) => setDismissedElementNames(names)}
              onFixAllAndReEnhance={async (suggestions) => {
                // Add all suggestions to rough note
                const combinedText = suggestions.join('\n\n');
                const newRoughNote = roughNote + '\n\n' + combinedText;
                setRoughNote(newRoughNote);
                setAppliedFixes(prev => [...prev, ...suggestions.map(s => s.split(':')[0].trim())]);

                // Clear enhanced note and auto-re-enhance
                setEnhancedNote('');
                setIsProcessing(true);

                try {
                  const prompt = `You are an expert clinical documentation specialist for home health nursing. Transform these rough notes into Medicare-compliant clinical narrative.

            PATIENT CONTEXT:
            - Diagnosis: ${finalDiagnosis || 'Not specified'}
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

            ROUGH NOTES:
            ${newRoughNote}

            Transform into professional EHR-ready narrative with proper medical terminology, Medicare compliance, and integrated vital signs.

            IMPORTANT: Do NOT include any meta-commentary or closing statements about Medicare compliance standards or documentation adherence at the end. Just provide the clinical narrative itself.

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
                } catch (error) {
                  console.error("Error re-enhancing note:", error);
                }
                setIsProcessing(false);
              }}
            />
          )}

          {/* Compliance Summary Report */}
          {enhancedNote && (
            <div className="flex justify-end">
              <ComplianceSummaryReport
                patientId={selectedPatientId}
                patientName={selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : null}
                visitType={visitType}
                diagnosis={finalDiagnosis}
                roughNoteCompliance={roughNoteCompliance}
                enhancedNoteCompliance={enhancedNoteCompliance}
                appliedFixes={appliedFixes}
                dismissedElements={dismissedElementNames}
                vitalSigns={vitalSigns}
                nurseEmail={currentUser?.email}
              />
            </div>
          )}

          {/* Step 4: Enhanced Note */}
          {enhancedNote && (
            <Card className="border-2 border-green-300 bg-green-50">
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    4. Enhanced Note
                    {auditResults?.quality_score && <Badge className="bg-green-600">{auditResults.quality_score}% Quality</Badge>}
                  </div>
                  <Button onClick={handleCopy} variant="outline" size="sm">
                    {copied ? <><CheckCircle2 className="w-4 h-4 mr-1" /> Copied!</> : <><Copy className="w-4 h-4 mr-1" /> Copy</>}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4">
                <div className="bg-white p-4 rounded-lg border border-green-200 mb-4">
                  <pre className="whitespace-pre-wrap font-sans text-sm">{enhancedNote}</pre>
                </div>
                <Alert className="bg-green-100 border-green-300">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Ready to copy into your EHR system!
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
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
                    patientId={selectedPatientId}
                    nurseEmail={currentUser?.email}
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

        {/* Sidebar */}
        <div className="space-y-4">
          <ContextualAITools
            currentStep={currentStep}
            hasPatient={!!selectedPatientId}
            hasNotes={roughNote.length >= 20}
            hasEnhancedNote={!!enhancedNote}
            onAction={handleContextualAction}
          />

          {/* AI Note Drafting Assistant */}
                          <AINoteDraftingAssistant
                            vitalSigns={vitalSigns}
                            diagnosis={finalDiagnosis}
                            patientContext={selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}, ${selectedPatient.primary_diagnosis || 'home health patient'}` : ''}
                            symptoms={roughNote}
                            onInsertText={(text) => {
                              if (enhancedNote) {
                                setEnhancedNote(prev => prev + '\n\n' + text);
                              } else {
                                setRoughNote(prev => prev + '\n\n' + text);
                              }
                            }}
                          />

                          {/* Clinical Decision Support */}
                          <ClinicalDecisionSupport
                            enhancedNote={enhancedNote}
                            roughNote={roughNote}
                            diagnosis={finalDiagnosis}
                            careType="home_health"
                            vitalSigns={vitalSigns}
                            onInsertRecommendation={(text) => {
                              if (enhancedNote) {
                                setEnhancedNote(prev => prev + '\n\n' + text);
                              } else {
                                setRoughNote(prev => prev + '\n\n' + text);
                              }
                            }}
                          />

          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-3">
              <p className="text-xs font-semibold text-blue-900 mb-2">💡 Quick Tips</p>
              <ul className="space-y-1 text-xs text-gray-600">
                <li>• Be brief - AI expands your notes</li>
                <li>• Include key findings</li>
                <li>• Always review before copying</li>
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

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
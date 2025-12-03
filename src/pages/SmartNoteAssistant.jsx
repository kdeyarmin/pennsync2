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
  Circle,
  Brain,
  Target,
  Shield,
  ShieldAlert
} from "lucide-react";
import { trackRecommendation, categorizeRecommendation } from "../components/training/RecommendationTracker";
import ComplianceScoreIndicator from "../components/smartNote/ComplianceScoreIndicator";
import ClinicalDecisionSupport from "../components/smartNote/ClinicalDecisionSupport";
import TaskGenerator from "../components/smartNote/TaskGenerator";
import AICarePlanGenerator from "../components/carePlan/AICarePlanGenerator";

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

// Step Indicator Component
function StepIndicator({ currentStep, completedSteps = [] }) {
  const steps = [
    { id: 'patient', label: 'Patient' },
    { id: 'vitals', label: 'Vitals' },
    { id: 'notes', label: 'Notes' },
    { id: 'enhance', label: 'Enhance' },
    { id: 'review', label: 'Review' },
  ];
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="flex items-center justify-between bg-white border rounded-lg p-2 mb-4 overflow-x-auto">
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(step.id);
        const isCurrent = step.id === currentStep;
        const isPast = index < currentIndex;

        return (
          <React.Fragment key={step.id}>
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors flex-shrink-0 ${
              isCurrent ? 'bg-blue-100 text-blue-700' : 
              isCompleted || isPast ? 'text-green-600' : 'text-gray-400'
            }`}>
              {isCompleted || isPast ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Circle className={`w-4 h-4 ${isCurrent ? 'fill-blue-600 text-blue-600' : ''}`} />
              )}
              <span className="text-xs font-medium whitespace-nowrap">{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

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
  const [vitalSigns, setVitalSigns] = useState({ bp: "", hr: "", temp: "", o2: "", pain: "" });
  const [roughNote, setRoughNote] = useState("");
  const [enhancedNote, setEnhancedNote] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [auditResults, setAuditResults] = useState(null);
  const [activeAccordion, setActiveAccordion] = useState("");

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

  const selectedPatient = patients.find(p => p.id === selectedPatientId);
  const finalDiagnosis = diagnosis === "Custom (type below)" ? customDiagnosis : diagnosis;

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
    try {
      const prompt = `You are an expert clinical documentation specialist for home health nursing. Transform these rough notes into Medicare-compliant clinical narrative.

PATIENT CONTEXT:
- Diagnosis: ${finalDiagnosis || 'Not specified'}
- Visit Type: ${visitType.replace(/_/g, ' ')}
- Vitals: ${Object.entries(vitalSigns).filter(([,v]) => v).map(([k,v]) => `${k}: ${v}`).join(', ') || 'None provided'}

ROUGH NOTES:
${roughNote}

Transform into professional EHR-ready narrative with proper medical terminology, Medicare compliance, and integrated vital signs.

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

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Smart Note Assistant</h1>
        <p className="text-sm text-gray-600">Transform rough notes into Medicare-compliant documentation</p>
      </div>

      <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />

      {selectedPatient && (
        <Card className="mb-4 bg-blue-50 border-blue-200">
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-bold">
                {selectedPatient.first_name?.charAt(0)}{selectedPatient.last_name?.charAt(0)}
              </div>
              <div>
                <p className="font-semibold">{selectedPatient.first_name} {selectedPatient.last_name}</p>
                <p className="text-xs text-gray-600">{selectedPatient.primary_diagnosis || 'No diagnosis'}</p>
              </div>
            </div>
            <div className="flex gap-2">
              {vitalSigns.bp && <Badge variant="outline">BP: {vitalSigns.bp}</Badge>}
              {vitalSigns.hr && <Badge variant="outline">HR: {vitalSigns.hr}</Badge>}
              <Badge variant="outline">{carePlans.length} Care Plans</Badge>
            </div>
          </CardContent>
        </Card>
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
              <div className="grid grid-cols-5 gap-2">
                <Input placeholder="BP: 120/80" value={vitalSigns.bp} onChange={(e) => setVitalSigns({...vitalSigns, bp: e.target.value})} />
                <Input placeholder="HR: 72" value={vitalSigns.hr} onChange={(e) => setVitalSigns({...vitalSigns, hr: e.target.value})} />
                <Input placeholder="Temp: 98.6" value={vitalSigns.temp} onChange={(e) => setVitalSigns({...vitalSigns, temp: e.target.value})} />
                <Input placeholder="O2: 98%" value={vitalSigns.o2} onChange={(e) => setVitalSigns({...vitalSigns, o2: e.target.value})} />
                <Input placeholder="Pain: 3/10" value={vitalSigns.pain} onChange={(e) => setVitalSigns({...vitalSigns, pain: e.target.value})} />
              </div>
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
            <CardContent className="p-4">
              <Textarea
                placeholder="Type or dictate your notes... Example: pt stable, lungs clear, checked wound, changed dressing, taught about meds"
                value={roughNote}
                onChange={(e) => setRoughNote(e.target.value)}
                rows={6}
                className="font-mono text-sm"
              />
              <div className="flex justify-between items-center mt-3">
                <p className="text-xs text-gray-500">{roughNote.length} characters</p>
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
          {roughNote.length >= 30 && (
            <ComplianceScoreIndicator
              roughNote={roughNote}
              careType="home_health"
              visitType={visitType}
              diagnosis={finalDiagnosis}
              onInsertElement={(text) => setRoughNote(prev => prev + '\n' + text)}
            />
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

          {/* Clinical Decision Support */}
          {enhancedNote && (
            <ClinicalDecisionSupport
              enhancedNote={enhancedNote}
              diagnosis={finalDiagnosis}
              careType="home_health"
              vitalSigns={vitalSigns}
              onInsertRecommendation={(text) => setEnhancedNote(prev => prev + text)}
            />
          )}

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
    </div>
  );
}
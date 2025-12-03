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
  FileText,
  Wand2,
  User,
  Activity,
  Stethoscope,
  Shield,
  ClipboardList,
  ChevronDown,
  AlertTriangle
} from "lucide-react";

// Core Components
import StepIndicator from "../components/smartNote/StepIndicator";
import UnifiedVoiceHub from "../components/smartNote/UnifiedVoiceHub";
import ContextualAITools from "../components/smartNote/ContextualAITools";
import PersistentPatientHeader from "../components/smartNote/PersistentPatientHeader";

// AI Features (loaded on demand in accordion)
import MandatoryComplianceGate from "../components/compliance/MandatoryComplianceGate";
import TaskGenerator from "../components/smartNote/TaskGenerator";
import AICarePlanGenerator from "../components/carePlan/AICarePlanGenerator";
import GuidedIncidentReporting from "../components/incident/GuidedIncidentReporting";

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

export default function SmartNoteAssistant() {
  // Core State
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
  const [compliancePassed, setCompliancePassed] = useState(false);
  const [complianceIssuesCount, setComplianceIssuesCount] = useState(0);
  const [activeAccordion, setActiveAccordion] = useState("");

  // Data Queries
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const { data: patientVisits = [] } = useQuery({
    queryKey: ['patientVisits', selectedPatientId],
    queryFn: () => base44.entities.Visit.filter({ patient_id: selectedPatientId, status: 'completed' }, '-visit_date'),
    enabled: !!selectedPatientId,
  });

  const { data: carePlans = [] } = useQuery({
    queryKey: ['patientCarePlans', selectedPatientId],
    queryFn: () => base44.entities.CarePlan.filter({ patient_id: selectedPatientId }),
    enabled: !!selectedPatientId,
  });

  const selectedPatient = patients.find(p => p.id === selectedPatientId);
  const finalDiagnosis = diagnosis === "Custom (type below)" ? customDiagnosis : diagnosis;

  // Workflow Step Calculation
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
    if (compliancePassed) steps.push('review');
    return steps;
  }, [selectedPatientId, vitalSigns, roughNote, enhancedNote, compliancePassed]);

  // Handlers
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

Transform into professional EHR-ready narrative with:
1. Proper medical terminology and complete sentences
2. Medicare compliance (homebound status, skilled need, patient response)
3. Integrated vital signs

Return JSON:
{
  "enhanced_note": "The complete clinical narrative",
  "suggestions": [{"category": "string", "suggestion": "string", "priority": "high|medium|low"}],
  "quality_score": 0-100,
  "missing_critical_elements": ["element1"]
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            enhanced_note: { type: "string" },
            suggestions: { type: "array", items: { type: "object" } },
            quality_score: { type: "number" },
            missing_critical_elements: { type: "array", items: { type: "string" } }
          }
        }
      });

      setEnhancedNote(result.enhanced_note);
      setAuditResults(result);
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
    switch (action) {
      case 'enhance': handleEnhanceNote(); break;
      case 'copy': handleCopy(); break;
      case 'dictate': document.querySelector('[data-voice-hub]')?.scrollIntoView({ behavior: 'smooth' }); break;
      case 'compliance': setActiveAccordion('compliance'); break;
      case 'tasks': setActiveAccordion('tasks'); break;
      case 'careplans': setActiveAccordion('careplans'); break;
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Smart Note Assistant</h1>
        <p className="text-sm text-gray-600">Transform rough notes into Medicare-compliant documentation</p>
      </div>

      {/* Step Progress */}
      <StepIndicator currentStep={currentStep} completedSteps={completedSteps} />

      {/* Patient Header - Sticky when selected */}
      {selectedPatient && (
        <PersistentPatientHeader
          patient={selectedPatient}
          vitalSigns={vitalSigns}
          carePlansCount={carePlans.length}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Main Content - 3 columns */}
        <div className="lg:col-span-3 space-y-4">
          
          {/* Step 1: Patient & Visit Selection */}
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
                    <SelectTrigger>
                      <SelectValue placeholder="Select patient..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Select patient...</SelectItem>
                      {patients.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.first_name} {p.last_name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Visit Type</Label>
                  <Select value={visitType} onValueChange={setVisitType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
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
                    <SelectTrigger>
                      <SelectValue placeholder="Select..." />
                    </SelectTrigger>
                    <SelectContent>
                      {commonDiagnoses.map((dx) => (
                        <SelectItem key={dx} value={dx}>{dx}</SelectItem>
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
                />
              )}
            </CardContent>
          </Card>

          {/* Step 2: Vital Signs */}
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

          {/* Step 3: Notes Entry */}
          <Card className={`border-2 ${currentStep === 'notes' ? 'border-blue-400 ring-2 ring-blue-100' : 'border-gray-200'}`}>
            <CardHeader className="py-3 bg-gradient-to-r from-purple-50 to-pink-50">
              <CardTitle className="text-sm flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Wand2 className="w-4 h-4 text-purple-600" />
                  3. Your Notes
                  {roughNote.length >= 20 && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                </div>
                <div data-voice-hub>
                  <UnifiedVoiceHub 
                    onTranscription={handleVoiceTranscription}
                    onVitalsRecognized={handleVoiceVitals}
                    compact
                  />
                </div>
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

          {/* Step 4: Enhanced Note Output */}
          {enhancedNote && (
            <Card className="border-2 border-green-300 bg-green-50">
              <CardHeader className="py-3">
                <CardTitle className="text-sm flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    4. Enhanced Note
                    {auditResults?.quality_score && (
                      <Badge className="bg-green-600">{auditResults.quality_score}% Quality</Badge>
                    )}
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

                {/* Compliance Check */}
                <MandatoryComplianceGate
                  noteText={enhancedNote}
                  careType="home_health"
                  visitType={visitType}
                  diagnosis={finalDiagnosis}
                  vitalSigns={vitalSigns}
                  onCompliancePassed={(passed, override, count) => {
                    setCompliancePassed(passed);
                    setComplianceIssuesCount(count || 0);
                  }}
                  onInsertFix={(fix) => setRoughNote(prev => prev + '\n\n' + fix)}
                />

                {compliancePassed && (
                  <Alert className="mt-3 bg-green-100 border-green-300">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <AlertDescription className="text-green-800">
                      Ready to copy into your EHR system!
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>
          )}

          {/* Additional Tools Accordion */}
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
                    narrativeText={enhancedNote}
                    patientId={selectedPatientId}
                    patientName={selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : ''}
                    diagnosis={finalDiagnosis}
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
                    patientName={selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : ''}
                    diagnosis={finalDiagnosis}
                    careType="home_health"
                    existingCarePlans={carePlans}
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
                  <GuidedIncidentReporting
                    patientId={selectedPatientId}
                    patientName={selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : ''}
                  />
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
        </div>

        {/* Sidebar - 1 column */}
        <div className="space-y-4">
          <ContextualAITools
            currentStep={currentStep}
            hasPatient={!!selectedPatientId}
            hasNotes={roughNote.length >= 20}
            hasEnhancedNote={!!enhancedNote}
            complianceIssues={complianceIssuesCount}
            suggestions={auditResults?.suggestions || []}
            onAction={handleContextualAction}
          />

          {/* Quick Tips */}
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

          {/* Keyboard Shortcuts */}
          <Card className="bg-gray-50 border-gray-200">
            <CardContent className="p-3">
              <p className="text-xs font-semibold text-gray-700 mb-2">⌨️ Shortcuts</p>
              <div className="space-y-1 text-xs text-gray-600">
                <p><kbd className="px-1 bg-gray-200 rounded">Ctrl+Enter</kbd> Enhance</p>
                <p><kbd className="px-1 bg-gray-200 rounded">Ctrl+C</kbd> Copy note</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
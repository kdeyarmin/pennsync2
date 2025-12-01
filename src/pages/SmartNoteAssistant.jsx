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
  Sparkles,
  Copy,
  CheckCircle2,
  Lightbulb,
  FileText,
  Wand2,
  AlertCircle,
  Zap,
  Brain
} from "lucide-react";

import RealTimeSuggestions from "../components/smartNote/RealTimeSuggestions";
import PatientHistorySummary from "../components/smartNote/PatientHistorySummary";
import DataExtractor from "../components/smartNote/DataExtractor";
import InlineDataExtractor from "../components/smartNote/InlineDataExtractor";
import ExternalKnowledge from "../components/smartNote/ExternalKnowledge";
import PersonalizedFeedback from "../components/smartNote/PersonalizedFeedback";
import TaskGenerator from "../components/smartNote/TaskGenerator";
import MedicationAdherenceInsights from "../components/smartNote/MedicationAdherenceInsights";

export default function SmartNoteAssistant() {
  const [diagnosis, setDiagnosis] = useState("");
  const [customDiagnosis, setCustomDiagnosis] = useState("");
  const [careType, setCareType] = useState("home_health");
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

  // Handle inserting suggestions
  const handleInsertSuggestion = (text, position) => {
    if (position === 'inline') {
      setRoughNote(prev => prev + ' ' + text);
    } else {
      setRoughNote(prev => prev + '\n\n' + text);
    }
  };

  const handleInsertSummary = (text) => {
    setRoughNote(prev => text + '\n\n' + prev);
  };

  const handleExtractedData = (data) => {
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
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Smart Note Assistant
        </h1>
        <p className="text-gray-600">
          Transform your rough notes into polished, Medicare-compliant documentation ready for your EHR
        </p>
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
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="care_type">Care Type</Label>
                  <Select value={careType} onValueChange={setCareType}>
                    <SelectTrigger id="care_type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="home_health">Home Health</SelectItem>
                      <SelectItem value="hospice">Hospice</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

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

                <div className="md:col-span-2">
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

              {/* Patient Selection for History */}
              <div>
                <Label htmlFor="patient_select">Link to Patient (Optional - enables history summary)</Label>
                <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                  <SelectTrigger id="patient_select">
                    <SelectValue placeholder="Select patient for history..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={null}>No patient selected</SelectItem>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.first_name} {p.last_name} - {p.primary_diagnosis || 'No diagnosis'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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

          {/* Rough Notes Input */}
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
                rows={12}
                className="font-mono text-sm"
              />

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

                <Alert className="mt-4 bg-green-50 border-green-200">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-green-900">
                    Your note has been enhanced and is ready to copy into your EHR system!
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Suggestions Sidebar */}
        <div className="space-y-4">
          {/* AI Features Header */}
          <Card className="bg-gradient-to-br from-purple-600 to-indigo-600 text-white border-none">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Brain className="w-5 h-5" />
                <span className="font-bold">AI Assistant Features</span>
              </div>
              <p className="text-sm text-purple-100">
                7 AI-powered tools to enhance your documentation
              </p>
            </CardContent>
          </Card>

          {/* Real-Time Suggestions */}
          <RealTimeSuggestions
            currentText={roughNote}
            diagnosis={diagnosis === "Custom (type below)" ? customDiagnosis : diagnosis}
            careType={careType}
            onInsertSuggestion={handleInsertSuggestion}
          />

          {/* Patient History Summary */}
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

          {/* Data Extractor */}
          <DataExtractor
            narrativeText={enhancedNote || roughNote}
            patientId={selectedPatientId}
            onExtractedData={handleExtractedData}
            onCreateCarePlan={handleCreateCarePlan}
            onCreateTask={(task) => console.log('Task:', task)}
            onCarePlansCreated={(plans) => console.log('Care plans created:', plans)}
          />

          {/* External Knowledge Search */}
          <ExternalKnowledge
            diagnosis={diagnosis === "Custom (type below)" ? customDiagnosis : diagnosis}
            onInsertInformation={handleInsertInformation}
          />

          {/* Medication Adherence Insights */}
          <MedicationAdherenceInsights
            narrativeText={enhancedNote || roughNote}
            diagnosis={diagnosis === "Custom (type below)" ? customDiagnosis : diagnosis}
            onInsertIntervention={handleInsertInformation}
          />

          {/* Task Generator */}
          <TaskGenerator
            narrativeText={enhancedNote || roughNote}
            patientName={selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : ''}
            diagnosis={diagnosis === "Custom (type below)" ? customDiagnosis : diagnosis}
            onTasksGenerated={handleTasksGenerated}
          />

          {/* Personalized Feedback */}
          {auditResults && (
            <PersonalizedFeedback
              auditResults={auditResults}
              userEmail={currentUser?.email}
            />
          )}

          {/* Quick Tips */}
          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader className="py-3">
              <CardTitle className="text-sm">💡 Quick Tips</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-xs">
              <div className="bg-white p-2 rounded-lg border border-blue-200">
                <p className="font-semibold text-blue-900">Be Brief</p>
                <p className="text-gray-600">AI expands rough notes</p>
              </div>
              <div className="bg-white p-2 rounded-lg border border-blue-200">
                <p className="font-semibold text-blue-900">Include Key Facts</p>
                <p className="text-gray-600">Vitals, assessments, interventions</p>
              </div>
              <div className="bg-white p-2 rounded-lg border border-blue-200">
                <p className="font-semibold text-blue-900">Review & Edit</p>
                <p className="text-gray-600">Always verify before copying</p>
              </div>
            </CardContent>
          </Card>

          {/* Original Suggestions */}
          {suggestions.length > 0 && (
            <Card className="border-yellow-200">
              <CardHeader className="bg-yellow-50 py-3">
                <CardTitle className="flex items-center gap-2 text-sm">
                  <Lightbulb className="w-4 h-4 text-yellow-600" />
                  AI Suggestions ({suggestions.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-3 space-y-2">
                {suggestions.map((suggestion, index) => (
                  <Card key={index} className="border-l-4 border-l-yellow-500">
                    <CardContent className="p-2 space-y-1">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-1">
                          {getCategoryIcon(suggestion.category)}
                          <span className="font-semibold text-xs text-gray-900">
                            {suggestion.category}
                          </span>
                        </div>
                        <Badge className={`${getPriorityColor(suggestion.priority)} text-xs`}>
                          {suggestion.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-700">
                        {suggestion.suggestion}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
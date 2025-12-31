import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Copy, Loader2, CheckCircle2, AlertCircle, FileText, TrendingUp } from "lucide-react";
import { format } from "date-fns";

export default function AIDraftSOAPNote({ patientId, visitType = "routine_visit", onUseNote }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedNote, setGeneratedNote] = useState(null);
  const [editableNote, setEditableNote] = useState("");
  const [activeTab, setActiveTab] = useState("preview");

  // Fetch patient data
  const { data: patient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => base44.entities.Patient.filter({ id: patientId }).then(p => p[0]),
    enabled: !!patientId
  });

  // Fetch recent visits
  const { data: recentVisits = [] } = useQuery({
    queryKey: ['recentVisits', patientId],
    queryFn: () => base44.entities.Visit.filter({ patient_id: patientId }, '-visit_date', 5),
    enabled: !!patientId,
    initialData: []
  });

  // Fetch active alerts
  const { data: activeAlerts = [] } = useQuery({
    queryKey: ['activeAlerts', patientId],
    queryFn: () => base44.entities.PatientAlert.filter({ 
      patient_id: patientId, 
      status: 'active' 
    }),
    enabled: !!patientId,
    initialData: []
  });

  // Fetch recent clinical events
  const { data: clinicalEvents = [] } = useQuery({
    queryKey: ['clinicalEvents', patientId],
    queryFn: () => base44.entities.ClinicalEvent.filter({ patient_id: patientId }, '-event_date', 10),
    enabled: !!patientId,
    initialData: []
  });

  // Fetch active care plans
  const { data: carePlans = [] } = useQuery({
    queryKey: ['carePlans', patientId],
    queryFn: () => base44.entities.CarePlan.filter({ patient_id: patientId, status: 'active' }),
    enabled: !!patientId,
    initialData: []
  });

  // Fetch recent tasks
  const { data: recentTasks = [] } = useQuery({
    queryKey: ['recentTasks', patientId],
    queryFn: () => base44.entities.Task.filter({ patient_id: patientId }, '-created_date', 10),
    enabled: !!patientId,
    initialData: []
  });

  const handleGenerateNote = async () => {
    if (!patient) return;

    setIsGenerating(true);
    try {
      // Prepare comprehensive context for AI
      const context = {
        patient: {
          name: `${patient.first_name} ${patient.last_name}`,
          age: patient.date_of_birth ? Math.floor((new Date() - new Date(patient.date_of_birth)) / 31557600000) : null,
          gender: patient.gender,
          diagnoses: {
            primary: patient.primary_diagnosis,
            secondary: patient.secondary_diagnoses || []
          },
          medications: patient.current_medications || [],
          allergies: patient.allergies,
          baseline_vitals: patient.baseline_vitals || {},
          functional_status: patient.functional_status || {}
        },
        recent_visits: recentVisits.map(v => ({
          date: v.visit_date,
          type: v.visit_type,
          vitals: v.vital_signs,
          notes_summary: v.nurse_notes?.substring(0, 200)
        })),
        active_alerts: activeAlerts.map(a => ({
          type: a.alert_type,
          severity: a.severity,
          title: a.title,
          message: a.message,
          created: a.created_date
        })),
        clinical_events: clinicalEvents.slice(0, 5).map(e => ({
          type: e.event_type,
          date: e.event_date,
          title: e.event_title,
          description: e.event_description,
          severity: e.severity
        })),
        care_plans: carePlans.map(cp => ({
          problem: cp.problem,
          goal: cp.goal,
          status: cp.status
        })),
        recent_tasks: recentTasks.filter(t => t.status === 'completed').slice(0, 5).map(t => ({
          title: t.title,
          type: t.type,
          completion_notes: t.completion_notes
        }))
      };

      const prompt = `You are an expert home health nurse writing clinical documentation. Generate a comprehensive Medicare-compliant SOAP note for today's ${visitType} visit.

PATIENT CONTEXT:
${JSON.stringify(context, null, 2)}

Generate a detailed SOAP note with the following sections:

SUBJECTIVE:
- Include patient/caregiver report on current status
- Reference any complaints, symptoms, or concerns
- Include relevant quotes if applicable
- Address any active alerts or recent events

OBJECTIVE:
- Vital signs (use baseline if no new data, indicate "to be obtained")
- Physical assessment findings for all relevant systems
- Functional status assessment
- Medication review findings
- Safety assessment

ASSESSMENT:
- Clinical interpretation of findings
- Progress toward care plan goals
- Response to treatments
- Risk factors identified
- Changes from previous visit

PLAN:
- Interventions performed this visit
- Patient/caregiver education provided
- Coordination with MD or other disciplines
- Plan for next visit
- Any new orders or changes needed

Make the note detailed, professional, and Medicare-compliant. Use complete sentences and proper medical terminology. Ensure it demonstrates skilled nursing judgment and medical necessity for continued home health services.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        add_context_from_internet: false
      });

      const generated = {
        full_note: result,
        timestamp: new Date().toISOString(),
        context_used: {
          visits_reviewed: recentVisits.length,
          alerts_considered: activeAlerts.length,
          events_included: clinicalEvents.length,
          care_plans_referenced: carePlans.length,
          tasks_reviewed: recentTasks.length
        }
      };

      setGeneratedNote(generated);
      setEditableNote(result);
      setActiveTab("edit");
    } catch (error) {
      console.error('Error generating SOAP note:', error);
      alert('Failed to generate note. Please try again.');
    }
    setIsGenerating(false);
  };

  const handleCopyToClipboard = () => {
    navigator.clipboard.writeText(editableNote);
    alert('Note copied to clipboard');
  };

  const handleUseNote = () => {
    if (onUseNote) {
      onUseNote(editableNote);
    }
  };

  if (!patientId) {
    return (
      <Alert>
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>Please select a patient first</AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-green-300">
      <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-green-600" />
          AI Draft SOAP Note Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {!generatedNote ? (
          <>
            <Alert className="bg-blue-50 border-blue-200">
              <FileText className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-900 text-sm">
                Generate a complete SOAP note draft based on patient chart data, recent visits, active alerts, clinical events, and care plan progress.
              </AlertDescription>
            </Alert>

            {patient && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-sm">
                <div className="p-2 bg-gray-50 rounded">
                  <p className="text-xs text-gray-600">Recent Visits</p>
                  <p className="font-semibold">{recentVisits.length}</p>
                </div>
                <div className="p-2 bg-red-50 rounded">
                  <p className="text-xs text-gray-600">Active Alerts</p>
                  <p className="font-semibold text-red-700">{activeAlerts.length}</p>
                </div>
                <div className="p-2 bg-purple-50 rounded">
                  <p className="text-xs text-gray-600">Clinical Events</p>
                  <p className="font-semibold text-purple-700">{clinicalEvents.length}</p>
                </div>
                <div className="p-2 bg-blue-50 rounded">
                  <p className="text-xs text-gray-600">Care Plans</p>
                  <p className="font-semibold text-blue-700">{carePlans.length}</p>
                </div>
                <div className="p-2 bg-green-50 rounded">
                  <p className="text-xs text-gray-600">Recent Tasks</p>
                  <p className="font-semibold text-green-700">{recentTasks.filter(t => t.status === 'completed').length}</p>
                </div>
                <div className="p-2 bg-yellow-50 rounded">
                  <p className="text-xs text-gray-600">Medications</p>
                  <p className="font-semibold text-yellow-700">{patient.current_medications?.length || 0}</p>
                </div>
              </div>
            )}

            <Button
              onClick={handleGenerateNote}
              disabled={isGenerating || !patient}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating SOAP Note...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate AI Draft Note
                </>
              )}
            </Button>
          </>
        ) : (
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="preview">Preview</TabsTrigger>
              <TabsTrigger value="edit">Edit & Finalize</TabsTrigger>
            </TabsList>

            <TabsContent value="preview" className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className="bg-green-600 text-white">
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Generated {format(new Date(generatedNote.timestamp), 'h:mm a')}
                  </Badge>
                  <Badge variant="outline" className="text-xs">
                    {generatedNote.context_used.visits_reviewed} visits • {generatedNote.context_used.alerts_considered} alerts
                  </Badge>
                </div>
              </div>

              <div className="p-4 bg-white border rounded-lg max-h-[500px] overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm font-sans">
                  {generatedNote.full_note}
                </pre>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCopyToClipboard}
                  className="flex-1"
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy to Clipboard
                </Button>
                <Button
                  onClick={() => setActiveTab("edit")}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Edit Note
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="edit" className="space-y-4">
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertCircle className="w-4 h-4 text-yellow-600" />
                <AlertDescription className="text-yellow-900 text-sm">
                  Review and edit the AI-generated note. Ensure all information is accurate before using in patient chart.
                </AlertDescription>
              </Alert>

              <Textarea
                value={editableNote}
                onChange={(e) => setEditableNote(e.target.value)}
                rows={20}
                className="font-mono text-sm"
              />

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCopyToClipboard}
                >
                  <Copy className="w-4 h-4 mr-2" />
                  Copy
                </Button>
                <Button
                  onClick={handleUseNote}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Use This Note
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setGeneratedNote(null);
                    setEditableNote("");
                    setActiveTab("preview");
                  }}
                >
                  Generate New
                </Button>
              </div>
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
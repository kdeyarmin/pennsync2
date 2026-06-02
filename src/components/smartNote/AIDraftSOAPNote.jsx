import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, Copy, Loader2, CheckCircle2, AlertCircle, FileText } from "lucide-react";
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

      const prompt = `You are an expert home health nurse writing clinical documentation. Generate a comprehensive Medicare-compliant SOAP note for today's ${visitType} visit that meets ALL CMS home health regulations.

PATIENT CONTEXT:
${JSON.stringify(context, null, 2)}

CRITICAL MEDICARE COMPLIANCE REQUIREMENTS - MUST INCLUDE ALL:

1. HOMEBOUND STATUS (REQUIRED):
   - Document specific reason patient is confined to home
   - Describe taxing effort required to leave home (e.g., "requires wheelchair, considerable assistance, and taxing effort")
   - Note if patient leaves home only for medical appointments or religious services
   - Document any medical contraindications to leaving home

2. SKILLED NEED JUSTIFICATION (REQUIRED):
   - Explain WHY skilled nursing is required (complexity, teaching, assessment, management)
   - Demonstrate skilled nursing judgment used during visit
   - Show services cannot be safely/effectively performed by non-skilled persons
   - Document clinical decision-making process

3. MEDICAL NECESSITY (REQUIRED):
   - Link all interventions to physician orders and care plan goals
   - Show reasonable expectation of improvement or management of condition
   - Document complexity requiring professional skilled services
   - Explain relationship between diagnosis and need for services

4. SAFETY ASSESSMENT (REQUIRED):
   - Fall risk evaluation and interventions
   - Home safety hazards identified and addressed
   - Emergency preparedness discussed
   - Caregiver support and capabilities

Generate a detailed SOAP note with these sections:

SUBJECTIVE:
- Patient/caregiver report with direct quotes when significant
- Complaints, symptoms, concerns related to skilled need
- Pain assessment (location, quality, intensity, interventions)
- Homebound status verification ("Patient confirms remains homebound due to...")
- Active alerts or changes since last visit

OBJECTIVE:
- Complete vital signs with comparison to baseline/previous visit
- Systems review relevant to diagnosis and care plan
- Medication reconciliation (name, dose, frequency, compliance, side effects)
- Functional assessment (ADLs, mobility, transfers, gait, assistive devices)
- Wound assessment if applicable (size, drainage, appearance, treatment)
- Safety assessment findings
- Caregiver observation and competency

ASSESSMENT:
- Clinical interpretation demonstrating skilled nursing judgment
- Progress toward EACH care plan goal with specific measurements
- Response to treatments/interventions with clinical reasoning
- Changes from previous visit with analysis of significance
- Risk factors and clinical concerns requiring monitoring
- Medicare medical necessity clearly stated
- Continued need for skilled services justified

PLAN:
- Skilled interventions performed THIS visit with rationale
- Patient/caregiver education provided (topics, teaching methods, comprehension verified)
- Medication teaching and management
- Disease-specific education relevant to diagnoses
- Care coordination (MD communication, referrals, DME orders)
- Next visit plan with specific skilled nursing tasks
- Frequency and duration justification
- Any changes to plan of care or orders needed

COMPLIANCE CHECKLIST - ENSURE NOTE INCLUDES:
✓ Homebound status documented with specific details
✓ Skilled nursing need clearly justified
✓ Medical necessity evident throughout
✓ Progress toward care plan goals measured
✓ Patient/caregiver education documented with comprehension
✓ Safety assessment completed
✓ Medication reconciliation performed
✓ Coordination of care documented
✓ Clinical judgment demonstrated
✓ Complete sentences, proper grammar, no abbreviations except standard medical terms

Use professional medical terminology. Write in complete sentences. Avoid vague statements. Be specific with measurements and observations. Demonstrate complexity requiring skilled nursing. Make medical necessity crystal clear to Medicare reviewers.`;

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
                <div className="p-2 bg-slate-50 rounded">
                  <p className="text-xs text-slate-600">Recent Visits</p>
                  <p className="font-semibold">{recentVisits.length}</p>
                </div>
                <div className="p-2 bg-red-50 rounded">
                  <p className="text-xs text-slate-600">Active Alerts</p>
                  <p className="font-semibold text-red-700">{activeAlerts.length}</p>
                </div>
                <div className="p-2 bg-purple-50 rounded">
                  <p className="text-xs text-slate-600">Clinical Events</p>
                  <p className="font-semibold text-purple-700">{clinicalEvents.length}</p>
                </div>
                <div className="p-2 bg-blue-50 rounded">
                  <p className="text-xs text-slate-600">Care Plans</p>
                  <p className="font-semibold text-blue-700">{carePlans.length}</p>
                </div>
                <div className="p-2 bg-green-50 rounded">
                  <p className="text-xs text-slate-600">Recent Tasks</p>
                  <p className="font-semibold text-green-700">{recentTasks.filter(t => t.status === 'completed').length}</p>
                </div>
                <div className="p-2 bg-yellow-50 rounded">
                  <p className="text-xs text-slate-600">Medications</p>
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
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { invokeLLM } from "@/lib/invokeLLM";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertTriangle,
  Loader2,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Send
} from "lucide-react";
import { format } from "date-fns";

const INCIDENT_TYPES = {
  fall: {
    label: "Fall",
    prompts: [
      "Where did the fall occur?",
      "Was the fall witnessed?",
      "What was patient doing before the fall?",
      "Any injuries sustained?",
      "Was there loss of consciousness?",
      "Were bed rails up/down?",
      "What footwear was patient wearing?"
    ],
    notifications: ["physician", "office", "family"]
  },
  hospitalized: {
    label: "Hospitalization",
    prompts: [
      "Reason for hospitalization?",
      "Which hospital?",
      "Date/time of admission?",
      "Was it planned or emergency?",
      "Who transported patient?",
      "Last home health visit date?"
    ],
    notifications: ["physician", "office"]
  },
  medication_error: {
    label: "Medication Error",
    prompts: [
      "Which medication was involved?",
      "What was the error? (wrong dose, missed, wrong time)",
      "How was error discovered?",
      "Any adverse effects?",
      "What corrective action was taken?",
      "Was prescriber notified?"
    ],
    notifications: ["physician", "office"]
  },
  behavioral_change: {
    label: "Behavioral Change",
    prompts: [
      "Describe the behavioral change",
      "When was change first noticed?",
      "Any known triggers?",
      "Is patient oriented x4?",
      "Any new medications recently?",
      "Safety concerns present?"
    ],
    notifications: ["physician", "office", "family"]
  },
  infection_suspected: {
    label: "Suspected Infection",
    prompts: [
      "Type of suspected infection?",
      "Signs and symptoms observed?",
      "Vital signs at time of assessment?",
      "Any recent wounds or procedures?",
      "Current antibiotics if any?",
      "Cultures ordered/obtained?"
    ],
    notifications: ["physician"]
  },
  pressure_injury: {
    label: "Pressure Injury",
    prompts: [
      "Location of injury?",
      "Stage of pressure injury?",
      "Size (length x width x depth)?",
      "Wound bed description?",
      "Is this new or worsening?",
      "Current prevention measures in place?"
    ],
    notifications: ["physician", "office"]
  }
};

export default function GuidedIncidentReporting({ 
  patientId, 
  patientName,
  physicianEmail,
  caregiverEmail,
  onIncidentCreated 
}) {
  const [step, setStep] = useState(1);
  const [incidentType, setIncidentType] = useState("");
  const [incidentDate, setIncidentDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [incidentTime, setIncidentTime] = useState(format(new Date(), 'HH:mm'));
  const [answers, setAnswers] = useState({});
  const [generatedReport, setGeneratedReport] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [notifications, setNotifications] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const currentTypeConfig = INCIDENT_TYPES[incidentType];

  useEffect(() => {
    if (incidentType) {
      // Auto-select required notifications
      const defaultNotifications = {};
      currentTypeConfig?.notifications.forEach(n => {
        defaultNotifications[n] = true;
      });
      setNotifications(defaultNotifications);
    }
  }, [incidentType]);

  const handleAnswerChange = (prompt, value) => {
    setAnswers(prev => ({ ...prev, [prompt]: value }));
  };

  const generateReport = async () => {
    setIsGenerating(true);
    try {
      const result = await invokeLLM({
        prompt: `Generate a professional incident report based on these details:

INCIDENT TYPE: ${currentTypeConfig?.label}
DATE/TIME: ${incidentDate} at ${incidentTime}
PATIENT: ${patientName || 'Patient'}

COLLECTED INFORMATION:
${Object.entries(answers).map(([q, a]) => `Q: ${q}\nA: ${a}`).join('\n\n')}

Create a comprehensive, professional incident report that:
1. Summarizes the incident clearly
2. Documents all relevant details
3. Notes any immediate actions taken
4. Includes objective observations only
5. Is suitable for medical record documentation

Return the report text only, no JSON.`,
      });

      setGeneratedReport(result);
      setStep(3);
    } catch (error) {
      console.error("Error generating report:", error);
    }
    setIsGenerating(false);
  };

  const submitIncident = async () => {
    setIsSubmitting(true);
    try {
      // Create incident record
      const incident = await base44.entities.Incident.create({
        patient_id: patientId,
        incident_type: incidentType,
        incident_name: currentTypeConfig?.label,
        incident_date: incidentDate,
        incident_time: incidentTime,
        severity: 'medium',
        details: answers,
        report: generatedReport,
        physician_notified: notifications.physician || false,
        office_notified: notifications.office || false,
        status: 'reported'
      });

      // Send notifications
      if (notifications.physician && physicianEmail) {
        await base44.integrations.Core.SendEmail({
          to: physicianEmail,
          subject: `INCIDENT REPORT: ${currentTypeConfig?.label} - ${patientName}`,
          body: `An incident has been reported for your patient:\n\n${generatedReport}\n\nPlease review and provide orders as needed.`
        });
      }

      if (notifications.family && caregiverEmail) {
        await base44.integrations.Core.SendEmail({
          to: caregiverEmail,
          subject: `Health Update: ${patientName}`,
          body: `This is to inform you of a health-related incident:\n\n${generatedReport}\n\nThe care team is addressing this matter. Please contact us with any questions.`
        });
      }

      setSubmitted(true);
      onIncidentCreated && onIncidentCreated(incident);

    } catch (error) {
      console.error("Error submitting incident:", error);
      alert("Error submitting incident. Please try again.");
    }
    setIsSubmitting(false);
  };

  if (submitted) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6 text-center">
          <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-green-800 mb-2">Incident Reported Successfully</h3>
          <p className="text-sm text-green-700 mb-4">
            Notifications have been sent to selected parties.
          </p>
          <Button onClick={() => {
            setStep(1);
            setIncidentType("");
            setAnswers({});
            setGeneratedReport("");
            setSubmitted(false);
          }}>
            Report Another Incident
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-orange-200">
      <CardHeader className="py-3 bg-gradient-to-r from-orange-50 to-red-50">
        <CardTitle className="flex items-center gap-2 text-sm">
          <AlertTriangle className="w-4 h-4 text-orange-600" />
          Guided Incident Reporting
          <div className="flex-1" />
          <Badge variant="outline">Step {step} of 3</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {/* Step 1: Select Type */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Incident Type</label>
              <Select value={incidentType} onValueChange={setIncidentType}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select incident type..." />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(INCIDENT_TYPES).map(([key, config]) => (
                    <SelectItem key={key} value={key}>{config.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium">Date</label>
                <Input
                  type="date"
                  value={incidentDate}
                  onChange={(e) => setIncidentDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              <div>
                <label className="text-sm font-medium">Time</label>
                <Input
                  type="time"
                  value={incidentTime}
                  onChange={(e) => setIncidentTime(e.target.value)}
                  className="mt-1"
                />
              </div>
            </div>

            <Button
              className="w-full"
              disabled={!incidentType}
              onClick={() => setStep(2)}
            >
              Continue <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* Step 2: Answer Prompts */}
        {step === 2 && currentTypeConfig && (
          <div className="space-y-4">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-sm text-blue-800">
                Answer the following questions to ensure complete documentation.
              </AlertDescription>
            </Alert>

            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {currentTypeConfig.prompts.map((prompt, idx) => (
                <div key={idx}>
                  <label className="text-sm font-medium text-slate-700">{prompt}</label>
                  <Textarea
                    value={answers[prompt] || ''}
                    onChange={(e) => handleAnswerChange(prompt, e.target.value)}
                    className="mt-1 text-sm"
                    rows={2}
                    placeholder="Enter details..."
                  />
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(1)}>
                <ChevronLeft className="w-4 h-4 mr-2" /> Back
              </Button>
              <Button
                className="flex-1 bg-orange-600 hover:bg-orange-700"
                onClick={generateReport}
                disabled={isGenerating || Object.keys(answers).length === 0}
              >
                {isGenerating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Report...</>
                ) : (
                  <>Generate Report <ChevronRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Review & Submit */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Generated Report</label>
              <Textarea
                value={generatedReport}
                onChange={(e) => setGeneratedReport(e.target.value)}
                className="mt-1 text-sm font-mono"
                rows={10}
              />
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Notify:</label>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={notifications.physician}
                    onCheckedChange={(v) => setNotifications(prev => ({...prev, physician: v}))}
                  />
                  <span className="text-sm">Physician</span>
                  {physicianEmail && <Badge variant="outline" className="text-xs">{physicianEmail}</Badge>}
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={notifications.office}
                    onCheckedChange={(v) => setNotifications(prev => ({...prev, office: v}))}
                  />
                  <span className="text-sm">Office/Supervisor</span>
                </div>
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={notifications.family}
                    onCheckedChange={(v) => setNotifications(prev => ({...prev, family: v}))}
                  />
                  <span className="text-sm">Family/Caregiver</span>
                  {caregiverEmail && <Badge variant="outline" className="text-xs">{caregiverEmail}</Badge>}
                </div>
              </div>
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                <ChevronLeft className="w-4 h-4 mr-2" /> Edit Answers
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700"
                onClick={submitIncident}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                ) : (
                  <><Send className="w-4 h-4 mr-2" /> Submit Incident Report</>
                )}
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
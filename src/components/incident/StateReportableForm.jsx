import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertCircle, Loader2, Send, Info } from "lucide-react";

const EVENT_TYPES = [
  "Complaint of patient abuse - confirmed or not",
  "Death due to injury, suicide, or unusual circumstances",
  "Death due to malnutrition, dehydration or sepsis",
  "Death due to a medication error or adverse reaction to meds",
  "Health Department Reportable Diseases",
  "Misappropriation of patient property",
  "Patient Neglect",
  "Rape",
  "Transfer or admission to hospital because of injury or accident",
];

const REQUIRED_FIELDS = [
  "patient_id",
  "event_date",
  "event_time",
  "event_type",
  "location_of_event",
  "factual_description",
  "followup_action",
];

function FieldError({ show, message }) {
  if (!show) return null;
  return <p className="text-red-600 text-xs mt-1 flex items-center gap-1"><AlertCircle className="w-3 h-3" />{message}</p>;
}

export default function StateReportableForm({ currentUser }) {
  const { data: patients = [] } = useQuery({
    queryKey: ["state-reportable-patients"],
    queryFn: () => base44.entities.Patient.list("-last_name", 500),
    initialData: [],
  });
  const [form, setForm] = useState({
    patient_id: "",
    event_date: "",
    event_time: "",
    event_type: "",
    location_of_event: "",
    medications: "",
    diagnosis: "",
    factual_description: "",
    followup_action: "",
  });
  const [touched, setTouched] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);

  const set = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setTouched((prev) => ({ ...prev, [key]: true }));
  };

  const isFieldInvalid = (key) => {
    if (!REQUIRED_FIELDS.includes(key)) return false;
    return !form[key]?.trim();
  };

  const showError = (key) => (touched[key] || attemptedSubmit) && isFieldInvalid(key);

  const missingFields = REQUIRED_FIELDS.filter((k) => !form[k]?.trim());
  const isComplete = missingFields.length === 0;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setAttemptedSubmit(true);
    if (!isComplete) return;

    setSubmitting(true);
    setSubmitError(null);

    const patient = patients.find((p) => p.id === form.patient_id);
    const patientName = patient ? `${patient.first_name} ${patient.last_name}` : form.patient_id;

    const reportText = `
STATE REPORTABLE EVENT REPORT
==============================
Patient: ${patientName}
Date of Event: ${form.event_date}
Time of Event: ${form.event_time}
Event Type: ${form.event_type}
Location of Event: ${form.location_of_event}

Medications (Name & Frequency):
${form.medications || "Not provided"}

Diagnosis of Patient:
${form.diagnosis || "Not provided"}

Factual Description:
${form.factual_description}

Description of Follow-up Action:
${form.followup_action}

Submitted By: ${currentUser?.full_name || "Unknown"}
Submitted On: ${new Date().toLocaleString()}
    `.trim();

    // Save as an Incident record
    const incident = await base44.entities.Incident.create({
      patient_id: form.patient_id,
      patient_name: patientName,
      incident_type: "other",
      incident_name: `State Reportable: ${form.event_type}`,
      incident_date: form.event_date,
      incident_time: form.event_time,
      severity: "high",
      report: reportText,
      details: {
        state_reportable: true,
        event_type: form.event_type,
        location_of_event: form.location_of_event,
        medications: form.medications,
        diagnosis: form.diagnosis,
        factual_description: form.factual_description,
        followup_action: form.followup_action,
        submitted_by_name: currentUser?.full_name,
        submitted_by_email: currentUser?.email,
        submitted_at: new Date().toISOString(),
      },
      status: "reported",
      office_notified: true,
      alert_triggered: true,
    });

    // Notify admins
    const admins = await base44.entities.User.list("-created_date", 200);
    const adminUsers = admins.filter((u) => u.role === "admin");

    await Promise.all(
      adminUsers.map((admin) =>
        base44.entities.Notification.create({
          user_email: admin.email,
          title: "⚠️ State Reportable Event Submitted",
          message: `A state reportable event has been submitted by ${currentUser?.full_name || "a nurse"}.\nEvent Type: ${form.event_type}\nPatient: ${patientName}\nDate: ${form.event_date}`,
          type: "alert",
          is_read: false,
          related_entity_type: "Incident",
          related_entity_id: incident.id,
        })
      )
    );

    // Send emails to admins
    await Promise.all(
      adminUsers.map((admin) =>
        base44.integrations.Core.SendEmail({
          to: admin.email,
          subject: `[URGENT] State Reportable Event – ${form.event_type} – ${patientName}`,
          body: `<pre style="font-family:monospace;font-size:14px;">${reportText}</pre>`,
        }).catch(() => {})
      )
    );

    setSubmitting(false);
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="max-w-2xl mx-auto py-12 flex flex-col items-center gap-5 text-center">
        <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
          <CheckCircle2 className="w-10 h-10 text-green-600" />
        </div>
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Report Submitted</h2>
          <p className="text-gray-600 mt-2 max-w-md">
            Your state reportable event report has been successfully submitted. Agency administrators have been notified immediately.
          </p>
        </div>
        <Alert className="border-blue-200 bg-blue-50 text-left max-w-md">
          <Info className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            <strong>Note:</strong> Keep a copy of this report for your records. Your supervisor may follow up with you regarding this event.
          </AlertDescription>
        </Alert>
        <Button onClick={() => { setSubmitted(false); setForm({ patient_id:"",event_date:"",event_time:"",event_type:"",location_of_event:"",medications:"",diagnosis:"",factual_description:"",followup_action:"" }); setTouched({}); setAttemptedSubmit(false); }}>
          Submit Another Report
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900">State Reportable Event Report</h2>
        <p className="text-sm text-gray-600 mt-1">
          Fields preceded with <span className="text-red-600 font-bold">*</span> are required.
        </p>
      </div>

      {attemptedSubmit && !isComplete && (
        <Alert className="border-red-200 bg-red-50 mb-5">
          <AlertCircle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800">
            Please complete all required fields before submitting. {missingFields.length} field(s) still need your attention.
          </AlertDescription>
        </Alert>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="divide-y divide-gray-100">

          {/* Patient */}
          <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-4 items-start p-5">
            <Label className="pt-2 font-medium text-sm text-gray-700">
              <span className="text-red-600">*</span>Patient:
            </Label>
            <div>
              <Select value={form.patient_id} onValueChange={(v) => set("patient_id", v)}>
                <SelectTrigger className={showError("patient_id") ? "border-red-400" : ""}>
                  <SelectValue placeholder="Select a patient..." />
                </SelectTrigger>
                <SelectContent>
                  {patients.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.first_name} {p.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError show={showError("patient_id")} message="Patient is required." />
            </div>
          </div>

          {/* Date of Event */}
          <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-4 items-start p-5">
            <Label className="pt-2 font-medium text-sm text-gray-700">
              <span className="text-red-600">*</span>Date of Event (mm/dd/yyyy):
            </Label>
            <div>
              <Input
                type="date"
                value={form.event_date}
                onChange={(e) => set("event_date", e.target.value)}
                className={`max-w-xs ${showError("event_date") ? "border-red-400" : ""}`}
              />
              <FieldError show={showError("event_date")} message="Date of event is required." />
            </div>
          </div>

          {/* Time of Event */}
          <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-4 items-start p-5">
            <Label className="pt-2 font-medium text-sm text-gray-700">
              <span className="text-red-600">*</span>Time of Event (military hhmm):
            </Label>
            <div>
              <Input
                type="time"
                value={form.event_time}
                onChange={(e) => set("event_time", e.target.value)}
                className={`max-w-[120px] ${showError("event_time") ? "border-red-400" : ""}`}
              />
              <FieldError show={showError("event_time")} message="Time of event is required." />
            </div>
          </div>

          {/* Event Type */}
          <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-4 items-start p-5">
            <Label className="pt-2 font-medium text-sm text-gray-700">
              <span className="text-red-600">*</span>Event Type:
            </Label>
            <div>
              <Select value={form.event_type} onValueChange={(v) => set("event_type", v)}>
                <SelectTrigger className={showError("event_type") ? "border-red-400" : ""}>
                  <SelectValue placeholder="Select event type..." />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FieldError show={showError("event_type")} message="Event type is required." />
            </div>
          </div>

          {/* Location */}
          <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-4 items-start p-5">
            <Label className="pt-2 font-medium text-sm text-gray-700">
              <span className="text-red-600">*</span>Location of Event:
            </Label>
            <div>
              <Input
                value={form.location_of_event}
                onChange={(e) => set("location_of_event", e.target.value)}
                placeholder="e.g. Patient bedroom, bathroom, living room..."
                className={showError("location_of_event") ? "border-red-400" : ""}
              />
              <FieldError show={showError("location_of_event")} message="Location of event is required." />
            </div>
          </div>

          {/* Medications */}
          <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-4 items-start p-5">
            <Label className="pt-2 font-medium text-sm text-gray-700">
              Name and Frequency of Medication(s):<br />
              <span className="text-gray-400 font-normal text-xs">(maximum 600 characters)</span>
            </Label>
            <Textarea
              value={form.medications}
              onChange={(e) => set("medications", e.target.value)}
              maxLength={600}
              rows={4}
              placeholder="List current medications and frequency..."
              className="resize-none"
            />
          </div>

          {/* Diagnosis */}
          <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-4 items-start p-5">
            <Label className="pt-2 font-medium text-sm text-gray-700">
              Diagnosis of Patient:<br />
              <span className="text-gray-400 font-normal text-xs">(maximum 250 characters)</span>
            </Label>
            <Textarea
              value={form.diagnosis}
              onChange={(e) => set("diagnosis", e.target.value)}
              maxLength={250}
              rows={3}
              placeholder="Primary and secondary diagnoses..."
              className="resize-none"
            />
          </div>

          {/* Factual Description */}
          <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-4 items-start p-5">
            <Label className="pt-2 font-medium text-sm text-gray-700">
              <span className="text-red-600">*</span>Factual Description:<br />
              <span className="text-gray-400 font-normal text-xs">(maximum 3500 characters)</span>
            </Label>
            <div>
              <Textarea
                value={form.factual_description}
                onChange={(e) => set("factual_description", e.target.value)}
                maxLength={3500}
                rows={6}
                placeholder="Provide a complete factual description of the event..."
                className={`resize-none ${showError("factual_description") ? "border-red-400" : ""}`}
              />
              <div className="flex items-center justify-between mt-1">
                <FieldError show={showError("factual_description")} message="Factual description is required." />
                <span className="text-xs text-gray-400 ml-auto">{form.factual_description.length}/3500</span>
              </div>
            </div>
          </div>

          {/* Follow-up Action */}
          <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-4 items-start p-5">
            <Label className="pt-2 font-medium text-sm text-gray-700">
              <span className="text-red-600">*</span>Description of Follow-up Action:<br />
              <span className="text-gray-400 font-normal text-xs">(maximum 3500 characters)</span>
            </Label>
            <div>
              <Textarea
                value={form.followup_action}
                onChange={(e) => set("followup_action", e.target.value)}
                maxLength={3500}
                rows={6}
                placeholder="Describe the actions taken or planned in response to this event..."
                className={`resize-none ${showError("followup_action") ? "border-red-400" : ""}`}
              />
              <div className="flex items-center justify-between mt-1">
                <FieldError show={showError("followup_action")} message="Follow-up action description is required." />
                <span className="text-xs text-gray-400 ml-auto">{form.followup_action.length}/3500</span>
              </div>
            </div>
          </div>

          {/* Submitted By (read-only, auto-filled) */}
          <div className="grid grid-cols-1 sm:grid-cols-[220px_1fr] gap-4 items-start p-5 bg-gray-50">
            <Label className="pt-2 font-medium text-sm text-gray-700">Submitted By:</Label>
            <Input value={currentUser?.full_name || ""} readOnly className="bg-white text-gray-600 max-w-xs" />
          </div>

        </div>

        {/* Footer note */}
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-200 text-center space-y-4">
          <p className="text-sm text-gray-600">
            <strong>Note:</strong> An event will not be considered submitted until you receive a confirmation. Once submitted, agency administrators will be notified immediately.
          </p>

          {submitError && (
            <Alert className="border-red-200 bg-red-50 text-left">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">{submitError}</AlertDescription>
            </Alert>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={submitting}
            className="min-w-[140px] bg-red-600 hover:bg-red-700 text-white"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Submitting...</>
            ) : (
              <><Send className="w-4 h-4 mr-2" />Submit Report</>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
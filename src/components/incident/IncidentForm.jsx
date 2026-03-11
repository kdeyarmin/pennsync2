import React, { useMemo, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { submitIncidentReport } from "@/functions/submitIncidentReport";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Camera, Send, Siren, TriangleAlert } from "lucide-react";
import SearchablePatientSelect from "@/components/ui/SearchablePatientSelect";
import IncidentPhotoCapture from "@/components/incident/IncidentPhotoCapture";

const INCIDENT_TYPES = [
  { value: "wound_concern", label: "Wound concern" },
  { value: "pressure_injury", label: "Pressure injury" },
  { value: "fall", label: "Fall" },
  { value: "medication_error", label: "Medication error" },
  { value: "safety_event", label: "Safety event" },
  { value: "behavioral_change", label: "Behavioral change" },
  { value: "infection_suspected", label: "Suspected infection" },
  { value: "other", label: "Other" },
];

const getCurrentDate = () => new Date().toISOString().slice(0, 10);
const getCurrentTime = () => new Date().toTimeString().slice(0, 5);

export default function IncidentForm({ patients = [], currentUser, onSubmitted }) {
  const [photoFiles, setPhotoFiles] = useState([]);
  const [successMessage, setSuccessMessage] = useState("");
  const [form, setForm] = useState({
    patient_id: "",
    incident_type: "safety_event",
    severity: "high",
    incident_date: getCurrentDate(),
    incident_time: getCurrentTime(),
    incident_name: "",
    report: "",
    wound_location: "",
    safety_location: "",
    immediate_alert: true,
    physician_notified: false,
  });

  const selectedPatient = useMemo(
    () => patients.find((patient) => patient.id === form.patient_id),
    [patients, form.patient_id]
  );

  const submitMutation = useMutation({
    mutationFn: async () => {
      const photo_urls = await Promise.all(
        photoFiles.map(async (file) => {
          const result = await base44.integrations.Core.UploadFile({ file });
          return result.file_url;
        })
      );

      return submitIncidentReport({
        patient_id: form.patient_id,
        patient_name: selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : "",
        incident_type: form.incident_type,
        incident_name: form.incident_name || INCIDENT_TYPES.find((type) => type.value === form.incident_type)?.label,
        incident_date: form.incident_date,
        incident_time: form.incident_time,
        severity: form.severity,
        report: form.report,
        photo_urls,
        physician_notified: form.physician_notified,
        immediate_alert: form.immediate_alert,
        details: {
          reported_by: currentUser?.full_name || currentUser?.email,
          wound_location: form.wound_location,
          safety_location: form.safety_location,
        },
      });
    },
    onSuccess: () => {
      setSuccessMessage("Incident submitted and admin alerts were triggered.");
      setPhotoFiles([]);
      setForm({
        patient_id: "",
        incident_type: "safety_event",
        severity: "high",
        incident_date: getCurrentDate(),
        incident_time: getCurrentTime(),
        incident_name: "",
        report: "",
        wound_location: "",
        safety_location: "",
        immediate_alert: true,
        physician_notified: false,
      });
      onSubmitted?.();
    },
  });

  return (
    <Card className="shadow-lg border-red-100">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Siren className="w-5 h-5 text-red-600" />
          Real-time incident reporting
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <Alert className="border-red-200 bg-red-50">
          <TriangleAlert className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-900">
            High-severity submissions trigger immediate alerts for the clinical admin team.
          </AlertDescription>
        </Alert>

        {successMessage && (
          <Alert>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Patient</label>
          <SearchablePatientSelect
            patients={patients}
            value={form.patient_id}
            onValueChange={(value) => setForm((prev) => ({ ...prev, patient_id: value }))}
            placeholder="Select patient"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Incident type</label>
            <Select value={form.incident_type} onValueChange={(value) => setForm((prev) => ({ ...prev, incident_type: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INCIDENT_TYPES.map((type) => (
                  <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Severity</label>
            <Select value={form.severity} onValueChange={(value) => setForm((prev) => ({ ...prev, severity: value }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Date</label>
            <Input type="date" value={form.incident_date} onChange={(event) => setForm((prev) => ({ ...prev, incident_date: event.target.value }))} />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Time</label>
            <Input type="time" value={form.incident_time} onChange={(event) => setForm((prev) => ({ ...prev, incident_time: event.target.value }))} />
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Short title</label>
          <Input
            value={form.incident_name}
            onChange={(event) => setForm((prev) => ({ ...prev, incident_name: event.target.value }))}
            placeholder="Example: New sacral wound observed"
          />
        </div>

        {form.incident_type === "wound_concern" || form.incident_type === "pressure_injury" ? (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Wound location</label>
            <Input
              value={form.wound_location}
              onChange={(event) => setForm((prev) => ({ ...prev, wound_location: event.target.value }))}
              placeholder="Example: Left heel"
            />
          </div>
        ) : null}

        {form.incident_type === "safety_event" || form.incident_type === "fall" ? (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Event location</label>
            <Input
              value={form.safety_location}
              onChange={(event) => setForm((prev) => ({ ...prev, safety_location: event.target.value }))}
              placeholder="Example: Bathroom near shower"
            />
          </div>
        ) : null}

        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Narrative report</label>
          <Textarea
            rows={6}
            value={form.report}
            onChange={(event) => setForm((prev) => ({ ...prev, report: event.target.value }))}
            placeholder="Describe what happened, what you observed, what actions were taken, and who was notified."
          />
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
            <Camera className="w-4 h-4" />
            Photo capture
          </div>
          <IncidentPhotoCapture files={photoFiles} onFilesChange={setPhotoFiles} />
        </div>

        <div className="space-y-3 rounded-xl border bg-slate-50 p-4">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={form.immediate_alert}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, immediate_alert: !!checked }))}
            />
            <div>
              <p className="text-sm font-medium text-gray-900">Trigger immediate admin alert</p>
              <p className="text-xs text-gray-500">Creates urgent notifications for clinical admins right away.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Checkbox
              checked={form.physician_notified}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, physician_notified: !!checked }))}
            />
            <div>
              <p className="text-sm font-medium text-gray-900">Physician already notified</p>
              <p className="text-xs text-gray-500">Use this to document that you already contacted the provider.</p>
            </div>
          </div>
        </div>

        <Button
          className="w-full min-h-[52px] bg-red-600 hover:bg-red-700"
          disabled={!form.patient_id || !form.report || submitMutation.isPending}
          onClick={() => submitMutation.mutate()}
        >
          <Send className="w-4 h-4 mr-2" />
          {submitMutation.isPending ? "Submitting..." : "Submit incident report"}
        </Button>
      </CardContent>
    </Card>
  );
}
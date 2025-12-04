import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileText,
  Sparkles,
  Loader2,
  CheckCircle2,
  Edit3,
  Eye,
  Copy,
  Download,
  AlertTriangle,
  User,
  Activity,
  Stethoscope,
  ClipboardList,
  Calendar,
  Printer,
  Save,
  RotateCcw
} from "lucide-react";

export default function DischargeSummaryGenerator({ patientId, onComplete }) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [summary, setSummary] = useState(null);
  const [editedSummary, setEditedSummary] = useState({});
  const [isEditing, setIsEditing] = useState(false);
  const [dischargeReason, setDischargeReason] = useState("goals_met");
  const [dischargeDate, setDischargeDate] = useState(new Date().toISOString().split('T')[0]);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showDialog, setShowDialog] = useState(false);

  // Fetch patient data
  const { data: patient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => base44.entities.Patient.filter({ id: patientId }),
    enabled: !!patientId,
    select: (data) => data[0]
  });

  // Fetch patient visits
  const { data: visits = [] } = useQuery({
    queryKey: ['patientVisits', patientId],
    queryFn: () => base44.entities.Visit.filter({ patient_id: patientId }, '-visit_date', 20),
    enabled: !!patientId
  });

  // Fetch care plans
  const { data: carePlans = [] } = useQuery({
    queryKey: ['patientCarePlans', patientId],
    queryFn: () => base44.entities.CarePlan.filter({ patient_id: patientId }),
    enabled: !!patientId
  });

  // Fetch incidents
  const { data: incidents = [] } = useQuery({
    queryKey: ['patientIncidents', patientId],
    queryFn: () => base44.entities.Incident.filter({ patient_id: patientId }),
    enabled: !!patientId
  });

  const dischargeReasons = [
    { value: "goals_met", label: "Goals Met - Patient Achieved Outcomes" },
    { value: "physician_order", label: "Physician Ordered Discharge" },
    { value: "patient_request", label: "Patient/Family Request" },
    { value: "hospitalized", label: "Patient Hospitalized" },
    { value: "transferred", label: "Transferred to Another Provider" },
    { value: "deceased", label: "Patient Deceased" },
    { value: "moved", label: "Patient Moved Out of Service Area" },
    { value: "non_compliant", label: "Non-Compliance with Plan of Care" }
  ];

  const generateSummary = async () => {
    setIsGenerating(true);
    try {
      // Compile patient data for analysis
      const patientData = {
        demographics: patient ? {
          name: `${patient.first_name} ${patient.last_name}`,
          dob: patient.date_of_birth,
          mrn: patient.medical_record_number,
          primaryDiagnosis: patient.primary_diagnosis,
          secondaryDiagnoses: patient.secondary_diagnoses,
          allergies: patient.allergies
        } : {},
        visits: visits.slice(0, 10).map(v => ({
          date: v.visit_date,
          type: v.visit_type,
          notes: v.nurse_notes?.substring(0, 500),
          vitals: v.vital_signs
        })),
        carePlans: carePlans.map(cp => ({
          problem: cp.problem,
          goal: cp.goal,
          status: cp.status,
          interventions: cp.interventions
        })),
        incidents: incidents.map(i => ({
          type: i.incident_type,
          date: i.incident_date,
          status: i.status
        }))
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a comprehensive, Medicare-compliant discharge summary for a home health patient.

PATIENT DATA:
${JSON.stringify(patientData, null, 2)}

DISCHARGE REASON: ${dischargeReasons.find(r => r.value === dischargeReason)?.label}
DISCHARGE DATE: ${dischargeDate}

Generate a professional discharge summary with the following sections:

1. PATIENT INFORMATION: Demographics, diagnoses, allergies
2. ADMISSION SUMMARY: Reason for home health admission, initial condition
3. COURSE OF TREATMENT: Summary of care provided, interventions, visit frequency
4. VITAL SIGNS SUMMARY: Trends and final vital signs
5. CARE PLAN OUTCOMES: Status of each care plan goal (met/not met/ongoing)
6. MEDICATIONS AT DISCHARGE: Current medication regimen
7. PATIENT/CAREGIVER EDUCATION: Education provided and patient understanding
8. FUNCTIONAL STATUS AT DISCHARGE: ADLs, mobility, cognitive status
9. DISCHARGE INSTRUCTIONS: Follow-up care, warning signs, who to contact
10. PHYSICIAN COMMUNICATION: Summary for PCP notification
11. DISCHARGE REASON: Detailed reason for discharge
12. RECOMMENDATIONS: Post-discharge recommendations

Make the summary professional, compliant with Medicare documentation standards, and suitable for medical records.

Return JSON with each section as a key.`,
        response_json_schema: {
          type: "object",
          properties: {
            patient_information: { type: "string" },
            admission_summary: { type: "string" },
            course_of_treatment: { type: "string" },
            vital_signs_summary: { type: "string" },
            care_plan_outcomes: { type: "string" },
            medications_at_discharge: { type: "string" },
            patient_education: { type: "string" },
            functional_status: { type: "string" },
            discharge_instructions: { type: "string" },
            physician_communication: { type: "string" },
            discharge_reason: { type: "string" },
            recommendations: { type: "string" }
          }
        }
      });

      setSummary(result);
      setEditedSummary(result);
    } catch (error) {
      console.error("Error generating discharge summary:", error);
    }
    setIsGenerating(false);
  };

  const handleSectionEdit = (section, value) => {
    setEditedSummary(prev => ({ ...prev, [section]: value }));
  };

  const getFullSummaryText = () => {
    const sections = [
      { key: 'patient_information', title: 'PATIENT INFORMATION' },
      { key: 'admission_summary', title: 'ADMISSION SUMMARY' },
      { key: 'course_of_treatment', title: 'COURSE OF TREATMENT' },
      { key: 'vital_signs_summary', title: 'VITAL SIGNS SUMMARY' },
      { key: 'care_plan_outcomes', title: 'CARE PLAN OUTCOMES' },
      { key: 'medications_at_discharge', title: 'MEDICATIONS AT DISCHARGE' },
      { key: 'patient_education', title: 'PATIENT/CAREGIVER EDUCATION' },
      { key: 'functional_status', title: 'FUNCTIONAL STATUS AT DISCHARGE' },
      { key: 'discharge_instructions', title: 'DISCHARGE INSTRUCTIONS' },
      { key: 'physician_communication', title: 'PHYSICIAN COMMUNICATION' },
      { key: 'discharge_reason', title: 'DISCHARGE REASON' },
      { key: 'recommendations', title: 'RECOMMENDATIONS' }
    ];

    return sections.map(s => 
      `=== ${s.title} ===\n${editedSummary[s.key] || ''}`
    ).join('\n\n');
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(getFullSummaryText());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const text = getFullSummaryText();
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `discharge_summary_${patient?.last_name || 'patient'}_${dischargeDate}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update patient status to discharged
      await base44.entities.Patient.update(patientId, { status: 'discharged' });
      
      // Create a final visit record with the discharge summary
      await base44.entities.Visit.create({
        patient_id: patientId,
        visit_date: dischargeDate,
        visit_type: 'discharge',
        status: 'completed',
        nurse_notes: getFullSummaryText()
      });

      onComplete?.();
      setShowDialog(false);
    } catch (error) {
      console.error("Error saving discharge summary:", error);
    }
    setIsSaving(false);
  };

  const sectionIcons = {
    patient_information: User,
    admission_summary: FileText,
    course_of_treatment: Stethoscope,
    vital_signs_summary: Activity,
    care_plan_outcomes: ClipboardList,
    medications_at_discharge: FileText,
    patient_education: FileText,
    functional_status: Activity,
    discharge_instructions: AlertTriangle,
    physician_communication: User,
    discharge_reason: FileText,
    recommendations: Sparkles
  };

  const sectionLabels = {
    patient_information: 'Patient Information',
    admission_summary: 'Admission Summary',
    course_of_treatment: 'Course of Treatment',
    vital_signs_summary: 'Vital Signs Summary',
    care_plan_outcomes: 'Care Plan Outcomes',
    medications_at_discharge: 'Medications at Discharge',
    patient_education: 'Patient/Caregiver Education',
    functional_status: 'Functional Status',
    discharge_instructions: 'Discharge Instructions',
    physician_communication: 'Physician Communication',
    discharge_reason: 'Discharge Reason',
    recommendations: 'Recommendations'
  };

  return (
    <Dialog open={showDialog} onOpenChange={setShowDialog}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2">
          <FileText className="w-4 h-4" />
          Generate Discharge Summary
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-blue-600" />
            AI Discharge Summary Generator
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Configuration */}
          {!summary && (
            <Card>
              <CardHeader className="py-3">
                <CardTitle className="text-sm">Discharge Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-xs">Discharge Date</Label>
                    <Input
                      type="date"
                      value={dischargeDate}
                      onChange={(e) => setDischargeDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Discharge Reason</Label>
                    <Select value={dischargeReason} onValueChange={setDischargeReason}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {dischargeReasons.map(r => (
                          <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Data preview */}
                <div className="grid grid-cols-3 gap-2 text-xs">
                  <Badge variant="outline" className="justify-center py-2">
                    <Activity className="w-3 h-3 mr-1" />
                    {visits.length} Visits
                  </Badge>
                  <Badge variant="outline" className="justify-center py-2">
                    <ClipboardList className="w-3 h-3 mr-1" />
                    {carePlans.length} Care Plans
                  </Badge>
                  <Badge variant="outline" className="justify-center py-2">
                    <AlertTriangle className="w-3 h-3 mr-1" />
                    {incidents.length} Incidents
                  </Badge>
                </div>

                <Button 
                  onClick={generateSummary} 
                  disabled={isGenerating || !patientId}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600"
                >
                  {isGenerating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing Patient Data...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" /> Generate Discharge Summary</>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Generated Summary */}
          {summary && (
            <>
              {/* Action Bar */}
              <div className="flex items-center justify-between flex-wrap gap-2 p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant={isEditing ? "default" : "outline"}
                    onClick={() => setIsEditing(!isEditing)}
                  >
                    {isEditing ? <Eye className="w-4 h-4 mr-1" /> : <Edit3 className="w-4 h-4 mr-1" />}
                    {isEditing ? 'Preview' : 'Edit'}
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setSummary(null);
                      setEditedSummary({});
                    }}
                  >
                    <RotateCcw className="w-4 h-4 mr-1" />
                    Regenerate
                  </Button>
                </div>
                <div className="flex items-center gap-2">
                  <Button size="sm" variant="outline" onClick={handleCopy}>
                    {copied ? <CheckCircle2 className="w-4 h-4 mr-1 text-green-600" /> : <Copy className="w-4 h-4 mr-1" />}
                    {copied ? 'Copied!' : 'Copy'}
                  </Button>
                  <Button size="sm" variant="outline" onClick={handleDownload}>
                    <Download className="w-4 h-4 mr-1" />
                    Download
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => window.print()}>
                    <Printer className="w-4 h-4 mr-1" />
                    Print
                  </Button>
                </div>
              </div>

              {/* Summary Sections */}
              <Accordion type="multiple" defaultValue={Object.keys(sectionLabels)} className="space-y-2">
                {Object.entries(sectionLabels).map(([key, label]) => {
                  const Icon = sectionIcons[key] || FileText;
                  return (
                    <AccordionItem key={key} value={key} className="border rounded-lg">
                      <AccordionTrigger className="px-4 py-2 hover:no-underline">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-blue-600" />
                          <span className="text-sm font-medium">{label}</span>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 pb-4">
                        {isEditing ? (
                          <Textarea
                            value={editedSummary[key] || ''}
                            onChange={(e) => handleSectionEdit(key, e.target.value)}
                            rows={5}
                            className="text-sm"
                          />
                        ) : (
                          <div className="bg-white p-3 rounded border text-sm whitespace-pre-wrap">
                            {editedSummary[key] || summary[key]}
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>

              {/* Save/Finalize */}
              <Alert className="bg-blue-50 border-blue-200">
                <AlertTriangle className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-blue-800">
                  Review all sections carefully before finalizing. This will mark the patient as discharged and save the summary to their record.
                </AlertDescription>
              </Alert>

              <div className="flex gap-3">
                <Button
                  onClick={handleSave}
                  disabled={isSaving}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {isSaving ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Saving...</>
                  ) : (
                    <><Save className="w-4 h-4 mr-2" /> Finalize & Discharge Patient</>
                  )}
                </Button>
                <Button variant="outline" onClick={() => setShowDialog(false)}>
                  Cancel
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
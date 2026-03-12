import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  FileText,
  Sparkles,
  Loader2,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

export default function DischargeVisitSummary({
  patient,
  visit,
  allVisits,
  carePlans,
  onSummaryGenerated
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [hasGenerated, setHasGenerated] = useState(false);

  // Fetch incidents for discharge summary
  const { data: incidents = [] } = useQuery({
    queryKey: ['patientIncidents', patient?.id],
    queryFn: () => base44.entities.Incident.filter({ patient_id: patient?.id }),
    enabled: !!patient?.id
  });

  // Auto-generate on mount for discharge visits
  useEffect(() => {
    if (visit?.visit_type === 'discharge' && !hasGenerated && patient) {
      generateDischargeSummary();
    }
  }, [visit?.visit_type, patient?.id]);

  const generateDischargeSummary = async () => {
    if (!patient || !visit) return;
    
    setIsGenerating(true);
    try {
      // Compile comprehensive patient data
      const patientData = {
        demographics: {
          name: `${patient.first_name} ${patient.last_name}`,
          dob: patient.date_of_birth,
          mrn: patient.medical_record_number,
          primaryDiagnosis: patient.primary_diagnosis,
          secondaryDiagnoses: patient.secondary_diagnoses,
          allergies: patient.allergies
        },
        visits: allVisits?.slice(0, 10).map(v => ({
          date: v.visit_date,
          type: v.visit_type,
          notes: v.nurse_notes?.substring(0, 300),
          vitals: v.vital_signs
        })) || [],
        carePlans: carePlans?.map(cp => ({
          problem: cp.problem,
          goal: cp.goal,
          status: cp.status,
          interventions: cp.interventions
        })) || [],
        incidents: incidents?.map(i => ({
          type: i.incident_type,
          date: i.incident_date,
          status: i.status
        })) || []
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a comprehensive Medicare-compliant discharge summary for this home health patient.

PATIENT DATA:
${JSON.stringify(patientData, null, 2)}

DISCHARGE DATE: ${visit.visit_date}

Create a professional discharge clinical narrative that includes:

1. **PATIENT IDENTIFICATION**: Name, DOB, MRN, diagnoses
2. **ADMISSION SUMMARY**: Original reason for home health services
3. **COURSE OF TREATMENT**: Summary of skilled nursing interventions provided
4. **VITAL SIGNS TREND**: Summary of vital sign trends during care
5. **CARE PLAN OUTCOMES**: Status of each care plan goal (met/not met/ongoing)
6. **FUNCTIONAL STATUS AT DISCHARGE**: Current ADL/IADL status compared to admission
7. **PATIENT/CAREGIVER EDUCATION SUMMARY**: Education provided and comprehension level
8. **CURRENT MEDICATIONS**: Complete medication list at discharge
9. **DISCHARGE INSTRUCTIONS**: 
   - When to seek medical attention
   - Follow-up appointments needed
   - Activity restrictions if any
   - Diet recommendations
10. **PHYSICIAN COMMUNICATION**: Summary for PCP notification
11. **DISCHARGE DISPOSITION**: Where patient is being discharged to
12. **RECOMMENDATIONS**: Post-discharge recommendations

Format as a professional clinical narrative suitable for EHR documentation.
DO NOT include any meta-commentary at the end. Just provide the clinical narrative.`,
        response_json_schema: {
          type: "object",
          properties: {
            discharge_summary: { type: "string" },
            key_outcomes: {
              type: "array",
              items: { type: "string" }
            },
            follow_up_needed: { type: "boolean" },
            follow_up_reason: { type: "string" }
          }
        }
      });

      onSummaryGenerated?.(result.discharge_summary);
      setHasGenerated(true);
    } catch (error) {
      console.error("Error generating discharge summary:", error);
    }
    setIsGenerating(false);
  };

  // Only show for discharge visits
  if (visit?.visit_type !== 'discharge') {
    return null;
  }

  return (
    <Card className="border-2 border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50">
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-orange-600" />
          Discharge Visit Documentation
          <Badge className="bg-orange-100 text-orange-800 ml-auto">Discharge</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-3">
        {isGenerating ? (
          <div className="flex items-center justify-center py-6 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
            <div className="text-center">
              <p className="text-sm font-medium text-gray-900">Generating Discharge Summary...</p>
              <p className="text-xs text-gray-600">Analyzing patient history and care outcomes</p>
            </div>
          </div>
        ) : hasGenerated ? (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Discharge summary generated!</strong> Review and edit as needed in the Clinical Narrative section below.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <Alert className="bg-orange-100 border-orange-300">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                This is a <strong>Discharge Visit</strong>. A comprehensive discharge summary will be automatically generated based on the patient's complete care history.
              </AlertDescription>
            </Alert>
            <Button
              onClick={generateDischargeSummary}
              className="w-full bg-orange-600 hover:bg-orange-700"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Discharge Summary
            </Button>
          </>
        )}

        {/* Data summary */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="bg-white p-2 rounded border text-center">
            <p className="text-lg font-bold text-orange-600">{allVisits?.length || 0}</p>
            <p className="text-gray-500">Total Visits</p>
          </div>
          <div className="bg-white p-2 rounded border text-center">
            <p className="text-lg font-bold text-green-600">
              {carePlans?.filter(cp => cp.status === 'met').length || 0}
            </p>
            <p className="text-gray-500">Goals Met</p>
          </div>
          <div className="bg-white p-2 rounded border text-center">
            <p className="text-lg font-bold text-blue-600">{carePlans?.length || 0}</p>
            <p className="text-gray-500">Care Plans</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
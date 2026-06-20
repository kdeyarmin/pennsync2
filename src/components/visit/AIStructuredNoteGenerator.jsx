import { useState } from "react";
import { invokeLLM } from "@/lib/invokeLLM";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Wand2, Loader2, CheckCircle2, Copy, Sparkles } from "lucide-react";

export default function AIStructuredNoteGenerator({
  patient,
  vitalSigns,
  oasisData,
  carePlans = [],
  diagnosis,
  visitType,
  observations = "",
  onNoteGenerated
}) {
  const [generatedNote, setGeneratedNote] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);

  const generateStructuredNote = async () => {
    if (!patient) return;

    setIsGenerating(true);
    try {
      const prompt = `Generate a comprehensive, Medicare-compliant clinical visit note based on the following structured data:

PATIENT: ${patient.first_name} ${patient.last_name}
DIAGNOSIS: ${diagnosis || patient.primary_diagnosis || 'Not specified'}
VISIT TYPE: ${visitType || 'Routine Visit'}

VITAL SIGNS:
${vitalSigns ? `
- Blood Pressure: ${vitalSigns.blood_pressure_systolic || vitalSigns.bp?.split('/')[0]}/${vitalSigns.blood_pressure_diastolic || vitalSigns.bp?.split('/')[1]} mmHg
- Heart Rate: ${vitalSigns.heart_rate || vitalSigns.hr} bpm
- Temperature: ${vitalSigns.temperature || vitalSigns.temp}°F
- Oxygen Saturation: ${vitalSigns.oxygen_saturation || vitalSigns.o2}% ${vitalSigns.o2Source === 'on_oxygen' ? `on ${vitalSigns.o2Flow || ''}L O2` : 'on room air'}
- Pain Level: ${vitalSigns.pain_level || vitalSigns.pain}/10
- Weight: ${vitalSigns.weight} lbs
` : 'Not recorded'}

OASIS DATA:
${oasisData ? `
- Clinical Group: ${oasisData.pdgm_data?.clinical_grouping || 'Not specified'}
- Functional Level: ${oasisData.pdgm_data?.functional_impairment_level || 'Not specified'}
- Admission Source: ${oasisData.pdgm_data?.admission_source || 'Not specified'}
- Comorbidities: ${Array.isArray(oasisData.pdgm_data?.comorbidity_level) ? oasisData.pdgm_data.comorbidity_level.join(', ') : 'None documented'}
- ADL Status: ${oasisData.extracted_data?.adl_limitations ? Object.keys(oasisData.extracted_data.adl_limitations).filter(k => oasisData.extracted_data.adl_limitations[k]).join(', ') : 'Independent'}
- Fall Risk: ${oasisData.extracted_data?.fall_risk || 'Not assessed'}
- Cognitive Status: ${oasisData.extracted_data?.cognitive_functioning || 'Not assessed'}
` : 'No OASIS data available'}

ACTIVE CARE PLANS:
${carePlans.filter(cp => cp.status === 'active').map(cp => `
- Problem: ${cp.problem}
  Goal: ${cp.goal}
  Interventions: ${cp.interventions?.join(', ') || 'Not specified'}
`).join('\n') || 'No active care plans'}

CLINICIAN OBSERVATIONS:
${observations || 'None provided'}

PATIENT HISTORY:
- Allergies: ${patient.allergies || 'NKDA'}
- Current Medications: ${patient.current_medications?.length || 0} medications
- Secondary Diagnoses: ${patient.secondary_diagnoses?.join(', ') || 'None'}

Generate a complete Medicare-compliant clinical narrative that includes:
1. **Subjective**: Patient's reported symptoms, concerns, and responses
2. **Objective**: Vital signs with normal/abnormal flags, physical assessment findings
3. **Assessment**: Clinical interpretation of findings, progress toward goals
4. **Plan**: Continuing interventions, patient education provided, next visit schedule
5. **Homebound Status**: Clear documentation of why leaving home is taxing
6. **Skilled Need**: Justification for skilled nursing care
7. **Patient Response**: Teaching effectiveness and patient understanding

Return as JSON:
{
  "note": "Complete clinical narrative",
  "key_elements": {
    "homebound_documented": boolean,
    "skilled_need_documented": boolean,
    "patient_response_documented": boolean,
    "vitals_abnormalities": ["string"],
    "care_plan_progress": ["string"]
  },
  "quality_score": 0-100,
  "compliance_score": 0-100
}`;

      const result = await invokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            note: { type: "string" },
            key_elements: {
              type: "object",
              properties: {
                homebound_documented: { type: "boolean" },
                skilled_need_documented: { type: "boolean" },
                patient_response_documented: { type: "boolean" },
                vitals_abnormalities: { type: "array", items: { type: "string" } },
                care_plan_progress: { type: "array", items: { type: "string" } }
              }
            },
            quality_score: { type: "number" },
            compliance_score: { type: "number" }
          }
        }
      });

      setGeneratedNote(result);
      if (onNoteGenerated) {
        onNoteGenerated(result.note);
      }
    } catch (error) {
      console.error("Error generating note:", error);
    }
    setIsGenerating(false);
  };

  const handleCopy = () => {
    if (generatedNote?.note) {
      navigator.clipboard.writeText(generatedNote.note);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const canGenerate = patient && (vitalSigns || oasisData || observations);

  return (
    <Card className="border-2 border-indigo-200 bg-gradient-to-br from-indigo-50 to-navy-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-indigo-600" />
          AI Auto-Generate Visit Note
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!canGenerate ? (
          <Alert>
            <AlertDescription>
              Add vitals, OASIS data, or observations to generate a structured note.
            </AlertDescription>
          </Alert>
        ) : !generatedNote ? (
          <div className="space-y-3">
            <p className="text-sm text-slate-600">
              Generate a complete Medicare-compliant note from your structured data.
            </p>
            <Button
              onClick={generateStructuredNote}
              disabled={isGenerating || !canGenerate}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Generating Note...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate Complete Note
                </>
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="font-semibold text-slate-900">Note Generated</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge className="bg-green-600">Quality: {generatedNote.quality_score}%</Badge>
                <Badge className="bg-blue-600">Compliance: {generatedNote.compliance_score}%</Badge>
              </div>
            </div>

            <div className="bg-white rounded-lg p-4 border border-slate-200 max-h-96 overflow-y-auto">
              <p className="text-sm text-slate-800 whitespace-pre-wrap">{generatedNote.note}</p>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className={`p-2 rounded ${generatedNote.key_elements.homebound_documented ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {generatedNote.key_elements.homebound_documented ? '✓' : '✗'} Homebound Status
              </div>
              <div className={`p-2 rounded ${generatedNote.key_elements.skilled_need_documented ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {generatedNote.key_elements.skilled_need_documented ? '✓' : '✗'} Skilled Need
              </div>
              <div className={`p-2 rounded ${generatedNote.key_elements.patient_response_documented ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {generatedNote.key_elements.patient_response_documented ? '✓' : '✗'} Patient Response
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCopy}
                variant="outline"
                className="flex-1"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 mr-2" />
                    Copied!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Note
                  </>
                )}
              </Button>
              <Button
                onClick={generateStructuredNote}
                variant="outline"
                disabled={isGenerating}
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Regenerate
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
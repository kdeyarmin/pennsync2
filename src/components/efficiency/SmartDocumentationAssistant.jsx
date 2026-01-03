import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, CheckCircle2, Clock, AlertCircle, FileText, Zap } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

export default function SmartDocumentationAssistant({ 
  patientId, 
  documentType = "care_plan", // care_plan, oasis, visit_note, admission
  onDataGenerated,
  autoFillEnabled = true 
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedData, setGeneratedData] = useState(null);
  const [appliedSections, setAppliedSections] = useState(new Set());

  const queryClient = useQueryClient();

  // Fetch patient data
  const { data: patient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => base44.entities.Patient.list().then(patients => 
      patients.find(p => p.id === patientId)
    ),
    enabled: !!patientId
  });

  // Fetch recent visits
  const { data: recentVisits = [] } = useQuery({
    queryKey: ['recentVisits', patientId],
    queryFn: () => base44.entities.Visit.filter({ patient_id: patientId }, '-visit_date', 10),
    enabled: !!patientId,
    initialData: []
  });

  // Fetch clinical events
  const { data: clinicalEvents = [] } = useQuery({
    queryKey: ['clinicalEvents', patientId],
    queryFn: () => base44.entities.ClinicalEvent.filter({ patient_id: patientId }, '-event_date', 20),
    enabled: !!patientId,
    initialData: []
  });

  // Fetch care plans
  const { data: carePlans = [] } = useQuery({
    queryKey: ['carePlans', patientId],
    queryFn: () => base44.entities.CarePlan.filter({ patient_id: patientId }, '-created_date', 10),
    enabled: !!patientId,
    initialData: []
  });

  const generateSmartDocumentation = async () => {
    if (!patient) return;

    setIsGenerating(true);
    try {
      const context = {
        patient: {
          name: `${patient.first_name} ${patient.last_name}`,
          age: patient.date_of_birth,
          diagnosis: patient.primary_diagnosis,
          medications: patient.current_medications || [],
          allergies: patient.allergies,
          functional_status: patient.functional_status,
          baseline_vitals: patient.baseline_vitals
        },
        recentVisits: recentVisits.slice(0, 3).map(v => ({
          date: v.visit_date,
          type: v.visit_type,
          notes: v.nurse_notes,
          vitals: v.vital_signs
        })),
        clinicalEvents: clinicalEvents.slice(0, 5).map(e => ({
          type: e.event_type,
          date: e.event_date,
          description: e.event_description
        })),
        activeCarePlans: carePlans.filter(cp => cp.status === 'active')
      };

      let prompt = "";
      if (documentType === "care_plan") {
        prompt = `Based on this patient's current health status and recent clinical data, generate a comprehensive care plan with:
1. Primary problems/nursing diagnoses
2. Measurable goals
3. Specific interventions
4. Baseline measurements
5. Target dates (60 days from now)

Patient Context: ${JSON.stringify(context, null, 2)}

Format as JSON with sections: problems, goals, interventions, baselines, frequencies`;
      } else if (documentType === "oasis") {
        prompt = `Generate preliminary OASIS assessment responses based on patient data:
- M1800 Grooming, M1810 Dressing, M1820 Bathing, M1830 Toileting, M1840 Transferring, M1850 Ambulation
- Suggest appropriate scores based on functional status and recent visit notes
- Include clinical reasoning for each suggestion

Patient Context: ${JSON.stringify(context, null, 2)}

Format as JSON with item_number, suggested_response, confidence_level, rationale`;
      } else if (documentType === "admission") {
        prompt = `Generate admission documentation sections:
1. Admission assessment summary
2. Current medications reconciliation
3. Initial care plan priorities
4. Patient/family education needs
5. Risk assessments (falls, pressure injury, readmission)

Patient Context: ${JSON.stringify(context, null, 2)}

Format as JSON with clear sections`;
      }

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            sections: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  section_id: { type: "string" },
                  section_name: { type: "string" },
                  content: { type: "object" },
                  confidence: { type: "number" },
                  ai_reasoning: { type: "string" }
                }
              }
            }
          }
        }
      });

      setGeneratedData(response);
      if (onDataGenerated) {
        onDataGenerated(response);
      }
    } catch (error) {
      console.error("Smart documentation generation failed:", error);
    } finally {
      setIsGenerating(false);
    }
  };

  const applySection = (sectionId) => {
    setAppliedSections(prev => new Set([...prev, sectionId]));
    // Trigger callback with section data
    if (onDataGenerated) {
      const section = generatedData.sections.find(s => s.section_id === sectionId);
      onDataGenerated({ appliedSection: section });
    }
  };

  useEffect(() => {
    if (autoFillEnabled && patient && !generatedData && !isGenerating) {
      generateSmartDocumentation();
    }
  }, [patient, autoFillEnabled]);

  if (!patient) return null;

  return (
    <Card className="border-2 border-purple-300 bg-purple-50">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="w-5 h-5 text-purple-600" />
          Smart Documentation Assistant
          <Badge className="ml-auto bg-purple-600">AI-Powered</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {isGenerating && (
          <Alert className="bg-blue-50 border-blue-300">
            <Clock className="w-4 h-4 text-blue-600 animate-spin" />
            <AlertDescription className="text-blue-900">
              <strong>Analyzing patient data...</strong>
              <p className="text-sm mt-1">Generating smart documentation based on {recentVisits.length} recent visits and {clinicalEvents.length} clinical events.</p>
            </AlertDescription>
          </Alert>
        )}

        {!isGenerating && !generatedData && (
          <Button 
            onClick={generateSmartDocumentation}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            <Zap className="w-4 h-4 mr-2" />
            Generate Smart Pre-Fill
          </Button>
        )}

        {generatedData?.sections && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-gray-700">
              {generatedData.sections.length} sections ready to apply:
            </p>
            
            {generatedData.sections.map((section) => (
              <Card 
                key={section.section_id}
                className={`${appliedSections.has(section.section_id) ? 'bg-green-50 border-green-300' : 'hover:border-purple-300'}`}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <span className="font-medium text-sm">{section.section_name}</span>
                        <Badge 
                          variant="outline"
                          className={
                            section.confidence >= 0.9 ? "bg-green-100 text-green-700 border-green-300" :
                            section.confidence >= 0.7 ? "bg-blue-100 text-blue-700 border-blue-300" :
                            "bg-yellow-100 text-yellow-700 border-yellow-300"
                          }
                        >
                          {Math.round(section.confidence * 100)}% confident
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-2">{section.ai_reasoning}</p>
                      
                      <div className="bg-white rounded p-2 text-xs font-mono border">
                        {JSON.stringify(section.content, null, 2).slice(0, 150)}...
                      </div>
                    </div>
                    
                    {appliedSections.has(section.section_id) ? (
                      <CheckCircle2 className="w-5 h-5 text-green-600 ml-2 flex-shrink-0" />
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => applySection(section.section_id)}
                        className="ml-2 bg-purple-600 hover:bg-purple-700"
                      >
                        Apply
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {appliedSections.size === generatedData.sections.length && (
              <Alert className="bg-green-50 border-green-300 mt-3">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-green-900">
                  <strong>All sections applied!</strong> Documentation has been pre-filled with AI-generated content.
                </AlertDescription>
              </Alert>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { 
  Stethoscope, 
  Heart,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ClipboardList,
  ArrowRight
} from "lucide-react";

export default function ClinicalGuidelinesAssistant({ 
  diagnosis, 
  patientData,
  vitalSigns,
  onInsertGuideline
}) {
  const [guidelines, setGuidelines] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedProtocol, setSelectedProtocol] = useState(null);

  useEffect(() => {
    if (diagnosis) {
      fetchGuidelines();
    }
  }, [diagnosis]);

  const fetchGuidelines = async () => {
    setIsLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a clinical expert in home health nursing. Provide evidence-based clinical practice guidelines for this diagnosis.

DIAGNOSIS: ${diagnosis}

PATIENT CONTEXT:
${patientData ? `
- Age: ${patientData.date_of_birth ? new Date().getFullYear() - new Date(patientData.date_of_birth).getFullYear() : 'Unknown'}
- Comorbidities: ${patientData.secondary_diagnoses?.join(', ') || 'None'}
- Current Medications: ${patientData.current_medications?.map(m => m.name).join(', ') || 'None'}
- Functional Status: ${patientData.functional_status?.ambulation || 'Unknown'}
` : 'Limited patient data'}

CURRENT VITALS:
${vitalSigns ? `
- BP: ${vitalSigns.bp || 'Not recorded'}
- HR: ${vitalSigns.hr || 'Not recorded'}
- O2 Sat: ${vitalSigns.o2 || 'Not recorded'}%
- Temp: ${vitalSigns.temp || 'Not recorded'}
` : 'No vitals provided'}

Provide comprehensive clinical guidelines including:

1. **Assessment Protocol**: What to assess at each visit
2. **Monitoring Parameters**: Critical signs/symptoms to track
3. **Patient Education**: Key teaching points
4. **Red Flags**: Warning signs requiring immediate intervention
5. **Documentation Requirements**: Specific elements to document
6. **Evidence-Based Interventions**: Best practice nursing interventions
7. **Medication Monitoring**: What to monitor if on related medications
8. **Care Coordination**: When to contact MD or other providers

Return JSON with actionable, specific guidance:
{
  "condition_overview": {
    "key_pathophysiology": "brief explanation",
    "typical_progression": "what to expect",
    "home_health_focus": "why they need skilled nursing"
  },
  "assessment_protocol": [
    {
      "category": "Cardiovascular/Respiratory/Neurological/etc",
      "specific_assessments": ["detailed assessment items"],
      "frequency": "every visit | weekly | as needed",
      "documentation_template": "exact text nurse can use"
    }
  ],
  "critical_monitoring": [
    {
      "parameter": "vital sign or symptom",
      "normal_range": "expected values",
      "concerning_threshold": "when to escalate",
      "action_required": "what to do if abnormal",
      "documentation_text": "how to document findings"
    }
  ],
  "red_flags": [
    {
      "warning_sign": "specific symptom/finding",
      "urgency": "immediate" | "urgent" | "monitor",
      "action": "call 911 | notify MD stat | increase monitoring",
      "rationale": "why this is concerning"
    }
  ],
  "patient_education_priorities": [
    {
      "topic": "specific teaching point",
      "key_messages": ["bullet points to teach"],
      "teach_back_questions": ["questions to assess understanding"],
      "documentation_example": "Patient educated on X and demonstrated Y..."
    }
  ],
  "nursing_interventions": [
    {
      "intervention": "specific skilled nursing action",
      "evidence_basis": "guideline source (AHA/CDC/etc)",
      "frequency": "how often",
      "expected_outcome": "what should improve",
      "documentation_template": "text to document intervention"
    }
  ],
  "medication_considerations": [
    {
      "medication_class": "type of medication",
      "monitoring_requirements": ["what to check"],
      "adverse_effects": ["what to watch for"],
      "patient_teaching": ["what patient needs to know"],
      "documentation_points": "key elements to document"
    }
  ],
  "care_coordination": [
    {
      "scenario": "when to contact provider",
      "trigger": "specific condition/finding",
      "communication_template": "what to report to MD",
      "documentation": "how to document the communication"
    }
  ],
  "diagnosis_specific_documentation": {
    "required_elements": ["must document items for this diagnosis"],
    "medicare_focus_areas": ["elements for reimbursement"],
    "oasis_implications": ["relevant OASIS items to consider"],
    "sample_compliant_note": "Example paragraph showing all required elements"
  }
}`,
        response_json_schema: {
          type: "object",
          properties: {
            condition_overview: { type: "object" },
            assessment_protocol: { type: "array", items: { type: "object" } },
            critical_monitoring: { type: "array", items: { type: "object" } },
            red_flags: { type: "array", items: { type: "object" } },
            patient_education_priorities: { type: "array", items: { type: "object" } },
            nursing_interventions: { type: "array", items: { type: "object" } },
            medication_considerations: { type: "array", items: { type: "object" } },
            care_coordination: { type: "array", items: { type: "object" } },
            diagnosis_specific_documentation: { type: "object" }
          }
        }
      });

      setGuidelines(result);
    } catch (error) {
      console.error("Error fetching clinical guidelines:", error);
    }
    setIsLoading(false);
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'immediate': return 'bg-red-100 text-red-800 border-red-300';
      case 'urgent': return 'bg-orange-100 text-orange-800 border-orange-300';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    }
  };

  if (!diagnosis) {
    return null;
  }

  return (
    <Card className="border-indigo-200 bg-gradient-to-b from-indigo-50 to-white">
      <CardHeader className="py-3">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-indigo-600" />
            <span>Clinical Guidelines: {diagnosis.split(' ')[0]}</span>
          </div>
          {!guidelines && (
            <Button
              size="sm"
              onClick={fetchGuidelines}
              disabled={isLoading}
              className="h-7 bg-indigo-600 hover:bg-indigo-700"
            >
              {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Load Guidelines'}
            </Button>
          )}
        </CardTitle>
      </CardHeader>

      <CardContent className="p-3 space-y-3 max-h-[600px] overflow-y-auto">
        {isLoading ? (
          <div className="text-center py-6">
            <Loader2 className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
            <p className="text-xs text-slate-600">Loading evidence-based guidelines...</p>
          </div>
        ) : guidelines ? (
          <>
            {/* Condition Overview */}
            {guidelines.condition_overview && (
              <Alert className="bg-indigo-50 border-indigo-200">
                <Activity className="w-4 h-4 text-indigo-600" />
                <AlertDescription className="text-xs text-indigo-900">
                  <p className="font-semibold mb-1">Clinical Focus</p>
                  <p className="mb-2">{guidelines.condition_overview.home_health_focus}</p>
                  <p className="text-indigo-700 text-[10px]">{guidelines.condition_overview.typical_progression}</p>
                </AlertDescription>
              </Alert>
            )}

            {/* Red Flags - Most Important */}
            {guidelines.red_flags?.length > 0 && (
              <Card className="border-red-300 bg-red-50">
                <CardHeader className="py-2">
                  <CardTitle className="text-xs flex items-center gap-2 text-red-900">
                    <AlertTriangle className="w-4 h-4" />
                    Critical Warning Signs
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-2 space-y-2">
                  {guidelines.red_flags.map((flag, idx) => (
                    <div key={idx} className={`p-2 rounded border ${getUrgencyColor(flag.urgency)}`}>
                      <div className="flex items-start justify-between mb-1">
                        <p className="text-xs font-bold">{flag.warning_sign}</p>
                        <Badge className={getUrgencyColor(flag.urgency)}>
                          {flag.urgency}
                        </Badge>
                      </div>
                      <p className="text-xs mb-1"><strong>Action:</strong> {flag.action}</p>
                      <p className="text-[10px] text-slate-700">{flag.rationale}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            <Accordion type="single" collapsible className="space-y-2">
              {/* Assessment Protocol */}
              {guidelines.assessment_protocol?.length > 0 && (
                <AccordionItem value="assessment" className="border rounded-lg bg-white">
                  <AccordionTrigger className="px-3 py-2 text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-blue-600" />
                      Assessment Protocol ({guidelines.assessment_protocol.length} categories)
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3 space-y-2">
                    {guidelines.assessment_protocol.map((protocol, idx) => (
                      <div key={idx} className="bg-blue-50 p-2 rounded border border-blue-200">
                        <div className="flex items-center justify-between mb-1">
                          <p className="text-xs font-semibold text-blue-900">{protocol.category}</p>
                          <Badge variant="outline" className="text-[10px]">{protocol.frequency}</Badge>
                        </div>
                        <ul className="list-disc list-inside text-[10px] text-slate-700 mb-2 space-y-0.5">
                          {protocol.specific_assessments?.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                        {protocol.documentation_template && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] w-full"
                            onClick={() => onInsertGuideline?.(protocol.documentation_template)}
                          >
                            <ArrowRight className="w-3 h-3 mr-1" /> Use Template
                          </Button>
                        )}
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Critical Monitoring */}
              {guidelines.critical_monitoring?.length > 0 && (
                <AccordionItem value="monitoring" className="border rounded-lg bg-white">
                  <AccordionTrigger className="px-3 py-2 text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-green-600" />
                      Monitoring Parameters
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3 space-y-2">
                    {guidelines.critical_monitoring.map((param, idx) => (
                      <div key={idx} className="bg-green-50 p-2 rounded border border-green-200">
                        <p className="text-xs font-semibold text-green-900 mb-1">{param.parameter}</p>
                        <div className="grid grid-cols-2 gap-2 text-[10px] mb-2">
                          <div>
                            <span className="text-slate-600">Normal: </span>
                            <span className="font-medium">{param.normal_range}</span>
                          </div>
                          <div>
                            <span className="text-slate-600">Alert if: </span>
                            <span className="font-medium text-orange-700">{param.concerning_threshold}</span>
                          </div>
                        </div>
                        <p className="text-[10px] bg-white p-1 rounded mb-1">
                          <strong>If abnormal:</strong> {param.action_required}
                        </p>
                        {param.documentation_text && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] w-full"
                            onClick={() => onInsertGuideline?.(param.documentation_text)}
                          >
                            Insert Documentation
                          </Button>
                        )}
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Patient Education */}
              {guidelines.patient_education_priorities?.length > 0 && (
                <AccordionItem value="education" className="border rounded-lg bg-white">
                  <AccordionTrigger className="px-3 py-2 text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <Heart className="w-4 h-4 text-pink-600" />
                      Patient Education Priorities
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3 space-y-2">
                    {guidelines.patient_education_priorities.map((edu, idx) => (
                      <div key={idx} className="bg-pink-50 p-2 rounded border border-pink-200">
                        <p className="text-xs font-semibold text-pink-900 mb-1">{edu.topic}</p>
                        <div className="text-[10px] mb-2">
                          <p className="font-semibold text-slate-700 mb-0.5">Key Messages:</p>
                          <ul className="list-disc list-inside text-slate-600 space-y-0.5">
                            {edu.key_messages?.map((msg, i) => (
                              <li key={i}>{msg}</li>
                            ))}
                          </ul>
                        </div>
                        {edu.teach_back_questions?.length > 0 && (
                          <div className="text-[10px] mb-2 bg-white p-1.5 rounded">
                            <p className="font-semibold text-slate-700 mb-0.5">Teach-Back Questions:</p>
                            <ul className="list-disc list-inside text-slate-600">
                              {edu.teach_back_questions.map((q, i) => (
                                <li key={i}>{q}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        {edu.documentation_example && (
                          <Button
                            size="sm"
                            className="h-6 text-[10px] w-full bg-pink-600 hover:bg-pink-700"
                            onClick={() => onInsertGuideline?.(edu.documentation_example)}
                          >
                            Use Documentation Example
                          </Button>
                        )}
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Nursing Interventions */}
              {guidelines.nursing_interventions?.length > 0 && (
                <AccordionItem value="interventions" className="border rounded-lg bg-white">
                  <AccordionTrigger className="px-3 py-2 text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-purple-600" />
                      Evidence-Based Interventions
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3 space-y-2">
                    {guidelines.nursing_interventions.map((intervention, idx) => (
                      <div key={idx} className="bg-purple-50 p-2 rounded border border-purple-200">
                        <div className="flex items-start justify-between mb-1">
                          <p className="text-xs font-semibold text-purple-900 flex-1">{intervention.intervention}</p>
                          <Badge variant="outline" className="text-[10px]">{intervention.frequency}</Badge>
                        </div>
                        <p className="text-[10px] text-slate-600 mb-1">
                          <strong>Evidence:</strong> {intervention.evidence_basis}
                        </p>
                        <p className="text-[10px] text-purple-700">
                          <strong>Expected Outcome:</strong> {intervention.expected_outcome}
                        </p>
                        {intervention.documentation_template && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-6 text-[10px] w-full mt-1"
                            onClick={() => onInsertGuideline?.(intervention.documentation_template)}
                          >
                            Insert Template
                          </Button>
                        )}
                      </div>
                    ))}
                  </AccordionContent>
                </AccordionItem>
              )}

              {/* Diagnosis-Specific Documentation */}
              {guidelines.diagnosis_specific_documentation && (
                <AccordionItem value="documentation" className="border rounded-lg bg-white">
                  <AccordionTrigger className="px-3 py-2 text-xs font-semibold">
                    <div className="flex items-center gap-2">
                      <ClipboardList className="w-4 h-4 text-orange-600" />
                      Medicare Documentation Requirements
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3 space-y-2">
                    <div className="bg-orange-50 p-2 rounded border border-orange-200">
                      <p className="text-xs font-semibold text-orange-900 mb-2">Required Elements:</p>
                      <ul className="list-disc list-inside text-[10px] text-slate-700 space-y-0.5 mb-2">
                        {guidelines.diagnosis_specific_documentation.required_elements?.map((elem, i) => (
                          <li key={i}>{elem}</li>
                        ))}
                      </ul>
                      {guidelines.diagnosis_specific_documentation.sample_compliant_note && (
                        <>
                          <p className="text-xs font-semibold text-orange-900 mb-1">Sample Compliant Note:</p>
                          <div className="bg-white p-2 rounded text-[10px] text-slate-700 italic mb-2">
                            "{guidelines.diagnosis_specific_documentation.sample_compliant_note}"
                          </div>
                          <Button
                            size="sm"
                            className="h-6 text-[10px] w-full bg-orange-600 hover:bg-orange-700"
                            onClick={() => onInsertGuideline?.(guidelines.diagnosis_specific_documentation.sample_compliant_note)}
                          >
                            Use This Example
                          </Button>
                        </>
                      )}
                    </div>
                  </AccordionContent>
                </AccordionItem>
              )}
            </Accordion>
          </>
        ) : (
          <div className="text-center py-6 text-slate-500 text-sm">
            <Stethoscope className="w-12 h-12 text-slate-300 mx-auto mb-2" />
            <p>Click "Load Guidelines" to access clinical protocols</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
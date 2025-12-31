import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Brain,
  FileText,
  Target,
  TrendingUp,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Sparkles,
  History,
  Activity
} from "lucide-react";

export default function EnhancedPatientContextPanel({ patient, onContextUpdate }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [contextData, setContextData] = useState({
    medicalHistorySummary: null,
    clinicalDocumentsSummary: null,
    carePlanProgress: null
  });

  const [allVisits, setAllVisits] = useState([]);
  const [carePlans, setCarePlans] = useState([]);

  useEffect(() => {
    if (patient?.id) {
      loadPatientData();
    }
  }, [patient?.id]);

  const loadPatientData = async () => {
    if (!patient?.id) return;

    try {
      // Fetch all visits for comprehensive history
      const visits = await base44.entities.Visit.filter(
        { patient_id: patient.id },
        '-visit_date'
      );
      setAllVisits(visits);

      // Fetch all care plans
      const plans = await base44.entities.CarePlan.filter(
        { patient_id: patient.id }
      );
      setCarePlans(plans);
    } catch (error) {
      console.error('Error loading patient data:', error);
    }
  };

  const generateComprehensiveSummaries = async () => {
    if (!patient?.id) return;

    setIsLoading(true);

    try {
      // Generate medical history summary
      const historyPrompt = `Analyze the following patient's complete medical history and provide a comprehensive, concise summary for clinical reference:

Patient: ${patient.first_name} ${patient.last_name}
DOB: ${patient.date_of_birth}

Primary Diagnosis: ${patient.primary_diagnosis || 'Not specified'}
Secondary Diagnoses: ${patient.secondary_diagnoses?.join(', ') || 'None'}
Allergies: ${patient.allergies || 'None documented'}

Past Medical History:
${patient.past_medical_history?.join(', ') || 'Not documented'}

Past Hospitalizations:
${patient.past_hospitalizations?.map(h => `${h.date}: ${h.reason} at ${h.hospital}`).join('\n') || 'None documented'}

Current Medications:
${patient.current_medications?.map(m => `${m.name} ${m.dosage} ${m.frequency}`).join('\n') || 'None documented'}

All Visits (${allVisits.length} total):
${allVisits.slice(0, 10).map(v => `${v.visit_date} (${v.visit_type}): ${v.nurse_notes?.substring(0, 150)}`).join('\n')}

Provide a clinical summary highlighting:
1. Key diagnoses and their progression
2. Significant medical events
3. Current clinical status
4. Important considerations for ongoing care`;

      const historyResult = await base44.integrations.Core.InvokeLLM({
        prompt: historyPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            key_diagnoses: { type: "array", items: { type: "string" } },
            clinical_concerns: { type: "array", items: { type: "string" } },
            care_considerations: { type: "array", items: { type: "string" } }
          }
        }
      });

      // Generate clinical documents summary
      const docsPrompt = `Analyze all clinical documentation for this patient and provide a synthesized summary:

Patient: ${patient.first_name} ${patient.last_name}

Enhanced Notes History (${patient.enhanced_notes_history?.length || 0} entries):
${patient.enhanced_notes_history?.slice(0, 5).map(n => `${n.date}: ${n.enhanced_note?.substring(0, 200)}`).join('\n') || 'None'}

Visit Documentation (${allVisits.length} visits):
${allVisits.slice(0, 8).map(v => `${v.visit_date}: ${v.nurse_notes?.substring(0, 150)}`).join('\n')}

Clinical Notes: ${patient.clinical_notes || 'None'}

Provide a synthesis highlighting:
1. Patterns in clinical documentation
2. Key clinical findings over time
3. Documentation gaps or areas needing attention
4. Notable changes in patient status`;

      const docsResult = await base44.integrations.Core.InvokeLLM({
        prompt: docsPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" },
            clinical_patterns: { type: "array", items: { type: "string" } },
            key_findings: { type: "array", items: { type: "string" } },
            documentation_gaps: { type: "array", items: { type: "string" } }
          }
        }
      });

      // Generate care plan progress analysis
      const activePlans = carePlans.filter(cp => cp.status === 'active');
      const carePlanPrompt = `Analyze the patient's care plan progress and provide insights:

Patient: ${patient.first_name} ${patient.last_name}

Active Care Plans (${activePlans.length}):
${activePlans.map(cp => `
Problem: ${cp.problem}
Goal: ${cp.goal}
Status: ${cp.status}
Target Date: ${cp.target_date}
Interventions: ${cp.interventions?.join(', ')}
Baseline: ${cp.baseline_measurement}
`).join('\n')}

Recent Visit Notes (for progress context):
${allVisits.slice(0, 5).map(v => `${v.visit_date}: ${v.nurse_notes?.substring(0, 200)}`).join('\n')}

Provide analysis:
1. Progress toward each goal
2. Effectiveness of interventions
3. Recommendations for care plan adjustments
4. Barriers to progress`;

      const carePlanResult = await base44.integrations.Core.InvokeLLM({
        prompt: carePlanPrompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_progress: { type: "string" },
            plan_progress: { 
              type: "array", 
              items: { 
                type: "object",
                properties: {
                  problem: { type: "string" },
                  progress_status: { type: "string" },
                  recommendations: { type: "string" }
                }
              }
            },
            barriers: { type: "array", items: { type: "string" } },
            next_steps: { type: "array", items: { type: "string" } }
          }
        }
      });

      setContextData({
        medicalHistorySummary: historyResult,
        clinicalDocumentsSummary: docsResult,
        carePlanProgress: carePlanResult
      });

      // Notify parent component of context update
      onContextUpdate?.(contextData);
    } catch (error) {
      console.error('Error generating summaries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!patient) return null;

  return (
    <Card className="border-2 border-purple-300 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 border-b-2 border-purple-200 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-purple-900">
            <Brain className="w-5 h-5 text-purple-700" />
            Enhanced Patient Context
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="default"
              size="sm"
              onClick={generateComprehensiveSummaries}
              disabled={isLoading}
              className="bg-purple-600 hover:bg-purple-700 text-white font-semibold min-h-[36px]"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate AI Summary
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-4">
          {!contextData.medicalHistorySummary && !contextData.clinicalDocumentsSummary && !contextData.carePlanProgress ? (
            <Alert className="bg-purple-50 border-2 border-purple-300">
              <Sparkles className="w-4 h-4 text-purple-600" />
              <AlertDescription className="text-sm text-purple-900 font-medium">
                Click "Generate AI Summary" to get comprehensive patient insights across medical history, clinical documents, and care plan progress.
              </AlertDescription>
            </Alert>
          ) : (
            <Tabs defaultValue="history" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="history" className="font-semibold">
                  <History className="w-4 h-4 mr-2" />
                  Medical History
                </TabsTrigger>
                <TabsTrigger value="documents" className="font-semibold">
                  <FileText className="w-4 h-4 mr-2" />
                  Clinical Docs
                </TabsTrigger>
                <TabsTrigger value="careplans" className="font-semibold">
                  <Target className="w-4 h-4 mr-2" />
                  Care Plans
                </TabsTrigger>
              </TabsList>

              <TabsContent value="history" className="space-y-3">
                {contextData.medicalHistorySummary && (
                  <>
                    <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                      <h4 className="font-bold text-blue-900 mb-2">Clinical Summary</h4>
                      <p className="text-sm text-blue-900">{contextData.medicalHistorySummary.summary}</p>
                    </div>

                    {contextData.medicalHistorySummary.key_diagnoses?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <Activity className="w-4 h-4" />
                          Key Diagnoses
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {contextData.medicalHistorySummary.key_diagnoses.map((dx, idx) => (
                            <Badge key={idx} className="bg-blue-100 text-blue-900 border border-blue-300">
                              {dx}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {contextData.medicalHistorySummary.clinical_concerns?.length > 0 && (
                      <Alert className="bg-yellow-50 border-2 border-yellow-400">
                        <AlertDescription>
                          <strong className="text-yellow-950 font-bold">Clinical Concerns:</strong>
                          <ul className="mt-2 space-y-1">
                            {contextData.medicalHistorySummary.clinical_concerns.map((concern, idx) => (
                              <li key={idx} className="text-sm text-yellow-900 font-medium">• {concern}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {contextData.medicalHistorySummary.care_considerations?.length > 0 && (
                      <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded">
                        <h4 className="font-bold text-green-900 mb-2">Care Considerations</h4>
                        <ul className="space-y-1">
                          {contextData.medicalHistorySummary.care_considerations.map((consideration, idx) => (
                            <li key={idx} className="text-sm text-green-900">• {consideration}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="documents" className="space-y-3">
                {contextData.clinicalDocumentsSummary && (
                  <>
                    <div className="bg-indigo-50 border-l-4 border-indigo-500 p-3 rounded">
                      <h4 className="font-bold text-indigo-900 mb-2">Documentation Summary</h4>
                      <p className="text-sm text-indigo-900">{contextData.clinicalDocumentsSummary.summary}</p>
                    </div>

                    {contextData.clinicalDocumentsSummary.clinical_patterns?.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          Clinical Patterns
                        </h4>
                        <ul className="space-y-2">
                          {contextData.clinicalDocumentsSummary.clinical_patterns.map((pattern, idx) => (
                            <li key={idx} className="text-sm bg-indigo-50 p-2 rounded border border-indigo-200 text-indigo-900 font-medium">
                              {pattern}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {contextData.clinicalDocumentsSummary.key_findings?.length > 0 && (
                      <div className="bg-purple-50 border-l-4 border-purple-500 p-3 rounded">
                        <h4 className="font-bold text-purple-900 mb-2">Key Findings</h4>
                        <ul className="space-y-1">
                          {contextData.clinicalDocumentsSummary.key_findings.map((finding, idx) => (
                            <li key={idx} className="text-sm text-purple-900">• {finding}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {contextData.clinicalDocumentsSummary.documentation_gaps?.length > 0 && (
                      <Alert className="bg-orange-50 border-2 border-orange-400">
                        <AlertDescription>
                          <strong className="text-orange-950 font-bold">Documentation Gaps:</strong>
                          <ul className="mt-2 space-y-1">
                            {contextData.clinicalDocumentsSummary.documentation_gaps.map((gap, idx) => (
                              <li key={idx} className="text-sm text-orange-900 font-medium">• {gap}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </>
                )}
              </TabsContent>

              <TabsContent value="careplans" className="space-y-3">
                {contextData.carePlanProgress && (
                  <>
                    <div className="bg-green-50 border-l-4 border-green-500 p-3 rounded">
                      <h4 className="font-bold text-green-900 mb-2">Overall Progress</h4>
                      <p className="text-sm text-green-900">{contextData.carePlanProgress.overall_progress}</p>
                    </div>

                    {contextData.carePlanProgress.plan_progress?.length > 0 && (
                      <div className="space-y-3">
                        <h4 className="font-semibold text-gray-900">Individual Care Plan Progress</h4>
                        {contextData.carePlanProgress.plan_progress.map((plan, idx) => (
                          <Card key={idx} className="border-2 border-green-300">
                            <CardContent className="p-3">
                              <h5 className="font-bold text-green-900 mb-1">{plan.problem}</h5>
                              <Badge className="mb-2 bg-green-600 text-white">{plan.progress_status}</Badge>
                              <p className="text-sm text-gray-700">{plan.recommendations}</p>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}

                    {contextData.carePlanProgress.barriers?.length > 0 && (
                      <Alert className="bg-red-50 border-2 border-red-400">
                        <AlertDescription>
                          <strong className="text-red-950 font-bold">Barriers to Progress:</strong>
                          <ul className="mt-2 space-y-1">
                            {contextData.carePlanProgress.barriers.map((barrier, idx) => (
                              <li key={idx} className="text-sm text-red-900 font-medium">• {barrier}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}

                    {contextData.carePlanProgress.next_steps?.length > 0 && (
                      <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                        <h4 className="font-bold text-blue-900 mb-2">Recommended Next Steps</h4>
                        <ul className="space-y-1">
                          {contextData.carePlanProgress.next_steps.map((step, idx) => (
                            <li key={idx} className="text-sm text-blue-900">• {step}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          )}

          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>
                <strong>{allVisits.length}</strong> total visits • <strong>{carePlans.length}</strong> care plans
              </span>
              {contextData.medicalHistorySummary && (
                <span className="text-green-600 font-semibold">✓ AI Analysis Complete</span>
              )}
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  Activity,
  Heart,
  Loader2,
  RefreshCw,
  CheckCircle2,
  Target,
  Shield
} from "lucide-react";

export default function AIPredictivePatientAnalyzer({ patientId, autoAnalyze = false }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [error, setError] = useState(null);

  // Fetch patient data
  const { data: patient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => base44.entities.Patient.filter({ id: patientId }),
    select: (data) => data[0],
    enabled: !!patientId
  });

  // Fetch visits
  const { data: visits = [] } = useQuery({
    queryKey: ['patientVisits', patientId],
    queryFn: () => base44.entities.Visit.filter({ patient_id: patientId }),
    enabled: !!patientId
  });

  // Fetch incidents
  const { data: incidents = [] } = useQuery({
    queryKey: ['patientIncidents', patientId],
    queryFn: () => base44.entities.Incident.filter({ patient_id: patientId }),
    enabled: !!patientId
  });

  // Fetch care plans
  const { data: carePlans = [] } = useQuery({
    queryKey: ['patientCarePlans', patientId],
    queryFn: () => base44.entities.CarePlan.filter({ patient_id: patientId }),
    enabled: !!patientId
  });

  useEffect(() => {
    if (autoAnalyze && patient && !analysis && !isAnalyzing) {
      performAnalysis();
    }
  }, [autoAnalyze, patient]);

  const performAnalysis = async () => {
    if (!patient) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // Prepare comprehensive patient data
      const patientData = {
        demographics: {
          age: patient.date_of_birth ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear() : 'Unknown',
          primaryDiagnosis: patient.primary_diagnosis,
          secondaryDiagnoses: patient.secondary_diagnoses || [],
          payor: patient.payor,
          status: patient.status
        },
        clinicalHistory: {
          allergies: patient.allergies,
          currentMedications: patient.current_medications || [],
          pastMedicalHistory: patient.past_medical_history || [],
          pastHospitalizations: patient.past_hospitalizations || [],
          baselineVitals: patient.baseline_vitals || {},
          functionalStatus: patient.functional_status || {}
        },
        recentActivity: {
          totalVisits: visits.length,
          completedVisits: visits.filter(v => v.status === 'completed').length,
          lastVisitDate: visits.length > 0 ? visits[0]?.visit_date : null,
          recentIncidents: incidents.slice(0, 5).map(i => ({
            type: i.incident_type,
            date: i.incident_date,
            severity: i.severity
          }))
        },
        currentCarePlans: carePlans.map(cp => ({
          problem: cp.problem,
          goal: cp.goal,
          status: cp.status,
          targetDate: cp.target_date
        }))
      };

      const prompt = `As a clinical AI analyst, analyze this home health patient's comprehensive data and provide predictive insights.

Patient Data:
${JSON.stringify(patientData, null, 2)}

Analyze and provide structured insights in the following areas:

1. HEALTH RISK ASSESSMENT
- Identify top 3-5 health risks based on diagnoses, age, medications, and history
- Rate each risk as Low/Moderate/High/Critical
- Provide clinical rationale for each risk

2. READMISSION RISK PREDICTION
- Calculate readmission risk percentage (0-100%)
- List key risk factors contributing to readmission
- Provide specific preventive interventions

3. OPTIMAL CARE PATHWAY RECOMMENDATIONS
- Suggest evidence-based care interventions
- Recommend monitoring frequency and focus areas
- Identify gaps in current care plan
- Suggest interdisciplinary involvement (PT, OT, SW, etc.)

4. EARLY WARNING INDICATORS
- List clinical red flags to monitor
- Suggest vital sign parameters that require attention
- Recommend proactive assessments

Be specific, evidence-based, and actionable. Focus on Medicare home health best practices.`;

      const response = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            healthRisks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  risk: { type: "string" },
                  severity: { type: "string" },
                  rationale: { type: "string" },
                  mitigationStrategies: { type: "array", items: { type: "string" } }
                }
              }
            },
            readmissionRisk: {
              type: "object",
              properties: {
                riskPercentage: { type: "number" },
                riskLevel: { type: "string" },
                keyFactors: { type: "array", items: { type: "string" } },
                preventiveInterventions: { type: "array", items: { type: "string" } }
              }
            },
            carePathwayRecommendations: {
              type: "object",
              properties: {
                primaryInterventions: { type: "array", items: { type: "string" } },
                monitoringFrequency: { type: "string" },
                focusAreas: { type: "array", items: { type: "string" } },
                careGaps: { type: "array", items: { type: "string" } },
                interdisciplinaryNeeds: { type: "array", items: { type: "string" } }
              }
            },
            earlyWarningIndicators: {
              type: "object",
              properties: {
                clinicalRedFlags: { type: "array", items: { type: "string" } },
                vitalSignParameters: { type: "array", items: { type: "string" } },
                recommendedAssessments: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      });

      setAnalysis(response);

    } catch (err) {
      console.error('Analysis error:', err);
      setError(err.message || 'Failed to analyze patient data');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const getSeverityColor = (severity) => {
    const severityLower = (severity || '').toLowerCase();
    if (severityLower.includes('critical')) return 'bg-red-600';
    if (severityLower.includes('high')) return 'bg-orange-500';
    if (severityLower.includes('moderate')) return 'bg-yellow-500';
    return 'bg-blue-500';
  };

  const getRiskLevelColor = (level) => {
    const levelLower = (level || '').toLowerCase();
    if (levelLower.includes('high') || levelLower.includes('critical')) return 'text-red-600';
    if (levelLower.includes('moderate')) return 'text-orange-600';
    return 'text-green-600';
  };

  if (!patient) {
    return (
      <Card>
        <CardContent className="p-8 text-center text-gray-500">
          <Brain className="w-12 h-12 mx-auto mb-3 text-gray-400" />
          <p>No patient data available for analysis</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-600 to-indigo-600 text-white border-none">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Brain className="w-10 h-10" />
              <div>
                <h2 className="text-2xl font-bold">AI Predictive Analysis</h2>
                <p className="text-purple-100">Evidence-based clinical insights and risk assessment</p>
              </div>
            </div>
            <Button
              onClick={performAnalysis}
              disabled={isAnalyzing}
              className="bg-white text-purple-600 hover:bg-purple-50"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {analysis ? 'Refresh Analysis' : 'Start Analysis'}
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {error && (
        <Alert className="border-red-300 bg-red-50">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <AlertDescription className="text-red-900">
            {error}
          </AlertDescription>
        </Alert>
      )}

      {analysis && (
        <>
          {/* Readmission Risk */}
          <Card className="border-2 border-orange-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-orange-600" />
                Readmission Risk Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-4 mb-4">
                <div className="text-center">
                  <div className={`text-5xl font-bold ${getRiskLevelColor(analysis.readmissionRisk?.riskLevel)}`}>
                    {analysis.readmissionRisk?.riskPercentage}%
                  </div>
                  <Badge className={`mt-2 ${getSeverityColor(analysis.readmissionRisk?.riskLevel)}`}>
                    {analysis.readmissionRisk?.riskLevel || 'Unknown'} Risk
                  </Badge>
                </div>
                <div className="flex-1">
                  <h4 className="font-semibold mb-2">Key Risk Factors:</h4>
                  <ul className="space-y-1">
                    {analysis.readmissionRisk?.keyFactors?.map((factor, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" />
                        {factor}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h4 className="font-semibold mb-2 flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" />
                  Preventive Interventions
                </h4>
                <ul className="space-y-1">
                  {analysis.readmissionRisk?.preventiveInterventions?.map((intervention, idx) => (
                    <li key={idx} className="text-sm flex items-start gap-2">
                      <CheckCircle2 className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      {intervention}
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>

          {/* Health Risks */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-red-600" />
                Health Risk Assessment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {analysis.healthRisks?.map((risk, idx) => (
                  <div key={idx} className="border rounded-lg p-4 hover:bg-gray-50">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <h4 className="font-semibold">{risk.risk}</h4>
                        <Badge className={getSeverityColor(risk.severity)}>
                          {risk.severity}
                        </Badge>
                      </div>
                    </div>
                    <p className="text-sm text-gray-700 mb-3">{risk.rationale}</p>
                    <div className="bg-green-50 border border-green-200 rounded p-3">
                      <p className="text-xs font-semibold text-green-900 mb-1">Mitigation Strategies:</p>
                      <ul className="space-y-1">
                        {risk.mitigationStrategies?.map((strategy, sidx) => (
                          <li key={sidx} className="text-xs text-green-800">• {strategy}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Care Pathway Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-600" />
                Optimal Care Pathway Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2">Primary Interventions</h4>
                  <ul className="space-y-1">
                    {analysis.carePathwayRecommendations?.primaryInterventions?.map((intervention, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                        {intervention}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-purple-50 border border-purple-200 rounded p-3">
                    <h4 className="font-semibold text-sm mb-2">Monitoring Frequency</h4>
                    <p className="text-sm">{analysis.carePathwayRecommendations?.monitoringFrequency}</p>
                  </div>
                  <div className="bg-purple-50 border border-purple-200 rounded p-3">
                    <h4 className="font-semibold text-sm mb-2">Focus Areas</h4>
                    <ul className="space-y-1">
                      {analysis.carePathwayRecommendations?.focusAreas?.map((area, idx) => (
                        <li key={idx} className="text-sm">• {area}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {analysis.carePathwayRecommendations?.careGaps?.length > 0 && (
                  <Alert className="border-yellow-300 bg-yellow-50">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <AlertDescription>
                      <h4 className="font-semibold text-yellow-900 mb-2">Identified Care Gaps:</h4>
                      <ul className="space-y-1">
                        {analysis.carePathwayRecommendations?.careGaps?.map((gap, idx) => (
                          <li key={idx} className="text-sm text-yellow-900">• {gap}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}

                <div>
                  <h4 className="font-semibold mb-2">Interdisciplinary Team Recommendations</h4>
                  <div className="flex flex-wrap gap-2">
                    {analysis.carePathwayRecommendations?.interdisciplinaryNeeds?.map((need, idx) => (
                      <Badge key={idx} className="bg-indigo-100 text-indigo-800">
                        {need}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Early Warning Indicators */}
          <Card className="border-2 border-red-300">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5 text-red-600" />
                Early Warning Indicators
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold mb-2 text-red-900">Clinical Red Flags to Monitor</h4>
                  <ul className="space-y-1">
                    {analysis.earlyWarningIndicators?.clinicalRedFlags?.map((flag, idx) => (
                      <li key={idx} className="text-sm flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 flex-shrink-0" />
                        {flag}
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="bg-orange-50 border border-orange-200 rounded p-3">
                  <h4 className="font-semibold mb-2 text-orange-900">Vital Sign Parameters</h4>
                  <ul className="space-y-1">
                    {analysis.earlyWarningIndicators?.vitalSignParameters?.map((param, idx) => (
                      <li key={idx} className="text-sm text-orange-900">• {param}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded p-3">
                  <h4 className="font-semibold mb-2 text-blue-900">Recommended Assessments</h4>
                  <ul className="space-y-1">
                    {analysis.earlyWarningIndicators?.recommendedAssessments?.map((assessment, idx) => (
                      <li key={idx} className="text-sm text-blue-900">• {assessment}</li>
                    ))}
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {!analysis && !isAnalyzing && (
        <Card>
          <CardContent className="p-12 text-center">
            <Brain className="w-16 h-16 mx-auto mb-4 text-purple-600" />
            <h3 className="text-xl font-semibold mb-2">Ready to Analyze</h3>
            <p className="text-gray-600 mb-4">
              Click "Start Analysis" to generate AI-powered predictive insights for this patient.
            </p>
            <Button onClick={performAnalysis} className="bg-purple-600 hover:bg-purple-700">
              <Brain className="w-4 h-4 mr-2" />
              Start Analysis
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { invokeLLM } from "@/lib/invokeLLM";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Brain,
  AlertTriangle,
  TrendingUp,
  Pill,
  Activity,
  CheckCircle,
  RefreshCw,
  Shield,
  Zap
} from "lucide-react";

export default function AIPatientRiskAssessor({ patientId, autoAnalyze = false }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [assessment, setAssessment] = useState(null);
  const queryClient = useQueryClient();

  const { data: patient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: async () => {
      const patients = await base44.entities.Patient.filter({ id: patientId });
      return patients[0];
    },
    enabled: !!patientId
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['patientVisits', patientId],
    queryFn: () => base44.entities.Visit.filter({ patient_id: patientId }, '-visit_date', 50),
    enabled: !!patientId,
    initialData: []
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['patientIncidents', patientId],
    queryFn: () => base44.entities.Incident.filter({ patient_id: patientId }, '-incident_date', 20),
    enabled: !!patientId,
    initialData: []
  });

  const { data: carePlans = [] } = useQuery({
    queryKey: ['patientCarePlans', patientId],
    queryFn: () => base44.entities.CarePlan.filter({ patient_id: patientId }),
    enabled: !!patientId,
    initialData: []
  });

  const { data: referral } = useQuery({
    queryKey: ['patientReferral', patientId],
    queryFn: async () => {
      const referrals = await base44.entities.Referral.filter({ patient_id: patientId });
      return referrals.length > 0 ? referrals[0] : null;
    },
    enabled: !!patientId
  });

  const { data: latestAssessment } = useQuery({
    queryKey: ['latestRiskAssessment', patientId],
    queryFn: async () => {
      const assessments = await base44.entities.PatientRiskAssessment.filter(
        { patient_id: patientId },
        '-assessment_date',
        1
      );
      return assessments.length > 0 ? assessments[0] : null;
    },
    enabled: !!patientId
  });

  React.useEffect(() => {
    if (autoAnalyze && patient && !latestAssessment && !isAnalyzing) {
      performRiskAssessment();
    }
  }, [autoAnalyze, patient, latestAssessment]);

  const performRiskAssessment = async () => {
    if (!patient) return;

    setIsAnalyzing(true);
    try {
      const patientData = {
        demographics: {
          name: `${patient.first_name} ${patient.last_name}`,
          age: calculateAge(patient.date_of_birth),
          primary_diagnosis: patient.primary_diagnosis,
          secondary_diagnoses: patient.secondary_diagnoses,
          allergies: patient.allergies,
          medications: patient.current_medications,
          past_medical_history: patient.past_medical_history
        },
        referral: referral?.extracted_data || null,
        visits: visits.map(v => ({
          date: v.visit_date,
          type: v.visit_type,
          status: v.status,
          notes: v.nurse_notes,
          vital_signs: v.vital_signs
        })),
        incidents: incidents.map(i => ({
          type: i.incident_type,
          date: i.incident_date,
          severity: i.severity,
          details: i.details
        })),
        carePlans: carePlans.map(cp => ({
          problem: cp.problem,
          goal: cp.goal,
          status: cp.status,
          interventions: cp.interventions
        }))
      };

      const result = await invokeLLM({
        prompt: `You are an expert clinical risk assessment AI specializing in home health patient safety and outcomes prediction.

**CRITICAL TASK:** Perform a comprehensive risk assessment for this patient across multiple risk domains.

**Patient Data:**
${JSON.stringify(patientData, null, 2)}

**Assessment Requirements:**

Analyze the following risk domains and provide detailed scores and explanations:

1. **FALL RISK (0-100 scale)**
   - Consider: mobility issues, medications (sedatives, antihypertensives), prior falls, age, cognitive status, environmental hazards
   - Identify specific risk factors
   - Score: 0-40 = Low, 41-60 = Moderate, 61-80 = High, 81-100 = Critical

2. **HOSPITAL READMISSION RISK (0-100 scale)**
   - Consider: recent hospitalizations, diagnosis complexity, medication complexity, comorbidities, social support, symptom instability
   - Recent hospitalizations are a major predictor
   - Score: 0-40 = Low, 41-60 = Moderate, 61-80 = High, 81-100 = Critical

3. **MEDICATION NON-ADHERENCE RISK (0-100 scale)**
   - Consider: medication regimen complexity, cognitive status, polypharmacy (5+ meds), side effects, cost barriers, caregiver support
   - High-risk medications (anticoagulants, insulin, cardiac meds)
   - Score: 0-40 = Low, 41-60 = Moderate, 61-80 = High, 81-100 = Critical

4. **CLINICAL DETERIORATION RISK (0-100 scale)**
   - Consider: vital signs trends, symptom progression, disease trajectory, recent incidents, care plan adherence
   - Warning signs of declining health status
   - Score: 0-40 = Low, 41-60 = Moderate, 61-80 = High, 81-100 = Critical

**OVERALL RISK SCORE:** Weighted average emphasizing the highest individual risk

**For each risk domain, provide:**
- Exact numeric score (0-100)
- Risk level classification
- Specific risk factors identified (list)
- Clinical reasoning

**Recommended Interventions:**
- List 5-10 specific, actionable interventions prioritized by impact

**Priority Actions:**
- Identify 3-5 urgent actions with urgency levels (immediate, 24_hours, this_week, routine)
- For each action, explain the rationale

**Detailed Analysis:**
- Provide a comprehensive narrative (200-300 words) explaining the overall risk profile, key concerns, and clinical trajectory

**Flag for Review:**
- Set to true if overall risk score >= 70 OR any individual domain score >= 80`,
        response_json_schema: {
          type: "object",
          properties: {
            fall_risk_score: { type: "number" },
            fall_risk_level: { type: "string" },
            fall_risk_factors: { type: "array", items: { type: "string" } },
            readmission_risk_score: { type: "number" },
            readmission_risk_level: { type: "string" },
            readmission_risk_factors: { type: "array", items: { type: "string" } },
            medication_adherence_risk_score: { type: "number" },
            medication_adherence_risk_level: { type: "string" },
            medication_adherence_risk_factors: { type: "array", items: { type: "string" } },
            clinical_deterioration_risk_score: { type: "number" },
            clinical_deterioration_risk_level: { type: "string" },
            clinical_deterioration_risk_factors: { type: "array", items: { type: "string" } },
            overall_risk_score: { type: "number" },
            overall_risk_level: { type: "string" },
            detailed_analysis: { type: "string" },
            recommended_interventions: { type: "array", items: { type: "string" } },
            priority_actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  urgency: { type: "string" },
                  rationale: { type: "string" }
                }
              }
            },
            flagged_for_review: { type: "boolean" }
          }
        }
      });

      // Save assessment to database
      const savedAssessment = await base44.entities.PatientRiskAssessment.create({
        patient_id: patientId,
        assessment_date: new Date().toISOString(),
        ...result,
        data_sources_analyzed: {
          referral_data: !!referral,
          visit_count: visits.length,
          incident_count: incidents.length,
          care_plan_count: carePlans.length
        }
      });

      setAssessment(savedAssessment);
      queryClient.invalidateQueries({ queryKey: ['latestRiskAssessment', patientId] });
      queryClient.invalidateQueries({ queryKey: ['highRiskPatients'] });
    } catch (error) {
      console.error('Error performing risk assessment:', error);
      alert('Failed to perform risk assessment. Please try again.');
    }
    setIsAnalyzing(false);
  };

  const calculateAge = (dob) => {
    if (!dob) return null;
    const birthDate = new Date(dob);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'low': return 'bg-green-500';
      case 'moderate': return 'bg-yellow-500';
      case 'high': return 'bg-orange-500';
      case 'critical': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

  const getUrgencyColor = (urgency) => {
    switch (urgency) {
      case 'immediate': return 'bg-red-600';
      case '24_hours': return 'bg-orange-600';
      case 'this_week': return 'bg-yellow-600';
      case 'routine': return 'bg-blue-600';
      default: return 'bg-slate-600';
    }
  };

  const displayAssessment = latestAssessment || assessment;

  return (
    <div className="space-y-4">
      <Card className="border-2 border-navy-300">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-navy-600" />
              AI Patient Risk Assessment
            </CardTitle>
            <Button
              onClick={performRiskAssessment}
              disabled={isAnalyzing || !patient}
              size="sm"
              className="bg-navy-600 hover:bg-navy-700"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  {displayAssessment ? 'Re-assess' : 'Assess Risk'}
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isAnalyzing && (
            <Alert className="bg-navy-50 border-navy-200">
              <Brain className="w-4 h-4 text-navy-600 animate-pulse" />
              <AlertDescription className="text-navy-900">
                AI is analyzing patient data across multiple risk domains... This may take 30-60 seconds.
              </AlertDescription>
            </Alert>
          )}

          {!isAnalyzing && !displayAssessment && (
            <Alert className="bg-blue-50 border-blue-200">
              <Shield className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-900">
                Click "Assess Risk" to perform a comprehensive AI-powered risk analysis for this patient.
              </AlertDescription>
            </Alert>
          )}

          {displayAssessment && (
            <div className="space-y-6">
              {/* Overall Risk Score */}
              <div className="bg-gradient-to-r from-navy-50 to-indigo-50 p-6 rounded-lg border-2 border-navy-200">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-bold text-slate-900">Overall Risk Profile</h3>
                  <Badge className={`${getRiskColor(displayAssessment.overall_risk_level)} text-white text-lg px-4 py-2`}>
                    {(displayAssessment.overall_risk_level || 'unknown').toUpperCase()}
                  </Badge>
                </div>
                <div className="flex items-center gap-4 mb-3">
                  <span className="text-4xl font-bold text-navy-600">{displayAssessment.overall_risk_score}</span>
                  <span className="text-slate-600">/100</span>
                  <Progress value={displayAssessment.overall_risk_score} className="flex-1" />
                </div>
                {displayAssessment.flagged_for_review && (
                  <Alert className="bg-red-50 border-red-300 mt-3">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                    <AlertDescription className="text-red-900 font-semibold">
                      ⚠️ FLAGGED FOR IMMEDIATE CLINICAL REVIEW
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Individual Risk Domains */}
              <div className="grid md:grid-cols-2 gap-4">
                {/* Fall Risk */}
                <Card className="border-2 border-orange-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Activity className="w-5 h-5 text-orange-600" />
                        <h4 className="font-semibold">Fall Risk</h4>
                      </div>
                      <Badge className={getRiskColor(displayAssessment.fall_risk_level)}>
                        {displayAssessment.fall_risk_level}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl font-bold">{displayAssessment.fall_risk_score}</span>
                      <Progress value={displayAssessment.fall_risk_score} className="flex-1" />
                    </div>
                    <div className="space-y-1">
                      {displayAssessment.fall_risk_factors?.slice(0, 3).map((factor, i) => (
                        <p key={i} className="text-xs text-slate-600">• {factor}</p>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Readmission Risk */}
                <Card className="border-2 border-red-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-5 h-5 text-red-600" />
                        <h4 className="font-semibold">Readmission Risk</h4>
                      </div>
                      <Badge className={getRiskColor(displayAssessment.readmission_risk_level)}>
                        {displayAssessment.readmission_risk_level}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl font-bold">{displayAssessment.readmission_risk_score}</span>
                      <Progress value={displayAssessment.readmission_risk_score} className="flex-1" />
                    </div>
                    <div className="space-y-1">
                      {displayAssessment.readmission_risk_factors?.slice(0, 3).map((factor, i) => (
                        <p key={i} className="text-xs text-slate-600">• {factor}</p>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Medication Adherence Risk */}
                <Card className="border-2 border-blue-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Pill className="w-5 h-5 text-blue-600" />
                        <h4 className="font-semibold">Med Non-Adherence</h4>
                      </div>
                      <Badge className={getRiskColor(displayAssessment.medication_adherence_risk_level)}>
                        {displayAssessment.medication_adherence_risk_level}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl font-bold">{displayAssessment.medication_adherence_risk_score}</span>
                      <Progress value={displayAssessment.medication_adherence_risk_score} className="flex-1" />
                    </div>
                    <div className="space-y-1">
                      {displayAssessment.medication_adherence_risk_factors?.slice(0, 3).map((factor, i) => (
                        <p key={i} className="text-xs text-slate-600">• {factor}</p>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Clinical Deterioration Risk */}
                <Card className="border-2 border-navy-200">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-navy-600" />
                        <h4 className="font-semibold">Clinical Deterioration</h4>
                      </div>
                      <Badge className={getRiskColor(displayAssessment.clinical_deterioration_risk_level)}>
                        {displayAssessment.clinical_deterioration_risk_level}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-2xl font-bold">{displayAssessment.clinical_deterioration_risk_score}</span>
                      <Progress value={displayAssessment.clinical_deterioration_risk_score} className="flex-1" />
                    </div>
                    <div className="space-y-1">
                      {displayAssessment.clinical_deterioration_risk_factors?.slice(0, 3).map((factor, i) => (
                        <p key={i} className="text-xs text-slate-600">• {factor}</p>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Priority Actions */}
              {displayAssessment.priority_actions?.length > 0 && (
                <Card className="border-2 border-yellow-300 bg-yellow-50">
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-600" />
                      Priority Actions Required
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {displayAssessment.priority_actions.map((action, i) => (
                      <div key={i} className="bg-white p-3 rounded-lg border border-yellow-200">
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <p className="font-semibold text-slate-900">{action.action}</p>
                          <Badge className={getUrgencyColor(action.urgency)}>
                            {action.urgency?.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-600">{action.rationale}</p>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Detailed Analysis */}
              {displayAssessment.detailed_analysis && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Detailed Clinical Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {displayAssessment.detailed_analysis}
                    </p>
                  </CardContent>
                </Card>
              )}

              {/* Recommended Interventions */}
              {displayAssessment.recommended_interventions?.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Recommended Interventions</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {displayAssessment.recommended_interventions.map((intervention, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-sm text-slate-700">{intervention}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Assessment Metadata */}
              <div className="text-xs text-slate-500 space-y-1">
                <p>Assessment Date: {new Date(displayAssessment.assessment_date).toLocaleString()}</p>
                <p>Data Sources: {displayAssessment.data_sources_analyzed?.visit_count || 0} visits, {displayAssessment.data_sources_analyzed?.incident_count || 0} incidents, {displayAssessment.data_sources_analyzed?.care_plan_count || 0} care plans</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
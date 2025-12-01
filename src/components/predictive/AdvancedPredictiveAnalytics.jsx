import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Brain,
  Activity,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Calendar,
  User,
  RefreshCw,
  ChevronRight,
  Hospital,
  Target,
  Phone,
  Mail,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles
} from "lucide-react";
import { format, differenceInDays, addDays } from "date-fns";

export default function AdvancedPredictiveAnalytics() {
  const [predictions, setPredictions] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState(null);

  const { data: patients } = useQuery({
    queryKey: ['predictivePatients'],
    queryFn: () => base44.entities.Patient.filter({ status: 'active' }),
    initialData: [],
  });

  const { data: visits } = useQuery({
    queryKey: ['predictiveVisits'],
    queryFn: () => base44.entities.Visit.list('-visit_date', 500),
    initialData: [],
  });

  const { data: carePlans } = useQuery({
    queryKey: ['predictiveCarePlans'],
    queryFn: () => base44.entities.CarePlan.list(),
    initialData: [],
  });

  const { data: incidents } = useQuery({
    queryKey: ['predictiveIncidents'],
    queryFn: () => base44.entities.Incident.list('-incident_date', 100),
    initialData: [],
  });

  const runPredictiveAnalysis = async () => {
    if (!patients || patients.length === 0) return;
    
    setIsAnalyzing(true);
    try {
      const patientAnalyses = [];

      for (const patient of patients.slice(0, 20)) {
        const patientVisits = visits.filter(v => v.patient_id === patient.id);
        const patientCarePlans = carePlans.filter(cp => cp.patient_id === patient.id);
        const patientIncidents = incidents.filter(i => i.patient_id === patient.id);
        
        const recentVisits = patientVisits.slice(0, 10);
        const completedVisits = recentVisits.filter(v => v.status === 'completed');
        const missedVisits = recentVisits.filter(v => v.status === 'cancelled');
        
        // Gather clinical data
        const vitalTrends = extractVitalTrends(completedVisits);
        const notesSummary = completedVisits
          .filter(v => v.nurse_notes)
          .slice(0, 3)
          .map(v => v.nurse_notes.substring(0, 200))
          .join('\n---\n');

        const prompt = `You are an advanced clinical predictive analytics AI. Analyze this patient data and provide detailed predictions.

PATIENT PROFILE:
- Name: ${patient.first_name} ${patient.last_name}
- Primary Diagnosis: ${patient.primary_diagnosis || 'Not specified'}
- Secondary Diagnoses: ${patient.secondary_diagnoses?.join(', ') || 'None'}
- Care Type: ${patient.care_type === 'hospice' ? 'Hospice' : 'Home Health'}
- Allergies: ${patient.allergies || 'NKDA'}

VISIT HISTORY (last 30 days):
- Total visits: ${recentVisits.length}
- Completed: ${completedVisits.length}
- Missed/Cancelled: ${missedVisits.length}
- Last visit: ${recentVisits[0]?.visit_date || 'None'}

VITAL SIGN TRENDS:
${JSON.stringify(vitalTrends, null, 2)}

RECENT INCIDENTS:
${patientIncidents.slice(0, 3).map(i => `- ${i.incident_type} on ${i.incident_date} (${i.severity})`).join('\n') || 'None'}

ACTIVE CARE PLANS:
${patientCarePlans.filter(cp => cp.status === 'active').map(cp => `- ${cp.problem}: ${cp.goal} (Target: ${cp.target_date})`).join('\n') || 'None'}

RECENT VISIT NOTES:
${notesSummary || 'No notes available'}

Provide comprehensive predictions:

1. HOSPITAL READMISSION RISK: Analyze all clinical factors to predict 30-day readmission risk
2. CARE PLAN GOAL ACHIEVEMENT: For each active care plan, predict achievement likelihood and dynamic timeline
3. APPOINTMENT/COMPLIANCE RISK: Predict likelihood of missed appointments or non-compliance
4. PROACTIVE INTERVENTIONS: Suggest specific outreach strategies

Return JSON:
{
  "readmission_prediction": {
    "risk_score": 0-100,
    "risk_level": "low|moderate|high|critical",
    "primary_factors": ["Factor 1", "Factor 2"],
    "clinical_indicators": ["Indicator 1", "Indicator 2"],
    "recommended_interventions": ["Intervention 1"],
    "confidence": 0-100
  },
  "care_plan_predictions": [
    {
      "problem": "Care plan problem",
      "current_progress": 0-100,
      "predicted_achievement_date": "YYYY-MM-DD",
      "achievement_likelihood": 0-100,
      "accelerating_factors": ["Factor 1"],
      "barriers": ["Barrier 1"],
      "recommended_adjustments": ["Adjustment 1"]
    }
  ],
  "compliance_prediction": {
    "missed_appointment_risk": 0-100,
    "risk_level": "low|moderate|high",
    "risk_factors": ["Factor 1"],
    "engagement_score": 0-100,
    "proactive_outreach": [
      {
        "strategy": "Outreach strategy",
        "timing": "When to implement",
        "method": "phone|email|visit",
        "message_template": "Suggested message"
      }
    ]
  },
  "overall_risk_summary": "Brief summary of patient's overall risk profile",
  "priority_actions": ["Action 1", "Action 2"]
}`;

        const result = await base44.integrations.Core.InvokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              readmission_prediction: {
                type: "object",
                properties: {
                  risk_score: { type: "number" },
                  risk_level: { type: "string" },
                  primary_factors: { type: "array", items: { type: "string" } },
                  clinical_indicators: { type: "array", items: { type: "string" } },
                  recommended_interventions: { type: "array", items: { type: "string" } },
                  confidence: { type: "number" }
                }
              },
              care_plan_predictions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    problem: { type: "string" },
                    current_progress: { type: "number" },
                    predicted_achievement_date: { type: "string" },
                    achievement_likelihood: { type: "number" },
                    accelerating_factors: { type: "array", items: { type: "string" } },
                    barriers: { type: "array", items: { type: "string" } },
                    recommended_adjustments: { type: "array", items: { type: "string" } }
                  }
                }
              },
              compliance_prediction: {
                type: "object",
                properties: {
                  missed_appointment_risk: { type: "number" },
                  risk_level: { type: "string" },
                  risk_factors: { type: "array", items: { type: "string" } },
                  engagement_score: { type: "number" },
                  proactive_outreach: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        strategy: { type: "string" },
                        timing: { type: "string" },
                        method: { type: "string" },
                        message_template: { type: "string" }
                      }
                    }
                  }
                }
              },
              overall_risk_summary: { type: "string" },
              priority_actions: { type: "array", items: { type: "string" } }
            }
          }
        });

        patientAnalyses.push({
          patient,
          predictions: result,
          visitCount: recentVisits.length,
          activeCarePlans: patientCarePlans.filter(cp => cp.status === 'active').length
        });
      }

      // Sort by overall risk (readmission + compliance)
      patientAnalyses.sort((a, b) => {
        const aRisk = (a.predictions.readmission_prediction?.risk_score || 0) + 
                      (a.predictions.compliance_prediction?.missed_appointment_risk || 0);
        const bRisk = (b.predictions.readmission_prediction?.risk_score || 0) + 
                      (b.predictions.compliance_prediction?.missed_appointment_risk || 0);
        return bRisk - aRisk;
      });

      setPredictions(patientAnalyses);
    } catch (error) {
      console.error('Error running predictive analysis:', error);
    }
    setIsAnalyzing(false);
  };

  const extractVitalTrends = (visits) => {
    const trends = {
      blood_pressure: [],
      heart_rate: [],
      oxygen_saturation: [],
      weight: [],
      pain_level: []
    };

    visits.forEach(visit => {
      if (visit.vital_signs) {
        if (visit.vital_signs.blood_pressure_systolic) {
          trends.blood_pressure.push({
            date: visit.visit_date,
            value: visit.vital_signs.blood_pressure_systolic
          });
        }
        if (visit.vital_signs.heart_rate) {
          trends.heart_rate.push({
            date: visit.visit_date,
            value: visit.vital_signs.heart_rate
          });
        }
        if (visit.vital_signs.oxygen_saturation) {
          trends.oxygen_saturation.push({
            date: visit.visit_date,
            value: visit.vital_signs.oxygen_saturation
          });
        }
        if (visit.vital_signs.weight) {
          trends.weight.push({
            date: visit.visit_date,
            value: visit.vital_signs.weight
          });
        }
        if (visit.vital_signs.pain_level !== undefined) {
          trends.pain_level.push({
            date: visit.visit_date,
            value: visit.vital_signs.pain_level
          });
        }
      }
    });

    return trends;
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'critical': return 'bg-red-500 text-white';
      case 'high': return 'bg-orange-500 text-white';
      case 'moderate': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const getRiskBorderColor = (level) => {
    switch (level) {
      case 'critical': return 'border-l-red-500';
      case 'high': return 'border-l-orange-500';
      case 'moderate': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-gray-500';
    }
  };

  const summaryStats = useMemo(() => {
    if (!predictions) return null;
    
    return {
      criticalReadmission: predictions.filter(p => p.predictions.readmission_prediction?.risk_level === 'critical').length,
      highReadmission: predictions.filter(p => p.predictions.readmission_prediction?.risk_level === 'high').length,
      highComplianceRisk: predictions.filter(p => p.predictions.compliance_prediction?.risk_level === 'high').length,
      avgEngagement: Math.round(
        predictions.reduce((acc, p) => acc + (p.predictions.compliance_prediction?.engagement_score || 0), 0) / predictions.length
      )
    };
  }, [predictions]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-500 rounded-xl flex items-center justify-center shadow-lg">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">Advanced Predictive Analytics</CardTitle>
                <p className="text-sm text-gray-600">AI-powered risk forecasting and proactive care</p>
              </div>
            </div>
            <Button
              onClick={runPredictiveAnalysis}
              disabled={isAnalyzing || patients.length === 0}
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing {patients.length} patients...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Run Predictive Analysis
                </>
              )}
            </Button>
          </div>
        </CardHeader>
      </Card>

      {/* Summary Stats */}
      {summaryStats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4 text-center">
              <Hospital className="w-8 h-8 text-red-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-red-700">{summaryStats.criticalReadmission}</p>
              <p className="text-xs text-red-600">Critical Readmission Risk</p>
            </CardContent>
          </Card>
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4 text-center">
              <AlertTriangle className="w-8 h-8 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-700">{summaryStats.highReadmission}</p>
              <p className="text-xs text-orange-600">High Readmission Risk</p>
            </CardContent>
          </Card>
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4 text-center">
              <Calendar className="w-8 h-8 text-yellow-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-yellow-700">{summaryStats.highComplianceRisk}</p>
              <p className="text-xs text-yellow-600">High Compliance Risk</p>
            </CardContent>
          </Card>
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <Activity className="w-8 h-8 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-700">{summaryStats.avgEngagement}%</p>
              <p className="text-xs text-green-600">Avg Engagement Score</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Predictions List */}
      {predictions ? (
        <div className="space-y-4">
          {predictions.map((item, idx) => (
            <PatientPredictionCard 
              key={item.patient.id} 
              data={item} 
              rank={idx + 1}
              isExpanded={selectedPatient === item.patient.id}
              onToggle={() => setSelectedPatient(
                selectedPatient === item.patient.id ? null : item.patient.id
              )}
            />
          ))}
        </div>
      ) : (
        <Card className="border-2 border-dashed">
          <CardContent className="p-12 text-center">
            <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Ready for Analysis</h3>
            <p className="text-gray-500 mb-4">
              Run predictive analysis on {patients.length} active patients
            </p>
            <Button onClick={runPredictiveAnalysis} disabled={isAnalyzing}>
              <Sparkles className="w-4 h-4 mr-2" />
              Start Analysis
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function PatientPredictionCard({ data, rank, isExpanded, onToggle }) {
  const { patient, predictions } = data;
  const readmission = predictions.readmission_prediction;
  const compliance = predictions.compliance_prediction;

  const getRiskColor = (level) => {
    switch (level) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'moderate': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const getBorderColor = (level) => {
    switch (level) {
      case 'critical': return 'border-l-red-500';
      case 'high': return 'border-l-orange-500';
      case 'moderate': return 'border-l-yellow-500';
      case 'low': return 'border-l-green-500';
      default: return 'border-l-gray-500';
    }
  };

  return (
    <Card className={`border-l-4 ${getBorderColor(readmission?.risk_level)} hover:shadow-lg transition-all`}>
      <CardContent className="p-4">
        {/* Header Row */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold ${getRiskColor(readmission?.risk_level)}`}>
              #{rank}
            </div>
            <div>
              <h3 className="font-bold text-gray-900">
                {patient.first_name} {patient.last_name}
              </h3>
              <p className="text-sm text-gray-500">{patient.primary_diagnosis}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={getRiskColor(readmission?.risk_level)}>
              <Hospital className="w-3 h-3 mr-1" />
              {readmission?.risk_score}% Readmit
            </Badge>
            <Badge className={getRiskColor(compliance?.risk_level)}>
              <Calendar className="w-3 h-3 mr-1" />
              {compliance?.missed_appointment_risk}% Miss
            </Badge>
            <Button variant="ghost" size="sm" onClick={onToggle}>
              <ChevronRight className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
            </Button>
          </div>
        </div>

        {/* Summary */}
        <p className="text-sm text-gray-700 mb-3">{predictions.overall_risk_summary}</p>

        {/* Priority Actions */}
        {predictions.priority_actions?.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            {predictions.priority_actions.slice(0, 3).map((action, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {action}
              </Badge>
            ))}
          </div>
        )}

        {/* Expanded Details */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t space-y-4">
            <Tabs defaultValue="readmission">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="readmission">Readmission</TabsTrigger>
                <TabsTrigger value="careplans">Care Plans</TabsTrigger>
                <TabsTrigger value="compliance">Compliance</TabsTrigger>
              </TabsList>

              <TabsContent value="readmission" className="space-y-3 mt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">RISK SCORE</p>
                    <div className="flex items-center gap-3">
                      <Progress value={readmission?.risk_score} className="flex-1" />
                      <span className="font-bold">{readmission?.risk_score}%</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      Confidence: {readmission?.confidence}%
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">PRIMARY FACTORS</p>
                    <ul className="space-y-1">
                      {readmission?.primary_factors?.map((factor, idx) => (
                        <li key={idx} className="text-sm flex items-start gap-2">
                          <AlertTriangle className="w-3 h-3 text-orange-500 mt-1 flex-shrink-0" />
                          {factor}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">RECOMMENDED INTERVENTIONS</p>
                  <div className="grid gap-2">
                    {readmission?.recommended_interventions?.map((intervention, idx) => (
                      <div key={idx} className="p-2 bg-blue-50 rounded-lg text-sm text-blue-900">
                        {intervention}
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="careplans" className="space-y-3 mt-4">
                {predictions.care_plan_predictions?.length > 0 ? (
                  predictions.care_plan_predictions.map((cp, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                      <div className="flex items-start justify-between mb-2">
                        <p className="font-medium text-sm">{cp.problem}</p>
                        <Badge className={cp.achievement_likelihood >= 70 ? 'bg-green-500' : cp.achievement_likelihood >= 40 ? 'bg-yellow-500' : 'bg-red-500'}>
                          {cp.achievement_likelihood}% likely
                        </Badge>
                      </div>
                      <div className="mb-2">
                        <div className="flex justify-between text-xs text-gray-600 mb-1">
                          <span>Progress</span>
                          <span>{cp.current_progress}%</span>
                        </div>
                        <Progress value={cp.current_progress} className="h-2" />
                      </div>
                      <p className="text-xs text-gray-600">
                        <Calendar className="w-3 h-3 inline mr-1" />
                        Predicted: {cp.predicted_achievement_date}
                      </p>
                      {cp.barriers?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-red-600">
                            Barriers: {cp.barriers.join(', ')}
                          </p>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 text-center py-4">No active care plans</p>
                )}
              </TabsContent>

              <TabsContent value="compliance" className="space-y-3 mt-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">ENGAGEMENT SCORE</p>
                    <div className="flex items-center gap-3">
                      <Progress value={compliance?.engagement_score} className="flex-1" />
                      <span className="font-bold">{compliance?.engagement_score}%</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">RISK FACTORS</p>
                    <ul className="space-y-1">
                      {compliance?.risk_factors?.map((factor, idx) => (
                        <li key={idx} className="text-sm text-gray-700">• {factor}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {compliance?.proactive_outreach?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-500 mb-2">PROACTIVE OUTREACH STRATEGIES</p>
                    <div className="space-y-2">
                      {compliance.proactive_outreach.map((outreach, idx) => (
                        <div key={idx} className="p-3 bg-green-50 rounded-lg border border-green-200">
                          <div className="flex items-center gap-2 mb-1">
                            {outreach.method === 'phone' && <Phone className="w-4 h-4 text-green-600" />}
                            {outreach.method === 'email' && <Mail className="w-4 h-4 text-green-600" />}
                            {outreach.method === 'visit' && <User className="w-4 h-4 text-green-600" />}
                            <span className="font-medium text-sm text-green-900">{outreach.strategy}</span>
                          </div>
                          <p className="text-xs text-green-700 mb-2">
                            <Clock className="w-3 h-3 inline mr-1" />
                            {outreach.timing}
                          </p>
                          <p className="text-xs text-green-800 bg-green-100 p-2 rounded italic">
                            "{outreach.message_template}"
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </TabsContent>
            </Tabs>

            <div className="flex justify-end pt-2">
              <Link to={`${createPageUrl("PatientDetails")}?patientId=${patient.id}`}>
                <Button size="sm">
                  View Patient Details
                  <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
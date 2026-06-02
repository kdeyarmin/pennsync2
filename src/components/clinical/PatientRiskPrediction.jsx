import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Activity,
  Heart,
  Brain,
  Pill,
  Home,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Shield,
  Target,
  Zap,
  CheckCircle2,
  Clock,
  ArrowRight
} from "lucide-react";
import { differenceInDays } from "date-fns";

export default function PatientRiskPrediction({
  patient,
  currentVitals,
  previousVisits = [],
  carePlans = [],
  incidents = [],
  onInsertRecommendation,
  onAlertGenerated,
  compact = false
}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [riskAnalysis, setRiskAnalysis] = useState(null);
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [selectedRisk, setSelectedRisk] = useState(null);

  useEffect(() => {
    if (patient && previousVisits.length > 0) {
      analyzePatientRisk();
    }
  }, [patient?.id]);

  const analyzePatientRisk = async () => {
    if (!patient) return;
    
    setIsAnalyzing(true);
    try {
      // Prepare historical vital trends
      const vitalTrends = previousVisits.slice(0, 10).map(v => ({
        date: v.visit_date,
        vitals: v.vital_signs || {}
      }));

      // Prepare care plan progress
      const carePlanStatus = carePlans.map(cp => ({
        problem: cp.problem,
        goal: cp.goal,
        status: cp.status,
        targetDate: cp.target_date,
        daysRemaining: cp.target_date ? differenceInDays(new Date(cp.target_date), new Date()) : null
      }));

      // Prepare incident history
      const incidentHistory = incidents.map(inc => ({
        type: inc.incident_type,
        date: inc.incident_date,
        severity: inc.severity
      }));

      const prompt = `You are an expert clinical risk prediction AI for home health nursing. Analyze this patient's data to predict and quantify risks.

PATIENT PROFILE:
- Name: ${patient.first_name} ${patient.last_name}
- Age: ${patient.date_of_birth ? Math.floor((new Date() - new Date(patient.date_of_birth)) / 31557600000) : 'Unknown'}
- Primary Diagnosis: ${patient.primary_diagnosis || 'Not specified'}
- Secondary Diagnoses: ${patient.secondary_diagnoses?.join(', ') || 'None'}
- Allergies: ${patient.allergies || 'NKDA'}
- Status: ${patient.status}

CURRENT VITALS:
${currentVitals ? `
- BP: ${currentVitals.bp || 'Not recorded'}
- HR: ${currentVitals.hr || 'Not recorded'}
- Temp: ${currentVitals.temp || 'Not recorded'}
- O2 Sat: ${currentVitals.o2 || 'Not recorded'}%
- Pain: ${currentVitals.pain || 'Not recorded'}/10
` : 'No current vitals available'}

VITAL SIGN TRENDS (Last ${vitalTrends.length} visits):
${JSON.stringify(vitalTrends, null, 2)}

CARE PLAN STATUS:
${JSON.stringify(carePlanStatus, null, 2)}

INCIDENT HISTORY:
${JSON.stringify(incidentHistory, null, 2)}

NUMBER OF VISITS IN LAST 30 DAYS: ${previousVisits.filter(v => differenceInDays(new Date(), new Date(v.visit_date)) <= 30).length}

ANALYZE AND PREDICT THE FOLLOWING RISKS:

1. **Hospital Readmission Risk (30-day)**
   - Consider: diagnosis severity, vital trends, care plan adherence, recent hospitalizations

2. **Fall Risk**
   - Consider: age, medications, mobility issues, previous falls, environmental factors

3. **Adverse Medication Event Risk**
   - Consider: polypharmacy, high-risk medications, renal/hepatic function indicators

4. **Clinical Deterioration Risk**
   - Consider: vital sign trends, symptom progression, care plan goal failures

5. **Wound Complication Risk** (if applicable)
   - Consider: healing progress, infection signs, nutritional status

For each risk, provide:
- Risk score (0-100)
- Risk level (critical/high/moderate/low)
- Key contributing factors
- Trend (increasing/stable/decreasing)
- Specific, actionable interventions
- Recommended monitoring frequency

Return JSON:
{
  "overall_risk_score": 0-100,
  "overall_risk_level": "critical|high|moderate|low",
  "risk_summary": "Brief overall assessment",
  "risks": [
    {
      "risk_type": "hospital_readmission|fall|medication_adverse|clinical_deterioration|wound_complication",
      "risk_name": "Display name",
      "score": 0-100,
      "level": "critical|high|moderate|low",
      "trend": "increasing|stable|decreasing",
      "contributing_factors": ["factor1", "factor2"],
      "clinical_evidence": "Specific data points supporting this risk",
      "interventions": [
        {
          "action": "Specific intervention",
          "priority": "immediate|soon|routine",
          "rationale": "Why this helps"
        }
      ],
      "monitoring_frequency": "daily|every_visit|weekly|prn",
      "warning_signs": ["sign1", "sign2"]
    }
  ],
  "immediate_actions": ["Action that should be taken now"],
  "care_plan_recommendations": ["Suggested care plan additions"],
  "communication_alerts": [
    {
      "recipient": "physician|caregiver|agency",
      "message": "What to communicate",
      "urgency": "immediate|within_24h|routine"
    }
  ],
  "predictive_timeline": {
    "7_day_outlook": "What to expect in next 7 days",
    "30_day_outlook": "What to expect in next 30 days"
  }
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_risk_score: { type: "number" },
            overall_risk_level: { type: "string" },
            risk_summary: { type: "string" },
            risks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  risk_type: { type: "string" },
                  risk_name: { type: "string" },
                  score: { type: "number" },
                  level: { type: "string" },
                  trend: { type: "string" },
                  contributing_factors: { type: "array", items: { type: "string" } },
                  clinical_evidence: { type: "string" },
                  interventions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        action: { type: "string" },
                        priority: { type: "string" },
                        rationale: { type: "string" }
                      }
                    }
                  },
                  monitoring_frequency: { type: "string" },
                  warning_signs: { type: "array", items: { type: "string" } }
                }
              }
            },
            immediate_actions: { type: "array", items: { type: "string" } },
            care_plan_recommendations: { type: "array", items: { type: "string" } },
            communication_alerts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  recipient: { type: "string" },
                  message: { type: "string" },
                  urgency: { type: "string" }
                }
              }
            },
            predictive_timeline: {
              type: "object",
              properties: {
                "7_day_outlook": { type: "string" },
                "30_day_outlook": { type: "string" }
              }
            }
          }
        }
      });

      setRiskAnalysis(result);
      
      // Alert if high risk
      if (result.overall_risk_level === 'critical' || result.overall_risk_level === 'high') {
        onAlertGenerated?.({
          type: 'risk_prediction',
          level: result.overall_risk_level,
          message: result.risk_summary,
          patient: patient
        });
      }

    } catch (error) {
      console.error('Error analyzing patient risk:', error);
    }
    setIsAnalyzing(false);
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'moderate': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-slate-500';
    }
  };

  const getRiskBadgeStyle = (level) => {
    switch (level) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case 'increasing': return <TrendingUp className="w-4 h-4 text-red-500" />;
      case 'decreasing': return <TrendingDown className="w-4 h-4 text-green-500" />;
      default: return <Activity className="w-4 h-4 text-slate-500" />;
    }
  };

  const getRiskIcon = (type) => {
    switch (type) {
      case 'hospital_readmission': return <Home className="w-5 h-5" />;
      case 'fall': return <AlertTriangle className="w-5 h-5" />;
      case 'medication_adverse': return <Pill className="w-5 h-5" />;
      case 'clinical_deterioration': return <Heart className="w-5 h-5" />;
      case 'wound_complication': return <Activity className="w-5 h-5" />;
      default: return <Shield className="w-5 h-5" />;
    }
  };

  const handleInsertIntervention = (intervention) => {
    const text = `\n\nRisk Intervention: ${intervention.action}\nRationale: ${intervention.rationale}\nPriority: ${intervention.priority}`;
    onInsertRecommendation?.(text);
  };

  if (!patient) return null;

  return (
    <Card className={`border-purple-200 ${riskAnalysis?.overall_risk_level === 'critical' ? 'ring-2 ring-red-400' : ''}`}>
      <CardHeader 
        className={`py-3 cursor-pointer ${
          riskAnalysis?.overall_risk_level === 'critical' ? 'bg-gradient-to-r from-red-50 to-orange-50' :
          riskAnalysis?.overall_risk_level === 'high' ? 'bg-gradient-to-r from-orange-50 to-yellow-50' :
          'bg-gradient-to-r from-purple-50 to-indigo-50'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-600" />
            Patient Risk Prediction
            {riskAnalysis && (
              <Badge className={getRiskBadgeStyle(riskAnalysis.overall_risk_level)}>
                Score: {riskAnalysis.overall_risk_score}/100
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {riskAnalysis?.overall_risk_level && (
              <div className={`w-3 h-3 rounded-full ${getRiskColor(riskAnalysis.overall_risk_level)} animate-pulse`} />
            )}
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-3 space-y-4">
          {isAnalyzing ? (
            <div className="flex items-center justify-center py-8 gap-2">
              <RefreshCw className="w-5 h-5 animate-spin text-purple-600" />
              <span className="text-sm text-slate-600">Analyzing patient risk factors...</span>
            </div>
          ) : riskAnalysis ? (
            <>
              {/* Overall Risk Summary */}
              <Alert className={`${getRiskBadgeStyle(riskAnalysis.overall_risk_level)} border`}>
                <Brain className="w-4 h-4" />
                <AlertDescription>
                  <span className="font-semibold">Risk Assessment: </span>
                  {riskAnalysis.risk_summary}
                </AlertDescription>
              </Alert>

              {/* Risk Score Gauge */}
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Overall Risk Score</span>
                  <span className={`text-lg font-bold ${
                    riskAnalysis.overall_risk_score >= 70 ? 'text-red-600' :
                    riskAnalysis.overall_risk_score >= 50 ? 'text-orange-600' :
                    riskAnalysis.overall_risk_score >= 30 ? 'text-yellow-600' :
                    'text-green-600'
                  }`}>
                    {riskAnalysis.overall_risk_score}%
                  </span>
                </div>
                <Progress 
                  value={riskAnalysis.overall_risk_score} 
                  className="h-3"
                />
                <div className="flex justify-between text-xs text-slate-500 mt-1">
                  <span>Low</span>
                  <span>Moderate</span>
                  <span>High</span>
                  <span>Critical</span>
                </div>
              </div>

              {/* Individual Risks */}
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-slate-700">Risk Categories</h4>
                {riskAnalysis.risks?.map((risk, idx) => (
                  <div 
                    key={idx}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${
                      selectedRisk === idx ? 'ring-2 ring-purple-400' : ''
                    } ${getRiskBadgeStyle(risk.level)}`}
                    onClick={() => setSelectedRisk(selectedRisk === idx ? null : idx)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {getRiskIcon(risk.risk_type)}
                        <span className="font-medium text-sm">{risk.risk_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {getTrendIcon(risk.trend)}
                        <Badge variant="outline" className="font-bold">
                          {risk.score}%
                        </Badge>
                      </div>
                    </div>

                    {selectedRisk === idx && (
                      <div className="mt-3 space-y-3 pt-3 border-t">
                        {/* Contributing Factors */}
                        <div>
                          <p className="text-xs font-semibold mb-1">Contributing Factors:</p>
                          <div className="flex flex-wrap gap-1">
                            {risk.contributing_factors?.map((factor, fIdx) => (
                              <Badge key={fIdx} variant="outline" className="text-xs">
                                {factor}
                              </Badge>
                            ))}
                          </div>
                        </div>

                        {/* Clinical Evidence */}
                        <div className="p-2 bg-white/50 rounded text-xs">
                          <strong>Evidence:</strong> {risk.clinical_evidence}
                        </div>

                        {/* Interventions */}
                        <div>
                          <p className="text-xs font-semibold mb-2">Recommended Interventions:</p>
                          <div className="space-y-2">
                            {risk.interventions?.map((intervention, iIdx) => (
                              <div 
                                key={iIdx}
                                className="p-2 bg-white rounded border flex items-start justify-between gap-2"
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge className={
                                      intervention.priority === 'immediate' ? 'bg-red-500' :
                                      intervention.priority === 'soon' ? 'bg-orange-500' :
                                      'bg-blue-500'
                                    } variant="default">
                                      {intervention.priority}
                                    </Badge>
                                  </div>
                                  <p className="text-xs font-medium">{intervention.action}</p>
                                  <p className="text-xs text-slate-500">{intervention.rationale}</p>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleInsertIntervention(intervention);
                                  }}
                                  className="h-6 text-xs"
                                >
                                  Add
                                </Button>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Warning Signs */}
                        {risk.warning_signs?.length > 0 && (
                          <div className="p-2 bg-red-50 rounded">
                            <p className="text-xs font-semibold text-red-700 mb-1">⚠️ Watch for:</p>
                            <ul className="text-xs text-red-600 space-y-1">
                              {risk.warning_signs.map((sign, sIdx) => (
                                <li key={sIdx}>• {sign}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <div className="flex items-center gap-2 text-xs text-slate-500">
                          <Clock className="w-3 h-3" />
                          Monitor: {risk.monitoring_frequency?.replace('_', ' ')}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              {/* Immediate Actions */}
              {riskAnalysis.immediate_actions?.length > 0 && (
                <div className="p-3 bg-red-50 rounded-lg border border-red-200">
                  <h4 className="text-xs font-semibold text-red-800 mb-2 flex items-center gap-1">
                    <Zap className="w-3 h-3" />
                    Immediate Actions Required
                  </h4>
                  <ul className="space-y-1">
                    {riskAnalysis.immediate_actions.map((action, idx) => (
                      <li key={idx} className="text-xs text-red-700 flex items-start gap-2">
                        <ArrowRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {action}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Predictive Timeline */}
              {riskAnalysis.predictive_timeline && (
                <div className="grid grid-cols-2 gap-2">
                  <div className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-xs font-semibold text-blue-800">7-Day Outlook</p>
                    <p className="text-xs text-blue-700 mt-1">{riskAnalysis.predictive_timeline["7_day_outlook"]}</p>
                  </div>
                  <div className="p-2 bg-indigo-50 rounded-lg border border-indigo-200">
                    <p className="text-xs font-semibold text-indigo-800">30-Day Outlook</p>
                    <p className="text-xs text-indigo-700 mt-1">{riskAnalysis.predictive_timeline["30_day_outlook"]}</p>
                  </div>
                </div>
              )}

              {/* Care Plan Recommendations */}
              {riskAnalysis.care_plan_recommendations?.length > 0 && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <h4 className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    Suggested Care Plan Additions
                  </h4>
                  <ul className="space-y-1">
                    {riskAnalysis.care_plan_recommendations.map((rec, idx) => (
                      <li key={idx} className="text-xs text-green-700 flex items-start gap-2">
                        <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {rec}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Re-analyze button */}
              <Button
                variant="outline"
                size="sm"
                onClick={analyzePatientRisk}
                className="w-full text-xs gap-1"
                disabled={isAnalyzing}
              >
                <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
                Re-analyze Risk
              </Button>
            </>
          ) : (
            <div className="text-center py-6">
              <Brain className="w-12 h-12 text-purple-300 mx-auto mb-3" />
              <p className="text-sm text-slate-600 mb-3">
                Analyze patient data to predict risks and get proactive recommendations
              </p>
              <Button
                onClick={analyzePatientRisk}
                className="bg-purple-600 hover:bg-purple-700 gap-2"
                disabled={isAnalyzing}
              >
                <Brain className="w-4 h-4" />
                Run Risk Analysis
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
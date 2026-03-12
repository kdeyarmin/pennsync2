import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  AlertTriangle, 
  Shield, 
  Activity,
  Brain,
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronRight,
  Sparkles
} from "lucide-react";

export default function PredictiveHealthAnalytics({ patientId, patient, visits, carePlans, alerts, incidents }) {
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (patientId && patient && visits.length > 0) {
      analyzePredictiveRisks();
    }
  }, [patientId]);

  const analyzePredictiveRisks = async () => {
    setIsAnalyzing(true);
    try {
      // Analyze vital trends
      const recentVisits = visits.filter(v => v.status === 'completed').slice(0, 10);
      const vitalTrends = analyzeVitalTrends(recentVisits);
      
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a clinical analytics AI specializing in home health predictive modeling. Analyze this patient's data and predict health risks.

PATIENT PROFILE:
Name: ${patient.first_name} ${patient.last_name}
Age: ${patient.date_of_birth ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear() : 'Unknown'}
Primary Diagnosis: ${patient.primary_diagnosis || 'Not specified'}
Secondary Diagnoses: ${patient.secondary_diagnoses?.join(', ') || 'None'}
Admission Source: ${patient.admission_source || 'Not specified'}
Days in Service: ${patient.admission_date ? Math.floor((new Date() - new Date(patient.admission_date)) / (1000 * 60 * 60 * 24)) : 'Unknown'}

PAST HOSPITALIZATIONS:
${patient.past_hospitalizations?.length > 0 ? patient.past_hospitalizations.map(h => 
  `- ${h.date}: ${h.reason} (${h.length_of_stay} days)`
).join('\n') : 'No documented hospitalizations'}

CURRENT MEDICATIONS (${patient.current_medications?.length || 0}):
${patient.current_medications?.slice(0, 10).map(m => `- ${m.name} ${m.dosage}`).join('\n') || 'None documented'}

ALLERGIES: ${patient.allergies || 'None documented'}

FUNCTIONAL STATUS:
- Ambulation: ${patient.functional_status?.ambulation || 'Not assessed'}
- ADL Independence: ${patient.functional_status?.adl_independence || 'Not assessed'}
- Cognitive Status: ${patient.functional_status?.cognitive_status || 'Not assessed'}
- Fall Risk: ${patient.functional_status?.fall_risk || 'Not assessed'}

VITAL SIGNS TRENDS (Last 10 visits):
${vitalTrends}

RECENT VISITS (${recentVisits.length}):
${recentVisits.slice(0, 5).map((v, i) => `
Visit ${i + 1} (${v.visit_date}):
- Type: ${v.visit_type}
- BP: ${v.vital_signs?.blood_pressure_systolic || '?'}/${v.vital_signs?.blood_pressure_diastolic || '?'}
- HR: ${v.vital_signs?.heart_rate || '?'}, O2: ${v.vital_signs?.oxygen_saturation || '?'}%
- Weight: ${v.vital_signs?.weight || '?'} lbs
- Pain: ${v.vital_signs?.pain_level || '?'}/10
- Summary: ${v.nurse_notes?.substring(0, 150) || 'No notes'}
`).join('\n')}

ACTIVE CARE PLANS (${carePlans.filter(cp => cp.status === 'active').length}):
${carePlans.filter(cp => cp.status === 'active').map(cp => 
  `- ${cp.problem}: ${cp.status}`
).join('\n') || 'None'}

ACTIVE ALERTS (${alerts.filter(a => a.status === 'active').length}):
${alerts.filter(a => a.status === 'active').map(a => 
  `- ${a.alert_type} (${a.severity}): ${a.title}`
).join('\n') || 'None'}

RECENT INCIDENTS (${incidents.length}):
${incidents.slice(0, 3).map(inc => 
  `- ${inc.incident_type} (${inc.incident_date}): ${inc.severity} severity`
).join('\n') || 'None reported'}

SOCIAL FACTORS:
- Living Situation: ${patient.social_history?.living_situation || 'Unknown'}
- Support System: ${patient.social_history?.support_system || 'Not documented'}
- Primary Language: ${patient.social_history?.primary_language || 'English'}
- Interpreter Needed: ${patient.social_history?.interpreter_needed ? 'Yes' : 'No'}

Based on this comprehensive data, provide a predictive risk analysis:

1. READMISSION RISK SCORE (0-100): Calculate based on:
   - Diagnosis severity and comorbidities
   - Vital signs trends (worsening vs improving)
   - Recent hospitalizations
   - Functional decline indicators
   - Medication complexity
   - Social determinants (living alone, poor support)
   - Non-compliance indicators from visit notes

2. SPECIFIC HEALTH RISKS: Identify top 3-5 specific risks such as:
   - CHF exacerbation risk
   - Fall risk increase
   - Infection risk
   - Medication non-adherence
   - Deteriorating vital signs
   - Mental health concerns
   - Caregiver burnout

3. EARLY WARNING SIGNS: What should nurses watch for?

4. PREVENTIVE INTERVENTIONS: Specific, actionable measures to reduce risks

5. RISK TRAJECTORY: Is risk increasing, stable, or decreasing?

Return detailed clinical analysis with specific evidence from the data.`,
        response_json_schema: {
          type: "object",
          properties: {
            readmission_risk_score: { type: "number" },
            risk_level: { type: "string", enum: ["low", "moderate", "high", "critical"] },
            risk_trajectory: { type: "string", enum: ["increasing", "stable", "decreasing"] },
            primary_risk_factors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  factor: { type: "string" },
                  severity: { type: "string", enum: ["low", "moderate", "high", "critical"] },
                  evidence: { type: "string" },
                  trend: { type: "string", enum: ["worsening", "stable", "improving"] }
                }
              }
            },
            specific_health_risks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  risk_type: { type: "string" },
                  probability: { type: "string", enum: ["low", "moderate", "high"] },
                  timeframe: { type: "string" },
                  clinical_indicators: { type: "array", items: { type: "string" } }
                }
              }
            },
            early_warning_signs: { type: "array", items: { type: "string" } },
            preventive_interventions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  intervention: { type: "string" },
                  priority: { type: "string", enum: ["immediate", "urgent", "routine"] },
                  category: { type: "string" },
                  expected_impact: { type: "string" }
                }
              }
            },
            recommendation_summary: { type: "string" }
          }
        }
      });

      setAnalysis(result);
    } catch (error) {
      console.error("Error analyzing predictive risks:", error);
    }
    setIsAnalyzing(false);
  };

  const analyzeVitalTrends = (visits) => {
    const validVisits = visits.filter(v => v.vital_signs);
    if (validVisits.length === 0) return "No vital signs data available";

    const metrics = ['blood_pressure_systolic', 'heart_rate', 'oxygen_saturation', 'weight'];
    let trends = [];

    metrics.forEach(metric => {
      const values = validVisits.map(v => v.vital_signs?.[metric]).filter(v => v != null);
      if (values.length >= 2) {
        const recent = values.slice(0, 3).reduce((a, b) => a + b, 0) / Math.min(3, values.length);
        const older = values.slice(-3).reduce((a, b) => a + b, 0) / Math.min(3, values.length);
        const change = ((recent - older) / older * 100).toFixed(1);
        trends.push(`${metric}: ${recent.toFixed(1)} (${change > 0 ? '+' : ''}${change}% vs baseline)`);
      }
    });

    return trends.join('\n') || "Insufficient data for trend analysis";
  };

  const getRiskColor = (level) => {
    switch(level) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'moderate': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'critical': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendIcon = (trend) => {
    switch(trend) {
      case 'increasing': return <ArrowUp className="w-4 h-4 text-red-500" />;
      case 'decreasing': return <ArrowDown className="w-4 h-4 text-green-500" />;
      case 'stable': return <Minus className="w-4 h-4 text-gray-500" />;
      default: return null;
    }
  };

  const getPriorityColor = (priority) => {
    switch(priority) {
      case 'immediate': return 'bg-red-500 text-white';
      case 'urgent': return 'bg-orange-500 text-white';
      case 'routine': return 'bg-blue-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  if (isAnalyzing) {
    return (
      <Card className="border-2 border-purple-200">
        <CardContent className="p-8 text-center">
          <Brain className="w-12 h-12 text-purple-600 mx-auto mb-4 animate-pulse" />
          <p className="text-gray-600">Analyzing patient data and predicting risks...</p>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) return null;

  return (
    <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-white">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-6 h-6 text-purple-600" />
            Predictive Health Analytics
            <Badge className="ml-2 bg-purple-600">AI-Powered</Badge>
          </CardTitle>
          <Button 
            variant="outline" 
            size="sm"
            onClick={analyzePredictiveRisks}
          >
            <Sparkles className="w-4 h-4 mr-2" />
            Re-analyze
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Risk Score Header */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card className={`border-2 ${getRiskColor(analysis.risk_level)}`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium opacity-80">Readmission Risk</p>
                  <p className="text-3xl font-bold">{analysis.readmission_risk_score}%</p>
                  <Badge className={`mt-2 ${getRiskColor(analysis.risk_level)}`}>
                    {analysis.risk_level.toUpperCase()}
                  </Badge>
                </div>
                <AlertTriangle className="w-12 h-12 opacity-40" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-2">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="w-5 h-5 text-blue-600" />
                <p className="text-sm font-medium text-gray-600">Risk Trajectory</p>
              </div>
              <div className="flex items-center gap-2">
                {getTrendIcon(analysis.risk_trajectory)}
                <p className="text-xl font-semibold capitalize">{analysis.risk_trajectory}</p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 border-green-300 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2">
                <Shield className="w-5 h-5 text-green-600" />
                <p className="text-sm font-medium text-green-800">Preventable</p>
              </div>
              <p className="text-xl font-semibold text-green-900">
                {analysis.preventive_interventions?.length || 0} Actions
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Summary */}
        <Alert className="bg-purple-50 border-purple-200">
          <Brain className="w-5 h-5 text-purple-600" />
          <AlertDescription className="text-purple-900">
            {analysis.recommendation_summary}
          </AlertDescription>
        </Alert>

        {/* Primary Risk Factors */}
        {analysis.primary_risk_factors?.length > 0 && (
          <div>
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-orange-600" />
              Primary Risk Factors
            </h3>
            <div className="grid gap-3">
              {analysis.primary_risk_factors.map((factor, idx) => (
                <Card key={idx} className={`border-l-4 ${
                  factor.severity === 'critical' ? 'border-red-500' :
                  factor.severity === 'high' ? 'border-orange-500' :
                  factor.severity === 'moderate' ? 'border-yellow-500' : 'border-green-500'
                }`}>
                  <CardContent className="p-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-semibold text-gray-900">{factor.factor}</p>
                          <Badge className={getRiskColor(factor.severity)}>
                            {factor.severity}
                          </Badge>
                          {getTrendIcon(factor.trend)}
                        </div>
                        <p className="text-sm text-gray-600">{factor.evidence}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Expandable Sections */}
        <Button
          variant="outline"
          className="w-full"
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? 'Show Less' : 'Show Detailed Analysis'}
          <ChevronRight className={`w-4 h-4 ml-2 transition-transform ${expanded ? 'rotate-90' : ''}`} />
        </Button>

        {expanded && (
          <div className="space-y-6 pt-4 border-t">
            {/* Specific Health Risks */}
            {analysis.specific_health_risks?.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Specific Health Risks</h3>
                <div className="grid gap-3">
                  {analysis.specific_health_risks.map((risk, idx) => (
                    <Card key={idx} className="border-orange-200 bg-orange-50">
                      <CardContent className="p-3">
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-semibold text-gray-900">{risk.risk_type}</p>
                          <div className="flex items-center gap-2">
                            <Badge className={`${
                              risk.probability === 'high' ? 'bg-red-500' :
                              risk.probability === 'moderate' ? 'bg-orange-500' : 'bg-yellow-500'
                            } text-white`}>
                              {risk.probability} probability
                            </Badge>
                            <Badge variant="outline">{risk.timeframe}</Badge>
                          </div>
                        </div>
                        {risk.clinical_indicators?.length > 0 && (
                          <ul className="text-sm text-gray-600 space-y-1">
                            {risk.clinical_indicators.map((indicator, i) => (
                              <li key={i}>• {indicator}</li>
                            ))}
                          </ul>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}

            {/* Early Warning Signs */}
            {analysis.early_warning_signs?.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Early Warning Signs to Monitor</h3>
                <Card className="border-yellow-200 bg-yellow-50">
                  <CardContent className="p-3">
                    <ul className="space-y-2">
                      {analysis.early_warning_signs.map((sign, idx) => (
                        <li key={idx} className="flex items-start gap-2 text-sm text-gray-700">
                          <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
                          <span>{sign}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Preventive Interventions */}
            {analysis.preventive_interventions?.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3">Recommended Preventive Actions</h3>
                <div className="grid gap-3">
                  {analysis.preventive_interventions.map((intervention, idx) => (
                    <Card key={idx} className="border-blue-200 bg-blue-50">
                      <CardContent className="p-3">
                        <div className="flex items-start gap-3">
                          <div className="flex-shrink-0 mt-1">
                            <Badge className={getPriorityColor(intervention.priority)}>
                              {intervention.priority}
                            </Badge>
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-gray-900 mb-1">{intervention.intervention}</p>
                            <div className="flex flex-wrap items-center gap-2 text-sm">
                              <Badge variant="outline">{intervention.category}</Badge>
                              <span className="text-gray-600">{intervention.expected_impact}</span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
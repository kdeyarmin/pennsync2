import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, TrendingDown, Phone, CheckCircle2 } from "lucide-react";
import { logActivity, ActivityActions } from "../utils/activityLogger";

export default function RealTimeDeteriorationPredictor({
  noteContent,
  patientData,
  vitalSigns,
  recentVisits,
  diagnosis,
  onCreateAlert,
  onAddToNote,
  autoAnalyze = true
}) {
  const [analyzing, setAnalyzing] = useState(false);
  const [prediction, setPrediction] = useState(null);
  const [alertCreated, setAlertCreated] = useState(false);

  useEffect(() => {
    if (autoAnalyze && noteContent?.length >= 100 && patientData) {
      const timer = setTimeout(() => analyzeDeteriorationRisk(), 2000);
      return () => clearTimeout(timer);
    }
  }, [noteContent, vitalSigns, autoAnalyze]);

  const analyzeDeteriorationRisk = async () => {
    if (!noteContent || !patientData) return;

    setAnalyzing(true);
    try {
      const historicalContext = recentVisits?.slice(0, 5).map(v => ({
        date: v.visit_date,
        vitals: v.vital_signs,
        notes: v.nurse_notes?.substring(0, 200)
      })) || [];

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this clinical note for signs of patient deterioration and predict risk.

CURRENT NOTE:
${noteContent}

PATIENT: ${patientData.first_name} ${patientData.last_name}
AGE: ${patientData.date_of_birth ? Math.floor((new Date() - new Date(patientData.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000)) : 'Unknown'}
DIAGNOSIS: ${diagnosis}

CURRENT VITAL SIGNS:
${JSON.stringify(vitalSigns)}

BASELINE VITALS:
${JSON.stringify(patientData.baseline_vitals || {})}

RECENT VISIT HISTORY (Last 5 visits):
${historicalContext.map(v => `${v.date}: Vitals: ${JSON.stringify(v.vitals)}, Notes: ${v.notes}`).join('\n')}

CURRENT MEDICATIONS:
${patientData.current_medications?.map(m => `${m.name} ${m.dosage}`).join(', ') || 'None'}

FUNCTIONAL STATUS:
${JSON.stringify(patientData.functional_status || {})}

Analyze for:
1. VITAL SIGN TRENDS - Compare current vs baseline vs recent visits
2. SYMPTOM PROGRESSION - Worsening symptoms or new concerning findings
3. FUNCTIONAL DECLINE - ADL deterioration, increased weakness
4. DISEASE-SPECIFIC RED FLAGS - Diagnosis-specific warning signs
5. MEDICATION CONCERNS - Side effects, ineffectiveness
6. HOSPITALIZATION RISK - Likelihood of ER visit or admission

Return comprehensive risk assessment with actionable recommendations.`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_risk_score: { type: "number", description: "0-100 deterioration risk score" },
            risk_level: { 
              type: "string",
              enum: ["minimal", "low", "moderate", "high", "critical"]
            },
            hospitalization_risk: { type: "number", description: "0-100 probability of hospitalization within 7 days" },
            key_concerns: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  concern: { type: "string" },
                  evidence: { type: "string" },
                  severity: { type: "string" }
                }
              }
            },
            vital_sign_analysis: {
              type: "object",
              properties: {
                trending_worse: { type: "array", items: { type: "string" } },
                stable: { type: "array", items: { type: "string" } },
                improved: { type: "array", items: { type: "string" } }
              }
            },
            immediate_actions_required: {
              type: "array",
              items: { type: "string" }
            },
            physician_notification_recommended: { type: "boolean" },
            physician_notification_urgency: { 
              type: "string",
              enum: ["immediate_911", "call_now", "same_day", "routine", "not_needed"]
            },
            documentation_additions: {
              type: "array",
              items: { type: "string" }
            },
            clinical_rationale: { type: "string" }
          }
        }
      });

      setPrediction(result);

      // Log deterioration analysis
      logActivity(ActivityActions.AI_FEATURE_USED, {
        feature: 'real_time_deterioration_prediction',
        patient_id: patientData.id,
        risk_score: result.overall_risk_score,
        risk_level: result.risk_level,
        hospitalization_risk: result.hospitalization_risk,
        physician_notification: result.physician_notification_recommended,
        page: 'SmartNoteAssistant'
      });

    } catch (error) {
      console.error('Deterioration analysis error:', error);
    }
    setAnalyzing(false);
  };

  const handleCreateAlert = async () => {
    if (!prediction || !patientData) return;

    try {
      await onCreateAlert({
        patient_id: patientData.id,
        alert_type: 'vital_deterioration',
        severity: prediction.risk_level === 'critical' || prediction.risk_level === 'high' ? 'critical' : 'high',
        title: `Patient Deterioration Risk: ${prediction.risk_level.toUpperCase()}`,
        message: prediction.clinical_rationale,
        contributing_factors: prediction.key_concerns.map(c => c.concern),
        recommended_actions: prediction.immediate_actions_required,
        risk_score: prediction.overall_risk_score,
        status: 'active'
      });

      setAlertCreated(true);
      
      logActivity(ActivityActions.CREATE, {
        entity_type: 'PatientAlert',
        patient_id: patientData.id,
        alert_type: 'deterioration_prediction',
        risk_score: prediction.overall_risk_score,
        page: 'SmartNoteAssistant'
      });
    } catch (error) {
      console.error('Error creating alert:', error);
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-600';
      case 'moderate': return 'bg-yellow-500';
      case 'low': return 'bg-blue-500';
      default: return 'bg-slate-500';
    }
  };

  if (analyzing) {
    return (
      <Card className="border-2 border-orange-300 bg-orange-50">
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto mb-3" />
          <p className="text-sm text-slate-600">Analyzing patient deterioration risk...</p>
        </CardContent>
      </Card>
    );
  }

  if (!prediction) return null;

  const shouldAlert = prediction.risk_level === 'high' || prediction.risk_level === 'critical';

  return (
    <Card className={`border-4 ${shouldAlert ? 'border-red-500 animate-pulse' : 'border-orange-300'} bg-gradient-to-br from-orange-50 to-red-50 shadow-xl`}>
      <CardHeader className={`${shouldAlert ? 'bg-red-600' : 'bg-orange-600'} text-white`}>
        <CardTitle className="flex items-center gap-2">
          <TrendingDown className="w-5 h-5" />
          AI Deterioration Risk Analysis
          <Badge className="ml-auto bg-white text-slate-900 text-lg px-3 py-1">
            {prediction.overall_risk_score}% Risk
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {/* Risk Summary */}
        <Alert className={`${
          prediction.risk_level === 'critical' ? 'bg-red-100 border-red-400' :
          prediction.risk_level === 'high' ? 'bg-orange-100 border-orange-400' :
          'bg-yellow-100 border-yellow-400'
        }`}>
          <AlertTriangle className={`w-4 h-4 ${
            prediction.risk_level === 'critical' ? 'text-red-600' :
            prediction.risk_level === 'high' ? 'text-orange-600' : 'text-yellow-600'
          }`} />
          <AlertDescription>
            <p className="font-semibold mb-1">Risk Level: {prediction.risk_level.toUpperCase()}</p>
            <p className="text-sm">Hospitalization Risk (7-day): {prediction.hospitalization_risk}%</p>
          </AlertDescription>
        </Alert>

        {/* Physician Notification */}
        {prediction.physician_notification_recommended && (
          <Alert className="bg-blue-50 border-blue-300">
            <Phone className="w-4 h-4 text-blue-600" />
            <AlertDescription>
              <p className="font-semibold text-blue-900">
                {prediction.physician_notification_urgency === 'immediate_911' ? '🚨 CALL 911 IMMEDIATELY' :
                 prediction.physician_notification_urgency === 'call_now' ? '📞 Call Physician NOW' :
                 prediction.physician_notification_urgency === 'same_day' ? '📞 Notify Physician Today' :
                 '📞 Physician Notification Recommended'}
              </p>
            </AlertDescription>
          </Alert>
        )}

        {/* Key Concerns */}
        {prediction.key_concerns?.length > 0 && (
          <div>
            <p className="text-sm font-semibold text-slate-700 mb-2">Key Concerns:</p>
            <div className="space-y-2">
              {prediction.key_concerns.map((concern, idx) => (
                <Card key={idx} className={`border-l-4 ${
                  concern.severity === 'critical' ? 'border-l-red-500 bg-red-50' :
                  concern.severity === 'high' ? 'border-l-orange-500 bg-orange-50' :
                  'border-l-yellow-500 bg-yellow-50'
                }`}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <Badge className={`text-xs ${
                        concern.severity === 'critical' ? 'bg-red-600' :
                        concern.severity === 'high' ? 'bg-orange-600' : 'bg-yellow-500'
                      }`}>
                        {concern.severity}
                      </Badge>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-900">{concern.category}</p>
                        <p className="text-xs text-slate-700 mt-1">{concern.concern}</p>
                        <p className="text-xs text-slate-600 italic mt-1">Evidence: {concern.evidence}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Vital Sign Trends */}
        {prediction.vital_sign_analysis && (
          <div className="grid grid-cols-3 gap-2 text-xs">
            {prediction.vital_sign_analysis.trending_worse?.length > 0 && (
              <div className="bg-red-50 border border-red-200 rounded p-2">
                <p className="font-semibold text-red-800 mb-1">↓ Worsening</p>
                {prediction.vital_sign_analysis.trending_worse.map((v, i) => (
                  <p key={i} className="text-red-700">{v}</p>
                ))}
              </div>
            )}
            {prediction.vital_sign_analysis.stable?.length > 0 && (
              <div className="bg-blue-50 border border-blue-200 rounded p-2">
                <p className="font-semibold text-blue-800 mb-1">→ Stable</p>
                {prediction.vital_sign_analysis.stable.map((v, i) => (
                  <p key={i} className="text-blue-700">{v}</p>
                ))}
              </div>
            )}
            {prediction.vital_sign_analysis.improved?.length > 0 && (
              <div className="bg-green-50 border border-green-200 rounded p-2">
                <p className="font-semibold text-green-800 mb-1">↑ Improved</p>
                {prediction.vital_sign_analysis.improved.map((v, i) => (
                  <p key={i} className="text-green-700">{v}</p>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Immediate Actions */}
        {prediction.immediate_actions_required?.length > 0 && (
          <div className="bg-white border-2 border-orange-400 rounded p-3">
            <p className="text-sm font-semibold text-slate-900 mb-2">Immediate Actions Required:</p>
            <ul className="space-y-1">
              {prediction.immediate_actions_required.map((action, idx) => (
                <li key={idx} className="text-sm text-slate-800 flex items-start gap-2">
                  <span className="text-orange-600 font-bold">•</span>
                  {action}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          {!alertCreated ? (
            <Button
              size="sm"
              onClick={handleCreateAlert}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <AlertTriangle className="w-4 h-4 mr-1" />
              Create Patient Alert
            </Button>
          ) : (
            <Badge className="bg-green-600 text-white px-3 py-1">
              <CheckCircle2 className="w-3 h-3 mr-1" />
              Alert Created
            </Badge>
          )}
          {prediction.documentation_additions?.length > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                const additions = prediction.documentation_additions.join('\n\n');
                onAddToNote(additions);
                
                logActivity(ActivityActions.AI_FEATURE_USED, {
                  feature: 'apply_deterioration_documentation',
                  patient_id: patientData.id,
                  page: 'SmartNoteAssistant'
                });
              }}
            >
              Add to Note
            </Button>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={analyzeDeteriorationRisk}
          >
            Re-analyze
          </Button>
        </div>

        {/* Clinical Rationale */}
        <div className="bg-blue-50 border border-blue-200 rounded p-3">
          <p className="text-xs font-semibold text-blue-900 mb-1">Clinical Rationale:</p>
          <p className="text-xs text-blue-800">{prediction.clinical_rationale}</p>
        </div>
      </CardContent>
    </Card>
  );
}
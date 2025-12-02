import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ShieldAlert,
  Loader2,
  AlertTriangle,
  Pill,
  Stethoscope,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FlaskConical,
  HeartPulse,
  RefreshCw,
  Brain,
  TrendingUp,
  AlertCircle,
  Zap,
  FileWarning,
  Activity,
  Plus
} from "lucide-react";
import { debounce } from "lodash";

export default function EnhancedClinicalDecisionSupport({
  patient,
  currentNoteText,
  vitalSigns,
  previousVisits = [],
  carePlans = [],
  medications = [],
  onInsertRecommendation,
  onAlertAcknowledged,
  autoAnalyze = true
}) {
  const [cdsResults, setCdsResults] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState("alerts");
  const [acknowledgedAlerts, setAcknowledgedAlerts] = useState([]);
  const [lastAnalyzedHash, setLastAnalyzedHash] = useState("");

  // Create a hash of the input data to detect changes
  const getInputHash = useCallback(() => {
    return JSON.stringify({
      note: currentNoteText?.substring(0, 500),
      vitals: vitalSigns,
      diagnosis: patient?.primary_diagnosis
    });
  }, [currentNoteText, vitalSigns, patient?.primary_diagnosis]);

  // Debounced analysis function
  const debouncedAnalyze = useCallback(
    debounce(async (forceAnalyze = false) => {
      const currentHash = getInputHash();
      if (!forceAnalyze && currentHash === lastAnalyzedHash) return;
      if (!currentNoteText || currentNoteText.length < 30) return;

      setIsAnalyzing(true);
      try {
        const result = await analyzeClinicalData();
        setCdsResults(result);
        setLastAnalyzedHash(currentHash);
      } catch (error) {
        console.error("CDS Analysis error:", error);
      }
      setIsAnalyzing(false);
    }, 3000),
    [currentNoteText, vitalSigns, patient, previousVisits, carePlans]
  );

  // Auto-analyze when inputs change
  useEffect(() => {
    if (autoAnalyze && currentNoteText?.length > 50) {
      debouncedAnalyze();
    }
  }, [currentNoteText, vitalSigns, autoAnalyze]);

  const analyzeClinicalData = async () => {
    // Build comprehensive patient context
    const recentVitals = previousVisits.slice(0, 5).map(v => ({
      date: v.visit_date,
      vitals: v.vital_signs
    })).filter(v => v.vitals);

    const activeCarePlans = carePlans.filter(cp => cp.status === 'active');

    const prompt = `You are an advanced Clinical Decision Support AI for home health nursing. Perform a comprehensive real-time clinical analysis.

PATIENT PROFILE:
- Name: ${patient?.first_name} ${patient?.last_name}
- Age: ${patient?.date_of_birth ? calculateAge(patient.date_of_birth) : 'Unknown'}
- Primary Diagnosis: ${patient?.primary_diagnosis || 'Not specified'}
- Secondary Diagnoses: ${patient?.secondary_diagnoses?.join(', ') || 'None'}
- Allergies: ${patient?.allergies || 'NKDA'}

CURRENT VITAL SIGNS:
${formatVitalSigns(vitalSigns)}

VITAL SIGN TRENDS (Last 5 visits):
${recentVitals.length > 0 ? recentVitals.map(v => `${v.date}: ${formatVitalSigns(v.vitals)}`).join('\n') : 'No previous vital data'}

ACTIVE CARE PLAN GOALS:
${activeCarePlans.map(cp => `- ${cp.problem}: ${cp.goal}`).join('\n') || 'No active care plans'}

CURRENT MEDICATIONS DOCUMENTED:
${medications.length > 0 ? medications.join(', ') : 'Extract from note if mentioned'}

CURRENT CLINICAL NOTE:
${currentNoteText}

---

PERFORM COMPREHENSIVE ANALYSIS:

1. **CRITICAL ALERTS**: Identify any immediately dangerous findings requiring urgent action
2. **DRUG INTERACTIONS**: Check for potential medication interactions or contraindications with diagnosis
3. **VITAL SIGN ANALYSIS**: Analyze current vitals AND trends - flag deterioration patterns
4. **DIFFERENTIAL CONSIDERATIONS**: Based on symptoms, suggest conditions to rule out or consider
5. **EVIDENCE-BASED RECOMMENDATIONS**: Provide specific, actionable clinical recommendations
6. **CARE PLAN ALIGNMENT**: Check if documented care aligns with care plan goals
7. **MISSING ASSESSMENTS**: Identify diagnosis-specific assessments not documented
8. **PREVENTIVE ALERTS**: Flag risk factors for common complications (falls, infection, readmission)

Return comprehensive JSON:
{
  "overall_risk_level": "critical" | "high" | "moderate" | "low",
  "critical_alerts": [
    {
      "id": "unique_id",
      "alert_type": "vital_critical" | "drug_interaction" | "symptom_cluster" | "deterioration",
      "title": "Brief alert title",
      "description": "What was detected",
      "clinical_significance": "Why this matters",
      "immediate_actions": ["Action 1", "Action 2"],
      "severity": "critical" | "high"
    }
  ],
  "drug_safety": {
    "interactions": [
      {
        "drugs": ["Drug A", "Drug B"],
        "interaction_type": "major" | "moderate" | "minor",
        "effect": "What happens",
        "recommendation": "What to do",
        "monitoring": "What to monitor"
      }
    ],
    "contraindications": [
      {
        "drug": "Drug name",
        "contraindicated_for": "Condition/situation",
        "reason": "Why contraindicated",
        "alternative": "Consider instead"
      }
    ],
    "allergy_concerns": [
      {
        "allergen": "Substance",
        "related_medications": ["Meds to watch"],
        "cross_reactivity_risk": "high" | "moderate" | "low"
      }
    ]
  },
  "vital_sign_analysis": {
    "current_status": "stable" | "concerning" | "critical",
    "abnormal_findings": [
      {
        "vital": "Which vital",
        "value": "Current value",
        "normal_range": "Expected range",
        "concern_level": "high" | "moderate" | "low",
        "clinical_implication": "What this suggests"
      }
    ],
    "trend_analysis": [
      {
        "vital": "Which vital",
        "trend": "increasing" | "decreasing" | "fluctuating" | "stable",
        "significance": "What the trend means",
        "action_threshold": "When to escalate"
      }
    ]
  },
  "differential_considerations": [
    {
      "condition": "Condition to consider",
      "supporting_findings": ["Finding 1", "Finding 2"],
      "rule_out_with": ["Test or assessment needed"],
      "urgency": "urgent" | "soon" | "routine"
    }
  ],
  "treatment_recommendations": [
    {
      "category": "medication" | "intervention" | "monitoring" | "education" | "referral",
      "recommendation": "Specific recommendation",
      "rationale": "Evidence or guideline supporting this",
      "priority": "high" | "medium" | "low",
      "insert_text": "Text to add to note if accepted"
    }
  ],
  "care_plan_alignment": {
    "aligned_goals": ["Goals being addressed"],
    "gaps_identified": [
      {
        "goal": "Care plan goal",
        "gap": "What's missing",
        "suggested_documentation": "What to add"
      }
    ]
  },
  "missing_assessments": [
    {
      "assessment": "Required assessment",
      "reason": "Why needed for this patient",
      "priority": "required" | "recommended",
      "template_text": "Quick documentation template"
    }
  ],
  "preventive_alerts": [
    {
      "risk_type": "fall" | "infection" | "readmission" | "pressure_injury" | "dehydration",
      "risk_level": "high" | "moderate" | "low",
      "risk_factors": ["Factor 1", "Factor 2"],
      "preventive_actions": ["Action 1", "Action 2"]
    }
  ],
  "clinical_summary": "2-3 sentence overall clinical impression and key recommendations"
}`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          overall_risk_level: { type: "string" },
          critical_alerts: { type: "array", items: { type: "object" } },
          drug_safety: { type: "object" },
          vital_sign_analysis: { type: "object" },
          differential_considerations: { type: "array", items: { type: "object" } },
          treatment_recommendations: { type: "array", items: { type: "object" } },
          care_plan_alignment: { type: "object" },
          missing_assessments: { type: "array", items: { type: "object" } },
          preventive_alerts: { type: "array", items: { type: "object" } },
          clinical_summary: { type: "string" }
        }
      }
    });

    return result;
  };

  const calculateAge = (dob) => {
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const formatVitalSigns = (vitals) => {
    if (!vitals) return 'Not documented';
    const parts = [];
    if (vitals.bp || vitals.blood_pressure_systolic) {
      parts.push(`BP: ${vitals.bp || `${vitals.blood_pressure_systolic}/${vitals.blood_pressure_diastolic}`}`);
    }
    if (vitals.hr || vitals.heart_rate) parts.push(`HR: ${vitals.hr || vitals.heart_rate}`);
    if (vitals.temp || vitals.temperature) parts.push(`Temp: ${vitals.temp || vitals.temperature}`);
    if (vitals.o2 || vitals.oxygen_saturation) parts.push(`O2: ${vitals.o2 || vitals.oxygen_saturation}%`);
    if (vitals.pain || vitals.pain_level) parts.push(`Pain: ${vitals.pain || vitals.pain_level}/10`);
    if (vitals.rr || vitals.respiratory_rate) parts.push(`RR: ${vitals.rr || vitals.respiratory_rate}`);
    return parts.length > 0 ? parts.join(', ') : 'Not documented';
  };

  const handleAcknowledge = (alertId) => {
    setAcknowledgedAlerts(prev => [...prev, alertId]);
    onAlertAcknowledged?.(alertId);
  };

  const handleInsert = (text) => {
    onInsertRecommendation?.(text);
  };

  const getRiskColor = (level) => {
    const colors = {
      critical: 'bg-red-600 text-white',
      high: 'bg-orange-500 text-white',
      moderate: 'bg-yellow-500 text-white',
      low: 'bg-green-500 text-white'
    };
    return colors[level] || 'bg-gray-500 text-white';
  };

  const getSeverityStyle = (severity) => {
    const styles = {
      critical: 'border-red-500 bg-red-50',
      high: 'border-orange-400 bg-orange-50',
      moderate: 'border-yellow-400 bg-yellow-50',
      low: 'border-blue-300 bg-blue-50'
    };
    return styles[severity] || 'border-gray-300 bg-gray-50';
  };

  const totalAlerts = cdsResults ? (
    (cdsResults.critical_alerts?.length || 0) +
    (cdsResults.drug_safety?.interactions?.length || 0) +
    (cdsResults.drug_safety?.contraindications?.length || 0) +
    (cdsResults.vital_sign_analysis?.abnormal_findings?.length || 0)
  ) : 0;

  const unacknowledgedCritical = cdsResults?.critical_alerts?.filter(
    a => !acknowledgedAlerts.includes(a.id)
  ) || [];

  return (
    <Card className={`border-2 ${unacknowledgedCritical.length > 0 ? 'border-red-400 shadow-red-100 shadow-lg' : 'border-indigo-200'}`}>
      <CardHeader 
        className={`py-3 cursor-pointer ${unacknowledgedCritical.length > 0 
          ? 'bg-gradient-to-r from-red-100 to-orange-100' 
          : 'bg-gradient-to-r from-indigo-50 to-purple-50'}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className={`w-5 h-5 ${unacknowledgedCritical.length > 0 ? 'text-red-600' : 'text-indigo-600'}`} />
            <span className="font-semibold">AI Clinical Decision Support</span>
            {cdsResults && (
              <Badge className={getRiskColor(cdsResults.overall_risk_level)}>
                {cdsResults.overall_risk_level} risk
              </Badge>
            )}
            {totalAlerts > 0 && (
              <Badge variant="destructive" className="animate-pulse">
                {totalAlerts} alert{totalAlerts !== 1 ? 's' : ''}
              </Badge>
            )}
            {isAnalyzing && (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={(e) => { e.stopPropagation(); debouncedAnalyze(true); }}
              disabled={isAnalyzing}
              className="h-7 px-2"
            >
              <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
            </Button>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-3">
          {!cdsResults && !isAnalyzing && (
            <div className="text-center py-4">
              <Brain className="w-8 h-8 text-indigo-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500 mb-3">AI will analyze as you document</p>
              <Button
                onClick={() => debouncedAnalyze(true)}
                disabled={!currentNoteText || currentNoteText.length < 30}
                className="bg-indigo-600 hover:bg-indigo-700"
                size="sm"
              >
                <Zap className="w-4 h-4 mr-1" />
                Analyze Now
              </Button>
            </div>
          )}

          {isAnalyzing && !cdsResults && (
            <div className="flex flex-col items-center justify-center py-6">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-2" />
              <p className="text-sm text-gray-600">Analyzing clinical data...</p>
            </div>
          )}

          {cdsResults && (
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-5 h-8 mb-3">
                <TabsTrigger value="alerts" className="text-xs px-1 relative">
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Alerts
                  {unacknowledgedCritical.length > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                      {unacknowledgedCritical.length}
                    </span>
                  )}
                </TabsTrigger>
                <TabsTrigger value="drugs" className="text-xs px-1">
                  <Pill className="w-3 h-3 mr-1" />
                  Drugs
                </TabsTrigger>
                <TabsTrigger value="vitals" className="text-xs px-1">
                  <HeartPulse className="w-3 h-3 mr-1" />
                  Vitals
                </TabsTrigger>
                <TabsTrigger value="recs" className="text-xs px-1">
                  <Stethoscope className="w-3 h-3 mr-1" />
                  Recs
                </TabsTrigger>
                <TabsTrigger value="risks" className="text-xs px-1">
                  <Activity className="w-3 h-3 mr-1" />
                  Risks
                </TabsTrigger>
              </TabsList>

              {/* Critical Alerts Tab */}
              <TabsContent value="alerts" className="space-y-2 mt-0">
                {cdsResults.critical_alerts?.length > 0 ? (
                  cdsResults.critical_alerts.map((alert, idx) => (
                    <Alert key={idx} className={`${getSeverityStyle(alert.severity)} border-l-4`}>
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-red-600 mt-0.5" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-sm">{alert.title}</span>
                            <Badge variant="outline" className="text-xs">{alert.alert_type}</Badge>
                          </div>
                          <p className="text-xs text-gray-700">{alert.description}</p>
                          <p className="text-xs text-gray-600 mt-1 italic">{alert.clinical_significance}</p>
                          {alert.immediate_actions?.length > 0 && (
                            <div className="mt-2">
                              <p className="text-xs font-medium text-red-800">Immediate Actions:</p>
                              <ul className="list-disc ml-4 text-xs text-gray-700">
                                {alert.immediate_actions.map((action, i) => (
                                  <li key={i}>{action}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          {!acknowledgedAlerts.includes(alert.id) && (
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-2 h-6 text-xs"
                              onClick={() => handleAcknowledge(alert.id)}
                            >
                              <CheckCircle2 className="w-3 h-3 mr-1" />
                              Acknowledge
                            </Button>
                          )}
                        </div>
                      </div>
                    </Alert>
                  ))
                ) : (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <AlertDescription className="text-xs text-green-800">
                      No critical alerts identified
                    </AlertDescription>
                  </Alert>
                )}

                {/* Differential Considerations */}
                {cdsResults.differential_considerations?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-gray-700 mb-1 flex items-center gap-1">
                      <FlaskConical className="w-3 h-3" />
                      Differential Considerations
                    </p>
                    {cdsResults.differential_considerations.map((diff, idx) => (
                      <div key={idx} className="bg-purple-50 p-2 rounded border border-purple-200 mb-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">{diff.condition}</span>
                          <Badge variant="outline" className="text-xs">{diff.urgency}</Badge>
                        </div>
                        <p className="text-xs text-gray-600 mt-1">
                          Supporting: {diff.supporting_findings?.join(', ')}
                        </p>
                        {diff.rule_out_with?.length > 0 && (
                          <p className="text-xs text-purple-700 mt-1">
                            Rule out with: {diff.rule_out_with.join(', ')}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Drug Safety Tab */}
              <TabsContent value="drugs" className="space-y-2 mt-0">
                {cdsResults.drug_safety?.interactions?.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold text-red-800 mb-1">Drug Interactions</p>
                    {cdsResults.drug_safety.interactions.map((di, idx) => (
                      <Alert key={idx} className={`mb-1 ${di.interaction_type === 'major' ? 'bg-red-50 border-red-300' : 'bg-yellow-50 border-yellow-300'}`}>
                        <Pill className="w-3 h-3" />
                        <AlertDescription className="text-xs">
                          <strong>{di.drugs?.join(' + ')}</strong>
                          <Badge variant="outline" className="ml-2 text-xs">{di.interaction_type}</Badge>
                          <p className="mt-1">{di.effect}</p>
                          <p className="text-gray-700 mt-1">→ {di.recommendation}</p>
                          {di.monitoring && <p className="text-gray-600 italic">Monitor: {di.monitoring}</p>}
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                ) : (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <AlertDescription className="text-xs">No drug interactions identified</AlertDescription>
                  </Alert>
                )}

                {cdsResults.drug_safety?.contraindications?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-orange-800 mb-1">Contraindications</p>
                    {cdsResults.drug_safety.contraindications.map((ci, idx) => (
                      <div key={idx} className="bg-orange-50 p-2 rounded border border-orange-200 mb-1">
                        <p className="text-xs font-medium">{ci.drug}</p>
                        <p className="text-xs text-gray-600">Contraindicated for: {ci.contraindicated_for}</p>
                        <p className="text-xs text-orange-700">{ci.reason}</p>
                        {ci.alternative && <p className="text-xs text-green-700">Alternative: {ci.alternative}</p>}
                      </div>
                    ))}
                  </div>
                )}

                {cdsResults.drug_safety?.allergy_concerns?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-red-800 mb-1">Allergy Concerns</p>
                    {cdsResults.drug_safety.allergy_concerns.map((ac, idx) => (
                      <Alert key={idx} className="bg-red-50 border-red-200 mb-1">
                        <AlertTriangle className="w-3 h-3 text-red-600" />
                        <AlertDescription className="text-xs">
                          <strong>Allergen: {ac.allergen}</strong>
                          <p>Watch for: {ac.related_medications?.join(', ')}</p>
                          <Badge className={ac.cross_reactivity_risk === 'high' ? 'bg-red-600' : 'bg-yellow-500'}>
                            {ac.cross_reactivity_risk} cross-reactivity risk
                          </Badge>
                        </AlertDescription>
                      </Alert>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Vitals Tab */}
              <TabsContent value="vitals" className="space-y-2 mt-0">
                <div className="flex items-center gap-2 mb-2">
                  <Badge className={getRiskColor(cdsResults.vital_sign_analysis?.current_status || 'stable')}>
                    {cdsResults.vital_sign_analysis?.current_status || 'stable'}
                  </Badge>
                </div>

                {cdsResults.vital_sign_analysis?.abnormal_findings?.length > 0 ? (
                  <div>
                    <p className="text-xs font-semibold text-red-800 mb-1">Abnormal Findings</p>
                    {cdsResults.vital_sign_analysis.abnormal_findings.map((af, idx) => (
                      <div key={idx} className={`p-2 rounded border mb-1 ${getSeverityStyle(af.concern_level)}`}>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">{af.vital}: {af.value}</span>
                          <span className="text-xs text-gray-500">Normal: {af.normal_range}</span>
                        </div>
                        <p className="text-xs text-gray-700 mt-1">{af.clinical_implication}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <AlertDescription className="text-xs">All vital signs within normal limits</AlertDescription>
                  </Alert>
                )}

                {cdsResults.vital_sign_analysis?.trend_analysis?.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-blue-800 mb-1 flex items-center gap-1">
                      <TrendingUp className="w-3 h-3" />
                      Trend Analysis
                    </p>
                    {cdsResults.vital_sign_analysis.trend_analysis.map((ta, idx) => (
                      <div key={idx} className="bg-blue-50 p-2 rounded border border-blue-200 mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium">{ta.vital}</span>
                          <Badge variant="outline" className="text-xs">{ta.trend}</Badge>
                        </div>
                        <p className="text-xs text-gray-600">{ta.significance}</p>
                        <p className="text-xs text-blue-700">Escalate if: {ta.action_threshold}</p>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Recommendations Tab */}
              <TabsContent value="recs" className="space-y-2 mt-0">
                {cdsResults.treatment_recommendations?.length > 0 ? (
                  cdsResults.treatment_recommendations.map((rec, idx) => (
                    <div key={idx} className="bg-green-50 p-2 rounded border border-green-200">
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-xs">{rec.category}</Badge>
                        <Badge className={rec.priority === 'high' ? 'bg-red-500' : rec.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'}>
                          {rec.priority}
                        </Badge>
                      </div>
                      <p className="text-xs font-medium">{rec.recommendation}</p>
                      <p className="text-xs text-gray-600 italic mt-1">{rec.rationale}</p>
                      {rec.insert_text && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 text-xs mt-1 text-green-700"
                          onClick={() => handleInsert(rec.insert_text)}
                        >
                          <Plus className="w-3 h-3 mr-1" />
                          Add to Note
                        </Button>
                      )}
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 text-center py-4">No specific recommendations at this time</p>
                )}

                {/* Missing Assessments */}
                {cdsResults.missing_assessments?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-orange-800 mb-1 flex items-center gap-1">
                      <FileWarning className="w-3 h-3" />
                      Missing Assessments
                    </p>
                    {cdsResults.missing_assessments.map((ma, idx) => (
                      <div key={idx} className="bg-orange-50 p-2 rounded border border-orange-200 mb-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-medium">{ma.assessment}</span>
                          <Badge variant="outline" className="text-xs">{ma.priority}</Badge>
                        </div>
                        <p className="text-xs text-gray-600">{ma.reason}</p>
                        {ma.template_text && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs mt-1"
                            onClick={() => handleInsert(ma.template_text)}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Template
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Care Plan Alignment */}
                {cdsResults.care_plan_alignment?.gaps_identified?.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-purple-800 mb-1">Care Plan Gaps</p>
                    {cdsResults.care_plan_alignment.gaps_identified.map((gap, idx) => (
                      <div key={idx} className="bg-purple-50 p-2 rounded border border-purple-200 mb-1">
                        <p className="text-xs font-medium">{gap.goal}</p>
                        <p className="text-xs text-gray-600">{gap.gap}</p>
                        {gap.suggested_documentation && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 text-xs mt-1 text-purple-700"
                            onClick={() => handleInsert(gap.suggested_documentation)}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            Add Documentation
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Risks Tab */}
              <TabsContent value="risks" className="space-y-2 mt-0">
                {cdsResults.preventive_alerts?.length > 0 ? (
                  cdsResults.preventive_alerts.map((pa, idx) => (
                    <div key={idx} className={`p-2 rounded border ${getSeverityStyle(pa.risk_level)}`}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium capitalize">{pa.risk_type} Risk</span>
                        <Badge className={getRiskColor(pa.risk_level)}>{pa.risk_level}</Badge>
                      </div>
                      <p className="text-xs text-gray-600">
                        Factors: {pa.risk_factors?.join(', ')}
                      </p>
                      {pa.preventive_actions?.length > 0 && (
                        <div className="mt-1">
                          <p className="text-xs font-medium text-gray-700">Preventive Actions:</p>
                          <ul className="list-disc ml-4 text-xs text-gray-600">
                            {pa.preventive_actions.map((action, i) => (
                              <li key={i}>{action}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                  ))
                ) : (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                    <AlertDescription className="text-xs">No elevated risk factors identified</AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </Tabs>
          )}

          {/* Clinical Summary */}
          {cdsResults?.clinical_summary && (
            <div className="mt-3 p-2 bg-gray-50 rounded border text-xs text-gray-700">
              <strong>Clinical Summary:</strong> {cdsResults.clinical_summary}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
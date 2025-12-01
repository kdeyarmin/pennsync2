import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  RefreshCw
} from "lucide-react";

export default function ClinicalDecisionSupport({
  enhancedNote,
  extractedData,
  diagnosis,
  careType,
  vitalSigns,
  onInsertRecommendation
}) {
  const [cdsAlerts, setCdsAlerts] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [lastAnalyzedText, setLastAnalyzedText] = useState("");

  // Auto-analyze when enhanced note changes significantly
  useEffect(() => {
    if (enhancedNote && enhancedNote.length > 100 && enhancedNote !== lastAnalyzedText) {
      // Debounce to avoid too many calls
      const timer = setTimeout(() => {
        if (enhancedNote.length > lastAnalyzedText.length + 50) {
          analyzeForCDS();
        }
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [enhancedNote]);

  const analyzeForCDS = async () => {
    if (!enhancedNote || enhancedNote.length < 50) return;

    setIsAnalyzing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a Clinical Decision Support AI for home health/hospice nursing. Analyze this clinical documentation and provide real-time safety alerts and recommendations.

PATIENT CONTEXT:
- Diagnosis: ${diagnosis || 'Not specified'}
- Care Type: ${careType === 'hospice' ? 'Hospice' : 'Home Health'}
- Vital Signs: ${JSON.stringify(vitalSigns || {})}

EXTRACTED DATA:
${extractedData ? JSON.stringify(extractedData, null, 2) : 'None available'}

CLINICAL DOCUMENTATION:
${enhancedNote}

Analyze for:
1. DRUG INTERACTIONS: Check medications mentioned for potential interactions
2. CONTRAINDICATIONS: Identify any treatments/medications contraindicated for the diagnosis
3. VITAL SIGN ALERTS: Flag any concerning vital sign values or trends
4. BEST PRACTICE DEVIATIONS: Note any care that deviates from evidence-based guidelines
5. MISSING ASSESSMENTS: Identify standard assessments that should be done but weren't documented
6. SUGGESTED DIAGNOSTICS: Recommend relevant tests or assessments to consider
7. INTERVENTION RECOMMENDATIONS: Suggest evidence-based interventions

Be specific and actionable. Only flag genuine clinical concerns, not minor documentation issues.

Return JSON:
{
  "risk_level": "high" | "moderate" | "low",
  "drug_interactions": [
    {
      "drugs": ["Drug A", "Drug B"],
      "interaction": "Description of interaction",
      "severity": "high" | "moderate" | "low",
      "recommendation": "What to do"
    }
  ],
  "contraindications": [
    {
      "item": "What is contraindicated",
      "reason": "Why it's contraindicated",
      "severity": "high" | "moderate" | "low"
    }
  ],
  "vital_sign_alerts": [
    {
      "vital": "Which vital sign",
      "value": "The value",
      "concern": "Why it's concerning",
      "action": "Recommended action"
    }
  ],
  "best_practice_alerts": [
    {
      "issue": "What deviates from best practice",
      "guideline": "The relevant guideline",
      "recommendation": "What should be done"
    }
  ],
  "suggested_diagnostics": [
    {
      "test": "Test name",
      "rationale": "Why this test is recommended",
      "priority": "high" | "medium" | "low"
    }
  ],
  "intervention_recommendations": [
    {
      "intervention": "Recommended intervention",
      "evidence": "Evidence supporting this",
      "priority": "high" | "medium" | "low"
    }
  ],
  "summary": "Brief overall clinical decision support summary"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            risk_level: { type: "string" },
            drug_interactions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  drugs: { type: "array", items: { type: "string" } },
                  interaction: { type: "string" },
                  severity: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            },
            contraindications: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item: { type: "string" },
                  reason: { type: "string" },
                  severity: { type: "string" }
                }
              }
            },
            vital_sign_alerts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  vital: { type: "string" },
                  value: { type: "string" },
                  concern: { type: "string" },
                  action: { type: "string" }
                }
              }
            },
            best_practice_alerts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  issue: { type: "string" },
                  guideline: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            },
            suggested_diagnostics: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  test: { type: "string" },
                  rationale: { type: "string" },
                  priority: { type: "string" }
                }
              }
            },
            intervention_recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  intervention: { type: "string" },
                  evidence: { type: "string" },
                  priority: { type: "string" }
                }
              }
            },
            summary: { type: "string" }
          }
        }
      });

      setCdsAlerts(result);
      setLastAnalyzedText(enhancedNote);
    } catch (error) {
      console.error("Error in CDS analysis:", error);
    }
    setIsAnalyzing(false);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRiskColor = (level) => {
    switch (level) {
      case 'high': return 'bg-red-600';
      case 'moderate': return 'bg-yellow-500';
      case 'low': return 'bg-green-500';
      default: return 'bg-gray-500';
    }
  };

  const hasAlerts = cdsAlerts && (
    cdsAlerts.drug_interactions?.length > 0 ||
    cdsAlerts.contraindications?.length > 0 ||
    cdsAlerts.vital_sign_alerts?.length > 0 ||
    cdsAlerts.best_practice_alerts?.length > 0
  );

  const totalAlerts = cdsAlerts ? (
    (cdsAlerts.drug_interactions?.length || 0) +
    (cdsAlerts.contraindications?.length || 0) +
    (cdsAlerts.vital_sign_alerts?.length || 0) +
    (cdsAlerts.best_practice_alerts?.length || 0)
  ) : 0;

  return (
    <Card className={`border-2 ${hasAlerts ? 'border-red-300' : 'border-purple-200'}`}>
      <CardHeader 
        className={`py-3 cursor-pointer ${hasAlerts ? 'bg-gradient-to-r from-red-50 to-orange-50' : 'bg-gradient-to-r from-purple-50 to-indigo-50'}`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className={`w-4 h-4 ${hasAlerts ? 'text-red-600' : 'text-purple-600'}`} />
            Clinical Decision Support
            {cdsAlerts && (
              <Badge className={`${getRiskColor(cdsAlerts.risk_level)} text-white text-xs`}>
                {cdsAlerts.risk_level} risk
              </Badge>
            )}
            {totalAlerts > 0 && (
              <Badge variant="destructive" className="text-xs">
                {totalAlerts} alert{totalAlerts !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-3 space-y-3">
          {!cdsAlerts && !isAnalyzing && (
            <Button
              onClick={analyzeForCDS}
              disabled={!enhancedNote || enhancedNote.length < 50}
              className="w-full bg-purple-600 hover:bg-purple-700"
              size="sm"
            >
              <ShieldAlert className="w-4 h-4 mr-2" />
              Analyze for Clinical Alerts
            </Button>
          )}

          {isAnalyzing && (
            <div className="flex items-center justify-center py-4 text-purple-600">
              <Loader2 className="w-5 h-5 animate-spin mr-2" />
              <span className="text-sm">Analyzing clinical data...</span>
            </div>
          )}

          {cdsAlerts && (
            <div className="space-y-3">
              {/* Drug Interactions */}
              {cdsAlerts.drug_interactions?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-800 mb-1 flex items-center gap-1">
                    <Pill className="w-3 h-3" /> Drug Interactions ({cdsAlerts.drug_interactions.length})
                  </p>
                  {cdsAlerts.drug_interactions.map((di, idx) => (
                    <Alert key={idx} className={`mb-1 ${getSeverityColor(di.severity)}`}>
                      <AlertTriangle className="w-3 h-3" />
                      <AlertDescription className="text-xs">
                        <strong>{di.drugs.join(' + ')}</strong>: {di.interaction}
                        <p className="mt-1 text-gray-700">→ {di.recommendation}</p>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {/* Contraindications */}
              {cdsAlerts.contraindications?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-orange-800 mb-1 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Contraindications ({cdsAlerts.contraindications.length})
                  </p>
                  {cdsAlerts.contraindications.map((ci, idx) => (
                    <Alert key={idx} className={`mb-1 ${getSeverityColor(ci.severity)}`}>
                      <AlertDescription className="text-xs">
                        <strong>{ci.item}</strong>: {ci.reason}
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {/* Vital Sign Alerts */}
              {cdsAlerts.vital_sign_alerts?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-red-800 mb-1 flex items-center gap-1">
                    <HeartPulse className="w-3 h-3" /> Vital Sign Alerts
                  </p>
                  {cdsAlerts.vital_sign_alerts.map((va, idx) => (
                    <div key={idx} className="bg-red-50 p-2 rounded border border-red-200 mb-1">
                      <p className="text-xs font-medium">{va.vital}: {va.value}</p>
                      <p className="text-xs text-gray-600">{va.concern}</p>
                      <p className="text-xs text-red-700 font-medium">→ {va.action}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Best Practice Alerts */}
              {cdsAlerts.best_practice_alerts?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-yellow-800 mb-1 flex items-center gap-1">
                    <Stethoscope className="w-3 h-3" /> Best Practice Deviations
                  </p>
                  {cdsAlerts.best_practice_alerts.map((bp, idx) => (
                    <div key={idx} className="bg-yellow-50 p-2 rounded border border-yellow-200 mb-1">
                      <p className="text-xs font-medium">{bp.issue}</p>
                      <p className="text-xs text-gray-600 italic">Guideline: {bp.guideline}</p>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-5 text-xs mt-1 text-yellow-800"
                        onClick={() => onInsertRecommendation && onInsertRecommendation(`\n\n[Best Practice Note: ${bp.recommendation}]`)}
                      >
                        + Add recommendation to note
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              {/* Suggested Diagnostics */}
              {cdsAlerts.suggested_diagnostics?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-blue-800 mb-1 flex items-center gap-1">
                    <FlaskConical className="w-3 h-3" /> Suggested Diagnostics
                  </p>
                  <div className="space-y-1">
                    {cdsAlerts.suggested_diagnostics.map((sd, idx) => (
                      <div key={idx} className="bg-blue-50 p-2 rounded border border-blue-200 flex items-start justify-between">
                        <div>
                          <p className="text-xs font-medium">{sd.test}</p>
                          <p className="text-xs text-gray-600">{sd.rationale}</p>
                        </div>
                        <Badge className={getSeverityColor(sd.priority)} variant="outline">
                          {sd.priority}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Intervention Recommendations */}
              {cdsAlerts.intervention_recommendations?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-800 mb-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Recommended Interventions
                  </p>
                  <div className="space-y-1">
                    {cdsAlerts.intervention_recommendations.map((ir, idx) => (
                      <div key={idx} className="bg-green-50 p-2 rounded border border-green-200">
                        <div className="flex items-start justify-between">
                          <p className="text-xs font-medium">{ir.intervention}</p>
                          <Badge className={getSeverityColor(ir.priority)} variant="outline">
                            {ir.priority}
                          </Badge>
                        </div>
                        <p className="text-xs text-gray-600 italic">{ir.evidence}</p>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 text-xs mt-1 text-green-800"
                          onClick={() => onInsertRecommendation && onInsertRecommendation(`\n\n[Intervention: ${ir.intervention}]`)}
                        >
                          + Add to note
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* No Alerts */}
              {!hasAlerts && cdsAlerts.suggested_diagnostics?.length === 0 && cdsAlerts.intervention_recommendations?.length === 0 && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-xs text-green-800">
                    No clinical alerts identified. Documentation appears to follow best practices.
                  </AlertDescription>
                </Alert>
              )}

              {/* Summary */}
              {cdsAlerts.summary && (
                <div className="bg-gray-50 p-2 rounded border text-xs text-gray-700">
                  <strong>Summary:</strong> {cdsAlerts.summary}
                </div>
              )}

              {/* Refresh Button */}
              <Button
                size="sm"
                variant="outline"
                className="w-full"
                onClick={analyzeForCDS}
                disabled={isAnalyzing}
              >
                <RefreshCw className="w-3 h-3 mr-1" />
                Re-analyze
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
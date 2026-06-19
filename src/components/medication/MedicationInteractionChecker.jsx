import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useAICall } from "@/hooks/useAICall";
import {
  Pill,
  AlertTriangle,
  Shield,
  Loader2,
  CheckCircle2,
  XCircle,
  Brain
} from "lucide-react";

export default function MedicationInteractionChecker({
  medications,
  patientDiagnoses,
  patientAge,
  patientAllergies,
  autoCheck = false
}) {
  const [analysis, setAnalysis] = useState(null);
  // Shared timeout/retry policy: this clinical safety check shouldn't hang
  // indefinitely or fail permanently on a transient network blip.
  const { run, loading, error } = useAICall({ timeoutMs: 30000, retries: 2 });

  const checkInteractions = useCallback(async () => {
    if (!medications || medications.length < 2) return;

    const medList = medications.map(m =>
      typeof m === 'string' ? m : `${m.name} ${m.dosage || ''} ${m.frequency || ''}`
    ).join(', ');

    try {
      const result = await run({
        prompt: `You are a clinical pharmacist AI. Analyze this medication regimen for interactions, contraindications, and safety concerns.

MEDICATIONS:
${medList}

PATIENT PROFILE:
- Diagnoses: ${patientDiagnoses?.join(', ') || 'Not specified'}
- Age: ${patientAge || 'Unknown'}
- Known Allergies: ${patientAllergies || 'None documented'}

Analyze for:
1. Drug-drug interactions (severity, mechanism, clinical significance)
2. Drug-disease contraindications
3. Duplicate therapy or therapeutic overlap
4. Dose appropriateness for age/condition
5. Allergy considerations
6. High-risk medications requiring monitoring

Return comprehensive analysis with:
- overall_risk: "low", "moderate", "high", "critical"
- critical_interactions: array of serious interactions requiring immediate action
- moderate_interactions: array of interactions requiring monitoring
- contraindications: array of drug-disease contraindications
- recommendations: specific actions to take
- monitoring_required: lab tests or assessments needed`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_risk: { type: "string" },
            total_issues: { type: "number" },
            critical_interactions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  drugs: { type: "string" },
                  interaction: { type: "string" },
                  clinical_effect: { type: "string" },
                  action_required: { type: "string" }
                }
              }
            },
            moderate_interactions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  drugs: { type: "string" },
                  interaction: { type: "string" },
                  monitoring: { type: "string" }
                }
              }
            },
            contraindications: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  medication: { type: "string" },
                  condition: { type: "string" },
                  reason: { type: "string" },
                  alternative: { type: "string" }
                }
              }
            },
            duplicate_therapy: {
              type: "array",
              items: { type: "string" }
            },
            recommendations: {
              type: "array",
              items: { type: "string" }
            },
            monitoring_required: {
              type: "array",
              items: { type: "string" }
            },
            summary: { type: "string" }
          }
        }
      });

      setAnalysis(result);
    } catch (err) {
      // The hook records the error in `error`; we surface it in the UI below.
      console.error('Medication check error:', err);
    }
  }, [medications, patientDiagnoses, patientAge, patientAllergies, run]);

  useEffect(() => {
    if (autoCheck && medications?.length >= 2) {
      checkInteractions();
    }
  }, [autoCheck, medications, checkInteractions]);

  if (!medications || medications.length === 0) {
    return (
      <Alert className="bg-slate-50 border-slate-200">
        <Pill className="w-4 h-4 text-slate-400" />
        <AlertDescription className="text-sm text-slate-600">
          No medications documented to analyze
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-2 border-purple-300">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Pill className="w-5 h-5 text-purple-600" />
          AI Medication Safety Analysis
          {analysis && (
            <Badge className={`ml-auto ${
              analysis.overall_risk === 'critical' ? 'bg-red-600' :
              analysis.overall_risk === 'high' ? 'bg-orange-600' :
              analysis.overall_risk === 'moderate' ? 'bg-yellow-600' :
              'bg-green-600'
            }`}>
              {analysis.overall_risk?.toUpperCase()}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <div className="text-sm text-slate-600">
          <p className="font-medium mb-1">Analyzing {medications.length} medications</p>
          <div className="text-xs space-y-0.5">
            {medications.slice(0, 5).map((med, idx) => (
              <div key={idx}>• {typeof med === 'string' ? med : med.name}</div>
            ))}
            {medications.length > 5 && (
              <div className="text-slate-500">+ {medications.length - 5} more...</div>
            )}
          </div>
        </div>

        {!analysis && !loading && (
          <Button
            onClick={checkInteractions}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            <Brain className="w-4 h-4 mr-2" />
            Check for Interactions & Contraindications
          </Button>
        )}

        {loading && (
          <div className="text-center py-6">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-slate-600">Analyzing medication safety...</p>
          </div>
        )}

        {analysis && (
          <>
            {/* Summary */}
            {analysis.summary && (
              <Alert className={`${
                analysis.overall_risk === 'critical' || analysis.overall_risk === 'high'
                  ? 'bg-red-50 border-red-300'
                  : analysis.overall_risk === 'moderate'
                  ? 'bg-yellow-50 border-yellow-300'
                  : 'bg-green-50 border-green-300'
              }`}>
                <Shield className="w-4 h-4" />
                <AlertDescription className="text-sm">
                  {analysis.summary}
                </AlertDescription>
              </Alert>
            )}

            {/* Critical Interactions */}
            {analysis.critical_interactions?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-red-900 mb-2 flex items-center gap-2">
                  <XCircle className="w-4 h-4" />
                  Critical Interactions ({analysis.critical_interactions.length})
                </p>
                <div className="space-y-2">
                  {analysis.critical_interactions.map((interaction, idx) => (
                    <div key={idx} className="p-3 bg-red-50 border border-red-300 rounded-lg">
                      <p className="text-sm font-medium text-red-900">{interaction.drugs}</p>
                      <p className="text-xs text-red-800 mt-1">
                        <strong>Interaction:</strong> {interaction.interaction}
                      </p>
                      <p className="text-xs text-red-800 mt-1">
                        <strong>Clinical Effect:</strong> {interaction.clinical_effect}
                      </p>
                      <div className="mt-2 p-2 bg-red-100 rounded">
                        <p className="text-xs font-semibold text-red-900">⚠️ Action Required:</p>
                        <p className="text-xs text-red-800">{interaction.action_required}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contraindications */}
            {analysis.contraindications?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-orange-900 mb-2">
                  Drug-Disease Contraindications ({analysis.contraindications.length})
                </p>
                <div className="space-y-2">
                  {analysis.contraindications.map((contra, idx) => (
                    <div key={idx} className="p-3 bg-orange-50 border border-orange-300 rounded-lg">
                      <p className="text-sm font-medium text-orange-900">{contra.medication}</p>
                      <p className="text-xs text-orange-800 mt-1">
                        <strong>Contraindicated for:</strong> {contra.condition}
                      </p>
                      <p className="text-xs text-orange-800">{contra.reason}</p>
                      {contra.alternative && (
                        <p className="text-xs text-orange-700 mt-1">
                          <strong>Alternative:</strong> {contra.alternative}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Moderate Interactions */}
            {analysis.moderate_interactions?.length > 0 && (
              <div>
                <p className="text-sm font-semibold text-yellow-900 mb-2">
                  Moderate Interactions ({analysis.moderate_interactions.length})
                </p>
                <div className="space-y-2">
                  {analysis.moderate_interactions.map((interaction, idx) => (
                    <div key={idx} className="p-2 bg-yellow-50 border border-yellow-200 rounded">
                      <p className="text-xs font-medium text-yellow-900">{interaction.drugs}</p>
                      <p className="text-xs text-yellow-800">{interaction.interaction}</p>
                      {interaction.monitoring && (
                        <p className="text-xs text-yellow-700 mt-1">
                          <strong>Monitor:</strong> {interaction.monitoring}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Duplicate Therapy */}
            {analysis.duplicate_therapy?.length > 0 && (
              <Alert className="bg-blue-50 border-blue-300">
                <AlertTriangle className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-sm">
                  <p className="font-semibold text-blue-900 mb-1">Duplicate Therapy Identified</p>
                  {analysis.duplicate_therapy.map((dup, idx) => (
                    <p key={idx} className="text-xs text-blue-800">• {dup}</p>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            {/* Recommendations */}
            {analysis.recommendations?.length > 0 && (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <p className="text-sm font-semibold text-blue-900 mb-2">Recommendations</p>
                <ul className="text-xs space-y-1 text-blue-800">
                  {analysis.recommendations.map((rec, idx) => (
                    <li key={idx}>• {rec}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Monitoring Required */}
            {analysis.monitoring_required?.length > 0 && (
              <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                <p className="text-sm font-semibold text-purple-900 mb-2">Monitoring Required</p>
                <ul className="text-xs space-y-1 text-purple-800">
                  {analysis.monitoring_required.map((mon, idx) => (
                    <li key={idx}>• {mon}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* All Clear — derive from the actual issue arrays rather than the
                optional total_issues field, which the prompt never asks the model
                to populate (so it's frequently absent even on a clean regimen). */}
            {((analysis.critical_interactions?.length || 0) +
              (analysis.moderate_interactions?.length || 0) +
              (analysis.contraindications?.length || 0) +
              (analysis.duplicate_therapy?.length || 0)) === 0 && (
              <Alert className="bg-green-50 border-green-300">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-sm text-green-800">
                  ✅ No significant interactions or contraindications identified
                </AlertDescription>
              </Alert>
            )}
          </>
        )}

        {error && (
          <Alert className="bg-red-50 border-red-300">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-sm text-red-800">
              Analysis failed: {error.message}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}

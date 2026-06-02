import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Pill, 
  Loader2, 
  AlertTriangle,
  TrendingDown,
  Lightbulb,
  Plus
} from "lucide-react";

export default function MedicationAdherenceInsights({ 
  narrativeText,
  diagnosis,
  onInsertIntervention
}) {
  const [insights, setInsights] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const analyzeAdherence = async () => {
    if (!narrativeText || narrativeText.length < 50) {
      alert("Please enter documentation to analyze.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a clinical pharmacist AI specializing in medication adherence analysis for home health patients.

PATIENT DIAGNOSIS: ${diagnosis || 'Not specified'}

NURSING DOCUMENTATION:
${narrativeText}

Analyze the documentation for medication-related information and identify:
1. Adherence issues or barriers
2. Knowledge gaps about medications
3. Side effect concerns
4. Drug interactions risks
5. Cost/access barriers
6. Complex regimen issues

Provide targeted interventions for each identified issue.

Return JSON:
{
  "medications_mentioned": ["List of medications found in notes"],
  "adherence_status": "good" | "partial" | "poor" | "unknown",
  "identified_issues": [
    {
      "issue_type": "knowledge_gap" | "side_effects" | "cost_barrier" | "complex_regimen" | "forgetting" | "intentional_non_adherence",
      "description": "Description of the issue",
      "severity": "high" | "medium" | "low",
      "evidence": "What in the note indicates this"
    }
  ],
  "recommended_interventions": [
    {
      "intervention": "Specific intervention",
      "target_issue": "Which issue this addresses",
      "documentation_text": "Ready-to-insert documentation text"
    }
  ],
  "education_needs": [
    {
      "topic": "Education topic",
      "key_points": ["Point 1", "Point 2"],
      "teach_back_question": "Question to verify understanding"
    }
  ],
  "follow_up_recommendations": [
    "Follow-up recommendation"
  ],
  "drug_interaction_alerts": [
    {
      "medications": ["Med 1", "Med 2"],
      "interaction": "Description of interaction",
      "recommendation": "Clinical recommendation"
    }
  ]
}`,
        response_json_schema: {
          type: "object",
          properties: {
            medications_mentioned: { type: "array", items: { type: "string" } },
            adherence_status: { type: "string" },
            identified_issues: { type: "array", items: { type: "object" } },
            recommended_interventions: { type: "array", items: { type: "object" } },
            education_needs: { type: "array", items: { type: "object" } },
            follow_up_recommendations: { type: "array", items: { type: "string" } },
            drug_interaction_alerts: { type: "array", items: { type: "object" } }
          }
        }
      });

      setInsights(result);
    } catch (error) {
      console.error("Error analyzing adherence:", error);
      alert("Error analyzing. Please try again.");
    }
    setIsAnalyzing(false);
  };

  const getStatusColor = (status) => {
    const colors = {
      good: "bg-green-100 text-green-800",
      partial: "bg-yellow-100 text-yellow-800",
      poor: "bg-red-100 text-red-800",
      unknown: "bg-slate-100 text-slate-800"
    };
    return colors[status] || colors.unknown;
  };

  const getSeverityColor = (severity) => {
    const colors = {
      high: "bg-red-100 text-red-800",
      medium: "bg-yellow-100 text-yellow-800",
      low: "bg-blue-100 text-blue-800"
    };
    return colors[severity] || "bg-slate-100 text-slate-800";
  };

  const getIssueIcon = (type) => {
    switch (type) {
      case "knowledge_gap":
        return <Lightbulb className="w-3 h-3" />;
      case "side_effects":
        return <AlertTriangle className="w-3 h-3" />;
      case "cost_barrier":
        return <TrendingDown className="w-3 h-3" />;
      default:
        return <Pill className="w-3 h-3" />;
    }
  };

  return (
    <Card className="border-pink-200">
      <CardHeader className="py-3 bg-gradient-to-r from-pink-50 to-rose-50">
        <CardTitle className="text-sm flex items-center gap-2">
          <Pill className="w-4 h-4 text-pink-600" />
          Medication Adherence Insights
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        {!insights ? (
          <Button
            onClick={analyzeAdherence}
            disabled={isAnalyzing || !narrativeText}
            className="w-full bg-pink-600 hover:bg-pink-700"
            size="sm"
          >
            {isAnalyzing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
            ) : (
              <><Pill className="w-4 h-4 mr-2" /> Analyze Medication Adherence</>
            )}
          </Button>
        ) : (
          <div className="space-y-3 max-h-80 overflow-y-auto">
            {/* Adherence Status */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold">Adherence Status:</span>
              <Badge className={getStatusColor(insights.adherence_status)}>
                {insights.adherence_status?.charAt(0).toUpperCase() + insights.adherence_status?.slice(1)}
              </Badge>
            </div>

            {/* Medications Found */}
            {insights.medications_mentioned?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1">Medications Identified:</p>
                <div className="flex flex-wrap gap-1">
                  {insights.medications_mentioned.map((med, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {med}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Drug Interaction Alerts */}
            {insights.drug_interaction_alerts?.length > 0 && (
              <Alert className="py-2 bg-red-50 border-red-200">
                <AlertTriangle className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-xs">
                  <strong>Drug Interaction Alerts:</strong>
                  {insights.drug_interaction_alerts.map((alert, idx) => (
                    <div key={idx} className="mt-1">
                      <strong>{alert.medications?.join(' + ')}:</strong> {alert.interaction}
                    </div>
                  ))}
                </AlertDescription>
              </Alert>
            )}

            {/* Identified Issues */}
            {insights.identified_issues?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-600 mb-1">Issues Identified:</p>
                {insights.identified_issues.map((issue, idx) => (
                  <div key={idx} className="bg-orange-50 p-2 rounded border border-orange-200 mb-1">
                    <div className="flex items-center gap-2 mb-1">
                      {getIssueIcon(issue.issue_type)}
                      <span className="text-xs font-medium capitalize">{issue.issue_type.replace(/_/g, ' ')}</span>
                      <Badge className={`${getSeverityColor(issue.severity)} text-xs`}>
                        {issue.severity}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-700">{issue.description}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Recommended Interventions */}
            {insights.recommended_interventions?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-green-700 mb-1">Recommended Interventions:</p>
                {insights.recommended_interventions.map((int, idx) => (
                  <div key={idx} className="bg-green-50 p-2 rounded border border-green-200 mb-1 group">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <p className="text-xs font-medium">{int.intervention}</p>
                        <p className="text-xs text-slate-500">Addresses: {int.target_issue}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
                        onClick={() => onInsertIntervention && onInsertIntervention(int.documentation_text)}
                      >
                        <Plus className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Education Needs */}
            {insights.education_needs?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-blue-700 mb-1">Education Needs:</p>
                {insights.education_needs.map((edu, idx) => (
                  <div key={idx} className="bg-blue-50 p-2 rounded text-xs mb-1">
                    <strong>{edu.topic}</strong>
                    <ul className="list-disc ml-4 mt-1">
                      {edu.key_points?.map((point, pidx) => (
                        <li key={pidx}>{point}</li>
                      ))}
                    </ul>
                    {edu.teach_back_question && (
                      <p className="mt-1 italic text-slate-600">
                        Teach-back: "{edu.teach_back_question}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}

            <Button
              size="sm"
              variant="outline"
              className="w-full text-xs"
              onClick={() => setInsights(null)}
            >
              Re-analyze
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
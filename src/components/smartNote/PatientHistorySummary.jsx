import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  FileText, 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  AlertTriangle,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export default function PatientHistorySummary({ 
  patientId, 
  patientName,
  diagnosis,
  previousVisits = [],
  carePlans = [],
  onInsertSummary
}) {
  const [summary, setSummary] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const generateSummary = async () => {
    if (!patientId && previousVisits.length === 0) {
      alert("No patient history available to summarize.");
      return;
    }

    setIsGenerating(true);
    try {
      const visitNotes = previousVisits.slice(0, 5).map(v => ({
        date: v.visit_date,
        type: v.visit_type,
        notes: v.nurse_notes?.substring(0, 500) || "No notes",
        vitals: v.vital_signs
      }));

      const carePlanSummary = carePlans.map(cp => ({
        problem: cp.problem,
        goal: cp.goal,
        status: cp.status
      }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a clinical AI assistant. Generate an intelligent summary of this patient's history to help the nurse prepare for documentation.

PATIENT: ${patientName || 'Unknown'}
DIAGNOSIS: ${diagnosis || 'Not specified'}

RECENT VISITS (last 5):
${JSON.stringify(visitNotes, null, 2)}

ACTIVE CARE PLANS:
${JSON.stringify(carePlanSummary, null, 2)}

Generate a comprehensive but concise summary including:
1. Key clinical trends (improving, stable, declining)
2. Unresolved issues from previous visits
3. Care plan progress highlights
4. Areas requiring attention today
5. Recommended focus areas for this visit

Return JSON:
{
  "overall_status": "improving" | "stable" | "declining" | "mixed",
  "key_summary": "2-3 sentence overview",
  "trends": [
    {
      "area": "Clinical area",
      "trend": "improving" | "stable" | "declining",
      "detail": "Brief explanation"
    }
  ],
  "unresolved_issues": ["Issue 1", "Issue 2"],
  "care_plan_highlights": ["Highlight 1", "Highlight 2"],
  "focus_areas": ["Focus 1", "Focus 2"],
  "suggested_narrative_intro": "A ready-to-use opening paragraph for today's note"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_status: { type: "string" },
            key_summary: { type: "string" },
            trends: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  area: { type: "string" },
                  trend: { type: "string" },
                  detail: { type: "string" }
                }
              }
            },
            unresolved_issues: { type: "array", items: { type: "string" } },
            care_plan_highlights: { type: "array", items: { type: "string" } },
            focus_areas: { type: "array", items: { type: "string" } },
            suggested_narrative_intro: { type: "string" }
          }
        }
      });

      setSummary(result);
      setIsExpanded(true);
    } catch (error) {
      console.error("Error generating summary:", error);
      alert("Error generating summary. Please try again.");
    }
    setIsGenerating(false);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "improving":
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case "declining":
        return <TrendingDown className="w-4 h-4 text-red-600" />;
      case "stable":
        return <CheckCircle2 className="w-4 h-4 text-blue-600" />;
      default:
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "improving":
        return "bg-green-100 text-green-800 border-green-300";
      case "declining":
        return "bg-red-100 text-red-800 border-red-300";
      case "stable":
        return "bg-blue-100 text-blue-800 border-blue-300";
      default:
        return "bg-yellow-100 text-yellow-800 border-yellow-300";
    }
  };

  return (
    <Card className="border-indigo-200">
      <CardHeader className="py-3 bg-gradient-to-r from-indigo-50 to-purple-50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-indigo-600" />
            Patient History Summary
          </CardTitle>
          {summary && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-6 w-6 p-0"
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-3">
        {!summary ? (
          <Button
            onClick={generateSummary}
            disabled={isGenerating}
            className="w-full bg-indigo-600 hover:bg-indigo-700"
            size="sm"
          >
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing History...</>
            ) : (
              <><FileText className="w-4 h-4 mr-2" /> Generate Summary</>
            )}
          </Button>
        ) : isExpanded && (
          <div className="space-y-3">
            {/* Overall Status */}
            <div className="flex items-center gap-2">
              {getStatusIcon(summary.overall_status)}
              <Badge className={getStatusColor(summary.overall_status)}>
                {summary.overall_status?.charAt(0).toUpperCase() + summary.overall_status?.slice(1)}
              </Badge>
            </div>

            {/* Key Summary */}
            <p className="text-sm text-gray-700">{summary.key_summary}</p>

            {/* Trends */}
            {summary.trends?.length > 0 && (
              <div className="space-y-1">
                <p className="text-xs font-semibold text-gray-600">Trends:</p>
                {summary.trends.map((trend, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    {getStatusIcon(trend.trend)}
                    <span><strong>{trend.area}:</strong> {trend.detail}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Unresolved Issues */}
            {summary.unresolved_issues?.length > 0 && (
              <Alert className="py-2 bg-yellow-50 border-yellow-200">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <AlertDescription className="text-xs">
                  <strong>Unresolved:</strong> {summary.unresolved_issues.join(", ")}
                </AlertDescription>
              </Alert>
            )}

            {/* Focus Areas */}
            {summary.focus_areas?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-gray-600 mb-1">Focus Today:</p>
                <div className="flex flex-wrap gap-1">
                  {summary.focus_areas.map((area, idx) => (
                    <Badge key={idx} variant="outline" className="text-xs">
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Insert Intro Button */}
            {summary.suggested_narrative_intro && (
              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                onClick={() => onInsertSummary(summary.suggested_narrative_intro)}
              >
                Insert Suggested Opening
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
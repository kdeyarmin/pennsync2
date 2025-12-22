import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sparkles,
  AlertTriangle,
  DollarSign,
  CheckCircle2,
  TrendingUp,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { Button } from "@/components/ui/button";

export default function OASISExecutiveSummary({ analysisResults, pdgmData }) {
  const [summary, setSummary] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  useEffect(() => {
    if (analysisResults && pdgmData) {
      generateExecutiveSummary();
    }
  }, [analysisResults, pdgmData]);

  const generateExecutiveSummary = async () => {
    setIsGenerating(true);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a concise executive summary of this OASIS analysis. Extract ONLY the most critical insights.

ANALYSIS DATA:
- Overall Score: ${analysisResults.overall_score}%
- Compliance Score: ${analysisResults.compliance_score}%
- Revenue Score: ${analysisResults.revenue_optimization_score}%
- Accuracy Score: ${analysisResults.accuracy_score}%

COMPLIANCE ISSUES:
${JSON.stringify(analysisResults.compliance_concerns?.slice(0, 3) || [], null, 2)}

REVENUE OPPORTUNITIES:
${JSON.stringify(analysisResults.revenue_tips?.slice(0, 3) || [], null, 2)}

ACCURACY ISSUES:
${JSON.stringify(analysisResults.accuracy_issues?.slice(0, 3) || [], null, 2)}

Create a concise executive summary with:
1. One-sentence overall assessment
2. Top 3 critical actions (max 15 words each)
3. Top 2 revenue opportunities (max 15 words each)  
4. Top 2 compliance risks (max 15 words each)
5. Bottom line impact statement (1 sentence)

Be EXTREMELY concise and actionable.`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_assessment: { type: "string" },
            critical_actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  urgency: { type: "string" },
                  impact: { type: "string" }
                }
              }
            },
            revenue_highlights: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  opportunity: { type: "string" },
                  value: { type: "string" }
                }
              }
            },
            compliance_risks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  risk: { type: "string" },
                  severity: { type: "string" }
                }
              }
            },
            bottom_line: { type: "string" }
          }
        }
      });

      setSummary(result);
    } catch (error) {
      console.error("Summary generation error:", error);
    }

    setIsGenerating(false);
  };

  if (!analysisResults || isGenerating) {
    return isGenerating ? (
      <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-pink-50">
        <CardContent className="p-6 text-center">
          <Loader2 className="w-8 h-8 text-purple-600 mx-auto mb-3 animate-spin" />
          <p className="text-sm text-purple-900">Generating executive summary...</p>
        </CardContent>
      </Card>
    ) : null;
  }

  if (!summary) return null;

  return (
    <Card className="border-2 border-purple-400 bg-gradient-to-r from-purple-50 to-pink-50">
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            Executive Summary
            <Badge className="bg-purple-600 text-white">AI-Generated</Badge>
          </CardTitle>
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="space-y-4">
          {/* Overall Assessment */}
          <Alert className="bg-white border-purple-300">
            <FileText className="w-4 h-4 text-purple-600" />
            <AlertDescription className="text-purple-900 font-medium">
              {summary.overall_assessment}
            </AlertDescription>
          </Alert>

          {/* Critical Actions */}
          {summary.critical_actions?.length > 0 && (
            <div className="bg-white rounded-lg border-2 border-red-300 p-4">
              <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Critical Actions Required
              </h3>
              <div className="space-y-2">
                {summary.critical_actions.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-red-50 rounded border border-red-200">
                    <span className="bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0 mt-0.5">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-red-900">{item.action}</p>
                      <div className="flex gap-2 mt-1">
                        <Badge className="text-xs bg-orange-100 text-orange-800">
                          {item.urgency}
                        </Badge>
                        {item.impact && (
                          <span className="text-xs text-red-700">{item.impact}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Revenue Highlights */}
          {summary.revenue_highlights?.length > 0 && (
            <div className="bg-white rounded-lg border-2 border-green-300 p-4">
              <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                <DollarSign className="w-4 h-4" />
                Revenue Optimization
              </h3>
              <div className="space-y-2">
                {summary.revenue_highlights.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-green-50 rounded border border-green-200">
                    <TrendingUp className="w-4 h-4 text-green-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-green-900">{item.opportunity}</p>
                      {item.value && (
                        <Badge className="text-xs bg-green-600 text-white mt-1">
                          {item.value}
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compliance Risks */}
          {summary.compliance_risks?.length > 0 && (
            <div className="bg-white rounded-lg border-2 border-orange-300 p-4">
              <h3 className="font-semibold text-orange-900 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Compliance Risks
              </h3>
              <div className="space-y-2">
                {summary.compliance_risks.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-orange-50 rounded border border-orange-200">
                    <span className="text-orange-600 flex-shrink-0 mt-0.5">⚠️</span>
                    <div className="flex-1">
                      <p className="text-sm text-orange-900">{item.risk}</p>
                      <Badge className={`text-xs mt-1 ${
                        item.severity === 'high' ? 'bg-red-100 text-red-800' :
                        item.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-blue-100 text-blue-800'
                      }`}>
                        {item.severity} severity
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Line */}
          <Alert className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-300">
            <CheckCircle2 className="w-4 h-4 text-indigo-600" />
            <AlertDescription>
              <p className="text-sm font-semibold text-indigo-900">Bottom Line:</p>
              <p className="text-sm text-indigo-800 mt-1">{summary.bottom_line}</p>
            </AlertDescription>
          </Alert>
        </CardContent>
      )}
    </Card>
  );
}
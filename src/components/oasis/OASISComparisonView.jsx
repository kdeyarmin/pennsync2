import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  GitCompare,
  TrendingUp,
  TrendingDown,
  Minus,
  Loader2,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ChevronDown,
  ChevronUp,
  BarChart3
} from "lucide-react";

export default function OASISComparisonView({ availableReports = [], onClose }) {
  const [selectedReports, setSelectedReports] = useState([]);
  const [isComparing, setIsComparing] = useState(false);
  const [comparisonResult, setComparisonResult] = useState(null);
  const [aiInsights, setAiInsights] = useState(null);
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});

  const toggleReportSelection = (index) => {
    setSelectedReports(prev => {
      if (prev.includes(index)) {
        return prev.filter(i => i !== index);
      }
      return [...prev, index];
    });
    setComparisonResult(null);
    setAiInsights(null);
  };

  const getScoreDiff = (score1, score2) => {
    const diff = score2 - score1;
    if (diff > 0) return { value: `+${diff}`, color: "text-green-600", icon: TrendingUp };
    if (diff < 0) return { value: `${diff}`, color: "text-red-600", icon: TrendingDown };
    return { value: "0", color: "text-gray-500", icon: Minus };
  };

  const compareReports = () => {
    if (selectedReports.length < 2) return;

    setIsComparing(true);
    
    const reports = selectedReports.map(idx => availableReports[idx]);
    
    // Build comparison data
    const comparison = {
      reports: reports.map((r, idx) => ({
        name: r.fileName || `Report ${idx + 1}`,
        ...r.result
      })),
      scoreDifferences: {},
      issueChanges: {
        accuracy: [],
        compliance: [],
        revenue: [],
        audit: []
      }
    };

    // Calculate score differences between consecutive reports
    for (let i = 1; i < reports.length; i++) {
      const prev = reports[i - 1].result;
      const curr = reports[i].result;
      
      comparison.scoreDifferences[`${i-1}_to_${i}`] = {
        overall: getScoreDiff(prev.overall_score, curr.overall_score),
        accuracy: getScoreDiff(prev.accuracy_score, curr.accuracy_score),
        compliance: getScoreDiff(prev.compliance_score, curr.compliance_score),
        revenue: getScoreDiff(prev.revenue_optimization_score, curr.revenue_optimization_score)
      };
    }

    // Track issue changes
    const prevIssues = new Set(reports[0].result.accuracy_issues?.map(i => i.item) || []);
    const currIssues = new Set(reports[reports.length - 1].result.accuracy_issues?.map(i => i.item) || []);
    
    comparison.issueChanges.accuracy = {
      resolved: [...prevIssues].filter(i => !currIssues.has(i)),
      new: [...currIssues].filter(i => !prevIssues.has(i)),
      persistent: [...prevIssues].filter(i => currIssues.has(i))
    };

    setComparisonResult(comparison);
    setIsComparing(false);
  };

  const generateAIInsights = async () => {
    if (!comparisonResult) return;

    setIsGeneratingInsights(true);
    try {
      const reportsData = comparisonResult.reports.map(r => ({
        name: r.name,
        overall_score: r.overall_score,
        accuracy_score: r.accuracy_score,
        compliance_score: r.compliance_score,
        revenue_score: r.revenue_optimization_score,
        summary: r.summary,
        accuracy_issues_count: r.accuracy_issues?.length || 0,
        compliance_concerns_count: r.compliance_concerns?.length || 0,
        revenue_tips_count: r.revenue_tips?.length || 0,
        audit_risks_count: r.audit_risk_areas?.length || 0,
        key_recommendations: r.key_recommendations?.slice(0, 3) || []
      }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert OASIS analyst. Compare these ${reportsData.length} OASIS analysis reports and provide insights.

REPORTS DATA:
${JSON.stringify(reportsData, null, 2)}

Analyze the trends and provide:
1. Overall trend assessment (improving, declining, or stable)
2. Key areas of improvement
3. Areas needing attention
4. Specific actionable recommendations based on the comparison
5. Risk assessment changes

Return JSON:
{
  "overall_trend": "improving" | "declining" | "stable",
  "trend_summary": "2-3 sentence summary of the overall trend",
  "improvements": ["List of areas that improved"],
  "concerns": ["List of areas that got worse or need attention"],
  "persistent_issues": ["Issues that appear across multiple reports"],
  "recommendations": ["Top 5 actionable recommendations based on comparison"],
  "risk_assessment": {
    "level": "low" | "medium" | "high",
    "explanation": "Brief explanation of risk level"
  },
  "notable_changes": ["List of most significant changes between reports"]
}`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_trend: { type: "string" },
            trend_summary: { type: "string" },
            improvements: { type: "array", items: { type: "string" } },
            concerns: { type: "array", items: { type: "string" } },
            persistent_issues: { type: "array", items: { type: "string" } },
            recommendations: { type: "array", items: { type: "string" } },
            risk_assessment: { type: "object" },
            notable_changes: { type: "array", items: { type: "string" } }
          }
        }
      });

      setAiInsights(result);
    } catch (error) {
      console.error("Error generating insights:", error);
    }
    setIsGeneratingInsights(false);
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getScoreColor = (score) => {
    if (score >= 80) return "text-green-600 bg-green-100";
    if (score >= 60) return "text-yellow-600 bg-yellow-100";
    return "text-red-600 bg-red-100";
  };

  const getTrendIcon = (trend) => {
    if (trend === 'improving') return <TrendingUp className="w-5 h-5 text-green-600" />;
    if (trend === 'declining') return <TrendingDown className="w-5 h-5 text-red-600" />;
    return <Minus className="w-5 h-5 text-gray-500" />;
  };

  const getTrendColor = (trend) => {
    if (trend === 'improving') return "bg-green-100 border-green-300 text-green-800";
    if (trend === 'declining') return "bg-red-100 border-red-300 text-red-800";
    return "bg-gray-100 border-gray-300 text-gray-800";
  };

  return (
    <Card className="border-2 border-purple-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <GitCompare className="w-5 h-5 text-purple-600" />
          Compare OASIS Reports
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Report Selection */}
        {availableReports.length < 2 ? (
          <Alert className="bg-yellow-50 border-yellow-200">
            <AlertTriangle className="w-4 h-4 text-yellow-600" />
            <AlertDescription>
              You need at least 2 analyzed reports to compare. Use batch analysis to process multiple documents first.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">
                Select reports to compare ({selectedReports.length} selected)
              </p>
              <ScrollArea className="h-40 rounded border p-2">
                <div className="space-y-2">
                  {availableReports.map((report, idx) => (
                    <div
                      key={idx}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-colors ${
                        selectedReports.includes(idx) 
                          ? 'bg-purple-50 border border-purple-200' 
                          : 'hover:bg-gray-50 border border-transparent'
                      }`}
                      onClick={() => toggleReportSelection(idx)}
                    >
                      <Checkbox 
                        checked={selectedReports.includes(idx)}
                        onCheckedChange={() => toggleReportSelection(idx)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{report.fileName}</p>
                        {report.result && (
                          <p className="text-xs text-gray-500">
                            Score: {report.result.overall_score}%
                          </p>
                        )}
                      </div>
                      {report.result && (
                        <Badge className={getScoreColor(report.result.overall_score)}>
                          {report.result.overall_score}%
                        </Badge>
                      )}
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>

            <Button
              onClick={compareReports}
              disabled={selectedReports.length < 2 || isComparing}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {isComparing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Comparing...</>
              ) : (
                <><GitCompare className="w-4 h-4 mr-2" /> Compare {selectedReports.length} Reports</>
              )}
            </Button>
          </>
        )}

        {/* Comparison Results */}
        {comparisonResult && (
          <div className="space-y-4 pt-4 border-t">
            {/* Score Comparison Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Metric</th>
                    {comparisonResult.reports.map((r, idx) => (
                      <th key={idx} className="text-center py-2 px-2 min-w-[80px]">
                        <span className="text-xs truncate block max-w-[100px]">{r.name}</span>
                      </th>
                    ))}
                    <th className="text-center py-2 px-2">Change</th>
                  </tr>
                </thead>
                <tbody>
                  {['overall', 'accuracy', 'compliance', 'revenue'].map(metric => {
                    const labels = {
                      overall: 'Overall',
                      accuracy: 'Accuracy',
                      compliance: 'Compliance',
                      revenue: 'Revenue Opt.'
                    };
                    const scoreKeys = {
                      overall: 'overall_score',
                      accuracy: 'accuracy_score',
                      compliance: 'compliance_score',
                      revenue: 'revenue_optimization_score'
                    };
                    const lastDiffKey = `${comparisonResult.reports.length - 2}_to_${comparisonResult.reports.length - 1}`;
                    const diff = comparisonResult.scoreDifferences[lastDiffKey]?.[metric];

                    return (
                      <tr key={metric} className="border-b">
                        <td className="py-2 px-2 font-medium">{labels[metric]}</td>
                        {comparisonResult.reports.map((r, idx) => (
                          <td key={idx} className="text-center py-2 px-2">
                            <span className={`px-2 py-1 rounded ${getScoreColor(r[scoreKeys[metric]])}`}>
                              {r[scoreKeys[metric]]}%
                            </span>
                          </td>
                        ))}
                        <td className="text-center py-2 px-2">
                          {diff && (
                            <span className={`flex items-center justify-center gap-1 ${diff.color}`}>
                              <diff.icon className="w-3 h-3" />
                              {diff.value}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Issue Changes Summary */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 bg-green-50 rounded-lg border border-green-200 text-center">
                <CheckCircle2 className="w-5 h-5 text-green-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-green-700">
                  {comparisonResult.issueChanges.accuracy.resolved?.length || 0}
                </p>
                <p className="text-xs text-green-600">Issues Resolved</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg border border-red-200 text-center">
                <AlertTriangle className="w-5 h-5 text-red-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-red-700">
                  {comparisonResult.issueChanges.accuracy.new?.length || 0}
                </p>
                <p className="text-xs text-red-600">New Issues</p>
              </div>
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-center">
                <XCircle className="w-5 h-5 text-yellow-600 mx-auto mb-1" />
                <p className="text-lg font-bold text-yellow-700">
                  {comparisonResult.issueChanges.accuracy.persistent?.length || 0}
                </p>
                <p className="text-xs text-yellow-600">Persistent</p>
              </div>
            </div>

            {/* AI Insights Button */}
            {!aiInsights && (
              <Button
                onClick={generateAIInsights}
                disabled={isGeneratingInsights}
                variant="outline"
                className="w-full border-purple-300 text-purple-700 hover:bg-purple-50"
              >
                {isGeneratingInsights ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating AI Insights...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Generate AI Insights</>
                )}
              </Button>
            )}

            {/* AI Insights Display */}
            {aiInsights && (
              <div className="space-y-3">
                {/* Overall Trend */}
                <div className={`p-4 rounded-lg border-2 ${getTrendColor(aiInsights.overall_trend)}`}>
                  <div className="flex items-center gap-2 mb-2">
                    {getTrendIcon(aiInsights.overall_trend)}
                    <span className="font-semibold capitalize">{aiInsights.overall_trend} Trend</span>
                  </div>
                  <p className="text-sm">{aiInsights.trend_summary}</p>
                </div>

                {/* Risk Assessment */}
                {aiInsights.risk_assessment && (
                  <div className={`p-3 rounded-lg border ${
                    aiInsights.risk_assessment.level === 'high' ? 'bg-red-50 border-red-200' :
                    aiInsights.risk_assessment.level === 'medium' ? 'bg-yellow-50 border-yellow-200' :
                    'bg-green-50 border-green-200'
                  }`}>
                    <p className="text-sm font-medium">
                      Risk Level: <span className="capitalize">{aiInsights.risk_assessment.level}</span>
                    </p>
                    <p className="text-xs text-gray-600 mt-1">{aiInsights.risk_assessment.explanation}</p>
                  </div>
                )}

                {/* Improvements */}
                {aiInsights.improvements?.length > 0 && (
                  <div className="space-y-1">
                    <button
                      onClick={() => toggleSection('improvements')}
                      className="flex items-center justify-between w-full text-left"
                    >
                      <span className="text-sm font-medium text-green-700 flex items-center gap-1">
                        <TrendingUp className="w-4 h-4" /> Improvements ({aiInsights.improvements.length})
                      </span>
                      {expandedSections.improvements ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {expandedSections.improvements && (
                      <ul className="space-y-1 pl-5">
                        {aiInsights.improvements.map((item, idx) => (
                          <li key={idx} className="text-xs text-green-700 list-disc">{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Concerns */}
                {aiInsights.concerns?.length > 0 && (
                  <div className="space-y-1">
                    <button
                      onClick={() => toggleSection('concerns')}
                      className="flex items-center justify-between w-full text-left"
                    >
                      <span className="text-sm font-medium text-red-700 flex items-center gap-1">
                        <AlertTriangle className="w-4 h-4" /> Concerns ({aiInsights.concerns.length})
                      </span>
                      {expandedSections.concerns ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {expandedSections.concerns && (
                      <ul className="space-y-1 pl-5">
                        {aiInsights.concerns.map((item, idx) => (
                          <li key={idx} className="text-xs text-red-700 list-disc">{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                {/* Recommendations */}
                {aiInsights.recommendations?.length > 0 && (
                  <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                    <p className="text-sm font-medium text-indigo-900 mb-2 flex items-center gap-1">
                      <Sparkles className="w-4 h-4" /> AI Recommendations
                    </p>
                    <ol className="space-y-1">
                      {aiInsights.recommendations.slice(0, 5).map((rec, idx) => (
                        <li key={idx} className="text-xs text-indigo-800 flex items-start gap-2">
                          <span className="bg-indigo-600 text-white rounded-full w-4 h-4 flex items-center justify-center text-xs flex-shrink-0">
                            {idx + 1}
                          </span>
                          {rec}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}

                {/* Notable Changes */}
                {aiInsights.notable_changes?.length > 0 && (
                  <div className="space-y-1">
                    <button
                      onClick={() => toggleSection('changes')}
                      className="flex items-center justify-between w-full text-left"
                    >
                      <span className="text-sm font-medium text-gray-700 flex items-center gap-1">
                        <BarChart3 className="w-4 h-4" /> Notable Changes ({aiInsights.notable_changes.length})
                      </span>
                      {expandedSections.changes ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    {expandedSections.changes && (
                      <ul className="space-y-1 pl-5">
                        {aiInsights.notable_changes.map((item, idx) => (
                          <li key={idx} className="text-xs text-gray-600 list-disc">{item}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
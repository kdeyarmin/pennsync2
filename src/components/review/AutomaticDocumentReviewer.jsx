import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  TrendingUp,
  Lightbulb,
  FileText,
  Loader2,
  RefreshCw,
  Eye,
  EyeOff
} from "lucide-react";
import { logActivity, ActivityActions } from "@/components/utils/activityLogger";

export default function AutomaticDocumentReviewer({
  documentType = "visit_note",
  documentContent,
  patientData = null,
  vitalSigns = null,
  diagnosis = null,
  visitType = null,
  autoReview = true,
  onReviewComplete = null,
  onApplyFix = null,
  compact = false
}) {
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewResults, setReviewResults] = useState(null);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [hasReviewed, setHasReviewed] = useState(false);

  // Auto-trigger review when document content changes
  useEffect(() => {
    if (autoReview && documentContent && documentContent.length > 50 && !hasReviewed) {
      const debounceTimer = setTimeout(() => {
        handleReview();
      }, 2000);
      return () => clearTimeout(debounceTimer);
    }
  }, [documentContent, autoReview]);

  const handleReview = async () => {
    if (!documentContent || documentContent.length < 20) return;
    
    setIsReviewing(true);
    setHasReviewed(true);

    try {
      const contextInfo = {
        patient_name: patientData ? `${patientData.first_name} ${patientData.last_name}` : null,
        diagnosis: diagnosis || patientData?.primary_diagnosis,
        visit_type: visitType,
        vital_signs: vitalSigns
      };

      const prompt = `You are an expert clinical documentation auditor specializing in Medicare compliance and quality assurance. Perform a comprehensive review of this ${documentType.replace('_', ' ')}.

DOCUMENT CONTENT:
${documentContent}

CONTEXT:
${JSON.stringify(contextInfo, null, 2)}

Analyze for:
1. **Completeness** - All required elements present
2. **Compliance** - Medicare/regulatory requirements met
3. **Clinical Quality** - Accurate, specific, and well-documented
4. **Risk Areas** - Missing elements that could cause denials or audit flags
5. **Improvement Opportunities** - Ways to strengthen documentation

Return detailed JSON:
{
  "overall_score": 0-100,
  "completeness_score": 0-100,
  "compliance_score": 0-100,
  "quality_score": 0-100,
  "summary": "2-3 sentence executive summary",
  "strengths": ["list 3-5 well-documented areas"],
  "critical_issues": [
    {
      "severity": "critical/high/medium",
      "category": "completeness/compliance/quality",
      "issue": "specific problem",
      "impact": "what could happen if not fixed",
      "fix": "exact action to take",
      "example_text": "suggested documentation to add"
    }
  ],
  "improvement_opportunities": [
    {
      "area": "what to improve",
      "current": "what's currently documented",
      "suggested": "how to improve it",
      "benefit": "why this helps",
      "priority": "high/medium/low"
    }
  ],
  "missing_elements": [
    {
      "element": "what's missing",
      "why_important": "clinical or compliance reason",
      "suggested_documentation": "exact text to add",
      "required": true/false
    }
  ],
  "compliance_gaps": [
    {
      "regulation": "Medicare CoP/CMS guideline",
      "gap": "what's missing or incorrect",
      "risk_level": "high/medium/low",
      "remediation": "how to fix"
    }
  ],
  "quick_wins": [
    {
      "action": "quick improvement to make",
      "effort": "low/medium",
      "impact": "high/medium/low",
      "how_to": "step by step"
    }
  ],
  "audit_risk_score": 0-100,
  "next_steps": ["prioritized list of 3-5 actions to take"]
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: { type: "number" },
            completeness_score: { type: "number" },
            compliance_score: { type: "number" },
            quality_score: { type: "number" },
            summary: { type: "string" },
            strengths: { type: "array", items: { type: "string" } },
            critical_issues: { type: "array", items: { type: "object" } },
            improvement_opportunities: { type: "array", items: { type: "object" } },
            missing_elements: { type: "array", items: { type: "object" } },
            compliance_gaps: { type: "array", items: { type: "object" } },
            quick_wins: { type: "array", items: { type: "object" } },
            audit_risk_score: { type: "number" },
            next_steps: { type: "array", items: { type: "string" } }
          }
        }
      });

      setReviewResults(result);

      logActivity(ActivityActions.NOTE_COMPLIANCE_CHECK, {
        document_type: documentType,
        overall_score: result.overall_score,
        compliance_score: result.compliance_score,
        critical_issues_count: result.critical_issues?.length || 0,
        patient_id: patientData?.id,
        page: 'AutomaticDocumentReviewer'
      });

      if (onReviewComplete) {
        onReviewComplete(result);
      }
    } catch (error) {
      console.error("Error reviewing document:", error);
    }
    
    setIsReviewing(false);
  };

  const getScoreColor = (score) => {
    if (score >= 85) return "text-green-600";
    if (score >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBg = (score) => {
    if (score >= 85) return "bg-green-100 border-green-300";
    if (score >= 70) return "bg-yellow-100 border-yellow-300";
    return "bg-red-100 border-red-300";
  };

  const getSeverityBadge = (severity) => {
    const colors = {
      critical: "bg-red-600 text-white",
      high: "bg-orange-500 text-white",
      medium: "bg-yellow-500 text-white",
      low: "bg-blue-500 text-white"
    };
    return colors[severity] || "bg-gray-500 text-white";
  };

  if (compact && !reviewResults) return null;

  if (isReviewing) {
    return (
      <Card className="border-2 border-blue-300 bg-blue-50">
        <CardContent className="p-6 text-center">
          <Loader2 className="w-8 h-8 text-blue-600 mx-auto mb-3 animate-spin" />
          <p className="text-sm font-medium text-blue-900">AI is reviewing document...</p>
          <p className="text-xs text-blue-700 mt-1">Checking completeness, compliance, and quality</p>
        </CardContent>
      </Card>
    );
  }

  if (!reviewResults) {
    return (
      <Card className="border-2 border-gray-300">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-gray-600" />
              <p className="text-sm font-medium text-gray-700">Document Review</p>
            </div>
            <Button
              size="sm"
              onClick={handleReview}
              disabled={!documentContent || documentContent.length < 20}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Eye className="w-4 h-4 mr-2" />
              Review Document
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 to-purple-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            AI Document Review
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsCollapsed(!isCollapsed)}
            >
              {isCollapsed ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={handleReview}
              disabled={isReviewing}
            >
              <RefreshCw className="w-4 h-4 mr-1" />
              Re-review
            </Button>
          </div>
        </div>
      </CardHeader>

      {!isCollapsed && (
        <CardContent className="space-y-4">
          {/* Score Overview */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className={`p-3 rounded-lg border-2 ${getScoreBg(reviewResults.overall_score)}`}>
              <p className="text-xs text-gray-600 mb-1">Overall</p>
              <p className={`text-2xl font-bold ${getScoreColor(reviewResults.overall_score)}`}>
                {reviewResults.overall_score}%
              </p>
            </div>
            <div className={`p-3 rounded-lg border-2 ${getScoreBg(reviewResults.completeness_score)}`}>
              <p className="text-xs text-gray-600 mb-1">Completeness</p>
              <p className={`text-2xl font-bold ${getScoreColor(reviewResults.completeness_score)}`}>
                {reviewResults.completeness_score}%
              </p>
            </div>
            <div className={`p-3 rounded-lg border-2 ${getScoreBg(reviewResults.compliance_score)}`}>
              <p className="text-xs text-gray-600 mb-1">Compliance</p>
              <p className={`text-2xl font-bold ${getScoreColor(reviewResults.compliance_score)}`}>
                {reviewResults.compliance_score}%
              </p>
            </div>
            <div className={`p-3 rounded-lg border-2 ${getScoreBg(reviewResults.quality_score)}`}>
              <p className="text-xs text-gray-600 mb-1">Quality</p>
              <p className={`text-2xl font-bold ${getScoreColor(reviewResults.quality_score)}`}>
                {reviewResults.quality_score}%
              </p>
            </div>
          </div>

          {/* Summary */}
          <Alert className={reviewResults.overall_score >= 85 ? "bg-green-50 border-green-300" : reviewResults.overall_score >= 70 ? "bg-yellow-50 border-yellow-300" : "bg-red-50 border-red-300"}>
            <Shield className="w-4 h-4" />
            <AlertDescription>
              <p className="font-medium mb-1">Summary</p>
              {reviewResults.summary}
            </AlertDescription>
          </Alert>

          {/* Audit Risk Score */}
          {reviewResults.audit_risk_score !== undefined && (
            <div className="bg-white p-3 rounded-lg border-2 border-orange-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  <p className="text-sm font-semibold text-gray-900">Audit Risk Score</p>
                </div>
                <Badge className={reviewResults.audit_risk_score < 30 ? "bg-green-600" : reviewResults.audit_risk_score < 60 ? "bg-yellow-500" : "bg-red-600"}>
                  {reviewResults.audit_risk_score}% Risk
                </Badge>
              </div>
              <Progress 
                value={reviewResults.audit_risk_score} 
                className="mt-2 h-2"
              />
              <p className="text-xs text-gray-600 mt-1">
                {reviewResults.audit_risk_score < 30 ? "Low risk - documentation is strong" : 
                 reviewResults.audit_risk_score < 60 ? "Moderate risk - address flagged issues" :
                 "High risk - immediate action required"}
              </p>
            </div>
          )}

          {/* Strengths */}
          {reviewResults.strengths?.length > 0 && (
            <div className="bg-green-50 p-3 rounded-lg border border-green-200">
              <p className="text-sm font-semibold text-green-900 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Strengths ({reviewResults.strengths.length})
              </p>
              <ul className="space-y-1">
                {reviewResults.strengths.map((strength, idx) => (
                  <li key={idx} className="text-sm text-green-800 flex items-start gap-2">
                    <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Critical Issues */}
          {reviewResults.critical_issues?.length > 0 && (
            <Accordion type="single" collapsible defaultValue="critical">
              <AccordionItem value="critical" className="border-2 border-red-300 rounded-lg">
                <AccordionTrigger className="px-4 bg-red-50 rounded-t-lg hover:no-underline">
                  <div className="flex items-center gap-2">
                    <XCircle className="w-5 h-5 text-red-600" />
                    <span className="font-semibold">Critical Issues ({reviewResults.critical_issues.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3 mt-3">
                    {reviewResults.critical_issues.map((issue, idx) => (
                      <div key={idx} className="bg-white p-3 rounded-lg border border-red-200">
                        <div className="flex items-start justify-between mb-2">
                          <Badge className={getSeverityBadge(issue.severity)}>
                            {issue.severity}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {issue.category}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-gray-900 mb-2">{issue.issue}</p>
                        <div className="bg-red-50 p-2 rounded text-xs text-red-800 mb-2">
                          <strong>Impact:</strong> {issue.impact}
                        </div>
                        <div className="bg-green-50 p-2 rounded text-xs text-green-800 mb-2">
                          <strong>Fix:</strong> {issue.fix}
                        </div>
                        {issue.example_text && (
                          <div className="bg-blue-50 p-2 rounded text-xs border border-blue-200">
                            <p className="text-blue-700 font-medium mb-1">📝 Suggested Text:</p>
                            <p className="text-blue-900 italic">"{issue.example_text}"</p>
                            {onApplyFix && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-2 text-xs"
                                onClick={() => onApplyFix(issue.example_text)}
                              >
                                Insert into Document
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          {/* Missing Elements */}
          {reviewResults.missing_elements?.length > 0 && (
            <Accordion type="single" collapsible>
              <AccordionItem value="missing" className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <span>Missing Elements ({reviewResults.missing_elements.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3 mt-3">
                    {reviewResults.missing_elements.map((element, idx) => (
                      <div key={idx} className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-gray-900">{element.element}</p>
                          {element.required && (
                            <Badge className="bg-red-600 text-white">Required</Badge>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mb-2">{element.why_important}</p>
                        {element.suggested_documentation && (
                          <div className="bg-white p-2 rounded border border-orange-300">
                            <p className="text-xs text-orange-700 font-medium mb-1">Suggested Documentation:</p>
                            <p className="text-sm text-gray-800 italic">"{element.suggested_documentation}"</p>
                            {onApplyFix && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="mt-2 text-xs"
                                onClick={() => onApplyFix(element.suggested_documentation)}
                              >
                                Add to Document
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          {/* Compliance Gaps */}
          {reviewResults.compliance_gaps?.length > 0 && (
            <Accordion type="single" collapsible>
              <AccordionItem value="compliance" className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <Shield className="w-5 h-5 text-blue-600" />
                    <span>Compliance Gaps ({reviewResults.compliance_gaps.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3 mt-3">
                    {reviewResults.compliance_gaps.map((gap, idx) => (
                      <div key={idx} className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-blue-900">{gap.regulation}</p>
                          <Badge className={gap.risk_level === 'high' ? 'bg-red-600' : gap.risk_level === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'}>
                            {gap.risk_level} risk
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-800 mb-2">{gap.gap}</p>
                        <div className="bg-white p-2 rounded border">
                          <p className="text-xs text-blue-700 font-medium mb-1">Remediation:</p>
                          <p className="text-sm text-gray-800">{gap.remediation}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          {/* Improvement Opportunities */}
          {reviewResults.improvement_opportunities?.length > 0 && (
            <Accordion type="single" collapsible>
              <AccordionItem value="improvements" className="border rounded-lg">
                <AccordionTrigger className="px-4 hover:no-underline">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-purple-600" />
                    <span>Improvement Opportunities ({reviewResults.improvement_opportunities.length})</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-3 mt-3">
                    {reviewResults.improvement_opportunities.map((opp, idx) => (
                      <div key={idx} className="bg-purple-50 p-3 rounded-lg border border-purple-200">
                        <div className="flex items-center justify-between mb-2">
                          <p className="text-sm font-medium text-purple-900">{opp.area}</p>
                          <Badge className={opp.priority === 'high' ? 'bg-purple-600' : opp.priority === 'medium' ? 'bg-purple-400' : 'bg-purple-300'}>
                            {opp.priority} priority
                          </Badge>
                        </div>
                        <div className="grid md:grid-cols-2 gap-2 mb-2">
                          <div className="bg-red-50 p-2 rounded border border-red-200">
                            <p className="text-xs text-red-600 font-medium">Current:</p>
                            <p className="text-xs text-gray-800">{opp.current}</p>
                          </div>
                          <div className="bg-green-50 p-2 rounded border border-green-200">
                            <p className="text-xs text-green-600 font-medium">Suggested:</p>
                            <p className="text-xs text-gray-800">{opp.suggested}</p>
                          </div>
                        </div>
                        <p className="text-xs text-gray-600 italic">{opp.benefit}</p>
                        {onApplyFix && opp.suggested && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-2 text-xs"
                            onClick={() => onApplyFix(opp.suggested)}
                          >
                            Apply Improvement
                          </Button>
                        )}
                      </div>
                    ))}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}

          {/* Quick Wins */}
          {reviewResults.quick_wins?.length > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border-2 border-green-300">
              <p className="text-sm font-semibold text-green-900 mb-3 flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Quick Wins - Easy Improvements
              </p>
              <div className="space-y-2">
                {reviewResults.quick_wins.map((win, idx) => (
                  <div key={idx} className="bg-white p-3 rounded-lg border border-green-200">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm font-medium text-gray-900">{win.action}</p>
                      <div className="flex gap-2">
                        <Badge className="bg-green-600 text-white text-xs">
                          {win.impact} impact
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {win.effort} effort
                        </Badge>
                      </div>
                    </div>
                    <p className="text-xs text-gray-700">{win.how_to}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Next Steps */}
          {reviewResults.next_steps?.length > 0 && (
            <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-300">
              <p className="text-sm font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Recommended Next Steps
              </p>
              <ol className="space-y-2">
                {reviewResults.next_steps.map((step, idx) => (
                  <li key={idx} className="flex items-start gap-2 text-sm text-indigo-900">
                    <span className="bg-indigo-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs flex-shrink-0">
                      {idx + 1}
                    </span>
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
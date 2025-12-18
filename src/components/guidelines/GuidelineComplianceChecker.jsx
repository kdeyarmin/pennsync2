import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Loader2,
  BookOpen,
  ExternalLink,
  ChevronRight
} from "lucide-react";
import { retrieveRelevantGuidelines } from "../smartNote/GuidelineContextRetriever";

export default function GuidelineComplianceChecker({
  noteContent,
  diagnosis,
  visitType,
  patientData,
  careType = "home_health",
  onIssueFound
}) {
  const [complianceResults, setComplianceResults] = useState(null);
  const [isChecking, setIsChecking] = useState(false);
  const [appliedGuidelines, setAppliedGuidelines] = useState([]);

  const checkCompliance = async () => {
    if (!noteContent || noteContent.length < 50) return;

    setIsChecking(true);
    try {
      // Retrieve relevant guidelines
      const guidelines = await retrieveRelevantGuidelines({
        diagnosis,
        visitType,
        noteContent,
        maxGuidelines: 8
      });

      setAppliedGuidelines(guidelines);

      // Build comprehensive guideline requirements
      const guidelineRequirements = guidelines.map(g => ({
        title: g.title,
        citation: g.regulatory_citation,
        category: g.category,
        summary: g.summary,
        keywords: g.keywords,
        content_excerpt: g.content_markdown?.substring(0, 1000)
      }));

      const prompt = `You are a Medicare compliance auditor. Cross-reference this clinical note against specific Medicare guidelines to identify compliance gaps.

CLINICAL NOTE TO AUDIT:
${noteContent}

PATIENT/VISIT CONTEXT:
- Care Type: ${careType}
- Visit Type: ${visitType}
- Diagnosis: ${diagnosis}
- Patient Status: ${patientData?.status || 'active'}

APPLICABLE MEDICARE GUIDELINES (Retrieved from official CMS documentation):
${guidelineRequirements.map((g, idx) => `
Guideline ${idx + 1}: ${g.title}
Citation: ${g.citation || 'CMS Guidelines'}
Category: ${g.category}
Requirements Summary:
${g.summary}

Key Documentation Elements Required:
${g.keywords?.join(', ')}

Detailed Requirements:
${g.content_excerpt}
`).join('\n\n---\n\n')}

AUDIT REQUIREMENTS:
For EACH guideline above, determine:
1. Does the note contain the required documentation elements?
2. What specific requirements are missing or incomplete?
3. What text should be added to meet the guideline?

Return JSON with detailed compliance analysis:
{
  "overall_compliance_score": 0-100,
  "guidelines_reviewed": ${guidelines.length},
  "compliant_count": 0,
  "non_compliant_count": 0,
  "guideline_results": [
    {
      "guideline_title": "string",
      "guideline_citation": "string",
      "category": "string",
      "compliance_status": "compliant|partial|non_compliant",
      "compliance_percentage": 0-100,
      "required_elements": ["element1", "element2"],
      "present_elements": ["element1"],
      "missing_elements": ["element2"],
      "specific_gaps": [
        {
          "requirement": "What the guideline requires",
          "current_state": "What the note currently says (or 'Not documented')",
          "gap_severity": "critical|high|medium|low",
          "suggested_addition": "Specific text to add to meet requirement",
          "rationale": "Why this is required per the guideline"
        }
      ],
      "audit_risk": "Description of audit risk if gaps remain",
      "guideline_url": "string"
    }
  ],
  "overall_recommendations": [
    {
      "priority": "critical|high|medium|low",
      "recommendation": "string",
      "affected_guidelines": ["guideline titles"]
    }
  ],
  "strengths": ["Areas where documentation meets or exceeds guidelines"]
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_compliance_score: { type: "number" },
            guidelines_reviewed: { type: "number" },
            compliant_count: { type: "number" },
            non_compliant_count: { type: "number" },
            guideline_results: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  guideline_title: { type: "string" },
                  guideline_citation: { type: "string" },
                  category: { type: "string" },
                  compliance_status: { type: "string" },
                  compliance_percentage: { type: "number" },
                  required_elements: { type: "array", items: { type: "string" } },
                  present_elements: { type: "array", items: { type: "string" } },
                  missing_elements: { type: "array", items: { type: "string" } },
                  specific_gaps: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        requirement: { type: "string" },
                        current_state: { type: "string" },
                        gap_severity: { type: "string" },
                        suggested_addition: { type: "string" },
                        rationale: { type: "string" }
                      }
                    }
                  },
                  audit_risk: { type: "string" },
                  guideline_url: { type: "string" }
                }
              }
            },
            overall_recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  priority: { type: "string" },
                  recommendation: { type: "string" },
                  affected_guidelines: { type: "array", items: { type: "string" } }
                }
              }
            },
            strengths: { type: "array", items: { type: "string" } }
          }
        }
      });

      setComplianceResults(result);

      // Callback with issues
      if (onIssueFound && result.guideline_results) {
        const allGaps = result.guideline_results
          .flatMap(gr => gr.specific_gaps || [])
          .filter(gap => gap.gap_severity === 'critical' || gap.gap_severity === 'high');
        onIssueFound(allGaps);
      }

    } catch (error) {
      console.error('Error checking compliance:', error);
    }
    setIsChecking(false);
  };

  const getStatusIcon = (status) => {
    if (status === 'compliant') return <CheckCircle2 className="w-4 h-4 text-green-600" />;
    if (status === 'partial') return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
    return <XCircle className="w-4 h-4 text-red-600" />;
  };

  const getStatusColor = (status) => {
    if (status === 'compliant') return 'border-green-300 bg-green-50';
    if (status === 'partial') return 'border-yellow-300 bg-yellow-50';
    return 'border-red-300 bg-red-50';
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'bg-red-100 text-red-800',
      high: 'bg-orange-100 text-orange-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-blue-100 text-blue-800'
    };
    return colors[severity] || colors.medium;
  };

  return (
    <Card className="border-2 border-purple-300 bg-gradient-to-b from-purple-50 to-white">
      <CardHeader className="py-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-purple-600" />
            Guideline-Based Compliance Check
          </CardTitle>
          <Button
            onClick={checkCompliance}
            disabled={isChecking || !noteContent || noteContent.length < 50}
            className="bg-purple-600 hover:bg-purple-700"
          >
            {isChecking ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Checking...</>
            ) : (
              <><Shield className="w-4 h-4 mr-2" /> Check Compliance</>
            )}
          </Button>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {!complianceResults && !isChecking && (
          <Alert className="bg-blue-50 border-blue-200">
            <BookOpen className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-900 text-sm">
              Click "Check Compliance" to cross-reference your note against {appliedGuidelines.length || 'relevant'} Medicare guidelines
            </AlertDescription>
          </Alert>
        )}

        {complianceResults && (
          <>
            {/* Overall Score */}
            <div className="p-4 bg-gradient-to-r from-purple-100 to-blue-100 rounded-lg border-2 border-purple-200">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-sm text-gray-700">Guideline Compliance Score</p>
                  <p className={`text-3xl font-bold ${
                    complianceResults.overall_compliance_score >= 90 ? 'text-green-600' :
                    complianceResults.overall_compliance_score >= 70 ? 'text-yellow-600' :
                    'text-red-600'
                  }`}>
                    {complianceResults.overall_compliance_score}%
                  </p>
                </div>
                <div className="text-right">
                  <Badge className="bg-green-600 mb-1">
                    {complianceResults.compliant_count} Compliant
                  </Badge>
                  <br />
                  <Badge className="bg-red-600">
                    {complianceResults.non_compliant_count} Gaps
                  </Badge>
                </div>
              </div>
              <Progress 
                value={complianceResults.overall_compliance_score} 
                className="h-2"
              />
              <p className="text-xs text-gray-600 mt-2">
                Reviewed against {complianceResults.guidelines_reviewed} Medicare guidelines
              </p>
            </div>

            {/* Guideline Results */}
            <ScrollArea className="h-96">
              <div className="space-y-3 pr-4">
                {complianceResults.guideline_results?.map((result, idx) => (
                  <Card key={idx} className={`border-2 ${getStatusColor(result.compliance_status)}`}>
                    <CardHeader className="py-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            {getStatusIcon(result.compliance_status)}
                            <CardTitle className="text-sm">{result.guideline_title}</CardTitle>
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">
                              {result.guideline_citation}
                            </Badge>
                            <Badge className="text-xs">
                              {result.compliance_percentage}% compliant
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="py-2 space-y-3">
                      {/* Missing Elements */}
                      {result.missing_elements?.length > 0 && (
                        <div className="bg-white p-3 rounded border border-gray-200">
                          <p className="text-xs font-semibold text-red-800 mb-2">
                            Missing Required Elements:
                          </p>
                          <div className="space-y-1">
                            {result.missing_elements.map((elem, i) => (
                              <div key={i} className="flex items-center gap-1 text-xs text-red-700">
                                <XCircle className="w-3 h-3 flex-shrink-0" />
                                {elem}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Specific Gaps */}
                      {result.specific_gaps?.length > 0 && (
                        <div className="space-y-2">
                          {result.specific_gaps.map((gap, gapIdx) => (
                            <div key={gapIdx} className={`p-2 rounded border ${getSeverityColor(gap.gap_severity)}`}>
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={getSeverityColor(gap.gap_severity)}>
                                  {gap.gap_severity}
                                </Badge>
                                <p className="text-xs font-medium text-gray-900">{gap.requirement}</p>
                              </div>
                              <p className="text-xs text-gray-600 mb-1">
                                <strong>Current:</strong> {gap.current_state}
                              </p>
                              <div className="bg-blue-50 p-2 rounded border border-blue-200 mb-1">
                                <p className="text-xs text-blue-900">
                                  <strong>Add:</strong> {gap.suggested_addition}
                                </p>
                              </div>
                              <p className="text-xs text-gray-500 italic">{gap.rationale}</p>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Audit Risk */}
                      {result.audit_risk && result.compliance_status !== 'compliant' && (
                        <Alert className="bg-orange-50 border-orange-200">
                          <AlertTriangle className="w-4 h-4 text-orange-600" />
                          <AlertDescription className="text-xs text-orange-900">
                            <strong>Audit Risk:</strong> {result.audit_risk}
                          </AlertDescription>
                        </Alert>
                      )}

                      {/* View Guideline */}
                      {result.guideline_url && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => window.open(result.guideline_url, '_blank')}
                          className="text-xs w-full"
                        >
                          <BookOpen className="w-3 h-3 mr-1" />
                          View Full Guideline
                          <ExternalLink className="w-3 h-3 ml-auto" />
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>

            {/* Overall Recommendations */}
            {complianceResults.overall_recommendations?.length > 0 && (
              <div className="border-t pt-4 space-y-2">
                <p className="text-sm font-semibold text-gray-900 mb-2">Priority Recommendations:</p>
                {complianceResults.overall_recommendations
                  .filter(r => r.priority === 'critical' || r.priority === 'high')
                  .map((rec, idx) => (
                    <Alert key={idx} className="bg-red-50 border-red-200">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <AlertDescription className="text-sm">
                        <div className="flex items-start gap-2">
                          <Badge className="bg-red-600 text-white text-xs">
                            {rec.priority}
                          </Badge>
                          <div className="flex-1">
                            <p className="text-red-900 font-medium">{rec.recommendation}</p>
                            <p className="text-xs text-red-700 mt-1">
                              Affects: {rec.affected_guidelines.join(', ')}
                            </p>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
              </div>
            )}

            {/* Strengths */}
            {complianceResults.strengths?.length > 0 && (
              <div className="bg-green-50 p-3 rounded border border-green-200">
                <p className="text-sm font-semibold text-green-900 mb-2 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Documentation Strengths
                </p>
                <ul className="space-y-1">
                  {complianceResults.strengths.map((strength, idx) => (
                    <li key={idx} className="text-xs text-green-800 flex items-start gap-2">
                      <ChevronRight className="w-3 h-3 mt-0.5 flex-shrink-0" />
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  AlertTriangle, 
  CheckCircle2, 
  Wand2,
  FileText,
  TrendingUp,
  Loader2,
  Lightbulb
} from "lucide-react";

export default function ConsolidatedAIFeedback({
  enhancedNote,
  roughNote,
  patientData,
  diagnosis,
  vitalSigns,
  carePlans = [],
  onApplyFix
}) {
  const [feedback, setFeedback] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState("critical");

  useEffect(() => {
    if (enhancedNote && !feedback) {
      analyzeFeedback();
    }
  }, [enhancedNote]);

  const analyzeFeedback = async () => {
    if (!enhancedNote) return;

    setIsAnalyzing(true);
    try {
      const prompt = `Analyze this enhanced clinical note for completeness, Medicare compliance, accuracy, and overall quality. Provide comprehensive consolidated feedback that merges:
1. Medicare Compliance Assessment (CRITICAL for reimbursement)
2. Overall Quality Review (clinical accuracy, clarity, grammar)
3. Risk Identification (undocumented safety concerns)

ENHANCED NOTE:
${enhancedNote}

CONTEXT:
- Patient: ${patientData ? `${patientData.first_name} ${patientData.last_name}` : 'Unknown'}
- Diagnosis: ${diagnosis || 'Not specified'}
- Vitals: ${vitalSigns ? JSON.stringify(vitalSigns) : 'Not provided'}
- Active Care Plans: ${carePlans.filter(cp => cp.status === 'active').length}

ANALYSIS FRAMEWORK:
1. **Medicare Compliance Score** (0-100): Rate adherence to CMS requirements for home health
   - Homebound status documentation
   - Skilled need justification
   - Patient response to teaching
   - Functional assessment
   - Safety assessment
   
2. **Critical Issues** - Medicare compliance gaps, missing required elements
3. **Quality Improvements** - Grammar, terminology, clinical accuracy, clarity
4. **Risk Factors** - Undocumented safety concerns, patient risks
5. **Optimization** - Documentation that could improve outcomes/reimbursement

For each issue, provide:
- Category and severity
- Specific problem
- Actionable fix with insert-ready text

Return as JSON:
{
  "overall_quality_score": 0-100,
  "medicare_compliance_score": 0-100,
  "compliance_status": "compliant|needs_review|non_compliant",
  "critical_issues": [
    {
      "category": "compliance|safety|required_element",
      "issue": "string",
      "recommendation": "string",
      "insert_text": "string"
    }
  ],
  "quality_improvements": [
    {
      "category": "grammar|terminology|clarity",
      "current": "string - problematic text",
      "improved": "string - corrected text",
      "rationale": "string"
    }
  ],
  "risk_factors": [
    {
      "risk": "string",
      "severity": "high|medium|low",
      "mitigation": "string",
      "insert_text": "string"
    }
  ],
  "optimization_opportunities": [
    {
      "area": "string",
      "suggestion": "string",
      "impact": "clinical|financial|both",
      "insert_text": "string"
    }
  ],
  "strengths": ["string"]
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_quality_score: { type: "number" },
            medicare_compliance_score: { type: "number" },
            compliance_status: { type: "string" },
            critical_issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  issue: { type: "string" },
                  recommendation: { type: "string" },
                  insert_text: { type: "string" }
                }
              }
            },
            quality_improvements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  current: { type: "string" },
                  improved: { type: "string" },
                  rationale: { type: "string" }
                }
              }
            },
            risk_factors: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  risk: { type: "string" },
                  severity: { type: "string" },
                  mitigation: { type: "string" },
                  insert_text: { type: "string" }
                }
              }
            },
            optimization_opportunities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  area: { type: "string" },
                  suggestion: { type: "string" },
                  impact: { type: "string" },
                  insert_text: { type: "string" }
                }
              }
            },
            strengths: { type: "array", items: { type: "string" } }
          }
        }
      });

      setFeedback(result);
      
      // Auto-switch to critical tab if there are critical issues
      if (result.critical_issues?.length > 0) {
        setActiveTab("critical");
      } else {
        setActiveTab("strengths");
      }
    } catch (error) {
      console.error("Error analyzing feedback:", error);
    }
    setIsAnalyzing(false);
  };

  const getSeverityColor = (severity) => {
    const colors = {
      high: "border-red-300 bg-red-50",
      medium: "border-yellow-300 bg-yellow-50",
      low: "border-blue-300 bg-blue-50"
    };
    return colors[severity] || colors.low;
  };

  if (isAnalyzing) {
    return (
      <Card className="border-2 border-purple-200">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Analyzing note quality...</p>
        </CardContent>
      </Card>
    );
  }

  if (!feedback) return null;

  const totalIssues = 
    (feedback.critical_issues?.length || 0) + 
    (feedback.quality_improvements?.length || 0) + 
    (feedback.risk_factors?.length || 0);

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            AI Quality & Compliance Review
          </CardTitle>
          <div className="flex gap-2">
            <Badge className={`${
              feedback.medicare_compliance_score >= 90 ? 'bg-green-600' :
              feedback.medicare_compliance_score >= 70 ? 'bg-yellow-600' :
              'bg-red-600'
            } text-white`}>
              {feedback.medicare_compliance_score}% Medicare
            </Badge>
            <Badge className={`${
              feedback.overall_quality_score >= 90 ? 'bg-blue-600' :
              feedback.overall_quality_score >= 70 ? 'bg-yellow-600' :
              'bg-red-600'
            } text-white`}>
              {feedback.overall_quality_score}% Quality
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="critical" className="relative">
              Critical
              {feedback.critical_issues?.length > 0 && (
                <Badge className="ml-1 bg-red-600 text-white text-xs h-5 w-5 p-0 flex items-center justify-center">
                  {feedback.critical_issues.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="quality">
              Quality
              {feedback.quality_improvements?.length > 0 && (
                <Badge className="ml-1 bg-yellow-600 text-white text-xs h-5 w-5 p-0 flex items-center justify-center">
                  {feedback.quality_improvements.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="risks">
              Risks
              {feedback.risk_factors?.length > 0 && (
                <Badge className="ml-1 bg-orange-600 text-white text-xs h-5 w-5 p-0 flex items-center justify-center">
                  {feedback.risk_factors.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="strengths">
              Strengths
            </TabsTrigger>
          </TabsList>

          <TabsContent value="critical" className="space-y-3 mt-3">
            {feedback.critical_issues?.length === 0 ? (
              <div className="text-center py-6 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-green-800 font-medium">No critical issues found!</p>
              </div>
            ) : (
              feedback.critical_issues.map((issue, idx) => (
                <div key={idx} className="p-3 rounded-lg border-2 border-red-300 bg-red-50">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <Badge variant="outline" className="text-xs mb-1">{issue.category}</Badge>
                      <p className="font-semibold text-sm text-gray-900">{issue.issue}</p>
                      <p className="text-xs text-gray-600 mt-1">💡 {issue.recommendation}</p>
                    </div>
                    <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                  </div>
                  {issue.insert_text && onApplyFix && (
                    <Button
                      size="sm"
                      onClick={() => onApplyFix(issue.insert_text)}
                      className="w-full text-xs mt-2 bg-red-600 hover:bg-red-700"
                    >
                      <Wand2 className="w-3 h-3 mr-1" />
                      Apply Fix
                    </Button>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="quality" className="space-y-3 mt-3">
            {feedback.quality_improvements?.length === 0 ? (
              <div className="text-center py-6 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-green-800 font-medium">Quality looks great!</p>
              </div>
            ) : (
              feedback.quality_improvements.map((improvement, idx) => (
                <div key={idx} className="p-3 rounded-lg border border-yellow-300 bg-yellow-50">
                  <Badge variant="outline" className="text-xs mb-2">{improvement.category}</Badge>
                  <div className="space-y-2 text-sm">
                    <div>
                      <p className="text-xs text-gray-500">Current:</p>
                      <p className="text-gray-700 line-through">{improvement.current}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Improved:</p>
                      <p className="text-gray-900 font-medium">{improvement.improved}</p>
                    </div>
                    <p className="text-xs text-gray-600 italic">{improvement.rationale}</p>
                  </div>
                  {onApplyFix && (
                    <Button
                      size="sm"
                      onClick={() => onApplyFix(improvement.improved)}
                      className="w-full text-xs mt-2"
                    >
                      Apply Improvement
                    </Button>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="risks" className="space-y-3 mt-3">
            {feedback.risk_factors?.length === 0 ? (
              <div className="text-center py-6 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-green-800 font-medium">No undocumented risks!</p>
              </div>
            ) : (
              feedback.risk_factors.map((risk, idx) => (
                <div key={idx} className={`p-3 rounded-lg border-2 ${getSeverityColor(risk.severity)}`}>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge variant="outline" className="text-xs">{risk.severity}</Badge>
                        <p className="font-semibold text-sm">{risk.risk}</p>
                      </div>
                      <p className="text-xs text-gray-600">{risk.mitigation}</p>
                    </div>
                  </div>
                  {risk.insert_text && onApplyFix && (
                    <Button
                      size="sm"
                      onClick={() => onApplyFix(risk.insert_text)}
                      className="w-full text-xs mt-2"
                    >
                      Add Risk Documentation
                    </Button>
                  )}
                </div>
              ))
            )}
          </TabsContent>

          <TabsContent value="strengths" className="space-y-2 mt-3">
            <div className="bg-green-50 rounded-lg border border-green-200 p-4">
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <p className="font-semibold text-green-900">What's Working Well</p>
              </div>
              <ul className="space-y-2">
                {feedback.strengths?.map((strength, idx) => (
                  <li key={idx} className="text-sm text-green-800 flex items-start gap-2">
                    <span className="text-green-600 font-bold">✓</span>
                    {strength}
                  </li>
                ))}
              </ul>
            </div>
            {feedback.optimization_opportunities?.length > 0 && (
              <div className="bg-blue-50 rounded-lg border border-blue-200 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="w-5 h-5 text-blue-600" />
                  <p className="font-semibold text-blue-900">Optimization Opportunities</p>
                </div>
                <div className="space-y-3">
                  {feedback.optimization_opportunities.map((opp, idx) => (
                    <div key={idx} className="bg-white rounded p-2 border border-blue-100">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="text-xs">{opp.area}</Badge>
                        <Badge variant="outline" className="text-xs">{opp.impact}</Badge>
                      </div>
                      <p className="text-xs text-gray-700">{opp.suggestion}</p>
                      {opp.insert_text && onApplyFix && (
                        <Button
                          size="sm"
                          onClick={() => onApplyFix(opp.insert_text)}
                          className="w-full text-xs mt-2"
                        >
                          Apply Optimization
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>
        </Tabs>

        {totalIssues === 0 && (
          <div className="text-center pt-2">
            <p className="text-sm text-green-700 font-medium">🎉 Excellent documentation!</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
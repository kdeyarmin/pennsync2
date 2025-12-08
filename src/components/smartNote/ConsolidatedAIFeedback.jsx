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
  Lightbulb,
  CheckSquare
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

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
  const [selectedSuggestions, setSelectedSuggestions] = useState({
    critical: [],
    quality: [],
    risks: [],
    optimizations: []
  });

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

  const toggleSuggestion = (category, index) => {
    setSelectedSuggestions(prev => {
      const current = prev[category] || [];
      if (current.includes(index)) {
        return { ...prev, [category]: current.filter(i => i !== index) };
      } else {
        return { ...prev, [category]: [...current, index] };
      }
    });
  };

  const selectAllInCategory = (category, count) => {
    setSelectedSuggestions(prev => ({
      ...prev,
      [category]: Array.from({ length: count }, (_, i) => i)
    }));
  };

  const deselectAllInCategory = (category) => {
    setSelectedSuggestions(prev => ({
      ...prev,
      [category]: []
    }));
  };

  const applySelected = (category) => {
    if (!onApplyFix) return;
    
    const selected = selectedSuggestions[category] || [];
    let textsToApply = [];

    if (category === 'critical') {
      textsToApply = selected.map(idx => feedback.critical_issues[idx]?.insert_text).filter(Boolean);
    } else if (category === 'quality') {
      textsToApply = selected.map(idx => feedback.quality_improvements[idx]?.improved).filter(Boolean);
    } else if (category === 'risks') {
      textsToApply = selected.map(idx => feedback.risk_factors[idx]?.insert_text).filter(Boolean);
    } else if (category === 'optimizations') {
      textsToApply = selected.map(idx => feedback.optimization_opportunities[idx]?.insert_text).filter(Boolean);
    }

    if (textsToApply.length > 0) {
      const combinedText = textsToApply.join('\n\n');
      onApplyFix(combinedText);
      deselectAllInCategory(category);
    }
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
              <>
                <div className="flex items-center justify-between gap-2 p-2 bg-white/50 rounded border border-red-200">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedSuggestions.critical?.length === feedback.critical_issues.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          selectAllInCategory('critical', feedback.critical_issues.length);
                        } else {
                          deselectAllInCategory('critical');
                        }
                      }}
                    />
                    <span className="text-xs font-medium">Select All ({selectedSuggestions.critical?.length || 0} selected)</span>
                  </div>
                  {selectedSuggestions.critical?.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() => applySelected('critical')}
                      className="bg-red-600 hover:bg-red-700 text-xs h-7"
                    >
                      <CheckSquare className="w-3 h-3 mr-1" />
                      Apply {selectedSuggestions.critical.length} Selected
                    </Button>
                  )}
                </div>
                {feedback.critical_issues.map((issue, idx) => (
                  <div key={idx} className="p-3 rounded-lg border-2 border-red-300 bg-red-50">
                    <div className="flex items-start gap-2 mb-2">
                      <Checkbox
                        checked={selectedSuggestions.critical?.includes(idx)}
                        onCheckedChange={() => toggleSuggestion('critical', idx)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Badge variant="outline" className="text-xs mb-1">{issue.category}</Badge>
                        <p className="font-semibold text-sm text-gray-900">{issue.issue}</p>
                        <p className="text-xs text-gray-600 mt-1">💡 {issue.recommendation}</p>
                        {issue.insert_text && (
                          <div className="mt-2 p-2 bg-white/60 rounded border border-red-200">
                            <p className="text-xs font-medium text-gray-500 mb-1">AI Suggestion:</p>
                            <p className="text-xs text-gray-700">{issue.insert_text}</p>
                          </div>
                        )}
                      </div>
                      <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-1" />
                    </div>
                  </div>
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="quality" className="space-y-3 mt-3">
            {feedback.quality_improvements?.length === 0 ? (
              <div className="text-center py-6 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-green-800 font-medium">Quality looks great!</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2 p-2 bg-white/50 rounded border border-yellow-200">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedSuggestions.quality?.length === feedback.quality_improvements.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          selectAllInCategory('quality', feedback.quality_improvements.length);
                        } else {
                          deselectAllInCategory('quality');
                        }
                      }}
                    />
                    <span className="text-xs font-medium">Select All ({selectedSuggestions.quality?.length || 0} selected)</span>
                  </div>
                  {selectedSuggestions.quality?.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() => applySelected('quality')}
                      className="text-xs h-7"
                    >
                      <CheckSquare className="w-3 h-3 mr-1" />
                      Apply {selectedSuggestions.quality.length} Selected
                    </Button>
                  )}
                </div>
                {feedback.quality_improvements.map((improvement, idx) => (
                  <div key={idx} className="p-3 rounded-lg border border-yellow-300 bg-yellow-50">
                    <div className="flex items-start gap-2 mb-2">
                      <Checkbox
                        checked={selectedSuggestions.quality?.includes(idx)}
                        onCheckedChange={() => toggleSuggestion('quality', idx)}
                        className="mt-1"
                      />
                      <div className="flex-1">
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
                      </div>
                    </div>
                  </div>
                ))}
              </>
            )}
          </TabsContent>

          <TabsContent value="risks" className="space-y-3 mt-3">
            {feedback.risk_factors?.length === 0 ? (
              <div className="text-center py-6 bg-green-50 rounded-lg border border-green-200">
                <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-sm text-green-800 font-medium">No undocumented risks!</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-2 p-2 bg-white/50 rounded border border-orange-200">
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedSuggestions.risks?.length === feedback.risk_factors.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          selectAllInCategory('risks', feedback.risk_factors.length);
                        } else {
                          deselectAllInCategory('risks');
                        }
                      }}
                    />
                    <span className="text-xs font-medium">Select All ({selectedSuggestions.risks?.length || 0} selected)</span>
                  </div>
                  {selectedSuggestions.risks?.length > 0 && (
                    <Button
                      size="sm"
                      onClick={() => applySelected('risks')}
                      className="text-xs h-7"
                    >
                      <CheckSquare className="w-3 h-3 mr-1" />
                      Apply {selectedSuggestions.risks.length} Selected
                    </Button>
                  )}
                </div>
                {feedback.risk_factors.map((risk, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border-2 ${getSeverityColor(risk.severity)}`}>
                    <div className="flex items-start gap-2 mb-2">
                      <Checkbox
                        checked={selectedSuggestions.risks?.includes(idx)}
                        onCheckedChange={() => toggleSuggestion('risks', idx)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">{risk.severity}</Badge>
                          <p className="font-semibold text-sm">{risk.risk}</p>
                        </div>
                        <p className="text-xs text-gray-600">{risk.mitigation}</p>
                        {risk.insert_text && (
                          <div className="mt-2 p-2 bg-white/60 rounded border border-gray-200">
                            <p className="text-xs font-medium text-gray-500 mb-1">AI Suggestion:</p>
                            <p className="text-xs text-gray-700">{risk.insert_text}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </>
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
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-blue-600" />
                    <p className="font-semibold text-blue-900">Optimization Opportunities</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedSuggestions.optimizations?.length === feedback.optimization_opportunities.length}
                      onCheckedChange={(checked) => {
                        if (checked) {
                          selectAllInCategory('optimizations', feedback.optimization_opportunities.length);
                        } else {
                          deselectAllInCategory('optimizations');
                        }
                      }}
                    />
                    <span className="text-xs">All</span>
                    {selectedSuggestions.optimizations?.length > 0 && (
                      <Button
                        size="sm"
                        onClick={() => applySelected('optimizations')}
                        className="text-xs h-6 ml-2"
                      >
                        Apply {selectedSuggestions.optimizations.length}
                      </Button>
                    )}
                  </div>
                </div>
                <div className="space-y-3">
                  {feedback.optimization_opportunities.map((opp, idx) => (
                    <div key={idx} className="bg-white rounded p-2 border border-blue-100">
                      <div className="flex items-start gap-2">
                        <Checkbox
                          checked={selectedSuggestions.optimizations?.includes(idx)}
                          onCheckedChange={() => toggleSuggestion('optimizations', idx)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="text-xs">{opp.area}</Badge>
                            <Badge variant="outline" className="text-xs">{opp.impact}</Badge>
                          </div>
                          <p className="text-xs text-gray-700 mb-1">{opp.suggestion}</p>
                          {opp.insert_text && (
                            <div className="mt-1 p-2 bg-blue-50/50 rounded border border-blue-100">
                              <p className="text-xs font-medium text-gray-500 mb-1">AI Suggestion:</p>
                              <p className="text-xs text-gray-700">{opp.insert_text}</p>
                            </div>
                          )}
                        </div>
                      </div>
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
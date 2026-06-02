import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Brain, 
  AlertTriangle, 
  CheckCircle2,
  TrendingUp,
  Loader2,
  CheckSquare
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { retrieveRelevantGuidelines, formatGuidelinesForPrompt } from "./GuidelineContextRetriever";

export default function ConsolidatedAIFeedback({
  enhancedNote,
  roughNote,
  patientData,
  diagnosis,
  vitalSigns,
  carePlans = [],
  onApplyFix,
  onComplete,
  appliedFixesText = new Set()
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
  const [stagedFixes, setStagedFixes] = useState([]);

  useEffect(() => {
    if (enhancedNote && !feedback) {
      analyzeFeedback();
    }
  }, [enhancedNote]);

  const analyzeFeedback = async () => {
    if (!enhancedNote) return;

    setIsAnalyzing(true);
    try {
      // Retrieve relevant Medicare guidelines for enhanced compliance analysis
      const relevantGuidelines = await retrieveRelevantGuidelines({
        diagnosis: diagnosis,
        visitType: patientData?.care_type || 'home_health',
        noteContent: enhancedNote,
        maxGuidelines: 3
      });

      const guidelinesContext = formatGuidelinesForPrompt(relevantGuidelines);

      const prompt = `Analyze this enhanced clinical note for completeness, Medicare compliance, accuracy, and overall quality. Provide comprehensive consolidated feedback with CONTEXT-AWARE explanations and actionable follow-up suggestions.

ENHANCED NOTE:
${enhancedNote}

PATIENT CONTEXT:
      - Patient: ${patientData ? `${patientData.first_name} ${patientData.last_name}, Age ${patientData.date_of_birth ? new Date().getFullYear() - new Date(patientData.date_of_birth).getFullYear() : 'Unknown'}` : 'Unknown'}
      - Primary Diagnosis: ${diagnosis || patientData?.primary_diagnosis || 'Not specified'}
      - Care Type: ${patientData?.care_type || 'home_health'}
      - Current Status: ${patientData?.status || 'active'}
      - Functional Status: ${patientData?.functional_status ? JSON.stringify(patientData.functional_status) : 'Not documented'}
      - Current Vitals: ${vitalSigns ? JSON.stringify(vitalSigns) : 'Not provided'}
      - Baseline Vitals: ${patientData?.baseline_vitals ? JSON.stringify(patientData.baseline_vitals) : 'Not documented'}
      - Current Medications: ${patientData?.current_medications?.length || 0} medications
      ${carePlans?.length > 0 ? `- Active Care Plans: ${carePlans.length} care plans` : ''}

ANALYSIS FRAMEWORK:
Provide CONTEXT-AWARE analysis by considering the patient's specific diagnosis, age, functional status, and current condition when evaluating documentation.

1. **Medicare Compliance Score** (0-100): Rate adherence to CMS requirements
   
2. **Critical Issues** - For EACH issue, explain:
   - WHY it's a compliance issue (reference specific CMS/Medicare requirements)
   - HOW it relates to THIS patient's diagnosis and condition
   - WHAT audit risks exist if this element is missing
   - Suggested follow-up actions or assessments needed
   
3. **Quality Improvements** - Grammar, terminology, clinical accuracy, clarity

4. **Risk Factors** - For EACH risk, explain:
   - WHY this is a risk given the patient's diagnosis and condition
   - WHAT complications could arise if not addressed
   - Suggested assessments or interventions to mitigate risk
   
5. **Optimization** - For EACH opportunity, explain:
   - WHY this would improve documentation
   - HOW it relates to patient outcomes or reimbursement
   - What follow-up assessments or actions are recommended
${guidelinesContext}

CRITICAL: Your analysis must strictly adhere to the Medicare guidelines provided above. Reference specific guideline requirements when identifying compliance issues.

Return as JSON:
{
  "overall_quality_score": 0-100,
  "medicare_compliance_score": 0-100,
  "compliance_status": "compliant|needs_review|non_compliant",
  "critical_issues": [
    {
      "category": "compliance|safety|required_element",
      "issue": "string - the specific issue",
      "why_compliance_issue": "string - explain WHY this is a compliance issue with reference to Medicare/CMS requirements and how it relates to this patient's diagnosis",
      "audit_risk": "string - explain what audit risks exist if this element is missing or incomplete",
      "recommendation": "string - action recommendation",
      "insert_text": "string - ready-to-paste clinical narrative",
      "follow_up_actions": ["string - suggested follow-up assessments or actions"]
    }
  ],
  "quality_improvements": [
    {
      "category": "grammar|terminology|clarity",
      "current": "string - problematic text",
      "improved": "string - corrected text",
      "rationale": "string - why this improves documentation"
    }
  ],
  "risk_factors": [
    {
      "risk": "string - the risk",
      "severity": "high|medium|low",
      "why_risk_for_patient": "string - explain WHY this is a risk given patient's diagnosis and condition",
      "potential_complications": "string - what could happen if not addressed",
      "mitigation": "string - mitigation explanation",
      "insert_text": "string - ready-to-paste clinical documentation",
      "recommended_assessments": ["string - suggested assessments or monitoring"]
    }
  ],
  "optimization_opportunities": [
    {
      "area": "string",
      "suggestion": "string - the opportunity",
      "why_important": "string - explain why this matters for THIS patient",
      "impact": "clinical|financial|both",
      "insert_text": "string - ready-to-paste enhanced narrative",
      "follow_up_recommendations": ["string - suggested next steps"]
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
                  why_compliance_issue: { type: "string" },
                  audit_risk: { type: "string" },
                  recommendation: { type: "string" },
                  insert_text: { type: "string" },
                  follow_up_actions: { type: "array", items: { type: "string" } }
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
                  why_risk_for_patient: { type: "string" },
                  potential_complications: { type: "string" },
                  mitigation: { type: "string" },
                  insert_text: { type: "string" },
                  recommended_assessments: { type: "array", items: { type: "string" } }
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
                  why_important: { type: "string" },
                  impact: { type: "string" },
                  insert_text: { type: "string" },
                  follow_up_recommendations: { type: "array", items: { type: "string" } }
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

  const stageSelected = (category) => {
    const selected = selectedSuggestions[category] || [];
    if (selected.length === 0) return;
    
    let textsToStage = [];

    if (category === 'critical') {
      textsToStage = selected.map(idx => feedback.critical_issues[idx]?.insert_text).filter(Boolean);
    } else if (category === 'quality') {
      textsToStage = selected.map(idx => feedback.quality_improvements[idx]?.improved).filter(Boolean);
    } else if (category === 'risks') {
      textsToStage = selected.map(idx => feedback.risk_factors[idx]?.insert_text).filter(Boolean);
    } else if (category === 'optimizations') {
      textsToStage = selected.map(idx => feedback.optimization_opportunities[idx]?.insert_text).filter(Boolean);
    }

    if (textsToStage.length > 0) {
      // Filter out already applied fixes
      const newFixes = textsToStage.filter(text => !appliedFixesText.has(text));
      setStagedFixes(prev => [...prev, ...newFixes]);
      deselectAllInCategory(category);
    }
  };

  const handleContinue = () => {
    if (stagedFixes.length > 0 && onApplyFix) {
      const combinedText = stagedFixes.join('\n\n');
      onApplyFix(combinedText, stagedFixes);
      setStagedFixes([]);
    }
    if (onComplete) {
      onComplete();
    }
  };

  if (isAnalyzing) {
    return (
      <Card className="border-2 border-purple-200">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
          <p className="text-sm text-slate-600">Analyzing note quality...</p>
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
                      onClick={() => stageSelected('critical')}
                      className="bg-red-600 hover:bg-red-700 text-xs h-7"
                    >
                      <CheckSquare className="w-3 h-3 mr-1" />
                      Stage {selectedSuggestions.critical.length} Selected
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
                      <div className="flex-1 space-y-2">
                        <div>
                          <Badge variant="outline" className="text-xs mb-1">{issue.category}</Badge>
                          <p className="font-semibold text-sm text-slate-900">{issue.issue}</p>
                        </div>
                        
                        {issue.why_compliance_issue && (
                          <div className="bg-red-100/50 rounded p-2 border border-red-200">
                            <p className="text-xs font-semibold text-red-900 mb-1">⚠️ Why This Matters:</p>
                            <p className="text-xs text-red-800">{issue.why_compliance_issue}</p>
                          </div>
                        )}
                        
                        {issue.audit_risk && (
                          <div className="bg-orange-100/50 rounded p-2 border border-orange-200">
                            <p className="text-xs font-semibold text-orange-900 mb-1">🔍 Audit Risk:</p>
                            <p className="text-xs text-orange-800">{issue.audit_risk}</p>
                          </div>
                        )}
                        
                        <p className="text-xs text-slate-600">💡 {issue.recommendation}</p>
                        
                        {issue.follow_up_actions && issue.follow_up_actions.length > 0 && (
                          <div className="bg-blue-50 rounded p-2 border border-blue-200">
                            <p className="text-xs font-semibold text-blue-900 mb-1">📋 Follow-Up Actions:</p>
                            <ul className="text-xs text-blue-800 space-y-1 ml-3">
                              {issue.follow_up_actions.map((action, i) => (
                                <li key={i} className="list-disc">{action}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {issue.insert_text && (
                          <div className="mt-2 p-2 bg-white/60 rounded border border-red-200">
                            <p className="text-xs font-medium text-slate-500 mb-1">AI Suggestion:</p>
                            <p className="text-xs text-slate-700">{issue.insert_text}</p>
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
                      onClick={() => stageSelected('quality')}
                      className="text-xs h-7"
                    >
                      <CheckSquare className="w-3 h-3 mr-1" />
                      Stage {selectedSuggestions.quality.length} Selected
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
                            <p className="text-xs text-slate-500">Current:</p>
                            <p className="text-slate-700 line-through">{improvement.current}</p>
                          </div>
                          <div>
                            <p className="text-xs text-slate-500">Improved:</p>
                            <p className="text-slate-900 font-medium">{improvement.improved}</p>
                          </div>
                          <p className="text-xs text-slate-600 italic">{improvement.rationale}</p>
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
                      onClick={() => stageSelected('risks')}
                      className="text-xs h-7"
                    >
                      <CheckSquare className="w-3 h-3 mr-1" />
                      Stage {selectedSuggestions.risks.length} Selected
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
                      <div className="flex-1 space-y-2">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant="outline" className="text-xs">{risk.severity}</Badge>
                          <p className="font-semibold text-sm">{risk.risk}</p>
                        </div>
                        
                        {risk.why_risk_for_patient && (
                          <div className="bg-yellow-100/50 rounded p-2 border border-yellow-200">
                            <p className="text-xs font-semibold text-yellow-900 mb-1">🎯 Why This is a Risk:</p>
                            <p className="text-xs text-yellow-800">{risk.why_risk_for_patient}</p>
                          </div>
                        )}
                        
                        {risk.potential_complications && (
                          <div className="bg-red-100/50 rounded p-2 border border-red-200">
                            <p className="text-xs font-semibold text-red-900 mb-1">⚠️ Potential Complications:</p>
                            <p className="text-xs text-red-800">{risk.potential_complications}</p>
                          </div>
                        )}
                        
                        <p className="text-xs text-slate-600">{risk.mitigation}</p>
                        
                        {risk.recommended_assessments && risk.recommended_assessments.length > 0 && (
                          <div className="bg-blue-50 rounded p-2 border border-blue-200">
                            <p className="text-xs font-semibold text-blue-900 mb-1">🔬 Recommended Assessments:</p>
                            <ul className="text-xs text-blue-800 space-y-1 ml-3">
                              {risk.recommended_assessments.map((assessment, i) => (
                                <li key={i} className="list-disc">{assessment}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {risk.insert_text && (
                          <div className="mt-2 p-2 bg-white/60 rounded border border-slate-200">
                            <p className="text-xs font-medium text-slate-500 mb-1">AI Suggestion:</p>
                            <p className="text-xs text-slate-700">{risk.insert_text}</p>
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
                        onClick={() => stageSelected('optimizations')}
                        className="text-xs h-6 ml-2"
                      >
                        Stage {selectedSuggestions.optimizations.length}
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
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="text-xs">{opp.area}</Badge>
                            <Badge variant="outline" className="text-xs">{opp.impact}</Badge>
                          </div>
                          <p className="text-xs text-slate-700 mb-1">{opp.suggestion}</p>
                          
                          {opp.why_important && (
                            <div className="bg-indigo-50 rounded p-2 border border-indigo-200">
                              <p className="text-xs font-semibold text-indigo-900 mb-1">💡 Why This Matters:</p>
                              <p className="text-xs text-indigo-800">{opp.why_important}</p>
                            </div>
                          )}
                          
                          {opp.follow_up_recommendations && opp.follow_up_recommendations.length > 0 && (
                            <div className="bg-green-50 rounded p-2 border border-green-200">
                              <p className="text-xs font-semibold text-green-900 mb-1">✅ Next Steps:</p>
                              <ul className="text-xs text-green-800 space-y-1 ml-3">
                                {opp.follow_up_recommendations.map((rec, i) => (
                                  <li key={i} className="list-disc">{rec}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                          
                          {opp.insert_text && (
                            <div className="mt-1 p-2 bg-blue-50/50 rounded border border-blue-100">
                              <p className="text-xs font-medium text-slate-500 mb-1">AI Suggestion:</p>
                              <p className="text-xs text-slate-700">{opp.insert_text}</p>
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

        {/* Continue Button */}
        <div className="border-t pt-4 mt-4">
          <div className="flex items-center justify-between">
            <div>
              {stagedFixes.length > 0 && (
                <Badge className="bg-blue-600 text-white">
                  {stagedFixes.length} fix{stagedFixes.length !== 1 ? 'es' : ''} staged
                </Badge>
              )}
            </div>
            <Button
              onClick={handleContinue}
              disabled={stagedFixes.length === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {stagedFixes.length > 0 ? `Apply ${stagedFixes.length} Fixes & Continue` : 'Continue Without Changes'}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
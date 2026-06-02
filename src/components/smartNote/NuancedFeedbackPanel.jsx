import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Brain,
  Loader2,
  CheckCircle2,
  FileText,
  Zap,
  Target,
  MessageSquare,
  Copy
} from "lucide-react";

export default function NuancedFeedbackPanel({ 
  noteContent, 
  visitType, 
  diagnosis,
  complianceTarget = 90,
  onApplyFix 
}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const analyzeFeedback = async () => {
    if (!noteContent || noteContent.length < 50) return;

    setIsAnalyzing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert clinical documentation reviewer. Analyze this clinical note and provide nuanced feedback on clarity, conciseness, and clinical specificity.

NOTE TO ANALYZE:
${noteContent}

VISIT TYPE: ${visitType}
DIAGNOSIS: ${diagnosis}
COMPLIANCE TARGET: ${complianceTarget}%

Provide detailed feedback in the following categories:

1. CLARITY (0-100)
   - Are clinical observations clear and unambiguous?
   - Is medical terminology used appropriately?
   - Are assessment findings easy to understand?
   - Identify vague language that needs specificity

2. CONCISENESS (0-100)
   - Is the note appropriately concise without unnecessary words?
   - Are there redundant statements?
   - Can any sections be streamlined?
   - Identify verbose passages

3. CLINICAL SPECIFICITY (0-100)
   - Are measurements objective and quantifiable?
   - Are symptoms described with appropriate detail?
   - Are interventions and patient responses specific?
   - Identify generic/vague statements needing specifics

4. MEDICARE COMPLIANCE (0-100)
   - Does it meet the ${complianceTarget}% compliance target?
   - What specific elements are missing?
   - What needs to be added to reach target?

For each category, provide:
- Score (0-100)
- Specific issues found (with line references if possible)
- Concrete suggestions for improvement
- Example rewrites showing before/after

Return JSON:
{
  "overall_score": 0-100,
  "gap_to_target": number (difference from ${complianceTarget}%),
  "clarity": {
    "score": 0-100,
    "issues": [
      {
        "finding": "vague language found",
        "example": "specific quote from note",
        "problem": "why this is problematic",
        "suggestion": "specific improvement recommendation",
        "rewrite": "exact text replacement"
      }
    ],
    "strengths": ["what's done well"]
  },
  "conciseness": {
    "score": 0-100,
    "issues": [
      {
        "finding": "verbose passage",
        "example": "specific quote",
        "problem": "why this is too wordy",
        "suggestion": "how to streamline",
        "rewrite": "concise version"
      }
    ],
    "strengths": ["what's done well"]
  },
  "clinical_specificity": {
    "score": 0-100,
    "issues": [
      {
        "finding": "generic statement",
        "example": "specific quote",
        "problem": "lacks measurable detail",
        "suggestion": "what to add",
        "rewrite": "specific version with measurements"
      }
    ],
    "strengths": ["what's done well"]
  },
  "medicare_compliance": {
    "score": 0-100,
    "missing_to_reach_target": ["elements needed to reach ${complianceTarget}%"],
    "critical_gaps": ["high-priority missing elements"],
    "quick_fixes": [
      {
        "element": "missing element name",
        "add_this_text": "exact text to add",
        "where": "where to add it (beginning/middle/end)",
        "impact_on_score": "+X points toward target"
      }
    ]
  },
  "actionable_improvements": [
    {
      "priority": "critical/high/medium",
      "category": "clarity/conciseness/specificity/compliance",
      "issue": "brief description",
      "current_text": "what's currently written",
      "improved_text": "suggested replacement",
      "impact": "how this improves the note",
      "effort": "easy/moderate/significant"
    }
  ],
  "path_to_target": {
    "current_score": 0-100,
    "target_score": ${complianceTarget},
    "gap": number,
    "estimated_improvements_needed": number,
    "prioritized_next_steps": [
      "1. First do this...",
      "2. Then add this...",
      "3. Finally improve this..."
    ]
  }
}`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: { type: "number" },
            gap_to_target: { type: "number" },
            clarity: { type: "object" },
            conciseness: { type: "object" },
            clinical_specificity: { type: "object" },
            medicare_compliance: { type: "object" },
            actionable_improvements: { type: "array", items: { type: "object" } },
            path_to_target: { type: "object" }
          }
        }
      });

      setFeedback(result);
    } catch (error) {
      console.error("Feedback analysis error:", error);
    }
    setIsAnalyzing(false);
  };

  const copyText = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const getScoreColor = (score) => {
    if (score >= 90) return "text-green-600";
    if (score >= 75) return "text-yellow-600";
    if (score >= 60) return "text-orange-600";
    return "text-red-600";
  };

  const getScoreBg = (score) => {
    if (score >= 90) return "bg-green-100 border-green-300";
    if (score >= 75) return "bg-yellow-100 border-yellow-300";
    if (score >= 60) return "bg-orange-100 border-orange-300";
    return "bg-red-100 border-red-300";
  };

  const getPriorityColor = (priority) => {
    const colors = {
      critical: "bg-red-600 text-white",
      high: "bg-orange-600 text-white",
      medium: "bg-yellow-600 text-white"
    };
    return colors[priority] || "bg-blue-600 text-white";
  };

  return (
    <Card className="border-2 border-purple-300">
      <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-pink-50">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-600" />
            Nuanced Feedback Analysis
          </div>
          {feedback && (
            <Badge className={getScoreBg(feedback.overall_score).split(' ')[0].replace('bg-', 'bg-')}>
              {feedback.overall_score}% overall
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 space-y-4">
        {!feedback ? (
          <>
            <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
              <p className="text-xs text-purple-800">
                Get AI-powered feedback on clarity, conciseness, clinical specificity, and Medicare compliance. 
                Target: {complianceTarget}% compliance
              </p>
            </div>
            <Button
              onClick={analyzeFeedback}
              disabled={isAnalyzing || !noteContent}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {isAnalyzing ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
              ) : (
                <><Brain className="w-4 h-4 mr-2" /> Analyze Note Quality</>
              )}
            </Button>
          </>
        ) : (
          <>
            {/* Progress to Target */}
            {feedback.path_to_target && (
              <div className={`p-3 rounded-lg border-2 ${feedback.gap_to_target > 0 ? 'bg-orange-50 border-orange-300' : 'bg-green-50 border-green-300'}`}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium">Compliance Progress</span>
                  <Badge className={feedback.gap_to_target > 0 ? 'bg-orange-600' : 'bg-green-600'}>
                    {feedback.path_to_target.current_score}% / {complianceTarget}%
                  </Badge>
                </div>
                <Progress value={(feedback.path_to_target.current_score / complianceTarget) * 100} className="h-2 mb-2" />
                {feedback.gap_to_target > 0 ? (
                  <p className="text-xs text-orange-800">
                    {feedback.gap_to_target} points to target - {feedback.path_to_target.estimated_improvements_needed} improvements needed
                  </p>
                ) : (
                  <p className="text-xs text-green-800">✓ Target achieved!</p>
                )}
              </div>
            )}

            {/* Score Breakdown */}
            <div className="grid grid-cols-2 gap-2">
              <div className="text-center p-2 bg-blue-50 rounded border">
                <p className="text-xs text-slate-600">Clarity</p>
                <p className={`text-lg font-bold ${getScoreColor(feedback.clarity?.score)}`}>
                  {feedback.clarity?.score}%
                </p>
              </div>
              <div className="text-center p-2 bg-purple-50 rounded border">
                <p className="text-xs text-slate-600">Conciseness</p>
                <p className={`text-lg font-bold ${getScoreColor(feedback.conciseness?.score)}`}>
                  {feedback.conciseness?.score}%
                </p>
              </div>
              <div className="text-center p-2 bg-green-50 rounded border">
                <p className="text-xs text-slate-600">Clinical Detail</p>
                <p className={`text-lg font-bold ${getScoreColor(feedback.clinical_specificity?.score)}`}>
                  {feedback.clinical_specificity?.score}%
                </p>
              </div>
              <div className="text-center p-2 bg-orange-50 rounded border">
                <p className="text-xs text-slate-600">Medicare</p>
                <p className={`text-lg font-bold ${getScoreColor(feedback.medicare_compliance?.score)}`}>
                  {feedback.medicare_compliance?.score}%
                </p>
              </div>
            </div>

            {/* Path to Target */}
            {feedback.path_to_target?.prioritized_next_steps?.length > 0 && (
              <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-300">
                <p className="text-xs font-semibold text-indigo-900 mb-2 flex items-center gap-1">
                  <Target className="w-3 h-3" /> Path to {complianceTarget}% Target
                </p>
                <ul className="space-y-1">
                  {feedback.path_to_target.prioritized_next_steps.map((step, i) => (
                    <li key={i} className="text-xs text-indigo-800">{step}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Quick Fixes for Compliance */}
            {feedback.medicare_compliance?.quick_fixes?.length > 0 && (
              <div className="bg-green-50 p-3 rounded-lg border-2 border-green-300">
                <p className="text-xs font-semibold text-green-900 mb-2 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> Quick Compliance Fixes
                </p>
                <div className="space-y-2">
                  {feedback.medicare_compliance.quick_fixes.map((fix, i) => (
                    <div key={i} className="bg-white p-2 rounded border border-green-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-medium text-slate-800">{fix.element}</span>
                        <Badge className="bg-green-600 text-white text-xs">
                          {fix.impact_on_score}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-600 mb-1 italic">Add at: {fix.where}</p>
                      <div className="bg-blue-50 p-1.5 rounded border border-blue-200 mb-1">
                        <p className="text-xs text-blue-900 font-mono">{fix.add_this_text}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full text-xs h-7"
                        onClick={() => onApplyFix?.(fix.add_this_text)}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" /> Apply Fix
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actionable Improvements */}
            {feedback.actionable_improvements?.length > 0 && (
              <Accordion type="single" collapsible className="space-y-2">
                {feedback.actionable_improvements.slice(0, 8).map((improvement, idx) => (
                  <AccordionItem key={idx} value={`improvement-${idx}`} className="border rounded-lg">
                    <AccordionTrigger className="px-3 py-2 hover:no-underline text-left">
                      <div className="flex items-center gap-2 w-full pr-2">
                        <Badge className={getPriorityColor(improvement.priority)}>
                          {improvement.priority}
                        </Badge>
                        <span className="text-xs flex-1">{improvement.issue}</span>
                        <Badge variant="outline" className="text-xs">
                          {improvement.category}
                        </Badge>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 pb-3">
                      <div className="space-y-2">
                        <div className="bg-red-50 p-2 rounded border border-red-200">
                          <p className="text-xs font-medium text-red-800 mb-1">Current:</p>
                          <p className="text-xs text-slate-700 italic">"{improvement.current_text}"</p>
                        </div>
                        <div className="bg-green-50 p-2 rounded border border-green-200">
                          <p className="text-xs font-medium text-green-800 mb-1 flex items-center justify-between">
                            Improved:
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2"
                              onClick={() => copyText(improvement.improved_text, idx)}
                            >
                              {copiedIndex === idx ? (
                                <CheckCircle2 className="w-3 h-3 text-green-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </Button>
                          </p>
                          <p className="text-xs text-slate-700 italic">"{improvement.improved_text}"</p>
                        </div>
                        <div className="bg-blue-50 p-2 rounded">
                          <p className="text-xs text-blue-800"><strong>Impact:</strong> {improvement.impact}</p>
                          <p className="text-xs text-blue-600 mt-1">Effort: {improvement.effort}</p>
                        </div>
                        <Button
                          size="sm"
                          className="w-full bg-indigo-600 hover:bg-indigo-700"
                          onClick={() => {
                            const updated = noteContent.replace(improvement.current_text, improvement.improved_text);
                            onApplyFix?.(updated, improvement.category, true);
                          }}
                        >
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Apply This Improvement
                        </Button>
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            )}

            {/* Detailed Category Feedback */}
            <Accordion type="multiple" className="space-y-2">
              {['clarity', 'conciseness', 'clinical_specificity'].map((category) => {
                const data = feedback[category];
                if (!data) return null;

                const icons = {
                  clarity: MessageSquare,
                  conciseness: Zap,
                  clinical_specificity: FileText
                };
                const Icon = icons[category];

                return (
                  <AccordionItem key={category} value={category} className="border rounded-lg">
                    <AccordionTrigger className="px-3 py-2 hover:no-underline bg-slate-50">
                      <div className="flex items-center justify-between w-full pr-2">
                        <div className="flex items-center gap-2">
                          <Icon className="w-4 h-4 text-slate-600" />
                          <span className="text-sm capitalize">{category.replace('_', ' ')}</span>
                        </div>
                        <span className={`text-lg font-bold ${getScoreColor(data.score)}`}>
                          {data.score}%
                        </span>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-3 pb-3">
                      {data.strengths?.length > 0 && (
                        <div className="mb-3 bg-green-50 p-2 rounded border border-green-200">
                          <p className="text-xs font-semibold text-green-800 mb-1">✓ Strengths</p>
                          <ul className="text-xs text-green-700 space-y-0.5">
                            {data.strengths.map((s, i) => <li key={i}>• {s}</li>)}
                          </ul>
                        </div>
                      )}
                      {data.issues?.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-xs font-semibold text-slate-700">Issues & Suggestions:</p>
                          {data.issues.map((issue, i) => (
                            <div key={i} className="bg-white p-2 rounded border">
                              <p className="text-xs font-medium text-slate-800 mb-1">{issue.finding}</p>
                              <div className="bg-slate-50 p-1.5 rounded mb-1">
                                <p className="text-xs text-slate-600 italic">"{issue.example}"</p>
                              </div>
                              <p className="text-xs text-orange-700 mb-1">{issue.problem}</p>
                              <div className="bg-green-50 p-1.5 rounded border border-green-200">
                                <p className="text-xs text-green-800 font-medium">→ {issue.suggestion}</p>
                                {issue.rewrite && (
                                  <p className="text-xs text-green-900 italic mt-1">"{issue.rewrite}"</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>

            <Button
              onClick={() => setFeedback(null)}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Refresh Analysis
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
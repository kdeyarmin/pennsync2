import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { trackAISuggestion } from "../training/SuggestionTracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  PenTool,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronDown,
  ChevronUp,
  Sparkles,
  BookOpen,
  ArrowRight,
  Copy,
  Check,
  RefreshCw,
  Lightbulb,
  Stethoscope,
  FileText,
  Wand2
} from "lucide-react";
import debounce from "lodash/debounce";

export default function AIGrammarTerminologyCorrector({
  noteContent,
  onApplyCorrection,
  onApplyAll,
  careType = "home_health"
}) {
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [appliedCorrections, setAppliedCorrections] = useState([]);
  const [copiedIndex, setCopiedIndex] = useState(null);

  // Debounced analysis
  const analyzeText = useCallback(
    debounce(async (content) => {
      if (!content || content.length < 30) {
        setAnalysis(null);
        return;
      }

      setIsAnalyzing(true);
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a clinical documentation editor specializing in ${careType === 'hospice' ? 'hospice' : 'home health'} nursing documentation. Analyze the following clinical note for:

1. GRAMMAR ERRORS: Identify grammatical mistakes, punctuation issues, sentence fragments
2. MEDICAL TERMINOLOGY: Identify informal or incorrect medical terms that should be replaced with proper clinical terminology
3. CLINICAL PHRASING: Suggest more professional, precise, or Medicare-compliant phrasing
4. CLARITY IMPROVEMENTS: Identify vague or ambiguous statements that should be more specific
5. ABBREVIATION ISSUES: Flag inappropriate abbreviations or suggest standard ones

CLINICAL NOTE:
${content}

For each issue found, provide:
- The original text
- The corrected/improved text
- Brief explanation of why

Also provide an overall improved version of the note with all corrections applied.

Return JSON:
{
  "overall_quality": "excellent" | "good" | "needs_improvement" | "poor",
  "grammar_score": 0-100,
  "terminology_score": 0-100,
  "clarity_score": 0-100,
  "grammar_issues": [
    {
      "original": "The original text with error",
      "corrected": "The corrected text",
      "error_type": "spelling" | "punctuation" | "subject_verb" | "tense" | "fragment" | "run_on",
      "explanation": "Brief explanation"
    }
  ],
  "terminology_corrections": [
    {
      "informal_term": "The informal or incorrect term used",
      "proper_term": "The correct medical terminology",
      "context": "The sentence context",
      "explanation": "Why this is preferred in clinical documentation"
    }
  ],
  "phrasing_improvements": [
    {
      "original_phrase": "Original phrasing",
      "improved_phrase": "Better clinical phrasing",
      "improvement_type": "specificity" | "professionalism" | "compliance" | "clarity",
      "rationale": "Why this is better"
    }
  ],
  "clarity_suggestions": [
    {
      "vague_statement": "The vague statement",
      "specific_alternative": "More specific version",
      "what_to_specify": "What details should be added"
    }
  ],
  "abbreviation_notes": [
    {
      "abbreviation": "The abbreviation used",
      "recommendation": "Use full term" | "Acceptable" | "Use standard abbreviation",
      "standard_form": "The standard way to write it",
      "note": "Additional note if needed"
    }
  ],
  "fully_corrected_note": "The complete note with all grammar, terminology, and phrasing corrections applied",
  "summary": "Brief summary of main issues found",
  "top_improvements": ["List of 3 most impactful improvements to make"]
}`,
          response_json_schema: {
            type: "object",
            properties: {
              overall_quality: { type: "string" },
              grammar_score: { type: "number" },
              terminology_score: { type: "number" },
              clarity_score: { type: "number" },
              grammar_issues: { type: "array", items: { type: "object" } },
              terminology_corrections: { type: "array", items: { type: "object" } },
              phrasing_improvements: { type: "array", items: { type: "object" } },
              clarity_suggestions: { type: "array", items: { type: "object" } },
              abbreviation_notes: { type: "array", items: { type: "object" } },
              fully_corrected_note: { type: "string" },
              summary: { type: "string" },
              top_improvements: { type: "array", items: { type: "string" } }
            }
          }
        });

        setAnalysis(result);
        setAppliedCorrections([]);
      } catch (error) {
        console.error("Error analyzing text:", error);
      }
      setIsAnalyzing(false);
    }, 2000),
    [careType]
  );

  useEffect(() => {
    if (noteContent && noteContent.length >= 30) {
      analyzeText(noteContent);
    }
    return () => analyzeText.cancel();
  }, [noteContent, analyzeText]);

  const handleApplyCorrection = (original, corrected, type, index) => {
    if (onApplyCorrection) {
      onApplyCorrection(original, corrected);
      setAppliedCorrections(prev => [...prev, `${type}-${index}`]);
    }
  };

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleApplyAll = () => {
    if (analysis?.fully_corrected_note && onApplyAll) {
      onApplyAll(analysis.fully_corrected_note);
    }
  };

  const getQualityColor = (quality) => {
    const colors = {
      excellent: 'bg-green-100 text-green-800',
      good: 'bg-blue-100 text-blue-800',
      needs_improvement: 'bg-yellow-100 text-yellow-800',
      poor: 'bg-red-100 text-red-800'
    };
    return colors[quality] || 'bg-gray-100 text-gray-800';
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-blue-600';
    if (score >= 50) return 'text-yellow-600';
    return 'text-red-600';
  };

  const totalIssues = analysis ? 
    (analysis.grammar_issues?.length || 0) + 
    (analysis.terminology_corrections?.length || 0) + 
    (analysis.phrasing_improvements?.length || 0) : 0;

  if (!noteContent || noteContent.length < 30) {
    return (
      <Card className="border-purple-200">
        <CardContent className="p-4 text-center text-gray-500 text-sm">
          <PenTool className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          Enter at least 30 characters for AI grammar & terminology analysis
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-purple-200">
      <CardHeader 
        className="py-2 bg-gradient-to-r from-purple-50 to-pink-50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <PenTool className="w-4 h-4 text-purple-600" />
            <span>AI Grammar & Terminology</span>
            {analysis && (
              <>
                <Badge className={getQualityColor(analysis.overall_quality)}>
                  {analysis.overall_quality?.replace('_', ' ')}
                </Badge>
                {totalIssues > 0 && (
                  <Badge variant="outline" className="text-xs">
                    {totalIssues} suggestions
                  </Badge>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isAnalyzing && <Loader2 className="w-3 h-3 animate-spin" />}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => { e.stopPropagation(); analyzeText(noteContent); }}
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-3 space-y-3 max-h-[500px] overflow-y-auto">
          {isAnalyzing && !analysis ? (
            <div className="text-center py-6">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-purple-600 mb-2" />
              <p className="text-xs text-gray-500">Analyzing grammar and terminology...</p>
            </div>
          ) : analysis ? (
            <>
              {/* Scores */}
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center p-2 bg-gray-50 rounded">
                  <p className="text-xs text-gray-500">Grammar</p>
                  <p className={`text-lg font-bold ${getScoreColor(analysis.grammar_score)}`}>
                    {analysis.grammar_score}%
                  </p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                  <p className="text-xs text-gray-500">Terminology</p>
                  <p className={`text-lg font-bold ${getScoreColor(analysis.terminology_score)}`}>
                    {analysis.terminology_score}%
                  </p>
                </div>
                <div className="text-center p-2 bg-gray-50 rounded">
                  <p className="text-xs text-gray-500">Clarity</p>
                  <p className={`text-lg font-bold ${getScoreColor(analysis.clarity_score)}`}>
                    {analysis.clarity_score}%
                  </p>
                </div>
              </div>

              {/* Summary */}
              {analysis.summary && (
                <Alert className="py-2 bg-purple-50 border-purple-200">
                  <AlertDescription className="text-xs text-purple-800">
                    {analysis.summary}
                  </AlertDescription>
                </Alert>
              )}

              {/* Top Improvements */}
              {analysis.top_improvements?.length > 0 && (
                <div className="bg-gradient-to-r from-purple-50 to-pink-50 p-2 rounded border border-purple-200">
                  <p className="text-xs font-semibold text-purple-800 mb-1 flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" /> Top Improvements
                  </p>
                  <ol className="text-xs text-purple-700 list-decimal list-inside space-y-0.5">
                    {analysis.top_improvements.map((imp, idx) => (
                      <li key={idx}>{imp}</li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Grammar Issues */}
              {analysis.grammar_issues?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                    <AlertCircle className="w-3 h-3 text-red-500" />
                    Grammar Issues ({analysis.grammar_issues.length})
                  </p>
                  {analysis.grammar_issues.slice(0, 5).map((issue, idx) => {
                    const isApplied = appliedCorrections.includes(`grammar-${idx}`);
                    return (
                      <div key={idx} className={`p-2 rounded border ${isApplied ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 text-xs mb-1">
                              <span className="line-through text-red-600">{issue.original}</span>
                              <ArrowRight className="w-3 h-3 text-gray-400 flex-shrink-0" />
                              <span className="text-green-700 font-medium">{issue.corrected}</span>
                            </div>
                            <p className="text-xs text-gray-500">{issue.explanation}</p>
                          </div>
                          {!isApplied && onApplyCorrection && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-6 px-2 text-xs"
                              onClick={() => handleApplyCorrection(issue.original, issue.corrected, 'grammar', idx)}
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                          )}
                          {isApplied && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Terminology Corrections */}
              {analysis.terminology_corrections?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                    <Stethoscope className="w-3 h-3 text-blue-500" />
                    Medical Terminology ({analysis.terminology_corrections.length})
                  </p>
                  {analysis.terminology_corrections.slice(0, 5).map((term, idx) => {
                    const isApplied = appliedCorrections.includes(`term-${idx}`);
                    return (
                      <div key={idx} className={`p-2 rounded border ${isApplied ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                        <div className="flex items-center gap-2 text-xs mb-1">
                          <Badge variant="outline" className="text-xs bg-white">
                            {term.informal_term}
                          </Badge>
                          <ArrowRight className="w-3 h-3 text-gray-400" />
                          <Badge className="bg-blue-600 text-white text-xs">
                            {term.proper_term}
                          </Badge>
                          {!isApplied && onApplyCorrection && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 px-1 ml-auto"
                              onClick={() => handleApplyCorrection(term.informal_term, term.proper_term, 'term', idx)}
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                          )}
                          {isApplied && <CheckCircle2 className="w-4 h-4 text-green-500 ml-auto" />}
                        </div>
                        <p className="text-xs text-gray-600">{term.explanation}</p>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Phrasing Improvements */}
              {analysis.phrasing_improvements?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                    <Sparkles className="w-3 h-3 text-purple-500" />
                    Better Clinical Phrasing ({analysis.phrasing_improvements.length})
                  </p>
                  {analysis.phrasing_improvements.slice(0, 4).map((phrase, idx) => {
                    const isApplied = appliedCorrections.includes(`phrase-${idx}`);
                    return (
                      <div key={idx} className={`p-2 rounded border ${isApplied ? 'bg-green-50 border-green-200' : 'bg-purple-50 border-purple-200'}`}>
                        <Badge variant="outline" className="text-xs mb-1">{phrase.improvement_type}</Badge>
                        <div className="text-xs space-y-1">
                          <p className="text-gray-600">
                            <span className="font-medium">Original:</span> {phrase.original_phrase}
                          </p>
                          <p className="text-purple-700">
                            <span className="font-medium">Improved:</span> {phrase.improved_phrase}
                          </p>
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <p className="text-xs text-gray-500 italic">{phrase.rationale}</p>
                          {!isApplied && onApplyCorrection && (
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-5 px-1"
                              onClick={() => handleApplyCorrection(phrase.original_phrase, phrase.improved_phrase, 'phrase', idx)}
                            >
                              <Check className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Clarity Suggestions */}
              {analysis.clarity_suggestions?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                    <BookOpen className="w-3 h-3 text-green-500" />
                    Clarity Improvements ({analysis.clarity_suggestions.length})
                  </p>
                  {analysis.clarity_suggestions.slice(0, 3).map((clarity, idx) => (
                    <div key={idx} className="bg-green-50 p-2 rounded border border-green-200">
                      <p className="text-xs text-gray-700">
                        <span className="font-medium">Vague:</span> "{clarity.vague_statement}"
                      </p>
                      <p className="text-xs text-green-700 mt-1">
                        <span className="font-medium">Better:</span> "{clarity.specific_alternative}"
                      </p>
                      <p className="text-xs text-gray-500 italic mt-1">
                        Add: {clarity.what_to_specify}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Apply All Button */}
              {analysis.fully_corrected_note && totalIssues > 0 && (
                <div className="pt-2 border-t space-y-2">
                  <Button
                    className="w-full bg-purple-600 hover:bg-purple-700 text-xs"
                    onClick={handleApplyAll}
                  >
                    <Wand2 className="w-3 h-3 mr-2" />
                    Apply All Corrections
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-xs"
                    onClick={() => handleCopy(analysis.fully_corrected_note, 'all')}
                  >
                    {copiedIndex === 'all' ? (
                      <><CheckCircle2 className="w-3 h-3 mr-2" /> Copied!</>
                    ) : (
                      <><Copy className="w-3 h-3 mr-2" /> Copy Corrected Version</>
                    )}
                  </Button>
                </div>
              )}

              {/* No Issues */}
              {totalIssues === 0 && (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-green-500 mb-2" />
                  <p className="text-xs text-green-700 font-medium">Excellent! No corrections needed.</p>
                  <p className="text-xs text-gray-500">Your documentation meets clinical standards.</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <Button size="sm" onClick={() => analyzeText(noteContent)}>
                <PenTool className="w-4 h-4 mr-2" />
                Analyze Text
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
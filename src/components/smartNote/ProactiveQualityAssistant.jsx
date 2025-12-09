import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Sparkles, 
  Lightbulb, 
  Wand2, 
  TrendingUp, 
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Loader2
} from "lucide-react";

export default function ProactiveQualityAssistant({
  roughNote,
  diagnosis,
  vitalSigns,
  patientData,
  onApplyImprovement,
  onApplyAll
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [appliedSuggestions, setAppliedSuggestions] = useState(new Set());

  // Debounced analysis when note reaches meaningful length
  useEffect(() => {
    if (roughNote && roughNote.length >= 100) {
      const timer = setTimeout(() => {
        analyzeQuality();
      }, 2000);
      return () => clearTimeout(timer);
    } else {
      setSuggestions([]);
    }
  }, [roughNote, diagnosis]);

  const analyzeQuality = async () => {
    if (!roughNote || roughNote.length < 100) return;
    
    setIsAnalyzing(true);
    try {
      const prompt = `You are a clinical documentation expert. Analyze this nursing note for quality improvements beyond basic compliance. Focus on elevating the professionalism and clarity of the documentation.

CURRENT NOTE:
${roughNote}

PATIENT CONTEXT:
- Diagnosis: ${diagnosis || 'Not specified'}
- Vital Signs: ${vitalSigns ? Object.entries(vitalSigns).filter(([k,v]) => v && k !== 'o2Source' && k !== 'o2Flow').map(([k,v]) => `${k}: ${v}`).join(', ') : 'None'}
- Patient: ${patientData ? `${patientData.first_name} ${patientData.last_name}` : 'Unknown'}

ANALYZE FOR THESE QUALITY ISSUES:

1. VAGUE LANGUAGE: Replace generic terms like "doing well", "stable", "unremarkable", "improving", "monitoring" with specific clinical observations
   - Bad: "Patient is doing well"
   - Good: "Patient reports decreased pain from 7/10 to 3/10, ambulating 50 feet without SOB, tolerating diet well with no nausea"

2. WEAK FLOW: Ensure logical progression (Subjective → Objective → Assessment → Interventions → Response → Plan)
   - Notes should tell a coherent clinical story
   - Avoid jumping between topics

3. GENERIC DESCRIPTIONS: Use precise measurements instead of qualitative terms
   - Bad: "some edema", "mild pain", "increased dyspnea"
   - Good: "2+ pitting edema bilateral LE measured 3cm above malleolus", "pain 4/10 on numeric scale", "dyspnea with 10-15 word sentences"

4. LAY TERMINOLOGY: Replace casual language with medical terms
   - Bad: "patient's breathing is worse", "belly pain", "can't walk far"
   - Good: "respiratory distress with accessory muscle use", "epigastric tenderness", "limited ambulation to 20 feet"

5. UNCLEAR OUTCOMES: Make interventions and results explicit
   - Bad: "taught about medications"
   - Good: "educated patient on Lasix 40mg purpose (fluid management), timing (morning), and side effects (increased urination, dizziness). Patient correctly demonstrated teach-back by explaining when to call MD for weight gain >3 lbs in 2 days"

Return JSON with specific suggestions that include before/after examples:
{
  "overall_quality_score": 0-100,
  "quality_level": "excellent" | "good" | "needs_improvement" | "poor",
  "suggestions": [
    {
      "issue_type": "vague_language" | "weak_flow" | "generic_description" | "lay_terminology" | "unclear_outcome",
      "priority": "high" | "medium" | "low",
      "current_text": "EXACT quote from note showing the weak text",
      "improved_text": "Complete improved version with specific clinical detail",
      "rationale": "Why this improvement elevates documentation quality",
      "impact": "Improves clarity" | "Improves specificity" | "Improves professionalism" | "Improves clinical accuracy"
    }
  ],
  "strengths": ["What's already good about the note"],
  "quick_tips": ["1-2 sentence actionable tips for immediate improvement"]
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_quality_score: { type: "number" },
            quality_level: { type: "string" },
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  issue_type: { type: "string" },
                  priority: { type: "string" },
                  current_text: { type: "string" },
                  improved_text: { type: "string" },
                  rationale: { type: "string" },
                  impact: { type: "string" }
                }
              }
            },
            strengths: { type: "array", items: { type: "string" } },
            quick_tips: { type: "array", items: { type: "string" } }
          }
        }
      });

      setSuggestions(result.suggestions || []);
    } catch (error) {
      console.error("Quality analysis error:", error);
    }
    setIsAnalyzing(false);
  };

  const handleApply = (suggestion, idx) => {
    if (onApplyImprovement) {
      onApplyImprovement(suggestion.current_text, suggestion.improved_text);
      setAppliedSuggestions(prev => new Set([...prev, idx]));
    }
  };

  const handleApplyAll = () => {
    if (onApplyAll && suggestions.length > 0) {
      const improvements = suggestions
        .filter((_, idx) => !appliedSuggestions.has(idx))
        .map(s => ({ from: s.current_text, to: s.improved_text }));
      onApplyAll(improvements);
      setAppliedSuggestions(new Set(suggestions.map((_, idx) => idx)));
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getIssueIcon = (issueType) => {
    switch (issueType) {
      case 'vague_language': return <AlertCircle className="w-4 h-4 text-orange-600" />;
      case 'weak_flow': return <TrendingUp className="w-4 h-4 text-yellow-600" />;
      case 'generic_description': return <Sparkles className="w-4 h-4 text-blue-600" />;
      case 'lay_terminology': return <Wand2 className="w-4 h-4 text-purple-600" />;
      case 'unclear_outcome': return <ArrowRight className="w-4 h-4 text-red-600" />;
      default: return <Lightbulb className="w-4 h-4 text-gray-600" />;
    }
  };

  if (roughNote.length < 100) {
    return (
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
        <CardContent className="p-4 text-center">
          <Sparkles className="w-8 h-8 text-purple-400 mx-auto mb-2" />
          <p className="text-sm text-purple-700">
            Keep typing... AI Quality Assistant will activate after 100 characters
          </p>
        </CardContent>
      </Card>
    );
  }

  if (isAnalyzing) {
    return (
      <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-indigo-50">
        <CardContent className="p-6">
          <div className="flex items-center gap-4">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600" />
            <div>
              <p className="text-base font-bold text-purple-900">🎯 Analyzing Note Quality...</p>
              <p className="text-sm text-purple-700">Checking for clarity, precision, and flow</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const unappliedSuggestions = suggestions.filter((_, idx) => !appliedSuggestions.has(idx));

  return (
    <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 via-indigo-50 to-purple-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Quality Assistant
          </CardTitle>
          {unappliedSuggestions.length > 0 && (
            <Badge className="bg-purple-600 text-white">
              {unappliedSuggestions.length} suggestion{unappliedSuggestions.length !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions.length === 0 ? (
          <div className="text-center py-4">
            <CheckCircle2 className="w-10 h-10 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-green-800">Excellent Documentation Quality!</p>
            <p className="text-xs text-green-700 mt-1">Your note is clear, specific, and professional</p>
          </div>
        ) : (
          <>
            {/* Apply All Button */}
            {unappliedSuggestions.length > 1 && (
              <Button
                onClick={handleApplyAll}
                className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
              >
                <Wand2 className="w-4 h-4 mr-2" />
                Apply All {unappliedSuggestions.length} Quality Improvements
              </Button>
            )}

            {/* Individual Suggestions */}
            <div className="space-y-3">
              {suggestions.map((suggestion, idx) => {
                const isApplied = appliedSuggestions.has(idx);
                
                return (
                  <div
                    key={idx}
                    className={`rounded-lg border-2 transition-all duration-300 ${
                      isApplied
                        ? 'bg-gray-50 border-gray-300 opacity-50'
                        : 'bg-white border-purple-200 hover:border-purple-300 shadow-sm hover:shadow-md'
                    }`}
                  >
                    <div className="p-3">
                      <div className="flex items-start gap-2 mb-2">
                        {getIssueIcon(suggestion.issue_type)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1 flex-wrap">
                            <Badge variant="outline" className="text-xs capitalize">
                              {suggestion.issue_type?.replace(/_/g, ' ')}
                            </Badge>
                            <Badge className={`text-xs ${getPriorityColor(suggestion.priority)}`}>
                              {suggestion.priority} priority
                            </Badge>
                            <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                              {suggestion.impact}
                            </Badge>
                            {isApplied && (
                              <Badge className="bg-green-600 text-white text-xs">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Applied
                              </Badge>
                            )}
                          </div>
                          
                          {/* Current (Weak) Text */}
                          <div className="bg-red-50 border border-red-200 rounded p-2 mb-2">
                            <p className="text-[10px] font-semibold text-red-800 mb-1">❌ Current (weak):</p>
                            <p className="text-xs text-red-900 line-through italic">"{suggestion.current_text}"</p>
                          </div>

                          {/* Improved Text */}
                          <div className="bg-green-50 border border-green-200 rounded p-2 mb-2">
                            <p className="text-[10px] font-semibold text-green-800 mb-1">✓ Improved (professional):</p>
                            <p className="text-xs text-green-900 font-medium">"{suggestion.improved_text}"</p>
                          </div>

                          {/* Rationale */}
                          <div className="bg-purple-50 border border-purple-200 rounded p-2">
                            <p className="text-[10px] font-semibold text-purple-800 mb-1">💡 Why this matters:</p>
                            <p className="text-xs text-purple-800">{suggestion.rationale}</p>
                          </div>
                        </div>
                      </div>

                      {!isApplied && (
                        <Button
                          size="sm"
                          onClick={() => handleApply(suggestion, idx)}
                          className="w-full mt-2 bg-purple-600 hover:bg-purple-700"
                        >
                          <Wand2 className="w-3 h-3 mr-1" />
                          Apply This Improvement
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
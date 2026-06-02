import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Shield, Sparkles, CheckCircle2, AlertTriangle, Plus, ChevronDown, ChevronUp } from "lucide-react";

export default function RealTimeComplianceAnalyzer({ 
  roughNote, 
  visitType, 
  diagnosis,
  patientData,
  onApplySuggestion,
  onApplyAll,
  autoAnalyze = true
}) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [appliedSuggestions, setAppliedSuggestions] = useState(new Set());
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (autoAnalyze && roughNote.length >= 100 && !analyzing) {
      const timer = setTimeout(() => analyzeCompliance(), 1000);
      return () => clearTimeout(timer);
    }
  }, [roughNote, autoAnalyze]);

  const analyzeCompliance = async () => {
    if (!roughNote || roughNote.length < 50) return;

    setAnalyzing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this rough nursing note for Medicare compliance gaps. Provide actionable suggestions.

ROUGH NOTE:
${roughNote}

VISIT TYPE: ${visitType}
DIAGNOSIS: ${diagnosis}

Identify what's MISSING that Medicare requires:
1. Homebound status justification
2. Skilled need documentation
3. Patient response to care
4. Functional assessment
5. Safety/risk factors
6. Care coordination
7. Plan of care

For each gap, provide:
- Specific text to ADD to the note
- Why it's required
- Compliance priority (critical/high/medium)

Return JSON with compliance score and suggestions.`,
        response_json_schema: {
          type: "object",
          properties: {
            compliance_score: { type: "number" },
            missing_critical_elements: { 
              type: "array", 
              items: { type: "string" } 
            },
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  gap: { type: "string" },
                  suggested_text: { type: "string" },
                  rationale: { type: "string" },
                  priority: { type: "string" }
                }
              }
            },
            strengths: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setAnalysis(result);
      setAppliedSuggestions(new Set());
    } catch (error) {
      console.error('Compliance analysis error:', error);
    }
    setAnalyzing(false);
  };

  const handleApplySuggestion = (suggestion, index) => {
    onApplySuggestion(suggestion.suggested_text, suggestion.category);
    setAppliedSuggestions(prev => new Set([...prev, index]));
  };

  const handleAcceptAll = () => {
    if (!analysis?.suggestions) return;

    const allText = analysis.suggestions
      .filter((_, idx) => !appliedSuggestions.has(idx))
      .map(s => s.suggested_text)
      .join('\n\n');

    onApplyAll?.(allText);
    setAppliedSuggestions(new Set(analysis.suggestions.map((_, idx) => idx)));
  };

  if (!roughNote || roughNote.length < 50) {
    return null;
  }

  const pendingSuggestions = analysis?.suggestions?.filter((_, idx) => !appliedSuggestions.has(idx)) || [];

  return (
    <Card className={`border-2 ${
      analysis?.compliance_score >= 80 ? 'border-green-300 bg-green-50' :
      analysis?.compliance_score >= 60 ? 'border-yellow-300 bg-yellow-50' :
      'border-red-300 bg-red-50'
    }`}>
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Shield className="w-4 h-4 text-blue-600" />
            Real-Time Medicare Compliance Analysis
            {analysis && (
              <Badge className={`ml-2 ${
                analysis.compliance_score >= 80 ? 'bg-green-600' :
                analysis.compliance_score >= 60 ? 'bg-yellow-500' : 'bg-red-600'
              }`}>
                {analysis.compliance_score}% Compliant
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {pendingSuggestions.length > 0 && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAcceptAll();
                }}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Accept All ({pendingSuggestions.length})
              </Button>
            )}
            {!analyzing && !analysis && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  analyzeCompliance();
                }}
              >
                <Sparkles className="w-4 h-4 mr-1" />
                Analyze
              </Button>
            )}
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </CardHeader>
      
      {expanded && (
        <CardContent className="space-y-4">
          {analyzing && (
            <div className="text-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2" />
              <p className="text-sm text-slate-600">Analyzing compliance...</p>
            </div>
          )}

          {analysis && (
            <>
              {/* Strengths */}
              {analysis.strengths?.length > 0 && (
                <div className="bg-green-100 border border-green-300 rounded-lg p-3">
                  <p className="text-xs font-semibold text-green-900 mb-2 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Well Documented
                  </p>
                  <ul className="space-y-1">
                    {analysis.strengths.slice(0, 3).map((strength, idx) => (
                      <li key={idx} className="text-xs text-green-800">✓ {strength}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Critical Gaps */}
              {analysis.missing_critical_elements?.length > 0 && (
                <Alert className="bg-red-50 border-red-300">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <AlertDescription className="text-sm text-red-900">
                    <strong>Critical Elements Missing:</strong>
                    <ul className="mt-1 space-y-1">
                      {analysis.missing_critical_elements.map((element, idx) => (
                        <li key={idx}>• {element}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Suggestions */}
              {analysis.suggestions?.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold text-slate-700">Compliance Improvements</p>
                    {pendingSuggestions.length > 0 && (
                      <Button
                        size="sm"
                        onClick={handleAcceptAll}
                        className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 h-7"
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Accept All ({pendingSuggestions.length})
                      </Button>
                    )}
                  </div>

                  {analysis.suggestions.map((suggestion, idx) => {
                    const isApplied = appliedSuggestions.has(idx);
                    return (
                      <Card key={idx} className={`border-l-4 ${
                        isApplied ? 'border-l-green-500 bg-green-50 opacity-60' :
                        suggestion.priority === 'critical' ? 'border-l-red-500' :
                        suggestion.priority === 'high' ? 'border-l-orange-500' : 'border-l-yellow-500'
                      }`}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={`text-xs ${
                                  suggestion.priority === 'critical' ? 'bg-red-600' :
                                  suggestion.priority === 'high' ? 'bg-orange-500' : 'bg-yellow-500'
                                }`}>
                                  {suggestion.priority}
                                </Badge>
                                <span className="text-xs font-semibold text-slate-900">{suggestion.category}</span>
                              </div>
                              <p className="text-xs text-slate-700 mb-2">{suggestion.gap}</p>
                            </div>
                            {!isApplied && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApplySuggestion(suggestion, idx)}
                                className="flex-shrink-0 h-7"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add
                              </Button>
                            )}
                            {isApplied && (
                              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                            )}
                          </div>
                          
                          <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-2">
                            <p className="text-xs text-blue-900 font-mono">{suggestion.suggested_text}</p>
                          </div>
                          
                          <p className="text-xs text-slate-600 italic">{suggestion.rationale}</p>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {analysis.suggestions?.length === 0 && (
                <Alert className="bg-green-50 border-green-300">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-sm text-green-900">
                    Great job! Your note meets all Medicare compliance requirements.
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
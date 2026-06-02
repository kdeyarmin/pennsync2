import { useState, useEffect, useCallback, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Sparkles, Type, Stethoscope, Zap, ChevronRight } from "lucide-react";
import _ from 'lodash';

export default function RealTimeSuggestions({ currentText, diagnosis, careType, onInsertSuggestion }) {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastAnalyzedText, setLastAnalyzedText] = useState("");
  const [sentenceCompletions, setSentenceCompletions] = useState([]);
  const [terminologyHints, setTerminologyHints] = useState([]);
  const abortControllerRef = useRef(null);

  // Debounced analysis function - now faster for real-time feel
  const analyzeSuggestions = useCallback(
    _.debounce(async (text) => {
      if (!text || text.length < 15 || text === lastAnalyzedText) return;
      
      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      setIsLoading(true);
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `You are an AI assistant helping a ${careType === 'hospice' ? 'hospice' : 'home health'} nurse document clinical notes in real-time.

CURRENT TEXT BEING TYPED:
"${text}"

PATIENT DIAGNOSIS: ${diagnosis || 'Not specified'}

Analyze the text and provide:
1. SENTENCE COMPLETIONS: Based on the last incomplete sentence, suggest 2-3 natural completions
2. TERMINOLOGY CORRECTIONS: If informal terms are used, suggest proper medical terminology
3. CONTEXTUAL SUGGESTIONS: Missing elements or enhancements based on the content

Return JSON:
{
  "sentence_completions": [
    {
      "trigger": "The partial sentence that triggers this",
      "completion": "How to complete the sentence",
      "full_sentence": "The complete sentence as it would appear"
    }
  ],
  "terminology_corrections": [
    {
      "informal": "The informal term used",
      "formal": "Proper medical terminology",
      "context": "Brief explanation"
    }
  ],
  "contextual_suggestions": [
    {
      "type": "completion" | "missing_detail" | "compliance" | "enhancement",
      "suggestion": "The suggestion text",
      "insert_text": "Text ready to insert into the note",
      "priority": "high" | "medium" | "low"
    }
  ]
}`,
          response_json_schema: {
            type: "object",
            properties: {
              sentence_completions: { type: "array", items: { type: "object" } },
              terminology_corrections: { type: "array", items: { type: "object" } },
              contextual_suggestions: { type: "array", items: { type: "object" } }
            }
          }
        });

        setSentenceCompletions(result.sentence_completions || []);
        setTerminologyHints(result.terminology_corrections || []);
        setSuggestions(result.contextual_suggestions || []);
        setLastAnalyzedText(text);
      } catch (error) {
        if (error.name !== 'AbortError') {
          console.error("Error analyzing text:", error);
        }
      }
      setIsLoading(false);
    }, 800), // Faster debounce for more real-time feel
    [diagnosis, careType, lastAnalyzedText]
  );

  useEffect(() => {
    if (currentText && currentText.length > 15) {
      analyzeSuggestions(currentText);
    } else {
      setSuggestions([]);
      setSentenceCompletions([]);
      setTerminologyHints([]);
    }
    
    return () => {
      analyzeSuggestions.cancel();
    };
  }, [currentText, analyzeSuggestions]);

  const getTypeIcon = (type) => {
    switch (type) {
      case 'completion': return <Type className="w-3 h-3" />;
      case 'missing_detail': return <Stethoscope className="w-3 h-3" />;
      case 'compliance': return <Zap className="w-3 h-3" />;
      default: return <Sparkles className="w-3 h-3" />;
    }
  };

  const getTypeColor = (type) => {
    switch (type) {
      case 'completion': return 'bg-blue-100 text-blue-800';
      case 'missing_detail': return 'bg-orange-100 text-orange-800';
      case 'compliance': return 'bg-red-100 text-red-800';
      default: return 'bg-purple-100 text-purple-800';
    }
  };

  const hasContent = sentenceCompletions.length > 0 || terminologyHints.length > 0 || suggestions.length > 0;

  return (
    <Card className="border-purple-200">
      <CardHeader className="py-3 bg-gradient-to-r from-purple-50 to-pink-50">
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            Real-Time AI Suggestions
          </div>
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-purple-600" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-3 max-h-96 overflow-y-auto">
        {!currentText || currentText.length < 15 ? (
          <p className="text-xs text-slate-500 text-center py-4">
            Start typing your notes to see real-time AI suggestions...
          </p>
        ) : !hasContent && !isLoading ? (
          <p className="text-xs text-slate-500 text-center py-4">
            Keep typing for suggestions...
          </p>
        ) : (
          <>
            {/* Sentence Completions */}
            {sentenceCompletions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                  <Type className="w-3 h-3" /> Complete Sentence
                </p>
                {sentenceCompletions.slice(0, 2).map((comp, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-blue-50 rounded-lg border border-blue-200 cursor-pointer hover:bg-blue-100 transition-colors"
                    onClick={() => onInsertSuggestion(comp.completion, 'inline')}
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-blue-900 truncate flex-1">
                        ...{comp.completion}
                      </p>
                      <ChevronRight className="w-3 h-3 text-blue-600 flex-shrink-0 ml-1" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Terminology Hints */}
            {terminologyHints.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600 flex items-center gap-1">
                  <Stethoscope className="w-3 h-3" /> Medical Terminology
                </p>
                {terminologyHints.map((hint, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-amber-50 rounded-lg border border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors"
                    onClick={() => onInsertSuggestion(hint.formal, 'inline')}
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <span className="line-through text-slate-500">{hint.informal}</span>
                      <span>→</span>
                      <span className="font-medium text-amber-900">{hint.formal}</span>
                    </div>
                    <p className="text-xs text-slate-600 mt-1">{hint.context}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Contextual Suggestions */}
            {suggestions.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-semibold text-slate-600">Suggestions</p>
                {suggestions.slice(0, 4).map((suggestion, idx) => (
                  <div
                    key={idx}
                    className="p-2 bg-slate-50 rounded-lg border cursor-pointer hover:bg-slate-100 transition-colors"
                    onClick={() => onInsertSuggestion(suggestion.insert_text || suggestion.suggestion, 'block')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {getTypeIcon(suggestion.type)}
                        <Badge className={`${getTypeColor(suggestion.type)} text-xs py-0`}>
                          {suggestion.type?.replace('_', ' ')}
                        </Badge>
                      </div>
                      {suggestion.priority === 'high' && (
                        <Badge className="bg-red-100 text-red-800 text-xs py-0">!</Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-700 mt-1">{suggestion.suggestion}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
import { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Check,
  X
} from "lucide-react";

export default function InlineSuggestions({
  currentText,
  _cursorPosition,
  diagnosis,
  careType,
  onAcceptSuggestion
}) {
  const [suggestion, setSuggestion] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const lastTextRef = useRef("");

  // Trigger suggestion when user pauses typing
  useEffect(() => {
    if (!currentText || currentText.length < 20) {
      setSuggestion(null);
      return;
    }

    // Only trigger on new text
    if (currentText === lastTextRef.current) return;
    
    const timer = setTimeout(() => {
      // Check if user ended with incomplete sentence or specific triggers
      const lastChars = currentText.slice(-50);
      const shouldSuggest = 
        lastChars.endsWith('...') ||
        lastChars.endsWith(' and') ||
        lastChars.endsWith(' the') ||
        lastChars.endsWith(' with') ||
        lastChars.endsWith(' patient') ||
        (currentText.length > lastTextRef.current.length + 20);

      if (shouldSuggest) {
        generateSuggestion();
      }
      lastTextRef.current = currentText;
    }, 1500);

    return () => clearTimeout(timer);
  }, [currentText]);

  const generateSuggestion = async () => {
    setIsLoading(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI assistant helping a nurse complete clinical documentation. 
        
The nurse is documenting a ${careType} visit for a patient with ${diagnosis || 'unspecified diagnosis'}.

Current note text:
"${currentText}"

Provide a SHORT completion or enhancement (1-2 sentences max) that would naturally continue or improve the documentation. Focus on:
- Medicare-compliant language
- Clinical terminology
- Specific, measurable observations

Return JSON:
{
  "suggestion": "The suggested text to add",
  "type": "completion" | "enhancement" | "compliance",
  "rationale": "Very brief reason"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestion: { type: "string" },
            type: { type: "string" },
            rationale: { type: "string" }
          }
        }
      });

      setSuggestion(result);
    } catch (error) {
      console.error("Suggestion error:", error);
    }
    setIsLoading(false);
  };

  const handleAccept = () => {
    if (suggestion) {
      onAcceptSuggestion(suggestion.suggestion);
      setSuggestion(null);
    }
  };

  const handleDismiss = () => {
    setSuggestion(null);
  };

  if (!suggestion && !isLoading) return null;

  return (
    <div className="mt-2 animate-in slide-in-from-bottom-2">
      {isLoading ? (
        <div className="flex items-center gap-2 text-xs text-purple-600 bg-purple-50 px-3 py-2 rounded-lg">
          <Sparkles className="w-3 h-3 animate-pulse" />
          <span>Generating suggestion...</span>
        </div>
      ) : suggestion && (
        <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-purple-600 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <Badge variant="outline" className="text-xs bg-purple-100 text-purple-700 border-purple-300">
                  {suggestion.type}
                </Badge>
                <span className="text-xs text-slate-500">{suggestion.rationale}</span>
              </div>
              <p className="text-sm text-slate-800 italic">
                "{suggestion.suggestion}"
              </p>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-2">
            <Button
              size="sm"
              variant="ghost"
              className="h-7 text-xs"
              onClick={handleDismiss}
            >
              <X className="w-3 h-3 mr-1" />
              Dismiss
            </Button>
            <Button
              size="sm"
              className="h-7 text-xs bg-purple-600 hover:bg-purple-700"
              onClick={handleAccept}
            >
              <Check className="w-3 h-3 mr-1" />
              Insert
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
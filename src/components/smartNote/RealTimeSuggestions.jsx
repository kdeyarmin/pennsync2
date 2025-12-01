import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, Plus, Loader2, Zap } from "lucide-react";
import debounce from "lodash/debounce";

export default function RealTimeSuggestions({ 
  currentText, 
  diagnosis, 
  careType, 
  onInsertSuggestion 
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [lastAnalyzedText, setLastAnalyzedText] = useState("");

  const analyzeSuggestions = useCallback(
    debounce(async (text) => {
      if (!text || text.length < 50 || text === lastAnalyzedText) return;
      
      setIsAnalyzing(true);
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a clinical documentation AI assistant. Analyze this partial nursing note and provide real-time suggestions.

CURRENT NOTE (in progress):
${text}

CONTEXT:
- Diagnosis: ${diagnosis || 'Not specified'}
- Care Type: ${careType === 'hospice' ? 'Hospice' : 'Home Health'}

Provide 2-4 brief, contextual suggestions for:
1. Sentence completions or next logical statements
2. Missing clinical details that should be added
3. Medical terminology improvements
4. Medicare compliance elements if missing

Return JSON:
{
  "suggestions": [
    {
      "type": "completion" | "missing" | "terminology" | "compliance",
      "text": "The suggested text to insert",
      "preview": "Short preview (10-15 words max)",
      "position": "inline" | "append"
    }
  ]
}`,
          response_json_schema: {
            type: "object",
            properties: {
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    text: { type: "string" },
                    preview: { type: "string" },
                    position: { type: "string" }
                  }
                }
              }
            }
          }
        });

        setSuggestions(result.suggestions || []);
        setLastAnalyzedText(text);
      } catch (error) {
        console.error("Error getting suggestions:", error);
      }
      setIsAnalyzing(false);
    }, 2000),
    [diagnosis, careType, lastAnalyzedText]
  );

  useEffect(() => {
    if (currentText && currentText.length > 50) {
      analyzeSuggestions(currentText);
    }
  }, [currentText, analyzeSuggestions]);

  const getTypeColor = (type) => {
    const colors = {
      completion: "bg-blue-100 text-blue-800",
      missing: "bg-orange-100 text-orange-800",
      terminology: "bg-purple-100 text-purple-800",
      compliance: "bg-red-100 text-red-800"
    };
    return colors[type] || "bg-gray-100 text-gray-800";
  };

  const getTypeLabel = (type) => {
    const labels = {
      completion: "Complete",
      missing: "Add",
      terminology: "Term",
      compliance: "Required"
    };
    return labels[type] || type;
  };

  if (!currentText || currentText.length < 50) {
    return (
      <Card className="bg-gray-50 border-gray-200">
        <CardContent className="p-4 text-center text-gray-500 text-sm">
          <Sparkles className="w-6 h-6 mx-auto mb-2 text-gray-400" />
          Start typing to get real-time AI suggestions...
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-blue-200">
      <CardHeader className="py-3 bg-gradient-to-r from-blue-50 to-indigo-50">
        <CardTitle className="text-sm flex items-center gap-2">
          <Zap className="w-4 h-4 text-blue-600" />
          Real-Time Suggestions
          {isAnalyzing && <Loader2 className="w-4 h-4 animate-spin text-blue-600" />}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3 space-y-2">
        {suggestions.length === 0 && !isAnalyzing && (
          <p className="text-xs text-gray-500 text-center py-2">
            Continue typing for suggestions...
          </p>
        )}
        
        {suggestions.map((suggestion, idx) => (
          <div
            key={idx}
            className="p-2 bg-white rounded border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all cursor-pointer group"
            onClick={() => onInsertSuggestion(suggestion.text, suggestion.position)}
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1 min-w-0">
                <Badge className={`${getTypeColor(suggestion.type)} text-xs mb-1`}>
                  {getTypeLabel(suggestion.type)}
                </Badge>
                <p className="text-xs text-gray-700 line-clamp-2">
                  {suggestion.preview}
                </p>
              </div>
              <Button
                size="sm"
                variant="ghost"
                className="opacity-0 group-hover:opacity-100 h-6 w-6 p-0"
              >
                <Plus className="w-3 h-3" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
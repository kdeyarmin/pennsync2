import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Sparkles,
  AlertTriangle,
  ChevronRight,
  Loader2
} from "lucide-react";
import { debounce } from "lodash";

export default function DocumentationAssistantPopup({
  noteText,
  careType,
  diagnosis,
  _cursorPosition,
  onInsert
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const getSuggestions = debounce(async () => {
      if (!noteText || noteText.length < 20) {
        setSuggestions([]);
        return;
      }

      // Get last sentence/phrase for context
      const lastPart = noteText.slice(-200);
      
      setIsLoading(true);
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a clinical documentation AI assistant. Based on the current note context, provide smart suggestions for what to document next.

CARE TYPE: ${careType === 'hospice' ? 'Hospice' : 'Home Health'}
DIAGNOSIS: ${diagnosis || 'Not specified'}

CURRENT NOTE ENDING:
"${lastPart}"

Provide 3-5 contextual suggestions for:
1. What clinical element should be documented next
2. Missing compliance elements that should be added
3. Natural next steps in documentation flow

Return JSON:
{
  "suggestions": [
    {
      "type": "next_element" | "missing_compliance" | "enhancement",
      "text": "Suggested text to insert",
      "reason": "Why this is suggested",
      "priority": "high" | "medium" | "low"
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
                    reason: { type: "string" },
                    priority: { type: "string" }
                  }
                }
              }
            }
          }
        });

        setSuggestions(result.suggestions || []);
      } catch (error) {
        console.error("Error getting suggestions:", error);
      }
      setIsLoading(false);
    }, 1500);

    getSuggestions();
    return () => getSuggestions.cancel();
  }, [noteText, careType, diagnosis]);

  const getTypeIcon = (type) => {
    switch (type) {
      case 'missing_compliance': return <AlertTriangle className="w-3 h-3 text-orange-600" />;
      case 'next_element': return <ChevronRight className="w-3 h-3 text-blue-600" />;
      default: return <Sparkles className="w-3 h-3 text-purple-600" />;
    }
  };

  const handleInsert = (text) => {
    onInsert && onInsert(text);
    setIsOpen(false);
  };

  if (suggestions.length === 0 && !isLoading) return null;

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="gap-1 h-7 text-xs border-purple-300 text-purple-700 hover:bg-purple-50"
        >
          <Sparkles className="w-3 h-3" />
          {isLoading ? 'Thinking...' : `${suggestions.length} Suggestions`}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-2" align="start">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-slate-700 mb-2">AI Suggestions</p>
          {isLoading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="w-5 h-5 animate-spin text-purple-600" />
            </div>
          ) : (
            suggestions.map((sug, idx) => (
              <div
                key={idx}
                className="p-2 rounded border hover:bg-slate-50 cursor-pointer transition-colors"
                onClick={() => handleInsert(sug.text)}
              >
                <div className="flex items-center gap-2 mb-1">
                  {getTypeIcon(sug.type)}
                  <span className="text-xs font-medium">{sug.type.replace(/_/g, ' ')}</span>
                  {sug.priority === 'high' && (
                    <Badge className="bg-red-100 text-red-800 text-xs h-4">Important</Badge>
                  )}
                </div>
                <p className="text-xs text-slate-700 mb-1">{sug.text}</p>
                <p className="text-xs text-slate-500 italic">{sug.reason}</p>
              </div>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
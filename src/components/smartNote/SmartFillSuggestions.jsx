import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Plus, Loader2, Lightbulb } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function SmartFillSuggestions({
  currentSection, // "subjective", "objective", "assessment", "plan"
  sectionContent,
  diagnosis,
  previousSections = {},
  onInsertSuggestion
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastAnalyzedContent, setLastAnalyzedContent] = useState("");

  useEffect(() => {
    // Only generate suggestions if content changed significantly
    const contentHash = JSON.stringify({ currentSection, sectionContent, previousSections });
    if (contentHash !== lastAnalyzedContent && sectionContent?.length > 20) {
      const timer = setTimeout(() => {
        generateSmartSuggestions();
        setLastAnalyzedContent(contentHash);
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [currentSection, sectionContent, previousSections]);

  const generateSmartSuggestions = async () => {
    if (!currentSection || !sectionContent) return;
    
    setIsLoading(true);
    try {
      const prompt = `You are an AI assistant helping nurses complete SOAP documentation. Based on what's written in the current section, suggest content for the NEXT sections.

CURRENT SECTION: ${currentSection.toUpperCase()}
CURRENT CONTENT: ${sectionContent}

DIAGNOSIS: ${diagnosis || 'Not specified'}

PREVIOUS SECTIONS COMPLETED:
${Object.entries(previousSections).map(([k, v]) => `${k.toUpperCase()}: ${v}`).join('\n') || 'None'}

Based on the current documentation, provide smart suggestions for what should be documented in subsequent sections. These should be specific, clinically relevant, and flow logically from what's already written.

For example:
- If Subjective mentions "patient reports increased shortness of breath", suggest for Objective: "Auscultate lung sounds, check O2 saturation"
- If Objective shows "BP 160/95", suggest for Assessment: "Hypertension - elevated from baseline"
- If Assessment notes a problem, suggest for Plan: specific interventions

Return JSON:
{
  "suggestions": [
    {
      "target_section": "objective|assessment|plan",
      "suggestion_text": "Specific text to add",
      "rationale": "Why this follows from current content",
      "priority": "high|medium|low"
    }
  ]
}

Provide 2-4 relevant suggestions max. Only suggest for sections that come AFTER the current section in SOAP order.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  target_section: { type: "string" },
                  suggestion_text: { type: "string" },
                  rationale: { type: "string" },
                  priority: { type: "string" }
                }
              }
            }
          }
        }
      });

      setSuggestions(result.suggestions || []);
    } catch (error) {
      console.error("Error generating smart fill suggestions:", error);
    }
    setIsLoading(false);
  };

  if (suggestions.length === 0 && !isLoading) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        className="mt-3"
      >
        <Card className="border-purple-200 bg-gradient-to-r from-purple-50 to-indigo-50">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Lightbulb className="w-4 h-4 text-purple-600" />
              <span className="text-xs font-semibold text-purple-800">Smart Fill Suggestions</span>
              {isLoading && <Loader2 className="w-3 h-3 animate-spin text-purple-600" />}
            </div>
            
            <div className="space-y-2">
              {suggestions.map((suggestion, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.1 }}
                  className="flex items-start gap-2 p-2 bg-white rounded-lg border border-purple-100"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge variant="outline" className="text-xs capitalize">
                        {suggestion.target_section}
                      </Badge>
                      <Badge className={
                        suggestion.priority === 'high' ? 'bg-red-500' :
                        suggestion.priority === 'medium' ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }>
                        {suggestion.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-800">{suggestion.suggestion_text}</p>
                    <p className="text-xs text-gray-500 italic mt-1">{suggestion.rationale}</p>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-purple-600 hover:text-purple-700 hover:bg-purple-100"
                    onClick={() => onInsertSuggestion(suggestion.target_section, suggestion.suggestion_text)}
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add
                  </Button>
                </motion.div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </AnimatePresence>
  );
}
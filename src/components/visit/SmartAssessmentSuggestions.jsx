import { useState, useEffect } from "react";
import { invokeLLM } from "@/lib/invokeLLM";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Lightbulb, Plus, X, Loader2, CheckCircle2 } from "lucide-react";

export default function SmartAssessmentSuggestions({ 
  patient, 
  narrativeText, 
  vitalSigns,
  onAddSuggestion 
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dismissedSuggestions, setDismissedSuggestions] = useState([]);
  const [lastAnalyzedText, setLastAnalyzedText] = useState("");

  useEffect(() => {
    // Only analyze if narrative has changed significantly (more than 50 characters)
    if (narrativeText && narrativeText.length > 50 && 
        Math.abs(narrativeText.length - lastAnalyzedText.length) > 50) {
      
      // Debounce the analysis
      const timer = setTimeout(() => {
        analyzeAndSuggest();
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [narrativeText]);

  const analyzeAndSuggest = async () => {
    setIsAnalyzing(true);
    
    try {
      const prompt = `You are an expert home health/hospice nursing documentation AI. Analyze the current clinical note and suggest MISSING assessments or common findings that should be documented.

PATIENT INFO:
- Primary Diagnosis: ${patient.primary_diagnosis || 'Not specified'}
- Care Type: ${patient.care_type === 'hospice' ? 'Hospice' : 'Home Health'}

CURRENT VITAL SIGNS:
${Object.keys(vitalSigns).length > 0 ? JSON.stringify(vitalSigns, null, 2) : 'Not yet documented'}

CURRENT CLINICAL NARRATIVE:
${narrativeText.substring(0, 1500)}

TASK:
Based on what's already documented, suggest MISSING assessment findings that should be added. For each body system mentioned or relevant to the diagnosis, suggest appropriate normal or expected findings if not already documented.

RULES:
1. Only suggest findings for systems NOT already documented
2. Keep suggestions concise and professional
3. Use standard nursing terminology
4. Prioritize by clinical importance
5. Maximum 5 suggestions
6. Each suggestion should be 1-2 sentences that can be directly inserted

Return JSON array of suggestions:
[
  {
    "category": "System name (e.g., Cardiovascular, Respiratory, Neurological)",
    "suggestion": "The actual text to insert",
    "priority": "high" | "medium" | "low",
    "reasoning": "Brief reason why this should be documented"
  }
]

Examples of good suggestions:
- If lungs mentioned but not breath sounds: "Lung sounds clear to auscultation bilaterally, no wheezes, crackles, or rhonchi noted."
- If heart mentioned but not specific findings: "Heart sounds S1 S2 regular rate and rhythm, no murmurs, gallops, or rubs appreciated."
- If CHF patient but no edema documented: "Bilateral lower extremities assessed: no pitting edema noted, peripheral pulses 2+ and equal bilaterally."

Generate the suggestions now:`;

      const result = await invokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  suggestion: { type: "string" },
                  priority: { type: "string" },
                  reasoning: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (result && result.suggestions) {
        // Filter out dismissed suggestions
        const newSuggestions = result.suggestions.filter(
          s => !dismissedSuggestions.includes(s.category)
        );
        setSuggestions(newSuggestions);
        setLastAnalyzedText(narrativeText);
      }

    } catch (error) {
      console.error("Error analyzing narrative:", error);
    }
    
    setIsAnalyzing(false);
  };

  const handleAddSuggestion = (suggestion) => {
    onAddSuggestion(suggestion.suggestion);
    // Remove this suggestion from the list
    setSuggestions(prev => prev.filter(s => s.category !== suggestion.category));
    setDismissedSuggestions(prev => [...prev, suggestion.category]);
  };

  const handleDismiss = (category) => {
    setSuggestions(prev => prev.filter(s => s.category !== category));
    setDismissedSuggestions(prev => [...prev, category]);
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'border-orange-300 bg-orange-50';
      case 'medium': return 'border-blue-300 bg-blue-50';
      case 'low': return 'border-slate-300 bg-slate-50';
      default: return 'border-slate-300 bg-slate-50';
    }
  };

  const getPriorityBadgeColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-blue-500';
      case 'low': return 'bg-slate-500';
      default: return 'bg-slate-500';
    }
  };

  if (isAnalyzing) {
    return (
      <Card className="bg-gradient-to-r from-purple-50 to-blue-50 border-purple-200">
        <CardContent className="p-6">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-purple-600 animate-spin" />
            <div>
              <p className="font-semibold text-slate-900">Analyzing your documentation...</p>
              <p className="text-sm text-slate-600">AI is identifying missing assessments</p>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <Card className="border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="w-5 h-5 text-purple-600" />
          Smart Assessment Suggestions ({suggestions.length})
        </CardTitle>
        <p className="text-sm text-slate-600">
          AI detected these assessments might be missing from your note
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {suggestions.map((suggestion, index) => (
          <Alert key={index} className={getPriorityColor(suggestion.priority)}>
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <p className="font-semibold text-slate-900">{suggestion.category}</p>
                  <Badge className={`${getPriorityBadgeColor(suggestion.priority)} text-white text-xs`}>
                    {suggestion.priority}
                  </Badge>
                </div>
                <p className="text-sm text-slate-700 mb-2 italic">
                  "{suggestion.suggestion}"
                </p>
                <p className="text-xs text-slate-500 mb-3">
                  💡 {suggestion.reasoning}
                </p>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    onClick={() => handleAddSuggestion(suggestion)}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add to Note
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDismiss(suggestion.category)}
                  >
                    <X className="w-3 h-3 mr-1" />
                    Dismiss
                  </Button>
                </div>
              </div>
            </div>
          </Alert>
        ))}
        
        <Button
          variant="outline"
          size="sm"
          onClick={analyzeAndSuggest}
          disabled={isAnalyzing}
          className="w-full"
        >
          <Lightbulb className="w-4 h-4 mr-2" />
          Re-analyze for More Suggestions
        </Button>
      </CardContent>
    </Card>
  );
}
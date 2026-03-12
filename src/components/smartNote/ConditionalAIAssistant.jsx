import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Sparkles, Lightbulb, AlertTriangle, CheckSquare, Loader2 } from "lucide-react";

export default function ConditionalAIAssistant({ 
  visitType, 
  diagnosis, 
  roughNote,
  patientData,
  vitalSigns,
  onSuggestion 
}) {
  const [suggestions, setSuggestions] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    if (roughNote.length >= 100) {
      analyzeSuggestions();
    }
  }, [visitType, diagnosis]);

  const analyzeSuggestions = async () => {
    if (!roughNote || roughNote.length < 100) return;

    setIsAnalyzing(true);
    try {
      const prompt = `Provide targeted documentation suggestions based on visit type and diagnosis.

VISIT TYPE: ${visitType}
DIAGNOSIS: ${diagnosis}
CURRENT NOTE: ${roughNote}
VITALS: ${JSON.stringify(vitalSigns)}

Based on the visit type "${visitType}" and diagnosis "${diagnosis}", analyze the current note and provide:

1. VISIT-SPECIFIC REQUIREMENTS: What must be documented for this visit type
2. DIAGNOSIS-SPECIFIC ELEMENTS: Critical assessments for this diagnosis
3. MISSING CRITICAL ELEMENTS: What's missing from the current note
4. OASIS RELEVANCE: ${visitType === 'admission' || visitType === 'recertification' ? 'List specific OASIS items that should be documented' : 'No OASIS required for routine visits'}

Return JSON:
{
  "visit_requirements": [
    {
      "element": "string - what to document",
      "present": boolean,
      "importance": "critical|high|medium",
      "suggestion": "string - how to document it"
    }
  ],
  "diagnosis_elements": [
    {
      "element": "string",
      "present": boolean,
      "clinical_importance": "string - why it matters",
      "suggestion": "string"
    }
  ],
  "oasis_mappings": [
    {
      "item_number": "string - e.g., M1021",
      "item_name": "string",
      "documented": boolean,
      "suggestion": "string"
    }
  ],
  "priority_actions": ["string"]
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            visit_requirements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  element: { type: "string" },
                  present: { type: "boolean" },
                  importance: { type: "string" },
                  suggestion: { type: "string" }
                }
              }
            },
            diagnosis_elements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  element: { type: "string" },
                  present: { type: "boolean" },
                  clinical_importance: { type: "string" },
                  suggestion: { type: "string" }
                }
              }
            },
            oasis_mappings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item_number: { type: "string" },
                  item_name: { type: "string" },
                  documented: { type: "boolean" },
                  suggestion: { type: "string" }
                }
              }
            },
            priority_actions: { type: "array", items: { type: "string" } }
          }
        }
      });

      setSuggestions(result);
    } catch (error) {
      console.error('Error analyzing suggestions:', error);
    }
    setIsAnalyzing(false);
  };

  if (isAnalyzing) {
    return (
      <Card className="border-2 border-purple-200">
        <CardContent className="p-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-2" />
          <p className="text-sm text-gray-600">Analyzing for {visitType}...</p>
        </CardContent>
      </Card>
    );
  }

  if (!suggestions) return null;

  const missingCritical = suggestions.visit_requirements?.filter(r => !r.present && r.importance === 'critical') || [];
  const missingDiagnosis = suggestions.diagnosis_elements?.filter(e => !e.present) || [];
  const undocumentedOASIS = suggestions.oasis_mappings?.filter(o => !o.documented) || [];

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-purple-600" />
          Smart Suggestions for {visitType.replace(/_/g, ' ')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Missing Critical Elements */}
        {missingCritical.length > 0 && (
          <Alert className="bg-red-50 border-red-300">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription>
              <p className="font-semibold text-sm mb-2">Missing Critical Elements:</p>
              <div className="space-y-2">
                {missingCritical.map((req, idx) => (
                  <div key={idx} className="bg-white rounded p-2 border border-red-200">
                    <p className="text-xs font-semibold text-gray-900">{req.element}</p>
                    <p className="text-xs text-gray-600 mt-1">{req.suggestion}</p>
                    <Button
                      size="sm"
                      variant="outline"
                      className="mt-2 text-xs h-6"
                      onClick={() => onSuggestion(req.suggestion)}
                    >
                      Add to Note
                    </Button>
                  </div>
                ))}
              </div>
            </AlertDescription>
          </Alert>
        )}

        {/* Missing Diagnosis Elements */}
        {missingDiagnosis.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">
              {diagnosis?.split(' ')[0]} Assessment Gaps:
            </p>
            <div className="space-y-2">
              {missingDiagnosis.map((elem, idx) => (
                <div key={idx} className="bg-white rounded p-2 border border-orange-200">
                  <p className="text-xs font-semibold text-gray-900">{elem.element}</p>
                  <p className="text-xs text-gray-600 italic mb-1">{elem.clinical_importance}</p>
                  <p className="text-xs text-gray-700">{elem.suggestion}</p>
                  <Button
                    size="sm"
                    variant="outline"
                    className="mt-2 text-xs h-6"
                    onClick={() => onSuggestion(elem.suggestion)}
                  >
                    Add to Note
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* OASIS Mapping Suggestions */}
        {undocumentedOASIS.length > 0 && (visitType === 'admission' || visitType === 'recertification') && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-indigo-900 mb-2 flex items-center gap-1">
              <CheckSquare className="w-3 h-3" /> OASIS Documentation Needed:
            </p>
            <div className="space-y-2">
              {undocumentedOASIS.slice(0, 5).map((oasis, idx) => (
                <div key={idx} className="bg-white rounded p-2 text-xs">
                  <p className="font-semibold text-gray-900">
                    {oasis.item_number}: {oasis.item_name}
                  </p>
                  <p className="text-gray-600 mt-1">{oasis.suggestion}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Priority Actions */}
        {suggestions.priority_actions?.length > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-yellow-900 mb-2 flex items-center gap-1">
              <Lightbulb className="w-3 h-3" /> Priority Actions:
            </p>
            <ul className="space-y-1">
              {suggestions.priority_actions.map((action, idx) => (
                <li key={idx} className="text-xs text-yellow-800">• {action}</li>
              ))}
            </ul>
          </div>
        )}

        <Button
          size="sm"
          variant="outline"
          onClick={analyzeSuggestions}
          className="w-full text-xs"
        >
          Refresh Suggestions
        </Button>
      </CardContent>
    </Card>
  );
}
import { useState, useEffect, useMemo } from "react";
import { invokeLLM } from "@/lib/invokeLLM";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Brain, 
  AlertTriangle, 
  CheckCircle2, 
  Lightbulb, 
  TrendingUp,
  Loader2
} from "lucide-react";
import { debounce } from "@/lib/debounce";

export default function RealTimeDocumentationAssistant({
  noteContent,
  visitType,
  diagnosis,
  vitalSigns,
  patient,
  onInsertSuggestion
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [complianceScore, setComplianceScore] = useState(null);

  // Debounced analysis function
  const analyzeNote = useMemo(
    () => debounce(async (content) => {
      if (!content || content.length < 50) {
        setSuggestions([]);
        setComplianceScore(null);
        return;
      }

      setIsAnalyzing(true);
      try {
        const prompt = `Analyze this in-progress clinical visit note for Medicare compliance gaps and provide real-time suggestions.

NOTE CONTENT (${content.length} chars):
${content}

CONTEXT:
- Visit Type: ${visitType || 'Routine Visit'}
- Diagnosis: ${diagnosis || 'Not specified'}
- Patient: ${patient ? `${patient.first_name} ${patient.last_name}` : 'Not specified'}
- Vitals Available: ${vitalSigns ? 'Yes' : 'No'}

Analyze for CRITICAL Medicare documentation elements:
1. Homebound status (why leaving home is taxing)
2. Skilled need justification
3. Patient response to care/teaching
4. Objective findings and assessments
5. Plan of care
6. Safety concerns

For each missing or weak element, provide:
- What's missing
- Why it matters for Medicare
- A specific suggestion to add

Return as JSON:
{
  "overall_compliance_score": 0-100,
  "suggestions": [
    {
      "category": "homebound|skilled_need|patient_response|assessment|plan|safety",
      "severity": "critical|high|medium|low",
      "issue": "string - what's missing",
      "rationale": "string - why it matters",
      "suggestion": "string - specific text to add",
      "insert_text": "string - ready-to-insert text"
    }
  ],
  "strengths": ["string"],
  "improvement_priority": "string - what to fix first"
}`;

        const result = await invokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              overall_compliance_score: { type: "number" },
              suggestions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    category: { type: "string" },
                    severity: { type: "string" },
                    issue: { type: "string" },
                    rationale: { type: "string" },
                    suggestion: { type: "string" },
                    insert_text: { type: "string" }
                  }
                }
              },
              strengths: { type: "array", items: { type: "string" } },
              improvement_priority: { type: "string" }
            }
          }
        });

        setSuggestions(result.suggestions || []);
        setComplianceScore(result.overall_compliance_score);
      } catch (error) {
        console.error("Error analyzing note:", error);
      }
      setIsAnalyzing(false);
    }, 1500),
    [visitType, diagnosis, patient, vitalSigns]
  );


  useEffect(() => {
    analyzeNote(noteContent);
    return () => analyzeNote.cancel();
  }, [noteContent, analyzeNote]);

  const getSeverityColor = (severity) => {
    const colors = {
      critical: "bg-red-100 text-red-800 border-red-300",
      high: "bg-orange-100 text-orange-800 border-orange-300",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
      low: "bg-blue-100 text-blue-800 border-blue-300"
    };
    return colors[severity] || colors.medium;
  };

  const getSeverityIcon = (severity) => {
    if (severity === 'critical' || severity === 'high') return AlertTriangle;
    if (severity === 'low') return Lightbulb;
    return TrendingUp;
  };

  const getCategoryLabel = (category) => {
    const labels = {
      homebound: "Homebound Status",
      skilled_need: "Skilled Need",
      patient_response: "Patient Response",
      assessment: "Assessment",
      plan: "Plan of Care",
      safety: "Safety"
    };
    return labels[category] || category;
  };

  if (!noteContent || noteContent.length < 50) {
    return (
      <Alert className="border-slate-200">
        <Brain className="w-4 h-4 text-slate-400" />
        <AlertDescription className="text-slate-600">
          Start typing your note to receive real-time compliance suggestions...
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="w-5 h-5 text-blue-600" />
            Real-Time Documentation Assistant
            {isAnalyzing && <Loader2 className="w-4 h-4 animate-spin text-blue-400" />}
          </CardTitle>
          {complianceScore !== null && (
            <Badge className={`${
              complianceScore >= 90 ? 'bg-green-600' :
              complianceScore >= 70 ? 'bg-yellow-600' :
              'bg-red-600'
            } text-white`}>
              {complianceScore}% Compliant
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {suggestions.length === 0 && !isAnalyzing && complianceScore !== null ? (
          <Alert className="bg-green-100 border-green-300">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-800">
              <strong>Excellent documentation!</strong> All critical elements are present.
            </AlertDescription>
          </Alert>
        ) : (
          <>
            {suggestions.length > 0 && (
              <div className="bg-white rounded-lg p-3 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-orange-600" />
                  <span className="font-semibold text-sm text-slate-900">
                    {suggestions.length} Suggestion{suggestions.length > 1 ? 's' : ''} for Improvement
                  </span>
                </div>
                <div className="space-y-3">
                  {suggestions.slice(0, 5).map((suggestion, idx) => {
                    const SeverityIcon = getSeverityIcon(suggestion.severity);
                    return (
                      <div
                        key={idx}
                        className={`p-3 rounded-lg border ${getSeverityColor(suggestion.severity)}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-1">
                            <SeverityIcon className="w-4 h-4 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-semibold text-sm">
                                  {getCategoryLabel(suggestion.category)}
                                </span>
                                <Badge variant="outline" className="text-xs">
                                  {suggestion.severity}
                                </Badge>
                              </div>
                              <p className="text-xs mt-1">{suggestion.issue}</p>
                            </div>
                          </div>
                        </div>

                        <div className="bg-white/50 rounded p-2 mb-2 text-xs">
                          <p className="text-slate-600 italic mb-1">
                            💡 {suggestion.rationale}
                          </p>
                          <p className="text-slate-700">
                            <strong>Suggestion:</strong> {suggestion.suggestion}
                          </p>
                        </div>

                        {suggestion.insert_text && onInsertSuggestion && (
                          <Button
                            size="sm"
                            onClick={() => onInsertSuggestion(suggestion.insert_text)}
                            className="w-full text-xs bg-blue-600 hover:bg-blue-700"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Insert Suggestion
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="text-xs text-blue-700 bg-blue-100 rounded p-2">
              💡 <strong>Tip:</strong> Address critical items first for maximum compliance improvement.
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
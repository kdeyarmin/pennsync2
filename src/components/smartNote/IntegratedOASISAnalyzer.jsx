import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  FileText,
  TrendingUp,
  Flag,
  ChevronDown,
  ChevronUp,
  Copy
} from "lucide-react";

export default function IntegratedOASISAnalyzer({ 
  patientData, 
  visitType, 
  roughNote, 
  vitalSigns,
  timelineData = [],
  onApplySuggestion 
}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [oasisAnalysis, setOasisAnalysis] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [autoAnalyze, setAutoAnalyze] = useState(true);

  // Auto-analyze when note content changes (debounced)
  useEffect(() => {
    if (!autoAnalyze || !roughNote || roughNote.length < 100) return;

    const timeoutId = setTimeout(() => {
      analyzeForOASIS();
    }, 2000); // Wait 2 seconds after user stops typing

    return () => clearTimeout(timeoutId);
  }, [roughNote, autoAnalyze]);

  const analyzeForOASIS = async () => {
    if (!patientData || !roughNote) return;

    setIsAnalyzing(true);
    try {
      // Build comprehensive context
      const timelineContext = timelineData.slice(0, 10).map(e => 
        `${e.date}: ${e.title} - ${e.description?.substring(0, 100) || ''}`
      ).join('\n');

      const prompt = `You are an OASIS expert analyzing clinical documentation to suggest OASIS assessment answers.

Patient: ${patientData.first_name} ${patientData.last_name}
Visit Type: ${visitType}
Primary Diagnosis: ${patientData.primary_diagnosis || 'Not specified'}
Allergies: ${patientData.allergies || 'None'}

Current Documentation:
${roughNote}

Vital Signs:
BP: ${vitalSigns.bp || 'Not recorded'}
HR: ${vitalSigns.hr || 'Not recorded'}
Temp: ${vitalSigns.temp || 'Not recorded'}
O2: ${vitalSigns.o2 || 'Not recorded'}

Recent Timeline:
${timelineContext}

Analyze this documentation and provide:
1. OASIS items that CAN be answered based on current documentation (with suggested answers)
2. OASIS items that CANNOT be answered and need more information
3. Compliance gaps or red flags
4. Specific documentation improvements needed for OASIS compliance

Focus on key OASIS items: M1021 (Primary Diagnosis), M1023 (Other Diagnoses), M1033 (Risk for Hospitalization), M1200 (Vision), M1242 (Pain Frequency), M1306 (Unhealed Pressure Ulcers), M1610-M1620 (Urinary/Bowel), M1800-M1860 (ADL/IADL), M1870 (Feeding/Eating), M2102 (Drug Regimen Review).`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            completeness_score: { type: "number" },
            answerable_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item_code: { type: "string" },
                  item_name: { type: "string" },
                  suggested_answer: { type: "string" },
                  confidence: { type: "string" },
                  supporting_evidence: { type: "string" }
                }
              }
            },
            missing_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item_code: { type: "string" },
                  item_name: { type: "string" },
                  what_to_assess: { type: "string" },
                  priority: { type: "string" }
                }
              }
            },
            compliance_gaps: {
              type: "array",
              items: { type: "string" }
            },
            documentation_improvements: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setOasisAnalysis(result);
    } catch (error) {
      console.error('Error analyzing for OASIS:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const applySuggestion = (item) => {
    const suggestionText = `\n\n[OASIS ${item.item_code}] ${item.item_name}: ${item.suggested_answer}\nEvidence: ${item.supporting_evidence}`;
    onApplySuggestion?.(suggestionText);
  };

  const copyAllSuggestions = () => {
    if (!oasisAnalysis?.answerable_items) return;

    const allText = oasisAnalysis.answerable_items.map(item => 
      `[OASIS ${item.item_code}] ${item.item_name}: ${item.suggested_answer}\nEvidence: ${item.supporting_evidence}`
    ).join('\n\n');

    navigator.clipboard.writeText(allText);
  };

  if (!patientData) return null;

  // Show compact indicator when visit is not admission/recert
  if (visitType !== 'admission' && visitType !== 'recertification') {
    return (
      <Alert className="bg-blue-50 border-blue-300">
        <FileText className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-900">
          OASIS analysis available for admission and recertification visits.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Card className="border-2 border-orange-300 shadow-lg">
      <CardHeader className="bg-gradient-to-r from-orange-50 to-yellow-50 border-b-2 border-orange-200 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-bold flex items-center gap-2 text-orange-900">
            <FileText className="w-5 h-5 text-orange-700" />
            OASIS Analysis
            {oasisAnalysis && (
              <Badge className="bg-orange-600 text-white">
                {Math.round(oasisAnalysis.completeness_score || 0)}% Complete
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {oasisAnalysis && (
              <Button
                variant="ghost"
                size="sm"
                onClick={copyAllSuggestions}
                className="text-orange-700"
              >
                <Copy className="w-4 h-4" />
              </Button>
            )}
            <Button
              variant="default"
              size="sm"
              onClick={analyzeForOASIS}
              disabled={isAnalyzing || !roughNote || roughNote.length < 100}
              className="bg-orange-600 hover:bg-orange-700 text-white font-semibold min-h-[36px]"
            >
              {isAnalyzing ? (
                <>
                  <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Analyze
                </>
              )}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
            >
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
        {oasisAnalysis && (
          <Progress 
            value={oasisAnalysis.completeness_score || 0} 
            className="h-2 mt-2" 
          />
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-4 space-y-4">
          {!oasisAnalysis ? (
            <Alert className="bg-orange-50 border-2 border-orange-300">
              <Sparkles className="w-4 h-4 text-orange-600" />
              <AlertDescription className="text-sm text-orange-900 font-medium">
                {roughNote && roughNote.length >= 100 
                  ? "Click 'Analyze' to generate OASIS suggestions based on your documentation."
                  : "Write at least 100 characters in your notes, then click 'Analyze' for OASIS suggestions."}
              </AlertDescription>
            </Alert>
          ) : (
            <>
              {/* Answerable OASIS Items */}
              {oasisAnalysis.answerable_items?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-green-900 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4" />
                    Can Be Answered ({oasisAnalysis.answerable_items.length} items)
                  </h4>
                  {oasisAnalysis.answerable_items.map((item, idx) => (
                    <Card key={idx} className="border-2 border-green-300 bg-green-50">
                      <CardContent className="p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <Badge className="bg-green-700 text-white font-semibold">
                                {item.item_code}
                              </Badge>
                              <h5 className="font-bold text-green-900">{item.item_name}</h5>
                              <Badge variant="outline" className={`text-xs ${
                                item.confidence === 'high' ? 'border-green-600 text-green-700' :
                                item.confidence === 'medium' ? 'border-yellow-600 text-yellow-700' :
                                'border-orange-600 text-orange-700'
                              }`}>
                                {item.confidence} confidence
                              </Badge>
                            </div>
                            <p className="text-sm font-semibold text-green-900 mb-1">
                              Suggested: {item.suggested_answer}
                            </p>
                            <p className="text-xs text-slate-700">
                              Evidence: {item.supporting_evidence}
                            </p>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => applySuggestion(item)}
                            className="bg-green-600 hover:bg-green-700 text-white font-semibold flex-shrink-0"
                          >
                            Add to Note
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Missing OASIS Items */}
              {oasisAnalysis.missing_items?.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-bold text-red-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Needs More Information ({oasisAnalysis.missing_items.length} items)
                  </h4>
                  {oasisAnalysis.missing_items.map((item, idx) => (
                    <Alert key={idx} className={`border-2 ${
                      item.priority === 'high' ? 'bg-red-50 border-red-400' :
                      item.priority === 'medium' ? 'bg-yellow-50 border-yellow-400' :
                      'bg-blue-50 border-blue-400'
                    }`}>
                      <Flag className={`w-4 h-4 ${
                        item.priority === 'high' ? 'text-red-600' :
                        item.priority === 'medium' ? 'text-yellow-600' :
                        'text-blue-600'
                      }`} />
                      <AlertDescription>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`${
                            item.priority === 'high' ? 'bg-red-600' :
                            item.priority === 'medium' ? 'bg-yellow-600' :
                            'bg-blue-600'
                          } text-white font-semibold text-xs`}>
                            {item.item_code}
                          </Badge>
                          <strong className="text-slate-900">{item.item_name}</strong>
                          <Badge variant="outline" className="text-xs">
                            {item.priority} priority
                          </Badge>
                        </div>
                        <p className="text-sm text-slate-700 mt-1">
                          📝 What to assess: {item.what_to_assess}
                        </p>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {/* Compliance Gaps */}
              {oasisAnalysis.compliance_gaps?.length > 0 && (
                <Alert className="bg-red-50 border-2 border-red-400">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                  <AlertDescription>
                    <strong className="text-red-950 font-bold">Compliance Gaps:</strong>
                    <ul className="mt-2 space-y-1">
                      {oasisAnalysis.compliance_gaps.map((gap, idx) => (
                        <li key={idx} className="text-sm text-red-900 font-medium">⚠️ {gap}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Documentation Improvements */}
              {oasisAnalysis.documentation_improvements?.length > 0 && (
                <div className="bg-blue-50 border-l-4 border-blue-500 p-3 rounded">
                  <h4 className="font-bold text-blue-900 mb-2 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Documentation Improvements
                  </h4>
                  <ul className="space-y-1">
                    {oasisAnalysis.documentation_improvements.map((improvement, idx) => (
                      <li key={idx} className="text-sm text-blue-900">💡 {improvement}</li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}

          <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>OASIS integration for {visitType} visit</span>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoAnalyze}
                onChange={(e) => setAutoAnalyze(e.target.checked)}
                className="rounded"
              />
              <span>Auto-analyze</span>
            </label>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
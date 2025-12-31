import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Brain,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Copy,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function AISmartOASISAssistant({
  patientData,
  referralData = null,
  visitData = null,
  onApplySuggestion,
  autoAnalyze = true
}) {
  const [suggestions, setSuggestions] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [appliedItems, setAppliedItems] = useState(new Set());
  const [feedbackGiven, setFeedbackGiven] = useState(new Set());

  const analyzePatientData = async () => {
    if (!patientData) return;

    setIsAnalyzing(true);
    try {
      const contextData = {
        patient: {
          demographics: {
            age: patientData.date_of_birth ? 
              Math.floor((new Date() - new Date(patientData.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000)) : null,
            primary_diagnosis: patientData.primary_diagnosis,
            secondary_diagnoses: patientData.secondary_diagnoses,
            allergies: patientData.allergies,
            medications: patientData.current_medications,
          },
          functional: {
            ambulation: patientData.functional_status?.ambulation,
            adl_status: patientData.functional_status?.adl_independence,
            cognitive_status: patientData.functional_status?.cognitive_status,
            fall_risk: patientData.functional_status?.fall_risk,
          },
          clinical: {
            vital_signs: patientData.baseline_vitals,
            wounds: patientData.wounds,
            pain: patientData.pain_management,
          },
          history: {
            past_hospitalizations: patientData.past_hospitalizations,
            medical_history: patientData.past_medical_history,
          }
        },
        referral: referralData,
        recent_visit: visitData
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert home health OASIS-E assessment specialist. Analyze the provided patient data and generate smart OASIS item suggestions.

For each OASIS item, provide:
1. Item code and name (e.g., M1021 - Primary Diagnosis)
2. Suggested value/response based on available data
3. Confidence level: HIGH (>90%), MEDIUM (70-90%), LOW (<70%)
4. Data source: What data supports this suggestion
5. Verification flags: What the nurse should verify during visit
6. Clinical notes: Additional context or considerations

Focus on these key OASIS sections:
- M1000-M1060: Demographics & administrative
- M1021-M1029: Diagnoses
- M1033: Risk factors for hospitalization
- M1400-M1410: Living arrangements & support
- M1600-M1620: Sensory status
- M1800-M1910: ADLs and functional status
- M2102-M2250: Medications & care management

CRITICAL: Only suggest items where you have reliable data. Mark items as NEEDS_MANUAL_ASSESSMENT when data is insufficient.

Patient Data: ${JSON.stringify(contextData)}`,
        response_json_schema: {
          type: "object",
          properties: {
            summary: {
              type: "object",
              properties: {
                total_items_analyzed: { type: "number" },
                high_confidence_items: { type: "number" },
                needs_verification: { type: "number" },
                data_completeness_score: { type: "number" }
              }
            },
            oasis_suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item_code: { type: "string" },
                  item_name: { type: "string" },
                  category: { type: "string" },
                  suggested_value: { type: "string" },
                  confidence_level: { type: "string", enum: ["HIGH", "MEDIUM", "LOW", "NEEDS_MANUAL_ASSESSMENT"] },
                  data_source: { type: "string" },
                  verification_notes: { type: "string" },
                  clinical_considerations: { type: "string" },
                  reasoning: { type: "string" }
                }
              }
            },
            critical_gaps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item_code: { type: "string" },
                  item_name: { type: "string" },
                  why_critical: { type: "string" },
                  how_to_assess: { type: "string" }
                }
              }
            },
            nurse_assessment_checklist: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setSuggestions(result);
    } catch (error) {
      console.error('Error analyzing patient data:', error);
      alert('Failed to generate OASIS suggestions. Please try again.');
    }
    setIsAnalyzing(false);
  };

  React.useEffect(() => {
    if (autoAnalyze && patientData && !suggestions) {
      analyzePatientData();
    }
  }, [autoAnalyze, patientData]);

  const handleApplySuggestion = (item) => {
    if (onApplySuggestion) {
      onApplySuggestion(item);
      setAppliedItems(prev => new Set([...prev, item.item_code]));
    }
  };

  const handleFeedback = async (item, isPositive) => {
    try {
      await base44.entities.TrainingRecommendation.create({
        nurse_email: (await base44.auth.me()).email,
        recommendation_type: "clinical",
        recommendation_text: `OASIS AI Suggestion Feedback: ${item.item_code} - ${item.item_name}`,
        source: "ai_documentation_suggester",
        severity: "medium",
        addressed: false,
        context_data: {
          element: item.item_code,
          suggestion: item.suggested_value,
          confidence: item.confidence_level,
          feedback: isPositive ? "positive" : "negative"
        }
      });
      setFeedbackGiven(prev => new Set([...prev, item.item_code]));
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const getConfidenceColor = (level) => {
    switch (level) {
      case "HIGH": return "bg-green-100 text-green-800 border-green-300";
      case "MEDIUM": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "LOW": return "bg-orange-100 text-orange-800 border-orange-300";
      case "NEEDS_MANUAL_ASSESSMENT": return "bg-red-100 text-red-800 border-red-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getCategoryIcon = (category) => {
    const iconMap = {
      "Demographics": "👤",
      "Diagnoses": "🏥",
      "Risk Factors": "⚠️",
      "Living Arrangements": "🏠",
      "Sensory Status": "👁️",
      "ADLs": "🚶",
      "Medications": "💊",
      "Care Management": "📋"
    };
    return iconMap[category] || "📝";
  };

  if (!patientData) {
    return (
      <Alert className="bg-blue-50 border-blue-200">
        <AlertCircle className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          No patient data available. Please select a patient to generate OASIS suggestions.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            AI-Powered OASIS Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!suggestions ? (
            <div className="text-center py-8">
              <Button
                onClick={analyzePatientData}
                disabled={isAnalyzing}
                className="bg-purple-600 hover:bg-purple-700"
                size="lg"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    Analyzing Patient Data...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Smart OASIS Suggestions
                  </>
                )}
              </Button>
              <p className="text-sm text-gray-600 mt-3">
                AI will analyze patient records, referral data, and clinical history to pre-populate OASIS items
              </p>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-white p-3 rounded-lg border-2 border-purple-200">
                  <p className="text-xs text-gray-600">Items Analyzed</p>
                  <p className="text-2xl font-bold text-purple-600">{suggestions.summary?.total_items_analyzed || 0}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border-2 border-green-200">
                  <p className="text-xs text-gray-600">High Confidence</p>
                  <p className="text-2xl font-bold text-green-600">{suggestions.summary?.high_confidence_items || 0}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border-2 border-yellow-200">
                  <p className="text-xs text-gray-600">Needs Verification</p>
                  <p className="text-2xl font-bold text-yellow-600">{suggestions.summary?.needs_verification || 0}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border-2 border-blue-200">
                  <p className="text-xs text-gray-600">Data Quality</p>
                  <p className="text-2xl font-bold text-blue-600">{suggestions.summary?.data_completeness_score || 0}%</p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={analyzePatientData}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Re-analyze
                </Button>
                <Button
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(suggestions, null, 2))}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy All
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {suggestions && (
        <>
          {/* Critical Gaps Alert */}
          {suggestions.critical_gaps?.length > 0 && (
            <Alert className="bg-red-50 border-red-300">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <AlertDescription>
                <p className="font-semibold text-red-900 mb-2">⚠️ Critical Data Gaps Identified</p>
                <ul className="space-y-2 text-sm">
                  {suggestions.critical_gaps.map((gap, idx) => (
                    <li key={idx} className="bg-white p-2 rounded border border-red-200">
                      <p className="font-medium text-red-900">{gap.item_code} - {gap.item_name}</p>
                      <p className="text-red-700 text-xs mt-1">{gap.why_critical}</p>
                      <p className="text-gray-600 text-xs mt-1"><strong>Assessment tip:</strong> {gap.how_to_assess}</p>
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* Nurse Assessment Checklist */}
          {suggestions.nurse_assessment_checklist?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  Nurse Assessment Checklist
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {suggestions.nurse_assessment_checklist.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-blue-600 mt-0.5">☐</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* OASIS Suggestions by Category */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Smart OASIS Suggestions ({suggestions.oasis_suggestions?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="space-y-2">
                {Object.entries(
                  (suggestions.oasis_suggestions || []).reduce((acc, item) => {
                    if (!acc[item.category]) acc[item.category] = [];
                    acc[item.category].push(item);
                    return acc;
                  }, {})
                ).map(([category, items]) => (
                  <AccordionItem key={category} value={category} className="border rounded-lg">
                    <AccordionTrigger className="px-4 hover:bg-gray-50">
                      <div className="flex items-center gap-2 text-left">
                        <span className="text-xl">{getCategoryIcon(category)}</span>
                        <div>
                          <p className="font-semibold">{category}</p>
                          <p className="text-xs text-gray-500">{items.length} items</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-3 mt-2">
                        {items.map((item) => (
                          <div key={item.item_code} className={`p-4 rounded-lg border-2 ${
                            appliedItems.has(item.item_code) ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200'
                          }`}>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {item.item_code}
                                  </Badge>
                                  <Badge className={getConfidenceColor(item.confidence_level)}>
                                    {item.confidence_level}
                                  </Badge>
                                  {appliedItems.has(item.item_code) && (
                                    <Badge className="bg-green-600">Applied</Badge>
                                  )}
                                </div>
                                <p className="font-semibold text-gray-900">{item.item_name}</p>
                              </div>
                            </div>

                            <div className="bg-blue-50 p-3 rounded-lg mb-2 border border-blue-200">
                              <p className="text-sm font-semibold text-blue-900 mb-1">Suggested Value:</p>
                              <p className="text-sm text-gray-900">{item.suggested_value}</p>
                            </div>

                            <div className="grid md:grid-cols-2 gap-3 text-xs">
                              <div className="bg-gray-50 p-2 rounded">
                                <p className="font-semibold text-gray-700 mb-1">Data Source:</p>
                                <p className="text-gray-600">{item.data_source}</p>
                              </div>
                              <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                                <p className="font-semibold text-yellow-900 mb-1">⚠️ Verify:</p>
                                <p className="text-gray-700">{item.verification_notes}</p>
                              </div>
                            </div>

                            {item.clinical_considerations && (
                              <div className="mt-2 bg-purple-50 p-2 rounded text-xs border border-purple-200">
                                <p className="font-semibold text-purple-900 mb-1">Clinical Considerations:</p>
                                <p className="text-gray-700">{item.clinical_considerations}</p>
                              </div>
                            )}

                            {item.reasoning && (
                              <details className="mt-2 text-xs">
                                <summary className="cursor-pointer text-gray-600 hover:text-gray-900 font-medium">
                                  Show AI Reasoning
                                </summary>
                                <p className="mt-2 text-gray-600 bg-gray-50 p-2 rounded">{item.reasoning}</p>
                              </details>
                            )}

                            <div className="flex gap-2 mt-3">
                              {onApplySuggestion && !appliedItems.has(item.item_code) && (
                                <Button
                                  size="sm"
                                  onClick={() => handleApplySuggestion(item)}
                                  className="bg-purple-600 hover:bg-purple-700"
                                >
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Apply Suggestion
                                </Button>
                              )}
                              {!feedbackGiven.has(item.item_code) && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleFeedback(item, true)}
                                  >
                                    <ThumbsUp className="w-3 h-3 mr-1" />
                                    Helpful
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleFeedback(item, false)}
                                  >
                                    <ThumbsDown className="w-3 h-3 mr-1" />
                                    Not Helpful
                                  </Button>
                                </>
                              )}
                              {feedbackGiven.has(item.item_code) && (
                                <Badge variant="outline">Feedback Submitted</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
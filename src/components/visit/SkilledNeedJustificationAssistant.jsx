import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  FileText,
  Plus,
  ChevronDown,
  ChevronUp,
  XCircle
} from "lucide-react";

export default function SkilledNeedJustificationAssistant({ 
  patient, 
  visit,
  narrativeText, 
  vitalSigns,
  onAddJustification 
}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [expandedItems, setExpandedItems] = useState([]);

  const analyzeSkillNeed = async () => {
    setIsAnalyzing(true);
    setShowDialog(true);

    try {
      const prompt = `You are a Medicare home health compliance expert specializing in justifying skilled nursing necessity. Analyze this visit documentation to identify skilled interventions and evaluate whether the skilled need is adequately justified.

PATIENT INFORMATION:
- Care Type: ${patient.care_type === 'hospice' ? 'Hospice' : 'Home Health'}
- Primary Diagnosis: ${patient.primary_diagnosis || 'Not specified'}
- Secondary Diagnoses: ${patient.secondary_diagnoses?.join(', ') || 'None'}
- Visit Type: ${visit.visit_type.replace(/_/g, ' ')}

CURRENT DOCUMENTATION:
${narrativeText || '[No documentation provided]'}

VITAL SIGNS:
${Object.keys(vitalSigns).length > 0 ? JSON.stringify(vitalSigns, null, 2) : 'None documented'}

---

MEDICARE SKILLED NEED REQUIREMENTS:

For a service to qualify as "skilled" under Medicare, it must require:
1. The skills of a licensed nurse due to the inherent complexity
2. The condition of the patient requiring skilled observation/assessment
3. Teaching/training that requires nursing expertise
4. Management/evaluation of the patient's care plan

Services are NOT skilled if they could be safely performed by:
- A non-medical person
- The patient themselves (with reasonable effort)
- A caregiver with minimal training

---

YOUR TASK:

Analyze the documentation and identify:
1. What skilled interventions were performed or documented
2. Whether the skilled need is adequately justified for each intervention
3. What's missing or weak in the justification

Return a detailed JSON analysis with this structure:

{
  "overall_skilled_need_score": 0-100,
  "compliance_status": "excellent" | "adequate" | "needs_improvement" | "insufficient",
  "interventions_identified": [
    {
      "intervention": "Name of skilled intervention",
      "category": "assessment" | "teaching" | "wound_care" | "medication_management" | "observation" | "care_coordination" | "other",
      "justification_present": true | false,
      "justification_quality": "strong" | "adequate" | "weak" | "missing",
      "current_justification": "Quote from note (if present)",
      "gaps": ["What's missing from the justification"],
      "suggested_addition": "Complete Medicare-compliant justification text to add",
      "why_skilled": "Brief explanation of why this requires nursing skill",
      "medicare_rationale": "Specific Medicare criterion this meets"
    }
  ],
  "missing_skilled_elements": [
    {
      "element": "What's missing",
      "severity": "critical" | "important" | "recommended",
      "explanation": "Why this is important for Medicare",
      "suggested_text": "Text to add to documentation"
    }
  ],
  "strengths": [
    {
      "area": "What's well documented",
      "evidence": "Quote from note"
    }
  ],
  "recommendations": [
    "Overall recommendations for strengthening skilled need justification"
  ]
}

Be specific and provide exact text that nurses can use. Focus on Medicare compliance language.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_skilled_need_score: { type: "number" },
            compliance_status: { type: "string" },
            interventions_identified: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  intervention: { type: "string" },
                  category: { type: "string" },
                  justification_present: { type: "boolean" },
                  justification_quality: { type: "string" },
                  current_justification: { type: "string" },
                  gaps: { type: "array", items: { type: "string" } },
                  suggested_addition: { type: "string" },
                  why_skilled: { type: "string" },
                  medicare_rationale: { type: "string" }
                }
              }
            },
            missing_skilled_elements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  element: { type: "string" },
                  severity: { type: "string" },
                  explanation: { type: "string" },
                  suggested_text: { type: "string" }
                }
              }
            },
            strengths: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  area: { type: "string" },
                  evidence: { type: "string" }
                }
              }
            },
            recommendations: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setAnalysis(result);

    } catch (error) {
      console.error("Error analyzing skilled need:", error);
      alert("Error analyzing documentation. Please try again.");
    }

    setIsAnalyzing(false);
  };

  const toggleItem = (index) => {
    if (expandedItems.includes(index)) {
      setExpandedItems(expandedItems.filter(i => i !== index));
    } else {
      setExpandedItems([...expandedItems, index]);
    }
  };

  const handleAddText = (text) => {
    if (onAddJustification) {
      onAddJustification(text);
    }
    setShowDialog(false);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'excellent': return 'bg-green-500';
      case 'adequate': return 'bg-blue-500';
      case 'needs_improvement': return 'bg-yellow-500';
      case 'insufficient': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

  const getQualityColor = (quality) => {
    switch (quality) {
      case 'strong': return 'text-green-700 bg-green-50 border-green-300';
      case 'adequate': return 'text-blue-700 bg-blue-50 border-blue-300';
      case 'weak': return 'text-yellow-700 bg-yellow-50 border-yellow-300';
      case 'missing': return 'text-red-700 bg-red-50 border-red-300';
      default: return 'text-slate-700 bg-slate-50 border-slate-300';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-900 border-red-300';
      case 'important': return 'bg-yellow-100 text-yellow-900 border-yellow-300';
      case 'recommended': return 'bg-blue-100 text-blue-900 border-blue-300';
      default: return 'bg-slate-100 text-slate-900 border-slate-300';
    }
  };

  return (
    <>
      <Card className="mb-6 bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                <ShieldCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Skilled Need Justification Assistant</h3>
                <p className="text-sm text-slate-600">Ensure robust Medicare skilled nursing justification</p>
              </div>
            </div>
            <Button
              onClick={analyzeSkillNeed}
              disabled={isAnalyzing || !narrativeText}
              size="lg"
              className="bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700"
            >
              {isAnalyzing ? (
                <>
                  <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                <>
                  <FileText className="w-5 h-5 mr-2" />
                  Analyze Skilled Need
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Analysis Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <ShieldCheck className="w-7 h-7 text-purple-600" />
              Skilled Need Analysis Report
            </DialogTitle>
            <DialogDescription>
              Comprehensive evaluation of skilled nursing justification in your documentation
            </DialogDescription>
          </DialogHeader>

          {isAnalyzing ? (
            <div className="py-12 text-center space-y-4">
              <Sparkles className="w-16 h-16 mx-auto text-purple-600 animate-pulse" />
              <div>
                <p className="text-lg font-semibold text-slate-900">Analyzing Documentation...</p>
                <p className="text-sm text-slate-600 mt-2">
                  Evaluating skilled interventions and Medicare justification
                </p>
              </div>
            </div>
          ) : analysis ? (
            <div className="space-y-6 py-4">
              {/* Overall Score */}
              <div className="bg-white rounded-lg border-2 border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">
                      Skilled Need Score: {analysis.overall_skilled_need_score}/100
                    </h3>
                    <p className="text-slate-600 capitalize mt-1">
                      {analysis.compliance_status?.replace('_', ' ')}
                    </p>
                  </div>
                  <Badge className={getStatusColor(analysis.compliance_status)}>
                    {analysis.compliance_status?.toUpperCase().replace('_', ' ')}
                  </Badge>
                </div>

                {analysis.overall_skilled_need_score < 75 && (
                  <Alert className="bg-orange-50 border-orange-200 mt-4">
                    <AlertTriangle className="w-5 h-5 text-orange-600" />
                    <AlertDescription className="text-orange-900">
                      <strong>Action Required:</strong> Documentation needs strengthening to meet Medicare skilled need requirements. Review suggestions below.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Interventions Analysis */}
              {analysis.interventions_identified && analysis.interventions_identified.length > 0 && (
                <div className="space-y-3">
                  <div className="bg-purple-50 p-3 rounded-lg border-2 border-purple-200">
                    <h4 className="font-bold text-purple-900 text-lg flex items-center gap-2">
                      <FileText className="w-5 h-5" />
                      Skilled Interventions Identified ({analysis.interventions_identified.length})
                    </h4>
                  </div>

                  {analysis.interventions_identified.map((intervention, index) => (
                    <Card key={index} className={`border-l-4 ${
                      intervention.justification_quality === 'strong' ? 'border-l-green-500' :
                      intervention.justification_quality === 'adequate' ? 'border-l-blue-500' :
                      intervention.justification_quality === 'weak' ? 'border-l-yellow-500' :
                      'border-l-red-500'
                    }`}>
                      <CardContent className="p-4 space-y-3">
                        <div 
                          className="flex items-start justify-between cursor-pointer"
                          onClick={() => toggleItem(index)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h5 className="font-bold text-slate-900">{intervention.intervention}</h5>
                              <Badge variant="outline" className="capitalize">
                                {intervention.category}
                              </Badge>
                              <Badge className={getQualityColor(intervention.justification_quality)}>
                                {intervention.justification_quality}
                              </Badge>
                            </div>
                            <p className="text-sm text-slate-700">
                              <strong>Why Skilled:</strong> {intervention.why_skilled}
                            </p>
                          </div>
                          {expandedItems.includes(index) ? (
                            <ChevronUp className="w-5 h-5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-5 h-5 text-slate-400" />
                          )}
                        </div>

                        {expandedItems.includes(index) && (
                          <div className="space-y-3 pt-3 border-t">
                            {intervention.current_justification && (
                              <div className="bg-slate-50 p-3 rounded border">
                                <p className="text-xs font-semibold text-slate-700 mb-1">Current Documentation:</p>
                                <p className="text-sm text-slate-900 italic">"{intervention.current_justification}"</p>
                              </div>
                            )}

                            {intervention.gaps && intervention.gaps.length > 0 && (
                              <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                                <p className="text-xs font-semibold text-yellow-900 mb-2">Gaps in Justification:</p>
                                <ul className="list-disc ml-5 space-y-1">
                                  {intervention.gaps.map((gap, gapIndex) => (
                                    <li key={gapIndex} className="text-sm text-yellow-800">{gap}</li>
                                  ))}
                                </ul>
                              </div>
                            )}

                            <div className="bg-green-50 p-3 rounded border border-green-200">
                              <p className="text-xs font-semibold text-green-900 mb-1">Medicare Rationale:</p>
                              <p className="text-sm text-green-900">{intervention.medicare_rationale}</p>
                            </div>

                            {intervention.suggested_addition && (
                              <div className="bg-blue-50 p-3 rounded border border-blue-200">
                                <p className="text-xs font-semibold text-blue-900 mb-2">Suggested Justification Text:</p>
                                <p className="text-sm text-blue-900 mb-3">{intervention.suggested_addition}</p>
                                <Button
                                  size="sm"
                                  onClick={() => handleAddText(intervention.suggested_addition)}
                                  className="w-full bg-blue-600 hover:bg-blue-700"
                                >
                                  <Plus className="w-4 h-4 mr-2" />
                                  Add This to My Note
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Missing Skilled Elements */}
              {analysis.missing_skilled_elements && analysis.missing_skilled_elements.length > 0 && (
                <div className="space-y-3">
                  <div className="bg-red-50 p-3 rounded-lg border-2 border-red-200">
                    <h4 className="font-bold text-red-900 text-lg flex items-center gap-2">
                      <XCircle className="w-5 h-5" />
                      Missing Skilled Elements ({analysis.missing_skilled_elements.length})
                    </h4>
                  </div>

                  {analysis.missing_skilled_elements.map((element, index) => (
                    <Card key={index} className="border-l-4 border-l-red-500 bg-red-50">
                      <CardContent className="p-4 space-y-3">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="font-bold text-red-900">{element.element}</h5>
                            <Badge className={getSeverityColor(element.severity)}>
                              {element.severity}
                            </Badge>
                          </div>
                        </div>

                        <p className="text-sm text-red-800">{element.explanation}</p>

                        {element.suggested_text && (
                          <div className="bg-white p-3 rounded border border-red-200">
                            <p className="text-xs font-semibold text-slate-700 mb-2">Suggested Text:</p>
                            <p className="text-sm text-slate-900 mb-3">{element.suggested_text}</p>
                            <Button
                              size="sm"
                              onClick={() => handleAddText(element.suggested_text)}
                              className="w-full bg-red-600 hover:bg-red-700"
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add This to My Note
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Strengths */}
              {analysis.strengths && analysis.strengths.length > 0 && (
                <div className="bg-green-50 p-4 rounded-lg border-2 border-green-200">
                  <h4 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5" />
                    Documentation Strengths
                  </h4>
                  <div className="space-y-2">
                    {analysis.strengths.map((strength, index) => (
                      <div key={index} className="bg-white p-3 rounded border border-green-200">
                        <p className="font-semibold text-green-900">{strength.area}</p>
                        <p className="text-sm text-green-800 italic mt-1">"{strength.evidence}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommendations */}
              {analysis.recommendations && analysis.recommendations.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                  <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <Sparkles className="w-5 h-5" />
                    Expert Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {analysis.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-blue-900">
                        <span className="font-bold text-blue-600 mt-0.5">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter className="border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
            >
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  FileCheck,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  Home,
  Stethoscope,
  MessageSquare,
  Target,
  Shield,
  Copy,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Plus,
  Lightbulb
} from "lucide-react";

export default function MedicareComplianceAssistant({
  noteText,
  careType,
  visitType,
  diagnosis,
  onInsertText
}) {
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedIndex, setCopiedIndex] = useState(null);

  const complianceCategories = [
    {
      id: "skilled_need",
      name: "Skilled Nursing Need",
      icon: Stethoscope,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-200",
      description: "Justification for why skilled nursing services are required"
    },
    {
      id: "homebound_status",
      name: "Homebound Status",
      icon: Home,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
      borderColor: "border-purple-200",
      description: "Documentation of patient's inability to leave home without taxing effort"
    },
    {
      id: "patient_response",
      name: "Patient Response",
      icon: MessageSquare,
      color: "text-green-600",
      bgColor: "bg-green-50",
      borderColor: "border-green-200",
      description: "Patient's response to teaching, interventions, and care"
    },
    {
      id: "goal_progress",
      name: "Progress Toward Goals",
      icon: Target,
      color: "text-orange-600",
      bgColor: "bg-orange-50",
      borderColor: "border-orange-200",
      description: "Documentation of progress or lack of progress toward care plan goals"
    },
    {
      id: "safety_assessment",
      name: "Safety Assessment",
      icon: Shield,
      color: "text-red-600",
      bgColor: "bg-red-50",
      borderColor: "border-red-200",
      description: "Environmental and patient safety evaluations"
    }
  ];

  const analyzeCompliance = async () => {
    if (!noteText || noteText.length < 50) {
      alert("Please enter more documentation before analyzing.");
      return;
    }

    setIsAnalyzing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a Medicare compliance documentation expert for ${careType === 'hospice' ? 'hospice' : 'home health'} nursing. Analyze this clinical note and provide detailed feedback on Medicare compliance.

VISIT TYPE: ${visitType?.replace(/_/g, ' ') || 'Routine visit'}
DIAGNOSIS: ${diagnosis || 'Not specified'}
CARE TYPE: ${careType === 'hospice' ? 'Hospice' : 'Home Health'}

CLINICAL NOTE TO ANALYZE:
${noteText}

Analyze the note for these 5 critical Medicare compliance areas:

1. SKILLED NURSING NEED
   - Is there clear justification for why skilled nursing is required?
   - Does it explain what skills/judgment only an RN/LPN can provide?
   - Are specific skilled interventions documented?

2. HOMEBOUND STATUS (for Home Health)
   - Is the patient's homebound status clearly stated?
   - Are specific reasons documented (taxing effort, medical contraindication, need for assistance)?
   - Is it clear the patient cannot leave home without considerable effort?

3. PATIENT RESPONSE
   - Is the patient's response to interventions documented?
   - Is teaching effectiveness evaluated (verbalized understanding, return demonstration)?
   - Are barriers to learning or adherence identified?

4. PROGRESS TOWARD GOALS
   - Is there reference to care plan goals?
   - Is measurable progress (or lack thereof) documented?
   - Are goal modifications suggested if needed?

5. SAFETY ASSESSMENT
   - Are environmental safety concerns addressed?
   - Is fall risk evaluated?
   - Are medication safety issues documented?
   - Is caregiver capability assessed?

For each category, provide:
- Current status (compliant, partial, non-compliant)
- What was found in the note (if anything)
- Specific deficiencies
- CONCRETE examples of phrases to add or how to rephrase existing content
- Priority level (critical, important, recommended)

Return JSON:
{
  "overall_score": 0-100,
  "overall_status": "compliant" | "needs_improvement" | "non_compliant",
  "summary": "Brief overall assessment",
  "categories": {
    "skilled_need": {
      "status": "compliant" | "partial" | "non_compliant",
      "score": 0-100,
      "found_elements": ["What was documented"],
      "deficiencies": ["What's missing"],
      "priority": "critical" | "important" | "recommended",
      "suggestions": [
        {
          "type": "add" | "rephrase",
          "original_text": "Original text if rephrasing, null if adding",
          "suggested_text": "The exact text to add or use as replacement",
          "rationale": "Why this improves compliance",
          "example_placement": "Where in the note this should go"
        }
      ]
    },
    "homebound_status": { ... same structure ... },
    "patient_response": { ... same structure ... },
    "goal_progress": { ... same structure ... },
    "safety_assessment": { ... same structure ... }
  },
  "quick_wins": [
    {
      "suggestion": "Simple addition that would boost compliance",
      "text_to_add": "Exact text to add",
      "impact": "high" | "medium"
    }
  ],
  "critical_fixes": ["Most urgent items to address"],
  "model_phrases": {
    "skilled_need": ["Example compliant phrases for this diagnosis"],
    "homebound_status": ["Example homebound justifications"],
    "patient_response": ["Example patient response documentation"],
    "goal_progress": ["Example goal progress statements"],
    "safety_assessment": ["Example safety documentation"]
  }
}`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: { type: "number" },
            overall_status: { type: "string" },
            summary: { type: "string" },
            categories: { type: "object" },
            quick_wins: { type: "array", items: { type: "object" } },
            critical_fixes: { type: "array", items: { type: "string" } },
            model_phrases: { type: "object" }
          }
        }
      });

      setAnalysis(result);
    } catch (error) {
      console.error("Error analyzing compliance:", error);
      alert("Error analyzing note. Please try again.");
    }
    setIsAnalyzing(false);
  };

  const handleCopyText = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleInsertSuggestion = (text) => {
    if (onInsertText) {
      onInsertText(text);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'compliant':
        return <Badge className="bg-green-100 text-green-800">Compliant</Badge>;
      case 'partial':
        return <Badge className="bg-yellow-100 text-yellow-800">Partial</Badge>;
      case 'non_compliant':
        return <Badge className="bg-red-100 text-red-800">Non-Compliant</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Unknown</Badge>;
    }
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'critical':
        return <Badge className="bg-red-600 text-white text-xs">Critical</Badge>;
      case 'important':
        return <Badge className="bg-orange-100 text-orange-800 text-xs">Important</Badge>;
      case 'recommended':
        return <Badge className="bg-blue-100 text-blue-800 text-xs">Recommended</Badge>;
      default:
        return null;
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  return (
    <Card className="border-2 border-indigo-200">
      <CardHeader 
        className="py-3 bg-gradient-to-r from-indigo-50 to-purple-50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-indigo-600" />
            Medicare Compliance Assistant
          </div>
          <div className="flex items-center gap-2">
            {analysis && (
              <Badge className={analysis.overall_score >= 80 ? 'bg-green-100 text-green-800' : analysis.overall_score >= 60 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                Score: {analysis.overall_score}%
              </Badge>
            )}
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-4">
          {!analysis ? (
            <div className="text-center py-4">
              <FileCheck className="w-12 h-12 text-indigo-300 mx-auto mb-3" />
              <p className="text-sm text-gray-600 mb-2">
                Analyze your note for Medicare compliance
              </p>
              <p className="text-xs text-gray-500 mb-4">
                Get specific suggestions for skilled need, homebound status, patient response, goal progress, and safety
              </p>
              <Button
                onClick={analyzeCompliance}
                disabled={isAnalyzing || !noteText || noteText.length < 50}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isAnalyzing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Analyze Compliance</>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Overall Score */}
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Overall Compliance</span>
                  <span className={`text-2xl font-bold ${getScoreColor(analysis.overall_score)}`}>
                    {analysis.overall_score}%
                  </span>
                </div>
                <Progress value={analysis.overall_score} className="h-2 mb-2" />
                <p className="text-xs text-gray-600">{analysis.summary}</p>
              </div>

              {/* Critical Fixes Alert */}
              {analysis.critical_fixes?.length > 0 && (
                <Alert className="bg-red-50 border-red-200">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <AlertDescription className="text-sm">
                    <p className="font-semibold text-red-800 mb-1">Critical Fixes Required:</p>
                    <ul className="list-disc list-inside text-red-700 text-xs">
                      {analysis.critical_fixes.map((fix, idx) => (
                        <li key={idx}>{fix}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Quick Wins */}
              {analysis.quick_wins?.length > 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                  <p className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" /> Quick Wins - Easy Improvements
                  </p>
                  <div className="space-y-2">
                    {analysis.quick_wins.map((win, idx) => (
                      <div key={idx} className="flex items-start justify-between gap-2 p-2 bg-white rounded border border-green-100">
                        <div className="flex-1">
                          <p className="text-xs text-gray-700">{win.suggestion}</p>
                          <p className="text-xs text-green-700 font-mono mt-1">"{win.text_to_add}"</p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2"
                            onClick={() => handleCopyText(win.text_to_add, `qw-${idx}`)}
                          >
                            {copiedIndex === `qw-${idx}` ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-green-600"
                            onClick={() => handleInsertSuggestion(win.text_to_add)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Category Analysis */}
              <Accordion type="multiple" className="space-y-2">
                {complianceCategories.map((category) => {
                  const categoryData = analysis.categories?.[category.id];
                  if (!categoryData) return null;

                  const IconComponent = category.icon;

                  return (
                    <AccordionItem key={category.id} value={category.id} className={`border ${category.borderColor} rounded-lg overflow-hidden`}>
                      <AccordionTrigger className={`px-3 py-2 ${category.bgColor} hover:no-underline`}>
                        <div className="flex items-center justify-between w-full pr-2">
                          <div className="flex items-center gap-2">
                            <IconComponent className={`w-4 h-4 ${category.color}`} />
                            <span className="text-sm font-medium">{category.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {getPriorityBadge(categoryData.priority)}
                            {getStatusBadge(categoryData.status)}
                            <span className={`text-sm font-bold ${getScoreColor(categoryData.score)}`}>
                              {categoryData.score}%
                            </span>
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="p-3 bg-white">
                        {/* Found Elements */}
                        {categoryData.found_elements?.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-green-700 mb-1">✓ Found in Note:</p>
                            <ul className="text-xs text-gray-600 list-disc list-inside">
                              {categoryData.found_elements.map((el, idx) => (
                                <li key={idx}>{el}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Deficiencies */}
                        {categoryData.deficiencies?.length > 0 && (
                          <div className="mb-3">
                            <p className="text-xs font-semibold text-red-700 mb-1">✗ Missing or Incomplete:</p>
                            <ul className="text-xs text-gray-600 list-disc list-inside">
                              {categoryData.deficiencies.map((def, idx) => (
                                <li key={idx}>{def}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Suggestions */}
                        {categoryData.suggestions?.length > 0 && (
                          <div className="space-y-2">
                            <p className="text-xs font-semibold text-indigo-700">Suggested Improvements:</p>
                            {categoryData.suggestions.map((suggestion, idx) => (
                              <div key={idx} className="p-2 bg-indigo-50 rounded border border-indigo-100">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <Badge className={suggestion.type === 'add' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'} variant="outline">
                                      {suggestion.type === 'add' ? 'Add' : 'Rephrase'}
                                    </Badge>
                                    {suggestion.original_text && (
                                      <p className="text-xs text-gray-500 mt-1 line-through">
                                        Original: "{suggestion.original_text}"
                                      </p>
                                    )}
                                    <p className="text-xs text-indigo-800 font-medium mt-1">
                                      "{suggestion.suggested_text}"
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1">{suggestion.rationale}</p>
                                    {suggestion.example_placement && (
                                      <p className="text-xs text-gray-400 italic">→ {suggestion.example_placement}</p>
                                    )}
                                  </div>
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2"
                                      onClick={() => handleCopyText(suggestion.suggested_text, `${category.id}-${idx}`)}
                                    >
                                      {copiedIndex === `${category.id}-${idx}` ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-6 px-2 text-indigo-600"
                                      onClick={() => handleInsertSuggestion(suggestion.suggested_text)}
                                    >
                                      <Plus className="w-3 h-3" />
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}

                        {/* Model Phrases */}
                        {analysis.model_phrases?.[category.id]?.length > 0 && (
                          <div className="mt-3 pt-3 border-t border-gray-200">
                            <p className="text-xs font-semibold text-gray-700 mb-1">📝 Model Phrases for {diagnosis || 'General'}:</p>
                            <div className="space-y-1">
                              {analysis.model_phrases[category.id].map((phrase, idx) => (
                                <div key={idx} className="flex items-center justify-between p-1.5 bg-gray-50 rounded text-xs">
                                  <span className="text-gray-700">"{phrase}"</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 px-1"
                                    onClick={() => handleInsertSuggestion(phrase)}
                                  >
                                    <Plus className="w-3 h-3 text-gray-500" />
                                  </Button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </AccordionContent>
                    </AccordionItem>
                  );
                })}
              </Accordion>

              <Button variant="outline" size="sm" className="w-full" onClick={() => setAnalysis(null)}>
                Re-analyze Note
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
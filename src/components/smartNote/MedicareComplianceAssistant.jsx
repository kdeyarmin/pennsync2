import { useState } from "react";
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
  Lightbulb,
  Brain,
  FileCode
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
        prompt: `You are a Medicare compliance documentation expert and certified coder for ${careType === 'hospice' ? 'hospice' : 'home health'} nursing. Analyze this clinical note and provide detailed feedback on Medicare compliance WITH emphasis on documenting CLINICAL REASONING, not just facts.

VISIT TYPE: ${visitType?.replace(/_/g, ' ') || 'Routine visit'}
DIAGNOSIS: ${diagnosis || 'Not specified'}
CARE TYPE: ${careType === 'hospice' ? 'Hospice' : 'Home Health'}

CLINICAL NOTE TO ANALYZE:
${noteText}

CRITICAL CONCEPT - CLINICAL REASONING DOCUMENTATION:
Medicare auditors look for documentation that shows WHY skilled nursing is needed, not just WHAT was done. Each compliance area should demonstrate the nurse's clinical judgment and decision-making process.

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

FOR EACH CATEGORY, FOCUS ON CLINICAL REASONING:
- Don't just suggest stating facts - show HOW to document the underlying clinical thinking
- Include "because" statements that connect observations to nursing judgment
- Show cause-and-effect relationships between patient condition and skilled need
- Demonstrate how the nurse's assessment led to specific interventions

EXAMPLE OF CLINICAL REASONING DOCUMENTATION:
BAD: "Patient has edema in bilateral lower extremities."
GOOD: "Patient has 2+ pitting edema in bilateral lower extremities, increased from 1+ last visit, indicating potential fluid retention related to CHF exacerbation. This requires skilled nursing assessment to evaluate effectiveness of current diuretic therapy and need for medication adjustment."

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
      "clinical_reasoning_gap": "Specific explanation of what clinical reasoning is missing",
      "priority": "critical" | "important" | "recommended",
      "suggestions": [
        {
          "type": "add" | "rephrase",
          "original_text": "Original text if rephrasing, null if adding",
          "suggested_text": "The exact text to add or use as replacement - MUST include clinical reasoning with 'because', 'therefore', 'requires', 'indicating' language",
          "rationale": "Why this improves compliance",
          "clinical_reasoning_example": "Specific example of how to document the WHY, not just the WHAT",
          "example_placement": "Where in the note this should go"
        }
      ]
    },
    "homebound_status": { ... same structure with clinical_reasoning_gap and clinical_reasoning_example ... },
    "patient_response": { ... same structure ... },
    "goal_progress": { ... same structure ... },
    "safety_assessment": { ... same structure ... }
  },
  "quick_wins": [
    {
      "suggestion": "Simple addition that would boost compliance",
      "text_to_add": "Exact text to add WITH clinical reasoning",
      "impact": "high" | "medium"
    }
  ],
  "critical_fixes": ["Most urgent items to address"],
  "clinical_reasoning_templates": {
    "skilled_need": [
      {
        "scenario": "When documenting this type of situation",
        "template": "Template with [placeholders] showing clinical reasoning structure",
        "example": "Filled-in example for this diagnosis"
      }
    ],
    "homebound_status": [...],
    "patient_response": [...],
    "goal_progress": [...],
    "safety_assessment": [...]
  },
  "coding_suggestions": {
    "primary_icd10": {
      "code": "ICD-10 code",
      "description": "Code description",
      "rationale": "Why this code applies based on documentation"
    },
    "secondary_icd10": [
      {
        "code": "ICD-10 code",
        "description": "Description",
        "rationale": "Why applicable"
      }
    ],
    "symptom_codes": [
      {
        "code": "ICD-10 symptom code",
        "description": "Description",
        "documentation_support": "Text in note that supports this code"
      }
    ],
    "cpt_codes": [
      {
        "code": "CPT code",
        "description": "Service description",
        "documentation_requirements": "What must be documented to bill this code",
        "documentation_present": true | false,
        "missing_elements": ["What's needed to support this code"]
      }
    ],
    "coding_tips": ["Suggestions to improve coding accuracy"],
    "documentation_gaps_for_coding": ["What's missing that would support additional/better codes"]
  },
  "model_phrases": {
    "skilled_need": ["Example compliant phrases WITH clinical reasoning for this diagnosis"],
    "homebound_status": ["Example homebound justifications WITH reasoning"],
    "patient_response": ["Example patient response documentation WITH assessment"],
    "goal_progress": ["Example goal progress statements WITH analysis"],
    "safety_assessment": ["Example safety documentation WITH rationale"]
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
            clinical_reasoning_templates: { type: "object" },
            coding_suggestions: { type: "object" },
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
        return <Badge className="bg-slate-100 text-slate-800">Unknown</Badge>;
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
              <p className="text-sm text-slate-600 mb-2">
                Analyze your note for Medicare compliance
              </p>
              <p className="text-xs text-slate-500 mb-4">
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
              <div className="p-3 bg-slate-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-medium">Overall Compliance</span>
                  <span className={`text-2xl font-bold ${getScoreColor(analysis.overall_score)}`}>
                    {analysis.overall_score}%
                  </span>
                </div>
                <Progress value={analysis.overall_score} className="h-2 mb-2" />
                <p className="text-xs text-slate-600">{analysis.summary}</p>
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
                          <p className="text-xs text-slate-700">{win.suggestion}</p>
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
                            <ul className="text-xs text-slate-600 list-disc list-inside">
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
                            <ul className="text-xs text-slate-600 list-disc list-inside">
                              {categoryData.deficiencies.map((def, idx) => (
                                <li key={idx}>{def}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Clinical Reasoning Gap */}
                        {categoryData.clinical_reasoning_gap && (
                          <div className="mb-3 p-2 bg-purple-50 rounded border border-purple-200">
                            <p className="text-xs font-semibold text-purple-800 mb-1 flex items-center gap-1">
                              <Brain className="w-3 h-3" /> Clinical Reasoning Gap:
                            </p>
                            <p className="text-xs text-purple-700">{categoryData.clinical_reasoning_gap}</p>
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
                                      <p className="text-xs text-slate-500 mt-1 line-through">
                                        Original: "{suggestion.original_text}"
                                      </p>
                                    )}
                                    <p className="text-xs text-indigo-800 font-medium mt-1">
                                      "{suggestion.suggested_text}"
                                    </p>
                                    <p className="text-xs text-slate-500 mt-1">{suggestion.rationale}</p>
                                    {suggestion.clinical_reasoning_example && (
                                      <div className="mt-1 p-1.5 bg-purple-50 rounded border border-purple-100">
                                        <p className="text-xs text-purple-700">
                                          <Brain className="w-3 h-3 inline mr-1" />
                                          <span className="font-medium">Clinical Reasoning:</span> {suggestion.clinical_reasoning_example}
                                        </p>
                                      </div>
                                    )}
                                    {suggestion.example_placement && (
                                      <p className="text-xs text-slate-400 italic">→ {suggestion.example_placement}</p>
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
                          <div className="mt-3 pt-3 border-t border-slate-200">
                            <p className="text-xs font-semibold text-slate-700 mb-1">📝 Model Phrases for {diagnosis || 'General'}:</p>
                            <div className="space-y-1">
                              {analysis.model_phrases[category.id].map((phrase, idx) => (
                                <div key={idx} className="flex items-center justify-between p-1.5 bg-slate-50 rounded text-xs">
                                  <span className="text-slate-700">"{phrase}"</span>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-5 px-1"
                                    onClick={() => handleInsertSuggestion(phrase)}
                                  >
                                    <Plus className="w-3 h-3 text-slate-500" />
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

              {/* Clinical Reasoning Templates */}
              {analysis.clinical_reasoning_templates && Object.keys(analysis.clinical_reasoning_templates).length > 0 && (
                <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                  <p className="text-xs font-semibold text-purple-800 mb-2 flex items-center gap-1">
                    <Brain className="w-3 h-3" /> Clinical Reasoning Templates
                  </p>
                  <Accordion type="single" collapsible className="space-y-1">
                    {Object.entries(analysis.clinical_reasoning_templates).map(([category, templates]) => (
                      templates?.length > 0 && (
                        <AccordionItem key={category} value={category} className="border border-purple-100 rounded bg-white">
                          <AccordionTrigger className="px-2 py-1 text-xs hover:no-underline">
                            {category.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </AccordionTrigger>
                          <AccordionContent className="px-2 pb-2">
                            {templates.map((template, idx) => (
                              <div key={idx} className="p-2 bg-purple-50 rounded mt-1 text-xs">
                                <p className="font-medium text-purple-900">{template.scenario}</p>
                                <p className="text-purple-700 font-mono mt-1">{template.template}</p>
                                <p className="text-purple-600 italic mt-1">Example: "{template.example}"</p>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="h-5 px-1 mt-1 text-purple-600"
                                  onClick={() => handleInsertSuggestion(template.example)}
                                >
                                  <Plus className="w-3 h-3 mr-1" /> Use Example
                                </Button>
                              </div>
                            ))}
                          </AccordionContent>
                        </AccordionItem>
                      )
                    ))}
                  </Accordion>
                </div>
              )}

              {/* Coding Suggestions */}
              {analysis.coding_suggestions && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1">
                    <FileCode className="w-3 h-3" /> ICD-10 & CPT Code Suggestions
                  </p>
                  
                  {/* Primary ICD-10 */}
                  {analysis.coding_suggestions.primary_icd10 && (
                    <div className="p-2 bg-white rounded border border-blue-100 mb-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Badge className="bg-blue-600 text-white font-mono">
                            {analysis.coding_suggestions.primary_icd10.code}
                          </Badge>
                          <span className="text-xs font-medium">Primary Dx</span>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-5 px-1"
                          onClick={() => handleCopyText(analysis.coding_suggestions.primary_icd10.code, 'primary-icd')}
                        >
                          {copiedIndex === 'primary-icd' ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <Copy className="w-3 h-3" />}
                        </Button>
                      </div>
                      <p className="text-xs text-slate-700 mt-1">{analysis.coding_suggestions.primary_icd10.description}</p>
                      <p className="text-xs text-blue-600 mt-1">{analysis.coding_suggestions.primary_icd10.rationale}</p>
                    </div>
                  )}

                  {/* Secondary ICD-10 */}
                  {analysis.coding_suggestions.secondary_icd10?.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-slate-600 mb-1">Secondary Diagnoses:</p>
                      <div className="flex flex-wrap gap-1">
                        {analysis.coding_suggestions.secondary_icd10.map((code, idx) => (
                          <div key={idx} className="p-1.5 bg-white rounded border border-blue-100 text-xs">
                            <Badge variant="outline" className="font-mono mr-1">{code.code}</Badge>
                            <span className="text-slate-600">{code.description}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* CPT Codes */}
                  {analysis.coding_suggestions.cpt_codes?.length > 0 && (
                    <div className="mb-2">
                      <p className="text-xs text-slate-600 mb-1">CPT Codes:</p>
                      {analysis.coding_suggestions.cpt_codes.map((cpt, idx) => (
                        <div key={idx} className={`p-2 rounded border text-xs mb-1 ${cpt.documentation_present ? 'bg-green-50 border-green-200' : 'bg-yellow-50 border-yellow-200'}`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Badge className={`font-mono ${cpt.documentation_present ? 'bg-green-600' : 'bg-yellow-600'} text-white`}>
                                {cpt.code}
                              </Badge>
                              <span className="font-medium">{cpt.description}</span>
                            </div>
                            {cpt.documentation_present ? (
                              <CheckCircle2 className="w-4 h-4 text-green-600" />
                            ) : (
                              <AlertTriangle className="w-4 h-4 text-yellow-600" />
                            )}
                          </div>
                          {!cpt.documentation_present && cpt.missing_elements?.length > 0 && (
                            <div className="mt-1 text-yellow-700">
                              <span className="font-medium">Missing: </span>
                              {cpt.missing_elements.join(', ')}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Coding Tips */}
                  {analysis.coding_suggestions.coding_tips?.length > 0 && (
                    <div className="p-2 bg-white rounded border border-blue-100">
                      <p className="text-xs font-medium text-blue-800 mb-1">💡 Coding Tips:</p>
                      <ul className="text-xs text-blue-700 space-y-0.5">
                        {analysis.coding_suggestions.coding_tips.map((tip, idx) => (
                          <li key={idx}>• {tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Documentation Gaps for Coding */}
                  {analysis.coding_suggestions.documentation_gaps_for_coding?.length > 0 && (
                    <div className="p-2 bg-yellow-50 rounded border border-yellow-200 mt-2">
                      <p className="text-xs font-medium text-yellow-800 mb-1">⚠️ Documentation Gaps Affecting Coding:</p>
                      <ul className="text-xs text-yellow-700 space-y-0.5">
                        {analysis.coding_suggestions.documentation_gaps_for_coding.map((gap, idx) => (
                          <li key={idx}>• {gap}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

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
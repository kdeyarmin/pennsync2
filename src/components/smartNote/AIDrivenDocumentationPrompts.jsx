import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  HelpCircle,
  Plus,
  CheckCircle2,
  AlertTriangle,
  Lightbulb,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  Sparkles,
  RefreshCw,
  Target,
  TrendingUp
} from "lucide-react";
import { buildComprehensivePatientHistory, formatHistoryForAI, extractKeyInsights } from "../utils/patientHistoryAnalyzer";

export default function AIDrivenDocumentationPrompts({
  noteText,
  patient,
  visitType,
  diagnosis,
  vitalSigns,
  carePlans = [],
  previousVisits = [],
  extractedData,
  onInsertPromptResponse,
  onInsertQuestion
}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [prompts, setPrompts] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [completedPrompts, setCompletedPrompts] = useState([]);
  const [lastAnalyzedLength, setLastAnalyzedLength] = useState(0);

  // Debounced analysis trigger
  useEffect(() => {
    const noteLength = (noteText || '').length;
    // Only re-analyze if note has changed significantly (50+ chars) or first analysis
    if (Math.abs(noteLength - lastAnalyzedLength) > 50 || (!prompts && noteLength > 20)) {
      const timer = setTimeout(() => {
        analyzeForMissingElements();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [noteText, patient, visitType]);

  const analyzeForMissingElements = async () => {
    if (!noteText || noteText.length < 20) return;
    
    setIsAnalyzing(true);
    try {
      // Build comprehensive patient history
      const patientHistory = patient ? await buildComprehensivePatientHistory(patient.id) : null;
      const historyContext = patientHistory ? formatHistoryForAI(patientHistory) : '';
      const keyInsights = patientHistory ? extractKeyInsights(patientHistory) : [];

      const patientContext = patient ? `
Patient: ${patient.first_name} ${patient.last_name}
Primary Diagnosis: ${patient.primary_diagnosis || 'Not specified'}
Secondary Diagnoses: ${patient.secondary_diagnoses?.join(', ') || 'None'}
Allergies: ${patient.allergies || 'NKDA'}
` : '';

      const vitalsContext = vitalSigns && Object.keys(vitalSigns).length > 0 ? `
Vital Signs Documented:
${vitalSigns.bp ? `- BP: ${vitalSigns.bp}` : ''}
${vitalSigns.hr ? `- HR: ${vitalSigns.hr}` : ''}
${vitalSigns.temp ? `- Temp: ${vitalSigns.temp}` : ''}
${vitalSigns.o2 ? `- O2: ${vitalSigns.o2}%` : ''}
${vitalSigns.pain ? `- Pain: ${vitalSigns.pain}/10` : ''}
` : '';

      const carePlanContext = carePlans?.length > 0 ? `
Active Care Plans:
${carePlans.slice(0, 5).map(cp => `- ${cp.problem}: ${cp.goal}`).join('\n')}
` : '';

      const previousVisitContext = previousVisits?.length > 0 ? `
Previous Visit Notes (excerpt):
${previousVisits[0]?.nurse_notes?.substring(0, 300) || 'No previous notes'}
` : '';

      const prompt = `You are an expert home health clinical documentation consultant. Analyze the current nursing note and identify SPECIFIC missing elements WITH EMPHASIS ON CONTINUITY OF CARE AND HISTORICAL CONTEXT.

${historyContext}

CURRENT VISIT CONTEXT:
${patientContext}
Visit Type: ${visitType || 'Routine Visit'}
Diagnosis Focus: ${diagnosis || patient?.primary_diagnosis || 'General'}
${vitalsContext}
${carePlanContext}
${previousVisitContext}

CURRENT NOTE BEING DOCUMENTED:
${noteText}

KEY HISTORICAL INSIGHTS TO ADDRESS:
${keyInsights.length > 0 ? keyInsights.map(insight => `- [${insight.priority.toUpperCase()}] ${insight.message}\n  Action: ${insight.action}`).join('\n') : 'No critical historical insights at this time'}

TASK:
Identify missing documentation elements with STRONG EMPHASIS ON CONTINUITY AND TRENDS. Generate SPECIFIC, actionable prompts that:

1. **Medicare Required Elements** (highest priority):
   - Homebound status justification
   - Skilled nursing necessity
   - Patient/caregiver response to teaching
   - Functional status/limitations

2. **Continuity of Care** (critical focus):
   - Are trends from patient history addressed?
   - Are changes from baseline vitals documented and explained?
   - Are unresolved issues from previous visits followed up?
   - Is patient's response pattern to interventions referenced?
   - Are concerning patterns or deterioration noted?

3. **Diagnosis-Specific Assessments**:
   - Based on "${diagnosis || patient?.primary_diagnosis || 'the patient condition'}", what specific assessments are missing?
   - What symptoms should be documented?
   - What comparison to baseline/previous visit is needed?
   - How does current status compare to historical trajectory?

4. **Care Plan Progress** ${carePlans?.length > 0 ? '(Active care plans exist - assess progress)' : '(No active care plans - skip this section)'}:
   ${carePlans?.length > 0 ? `- Are care plan goals being addressed with specific outcomes?
   - What interventions were performed and how did patient respond compared to previous visits?
   - What is the patient's progress toward goals over time?
   - Are there patterns in goal achievement or barriers?` : '- No care plans to assess - focus on clinical documentation only'}

5. **Clinical Completeness**:
   - Missing body system assessments
   - Medication review gaps  
   - Safety assessment elements
   - Follow-up plan with historical context

For each missing element, provide:
- A SPECIFIC question the nurse should answer
- Why this is important (compliance/clinical reason)
- A suggested phrase to insert if applicable

Return JSON:
{
  "critical_missing": [
    {
      "element": "Name of missing element",
      "question": "Specific question for the nurse to answer",
      "reason": "Why this matters",
      "suggested_text": "Optional: suggested documentation text with [blanks]",
      "category": "medicare|assessment|care_plan|safety"
    }
  ],
  "recommended_additions": [
    {
      "element": "Name of recommended element",
      "question": "Specific question to consider",
      "reason": "Why this would improve the note",
      "suggested_text": "Optional suggested text",
      "category": "quality|best_practice|diagnosis_specific"
    }
  ],
  "diagnosis_specific_prompts": [
    {
      "prompt": "Diagnosis-specific question based on ${diagnosis || 'condition'}",
      "assessment_area": "What to assess",
      "documentation_tip": "How to document this"
    }
  ],
  "completeness_score": 0-100,
  "priority_focus": "The single most important thing to document next"
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            critical_missing: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  element: { type: "string" },
                  question: { type: "string" },
                  reason: { type: "string" },
                  suggested_text: { type: "string" },
                  category: { type: "string" }
                }
              }
            },
            recommended_additions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  element: { type: "string" },
                  question: { type: "string" },
                  reason: { type: "string" },
                  suggested_text: { type: "string" },
                  category: { type: "string" }
                }
              }
            },
            diagnosis_specific_prompts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  prompt: { type: "string" },
                  assessment_area: { type: "string" },
                  documentation_tip: { type: "string" }
                }
              }
            },
            continuity_prompts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  prompt: { type: "string" },
                  historical_reference: { type: "string" },
                  why_important: { type: "string" },
                  suggested_text: { type: "string" }
                }
              }
            },
            completeness_score: { type: "number" },
            continuity_score: { type: "number" },
            priority_focus: { type: "string" }
          }
        }
      });

      setPrompts(result);
      setLastAnalyzedLength(noteText.length);
    } catch (error) {
      console.error('Error analyzing documentation:', error);
    }
    setIsAnalyzing(false);
  };

  const handleInsertSuggestion = (text) => {
    if (onInsertPromptResponse) {
      onInsertPromptResponse(text);
    }
  };

  const handleMarkComplete = (promptId) => {
    setCompletedPrompts(prev => [...prev, promptId]);
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'medicare': return <AlertTriangle className="w-3 h-3 text-red-600" />;
      case 'assessment': return <Target className="w-3 h-3 text-blue-600" />;
      case 'care_plan': return <CheckCircle2 className="w-3 h-3 text-green-600" />;
      case 'safety': return <AlertTriangle className="w-3 h-3 text-orange-600" />;
      case 'quality': return <Sparkles className="w-3 h-3 text-purple-600" />;
      default: return <Lightbulb className="w-3 h-3 text-yellow-600" />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'medicare': return 'bg-red-100 text-red-800 border-red-200';
      case 'assessment': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'care_plan': return 'bg-green-100 text-green-800 border-green-200';
      case 'safety': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'quality': return 'bg-purple-100 text-purple-800 border-purple-200';
      default: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    }
  };

  const totalCritical = prompts?.critical_missing?.filter(p => !completedPrompts.includes(p.element)).length || 0;
  const totalRecommended = prompts?.recommended_additions?.filter(p => !completedPrompts.includes(p.element)).length || 0;

  if (!noteText || noteText.length < 20) {
    return null;
  }

  return (
    <Card className="border-indigo-200">
      <CardHeader 
        className="py-3 bg-gradient-to-r from-indigo-50 to-purple-50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <HelpCircle className="w-4 h-4 text-indigo-600" />
            AI Documentation Prompts
            {totalCritical > 0 && (
              <Badge className="bg-red-500 text-white text-xs">{totalCritical} Critical</Badge>
            )}
            {totalRecommended > 0 && (
              <Badge className="bg-blue-500 text-white text-xs">{totalRecommended} Suggested</Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {prompts && (
              <Badge variant="outline" className={
                prompts.completeness_score >= 80 ? 'bg-green-100 text-green-800' :
                prompts.completeness_score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }>
                {prompts.completeness_score}% Complete
              </Badge>
            )}
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-3 space-y-4">
          {isAnalyzing ? (
            <div className="flex items-center justify-center py-6 gap-2">
              <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" />
              <span className="text-sm text-slate-600">Analyzing documentation...</span>
            </div>
          ) : prompts ? (
            <>
              {/* Priority Focus */}
              {prompts.priority_focus && (
                <Alert className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
                  <Sparkles className="w-4 h-4 text-indigo-600" />
                  <AlertDescription className="text-indigo-900">
                    <span className="font-semibold">Priority Focus: </span>
                    {prompts.priority_focus}
                  </AlertDescription>
                </Alert>
              )}

              {/* Critical Missing Elements */}
              {prompts.critical_missing?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-red-700 mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Critical Missing Elements
                  </h4>
                  <div className="space-y-2">
                    {prompts.critical_missing
                      .filter(item => !completedPrompts.includes(item.element))
                      .map((item, idx) => (
                        <div key={idx} className="p-3 bg-red-50 rounded-lg border border-red-200">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex items-center gap-2">
                              {getCategoryIcon(item.category)}
                              <span className="text-sm font-medium text-slate-900">{item.element}</span>
                            </div>
                            <Badge className={`${getCategoryColor(item.category)} text-xs`}>
                              {item.category}
                            </Badge>
                          </div>
                          
                          <div className="bg-white p-2 rounded border mb-2">
                            <p className="text-sm text-slate-800 flex items-start gap-2">
                              <MessageSquare className="w-4 h-4 text-indigo-500 flex-shrink-0 mt-0.5" />
                              <span className="font-medium">{item.question}</span>
                            </p>
                          </div>
                          
                          <p className="text-xs text-slate-600 mb-2 italic">
                            Why: {item.reason}
                          </p>
                          
                          <div className="flex gap-2">
                            {item.suggested_text && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleInsertSuggestion(item.suggested_text)}
                                className="text-xs gap-1"
                              >
                                <Plus className="w-3 h-3" />
                                Insert Template
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleMarkComplete(item.element)}
                              className="text-xs gap-1 text-green-600"
                            >
                              <CheckCircle2 className="w-3 h-3" />
                              Done
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Continuity Prompts */}
              {prompts.continuity_prompts?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-purple-700 mb-2 flex items-center gap-1">
                    <TrendingUp className="w-3 h-3" />
                    Continuity & Historical Context ({prompts.continuity_score || 0}% documented)
                  </h4>
                  <div className="space-y-2">
                    {prompts.continuity_prompts.map((item, idx) => (
                      <div key={idx} className="p-3 bg-purple-50 rounded-lg border-2 border-purple-300">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className="bg-purple-600 text-white text-xs">Historical Context</Badge>
                          <p className="text-xs text-purple-700 italic">
                            📊 {item.historical_reference}
                          </p>
                        </div>
                        <p className="text-sm font-medium text-slate-900 mb-2">{item.prompt}</p>
                        <p className="text-xs text-slate-600 mb-2">⚠️ {item.why_important}</p>
                        {item.suggested_text && (
                          <div className="bg-white p-2 rounded border border-purple-200">
                            <p className="text-xs font-medium text-slate-500 mb-1">Suggested documentation:</p>
                            <p className="text-xs text-slate-700">{item.suggested_text}</p>
                          </div>
                        )}
                        <div className="flex gap-2 mt-2">
                          {item.suggested_text && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleInsertSuggestion(item.suggested_text)}
                              className="text-xs gap-1"
                            >
                              <Plus className="w-3 h-3" />
                              Insert
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleMarkComplete(item.prompt)}
                            className="text-xs gap-1 text-green-600"
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Addressed
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Diagnosis-Specific Prompts */}
              {prompts.diagnosis_specific_prompts?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-1">
                    <Target className="w-3 h-3" />
                    Diagnosis-Specific Questions
                  </h4>
                  <div className="space-y-2">
                    {prompts.diagnosis_specific_prompts.map((item, idx) => (
                      <div key={idx} className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                        <p className="text-sm font-medium text-slate-900 mb-1">{item.prompt}</p>
                        <div className="flex justify-between text-xs text-slate-600">
                          <span>Assess: {item.assessment_area}</span>
                        </div>
                        <p className="text-xs text-blue-700 mt-1 italic">
                          💡 {item.documentation_tip}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Recommended Additions */}
              {prompts.recommended_additions?.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold text-purple-700 mb-2 flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" />
                    Recommended Additions
                  </h4>
                  <div className="space-y-2">
                    {prompts.recommended_additions
                      .filter(item => !completedPrompts.includes(item.element))
                      .slice(0, 3)
                      .map((item, idx) => (
                        <div key={idx} className="p-2 bg-purple-50 rounded-lg border border-purple-200">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-slate-900">{item.element}</span>
                            <Badge className={`${getCategoryColor(item.category)} text-xs`}>
                              {item.category}
                            </Badge>
                          </div>
                          <p className="text-xs text-slate-700 mb-2">{item.question}</p>
                          <div className="flex gap-2">
                            {item.suggested_text && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleInsertSuggestion(item.suggested_text)}
                                className="text-xs gap-1 h-6"
                              >
                                <Plus className="w-3 h-3" />
                                Add
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleMarkComplete(item.element)}
                              className="text-xs gap-1 h-6 text-slate-400"
                            >
                              Skip
                            </Button>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {/* Re-analyze button */}
              <Button
                variant="outline"
                size="sm"
                onClick={analyzeForMissingElements}
                className="w-full text-xs gap-1"
                disabled={isAnalyzing}
              >
                <RefreshCw className={`w-3 h-3 ${isAnalyzing ? 'animate-spin' : ''}`} />
                Re-analyze Documentation
              </Button>
            </>
          ) : (
            <div className="text-center py-4">
              <Button
                onClick={analyzeForMissingElements}
                className="bg-indigo-600 hover:bg-indigo-700 gap-2"
                disabled={isAnalyzing}
              >
                <Sparkles className="w-4 h-4" />
                Analyze for Missing Elements
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
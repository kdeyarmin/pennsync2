import React from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Sparkles, 
  ClipboardList, 
  Heart, 
  AlertTriangle,
  TrendingUp,
  CheckCircle2,
  Plus,
  Loader2,
  Brain
} from "lucide-react";

export default function AIProactiveSuggestions({ 
  roughNote, 
  enhancedNote,
  _patientContext, 
  comprehensiveContext,
  diagnosis,
  vitalSigns,
  visitType,
  onCreateTask,
  onUpdateCarePlan,
  onAddToNote
}) {
  const [suggestions, setSuggestions] = React.useState(null);
  const [isAnalyzing, setIsAnalyzing] = React.useState(false);
  const [appliedSuggestions, setAppliedSuggestions] = React.useState([]);

  React.useEffect(() => {
    // Analyze when note reaches sufficient length
    if ((roughNote?.length > 100 || enhancedNote?.length > 100) && comprehensiveContext) {
      analyzeSuggestions();
    }
  }, [roughNote, enhancedNote, comprehensiveContext]);

  const analyzeSuggestions = async () => {
    if (isAnalyzing) return;
    
    setIsAnalyzing(true);
    try {
      const noteContent = enhancedNote || roughNote;
      
      const prompt = `You are an AI clinical assistant analyzing a home health visit note. Based on the comprehensive patient context and current visit documentation, provide proactive suggestions.

COMPREHENSIVE PATIENT CONTEXT:
${JSON.stringify(comprehensiveContext, null, 2)}

CURRENT VISIT NOTE:
${noteContent}

VISIT DETAILS:
- Type: ${visitType}
- Diagnosis: ${diagnosis}
- Vital Signs: ${JSON.stringify(vitalSigns)}

ANALYZE AND PROVIDE:
1. Follow-up Tasks: Specific actionable tasks based on visit findings, changes in patient status, or care plan requirements
2. Care Plan Updates: Suggestions to update existing care plans or create new ones based on patient progress or new issues
3. Clinical Alerts: Important clinical considerations or red flags that need attention
4. Documentation Gaps: Any missing critical information that should be documented
5. Medication Concerns: Any medication-related issues or reconciliation needs
6. Patient Education Needs: Topics that should be taught or reinforced with the patient

Return JSON with:
{
  "follow_up_tasks": [
    {
      "title": "Task title",
      "description": "Detailed description",
      "priority": "high|medium|low",
      "type": "call|notify|schedule|order|coordinate|document|safety|followup",
      "due_timeframe": "today|24_hours|48_hours|this_week|next_visit",
      "reasoning": "Why this task is needed based on the visit"
    }
  ],
  "care_plan_suggestions": [
    {
      "action": "update|create",
      "problem": "Clinical problem or nursing diagnosis",
      "goal": "Measurable goal",
      "interventions": ["intervention 1", "intervention 2"],
      "reasoning": "Why this care plan change is needed"
    }
  ],
  "clinical_alerts": [
    {
      "type": "vital_deterioration|medication_risk|fall_risk|readmission_risk|symptom_escalation",
      "severity": "critical|high|medium|low",
      "finding": "What was found",
      "recommendation": "What should be done"
    }
  ],
  "documentation_gaps": [
    {
      "missing_element": "What's missing",
      "importance": "Why it's important",
      "suggestion": "What should be added"
    }
  ],
  "medication_concerns": [
    {
      "concern": "Description of concern",
      "medication": "Medication name if applicable",
      "action": "Recommended action"
    }
  ],
  "education_needs": [
    {
      "topic": "Education topic",
      "priority": "high|medium|low",
      "reason": "Why this education is needed"
    }
  ]
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            follow_up_tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  priority: { type: "string" },
                  type: { type: "string" },
                  due_timeframe: { type: "string" },
                  reasoning: { type: "string" }
                }
              }
            },
            care_plan_suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  problem: { type: "string" },
                  goal: { type: "string" },
                  interventions: { type: "array", items: { type: "string" } },
                  reasoning: { type: "string" }
                }
              }
            },
            clinical_alerts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  severity: { type: "string" },
                  finding: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            },
            documentation_gaps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  missing_element: { type: "string" },
                  importance: { type: "string" },
                  suggestion: { type: "string" }
                }
              }
            },
            medication_concerns: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  concern: { type: "string" },
                  medication: { type: "string" },
                  action: { type: "string" }
                }
              }
            },
            education_needs: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  topic: { type: "string" },
                  priority: { type: "string" },
                  reason: { type: "string" }
                }
              }
            }
          }
        }
      });

      setSuggestions(result);
    } catch (error) {
      console.error('Error analyzing suggestions:', error);
    }
    setIsAnalyzing(false);
  };

  const handleApplySuggestion = (suggestionId, action) => {
    setAppliedSuggestions(prev => [...prev, suggestionId]);
    if (action) action();
  };

  if (isAnalyzing) {
    return (
      <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
        <CardContent className="p-6 text-center">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-purple-600" />
          <p className="text-sm text-purple-900 font-medium">Analyzing visit and generating AI suggestions...</p>
        </CardContent>
      </Card>
    );
  }

  if (!suggestions) return null;

  const totalSuggestions = 
    (suggestions.follow_up_tasks?.length || 0) +
    (suggestions.care_plan_suggestions?.length || 0) +
    (suggestions.clinical_alerts?.length || 0) +
    (suggestions.documentation_gaps?.length || 0) +
    (suggestions.medication_concerns?.length || 0) +
    (suggestions.education_needs?.length || 0);

  if (totalSuggestions === 0) {
    return (
      <Card className="border-2 border-green-200 bg-green-50">
        <CardContent className="p-4 text-center">
          <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="text-sm text-green-900 font-medium">Documentation looks complete - no additional suggestions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 to-purple-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-indigo-600" />
            AI Proactive Suggestions
          </div>
          <Badge className="bg-indigo-600">{totalSuggestions} suggestions</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-96">
          <div className="space-y-4 pr-4">
            {/* Clinical Alerts */}
            {suggestions.clinical_alerts?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-red-900">
                  <AlertTriangle className="w-4 h-4" />
                  Clinical Alerts ({suggestions.clinical_alerts.length})
                </div>
                {suggestions.clinical_alerts.map((alert, idx) => (
                  <Card key={`alert-${idx}`} className={`border-2 ${
                    alert.severity === 'critical' ? 'border-red-300 bg-red-50' :
                    alert.severity === 'high' ? 'border-orange-300 bg-orange-50' :
                    'border-yellow-300 bg-yellow-50'
                  }`}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <Badge className={`mb-2 ${
                            alert.severity === 'critical' ? 'bg-red-600' :
                            alert.severity === 'high' ? 'bg-orange-600' :
                            'bg-yellow-600'
                          }`}>
                            {alert.severity}
                          </Badge>
                          <p className="text-sm font-medium text-gray-900">{alert.finding}</p>
                          <p className="text-xs text-gray-700 mt-1">
                            <strong>Recommendation:</strong> {alert.recommendation}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Follow-up Tasks */}
            {suggestions.follow_up_tasks?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-blue-900">
                  <ClipboardList className="w-4 h-4" />
                  Recommended Follow-up Tasks ({suggestions.follow_up_tasks.length})
                </div>
                {suggestions.follow_up_tasks.map((task, idx) => (
                  <Card key={`task-${idx}`} className="border-2 border-blue-200 bg-blue-50">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-medium text-gray-900">{task.title}</p>
                            <Badge variant="outline" className={
                              task.priority === 'high' ? 'bg-red-100 text-red-800' :
                              task.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-green-100 text-green-800'
                            }>
                              {task.priority}
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-700">{task.description}</p>
                          <p className="text-xs text-gray-600 mt-1 italic">
                            Reason: {task.reasoning}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApplySuggestion(`task-${idx}`, () => onCreateTask?.(task))}
                          disabled={appliedSuggestions.includes(`task-${idx}`)}
                          className="flex-shrink-0"
                        >
                          {appliedSuggestions.includes(`task-${idx}`) ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <><Plus className="w-4 h-4 mr-1" /> Create</>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Care Plan Suggestions */}
            {suggestions.care_plan_suggestions?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-green-900">
                  <Heart className="w-4 h-4" />
                  Care Plan Suggestions ({suggestions.care_plan_suggestions.length})
                </div>
                {suggestions.care_plan_suggestions.map((cp, idx) => (
                  <Card key={`cp-${idx}`} className="border-2 border-green-200 bg-green-50">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <Badge className="mb-2 bg-green-600">
                            {cp.action === 'update' ? 'Update' : 'New'} Care Plan
                          </Badge>
                          <p className="text-sm font-medium text-gray-900">{cp.problem}</p>
                          <p className="text-xs text-gray-700 mt-1">
                            <strong>Goal:</strong> {cp.goal}
                          </p>
                          <p className="text-xs text-gray-700 mt-1">
                            <strong>Interventions:</strong> {cp.interventions.join(', ')}
                          </p>
                          <p className="text-xs text-gray-600 mt-1 italic">
                            Reason: {cp.reasoning}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApplySuggestion(`cp-${idx}`, () => onUpdateCarePlan?.(cp))}
                          disabled={appliedSuggestions.includes(`cp-${idx}`)}
                          className="flex-shrink-0"
                        >
                          {appliedSuggestions.includes(`cp-${idx}`) ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <><Plus className="w-4 h-4 mr-1" /> Apply</>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Documentation Gaps */}
            {suggestions.documentation_gaps?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-purple-900">
                  <TrendingUp className="w-4 h-4" />
                  Documentation Enhancements ({suggestions.documentation_gaps.length})
                </div>
                {suggestions.documentation_gaps.map((gap, idx) => (
                  <Card key={`gap-${idx}`} className="border-2 border-purple-200 bg-purple-50">
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900">{gap.missing_element}</p>
                          <p className="text-xs text-gray-700 mt-1">
                            <strong>Why important:</strong> {gap.importance}
                          </p>
                          <p className="text-xs text-gray-700 mt-1">
                            <strong>Suggested text:</strong> {gap.suggestion}
                          </p>
                        </div>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleApplySuggestion(`gap-${idx}`, () => onAddToNote?.(gap.suggestion))}
                          disabled={appliedSuggestions.includes(`gap-${idx}`)}
                          className="flex-shrink-0"
                        >
                          {appliedSuggestions.includes(`gap-${idx}`) ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <><Plus className="w-4 h-4 mr-1" /> Add</>
                          )}
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Medication Concerns */}
            {suggestions.medication_concerns?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-orange-900">
                  <AlertTriangle className="w-4 h-4" />
                  Medication Concerns ({suggestions.medication_concerns.length})
                </div>
                {suggestions.medication_concerns.map((med, idx) => (
                  <Card key={`med-${idx}`} className="border-2 border-orange-200 bg-orange-50">
                    <CardContent className="p-3">
                      <p className="text-sm font-medium text-gray-900">{med.concern}</p>
                      {med.medication && (
                        <Badge className="mt-1 bg-orange-600">{med.medication}</Badge>
                      )}
                      <p className="text-xs text-gray-700 mt-1">
                        <strong>Action:</strong> {med.action}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* Education Needs */}
            {suggestions.education_needs?.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm font-semibold text-indigo-900">
                  <Sparkles className="w-4 h-4" />
                  Patient Education Needs ({suggestions.education_needs.length})
                </div>
                {suggestions.education_needs.map((edu, idx) => (
                  <Card key={`edu-${idx}`} className="border-2 border-indigo-200 bg-indigo-50">
                    <CardContent className="p-3">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-medium text-gray-900">{edu.topic}</p>
                        <Badge variant="outline" className={
                          edu.priority === 'high' ? 'bg-red-100 text-red-800' :
                          edu.priority === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-green-100 text-green-800'
                        }>
                          {edu.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-700">{edu.reason}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
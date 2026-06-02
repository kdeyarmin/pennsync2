import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Brain, Target, ClipboardList, CheckCircle2, Plus, Sparkles } from "lucide-react";

export default function AISmartSuggester({ 
  noteContent,
  roughNote,
  enhancedNote,
  patientId,
  patientData,
  diagnosis,
  visitType,
  carePlans,
  currentUserEmail,
  onCreateTask,
  onCreateCarePlan,
  autoAnalyze = true
}) {
  const [analyzing, setAnalyzing] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [appliedTasks, setAppliedTasks] = useState(new Set());
  const [appliedGoals, setAppliedGoals] = useState(new Set());

  useEffect(() => {
    if (autoAnalyze && (enhancedNote || roughNote?.length >= 100) && !analyzing) {
      const timer = setTimeout(() => analyzeSuggestions(), 2000);
      return () => clearTimeout(timer);
    }
  }, [roughNote, enhancedNote, autoAnalyze]);

  const analyzeSuggestions = async () => {
    const note = enhancedNote || roughNote;
    if (!note || !patientData) return;

    setAnalyzing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Based on this clinical note, suggest relevant follow-up tasks and care plan goals.

CLINICAL NOTE:
${note}

PATIENT: ${patientData.first_name} ${patientData.last_name}
DIAGNOSIS: ${diagnosis}
VISIT TYPE: ${visitType}

EXISTING CARE PLANS:
${carePlans?.filter(cp => cp.status === 'active').map(cp => `- ${cp.problem}: ${cp.goal}`).join('\n') || 'None'}

Generate:

1. FOLLOW-UP TASKS (3-5 specific, actionable tasks):
   - Tasks the nurse or care team should complete
   - Include timeframe (today, 24h, 48h, this week)
   - Specify task type (call, notify, order, schedule, etc.)

2. CARE PLAN GOALS (2-3 new or updated goals):
   - Only suggest if gaps identified or patient condition changed
   - Must be measurable and time-bound
   - Include specific interventions

Return JSON.`,
        response_json_schema: {
          type: "object",
          properties: {
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  description: { type: "string" },
                  type: { type: "string" },
                  priority: { type: "string" },
                  timeframe: { type: "string" },
                  rationale: { type: "string" }
                }
              }
            },
            care_plan_goals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  problem: { type: "string" },
                  goal: { type: "string" },
                  interventions: { type: "array", items: { type: "string" } },
                  rationale: { type: "string" }
                }
              }
            }
          }
        }
      });

      setSuggestions(result);
    } catch (error) {
      console.error('Suggestion analysis error:', error);
    }
    setAnalyzing(false);
  };

  const handleCreateTask = async (task, index) => {
    await onCreateTask({
      patient_id: patientId,
      title: task.title,
      description: task.description,
      type: task.type?.toLowerCase() || 'other',
      priority: task.priority?.toLowerCase() || 'medium',
      due_timeframe: mapTimeframeToEnum(task.timeframe),
      source: 'ai_generated',
      ai_reason: task.rationale,
      assigned_to: currentUserEmail
    });
    setAppliedTasks(prev => new Set([...prev, index]));
  };

  const handleCreateCarePlan = async (goal, index) => {
    await onCreateCarePlan({
      patient_id: patientId,
      problem: goal.problem,
      goal: goal.goal,
      interventions: goal.interventions,
      status: 'active',
      target_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    });
    setAppliedGoals(prev => new Set([...prev, index]));
  };

  const handleAcceptAllTasks = async () => {
    if (!suggestions?.tasks) return;
    for (let i = 0; i < suggestions.tasks.length; i++) {
      if (!appliedTasks.has(i)) {
        await handleCreateTask(suggestions.tasks[i], i);
      }
    }
  };

  const handleAcceptAllGoals = async () => {
    if (!suggestions?.care_plan_goals) return;
    for (let i = 0; i < suggestions.care_plan_goals.length; i++) {
      if (!appliedGoals.has(i)) {
        await handleCreateCarePlan(suggestions.care_plan_goals[i], i);
      }
    }
  };

  const mapTimeframeToEnum = (timeframe) => {
    const tf = timeframe?.toLowerCase() || '';
    if (tf.includes('today')) return 'today';
    if (tf.includes('24') || tf.includes('tomorrow')) return '24_hours';
    if (tf.includes('48')) return '48_hours';
    if (tf.includes('week')) return 'this_week';
    return 'next_visit';
  };

  if (!enhancedNote && !roughNote) return null;

  const pendingTasks = suggestions?.tasks?.filter((_, idx) => !appliedTasks.has(idx)) || [];
  const pendingGoals = suggestions?.care_plan_goals?.filter((_, idx) => !appliedGoals.has(idx)) || [];

  return (
    <Card className="border-2 border-blue-300">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-blue-600" />
            AI Suggested Actions
          </CardTitle>
          {!analyzing && !suggestions && (
            <Button size="sm" variant="outline" onClick={analyzeSuggestions}>
              <Sparkles className="w-3 h-3 mr-1" />
              Analyze
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {analyzing && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2" />
            <p className="text-xs text-slate-600">Analyzing note for actionable suggestions...</p>
          </div>
        )}

        {suggestions && (
          <Tabs defaultValue="tasks">
            <TabsList className="grid grid-cols-2 w-full">
              <TabsTrigger value="tasks" className="text-xs">
                <ClipboardList className="w-3 h-3 mr-1" />
                Tasks ({suggestions.tasks?.length || 0})
              </TabsTrigger>
              <TabsTrigger value="goals" className="text-xs">
                <Target className="w-3 h-3 mr-1" />
                Care Plans ({suggestions.care_plan_goals?.length || 0})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tasks" className="space-y-2 mt-3">
              {pendingTasks.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleAcceptAllTasks}
                  className="w-full bg-green-600 hover:bg-green-700 mb-2"
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Create All Tasks ({pendingTasks.length})
                </Button>
              )}

              {suggestions.tasks?.map((task, idx) => {
                const isApplied = appliedTasks.has(idx);
                return (
                  <Card key={idx} className={`${isApplied ? 'bg-green-50 opacity-60' : 'bg-white'}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`text-xs ${
                              task.priority === 'high' ? 'bg-red-600' :
                              task.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-600'
                            }`}>
                              {task.priority}
                            </Badge>
                            <Badge variant="outline" className="text-xs">{task.type}</Badge>
                            <Badge variant="outline" className="text-xs">{task.timeframe}</Badge>
                          </div>
                          <p className="text-sm font-medium text-slate-900 mb-1">{task.title}</p>
                          <p className="text-xs text-slate-600 mb-2">{task.description}</p>
                          <p className="text-xs text-slate-500 italic">{task.rationale}</p>
                        </div>
                        {!isApplied && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCreateTask(task, idx)}
                            className="flex-shrink-0 h-7"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        )}
                        {isApplied && (
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {suggestions.tasks?.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4">
                  No follow-up tasks suggested
                </p>
              )}
            </TabsContent>

            <TabsContent value="goals" className="space-y-2 mt-3">
              {pendingGoals.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleAcceptAllGoals}
                  className="w-full bg-green-600 hover:bg-green-700 mb-2"
                >
                  <CheckCircle2 className="w-3 h-3 mr-1" />
                  Create All Care Plans ({pendingGoals.length})
                </Button>
              )}

              {suggestions.care_plan_goals?.map((goal, idx) => {
                const isApplied = appliedGoals.has(idx);
                return (
                  <Card key={idx} className={`${isApplied ? 'bg-green-50 opacity-60' : 'bg-white'}`}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-900 mb-1">{goal.problem}</p>
                          <p className="text-xs text-indigo-700 font-medium mb-2">Goal: {goal.goal}</p>
                          <div className="bg-blue-50 rounded p-2 mb-2">
                            <p className="text-xs text-slate-700 font-semibold mb-1">Interventions:</p>
                            <ul className="space-y-1">
                              {goal.interventions?.map((intervention, iIdx) => (
                                <li key={iIdx} className="text-xs text-slate-700">• {intervention}</li>
                              ))}
                            </ul>
                          </div>
                          <p className="text-xs text-slate-500 italic">{goal.rationale}</p>
                        </div>
                        {!isApplied && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleCreateCarePlan(goal, idx)}
                            className="flex-shrink-0 h-7"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        )}
                        {isApplied && (
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {suggestions.care_plan_goals?.length === 0 && (
                <p className="text-xs text-slate-500 text-center py-4">
                  Current care plans appear adequate
                </p>
              )}
            </TabsContent>
          </Tabs>
        )}
      </CardContent>
    </Card>
  );
}
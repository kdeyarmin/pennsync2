import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Brain, Shield, DollarSign, ClipboardList, Target, FileText, CheckCircle2, Plus, Sparkles } from "lucide-react";
import { logActivity, ActivityActions } from "../utils/activityLogger";

export default function ConsolidatedAISuggestions({ 
  roughNote,
  enhancedNote,
  visitType,
  diagnosis,
  patientData,
  vitalSigns,
  carePlans,
  patientId,
  currentUserEmail,
  onApplyCompliance,
  onApplyPDGM,
  onCreateTask,
  onCreateCarePlan,
  onApplyOASIS,
  autoAnalyze = true
}) {
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [appliedCompliance, setAppliedCompliance] = useState(new Set());
  const [appliedPDGM, setAppliedPDGM] = useState(new Set());
  const [appliedTasks, setAppliedTasks] = useState(new Set());
  const [appliedGoals, setAppliedGoals] = useState(new Set());
  const [appliedOASIS, setAppliedOASIS] = useState(new Set());

  useEffect(() => {
    if (autoAnalyze && (roughNote?.length >= 150 || enhancedNote) && !analyzing) {
      const timer = setTimeout(() => runComprehensiveAnalysis(), 2000);
      return () => clearTimeout(timer);
    }
  }, [roughNote, enhancedNote, autoAnalyze]);

  const runComprehensiveAnalysis = async () => {
    const note = enhancedNote || roughNote;
    if (!note || !patientData) return;

    setAnalyzing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Comprehensive AI analysis for clinical documentation optimization.

CLINICAL NOTE:
${note}

PATIENT: ${patientData.first_name} ${patientData.last_name}
DIAGNOSIS: ${diagnosis}
VISIT TYPE: ${visitType}
VITAL SIGNS: ${JSON.stringify(vitalSigns)}

Provide comprehensive analysis in 4 categories:

1. MEDICARE COMPLIANCE GAPS:
   - Missing required documentation elements
   - Specific text to add for each gap
   - Priority level

2. PDGM REVENUE OPTIMIZATION:
   - Comorbidities suggested by medications/findings but not documented
   - Functional limitations to document
   - Clinical group optimization opportunities
   - Estimated revenue impact

3. FOLLOW-UP TASKS:
   - Actionable tasks based on note content
   - Include type, priority, timeframe, rationale

4. CARE PLAN RECOMMENDATIONS:
   - New or updated care plan goals based on patient status
   - Include problem, goal, interventions

5. OASIS DATA POINTS:
   - OASIS C/D items that can be populated from this note
   - Item number, suggested value, confidence, evidence
   - Focus on functional items (M1800-M1890), wounds, medications

Return comprehensive JSON with all categories.`,
        response_json_schema: {
          type: "object",
          properties: {
            compliance: {
              type: "object",
              properties: {
                score: { type: "number" },
                gaps: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      category: { type: "string" },
                      gap: { type: "string" },
                      suggested_text: { type: "string" },
                      priority: { type: "string" }
                    }
                  }
                }
              }
            },
            pdgm: {
              type: "object",
              properties: {
                revenue_opportunity: { type: "number" },
                opportunities: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      category: { type: "string" },
                      finding: { type: "string" },
                      suggested_text: { type: "string" },
                      revenue_impact: { type: "number" },
                      priority: { type: "string" }
                    }
                  }
                }
              }
            },
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
            care_plans: {
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
            },
            oasis: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item_number: { type: "string" },
                  item_description: { type: "string" },
                  suggested_value: { type: "string" },
                  confidence: { type: "number" },
                  evidence: { type: "string" }
                }
              }
            }
          }
        }
      });

      setAnalysis(result);
      
      // Log AI analysis usage
      logActivity(ActivityActions.AI_FEATURE_USED, {
        feature: 'comprehensive_ai_analysis',
        patient_id: patientId,
        compliance_score: result.compliance?.score,
        pdgm_opportunity: result.pdgm?.revenue_opportunity,
        tasks_suggested: result.tasks?.length || 0,
        care_plans_suggested: result.care_plans?.length || 0,
        oasis_items_found: result.oasis?.length || 0,
        page: 'SmartNoteAssistant'
      });
    } catch (error) {
      console.error('Comprehensive analysis error:', error);
    }
    setAnalyzing(false);
  };

  const handleAcceptAllCompliance = () => {
    const pending = analysis.compliance?.gaps?.filter((_, idx) => !appliedCompliance.has(idx)) || [];
    const allText = pending.map(g => g.suggested_text).join('\n\n');
    onApplyCompliance(allText);
    setAppliedCompliance(new Set([...Array(analysis.compliance?.gaps?.length || 0).keys()]));
    
    // Log bulk compliance acceptance
    logActivity(ActivityActions.AI_FEATURE_USED, {
      feature: 'accept_all_compliance_suggestions',
      patient_id: patientId,
      suggestions_applied: pending.length,
      page: 'SmartNoteAssistant'
    });
  };

  const handleAcceptAllPDGM = () => {
    const pending = analysis.pdgm?.opportunities?.filter((_, idx) => !appliedPDGM.has(idx)) || [];
    const allText = pending.map(o => o.suggested_text).join('\n\n');
    onApplyPDGM(allText);
    setAppliedPDGM(new Set([...Array(analysis.pdgm?.opportunities?.length || 0).keys()]));
    
    // Log bulk PDGM acceptance
    logActivity(ActivityActions.AI_FEATURE_USED, {
      feature: 'accept_all_pdgm_suggestions',
      patient_id: patientId,
      suggestions_applied: pending.length,
      estimated_revenue_impact: pending.reduce((sum, o) => sum + (o.revenue_impact || 0), 0),
      page: 'SmartNoteAssistant'
    });
  };

  const handleAcceptAllTasks = async () => {
    const pending = analysis.tasks?.filter((_, idx) => !appliedTasks.has(idx)) || [];
    for (const task of pending) {
      await onCreateTask({
        title: task.title,
        description: task.description,
        type: task.type?.toLowerCase() || 'other',
        priority: task.priority?.toLowerCase() || 'medium',
        due_timeframe: mapTimeframe(task.timeframe),
        source: 'ai_generated',
        ai_reason: task.rationale
      });
    }
    setAppliedTasks(new Set([...Array(analysis.tasks?.length || 0).keys()]));
    
    // Log bulk task creation
    logActivity(ActivityActions.AI_FEATURE_USED, {
      feature: 'accept_all_ai_tasks',
      patient_id: patientId,
      tasks_created: pending.length,
      page: 'SmartNoteAssistant'
    });
  };

  const handleAcceptAllGoals = async () => {
    const pending = analysis.care_plans?.filter((_, idx) => !appliedGoals.has(idx)) || [];
    for (const plan of pending) {
      await onCreateCarePlan({
        problem: plan.problem,
        goal: plan.goal,
        interventions: plan.interventions,
        status: 'active',
        target_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
    }
    setAppliedGoals(new Set([...Array(analysis.care_plans?.length || 0).keys()]));
    
    // Log bulk care plan creation
    logActivity(ActivityActions.AI_FEATURE_USED, {
      feature: 'accept_all_ai_care_plans',
      patient_id: patientId,
      care_plans_created: pending.length,
      page: 'SmartNoteAssistant'
    });
  };

  const handleAcceptAllOASIS = () => {
    const pending = analysis.oasis?.filter((_, idx) => !appliedOASIS.has(idx)) || [];
    onApplyOASIS(pending);
    setAppliedOASIS(new Set([...Array(analysis.oasis?.length || 0).keys()]));
    
    // Log bulk OASIS application
    logActivity(ActivityActions.AI_FEATURE_USED, {
      feature: 'accept_all_oasis_suggestions',
      patient_id: patientId,
      oasis_items_applied: pending.length,
      page: 'SmartNoteAssistant'
    });
  };

  const mapTimeframe = (tf) => {
    const t = tf?.toLowerCase() || '';
    if (t.includes('today')) return 'today';
    if (t.includes('24')) return '24_hours';
    if (t.includes('48')) return '48_hours';
    if (t.includes('week')) return 'this_week';
    return 'next_visit';
  };

  const pendingCompliance = analysis?.compliance?.gaps?.filter((_, idx) => !appliedCompliance.has(idx)) || [];
  const pendingPDGM = analysis?.pdgm?.opportunities?.filter((_, idx) => !appliedPDGM.has(idx)) || [];
  const pendingTasks = analysis?.tasks?.filter((_, idx) => !appliedTasks.has(idx)) || [];
  const pendingGoals = analysis?.care_plans?.filter((_, idx) => !appliedGoals.has(idx)) || [];
  const pendingOASIS = analysis?.oasis?.filter((_, idx) => !appliedOASIS.has(idx)) || [];

  const totalPending = pendingCompliance.length + pendingPDGM.length + pendingTasks.length + pendingGoals.length + pendingOASIS.length;

  return (
    <Card className="border-4 border-blue-400 bg-gradient-to-br from-blue-50 to-indigo-50 shadow-2xl">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-6 h-6" />
            AI Comprehensive Analysis
            {totalPending > 0 && (
              <Badge className="bg-white text-blue-700 ml-2">
                {totalPending} Suggestions
              </Badge>
            )}
          </CardTitle>
          {!analyzing && !analysis && (
            <Button
              size="sm"
              onClick={runComprehensiveAnalysis}
              className="bg-white text-blue-700 hover:bg-blue-50"
            >
              <Sparkles className="w-4 h-4 mr-1" />
              Analyze
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {analyzing && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-4 border-blue-600 mx-auto mb-4" />
            <p className="text-gray-600 font-medium">Running comprehensive AI analysis...</p>
            <p className="text-xs text-gray-500 mt-2">Analyzing compliance, PDGM, tasks, and OASIS opportunities</p>
          </div>
        )}

        {analysis && (
          <Tabs defaultValue="compliance" className="space-y-4">
            <TabsList className="grid grid-cols-5 w-full">
              <TabsTrigger value="compliance" className="text-xs">
                <Shield className="w-3 h-3 mr-1" />
                Compliance
                {pendingCompliance.length > 0 && (
                  <Badge className="ml-1 bg-red-600 text-white text-xs px-1">{pendingCompliance.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="pdgm" className="text-xs">
                <DollarSign className="w-3 h-3 mr-1" />
                PDGM
                {pendingPDGM.length > 0 && (
                  <Badge className="ml-1 bg-green-600 text-white text-xs px-1">{pendingPDGM.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="tasks" className="text-xs">
                <ClipboardList className="w-3 h-3 mr-1" />
                Tasks
                {pendingTasks.length > 0 && (
                  <Badge className="ml-1 bg-orange-600 text-white text-xs px-1">{pendingTasks.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="goals" className="text-xs">
                <Target className="w-3 h-3 mr-1" />
                Goals
                {pendingGoals.length > 0 && (
                  <Badge className="ml-1 bg-purple-600 text-white text-xs px-1">{pendingGoals.length}</Badge>
                )}
              </TabsTrigger>
              <TabsTrigger value="oasis" className="text-xs">
                <FileText className="w-3 h-3 mr-1" />
                OASIS
                {pendingOASIS.length > 0 && (
                  <Badge className="ml-1 bg-blue-600 text-white text-xs px-1">{pendingOASIS.length}</Badge>
                )}
              </TabsTrigger>
            </TabsList>

            {/* Compliance Tab */}
            <TabsContent value="compliance" className="space-y-3">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Badge className={`${
                    analysis.compliance?.score >= 80 ? 'bg-green-600' :
                    analysis.compliance?.score >= 60 ? 'bg-yellow-500' : 'bg-red-600'
                  }`}>
                    {analysis.compliance?.score}% Compliant
                  </Badge>
                </div>
                {pendingCompliance.length > 0 && (
                  <Button
                    size="sm"
                    onClick={handleAcceptAllCompliance}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Accept All ({pendingCompliance.length})
                  </Button>
                )}
              </div>

              {analysis.compliance?.gaps?.map((gap, idx) => {
                const isApplied = appliedCompliance.has(idx);
                return (
                  <Card key={idx} className={`border-l-4 ${
                    isApplied ? 'border-l-green-500 bg-green-50 opacity-60' :
                    gap.priority === 'critical' ? 'border-l-red-500' : 'border-l-yellow-500'
                  }`}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className={`text-xs ${gap.priority === 'critical' ? 'bg-red-600' : 'bg-yellow-500'}`}>
                              {gap.priority}
                            </Badge>
                            <span className="text-xs font-semibold">{gap.category}</span>
                          </div>
                          <p className="text-xs text-gray-700 mb-2">{gap.gap}</p>
                          <div className="bg-blue-50 border border-blue-200 rounded p-2">
                            <p className="text-xs text-blue-900">{gap.suggested_text}</p>
                          </div>
                        </div>
                        {!isApplied ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              onApplyCompliance(gap.suggested_text);
                              setAppliedCompliance(prev => new Set([...prev, idx]));
                            }}
                            className="h-7 flex-shrink-0"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
              {pendingCompliance.length === 0 && analysis.compliance?.gaps?.length > 0 && (
                <Alert className="bg-green-50 border-green-300">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-sm text-green-900">All compliance suggestions applied!</AlertDescription>
                </Alert>
              )}
            </TabsContent>

            {/* PDGM Tab */}
            <TabsContent value="pdgm" className="space-y-3">
              <div className="flex items-center justify-between mb-3">
                <Badge className="bg-green-600">
                  +${analysis.pdgm?.revenue_opportunity || 0} Potential
                </Badge>
                {pendingPDGM.length > 0 && (
                  <Button
                    size="sm"
                    onClick={handleAcceptAllPDGM}
                    className="bg-green-600 hover:bg-green-700"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                    Accept All ({pendingPDGM.length})
                  </Button>
                )}
              </div>

              {analysis.pdgm?.opportunities?.map((opp, idx) => {
                const isApplied = appliedPDGM.has(idx);
                return (
                  <Card key={idx} className={`border-l-4 ${
                    isApplied ? 'border-l-green-500 bg-green-50 opacity-60' : 'border-l-green-500'
                  }`}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <Badge className="text-xs bg-green-600">+${opp.revenue_impact || 0}</Badge>
                            <span className="text-xs font-semibold">{opp.category}</span>
                          </div>
                          <p className="text-xs text-gray-700 mb-2">{opp.finding}</p>
                          <div className="bg-green-50 border border-green-200 rounded p-2">
                            <p className="text-xs text-green-900">{opp.suggested_text}</p>
                          </div>
                        </div>
                        {!isApplied ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              onApplyPDGM(opp.suggested_text);
                              setAppliedPDGM(prev => new Set([...prev, idx]));
                            }}
                            className="h-7 flex-shrink-0"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            {/* Tasks Tab */}
            <TabsContent value="tasks" className="space-y-3">
              {pendingTasks.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleAcceptAllTasks}
                  className="w-full bg-green-600 hover:bg-green-700 mb-2"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Create All Tasks ({pendingTasks.length})
                </Button>
              )}

              {analysis.tasks?.map((task, idx) => {
                const isApplied = appliedTasks.has(idx);
                return (
                  <Card key={idx} className={isApplied ? 'bg-green-50 opacity-60' : ''}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium mb-1">{task.title}</p>
                          <p className="text-xs text-gray-600 mb-2">{task.description}</p>
                          <div className="flex gap-1">
                            <Badge className="text-xs">{task.type}</Badge>
                            <Badge className="text-xs">{task.priority}</Badge>
                            <Badge variant="outline" className="text-xs">{task.timeframe}</Badge>
                          </div>
                        </div>
                        {!isApplied ? (
                          <Button
                            size="sm"
                            onClick={async () => {
                              await onCreateTask({
                                title: task.title,
                                description: task.description,
                                type: task.type?.toLowerCase() || 'other',
                                priority: task.priority?.toLowerCase() || 'medium',
                                due_timeframe: mapTimeframe(task.timeframe),
                                source: 'ai_generated',
                                ai_reason: task.rationale
                              });
                              setAppliedTasks(prev => new Set([...prev, idx]));
                            }}
                            className="h-7 flex-shrink-0"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            {/* Care Plans Tab */}
            <TabsContent value="goals" className="space-y-3">
              {pendingGoals.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleAcceptAllGoals}
                  className="w-full bg-green-600 hover:bg-green-700 mb-2"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Create All Care Plans ({pendingGoals.length})
                </Button>
              )}

              {analysis.care_plans?.map((plan, idx) => {
                const isApplied = appliedGoals.has(idx);
                return (
                  <Card key={idx} className={isApplied ? 'bg-green-50 opacity-60' : ''}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <p className="text-sm font-medium text-gray-900 mb-1">{plan.problem}</p>
                          <p className="text-xs text-indigo-700 font-medium mb-2">Goal: {plan.goal}</p>
                          <div className="bg-blue-50 rounded p-2">
                            <p className="text-xs font-semibold mb-1">Interventions:</p>
                            {plan.interventions?.map((int, iIdx) => (
                              <p key={iIdx} className="text-xs text-gray-700">• {int}</p>
                            ))}
                          </div>
                        </div>
                        {!isApplied ? (
                          <Button
                            size="sm"
                            onClick={async () => {
                              await onCreateCarePlan({
                                problem: plan.problem,
                                goal: plan.goal,
                                interventions: plan.interventions,
                                status: 'active',
                                target_date: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
                              });
                              setAppliedGoals(prev => new Set([...prev, idx]));
                            }}
                            className="h-7 flex-shrink-0"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </TabsContent>

            {/* OASIS Tab */}
            <TabsContent value="oasis" className="space-y-3">
              {pendingOASIS.length > 0 && (
                <Button
                  size="sm"
                  onClick={handleAcceptAllOASIS}
                  className="w-full bg-green-600 hover:bg-green-700 mb-2"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Apply All OASIS Suggestions ({pendingOASIS.length})
                </Button>
              )}

              {analysis.oasis?.map((item, idx) => {
                const isApplied = appliedOASIS.has(idx);
                return (
                  <Card key={idx} className={`border-l-4 ${
                    isApplied ? 'border-l-green-500 bg-green-50 opacity-60' :
                    item.confidence >= 80 ? 'border-l-green-500' :
                    item.confidence >= 60 ? 'border-l-yellow-500' : 'border-l-orange-500'
                  }`}>
                    <CardContent className="p-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold">{item.item_number}</span>
                            <Badge className={`text-xs ${
                              item.confidence >= 80 ? 'bg-green-600' :
                              item.confidence >= 60 ? 'bg-yellow-500' : 'bg-orange-500'
                            }`}>
                              {item.confidence}% confident
                            </Badge>
                          </div>
                          <p className="text-xs text-gray-600 mb-2">{item.item_description}</p>
                          <div className="bg-blue-50 border border-blue-200 rounded p-2 mb-2">
                            <p className="text-xs text-blue-900">
                              <strong>Suggested Value:</strong> {item.suggested_value}
                            </p>
                          </div>
                          <p className="text-xs text-gray-700 italic">
                            Evidence: "{item.evidence}"
                          </p>
                        </div>
                        {!isApplied ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              onApplyOASIS([item]);
                              setAppliedOASIS(prev => new Set([...prev, idx]));
                            }}
                            className="h-7 flex-shrink-0"
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        ) : (
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {analysis.oasis?.length === 0 && (
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription className="text-sm text-blue-900">
                    No OASIS data points can be confidently extracted from current note content.
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>
        )}

        {!analysis && !analyzing && (
          <Alert className="bg-blue-50 border-blue-200">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-sm text-blue-900">
              Write at least 150 characters in your note, then AI will automatically analyze for compliance gaps, 
              PDGM optimization, suggested tasks, care plan updates, and OASIS data points.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
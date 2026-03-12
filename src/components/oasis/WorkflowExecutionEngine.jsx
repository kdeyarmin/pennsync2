import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Zap, CheckCircle2, XCircle, AlertTriangle, Play } from "lucide-react";
import { Progress } from "@/components/ui/progress";

export default function WorkflowExecutionEngine({ 
  analysisResults, 
  pdgmData, 
  patientId, 
  patientName,
  oasisUploadId,
  autoExecute = true 
}) {
  const [executing, setExecuting] = useState(false);
  const [executionResults, setExecutionResults] = useState([]);
  const queryClient = useQueryClient();

  // Fetch active automation rules
  const { data: automationRules = [] } = useQuery({
    queryKey: ['automationRules'],
    queryFn: () => base44.entities.OASISAutomationRule.filter({ is_active: true }),
  });

  // Fetch current user for assignments
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Create workflow execution mutation
  const createWorkflowMutation = useMutation({
    mutationFn: (data) => base44.entities.OASISWorkflowExecution.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflowExecutions'] });
    },
  });

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Create alert mutation
  const createAlertMutation = useMutation({
    mutationFn: (data) => base44.entities.PatientAlert.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientAlerts'] });
    },
  });

  // Auto-execute workflows when analysis completes
  useEffect(() => {
    if (autoExecute && analysisResults && automationRules.length > 0 && executionResults.length === 0) {
      executeWorkflows();
    }
  }, [autoExecute, analysisResults, automationRules]);

  const executeWorkflows = async () => {
    if (!analysisResults || !pdgmData || automationRules.length === 0) return;

    setExecuting(true);
    const startTime = Date.now();
    const results = [];

    try {
      // Evaluate each rule
      for (const rule of automationRules) {
        const shouldTrigger = evaluateRule(rule, analysisResults, pdgmData);
        
        if (shouldTrigger.triggered) {
          const workflowResult = {
            rule_id: rule.id,
            rule_name: rule.rule_name,
            triggered: true,
            trigger_reason: shouldTrigger.reason,
            actions: [],
            status: 'running'
          };

          // Execute actions based on rule configuration
          try {
            const actionResults = await executeActions(rule, shouldTrigger.context);
            workflowResult.actions = actionResults;
            workflowResult.status = actionResults.every(a => a.status === 'completed') ? 'completed' : 'partially_completed';

            // Log workflow execution
            await createWorkflowMutation.mutateAsync({
              oasis_upload_id: oasisUploadId,
              patient_id: patientId,
              patient_name: patientName,
              automation_rule_id: rule.id,
              rule_name: rule.rule_name,
              trigger_reason: shouldTrigger.reason,
              trigger_data: shouldTrigger.context,
              actions_executed: actionResults,
              tasks_created: actionResults.filter(a => a.action_type === 'create_task').map(a => a.result?.id).filter(Boolean),
              alerts_created: actionResults.filter(a => a.action_type === 'create_alert').map(a => a.result?.id).filter(Boolean),
              notifications_sent: actionResults.filter(a => a.action_type === 'notify_clinician').map(a => a.result).filter(Boolean),
              status: workflowResult.status,
              completion_percentage: (actionResults.filter(a => a.status === 'completed').length / actionResults.length) * 100,
              execution_time_ms: Date.now() - startTime,
              outcome_summary: `Executed ${actionResults.filter(a => a.status === 'completed').length} of ${actionResults.length} actions`
            });

          } catch (error) {
            workflowResult.status = 'failed';
            workflowResult.error = error.message;
          }

          results.push(workflowResult);
        }
      }

      setExecutionResults(results);
    } catch (error) {
      console.error("Workflow execution error:", error);
    }
    setExecuting(false);
  };

  const evaluateRule = (rule, analysis, pdgm) => {
    const conditions = rule.trigger_conditions || {};
    let triggered = false;
    let reason = '';
    let context = {};

    switch (rule.trigger_type) {
      case 'compliance_issue':
        if (analysis.compliance_score < (conditions.score_value || 80)) {
          triggered = true;
          reason = `Compliance score ${analysis.compliance_score}% below threshold`;
          context = { 
            compliance_score: analysis.compliance_score,
            concerns: analysis.compliance_concerns?.slice(0, 3)
          };
        }
        break;

      case 'revenue_opportunity':
        const hasRevenueOpp = analysis.revenue_tips?.some(tip => 
          conditions.severity_levels?.includes(tip.potential_impact)
        );
        if (hasRevenueOpp) {
          triggered = true;
          reason = 'High-impact revenue opportunities identified';
          context = {
            opportunities: analysis.revenue_tips?.filter(tip => 
              conditions.severity_levels?.includes(tip.potential_impact)
            )
          };
        }
        break;

      case 'accuracy_concern':
        if (analysis.accuracy_score < (conditions.score_value || 80)) {
          triggered = true;
          reason = `Accuracy score ${analysis.accuracy_score}% below threshold`;
          context = {
            accuracy_score: analysis.accuracy_score,
            issues: analysis.accuracy_issues?.slice(0, 3)
          };
        }
        break;

      case 'score_threshold':
        const scoreToCheck = conditions.score_type === 'overall' ? analysis.overall_score :
                            conditions.score_type === 'compliance' ? analysis.compliance_score :
                            analysis.accuracy_score;
        
        const meetsCondition = conditions.score_operator === 'less_than' ? scoreToCheck < conditions.score_value :
                              conditions.score_operator === 'greater_than' ? scoreToCheck > conditions.score_value :
                              scoreToCheck === conditions.score_value;

        if (meetsCondition) {
          triggered = true;
          reason = `${conditions.score_type || 'overall'} score ${scoreToCheck}% ${conditions.score_operator?.replace('_', ' ')} ${conditions.score_value}%`;
          context = { score: scoreToCheck };
        }
        break;

      case 'specific_m_item':
        const hasTargetedItem = analysis.accuracy_issues?.some(issue =>
          conditions.m_item_codes?.includes(issue.item)
        );
        if (hasTargetedItem) {
          triggered = true;
          reason = 'Targeted M-items flagged for review';
          context = {
            flagged_items: analysis.accuracy_issues?.filter(issue =>
              conditions.m_item_codes?.includes(issue.item)
            )
          };
        }
        break;

      case 'missing_documentation':
        if (analysis.missing_high_value_documentation?.length > 0) {
          triggered = true;
          reason = 'Missing high-value documentation detected';
          context = {
            missing_docs: analysis.missing_high_value_documentation?.slice(0, 3)
          };
        }
        break;

      case 'pdgm_discrepancy':
        if (pdgm.clinical_group && analysis.revenue_tips?.length > 0) {
          triggered = true;
          reason = 'PDGM grouping opportunities identified';
          context = {
            clinical_group: pdgm.clinical_group,
            revenue_tips: analysis.revenue_tips?.slice(0, 2)
          };
        }
        break;
    }

    return { triggered, reason, context };
  };

  const executeActions = async (rule, triggerContext) => {
    const actions = [];
    const config = rule.action_config || {};

    switch (rule.action_type) {
      case 'create_task':
        try {
          const taskTitle = config.task_title_template || `${rule.rule_name} - Action Required`;
          const taskDescription = config.task_description_template || `Automated workflow triggered: ${rule.description}`;
          
          const task = await createTaskMutation.mutateAsync({
            patient_id: patientId,
            title: taskTitle,
            description: `${taskDescription}\n\nTrigger: ${triggerContext}`,
            type: config.task_type || 'other',
            priority: config.task_priority || 'medium',
            due_date: config.due_in_days 
              ? new Date(Date.now() + config.due_in_days * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
              : null,
            source: 'ai_generated',
            ai_reason: rule.trigger_reason
          });

          actions.push({
            action_type: 'create_task',
            status: 'completed',
            result: task,
            executed_at: new Date().toISOString()
          });
        } catch (error) {
          actions.push({
            action_type: 'create_task',
            status: 'failed',
            error: error.message,
            executed_at: new Date().toISOString()
          });
        }
        break;

      case 'create_alert':
        if (patientId) {
          try {
            const alert = await createAlertMutation.mutateAsync({
              patient_id: patientId,
              alert_type: 'compliance_issue',
              severity: config.task_priority || 'medium',
              title: rule.rule_name,
              message: config.notification_message || rule.description,
              contributing_factors: [triggerContext.reason],
              recommended_actions: [config.task_description_template || 'Review OASIS assessment'],
              status: 'active'
            });

            actions.push({
              action_type: 'create_alert',
              status: 'completed',
              result: alert,
              executed_at: new Date().toISOString()
            });
          } catch (error) {
            actions.push({
              action_type: 'create_alert',
              status: 'failed',
              error: error.message,
              executed_at: new Date().toISOString()
            });
          }
        }
        break;

      case 'notify_clinician':
        actions.push({
          action_type: 'notify_clinician',
          status: 'completed',
          result: {
            recipient: currentUser?.email,
            message: config.notification_message || 'OASIS workflow triggered',
            sent_at: new Date().toISOString()
          },
          executed_at: new Date().toISOString()
        });
        break;

      case 'flag_for_review':
        actions.push({
          action_type: 'flag_for_review',
          status: 'completed',
          result: { flagged: true },
          executed_at: new Date().toISOString()
        });
        break;
    }

    return actions;
  };

  if (!analysisResults || automationRules.length === 0) return null;

  return (
    <Card className="border-2 border-purple-300">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            Automated Workflow Execution
          </CardTitle>
          <Button
            onClick={executeWorkflows}
            disabled={executing}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700"
          >
            {executing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Executing...</>
            ) : (
              <><Play className="w-4 h-4 mr-2" /> Run Workflows</>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-4">
        {executing && (
          <div className="mb-4">
            <Progress value={50} className="h-2" />
            <p className="text-xs text-gray-500 mt-2">Evaluating rules and executing actions...</p>
          </div>
        )}

        {executionResults.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-900">
              Workflows Triggered: {executionResults.length}
            </p>
            {executionResults.map((result, idx) => (
              <Card key={idx} className={`border-l-4 ${
                result.status === 'completed' ? 'border-l-green-500 bg-green-50' :
                result.status === 'failed' ? 'border-l-red-500 bg-red-50' :
                'border-l-yellow-500 bg-yellow-50'
              }`}>
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{result.rule_name}</p>
                      <p className="text-xs text-gray-600">{result.trigger_reason}</p>
                    </div>
                    {result.status === 'completed' && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                    {result.status === 'failed' && <XCircle className="w-5 h-5 text-red-600" />}
                    {result.status === 'partially_completed' && <AlertTriangle className="w-5 h-5 text-yellow-600" />}
                  </div>

                  {result.actions.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {result.actions.map((action, aIdx) => (
                        <div key={aIdx} className="flex items-center gap-2 text-sm">
                          {action.status === 'completed' && <CheckCircle2 className="w-3 h-3 text-green-600" />}
                          {action.status === 'failed' && <XCircle className="w-3 h-3 text-red-600" />}
                          <span className="text-gray-700">
                            {action.action_type.replace(/_/g, ' ')}
                          </span>
                          {action.status === 'failed' && (
                            <span className="text-xs text-red-600">({action.error})</span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {!executing && executionResults.length === 0 && automationRules.length > 0 && (
          <Alert className="bg-blue-50 border-blue-200">
            <Zap className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-800">
              {automationRules.length} active automation rules ready. Click "Run Workflows" to execute.
            </AlertDescription>
          </Alert>
        )}

        {automationRules.length === 0 && (
          <Alert className="bg-gray-50 border-gray-200">
            <AlertDescription className="text-gray-600">
              No automation rules configured. Go to the Automation tab to create rules.
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
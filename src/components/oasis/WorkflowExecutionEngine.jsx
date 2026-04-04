import { useState, useEffect, useMemo, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Zap, CheckCircle2, XCircle, AlertTriangle, Play } from "lucide-react";
import { Progress } from "@/components/ui/progress";

const ACTION_LABELS = {
  create_task: "Create task",
  create_alert: "Create alert",
  notify_clinician: "Notify clinician",
  flag_for_review: "Flag for review"
};

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
  const [progress, setProgress] = useState(0);
  const [lastExecutionError, setLastExecutionError] = useState("");
  const [autoExecutedKey, setAutoExecutedKey] = useState(null);
  const queryClient = useQueryClient();

  const executionKey = useMemo(() => {
    if (oasisUploadId) return `upload:${oasisUploadId}`;
    if (patientId) return `patient:${patientId}`;
    if (!analysisResults) return null;
    return `analysis:${analysisResults.overall_score || "unknown"}:${analysisResults.accuracy_score || "unknown"}`;
  }, [oasisUploadId, patientId, analysisResults]);

  const { data: automationRules = [] } = useQuery({
    queryKey: ["automationRules"],
    queryFn: () => base44.entities.OASISAutomationRule.filter({ is_active: true })
  });

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me()
  });

  const createWorkflowMutation = useMutation({
    mutationFn: (data) => base44.entities.OASISWorkflowExecution.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["workflowExecutions"] });
    }
  });

  const createTaskMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks"] });
    }
  });

  const createAlertMutation = useMutation({
    mutationFn: (data) => base44.entities.PatientAlert.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["patientAlerts"] });
    }
  });

  const evaluateRule = useCallback((rule, analysis, pdgm) => {
    const conditions = rule.trigger_conditions || {};
    let triggered = false;
    let reason = "";
    let context = {};

    switch (rule.trigger_type) {
      case "compliance_issue":
        if (analysis.compliance_score < (conditions.score_value || 80)) {
          triggered = true;
          reason = `Compliance score ${analysis.compliance_score}% below threshold`;
          context = {
            compliance_score: analysis.compliance_score,
            concerns: analysis.compliance_concerns?.slice(0, 3) || []
          };
        }
        break;

      case "revenue_opportunity": {
        const matchingOpportunities = analysis.revenue_tips?.filter((tip) =>
          conditions.severity_levels?.includes(tip.potential_impact)
        ) || [];

        if (matchingOpportunities.length > 0) {
          triggered = true;
          reason = "High-impact revenue opportunities identified";
          context = { opportunities: matchingOpportunities };
        }
        break;
      }

      case "accuracy_concern":
        if (analysis.accuracy_score < (conditions.score_value || 80)) {
          triggered = true;
          reason = `Accuracy score ${analysis.accuracy_score}% below threshold`;
          context = {
            accuracy_score: analysis.accuracy_score,
            issues: analysis.accuracy_issues?.slice(0, 3) || []
          };
        }
        break;

      case "score_threshold": {
        const scoreToCheck =
          conditions.score_type === "overall"
            ? analysis.overall_score
            : conditions.score_type === "compliance"
              ? analysis.compliance_score
              : analysis.accuracy_score;

        const meetsCondition =
          conditions.score_operator === "less_than"
            ? scoreToCheck < conditions.score_value
            : conditions.score_operator === "greater_than"
              ? scoreToCheck > conditions.score_value
              : scoreToCheck === conditions.score_value;

        if (meetsCondition) {
          triggered = true;
          reason = `${conditions.score_type || "overall"} score ${scoreToCheck}% ${conditions.score_operator?.replace("_", " ")} ${conditions.score_value}%`;
          context = { score: scoreToCheck };
        }
        break;
      }

      case "specific_m_item": {
        const flaggedItems = analysis.accuracy_issues?.filter((issue) =>
          conditions.m_item_codes?.includes(issue.item)
        ) || [];

        if (flaggedItems.length > 0) {
          triggered = true;
          reason = "Targeted M-items flagged for review";
          context = { flagged_items: flaggedItems };
        }
        break;
      }

      case "missing_documentation":
        if ((analysis.missing_high_value_documentation?.length || 0) > 0) {
          triggered = true;
          reason = "Missing high-value documentation detected";
          context = {
            missing_docs: analysis.missing_high_value_documentation?.slice(0, 3) || []
          };
        }
        break;

      case "pdgm_discrepancy":
        if (pdgm?.clinical_group && (analysis.revenue_tips?.length || 0) > 0) {
          triggered = true;
          reason = "PDGM grouping opportunities identified";
          context = {
            clinical_group: pdgm.clinical_group,
            revenue_tips: analysis.revenue_tips?.slice(0, 2) || []
          };
        }
        break;

      default:
        break;
    }

    return { triggered, reason, context };
  }, []);

  const executeActions = useCallback(async (rule, triggerContext) => {
    const actions = [];
    const config = rule.action_config || {};

    switch (rule.action_type) {
      case "create_task": {
        try {
          const task = await createTaskMutation.mutateAsync({
            patient_id: patientId,
            title: config.task_title_template || `${rule.rule_name} - Action Required`,
            description: `${config.task_description_template || `Automated workflow triggered: ${rule.description}`}\n\nTrigger context: ${JSON.stringify(triggerContext)}`,
            type: config.task_type || "other",
            priority: config.task_priority || "medium",
            due_date: config.due_in_days
              ? new Date(Date.now() + config.due_in_days * 24 * 60 * 60 * 1000).toISOString().split("T")[0]
              : null,
            source: "ai_generated",
            ai_reason: triggerContext.reason || "Automation rule triggered"
          });

          actions.push({
            action_type: "create_task",
            status: "completed",
            result: task,
            executed_at: new Date().toISOString()
          });
        } catch (error) {
          actions.push({
            action_type: "create_task",
            status: "failed",
            error: error.message,
            executed_at: new Date().toISOString()
          });
        }
        break;
      }

      case "create_alert": {
        if (patientId) {
          try {
            const alert = await createAlertMutation.mutateAsync({
              patient_id: patientId,
              alert_type: "compliance_issue",
              severity: config.task_priority || "medium",
              title: rule.rule_name,
              message: config.notification_message || rule.description,
              contributing_factors: [triggerContext.reason || "Automated rule trigger"],
              recommended_actions: [config.task_description_template || "Review OASIS assessment"],
              status: "active"
            });

            actions.push({
              action_type: "create_alert",
              status: "completed",
              result: alert,
              executed_at: new Date().toISOString()
            });
          } catch (error) {
            actions.push({
              action_type: "create_alert",
              status: "failed",
              error: error.message,
              executed_at: new Date().toISOString()
            });
          }
        }
        break;
      }

      case "notify_clinician":
        actions.push({
          action_type: "notify_clinician",
          status: "completed",
          result: {
            recipient: currentUser?.email,
            message: config.notification_message || "OASIS workflow triggered",
            sent_at: new Date().toISOString()
          },
          executed_at: new Date().toISOString()
        });
        break;

      case "flag_for_review":
        actions.push({
          action_type: "flag_for_review",
          status: "completed",
          result: { flagged: true },
          executed_at: new Date().toISOString()
        });
        break;

      default:
        actions.push({
          action_type: rule.action_type || "unknown_action",
          status: "failed",
          error: "Unsupported action type",
          executed_at: new Date().toISOString()
        });
        break;
    }

    return actions;
  }, [createAlertMutation, createTaskMutation, currentUser?.email, patientId]);

  const executeWorkflows = useCallback(async () => {
    if (executing || !analysisResults || !pdgmData || automationRules.length === 0) {
      return;
    }

    setExecuting(true);
    setProgress(10);
    setLastExecutionError("");
    const startTime = Date.now();
    const results = [];

    try {
      const totalRules = automationRules.length;
      let processedRules = 0;

      for (const rule of automationRules) {
        const triggerResult = evaluateRule(rule, analysisResults, pdgmData);

        if (triggerResult.triggered) {
          const workflowResult = {
            rule_id: rule.id,
            rule_name: rule.rule_name,
            triggered: true,
            trigger_reason: triggerResult.reason,
            actions: [],
            status: "running"
          };

          try {
            const actionResults = await executeActions(rule, triggerResult);
            const completedActions = actionResults.filter((action) => action.status === "completed").length;

            workflowResult.actions = actionResults;
            workflowResult.status = completedActions === actionResults.length ? "completed" : "partially_completed";

            await createWorkflowMutation.mutateAsync({
              oasis_upload_id: oasisUploadId,
              patient_id: patientId,
              patient_name: patientName,
              automation_rule_id: rule.id,
              rule_name: rule.rule_name,
              trigger_reason: triggerResult.reason,
              trigger_data: triggerResult.context,
              actions_executed: actionResults,
              tasks_created: actionResults
                .filter((action) => action.action_type === "create_task")
                .map((action) => action.result?.id)
                .filter(Boolean),
              alerts_created: actionResults
                .filter((action) => action.action_type === "create_alert")
                .map((action) => action.result?.id)
                .filter(Boolean),
              notifications_sent: actionResults
                .filter((action) => action.action_type === "notify_clinician")
                .map((action) => action.result)
                .filter(Boolean),
              status: workflowResult.status,
              completion_percentage: actionResults.length > 0 ? (completedActions / actionResults.length) * 100 : 0,
              execution_time_ms: Date.now() - startTime,
              outcome_summary: `Executed ${completedActions} of ${actionResults.length} actions`
            });
          } catch (error) {
            workflowResult.status = "failed";
            workflowResult.error = error.message;
          }

          results.push(workflowResult);
        }

        processedRules += 1;
        const percent = Math.min(95, Math.round((processedRules / totalRules) * 100));
        setProgress(percent);
      }

      setExecutionResults(results);
      setProgress(100);
    } catch (error) {
      console.error("Workflow execution error:", error);
      setLastExecutionError(error.message || "Workflow execution failed");
      setProgress(0);
    } finally {
      setExecuting(false);
    }
  }, [
    analysisResults,
    automationRules,
    createWorkflowMutation,
    evaluateRule,
    executeActions,
    executing,
    oasisUploadId,
    patientId,
    patientName,
    pdgmData
  ]);

  useEffect(() => {
    if (!autoExecute || !executionKey || executionResults.length > 0 || executing) {
      return;
    }

    if (autoExecutedKey === executionKey) {
      return;
    }

    setAutoExecutedKey(executionKey);
    executeWorkflows();
  }, [autoExecute, autoExecutedKey, executeWorkflows, executionKey, executionResults.length, executing]);

  if (!analysisResults || automationRules.length === 0) return null;

  return (
    <Card className="border-2 border-purple-300">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-indigo-50">
        <div className="flex items-center justify-between gap-2">
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
            <Progress value={progress} className="h-2" />
            <p className="text-xs text-gray-500 mt-2">Evaluating rules and executing actions...</p>
          </div>
        )}

        {!!lastExecutionError && (
          <Alert className="mb-4 bg-red-50 border-red-200">
            <AlertTriangle className="w-4 h-4 text-red-600" />
            <AlertDescription className="text-red-800">
              {lastExecutionError}
            </AlertDescription>
          </Alert>
        )}

        {executionResults.length > 0 && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-900">
              Workflows Triggered: {executionResults.length}
            </p>
            {executionResults.map((result, idx) => (
              <Card
                key={`${result.rule_id}-${idx}`}
                className={`border-l-4 ${
                  result.status === "completed"
                    ? "border-l-green-500 bg-green-50"
                    : result.status === "failed"
                      ? "border-l-red-500 bg-red-50"
                      : "border-l-yellow-500 bg-yellow-50"
                }`}
              >
                <CardContent className="p-3">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-gray-900">{result.rule_name}</p>
                      <p className="text-xs text-gray-600">{result.trigger_reason}</p>
                    </div>
                    {result.status === "completed" && <CheckCircle2 className="w-5 h-5 text-green-600" />}
                    {result.status === "failed" && <XCircle className="w-5 h-5 text-red-600" />}
                    {result.status === "partially_completed" && <AlertTriangle className="w-5 h-5 text-yellow-600" />}
                  </div>

                  {result.actions.length > 0 && (
                    <div className="space-y-1 mt-2">
                      {result.actions.map((action, actionIndex) => (
                        <div key={`${action.action_type}-${actionIndex}`} className="flex items-center gap-2 text-sm">
                          {action.status === "completed" && <CheckCircle2 className="w-3 h-3 text-green-600" />}
                          {action.status === "failed" && <XCircle className="w-3 h-3 text-red-600" />}
                          <span className="text-gray-700">
                            {ACTION_LABELS[action.action_type] || action.action_type.replace(/_/g, " ")}
                          </span>
                          {action.status === "failed" && action.error && (
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
      </CardContent>
    </Card>
  );
}

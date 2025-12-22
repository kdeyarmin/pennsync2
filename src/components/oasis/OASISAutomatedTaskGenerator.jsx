import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Zap,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ClipboardList,
  Sparkles
} from "lucide-react";

export default function OASISAutomatedTaskGenerator({ 
  analysisResults, 
  patientId,
  onTasksCreated 
}) {
  const [generatedTasks, setGeneratedTasks] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [message, setMessage] = useState(null);

  const queryClient = useQueryClient();

  // Fetch automation rules
  const { data: agencySettings } = useQuery({
    queryKey: ['agencySettings'],
    queryFn: async () => {
      const settings = await base44.entities.AgencySettings.list();
      return settings[0] || null;
    }
  });

  // Create tasks mutation
  const createTasksMutation = useMutation({
    mutationFn: async (tasks) => {
      const promises = tasks.map(task => 
        base44.entities.Task.create(task)
      );
      return Promise.all(promises);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['tasks']);
      setMessage({ type: 'success', text: 'Tasks created successfully!' });
      if (onTasksCreated) onTasksCreated();
    }
  });

  useEffect(() => {
    if (analysisResults && agencySettings?.oasis_automation_rules) {
      generateAutomatedTasks();
    }
  }, [analysisResults, agencySettings]);

  const generateAutomatedTasks = async () => {
    if (!analysisResults || !agencySettings?.oasis_automation_rules) return;

    setIsGenerating(true);
    const tasks = [];
    const rules = agencySettings.oasis_automation_rules.filter(r => r.enabled);

    for (const rule of rules) {
      const shouldTrigger = evaluateRule(rule, analysisResults);
      
      if (shouldTrigger) {
        // Use AI to generate detailed task description based on specific findings
        const aiEnhancedTask = await enhanceTaskWithAI(rule, analysisResults);
        tasks.push({
          ...aiEnhancedTask,
          patient_id: patientId,
          source: 'ai_generated',
          ai_reason: `Triggered by: ${rule.name}`
        });
      }
    }

    setGeneratedTasks(tasks);
    setSelectedTasks(tasks.map((_, idx) => idx)); // Select all by default
    setIsGenerating(false);
  };

  const evaluateRule = (rule, results) => {
    const { trigger_type, condition, threshold } = rule;

    switch (trigger_type) {
      case 'compliance_score':
        const complianceScore = results.compliance_score || 0;
        return evaluateCondition(complianceScore, condition, threshold);
      
      case 'accuracy_score':
        const accuracyScore = results.accuracy_score || 0;
        return evaluateCondition(accuracyScore, condition, threshold);
      
      case 'revenue_opportunities':
        const revenueCount = results.revenue_tips?.length || 0;
        return evaluateCondition(revenueCount, condition, threshold);
      
      case 'missing_narratives':
        const missingCount = results.missing_narratives?.length || 0;
        return evaluateCondition(missingCount, condition, threshold);
      
      case 'functional_decline':
        const hasFunctionalIssues = results.accuracy_issues?.some(
          issue => issue.toLowerCase().includes('functional') || 
                   issue.toLowerCase().includes('ambulation') ||
                   issue.toLowerCase().includes('adl')
        );
        return condition === 'detected' ? hasFunctionalIssues : false;
      
      case 'critical_issues':
        const criticalCount = results.compliance_concerns?.filter(
          c => c.severity === 'critical' || c.severity === 'high'
        ).length || 0;
        return evaluateCondition(criticalCount, condition, threshold);
      
      case 'pdgm_discrepancies':
        const discrepancyCount = results.pdgm_data?.discrepancies?.length || 0;
        return evaluateCondition(discrepancyCount, condition, threshold);
      
      default:
        return false;
    }
  };

  const evaluateCondition = (value, condition, threshold) => {
    switch (condition) {
      case 'less_than': return value < threshold;
      case 'greater_than': return value > threshold;
      case 'equals': return value === threshold;
      case 'has_items': return value >= threshold;
      case 'detected': return value > 0;
      default: return false;
    }
  };

  const enhanceTaskWithAI = async (rule, results) => {
    try {
      const prompt = `Based on OASIS analysis results, create a detailed, actionable task description.

OASIS Analysis Summary:
- Compliance Score: ${results.compliance_score}%
- Accuracy Score: ${results.accuracy_score}%
- Key Issues: ${JSON.stringify(results.accuracy_issues?.slice(0, 3) || [])}
- Compliance Concerns: ${JSON.stringify(results.compliance_concerns?.slice(0, 3) || [])}
- Revenue Opportunities: ${JSON.stringify(results.revenue_tips?.slice(0, 3) || [])}

Base Task: ${rule.task_config.title}
Task Type: ${rule.task_config.type}

Generate a detailed description that:
1. Specifies exactly what needs to be done
2. References specific OASIS findings
3. Includes suggested timeframe
4. Mentions potential impact

Return JSON with enhanced description and optional due_date suggestion.`;

      const aiResponse = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            enhanced_description: { type: "string" },
            suggested_due_timeframe: { type: "string" },
            specific_actions: { type: "array", items: { type: "string" } }
          }
        }
      });

      return {
        title: rule.task_config.title,
        description: aiResponse.enhanced_description || rule.task_config.description,
        type: rule.task_config.type,
        priority: rule.task_config.priority,
        due_timeframe: aiResponse.suggested_due_timeframe || 'this_week',
        specific_actions: aiResponse.specific_actions
      };
    } catch (error) {
      console.error('AI task enhancement failed:', error);
      return {
        title: rule.task_config.title,
        description: rule.task_config.description,
        type: rule.task_config.type,
        priority: rule.task_config.priority,
        due_timeframe: 'this_week'
      };
    }
  };

  const handleCreateTasks = async () => {
    const tasksToCreate = selectedTasks.map(idx => generatedTasks[idx]);
    if (tasksToCreate.length === 0) return;

    setIsCreating(true);
    setMessage(null);

    try {
      await createTasksMutation.mutateAsync(tasksToCreate);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to create tasks. Please try again.' });
    }

    setIsCreating(false);
  };

  const toggleTaskSelection = (index) => {
    if (selectedTasks.includes(index)) {
      setSelectedTasks(selectedTasks.filter(i => i !== index));
    } else {
      setSelectedTasks([...selectedTasks, index]);
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isGenerating) {
    return (
      <Card className="border-2 border-purple-200">
        <CardContent className="p-6 text-center">
          <Loader2 className="w-8 h-8 text-purple-600 mx-auto mb-3 animate-spin" />
          <p className="text-sm font-medium text-purple-900">Generating automated tasks...</p>
        </CardContent>
      </Card>
    );
  }

  if (generatedTasks.length === 0) {
    return (
      <Card className="border-2 border-gray-200">
        <CardContent className="p-6 text-center">
          <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-700">No automated tasks triggered</p>
          <p className="text-xs text-gray-500 mt-1">All OASIS quality thresholds met</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-indigo-50">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Zap className="w-5 h-5 text-purple-600" />
          Automated Follow-up Actions
          <Badge className="bg-purple-600 text-white">
            {generatedTasks.length} Task{generatedTasks.length !== 1 ? 's' : ''}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-blue-50 border-blue-200">
          <Sparkles className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-900">
            AI has identified {generatedTasks.length} recommended action{generatedTasks.length !== 1 ? 's' : ''} based on analysis results.
            Review and select which tasks to create.
          </AlertDescription>
        </Alert>

        {/* Generated Tasks */}
        <div className="space-y-3">
          {generatedTasks.map((task, index) => (
            <div
              key={index}
              className={`p-4 rounded-lg border-2 transition-all ${
                selectedTasks.includes(index)
                  ? 'bg-white border-purple-300'
                  : 'bg-gray-50 border-gray-200'
              }`}
            >
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={selectedTasks.includes(index)}
                  onCheckedChange={() => toggleTaskSelection(index)}
                  className="mt-1"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-semibold text-gray-900">{task.title}</h4>
                    <Badge className={getPriorityColor(task.priority)}>
                      {task.priority}
                    </Badge>
                    <Badge variant="outline" className="text-xs">
                      {task.type}
                    </Badge>
                    {task.due_timeframe && (
                      <Badge variant="outline" className="text-xs">
                        Due: {task.due_timeframe.replace('_', ' ')}
                      </Badge>
                    )}
                  </div>
                  <p className="text-sm text-gray-700 mb-2">{task.description}</p>
                  
                  {task.specific_actions && task.specific_actions.length > 0 && (
                    <div className="bg-purple-50 p-2 rounded border border-purple-200 mt-2">
                      <p className="text-xs font-medium text-purple-900 mb-1">Specific Actions:</p>
                      <ul className="text-xs text-purple-800 space-y-1">
                        {task.specific_actions.map((action, idx) => (
                          <li key={idx} className="flex items-start gap-1">
                            <span className="text-purple-600">•</span>
                            <span>{action}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <p className="text-xs text-gray-500 mt-2 italic">
                    {task.ai_reason}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Message */}
        {message && (
          <Alert className={message.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
            {message.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            )}
            <AlertDescription className={message.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {message.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Create Button */}
        <div className="flex gap-2">
          <Button
            onClick={handleCreateTasks}
            disabled={isCreating || selectedTasks.length === 0}
            className="flex-1 bg-purple-600 hover:bg-purple-700"
          >
            {isCreating ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Creating Tasks...
              </>
            ) : (
              <>
                <ClipboardList className="w-4 h-4 mr-2" />
                Create {selectedTasks.length} Selected Task{selectedTasks.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
          <Button
            variant="outline"
            onClick={() => setSelectedTasks(generatedTasks.map((_, idx) => idx))}
            disabled={isCreating}
          >
            Select All
          </Button>
          <Button
            variant="outline"
            onClick={() => setSelectedTasks([])}
            disabled={isCreating}
          >
            Deselect All
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
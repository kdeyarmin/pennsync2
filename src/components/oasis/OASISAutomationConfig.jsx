import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Settings,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Zap,
  Save
} from "lucide-react";

export default function OASISAutomationConfig() {
  const [automationRules, setAutomationRules] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);

  const queryClient = useQueryClient();

  // Fetch agency settings for automation rules
  const { data: agencySettings } = useQuery({
    queryKey: ['agencySettings'],
    queryFn: async () => {
      const settings = await base44.entities.AgencySettings.list();
      return settings[0] || null;
    }
  });

  useEffect(() => {
    if (agencySettings?.oasis_automation_rules) {
      setAutomationRules(agencySettings.oasis_automation_rules);
    } else {
      // Default rules
      setAutomationRules([
        {
          id: 'compliance-low',
          name: 'Low Compliance Score',
          enabled: true,
          trigger_type: 'compliance_score',
          condition: 'less_than',
          threshold: 70,
          action_type: 'create_task',
          task_config: {
            title: 'Review OASIS Compliance Issues',
            type: 'document',
            priority: 'high',
            description: 'Compliance score below threshold. Review and address flagged items.'
          }
        },
        {
          id: 'revenue-opportunity',
          name: 'Revenue Optimization Available',
          enabled: true,
          trigger_type: 'revenue_opportunities',
          condition: 'has_items',
          threshold: 1,
          action_type: 'create_task',
          task_config: {
            title: 'Review OASIS Revenue Opportunities',
            type: 'coordinate',
            priority: 'medium',
            description: 'Revenue optimization opportunities identified. Review recommendations.'
          }
        },
        {
          id: 'functional-decline',
          name: 'Functional Score Decline',
          enabled: true,
          trigger_type: 'functional_decline',
          condition: 'detected',
          threshold: 0,
          action_type: 'create_task',
          task_config: {
            title: 'Therapy Re-evaluation Needed',
            type: 'schedule',
            priority: 'high',
            description: 'Functional decline detected. Schedule therapy assessment.'
          }
        },
        {
          id: 'missing-narrative',
          name: 'Missing Required Narratives',
          enabled: true,
          trigger_type: 'missing_narratives',
          condition: 'has_items',
          threshold: 1,
          action_type: 'create_task',
          task_config: {
            title: 'Complete Missing OASIS Narratives',
            type: 'document',
            priority: 'high',
            description: 'Required narrative documentation is missing. Complete before submission.'
          }
        }
      ]);
    }
  }, [agencySettings]);

  const handleSave = async () => {
    setIsSaving(true);
    setSaveMessage(null);

    try {
      if (agencySettings?.id) {
        await base44.entities.AgencySettings.update(agencySettings.id, {
          oasis_automation_rules: automationRules
        });
      } else {
        await base44.entities.AgencySettings.create({
          oasis_automation_rules: automationRules
        });
      }

      queryClient.invalidateQueries(['agencySettings']);
      setSaveMessage({ type: 'success', text: 'Automation rules saved successfully!' });
    } catch (error) {
      console.error('Failed to save automation rules:', error);
      setSaveMessage({ type: 'error', text: 'Failed to save rules. Please try again.' });
    }

    setIsSaving(false);
  };

  const addNewRule = () => {
    const newRule = {
      id: `custom-${Date.now()}`,
      name: 'New Automation Rule',
      enabled: false,
      trigger_type: 'compliance_score',
      condition: 'less_than',
      threshold: 70,
      action_type: 'create_task',
      task_config: {
        title: 'Follow-up Required',
        type: 'followup',
        priority: 'medium',
        description: 'Review OASIS findings.'
      }
    };
    setAutomationRules([...automationRules, newRule]);
  };

  const updateRule = (index, updates) => {
    const updated = [...automationRules];
    updated[index] = { ...updated[index], ...updates };
    setAutomationRules(updated);
  };

  const deleteRule = (index) => {
    setAutomationRules(automationRules.filter((_, i) => i !== index));
  };

  const triggerTypes = [
    { value: 'compliance_score', label: 'Compliance Score' },
    { value: 'accuracy_score', label: 'Accuracy Score' },
    { value: 'revenue_opportunities', label: 'Revenue Opportunities' },
    { value: 'missing_narratives', label: 'Missing Narratives' },
    { value: 'functional_decline', label: 'Functional Decline' },
    { value: 'critical_issues', label: 'Critical Issues' },
    { value: 'pdgm_discrepancies', label: 'PDGM Discrepancies' }
  ];

  const conditionTypes = [
    { value: 'less_than', label: 'Less Than' },
    { value: 'greater_than', label: 'Greater Than' },
    { value: 'equals', label: 'Equals' },
    { value: 'has_items', label: 'Has Items' },
    { value: 'detected', label: 'Detected' }
  ];

  const taskTypes = [
    { value: 'call', label: 'Call' },
    { value: 'notify', label: 'Notify' },
    { value: 'schedule', label: 'Schedule' },
    { value: 'order', label: 'Order' },
    { value: 'coordinate', label: 'Coordinate' },
    { value: 'document', label: 'Document' },
    { value: 'safety', label: 'Safety' },
    { value: 'followup', label: 'Follow-up' }
  ];

  const priorityLevels = [
    { value: 'high', label: 'High Priority' },
    { value: 'medium', label: 'Medium Priority' },
    { value: 'low', label: 'Low Priority' }
  ];

  return (
    <Card className="border-2 border-purple-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="w-5 h-5 text-purple-600" />
          OASIS Automation Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="bg-blue-50 border-blue-200">
          <Zap className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-sm">
            Configure automated actions that trigger based on OASIS analysis results. Tasks will be automatically created when conditions are met.
          </AlertDescription>
        </Alert>

        {/* Rules List */}
        <Accordion type="single" collapsible className="space-y-2">
          {automationRules.map((rule, index) => (
            <AccordionItem key={rule.id} value={rule.id} className="border rounded-lg">
              <AccordionTrigger className="px-4 hover:no-underline">
                <div className="flex items-center justify-between w-full pr-4">
                  <div className="flex items-center gap-3">
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(checked) => updateRule(index, { enabled: checked })}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <span className={`font-medium ${rule.enabled ? 'text-gray-900' : 'text-gray-400'}`}>
                      {rule.name}
                    </span>
                  </div>
                  <Badge className={rule.enabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'}>
                    {rule.enabled ? 'Active' : 'Disabled'}
                  </Badge>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4">
                <div className="space-y-4 pt-2">
                  {/* Rule Name */}
                  <div>
                    <Label>Rule Name</Label>
                    <Input
                      value={rule.name}
                      onChange={(e) => updateRule(index, { name: e.target.value })}
                      placeholder="Enter rule name"
                    />
                  </div>

                  {/* Trigger Configuration */}
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <Label>Trigger Type</Label>
                      <Select
                        value={rule.trigger_type}
                        onValueChange={(value) => updateRule(index, { trigger_type: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {triggerTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Condition</Label>
                      <Select
                        value={rule.condition}
                        onValueChange={(value) => updateRule(index, { condition: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {conditionTypes.map(cond => (
                            <SelectItem key={cond.value} value={cond.value}>
                              {cond.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label>Threshold</Label>
                      <Input
                        type="number"
                        value={rule.threshold}
                        onChange={(e) => updateRule(index, { threshold: parseInt(e.target.value) })}
                      />
                    </div>
                  </div>

                  {/* Task Configuration */}
                  <div className="bg-gray-50 p-3 rounded-lg space-y-3">
                    <p className="text-sm font-medium text-gray-700">Task Configuration</p>
                    <div>
                      <Label>Task Title</Label>
                      <Input
                        value={rule.task_config.title}
                        onChange={(e) => updateRule(index, {
                          task_config: { ...rule.task_config, title: e.target.value }
                        })}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label>Task Type</Label>
                        <Select
                          value={rule.task_config.type}
                          onValueChange={(value) => updateRule(index, {
                            task_config: { ...rule.task_config, type: value }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {taskTypes.map(type => (
                              <SelectItem key={type.value} value={type.value}>
                                {type.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label>Priority</Label>
                        <Select
                          value={rule.task_config.priority}
                          onValueChange={(value) => updateRule(index, {
                            task_config: { ...rule.task_config, priority: value }
                          })}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {priorityLevels.map(level => (
                              <SelectItem key={level.value} value={level.value}>
                                {level.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label>Task Description</Label>
                      <Input
                        value={rule.task_config.description}
                        onChange={(e) => updateRule(index, {
                          task_config: { ...rule.task_config, description: e.target.value }
                        })}
                      />
                    </div>
                  </div>

                  {/* Delete Button */}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => deleteRule(index)}
                    className="text-red-600 border-red-300 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete Rule
                  </Button>
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/* Add New Rule */}
        <Button
          variant="outline"
          onClick={addNewRule}
          className="w-full border-dashed border-2"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add New Automation Rule
        </Button>

        {/* Save Message */}
        {saveMessage && (
          <Alert className={saveMessage.type === 'success' ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}>
            {saveMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600" />
            )}
            <AlertDescription className={saveMessage.type === 'success' ? 'text-green-800' : 'text-red-800'}>
              {saveMessage.text}
            </AlertDescription>
          </Alert>
        )}

        {/* Save Button */}
        <Button
          onClick={handleSave}
          disabled={isSaving}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          {isSaving ? (
            <>
              <Settings className="w-4 h-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="w-4 h-4 mr-2" />
              Save Automation Rules
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
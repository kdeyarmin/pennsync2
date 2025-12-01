import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  ListTodo, 
  Loader2, 
  Calendar,
  Phone,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Clock,
  Edit2,
  X,
  Users,
  User,
  ClipboardCheck,
  Zap
} from "lucide-react";
import { format, addDays } from "date-fns";

export default function TaskGenerator({ 
  narrativeText,
  patientId,
  patientName,
  diagnosis,
  missingCriticalElements = [],
  auditResults = null,
  incidentData = null,
  onTasksGenerated
}) {
  const [tasks, setTasks] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState({});
  const [editingTask, setEditingTask] = useState(null);
  const [isCreating, setIsCreating] = useState(false);
  const [createdTasks, setCreatedTasks] = useState([]);
  const [taskDestination, setTaskDestination] = useState("patient"); // "patient" or "agency"

  // Calculate due date from timeframe
  const calculateDueDate = (timeframe) => {
    const today = new Date();
    switch (timeframe) {
      case 'today':
        return format(today, 'yyyy-MM-dd');
      case '24_hours':
        return format(addDays(today, 1), 'yyyy-MM-dd');
      case '48_hours':
        return format(addDays(today, 2), 'yyyy-MM-dd');
      case 'this_week':
        return format(addDays(today, 7), 'yyyy-MM-dd');
      case 'next_visit':
        return format(addDays(today, 3), 'yyyy-MM-dd'); // Default to 3 days
      default:
        return format(addDays(today, 1), 'yyyy-MM-dd');
    }
  };

  const generateTasks = async () => {
    if (!narrativeText || narrativeText.length < 50) {
      alert("Please enter documentation to analyze for tasks.");
      return;
    }

    setIsGenerating(true);
    setCreatedTasks([]);
    try {
      // Build context from missing elements and audit results
      let additionalContext = '';
      
      if (missingCriticalElements && missingCriticalElements.length > 0) {
        additionalContext += `\nMISSING CRITICAL ELEMENTS (from note enhancement):\n${missingCriticalElements.map(e => `- ${e}`).join('\n')}\n`;
      }
      
      if (auditResults) {
        if (auditResults.quality_score < 80) {
          additionalContext += `\nDOCUMENTATION QUALITY SCORE: ${auditResults.quality_score}/100 (needs improvement)\n`;
        }
        if (auditResults.suggestions?.length > 0) {
          const highPrioritySuggestions = auditResults.suggestions.filter(s => s.priority === 'high');
          if (highPrioritySuggestions.length > 0) {
            additionalContext += `\nHIGH PRIORITY SUGGESTIONS:\n${highPrioritySuggestions.map(s => `- ${s.suggestion}`).join('\n')}\n`;
          }
        }
      }

      // Add incident data context for automatic task generation
      if (incidentData) {
        additionalContext += `\nINCIDENT REPORTED:\n`;
        additionalContext += `- Type: ${incidentData.incident_type}\n`;
        additionalContext += `- Severity: ${incidentData.severity || 'Not specified'}\n`;
        additionalContext += `- Details: ${JSON.stringify(incidentData.details || {})}\n`;
        additionalContext += `- Report: ${incidentData.report || 'No report'}\n`;
        additionalContext += `\nCRITICAL: Generate specific follow-up tasks based on this incident type:\n`;
        additionalContext += `- Fall incident → Fall Risk Assessment, Care Plan Update for Fall Prevention, PT/OT referral consideration\n`;
        additionalContext += `- Hospitalization → Transition of Care assessment, Medication Reconciliation, Physician notification\n`;
        additionalContext += `- Medication error → Medication review, Pharmacy consultation, Patient/caregiver re-education\n`;
        additionalContext += `- Behavioral change → Mental status assessment, Physician notification, Safety evaluation\n`;
        additionalContext += `- Infection suspected → Wound culture if applicable, Physician notification, Infection control measures\n`;
        additionalContext += `- Pressure injury → Wound care protocol, Nutrition assessment, Repositioning schedule\n`;
      }

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a clinical workflow AI for home health/hospice. Analyze this nursing documentation and generate context-aware follow-up tasks.

PATIENT: ${patientName || 'Unknown'}
DIAGNOSIS: ${diagnosis || 'Not specified'}
${additionalContext}

NURSING DOCUMENTATION:
${narrativeText}

Generate follow-up tasks considering:
      1. Clinical interventions mentioned that need follow-up
      2. Physician notifications needed (vital sign changes, symptom changes, medication issues)
      3. Follow-up calls to patient/caregiver for teaching reinforcement
      4. Appointment scheduling needs
      5. Supply/equipment orders
      6. Care coordination with other disciplines
      7. Documentation completion tasks (especially for missing critical elements)
      8. Safety follow-ups (fall risk, medication safety, etc.)
      9. Tasks to address any missing critical documentation elements
      10. INCIDENT-SPECIFIC TASKS: If an incident is reported, create mandatory follow-up tasks:
          - Fall: "Complete Fall Risk Assessment", "Update Care Plan - Fall Prevention", "Consider PT/OT Referral"
          - Hospitalization: "Complete Transition of Care Assessment", "Medication Reconciliation Required", "Notify Physician of Discharge"
          - Medication Error: "Complete Medication Review", "Re-educate Patient on Medications", "Notify Pharmacy"
          - Behavioral Change: "Complete Mental Status Assessment", "Notify Physician", "Safety Evaluation"
          - Infection: "Obtain Wound Culture if applicable", "Implement Infection Control Measures", "Notify Physician"
          - Pressure Injury: "Initiate Wound Care Protocol", "Complete Nutrition Assessment", "Establish Repositioning Schedule"
      11. NEW SKILLED NEEDS: If notes mention new symptoms, conditions, or skilled interventions needed, create tasks for:
          - "Skilled Nursing Follow-up for [condition]"
          - "Obtain Physician Orders for [intervention]"
          - "Update Care Plan with New Problem"

Be specific and actionable. Each task should be clear enough to be completed by any nurse.

Return JSON:
{
  "tasks": [
    {
      "type": "call" | "notify" | "schedule" | "order" | "coordinate" | "document" | "safety" | "followup" | "assessment" | "care_plan_update" | "referral",
      "title": "Concise task title",
      "description": "Detailed task description with specific actions",
      "priority": "high" | "medium" | "low",
      "due_timeframe": "today" | "24_hours" | "48_hours" | "this_week" | "next_visit",
      "auto_generated_reason": "Clinical rationale for this task"
    }
  ],
  "urgent_alerts": [
    {
      "alert": "Urgent item requiring immediate attention",
      "action": "Recommended immediate action"
    }
  ]
}`,
        response_json_schema: {
          type: "object",
          properties: {
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  priority: { type: "string" },
                  due_timeframe: { type: "string" },
                  auto_generated_reason: { type: "string" }
                }
              }
            },
            urgent_alerts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  alert: { type: "string" },
                  action: { type: "string" }
                }
              }
            },
            incident_tasks: {
              type: "array",
              items: { type: "object" }
            },
            skilled_need_tasks: {
              type: "array",
              items: { type: "object" }
            }
          }
        }
        });

        // Combine all tasks, prioritizing incident and skilled need tasks
        const allTasks = [
        ...(result.incident_tasks || []).map(t => ({ ...t, source: 'incident' })),
        ...(result.skilled_need_tasks || []).map(t => ({ ...t, source: 'skilled_need' })),
        ...(result.tasks || [])
        ];

      setTasks(allTasks);

      // Auto-select high priority tasks and all incident/skilled need tasks
      const autoSelected = {};
      allTasks.forEach((task, idx) => {
        if (task.priority === 'high' || task.source === 'incident' || task.source === 'skilled_need') {
          autoSelected[idx] = true;
        }
      });
      setSelectedTasks(autoSelected);

      // Show urgent alerts if any
      if (result.urgent_alerts?.length > 0) {
        alert(`⚠️ URGENT ALERTS:\n\n${result.urgent_alerts.map(a => `${a.alert}\nAction: ${a.action}`).join('\n\n')}`);
      }
    } catch (error) {
      console.error("Error generating tasks:", error);
      alert("Error generating tasks. Please try again.");
    }
    setIsGenerating(false);
  };

  const getTypeIcon = (type) => {
    const icons = {
      call: <Phone className="w-3 h-3" />,
      notify: <AlertTriangle className="w-3 h-3" />,
      schedule: <Calendar className="w-3 h-3" />,
      order: <ListTodo className="w-3 h-3" />,
      coordinate: <FileText className="w-3 h-3" />,
      document: <FileText className="w-3 h-3" />,
      safety: <AlertTriangle className="w-3 h-3" />,
      assessment: <ClipboardCheck className="w-3 h-3" />,
      care_plan_update: <FileText className="w-3 h-3" />,
      referral: <Users className="w-3 h-3" />,
      followup: <Clock className="w-3 h-3" />
    };
    return icons[type] || <ListTodo className="w-3 h-3" />;
  };

  const getSourceBadge = (source) => {
    if (source === 'incident') {
      return <Badge className="bg-red-100 text-red-800 text-xs ml-1">Incident</Badge>;
    }
    if (source === 'skilled_need') {
      return <Badge className="bg-purple-100 text-purple-800 text-xs ml-1">Skilled Need</Badge>;
    }
    return null;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      high: "bg-red-100 text-red-800 border-red-300",
      medium: "bg-yellow-100 text-yellow-800 border-yellow-300",
      low: "bg-blue-100 text-blue-800 border-blue-300"
    };
    return colors[priority] || "bg-gray-100 text-gray-800";
  };

  const getTimeframeLabel = (timeframe) => {
    const labels = {
      today: "Today",
      "24_hours": "Within 24h",
      "48_hours": "Within 48h",
      this_week: "This week",
      next_visit: "Next visit"
    };
    return labels[timeframe] || timeframe;
  };

  const handleToggleTask = (idx) => {
    setSelectedTasks(prev => ({
      ...prev,
      [idx]: !prev[idx]
    }));
  };

  const handleEditTask = (idx) => {
    setEditingTask({ idx, ...tasks[idx] });
  };

  const handleSaveEdit = () => {
    if (editingTask) {
      const updatedTasks = [...tasks];
      updatedTasks[editingTask.idx] = {
        type: editingTask.type,
        title: editingTask.title,
        description: editingTask.description,
        priority: editingTask.priority,
        due_timeframe: editingTask.due_timeframe,
        auto_generated_reason: editingTask.auto_generated_reason
      };
      setTasks(updatedTasks);
      setEditingTask(null);
    }
  };

  const handleCreateSelected = async () => {
    const selected = tasks.filter((_, idx) => selectedTasks[idx]);
    if (selected.length === 0) return;

    setIsCreating(true);
    try {
      const createdList = [];
      for (const task of selected) {
        const taskData = {
          patient_id: taskDestination === 'patient' ? patientId : null,
          title: task.title,
          description: task.description,
          type: task.type,
          priority: task.priority,
          status: 'pending',
          due_date: calculateDueDate(task.due_timeframe),
          due_timeframe: task.due_timeframe,
          source: 'ai_generated',
          ai_reason: task.auto_generated_reason
        };
        
        const created = await base44.entities.Task.create(taskData);
        createdList.push(created);
      }

      setCreatedTasks(createdList);
      setSelectedTasks({});

      if (onTasksGenerated) {
        onTasksGenerated(createdList);
      }
    } catch (error) {
      console.error("Error creating tasks:", error);
      alert("Error creating tasks. Please try again.");
    }
    setIsCreating(false);
  };

  const selectAllTasks = () => {
    const allSelected = {};
    tasks.forEach((_, idx) => {
      allSelected[idx] = true;
    });
    setSelectedTasks(allSelected);
  };

  const selectedCount = Object.values(selectedTasks).filter(Boolean).length;

  return (
    <Card className="border-orange-200">
      <CardHeader className="py-3 bg-gradient-to-r from-orange-50 to-amber-50">
        <CardTitle className="text-sm flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-orange-600" />
          Smart Task Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="p-3">
        {tasks.length === 0 ? (
          <Button
            onClick={generateTasks}
            disabled={isGenerating || !narrativeText}
            className="w-full bg-orange-600 hover:bg-orange-700"
            size="sm"
          >
            {isGenerating ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
            ) : (
              <><ListTodo className="w-4 h-4 mr-2" /> Generate Follow-up Tasks</>
            )}
          </Button>
        ) : (
          <div className="space-y-2">
            {/* Task Destination Selection */}
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded border">
              <span className="text-xs font-medium text-gray-600">Add to:</span>
              <Button
                size="sm"
                variant={taskDestination === 'patient' ? 'default' : 'outline'}
                className={`h-6 text-xs ${taskDestination === 'patient' ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
                onClick={() => setTaskDestination('patient')}
                disabled={!patientId}
              >
                <User className="w-3 h-3 mr-1" />
                Patient Tasks
              </Button>
              <Button
                size="sm"
                variant={taskDestination === 'agency' ? 'default' : 'outline'}
                className={`h-6 text-xs ${taskDestination === 'agency' ? 'bg-orange-600 hover:bg-orange-700' : ''}`}
                onClick={() => setTaskDestination('agency')}
              >
                <Users className="w-3 h-3 mr-1" />
                Agency Queue
              </Button>
            </div>

            {!patientId && taskDestination === 'patient' && (
              <p className="text-xs text-orange-600">⚠️ Select a patient to add patient-specific tasks</p>
            )}

            {/* Select All */}
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600">{tasks.length} task(s) suggested</span>
              <Button size="sm" variant="ghost" className="h-5 text-xs px-1" onClick={selectAllTasks}>
                Select All
              </Button>
            </div>

            {/* Task List */}
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {tasks.map((task, idx) => (
                <div
                  key={idx}
                  className={`p-2 rounded border transition-colors ${selectedTasks[idx] ? 'bg-orange-50 border-orange-300' : 'bg-white border-gray-200 hover:bg-gray-50'}`}
                >
                  {editingTask?.idx === idx ? (
                    // Edit Mode
                    <div className="space-y-2">
                      <Input
                        value={editingTask.title}
                        onChange={(e) => setEditingTask({...editingTask, title: e.target.value})}
                        className="h-7 text-xs"
                        placeholder="Task title"
                      />
                      <Textarea
                        value={editingTask.description}
                        onChange={(e) => setEditingTask({...editingTask, description: e.target.value})}
                        className="text-xs min-h-[60px]"
                        placeholder="Task description"
                      />
                      <div className="flex gap-2">
                        <Select value={editingTask.priority} onValueChange={(v) => setEditingTask({...editingTask, priority: v})}>
                          <SelectTrigger className="h-7 text-xs flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="high">High</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="low">Low</SelectItem>
                          </SelectContent>
                        </Select>
                        <Select value={editingTask.due_timeframe} onValueChange={(v) => setEditingTask({...editingTask, due_timeframe: v})}>
                          <SelectTrigger className="h-7 text-xs flex-1">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="today">Today</SelectItem>
                            <SelectItem value="24_hours">24 Hours</SelectItem>
                            <SelectItem value="48_hours">48 Hours</SelectItem>
                            <SelectItem value="this_week">This Week</SelectItem>
                            <SelectItem value="next_visit">Next Visit</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="flex gap-1 justify-end">
                        <Button size="sm" variant="outline" className="h-6 text-xs" onClick={() => setEditingTask(null)}>
                          <X className="w-3 h-3" />
                        </Button>
                        <Button size="sm" className="h-6 text-xs bg-green-600 hover:bg-green-700" onClick={handleSaveEdit}>
                          <CheckCircle2 className="w-3 h-3 mr-1" /> Save
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View Mode
                    <div className="flex items-start gap-2">
                      <Checkbox
                        checked={selectedTasks[idx] || false}
                        onCheckedChange={() => handleToggleTask(idx)}
                        className="mt-1"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-1 flex-wrap">
                                {getTypeIcon(task.type)}
                                <span className="text-xs font-semibold">{task.title}</span>
                                {getSourceBadge(task.source)}
                              </div>
                              <Button size="sm" variant="ghost" className="h-5 w-5 p-0" onClick={() => handleEditTask(idx)}>
                                <Edit2 className="w-3 h-3 text-gray-400" />
                              </Button>
                            </div>
                        <p className="text-xs text-gray-600 mb-1">{task.description}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={`${getPriorityColor(task.priority)} text-xs`}>
                            {task.priority}
                          </Badge>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Clock className="w-3 h-3" />
                            {getTimeframeLabel(task.due_timeframe)}
                          </div>
                        </div>
                        {task.auto_generated_reason && (
                          <p className="text-xs text-gray-400 italic mt-1">💡 {task.auto_generated_reason}</p>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Created Tasks Success */}
            {createdTasks.length > 0 && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle2 className="w-4 h-4 text-green-600" />
                <AlertDescription className="text-xs text-green-800">
                  <strong>{createdTasks.length} task(s) created!</strong>
                  {taskDestination === 'patient' ? ' Added to patient task list.' : ' Added to agency queue.'}
                </AlertDescription>
              </Alert>
            )}

            {/* Action Buttons */}
            <div className="flex gap-2 pt-2 border-t">
              <Button
                size="sm"
                className="flex-1 bg-orange-600 hover:bg-orange-700"
                onClick={handleCreateSelected}
                disabled={selectedCount === 0 || isCreating || (taskDestination === 'patient' && !patientId)}
              >
                {isCreating ? (
                  <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Creating...</>
                ) : (
                  <><CheckCircle2 className="w-3 h-3 mr-1" /> Create {selectedCount} Task{selectedCount !== 1 ? 's' : ''}</>
                )}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => {
                  setTasks([]);
                  setCreatedTasks([]);
                }}
              >
                Reset
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  ListTodo, 
  Loader2, 
  Calendar,
  Phone,
  AlertTriangle,
  FileText,
  CheckCircle2,
  Clock
} from "lucide-react";

export default function TaskGenerator({ 
  narrativeText,
  patientName,
  diagnosis,
  onTasksGenerated
}) {
  const [tasks, setTasks] = useState([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState({});

  const generateTasks = async () => {
    if (!narrativeText || narrativeText.length < 50) {
      alert("Please enter documentation to analyze for tasks.");
      return;
    }

    setIsGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a clinical workflow AI. Analyze this nursing documentation and automatically suggest follow-up tasks and reminders.

PATIENT: ${patientName || 'Unknown'}
DIAGNOSIS: ${diagnosis || 'Not specified'}

NURSING DOCUMENTATION:
${narrativeText}

Identify and generate appropriate follow-up tasks based on the clinical context, including:
1. Physician notifications needed
2. Follow-up calls to patient/caregiver
3. Appointment scheduling needs
4. Supply/equipment orders
5. Care coordination tasks
6. Documentation reminders
7. Safety follow-ups

Return JSON:
{
  "tasks": [
    {
      "type": "call" | "notify" | "schedule" | "order" | "coordinate" | "document" | "safety",
      "title": "Task title",
      "description": "Detailed task description",
      "priority": "high" | "medium" | "low",
      "due_timeframe": "today" | "24_hours" | "48_hours" | "this_week" | "next_visit",
      "auto_generated_reason": "Why this task was suggested"
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
            }
          }
        }
      });

      setTasks(result.tasks || []);
      
      // Auto-select high priority tasks
      const autoSelected = {};
      result.tasks?.forEach((task, idx) => {
        if (task.priority === 'high') {
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
      safety: <AlertTriangle className="w-3 h-3" />
    };
    return icons[type] || <ListTodo className="w-3 h-3" />;
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

  const handleCreateSelected = () => {
    const selected = tasks.filter((_, idx) => selectedTasks[idx]);
    if (onTasksGenerated && selected.length > 0) {
      onTasksGenerated(selected);
      alert(`${selected.length} task(s) created!`);
    }
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
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {tasks.map((task, idx) => (
              <div
                key={idx}
                className={`p-2 rounded border ${selectedTasks[idx] ? 'bg-orange-50 border-orange-300' : 'bg-white border-gray-200'}`}
              >
                <div className="flex items-start gap-2">
                  <Checkbox
                    checked={selectedTasks[idx] || false}
                    onCheckedChange={() => handleToggleTask(idx)}
                    className="mt-1"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1 mb-1">
                      {getTypeIcon(task.type)}
                      <span className="text-xs font-semibold">{task.title}</span>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">{task.description}</p>
                    <div className="flex items-center gap-2">
                      <Badge className={`${getPriorityColor(task.priority)} text-xs`}>
                        {task.priority}
                      </Badge>
                      <div className="flex items-center gap-1 text-xs text-gray-500">
                        <Clock className="w-3 h-3" />
                        {getTimeframeLabel(task.due_timeframe)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="flex gap-2 pt-2 border-t">
              <Button
                size="sm"
                className="flex-1 bg-orange-600 hover:bg-orange-700"
                onClick={handleCreateSelected}
                disabled={selectedCount === 0}
              >
                <CheckCircle2 className="w-3 h-3 mr-1" />
                Create {selectedCount} Task{selectedCount !== 1 ? 's' : ''}
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setTasks([])}
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
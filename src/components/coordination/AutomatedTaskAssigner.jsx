import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  UserCog, 
  Brain, 
  Loader2,
  Send
} from "lucide-react";

export default function AutomatedTaskAssigner({ 
  patientId,
  patientName,
  detectedGaps,
  conditionChanges,
  medicationIssues,
  carePlanGaps
}) {
  const queryClient = useQueryClient();
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestedTasks, setSuggestedTasks] = useState([]);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [isCreating, setIsCreating] = useState(false);

  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
  });

  const generateTaskAssignments = async () => {
    setIsGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a care coordination AI. Based on detected gaps and patient changes, generate task assignments for the appropriate care team members.

PATIENT: ${patientName}

DETECTED ISSUES:
${detectedGaps?.length > 0 ? `Care Plan Gaps:\n${detectedGaps.map(g => `- ${g.element}: ${g.rationale}`).join('\n')}` : ''}
${conditionChanges ? `\nCondition Changes:\n${conditionChanges}` : ''}
${medicationIssues?.length > 0 ? `\nMedication Issues:\n${medicationIssues.map(i => `- ${i.concern}`).join('\n')}` : ''}
${carePlanGaps?.missing_elements?.length > 0 ? `\nCare Plan Gaps:\n${carePlanGaps.missing_elements.map(e => e.element).join(', ')}` : ''}

Generate task assignments specifying:
- Task title and detailed description
- Appropriate assignee role (RN, MD, Social Worker, PT, OT, Pharmacist, Case Manager)
- Priority level
- Timeframe for completion
- Specific actions required
- Patient safety considerations

Focus on tasks that require specialized expertise or coordination.`,
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
                  assignee_role: { type: "string" },
                  priority: { type: "string" },
                  timeframe: { type: "string" },
                  task_type: { type: "string" },
                  rationale: { type: "string" }
                }
              }
            },
            coordination_notes: { type: "string" }
          }
        }
      });

      setSuggestedTasks(result.tasks || []);
      setSelectedTasks(result.tasks?.map((_, idx) => idx) || []);
    } catch (error) {
      console.error('Task generation error:', error);
    }
    setIsGenerating(false);
  };

  const handleCreateTasks = async () => {
    setIsCreating(true);
    try {
      const tasksToCreate = selectedTasks.map(idx => suggestedTasks[idx]);

      for (const task of tasksToCreate) {
        // Find appropriate assignee
        const roleMatch = users.find(u => 
          u.role === 'admin' || 
          u.full_name?.toLowerCase().includes((task.assignee_role || '').toLowerCase())
        );

        const timeframeMap = {
          'today': 'today',
          'urgent': 'today',
          '24 hours': '24_hours',
          '48 hours': '48_hours',
          'this week': 'this_week',
          'next visit': 'next_visit'
        };

        const dueTimeframe = Object.keys(timeframeMap).find(key => 
          task.timeframe?.toLowerCase().includes(key)
        );

        await base44.entities.Task.create({
          patient_id: patientId,
          title: task.title,
          description: `${task.description}\n\nRationale: ${task.rationale}`,
          type: task.task_type === 'coordinate' ? 'coordinate' : 
                task.task_type === 'call' ? 'call' : 'other',
          priority: task.priority === 'urgent' || task.priority === 'high' ? 'high' : 
                    task.priority === 'medium' ? 'medium' : 'low',
          due_timeframe: dueTimeframe ? timeframeMap[dueTimeframe] : 'this_week',
          assigned_to: roleMatch?.email,
          source: 'ai_generated',
          ai_reason: task.rationale
        });
      }

      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      queryClient.invalidateQueries({ queryKey: ['patientTasks', patientId] });
      
      setSuggestedTasks([]);
      setSelectedTasks([]);
      alert(`✅ Created ${tasksToCreate.length} care coordination tasks`);
    } catch (error) {
      console.error('Task creation error:', error);
      alert('Failed to create tasks');
    }
    setIsCreating(false);
  };

  const hasIssues = detectedGaps?.length > 0 || 
                    conditionChanges || 
                    medicationIssues?.length > 0 || 
                    carePlanGaps?.missing_elements?.length > 0;

  if (!hasIssues) {
    return null;
  }

  return (
    <Card className="border-2 border-purple-300">
      <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50 pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <UserCog className="w-5 h-5 text-purple-600" />
          AI Task Assignment Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <Alert className="bg-blue-50 border-blue-200">
          <Brain className="w-4 h-4 text-blue-600" />
          <AlertDescription className="text-sm text-blue-900">
            Detected issues requiring care team coordination. Generate task assignments automatically.
          </AlertDescription>
        </Alert>

        {!suggestedTasks.length && !isGenerating && (
          <Button
            onClick={generateTaskAssignments}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            <Brain className="w-4 h-4 mr-2" />
            Generate Task Assignments
          </Button>
        )}

        {isGenerating && (
          <div className="text-center py-6">
            <Loader2 className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-2" />
            <p className="text-sm text-gray-600">Generating task assignments...</p>
          </div>
        )}

        {suggestedTasks.length > 0 && (
          <>
            <div className="space-y-2">
              <p className="text-sm font-semibold">Suggested Tasks ({suggestedTasks.length})</p>
              {suggestedTasks.map((task, idx) => (
                <div 
                  key={idx} 
                  className="flex items-start gap-3 p-3 bg-white border rounded-lg"
                >
                  <Checkbox
                    checked={selectedTasks.includes(idx)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedTasks([...selectedTasks, idx]);
                      } else {
                        setSelectedTasks(selectedTasks.filter(i => i !== idx));
                      }
                    }}
                  />
                  <div className="flex-1">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <p className="text-sm font-medium">{task.title}</p>
                      <Badge className={`flex-shrink-0 ${
                        task.priority === 'urgent' || task.priority === 'high' ? 'bg-red-600' :
                        task.priority === 'medium' ? 'bg-yellow-600' : 'bg-blue-600'
                      }`}>
                        {task.priority}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">{task.description}</p>
                    <div className="flex items-center gap-2 text-xs">
                      <Badge variant="outline">{task.assignee_role}</Badge>
                      <Badge variant="outline">{task.timeframe}</Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-2">
              <Button
                onClick={handleCreateTasks}
                disabled={selectedTasks.length === 0 || isCreating}
                className="flex-1 bg-purple-600 hover:bg-purple-700"
              >
                {isCreating ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Send className="w-4 h-4 mr-2" />
                )}
                Create {selectedTasks.length} Task{selectedTasks.length !== 1 ? 's' : ''}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setSuggestedTasks([]);
                  setSelectedTasks([]);
                }}
              >
                Cancel
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
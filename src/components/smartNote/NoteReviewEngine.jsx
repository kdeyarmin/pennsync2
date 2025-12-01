import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  FileCheck,
  Loader2,
  AlertTriangle,
  CheckCircle2,
  ListTodo,
  GraduationCap,
  ChevronDown,
  ChevronUp,
  ExternalLink,
  Flag,
  BookOpen,
  Stethoscope,
  Send,
  MessageSquare,
  Clock
} from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function NoteReviewEngine({
  noteText,
  patientId,
  patientName,
  diagnosis,
  careType,
  visitType,
  nurseEmail,
  onCreateTask,
  onTrainingRecommended
}) {
  const [reviewResult, setReviewResult] = useState(null);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);

  // Fetch nurse skills for gap analysis
  const { data: nurseSkills = [] } = useQuery({
    queryKey: ['nurseSkills', nurseEmail],
    queryFn: () => base44.entities.NurseSkill.filter({ nurse_email: nurseEmail }).catch(() => []),
    enabled: !!nurseEmail
  });

  // Fetch existing tasks for this patient
  const { data: existingTasks = [] } = useQuery({
    queryKey: ['patientTasks', patientId],
    queryFn: () => base44.entities.Task.filter({ patient_id: patientId, status: 'pending' }).catch(() => []),
    enabled: !!patientId
  });

  const runReview = async () => {
    if (!noteText || noteText.length < 100) {
      alert("Please complete your documentation before running the review.");
      return;
    }

    setIsReviewing(true);
    try {
      const skillsList = nurseSkills.map(s => `${s.skill_name} (${s.proficiency_level})`).join(', ');
      const existingTasksList = existingTasks.map(t => t.title).join(', ');

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert clinical documentation auditor for ${careType === 'hospice' ? 'hospice' : 'home health'}. Perform a comprehensive review of this completed note.

PATIENT: ${patientName || 'Unknown'}
DIAGNOSIS: ${diagnosis || 'Not specified'}
VISIT TYPE: ${visitType?.replace(/_/g, ' ') || 'Routine'}
NURSE'S SKILLS: ${skillsList || 'Not available'}
EXISTING PENDING TASKS: ${existingTasksList || 'None'}

COMPLETED NOTE:
${noteText}

Perform a thorough review checking for:

1. MISSING FOLLOW-UP ACTIONS - Did the nurse document something that requires follow-up but didn't create a task?
   - Abnormal vitals requiring physician notification
   - New symptoms needing further assessment
   - Patient teaching that needs reinforcement
   - Care coordination needs
   - Equipment or supply orders
   - Scheduled follow-up calls

2. DOCUMENTATION COMPLETENESS - For Medicare compliance:
   ${careType === 'hospice' ? `
   - Terminal prognosis indicators
   - Symptom management documentation
   - Comfort measures
   - Patient/family coping
   - Spiritual/psychosocial needs
   ` : `
   - Homebound status justification
   - Skilled nursing necessity
   - Patient response to teaching
   - Functional status
   - Progress toward goals
   `}

3. CLINICAL SAFETY CONCERNS - Any red flags that weren't addressed:
   - Vital sign abnormalities
   - New symptoms of concern
   - Medication issues
   - Safety hazards
   - Signs of decline

4. SKILL GAP INDICATORS - Documentation patterns suggesting training needs:
   - Consistently missing certain elements
   - Vague or non-specific documentation
   - Missing evidence-based language

Return JSON:
{
  "overall_score": 0-100,
  "review_summary": "Brief summary of findings",
  "missing_followups": [
    {
      "issue": "What was documented that needs follow-up",
      "suggested_task": {
        "title": "Task title",
        "description": "Task description",
        "priority": "high" | "medium" | "low",
        "type": "call" | "notify" | "schedule" | "order" | "document"
      },
      "urgency": "immediate" | "today" | "this_week"
    }
  ],
  "documentation_gaps": [
    {
      "element": "Missing element",
      "importance": "critical" | "important" | "recommended",
      "suggestion": "How to fix it"
    }
  ],
  "safety_alerts": [
    {
      "concern": "Safety concern identified",
      "action_needed": "What should be done",
      "priority": "urgent" | "high" | "medium"
    }
  ],
  "skill_gaps": [
    {
      "area": "Documentation skill area",
      "evidence": "What indicates this gap",
      "recommended_training": "Specific training topic"
    }
  ],
  "strengths": ["Well-documented elements"],
  "ready_to_submit": true | false,
  "submission_blockers": ["Critical issues preventing submission"]
}`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: { type: "number" },
            review_summary: { type: "string" },
            missing_followups: { type: "array", items: { type: "object" } },
            documentation_gaps: { type: "array", items: { type: "object" } },
            safety_alerts: { type: "array", items: { type: "object" } },
            skill_gaps: { type: "array", items: { type: "object" } },
            strengths: { type: "array", items: { type: "string" } },
            ready_to_submit: { type: "boolean" },
            submission_blockers: { type: "array", items: { type: "string" } }
          }
        }
      });

      setReviewResult(result);

      // Notify about skill gaps
      if (result.skill_gaps?.length > 0 && onTrainingRecommended) {
        onTrainingRecommended(result.skill_gaps);
      }
    } catch (error) {
      console.error("Error reviewing note:", error);
      alert("Error reviewing note. Please try again.");
    }
    setIsReviewing(false);
  };

  const handleCreateTask = async (followup) => {
    if (!patientId) {
      alert("Please select a patient first.");
      return;
    }

    try {
      await base44.entities.Task.create({
        patient_id: patientId,
        title: followup.suggested_task.title,
        description: followup.suggested_task.description,
        priority: followup.suggested_task.priority,
        type: followup.suggested_task.type,
        status: 'pending',
        source: 'ai_generated',
        ai_reason: `Identified during note review: ${followup.issue}`
      });
      
      // Remove from list after creation
      setReviewResult(prev => ({
        ...prev,
        missing_followups: prev.missing_followups.filter(f => f !== followup)
      }));

      if (onCreateTask) onCreateTask(followup.suggested_task);
    } catch (error) {
      console.error("Error creating task:", error);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getUrgencyBadge = (urgency) => {
    const colors = {
      immediate: 'bg-red-600 text-white',
      urgent: 'bg-red-100 text-red-800',
      today: 'bg-yellow-100 text-yellow-800',
      this_week: 'bg-blue-100 text-blue-800'
    };
    return colors[urgency] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card className="border-2 border-blue-200">
      <CardHeader 
        className="py-3 bg-gradient-to-r from-blue-50 to-indigo-50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileCheck className="w-4 h-4 text-blue-600" />
            AI Note Review
          </div>
          <div className="flex items-center gap-2">
            {reviewResult && (
              <Badge className={reviewResult.ready_to_submit ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                {reviewResult.ready_to_submit ? 'Ready to Submit' : 'Needs Attention'}
              </Badge>
            )}
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-3">
          {!reviewResult ? (
            <div className="text-center py-4">
              <FileCheck className="w-10 h-10 text-blue-300 mx-auto mb-2" />
              <p className="text-sm text-gray-600 mb-3">
                AI will review your completed note for missing follow-ups, compliance gaps, and safety concerns
              </p>
              <Button
                onClick={runReview}
                disabled={isReviewing || !noteText || noteText.length < 100}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isReviewing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Reviewing...</>
                ) : (
                  <><FileCheck className="w-4 h-4 mr-2" /> Run AI Review</>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Score and Summary */}
              <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <p className={`text-3xl font-bold ${getScoreColor(reviewResult.overall_score)}`}>
                    {reviewResult.overall_score}
                  </p>
                  <p className="text-xs text-gray-500">Score</p>
                </div>
                <div className="flex-1">
                  <Progress value={reviewResult.overall_score} className="h-2 mb-2" />
                  <p className="text-sm text-gray-700">{reviewResult.review_summary}</p>
                </div>
              </div>

              {/* Submission Blockers */}
              {!reviewResult.ready_to_submit && reviewResult.submission_blockers?.length > 0 && (
                <Alert className="bg-red-50 border-red-200">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <AlertDescription className="text-sm text-red-800">
                    <p className="font-semibold mb-1">Cannot Submit - Issues Found:</p>
                    <ul className="list-disc list-inside">
                      {reviewResult.submission_blockers.map((blocker, idx) => (
                        <li key={idx}>{blocker}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {/* Safety Alerts */}
              {reviewResult.safety_alerts?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-red-800 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Safety Alerts
                  </p>
                  {reviewResult.safety_alerts.map((alert, idx) => (
                    <Alert key={idx} className="py-2 bg-red-50 border-red-200">
                      <AlertDescription className="text-xs">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={getUrgencyBadge(alert.priority)}>{alert.priority}</Badge>
                          <span className="font-medium">{alert.concern}</span>
                        </div>
                        <p className="text-red-700">Action: {alert.action_needed}</p>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              )}

              {/* Missing Follow-ups */}
              {reviewResult.missing_followups?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-orange-800 flex items-center gap-1">
                    <ListTodo className="w-3 h-3" /> Missing Follow-up Actions
                  </p>
                  {reviewResult.missing_followups.map((followup, idx) => (
                    <div key={idx} className="p-2 bg-orange-50 border border-orange-200 rounded">
                      <div className="flex items-center justify-between mb-1">
                        <Badge className={getUrgencyBadge(followup.urgency)}>{followup.urgency}</Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-6 text-xs"
                          onClick={() => handleCreateTask(followup)}
                        >
                          Create Task
                        </Button>
                      </div>
                      <p className="text-xs text-gray-700 mb-1">{followup.issue}</p>
                      <p className="text-xs text-orange-700">
                        → {followup.suggested_task.title}
                      </p>
                    </div>
                  ))}
                </div>
              )}

              {/* Documentation Gaps */}
              {reviewResult.documentation_gaps?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-yellow-800">Documentation Gaps</p>
                  {reviewResult.documentation_gaps.map((gap, idx) => (
                    <div key={idx} className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className={gap.importance === 'critical' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                          {gap.importance}
                        </Badge>
                        <span className="font-medium">{gap.element}</span>
                      </div>
                      <p className="text-gray-600">{gap.suggestion}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Skill Gaps - Link to Training */}
              {reviewResult.skill_gaps?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-purple-800 flex items-center gap-1">
                    <GraduationCap className="w-3 h-3" /> Training Recommendations
                  </p>
                  {reviewResult.skill_gaps.map((gap, idx) => (
                    <div key={idx} className="p-2 bg-purple-50 border border-purple-200 rounded text-xs">
                      <p className="font-medium text-purple-900">{gap.area}</p>
                      <p className="text-gray-600 mb-1">{gap.evidence}</p>
                      <Link to={`${createPageUrl("NurseTraining")}?topic=${encodeURIComponent(gap.recommended_training)}`}>
                        <Button size="sm" variant="link" className="h-5 p-0 text-xs text-purple-600">
                          <GraduationCap className="w-3 h-3 mr-1" />
                          {gap.recommended_training}
                          <ExternalLink className="w-3 h-3 ml-1" />
                        </Button>
                      </Link>
                    </div>
                  ))}
                </div>
              )}

              {/* Strengths */}
              {reviewResult.strengths?.length > 0 && (
                <div className="p-2 bg-green-50 border border-green-200 rounded">
                  <p className="text-xs font-semibold text-green-800 mb-1 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Strengths
                  </p>
                  <p className="text-xs text-green-700">{reviewResult.strengths.join(', ')}</p>
                </div>
              )}

              <Button variant="outline" size="sm" className="w-full" onClick={() => setReviewResult(null)}>
                Run New Review
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
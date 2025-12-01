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
  const [flaggedItems, setFlaggedItems] = useState({});
  const [flagDialogOpen, setFlagDialogOpen] = useState(false);
  const [currentFlagItem, setCurrentFlagItem] = useState(null);
  const [flagNote, setFlagNote] = useState("");
  const [activeTab, setActiveTab] = useState("overview");
  const queryClient = useQueryClient();

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

  // Clinical protocol definitions based on diagnosis
  const getClinicalProtocols = (diagnosisText) => {
    const protocols = [];
    const diagLower = (diagnosisText || '').toLowerCase();
    
    if (diagLower.includes('sepsis') || diagLower.includes('infection')) {
      protocols.push({
        name: 'Sepsis Screening Protocol',
        elements: [
          'Temperature documented (fever >38°C or hypothermia <36°C)',
          'Heart rate documented (tachycardia >90 bpm)',
          'Respiratory rate documented (tachypnea >20/min)',
          'Mental status assessment (confusion, altered LOC)',
          'Blood pressure documented (hypotension SBP <90)',
          'Signs of infection source identified',
          'Physician notification if 2+ SIRS criteria met'
        ]
      });
    }
    
    if (diagLower.includes('chf') || diagLower.includes('heart failure') || diagLower.includes('cardiac')) {
      protocols.push({
        name: 'Heart Failure Management Protocol',
        elements: [
          'Daily weight documented and compared to baseline',
          'Edema assessment (location, severity, pitting)',
          'Dyspnea assessment (at rest, exertion, orthopnea)',
          'Lung sounds (crackles, wheezes)',
          'Medication compliance (diuretics, ACE inhibitors)',
          'Sodium/fluid restriction education',
          'Activity tolerance documented'
        ]
      });
    }
    
    if (diagLower.includes('diabetes') || diagLower.includes('dm')) {
      protocols.push({
        name: 'Diabetes Management Protocol',
        elements: [
          'Blood glucose level documented',
          'Hypoglycemia/hyperglycemia signs assessed',
          'Foot inspection performed',
          'Medication/insulin compliance verified',
          'Diet compliance assessed',
          'Signs of neuropathy evaluated',
          'A1C discussion if applicable'
        ]
      });
    }
    
    if (diagLower.includes('copd') || diagLower.includes('pulmonary')) {
      protocols.push({
        name: 'COPD Management Protocol',
        elements: [
          'Oxygen saturation documented',
          'Respiratory rate and effort assessed',
          'Lung sounds bilateral assessment',
          'Inhaler technique reviewed',
          'Signs of exacerbation (increased dyspnea, sputum)',
          'Smoking cessation addressed if applicable',
          'Activity tolerance documented'
        ]
      });
    }
    
    if (diagLower.includes('wound') || diagLower.includes('ulcer') || diagLower.includes('surgical')) {
      protocols.push({
        name: 'Wound Care Protocol',
        elements: [
          'Wound measurements (L x W x D)',
          'Wound bed description (granulation, slough, necrotic)',
          'Exudate amount and characteristics',
          'Periwound skin assessment',
          'Signs of infection (erythema, warmth, odor)',
          'Dressing change performed with technique',
          'Pain assessment during procedure'
        ]
      });
    }
    
    if (diagLower.includes('fall') || diagLower.includes('fracture')) {
      protocols.push({
        name: 'Fall Risk Protocol',
        elements: [
          'Fall risk assessment completed',
          'Environmental hazards assessed',
          'Gait and balance evaluation',
          'Medication review for fall risk meds',
          'Assistive device use evaluated',
          'Home safety modifications discussed',
          'Patient/caregiver education on fall prevention'
        ]
      });
    }
    
    if (diagLower.includes('stroke') || diagLower.includes('cva')) {
      protocols.push({
        name: 'Stroke/CVA Protocol',
        elements: [
          'Neurological assessment (speech, facial droop, arm drift)',
          'Vital signs including BP',
          'Swallowing assessment/precautions',
          'Mobility and transfer status',
          'Safety awareness evaluation',
          'Medication compliance (anticoagulants if applicable)',
          'Signs of depression screened'
        ]
      });
    }

    // Default general protocol if no specific match
    if (protocols.length === 0) {
      protocols.push({
        name: 'General Clinical Assessment Protocol',
        elements: [
          'Complete vital signs assessment',
          'Pain assessment using scale',
          'Medication review and compliance',
          'Functional status evaluation',
          'Safety assessment',
          'Patient/caregiver education provided',
          'Care plan goals addressed'
        ]
      });
    }
    
    return protocols;
  };

  const runReview = async () => {
    if (!noteText || noteText.length < 100) {
      alert("Please complete your documentation before running the review.");
      return;
    }

    setIsReviewing(true);
    setFlaggedItems({});
    try {
      const skillsList = nurseSkills.map(s => `${s.skill_name} (${s.proficiency_level})`).join(', ');
      const existingTasksList = existingTasks.map(t => t.title).join(', ');
      
      // Get applicable clinical protocols
      const applicableProtocols = getClinicalProtocols(diagnosis);
      const protocolPrompt = applicableProtocols.map(p => 
        `\n${p.name}:\n${p.elements.map(e => `  - ${e}`).join('\n')}`
      ).join('\n');

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert clinical documentation auditor for ${careType === 'hospice' ? 'hospice' : 'home health'}. Perform a comprehensive review of this completed note.

PATIENT: ${patientName || 'Unknown'}
DIAGNOSIS: ${diagnosis || 'Not specified'}
VISIT TYPE: ${visitType?.replace(/_/g, ' ') || 'Routine'}
NURSE'S SKILLS: ${skillsList || 'Not available'}
EXISTING PENDING TASKS: ${existingTasksList || 'None'}

COMPLETED NOTE:
${noteText}

===== CLINICAL PROTOCOL CROSS-REFERENCE =====
Based on the patient's diagnosis, check documentation against these specific clinical protocols:
${protocolPrompt}

For EACH protocol element, determine if it was addressed in the note.

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

5. PROTOCOL COMPLIANCE - Check each applicable clinical protocol element

Return JSON:
{
  "overall_score": 0-100,
  "review_summary": "Brief summary of findings",
  "protocol_compliance": [
    {
      "protocol_name": "Protocol name",
      "elements_checked": [
        {
          "element": "Protocol element",
          "status": "met" | "partial" | "not_addressed" | "not_applicable",
          "found_text": "Quote from note if found, null if not",
          "recommendation": "What to add if not met"
        }
      ],
      "compliance_score": 0-100
    }
  ],
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
      "suggestion": "How to fix it",
      "guideline_reference": "Clinical guideline this relates to"
    }
  ],
  "safety_alerts": [
    {
      "concern": "Safety concern identified",
      "action_needed": "What should be done",
      "priority": "urgent" | "high" | "medium",
      "clinical_rationale": "Why this is a concern"
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
            protocol_compliance: { type: "array", items: { type: "object" } },
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

      // Save skill gaps to localStorage for Learning Hub
      if (result.skill_gaps?.length > 0) {
        const existingGaps = JSON.parse(localStorage.getItem(`skill_gaps_${nurseEmail}`) || '[]');
        const newGaps = result.skill_gaps.filter(
          gap => !existingGaps.some(eg => eg.area === gap.area)
        );
        const allGaps = [...existingGaps, ...newGaps];
        localStorage.setItem(`skill_gaps_${nurseEmail}`, JSON.stringify(allGaps));
        
        if (onTrainingRecommended) {
          onTrainingRecommended(result.skill_gaps);
        }
      }
    } catch (error) {
      console.error("Error reviewing note:", error);
      alert("Error reviewing note. Please try again.");
    }
    setIsReviewing(false);
  };

  // Flagging functions
  const openFlagDialog = (itemType, itemId, itemContent) => {
    setCurrentFlagItem({ type: itemType, id: itemId, content: itemContent });
    setFlagNote("");
    setFlagDialogOpen(true);
  };

  const submitFlag = async () => {
    if (!currentFlagItem) return;
    
    const flagKey = `${currentFlagItem.type}_${currentFlagItem.id}`;
    const flagData = {
      type: currentFlagItem.type,
      content: currentFlagItem.content,
      note: flagNote,
      flaggedBy: nurseEmail,
      flaggedAt: new Date().toISOString(),
      status: 'pending_review'
    };
    
    setFlaggedItems(prev => ({
      ...prev,
      [flagKey]: flagData
    }));
    
    // Create a task for supervisor review
    try {
      await base44.entities.Task.create({
        patient_id: patientId,
        title: `Review Flagged Finding: ${currentFlagItem.type}`,
        description: `Flagged by ${nurseEmail}:\n\nFinding: ${currentFlagItem.content}\n\nNurse Note: ${flagNote || 'No additional notes'}`,
        priority: 'medium',
        type: 'document',
        status: 'pending',
        source: 'ai_generated',
        ai_reason: 'Flagged for supervisor review from AI Note Review'
      });
    } catch (error) {
      console.error("Error creating flag task:", error);
    }
    
    setFlagDialogOpen(false);
    setCurrentFlagItem(null);
  };

  const isFlagged = (itemType, itemId) => {
    return !!flaggedItems[`${itemType}_${itemId}`];
  };

  const FlagButton = ({ itemType, itemId, content }) => {
    const flagged = isFlagged(itemType, itemId);
    return (
      <Button
        size="sm"
        variant="ghost"
        className={`h-6 px-2 ${flagged ? 'text-orange-600' : 'text-gray-400 hover:text-orange-600'}`}
        onClick={(e) => {
          e.stopPropagation();
          if (!flagged) {
            openFlagDialog(itemType, itemId, content);
          }
        }}
        title={flagged ? "Flagged for review" : "Flag for supervisor review"}
      >
        <Flag className={`w-3 h-3 ${flagged ? 'fill-orange-600' : ''}`} />
      </Button>
    );
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
                AI will review your note against clinical protocols, compliance requirements, and safety standards
              </p>
              <Button
                onClick={runReview}
                disabled={isReviewing || !noteText || noteText.length < 100}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isReviewing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing with Protocols...</>
                ) : (
                  <><FileCheck className="w-4 h-4 mr-2" /> Run Advanced AI Review</>
                )}
              </Button>
              {diagnosis && (
                <p className="text-xs text-gray-400 mt-2">
                  <Stethoscope className="w-3 h-3 inline mr-1" />
                  Will cross-reference: {getClinicalProtocols(diagnosis).map(p => p.name).join(', ')}
                </p>
              )}
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

              {/* Flagged Items Count */}
              {Object.keys(flaggedItems).length > 0 && (
                <div className="flex items-center gap-2 p-2 bg-orange-50 border border-orange-200 rounded">
                  <Flag className="w-4 h-4 text-orange-600" />
                  <span className="text-xs text-orange-800">
                    {Object.keys(flaggedItems).length} item(s) flagged for supervisor review
                  </span>
                </div>
              )}

              {/* Tabs for organized view */}
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4 h-8">
                  <TabsTrigger value="overview" className="text-xs">Overview</TabsTrigger>
                  <TabsTrigger value="protocols" className="text-xs">
                    <BookOpen className="w-3 h-3 mr-1" />
                    Protocols
                  </TabsTrigger>
                  <TabsTrigger value="actions" className="text-xs">Actions</TabsTrigger>
                  <TabsTrigger value="training" className="text-xs">Training</TabsTrigger>
                </TabsList>

                {/* Overview Tab */}
                <TabsContent value="overview" className="space-y-3 mt-3">
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
                            <div className="flex items-center justify-between mb-1">
                              <div className="flex items-center gap-2">
                                <Badge className={getUrgencyBadge(alert.priority)}>{alert.priority}</Badge>
                                <span className="font-medium">{alert.concern}</span>
                              </div>
                              <FlagButton itemType="safety" itemId={idx} content={alert.concern} />
                            </div>
                            <p className="text-red-700">Action: {alert.action_needed}</p>
                            {alert.clinical_rationale && (
                              <p className="text-gray-500 mt-1 italic">Rationale: {alert.clinical_rationale}</p>
                            )}
                          </AlertDescription>
                        </Alert>
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

                  {/* Documentation Gaps */}
                  {reviewResult.documentation_gaps?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-yellow-800">Documentation Gaps</p>
                      {reviewResult.documentation_gaps.map((gap, idx) => (
                        <div key={idx} className="p-2 bg-yellow-50 border border-yellow-200 rounded text-xs">
                          <div className="flex items-center justify-between mb-1">
                            <div className="flex items-center gap-2">
                              <Badge className={gap.importance === 'critical' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'}>
                                {gap.importance}
                              </Badge>
                              <span className="font-medium">{gap.element}</span>
                            </div>
                            <FlagButton itemType="gap" itemId={idx} content={`${gap.element}: ${gap.suggestion}`} />
                          </div>
                          <p className="text-gray-600">{gap.suggestion}</p>
                          {gap.guideline_reference && (
                            <p className="text-gray-400 mt-1 text-xs italic">
                              <BookOpen className="w-3 h-3 inline mr-1" />
                              Ref: {gap.guideline_reference}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </TabsContent>

                {/* Protocols Tab */}
                <TabsContent value="protocols" className="space-y-3 mt-3">
                  {reviewResult.protocol_compliance?.length > 0 ? (
                    reviewResult.protocol_compliance.map((protocol, pIdx) => (
                      <div key={pIdx} className="border rounded-lg overflow-hidden">
                        <div className="flex items-center justify-between p-2 bg-indigo-50">
                          <div className="flex items-center gap-2">
                            <Stethoscope className="w-4 h-4 text-indigo-600" />
                            <span className="text-sm font-semibold text-indigo-900">{protocol.protocol_name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge className={protocol.compliance_score >= 80 ? 'bg-green-100 text-green-800' : protocol.compliance_score >= 50 ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'}>
                              {protocol.compliance_score}%
                            </Badge>
                            <FlagButton itemType="protocol" itemId={pIdx} content={`${protocol.protocol_name}: ${protocol.compliance_score}% compliance`} />
                          </div>
                        </div>
                        <div className="p-2 space-y-1 max-h-48 overflow-y-auto">
                          {protocol.elements_checked?.map((element, eIdx) => (
                            <div 
                              key={eIdx} 
                              className={`flex items-start gap-2 p-1.5 rounded text-xs ${
                                element.status === 'met' ? 'bg-green-50' :
                                element.status === 'partial' ? 'bg-yellow-50' :
                                element.status === 'not_applicable' ? 'bg-gray-50' : 'bg-red-50'
                              }`}
                            >
                              {element.status === 'met' ? (
                                <CheckCircle2 className="w-3 h-3 text-green-600 shrink-0 mt-0.5" />
                              ) : element.status === 'partial' ? (
                                <Clock className="w-3 h-3 text-yellow-600 shrink-0 mt-0.5" />
                              ) : element.status === 'not_applicable' ? (
                                <span className="w-3 h-3 text-gray-400 shrink-0">—</span>
                              ) : (
                                <AlertTriangle className="w-3 h-3 text-red-600 shrink-0 mt-0.5" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-medium">{element.element}</p>
                                {element.found_text && (
                                  <p className="text-gray-500 italic truncate">"{element.found_text}"</p>
                                )}
                                {element.status !== 'met' && element.status !== 'not_applicable' && element.recommendation && (
                                  <p className="text-orange-700 mt-0.5">→ {element.recommendation}</p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4 text-gray-500 text-sm">
                      <BookOpen className="w-8 h-8 mx-auto mb-2 text-gray-300" />
                      No protocol data available
                    </div>
                  )}
                </TabsContent>

                {/* Actions Tab */}
                <TabsContent value="actions" className="space-y-3 mt-3">
                  {reviewResult.missing_followups?.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-orange-800 flex items-center gap-1">
                        <ListTodo className="w-3 h-3" /> Missing Follow-up Actions
                      </p>
                      {reviewResult.missing_followups.map((followup, idx) => (
                        <div key={idx} className="p-2 bg-orange-50 border border-orange-200 rounded">
                          <div className="flex items-center justify-between mb-1">
                            <Badge className={getUrgencyBadge(followup.urgency)}>{followup.urgency}</Badge>
                            <div className="flex items-center gap-1">
                              <FlagButton itemType="followup" itemId={idx} content={followup.issue} />
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-6 text-xs"
                                onClick={() => handleCreateTask(followup)}
                              >
                                Create Task
                              </Button>
                            </div>
                          </div>
                          <p className="text-xs text-gray-700 mb-1">{followup.issue}</p>
                          <p className="text-xs text-orange-700">
                            → {followup.suggested_task.title}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-4 text-green-600 text-sm">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
                      All follow-up actions documented!
                    </div>
                  )}
                </TabsContent>

                {/* Training Tab */}
                <TabsContent value="training" className="space-y-3 mt-3">
                  {reviewResult.skill_gaps?.length > 0 ? (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-purple-800 flex items-center gap-1">
                        <GraduationCap className="w-3 h-3" /> Training Recommendations
                      </p>
                      {reviewResult.skill_gaps.map((gap, idx) => (
                        <div key={idx} className="p-2 bg-purple-50 border border-purple-200 rounded text-xs">
                          <div className="flex items-center justify-between">
                            <p className="font-medium text-purple-900">{gap.area}</p>
                            <FlagButton itemType="training" itemId={idx} content={`Training: ${gap.recommended_training}`} />
                          </div>
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
                  ) : (
                    <div className="text-center py-4 text-green-600 text-sm">
                      <CheckCircle2 className="w-8 h-8 mx-auto mb-2" />
                      No training gaps identified!
                    </div>
                  )}
                </TabsContent>
              </Tabs>

              <Button variant="outline" size="sm" className="w-full" onClick={() => setReviewResult(null)}>
                Run New Review
              </Button>
            </div>
          )}
        </CardContent>
      )}

      {/* Flag Dialog */}
      <Dialog open={flagDialogOpen} onOpenChange={setFlagDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Flag className="w-5 h-5 text-orange-600" />
              Flag for Supervisor Review
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-3 bg-gray-50 rounded-lg text-sm">
              <p className="font-medium text-gray-700">Flagging:</p>
              <p className="text-gray-600">{currentFlagItem?.content}</p>
            </div>
            <div>
              <label className="text-sm font-medium">Add a note (optional):</label>
              <Textarea
                placeholder="Why are you flagging this? Any concerns or questions for the supervisor..."
                value={flagNote}
                onChange={(e) => setFlagNote(e.target.value)}
                className="mt-1"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setFlagDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submitFlag} className="bg-orange-600 hover:bg-orange-700">
              <Send className="w-4 h-4 mr-2" />
              Submit Flag
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
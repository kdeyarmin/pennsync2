import { useState, useEffect, useCallback } from "react";
import { invokeLLM } from "@/lib/invokeLLM";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Wand2,
  FileText,
  CheckCircle2,
  Plus,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Stethoscope,
  Heart,
  Wind,
  Activity,
  AlertTriangle,
  BookOpen,
  MessageCircle,
  Send,
  Lightbulb,
  Target
} from "lucide-react";

export default function AIDocumentationAutomation({
  patient,
  _visit,
  vitalSigns,
  narrativeText,
  carePlans,
  previousVisits,
  onInsertText
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState("assessments");
  
  // Auto-populate assessments state
  const [assessments, setAssessments] = useState(null);
  const [isGeneratingAssessments, setIsGeneratingAssessments] = useState(false);
  const [insertedAssessments, setInsertedAssessments] = useState([]);
  
  // Follow-up actions state
  const [followUpActions, setFollowUpActions] = useState(null);
  const [isGeneratingActions, setIsGeneratingActions] = useState(false);
  const [completedActions, setCompletedActions] = useState([]);
  
  // Patient query responses state
  const [queryResponses, setQueryResponses] = useState(null);
  const [isGeneratingResponses, setIsGeneratingResponses] = useState(false);
  const [customQuery, setCustomQuery] = useState("");
  const [copiedResponses, setCopiedResponses] = useState([]);

  const generateAssessments = useCallback(async () => {
    if (!patient) return;
    
    setIsGeneratingAssessments(true);
    try {
      const recentNotes = (previousVisits || [])
        .slice(0, 3)
        .filter(v => v.nurse_notes)
        .map(v => v.nurse_notes.substring(0, 300))
        .join('\n---\n');

      const prompt = `You are a clinical documentation specialist. Generate standard assessment sections that should be auto-populated based on the patient's diagnosis.

PATIENT:
- Primary Diagnosis: ${patient.primary_diagnosis || 'Not specified'}
- Secondary Diagnoses: ${patient.secondary_diagnoses?.join(', ') || 'None'}
- Care Type: ${patient.care_type === 'hospice' ? 'Hospice' : 'Home Health'}
- Allergies: ${patient.allergies || 'NKDA'}

CURRENT VITAL SIGNS:
${vitalSigns ? Object.entries(vitalSigns).map(([k, v]) => `- ${k.replace(/_/g, ' ')}: ${v}`).join('\n') : 'Not entered'}

RECENT VISIT NOTES (for context):
${recentNotes || 'No previous notes'}

Generate diagnosis-specific assessment sections that should be pre-populated. For each assessment:
1. Provide ready-to-use clinical documentation text
2. Include findings based on vital signs if available
3. Use standard clinical terminology
4. Include placeholders [brackets] only where nurse must add specific observation

Return JSON:
{
  "primary_assessments": [
    {
      "section_name": "CARDIOVASCULAR ASSESSMENT",
      "icon": "heart",
      "relevance": "High relevance explanation",
      "content": "Ready-to-insert assessment text with vital signs integrated",
      "key_findings": ["Finding 1 based on vitals", "Finding 2"]
    }
  ],
  "secondary_assessments": [
    {
      "section_name": "Section name",
      "icon": "activity",
      "content": "Assessment content"
    }
  ],
  "diagnosis_specific_elements": [
    {
      "element": "Specific element for this diagnosis",
      "content": "Documentation text"
    }
  ]
}`;

      const result = await invokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            primary_assessments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  section_name: { type: "string" },
                  icon: { type: "string" },
                  relevance: { type: "string" },
                  content: { type: "string" },
                  key_findings: { type: "array", items: { type: "string" } }
                }
              }
            },
            secondary_assessments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  section_name: { type: "string" },
                  icon: { type: "string" },
                  content: { type: "string" }
                }
              }
            },
            diagnosis_specific_elements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  element: { type: "string" },
                  content: { type: "string" }
                }
              }
            }
          }
        }
      });

      setAssessments(result);
    } catch (error) {
      console.error('Error generating assessments:', error);
    }
    setIsGeneratingAssessments(false);
  }, [patient, previousVisits, vitalSigns]);

  // Auto-generate assessments on mount if diagnosis present
  useEffect(() => {
    if (patient?.primary_diagnosis && !assessments && !isGeneratingAssessments) {
      generateAssessments();
    }
  }, [patient?.primary_diagnosis, assessments, isGeneratingAssessments, generateAssessments]);

  const generateFollowUpActions = async () => {
    if (!patient) return;
    
    setIsGeneratingActions(true);
    try {
      const activeCarePlanGoals = (carePlans || [])
        .filter(cp => cp.status === 'active')
        .map(cp => cp.goal)
        .join('; ');

      const prompt = `You are a clinical care coordinator. Based on this patient's data, suggest follow-up actions and patient education materials.

PATIENT:
- Diagnosis: ${patient.primary_diagnosis || 'Not specified'}
- Secondary: ${patient.secondary_diagnoses?.join(', ') || 'None'}
- Care Type: ${patient.care_type === 'hospice' ? 'Hospice' : 'Home Health'}

CURRENT VITAL SIGNS:
${vitalSigns ? Object.entries(vitalSigns).map(([k, v]) => `- ${k.replace(/_/g, ' ')}: ${v}`).join('\n') : 'Not entered'}

ACTIVE CARE PLAN GOALS:
${activeCarePlanGoals || 'None'}

CURRENT DOCUMENTATION:
${(narrativeText || '').substring(0, 500)}

Identify risks, quality measure opportunities, and suggest:
1. Follow-up actions needed
2. Patient education materials to provide
3. Quality measure interventions

Return JSON:
{
  "identified_risks": [
    {
      "risk": "Risk description",
      "severity": "high|medium|low",
      "recommended_action": "What to do"
    }
  ],
  "follow_up_actions": [
    {
      "action": "Specific action",
      "priority": "urgent|routine|optional",
      "timeframe": "When to complete",
      "documentation_text": "Text to add to notes"
    }
  ],
  "education_materials": [
    {
      "topic": "Education topic",
      "key_points": ["Point 1", "Point 2"],
      "documentation_text": "Patient education documentation text"
    }
  ],
  "quality_interventions": [
    {
      "measure": "Quality measure name",
      "intervention": "What to do",
      "documentation_text": "Documentation for compliance"
    }
  ]
}`;

      const result = await invokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            identified_risks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  risk: { type: "string" },
                  severity: { type: "string" },
                  recommended_action: { type: "string" }
                }
              }
            },
            follow_up_actions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  priority: { type: "string" },
                  timeframe: { type: "string" },
                  documentation_text: { type: "string" }
                }
              }
            },
            education_materials: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  topic: { type: "string" },
                  key_points: { type: "array", items: { type: "string" } },
                  documentation_text: { type: "string" }
                }
              }
            },
            quality_interventions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  measure: { type: "string" },
                  intervention: { type: "string" },
                  documentation_text: { type: "string" }
                }
              }
            }
          }
        }
      });

      setFollowUpActions(result);
    } catch (error) {
      console.error('Error generating follow-up actions:', error);
    }
    setIsGeneratingActions(false);
  };

  const generateQueryResponses = async (customQueryText = null) => {
    if (!patient) return;
    
    setIsGeneratingResponses(true);
    try {
      const activeGoals = (carePlans || [])
        .filter(cp => cp.status === 'active')
        .map(cp => `- ${cp.problem}: ${cp.goal}`)
        .join('\n');

      const prompt = `You are a patient communication specialist. Generate responses to common patient queries about their care plan.

PATIENT:
- Name: ${patient.first_name}
- Diagnosis: ${patient.primary_diagnosis || 'Not specified'}
- Care Type: ${patient.care_type === 'hospice' ? 'Hospice' : 'Home Health'}

ACTIVE CARE PLAN:
${activeGoals || 'No active care plans'}

${customQueryText ? `SPECIFIC PATIENT QUESTION: "${customQueryText}"` : ''}

Generate ${customQueryText ? 'a response to the specific question and' : ''} draft responses for common patient queries. Make responses:
1. Patient-friendly (6th grade reading level)
2. Warm and empathetic
3. Specific to their condition
4. Include actionable advice

Return JSON:
{
  ${customQueryText ? `"custom_response": {
    "question": "The patient question",
    "response": "Detailed patient-friendly response"
  },` : ''}
  "common_queries": [
    {
      "question": "Common patient question",
      "category": "medications|symptoms|care_plan|appointments|general",
      "response": "Patient-friendly response",
      "follow_up_tip": "Additional tip for the nurse"
    }
  ]
}`;

      const result = await invokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            custom_response: {
              type: "object",
              properties: {
                question: { type: "string" },
                response: { type: "string" }
              }
            },
            common_queries: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  question: { type: "string" },
                  category: { type: "string" },
                  response: { type: "string" },
                  follow_up_tip: { type: "string" }
                }
              }
            }
          }
        }
      });

      setQueryResponses(result);
      setCustomQuery("");
    } catch (error) {
      console.error('Error generating query responses:', error);
    }
    setIsGeneratingResponses(false);
  };

  const handleInsertAssessment = (content, id) => {
    onInsertText("\n\n" + content);
    setInsertedAssessments([...insertedAssessments, id]);
  };

  const handleInsertAction = (content, id) => {
    onInsertText("\n\n" + content);
    setCompletedActions([...completedActions, id]);
  };

  const handleCopyResponse = (response, id) => {
    navigator.clipboard.writeText(response);
    setCopiedResponses([...copiedResponses, id]);
    setTimeout(() => {
      setCopiedResponses(prev => prev.filter(i => i !== id));
    }, 2000);
  };

  const getIconComponent = (iconName) => {
    switch (iconName) {
      case 'heart': return <Heart className="w-4 h-4" />;
      case 'wind': return <Wind className="w-4 h-4" />;
      case 'activity': return <Activity className="w-4 h-4" />;
      default: return <Stethoscope className="w-4 h-4" />;
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500 text-white';
      case 'routine': return 'bg-blue-500 text-white';
      case 'optional': return 'bg-slate-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high': return 'bg-red-100 border-red-300 text-red-900';
      case 'medium': return 'bg-yellow-100 border-yellow-300 text-yellow-900';
      case 'low': return 'bg-blue-100 border-blue-300 text-blue-900';
      default: return 'bg-slate-100 border-slate-300 text-slate-900';
    }
  };

  if (!patient) return null;

  return (
    <Card className="border-emerald-200 bg-gradient-to-br from-emerald-50 to-navy-50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-emerald-900">
            <Wand2 className="w-5 h-5 text-emerald-600" />
            AI Documentation Automation
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
        <p className="text-xs text-emerald-600">
          Auto-populate assessments, follow-ups & patient responses
        </p>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-2">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-3 mb-4">
              <TabsTrigger value="assessments" className="text-xs">
                <FileText className="w-3 h-3 mr-1" />
                Assessments
              </TabsTrigger>
              <TabsTrigger value="followup" className="text-xs">
                <Target className="w-3 h-3 mr-1" />
                Follow-Up
              </TabsTrigger>
              <TabsTrigger value="queries" className="text-xs">
                <MessageCircle className="w-3 h-3 mr-1" />
                Patient Q&A
              </TabsTrigger>
            </TabsList>

            {/* Auto-Populate Assessments Tab */}
            <TabsContent value="assessments" className="space-y-3">
              <div className="flex justify-between items-center">
                <p className="text-xs text-slate-600">
                  Based on: {patient.primary_diagnosis || 'Patient diagnosis'}
                </p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={generateAssessments}
                  disabled={isGeneratingAssessments}
                >
                  {isGeneratingAssessments ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : (
                    <RefreshCw className="w-3 h-3" />
                  )}
                </Button>
              </div>

              {isGeneratingAssessments && (
                <div className="flex items-center justify-center py-4 gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                  <span className="text-sm text-emerald-700">Generating assessments...</span>
                </div>
              )}

              {assessments && (
                <div className="space-y-2">
                  {/* Primary Assessments */}
                  {assessments.primary_assessments?.map((assessment, idx) => {
                    const id = `primary-${idx}`;
                    const isInserted = insertedAssessments.includes(id);
                    
                    return (
                      <div key={idx} className="p-3 bg-white rounded-lg border border-emerald-100">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {getIconComponent(assessment.icon)}
                            <span className="font-medium text-sm">{assessment.section_name}</span>
                            <Badge className="bg-emerald-500 text-white text-xs">Primary</Badge>
                          </div>
                          <Button
                            size="sm"
                            variant={isInserted ? "outline" : "default"}
                            className={isInserted ? "text-green-600" : "bg-emerald-600 hover:bg-emerald-700"}
                            onClick={() => handleInsertAssessment(assessment.content, id)}
                            disabled={isInserted}
                          >
                            {isInserted ? (
                              <><CheckCircle2 className="w-3 h-3 mr-1" /> Added</>
                            ) : (
                              <><Plus className="w-3 h-3 mr-1" /> Insert</>
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-slate-500 mb-2">{assessment.relevance}</p>
                        {assessment.key_findings?.length > 0 && (
                          <div className="flex flex-wrap gap-1 mb-2">
                            {assessment.key_findings.map((finding, i) => (
                              <Badge key={i} variant="outline" className="text-xs bg-emerald-50">
                                {finding}
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Secondary Assessments */}
                  {assessments.secondary_assessments?.slice(0, 3).map((assessment, idx) => {
                    const id = `secondary-${idx}`;
                    const isInserted = insertedAssessments.includes(id);
                    
                    return (
                      <div key={idx} className="p-2 bg-white rounded-lg border border-slate-100">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {getIconComponent(assessment.icon)}
                            <span className="text-sm">{assessment.section_name}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleInsertAssessment(assessment.content, id)}
                            disabled={isInserted}
                          >
                            {isInserted ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : <Plus className="w-3 h-3" />}
                          </Button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Diagnosis-specific elements */}
                  {assessments.diagnosis_specific_elements?.length > 0 && (
                    <div className="p-2 bg-amber-50 rounded-lg border border-amber-200">
                      <p className="text-xs font-medium text-amber-800 mb-2">
                        <Lightbulb className="w-3 h-3 inline mr-1" />
                        Diagnosis-Specific Documentation
                      </p>
                      {assessments.diagnosis_specific_elements.slice(0, 2).map((elem, idx) => {
                        const id = `specific-${idx}`;
                        const isInserted = insertedAssessments.includes(id);
                        
                        return (
                          <div key={idx} className="flex items-center justify-between py-1">
                            <span className="text-xs text-amber-900">{elem.element}</span>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleInsertAssessment(elem.content, id)}
                              disabled={isInserted}
                              className="h-6 text-xs"
                            >
                              {isInserted ? 'Added' : 'Add'}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Follow-Up Actions Tab */}
            <TabsContent value="followup" className="space-y-3">
              <Button
                size="sm"
                onClick={generateFollowUpActions}
                disabled={isGeneratingActions}
                className="w-full bg-emerald-600 hover:bg-emerald-700"
              >
                {isGeneratingActions ? (
                  <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
                ) : (
                  <><Target className="w-4 h-4 mr-2" /> Analyze & Suggest Actions</>
                )}
              </Button>

              {followUpActions && (
                <div className="space-y-3">
                  {/* Identified Risks */}
                  {followUpActions.identified_risks?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-700">⚠️ Identified Risks</p>
                      {followUpActions.identified_risks.map((risk, idx) => (
                        <Alert key={idx} className={getSeverityColor(risk.severity)}>
                          <AlertTriangle className="w-4 h-4" />
                          <AlertDescription>
                            <p className="font-medium text-sm">{risk.risk}</p>
                            <p className="text-xs mt-1">{risk.recommended_action}</p>
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  )}

                  {/* Follow-up Actions */}
                  {followUpActions.follow_up_actions?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-700">📋 Follow-Up Actions</p>
                      {followUpActions.follow_up_actions.map((action, idx) => {
                        const id = `action-${idx}`;
                        const isCompleted = completedActions.includes(id);
                        
                        return (
                          <div key={idx} className="p-2 bg-white rounded-lg border flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={getPriorityColor(action.priority)} variant="secondary">
                                  {action.priority}
                                </Badge>
                                <span className="text-xs text-slate-500">{action.timeframe}</span>
                              </div>
                              <p className="text-sm">{action.action}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleInsertAction(action.documentation_text, id)}
                              disabled={isCompleted}
                            >
                              {isCompleted ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Plus className="w-4 h-4" />}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Education Materials */}
                  {followUpActions.education_materials?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-700">📚 Patient Education</p>
                      {followUpActions.education_materials.map((edu, idx) => {
                        const id = `edu-${idx}`;
                        const isCompleted = completedActions.includes(id);
                        
                        return (
                          <div key={idx} className="p-2 bg-navy-50 rounded-lg border border-navy-200">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="text-sm font-medium text-navy-900">{edu.topic}</p>
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {edu.key_points?.slice(0, 2).map((point, i) => (
                                    <Badge key={i} variant="outline" className="text-xs">
                                      {point}
                                    </Badge>
                                  ))}
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleInsertAction(edu.documentation_text, id)}
                                disabled={isCompleted}
                              >
                                {isCompleted ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <BookOpen className="w-4 h-4" />}
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Quality Interventions */}
                  {followUpActions.quality_interventions?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-slate-700">⭐ Quality Measure Interventions</p>
                      {followUpActions.quality_interventions.map((qi, idx) => {
                        const id = `qi-${idx}`;
                        const isCompleted = completedActions.includes(id);
                        
                        return (
                          <div key={idx} className="p-2 bg-green-50 rounded-lg border border-green-200 flex items-center justify-between">
                            <div>
                              <Badge variant="outline" className="text-xs bg-green-100">{qi.measure}</Badge>
                              <p className="text-xs text-green-800 mt-1">{qi.intervention}</p>
                            </div>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handleInsertAction(qi.documentation_text, id)}
                              disabled={isCompleted}
                            >
                              {isCompleted ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <Plus className="w-4 h-4" />}
                            </Button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </TabsContent>

            {/* Patient Query Responses Tab */}
            <TabsContent value="queries" className="space-y-3">
              <div className="flex gap-2">
                <Input
                  placeholder="Enter patient question..."
                  value={customQuery}
                  onChange={(e) => setCustomQuery(e.target.value)}
                  className="text-sm"
                />
                <Button
                  size="sm"
                  onClick={() => generateQueryResponses(customQuery || null)}
                  disabled={isGeneratingResponses}
                  className="bg-emerald-600 hover:bg-emerald-700"
                >
                  {isGeneratingResponses ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </Button>
              </div>

              {isGeneratingResponses && (
                <div className="flex items-center justify-center py-4 gap-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-600" />
                  <span className="text-sm text-emerald-700">Generating responses...</span>
                </div>
              )}

              {queryResponses && (
                <div className="space-y-3">
                  {/* Custom Response */}
                  {queryResponses.custom_response && (
                    <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                      <p className="text-xs font-semibold text-blue-800 mb-1">Your Question:</p>
                      <p className="text-sm text-blue-900 mb-2">"{queryResponses.custom_response.question}"</p>
                      <p className="text-xs font-semibold text-blue-800 mb-1">Suggested Response:</p>
                      <p className="text-sm text-blue-900 bg-white p-2 rounded">{queryResponses.custom_response.response}</p>
                      <Button
                        size="sm"
                        variant="outline"
                        className="mt-2 w-full"
                        onClick={() => handleCopyResponse(queryResponses.custom_response.response, 'custom')}
                      >
                        {copiedResponses.includes('custom') ? 'Copied!' : 'Copy Response'}
                      </Button>
                    </div>
                  )}

                  {/* Common Queries */}
                  <p className="text-xs font-semibold text-slate-700">💬 Common Patient Questions</p>
                  {queryResponses.common_queries?.map((query, idx) => {
                    const id = `query-${idx}`;
                    const isCopied = copiedResponses.includes(id);
                    
                    return (
                      <div key={idx} className="p-3 bg-white rounded-lg border">
                        <div className="flex items-start justify-between mb-2">
                          <Badge variant="outline" className="text-xs capitalize">
                            {query.category}
                          </Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => handleCopyResponse(query.response, id)}
                            className="h-6 text-xs"
                          >
                            {isCopied ? <CheckCircle2 className="w-3 h-3 text-green-600" /> : 'Copy'}
                          </Button>
                        </div>
                        <p className="text-sm font-medium text-slate-900 mb-1">"{query.question}"</p>
                        <p className="text-sm text-slate-700 bg-slate-50 p-2 rounded">{query.response}</p>
                        {query.follow_up_tip && (
                          <p className="text-xs text-slate-500 mt-2 italic">
                            💡 Tip: {query.follow_up_tip}
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      )}
    </Card>
  );
}
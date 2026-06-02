import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { trackAISuggestion, categorizeAISuggestion } from "../training/SuggestionTracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sparkles,
  AlertTriangle,
  BookOpen,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  Plus,
  Copy,
  CheckCircle2,
  Loader2,
  RefreshCw,
  Lightbulb,
  GraduationCap,
  ClipboardList
} from "lucide-react";
import debounce from "lodash/debounce";

export default function AIDocumentationSuggester({
  patientId,
  oasisData,
  noteContent,
  discrepancies = [],
  carePlanNeeds = [],
  vitalSigns = {},
  onInsertText,
  patientData,
  previousVisits = [],
  allCarePlans = []
}) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState("clarifications");
  const [suggestions, setSuggestions] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const [patientIncidents, _setPatientIncidents] = useState([]);
  const [patientAlerts, _setPatientAlerts] = useState([]);

  // Generate suggestions based on OASIS data and discrepancies
  const generateSuggestions = useCallback(
    debounce(async () => {
      if (!oasisData && discrepancies.length === 0 && carePlanNeeds.length === 0) return;

      setIsLoading(true);
      try {
        // Build comprehensive patient history context
        const patientHistoryContext = previousVisits?.slice(0, 5).map((v, _idx) => ({
          date: v.visit_date,
          type: v.visit_type,
          vitals: v.vital_signs,
          notes_excerpt: v.nurse_notes?.substring(0, 300) || 'No notes'
        })) || [];

        const carePlanHistory = allCarePlans?.map(cp => ({
          problem: cp.problem,
          goal: cp.goal,
          status: cp.status,
          interventions: cp.interventions
        })) || [];

        const recentIncidents = patientIncidents?.map(inc => ({
          type: inc.incident_type,
          date: inc.incident_date,
          severity: inc.severity,
          details: inc.details
        })) || [];

        const activeAlerts = patientAlerts?.map(alert => ({
          type: alert.alert_type,
          severity: alert.severity,
          message: alert.message,
          recommended_actions: alert.recommended_actions
        })) || [];

        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a proactive home health documentation specialist with access to COMPLETE patient history. Analyze the entire patient record to provide context-aware, anticipatory documentation suggestions.

COMPLETE PATIENT PROFILE:
${patientData ? `- Name: ${patientData.first_name} ${patientData.last_name}
- Primary Diagnosis: ${patientData.primary_diagnosis}
- Secondary Diagnoses: ${patientData.secondary_diagnoses?.join(', ') || 'None'}
- Allergies: ${patientData.allergies || 'NKDA'}
- Status: ${patientData.status}
- Physician: ${patientData.physician_email || 'Not specified'}
- Caregiver: ${patientData.caregiver_name || 'None'}` : 'Limited patient data'}

PREVIOUS VISIT HISTORY (Last 5 Visits):
${patientHistoryContext.length > 0 ? JSON.stringify(patientHistoryContext, null, 2) : 'No previous visits'}

COMPLETE CARE PLAN HISTORY:
${carePlanHistory.length > 0 ? JSON.stringify(carePlanHistory, null, 2) : 'No care plans documented'}

RECENT INCIDENTS (Last 5):
${recentIncidents.length > 0 ? JSON.stringify(recentIncidents, null, 2) : 'No recent incidents'}

ACTIVE PATIENT ALERTS:
${activeAlerts.length > 0 ? JSON.stringify(activeAlerts, null, 2) : 'No active alerts'}

CURRENT OASIS DATA:
${oasisData ? JSON.stringify(oasisData, null, 2) : 'Not available'}

IDENTIFIED OASIS DISCREPANCIES:
${discrepancies.length > 0 ? discrepancies.map(d => `- ${d.item || d.area}: ${d.issue || d.description}`).join('\n') : 'None identified'}

ACTIVE CARE PLAN NEEDS:
${carePlanNeeds.length > 0 ? carePlanNeeds.map(c => `- ${c.problem || c.need}: ${c.goal || c.description || ''}`).join('\n') : 'Standard care'}

CURRENT VITAL SIGNS:
${Object.keys(vitalSigns).length > 0 ? JSON.stringify(vitalSigns) : 'Not recorded'}

CURRENT NOTE CONTENT (In Progress):
${noteContent?.substring(0, 500) || 'Empty - just starting documentation'}

CRITICAL INSTRUCTION: Analyze the ENTIRE patient history, not just current visit data. Look for:
- Patterns across multiple visits
- Progress or decline trends
- Recurring issues that need addressing
- Care plan goal progress
- Historical context that informs current documentation
- Safety concerns from incident history
- Follow-up on previous visit interventions
- Alert-driven documentation needs

Provide proactive, context-aware suggestions in these categories:

1. OASIS CLARIFICATIONS - Address discrepancies with historical context
2. PATIENT EDUCATION - Based on diagnoses, alerts, and care plan needs
3. SKILLED INTERVENTIONS - Driven by patient history, trends, and current needs
4. HISTORICAL CONTINUITY - Document progress/changes from previous visits
5. CARE PLAN ALIGNMENT - Ensure note supports active care plan goals
6. RISK MITIGATION - Address active alerts and incident patterns`,
          response_json_schema: {
            type: "object",
            properties: {
              oasis_clarifications: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    item: { type: "string" },
                    issue: { type: "string" },
                    suggested_documentation: { type: "string" },
                    priority: { type: "string" },
                    historical_context: { type: "string" }
                  }
                }
              },
              patient_education: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    topic: { type: "string" },
                    content: { type: "string" },
                    teach_back_prompt: { type: "string" },
                    based_on_history: { type: "string" }
                  }
                }
              },
              skilled_interventions: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    intervention: { type: "string" },
                    rationale: { type: "string" },
                    documentation_template: { type: "string" },
                    continuity_note: { type: "string" }
                  }
                }
              },
              historical_continuity_prompts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    prompt: { type: "string" },
                    context: { type: "string" },
                    suggested_documentation: { type: "string" }
                  }
                }
              },
              care_plan_alignment: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    care_plan_goal: { type: "string" },
                    progress_note: { type: "string" },
                    documentation_template: { type: "string" }
                  }
                }
              },
              risk_mitigation_notes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    risk_area: { type: "string" },
                    alert_source: { type: "string" },
                    suggested_documentation: { type: "string" },
                    priority: { type: "string" }
                  }
                }
              },
              quick_phrases: {
                type: "array",
                items: { type: "string" }
              }
            }
          }
        });

        setSuggestions(result);
      } catch (error) {
        console.error("Error generating suggestions:", error);
      }
      setIsLoading(false);
    }, 1500),
    [patientId, patientData, previousVisits, allCarePlans, oasisData, discrepancies, carePlanNeeds, noteContent, vitalSigns, patientIncidents, patientAlerts]
  );

  useEffect(() => {
    if (patientId || oasisData || discrepancies.length > 0 || carePlanNeeds.length > 0) {
      generateSuggestions();
    }
  }, [patientId, patientData, previousVisits, allCarePlans, oasisData, discrepancies, carePlanNeeds, patientIncidents, patientAlerts]);

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const handleInsert = async (text, suggestionType = 'documentation', elementName = null) => {
    onInsertText?.(text);
    
    // Track AI suggestion usage
    const user = await base44.auth.me();
    if (user?.email) {
      trackAISuggestion({
        nurseEmail: user.email,
        suggestionType: categorizeAISuggestion(elementName || text),
        suggestionText: elementName ? `Missing: ${elementName}` : `AI suggested ${suggestionType}`,
        context: text,
        patientId: patientId,
        source: 'ai_documentation_suggester',
        elementName: elementName,
        noteSnippet: noteContent?.substring(0, 500)
      });
    }
  };

  const getPriorityColor = (priority) => {
    if (priority === 'high') return 'bg-red-100 text-red-800';
    if (priority === 'medium') return 'bg-yellow-100 text-yellow-800';
    return 'bg-blue-100 text-blue-800';
  };

  return (
    <Card className="border-2 border-purple-200">
      <CardHeader 
        className="pb-2 bg-gradient-to-r from-purple-50 to-pink-50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            AI Documentation Assistant
            {suggestions && (
              <Badge variant="outline" className="text-xs bg-white">
                {(suggestions.oasis_clarifications?.length || 0) + 
                 (suggestions.patient_education?.length || 0) + 
                 (suggestions.skilled_interventions?.length || 0)} suggestions
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {isLoading && <Loader2 className="w-4 h-4 animate-spin text-purple-600" />}
            <Button
              size="sm"
              variant="ghost"
              className="h-6 w-6 p-0"
              onClick={(e) => { e.stopPropagation(); generateSuggestions(); }}
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-3">
          {!suggestions && !isLoading ? (
            <p className="text-sm text-gray-500 text-center py-4">
              Add OASIS data or start documenting to receive AI suggestions
            </p>
          ) : isLoading && !suggestions ? (
            <div className="text-center py-6">
              <Loader2 className="w-6 h-6 animate-spin text-purple-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Analyzing documentation needs...</p>
            </div>
          ) : (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 mb-3 h-auto">
                <TabsTrigger value="clarifications" className="text-[10px] sm:text-xs gap-1 py-2">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="hidden sm:inline">OASIS</span> ({suggestions?.oasis_clarifications?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="education" className="text-[10px] sm:text-xs gap-1 py-2">
                  <GraduationCap className="w-3 h-3" />
                  <span className="hidden sm:inline">Edu</span> ({suggestions?.patient_education?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="interventions" className="text-[10px] sm:text-xs gap-1 py-2">
                  <Stethoscope className="w-3 h-3" />
                  <span className="hidden sm:inline">Skilled</span> ({suggestions?.skilled_interventions?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="continuity" className="text-[10px] sm:text-xs gap-1 py-2">
                  <BookOpen className="w-3 h-3" />
                  <span className="hidden sm:inline">History</span> ({suggestions?.historical_continuity_prompts?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="careplans" className="text-[10px] sm:text-xs gap-1 py-2">
                  <ClipboardList className="w-3 h-3" />
                  <span className="hidden sm:inline">Goals</span> ({suggestions?.care_plan_alignment?.length || 0})
                </TabsTrigger>
                <TabsTrigger value="risks" className="text-[10px] sm:text-xs gap-1 py-2">
                  <AlertTriangle className="w-3 h-3" />
                  <span className="hidden sm:inline">Risks</span> ({suggestions?.risk_mitigation_notes?.length || 0})
                </TabsTrigger>
              </TabsList>

              {/* OASIS Clarifications Tab */}
              <TabsContent value="clarifications" className="space-y-2 max-h-64 overflow-y-auto">
                {suggestions?.oasis_clarifications?.length > 0 ? (
                  suggestions.oasis_clarifications.map((item, idx) => (
                    <div key={idx} className="p-2 bg-orange-50 rounded-lg border border-orange-200">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs font-mono">{item.item}</Badge>
                          <Badge className={`text-xs ${getPriorityColor(item.priority)}`}>
                            {item.priority}
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleCopy(item.suggested_documentation, `oasis-${idx}`)}
                          >
                            {copiedIndex === `oasis-${idx}` ? (
                              <CheckCircle2 className="w-3 h-3 text-green-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleInsert(item.suggested_documentation)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-orange-800 mb-1">{item.issue}</p>
                      {item.historical_context && (
                        <p className="text-[10px] text-blue-600 mb-1 italic">
                          📊 Context: {item.historical_context}
                        </p>
                      )}
                      <p className="text-xs text-gray-700 bg-white p-1.5 rounded border">
                        {item.suggested_documentation}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 text-center py-4">No OASIS clarifications needed</p>
                )}
              </TabsContent>

              {/* Patient Education Tab */}
              <TabsContent value="education" className="space-y-2 max-h-64 overflow-y-auto">
                {suggestions?.patient_education?.length > 0 ? (
                  suggestions.patient_education.map((edu, idx) => (
                    <div key={idx} className="p-2 bg-blue-50 rounded-lg border border-blue-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-blue-900">{edu.topic}</span>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleCopy(edu.content, `edu-${idx}`)}
                          >
                            {copiedIndex === `edu-${idx}` ? (
                              <CheckCircle2 className="w-3 h-3 text-green-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleInsert(`PATIENT EDUCATION: ${edu.topic}\n${edu.content}\nTeach-back: ${edu.teach_back_prompt}`, 'patient_education', edu.topic)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-700 mb-2">{edu.content}</p>
                      {edu.based_on_history && (
                        <p className="text-[10px] text-purple-600 mb-1 italic">
                          📚 Based on: {edu.based_on_history}
                        </p>
                      )}
                      <div className="bg-green-50 p-1.5 rounded border border-green-200">
                        <p className="text-xs text-green-800">
                          <strong>Teach-back:</strong> {edu.teach_back_prompt}
                        </p>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 text-center py-4">No education content generated</p>
                )}
              </TabsContent>

              {/* Skilled Interventions Tab */}
              <TabsContent value="interventions" className="space-y-2 max-h-64 overflow-y-auto">
                {suggestions?.skilled_interventions?.length > 0 ? (
                  suggestions.skilled_interventions.map((int, idx) => (
                    <div key={idx} className="p-2 bg-green-50 rounded-lg border border-green-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-green-900">{int.intervention}</span>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleCopy(int.documentation_template, `int-${idx}`)}
                          >
                            {copiedIndex === `int-${idx}` ? (
                              <CheckCircle2 className="w-3 h-3 text-green-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleInsert(int.documentation_template, 'skilled_intervention', int.intervention)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">
                        <strong>Rationale:</strong> {int.rationale}
                      </p>
                      {int.continuity_note && (
                        <p className="text-[10px] text-indigo-600 mb-1 italic">
                          🔄 Continuity: {int.continuity_note}
                        </p>
                      )}
                      <p className="text-xs text-gray-700 bg-white p-1.5 rounded border">
                        {int.documentation_template}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-gray-500 text-center py-4">No skilled interventions suggested</p>
                )}
              </TabsContent>

              {/* Historical Continuity Tab */}
              <TabsContent value="continuity" className="space-y-2 max-h-64 overflow-y-auto">
                {suggestions?.historical_continuity_prompts?.length > 0 ? (
                  suggestions.historical_continuity_prompts.map((item, idx) => (
                    <div key={idx} className="p-2 bg-indigo-50 rounded-lg border border-indigo-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-indigo-900">{item.prompt}</span>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleCopy(item.suggested_documentation, `cont-${idx}`)}
                          >
                            {copiedIndex === `cont-${idx}` ? (
                              <CheckCircle2 className="w-3 h-3 text-green-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleInsert(item.suggested_documentation)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">{item.context}</p>
                      <p className="text-xs text-gray-700 bg-white p-1.5 rounded border">
                       {item.suggested_documentation}
                      </p>
                      </div>
                      ))
                      ) : (
                      <p className="text-xs text-gray-500 text-center py-4">No historical continuity prompts available</p>
                      )}
                      </TabsContent>

              {/* Care Plan Alignment Tab */}
              <TabsContent value="careplans" className="space-y-2 max-h-64 overflow-y-auto">
                {suggestions?.care_plan_alignment?.length > 0 ? (
                  suggestions.care_plan_alignment.map((cp, idx) => (
                    <div key={idx} className="p-2 bg-teal-50 rounded-lg border border-teal-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-sm font-medium text-teal-900">{cp.care_plan_goal}</span>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleCopy(cp.documentation_template, `cp-${idx}`)}
                          >
                            {copiedIndex === `cp-${idx}` ? (
                              <CheckCircle2 className="w-3 h-3 text-green-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleInsert(cp.documentation_template, 'care_plan_alignment', cp.care_plan_goal)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-xs text-teal-700 mb-1">
                       <strong>Progress:</strong> {cp.progress_note}
                      </p>
                      <p className="text-xs text-gray-700 bg-white p-1.5 rounded border">
                       {cp.documentation_template}
                      </p>
                      </div>
                      ))
                      ) : (
                      <p className="text-xs text-gray-500 text-center py-4">No care plan alignment suggestions</p>
                      )}
                      </TabsContent>

              {/* Risk Mitigation Tab */}
              <TabsContent value="risks" className="space-y-2 max-h-64 overflow-y-auto">
                {suggestions?.risk_mitigation_notes?.length > 0 ? (
                  suggestions.risk_mitigation_notes.map((risk, idx) => (
                    <div key={idx} className="p-2 bg-red-50 rounded-lg border border-red-200">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-red-900">{risk.risk_area}</span>
                          <Badge className={getPriorityColor(risk.priority)}>
                            {risk.priority}
                          </Badge>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleCopy(risk.suggested_documentation, `risk-${idx}`)}
                          >
                            {copiedIndex === `risk-${idx}` ? (
                              <CheckCircle2 className="w-3 h-3 text-green-600" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 w-6 p-0"
                            onClick={() => handleInsert(risk.suggested_documentation, 'risk_mitigation', risk.risk_area)}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                      <p className="text-[10px] text-gray-600 mb-1">
                       Source: {risk.alert_source}
                      </p>
                      <p className="text-xs text-gray-700 bg-white p-1.5 rounded border">
                       {risk.suggested_documentation}
                      </p>
                      </div>
                      ))
                      ) : (
                      <p className="text-xs text-gray-500 text-center py-4">No risk mitigation notes needed</p>
                      )}
                      </TabsContent>
            </Tabs>
          )}

          {/* Quick Phrases */}
          {suggestions?.quick_phrases?.length > 0 && (
            <div className="mt-3 pt-3 border-t">
              <p className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                <Lightbulb className="w-3 h-3 text-yellow-500" />
                Quick Phrases
              </p>
              <div className="flex flex-wrap gap-1">
                {suggestions.quick_phrases.slice(0, 6).map((phrase, idx) => (
                  <Button
                    key={idx}
                    size="sm"
                    variant="outline"
                    className="h-6 text-xs"
                    onClick={() => handleInsert(phrase, 'quick_phrase', 'Quick Phrase')}
                  >
                    {phrase.length > 30 ? phrase.substring(0, 30) + '...' : phrase}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
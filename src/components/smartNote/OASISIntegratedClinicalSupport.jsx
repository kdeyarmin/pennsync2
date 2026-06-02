import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";


import {
  Brain,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  FileText,
  Activity,
  Stethoscope,
  ClipboardList,
  Lightbulb,
  Plus,
  Target,
  ChevronDown,
  ChevronUp,
  Zap,
  RefreshCw,
  BookOpen,
  Heart
} from "lucide-react";
import debounce from "lodash/debounce";

export default function OASISIntegratedClinicalSupport({
  patientId,
  patientName,
  noteContent,
  diagnosis,
  vitalSigns,
  carePlans = [],
  onInsertText,
  onCreateTask,
  onUpdateCarePlan,
  onDiscrepanciesFound
}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [activeTab, setActiveTab] = useState("discrepancies");
  const [appliedSuggestions, setAppliedSuggestions] = useState([]);

  const queryClient = useQueryClient();

  // Fetch patient's OASIS data
  const { data: patientOASIS = [] } = useQuery({
    queryKey: ['patientOASISData', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      return await base44.entities.OASISUpload.filter({ patient_id: patientId }, '-created_date', 5);
    },
    enabled: !!patientId
  });

  // Get most recent OASIS
  const latestOASIS = patientOASIS[0];
  const oasisPdgmData = latestOASIS?.pdgm_data;
  const oasisAnalysisResults = latestOASIS?.analysis_results;

  // Task creation mutation
  const createTaskMutation = useMutation({
    mutationFn: (taskData) => base44.entities.Task.create(taskData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
    },
  });

  // Care plan update mutation
  const updateCarePlanMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.CarePlan.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientCarePlans', patientId] });
    },
  });

  // Debounced analysis
  const runAnalysis = useCallback(
    debounce(async () => {
      if (!noteContent || noteContent.length < 50 || !oasisPdgmData) return;

      setIsAnalyzing(true);
      try {
        const response = await base44.integrations.Core.InvokeLLM({
          prompt: `You are an expert clinical decision support AI for home health. Analyze the current visit note against the patient's OASIS data to identify discrepancies, missing documentation, and recommend interventions.

PATIENT: ${patientName || 'Unknown'}
PRIMARY DIAGNOSIS: ${diagnosis || oasisPdgmData?.primary_diagnosis || 'Not specified'}

OASIS ASSESSMENT DATA:
- Assessment Date: ${latestOASIS?.assessment_date || 'Unknown'}
- Assessment Type: ${latestOASIS?.assessment_type || 'Unknown'}
- Primary Diagnosis: ${oasisPdgmData?.primary_diagnosis || 'Not specified'}
- Diagnosis Code: ${oasisPdgmData?.primary_diagnosis_code || 'N/A'}
- Comorbidities: ${oasisPdgmData?.comorbidities?.join(', ') || 'None documented'}
- Admission Source: ${oasisPdgmData?.admission_source || 'community'}
- Episode Timing: ${oasisPdgmData?.episode_timing || 'early'}

OASIS FUNCTIONAL SCORES:
${JSON.stringify(oasisPdgmData?.functional_scores || {}, null, 2)}

OASIS ANALYSIS ISSUES (from prior review):
${JSON.stringify(oasisAnalysisResults?.accuracy_issues?.slice(0, 5) || [], null, 2)}

ACTIVE CARE PLANS:
${carePlans?.filter(cp => cp.status === 'active').map(cp => `- ${cp.problem}: ${cp.goal}`).join('\n') || 'None'}

CURRENT VITAL SIGNS:
${JSON.stringify(vitalSigns || {}, null, 2)}

CURRENT VISIT NOTE:
${noteContent}

ANALYZE AND PROVIDE:

1. DISCREPANCIES: Compare the note content against OASIS data. Identify any inconsistencies between what's documented in the note vs. OASIS scores. For example:
   - Note says "patient ambulates independently" but OASIS M1860 = 3 (requires assistance)
   - Note describes assistance with bathing but OASIS M1830 = 0 (independent)
   - Diagnoses mentioned in note not captured in OASIS

2. MISSING OASIS-RELEVANT DOCUMENTATION: What clinical observations should be documented to support accurate OASIS scoring?
   - Functional status observations needed
   - Symptom documentation gaps
   - Safety/risk assessment needs

3. EVIDENCE-BASED INTERVENTIONS: Based on the patient's conditions and current status, recommend:
   - Clinical interventions appropriate for documented conditions
   - Patient education topics
   - Safety measures
   - Coordination of care needs

4. CARE PLAN RECOMMENDATIONS: Suggest care plan updates based on current findings

Return JSON:
{
  "summary": "Brief overall assessment",
  "risk_level": "high/medium/low",
  "discrepancies": [
    {
      "id": "unique_id",
      "type": "functional_mismatch|diagnosis_gap|score_inconsistency|documentation_conflict",
      "oasis_item": "M-item if applicable",
      "oasis_value": "what OASIS shows",
      "note_observation": "what the note says",
      "severity": "critical|high|medium|low",
      "explanation": "detailed explanation",
      "resolution": "how to resolve",
      "suggested_text": "exact text to add to note if applicable",
      "pdgm_impact": "potential payment impact"
    }
  ],
  "missing_documentation": [
    {
      "id": "unique_id",
      "category": "functional_status|clinical_assessment|safety|homebound|skilled_need",
      "oasis_relevance": "which OASIS items this supports",
      "what_to_document": "specific observation needed",
      "suggested_text": "example documentation text",
      "priority": "required|recommended|optional",
      "rationale": "why this matters for OASIS"
    }
  ],
  "interventions": [
    {
      "id": "unique_id",
      "type": "clinical|education|safety|coordination|monitoring",
      "intervention": "specific intervention",
      "rationale": "evidence-based rationale",
      "frequency": "how often",
      "documentation_text": "text to add to note",
      "task_title": "title for follow-up task if needed",
      "task_description": "description for task",
      "priority": "urgent|high|routine"
    }
  ],
  "care_plan_recommendations": [
    {
      "id": "unique_id",
      "action": "add|modify|resolve",
      "problem": "clinical problem",
      "goal": "measurable goal",
      "interventions": ["list of interventions"],
      "rationale": "why this is recommended",
      "related_oasis_items": ["M-items"]
    }
  ],
  "quick_wins": [
    "List of 3-5 immediate simple improvements"
  ]
}`,
          response_json_schema: {
            type: "object",
            properties: {
              summary: { type: "string" },
              risk_level: { type: "string" },
              discrepancies: { type: "array", items: { type: "object" } },
              missing_documentation: { type: "array", items: { type: "object" } },
              interventions: { type: "array", items: { type: "object" } },
              care_plan_recommendations: { type: "array", items: { type: "object" } },
              quick_wins: { type: "array", items: { type: "string" } }
            }
          }
        });

        setAnalysis(response);
        
        // Notify parent of discrepancies for AI Documentation Suggester
        if (response?.discrepancies && onDiscrepanciesFound) {
          onDiscrepanciesFound(response.discrepancies);
        }
      } catch (err) {
        console.error("Clinical support analysis error:", err);
      }
      setIsAnalyzing(false);
    }, 2000),
    [noteContent, oasisPdgmData, diagnosis, vitalSigns, carePlans, patientName, onDiscrepanciesFound]
  );

  // Auto-analyze when content changes significantly
  useEffect(() => {
    if (noteContent && noteContent.length >= 50 && oasisPdgmData) {
      runAnalysis();
    }
  }, [noteContent, oasisPdgmData]);

  const handleInsertSuggestion = (id, text) => {
    onInsertText?.(text);
    setAppliedSuggestions(prev => [...prev, id]);
  };

  const handleCreateTask = async (intervention) => {
    try {
      await createTaskMutation.mutateAsync({
        patient_id: patientId,
        title: intervention.task_title || intervention.intervention,
        description: intervention.task_description || intervention.rationale,
        type: intervention.type === 'clinical' ? 'followup' : 
              intervention.type === 'safety' ? 'safety' : 'other',
        priority: intervention.priority === 'urgent' ? 'high' : 
                  intervention.priority === 'high' ? 'high' : 'medium',
        source: 'ai_generated',
        ai_reason: `Based on OASIS-integrated clinical decision support: ${intervention.rationale}`,
        status: 'pending',
        due_date: new Date(Date.now() + (intervention.priority === 'urgent' ? 1 : 3) * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
      });
      setAppliedSuggestions(prev => [...prev, intervention.id + '_task']);
      onCreateTask?.(intervention);
    } catch (err) {
      console.error("Error creating task:", err);
    }
  };

  const handleAddCarePlan = async (recommendation) => {
    // This would trigger the care plan creation flow
    onUpdateCarePlan?.(recommendation);
    setAppliedSuggestions(prev => [...prev, recommendation.id + '_careplan']);
  };

  const getRiskBadge = (level) => {
    const styles = {
      high: 'bg-red-600 text-white',
      medium: 'bg-yellow-500 text-white',
      low: 'bg-green-600 text-white'
    };
    return styles[level] || 'bg-slate-500 text-white';
  };

  const getSeverityColor = (severity) => {
    const colors = {
      critical: 'border-red-500 bg-red-50',
      high: 'border-orange-400 bg-orange-50',
      medium: 'border-yellow-400 bg-yellow-50',
      low: 'border-blue-400 bg-blue-50'
    };
    return colors[severity] || 'border-slate-300 bg-slate-50';
  };

  const getPriorityBadge = (priority) => {
    const styles = {
      required: 'bg-red-100 text-red-800',
      recommended: 'bg-yellow-100 text-yellow-800',
      optional: 'bg-blue-100 text-blue-800',
      urgent: 'bg-red-600 text-white',
      high: 'bg-orange-100 text-orange-800',
      routine: 'bg-green-100 text-green-800'
    };
    return styles[priority] || 'bg-slate-100 text-slate-800';
  };

  if (!patientId || !oasisPdgmData) {
    return null;
  }

  const totalIssues = (analysis?.discrepancies?.length || 0) + 
                      (analysis?.missing_documentation?.length || 0);

  return (
    <Card className={`border-2 ${analysis?.risk_level === 'high' ? 'border-red-300' : 'border-purple-200'}`}>
      <CardHeader 
        className={`pb-2 cursor-pointer ${
          analysis?.risk_level === 'high' 
            ? 'bg-gradient-to-r from-red-50 to-orange-50' 
            : 'bg-gradient-to-r from-purple-50 to-indigo-50'
        }`}
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-purple-600" />
            OASIS-Integrated Clinical Support
            {latestOASIS && (
              <Badge variant="outline" className="text-xs">
                OASIS: {latestOASIS.assessment_type} {latestOASIS.assessment_date}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-2">
            {analysis?.risk_level && (
              <Badge className={getRiskBadge(analysis.risk_level)}>
                {analysis.risk_level} risk
              </Badge>
            )}
            {totalIssues > 0 && (
              <Badge variant="outline" className="bg-white">
                {totalIssues} findings
              </Badge>
            )}
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-3 space-y-3">
          {isAnalyzing ? (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-slate-500">
              <Loader2 className="w-4 h-4 animate-spin" />
              Analyzing note against OASIS data...
            </div>
          ) : !analysis ? (
            <div className="text-center py-4">
              <p className="text-sm text-slate-500 mb-3">
                {noteContent && noteContent.length >= 50 
                  ? "Ready to analyze your note against OASIS data"
                  : "Add more content to your note to enable OASIS comparison"}
              </p>
              {noteContent && noteContent.length >= 50 && (
                <Button size="sm" onClick={() => runAnalysis()} className="bg-purple-600 hover:bg-purple-700">
                  <Brain className="w-4 h-4 mr-2" /> Analyze Now
                </Button>
              )}
            </div>
          ) : (
            <>
              {/* Summary */}
              <Alert className={`${analysis.risk_level === 'high' ? 'bg-red-50 border-red-200' : 'bg-purple-50 border-purple-200'}`}>
                <Brain className={`w-4 h-4 ${analysis.risk_level === 'high' ? 'text-red-600' : 'text-purple-600'}`} />
                <AlertDescription className={analysis.risk_level === 'high' ? 'text-red-800' : 'text-purple-800'}>
                  {analysis.summary}
                </AlertDescription>
              </Alert>

              {/* Quick Wins */}
              {analysis.quick_wins?.length > 0 && (
                <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                  <p className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1">
                    <Zap className="w-3 h-3" /> Quick Wins
                  </p>
                  <ul className="space-y-1">
                    {analysis.quick_wins.map((win, idx) => (
                      <li key={idx} className="text-xs text-green-700 flex items-start gap-1">
                        <CheckCircle2 className="w-3 h-3 mt-0.5 flex-shrink-0" />
                        {win}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Tabs for different categories */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="discrepancies" className="text-xs gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    <span className="hidden sm:inline">Discrepancies</span>
                    {analysis.discrepancies?.length > 0 && (
                      <Badge variant="outline" className="ml-1 h-4 px-1 text-xs">
                        {analysis.discrepancies.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="missing" className="text-xs gap-1">
                    <FileText className="w-3 h-3" />
                    <span className="hidden sm:inline">Missing</span>
                    {analysis.missing_documentation?.length > 0 && (
                      <Badge variant="outline" className="ml-1 h-4 px-1 text-xs">
                        {analysis.missing_documentation.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="interventions" className="text-xs gap-1">
                    <Stethoscope className="w-3 h-3" />
                    <span className="hidden sm:inline">Interventions</span>
                    {analysis.interventions?.length > 0 && (
                      <Badge variant="outline" className="ml-1 h-4 px-1 text-xs">
                        {analysis.interventions.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                  <TabsTrigger value="careplan" className="text-xs gap-1">
                    <Target className="w-3 h-3" />
                    <span className="hidden sm:inline">Care Plan</span>
                    {analysis.care_plan_recommendations?.length > 0 && (
                      <Badge variant="outline" className="ml-1 h-4 px-1 text-xs">
                        {analysis.care_plan_recommendations.length}
                      </Badge>
                    )}
                  </TabsTrigger>
                </TabsList>

                {/* Discrepancies Tab */}
                <TabsContent value="discrepancies" className="mt-3 space-y-2">
                  {analysis.discrepancies?.length > 0 ? (
                    analysis.discrepancies.map((disc) => (
                      <div 
                        key={disc.id} 
                        className={`p-3 rounded-lg border-l-4 ${getSeverityColor(disc.severity)}`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs capitalize">{disc.type.replace(/_/g, ' ')}</Badge>
                            {disc.oasis_item && (
                              <Badge className="bg-purple-100 text-purple-800 text-xs">{disc.oasis_item}</Badge>
                            )}
                            <Badge className={getPriorityBadge(disc.severity)}>{disc.severity}</Badge>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                          <div className="bg-white p-2 rounded border">
                            <p className="text-slate-500 mb-1">OASIS Shows:</p>
                            <p className="text-slate-800 font-medium">{disc.oasis_value}</p>
                          </div>
                          <div className="bg-white p-2 rounded border">
                            <p className="text-slate-500 mb-1">Note Says:</p>
                            <p className="text-slate-800 font-medium">{disc.note_observation}</p>
                          </div>
                        </div>

                        <p className="text-xs text-slate-700 mb-2">{disc.explanation}</p>
                        
                        {disc.pdgm_impact && (
                          <p className="text-xs text-green-700 mb-2">
                            💰 PDGM Impact: {disc.pdgm_impact}
                          </p>
                        )}

                        <div className="flex items-center gap-2">
                          <p className="text-xs text-blue-700 flex-1">
                            <span className="font-medium">Resolution:</span> {disc.resolution}
                          </p>
                          {disc.suggested_text && !appliedSuggestions.includes(disc.id) && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="h-7 text-xs"
                              onClick={() => handleInsertSuggestion(disc.id, disc.suggested_text)}
                            >
                              <Plus className="w-3 h-3 mr-1" /> Add to Note
                            </Button>
                          )}
                          {appliedSuggestions.includes(disc.id) && (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Added
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <AlertDescription className="text-green-800 text-sm">
                        No discrepancies found between your note and OASIS data.
                      </AlertDescription>
                    </Alert>
                  )}
                </TabsContent>

                {/* Missing Documentation Tab */}
                <TabsContent value="missing" className="mt-3 space-y-2">
                  {analysis.missing_documentation?.length > 0 ? (
                    analysis.missing_documentation.map((doc) => (
                      <div key={doc.id} className="p-3 bg-slate-50 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-xs capitalize">{(doc.category || '').replace(/_/g, ' ')}</Badge>
                            <Badge className={getPriorityBadge(doc.priority)}>{doc.priority}</Badge>
                          </div>
                          {doc.oasis_relevance && (
                            <Badge className="bg-purple-100 text-purple-800 text-xs">
                              Supports: {doc.oasis_relevance}
                            </Badge>
                          )}
                        </div>
                        
                        <p className="text-sm font-medium text-slate-800 mb-1">{doc.what_to_document}</p>
                        <p className="text-xs text-slate-600 mb-2">{doc.rationale}</p>
                        
                        {doc.suggested_text && (
                          <div className="bg-blue-50 p-2 rounded border border-blue-200 mb-2">
                            <p className="text-xs text-blue-700 italic">"{doc.suggested_text}"</p>
                          </div>
                        )}

                        {doc.suggested_text && !appliedSuggestions.includes(doc.id) && (
                          <Button 
                            size="sm" 
                            className="w-full bg-blue-600 hover:bg-blue-700 h-7 text-xs"
                            onClick={() => handleInsertSuggestion(doc.id, doc.suggested_text)}
                          >
                            <Plus className="w-3 h-3 mr-1" /> Insert Documentation
                          </Button>
                        )}
                        {appliedSuggestions.includes(doc.id) && (
                          <Badge className="bg-green-100 text-green-800 text-xs w-full justify-center py-1">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Added to Note
                          </Badge>
                        )}
                      </div>
                    ))
                  ) : (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <AlertDescription className="text-green-800 text-sm">
                        No critical documentation gaps identified.
                      </AlertDescription>
                    </Alert>
                  )}
                </TabsContent>

                {/* Interventions Tab */}
                <TabsContent value="interventions" className="mt-3 space-y-2">
                  {analysis.interventions?.length > 0 ? (
                    analysis.interventions.map((int) => (
                      <div key={int.id} className="p-3 bg-slate-50 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {int.type === 'clinical' && <Stethoscope className="w-4 h-4 text-blue-600" />}
                            {int.type === 'education' && <BookOpen className="w-4 h-4 text-green-600" />}
                            {int.type === 'safety' && <AlertTriangle className="w-4 h-4 text-orange-600" />}
                            {int.type === 'monitoring' && <Activity className="w-4 h-4 text-purple-600" />}
                            {int.type === 'coordination' && <Heart className="w-4 h-4 text-pink-600" />}
                            <span className="text-sm font-medium">{int.intervention}</span>
                          </div>
                          <Badge className={getPriorityBadge(int.priority)}>{int.priority}</Badge>
                        </div>
                        
                        <p className="text-xs text-slate-600 mb-2">{int.rationale}</p>
                        {int.frequency && (
                          <p className="text-xs text-purple-700 mb-2">
                            <span className="font-medium">Frequency:</span> {int.frequency}
                          </p>
                        )}

                        <div className="flex gap-2">
                          {int.documentation_text && !appliedSuggestions.includes(int.id) && (
                            <Button 
                              size="sm" 
                              variant="outline"
                              className="h-7 text-xs flex-1"
                              onClick={() => handleInsertSuggestion(int.id, int.documentation_text)}
                            >
                              <Plus className="w-3 h-3 mr-1" /> Document
                            </Button>
                          )}
                          {int.task_title && !appliedSuggestions.includes(int.id + '_task') && (
                            <Button 
                              size="sm" 
                              className="h-7 text-xs flex-1 bg-amber-600 hover:bg-amber-700"
                              onClick={() => handleCreateTask(int)}
                            >
                              <ClipboardList className="w-3 h-3 mr-1" /> Create Task
                            </Button>
                          )}
                          {(appliedSuggestions.includes(int.id) || appliedSuggestions.includes(int.id + '_task')) && (
                            <Badge className="bg-green-100 text-green-800 text-xs">
                              <CheckCircle2 className="w-3 h-3 mr-1" /> Applied
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <Alert className="bg-blue-50 border-blue-200">
                      <Lightbulb className="w-4 h-4 text-blue-600" />
                      <AlertDescription className="text-blue-800 text-sm">
                        No additional interventions recommended at this time.
                      </AlertDescription>
                    </Alert>
                  )}
                </TabsContent>

                {/* Care Plan Tab */}
                <TabsContent value="careplan" className="mt-3 space-y-2">
                  {analysis.care_plan_recommendations?.length > 0 ? (
                    analysis.care_plan_recommendations.map((rec) => (
                      <div key={rec.id} className="p-3 bg-slate-50 rounded-lg border">
                        <div className="flex items-center justify-between mb-2">
                          <Badge className={
                            rec.action === 'add' ? 'bg-green-100 text-green-800' :
                            rec.action === 'modify' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }>
                            {rec.action === 'add' ? 'New Care Plan' : 
                             rec.action === 'modify' ? 'Update Existing' : 'Consider Resolving'}
                          </Badge>
                          {rec.related_oasis_items?.length > 0 && (
                            <div className="flex gap-1">
                              {rec.related_oasis_items.slice(0, 3).map((item, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{item}</Badge>
                              ))}
                            </div>
                          )}
                        </div>
                        
                        <p className="text-sm font-medium text-slate-800 mb-1">
                          Problem: {rec.problem}
                        </p>
                        <p className="text-xs text-green-700 mb-2">
                          <span className="font-medium">Goal:</span> {rec.goal}
                        </p>
                        
                        {rec.interventions?.length > 0 && (
                          <div className="mb-2">
                            <p className="text-xs font-medium text-slate-600 mb-1">Interventions:</p>
                            <ul className="text-xs text-slate-700 list-disc list-inside">
                              {rec.interventions.slice(0, 3).map((int, i) => (
                                <li key={i}>{int}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <p className="text-xs text-slate-500 italic mb-2">{rec.rationale}</p>

                        {!appliedSuggestions.includes(rec.id + '_careplan') && (
                          <Button 
                            size="sm" 
                            className="w-full bg-purple-600 hover:bg-purple-700 h-7 text-xs"
                            onClick={() => handleAddCarePlan(rec)}
                          >
                            <Target className="w-3 h-3 mr-1" /> 
                            {rec.action === 'add' ? 'Add Care Plan' : 'Update Care Plan'}
                          </Button>
                        )}
                        {appliedSuggestions.includes(rec.id + '_careplan') && (
                          <Badge className="bg-green-100 text-green-800 text-xs w-full justify-center py-1">
                            <CheckCircle2 className="w-3 h-3 mr-1" /> Care Plan Updated
                          </Badge>
                        )}
                      </div>
                    ))
                  ) : (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <AlertDescription className="text-green-800 text-sm">
                        Current care plans appear appropriate for documented conditions.
                      </AlertDescription>
                    </Alert>
                  )}
                </TabsContent>
              </Tabs>

              {/* Refresh button */}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => runAnalysis()}
                className="w-full"
                disabled={isAnalyzing}
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${isAnalyzing ? 'animate-spin' : ''}`} />
                Re-analyze Against OASIS
              </Button>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
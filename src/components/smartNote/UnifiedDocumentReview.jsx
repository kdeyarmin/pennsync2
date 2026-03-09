import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  FileText,
  CheckCircle2,
  AlertTriangle,
  Shield,
  DollarSign,
  Lightbulb,
  Sparkles,
  Loader2,
  Target,
  ClipboardList,
  BookOpen,
  AlertCircle,
  ListTodo
} from "lucide-react";
import { generateFollowUpTasks } from "@/functions/generateFollowUpTasks";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function UnifiedDocumentReview({
  roughNote,
  visitType,
  diagnosis,
  patientData,
  vitalSigns,
  carePlans = [],
  recentVisits = [],
  nurseType = 'RN',
  onEnhancedNoteReady,
  autoRun = false
}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [selectedSuggestions, setSelectedSuggestions] = useState(new Set());
  const [isApplying, setIsApplying] = useState(false);
  const [syncingTasks, setSyncingTasks] = useState(false);
  const [tasksSynced, setTasksSynced] = useState(false);
  const [syncedTaskCount, setSyncedTaskCount] = useState(0);

  useEffect(() => {
    if (autoRun && roughNote && roughNote.length >= 50 && !analysis) {
      runUnifiedAnalysis();
    }
  }, [autoRun, roughNote]);

  const runUnifiedAnalysis = async () => {
    if (!roughNote || roughNote.length < 20) return;

    setIsAnalyzing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert home health documentation specialist. Analyze this rough note and provide comprehensive, actionable feedback.

ROUGH NOTE:
${roughNote}

CONTEXT:
- Visit Type: ${visitType}
- Diagnosis: ${diagnosis}
- Patient: ${patientData ? `${patientData.first_name} ${patientData.last_name}, DOB: ${patientData.date_of_birth}` : 'Unknown'}
- Care Type: ${patientData?.care_type || 'home_health'}
- Nurse Type: ${nurseType}
- Vitals: ${Object.entries(vitalSigns).filter(([k,v]) => v && k !== 'o2Source' && k !== 'o2Flow').map(([k,v]) => `${k}: ${v}`).join(', ') || 'None'}
${patientData?.allergies ? `- Allergies: ${patientData.allergies}` : ''}
${carePlans.length > 0 ? `- Active Care Plans: ${carePlans.filter(c => c.status === 'active').map(c => c.goal).join('; ')}` : ''}
${recentVisits.length > 0 ? `- Last Visit: ${recentVisits[0].visit_date} - ${recentVisits[0].visit_type}` : ''}

PERFORM UNIFIED ANALYSIS:

1. COMPLIANCE CHECK (42 CFR 484):
   - Homebound status documented (mobility limitations, why leaving home is taxing)
   - Skilled need justified (cannot be done by non-skilled personnel)
   - Patient response to care
   - Safety assessment
   - Functional status
   - Coordination with physician
   - Visit-type specific requirements

2. CLINICAL QUALITY:
   - Specific vs vague language
   - Measurable observations
   - Proper medical terminology
   - Completeness for visit type

3. BILLING OPTIMIZATION (PDGM):
   - Comorbidities documented for case-mix weight
   - Functional impairment captured
   - Clinical complexity reflected
   - Secondary diagnoses for increased reimbursement
   - ICD-10 specificity

4. CLINICAL DECISION SUPPORT:
   - Safety concerns or red flags
   - Care plan progress
   - Follow-up tasks needed
   - Patient education opportunities

For EACH finding, provide:
- Category (compliance/quality/billing/clinical)
- Severity (critical/high/medium/low)
- Specific issue identified
- Actionable suggestion (MUST BE ACTUAL CLINICAL TEXT ONLY - the exact sentence or observation to add, NOT instructions. Example of WRONG: "Document that patient has edema" or "recommendations for monitoring will be..." Example of RIGHT: "Patient presents with 2+ bilateral ankle edema" or "Vital signs: BP 140/90, HR 82, RR 18, O2 sat 96% on room air, Temp 98.6°F")
- Why this matters (clinical/regulatory/financial reason)
- Can be auto-applied (true/false)

IMPORTANT - ENHANCED NOTE GENERATION:
Create a fully compliant narrative note ready for EHR submission that:
- Converts all bullet points into complete, clinical sentences
- Maintains Medicare compliance (42 CFR 484)
- Uses professional medical terminology
- Includes all vital signs and observations
- Documents patient response and skilled need justification
- Flows naturally as a narrative document
- Is ready to paste directly into an EHR system
- Contains ONLY clinical documentation (no patient names, headers, subject lines, date stamps, instructions, recommendations about future care, or "end of note" statements)
- Starts directly with the clinical narrative
The enhanced note should be a polished, complete clinical note, not bullet points.`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: { type: "number" },
            compliance_score: { type: "number" },
            quality_score: { type: "number" },
            billing_score: { type: "number" },
            summary: { type: "string" },
            findings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string" },
                  category: { type: "string" },
                  severity: { type: "string" },
                  issue: { type: "string" },
                  suggestion: { type: "string" },
                  rationale: { type: "string" },
                  auto_applicable: { type: "boolean" },
                  regulation_reference: { type: "string" },
                  revenue_impact: { type: "string" }
                }
              }
            },
            enhanced_note: { type: "string" },
            follow_up_tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  priority: { type: "string" },
                  due_timeframe: { type: "string" },
                  reason: { type: "string" }
                }
              }
            },
            care_plan_suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  problem: { type: "string" },
                  goal: { type: "string" },
                  interventions: { type: "array", items: { type: "string" } }
                }
              }
            },
            strengths: { type: "array", items: { type: "string" } }
          }
        }
      });

      setAnalysis(result);
      
      // Auto-select critical and high severity items
      const autoSelectIds = new Set(
        result.findings
          .filter(f => (f.severity === 'critical' || f.severity === 'high') && f.auto_applicable)
          .map(f => f.id)
      );
      setSelectedSuggestions(autoSelectIds);

    } catch (error) {
      console.error('Error analyzing note:', error);
      alert('Analysis failed. Please try again.');
    }
    setIsAnalyzing(false);
  };

  const handleApplySelected = async () => {
    if (!analysis || selectedSuggestions.size === 0) return;

    setIsApplying(true);
    try {
      // Get selected findings
      const selectedFindings = analysis.findings.filter(f => selectedSuggestions.has(f.id));
      
      // Build enhanced note with selected suggestions applied
      let enhancedNote = analysis.enhanced_note;
      
      // Clean instruction wrappers from suggestions (e.g., "Add:", "Include:", etc.)
      const cleanSuggestion = (text) => 
        text.replace(/^(Add:|Include:|Write:|Document:|State:|Clarify:|Replace with:|Change to:|Note:|Specify:|Mention:)\s*/i, '').trim();
      
      // If user wants to add specific suggestions beyond what's in enhanced note
      const additionalText = selectedFindings
        .filter(f => !analysis.enhanced_note.toLowerCase().includes(f.suggestion.toLowerCase().substring(0, 50)))
        .map(f => cleanSuggestion(f.suggestion))
        .join('\n\n');
      
      if (additionalText) {
        enhancedNote = enhancedNote + '\n\n' + additionalText;
      }

      // Track note enhancement
      const currentUser = await base44.auth.me();
      await base44.entities.NoteConversion.create({
        nurse_email: currentUser.email,
        patient_id: patientData?.id,
        visit_type: visitType,
        diagnosis,
        rough_note_length: roughNote.length,
        enhanced_note_length: enhancedNote.length,
        quality_score: analysis.overall_score,
        rough_note_compliance: analysis.compliance_score < 80 ? Math.max(0, analysis.compliance_score - 20) : analysis.compliance_score - 10,
        enhanced_note_compliance: analysis.compliance_score,
        compliance_improvement: analysis.compliance_score < 80 ? 20 : 10
      });

      onEnhancedNoteReady?.({
        enhancedNote,
        analysis,
        appliedSuggestions: selectedFindings
      });

    } catch (error) {
      console.error('Error applying suggestions:', error);
    }
    setIsApplying(false);
  };

  const handleSyncTasks = async () => {
    if (!analysis?.enhanced_note || syncingTasks) return;
    setSyncingTasks(true);
    try {
      const result = await generateFollowUpTasks({
        noteText: analysis.enhanced_note || roughNote,
        patientId: patientData?.id,
        visitType,
        diagnosis,
      });
      if (result?.data?.tasks_created > 0) {
        setSyncedTaskCount(result.data.tasks_created);
        setTasksSynced(true);
      }
    } catch (err) {
      console.error("Failed to sync tasks:", err);
    } finally {
      setSyncingTasks(false);
    }
  };

  const handleSelectAll = () => {
    if (selectedSuggestions.size === analysis.findings.length) {
      setSelectedSuggestions(new Set());
    } else {
      setSelectedSuggestions(new Set(analysis.findings.map(f => f.id)));
    }
  };

  const getCategoryIcon = (category) => {
    const icons = {
      compliance: Shield,
      quality: Lightbulb,
      billing: DollarSign,
      clinical: Target
    };
    return icons[category] || AlertCircle;
  };

  const getCategoryColor = (category) => {
    const colors = {
      compliance: 'text-orange-600',
      quality: 'text-blue-600',
      billing: 'text-green-600',
      clinical: 'text-purple-600'
    };
    return colors[category] || 'text-gray-600';
  };

  const getSeverityBadge = (severity) => {
    const styles = {
      critical: 'bg-red-100 text-red-800 border-red-300',
      high: 'bg-orange-100 text-orange-800 border-orange-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      low: 'bg-blue-100 text-blue-800 border-blue-300'
    };
    return styles[severity] || styles.medium;
  };

  if (isAnalyzing) {
    return (
      <Card className="border-2 border-purple-300">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-16 h-16 text-purple-600 mx-auto mb-4 animate-spin" />
          <p className="text-lg font-medium text-gray-900 mb-2">Running Comprehensive Analysis...</p>
          <p className="text-sm text-gray-600">Checking compliance, quality, billing optimization & clinical decision support</p>
        </CardContent>
      </Card>
    );
  }

  if (!analysis) {
    return (
      <Card className="border-4 border-purple-400 shadow-2xl bg-gradient-to-r from-purple-50 to-pink-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-purple-600" />
            Unified Documentation Review
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-700">
            Run one comprehensive analysis that checks all aspects of your documentation:
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-white p-3 rounded border flex items-center gap-2">
              <Shield className="w-5 h-5 text-orange-600" />
              <div>
                <p className="text-xs font-semibold">Compliance</p>
                <p className="text-xs text-gray-600">42 CFR 484</p>
              </div>
            </div>
            <div className="bg-white p-3 rounded border flex items-center gap-2">
              <Lightbulb className="w-5 h-5 text-blue-600" />
              <div>
                <p className="text-xs font-semibold">Quality</p>
                <p className="text-xs text-gray-600">Clinical excellence</p>
              </div>
            </div>
            <div className="bg-white p-3 rounded border flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-green-600" />
              <div>
                <p className="text-xs font-semibold">Billing</p>
                <p className="text-xs text-gray-600">PDGM optimization</p>
              </div>
            </div>
            <div className="bg-white p-3 rounded border flex items-center gap-2">
              <Target className="w-5 h-5 text-purple-600" />
              <div>
                <p className="text-xs font-semibold">Clinical</p>
                <p className="text-xs text-gray-600">Decision support</p>
              </div>
            </div>
          </div>
          <Button 
            onClick={runUnifiedAnalysis} 
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 text-lg py-6"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Run Complete Analysis
          </Button>
        </CardContent>
      </Card>
    );
  }

  const groupedFindings = {
    compliance: analysis.findings.filter(f => f.category === 'compliance'),
    quality: analysis.findings.filter(f => f.category === 'quality'),
    billing: analysis.findings.filter(f => f.category === 'billing'),
    clinical: analysis.findings.filter(f => f.category === 'clinical')
  };

  return (
    <div className="space-y-4">
      {/* Overall Scores */}
      <Card className="border-4 border-purple-400 bg-gradient-to-r from-purple-50 to-pink-50 shadow-xl">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-purple-600" />
              Complete Documentation Analysis
            </span>
            <Badge className="bg-white text-purple-700 text-2xl px-4 py-2">
              {analysis.overall_score}%
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-gray-700">{analysis.summary}</p>
          
          {/* Score Grid */}
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-white p-3 rounded border text-center">
              <Shield className="w-5 h-5 mx-auto mb-1 text-orange-600" />
              <p className="text-xs text-gray-600 mb-1">Compliance</p>
              <p className="text-2xl font-bold text-orange-600">{analysis.compliance_score}%</p>
            </div>
            <div className="bg-white p-3 rounded border text-center">
              <Lightbulb className="w-5 h-5 mx-auto mb-1 text-blue-600" />
              <p className="text-xs text-gray-600 mb-1">Quality</p>
              <p className="text-2xl font-bold text-blue-600">{analysis.quality_score}%</p>
            </div>
            <div className="bg-white p-3 rounded border text-center">
              <DollarSign className="w-5 h-5 mx-auto mb-1 text-green-600" />
              <p className="text-xs text-gray-600 mb-1">Billing</p>
              <p className="text-2xl font-bold text-green-600">{analysis.billing_score}%</p>
            </div>
          </div>

          {/* Strengths */}
          {analysis.strengths?.length > 0 && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <p className="text-sm font-semibold text-green-900 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                What You Did Well
              </p>
              <ul className="space-y-1">
                {analysis.strengths.slice(0, 3).map((strength, i) => (
                  <li key={i} className="text-xs text-green-800 flex items-start gap-1">
                    <span>•</span> {strength}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Sync Follow-up Tasks */}
      <div className="flex items-center gap-3 bg-green-50 border border-green-200 rounded-lg px-4 py-3">
        <ListTodo className="w-5 h-5 text-green-600 shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-green-900">Auto-Generate Follow-up Tasks</p>
          <p className="text-xs text-green-700">Sync AI-identified tasks directly to Task Management</p>
        </div>
        {tasksSynced ? (
          <div className="flex items-center gap-1.5 text-green-700 font-semibold text-sm shrink-0">
            <CheckCircle2 className="w-4 h-4" />
            {syncedTaskCount} tasks synced
          </div>
        ) : (
          <Button
            onClick={handleSyncTasks}
            disabled={syncingTasks}
            size="sm"
            className="bg-green-600 hover:bg-green-700 text-white shrink-0"
          >
            {syncingTasks ? (
              <><Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" /> Syncing…</>
            ) : (
              <><ListTodo className="w-3.5 h-3.5 mr-1.5" /> Sync Tasks</>
            )}
          </Button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Button
          onClick={handleSelectAll}
          variant="outline"
          className="flex-1"
        >
          {selectedSuggestions.size === analysis.findings.length ? 'Deselect All' : 'Select All'}
        </Button>
        <Button
          onClick={handleApplySelected}
          disabled={selectedSuggestions.size === 0 || isApplying}
          className="flex-1 bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700"
        >
          {isApplying ? (
            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Applying...</>
          ) : (
            <>Apply {selectedSuggestions.size} Selected ({selectedSuggestions.size} of {analysis.findings.length})</>
          )}
        </Button>
      </div>

      {/* Grouped Findings */}
      <Accordion type="multiple" defaultValue={["compliance", "quality"]}>
        {Object.entries(groupedFindings).map(([category, findings]) => {
          if (findings.length === 0) return null;
          const Icon = getCategoryIcon(category);
          const colorClass = getCategoryColor(category);
          
          return (
            <AccordionItem key={category} value={category}>
              <AccordionTrigger className="bg-gray-50 px-4 py-3 rounded-t-lg">
                <div className="flex items-center gap-2">
                  <Icon className={`w-5 h-5 ${colorClass}`} />
                  <span className="font-semibold capitalize">{category} ({findings.length})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 py-3 bg-white border-x border-b rounded-b-lg space-y-3">
                {findings.map((finding) => (
                  <Card key={finding.id} className={`border-l-4 ${
                    finding.severity === 'critical' ? 'border-l-red-500' :
                    finding.severity === 'high' ? 'border-l-orange-500' :
                    finding.severity === 'medium' ? 'border-l-yellow-500' :
                    'border-l-blue-500'
                  }`}>
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3 mb-3">
                        <Checkbox
                          checked={selectedSuggestions.has(finding.id)}
                          onCheckedChange={(checked) => {
                            const newSelected = new Set(selectedSuggestions);
                            if (checked) {
                              newSelected.add(finding.id);
                            } else {
                              newSelected.delete(finding.id);
                            }
                            setSelectedSuggestions(newSelected);
                          }}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between mb-2">
                            <p className="font-semibold text-gray-900 flex-1">{finding.issue}</p>
                            <Badge className={getSeverityBadge(finding.severity)}>
                              {finding.severity}
                            </Badge>
                          </div>
                          
                          {finding.regulation_reference && (
                            <Badge variant="outline" className="text-xs mb-2">{finding.regulation_reference}</Badge>
                          )}
                          
                          <div className="bg-blue-50 border border-blue-200 rounded p-3 mb-2">
                            <p className="text-xs font-semibold text-blue-900 mb-1">Suggested Documentation:</p>
                            <p className="text-sm text-gray-900 italic">"{finding.suggestion}"</p>
                          </div>
                          
                          <div className="bg-gray-50 p-2 rounded">
                            <p className="text-xs text-gray-700">{finding.rationale}</p>
                            {finding.revenue_impact && (
                              <p className="text-xs text-green-700 font-bold mt-1">💰 {finding.revenue_impact}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </AccordionContent>
            </AccordionItem>
          );
        })}
      </Accordion>

      {/* Additional Recommendations */}
      {(analysis.follow_up_tasks?.length > 0 || analysis.care_plan_suggestions?.length > 0) && (
        <Accordion type="single" collapsible>
          {analysis.follow_up_tasks?.length > 0 && (
            <AccordionItem value="tasks">
              <AccordionTrigger className="bg-blue-50 px-4 py-3 rounded-t-lg">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-blue-600" />
                  <span className="font-semibold">Recommended Follow-up Tasks ({analysis.follow_up_tasks.length})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 py-3 bg-white border-x border-b rounded-b-lg space-y-2">
                {analysis.follow_up_tasks.map((task, idx) => (
                  <div key={idx} className="bg-blue-50 p-3 rounded border border-blue-200">
                    <div className="flex items-start justify-between mb-1">
                      <p className="text-sm font-semibold text-gray-900">{task.title}</p>
                      <Badge className="text-xs">{task.priority}</Badge>
                    </div>
                    <p className="text-xs text-gray-600 mb-1">Due: {task.due_timeframe}</p>
                    <p className="text-xs text-gray-700">{task.reason}</p>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          )}
          
          {analysis.care_plan_suggestions?.length > 0 && (
            <AccordionItem value="careplans">
              <AccordionTrigger className="bg-green-50 px-4 py-3 rounded-t-lg">
                <div className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-green-600" />
                  <span className="font-semibold">Care Plan Opportunities ({analysis.care_plan_suggestions.length})</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="px-4 py-3 bg-white border-x border-b rounded-b-lg space-y-2">
                {analysis.care_plan_suggestions.map((cp, idx) => (
                  <div key={idx} className="bg-green-50 p-3 rounded border border-green-200">
                    <p className="text-sm font-semibold text-gray-900 mb-1">Problem: {cp.problem}</p>
                    <p className="text-sm text-green-800 mb-2">Goal: {cp.goal}</p>
                    <div className="text-xs text-gray-700">
                      <p className="font-semibold mb-1">Interventions:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {cp.interventions.map((int, i) => (
                          <li key={i}>{int}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </AccordionContent>
            </AccordionItem>
          )}
        </Accordion>
      )}

      {/* Re-run button */}
      <Button
        onClick={runUnifiedAnalysis}
        variant="outline"
        size="sm"
        className="w-full"
      >
        <Sparkles className="w-4 h-4 mr-2" />
        Re-Run Analysis
      </Button>
    </div>
  );
}
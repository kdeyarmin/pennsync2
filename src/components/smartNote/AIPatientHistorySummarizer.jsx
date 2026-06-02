import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  History, 
  Loader2, 
  TrendingUp, 
  TrendingDown, 
  Minus,
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  FileText,
  Brain,
  Sparkles,
  Copy,
  Activity
} from "lucide-react";

export default function AIPatientHistorySummarizer({ 
  patientId, 
  patientName, 
  diagnosis,
  previousVisits = [],
  carePlans = [],
  onInsertSummary,
  compact = false
}) {
  const [summary, setSummary] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [copied, setCopied] = useState(false);

  // Auto-generate when patient changes and has visits
  useEffect(() => {
    if (patientId && previousVisits.length > 0) {
      generateContextSummary();
    } else {
      setSummary(null);
    }
  }, [patientId, previousVisits.length]);

  const generateContextSummary = async () => {
    if (!patientId || previousVisits.length === 0) return;

    setIsLoading(true);
    try {
      // Compile comprehensive visit data
      const visitData = previousVisits.slice(0, 5).map(v => ({
        date: v.visit_date,
        type: v.visit_type,
        notes: v.nurse_notes?.substring(0, 800) || 'No notes available',
        vitals: v.vital_signs,
        rawTranscription: v.raw_transcription?.substring(0, 300) || null
      }));

      const carePlanData = carePlans.map(cp => ({
        problem: cp.problem,
        goal: cp.goal,
        interventions: cp.interventions,
        status: cp.status,
        target_date: cp.target_date,
        baseline: cp.baseline_measurement
      }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a clinical documentation specialist helping a home health nurse prepare for a patient visit. Analyze the patient's history and create a context-aware summary.

PATIENT: ${patientName || 'Unknown'}
PRIMARY DIAGNOSIS: ${diagnosis || 'Not specified'}

PREVIOUS VISITS (most recent first):
${JSON.stringify(visitData, null, 2)}

CARE PLANS:
${JSON.stringify(carePlanData, null, 2)}

Create a comprehensive, context-aware summary that includes:

1. CLINICAL TRAJECTORY: Overall patient status trend based on documented visits
2. VITAL SIGN PATTERNS: Any patterns or concerning trends in vitals across visits
3. SYMPTOM EVOLUTION: How symptoms have changed over time
4. INTERVENTION EFFECTIVENESS: Which interventions appear to be working
5. UNRESOLVED CONCERNS: Issues mentioned but not yet resolved
6. CARE PLAN PROGRESS: Status toward care plan goals
7. CONTEXTUAL ALERTS: Things the nurse should be aware of for today's visit
8. RECOMMENDED FOCUS: Specific assessments or follow-ups needed today

Also create a narrative paragraph suitable for starting today's clinical note that references relevant history.

Return JSON:
{
  "clinical_trajectory": {
    "status": "improving" | "stable" | "declining" | "fluctuating",
    "confidence": "high" | "medium" | "low",
    "rationale": "Explanation based on documented findings"
  },
  "vital_patterns": [
    {
      "vital": "Which vital sign",
      "pattern": "Description of pattern",
      "clinical_significance": "What this means clinically",
      "trend": "up" | "down" | "stable" | "variable"
    }
  ],
  "symptom_timeline": [
    {
      "symptom": "Symptom name",
      "first_noted": "When first documented",
      "current_status": "Current status",
      "progression": "How it has changed"
    }
  ],
  "effective_interventions": [
    {
      "intervention": "What was done",
      "outcome": "Result observed",
      "recommendation": "Continue/modify/discontinue"
    }
  ],
  "unresolved_concerns": [
    {
      "concern": "The issue",
      "first_noted": "When",
      "priority": "high" | "medium" | "low",
      "suggested_action": "What to do about it"
    }
  ],
  "care_plan_status": [
    {
      "goal": "Care plan goal",
      "progress": "Progress description",
      "progress_percent": 0-100,
      "next_step": "What to do next"
    }
  ],
  "contextual_alerts": [
    {
      "type": "warning" | "info" | "success",
      "message": "Alert message",
      "action_needed": true | false
    }
  ],
  "recommended_focus": [
    {
      "area": "Assessment area",
      "reason": "Why this is important today",
      "specific_questions": ["Questions to ask or assessments to perform"]
    }
  ],
  "narrative_intro": "A 3-4 sentence professionally written paragraph suitable for beginning today's clinical note, referencing relevant history and setting context for today's visit",
  "quick_summary": "One-sentence summary of patient status for quick reference",
  "visit_count_analyzed": number
}`,
        response_json_schema: {
          type: "object",
          properties: {
            clinical_trajectory: { type: "object" },
            vital_patterns: { type: "array", items: { type: "object" } },
            symptom_timeline: { type: "array", items: { type: "object" } },
            effective_interventions: { type: "array", items: { type: "object" } },
            unresolved_concerns: { type: "array", items: { type: "object" } },
            care_plan_status: { type: "array", items: { type: "object" } },
            contextual_alerts: { type: "array", items: { type: "object" } },
            recommended_focus: { type: "array", items: { type: "object" } },
            narrative_intro: { type: "string" },
            quick_summary: { type: "string" },
            visit_count_analyzed: { type: "number" }
          }
        }
      });

      setSummary(result);
    } catch (error) {
      console.error("Error generating context summary:", error);
    }
    setIsLoading(false);
  };

  const handleCopyNarrative = () => {
    if (summary?.narrative_intro) {
      navigator.clipboard.writeText(summary.narrative_intro);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      improving: 'bg-green-100 text-green-800 border-green-300',
      stable: 'bg-blue-100 text-blue-800 border-blue-300',
      declining: 'bg-red-100 text-red-800 border-red-300',
      fluctuating: 'bg-yellow-100 text-yellow-800 border-yellow-300'
    };
    return colors[status] || 'bg-slate-100 text-slate-800';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'improving': return <TrendingUp className="w-3 h-3" />;
      case 'declining': return <TrendingDown className="w-3 h-3" />;
      case 'stable': return <Minus className="w-3 h-3" />;
      default: return <Activity className="w-3 h-3" />;
    }
  };

  const getAlertStyle = (type) => {
    switch (type) {
      case 'warning': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
      case 'success': return 'bg-green-50 border-green-200 text-green-800';
      default: return 'bg-blue-50 border-blue-200 text-blue-800';
    }
  };

  if (!patientId) {
    return (
      <Card className="border-slate-200">
        <CardContent className="p-4 text-center text-slate-500 text-sm">
          <History className="w-8 h-8 mx-auto mb-2 text-slate-300" />
          Select a patient to see AI-powered history summary
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-cyan-200">
      <CardHeader 
        className="py-2 bg-gradient-to-r from-cyan-50 to-blue-50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Brain className="w-4 h-4 text-cyan-600" />
            <span>AI History Summary</span>
            {summary?.clinical_trajectory && (
              <Badge className={`text-xs ${getStatusColor(summary.clinical_trajectory.status)}`}>
                {getStatusIcon(summary.clinical_trajectory.status)}
                <span className="ml-1 capitalize">{summary.clinical_trajectory.status}</span>
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isLoading && <Loader2 className="w-3 h-3 animate-spin" />}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => { e.stopPropagation(); generateContextSummary(); }}
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-3 space-y-3 max-h-[500px] overflow-y-auto">
          {previousVisits.length === 0 ? (
            <p className="text-xs text-slate-500 text-center py-4">
              No previous visits found. Summary will be available after the first visit.
            </p>
          ) : isLoading ? (
            <div className="text-center py-6">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-cyan-600 mb-2" />
              <p className="text-xs text-slate-500">Analyzing patient history...</p>
            </div>
          ) : !summary ? (
            <div className="text-center py-4">
              <Button size="sm" onClick={generateContextSummary}>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate AI Summary
              </Button>
            </div>
          ) : (
            <>
              {/* Quick Summary */}
              {summary.quick_summary && (
                <Alert className="py-2 bg-cyan-50 border-cyan-200">
                  <AlertDescription className="text-xs text-cyan-800 font-medium">
                    {summary.quick_summary}
                  </AlertDescription>
                </Alert>
              )}

              {/* Clinical Trajectory */}
              {summary.clinical_trajectory && (
                <div className={`p-2 rounded-lg border ${getStatusColor(summary.clinical_trajectory.status)}`}>
                  <p className="text-xs font-medium mb-1">Clinical Trajectory</p>
                  <p className="text-xs">{summary.clinical_trajectory.rationale}</p>
                  <Badge variant="outline" className="text-xs mt-1">
                    {summary.clinical_trajectory.confidence} confidence
                  </Badge>
                </div>
              )}

              {/* Contextual Alerts */}
              {summary.contextual_alerts?.length > 0 && (
                <div className="space-y-1">
                  {summary.contextual_alerts.map((alert, idx) => (
                    <div key={idx} className={`p-2 rounded border text-xs ${getAlertStyle(alert.type)}`}>
                      <div className="flex items-start gap-2">
                        {alert.type === 'warning' ? (
                          <AlertTriangle className="w-3 h-3 flex-shrink-0 mt-0.5" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3 flex-shrink-0 mt-0.5" />
                        )}
                        <span>{alert.message}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Recommended Focus */}
              {summary.recommended_focus?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-green-600" />
                    Focus Areas Today
                  </p>
                  {summary.recommended_focus.slice(0, 3).map((focus, idx) => (
                    <div key={idx} className="bg-green-50 p-2 rounded border border-green-200">
                      <p className="text-xs font-medium text-green-800">{focus.area}</p>
                      <p className="text-xs text-green-700">{focus.reason}</p>
                      {focus.specific_questions?.length > 0 && (
                        <ul className="text-xs text-green-600 mt-1 list-disc list-inside">
                          {focus.specific_questions.slice(0, 2).map((q, i) => (
                            <li key={i}>{q}</li>
                          ))}
                        </ul>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Unresolved Concerns */}
              {summary.unresolved_concerns?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3 text-yellow-600" />
                    Unresolved From Previous Visits
                  </p>
                  {summary.unresolved_concerns.slice(0, 3).map((concern, idx) => (
                    <div key={idx} className="bg-yellow-50 p-2 rounded border border-yellow-200">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-medium text-yellow-800">{concern.concern}</p>
                        <Badge className={`text-xs ${
                          concern.priority === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {concern.priority}
                        </Badge>
                      </div>
                      <p className="text-xs text-yellow-700 mt-1">{concern.suggested_action}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Vital Patterns */}
              {summary.vital_patterns?.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-700">Vital Sign Patterns</p>
                  <div className="grid grid-cols-2 gap-1">
                    {summary.vital_patterns.slice(0, 4).map((vp, idx) => (
                      <div key={idx} className="bg-slate-50 p-1.5 rounded text-xs border">
                        <div className="flex items-center gap-1">
                          {vp.trend === 'up' ? <TrendingUp className="w-3 h-3 text-red-500" /> :
                           vp.trend === 'down' ? <TrendingDown className="w-3 h-3 text-blue-500" /> :
                           <Minus className="w-3 h-3 text-slate-500" />}
                          <span className="font-medium">{vp.vital}</span>
                        </div>
                        <p className="text-slate-600 truncate">{vp.pattern}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Narrative Intro - Insert Button */}
              {summary.narrative_intro && (
                <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                  <p className="text-xs font-semibold text-indigo-800 mb-2 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    Context-Aware Note Introduction
                  </p>
                  <p className="text-xs text-indigo-700 mb-2 italic">
                    "{summary.narrative_intro}"
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      className="flex-1 text-xs bg-indigo-600 hover:bg-indigo-700"
                      onClick={() => onInsertSummary?.(summary.narrative_intro)}
                    >
                      <FileText className="w-3 h-3 mr-1" />
                      Insert into Note
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-xs"
                      onClick={handleCopyNarrative}
                    >
                      {copied ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                    </Button>
                  </div>
                </div>
              )}

              <p className="text-xs text-slate-400 text-center">
                Based on {summary.visit_count_analyzed || previousVisits.length} previous visits
              </p>
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
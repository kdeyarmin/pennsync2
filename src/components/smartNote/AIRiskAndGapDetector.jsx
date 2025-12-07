import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { trackAISuggestion, categorizeAISuggestion } from "../training/SuggestionTracker";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ChevronDown,
  ChevronUp,
  Activity,
  Heart,
  Brain,
  Pill,
  Home,
  Users,
  FileWarning,
  Lightbulb,
  Plus,
  RefreshCw
} from "lucide-react";
import debounce from "lodash/debounce";

export default function AIRiskAndGapDetector({
  noteContent,
  patientData,
  diagnosis,
  vitalSigns,
  carePlans = [],
  onCreateAlert,
  onCreateTask,
  onInsertText
}) {
  const [analysis, setAnalysis] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [lastAnalyzedLength, setLastAnalyzedLength] = useState(0);

  // Debounced analysis - triggers when note content changes significantly
  const analyzeContent = useCallback(
    debounce(async (content) => {
      if (!content || content.length < 50) {
        setAnalysis(null);
        return;
      }

      // Only re-analyze if content changed significantly (50+ chars difference)
      if (Math.abs(content.length - lastAnalyzedLength) < 50 && analysis) {
        return;
      }

      setIsAnalyzing(true);
      try {
        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a clinical risk assessment AI for home health nursing. Analyze this clinical note for potential patient risks and care gaps.

CURRENT NOTE CONTENT:
${content}

PATIENT CONTEXT:
- Name: ${patientData?.first_name} ${patientData?.last_name || ''}
- Primary Diagnosis: ${diagnosis || patientData?.primary_diagnosis || 'Not specified'}
- Secondary Diagnoses: ${patientData?.secondary_diagnoses?.join(', ') || 'None documented'}
- Allergies: ${patientData?.allergies || 'None documented'}

VITAL SIGNS:
${JSON.stringify(vitalSigns || {}, null, 2)}

ACTIVE CARE PLANS:
${carePlans.filter(cp => cp.status === 'active').map(cp => `- ${cp.problem}: ${cp.goal}`).join('\n') || 'None'}

Analyze for:
1. CLINICAL RISKS: Identify any red flags, concerning findings, or potential complications
2. FALL RISK INDICATORS: Signs of fall risk that may not be explicitly stated
3. MEDICATION CONCERNS: Potential medication issues, interactions, or non-compliance hints
4. HOSPITALIZATION RISK: Factors that could lead to hospital readmission
5. CARE GAPS: Missing assessments, documentation, or follow-ups based on diagnosis
6. CAREGIVER/SOCIAL CONCERNS: Signs of caregiver stress, social isolation, or safety issues
7. MISSING DOCUMENTATION: Required elements not present in the note

For each identified risk/gap, provide:
- Severity level
- Evidence from the note
- Recommended action
- Suggested text to add to documentation if applicable

Return JSON:
{
  "overall_risk_level": "low" | "moderate" | "high" | "critical",
  "risk_score": 0-100,
  "clinical_risks": [
    {
      "risk_type": "vital_sign" | "symptom" | "condition" | "medication" | "functional",
      "title": "Brief title",
      "description": "Detailed description",
      "evidence": "Quote or reference from note",
      "severity": "critical" | "high" | "medium" | "low",
      "recommended_action": "What to do",
      "suggested_documentation": "Text to add to note if needed",
      "create_alert": true | false
    }
  ],
  "fall_risk_assessment": {
    "risk_level": "low" | "moderate" | "high",
    "factors_identified": ["list of fall risk factors found"],
    "missing_assessment": "What fall risk assessment is missing if any"
  },
  "medication_concerns": [
    {
      "concern": "Description of concern",
      "medications_involved": ["medication names if identifiable"],
      "action_needed": "What to do"
    }
  ],
  "hospitalization_risk": {
    "risk_level": "low" | "moderate" | "high",
    "contributing_factors": ["factors that increase risk"],
    "preventive_actions": ["actions to reduce risk"]
  },
  "care_gaps": [
    {
      "gap_type": "assessment" | "intervention" | "education" | "documentation" | "follow_up",
      "description": "What is missing",
      "importance": "high" | "medium" | "low",
      "suggested_action": "How to address",
      "suggested_text": "Text to add to note"
    }
  ],
  "caregiver_social_concerns": [
    {
      "concern": "Description",
      "indicators": ["What in the note suggests this"],
      "recommendation": "What to do"
    }
  ],
  "documentation_completeness": {
    "score": 0-100,
    "missing_elements": ["Required elements not found"],
    "suggestions": ["How to improve documentation"]
  },
  "immediate_actions_needed": [
    {
      "action": "What needs to happen now",
      "reason": "Why it's urgent",
      "create_task": true | false
    }
  ],
  "summary": "Brief overall assessment summary"
}`,
          response_json_schema: {
            type: "object",
            properties: {
              overall_risk_level: { type: "string" },
              risk_score: { type: "number" },
              clinical_risks: { type: "array", items: { type: "object" } },
              fall_risk_assessment: { type: "object" },
              medication_concerns: { type: "array", items: { type: "object" } },
              hospitalization_risk: { type: "object" },
              care_gaps: { type: "array", items: { type: "object" } },
              caregiver_social_concerns: { type: "array", items: { type: "object" } },
              documentation_completeness: { type: "object" },
              immediate_actions_needed: { type: "array", items: { type: "object" } },
              summary: { type: "string" }
            }
          }
        });

        setAnalysis(result);
        setLastAnalyzedLength(content.length);
      } catch (error) {
        console.error("Error analyzing risks:", error);
      }
      setIsAnalyzing(false);
    }, 1500),
    [patientData, diagnosis, vitalSigns, carePlans, lastAnalyzedLength, analysis]
  );

  useEffect(() => {
    if (noteContent && noteContent.length >= 50) {
      analyzeContent(noteContent);
    }
    return () => analyzeContent.cancel();
  }, [noteContent, analyzeContent]);

  const getRiskColor = (level) => {
    const colors = {
      critical: 'bg-red-600 text-white',
      high: 'bg-red-100 text-red-800 border-red-300',
      moderate: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      low: 'bg-green-100 text-green-800 border-green-300'
    };
    return colors[level] || 'bg-gray-100 text-gray-800';
  };

  const getRiskIcon = (type) => {
    switch (type) {
      case 'vital_sign': return <Activity className="w-3 h-3" />;
      case 'symptom': return <AlertTriangle className="w-3 h-3" />;
      case 'condition': return <Heart className="w-3 h-3" />;
      case 'medication': return <Pill className="w-3 h-3" />;
      case 'functional': return <Users className="w-3 h-3" />;
      default: return <ShieldAlert className="w-3 h-3" />;
    }
  };

  const handleCreateAlert = (risk) => {
    if (onCreateAlert) {
      onCreateAlert({
        alert_type: risk.risk_type === 'vital_sign' ? 'vital_deterioration' : 
                    risk.risk_type === 'medication' ? 'medication_risk' : 'urgent_intervention',
        severity: risk.severity,
        title: risk.title,
        message: risk.description,
        recommended_actions: [risk.recommended_action]
      });
    }
  };

  const handleCreateTask = (action) => {
    if (onCreateTask) {
      onCreateTask({
        title: action.action,
        description: action.reason,
        priority: 'high',
        type: 'followup'
      });
    }
  };

  const totalIssues = analysis ? 
    (analysis.clinical_risks?.length || 0) + 
    (analysis.care_gaps?.length || 0) + 
    (analysis.medication_concerns?.length || 0) : 0;

  const criticalCount = analysis?.clinical_risks?.filter(r => r.severity === 'critical' || r.severity === 'high').length || 0;

  if (!noteContent || noteContent.length < 50) {
    return (
      <Card className="border-orange-200">
        <CardContent className="p-4 text-center text-gray-500 text-sm">
          <ShieldAlert className="w-8 h-8 mx-auto mb-2 text-gray-300" />
          Start documenting to enable AI risk detection
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`border-2 ${
      analysis?.overall_risk_level === 'critical' ? 'border-red-400 bg-red-50' :
      analysis?.overall_risk_level === 'high' ? 'border-orange-400 bg-orange-50' :
      'border-orange-200'
    }`}>
      <CardHeader 
        className="py-2 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <ShieldAlert className={`w-4 h-4 ${
              analysis?.overall_risk_level === 'critical' || analysis?.overall_risk_level === 'high' 
                ? 'text-red-600' : 'text-orange-600'
            }`} />
            <span>AI Risk & Gap Detection</span>
            {analysis && (
              <>
                <Badge className={getRiskColor(analysis.overall_risk_level)}>
                  {analysis.overall_risk_level}
                </Badge>
                {criticalCount > 0 && (
                  <Badge className="bg-red-600 text-white animate-pulse">
                    {criticalCount} urgent
                  </Badge>
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-1">
            {isAnalyzing && <Loader2 className="w-3 h-3 animate-spin" />}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0"
              onClick={(e) => { 
                e.stopPropagation(); 
                setLastAnalyzedLength(0);
                analyzeContent(noteContent);
              }}
            >
              <RefreshCw className="w-3 h-3" />
            </Button>
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-3 space-y-3 max-h-[500px] overflow-y-auto">
          {isAnalyzing && !analysis ? (
            <div className="text-center py-6">
              <Loader2 className="w-6 h-6 animate-spin mx-auto text-orange-600 mb-2" />
              <p className="text-xs text-gray-500">Analyzing for risks and gaps...</p>
            </div>
          ) : analysis ? (
            <>
              {/* Risk Score */}
              <div className="space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600">Risk Score</span>
                  <span className={`font-bold ${
                    analysis.risk_score >= 70 ? 'text-red-600' :
                    analysis.risk_score >= 40 ? 'text-yellow-600' : 'text-green-600'
                  }`}>
                    {analysis.risk_score}/100
                  </span>
                </div>
                <Progress 
                  value={analysis.risk_score} 
                  className={`h-2 ${
                    analysis.risk_score >= 70 ? '[&>div]:bg-red-500' :
                    analysis.risk_score >= 40 ? '[&>div]:bg-yellow-500' : '[&>div]:bg-green-500'
                  }`}
                />
              </div>

              {/* Summary */}
              {analysis.summary && (
                <Alert className={`py-2 ${getRiskColor(analysis.overall_risk_level)}`}>
                  <AlertDescription className="text-xs">
                    {analysis.summary}
                  </AlertDescription>
                </Alert>
              )}

              {/* Immediate Actions */}
              {analysis.immediate_actions_needed?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-red-700 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" />
                    Immediate Actions Needed
                  </p>
                  {analysis.immediate_actions_needed.map((action, idx) => (
                    <div key={idx} className="bg-red-50 p-2 rounded border border-red-200">
                      <p className="text-xs font-medium text-red-800">{action.action}</p>
                      <p className="text-xs text-red-700">{action.reason}</p>
                      {action.create_task && onCreateTask && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-1 h-6 text-xs border-red-300 text-red-700"
                          onClick={() => handleCreateTask(action)}
                        >
                          <Plus className="w-3 h-3 mr-1" /> Create Task
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Clinical Risks */}
              {analysis.clinical_risks?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-700">Clinical Risks Identified</p>
                  {analysis.clinical_risks.slice(0, 5).map((risk, idx) => (
                    <div key={idx} className={`p-2 rounded border ${getRiskColor(risk.severity)}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-1">
                          {getRiskIcon(risk.risk_type)}
                          <span className="text-xs font-medium">{risk.title}</span>
                        </div>
                        <Badge className={`text-xs py-0 ${getRiskColor(risk.severity)}`}>
                          {risk.severity}
                        </Badge>
                      </div>
                      <p className="text-xs mt-1">{risk.description}</p>
                      {risk.evidence && (
                        <p className="text-xs text-gray-500 italic mt-1">Evidence: "{risk.evidence}"</p>
                      )}
                      <div className="flex gap-1 mt-2 flex-wrap">
                        {risk.suggested_documentation && onInsertText && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-5 text-xs"
                            onClick={() => onInsertText(risk.suggested_documentation)}
                          >
                            <Plus className="w-2 h-2 mr-1" /> Add to Note
                          </Button>
                        )}
                        {risk.create_alert && onCreateAlert && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-5 text-xs"
                            onClick={() => handleCreateAlert(risk)}
                          >
                            <ShieldAlert className="w-2 h-2 mr-1" /> Create Alert
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Care Gaps */}
              {analysis.care_gaps?.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-semibold text-gray-700 flex items-center gap-1">
                    <FileWarning className="w-3 h-3 text-yellow-600" />
                    Care Gaps Detected
                  </p>
                  {analysis.care_gaps.slice(0, 4).map((gap, idx) => (
                    <div key={idx} className="bg-yellow-50 p-2 rounded border border-yellow-200">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">{gap.gap_type}</Badge>
                        <Badge className={`text-xs py-0 ${
                          gap.importance === 'high' ? 'bg-red-100 text-red-800' : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {gap.importance}
                        </Badge>
                      </div>
                      <p className="text-xs text-yellow-800 mt-1">{gap.description}</p>
                      {gap.suggested_text && onInsertText && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="mt-1 h-5 text-xs"
                          onClick={() => onInsertText(gap.suggested_text)}
                        >
                          <Plus className="w-2 h-2 mr-1" /> Add Documentation
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Fall Risk */}
              {analysis.fall_risk_assessment && (
                <div className={`p-2 rounded border ${getRiskColor(analysis.fall_risk_assessment.risk_level)}`}>
                  <p className="text-xs font-medium flex items-center gap-1">
                    <Users className="w-3 h-3" />
                    Fall Risk: {analysis.fall_risk_assessment.risk_level}
                  </p>
                  {analysis.fall_risk_assessment.factors_identified?.length > 0 && (
                    <ul className="text-xs mt-1 list-disc list-inside">
                      {analysis.fall_risk_assessment.factors_identified.slice(0, 3).map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {/* Hospitalization Risk */}
              {analysis.hospitalization_risk && (
                <div className={`p-2 rounded border ${getRiskColor(analysis.hospitalization_risk.risk_level)}`}>
                  <p className="text-xs font-medium flex items-center gap-1">
                    <Home className="w-3 h-3" />
                    Hospitalization Risk: {analysis.hospitalization_risk.risk_level}
                  </p>
                  {analysis.hospitalization_risk.preventive_actions?.length > 0 && (
                    <div className="mt-1">
                      <p className="text-xs text-gray-600">Preventive Actions:</p>
                      <ul className="text-xs list-disc list-inside">
                        {analysis.hospitalization_risk.preventive_actions.slice(0, 2).map((a, i) => (
                          <li key={i}>{a}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* Documentation Completeness */}
              {analysis.documentation_completeness && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Documentation Completeness</span>
                    <span className="font-medium">{analysis.documentation_completeness.score}%</span>
                  </div>
                  <Progress value={analysis.documentation_completeness.score} className="h-1.5" />
                  {analysis.documentation_completeness.missing_elements?.length > 0 && (
                    <p className="text-xs text-gray-500">
                      Missing: {analysis.documentation_completeness.missing_elements.slice(0, 2).join(', ')}
                    </p>
                  )}
                </div>
              )}

              {/* No Issues Found */}
              {totalIssues === 0 && (
                <div className="text-center py-4">
                  <CheckCircle2 className="w-8 h-8 mx-auto text-green-500 mb-2" />
                  <p className="text-xs text-green-700 font-medium">No significant risks or gaps detected</p>
                </div>
              )}
            </>
          ) : (
            <div className="text-center py-4">
              <Button size="sm" onClick={() => analyzeContent(noteContent)}>
                <ShieldAlert className="w-4 h-4 mr-2" />
                Analyze for Risks
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
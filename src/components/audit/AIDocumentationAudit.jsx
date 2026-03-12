import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  ClipboardCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ChevronDown,
  ChevronUp,
  Plus,
  Shield,
  Sparkles,
  Info
} from "lucide-react";

export default function AIDocumentationAudit({
  patient,
  visit,
  narrativeText,
  vitalSigns,
  onInsertText,
  onReplaceText
}) {
  const [auditResult, setAuditResult] = useState(null);
  const [isAuditing, setIsAuditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [appliedFixes, setAppliedFixes] = useState([]);

  const runAudit = async () => {
    if (!narrativeText || narrativeText.length < 50) {
      alert("Please add more documentation before running an audit.");
      return;
    }

    setIsAuditing(true);
    try {
      const prompt = `You are a Medicare compliance auditor and clinical documentation improvement specialist. Audit this home health/hospice visit note for compliance, accuracy, and completeness.

PATIENT CONTEXT:
- Name: ${patient?.first_name} ${patient?.last_name}
- Primary Diagnosis: ${patient?.primary_diagnosis || 'Not specified'}
- Secondary Diagnoses: ${patient?.secondary_diagnoses?.join(', ') || 'None'}
- Care Type: ${patient?.care_type === 'hospice' ? 'Hospice' : 'Home Health'}
- Visit Type: ${visit?.visit_type?.replace(/_/g, ' ') || 'Unknown'}

VITAL SIGNS RECORDED:
${vitalSigns && Object.keys(vitalSigns).length > 0 
  ? Object.entries(vitalSigns).map(([k, v]) => `- ${k.replace(/_/g, ' ')}: ${v}`).join('\n')
  : 'None recorded'}

DOCUMENTATION TO AUDIT:
${narrativeText}

Perform a comprehensive audit checking:

1. MEDICARE COMPLIANCE (for ${patient?.care_type === 'hospice' ? 'Hospice' : 'Home Health'}):
   - Homebound status justification (home health)
   - Skilled need documentation
   - Terminal prognosis indicators (hospice)
   - Face-to-face encounter requirements
   
2. CLINICAL ACCURACY:
   - Vital signs interpretation
   - Assessment findings consistency
   - Medication documentation
   - Diagnosis-specific assessments

3. COMPLETENESS:
   - Required sections present
   - Patient response to interventions
   - Care plan progress
   - Patient/caregiver education
   - Safety assessment

4. QUALITY INDICATORS:
   - Specificity of documentation
   - Measurable outcomes
   - Professional terminology
   - Chronological accuracy

Return JSON:
{
  "overall_score": 0-100,
  "compliance_score": 0-100,
  "accuracy_score": 0-100,
  "completeness_score": 0-100,
  "risk_level": "low|moderate|high",
  "summary": "Brief overall assessment",
  "critical_issues": [
    {
      "category": "compliance|accuracy|completeness",
      "issue": "Description of issue",
      "location": "Where in note",
      "fix_suggestion": "Suggested text to add or change",
      "medicare_reference": "Relevant Medicare requirement"
    }
  ],
  "missing_elements": [
    {
      "element": "Missing element name",
      "importance": "required|recommended",
      "suggested_text": "Complete text to insert"
    }
  ],
  "improvement_suggestions": [
    {
      "current_text": "Current problematic text",
      "improved_text": "Improved version",
      "rationale": "Why this is better"
    }
  ],
  "strengths": ["Strength 1", "Strength 2"],
  "audit_notes": "Additional auditor notes"
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: { type: "number" },
            compliance_score: { type: "number" },
            accuracy_score: { type: "number" },
            completeness_score: { type: "number" },
            risk_level: { type: "string" },
            summary: { type: "string" },
            critical_issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  issue: { type: "string" },
                  location: { type: "string" },
                  fix_suggestion: { type: "string" },
                  medicare_reference: { type: "string" }
                }
              }
            },
            missing_elements: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  element: { type: "string" },
                  importance: { type: "string" },
                  suggested_text: { type: "string" }
                }
              }
            },
            improvement_suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  current_text: { type: "string" },
                  improved_text: { type: "string" },
                  rationale: { type: "string" }
                }
              }
            },
            strengths: { type: "array", items: { type: "string" } },
            audit_notes: { type: "string" }
          }
        }
      });

      setAuditResult(result);
      setAppliedFixes([]);
    } catch (error) {
      console.error('Audit error:', error);
    }
    setIsAuditing(false);
  };

  const handleAddMissing = (element, idx) => {
    onInsertText("\n\n" + element.suggested_text);
    setAppliedFixes([...appliedFixes, `missing-${idx}`]);
  };

  const handleApplyFix = (issue, idx) => {
    onInsertText("\n\n" + issue.fix_suggestion);
    setAppliedFixes([...appliedFixes, `fix-${idx}`]);
  };

  const handleApplyImprovement = (suggestion, idx) => {
    if (onReplaceText && suggestion.current_text) {
      onReplaceText(suggestion.current_text, suggestion.improved_text);
    } else {
      onInsertText("\n\n[IMPROVED]: " + suggestion.improved_text);
    }
    setAppliedFixes([...appliedFixes, `improve-${idx}`]);
  };

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 70) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getScoreBg = (score) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 70) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  const getRiskBadge = (level) => {
    switch (level) {
      case 'low': return 'bg-green-500 text-white';
      case 'moderate': return 'bg-yellow-500 text-black';
      case 'high': return 'bg-red-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  return (
    <Card className="border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-purple-900">
            <ClipboardCheck className="w-5 h-5 text-purple-600" />
            AI Documentation Audit
          </CardTitle>
          <div className="flex items-center gap-2">
            {auditResult && (
              <Badge className={getRiskBadge(auditResult.risk_level)}>
                {auditResult.risk_level} risk
              </Badge>
            )}
            <Button
              size="sm"
              onClick={runAudit}
              disabled={isAuditing || !narrativeText}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isAuditing ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-1 animate-spin" />
                  Auditing...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-1" />
                  Run Audit
                </>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setIsExpanded(!isExpanded)}>
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-2">
          {!auditResult && !isAuditing && (
            <div className="text-center py-4">
              <ClipboardCheck className="w-10 h-10 text-purple-300 mx-auto mb-2" />
              <p className="text-sm text-purple-600">Run an audit to check compliance and quality</p>
            </div>
          )}

          {auditResult && (
            <div className="space-y-4">
              {/* Score Summary */}
              <div className="grid grid-cols-4 gap-2">
                <div className="text-center p-2 bg-white rounded-lg">
                  <p className={`text-2xl font-bold ${getScoreColor(auditResult.overall_score)}`}>
                    {auditResult.overall_score}%
                  </p>
                  <p className="text-xs text-gray-500">Overall</p>
                </div>
                <div className="text-center p-2 bg-white rounded-lg">
                  <p className={`text-xl font-bold ${getScoreColor(auditResult.compliance_score)}`}>
                    {auditResult.compliance_score}%
                  </p>
                  <p className="text-xs text-gray-500">Compliance</p>
                </div>
                <div className="text-center p-2 bg-white rounded-lg">
                  <p className={`text-xl font-bold ${getScoreColor(auditResult.accuracy_score)}`}>
                    {auditResult.accuracy_score}%
                  </p>
                  <p className="text-xs text-gray-500">Accuracy</p>
                </div>
                <div className="text-center p-2 bg-white rounded-lg">
                  <p className={`text-xl font-bold ${getScoreColor(auditResult.completeness_score)}`}>
                    {auditResult.completeness_score}%
                  </p>
                  <p className="text-xs text-gray-500">Complete</p>
                </div>
              </div>

              {/* Summary */}
              <Alert className="bg-white">
                <Info className="w-4 h-4" />
                <AlertDescription className="text-sm">{auditResult.summary}</AlertDescription>
              </Alert>

              {/* Critical Issues */}
              {auditResult.critical_issues?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-red-700 mb-2 flex items-center gap-1">
                    <XCircle className="w-4 h-4" />
                    Critical Issues ({auditResult.critical_issues.length})
                  </p>
                  <div className="space-y-2">
                    {auditResult.critical_issues.map((issue, idx) => {
                      const isApplied = appliedFixes.includes(`fix-${idx}`);
                      return (
                        <div key={idx} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <Badge variant="outline" className="text-xs mb-1 capitalize">
                                {issue.category}
                              </Badge>
                              <p className="text-sm font-medium text-red-900">{issue.issue}</p>
                              {issue.medicare_reference && (
                                <p className="text-xs text-red-600 mt-1">
                                  <Shield className="w-3 h-3 inline mr-1" />
                                  {issue.medicare_reference}
                                </p>
                              )}
                            </div>
                            <Button
                              size="sm"
                              variant={isApplied ? "outline" : "default"}
                              onClick={() => handleApplyFix(issue, idx)}
                              disabled={isApplied}
                              className="h-7 text-xs"
                            >
                              {isApplied ? <CheckCircle2 className="w-3 h-3" /> : <Plus className="w-3 h-3 mr-1" />}
                              {isApplied ? 'Added' : 'Fix'}
                            </Button>
                          </div>
                          {issue.fix_suggestion && !isApplied && (
                            <p className="text-xs text-red-800 mt-2 p-2 bg-red-100 rounded italic">
                              "{issue.fix_suggestion.substring(0, 150)}..."
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Missing Elements */}
              {auditResult.missing_elements?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-orange-700 mb-2 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" />
                    Missing Elements ({auditResult.missing_elements.length})
                  </p>
                  <div className="space-y-2">
                    {auditResult.missing_elements.map((element, idx) => {
                      const isApplied = appliedFixes.includes(`missing-${idx}`);
                      return (
                        <div key={idx} className="p-2 bg-orange-50 border border-orange-200 rounded-lg flex items-center justify-between">
                          <div>
                            <span className="text-sm font-medium text-orange-900">{element.element}</span>
                            <Badge variant="outline" className={`ml-2 text-xs ${
                              element.importance === 'required' ? 'border-red-300 text-red-700' : 'border-gray-300'
                            }`}>
                              {element.importance}
                            </Badge>
                          </div>
                          <Button
                            size="sm"
                            variant={isApplied ? "outline" : "default"}
                            onClick={() => handleAddMissing(element, idx)}
                            disabled={isApplied}
                            className="h-7 text-xs"
                          >
                            {isApplied ? <CheckCircle2 className="w-3 h-3" /> : <Plus className="w-3 h-3 mr-1" />}
                            {isApplied ? 'Added' : 'Add'}
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Improvement Suggestions */}
              {auditResult.improvement_suggestions?.length > 0 && (
                <div>
                  <p className="text-sm font-semibold text-blue-700 mb-2 flex items-center gap-1">
                    <Sparkles className="w-4 h-4" />
                    Improvements ({auditResult.improvement_suggestions.length})
                  </p>
                  <div className="space-y-2">
                    {auditResult.improvement_suggestions.map((suggestion, idx) => {
                      const isApplied = appliedFixes.includes(`improve-${idx}`);
                      return (
                        <div key={idx} className="p-2 bg-blue-50 border border-blue-200 rounded-lg">
                          <div className="flex items-start justify-between">
                            <p className="text-xs text-blue-600 flex-1">{suggestion.rationale}</p>
                            <Button
                              size="sm"
                              variant={isApplied ? "outline" : "default"}
                              onClick={() => handleApplyImprovement(suggestion, idx)}
                              disabled={isApplied}
                              className="h-7 text-xs ml-2"
                            >
                              {isApplied ? 'Applied' : 'Apply'}
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Strengths */}
              {auditResult.strengths?.length > 0 && (
                <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-xs font-semibold text-green-700 mb-1">
                    <CheckCircle2 className="w-3 h-3 inline mr-1" />
                    Strengths
                  </p>
                  <ul className="text-xs text-green-800 space-y-1">
                    {auditResult.strengths.map((s, i) => (
                      <li key={i}>✓ {s}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
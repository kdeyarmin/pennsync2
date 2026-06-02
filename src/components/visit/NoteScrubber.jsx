import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Sparkles,
  FileCheck,
  List,
  Edit,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { logSecurityEvent } from "../utils/security";

export default function NoteScrubber({ 
  patient, 
  visit,
  narrativeText, 
  vitalSigns,
  onFixSuggestion,
  onScrubComplete 
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubResults, setScrubResults] = useState(null);
  const [expandedSections, setExpandedSections] = useState([]);

  const runNoteScrubber = async () => {
    setIsScrubbing(true);
    setShowDialog(true);
    
    try {
      await logSecurityEvent('NOTE_SCRUBBER_STARTED', { visit_id: visit.id });

      // Build comprehensive prompt based on care type and visit type
      const careType = patient.care_type === 'hospice' ? 'HOSPICE' : 'HOME HEALTH';
      const visitType = visit.visit_type.replace(/_/g, ' ').toUpperCase();

      let prompt = `You are a Medicare compliance auditor specializing in ${careType} documentation. Perform a comprehensive audit of this visit note to ensure it meets all Medicare requirements.

PATIENT INFORMATION:
- Care Type: ${careType}
- Visit Type: ${visitType}
- Primary Diagnosis: ${patient.primary_diagnosis || 'Not specified'}
- Visit Date: ${visit.visit_date}

VISIT DOCUMENTATION:
${narrativeText || '[No documentation provided]'}

VITAL SIGNS DOCUMENTED:
${Object.keys(vitalSigns).length > 0 ? JSON.stringify(vitalSigns, null, 2) : 'None documented'}

---

MEDICARE COMPLIANCE CHECKLIST FOR ${careType} - ${visitType}:

`;

      // Add Home Health specific requirements
      if (patient.care_type === 'home_health') {
        prompt += `
**HOME HEALTH MEDICARE REQUIREMENTS:**

1. HOMEBOUND STATUS (CRITICAL - Required for all visits):
   - Must document reason patient cannot leave home
   - Must include specific objective evidence
   - Must state taxing effort or assistance needed
   - Must note leaves home only for medical care

2. SKILLED NURSING NECESSITY (CRITICAL):
   - Must justify why RN judgment/skill is required
   - Must document complexity requiring skilled assessment
   - Must show patient cannot self-manage safely
   - Must demonstrate need for skilled intervention

3. PATIENT/CAREGIVER RESPONSE TO TEACHING (Required):
   - Must document what was taught
   - Must document patient/caregiver comprehension
   - Must show teach-back or demonstration
   - Must note barriers to learning if any

4. FUNCTIONAL STATUS & LIMITATIONS (Required):
   - Must document ADL/IADL limitations
   - Must show impact on daily function
   - Must relate to skilled need

5. SAFETY ASSESSMENT (Required):
   - Home safety evaluation
   - Fall risk assessment
   - Emergency preparedness

`;
      }

      // Add Hospice specific requirements
      if (patient.care_type === 'hospice') {
        prompt += `
**HOSPICE MEDICARE REQUIREMENTS:**

1. TERMINAL PROGNOSIS INDICATORS (CRITICAL):
   - Must document evidence of disease progression
   - Must show decline consistent with terminal diagnosis
   - Must note specific symptoms or functional decline
   - Must support continued hospice eligibility

2. COMPREHENSIVE SYMPTOM ASSESSMENT (CRITICAL):
   - Must assess ALL cardinal symptoms: pain, dyspnea, nausea, constipation, anxiety
   - Must rate severity for each symptom
   - Must document current management
   - Must note effectiveness of interventions

3. PATIENT/FAMILY COPING (Required):
   - Must document emotional/spiritual status
   - Must assess grief and anticipatory grief
   - Must note support systems
   - Must identify psychosocial needs

4. COMFORT CARE FOCUS (Required):
   - Must emphasize comfort measures
   - Must document patient/family goals
   - Must address quality of life

5. CAREGIVER SUPPORT & EDUCATION (Required):
   - Must document caregiver education
   - Must provide anticipatory guidance
   - Must remind of 24-hour availability

`;
      }

      // Add visit-type specific requirements
      if (visit.visit_type === 'admission') {
        prompt += `
**ADMISSION/START OF CARE ADDITIONAL REQUIREMENTS:**
- Complete medication reconciliation with source verification
- Advance directives discussion and documentation
- Emergency contact information verified
- Comprehensive baseline assessment all systems
- Patient/caregiver rights and responsibilities reviewed
- Plan of care discussed and agreed upon
- Initial care plan goals established

`;
      } else if (visit.visit_type === 'recertification') {
        prompt += `
**RECERTIFICATION VISIT ADDITIONAL REQUIREMENTS:**
- Comprehensive reassessment of all body systems
- Progress toward ALL care plan goals documented
- Continued need for services clearly justified
- All medications and diagnoses updated
- Discussion of ongoing plan of care
- Physician orders reviewed and current

`;
      } else if (visit.visit_type === 'discharge') {
        prompt += `
**DISCHARGE VISIT ADDITIONAL REQUIREMENTS:**
- Reason for discharge clearly stated
- Final assessment all systems completed
- Discharge education provided and documented
- Follow-up appointments arranged
- Equipment/supplies reconciled
- Emergency contacts and resources provided
- Patient/caregiver demonstrates readiness for discharge

`;
      }

      prompt += `
**GENERAL DOCUMENTATION STANDARDS:**
- Professional medical terminology used throughout
- Complete sentences, proper grammar and punctuation
- Objective measurements and specific observations
- Vital signs documented and clinically addressed if abnormal
- Assessment findings support plan of care
- Interventions match identified problems
- Patient response to interventions documented
- Communication with physician if needed
- Signature-ready (no placeholder text like [nurse to document])

---

**YOUR TASK:**

Analyze the documentation and return a detailed JSON audit report with this exact structure:

{
  "overall_score": 0-100,
  "compliance_level": "excellent" | "good" | "needs_work" | "critical_deficiencies",
  "ready_to_close": true | false,
  "critical_missing": [
    {
      "requirement": "Exact requirement name",
      "category": "homebound" | "skilled_need" | "safety" | "assessment" | "education" | "symptoms" | "prognosis" | "other",
      "severity": "critical",
      "found": false,
      "issue": "What's missing or inadequate",
      "example": "Specific example of compliant documentation",
      "suggestion": "How to fix - be very specific with template text",
      "location": "Where it should be added in note"
    }
  ],
  "needs_improvement": [
    {
      "requirement": "Requirement name",
      "category": "category",
      "severity": "warning",
      "found": true,
      "issue": "What needs improvement",
      "current_text": "Quote from note that needs work",
      "example": "Better version",
      "suggestion": "Specific improvement needed"
    }
  ],
  "compliant_items": [
    {
      "requirement": "Requirement name",
      "category": "category",
      "found": true,
      "evidence": "Quote from note showing compliance"
    }
  ],
  "grammar_issues": [
    {
      "issue": "Description of grammar/spelling error",
      "location": "Quote showing error",
      "correction": "Corrected text"
    }
  ],
  "recommendations": [
    "Specific actionable recommendation 1",
    "Specific actionable recommendation 2"
  ],
  "medicare_risk_level": "low" | "medium" | "high",
  "estimated_time_to_fix": "5 minutes" | "10 minutes" | "15+ minutes"
}

Be thorough and specific. For critical items, provide exact template text the nurse can use.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: { type: "number" },
            compliance_level: { type: "string" },
            ready_to_close: { type: "boolean" },
            critical_missing: { 
              type: "array",
              items: {
                type: "object",
                properties: {
                  requirement: { type: "string" },
                  category: { type: "string" },
                  severity: { type: "string" },
                  found: { type: "boolean" },
                  issue: { type: "string" },
                  example: { type: "string" },
                  suggestion: { type: "string" },
                  location: { type: "string" }
                }
              }
            },
            needs_improvement: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  requirement: { type: "string" },
                  category: { type: "string" },
                  severity: { type: "string" },
                  found: { type: "boolean" },
                  issue: { type: "string" },
                  current_text: { type: "string" },
                  example: { type: "string" },
                  suggestion: { type: "string" }
                }
              }
            },
            compliant_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  requirement: { type: "string" },
                  category: { type: "string" },
                  found: { type: "boolean" },
                  evidence: { type: "string" }
                }
              }
            },
            grammar_issues: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  issue: { type: "string" },
                  location: { type: "string" },
                  correction: { type: "string" }
                }
              }
            },
            recommendations: {
              type: "array",
              items: { type: "string" }
            },
            medicare_risk_level: { type: "string" },
            estimated_time_to_fix: { type: "string" }
          }
        }
      });

      setScrubResults(result);
      
      await logSecurityEvent('NOTE_SCRUBBER_COMPLETED', { 
        visit_id: visit.id,
        score: result.overall_score,
        ready_to_close: result.ready_to_close,
        critical_count: result.critical_missing?.length || 0
      });

      if (onScrubComplete) {
        onScrubComplete(result);
      }

    } catch (error) {
      console.error("Error running note scrubber:", error);
      alert("Error running Medicare compliance check. Please try again.");
      await logSecurityEvent('NOTE_SCRUBBER_ERROR', { 
        visit_id: visit.id,
        error: error.message 
      });
    }
    
    setIsScrubbing(false);
  };

  const toggleSection = (section) => {
    if (expandedSections.includes(section)) {
      setExpandedSections(expandedSections.filter(s => s !== section));
    } else {
      setExpandedSections([...expandedSections, section]);
    }
  };

  const handleQuickFix = (suggestionText) => {
    if (onFixSuggestion) {
      onFixSuggestion(suggestionText);
    }
    setShowDialog(false);
  };

  const getComplianceLevelColor = (level) => {
    switch (level) {
      case 'excellent': return 'bg-green-500';
      case 'good': return 'bg-blue-500';
      case 'needs_work': return 'bg-yellow-500';
      case 'critical_deficiencies': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

  const getRiskBadgeColor = (risk) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  return (
    <>
      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                <FileCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900">Medicare Compliance Scrubber</h3>
                <p className="text-sm text-slate-600">Check your note before closing the visit</p>
              </div>
            </div>
            <Button
              onClick={runNoteScrubber}
              disabled={isScrubbing || !narrativeText}
              size="lg"
              className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700"
            >
              {isScrubbing ? (
                <>
                  <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                  Scrubbing Note...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 mr-2" />
                  Run Compliance Check
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Results Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <ShieldCheck className="w-7 h-7 text-blue-600" />
              Medicare Compliance Report
            </DialogTitle>
            <DialogDescription>
              Comprehensive audit of your documentation against Medicare guidelines
            </DialogDescription>
          </DialogHeader>

          {isScrubbing ? (
            <div className="py-12 text-center space-y-4">
              <Sparkles className="w-16 h-16 mx-auto text-blue-600 animate-pulse" />
              <div>
                <p className="text-lg font-semibold text-slate-900">Analyzing Your Documentation...</p>
                <p className="text-sm text-slate-600 mt-2">
                  Checking against {patient.care_type === 'hospice' ? 'hospice' : 'home health'} Medicare requirements
                </p>
              </div>
            </div>
          ) : scrubResults ? (
            <div className="space-y-6 py-4">
              {/* Overall Score */}
              <div className="bg-white rounded-lg border-2 border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-slate-900">
                      Compliance Score: {scrubResults.overall_score}/100
                    </h3>
                    <p className="text-slate-600 capitalize mt-1">
                      {scrubResults.compliance_level?.replace('_', ' ')}
                    </p>
                  </div>
                  <div className="text-right space-y-2">
                    <Badge className={getRiskBadgeColor(scrubResults.medicare_risk_level)}>
                      {scrubResults.medicare_risk_level?.toUpperCase()} RISK
                    </Badge>
                    <p className="text-xs text-slate-500">
                      Est. fix time: {scrubResults.estimated_time_to_fix}
                    </p>
                  </div>
                </div>

                <Progress value={scrubResults.overall_score} className="h-3 mb-4" />

                {scrubResults.ready_to_close ? (
                  <Alert className="bg-green-50 border-green-200">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <AlertDescription className="text-green-900 font-semibold">
                      ✓ Note is ready to close! All critical requirements met.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <Alert className="bg-red-50 border-red-200">
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                    <AlertDescription className="text-red-900 font-semibold">
                      ⚠ Critical items must be addressed before closing this note
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Critical Missing Items */}
              {scrubResults.critical_missing && scrubResults.critical_missing.length > 0 && (
                <div className="space-y-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer bg-red-50 p-3 rounded-lg border-2 border-red-200"
                    onClick={() => toggleSection('critical')}
                  >
                    <div className="flex items-center gap-3">
                      <XCircle className="w-6 h-6 text-red-600" />
                      <h4 className="font-bold text-red-900 text-lg">
                        Critical Missing ({scrubResults.critical_missing.length})
                      </h4>
                    </div>
                    {expandedSections.includes('critical') ? (
                      <ChevronUp className="w-5 h-5 text-red-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-red-600" />
                    )}
                  </div>

                  {expandedSections.includes('critical') && scrubResults.critical_missing.map((item, index) => (
                    <Card key={index} className="border-l-4 border-l-red-500 bg-red-50">
                      <CardContent className="p-4 space-y-3">
                        <div>
                          <div className="flex items-start justify-between mb-2">
                            <h5 className="font-bold text-red-900">{item.requirement}</h5>
                            <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300">
                              {item.category}
                            </Badge>
                          </div>
                          <p className="text-sm text-red-800 mb-3">
                            <strong>Issue:</strong> {item.issue}
                          </p>
                        </div>

                        <div className="bg-white p-3 rounded border border-red-200">
                          <p className="text-xs font-semibold text-slate-700 mb-1">Medicare-Compliant Example:</p>
                          <p className="text-sm text-slate-900 italic">{item.example}</p>
                        </div>

                        <div className="bg-blue-50 p-3 rounded border border-blue-200">
                          <p className="text-xs font-semibold text-blue-900 mb-1">Suggested Fix:</p>
                          <p className="text-sm text-blue-900">{item.suggestion}</p>
                        </div>

                        {item.location && (
                          <p className="text-xs text-slate-600">
                            <strong>Add to:</strong> {item.location}
                          </p>
                        )}

                        <Button
                          size="sm"
                          onClick={() => handleQuickFix(item.suggestion)}
                          className="w-full bg-blue-600 hover:bg-blue-700"
                        >
                          <Edit className="w-4 h-4 mr-2" />
                          Add This to My Note
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Needs Improvement */}
              {scrubResults.needs_improvement && scrubResults.needs_improvement.length > 0 && (
                <div className="space-y-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer bg-yellow-50 p-3 rounded-lg border-2 border-yellow-200"
                    onClick={() => toggleSection('warnings')}
                  >
                    <div className="flex items-center gap-3">
                      <AlertCircle className="w-6 h-6 text-yellow-600" />
                      <h4 className="font-bold text-yellow-900 text-lg">
                        Needs Improvement ({scrubResults.needs_improvement.length})
                      </h4>
                    </div>
                    {expandedSections.includes('warnings') ? (
                      <ChevronUp className="w-5 h-5 text-yellow-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-yellow-600" />
                    )}
                  </div>

                  {expandedSections.includes('warnings') && scrubResults.needs_improvement.map((item, index) => (
                    <Card key={index} className="border-l-4 border-l-yellow-500 bg-yellow-50">
                      <CardContent className="p-4 space-y-2">
                        <div className="flex items-start justify-between">
                          <h5 className="font-semibold text-yellow-900">{item.requirement}</h5>
                          <Badge variant="outline" className="bg-yellow-100 text-yellow-800">
                            {item.category}
                          </Badge>
                        </div>
                        <p className="text-sm text-yellow-800">
                          <strong>Issue:</strong> {item.issue}
                        </p>
                        {item.current_text && (
                          <div className="bg-white p-2 rounded border border-yellow-200">
                            <p className="text-xs text-slate-600">Current: "{item.current_text}"</p>
                          </div>
                        )}
                        <div className="bg-green-50 p-2 rounded border border-green-200">
                          <p className="text-xs text-green-900">
                            <strong>Better:</strong> {item.example || item.suggestion}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}

              {/* Grammar Issues */}
              {scrubResults.grammar_issues && scrubResults.grammar_issues.length > 0 && (
                <div className="space-y-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer bg-purple-50 p-3 rounded-lg border-2 border-purple-200"
                    onClick={() => toggleSection('grammar')}
                  >
                    <div className="flex items-center gap-3">
                      <Edit className="w-6 h-6 text-purple-600" />
                      <h4 className="font-bold text-purple-900 text-lg">
                        Grammar & Style ({scrubResults.grammar_issues.length})
                      </h4>
                    </div>
                    {expandedSections.includes('grammar') ? (
                      <ChevronUp className="w-5 h-5 text-purple-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-purple-600" />
                    )}
                  </div>

                  {expandedSections.includes('grammar') && (
                    <div className="bg-purple-50 p-4 rounded border border-purple-200 space-y-2">
                      {scrubResults.grammar_issues.map((issue, index) => (
                        <div key={index} className="text-sm">
                          <p className="text-purple-900">
                            <strong>{issue.issue}:</strong>
                          </p>
                          <p className="text-slate-700 ml-4">
                            "{issue.location}" → "{issue.correction}"
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Compliant Items */}
              {scrubResults.compliant_items && scrubResults.compliant_items.length > 0 && (
                <div className="space-y-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer bg-green-50 p-3 rounded-lg border-2 border-green-200"
                    onClick={() => toggleSection('compliant')}
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                      <h4 className="font-bold text-green-900 text-lg">
                        Medicare Compliant ({scrubResults.compliant_items.length})
                      </h4>
                    </div>
                    {expandedSections.includes('compliant') ? (
                      <ChevronUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-green-600" />
                    )}
                  </div>

                  {expandedSections.includes('compliant') && (
                    <div className="grid grid-cols-2 gap-2">
                      {scrubResults.compliant_items.map((item, index) => (
                        <div key={index} className="bg-green-50 p-3 rounded border border-green-200">
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-green-900">{item.requirement}</p>
                              {item.evidence && (
                                <p className="text-xs text-green-700 mt-1 truncate" title={item.evidence}>
                                  "{item.evidence}"
                                </p>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Recommendations */}
              {scrubResults.recommendations && scrubResults.recommendations.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                  <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <List className="w-5 h-5" />
                    Expert Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {scrubResults.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-blue-900">
                        <span className="font-bold text-blue-600 mt-0.5">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : null}

          <DialogFooter className="border-t pt-4">
            <Button
              variant="outline"
              onClick={() => setShowDialog(false)}
            >
              Close
            </Button>
            {scrubResults && !scrubResults.ready_to_close && (
              <Button
                onClick={() => {
                  setShowDialog(false);
                  // Scroll to note section
                  document.querySelector('textarea')?.focus();
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Fix Issues in Note
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  FileCheck,
  DollarSign,
  TrendingUp,
  Sparkles,
  Info,
  ChevronDown,
  ChevronUp
} from "lucide-react";
import { logSecurityEvent } from "../utils/security";

export default function OASISScrubber({ 
  patient, 
  visit,
  narrativeText, 
  vitalSigns,
  onFixSuggestion 
}) {
  const [showDialog, setShowDialog] = useState(false);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [oasisResults, setOasisResults] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState([]);

  const isHomeHealth = patient?.care_type === 'home_health';
  const isOASISVisit = ['admission', 'recertification', 'discharge'].includes(visit?.visit_type);

  const runOASISScrubber = async () => {
    setIsScrubbing(true);
    setShowDialog(true);
    
    try {
      await logSecurityEvent('OASIS_SCRUBBER_STARTED', { visit_id: visit.id });

      const visitType = visit.visit_type.replace(/_/g, ' ').toUpperCase();

      let prompt = `You are an OASIS (Outcome and Assessment Information Set) compliance expert for Medicare home health. Perform a comprehensive OASIS assessment data completeness check for this ${visitType} visit.

PATIENT INFORMATION:
- Visit Type: ${visitType}
- Primary Diagnosis: ${patient.primary_diagnosis || 'Not specified'}
- Visit Date: ${visit.visit_date}

VISIT DOCUMENTATION:
${narrativeText || '[No documentation provided]'}

VITAL SIGNS DOCUMENTED:
${Object.keys(vitalSigns).length > 0 ? JSON.stringify(vitalSigns, null, 2) : 'None documented'}

---

OASIS DATA ELEMENTS TO CHECK (${visitType} Requirements):

**SECTION A: DEMOGRAPHIC INFORMATION**
- M1005: Medicare ID
- M1010/1016: Birth Date, Gender
- M1018: Primary referring physician
- M1034: Race/Ethnicity

**SECTION B: PRIMARY CAREGIVER**
- M1100: Living arrangements
- M1110: Primary caregiver present

**SECTION C: CLINICAL RECORD ITEMS**
- M1021-M1028: Primary/Secondary diagnoses with ICD-10 codes
- M1030: Therapy need
- M1032: Risk for hospitalization

**SECTION D: SENSORY STATUS**
- M1200: Vision
- M1242: Pain frequency
- M1200: Hearing

**SECTION E: INTEGUMENTARY STATUS**
- M1306: Unhealed pressure ulcers
- M1307-M1324: Pressure ulcer details (if present)
- M1330-M1334: Stasis ulcers
- M1340-M1342: Surgical wounds

**SECTION F: RESPIRATORY STATUS**
- M1400: Dyspnea

**SECTION G: ELIMINATION STATUS**
- M1600: Urinary incontinence
- M1610: Urinary catheter
- M1615: Bowel incontinence
- M1620: Ostomy

**SECTION H: NEURO/EMOTIONAL/BEHAVIORAL STATUS**
- M1700: Cognitive functioning
- M1710: Confusion frequency
- M1720: Anxiety frequency
- M1730: Depression screening
- M1740: Cognitive/behavioral symptoms
- M1745: Behaviors demonstrated

**SECTION I: ADL/IADL**
CRITICAL FOR REIMBURSEMENT - Must document current ability:
- M1800: Grooming
- M1810: Dress upper body
- M1820: Dress lower body
- M1830: Bathing
- M1840: Toilet transferring
- M1845: Toileting hygiene
- M1850: Transferring
- M1860: Ambulation/locomotion
- M1870: Feeding/eating
- M1880: Meal preparation
- M1890: Phone use
- M1900: Medication management

**SECTION J: MEDICATIONS**
- M2001: Drug regimen review
- M2003: Medication follow-up
- M2005: Medication intervention
- M2010: High-risk drug classes
- M2020: Management of injectable meds
- M2030: Medication reconciliation

**SECTION K: EQUIPMENT**
- M2100: Types of equipment

**SECTION L: CARE MANAGEMENT**
- M2200: Therapy need
- M2250: Plan of care synopsis
- M2300: Emergent care
- M2310: Reason for emergent care
- M2400: Intervention synopsis
- M2410: Discharge disposition

---

**SPECIAL CONSIDERATIONS FOR ${visitType}:**
`;

      if (visit.visit_type === 'admission') {
        prompt += `
SOC/ROC CRITICAL ITEMS:
- Complete medication reconciliation REQUIRED
- All ADL/IADL baselines REQUIRED
- Functional limitations clearly documented
- Primary caregiver assessment REQUIRED
- Safety assessment REQUIRED
- Homebound status clearly justified
`;
      } else if (visit.visit_type === 'recertification') {
        prompt += `
RECERTIFICATION CRITICAL ITEMS:
- Progress toward goals documented for ALL items
- Comparison to previous OASIS timepoint
- Continued need for services clearly justified
- Updated medication list
- Functional status reassessment (any changes?)
- Homebound status reaffirmed
`;
      } else if (visit.visit_type === 'discharge') {
        prompt += `
DISCHARGE CRITICAL ITEMS:
- Reason for discharge clearly stated
- Final functional status assessment
- Discharge disposition documented
- Emergent care since last assessment
- Patient outcomes achieved
`;
      }

      prompt += `

---

**YOUR TASK:**

Analyze the documentation and identify:
1. MISSING OASIS data elements (critical for submission)
2. INCOMPLETE assessments (vague or insufficient detail)
3. INCONSISTENCIES (conflicting information)
4. REIMBURSEMENT RISKS (issues that could affect PDGM case mix)

Return a detailed JSON assessment report:

{
  "overall_score": 0-100,
  "completeness_percentage": 0-100,
  "ready_for_submission": true | false,
  "reimbursement_risk_level": "low" | "medium" | "high" | "critical",
  "estimated_case_mix_impact": "Brief assessment of how missing data could affect PDGM payment",
  "critical_missing": [
    {
      "oasis_item": "M-item number and name",
      "category": "Demographics|ADL|Clinical|Medications|etc",
      "why_critical": "Impact on compliance/reimbursement",
      "documentation_guidance": "Specific instructions on what to document",
      "example": "Example of compliant documentation",
      "reimbursement_impact": "high" | "medium" | "low"
    }
  ],
  "incomplete_assessments": [
    {
      "oasis_item": "M-item number",
      "current_documentation": "Quote from note",
      "issue": "What's missing or vague",
      "guidance": "How to improve",
      "example": "Better version"
    }
  ],
  "inconsistencies": [
    {
      "issue": "Description of inconsistency",
      "conflicting_info": ["statement 1", "statement 2"],
      "resolution": "How to fix"
    }
  ],
  "compliant_items": [
    {
      "oasis_item": "M-item",
      "category": "category",
      "evidence": "Quote showing it's documented"
    }
  ],
  "recommendations": [
    "Specific actionable recommendation"
  ],
  "star_rating_considerations": [
    "Items that impact HH CAHPS or quality measures"
  ]
}

Be thorough and specific. Focus on items that impact Medicare payment and quality reporting.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: { type: "number" },
            completeness_percentage: { type: "number" },
            ready_for_submission: { type: "boolean" },
            reimbursement_risk_level: { type: "string" },
            estimated_case_mix_impact: { type: "string" },
            critical_missing: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  oasis_item: { type: "string" },
                  category: { type: "string" },
                  why_critical: { type: "string" },
                  documentation_guidance: { type: "string" },
                  example: { type: "string" },
                  reimbursement_impact: { type: "string" }
                }
              }
            },
            incomplete_assessments: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  oasis_item: { type: "string" },
                  current_documentation: { type: "string" },
                  issue: { type: "string" },
                  guidance: { type: "string" },
                  example: { type: "string" }
                }
              }
            },
            inconsistencies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  issue: { type: "string" },
                  conflicting_info: { type: "array", items: { type: "string" } },
                  resolution: { type: "string" }
                }
              }
            },
            compliant_items: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  oasis_item: { type: "string" },
                  category: { type: "string" },
                  evidence: { type: "string" }
                }
              }
            },
            recommendations: {
              type: "array",
              items: { type: "string" }
            },
            star_rating_considerations: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setOasisResults(result);
      
      await logSecurityEvent('OASIS_SCRUBBER_COMPLETED', { 
        visit_id: visit.id,
        score: result.overall_score,
        ready_for_submission: result.ready_for_submission,
        reimbursement_risk: result.reimbursement_risk_level
      });

    } catch (error) {
      console.error("Error running OASIS scrubber:", error);
      alert("Error running OASIS compliance check. Please try again.");
      await logSecurityEvent('OASIS_SCRUBBER_ERROR', { 
        visit_id: visit.id,
        error: error.message 
      });
    }
    
    setIsScrubbing(false);
  };

  const toggleCategory = (category) => {
    if (expandedCategories.includes(category)) {
      setExpandedCategories(expandedCategories.filter(c => c !== category));
    } else {
      setExpandedCategories([...expandedCategories, category]);
    }
  };

  const handleQuickFix = (guidance, example) => {
    const fixText = `\n\n${guidance}\n\nExample: ${example}`;
    if (onFixSuggestion) {
      onFixSuggestion(fixText);
    }
  };

  const getRiskColor = (risk) => {
    switch (risk) {
      case 'low': return 'bg-green-100 text-green-800 border-green-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getImpactBadge = (impact) => {
    const colors = {
      high: 'bg-red-500',
      medium: 'bg-yellow-500',
      low: 'bg-blue-500'
    };
    return colors[impact] || 'bg-gray-500';
  };

  // Don't show for hospice patients
  if (!isHomeHealth) {
    return null;
  }

  return (
    <>
      <Card className="mb-6 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-green-600 to-emerald-600 rounded-full flex items-center justify-center shadow-lg">
                <FileCheck className="w-6 h-6 text-white" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900 flex items-center gap-2">
                  OASIS Compliance Scrubber
                  {isOASISVisit && (
                    <Badge className="bg-blue-600">OASIS Visit</Badge>
                  )}
                </h3>
                <p className="text-sm text-gray-600">
                  Check for missing OASIS data elements and reimbursement risks
                </p>
              </div>
            </div>
            <Button
              onClick={runOASISScrubber}
              disabled={isScrubbing || !narrativeText}
              size="lg"
              className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
            >
              {isScrubbing ? (
                <>
                  <Sparkles className="w-5 h-5 mr-2 animate-spin" />
                  Analyzing OASIS...
                </>
              ) : (
                <>
                  <ShieldCheck className="w-5 h-5 mr-2" />
                  Run OASIS Check
                </>
              )}
            </Button>
          </div>

          {!isOASISVisit && (
            <Alert className="mt-4 bg-blue-50 border-blue-200">
              <Info className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-900 text-sm">
                This is a {visit?.visit_type?.replace(/_/g, ' ')} visit. OASIS comprehensive assessment is required for Start of Care, Recertification, and Discharge visits only. However, this scrubber can still help ensure complete clinical documentation.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Results Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3 text-2xl">
              <FileCheck className="w-7 h-7 text-green-600" />
              OASIS Compliance Report
            </DialogTitle>
            <DialogDescription>
              Comprehensive OASIS data completeness check for Medicare home health reimbursement
            </DialogDescription>
          </DialogHeader>

          {isScrubbing ? (
            <div className="py-12 text-center space-y-4">
              <Sparkles className="w-16 h-16 mx-auto text-green-600 animate-pulse" />
              <div>
                <p className="text-lg font-semibold text-gray-900">Analyzing OASIS Compliance...</p>
                <p className="text-sm text-gray-600 mt-2">
                  Checking against CMS OASIS-E requirements for {visit?.visit_type?.replace(/_/g, ' ')} visits
                </p>
              </div>
            </div>
          ) : oasisResults ? (
            <div className="space-y-6 py-4">
              {/* Overall Score Card */}
              <div className="bg-white rounded-lg border-2 border-gray-200 p-6">
                <div className="grid grid-cols-2 gap-6 mb-4">
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">
                      Completeness: {oasisResults.completeness_percentage}%
                    </h3>
                    <p className="text-sm text-gray-600">OASIS data elements documented</p>
                    <Progress value={oasisResults.completeness_percentage} className="h-3 mt-2" />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 mb-1">
                      Quality Score: {oasisResults.overall_score}/100
                    </h3>
                    <p className="text-sm text-gray-600">Documentation quality rating</p>
                    <Progress value={oasisResults.overall_score} className="h-3 mt-2" />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Reimbursement Risk</p>
                    <Badge className={getRiskColor(oasisResults.reimbursement_risk_level)}>
                      {oasisResults.reimbursement_risk_level?.toUpperCase()} RISK
                    </Badge>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Submission Status</p>
                    {oasisResults.ready_for_submission ? (
                      <Badge className="bg-green-100 text-green-800 border-green-300">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        READY
                      </Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-800 border-red-300">
                        <XCircle className="w-3 h-3 mr-1" />
                        NOT READY
                      </Badge>
                    )}
                  </div>
                </div>

                {oasisResults.estimated_case_mix_impact && (
                  <Alert className="bg-yellow-50 border-yellow-200">
                    <DollarSign className="w-4 h-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-900">
                      <strong>PDGM Payment Impact:</strong> {oasisResults.estimated_case_mix_impact}
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {/* Critical Missing Items */}
              {oasisResults.critical_missing && oasisResults.critical_missing.length > 0 && (
                <div className="space-y-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer bg-red-50 p-4 rounded-lg border-2 border-red-200"
                    onClick={() => toggleCategory('critical')}
                  >
                    <div className="flex items-center gap-3">
                      <XCircle className="w-6 h-6 text-red-600" />
                      <div>
                        <h4 className="font-bold text-red-900 text-lg">
                          Critical Missing OASIS Items ({oasisResults.critical_missing.length})
                        </h4>
                        <p className="text-xs text-red-700">These items are REQUIRED for submission and reimbursement</p>
                      </div>
                    </div>
                    {expandedCategories.includes('critical') ? (
                      <ChevronUp className="w-5 h-5 text-red-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-red-600" />
                    )}
                  </div>

                  {expandedCategories.includes('critical') && (
                    <div className="space-y-3">
                      {oasisResults.critical_missing.map((item, index) => (
                        <Card key={index} className="border-l-4 border-l-red-500 bg-red-50">
                          <CardContent className="p-4 space-y-3">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <h5 className="font-bold text-red-900">{item.oasis_item}</h5>
                                  <Badge variant="outline" className="bg-red-100 text-red-800 border-red-300 text-xs">
                                    {item.category}
                                  </Badge>
                                  <Badge className={`${getImpactBadge(item.reimbursement_impact)} text-white text-xs`}>
                                    {item.reimbursement_impact?.toUpperCase()} IMPACT
                                  </Badge>
                                </div>
                                <p className="text-sm text-red-800 mb-2">
                                  <strong>Why Critical:</strong> {item.why_critical}
                                </p>
                              </div>
                            </div>

                            <div className="bg-white p-3 rounded border border-red-200">
                              <p className="text-xs font-semibold text-gray-700 mb-1">
                                <Info className="w-3 h-3 inline mr-1" />
                                Documentation Guidance:
                              </p>
                              <p className="text-sm text-gray-900">{item.documentation_guidance}</p>
                            </div>

                            <div className="bg-green-50 p-3 rounded border border-green-200">
                              <p className="text-xs font-semibold text-green-900 mb-1">
                                ✓ Example of Compliant Documentation:
                              </p>
                              <p className="text-sm text-green-900 italic">"{item.example}"</p>
                            </div>

                            <Button
                              size="sm"
                              onClick={() => handleQuickFix(item.documentation_guidance, item.example)}
                              className="w-full bg-red-600 hover:bg-red-700"
                            >
                              <Sparkles className="w-4 h-4 mr-2" />
                              Add Guidance to Note
                            </Button>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Incomplete Assessments */}
              {oasisResults.incomplete_assessments && oasisResults.incomplete_assessments.length > 0 && (
                <div className="space-y-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer bg-yellow-50 p-4 rounded-lg border-2 border-yellow-200"
                    onClick={() => toggleCategory('incomplete')}
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-6 h-6 text-yellow-600" />
                      <div>
                        <h4 className="font-bold text-yellow-900 text-lg">
                          Incomplete Assessments ({oasisResults.incomplete_assessments.length})
                        </h4>
                        <p className="text-xs text-yellow-700">These items need more specific detail</p>
                      </div>
                    </div>
                    {expandedCategories.includes('incomplete') ? (
                      <ChevronUp className="w-5 h-5 text-yellow-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-yellow-600" />
                    )}
                  </div>

                  {expandedCategories.includes('incomplete') && (
                    <div className="space-y-3">
                      {oasisResults.incomplete_assessments.map((item, index) => (
                        <Card key={index} className="border-l-4 border-l-yellow-500 bg-yellow-50">
                          <CardContent className="p-4 space-y-2">
                            <h5 className="font-semibold text-yellow-900">{item.oasis_item}</h5>
                            
                            {item.current_documentation && (
                              <div className="bg-white p-2 rounded border border-yellow-200">
                                <p className="text-xs text-gray-600">Current documentation:</p>
                                <p className="text-sm text-gray-900 italic">"{item.current_documentation}"</p>
                              </div>
                            )}

                            <div className="bg-red-50 p-2 rounded border border-red-200">
                              <p className="text-xs text-red-900">
                                <strong>Issue:</strong> {item.issue}
                              </p>
                            </div>

                            <div className="bg-blue-50 p-2 rounded border border-blue-200">
                              <p className="text-xs text-blue-900">
                                <strong>Guidance:</strong> {item.guidance}
                              </p>
                            </div>

                            {item.example && (
                              <div className="bg-green-50 p-2 rounded border border-green-200">
                                <p className="text-xs text-green-900">
                                  <strong>Better:</strong> "{item.example}"
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Inconsistencies */}
              {oasisResults.inconsistencies && oasisResults.inconsistencies.length > 0 && (
                <div className="space-y-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer bg-orange-50 p-4 rounded-lg border-2 border-orange-200"
                    onClick={() => toggleCategory('inconsistencies')}
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-6 h-6 text-orange-600" />
                      <div>
                        <h4 className="font-bold text-orange-900 text-lg">
                          Inconsistencies Found ({oasisResults.inconsistencies.length})
                        </h4>
                        <p className="text-xs text-orange-700">Conflicting information that needs resolution</p>
                      </div>
                    </div>
                    {expandedCategories.includes('inconsistencies') ? (
                      <ChevronUp className="w-5 h-5 text-orange-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-orange-600" />
                    )}
                  </div>

                  {expandedCategories.includes('inconsistencies') && (
                    <div className="bg-orange-50 p-4 rounded border border-orange-200 space-y-3">
                      {oasisResults.inconsistencies.map((item, index) => (
                        <div key={index} className="bg-white p-3 rounded border border-orange-300">
                          <p className="font-semibold text-orange-900 mb-2">{item.issue}</p>
                          <div className="space-y-1 mb-2">
                            {item.conflicting_info?.map((info, idx) => (
                              <p key={idx} className="text-sm text-gray-700">
                                • "{info}"
                              </p>
                            ))}
                          </div>
                          <p className="text-sm text-orange-900">
                            <strong>Resolution:</strong> {item.resolution}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Compliant Items */}
              {oasisResults.compliant_items && oasisResults.compliant_items.length > 0 && (
                <div className="space-y-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer bg-green-50 p-4 rounded-lg border-2 border-green-200"
                    onClick={() => toggleCategory('compliant')}
                  >
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                      <div>
                        <h4 className="font-bold text-green-900 text-lg">
                          Compliant OASIS Items ({oasisResults.compliant_items.length})
                        </h4>
                        <p className="text-xs text-green-700">These items are properly documented</p>
                      </div>
                    </div>
                    {expandedCategories.includes('compliant') ? (
                      <ChevronUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-green-600" />
                    )}
                  </div>

                  {expandedCategories.includes('compliant') && (
                    <div className="grid grid-cols-2 gap-2">
                      {oasisResults.compliant_items.map((item, index) => (
                        <div key={index} className="bg-green-50 p-3 rounded border border-green-200">
                          <div className="flex items-start gap-2">
                            <CheckCircle2 className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold text-green-900">{item.oasis_item}</p>
                              <Badge variant="outline" className="text-xs mt-1">{item.category}</Badge>
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
              {oasisResults.recommendations && oasisResults.recommendations.length > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-200">
                  <h4 className="font-bold text-blue-900 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    OASIS Documentation Recommendations
                  </h4>
                  <ul className="space-y-2">
                    {oasisResults.recommendations.map((rec, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-blue-900">
                        <span className="font-bold text-blue-600 mt-0.5">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Star Rating Considerations */}
              {oasisResults.star_rating_considerations && oasisResults.star_rating_considerations.length > 0 && (
                <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
                  <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Star Rating & Quality Measure Considerations
                  </h4>
                  <ul className="space-y-2">
                    {oasisResults.star_rating_considerations.map((consideration, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-purple-900">
                        <span className="font-bold text-purple-600 mt-0.5">★</span>
                        <span>{consideration}</span>
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
            {oasisResults && !oasisResults.ready_for_submission && (
              <Button
                onClick={() => {
                  setShowDialog(false);
                  document.querySelector('textarea')?.focus();
                }}
                className="bg-green-600 hover:bg-green-700"
              >
                Fix Issues in Documentation
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
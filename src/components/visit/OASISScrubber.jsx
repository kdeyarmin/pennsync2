import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  ChevronUp,
  BookOpen,
  MessageSquare
} from "lucide-react";
import { logSecurityEvent } from "../utils/security";
import OASISFeedbackPanel from "../oasis/OASISFeedbackPanel";
import CMSComplianceReference from "../oasis/CMSComplianceReference";

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
  const [activeTab, setActiveTab] = useState("results");
  const [acceptedSuggestions, setAcceptedSuggestions] = useState([]);
  const [feedbackStats, setFeedbackStats] = useState({ accepted: 0, rejected: 0, modified: 0 });

  const isHomeHealth = patient?.care_type === 'home_health';
  const isOASISVisit = ['admission', 'recertification', 'discharge'].includes(visit?.visit_type);

  const runOASISScrubber = async () => {
    setIsScrubbing(true);
    setShowDialog(true);
    
    try {
      await logSecurityEvent('OASIS_SCRUBBER_STARTED', { visit_id: visit.id });

      const visitType = visit.visit_type.replace(/_/g, ' ').toUpperCase();

      let prompt = `You are a CMS-certified OASIS-E compliance auditor with expertise in 2024 Medicare home health CoP regulations. Perform RIGOROUS completeness and accuracy check for ${visitType}.

PATIENT:
- Visit Type: ${visitType}
- Primary Dx: ${patient.primary_diagnosis || 'Not specified'}
- Date: ${visit.visit_date}

DOCUMENTATION:
${narrativeText || '[No documentation]'}

VITALS:
${Object.keys(vitalSigns).length > 0 ? JSON.stringify(vitalSigns, null, 2) : 'None'}

---

OASIS-E 2024 REQUIRED ELEMENTS (${visitType}):

**SECTION GG: FUNCTIONAL ABILITIES (PDGM CRITICAL - affects payment)**
GG0130: Self-Care
- A. Eating (01-06, 07=refused, 09=NA, 10=not attempted, 88=prior)
- B. Oral hygiene (01-06)
- C. Toileting hygiene (01-06)
- E. Shower/bathe self (01-06)
- F. Upper body dressing (01-06)
- G. Lower body dressing (01-06)
- H. Putting on/taking off footwear (01-06)

GG0170: Mobility
- B. Sit to lying (01-06)
- C. Lying to sitting (01-06)
- D. Sit to stand (01-06)
- E. Chair/bed-to-chair transfer (01-06)
- F. Toilet transfer (01-06)
- I. Walk 10 feet (01-06)
- J. Walk 50 feet with 2 turns (01-06)
- K. Walk 150 feet (01-06)
- L. Walk 10 feet uneven (01-06)
- M. 1 step curb (01-06)
- N. 4 steps (01-06)
- O. 12 steps (01-06)
- P. Picking up object (01-06)
- R. Wheel 50 feet (01-06)
- RR. Wheel 150 feet (01-06)

**GG SCORING SCALE** (use exact codes):
06=Independent, 05=Setup/cleanup, 04=Supervision/touching, 03=Partial/moderate, 02=Substantial/maximal, 01=Dependent

**M1800-M1860 FUNCTIONAL STATUS (Legacy - still required)**
- M1800 Grooming (0-3): 0=Indep, 1=Setup, 2=Assist, 3=Dependent
- M1810 Dress Upper (0-3)
- M1820 Dress Lower (0-3)
- M1830 Bathing (0-6): Higher=more impaired
- M1840 Toilet Transfer (0-4)
- M1850 Transferring (0-5)
- M1860 Ambulation (0-6)

**CLINICAL ITEMS (ICD-10 Required)**
- M1021: Primary Dx (must be valid ICD-10, symptom-level)
- M1023: Secondary Dx (up to 24, affects comorbidity adjustment)
- M1028: Active Dx list
- M1030: Therapy need at SOC/ROC
- M1033: Risk for hospitalization (LACE score factors)

**INTEGUMENTARY (Wound documentation)**
- M1306: Unhealed pressure ulcers (Yes/No)
- M1311: Current number of stage 2-4 PU
- M1322: Stage of most problematic PU
- M1324: Stage 2 PU that was present at SOC/ROC
- M1330: Stasis ulcer present
- M1340: Surgical wound present
- M1342: Surgical wound status

**MEDICATIONS (High-risk drug review)**
- M2001: Drug regimen review conducted
- M2003: Medication follow-up (if issues found)
- M2005: Medication intervention (education provided)
- M2010: Patient receiving HIGH-RISK drugs
- M2020: Management of oral meds
- M2030: Management of injectable meds

---

**${visitType} SPECIFIC REQUIREMENTS:**
`;

      if (visit.visit_type === 'admission') {
        prompt += `
SOC/ROC MANDATORY:
- ALL GG items with admission AND discharge goal scores
- Complete medication reconciliation with HIGH-RISK drug identification
- Baseline functional scores (M1800-M1860) - DOCUMENT WORST ABILITY
- BIMS or CAM for cognitive screening
- PHQ-2/PHQ-9 depression screening
- Fall risk assessment with interventions
- Homebound status with 2+ criteria documented
- Primary caregiver capability assessment
- 60-day prognosis statement
`;
      } else if (visit.visit_type === 'recertification') {
        prompt += `
RECERTIFICATION MANDATORY:
- Functional status COMPARISON to prior assessment (improved/same/declined)
- Updated GG scores with goal progress
- Continued homebound justification (re-document criteria)
- Skilled need justification (why services still needed)
- Updated medication list with reconciliation
- Wound healing progress (if applicable)
- Fall risk re-assessment
- Care plan goal achievement status
`;
      } else if (visit.visit_type === 'discharge') {
        prompt += `
DISCHARGE MANDATORY:
- M2410: Discharge disposition (specific destination)
- Final GG scores (actual vs goal comparison)
- M2301: Emergent care since last assessment
- Outcome summary for each care plan goal
- Final functional status M1800-M1860
- Discharge medication list
- Patient/caregiver education completed
- Follow-up appointments scheduled
`;
      }

      prompt += `

---

**ACCURACY VALIDATION RULES:**
1. Functional scores must match narrative description (if "needs assist with bathing" then M1830 cannot be 0)
2. Diagnosis must support functional limitations documented
3. GG scores must be internally consistent (can't walk 150ft if can't walk 10ft)
4. Wound staging must match size/depth description
5. Medication count must match med list in narrative
6. Cognitive score must align with behavioral observations

Identify:
1. MISSING required items (by M-number)
2. INCONSISTENCIES between narrative and likely OASIS response
3. UNDERSCORING opportunities (documentation supports higher acuity)
4. OVERSCORING risks (documentation doesn't support claimed impairment)

Return JSON:

{
  "overall_score": 0-100,
  "completeness_percentage": 0-100,
  "ready_for_submission": true|false,
  "reimbursement_risk_level": "low|medium|high|critical",
  "pdgm_analysis": {
    "clinical_group": "MMTA category",
    "functional_level": "low|medium|high",
    "comorbidity_adjustment": "none|low|high",
    "estimated_case_mix_weight": "X.XXXX",
    "optimization_potential": "$XXX-$XXX per episode"
  },
  "functional_score_analysis": {
    "m1800_grooming": {"documented_value": 0-3, "supported_by": "quote", "accuracy": "accurate|underscored|overscored"},
    "m1810_dress_upper": {"documented_value": 0-3, "supported_by": "quote", "accuracy": "accurate|underscored|overscored"},
    "m1820_dress_lower": {"documented_value": 0-3, "supported_by": "quote", "accuracy": "accurate|underscored|overscored"},
    "m1830_bathing": {"documented_value": 0-6, "supported_by": "quote", "accuracy": "accurate|underscored|overscored"},
    "m1840_toilet_transfer": {"documented_value": 0-4, "supported_by": "quote", "accuracy": "accurate|underscored|overscored"},
    "m1850_transferring": {"documented_value": 0-5, "supported_by": "quote", "accuracy": "accurate|underscored|overscored"},
    "m1860_ambulation": {"documented_value": 0-6, "supported_by": "quote", "accuracy": "accurate|underscored|overscored"},
    "total_functional_points": 0-30,
    "functional_level_result": "low|medium|high"
  },
  "critical_missing": [
    {
      "oasis_item": "M-number: Name",
      "category": "Functional|Clinical|Medications|Wounds|GG",
      "pdgm_impact": "Affects clinical group|functional level|comorbidity",
      "why_critical": "Specific CMS requirement",
      "documentation_guidance": "Exact wording needed",
      "example": "Patient requires moderate assistance (2 person) for shower transfers due to lower extremity weakness and balance impairment.",
      "reimbursement_impact": "high|medium|low",
      "estimated_revenue_impact": "$XXX per episode"
    }
  ],
  "underscoring_opportunities": [
    {
      "oasis_item": "M-number",
      "current_score": "documented value",
      "supported_score": "higher value supported by narrative",
      "narrative_evidence": "exact quote",
      "revenue_impact": "$XXX difference"
    }
  ],
  "overscoring_risks": [
    {
      "oasis_item": "M-number",
      "claimed_score": "documented value",
      "supported_score": "lower value actually supported",
      "audit_risk": "high|medium",
      "recommendation": "Add documentation or adjust score"
    }
  ],
  "inconsistencies": [
    {
      "issue": "description",
      "narrative_states": "quote 1",
      "conflicts_with": "quote 2 or implied OASIS response",
      "resolution": "specific fix"
    }
  ],
  "compliant_items": [{"oasis_item": "M-number", "category": "cat", "evidence": "quote"}],
  "recommendations": ["actionable items ranked by revenue impact"],
  "quality_measures_impact": ["HH-CAHPS and HHQI items affected"]
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: { type: "number" },
            completeness_percentage: { type: "number" },
            ready_for_submission: { type: "boolean" },
            reimbursement_risk_level: { type: "string" },
            pdgm_analysis: {
              type: "object",
              properties: {
                clinical_group: { type: "string" },
                functional_level: { type: "string" },
                comorbidity_adjustment: { type: "string" },
                estimated_case_mix_weight: { type: "string" },
                optimization_potential: { type: "string" }
              }
            },
            functional_score_analysis: {
              type: "object",
              properties: {
                m1800_grooming: { type: "object" },
                m1810_dress_upper: { type: "object" },
                m1820_dress_lower: { type: "object" },
                m1830_bathing: { type: "object" },
                m1840_toilet_transfer: { type: "object" },
                m1850_transferring: { type: "object" },
                m1860_ambulation: { type: "object" },
                total_functional_points: { type: "number" },
                functional_level_result: { type: "string" }
              }
            },
            critical_missing: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  oasis_item: { type: "string" },
                  category: { type: "string" },
                  pdgm_impact: { type: "string" },
                  why_critical: { type: "string" },
                  documentation_guidance: { type: "string" },
                  example: { type: "string" },
                  reimbursement_impact: { type: "string" },
                  estimated_revenue_impact: { type: "string" }
                }
              }
            },
            underscoring_opportunities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  oasis_item: { type: "string" },
                  current_score: { type: "string" },
                  supported_score: { type: "string" },
                  narrative_evidence: { type: "string" },
                  revenue_impact: { type: "string" }
                }
              }
            },
            overscoring_risks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  oasis_item: { type: "string" },
                  claimed_score: { type: "string" },
                  supported_score: { type: "string" },
                  audit_risk: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            },
            inconsistencies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  issue: { type: "string" },
                  narrative_states: { type: "string" },
                  conflicts_with: { type: "string" },
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
            recommendations: { type: "array", items: { type: "string" } },
            quality_measures_impact: { type: "array", items: { type: "string" } }
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

  const handleSuggestionAccept = (suggestion, suggestionType) => {
    setAcceptedSuggestions(prev => [...prev, { ...suggestion, type: suggestionType }]);
    setFeedbackStats(prev => ({ ...prev, accepted: prev.accepted + 1 }));
    if (suggestion.example || suggestion.documentation_guidance) {
      handleQuickFix(suggestion.documentation_guidance || '', suggestion.example || '');
    }
  };

  const handleSuggestionReject = (reason) => {
    setFeedbackStats(prev => ({ ...prev, rejected: prev.rejected + 1 }));
  };

  const handleSuggestionModify = (modifiedText) => {
    setFeedbackStats(prev => ({ ...prev, modified: prev.modified + 1 }));
    if (onFixSuggestion) {
      onFixSuggestion(`\n\n${modifiedText}`);
    }
  };

  const handleInsertGuidance = (itemKey, item) => {
    if (onFixSuggestion && item) {
      let guidance = `\n\n[${itemKey}: ${item.name}]\n`;
      if (item.description) guidance += `${item.description}\n`;
      if (item.scoringScale) {
        guidance += "Scoring: ";
        guidance += Object.entries(item.scoringScale).map(([k, v]) => `${k}=${v}`).join(', ');
      }
      onFixSuggestion(guidance);
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
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="results" className="gap-2">
                  <FileCheck className="w-4 h-4" />
                  Results
                </TabsTrigger>
                <TabsTrigger value="reference" className="gap-2">
                  <BookOpen className="w-4 h-4" />
                  CMS Reference
                </TabsTrigger>
                <TabsTrigger value="feedback" className="gap-2">
                  <MessageSquare className="w-4 h-4" />
                  Feedback ({feedbackStats.accepted + feedbackStats.rejected + feedbackStats.modified})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="reference">
                <CMSComplianceReference onInsertGuidance={handleInsertGuidance} />
              </TabsContent>

              <TabsContent value="feedback">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Your Feedback Summary</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div className="bg-green-50 p-4 rounded-lg border border-green-200 text-center">
                        <p className="text-3xl font-bold text-green-700">{feedbackStats.accepted}</p>
                        <p className="text-sm text-green-600">Accepted</p>
                      </div>
                      <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 text-center">
                        <p className="text-3xl font-bold text-blue-700">{feedbackStats.modified}</p>
                        <p className="text-sm text-blue-600">Modified</p>
                      </div>
                      <div className="bg-red-50 p-4 rounded-lg border border-red-200 text-center">
                        <p className="text-3xl font-bold text-red-700">{feedbackStats.rejected}</p>
                        <p className="text-sm text-red-600">Rejected</p>
                      </div>
                    </div>
                    <Alert className="bg-blue-50 border-blue-200">
                      <Info className="w-4 h-4 text-blue-600" />
                      <AlertDescription className="text-blue-800 text-sm">
                        Your feedback helps improve AI accuracy for reimbursement impact assessments and documentation suggestions. All feedback is used to enhance future recommendations.
                      </AlertDescription>
                    </Alert>
                    {acceptedSuggestions.length > 0 && (
                      <div className="mt-4">
                        <h4 className="font-semibold text-gray-900 mb-2">Applied Suggestions:</h4>
                        <div className="space-y-2 max-h-48 overflow-y-auto">
                          {acceptedSuggestions.map((s, idx) => (
                            <div key={idx} className="flex items-center gap-2 p-2 bg-green-50 rounded border border-green-200 text-sm">
                              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
                              <span className="text-green-900">{s.oasis_item || s.type}: Applied</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="results">
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

                {/* PDGM Analysis Section */}
                {oasisResults.pdgm_analysis && (
                  <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200 mb-4">
                    <h4 className="font-bold text-green-900 mb-3 flex items-center gap-2">
                      <DollarSign className="w-5 h-5" />
                      PDGM Case-Mix Analysis
                    </h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div className="bg-white p-2 rounded border">
                        <p className="text-xs text-gray-500">Clinical Group</p>
                        <p className="font-semibold text-gray-900">{oasisResults.pdgm_analysis.clinical_group}</p>
                      </div>
                      <div className="bg-white p-2 rounded border">
                        <p className="text-xs text-gray-500">Functional Level</p>
                        <p className={`font-semibold ${
                          oasisResults.pdgm_analysis.functional_level === 'high' ? 'text-green-700' :
                          oasisResults.pdgm_analysis.functional_level === 'medium' ? 'text-yellow-700' : 'text-red-700'
                        }`}>{oasisResults.pdgm_analysis.functional_level?.toUpperCase()}</p>
                      </div>
                      <div className="bg-white p-2 rounded border">
                        <p className="text-xs text-gray-500">Comorbidity Adj.</p>
                        <p className="font-semibold text-gray-900">{oasisResults.pdgm_analysis.comorbidity_adjustment}</p>
                      </div>
                      <div className="bg-white p-2 rounded border">
                        <p className="text-xs text-gray-500">Case-Mix Weight</p>
                        <p className="font-semibold text-green-700">{oasisResults.pdgm_analysis.estimated_case_mix_weight}</p>
                      </div>
                    </div>
                    {oasisResults.pdgm_analysis.optimization_potential && (
                      <Alert className="mt-3 bg-green-100 border-green-300">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <AlertDescription className="text-green-900 text-sm">
                          <strong>Optimization Potential:</strong> {oasisResults.pdgm_analysis.optimization_potential}
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                )}

                {/* Functional Score Analysis */}
                {oasisResults.functional_score_analysis && (
                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <h4 className="font-bold text-blue-900 mb-3">Functional Score Breakdown</h4>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                      {['m1800_grooming', 'm1810_dress_upper', 'm1820_dress_lower', 'm1830_bathing', 'm1840_toilet_transfer', 'm1850_transferring', 'm1860_ambulation'].map(key => {
                        const item = oasisResults.functional_score_analysis[key];
                        if (!item) return null;
                        return (
                          <div key={key} className={`p-2 rounded border ${
                            item.accuracy === 'underscored' ? 'bg-yellow-100 border-yellow-300' :
                            item.accuracy === 'overscored' ? 'bg-red-100 border-red-300' :
                            'bg-white border-gray-200'
                          }`}>
                            <p className="font-medium text-gray-700">{key.replace('m', 'M').replace(/_/g, ' ')}</p>
                            <p className="text-lg font-bold">{item.documented_value ?? '?'}</p>
                            {item.accuracy !== 'accurate' && (
                              <Badge className={`text-xs ${item.accuracy === 'underscored' ? 'bg-yellow-500' : 'bg-red-500'}`}>
                                {item.accuracy}
                              </Badge>
                            )}
                          </div>
                        );
                      })}
                      <div className="p-2 rounded border bg-indigo-100 border-indigo-300">
                        <p className="font-medium text-indigo-700">Total Points</p>
                        <p className="text-lg font-bold text-indigo-900">{oasisResults.functional_score_analysis.total_functional_points ?? '?'}</p>
                        <Badge className="bg-indigo-600 text-xs">{oasisResults.functional_score_analysis.functional_level_result}</Badge>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Underscoring Opportunities */}
              {oasisResults.underscoring_opportunities && oasisResults.underscoring_opportunities.length > 0 && (
                <div className="space-y-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer bg-green-50 p-4 rounded-lg border-2 border-green-200"
                    onClick={() => toggleCategory('underscoring')}
                  >
                    <div className="flex items-center gap-3">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                      <div>
                        <h4 className="font-bold text-green-900 text-lg">
                          💰 Underscoring Opportunities ({oasisResults.underscoring_opportunities.length})
                        </h4>
                        <p className="text-xs text-green-700">Documentation supports higher scores - potential revenue increase</p>
                      </div>
                    </div>
                    {expandedCategories.includes('underscoring') ? (
                      <ChevronUp className="w-5 h-5 text-green-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-green-600" />
                    )}
                  </div>

                  {expandedCategories.includes('underscoring') && (
                    <div className="space-y-3">
                      {oasisResults.underscoring_opportunities.map((item, index) => (
                        <Card key={index} className="border-l-4 border-l-green-500 bg-green-50">
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <h5 className="font-bold text-green-900">{item.oasis_item}</h5>
                              <Badge className="bg-green-600">{item.revenue_impact}</Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="bg-white p-2 rounded border">
                                <p className="text-xs text-gray-500">Current Score</p>
                                <p className="font-semibold text-gray-700">{item.current_score}</p>
                              </div>
                              <div className="bg-green-100 p-2 rounded border border-green-300">
                                <p className="text-xs text-green-700">Supported Score</p>
                                <p className="font-semibold text-green-800">{item.supported_score}</p>
                              </div>
                            </div>
                            <div className="bg-white p-2 rounded border text-sm">
                              <p className="text-xs text-gray-500">Evidence from Narrative:</p>
                              <p className="text-gray-900 italic">"{item.narrative_evidence}"</p>
                            </div>
                            <OASISFeedbackPanel
                              suggestion={item}
                              suggestionType="underscoring"
                              oasisItem={item.oasis_item}
                              visitId={visit?.id}
                              patientId={patient?.id}
                              onAccept={() => handleSuggestionAccept(item, 'underscoring')}
                              onReject={handleSuggestionReject}
                              onModify={handleSuggestionModify}
                              reimbursementImpact={item.revenue_impact}
                            />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Overscoring Risks */}
              {oasisResults.overscoring_risks && oasisResults.overscoring_risks.length > 0 && (
                <div className="space-y-3">
                  <div 
                    className="flex items-center justify-between cursor-pointer bg-red-50 p-4 rounded-lg border-2 border-red-200"
                    onClick={() => toggleCategory('overscoring')}
                  >
                    <div className="flex items-center gap-3">
                      <AlertTriangle className="w-6 h-6 text-red-600" />
                      <div>
                        <h4 className="font-bold text-red-900 text-lg">
                          ⚠️ Overscoring Risks ({oasisResults.overscoring_risks.length})
                        </h4>
                        <p className="text-xs text-red-700">Claimed scores not fully supported - audit risk</p>
                      </div>
                    </div>
                    {expandedCategories.includes('overscoring') ? (
                      <ChevronUp className="w-5 h-5 text-red-600" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-red-600" />
                    )}
                  </div>

                  {expandedCategories.includes('overscoring') && (
                    <div className="space-y-3">
                      {oasisResults.overscoring_risks.map((item, index) => (
                        <Card key={index} className="border-l-4 border-l-red-500 bg-red-50">
                          <CardContent className="p-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <h5 className="font-bold text-red-900">{item.oasis_item}</h5>
                              <Badge className={`${item.audit_risk === 'high' ? 'bg-red-600' : 'bg-orange-500'}`}>
                                {item.audit_risk} audit risk
                              </Badge>
                            </div>
                            <div className="grid grid-cols-2 gap-2 text-sm">
                              <div className="bg-red-100 p-2 rounded border border-red-200">
                                <p className="text-xs text-red-700">Claimed Score</p>
                                <p className="font-semibold text-red-800">{item.claimed_score}</p>
                              </div>
                              <div className="bg-white p-2 rounded border">
                                <p className="text-xs text-gray-500">Supported Score</p>
                                <p className="font-semibold text-gray-700">{item.supported_score}</p>
                              </div>
                            </div>
                            <Alert className="bg-white border-red-200">
                              <AlertDescription className="text-red-900 text-sm">
                                <strong>Recommendation:</strong> {item.recommendation}
                              </AlertDescription>
                            </Alert>
                            <OASISFeedbackPanel
                              suggestion={item}
                              suggestionType="overscoring"
                              oasisItem={item.oasis_item}
                              visitId={visit?.id}
                              patientId={patient?.id}
                              onAccept={() => handleSuggestionAccept(item, 'overscoring')}
                              onReject={handleSuggestionReject}
                              onModify={handleSuggestionModify}
                            />
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </div>
              )}

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

                            <OASISFeedbackPanel
                              suggestion={item}
                              suggestionType="missing_item"
                              oasisItem={item.oasis_item}
                              visitId={visit?.id}
                              patientId={patient?.id}
                              onAccept={() => handleSuggestionAccept(item, 'missing_item')}
                              onReject={handleSuggestionReject}
                              onModify={handleSuggestionModify}
                              reimbursementImpact={item.estimated_revenue_impact}
                            />
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

              {/* Quality Measures Impact */}
              {oasisResults.quality_measures_impact && oasisResults.quality_measures_impact.length > 0 && (
                <div className="bg-purple-50 p-4 rounded-lg border-2 border-purple-200">
                  <h4 className="font-bold text-purple-900 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5" />
                    Quality Measures & Star Rating Impact
                  </h4>
                  <ul className="space-y-2">
                    {oasisResults.quality_measures_impact.map((measure, index) => (
                      <li key={index} className="flex items-start gap-2 text-sm text-purple-900">
                        <span className="font-bold text-purple-600 mt-0.5">★</span>
                        <span>{measure}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              </TabsContent>
            </Tabs>
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
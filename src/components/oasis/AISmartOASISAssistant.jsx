import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Brain,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  RefreshCw,
  Copy,
  ThumbsUp,
  ThumbsDown,
  ChevronDown,
  ChevronUp,
  DollarSign,
  Target,
  Activity,
  ArrowRight
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function AISmartOASISAssistant({
  patientData,
  referralData = null,
  visitData = null,
  onApplySuggestion,
  autoAnalyze = true
}) {
  const [suggestions, setSuggestions] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [appliedItems, setAppliedItems] = useState(new Set());
  const [feedbackGiven, setFeedbackGiven] = useState(new Set());

  const analyzePatientData = async () => {
    if (!patientData) return;

    setIsAnalyzing(true);
    try {
      const contextData = {
        patient: {
          demographics: {
            age: patientData.date_of_birth ? 
              Math.floor((new Date() - new Date(patientData.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000)) : null,
            primary_diagnosis: patientData.primary_diagnosis,
            secondary_diagnoses: patientData.secondary_diagnoses,
            allergies: patientData.allergies,
            medications: patientData.current_medications,
          },
          functional: {
            ambulation: patientData.functional_status?.ambulation,
            adl_status: patientData.functional_status?.adl_independence,
            cognitive_status: patientData.functional_status?.cognitive_status,
            fall_risk: patientData.functional_status?.fall_risk,
          },
          clinical: {
            vital_signs: patientData.baseline_vitals,
            wounds: patientData.wounds,
            pain: patientData.pain_management,
          },
          history: {
            past_hospitalizations: patientData.past_hospitalizations,
            medical_history: patientData.past_medical_history,
          }
        },
        referral: referralData,
        recent_visit: visitData
      };

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert home health OASIS-E assessment specialist with deep knowledge of PDGM reimbursement optimization and CMS compliance requirements.

**PRIMARY OBJECTIVE: Maximize PDGM reimbursement while ensuring full Medicare compliance**

For each OASIS item, provide:
1. Item code and name (e.g., M1021 - Primary Diagnosis)
2. Suggested value/response based on available data
3. Confidence level: HIGH (>90%), MEDIUM (70-90%), LOW (<70%)
4. Data source: What data supports this suggestion
5. Verification flags: What the nurse should verify during visit
6. PDGM impact: How this item affects reimbursement/case-mix
7. Clinical notes: Additional context or considerations
8. Compliance risk: Any red flags or documentation gaps

**CRITICAL OASIS SECTIONS FOR MAXIMUM REIMBURSEMENT:**

**DIAGNOSES (Highest Impact on Payment):**
- M1021: Primary Diagnosis - MUST align with highest-paying PDGM clinical group
- M1023: Other Diagnoses - Capture ALL comorbidities that increase case-mix adjustment
- Focus on diagnoses in these high-paying groups: MS-Rehab, Neuro/Rehab, Wounds, MMTA-Surgical

**FUNCTIONAL STATUS (Major Payment Impact):**
- M1800-M1870: Grooming through Toileting - Lower scores = higher payment
- M1845: Toilet Transferring - Critical for case-mix
- M1850: Transferring - Critical for case-mix
- M1860: Ambulation - Critical for case-mix
- Document functional LIMITATIONS accurately - understating = lost revenue

**CLINICAL FACTORS (Case-Mix Adjusters):**
- M1033: Risk for Hospitalization (≥2 factors increases payment)
- M1600: Vision - Impairment increases case-mix
- M1610: Hearing - Impairment increases case-mix
- M1620: Speech - Impairment increases case-mix
- M1730: Urinary incontinence - Affects case-mix
- M1740/M1745: Bowel issues - Affects case-mix

**WOUND CARE (High-Paying Group):**
- M1306-M1322: Pressure ulcers (Stage 2+ = high payment)
- M1324-M1334: Stasis ulcers
- M1340-M1342: Surgical wounds
- Document ALL wounds with stage, location, size

**THERAPY THRESHOLD:**
- Ensure functional scores support therapy need if applicable
- 10+ therapy visits = higher payment tier

**COMPLIANCE REQUIREMENTS:**
- M1510: Symptom control - Must be assessed
- M2200: Therapy need - Required for skilled services
- M2250: Plan of Care - Must align with diagnoses and functional needs
- M2301: Emergent care - Recent ER visits affect payment
- M2410: High-risk drug classes - Required for medication review

**RED FLAGS TO AVOID:**
- Missing comorbidities that should increase payment
- Functional scores too high (missing functional limitations)
- Primary diagnosis in low-paying group when higher group applies
- Missing wound documentation
- Incomplete risk factors for hospitalization

**OPTIMIZATION CHECKLIST:**
1. Verify primary diagnosis is in highest applicable PDGM group
2. Capture ALL comorbidities (diabetes, COPD, CHF, etc.)
3. Document functional limitations accurately (don't overstate independence)
4. Identify ALL wounds and skin issues
5. Count hospitalization risk factors (aim for 2+ when applicable)
6. Document sensory impairments (vision, hearing, speech)
7. Capture continence issues
8. Note all high-risk medications

For each suggested OASIS item, explicitly state:
- **PDGM Impact**: "Increases case-mix by X%" or "Qualifies for [Clinical Group]"
- **Revenue Impact**: Estimate payment difference if documented vs. missed
- **Documentation Needed**: Specific evidence nurse must observe/document
- **Compliance Risk**: "HIGH" if missing this creates audit risk

**CRITICAL: CROSS-VALIDATION ACROSS DATA SOURCES**

You have access to multiple data sources: referral data, patient history, and visit notes. You MUST perform cross-validation for these critical OASIS sections:

1. **Diagnoses (M1021-M1029):**
   - Compare primary diagnosis across referral, patient record, and visit notes
   - Flag if diagnoses are inconsistent or contradict each other
   - Identify if a higher-paying diagnosis appears in one source but not selected as primary
   - Check ICD-10 codes match diagnosis descriptions

2. **Functional Status (M1800-M1910):**
   - Compare functional descriptions from referral vs. patient baseline
   - Flag if referral says "independent" but patient history shows assistance needed
   - Identify functional decline or improvement trends
   - Ensure functional scores align with diagnoses (e.g., CVA should show ADL impairment)

3. **Medications (M2102-M2250):**
   - Reconcile medication lists from referral, patient record, and recent visit
   - Flag missing medications, duplicates, or dosage discrepancies
   - Identify high-risk medications requiring OASIS documentation
   - Check for medication-diagnosis alignment (e.g., diabetic without diabetes meds)

4. **Clinical Consistency:**
   - Ensure wounds documented in referral appear in current assessment
   - Verify hospitalization history matches across sources
   - Check vital signs trends for concerning changes

For each discrepancy found, provide:
- **What's Inconsistent:** Specific data elements that don't match
- **Sources Compared:** Which documents/records show the conflict
- **Compliance Risk:** How this affects OASIS accuracy and audit risk
- **Resolution Steps:** Specific actions to reconcile the discrepancy
- **Reimbursement Impact:** How fixing this could affect payment

**PROACTIVE PDGM OPTIMIZATION STRATEGY:**

You must provide actionable, revenue-maximizing recommendations:

1. **Diagnosis Optimization (M1021-M1029):**
   - If multiple diagnoses exist, analyze which should be PRIMARY for highest-paying clinical group
   - Provide specific ICD-10 code recommendations
   - Give concrete documentation templates/examples to justify primary diagnosis selection
   - Explain EXACTLY what clinical observations/assessments the nurse needs to document
   - Compare revenue potential: "Making X primary vs Y primary = $Z difference per episode"

2. **Functional Status Optimization (M1800-M1860):**
   - For EACH functional item, identify specific observational points that support higher impairment
   - Suggest exact wording for documentation (e.g., "Document: Patient requires physical assist with...")
   - Provide clinical examples: "If patient uses walker, document specific limitations and assist needed"
   - Explain how each functional scoring change impacts case-mix weight
   - Revenue impact: "Scoring M1850 as '2' instead of '1' increases payment by $X"

3. **Missing Data Revenue Analysis:**
   - Identify EACH missing data element that affects PDGM
   - Calculate potential revenue at risk: "Missing wound staging data = potential $X loss"
   - Prioritize by dollar impact (highest revenue impact first)
   - Provide specific questions nurse must ask or observations to make

4. **Specific OASIS Mappings:**
   - Recommend optimal OASIS item selections with exact reasoning
   - Format: "M1XXX: Select [option] because [clinical reasoning] → Increases payment by $X"
   - Provide decision trees: "If patient has X condition, then score M1XXX as Y"

**COMPREHENSIVE PDGM ANALYSIS REQUIRED:**

After analyzing all OASIS items, provide a detailed PDGM Analysis section that includes:

1. **Current PDGM Status:**
   - Clinical group based on primary diagnosis
   - Estimated case-mix weight
   - Functional impairment level (based on M1800-M1860 scores)
   - Comorbidity tier

2. **Optimization Opportunities:**
   For each opportunity, specify:
   - What could be optimized (diagnosis selection, functional scoring, comorbidity capture)
   - Current status vs. optimal status
   - Specific recommendations with action steps
   - Estimated revenue impact (e.g., "$500-800 per episode")

3. **Alternative Clinical Groups:**
   - Other PDGM groups patient might qualify for
   - Required primary diagnosis changes
   - Case-mix weight comparison
   - Documentation needed to support the change
   - Feasibility assessment

4. **Missing High-Value Data:**
   - Critical information gaps that affect payment
   - Why each missing element matters for PDGM
   - How to obtain/assess during visit
   - Potential value add if captured

5. **Functional Score Optimization:**
   - Current estimated functional scores
   - Target scores for higher payment tier
   - Specific assessment areas to focus on (e.g., "Assess toilet transferring - current data suggests assistance needed but not documented")

CRITICAL: Only suggest items where you have reliable data. Mark items as NEEDS_MANUAL_ASSESSMENT when data is insufficient, but ALWAYS explain what to look for to capture maximum reimbursement.

Patient Data: ${JSON.stringify(contextData)}`,
        response_json_schema: {
          type: "object",
          properties: {
            summary: {
              type: "object",
              properties: {
                total_items_analyzed: { type: "number" },
                high_confidence_items: { type: "number" },
                needs_verification: { type: "number" },
                data_completeness_score: { type: "number" },
                estimated_case_mix_weight: { type: "number" },
                pdgm_clinical_group: { type: "string" },
                potential_revenue_opportunities: { type: "string" },
                compliance_score: { type: "number" }
              }
            },
            oasis_suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item_code: { type: "string" },
                  item_name: { type: "string" },
                  category: { type: "string" },
                  suggested_value: { type: "string" },
                  confidence_level: { type: "string", enum: ["HIGH", "MEDIUM", "LOW", "NEEDS_MANUAL_ASSESSMENT"] },
                  data_source: { type: "string" },
                  verification_notes: { type: "string" },
                  clinical_considerations: { type: "string" },
                  reasoning: { type: "string" },
                  pdgm_impact: { 
                    type: "string",
                    description: "How this OASIS item affects PDGM payment/case-mix"
                  },
                  revenue_impact: { 
                    type: "string",
                    description: "Estimated payment difference if captured vs missed"
                  },
                  compliance_risk: { 
                    type: "string",
                    enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"],
                    description: "Audit/compliance risk level"
                  },
                  documentation_needed: { 
                    type: "string",
                    description: "Specific clinical observations/documentation required"
                  }
                }
              }
            },
            critical_gaps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item_code: { type: "string" },
                  item_name: { type: "string" },
                  why_critical: { type: "string" },
                  how_to_assess: { type: "string" }
                }
              }
            },
            nurse_assessment_checklist: {
              type: "array",
              items: { type: "string" }
            },
            cross_validation_findings: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string", enum: ["Diagnoses", "Functional Status", "Medications", "Clinical Data", "Other"] },
                  oasis_items_affected: { type: "array", items: { type: "string" } },
                  discrepancy_description: { type: "string" },
                  data_source_1: { type: "string" },
                  data_source_1_value: { type: "string" },
                  data_source_2: { type: "string" },
                  data_source_2_value: { type: "string" },
                  severity: { type: "string", enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"] },
                  compliance_risk: { type: "string" },
                  reimbursement_impact: { type: "string" },
                  resolution_steps: { type: "array", items: { type: "string" } },
                  recommended_action: { type: "string" }
                }
              }
            },
            diagnosis_optimization: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  current_primary: { type: "string" },
                  recommended_primary: { type: "string" },
                  recommended_icd10: { type: "string" },
                  clinical_group_current: { type: "string" },
                  clinical_group_recommended: { type: "string" },
                  revenue_impact: { type: "number" },
                  documentation_template: { type: "string" },
                  required_clinical_observations: { type: "array", items: { type: "string" } },
                  justification_rationale: { type: "string" }
                }
              }
            },
            functional_optimization: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  oasis_item: { type: "string" },
                  item_description: { type: "string" },
                  current_score: { type: "string" },
                  recommended_score: { type: "string" },
                  observational_points: { type: "array", items: { type: "string" } },
                  documentation_example: { type: "string" },
                  clinical_indicators: { type: "array", items: { type: "string" } },
                  case_mix_impact: { type: "string" },
                  revenue_impact: { type: "number" }
                }
              }
            },
            missing_data_revenue_analysis: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  data_element: { type: "string" },
                  pdgm_component_affected: { type: "string" },
                  revenue_at_risk: { type: "number" },
                  specific_questions: { type: "array", items: { type: "string" } },
                  assessment_method: { type: "string" },
                  priority: { type: "string", enum: ["CRITICAL", "HIGH", "MEDIUM", "LOW"] }
                }
              }
            },
            oasis_mapping_recommendations: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  oasis_item: { type: "string" },
                  recommended_selection: { type: "string" },
                  clinical_reasoning: { type: "string" },
                  decision_criteria: { type: "string" },
                  payment_impact: { type: "number" },
                  documentation_needed: { type: "string" }
                }
              }
            },
            pdgm_analysis: {
              type: "object",
              properties: {
                current_clinical_group: { type: "string" },
                current_case_mix_weight: { type: "number" },
                functional_impairment_level: { type: "string", enum: ["Low", "Medium", "High"] },
                comorbidity_tier: { type: "string", enum: ["None", "Low", "High"] },
                optimization_opportunities: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      opportunity_type: { type: "string" },
                      current_status: { type: "string" },
                      recommendation: { type: "string" },
                      potential_impact: { type: "string" },
                      specific_actions: { type: "array", items: { type: "string" } },
                      revenue_increase_estimate: { type: "string" }
                    }
                  }
                },
                alternative_clinical_groups: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      clinical_group: { type: "string" },
                      required_primary_diagnosis: { type: "string" },
                      case_mix_weight: { type: "number" },
                      documentation_needed: { type: "string" },
                      feasibility: { type: "string", enum: ["High", "Medium", "Low"] }
                    }
                  }
                },
                missing_high_value_data: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      data_element: { type: "string" },
                      why_important: { type: "string" },
                      how_to_obtain: { type: "string" },
                      potential_value_add: { type: "string" }
                    }
                  }
                },
                functional_score_optimization: {
                  type: "object",
                  properties: {
                    current_estimated_scores: { type: "string" },
                    target_for_higher_payment: { type: "string" },
                    assessment_focus_areas: { type: "array", items: { type: "string" } }
                  }
                }
              }
            }
          }
        }
      });

      setSuggestions(result);
    } catch (error) {
      console.error('Error analyzing patient data:', error);
      alert('Failed to generate OASIS suggestions. Please try again.');
    }
    setIsAnalyzing(false);
  };

  React.useEffect(() => {
    if (autoAnalyze && patientData && !suggestions) {
      analyzePatientData();
    }
  }, [autoAnalyze, patientData]);

  const handleApplySuggestion = (item) => {
    if (onApplySuggestion) {
      onApplySuggestion(item);
      setAppliedItems(prev => new Set([...prev, item.item_code]));
    }
  };

  const handleFeedback = async (item, isPositive) => {
    try {
      await base44.entities.TrainingRecommendation.create({
        nurse_email: (await base44.auth.me()).email,
        recommendation_type: "clinical",
        recommendation_text: `OASIS AI Suggestion Feedback: ${item.item_code} - ${item.item_name}`,
        source: "ai_documentation_suggester",
        severity: "medium",
        addressed: false,
        context_data: {
          element: item.item_code,
          suggestion: item.suggested_value,
          confidence: item.confidence_level,
          feedback: isPositive ? "positive" : "negative"
        }
      });
      setFeedbackGiven(prev => new Set([...prev, item.item_code]));
    } catch (error) {
      console.error('Error submitting feedback:', error);
    }
  };

  const getConfidenceColor = (level) => {
    switch (level) {
      case "HIGH": return "bg-green-100 text-green-800 border-green-300";
      case "MEDIUM": return "bg-yellow-100 text-yellow-800 border-yellow-300";
      case "LOW": return "bg-orange-100 text-orange-800 border-orange-300";
      case "NEEDS_MANUAL_ASSESSMENT": return "bg-red-100 text-red-800 border-red-300";
      default: return "bg-gray-100 text-gray-800 border-gray-300";
    }
  };

  const getCategoryIcon = (category) => {
    const iconMap = {
      "Demographics": "👤",
      "Diagnoses": "🏥",
      "Risk Factors": "⚠️",
      "Living Arrangements": "🏠",
      "Sensory Status": "👁️",
      "ADLs": "🚶",
      "Medications": "💊",
      "Care Management": "📋"
    };
    return iconMap[category] || "📝";
  };

  if (!patientData) {
    return (
      <Alert className="bg-blue-50 border-blue-200">
        <AlertCircle className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-blue-900">
          No patient data available. Please select a patient to generate OASIS suggestions.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="border-2 border-purple-300 bg-gradient-to-r from-purple-50 to-blue-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="w-5 h-5 text-purple-600" />
            AI-Powered OASIS Assistant
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!suggestions ? (
            <div className="text-center py-8">
              <Button
                onClick={analyzePatientData}
                disabled={isAnalyzing}
                className="bg-purple-600 hover:bg-purple-700"
                size="lg"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="w-5 h-5 mr-2 animate-spin" />
                    Analyzing Patient Data...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-5 h-5 mr-2" />
                    Generate Smart OASIS Suggestions
                  </>
                )}
              </Button>
              <p className="text-sm text-gray-600 mt-3">
                AI will analyze patient records, referral data, and clinical history to pre-populate OASIS items
              </p>
            </div>
          ) : (
            <>
              {/* Summary Stats */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <div className="bg-white p-3 rounded-lg border-2 border-purple-200">
                  <p className="text-xs text-gray-600">Items Analyzed</p>
                  <p className="text-2xl font-bold text-purple-600">{suggestions.summary?.total_items_analyzed || 0}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border-2 border-green-200">
                  <p className="text-xs text-gray-600">High Confidence</p>
                  <p className="text-2xl font-bold text-green-600">{suggestions.summary?.high_confidence_items || 0}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border-2 border-yellow-200">
                  <p className="text-xs text-gray-600">Needs Verification</p>
                  <p className="text-2xl font-bold text-yellow-600">{suggestions.summary?.needs_verification || 0}</p>
                </div>
                <div className="bg-white p-3 rounded-lg border-2 border-blue-200">
                  <p className="text-xs text-gray-600">Compliance Score</p>
                  <p className="text-2xl font-bold text-blue-600">{suggestions.summary?.compliance_score || 0}%</p>
                </div>
                <div className="bg-white p-3 rounded-lg border-2 border-green-200">
                  <p className="text-xs text-gray-600">Est. Case-Mix</p>
                  <p className="text-2xl font-bold text-green-600">{suggestions.summary?.estimated_case_mix_weight?.toFixed(2) || 'N/A'}</p>
                </div>
              </div>
              
              {suggestions.summary?.pdgm_clinical_group && (
                <Alert className="bg-green-50 border-green-300">
                  <AlertCircle className="w-4 h-4 text-green-600" />
                  <AlertDescription>
                    <p className="font-semibold text-green-900">💰 PDGM Clinical Group: {suggestions.summary.pdgm_clinical_group}</p>
                    {suggestions.summary.potential_revenue_opportunities && (
                      <p className="text-sm text-green-800 mt-1">{suggestions.summary.potential_revenue_opportunities}</p>
                    )}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2">
                <Button
                  onClick={analyzePatientData}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className="w-4 h-4 mr-1" />
                  Re-analyze
                </Button>
                <Button
                  onClick={() => navigator.clipboard.writeText(JSON.stringify(suggestions, null, 2))}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="w-4 h-4 mr-1" />
                  Copy All
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {suggestions && (
        <>
          {/* Cross-Validation Findings */}
          {suggestions.cross_validation_findings?.length > 0 && (
            <Card className="border-2 border-orange-300 bg-orange-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-orange-900">
                  <AlertCircle className="w-5 h-5" />
                  Data Discrepancies Detected - Requires Review
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert className="bg-orange-100 border-orange-400">
                  <AlertDescription className="text-orange-900 text-sm">
                    <strong>⚠️ Cross-validation analysis found inconsistencies across referral data, patient history, and visit notes.</strong> 
                    <br/>Review and resolve these before finalizing OASIS to ensure compliance and maximize reimbursement.
                  </AlertDescription>
                </Alert>
                
                {suggestions.cross_validation_findings.map((finding, idx) => (
                  <div key={idx} className={`p-4 rounded-lg border-2 ${
                    finding.severity === 'CRITICAL' ? 'bg-red-50 border-red-400' :
                    finding.severity === 'HIGH' ? 'bg-orange-50 border-orange-400' :
                    finding.severity === 'MEDIUM' ? 'bg-yellow-50 border-yellow-400' :
                    'bg-blue-50 border-blue-300'
                  }`}>
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className={
                          finding.severity === 'CRITICAL' ? 'bg-red-600' :
                          finding.severity === 'HIGH' ? 'bg-orange-600' :
                          finding.severity === 'MEDIUM' ? 'bg-yellow-600' :
                          'bg-blue-600'
                        }>
                          {finding.severity}
                        </Badge>
                        <span className="font-semibold text-gray-900">{finding.category}</span>
                      </div>
                      {finding.oasis_items_affected?.length > 0 && (
                        <div className="flex gap-1 flex-wrap">
                          {finding.oasis_items_affected.map((item, i) => (
                            <Badge key={i} variant="outline" className="text-xs">{item}</Badge>
                          ))}
                        </div>
                      )}
                    </div>

                    <p className="text-sm text-gray-900 font-medium mb-3">{finding.discrepancy_description}</p>

                    <div className="grid md:grid-cols-2 gap-3 mb-3">
                      <div className="bg-white p-3 rounded border">
                        <p className="text-xs font-semibold text-gray-600 mb-1">{finding.data_source_1}</p>
                        <p className="text-sm text-gray-900">{finding.data_source_1_value}</p>
                      </div>
                      <div className="bg-white p-3 rounded border">
                        <p className="text-xs font-semibold text-gray-600 mb-1">{finding.data_source_2}</p>
                        <p className="text-sm text-gray-900">{finding.data_source_2_value}</p>
                      </div>
                    </div>

                    {finding.compliance_risk && (
                      <Alert className="bg-red-100 border-red-300 mb-3">
                        <AlertCircle className="w-4 h-4 text-red-600" />
                        <AlertDescription className="text-red-900 text-xs">
                          <strong>Compliance Risk:</strong> {finding.compliance_risk}
                        </AlertDescription>
                      </Alert>
                    )}

                    {finding.reimbursement_impact && (
                      <div className="bg-green-100 border border-green-300 rounded p-2 mb-3">
                        <p className="text-xs text-green-900"><strong>💰 Reimbursement Impact:</strong> {finding.reimbursement_impact}</p>
                      </div>
                    )}

                    <div className="bg-white p-3 rounded border border-blue-300">
                      <p className="text-xs font-semibold text-blue-900 mb-2">✓ Resolution Steps:</p>
                      <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                        {finding.resolution_steps?.map((step, i) => (
                          <li key={i}>{step}</li>
                        ))}
                      </ol>
                      {finding.recommended_action && (
                        <p className="text-sm font-semibold text-blue-900 mt-2 bg-blue-50 p-2 rounded">
                          → {finding.recommended_action}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Diagnosis Optimization */}
          {suggestions.diagnosis_optimization?.length > 0 && (
            <Card className="border-2 border-purple-400 bg-purple-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-purple-900">
                  <Target className="w-5 h-5" />
                  Primary Diagnosis Optimization for Maximum Reimbursement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="bg-purple-100 border-purple-400">
                  <AlertDescription className="text-purple-900 text-sm">
                    <strong>Strategic Diagnosis Selection:</strong> Choosing the optimal primary diagnosis can significantly impact your PDGM clinical group and reimbursement.
                  </AlertDescription>
                </Alert>
                {suggestions.diagnosis_optimization.map((diag, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-lg border-2 border-purple-300">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex-1">
                        <Badge className="bg-red-500 mb-2">Current</Badge>
                        <p className="text-sm text-gray-700">{diag.current_primary}</p>
                        <p className="text-xs text-gray-500">{diag.clinical_group_current}</p>
                      </div>
                      <ArrowRight className="w-8 h-8 text-purple-600 mx-4" />
                      <div className="flex-1">
                        <Badge className="bg-green-500 mb-2">Recommended</Badge>
                        <p className="text-sm font-semibold text-gray-900">{diag.recommended_primary}</p>
                        <p className="text-xs text-blue-600 font-mono">{diag.recommended_icd10}</p>
                        <p className="text-xs text-gray-500">{diag.clinical_group_recommended}</p>
                      </div>
                      <div className="ml-4 bg-green-100 px-3 py-2 rounded-lg">
                        <p className="text-xs text-green-700">Revenue Impact</p>
                        <p className="text-lg font-bold text-green-900">+${diag.revenue_impact}</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="bg-blue-50 p-3 rounded border border-blue-200">
                        <p className="text-xs font-semibold text-blue-900 mb-2">📝 Documentation Template:</p>
                        <p className="text-sm text-gray-800 font-mono whitespace-pre-wrap">{diag.documentation_template}</p>
                      </div>

                      <div className="bg-orange-50 p-3 rounded border border-orange-200">
                        <p className="text-xs font-semibold text-orange-900 mb-2">🔍 Required Clinical Observations:</p>
                        <ul className="text-sm text-gray-800 space-y-1 list-disc list-inside">
                          {diag.required_clinical_observations?.map((obs, oIdx) => (
                            <li key={oIdx}>{obs}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-gray-50 p-3 rounded border border-gray-200">
                        <p className="text-xs font-semibold text-gray-900 mb-1">💡 Clinical Rationale:</p>
                        <p className="text-sm text-gray-700">{diag.justification_rationale}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Functional Status Optimization */}
          {suggestions.functional_optimization?.length > 0 && (
            <Card className="border-2 border-blue-400 bg-blue-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-blue-900">
                  <Activity className="w-5 h-5" />
                  Functional Status Optimization (M1800-M1860)
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Alert className="bg-blue-100 border-blue-400">
                  <AlertDescription className="text-blue-900 text-sm">
                    <strong>Case-Mix Maximization:</strong> Accurate functional scoring directly impacts your case-mix weight and payment. Document specific observations to support appropriate impairment levels.
                  </AlertDescription>
                </Alert>
                {suggestions.functional_optimization.map((func, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-lg border-2 border-blue-300">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="outline" className="text-xs">{func.oasis_item}</Badge>
                          <Badge className="bg-blue-600">{func.item_description}</Badge>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mt-3">
                          <div>
                            <p className="text-xs text-gray-600">Current Score</p>
                            <p className="text-lg font-bold text-gray-900">{func.current_score}</p>
                          </div>
                          <div>
                            <p className="text-xs text-gray-600">Recommended Score</p>
                            <p className="text-lg font-bold text-green-600">{func.recommended_score}</p>
                          </div>
                        </div>
                      </div>
                      <div className="ml-4 bg-green-100 px-3 py-2 rounded-lg text-right">
                        <p className="text-xs text-green-700">Payment Impact</p>
                        <p className="text-lg font-bold text-green-900">+${func.revenue_impact}</p>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                        <p className="text-xs font-semibold text-yellow-900 mb-2">👀 Specific Observational Points:</p>
                        <ul className="text-sm text-gray-800 space-y-1 list-disc list-inside">
                          {func.observational_points?.map((point, pIdx) => (
                            <li key={pIdx}>{point}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-green-50 p-3 rounded border border-green-200">
                        <p className="text-xs font-semibold text-green-900 mb-2">📝 Documentation Example:</p>
                        <p className="text-sm text-gray-800 font-mono whitespace-pre-wrap">{func.documentation_example}</p>
                      </div>

                      <div className="bg-purple-50 p-3 rounded border border-purple-200">
                        <p className="text-xs font-semibold text-purple-900 mb-2">🔬 Clinical Indicators to Assess:</p>
                        <ul className="text-sm text-gray-800 space-y-1 list-disc list-inside">
                          {func.clinical_indicators?.map((ind, iIdx) => (
                            <li key={iIdx}>{ind}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-blue-100 p-2 rounded">
                        <p className="text-xs text-blue-900"><strong>Case-Mix Impact:</strong> {func.case_mix_impact}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Missing Data Revenue Analysis */}
          {suggestions.missing_data_revenue_analysis?.length > 0 && (
            <Card className="border-2 border-red-400 bg-red-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-red-900">
                  <AlertCircle className="w-5 h-5" />
                  Critical Missing Data - Revenue at Risk
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Alert className="bg-red-100 border-red-400">
                  <AlertDescription className="text-red-900 text-sm">
                    <strong>High Priority:</strong> The following data gaps are preventing optimal PDGM classification. Total revenue at risk: ${suggestions.missing_data_revenue_analysis.reduce((sum, item) => sum + (item.revenue_at_risk || 0), 0).toLocaleString()}
                  </AlertDescription>
                </Alert>
                {suggestions.missing_data_revenue_analysis
                  .sort((a, b) => (b.revenue_at_risk || 0) - (a.revenue_at_risk || 0))
                  .map((missing, idx) => (
                  <div key={idx} className={`bg-white p-4 rounded-lg border-2 ${
                    missing.priority === 'CRITICAL' ? 'border-red-500' :
                    missing.priority === 'HIGH' ? 'border-orange-500' :
                    missing.priority === 'MEDIUM' ? 'border-yellow-500' :
                    'border-blue-500'
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Badge className={
                            missing.priority === 'CRITICAL' ? 'bg-red-600' :
                            missing.priority === 'HIGH' ? 'bg-orange-600' :
                            missing.priority === 'MEDIUM' ? 'bg-yellow-600' :
                            'bg-blue-600'
                          }>{missing.priority}</Badge>
                          <p className="font-semibold text-gray-900">{missing.data_element}</p>
                        </div>
                        <p className="text-xs text-gray-600">Affects: {missing.pdgm_component_affected}</p>
                      </div>
                      <div className="ml-4 bg-red-100 px-3 py-2 rounded-lg text-right">
                        <p className="text-xs text-red-700">Revenue at Risk</p>
                        <p className="text-xl font-bold text-red-900">${missing.revenue_at_risk}</p>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      <div className="bg-orange-50 p-3 rounded border border-orange-200">
                        <p className="text-xs font-semibold text-orange-900 mb-2">❓ Specific Questions to Ask:</p>
                        <ul className="text-sm text-gray-800 space-y-1 list-disc list-inside">
                          {missing.specific_questions?.map((q, qIdx) => (
                            <li key={qIdx}>{q}</li>
                          ))}
                        </ul>
                      </div>

                      <div className="bg-blue-50 p-3 rounded border border-blue-200">
                        <p className="text-xs font-semibold text-blue-900 mb-1">🔍 Assessment Method:</p>
                        <p className="text-sm text-gray-800">{missing.assessment_method}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* OASIS Mapping Recommendations */}
          {suggestions.oasis_mapping_recommendations?.length > 0 && (
            <Card className="border-2 border-indigo-400 bg-indigo-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-indigo-900">
                  <CheckCircle2 className="w-5 h-5" />
                  Strategic OASIS Item Selections
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {suggestions.oasis_mapping_recommendations.map((mapping, idx) => (
                  <div key={idx} className="bg-white p-4 rounded-lg border-2 border-indigo-300">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <Badge variant="outline" className="mb-2">{mapping.oasis_item}</Badge>
                        <p className="font-semibold text-lg text-gray-900 mb-2">{mapping.recommended_selection}</p>
                        <p className="text-sm text-gray-700 mb-3">{mapping.clinical_reasoning}</p>
                      </div>
                      {mapping.payment_impact > 0 && (
                        <div className="ml-4 bg-green-100 px-3 py-2 rounded-lg">
                          <p className="text-xs text-green-700">Impact</p>
                          <p className="text-lg font-bold text-green-900">+${mapping.payment_impact}</p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                        <p className="text-xs font-semibold text-yellow-900 mb-1">📋 Decision Criteria:</p>
                        <p className="text-sm text-gray-800">{mapping.decision_criteria}</p>
                      </div>

                      <div className="bg-blue-50 p-3 rounded border border-blue-200">
                        <p className="text-xs font-semibold text-blue-900 mb-1">📝 Documentation Needed:</p>
                        <p className="text-sm text-gray-800">{mapping.documentation_needed}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Critical Gaps Alert */}
          {suggestions.critical_gaps?.length > 0 && (
            <Alert className="bg-red-50 border-red-300">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <AlertDescription>
                <p className="font-semibold text-red-900 mb-2">⚠️ Critical Data Gaps Identified</p>
                <ul className="space-y-2 text-sm">
                  {suggestions.critical_gaps.map((gap, idx) => (
                    <li key={idx} className="bg-white p-2 rounded border border-red-200">
                      <p className="font-medium text-red-900">{gap.item_code} - {gap.item_name}</p>
                      <p className="text-red-700 text-xs mt-1">{gap.why_critical}</p>
                      <p className="text-gray-600 text-xs mt-1"><strong>Assessment tip:</strong> {gap.how_to_assess}</p>
                    </li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}

          {/* PDGM Analysis Section */}
          {suggestions.pdgm_analysis && (
            <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-green-900">
                  💰 PDGM Reimbursement Analysis
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Current PDGM Status */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="bg-white p-4 rounded-lg border-2 border-green-200">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Current Clinical Group</p>
                    <p className="text-xl font-bold text-green-700">{suggestions.pdgm_analysis.current_clinical_group}</p>
                    <p className="text-sm text-gray-600 mt-1">Case-Mix Weight: <span className="font-semibold">{suggestions.pdgm_analysis.current_case_mix_weight?.toFixed(3)}</span></p>
                  </div>
                  <div className="bg-white p-4 rounded-lg border-2 border-blue-200">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Payment Factors</p>
                    <div className="space-y-1 text-sm">
                      <p><strong>Functional Level:</strong> {suggestions.pdgm_analysis.functional_impairment_level}</p>
                      <p><strong>Comorbidity Tier:</strong> {suggestions.pdgm_analysis.comorbidity_tier}</p>
                    </div>
                  </div>
                </div>

                {/* Optimization Opportunities */}
                {suggestions.pdgm_analysis.optimization_opportunities?.length > 0 && (
                  <div className="bg-yellow-50 border-2 border-yellow-300 rounded-lg p-4">
                    <h4 className="font-semibold text-yellow-900 mb-3 flex items-center gap-2">
                      <Sparkles className="w-4 h-4" />
                      Revenue Optimization Opportunities
                    </h4>
                    <div className="space-y-3">
                      {suggestions.pdgm_analysis.optimization_opportunities.map((opp, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-lg border border-yellow-200">
                          <div className="flex items-start justify-between mb-2">
                            <p className="font-semibold text-gray-900">{opp.opportunity_type}</p>
                            {opp.revenue_increase_estimate && (
                              <Badge className="bg-green-600">{opp.revenue_increase_estimate}</Badge>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mb-2"><strong>Current:</strong> {opp.current_status}</p>
                          <p className="text-sm text-green-700 font-medium mb-2">{opp.recommendation}</p>
                          <p className="text-xs text-gray-500 mb-2"><strong>Impact:</strong> {opp.potential_impact}</p>
                          {opp.specific_actions?.length > 0 && (
                            <div className="mt-2 pl-3 border-l-2 border-green-500">
                              <p className="text-xs font-semibold text-gray-700 mb-1">Action Steps:</p>
                              <ul className="text-xs text-gray-600 space-y-1">
                                {opp.specific_actions.map((action, i) => (
                                  <li key={i}>• {action}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Alternative Clinical Groups */}
                {suggestions.pdgm_analysis.alternative_clinical_groups?.length > 0 && (
                  <div className="bg-purple-50 border-2 border-purple-300 rounded-lg p-4">
                    <h4 className="font-semibold text-purple-900 mb-3">Alternative Higher-Paying Clinical Groups</h4>
                    <div className="space-y-2">
                      {suggestions.pdgm_analysis.alternative_clinical_groups.map((alt, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-lg border border-purple-200">
                          <div className="flex items-start justify-between mb-1">
                            <p className="font-semibold text-gray-900">{alt.clinical_group}</p>
                            <div className="flex items-center gap-2">
                              <Badge className={alt.feasibility === 'High' ? 'bg-green-600' : alt.feasibility === 'Medium' ? 'bg-yellow-600' : 'bg-gray-600'}>
                                {alt.feasibility} Feasibility
                              </Badge>
                              <Badge variant="outline">CMW: {alt.case_mix_weight?.toFixed(3)}</Badge>
                            </div>
                          </div>
                          <p className="text-xs text-gray-600 mb-1"><strong>Required Diagnosis:</strong> {alt.required_primary_diagnosis}</p>
                          <p className="text-xs text-gray-600"><strong>Documentation:</strong> {alt.documentation_needed}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing High-Value Data */}
                {suggestions.pdgm_analysis.missing_high_value_data?.length > 0 && (
                  <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4">
                    <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                      <AlertCircle className="w-4 h-4" />
                      Missing High-Value Information
                    </h4>
                    <div className="space-y-2">
                      {suggestions.pdgm_analysis.missing_high_value_data.map((missing, idx) => (
                        <div key={idx} className="bg-white p-3 rounded-lg border border-red-200">
                          <p className="font-semibold text-gray-900 text-sm mb-1">{missing.data_element}</p>
                          <p className="text-xs text-gray-600 mb-1"><strong>Why Important:</strong> {missing.why_important}</p>
                          <p className="text-xs text-blue-700 mb-1"><strong>How to Obtain:</strong> {missing.how_to_obtain}</p>
                          <p className="text-xs text-green-700 font-medium">💰 {missing.potential_value_add}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Functional Score Optimization */}
                {suggestions.pdgm_analysis.functional_score_optimization && (
                  <div className="bg-blue-50 border-2 border-blue-300 rounded-lg p-4">
                    <h4 className="font-semibold text-blue-900 mb-3">Functional Score Optimization</h4>
                    <div className="bg-white p-3 rounded-lg border border-blue-200 mb-3">
                      <p className="text-sm mb-2"><strong>Current Estimated Scores:</strong> {suggestions.pdgm_analysis.functional_score_optimization.current_estimated_scores}</p>
                      <p className="text-sm text-green-700 font-medium mb-2"><strong>Target for Higher Payment:</strong> {suggestions.pdgm_analysis.functional_score_optimization.target_for_higher_payment}</p>
                    </div>
                    {suggestions.pdgm_analysis.functional_score_optimization.assessment_focus_areas?.length > 0 && (
                      <div className="bg-white p-3 rounded-lg border border-blue-200">
                        <p className="text-xs font-semibold text-blue-900 mb-2">Priority Assessment Areas:</p>
                        <ul className="text-sm text-gray-700 space-y-1">
                          {suggestions.pdgm_analysis.functional_score_optimization.assessment_focus_areas.map((area, i) => (
                            <li key={i} className="flex items-start gap-2">
                              <span className="text-blue-600">→</span>
                              <span>{area}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Nurse Assessment Checklist */}
          {suggestions.nurse_assessment_checklist?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  Nurse Assessment Checklist
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {suggestions.nurse_assessment_checklist.map((item, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-sm">
                      <span className="text-blue-600 mt-0.5">☐</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* OASIS Suggestions by Category */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-purple-600" />
                Smart OASIS Suggestions ({suggestions.oasis_suggestions?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Accordion type="multiple" className="space-y-2">
                {Object.entries(
                  (suggestions.oasis_suggestions || []).reduce((acc, item) => {
                    if (!acc[item.category]) acc[item.category] = [];
                    acc[item.category].push(item);
                    return acc;
                  }, {})
                ).map(([category, items]) => (
                  <AccordionItem key={category} value={category} className="border rounded-lg">
                    <AccordionTrigger className="px-4 hover:bg-gray-50">
                      <div className="flex items-center gap-2 text-left">
                        <span className="text-xl">{getCategoryIcon(category)}</span>
                        <div>
                          <p className="font-semibold">{category}</p>
                          <p className="text-xs text-gray-500">{items.length} items</p>
                        </div>
                      </div>
                    </AccordionTrigger>
                    <AccordionContent className="px-4 pb-4">
                      <div className="space-y-3 mt-2">
                        {items.map((item) => (
                          <div key={item.item_code} className={`p-4 rounded-lg border-2 ${
                            appliedItems.has(item.item_code) ? 'bg-green-50 border-green-300' : 'bg-white border-gray-200'
                          }`}>
                            <div className="flex items-start justify-between mb-2">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-1">
                                  <Badge variant="outline" className="font-mono text-xs">
                                    {item.item_code}
                                  </Badge>
                                  <Badge className={getConfidenceColor(item.confidence_level)}>
                                    {item.confidence_level}
                                  </Badge>
                                  {appliedItems.has(item.item_code) && (
                                    <Badge className="bg-green-600">Applied</Badge>
                                  )}
                                </div>
                                <p className="font-semibold text-gray-900">{item.item_name}</p>
                              </div>
                            </div>

                            <div className="bg-blue-50 p-3 rounded-lg mb-2 border border-blue-200">
                              <p className="text-sm font-semibold text-blue-900 mb-1">Suggested Value:</p>
                              <p className="text-sm text-gray-900">{item.suggested_value}</p>
                            </div>

                            {item.pdgm_impact && (
                              <div className="bg-green-50 p-3 rounded-lg mb-2 border-l-4 border-green-500">
                                <p className="text-sm font-semibold text-green-900 mb-1">💰 PDGM Impact:</p>
                                <p className="text-sm text-gray-900">{item.pdgm_impact}</p>
                                {item.revenue_impact && (
                                  <p className="text-xs text-green-700 mt-1 font-semibold">Revenue: {item.revenue_impact}</p>
                                )}
                              </div>
                            )}

                            <div className="grid md:grid-cols-2 gap-3 text-xs">
                              <div className="bg-gray-50 p-2 rounded">
                                <p className="font-semibold text-gray-700 mb-1">Data Source:</p>
                                <p className="text-gray-600">{item.data_source}</p>
                              </div>
                              <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                                <p className="font-semibold text-yellow-900 mb-1">⚠️ Verify:</p>
                                <p className="text-gray-700">{item.verification_notes}</p>
                              </div>
                            </div>

                            {item.documentation_needed && (
                              <div className="bg-purple-50 p-2 rounded text-xs mt-2 border border-purple-200">
                                <p className="font-semibold text-purple-900 mb-1">📋 Documentation Required:</p>
                                <p className="text-gray-700">{item.documentation_needed}</p>
                              </div>
                            )}

                            {item.compliance_risk && item.compliance_risk !== 'LOW' && (
                              <div className={`p-2 rounded text-xs mt-2 border ${
                                item.compliance_risk === 'CRITICAL' ? 'bg-red-50 border-red-300' :
                                item.compliance_risk === 'HIGH' ? 'bg-orange-50 border-orange-300' :
                                'bg-yellow-50 border-yellow-300'
                              }`}>
                                <p className="font-semibold mb-1">
                                  {item.compliance_risk === 'CRITICAL' ? '🚨 CRITICAL' : '⚠️'} Compliance Risk: {item.compliance_risk}
                                </p>
                              </div>
                            )}

                            {item.clinical_considerations && (
                              <div className="mt-2 bg-purple-50 p-2 rounded text-xs border border-purple-200">
                                <p className="font-semibold text-purple-900 mb-1">Clinical Considerations:</p>
                                <p className="text-gray-700">{item.clinical_considerations}</p>
                              </div>
                            )}

                            {item.reasoning && (
                              <details className="mt-2 text-xs">
                                <summary className="cursor-pointer text-gray-600 hover:text-gray-900 font-medium">
                                  Show AI Reasoning
                                </summary>
                                <p className="mt-2 text-gray-600 bg-gray-50 p-2 rounded">{item.reasoning}</p>
                              </details>
                            )}

                            <div className="flex gap-2 mt-3">
                              {onApplySuggestion && !appliedItems.has(item.item_code) && (
                                <Button
                                  size="sm"
                                  onClick={() => handleApplySuggestion(item)}
                                  className="bg-purple-600 hover:bg-purple-700"
                                >
                                  <CheckCircle2 className="w-3 h-3 mr-1" />
                                  Apply Suggestion
                                </Button>
                              )}
                              {!feedbackGiven.has(item.item_code) && (
                                <>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleFeedback(item, true)}
                                  >
                                    <ThumbsUp className="w-3 h-3 mr-1" />
                                    Helpful
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleFeedback(item, false)}
                                  >
                                    <ThumbsDown className="w-3 h-3 mr-1" />
                                    Not Helpful
                                  </Button>
                                </>
                              )}
                              {feedbackGiven.has(item.item_code) && (
                                <Badge variant="outline">Feedback Submitted</Badge>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
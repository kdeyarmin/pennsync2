import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  Navigation,
  DollarSign,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ArrowRight,
  Info,
  Stethoscope,
  Activity,
  Building2,
  Clock,
  FileText,
  TrendingUp,
  Calculator,
  Target,
  Lightbulb,
  ChevronRight
} from "lucide-react";

// CMS PDGM Clinical Groups
const CLINICAL_GROUPS = {
  'MMTA_Surgical_Aftercare': { name: 'Surgical Aftercare', category: 'MMTA' },
  'MMTA_Cardiac_Circulatory': { name: 'Cardiac/Circulatory', category: 'MMTA' },
  'MMTA_Endocrine': { name: 'Endocrine', category: 'MMTA' },
  'MMTA_GI_GU': { name: 'GI/GU', category: 'MMTA' },
  'MMTA_Infectious_Disease': { name: 'Infectious Disease', category: 'MMTA' },
  'MMTA_Other': { name: 'Other', category: 'MMTA' },
  'MMTA_Respiratory': { name: 'Respiratory', category: 'MMTA' },
  'MMTA_Neuro_Rehab': { name: 'Neuro/Rehab', category: 'MMTA' },
  'MMTA_Wounds': { name: 'Wounds', category: 'MMTA' },
  'MMTA_Complex_Nursing': { name: 'Complex Nursing', category: 'MMTA' },
  'MMTA_Behavioral_Health': { name: 'Behavioral Health', category: 'MMTA' },
  'MMTA_Medication_Management': { name: 'Medication Management', category: 'MMTA' },
  'MMTA_Musculoskeletal': { name: 'Musculoskeletal', category: 'MMTA' }
};

export default function AutomatedPDGMNavigator({ analysisResults, pdgmData, revenueData }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [navigation, setNavigation] = useState(null);
  const [error, setError] = useState(null);
  const [autoAnalyzed, setAutoAnalyzed] = useState(false);

  // Auto-analyze when data is available
  useEffect(() => {
    if (pdgmData && !navigation && !isAnalyzing && !autoAnalyzed) {
      runPDGMNavigation();
      setAutoAnalyzed(true);
    }
  }, [pdgmData]);

  const runPDGMNavigation = async () => {
    if (!pdgmData) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a CMS PDGM expert navigator. Analyze this OASIS data and determine the correct PDGM grouping with detailed explanation.

OASIS/PDGM DATA:
${JSON.stringify({
  primary_diagnosis: pdgmData.primary_diagnosis,
  primary_diagnosis_code: pdgmData.primary_diagnosis_code,
  primary_diagnosis_description: pdgmData.primary_diagnosis_description,
  comorbidities: pdgmData.comorbidities,
  admission_source: pdgmData.admission_source,
  episode_timing: pdgmData.episode_timing,
  m0110_episode_timing: pdgmData.m0110_episode_timing,
  soc_date: pdgmData.soc_date,
  functional_scores: pdgmData.functional_scores,
  clinical_items: pdgmData.clinical_items,
  therapy_services: pdgmData.therapy_services
}, null, 2)}

EXISTING ANALYSIS SCORES:
${JSON.stringify({
  accuracy: analysisResults?.accuracy_score,
  compliance: analysisResults?.compliance_score,
  revenue: analysisResults?.revenue_optimization_score
}, null, 2)}

CURRENT REVENUE CALCULATION (if available):
${JSON.stringify(revenueData?.original || {}, null, 2)}

Provide a complete PDGM navigation analysis:

1. CLINICAL GROUP DETERMINATION
- Identify the correct clinical group based on primary diagnosis
- Explain WHY this clinical group applies (cite ICD-10 mapping rules)
- List alternative clinical groups that could apply if documentation changes
- Flag if current grouping may be incorrect

2. FUNCTIONAL IMPAIRMENT LEVEL
- Calculate total functional points from M-items (M1800-M1860)
- Determine functional level (Low/Medium/High)
- Explain threshold cutoffs used
- Identify which M-items are driving the level

3. COMORBIDITY ADJUSTMENT
- Analyze comorbidities for PDGM relevance
- Identify high-value vs low-value comorbidities
- Determine comorbidity adjustment level (None/Low/High)
- Flag missing comorbidities that could be documented

4. ADMISSION SOURCE & EPISODE TIMING
- Validate admission source (Community vs Institutional)
- Validate episode timing (Early vs Late)
- Check for discrepancies with M0110 and dates
- Calculate payment impact of source/timing combination

5. CASE-MIX CALCULATION
- Show step-by-step case-mix weight calculation
- Break down each multiplier contribution
- Calculate final payment amount

6. DISCREPANCIES & OPPORTUNITIES
- Flag any data discrepancies found
- Identify documentation opportunities for higher reimbursement
- Provide specific recommendations

Return JSON:
{
  "clinical_group": {
    "assigned_group": "MMTA_GroupName",
    "group_name": "Human readable name",
    "confidence": "high/medium/low",
    "rationale": "Why this group was assigned",
    "icd10_basis": "ICD-10 code and mapping logic",
    "alternative_groups": [{"group": "name", "if_condition": "what would need to change"}],
    "potential_issues": ["list of concerns with current grouping"]
  },
  "functional_level": {
    "total_points": 0,
    "level": "low/medium/high",
    "point_breakdown": {
      "m1800_grooming": {"score": 0, "max": 3, "contribution": "description"},
      "m1810_dress_upper": {"score": 0, "max": 3, "contribution": "description"},
      "m1820_dress_lower": {"score": 0, "max": 3, "contribution": "description"},
      "m1830_bathing": {"score": 0, "max": 6, "contribution": "description"},
      "m1840_toilet_transfer": {"score": 0, "max": 4, "contribution": "description"},
      "m1850_transferring": {"score": 0, "max": 5, "contribution": "description"},
      "m1860_ambulation": {"score": 0, "max": 6, "contribution": "description"}
    },
    "threshold_used": "X points for low, Y for high",
    "level_driver": "Which items are driving the level",
    "optimization_opportunities": ["ways to improve if clinically appropriate"]
  },
  "comorbidity_adjustment": {
    "level": "none/low/high",
    "total_comorbidities": 0,
    "high_value_count": 0,
    "medium_value_count": 0,
    "high_value_conditions": ["list"],
    "medium_value_conditions": ["list"],
    "missing_opportunities": ["comorbidities that could be added if present"],
    "rationale": "explanation of level determination"
  },
  "admission_timing": {
    "admission_source": "community/institutional",
    "admission_source_confidence": "high/medium/low",
    "admission_source_evidence": "what supports this",
    "episode_timing": "early/late",
    "episode_timing_confidence": "high/medium/low",
    "episode_timing_evidence": "what supports this",
    "m0110_value": "value if found",
    "days_since_soc": null,
    "discrepancies": ["any conflicts found"],
    "payment_impact": "how this combination affects payment"
  },
  "case_mix_calculation": {
    "base_payment": 2031.64,
    "clinical_weight": 0.0,
    "functional_multiplier": 0.0,
    "comorbidity_multiplier": 0.0,
    "source_timing_key": "community_early etc",
    "final_case_mix_weight": 0.0,
    "calculated_payment": 0.0,
    "calculation_steps": [
      "Step 1: description",
      "Step 2: description"
    ]
  },
  "discrepancies": [
    {
      "type": "category",
      "severity": "critical/high/medium/low",
      "finding": "what was found",
      "expected": "what should be",
      "actual": "what is documented",
      "revenue_impact": "$ impact estimate",
      "recommendation": "what to do"
    }
  ],
  "optimization_opportunities": [
    {
      "area": "area name",
      "current_state": "current documentation",
      "opportunity": "what could change",
      "potential_impact": "$ or % impact",
      "action_required": "specific action",
      "clinical_justification_needed": "what clinical evidence is needed"
    }
  ],
  "summary": {
    "payment_amount": 0.0,
    "key_drivers": ["top 3 factors affecting payment"],
    "risk_areas": ["areas of concern"],
    "quick_wins": ["easy improvements"]
  }
}`,
        response_json_schema: {
          type: "object",
          properties: {
            clinical_group: { type: "object" },
            functional_level: { type: "object" },
            comorbidity_adjustment: { type: "object" },
            admission_timing: { type: "object" },
            case_mix_calculation: { type: "object" },
            discrepancies: { type: "array", items: { type: "object" } },
            optimization_opportunities: { type: "array", items: { type: "object" } },
            summary: { type: "object" }
          }
        }
      });

      setNavigation(result);
    } catch (err) {
      console.error("PDGM Navigation error:", err);
      setError("Failed to analyze PDGM grouping. Please try again.");
    }

    setIsAnalyzing(false);
  };

  const getConfidenceBadge = (confidence) => {
    const styles = {
      high: 'bg-green-100 text-green-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-red-100 text-red-800'
    };
    return styles[confidence] || styles.medium;
  };

  const getSeverityBadge = (severity) => {
    const styles = {
      critical: 'bg-red-600 text-white',
      high: 'bg-orange-500 text-white',
      medium: 'bg-yellow-500 text-white',
      low: 'bg-blue-500 text-white'
    };
    return styles[severity] || styles.medium;
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  const getLevelColor = (level) => {
    if (level === 'high') return 'text-green-600 bg-green-100';
    if (level === 'medium') return 'text-yellow-600 bg-yellow-100';
    return 'text-blue-600 bg-blue-100';
  };

  if (!pdgmData) {
    return (
      <Card className="border-2 border-gray-200">
        <CardContent className="p-6 text-center text-gray-500">
          <Navigation className="w-8 h-8 mx-auto mb-2 opacity-50" />
          <p className="text-sm">Upload and analyze an OASIS document to use the PDGM Navigator</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-cyan-200">
      <CardHeader className="pb-3 bg-gradient-to-r from-cyan-50 to-blue-50">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Navigation className="w-5 h-5 text-cyan-600" />
            Automated PDGM Navigator
          </div>
          {navigation?.summary?.payment_amount && (
            <Badge className="bg-green-600 text-white text-lg px-3 py-1">
              {formatCurrency(navigation.summary.payment_amount)}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {isAnalyzing ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-600 mx-auto mb-3" />
            <p className="text-sm text-gray-600">Analyzing PDGM grouping and calculating payment...</p>
            <p className="text-xs text-gray-400 mt-1">Evaluating clinical group, functional level, comorbidities, and timing</p>
          </div>
        ) : !navigation ? (
          <Button
            onClick={runPDGMNavigation}
            className="w-full bg-cyan-600 hover:bg-cyan-700"
          >
            <Navigation className="w-4 h-4 mr-2" /> Analyze PDGM Grouping
          </Button>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
              {/* Clinical Group */}
              <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                <div className="flex items-center gap-1 mb-1">
                  <Stethoscope className="w-3 h-3 text-blue-600" />
                  <span className="text-xs text-blue-600 font-medium">Clinical Group</span>
                </div>
                <p className="text-sm font-bold text-blue-900 truncate" title={navigation.clinical_group?.group_name}>
                  {navigation.clinical_group?.group_name || 'Unknown'}
                </p>
                <Badge className={`text-xs mt-1 ${getConfidenceBadge(navigation.clinical_group?.confidence)}`}>
                  {navigation.clinical_group?.confidence} confidence
                </Badge>
              </div>

              {/* Functional Level */}
              <div className="p-3 bg-purple-50 rounded-lg border border-purple-200">
                <div className="flex items-center gap-1 mb-1">
                  <Activity className="w-3 h-3 text-purple-600" />
                  <span className="text-xs text-purple-600 font-medium">Functional Level</span>
                </div>
                <p className="text-sm font-bold text-purple-900 capitalize">
                  {navigation.functional_level?.level || 'Unknown'}
                </p>
                <p className="text-xs text-purple-600">
                  {navigation.functional_level?.total_points || 0} points
                </p>
              </div>

              {/* Admission/Timing */}
              <div className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex items-center gap-1 mb-1">
                  <Building2 className="w-3 h-3 text-orange-600" />
                  <span className="text-xs text-orange-600 font-medium">Source/Timing</span>
                </div>
                <p className="text-sm font-bold text-orange-900 capitalize">
                  {navigation.admission_timing?.admission_source || 'Unknown'}
                </p>
                <p className="text-xs text-orange-600 capitalize">
                  {navigation.admission_timing?.episode_timing || 'Unknown'} Episode
                </p>
              </div>

              {/* Comorbidity */}
              <div className="p-3 bg-green-50 rounded-lg border border-green-200">
                <div className="flex items-center gap-1 mb-1">
                  <FileText className="w-3 h-3 text-green-600" />
                  <span className="text-xs text-green-600 font-medium">Comorbidity Adj.</span>
                </div>
                <p className="text-sm font-bold text-green-900 capitalize">
                  {navigation.comorbidity_adjustment?.level || 'None'}
                </p>
                <p className="text-xs text-green-600">
                  {navigation.comorbidity_adjustment?.high_value_count || 0} high-value
                </p>
              </div>
            </div>

            {/* Case-Mix Calculation Breakdown */}
            {navigation.case_mix_calculation && (
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-indigo-200">
                <h3 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                  <Calculator className="w-4 h-4" />
                  Case-Mix Payment Calculation
                </h3>
                
                {/* Visual Payment Flow */}
                <div className="flex items-center justify-between flex-wrap gap-2 mb-4 text-center">
                  <div className="bg-white p-2 rounded border min-w-[80px]">
                    <p className="text-xs text-gray-500">Base</p>
                    <p className="font-bold text-indigo-700">{formatCurrency(navigation.case_mix_calculation.base_payment)}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  <div className="bg-white p-2 rounded border min-w-[80px]">
                    <p className="text-xs text-gray-500">Clinical</p>
                    <p className="font-bold text-blue-600">×{navigation.case_mix_calculation.clinical_weight?.toFixed(4)}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  <div className="bg-white p-2 rounded border min-w-[80px]">
                    <p className="text-xs text-gray-500">Functional</p>
                    <p className="font-bold text-purple-600">×{navigation.case_mix_calculation.functional_multiplier?.toFixed(2)}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  <div className="bg-white p-2 rounded border min-w-[80px]">
                    <p className="text-xs text-gray-500">Comorbidity</p>
                    <p className="font-bold text-green-600">×{navigation.case_mix_calculation.comorbidity_multiplier?.toFixed(3)}</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                  <div className="bg-green-100 p-2 rounded border-2 border-green-400 min-w-[100px]">
                    <p className="text-xs text-green-600">Payment</p>
                    <p className="font-bold text-green-700 text-lg">{formatCurrency(navigation.case_mix_calculation.calculated_payment)}</p>
                  </div>
                </div>

                {/* Case-Mix Weight */}
                <div className="bg-white p-3 rounded border">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-700">Final Case-Mix Weight</span>
                    <span className="text-lg font-bold text-indigo-700">
                      {navigation.case_mix_calculation.final_case_mix_weight?.toFixed(4)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">
                    Source/Timing: <span className="font-mono">{navigation.case_mix_calculation.source_timing_key}</span>
                  </p>
                </div>

                {/* Calculation Steps */}
                {navigation.case_mix_calculation.calculation_steps?.length > 0 && (
                  <div className="mt-3 text-xs text-indigo-700 space-y-1">
                    {navigation.case_mix_calculation.calculation_steps.map((step, i) => (
                      <p key={i} className="flex items-start gap-1">
                        <span className="font-bold">{i + 1}.</span> {step}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Detailed Breakdown Accordion */}
            <Accordion type="multiple" className="space-y-2">
              {/* Clinical Group Details */}
              <AccordionItem value="clinical" className="border rounded-lg">
                <AccordionTrigger className="px-4 py-3 hover:no-underline bg-blue-50 rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-4 h-4 text-blue-600" />
                    <span className="font-medium text-blue-800">Clinical Group Details</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2">
                  <div className="space-y-3">
                    <div className="bg-blue-50 p-3 rounded border border-blue-200">
                      <p className="text-xs text-gray-500 mb-1">Assigned Group</p>
                      <p className="font-semibold text-blue-900">{navigation.clinical_group?.group_name}</p>
                      <p className="text-xs text-gray-600 mt-1">{navigation.clinical_group?.rationale}</p>
                    </div>
                    
                    <div className="bg-white p-3 rounded border">
                      <p className="text-xs font-medium text-gray-700 mb-1">ICD-10 Mapping Basis</p>
                      <p className="text-sm text-gray-800">{navigation.clinical_group?.icd10_basis}</p>
                    </div>

                    {navigation.clinical_group?.alternative_groups?.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-gray-700 mb-2">Alternative Groups (if documentation changes)</p>
                        {navigation.clinical_group.alternative_groups.map((alt, i) => (
                          <div key={i} className="flex items-center gap-2 text-xs bg-gray-50 p-2 rounded mb-1">
                            <Badge variant="outline">{alt.group}</Badge>
                            <span className="text-gray-600">if {alt.if_condition}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    {navigation.clinical_group?.potential_issues?.length > 0 && (
                      <Alert className="bg-yellow-50 border-yellow-200">
                        <AlertTriangle className="w-4 h-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-800 text-xs">
                          <strong>Potential Issues:</strong>
                          <ul className="mt-1 space-y-1">
                            {navigation.clinical_group.potential_issues.map((issue, i) => (
                              <li key={i}>• {issue}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Functional Level Details */}
              <AccordionItem value="functional" className="border rounded-lg">
                <AccordionTrigger className="px-4 py-3 hover:no-underline bg-purple-50 rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <Activity className="w-4 h-4 text-purple-600" />
                    <span className="font-medium text-purple-800">Functional Impairment Breakdown</span>
                    <Badge className={`ml-2 ${getLevelColor(navigation.functional_level?.level)}`}>
                      {navigation.functional_level?.total_points} pts = {navigation.functional_level?.level}
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2">
                  <div className="space-y-3">
                    {/* Point Breakdown Table */}
                    <div className="border rounded overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-purple-100">
                          <tr>
                            <th className="text-left p-2">M-Item</th>
                            <th className="text-center p-2">Score</th>
                            <th className="text-center p-2">Max</th>
                            <th className="text-left p-2">Contribution</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {navigation.functional_level?.point_breakdown && 
                            Object.entries(navigation.functional_level.point_breakdown).map(([key, data]) => (
                              <tr key={key} className="hover:bg-gray-50">
                                <td className="p-2 font-mono text-purple-700">{key.toUpperCase().replace('_', ' ')}</td>
                                <td className="p-2 text-center font-bold">{data.score}</td>
                                <td className="p-2 text-center text-gray-500">{data.max}</td>
                                <td className="p-2 text-gray-600">{data.contribution}</td>
                              </tr>
                            ))
                          }
                        </tbody>
                        <tfoot className="bg-purple-50">
                          <tr>
                            <td className="p-2 font-semibold">Total</td>
                            <td className="p-2 text-center font-bold text-purple-700">
                              {navigation.functional_level?.total_points}
                            </td>
                            <td className="p-2 text-center text-gray-500">30</td>
                            <td className="p-2"></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>

                    <div className="bg-gray-50 p-3 rounded border text-xs">
                      <p className="font-medium text-gray-700 mb-1">Threshold Used</p>
                      <p className="text-gray-600">{navigation.functional_level?.threshold_used}</p>
                    </div>

                    <div className="bg-purple-50 p-3 rounded border border-purple-200 text-xs">
                      <p className="font-medium text-purple-700 mb-1">Level Driver</p>
                      <p className="text-purple-800">{navigation.functional_level?.level_driver}</p>
                    </div>

                    {navigation.functional_level?.optimization_opportunities?.length > 0 && (
                      <div className="bg-green-50 p-3 rounded border border-green-200">
                        <p className="text-xs font-medium text-green-700 mb-1 flex items-center gap-1">
                          <TrendingUp className="w-3 h-3" /> Optimization Opportunities
                        </p>
                        <ul className="text-xs text-green-800 space-y-1">
                          {navigation.functional_level.optimization_opportunities.map((opp, i) => (
                            <li key={i}>• {opp}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Comorbidity Details */}
              <AccordionItem value="comorbidity" className="border rounded-lg">
                <AccordionTrigger className="px-4 py-3 hover:no-underline bg-green-50 rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-green-600" />
                    <span className="font-medium text-green-800">Comorbidity Analysis</span>
                    <Badge className={`ml-2 ${getLevelColor(navigation.comorbidity_adjustment?.level === 'high' ? 'high' : navigation.comorbidity_adjustment?.level === 'low' ? 'medium' : 'low')}`}>
                      {navigation.comorbidity_adjustment?.level} adjustment
                    </Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2">
                  <div className="space-y-3">
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-gray-50 p-2 rounded border">
                        <p className="text-xs text-gray-500">Total</p>
                        <p className="text-lg font-bold">{navigation.comorbidity_adjustment?.total_comorbidities || 0}</p>
                      </div>
                      <div className="bg-green-50 p-2 rounded border border-green-200">
                        <p className="text-xs text-green-600">High-Value</p>
                        <p className="text-lg font-bold text-green-700">{navigation.comorbidity_adjustment?.high_value_count || 0}</p>
                      </div>
                      <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                        <p className="text-xs text-yellow-600">Medium-Value</p>
                        <p className="text-lg font-bold text-yellow-700">{navigation.comorbidity_adjustment?.medium_value_count || 0}</p>
                      </div>
                    </div>

                    {navigation.comorbidity_adjustment?.high_value_conditions?.length > 0 && (
                      <div className="bg-green-50 p-3 rounded border border-green-200">
                        <p className="text-xs font-medium text-green-700 mb-1">High-Value Conditions (Increase Payment)</p>
                        <div className="flex flex-wrap gap-1">
                          {navigation.comorbidity_adjustment.high_value_conditions.map((c, i) => (
                            <Badge key={i} className="bg-green-200 text-green-800 text-xs">{c}</Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {navigation.comorbidity_adjustment?.missing_opportunities?.length > 0 && (
                      <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                        <p className="text-xs font-medium text-yellow-700 mb-1 flex items-center gap-1">
                          <Lightbulb className="w-3 h-3" /> Missing Documentation Opportunities
                        </p>
                        <ul className="text-xs text-yellow-800 space-y-1">
                          {navigation.comorbidity_adjustment.missing_opportunities.map((opp, i) => (
                            <li key={i}>• {opp}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                      {navigation.comorbidity_adjustment?.rationale}
                    </p>
                  </div>
                </AccordionContent>
              </AccordionItem>

              {/* Admission/Timing Details */}
              <AccordionItem value="timing" className="border rounded-lg">
                <AccordionTrigger className="px-4 py-3 hover:no-underline bg-orange-50 rounded-t-lg">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-orange-600" />
                    <span className="font-medium text-orange-800">Admission Source & Episode Timing</span>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 pt-2">
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-orange-50 p-3 rounded border border-orange-200">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-orange-600">Admission Source</span>
                          <Badge className={getConfidenceBadge(navigation.admission_timing?.admission_source_confidence)}>
                            {navigation.admission_timing?.admission_source_confidence}
                          </Badge>
                        </div>
                        <p className="font-semibold text-orange-900 capitalize">
                          {navigation.admission_timing?.admission_source}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {navigation.admission_timing?.admission_source_evidence}
                        </p>
                      </div>

                      <div className="bg-blue-50 p-3 rounded border border-blue-200">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-blue-600">Episode Timing</span>
                          <Badge className={getConfidenceBadge(navigation.admission_timing?.episode_timing_confidence)}>
                            {navigation.admission_timing?.episode_timing_confidence}
                          </Badge>
                        </div>
                        <p className="font-semibold text-blue-900 capitalize">
                          {navigation.admission_timing?.episode_timing}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          {navigation.admission_timing?.episode_timing_evidence}
                        </p>
                      </div>
                    </div>

                    {navigation.admission_timing?.m0110_value && (
                      <div className="bg-gray-50 p-2 rounded border text-xs">
                        <span className="text-gray-500">M0110 Value: </span>
                        <span className="font-mono font-medium">{navigation.admission_timing.m0110_value}</span>
                      </div>
                    )}

                    <div className="bg-indigo-50 p-3 rounded border border-indigo-200 text-xs">
                      <p className="font-medium text-indigo-700 mb-1">Payment Impact</p>
                      <p className="text-indigo-800">{navigation.admission_timing?.payment_impact}</p>
                    </div>

                    {navigation.admission_timing?.discrepancies?.length > 0 && (
                      <Alert className="bg-red-50 border-red-200">
                        <XCircle className="w-4 h-4 text-red-600" />
                        <AlertDescription className="text-red-800 text-xs">
                          <strong>Discrepancies Found:</strong>
                          <ul className="mt-1 space-y-1">
                            {navigation.admission_timing.discrepancies.map((d, i) => (
                              <li key={i}>• {d}</li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            </Accordion>

            {/* Discrepancies */}
            {navigation.discrepancies?.length > 0 && (
              <div className="bg-red-50 p-4 rounded-lg border-2 border-red-200">
                <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Discrepancies Detected ({navigation.discrepancies.length})
                </h3>
                <div className="space-y-2">
                  {navigation.discrepancies.map((disc, idx) => (
                    <div key={idx} className="bg-white p-3 rounded border border-red-200">
                      <div className="flex items-center justify-between mb-1">
                        <Badge className={getSeverityBadge(disc.severity)}>{disc.severity}</Badge>
                        <Badge variant="outline" className="text-xs">{disc.type}</Badge>
                      </div>
                      <p className="text-sm text-gray-800 mb-1">{disc.finding}</p>
                      <div className="flex items-center gap-2 text-xs text-gray-600 mb-2">
                        <span>Expected: <strong>{disc.expected}</strong></span>
                        <ArrowRight className="w-3 h-3" />
                        <span>Actual: <strong className="text-red-600">{disc.actual}</strong></span>
                      </div>
                      {disc.revenue_impact && (
                        <p className="text-xs text-green-700 bg-green-50 p-1 rounded">💰 {disc.revenue_impact}</p>
                      )}
                      <p className="text-xs text-blue-700 mt-1">
                        <strong>Action:</strong> {disc.recommendation}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Optimization Opportunities */}
            {navigation.optimization_opportunities?.length > 0 && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4" />
                  Optimization Opportunities
                </h3>
                <div className="space-y-2">
                  {navigation.optimization_opportunities.map((opp, idx) => (
                    <div key={idx} className="bg-white p-3 rounded border border-green-200">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-green-900">{opp.area}</span>
                        <Badge className="bg-green-600 text-white">{opp.potential_impact}</Badge>
                      </div>
                      <p className="text-xs text-gray-600 mb-1">Current: {opp.current_state}</p>
                      <p className="text-sm text-green-800 mb-1">{opp.opportunity}</p>
                      <div className="bg-blue-50 p-2 rounded text-xs">
                        <strong>Action:</strong> {opp.action_required}
                      </div>
                      {opp.clinical_justification_needed && (
                        <p className="text-xs text-gray-500 mt-1 italic">
                          Requires: {opp.clinical_justification_needed}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Key Drivers Summary */}
            {navigation.summary?.key_drivers?.length > 0 && (
              <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                <p className="text-xs font-semibold text-indigo-800 mb-2">Key Payment Drivers</p>
                <div className="flex flex-wrap gap-2">
                  {navigation.summary.key_drivers.map((driver, i) => (
                    <Badge key={i} className="bg-indigo-200 text-indigo-800">{driver}</Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Re-analyze Button */}
            <Button
              onClick={() => { setNavigation(null); setAutoAnalyzed(false); }}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Re-analyze PDGM Grouping
            </Button>
          </>
        )}

        {error && (
          <Alert className="bg-red-50 border-red-200">
            <AlertDescription className="text-red-800 text-sm">{error}</AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
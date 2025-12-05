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
  ChevronRight,
  Settings,
  Download,
  FileJson,
  FileDown,
  FileSpreadsheet
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

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

export default function AutomatedPDGMNavigator({ analysisResults, pdgmData, revenueData, onNavigationComplete }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [navigation, setNavigation] = useState(null);
  const [error, setError] = useState(null);
  const [autoAnalyzed, setAutoAnalyzed] = useState(false);
  const [resolutionWorkflows, setResolutionWorkflows] = useState({});
  const [loadingResolution, setLoadingResolution] = useState(null);
  const [financialPredictions, setFinancialPredictions] = useState({});
  const [loadingPrediction, setLoadingPrediction] = useState(null);
  const [showCostSettings, setShowCostSettings] = useState(false);
  const [agencyCosts, setAgencyCosts] = useState(() => {
    const saved = localStorage.getItem('pdgm_agency_costs');
    return saved ? JSON.parse(saved) : {
      avgStaffHourlyRate: 45,
      trainingCostPerHour: 35,
      documentationTimePerEpisode: 0.5,
      auditStaffHourlyRate: 50,
      avgEpisodesPerYear: 50
    };
  });

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

CRITICAL INSTRUCTIONS:
- ALL ICD-10 diagnoses are valid for PDGM - there is no such thing as an "invalid diagnosis for PDGM"
- Every diagnosis maps to one of the 12 PDGM clinical groups (MMTA categories)
- If you're uncertain about the exact mapping, use your best clinical judgment to assign to the most appropriate group
- Do NOT flag a diagnosis as "invalid" or "not recognized" - instead, determine which clinical group it most closely aligns with
- If the diagnosis is unclear, assign it to "MMTA_Other" rather than marking it as invalid

Provide a complete PDGM navigation analysis:

1. CLINICAL GROUP DETERMINATION
- Identify the correct PDGM clinical group based on the primary diagnosis ICD-10 code
- Every diagnosis MUST be assigned to one of the 12 clinical groups (Surgical Aftercare, Cardiac/Circulatory, Endocrine, GI/GU, Infectious Disease, Respiratory, Neuro/Rehab, Wounds, Complex Nursing, Behavioral Health, Medication Management, Musculoskeletal, or Other)
- Explain WHY this clinical group applies based on the diagnosis description and ICD-10 category
- List alternative clinical groups that could apply if documentation or coding changes
- Only flag issues if there are true documentation problems (missing info, conflicting data) - NOT diagnosis validity

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
    "rationale": "Why this group was assigned based on the diagnosis",
    "icd10_basis": "ICD-10 code category and clinical reasoning for this mapping",
    "alternative_groups": [{"group": "name", "if_condition": "what would need to change"}],
    "potential_issues": ["ONLY list real documentation issues like missing data or conflicts - NEVER say diagnosis is invalid"]
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
      
      // Notify parent of navigation completion
      if (onNavigationComplete) {
        onNavigationComplete(result);
      }
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

  const handleCostChange = (field, value) => {
    const numValue = parseFloat(value) || 0;
    const updated = { ...agencyCosts, [field]: numValue };
    setAgencyCosts(updated);
    localStorage.setItem('pdgm_agency_costs', JSON.stringify(updated));
  };

  const resetCosts = () => {
    const defaults = {
      avgStaffHourlyRate: 45,
      trainingCostPerHour: 35,
      documentationTimePerEpisode: 0.5,
      auditStaffHourlyRate: 50,
      avgEpisodesPerYear: 50
    };
    setAgencyCosts(defaults);
    localStorage.setItem('pdgm_agency_costs', JSON.stringify(defaults));
  };

  const exportJSON = () => {
    const exportData = {
      navigation_analysis: navigation,
      financial_predictions: financialPredictions,
      resolution_workflows: resolutionWorkflows,
      pdgm_data: pdgmData,
      analysis_results: analysisResults,
      export_date: new Date().toISOString()
    };

    const dataStr = JSON.stringify(exportData, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PDGM_Navigator_Analysis_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const exportCSV = () => {
    if (!navigation) return;

    const rows = [
      ['PDGM Navigator Analysis - Discrepancies & Opportunities'],
      ['Generated:', new Date().toISOString()],
      [''],
      ['DISCREPANCIES'],
      ['Type', 'Severity', 'Finding', 'Expected', 'Actual', 'Revenue Impact', 'Recommendation']
    ];

    (navigation.discrepancies || []).forEach(d => {
      rows.push([
        d.type || '',
        d.severity || '',
        d.finding || '',
        d.expected || '',
        d.actual || '',
        d.revenue_impact || '',
        d.recommendation || ''
      ]);
    });

    rows.push(['']);
    rows.push(['OPTIMIZATION OPPORTUNITIES']);
    rows.push(['Area', 'Current State', 'Opportunity', 'Potential Impact', 'Action Required', 'Clinical Justification']);

    (navigation.optimization_opportunities || []).forEach(o => {
      rows.push([
        o.area || '',
        o.current_state || '',
        o.opportunity || '',
        o.potential_impact || '',
        o.action_required || '',
        o.clinical_justification_needed || ''
      ]);
    });

    const csvContent = rows.map(row => 
      row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
    ).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `PDGM_Navigator_Report_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const getFinancialPrediction = async (item, index, type = 'discrepancy') => {
    setLoadingPrediction(index);
    
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a PDGM financial analyst. Predict the financial impact of this ${type} over a 1-year period.

${type.toUpperCase()} DETAILS:
${JSON.stringify(item, null, 2)}

CURRENT REVENUE DATA:
Base Payment: ${revenueData?.original?.totalPayment || navigation?.case_mix_calculation?.calculated_payment || 2031.64}
Current Case-Mix: ${revenueData?.original?.caseMixWeight || navigation?.case_mix_calculation?.final_case_mix_weight || 1.0}

AGENCY-SPECIFIC COST DATA (use these values for calculations):
- Average Staff Hourly Rate: $${agencyCosts.avgStaffHourlyRate}
- Training Cost Per Hour: $${agencyCosts.trainingCostPerHour}
- Documentation Time Per Episode: ${agencyCosts.documentationTimePerEpisode} hours
- Audit Staff Hourly Rate: $${agencyCosts.auditStaffHourlyRate}
- Average Similar Episodes Per Year: ${agencyCosts.avgEpisodesPerYear}
- Current documentation pattern: likely to repeat
- Industry average correction rate: 65% if addressed proactively

IMPORTANT: Use the agency-specific values above for ALL cost calculations, implementation costs, and breakeven analysis.

Provide a detailed financial impact analysis:

1. PER-EPISODE IMPACT
   - Current state payment (if unaddressed)
   - Corrected state payment (if addressed)
   - Net gain per episode

2. ANNUAL PROJECTION (1 YEAR)
   - Use ${agencyCosts.avgEpisodesPerYear} episodes/year based on agency data
   - Total revenue if unaddressed
   - Total revenue if corrected
   - Total opportunity cost
   - Cumulative impact over time

3. RISK ANALYSIS
   - Probability this issue repeats: %
   - Audit risk if unaddressed
   - Compliance exposure
   - Downside scenarios

4. PRIORITIZATION SCORE
   - Financial urgency (1-10)
   - Ease of correction (1-10)
   - ROI potential (low/medium/high)
   - Recommended action timeline

5. BREAKEVEN ANALYSIS
   - Time to implement correction (in hours)
   - Cost to implement using agency rates:
     * Staff time at $${agencyCosts.avgStaffHourlyRate}/hour
     * Training at $${agencyCosts.trainingCostPerHour}/hour
     * Documentation updates at ${agencyCosts.documentationTimePerEpisode} hours/episode
     * Audit/review at $${agencyCosts.auditStaffHourlyRate}/hour
   - Breakeven point (# of episodes)
   - Net benefit after 1 year

Return JSON:
{
  "per_episode": {
    "current_payment": 0,
    "corrected_payment": 0,
    "gain_per_episode": 0,
    "percentage_increase": 0,
    "explanation": "why this gap exists"
  },
  "annual_projection": {
    "similar_episodes_per_year": ${agencyCosts.avgEpisodesPerYear},
    "total_current_revenue": 0,
    "total_corrected_revenue": 0,
    "total_opportunity": 0,
    "opportunity_if_50_percent_corrected": 0,
    "cumulative_12_month": 0,
    "monthly_impact": 0
  },
  "risk_analysis": {
    "repetition_probability": 0,
    "audit_risk_level": "low/medium/high/critical",
    "compliance_exposure": "description",
    "downside_scenario": "worst case if unaddressed",
    "downside_amount": 0
  },
  "prioritization": {
    "financial_urgency": 0,
    "ease_of_correction": 0,
    "roi_potential": "low/medium/high",
    "priority_rank": "low/medium/high/critical",
    "recommended_timeline": "immediate/this week/this month/this quarter",
    "justification": "why this priority"
  },
  "breakeven": {
    "implementation_time": "time estimate",
    "implementation_cost": 0,
    "episodes_to_breakeven": 0,
    "time_to_breakeven": "time estimate",
    "net_benefit_year_1": 0,
    "roi_percentage": 0
  },
  "visual_summary": {
    "icon": "💰/⚠️/🎯/📈",
    "tagline": "one-sentence impact summary",
    "color_code": "green/yellow/orange/red"
  }
}`,
        response_json_schema: {
          type: "object",
          properties: {
            per_episode: { type: "object" },
            annual_projection: { type: "object" },
            risk_analysis: { type: "object" },
            prioritization: { type: "object" },
            breakeven: { type: "object" },
            visual_summary: { type: "object" }
          }
        }
      });

      setFinancialPredictions(prev => ({
        ...prev,
        [index]: result
      }));
    } catch (err) {
      console.error("Financial prediction error:", err);
      setFinancialPredictions(prev => ({
        ...prev,
        [index]: { error: "Failed to generate financial prediction. Please try again." }
      }));
    }
    
    setLoadingPrediction(null);
  };

  const getPriorityColor = (priority) => {
    const colors = {
      critical: 'bg-red-600 text-white',
      high: 'bg-orange-500 text-white',
      medium: 'bg-yellow-500 text-white',
      low: 'bg-blue-500 text-white'
    };
    return colors[priority] || colors.medium;
  };

  const getResolutionWorkflow = async (discrepancy, index) => {
    setLoadingResolution(index);
    
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a CMS OASIS compliance expert. Provide a detailed resolution workflow for this PDGM discrepancy.

DISCREPANCY DETAILS:
${JSON.stringify(discrepancy, null, 2)}

FULL OASIS CONTEXT:
Primary Diagnosis: ${pdgmData.primary_diagnosis_code} - ${pdgmData.primary_diagnosis_description}
Admission Source: ${pdgmData.admission_source}
Episode Timing: ${pdgmData.episode_timing}
Functional Scores: ${JSON.stringify(pdgmData.functional_scores, null, 2)}
Comorbidities: ${JSON.stringify(pdgmData.comorbidities, null, 2)}

Provide a comprehensive resolution plan:

1. ROOT CAUSE ANALYSIS
   - Identify exactly why this discrepancy occurred
   - Explain the specific data points causing the issue

2. STEP-BY-STEP CORRECTION PROCESS
   - Provide numbered steps to resolve
   - Be specific about which M-items or fields need correction
   - Include verification steps

3. CLINICAL DOCUMENTATION CHANGES
   - Provide exact text snippets to add/modify
   - Show before/after examples
   - Ensure clinical appropriateness

4. CMS GUIDELINES REFERENCE
   - Cite specific CMS OASIS-E guidance sections
   - Reference relevant M-item definitions
   - Include PDGM grouping rules

5. VALIDATION CHECKLIST
   - List items to verify after correction
   - Include interdependency checks

Return JSON:
{
  "root_cause": "detailed explanation of why discrepancy exists",
  "severity_explanation": "why this matters for reimbursement/compliance",
  "correction_steps": [
    {
      "step_number": 1,
      "action": "what to do",
      "specific_fields": ["M-items or fields to change"],
      "rationale": "why this step is needed"
    }
  ],
  "documentation_changes": [
    {
      "item": "M-item or field",
      "current_value": "what's currently documented",
      "recommended_value": "what it should be",
      "example_narrative": "exact text to add to clinical notes",
      "clinical_justification": "why this is clinically appropriate"
    }
  ],
  "cms_references": [
    {
      "guideline": "CMS guideline name",
      "section": "specific section",
      "quote": "relevant quote from guideline",
      "application": "how it applies to this case"
    }
  ],
  "validation_checklist": [
    "item to verify after correction"
  ],
  "estimated_resolution_time": "time estimate",
  "revenue_impact_if_resolved": "$ impact explanation"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            root_cause: { type: "string" },
            severity_explanation: { type: "string" },
            correction_steps: { type: "array", items: { type: "object" } },
            documentation_changes: { type: "array", items: { type: "object" } },
            cms_references: { type: "array", items: { type: "object" } },
            validation_checklist: { type: "array", items: { type: "string" } },
            estimated_resolution_time: { type: "string" },
            revenue_impact_if_resolved: { type: "string" }
          }
        }
      });

      setResolutionWorkflows(prev => ({
        ...prev,
        [index]: result
      }));
    } catch (err) {
      console.error("Resolution workflow error:", err);
      setResolutionWorkflows(prev => ({
        ...prev,
        [index]: { error: "Failed to generate resolution workflow. Please try again." }
      }));
    }
    
    setLoadingResolution(null);
  };

  const getLevelColor = (level) => {
    if (level === 'high') return 'text-green-600 bg-green-100';
    if (level === 'medium') return 'text-yellow-600 bg-yellow-100';
    return 'text-blue-600 bg-blue-100';
  };

  const [isExporting, setIsExporting] = useState(false);

  const exportPDF = async () => {
    if (!navigation) return;

    setIsExporting(true);
    try {
      const { generatePDGMNavigatorPDF } = await import('@/functions/generatePDGMNavigatorPDF');
      
      const response = await generatePDGMNavigatorPDF({
        navigationData: navigation,
        pdgmData: pdgmData,
        patientName: pdgmData?.patient_info?.name || 'Unknown Patient'
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PDGM_Navigator_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error("PDF export error:", err);
    }
    setIsExporting(false);
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
          <div className="flex items-center gap-2">
            <Dialog open={showCostSettings} onOpenChange={setShowCostSettings}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2">
                  <Settings className="w-3 h-3" />
                  Agency Costs
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Agency Cost Settings</DialogTitle>
                  <DialogDescription>
                    Customize cost data for more accurate ROI calculations
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="staffRate">Average Staff Hourly Rate ($)</Label>
                    <Input
                      id="staffRate"
                      type="number"
                      step="0.01"
                      value={agencyCosts.avgStaffHourlyRate}
                      onChange={(e) => handleCostChange('avgStaffHourlyRate', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="trainingRate">Training Cost Per Hour ($)</Label>
                    <Input
                      id="trainingRate"
                      type="number"
                      step="0.01"
                      value={agencyCosts.trainingCostPerHour}
                      onChange={(e) => handleCostChange('trainingCostPerHour', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="docTime">Documentation Time Per Episode (hours)</Label>
                    <Input
                      id="docTime"
                      type="number"
                      step="0.1"
                      value={agencyCosts.documentationTimePerEpisode}
                      onChange={(e) => handleCostChange('documentationTimePerEpisode', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="auditRate">Audit Staff Hourly Rate ($)</Label>
                    <Input
                      id="auditRate"
                      type="number"
                      step="0.01"
                      value={agencyCosts.auditStaffHourlyRate}
                      onChange={(e) => handleCostChange('auditStaffHourlyRate', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="episodes">Avg Similar Episodes Per Year</Label>
                    <Input
                      id="episodes"
                      type="number"
                      value={agencyCosts.avgEpisodesPerYear}
                      onChange={(e) => handleCostChange('avgEpisodesPerYear', e.target.value)}
                    />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={resetCosts} variant="outline" className="flex-1">
                      Reset to Defaults
                    </Button>
                    <Button onClick={() => setShowCostSettings(false)} className="flex-1">
                      Save & Close
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
            {navigation?.summary?.payment_amount && (
              <Badge className="bg-green-600 text-white text-lg px-3 py-1">
                {formatCurrency(navigation.summary.payment_amount)}
              </Badge>
            )}
            {navigation && (
              <div className="flex items-center gap-2">
                <Button
                  onClick={exportJSON}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <FileJson className="w-3 h-3" />
                  JSON
                </Button>
                <Button
                  onClick={exportCSV}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  <FileSpreadsheet className="w-3 h-3" />
                  CSV
                </Button>
                <Button
                  onClick={exportPDF}
                  disabled={isExporting}
                  size="sm"
                  variant="outline"
                  className="gap-2"
                >
                  {isExporting ? (
                    <><Loader2 className="w-3 h-3 animate-spin" /> PDF</>
                  ) : (
                    <><FileDown className="w-3 h-3" /> PDF</>
                  )}
                </Button>
              </div>
            )}
          </div>
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
                <div className="space-y-3">
                  {navigation.discrepancies.map((disc, idx) => (
                    <div key={idx} className="bg-white rounded border border-red-200 overflow-hidden">
                      <div className="p-3">
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
                          <p className="text-xs text-green-700 bg-green-50 p-1 rounded mb-2">💰 {disc.revenue_impact}</p>
                        )}
                        <p className="text-xs text-blue-700 mb-2">
                          <strong>Action:</strong> {disc.recommendation}
                        </p>
                        
                        <div className="grid grid-cols-2 gap-2">
                          <Button
                            onClick={() => getFinancialPrediction(disc, idx, 'discrepancy')}
                            disabled={loadingPrediction === idx}
                            size="sm"
                            variant="outline"
                            className="border-green-300 hover:bg-green-50"
                          >
                            {loadingPrediction === idx ? (
                              <><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Calculating...</>
                            ) : financialPredictions[idx] ? (
                              <><DollarSign className="w-3 h-3 mr-2" /> View Prediction</>
                            ) : (
                              <><DollarSign className="w-3 h-3 mr-2" /> Financial Impact</>
                            )}
                          </Button>
                          <Button
                            onClick={() => getResolutionWorkflow(disc, idx)}
                            disabled={loadingResolution === idx}
                            size="sm"
                            className="bg-blue-600 hover:bg-blue-700"
                          >
                            {loadingResolution === idx ? (
                              <><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Loading...</>
                            ) : resolutionWorkflows[idx] ? (
                              <><CheckCircle2 className="w-3 h-3 mr-2" /> View Steps</>
                            ) : (
                              <><Target className="w-3 h-3 mr-2" /> Resolution</>
                            )}
                          </Button>
                        </div>
                      </div>

                      {/* Financial Prediction Details */}
                      {financialPredictions[idx] && !financialPredictions[idx].error && (
                        <div className="border-t border-red-200 bg-gradient-to-r from-green-50 to-emerald-50 p-4 space-y-3">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-2xl">{financialPredictions[idx].visual_summary?.icon || '💰'}</span>
                              <div>
                                <h4 className="font-semibold text-gray-900">Financial Impact Prediction</h4>
                                <p className="text-xs text-gray-600">{financialPredictions[idx].visual_summary?.tagline}</p>
                              </div>
                            </div>
                            <Badge className={getPriorityColor(financialPredictions[idx].prioritization?.priority_rank || 'medium')}>
                              {financialPredictions[idx].prioritization?.priority_rank?.toUpperCase()} PRIORITY
                            </Badge>
                          </div>

                          {/* Per Episode Impact */}
                          <div className="bg-white p-3 rounded-lg border-2 border-green-300">
                            <p className="text-xs font-semibold text-gray-700 mb-2">Per Episode Impact</p>
                            <div className="grid grid-cols-3 gap-2 mb-2">
                              <div className="text-center p-2 bg-red-50 rounded">
                                <p className="text-xs text-red-600">Current</p>
                                <p className="text-lg font-bold text-red-700">
                                  {formatCurrency(financialPredictions[idx].per_episode?.current_payment)}
                                </p>
                              </div>
                              <div className="flex items-center justify-center">
                                <ArrowRight className="w-5 h-5 text-green-600" />
                              </div>
                              <div className="text-center p-2 bg-green-50 rounded">
                                <p className="text-xs text-green-600">If Corrected</p>
                                <p className="text-lg font-bold text-green-700">
                                  {formatCurrency(financialPredictions[idx].per_episode?.corrected_payment)}
                                </p>
                              </div>
                            </div>
                            <div className="text-center bg-gradient-to-r from-green-100 to-emerald-100 p-2 rounded">
                              <p className="text-xs text-green-700">Gain Per Episode</p>
                              <p className="text-2xl font-bold text-green-800">
                                +{formatCurrency(financialPredictions[idx].per_episode?.gain_per_episode)}
                              </p>
                              <p className="text-xs text-green-600">
                                (+{financialPredictions[idx].per_episode?.percentage_increase}% increase)
                              </p>
                            </div>
                            <p className="text-xs text-gray-600 mt-2 italic">
                              {financialPredictions[idx].per_episode?.explanation}
                            </p>
                          </div>

                          {/* Annual Projection */}
                          <div className="bg-white p-3 rounded-lg border-2 border-blue-300">
                            <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                              <TrendingUp className="w-3 h-3" /> 1-Year Projection
                            </p>
                            <div className="space-y-2">
                              <div className="bg-gradient-to-r from-purple-100 to-indigo-100 p-3 rounded border-2 border-purple-300">
                                <p className="text-xs text-purple-700 mb-1">💎 Total Annual Opportunity</p>
                                <p className="text-3xl font-bold text-purple-800">
                                  {formatCurrency(financialPredictions[idx].annual_projection?.total_opportunity)}
                                </p>
                                <p className="text-xs text-purple-600 mt-1">
                                  Based on {financialPredictions[idx].annual_projection?.similar_episodes_per_year} similar episodes per year
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Risk Analysis */}
                          <div className="bg-white p-3 rounded-lg border border-orange-300">
                            <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                              <AlertTriangle className="w-3 h-3 text-orange-600" /> Risk if Unaddressed
                            </p>
                            <div className="space-y-2 text-xs">
                              <div className="flex items-center justify-between p-2 bg-orange-50 rounded">
                                <span className="text-gray-700">Repetition Probability</span>
                                <Badge className="bg-orange-600 text-white">
                                  {financialPredictions[idx].risk_analysis?.repetition_probability}%
                                </Badge>
                              </div>
                              <div className="flex items-center justify-between p-2 bg-red-50 rounded">
                                <span className="text-gray-700">Audit Risk Level</span>
                                <Badge className={getSeverityBadge(financialPredictions[idx].risk_analysis?.audit_risk_level)}>
                                  {financialPredictions[idx].risk_analysis?.audit_risk_level}
                                </Badge>
                              </div>
                              <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                                <p className="font-medium text-yellow-800 mb-1">Compliance Exposure</p>
                                <p className="text-gray-700">{financialPredictions[idx].risk_analysis?.compliance_exposure}</p>
                              </div>
                              <div className="bg-red-50 p-2 rounded border border-red-300">
                                <p className="font-medium text-red-800 mb-1">⚠️ Worst Case Scenario</p>
                                <p className="text-gray-700">{financialPredictions[idx].risk_analysis?.downside_scenario}</p>
                                <p className="text-red-700 font-bold mt-1">
                                  Potential Loss: {formatCurrency(financialPredictions[idx].risk_analysis?.downside_amount)}
                                </p>
                              </div>
                            </div>
                          </div>

                          {/* Prioritization */}
                          <div className="bg-white p-3 rounded-lg border-2 border-indigo-300">
                            <p className="text-xs font-semibold text-gray-700 mb-2">Prioritization Analysis</p>
                            <div className="grid grid-cols-3 gap-2 mb-2 text-center text-xs">
                              <div className="bg-indigo-50 p-2 rounded">
                                <p className="text-indigo-600 mb-1">Financial Urgency</p>
                                <div className="flex items-center justify-center gap-0.5">
                                  {[...Array(10)].map((_, i) => (
                                    <div
                                      key={i}
                                      className={`w-2 h-4 rounded-sm ${
                                        i < financialPredictions[idx].prioritization?.financial_urgency
                                          ? 'bg-indigo-600'
                                          : 'bg-gray-200'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <p className="font-bold text-indigo-800 mt-1">
                                  {financialPredictions[idx].prioritization?.financial_urgency}/10
                                </p>
                              </div>
                              <div className="bg-green-50 p-2 rounded">
                                <p className="text-green-600 mb-1">Ease of Fix</p>
                                <div className="flex items-center justify-center gap-0.5">
                                  {[...Array(10)].map((_, i) => (
                                    <div
                                      key={i}
                                      className={`w-2 h-4 rounded-sm ${
                                        i < financialPredictions[idx].prioritization?.ease_of_correction
                                          ? 'bg-green-600'
                                          : 'bg-gray-200'
                                      }`}
                                    />
                                  ))}
                                </div>
                                <p className="font-bold text-green-800 mt-1">
                                  {financialPredictions[idx].prioritization?.ease_of_correction}/10
                                </p>
                              </div>
                              <div className="bg-purple-50 p-2 rounded">
                                <p className="text-purple-600 mb-1">ROI Potential</p>
                                <p className="text-2xl font-bold text-purple-800 uppercase">
                                  {financialPredictions[idx].prioritization?.roi_potential}
                                </p>
                              </div>
                            </div>
                            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-2 rounded border border-indigo-200">
                              <p className="text-xs text-indigo-700 font-medium mb-1">
                                🎯 Recommended Timeline: <span className="uppercase">{financialPredictions[idx].prioritization?.recommended_timeline}</span>
                              </p>
                              <p className="text-xs text-gray-700">{financialPredictions[idx].prioritization?.justification}</p>
                            </div>
                          </div>

                          {/* Breakeven Analysis */}
                          <div className="bg-white p-3 rounded-lg border border-gray-300">
                          <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                            <Calculator className="w-3 h-3" /> Breakeven Analysis
                            <Badge variant="outline" className="text-xs ml-auto">Agency-Specific</Badge>
                          </p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-gray-50 p-2 rounded">
                              <p className="text-gray-500">Implementation Time</p>
                              <p className="font-medium text-gray-800">
                                {financialPredictions[idx].breakeven?.implementation_time}
                              </p>
                            </div>
                            <div className="bg-gray-50 p-2 rounded">
                              <p className="text-gray-500">Implementation Cost</p>
                              <p className="font-medium text-gray-800">
                                {formatCurrency(financialPredictions[idx].breakeven?.implementation_cost)}
                              </p>
                            </div>
                              <div className="bg-blue-50 p-2 rounded">
                                <p className="text-blue-600">Episodes to Breakeven</p>
                                <p className="font-bold text-blue-800">
                                  {financialPredictions[idx].breakeven?.episodes_to_breakeven} episodes
                                </p>
                              </div>
                              <div className="bg-blue-50 p-2 rounded">
                                <p className="text-blue-600">Time to Breakeven</p>
                                <p className="font-bold text-blue-800">
                                  {financialPredictions[idx].breakeven?.time_to_breakeven}
                                </p>
                              </div>
                            </div>
                            <div className="mt-2 bg-gradient-to-r from-green-50 to-emerald-50 p-2 rounded border border-green-300">
                              <p className="text-xs text-green-700 mb-1">Year 1 Net Benefit</p>
                              <div className="flex items-center justify-between">
                                <p className="text-2xl font-bold text-green-800">
                                  {formatCurrency(financialPredictions[idx].breakeven?.net_benefit_year_1)}
                                </p>
                                <Badge className="bg-green-600 text-white text-lg">
                                  {financialPredictions[idx].breakeven?.roi_percentage}% ROI
                                </Badge>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {financialPredictions[idx]?.error && (
                        <div className="border-t border-red-200 bg-red-50 p-3">
                          <p className="text-xs text-red-800">{financialPredictions[idx].error}</p>
                        </div>
                      )}

                      {/* Resolution Workflow Details */}
                      {resolutionWorkflows[idx] && !resolutionWorkflows[idx].error && (
                        <div className="border-t border-red-200 bg-blue-50 p-4 space-y-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Target className="w-4 h-4 text-blue-600" />
                            <h4 className="font-semibold text-blue-900">Resolution Workflow</h4>
                          </div>

                          {/* Root Cause */}
                          <div className="bg-white p-3 rounded border">
                            <p className="text-xs font-semibold text-gray-700 mb-1">Root Cause Analysis</p>
                            <p className="text-sm text-gray-800">{resolutionWorkflows[idx].root_cause}</p>
                            <p className="text-xs text-orange-700 mt-1 bg-orange-50 p-1.5 rounded">
                              <strong>Impact:</strong> {resolutionWorkflows[idx].severity_explanation}
                            </p>
                          </div>

                          {/* Correction Steps */}
                          {resolutionWorkflows[idx].correction_steps?.length > 0 && (
                            <div className="bg-white p-3 rounded border">
                              <p className="text-xs font-semibold text-gray-700 mb-2">Step-by-Step Correction Process</p>
                              <div className="space-y-2">
                                {resolutionWorkflows[idx].correction_steps.map((step, i) => (
                                  <div key={i} className="flex gap-2">
                                    <div className="bg-blue-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold flex-shrink-0">
                                      {step.step_number}
                                    </div>
                                    <div className="flex-1">
                                      <p className="text-sm font-medium text-gray-800">{step.action}</p>
                                      {step.specific_fields?.length > 0 && (
                                        <p className="text-xs text-gray-600">
                                          Fields: {step.specific_fields.map(f => <span key={f} className="font-mono bg-gray-100 px-1 rounded">{f}</span>)}
                                        </p>
                                      )}
                                      <p className="text-xs text-gray-500 italic">{step.rationale}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Documentation Changes */}
                          {resolutionWorkflows[idx].documentation_changes?.length > 0 && (
                            <div className="bg-white p-3 rounded border">
                              <p className="text-xs font-semibold text-gray-700 mb-2">Clinical Documentation Changes</p>
                              <div className="space-y-2">
                                {resolutionWorkflows[idx].documentation_changes.map((change, i) => (
                                  <div key={i} className="bg-gray-50 p-2 rounded border">
                                    <div className="flex items-center justify-between mb-1">
                                      <span className="text-xs font-mono bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">
                                        {change.item}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 mb-2 text-xs">
                                      <div className="bg-red-50 p-1.5 rounded border border-red-200">
                                        <p className="text-red-600 font-medium mb-0.5">Current</p>
                                        <p className="text-gray-700">{change.current_value || 'Not documented'}</p>
                                      </div>
                                      <div className="bg-green-50 p-1.5 rounded border border-green-200">
                                        <p className="text-green-600 font-medium mb-0.5">Recommended</p>
                                        <p className="text-gray-700">{change.recommended_value}</p>
                                      </div>
                                    </div>
                                    <div className="bg-blue-50 p-2 rounded border border-blue-200 mb-1">
                                      <p className="text-xs text-blue-600 font-medium mb-0.5">📝 Example Narrative:</p>
                                      <p className="text-sm text-blue-900 italic">"{change.example_narrative}"</p>
                                    </div>
                                    <p className="text-xs text-gray-600">
                                      <strong>Clinical Justification:</strong> {change.clinical_justification}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* CMS References */}
                          {resolutionWorkflows[idx].cms_references?.length > 0 && (
                            <div className="bg-white p-3 rounded border">
                              <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                                <BookOpen className="w-3 h-3" /> CMS Guidelines Reference
                              </p>
                              <div className="space-y-2">
                                {resolutionWorkflows[idx].cms_references.map((ref, i) => (
                                  <div key={i} className="bg-gray-50 p-2 rounded border text-xs">
                                    <p className="font-medium text-gray-800">{ref.guideline}</p>
                                    <p className="text-gray-600">Section: {ref.section}</p>
                                    <p className="text-gray-700 italic mt-1 bg-white p-1 rounded">"{ref.quote}"</p>
                                    <p className="text-blue-700 mt-1">
                                      <strong>Application:</strong> {ref.application}
                                    </p>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Validation Checklist */}
                          {resolutionWorkflows[idx].validation_checklist?.length > 0 && (
                            <div className="bg-white p-3 rounded border">
                              <p className="text-xs font-semibold text-gray-700 mb-2 flex items-center gap-1">
                                <CheckCircle2 className="w-3 h-3" /> Post-Correction Validation
                              </p>
                              <ul className="space-y-1">
                                {resolutionWorkflows[idx].validation_checklist.map((item, i) => (
                                  <li key={i} className="text-xs text-gray-700 flex items-start gap-1">
                                    <span className="text-green-600">✓</span> {item}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Summary Info */}
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="bg-white p-2 rounded border">
                              <p className="text-gray-500 mb-0.5">Estimated Time</p>
                              <p className="font-medium text-gray-800">{resolutionWorkflows[idx].estimated_resolution_time}</p>
                            </div>
                            <div className="bg-green-50 p-2 rounded border border-green-200">
                              <p className="text-green-600 mb-0.5">Revenue Impact</p>
                              <p className="font-medium text-green-800">{resolutionWorkflows[idx].revenue_impact_if_resolved}</p>
                            </div>
                          </div>
                        </div>
                      )}

                      {resolutionWorkflows[idx]?.error && (
                        <div className="border-t border-red-200 bg-red-50 p-3">
                          <p className="text-xs text-red-800">{resolutionWorkflows[idx].error}</p>
                        </div>
                      )}
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
                  {navigation.optimization_opportunities.map((opp, idx) => {
                    const oppIndex = `opp_${idx}`;
                    return (
                      <div key={idx} className="bg-white p-3 rounded border border-green-200">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-green-900">{opp.area}</span>
                          <Badge className="bg-green-600 text-white">{opp.potential_impact}</Badge>
                        </div>
                        <p className="text-xs text-gray-600 mb-1">Current: {opp.current_state}</p>
                        <p className="text-sm text-green-800 mb-1">{opp.opportunity}</p>
                        <div className="bg-blue-50 p-2 rounded text-xs mb-2">
                          <strong>Action:</strong> {opp.action_required}
                        </div>
                        {opp.clinical_justification_needed && (
                          <p className="text-xs text-gray-500 mb-2 italic">
                            Requires: {opp.clinical_justification_needed}
                          </p>
                        )}
                        
                        <Button
                          onClick={() => getFinancialPrediction(opp, oppIndex, 'opportunity')}
                          disabled={loadingPrediction === oppIndex}
                          size="sm"
                          variant="outline"
                          className="w-full border-green-300 hover:bg-green-50"
                        >
                          {loadingPrediction === oppIndex ? (
                            <><Loader2 className="w-3 h-3 mr-2 animate-spin" /> Calculating...</>
                          ) : financialPredictions[oppIndex] ? (
                            <><DollarSign className="w-3 h-3 mr-2" /> View Financial Impact</>
                          ) : (
                            <><DollarSign className="w-3 h-3 mr-2" /> Predict Financial Impact</>
                          )}
                        </Button>

                        {/* Financial Prediction for Opportunity */}
                        {financialPredictions[oppIndex] && !financialPredictions[oppIndex].error && (
                          <div className="mt-3 bg-gradient-to-r from-green-50 to-emerald-50 p-3 rounded border-2 border-green-300 space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xl">{financialPredictions[oppIndex].visual_summary?.icon}</span>
                              <Badge className={getPriorityColor(financialPredictions[oppIndex].prioritization?.priority_rank || 'medium')}>
                                {financialPredictions[oppIndex].prioritization?.priority_rank?.toUpperCase()}
                              </Badge>
                            </div>
                            <p className="text-xs font-semibold text-green-800">
                              {financialPredictions[oppIndex].visual_summary?.tagline}
                            </p>
                            
                            <div className="bg-white p-2 rounded text-center">
                              <p className="text-xs text-gray-500">Annual Opportunity</p>
                              <p className="text-2xl font-bold text-green-700">
                                {formatCurrency(financialPredictions[oppIndex].annual_projection?.total_opportunity)}
                              </p>
                              <p className="text-xs text-green-600">
                                +{formatCurrency(financialPredictions[oppIndex].per_episode?.gain_per_episode)} per episode
                              </p>
                            </div>

                            <div className="grid grid-cols-2 gap-2 text-xs">
                              <div className="bg-indigo-50 p-2 rounded text-center">
                                <p className="text-indigo-600">Priority</p>
                                <p className="font-bold text-indigo-800 uppercase">
                                  {financialPredictions[oppIndex].prioritization?.recommended_timeline}
                                </p>
                              </div>
                              <div className="bg-purple-50 p-2 rounded text-center">
                                <p className="text-purple-600">ROI</p>
                                <p className="font-bold text-purple-800">
                                  {financialPredictions[oppIndex].breakeven?.roi_percentage}%
                                </p>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
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
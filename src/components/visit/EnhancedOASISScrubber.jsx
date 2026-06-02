import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  FileCheck,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  Plus,
  Target
} from "lucide-react";

export default function EnhancedOASISScrubber({ 
  patient, 
  visit,
  narrativeText, 
  vitalSigns,
  onAddSuggestion 
}) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [_expandedSections, setExpandedSections] = useState({});

  // Only show for home health patients
  if (patient?.care_type !== 'home_health') {
    return null;
  }

  const analyzeOASIS = async () => {
    setIsAnalyzing(true);
    setShowDialog(true);

    try {
      const prompt = `You are a CMS-certified OASIS-E expert and PDGM reimbursement specialist with deep knowledge of 2024 Medicare home health regulations. Analyze this documentation using EXACT OASIS-E item response options.

PATIENT DATA:
- Primary Dx: ${patient.primary_diagnosis || 'Not specified'}
- Secondary Dx: ${patient.secondary_diagnoses?.join(', ') || 'None'}
- Visit Type: ${visit.visit_type.replace(/_/g, ' ')}

DOCUMENTATION:
${narrativeText || '[No documentation]'}

VITALS:
${Object.keys(vitalSigns).length > 0 ? Object.entries(vitalSigns).map(([key, value]) => `${key}: ${value}`).join('\n') : 'None'}

---

CRITICAL OASIS-E RESPONSE SCALES (use EXACT values):

**M1800 Grooming**: 0=Independent, 1=With setup/supplies, 2=Someone assists, 3=Dependent
**M1810 Dress Upper**: 0=Independent, 1=With setup, 2=Someone assists, 3=Dependent  
**M1820 Dress Lower**: 0=Independent, 1=With setup, 2=Someone assists, 3=Dependent
**M1830 Bathing**: 0=Independent, 1=With setup, 2=Minimal assist, 3=Moderate assist, 4=Max assist, 5=Unable, 6=Not performed
**M1840 Toilet Transfer**: 0=Independent, 1=With setup, 2=Moderate assist, 3=Unable, 4=Not ambulatory
**M1850 Transferring**: 0=Independent, 1=With setup, 2=Minimal assist, 3=Moderate assist, 4=Max assist, 5=Dependent
**M1860 Ambulation**: 0=Independent, 1=With device, 2=Verbal cue, 3=Minimal assist, 4=Max assist, 5=Wheelchair, 6=Bedbound

**PDGM CLINICAL GROUPING** - Match diagnosis to:
- MMTA-Surgical Aftercare (joint replacements, post-op)
- MMTA-Cardiac/Circulatory (CHF, HTN, AFib)
- MMTA-Endocrine (Diabetes, Thyroid)
- MMTA-GI/GU (Bowel/bladder issues)
- MMTA-Infectious (UTI, Cellulitis, Sepsis)
- MMTA-Respiratory (COPD, Pneumonia)
- MMTA-Neuro/Rehab (Stroke, Parkinson's)
- MMTA-Wounds (Pressure ulcers, surgical wounds)
- MMTA-Complex Nursing (IV, Trach, Ostomy)
- MMTA-Behavioral (Depression, Anxiety)
- MMTA-Medication Mgmt

**FUNCTIONAL LEVEL THRESHOLDS**:
- LOW: Total functional points 0-9
- MEDIUM: Total functional points 10-17
- HIGH: Total functional points 18+

Analyze for:
1. OASIS responses using EXACT scale values above
2. Functional score optimization (higher = more reimbursement)
3. Comorbidity capture for case-mix adjustment
4. Documentation gaps affecting PDGM grouping

Return JSON:

{
  "overall_oasis_readiness": "excellent" | "good" | "needs_work" | "insufficient",
  "estimated_case_mix_impact": {
    "current_likely_score": "number estimate",
    "potential_optimized_score": "number estimate",
    "reimbursement_impact": "Brief explanation of $ impact"
  },
  "oasis_item_suggestions": [
    {
      "item_number": "M1800",
      "item_name": "Grooming",
      "suggested_response": "0 - Able to groom self" | "1 - With difficulty" | etc,
      "confidence": "high" | "medium" | "low",
      "supporting_evidence": "Quote from narrative that supports this",
      "documentation_needed": "What to add if evidence is weak or missing",
      "reimbursement_impact": "none" | "minor" | "moderate" | "significant",
      "narrative_snippet": "Specific text nurse can add to support this OASIS answer"
    }
  ],
  "reimbursement_opportunities": [
    {
      "area": "e.g., ADL Assistance",
      "current_documentation": "What's currently documented",
      "opportunity": "What could be captured for higher acuity",
      "oasis_items_affected": ["M1800", "M1810", etc],
      "action_required": "What nurse needs to document or clarify",
      "suggested_text": "Specific narrative to add",
      "estimated_impact": "Description of reimbursement impact"
    }
  ],
  "documentation_gaps": [
    {
      "gap_type": "Missing assessment" | "Unclear description" | "Incomplete data",
      "oasis_impact": "Which OASIS items are affected",
      "severity": "critical" | "important" | "minor",
      "description": "What's missing",
      "suggested_text": "What to add to narrative"
    }
  ],
  "consistency_checks": [
    {
      "issue": "Description of inconsistency between narrative and likely OASIS answer",
      "narrative_states": "Quote from narrative",
      "suggested_oasis": "OASIS response based on narrative",
      "resolution": "Either adjust OASIS or enhance narrative - which?"
    }
  ],
  "strengths": [
    {
      "area": "What's well documented",
      "benefit": "How this supports good OASIS and reimbursement"
    }
  ],
  "priority_actions": [
    "Top 3-5 most important actions to optimize OASIS and reimbursement"
  ]
}

Be specific about OASIS item numbers and response options. Provide ready-to-use narrative text. Focus on legitimate clinical documentation that accurately reflects patient condition while maximizing appropriate reimbursement.`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_oasis_readiness: { type: "string" },
            estimated_case_mix_impact: {
              type: "object",
              properties: {
                current_likely_score: { type: "string" },
                potential_optimized_score: { type: "string" },
                reimbursement_impact: { type: "string" }
              }
            },
            oasis_item_suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  item_number: { type: "string" },
                  item_name: { type: "string" },
                  suggested_response: { type: "string" },
                  confidence: { type: "string" },
                  supporting_evidence: { type: "string" },
                  documentation_needed: { type: "string" },
                  reimbursement_impact: { type: "string" },
                  narrative_snippet: { type: "string" }
                }
              }
            },
            reimbursement_opportunities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  area: { type: "string" },
                  current_documentation: { type: "string" },
                  opportunity: { type: "string" },
                  oasis_items_affected: { type: "array", items: { type: "string" } },
                  action_required: { type: "string" },
                  suggested_text: { type: "string" },
                  estimated_impact: { type: "string" }
                }
              }
            },
            documentation_gaps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  gap_type: { type: "string" },
                  oasis_impact: { type: "string" },
                  severity: { type: "string" },
                  description: { type: "string" },
                  suggested_text: { type: "string" }
                }
              }
            },
            consistency_checks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  issue: { type: "string" },
                  narrative_states: { type: "string" },
                  suggested_oasis: { type: "string" },
                  resolution: { type: "string" }
                }
              }
            },
            strengths: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  area: { type: "string" },
                  benefit: { type: "string" }
                }
              }
            },
            priority_actions: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setAnalysis(result);
    } catch (error) {
      console.error("Enhanced OASIS analysis error:", error);
      setAnalysis({
        error: "Failed to analyze OASIS data. Please try again."
      });
    }

    setIsAnalyzing(false);
  };

  const _toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const getReadinessColor = (readiness) => {
    switch (readiness) {
      case 'excellent': return 'text-green-700 bg-green-50 border-green-300';
      case 'good': return 'text-blue-700 bg-blue-50 border-blue-300';
      case 'needs_work': return 'text-orange-700 bg-orange-50 border-orange-300';
      case 'insufficient': return 'text-red-700 bg-red-50 border-red-300';
      default: return 'text-slate-700 bg-slate-50 border-slate-300';
    }
  };

  const getImpactColor = (impact) => {
    switch (impact) {
      case 'significant': return 'bg-red-500';
      case 'moderate': return 'bg-orange-500';
      case 'minor': return 'bg-yellow-500';
      case 'none': return 'bg-slate-400';
      default: return 'bg-blue-500';
    }
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-500';
      case 'important': return 'bg-orange-500';
      case 'minor': return 'bg-yellow-500';
      default: return 'bg-slate-400';
    }
  };

  return (
    <>
      <Card className="border-purple-200 shadow-md">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-800">
            <Sparkles className="w-5 h-5" />
            Enhanced OASIS Scrubber
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Alert className="bg-purple-50 border-purple-200">
            <FileCheck className="w-4 h-4 text-purple-600" />
            <AlertDescription className="text-purple-900 text-sm">
              <p className="font-semibold mb-1">🎯 PDGM Optimization Tool</p>
              <p>Analyzes your documentation to suggest optimal OASIS responses and maximize appropriate reimbursement.</p>
            </AlertDescription>
          </Alert>

          <Button 
            onClick={analyzeOASIS}
            disabled={isAnalyzing || !narrativeText}
            className="w-full bg-purple-600 hover:bg-purple-700"
          >
            {isAnalyzing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Analyzing OASIS...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Analyze OASIS & Reimbursement
              </>
            )}
          </Button>

          {!narrativeText && (
            <p className="text-xs text-slate-500 text-center">
              Add documentation to enable OASIS analysis
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl">
              <Sparkles className="w-6 h-6 text-purple-600" />
              Enhanced OASIS Analysis & PDGM Optimization
            </DialogTitle>
            <DialogDescription>
              Intelligent OASIS guidance based on your clinical documentation
            </DialogDescription>
          </DialogHeader>

          {analysis?.error ? (
            <Alert className="border-red-300 bg-red-50">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              <AlertDescription className="text-red-900">
                {analysis.error}
              </AlertDescription>
            </Alert>
          ) : analysis ? (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-5">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="oasis">OASIS Items</TabsTrigger>
                <TabsTrigger value="opportunities">💰 Revenue</TabsTrigger>
                <TabsTrigger value="gaps">Gaps</TabsTrigger>
                <TabsTrigger value="actions">Actions</TabsTrigger>
              </TabsList>

              {/* Overview Tab */}
              <TabsContent value="overview" className="space-y-4">
                {/* Overall Readiness */}
                <Alert className={`border-2 ${getReadinessColor(analysis.overall_oasis_readiness)}`}>
                  <FileCheck className="w-5 h-5" />
                  <AlertDescription>
                    <p className="font-semibold text-lg mb-1">
                      OASIS Readiness: {analysis.overall_oasis_readiness?.toUpperCase()}
                    </p>
                  </AlertDescription>
                </Alert>

                {/* Case Mix Impact */}
                {analysis.estimated_case_mix_impact && (
                  <Card className="border-green-200 bg-green-50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-green-800">
                        <DollarSign className="w-5 h-5" />
                        Estimated PDGM Impact
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-slate-600">Current Likely Score</p>
                          <p className="text-2xl font-bold text-slate-900">
                            {analysis.estimated_case_mix_impact.current_likely_score}
                          </p>
                        </div>
                        <div>
                          <p className="text-sm text-slate-600">Potential Optimized</p>
                          <p className="text-2xl font-bold text-green-700">
                            {analysis.estimated_case_mix_impact.potential_optimized_score}
                          </p>
                        </div>
                      </div>
                      <Alert className="bg-white border-green-300">
                        <TrendingUp className="w-4 h-4 text-green-600" />
                        <AlertDescription className="text-sm text-slate-900">
                          {analysis.estimated_case_mix_impact.reimbursement_impact}
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>
                )}

                {/* Strengths */}
                {analysis.strengths && analysis.strengths.length > 0 && (
                  <Card className="border-blue-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-blue-800">
                        <CheckCircle2 className="w-5 h-5" />
                        Documentation Strengths
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {analysis.strengths.map((strength, idx) => (
                        <div key={idx} className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="font-semibold text-blue-900">{strength.area}</p>
                          <p className="text-sm text-slate-700 mt-1">{strength.benefit}</p>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}

                {/* Consistency Checks */}
                {analysis.consistency_checks && analysis.consistency_checks.length > 0 && (
                  <Card className="border-yellow-200">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-yellow-800">
                        <AlertTriangle className="w-5 h-5" />
                        Consistency Checks
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {analysis.consistency_checks.map((check, idx) => (
                        <div key={idx} className="p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                          <p className="font-semibold text-yellow-900 mb-2">{check.issue}</p>
                          <div className="space-y-2 text-sm">
                            <div>
                              <p className="text-slate-600">Narrative states:</p>
                              <p className="text-slate-900 italic">"{check.narrative_states}"</p>
                            </div>
                            <div>
                              <p className="text-slate-600">Suggested OASIS:</p>
                              <p className="text-slate-900 font-medium">{check.suggested_oasis}</p>
                            </div>
                            <Alert className="bg-white border-yellow-300">
                              <AlertDescription className="text-xs text-slate-700">
                                <strong>Resolution:</strong> {check.resolution}
                              </AlertDescription>
                            </Alert>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </TabsContent>

              {/* OASIS Items Tab */}
              <TabsContent value="oasis" className="space-y-3">
                {analysis.oasis_item_suggestions && analysis.oasis_item_suggestions.length > 0 ? (
                  analysis.oasis_item_suggestions.map((item, idx) => (
                    <Card key={idx} className="border-purple-200">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <div className="flex items-center gap-2 mb-1">
                              <Badge variant="outline" className="font-mono">
                                {item.item_number}
                              </Badge>
                              <h4 className="font-semibold text-slate-900">{item.item_name}</h4>
                            </div>
                            <Badge className={getImpactColor(item.reimbursement_impact)}>
                              {item.reimbursement_impact} impact
                            </Badge>
                          </div>
                          <Badge className={
                            item.confidence === 'high' ? 'bg-green-500' :
                            item.confidence === 'medium' ? 'bg-yellow-500' : 'bg-slate-500'
                          }>
                            {item.confidence} confidence
                          </Badge>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div className="p-2 bg-blue-50 rounded border border-blue-200">
                            <p className="text-slate-600 text-xs mb-1">Suggested Response:</p>
                            <p className="font-semibold text-blue-900">{item.suggested_response}</p>
                          </div>

                          {item.supporting_evidence && (
                            <div className="p-2 bg-green-50 rounded border border-green-200">
                              <p className="text-slate-600 text-xs mb-1">Supporting Evidence:</p>
                              <p className="text-slate-900 italic">"{item.supporting_evidence}"</p>
                            </div>
                          )}

                          {item.documentation_needed && (
                            <div className="p-2 bg-orange-50 rounded border border-orange-200">
                              <p className="text-slate-600 text-xs mb-1">Documentation Needed:</p>
                              <p className="text-slate-900">{item.documentation_needed}</p>
                            </div>
                          )}

                          {item.narrative_snippet && (
                            <div className="p-2 bg-purple-50 rounded border border-purple-200">
                              <div className="flex items-start justify-between mb-1">
                                <p className="text-slate-600 text-xs">Suggested Narrative Text:</p>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => {
                                    onAddSuggestion(item.narrative_snippet);
                                    setShowDialog(false);
                                  }}
                                  className="h-6 px-2 text-purple-700 hover:text-purple-900 hover:bg-purple-100"
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Add to Note
                                </Button>
                              </div>
                              <p className="text-slate-900">{item.narrative_snippet}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Alert>
                    <AlertDescription>No specific OASIS item suggestions at this time.</AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              {/* Reimbursement Opportunities Tab */}
              <TabsContent value="opportunities" className="space-y-3">
                {analysis.reimbursement_opportunities && analysis.reimbursement_opportunities.length > 0 ? (
                  analysis.reimbursement_opportunities.map((opp, idx) => (
                    <Card key={idx} className="border-green-200 bg-green-50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-3">
                          <h4 className="font-bold text-green-900 text-lg flex items-center gap-2">
                            <DollarSign className="w-5 h-5" />
                            {opp.area}
                          </h4>
                        </div>

                        <div className="space-y-3 text-sm">
                          <div>
                            <p className="text-slate-600 font-medium mb-1">Current Documentation:</p>
                            <p className="text-slate-900 p-2 bg-white rounded border">{opp.current_documentation}</p>
                          </div>

                          <div>
                            <p className="text-green-700 font-medium mb-1">💡 Opportunity:</p>
                            <p className="text-slate-900 p-2 bg-white rounded border border-green-300">{opp.opportunity}</p>
                          </div>

                          <div>
                            <p className="text-slate-600 font-medium mb-1">OASIS Items Affected:</p>
                            <div className="flex flex-wrap gap-1">
                              {opp.oasis_items_affected.map((item, i) => (
                                <Badge key={i} variant="outline" className="font-mono">
                                  {item}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <Alert className="bg-blue-50 border-blue-300">
                            <TrendingUp className="w-4 h-4 text-blue-600" />
                            <AlertDescription className="text-blue-900 text-xs">
                              <strong>Estimated Impact:</strong> {opp.estimated_impact}
                            </AlertDescription>
                          </Alert>

                          <div>
                            <p className="text-slate-600 font-medium mb-1">Action Required:</p>
                            <p className="text-slate-900 p-2 bg-orange-50 rounded border border-orange-200">{opp.action_required}</p>
                          </div>

                          {opp.suggested_text && (
                            <div className="p-3 bg-white rounded border-2 border-green-400">
                              <div className="flex items-start justify-between mb-2">
                                <p className="text-slate-700 font-semibold text-xs">✨ Suggested Text to Add:</p>
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    onAddSuggestion(opp.suggested_text);
                                    setShowDialog(false);
                                  }}
                                  className="h-7 px-3 bg-green-600 hover:bg-green-700"
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Add to Note
                                </Button>
                              </div>
                              <p className="text-slate-900">{opp.suggested_text}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Alert className="bg-green-50 border-green-300">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <AlertDescription className="text-green-900">
                      No immediate reimbursement optimization opportunities identified. Your documentation appears to capture the patient's acuity appropriately.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              {/* Documentation Gaps Tab */}
              <TabsContent value="gaps" className="space-y-3">
                {analysis.documentation_gaps && analysis.documentation_gaps.length > 0 ? (
                  analysis.documentation_gaps.map((gap, idx) => (
                    <Card key={idx} className={`border-2 ${
                      gap.severity === 'critical' ? 'border-red-300 bg-red-50' :
                      gap.severity === 'important' ? 'border-orange-300 bg-orange-50' :
                      'border-yellow-300 bg-yellow-50'
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge className={getSeverityColor(gap.severity)}>
                              {gap.severity}
                            </Badge>
                            <h4 className="font-semibold text-slate-900">{gap.gap_type}</h4>
                          </div>
                        </div>

                        <div className="space-y-2 text-sm">
                          <div>
                            <p className="text-slate-600 mb-1">OASIS Impact:</p>
                            <p className="text-slate-900 font-medium">{gap.oasis_impact}</p>
                          </div>

                          <div>
                            <p className="text-slate-600 mb-1">Description:</p>
                            <p className="text-slate-900">{gap.description}</p>
                          </div>

                          {gap.suggested_text && (
                            <div className="p-3 bg-white rounded border-2 border-slate-300">
                              <div className="flex items-start justify-between mb-2">
                                <p className="text-slate-700 font-semibold text-xs">Suggested Text to Add:</p>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    onAddSuggestion(gap.suggested_text);
                                    setShowDialog(false);
                                  }}
                                  className="h-7 px-3"
                                >
                                  <Plus className="w-3 h-3 mr-1" />
                                  Add to Note
                                </Button>
                              </div>
                              <p className="text-slate-900">{gap.suggested_text}</p>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))
                ) : (
                  <Alert className="bg-green-50 border-green-300">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <AlertDescription className="text-green-900">
                      No critical documentation gaps identified. Your note appears comprehensive for OASIS assessment.
                    </AlertDescription>
                  </Alert>
                )}
              </TabsContent>

              {/* Priority Actions Tab */}
              <TabsContent value="actions" className="space-y-3">
                <Alert className="bg-blue-50 border-blue-300">
                  <Target className="w-5 h-5 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    <p className="font-semibold mb-2">Top Priority Actions</p>
                    <p className="text-sm">Focus on these items to optimize your OASIS assessment and documentation.</p>
                  </AlertDescription>
                </Alert>

                {analysis.priority_actions && analysis.priority_actions.length > 0 ? (
                  <div className="space-y-2">
                    {analysis.priority_actions.map((action, idx) => (
                      <Card key={idx} className="border-blue-200">
                        <CardContent className="p-4">
                          <div className="flex items-start gap-3">
                            <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center font-bold">
                              {idx + 1}
                            </div>
                            <p className="text-slate-900 flex-1">{action}</p>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : (
                  <Alert>
                    <AlertDescription>No priority actions at this time.</AlertDescription>
                  </Alert>
                )}
              </TabsContent>
            </Tabs>
          ) : (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600" />
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
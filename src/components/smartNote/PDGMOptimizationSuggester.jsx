import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DollarSign, TrendingUp, Plus, CheckCircle2, Sparkles, ChevronDown, ChevronUp } from "lucide-react";

export default function PDGMOptimizationSuggester({ 
  roughNote,
  enhancedNote,
  patientData,
  diagnosis,
  visitType,
  onApplySuggestion,
  onApplyAll,
  autoAnalyze = false
}) {
  const [analyzing, setAnalyzing] = useState(false);
  const [optimization, setOptimization] = useState(null);
  const [appliedItems, setAppliedItems] = useState(new Set());
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (autoAnalyze && (roughNote?.length >= 100 || enhancedNote) && !analyzing) {
      const timer = setTimeout(() => analyzePDGM(), 1500);
      return () => clearTimeout(timer);
    }
  }, [roughNote, enhancedNote, autoAnalyze]);

  const analyzePDGM = async () => {
    const noteContent = enhancedNote || roughNote;
    if (!noteContent || !patientData) return;

    setAnalyzing(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a PDGM optimization specialist. Analyze this note for revenue optimization opportunities.

CLINICAL NOTE:
${noteContent}

PATIENT DATA:
- Primary Diagnosis: ${diagnosis || patientData.primary_diagnosis}
- Secondary Diagnoses: ${patientData.secondary_diagnoses?.join(', ') || 'None'}
- Medications: ${patientData.current_medications?.map(m => m.name).join(', ') || 'None'}
- Age: ${patientData.date_of_birth ? Math.floor((new Date() - new Date(patientData.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000)) : 'Unknown'}

Identify PDGM optimization opportunities:

1. COMORBIDITY DOCUMENTATION:
   - Medications suggest diagnoses not documented (e.g., statin = hyperlipidemia)
   - Clinical findings implying additional diagnoses
   - Comorbidities that increase case-mix weight

2. FUNCTIONAL IMPAIRMENT:
   - ADL/IADL limitations to document for higher functional score
   - Specific assistance needs not yet documented

3. CLINICAL GROUPING:
   - Documentation to support optimal clinical group assignment
   - Higher-value groups patient may qualify for

For each opportunity, provide:
- Category (comorbidity/functional/clinical_group)
- Finding (what you noticed)
- Suggested documentation text to add
- Estimated revenue impact ($)
- Priority (high/medium/low)
- Is actionable now (true/false)

Return JSON.`,
        response_json_schema: {
          type: "object",
          properties: {
            current_case_mix_estimate: { type: "number" },
            optimized_case_mix_potential: { type: "number" },
            total_revenue_opportunity: { type: "number" },
            opportunities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  category: { type: "string" },
                  finding: { type: "string" },
                  suggested_documentation: { type: "string" },
                  revenue_impact: { type: "number" },
                  priority: { type: "string" },
                  actionable_now: { type: "boolean" },
                  evidence: { type: "string" }
                }
              }
            },
            summary: { type: "string" }
          }
        }
      });

      setOptimization(result);
    } catch (error) {
      console.error('PDGM analysis error:', error);
    }
    setAnalyzing(false);
  };

  const handleApplyItem = (opportunity, index) => {
    onApplySuggestion(opportunity.suggested_documentation, opportunity.category);
    setAppliedItems(prev => new Set([...prev, index]));
  };

  const handleAcceptAll = () => {
    if (!optimization?.opportunities) return;

    const actionableItems = optimization.opportunities
      .filter((opp, idx) => opp.actionable_now && !appliedItems.has(idx));

    const allText = actionableItems
      .map(opp => opp.suggested_documentation)
      .join('\n\n');

    onApplyAll?.(allText);
    
    const newApplied = new Set(appliedItems);
    optimization.opportunities.forEach((opp, idx) => {
      if (opp.actionable_now) newApplied.add(idx);
    });
    setAppliedItems(newApplied);
  };

  const pendingActionable = optimization?.opportunities?.filter((opp, idx) => 
    opp.actionable_now && !appliedItems.has(idx)
  ) || [];

  return (
    <Card className="border-2 border-green-300 bg-gradient-to-r from-green-50 to-emerald-50">
      <CardHeader className="pb-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-600" />
            PDGM Revenue Optimization
            {optimization && (
              <Badge className="bg-green-600 ml-2">
                +${optimization.total_revenue_opportunity || 0}
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            {pendingActionable.length > 0 && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  handleAcceptAll();
                }}
                className="bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-1" />
                Accept All ({pendingActionable.length})
              </Button>
            )}
            {!analyzing && !optimization && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  analyzePDGM();
                }}
              >
                <Sparkles className="w-4 h-4 mr-1" />
                Analyze
              </Button>
            )}
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </div>
        </div>
      </CardHeader>

      {expanded && (
        <CardContent className="space-y-4">
          {analyzing && (
            <div className="text-center py-6">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600 mx-auto mb-2" />
              <p className="text-sm text-gray-600">Analyzing PDGM opportunities...</p>
            </div>
          )}

          {optimization && (
            <>
              {/* Summary */}
              <Alert className="bg-blue-50 border-blue-200">
                <TrendingUp className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-sm text-blue-900">
                  {optimization.summary}
                </AlertDescription>
              </Alert>

              {/* Revenue Impact Overview */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border border-green-200 rounded-lg p-3 text-center">
                  <p className="text-xs text-gray-600 mb-1">Current Estimate</p>
                  <p className="text-lg font-bold text-gray-900">
                    {optimization.current_case_mix_estimate?.toFixed(2) || 'N/A'}
                  </p>
                </div>
                <div className="bg-green-100 border border-green-300 rounded-lg p-3 text-center">
                  <p className="text-xs text-green-700 mb-1">Optimized Potential</p>
                  <p className="text-lg font-bold text-green-900">
                    {optimization.optimized_case_mix_potential?.toFixed(2) || 'N/A'}
                  </p>
                </div>
              </div>

              {/* Opportunities */}
              {optimization.opportunities?.length > 0 && (
                <div className="space-y-2">
                  {optimization.opportunities.map((opp, idx) => {
                    const isApplied = appliedItems.has(idx);
                    return (
                      <Card key={idx} className={`border-l-4 ${
                        isApplied ? 'border-l-green-500 bg-green-50 opacity-60' :
                        opp.priority === 'high' ? 'border-l-red-500' :
                        opp.priority === 'medium' ? 'border-l-yellow-500' : 'border-l-blue-500'
                      }`}>
                        <CardContent className="p-3">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge className={`text-xs ${
                                  opp.priority === 'high' ? 'bg-red-600' :
                                  opp.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-600'
                                }`}>
                                  {opp.priority}
                                </Badge>
                                <span className="text-xs font-semibold text-gray-900">{opp.category}</span>
                                {opp.revenue_impact > 0 && (
                                  <Badge className="bg-green-600 text-xs">
                                    +${opp.revenue_impact}
                                  </Badge>
                                )}
                              </div>
                              <p className="text-xs text-gray-700 mb-2">{opp.finding}</p>
                            </div>
                            {opp.actionable_now && !isApplied && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleApplyItem(opp, idx)}
                                className="flex-shrink-0 h-7"
                              >
                                <Plus className="w-3 h-3 mr-1" />
                                Add
                              </Button>
                            )}
                            {isApplied && (
                              <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                            )}
                          </div>

                          <div className="bg-green-50 border border-green-200 rounded p-2">
                            <p className="text-xs text-green-900 font-mono">
                              {opp.suggested_documentation}
                            </p>
                          </div>

                          {opp.evidence && (
                            <p className="text-xs text-gray-600 italic mt-2">
                              Evidence: {opp.evidence}
                            </p>
                          )}

                          {!opp.actionable_now && (
                            <p className="text-xs text-orange-600 mt-2">
                              ⚠️ May require additional clinical assessment
                            </p>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}

              {optimization.opportunities?.length === 0 && (
                <Alert className="bg-green-50 border-green-300">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-sm text-green-900">
                    Your documentation is well-optimized for PDGM case-mix!
                  </AlertDescription>
                </Alert>
              )}
            </>
          )}
        </CardContent>
      )}
    </Card>
  );
}
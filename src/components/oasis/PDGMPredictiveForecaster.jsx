import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  TrendingUp,
  DollarSign,
  Loader2,
  Target,
  BarChart3,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  LineChart
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function PDGMPredictiveForecaster({ pdgmData, analysisResults, currentPayment, triggeredPathways }) {
  const [isPredicting, setIsPredicting] = useState(false);
  const [predictions, setPredictions] = useState(null);
  const [hasAutoPredicted, setHasAutoPredicted] = useState(false);

  const { data: agencySettings } = useQuery({
    queryKey: ['agencySettings'],
    queryFn: async () => {
      const result = await base44.entities.AgencySettings.list();
      return result[0] || null;
    }
  });

  useEffect(() => {
    if (pdgmData && analysisResults && !predictions && !isPredicting && !hasAutoPredicted) {
      generatePredictions();
      setHasAutoPredicted(true);
    }
  }, [pdgmData, analysisResults]);

  const generatePredictions = async () => {
    if (!pdgmData || !analysisResults) return;

    setIsPredicting(true);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a PDGM financial forecasting expert. Generate predictive reimbursement scenarios based on potential documentation improvements.

CURRENT OASIS DATA:
${JSON.stringify({
  primary_diagnosis: pdgmData.primary_diagnosis,
  primary_diagnosis_code: pdgmData.primary_diagnosis_code,
  comorbidities: pdgmData.comorbidities,
  functional_scores: pdgmData.functional_scores,
  admission_source: pdgmData.admission_source,
  episode_timing: pdgmData.episode_timing,
  clinical_items: pdgmData.clinical_items
}, null, 2)}

CURRENT PAYMENT: $${currentPayment || 'Not yet calculated'}

ANALYSIS FINDINGS:
- Accuracy Issues: ${analysisResults.accuracy_issues?.length || 0}
- Revenue Tips: ${analysisResults.revenue_tips?.length || 0}
- Rescore Opportunities: ${analysisResults.specific_rescore_opportunities?.length || 0}
- Quick Wins: ${analysisResults.quick_wins?.length || 0}

TRIGGERED CLINICAL PATHWAYS:
${triggeredPathways?.map(p => `- ${p.pathway_name}: ${p.rescore_opportunities?.length || 0} rescore opps, ${p.documentation_prompts?.length || 0} doc prompts`).join('\n') || 'None'}

AGENCY SETTINGS:
- Average Episodes/Year: ${agencySettings?.avg_episodes_per_year || 50}
- Wage Index: ${agencySettings?.wage_index || 1.0}

Generate 5 predictive scenarios showing financial impact of improvements:

1. BASELINE (Current State)
   - Keep current documentation as-is
   - Current payment estimate

2. QUICK WINS ONLY (Fastest ROI)
   - Apply only the easy, low-effort improvements
   - 1-2 week implementation time
   - What changes: specific M-items or documentation
   - Payment impact

3. PATHWAY OPTIMIZATION (Moderate Effort)
   - Apply clinical pathway recommendations
   - Address key functional and comorbidity gaps
   - 1-2 month implementation
   - Payment impact

4. COMPREHENSIVE CORRECTION (Full Optimization)
   - Apply ALL identified improvements
   - Address all accuracy issues, revenue tips, rescores
   - 2-3 month full implementation
   - Maximum payment potential

5. BEST CASE SCENARIO (Clinical Excellence)
   - Optimal documentation for this diagnosis
   - Industry best practices applied
   - Maximum allowable PDGM payment for this case
   - Aspirational target

For each scenario, provide:
- Specific changes made (which M-items, diagnosis additions, etc.)
- Projected PDGM payment
- Implementation timeline
- Implementation effort (low/medium/high)
- ROI timeline
- Annual revenue impact (based on similar episodes)
- Probability of achieving (realistic %)

Also provide:
- Financial trajectory over 12 months
- Breakeven analysis for each scenario
- Risk-adjusted recommendations

Return JSON:
{
  "scenarios": [
    {
      "name": "scenario name",
      "description": "what this represents",
      "changes": [{"item": "what changes", "from": "current", "to": "new"}],
      "projected_payment": 0,
      "payment_increase": 0,
      "percentage_increase": 0,
      "implementation_timeline": "timeframe",
      "implementation_effort": "low/medium/high",
      "effort_hours": 0,
      "roi_timeline": "when breaks even",
      "annual_impact": 0,
      "probability": 0,
      "key_actions": ["specific actions needed"]
    }
  ],
  "financial_trajectory": {
    "month_1": {"conservative": 0, "realistic": 0, "optimistic": 0},
    "month_3": {"conservative": 0, "realistic": 0, "optimistic": 0},
    "month_6": {"conservative": 0, "realistic": 0, "optimistic": 0},
    "month_12": {"conservative": 0, "realistic": 0, "optimistic": 0}
  },
  "breakeven_analysis": {
    "quick_wins": {"cost": 0, "episodes_to_breakeven": 0, "time_to_breakeven": ""},
    "pathway_optimization": {"cost": 0, "episodes_to_breakeven": 0, "time_to_breakeven": ""},
    "comprehensive": {"cost": 0, "episodes_to_breakeven": 0, "time_to_breakeven": ""}
  },
  "recommendations": {
    "immediate_focus": "what to do right now",
    "30_day_goals": "what to achieve in 30 days",
    "90_day_goals": "what to achieve in 90 days",
    "success_metrics": ["how to measure success"]
  }
}`,
        response_json_schema: {
          type: "object",
          properties: {
            scenarios: { type: "array", items: { type: "object" } },
            financial_trajectory: { type: "object" },
            breakeven_analysis: { type: "object" },
            recommendations: { type: "object" }
          }
        }
      });

      setPredictions(result);
    } catch (err) {
      console.error("Prediction error:", err);
    }

    setIsPredicting(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount || 0);
  };

  const getEffortColor = (effort) => {
    switch (effort) {
      case 'low': return 'bg-green-100 text-green-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const chartData = predictions?.scenarios?.map(s => ({
    name: s.name.split(' ')[0],
    Payment: s.projected_payment,
    Increase: s.payment_increase
  })) || [];

  const trajectoryData = predictions?.financial_trajectory ? [
    { month: 'Month 1', Conservative: predictions.financial_trajectory.month_1?.conservative, Realistic: predictions.financial_trajectory.month_1?.realistic, Optimistic: predictions.financial_trajectory.month_1?.optimistic },
    { month: 'Month 3', Conservative: predictions.financial_trajectory.month_3?.conservative, Realistic: predictions.financial_trajectory.month_3?.realistic, Optimistic: predictions.financial_trajectory.month_3?.optimistic },
    { month: 'Month 6', Conservative: predictions.financial_trajectory.month_6?.conservative, Realistic: predictions.financial_trajectory.month_6?.realistic, Optimistic: predictions.financial_trajectory.month_6?.optimistic },
    { month: 'Month 12', Conservative: predictions.financial_trajectory.month_12?.conservative, Realistic: predictions.financial_trajectory.month_12?.realistic, Optimistic: predictions.financial_trajectory.month_12?.optimistic }
  ] : [];

  if (!pdgmData) return null;

  return (
    <Card className="border-2 border-purple-200">
      <CardHeader className="pb-3 bg-gradient-to-r from-purple-50 to-pink-50">
        <CardTitle className="text-lg flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            PDGM Predictive Forecaster
          </div>
          {currentPayment && (
            <Badge className="bg-gray-600 text-white text-lg px-3">
              Current: {formatCurrency(currentPayment)}
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {isPredicting ? (
          <div className="text-center py-8">
            <Loader2 className="w-8 h-8 animate-spin text-purple-600 mx-auto mb-3" />
            <p className="text-sm text-gray-600">Generating predictive scenarios...</p>
          </div>
        ) : !predictions ? (
          <Button onClick={generatePredictions} className="w-full bg-purple-600 hover:bg-purple-700">
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Revenue Predictions
          </Button>
        ) : (
          <>
            {/* Payment Scenarios Comparison */}
            <div className="bg-gradient-to-r from-indigo-50 to-purple-50 p-4 rounded-lg border border-purple-200">
              <h3 className="font-semibold text-purple-900 mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Payment Scenarios
              </h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend wrapperStyle={{ fontSize: '11px' }} />
                  <Bar dataKey="Payment" fill="#8b5cf6" />
                  <Bar dataKey="Increase" fill="#10b981" />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Scenario Cards */}
            <div className="space-y-3">
              {predictions.scenarios?.map((scenario, idx) => (
                <div 
                  key={idx}
                  className={`p-4 rounded-lg border-2 ${
                    idx === 0 ? 'bg-gray-50 border-gray-300' :
                    idx === 1 ? 'bg-green-50 border-green-300' :
                    idx === predictions.scenarios.length - 1 ? 'bg-purple-50 border-purple-300' :
                    'bg-blue-50 border-blue-300'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl font-bold text-gray-400">#{idx + 1}</span>
                      <div>
                        <h4 className="font-bold text-gray-900">{scenario.name}</h4>
                        <p className="text-xs text-gray-600">{scenario.description}</p>
                      </div>
                    </div>
                    <Badge className={getEffortColor(scenario.implementation_effort)}>
                      {scenario.implementation_effort} effort
                    </Badge>
                  </div>

                  <div className="grid grid-cols-3 gap-2 my-3">
                    <div className="bg-white p-2 rounded text-center">
                      <p className="text-xs text-gray-500">Payment</p>
                      <p className="text-lg font-bold text-purple-700">
                        {formatCurrency(scenario.projected_payment)}
                      </p>
                    </div>
                    <div className="bg-white p-2 rounded text-center">
                      <p className="text-xs text-gray-500">Increase</p>
                      <p className="text-lg font-bold text-green-700">
                        +{formatCurrency(scenario.payment_increase)}
                      </p>
                      <p className="text-xs text-green-600">+{scenario.percentage_increase}%</p>
                    </div>
                    <div className="bg-white p-2 rounded text-center">
                      <p className="text-xs text-gray-500">Annual</p>
                      <p className="text-lg font-bold text-indigo-700">
                        {formatCurrency(scenario.annual_impact)}
                      </p>
                    </div>
                  </div>

                  <div className="bg-white/50 p-2 rounded mb-2 text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-gray-600">Timeline: <strong>{scenario.implementation_timeline}</strong></span>
                      <span className="text-gray-600">ROI: <strong>{scenario.roi_timeline}</strong></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-600">Probability:</span>
                      <Progress value={scenario.probability} className="h-2 flex-1" />
                      <span className="font-bold text-purple-700">{scenario.probability}%</span>
                    </div>
                  </div>

                  {scenario.changes && scenario.changes.length > 0 && (
                    <div className="space-y-1 mb-2">
                      <p className="text-xs font-semibold text-gray-700">Key Changes:</p>
                      {scenario.changes.slice(0, 3).map((change, cIdx) => (
                        <div key={cIdx} className="flex items-center gap-2 text-xs bg-white p-1.5 rounded">
                          <ArrowRight className="w-3 h-3 text-blue-500 flex-shrink-0" />
                          <span className="text-gray-700">{change.item}: <strong>{change.to}</strong></span>
                        </div>
                      ))}
                      {scenario.changes.length > 3 && (
                        <p className="text-xs text-gray-500 italic">+{scenario.changes.length - 3} more changes</p>
                      )}
                    </div>
                  )}

                  {scenario.key_actions && scenario.key_actions.length > 0 && (
                    <div className="bg-blue-50 p-2 rounded border border-blue-200">
                      <p className="text-xs font-semibold text-blue-700 mb-1">Actions Needed:</p>
                      <ul className="text-xs text-blue-800 space-y-0.5">
                        {scenario.key_actions.slice(0, 2).map((action, aIdx) => (
                          <li key={aIdx}>• {action}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Financial Trajectory */}
            {predictions.financial_trajectory && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 p-4 rounded-lg border border-green-200">
                <h3 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                  <LineChart className="w-4 h-4" />
                  12-Month Revenue Trajectory
                </h3>
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={trajectoryData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                    <YAxis tick={{ fontSize: 10 }} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend wrapperStyle={{ fontSize: '10px' }} />
                    <Bar dataKey="Conservative" fill="#6b7280" />
                    <Bar dataKey="Realistic" fill="#3b82f6" />
                    <Bar dataKey="Optimistic" fill="#10b981" />
                  </BarChart>
                </ResponsiveContainer>
                <p className="text-xs text-green-700 text-center mt-2">
                  Cumulative impact based on {agencySettings?.avg_episodes_per_year || 50} similar episodes/year
                </p>
              </div>
            )}

            {/* Breakeven Analysis */}
            {predictions.breakeven_analysis && (
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                <h3 className="font-semibold text-indigo-900 mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Breakeven Analysis
                </h3>
                <div className="grid grid-cols-3 gap-3">
                  {Object.entries(predictions.breakeven_analysis).map(([key, data]) => (
                    <div key={key} className="bg-white p-3 rounded border text-center">
                      <p className="text-xs text-gray-600 mb-1 capitalize">{key.replace('_', ' ')}</p>
                      <p className="text-sm font-bold text-indigo-700">
                        {data.episodes_to_breakeven} episodes
                      </p>
                      <p className="text-xs text-gray-600">{data.time_to_breakeven}</p>
                      <p className="text-xs text-gray-500 mt-1">Cost: {formatCurrency(data.cost)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recommendations */}
            {predictions.recommendations && (
              <div className="bg-gradient-to-r from-cyan-50 to-blue-50 p-4 rounded-lg border border-cyan-200">
                <h3 className="font-semibold text-cyan-900 mb-3 flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Strategic Roadmap
                </h3>
                <div className="space-y-3">
                  <div className="bg-white p-3 rounded border border-red-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-red-600 text-white text-xs">NOW</Badge>
                      <p className="text-xs font-semibold text-gray-700">Immediate Focus</p>
                    </div>
                    <p className="text-sm text-gray-800">{predictions.recommendations.immediate_focus}</p>
                  </div>
                  <div className="bg-white p-3 rounded border border-orange-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-orange-500 text-white text-xs">30 DAYS</Badge>
                      <p className="text-xs font-semibold text-gray-700">Short-Term Goals</p>
                    </div>
                    <p className="text-sm text-gray-800">{predictions.recommendations['30_day_goals']}</p>
                  </div>
                  <div className="bg-white p-3 rounded border border-blue-200">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge className="bg-blue-600 text-white text-xs">90 DAYS</Badge>
                      <p className="text-xs font-semibold text-gray-700">Long-Term Goals</p>
                    </div>
                    <p className="text-sm text-gray-800">{predictions.recommendations['90_day_goals']}</p>
                  </div>
                </div>
                {predictions.recommendations.success_metrics && (
                  <div className="mt-3 bg-white p-2 rounded border">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Success Metrics:</p>
                    <ul className="text-xs text-gray-700 space-y-0.5">
                      {predictions.recommendations.success_metrics.map((metric, idx) => (
                        <li key={idx} className="flex items-start gap-1">
                          <CheckCircle2 className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                          {metric}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            <Button
              onClick={() => { setPredictions(null); setHasAutoPredicted(false); }}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Regenerate Predictions
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}
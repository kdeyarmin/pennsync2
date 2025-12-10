import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Activity,
  AlertTriangle,
  TrendingUp,
  Loader2,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Target
} from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

export default function PatientRiskPredictor({ patient, compact = false }) {
  const [riskData, setRiskData] = useState(null);
  const [expandedRisks, setExpandedRisks] = useState({});

  const analyzeMutation = useMutation({
    mutationFn: async () => {
      const response = await base44.functions.invoke('predictPatientRisks', {
        patient_id: patient.id
      });
      return response.data || response;
    },
    onSuccess: (data) => {
      setRiskData(data);
    }
  });

  const getRiskColor = (score) => {
    if (score >= 85) return 'bg-red-500';
    if (score >= 70) return 'bg-orange-500';
    if (score >= 50) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getRiskBadgeColor = (urgency) => {
    if (urgency === 'critical') return 'bg-red-600 text-white';
    if (urgency === 'high') return 'bg-orange-600 text-white';
    if (urgency === 'medium') return 'bg-yellow-600 text-white';
    return 'bg-blue-600 text-white';
  };

  const toggleRisk = (index) => {
    setExpandedRisks(prev => ({ ...prev, [index]: !prev[index] }));
  };

  if (compact && !riskData) {
    return (
      <Button
        onClick={() => analyzeMutation.mutate()}
        disabled={analyzeMutation.isLoading}
        size="sm"
        variant="outline"
        className="w-full"
      >
        {analyzeMutation.isLoading ? (
          <>
            <Loader2 className="w-3 h-3 mr-1 animate-spin" />
            Analyzing...
          </>
        ) : (
          <>
            <Activity className="w-3 h-3 mr-1" />
            Predict Risks
          </>
        )}
      </Button>
    );
  }

  return (
    <Card className={compact ? '' : 'border-purple-200'}>
      <CardHeader className={compact ? 'p-4' : 'bg-gradient-to-r from-purple-50 to-pink-50'}>
        <CardTitle className={`flex items-center justify-between ${compact ? 'text-base' : ''}`}>
          <span className="flex items-center gap-2">
            <Activity className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
            AI Risk Prediction
          </span>
          {!compact && riskData && (
            <Button
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isLoading}
              size="sm"
              variant="outline"
            >
              Re-analyze
            </Button>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className={compact ? 'p-4' : 'p-6'}>
        {!riskData ? (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 mx-auto mb-3 text-purple-300" />
            <p className="text-gray-600 mb-4">Run AI analysis to predict patient risks</p>
            <Button
              onClick={() => analyzeMutation.mutate()}
              disabled={analyzeMutation.isLoading}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {analyzeMutation.isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : (
                'Analyze Patient Risks'
              )}
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Overall Risk Level */}
            <Alert className={
              riskData.overall_risk_level === 'critical' ? 'border-red-300 bg-red-50' :
              riskData.overall_risk_level === 'high' ? 'border-orange-300 bg-orange-50' :
              riskData.overall_risk_level === 'medium' ? 'border-yellow-300 bg-yellow-50' :
              'border-green-300 bg-green-50'
            }>
              <AlertTriangle className={`w-4 h-4 ${
                riskData.overall_risk_level === 'critical' ? 'text-red-600' :
                riskData.overall_risk_level === 'high' ? 'text-orange-600' :
                riskData.overall_risk_level === 'medium' ? 'text-yellow-600' :
                'text-green-600'
              }`} />
              <AlertDescription className={
                riskData.overall_risk_level === 'critical' ? 'text-red-900' :
                riskData.overall_risk_level === 'high' ? 'text-orange-900' :
                riskData.overall_risk_level === 'medium' ? 'text-yellow-900' :
                'text-green-900'
              }>
                <strong>Overall Risk Level: {riskData.overall_risk_level.toUpperCase()}</strong>
                {riskData.alerts_created > 0 && (
                  <p className="text-sm mt-1">
                    {riskData.alerts_created} new alert{riskData.alerts_created > 1 ? 's' : ''} created
                  </p>
                )}
              </AlertDescription>
            </Alert>

            {/* Immediate Actions */}
            {riskData.immediate_actions?.length > 0 && (
              <Card className="border-red-200 bg-red-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-red-900 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Immediate Actions Needed
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {riskData.immediate_actions.map((action, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm text-red-900">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span>{action}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            {/* Risk Assessments */}
            <div className="space-y-2">
              <h3 className="font-semibold text-gray-900 mb-3">Detailed Risk Analysis</h3>
              <ScrollArea className={compact ? 'h-64' : 'h-96'}>
                <div className="space-y-2 pr-4">
                  {riskData.risk_assessments
                    ?.sort((a, b) => b.risk_score - a.risk_score)
                    .map((risk, idx) => (
                      <Collapsible key={idx} open={expandedRisks[idx]}>
                        <div className="border rounded-lg overflow-hidden">
                          <CollapsibleTrigger
                            onClick={() => toggleRisk(idx)}
                            className="w-full p-4 hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-3">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="font-semibold text-gray-900">{risk.risk_type}</span>
                                  <Badge className={getRiskBadgeColor(risk.urgency)}>
                                    {risk.urgency}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-3">
                                  <Progress value={risk.risk_score} className="flex-1 h-2" />
                                  <span className="text-sm font-semibold text-gray-700">{risk.risk_score}/100</span>
                                </div>
                              </div>
                              {expandedRisks[idx] ? (
                                <ChevronUp className="w-5 h-5 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                          </CollapsibleTrigger>

                          <CollapsibleContent>
                            <div className="p-4 bg-gray-50 border-t space-y-3">
                              {/* Evidence */}
                              <div>
                                <p className="text-xs font-semibold text-gray-600 mb-1">Evidence:</p>
                                <p className="text-sm text-gray-700">{risk.evidence}</p>
                              </div>

                              {/* Contributing Factors */}
                              {risk.contributing_factors?.length > 0 && (
                                <div>
                                  <p className="text-xs font-semibold text-gray-600 mb-1">Contributing Factors:</p>
                                  <ul className="space-y-1">
                                    {risk.contributing_factors.map((factor, fIdx) => (
                                      <li key={fIdx} className="text-sm text-gray-700 flex items-start gap-1">
                                        <span className="text-orange-500">•</span>
                                        <span>{factor}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}

                              {/* Recommendations */}
                              {risk.recommendations?.length > 0 && (
                                <div className="bg-blue-50 rounded p-3 border border-blue-200">
                                  <p className="text-xs font-semibold text-blue-900 mb-2">Recommended Actions:</p>
                                  <ul className="space-y-1">
                                    {risk.recommendations.map((rec, rIdx) => (
                                      <li key={rIdx} className="text-sm text-blue-800 flex items-start gap-1">
                                        <Target className="w-3 h-3 mt-0.5 flex-shrink-0" />
                                        <span>{rec}</span>
                                      </li>
                                    ))}
                                  </ul>
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </div>
                      </Collapsible>
                    ))}
                </div>
              </ScrollArea>
            </div>

            {/* Monitoring Priorities */}
            {riskData.monitoring_priorities?.length > 0 && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm text-blue-900 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4" />
                    Monitoring Priorities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {riskData.monitoring_priorities.map((priority, idx) => (
                      <li key={idx} className="text-sm text-blue-900 flex items-start gap-2">
                        <span className="text-blue-600">•</span>
                        <span>{priority}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
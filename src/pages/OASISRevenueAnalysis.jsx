import { useLocation, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp } from "lucide-react";
import PDGMRevenueComparison from "../components/oasis/PDGMRevenueComparison";
import EnhancedPDGMCaseMixAnalyzer from "../components/oasis/EnhancedPDGMCaseMixAnalyzer";
import AutomatedPDGMNavigator from "../components/oasis/AutomatedPDGMNavigator";
import PDGMImpactAnalyzer from "../components/oasis/PDGMImpactAnalyzer";

export default function OASISRevenueAnalysis() {
  const location = useLocation();
  const { analysisResults, pdgmData, patientName, _uploadId } = location.state || {};

  if (!analysisResults || !pdgmData) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-slate-600">No analysis data available. Please analyze an OASIS document first.</p>
            <Link to={createPageUrl("OASISAnalyzer")}>
              <Button className="mt-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Analyzer
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const revenueScore = analysisResults.revenue_optimization_score || 0;

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0 flex-1">
          <Link to={createPageUrl("OASISAnalyzer")}>
            <Button variant="ghost" size="sm" className="min-h-[44px]">
              <ArrowLeft className="w-4 h-4 mr-2" />
              <span className="hidden sm:inline">Back to Analyzer</span>
              <span className="sm:hidden">Back</span>
            </Button>
          </Link>
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mt-2 truncate">PDGM Revenue Analysis</h1>
          {patientName && <p className="text-xs sm:text-sm text-slate-600 mt-1 truncate">Patient: {patientName}</p>}
        </div>
        <div className="text-center sm:text-right">
          <p className="text-sm text-slate-600">Revenue Optimization Score</p>
          <div className="flex items-center gap-2 mt-1">
            <div className="text-3xl font-bold text-green-600">{revenueScore}%</div>
            <Badge className={`${
              revenueScore >= 90 ? 'bg-green-600' :
              revenueScore >= 70 ? 'bg-yellow-600' :
              'bg-red-600'
            } text-white`}>
              {revenueScore >= 90 ? 'Excellent' : revenueScore >= 70 ? 'Good' : 'Needs Improvement'}
            </Badge>
          </div>
        </div>
      </div>

      {/* Revenue Comparison */}
      <PDGMRevenueComparison 
        analysisResults={analysisResults}
        pdgmData={pdgmData}
      />

      {/* PDGM Navigator */}
      <AutomatedPDGMNavigator
        analysisResults={analysisResults}
        pdgmData={pdgmData}
      />

      {/* Case Mix Analyzer */}
      <EnhancedPDGMCaseMixAnalyzer
        analysisResults={analysisResults}
        pdgmData={pdgmData}
      />

      {/* Impact Analyzer */}
      <PDGMImpactAnalyzer
        analysisResults={analysisResults}
        pdgmData={pdgmData}
      />

      {/* Revenue Tips */}
      {analysisResults.revenue_tips && analysisResults.revenue_tips.length > 0 && (
        <Card className="border-2 border-green-200">
          <CardHeader className="bg-gradient-to-r from-green-50 to-emerald-50">
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-600" />
              Revenue Optimization Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-4">
              {analysisResults.revenue_tips.map((tip, idx) => (
                <Card key={idx} className="border-l-4 border-l-green-500">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge className="bg-green-100 text-green-800">{tip.category}</Badge>
                        <Badge variant="outline">{tip.potential_impact}</Badge>
                      </div>
                    </div>
                    <p className="font-medium text-slate-900 mb-2">{tip.opportunity}</p>
                    <p className="text-sm text-slate-700 mb-3">{tip.specific_action}</p>
                    {tip.supporting_documentation && (
                      <div className="bg-blue-50 p-2 rounded text-xs text-blue-900">
                        <strong>Documentation:</strong> {tip.supporting_documentation}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
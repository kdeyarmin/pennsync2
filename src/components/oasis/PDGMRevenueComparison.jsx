import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  DollarSign,
  TrendingUp,
  Calculator,
  Loader2,
  FileDown,
  ArrowRight,
  CheckCircle2,
  Info
} from "lucide-react";
import { calculatePDGM } from "@/functions/calculatePDGM";
import { generatePDGMComparisonPDF } from "@/functions/generatePDGMComparisonPDF";

export default function PDGMRevenueComparison({ analysisResults, pdgmData }) {
  const [isCalculating, setIsCalculating] = useState(false);
  const [revenueData, setRevenueData] = useState(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [error, setError] = useState(null);
  const [hasAutoCalculated, setHasAutoCalculated] = useState(false);

  // Auto-calculate when pdgmData becomes available
  useEffect(() => {
    if (pdgmData && !revenueData && !isCalculating && !hasAutoCalculated) {
      calculateRevenue();
      setHasAutoCalculated(true);
    }
  }, [pdgmData]);

  // Reset when pdgmData changes
  useEffect(() => {
    if (!pdgmData) {
      setRevenueData(null);
      setHasAutoCalculated(false);
    }
  }, [pdgmData]);

  const calculateRevenue = async () => {
    if (!pdgmData) return;

    setIsCalculating(true);
    setError(null);

    try {
      // Build corrected PDGM data based on AI recommendations
      const correctedPdgmData = buildCorrectedPdgmData(pdgmData, analysisResults);

      const response = await calculatePDGM({
        pdgmData: pdgmData,
        correctedPdgmData: correctedPdgmData
      });

      setRevenueData(response.data);
    } catch (err) {
      console.error("Error calculating PDGM:", err);
      setError("Failed to calculate PDGM revenue. Please try again.");
    }

    setIsCalculating(false);
  };

  const buildCorrectedPdgmData = (original, analysis) => {
    const corrected = { ...original };

    // Apply corrections based on revenue tips
    if (analysis?.revenue_tips?.length > 0) {
      analysis.revenue_tips.forEach(tip => {
        // Adjust functional scores if functional status improvements suggested
        if (tip.category === 'Functional Status') {
          corrected.functional_scores = corrected.functional_scores || {};
          // Increase functional impairment scores based on suggestions
          if (tip.potential_impact === 'high') {
            corrected.functional_scores.m1830_bathing = Math.min(6, (corrected.functional_scores.m1830_bathing || 0) + 2);
            corrected.functional_scores.m1860_ambulation = Math.min(6, (corrected.functional_scores.m1860_ambulation || 0) + 2);
            corrected.functional_scores.m1850_transferring = Math.min(5, (corrected.functional_scores.m1850_transferring || 0) + 1);
          } else if (tip.potential_impact === 'medium') {
            corrected.functional_scores.m1850_transferring = Math.min(5, (corrected.functional_scores.m1850_transferring || 0) + 1);
            corrected.functional_scores.m1840_toilet_transfer = Math.min(4, (corrected.functional_scores.m1840_toilet_transfer || 0) + 1);
          } else {
            corrected.functional_scores.m1800_grooming = Math.min(3, (corrected.functional_scores.m1800_grooming || 0) + 1);
          }
        }

        // Add comorbidities if suggested
        if (tip.category === 'Diagnosis' || tip.category === 'Clinical Condition') {
          corrected.comorbidities = corrected.comorbidities || [];
          if (tip.opportunity && !corrected.comorbidities.includes(tip.opportunity)) {
            corrected.comorbidities.push(tip.opportunity);
          }
        }

        // Therapy adjustments
        if (tip.category === 'Therapy') {
          corrected.functional_scores = corrected.functional_scores || {};
          corrected.functional_scores.m1860_ambulation = Math.min(6, (corrected.functional_scores.m1860_ambulation || 0) + 1);
        }
      });
    }

    // Check for accuracy issues that might affect PDGM
    if (analysis?.accuracy_issues?.length > 0) {
      analysis.accuracy_issues.forEach(issue => {
        if (issue.item?.includes('M18')) {
          // Functional item correction
          corrected.functional_scores = corrected.functional_scores || {};
          const itemNum = issue.item.match(/M18(\d{2})/i);
          if (itemNum) {
            const itemMap = {
              '00': 'm1800_grooming',
              '10': 'm1810_dress_upper',
              '20': 'm1820_dress_lower',
              '30': 'm1830_bathing',
              '40': 'm1840_toilet_transfer',
              '50': 'm1850_transferring',
              '60': 'm1860_ambulation'
            };
            const key = itemMap[itemNum[1]];
            if (key) {
              const maxValues = { m1800_grooming: 3, m1810_dress_upper: 3, m1820_dress_lower: 3, m1830_bathing: 6, m1840_toilet_transfer: 4, m1850_transferring: 5, m1860_ambulation: 6 };
              corrected.functional_scores[key] = Math.min(maxValues[key], (corrected.functional_scores[key] || 0) + 1);
            }
          }
        }
      });
    }

    // Check documentation improvements for PDGM impact
    if (analysis?.documentation_improvements?.length > 0) {
      analysis.documentation_improvements.forEach(imp => {
        if (imp.item?.toLowerCase().includes('diagnosis') || imp.rationale?.toLowerCase().includes('case-mix')) {
          corrected.comorbidities = corrected.comorbidities || [];
          if (corrected.comorbidities.length < 3) {
            corrected.comorbidities.push('documented comorbidity');
          }
        }
      });
    }

    return corrected;
  };

  const handleDownloadPDF = async () => {
    if (!revenueData) return;

    setIsDownloading(true);
    try {
      const response = await generatePDGMComparisonPDF({
        revenueData,
        analysisResults,
        pdgmData
      });

      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PDGM_Revenue_Comparison_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error("Error generating PDF:", err);
      setError("Failed to generate PDF report.");
    }
    setIsDownloading(false);
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  return (
    <Card className="border-2 border-green-200">
      <CardHeader className="pb-3 bg-gradient-to-r from-green-50 to-emerald-50">
        <CardTitle className="text-lg flex items-center gap-2">
          <DollarSign className="w-5 h-5 text-green-600" />
          PDGM Revenue Analysis
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {isCalculating ? (
          <div className="text-center py-6">
            <Loader2 className="w-8 h-8 animate-spin text-green-600 mx-auto mb-3" />
            <p className="text-sm text-gray-600">Calculating PDGM revenue based on OASIS data...</p>
            <p className="text-xs text-gray-400 mt-1">Applying CMS PDGM rules and corrections</p>
          </div>
        ) : !revenueData ? (
          <>
            <Alert className="bg-blue-50 border-blue-200">
              <Info className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-800 text-sm">
                {pdgmData 
                  ? "Ready to calculate PDGM revenue based on extracted OASIS data."
                  : "Upload and analyze an OASIS document to calculate PDGM revenue impact."}
              </AlertDescription>
            </Alert>

            <Button
              onClick={calculateRevenue}
              disabled={isCalculating || !pdgmData}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              <Calculator className="w-4 h-4 mr-2" /> Calculate Revenue Impact
            </Button>

            {!pdgmData && (
              <p className="text-xs text-gray-500 text-center">
                PDGM data not available. Run analysis first.
              </p>
            )}
          </>
        ) : (
          <>
            {/* Revenue Comparison */}
            <div className="grid grid-cols-2 gap-4">
              {/* Original Revenue */}
              <div className="p-4 bg-gray-50 rounded-lg border">
                <p className="text-xs text-gray-500 mb-1">Current Documentation</p>
                <p className="text-2xl font-bold text-gray-700">
                  {formatCurrency(revenueData.original?.totalPayment || 0)}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Case-Mix: {revenueData.original?.caseMixWeight?.toFixed(4)}
                </p>
              </div>

              {/* Corrected Revenue */}
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-xs text-green-600 mb-1">With Improvements</p>
                <p className="text-2xl font-bold text-green-700">
                  {formatCurrency(revenueData.corrected?.totalPayment || 0)}
                </p>
                <p className="text-xs text-green-600 mt-1">
                  Case-Mix: {revenueData.corrected?.caseMixWeight?.toFixed(4)}
                </p>
              </div>
            </div>

            {/* Revenue Difference */}
            {revenueData.revenueDifference !== null && (
              <div className={`p-4 rounded-lg border-2 ${
                revenueData.revenueDifference > 0 
                  ? 'bg-gradient-to-r from-green-100 to-emerald-100 border-green-300' 
                  : 'bg-gray-100 border-gray-300'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Potential Revenue Increase</p>
                    <p className={`text-3xl font-bold ${
                      revenueData.revenueDifference > 0 ? 'text-green-700' : 'text-gray-700'
                    }`}>
                      {revenueData.revenueDifference > 0 ? '+' : ''}{formatCurrency(revenueData.revenueDifference)}
                    </p>
                  </div>
                  {revenueData.percentageIncrease > 0 && (
                    <div className="flex items-center gap-1 bg-green-600 text-white px-3 py-1 rounded-full">
                      <TrendingUp className="w-4 h-4" />
                      <span className="font-bold">+{revenueData.percentageIncrease}%</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Annual Impact */}
            {revenueData.financialImpact && (
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                <p className="text-sm font-semibold text-indigo-900 mb-3">Projected Annual Impact</p>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div>
                    <p className="text-xs text-indigo-600">Per Episode</p>
                    <p className="text-sm font-bold text-indigo-900">
                      {formatCurrency(revenueData.financialImpact.perEpisode)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-indigo-600">30 Episodes/Year</p>
                    <p className="text-sm font-bold text-indigo-900">
                      {formatCurrency(revenueData.financialImpact.annual30Episodes)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-indigo-600">60 Episodes/Year</p>
                    <p className="text-sm font-bold text-indigo-900">
                      {formatCurrency(revenueData.financialImpact.annual60Episodes)}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Breakdown */}
            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700">PDGM Component Comparison</p>
              <div className="text-xs space-y-1">
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>Clinical Group</span>
                  <span className="flex items-center gap-2">
                    <span className="text-gray-600">{revenueData.original?.clinicalGroup?.replace('MMTA_', '')}</span>
                    {revenueData.corrected?.clinicalGroup !== revenueData.original?.clinicalGroup && (
                      <>
                        <ArrowRight className="w-3 h-3" />
                        <span className="text-green-600 font-medium">{revenueData.corrected?.clinicalGroup?.replace('MMTA_', '')}</span>
                      </>
                    )}
                  </span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>Functional Level</span>
                  <span className="flex items-center gap-2">
                    <span className="text-gray-600 capitalize">{revenueData.original?.functionalLevel}</span>
                    {revenueData.corrected?.functionalLevel !== revenueData.original?.functionalLevel && (
                      <>
                        <ArrowRight className="w-3 h-3" />
                        <span className="text-green-600 font-medium capitalize">{revenueData.corrected?.functionalLevel}</span>
                      </>
                    )}
                  </span>
                </div>
                <div className="flex justify-between p-2 bg-gray-50 rounded">
                  <span>Comorbidity Adjustment</span>
                  <span className="flex items-center gap-2">
                    <span className="text-gray-600 capitalize">{revenueData.original?.comorbidityLevel}</span>
                    {revenueData.corrected?.comorbidityLevel !== revenueData.original?.comorbidityLevel && (
                      <>
                        <ArrowRight className="w-3 h-3" />
                        <span className="text-green-600 font-medium capitalize">{revenueData.corrected?.comorbidityLevel}</span>
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>

            {/* Download Button */}
            <Button
              onClick={handleDownloadPDF}
              disabled={isDownloading}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
            >
              {isDownloading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating PDF...</>
              ) : (
                <><FileDown className="w-4 h-4 mr-2" /> Download PDGM Comparison PDF</>
              )}
            </Button>

            {/* Recalculate */}
            <Button
              onClick={() => setRevenueData(null)}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Recalculate
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
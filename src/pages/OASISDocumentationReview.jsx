import React from "react";
import { useLocation, Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, FileText, Sparkles } from "lucide-react";
import OASISDocumentationQualityScorer from "../components/oasis/OASISDocumentationQualityScorer";
import AIDocumentReviewer from "../components/oasis/AIDocumentReviewer";
import AIDocumentationGenerator from "../components/oasis/AIDocumentationGenerator";
import AIDocumentationAssistant from "../components/oasis/AIDocumentationAssistant";
import InlineDocumentationAssistant from "../components/oasis/InlineDocumentationAssistant";

export default function OASISDocumentationReview() {
  const location = useLocation();
  const { analysisResults, pdgmData, patientName, navigationData } = location.state || {};

  if (!analysisResults) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="p-6">
            <p className="text-gray-600">No analysis data available. Please analyze an OASIS document first.</p>
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
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mt-2 truncate">OASIS Documentation Review</h1>
          {patientName && <p className="text-xs sm:text-sm text-gray-600 mt-1 truncate">Patient: {patientName}</p>}
        </div>
        <Badge className="bg-purple-600 text-white text-sm sm:text-base md:text-lg px-3 sm:px-4 py-2 flex items-center gap-2">
          <Sparkles className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
          <span className="hidden sm:inline">AI-Powered Documentation Support</span>
          <span className="sm:hidden">AI</span>
        </Badge>
      </div>

      {/* Documentation Quality Score */}
      <OASISDocumentationQualityScorer
        analysisResults={analysisResults}
        pdgmData={pdgmData}
      />

      {/* AI Document Reviewer */}
      <AIDocumentReviewer
        analysisResults={analysisResults}
        pdgmData={pdgmData}
      />

      {/* AI Documentation Generator */}
      <AIDocumentationGenerator
        analysisResults={analysisResults}
        pdgmData={pdgmData}
        navigationData={navigationData}
      />

      {/* AI Documentation Assistant */}
      <AIDocumentationAssistant
        analysisResults={analysisResults}
        patientData={pdgmData}
      />

      {/* Inline Documentation Assistant */}
      <InlineDocumentationAssistant
        analysisResults={analysisResults}
        pdgmData={pdgmData}
      />
    </div>
  );
}
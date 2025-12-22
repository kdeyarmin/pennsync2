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
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <Link to={createPageUrl("OASISAnalyzer")}>
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Analyzer
            </Button>
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">OASIS Documentation Review</h1>
          {patientName && <p className="text-gray-600 mt-1">Patient: {patientName}</p>}
        </div>
        <Badge className="bg-purple-600 text-white text-lg px-4 py-2">
          <Sparkles className="w-5 h-5 mr-2" />
          AI-Powered Documentation Support
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
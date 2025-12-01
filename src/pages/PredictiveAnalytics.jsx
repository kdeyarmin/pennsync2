import React from "react";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft } from "lucide-react";
import AdvancedPredictiveAnalytics from "../components/predictive/AdvancedPredictiveAnalytics";

export default function PredictiveAnalytics() {
  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <Link to={createPageUrl("Dashboard")}>
          <Button variant="outline" size="sm" className="mb-4">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </Link>
        <h1 className="text-3xl font-bold text-gray-900">Predictive Analytics</h1>
        <p className="text-gray-600 mt-1">AI-powered risk forecasting and proactive care recommendations</p>
      </div>

      <AdvancedPredictiveAnalytics />
    </div>
  );
}
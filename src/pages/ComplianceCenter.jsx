import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import ComplianceCalendar from "../components/compliance/ComplianceCalendar";

export default function ComplianceCenter() {
  const navigate = useNavigate();

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <Button
        variant="outline"
        onClick={() => navigate(createPageUrl("Dashboard"))}
        className="mb-4 sm:mb-6 min-h-[44px]"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>

      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Medicare Compliance Center
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          Automated tracking of critical Medicare deadlines and requirements
        </p>
      </div>

      <ComplianceCalendar />
    </div>
  );
}
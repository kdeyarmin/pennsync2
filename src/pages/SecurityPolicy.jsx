import React from "react";
import SecurityDocumentation from "../components/security/SecurityDocumentation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function SecurityPolicy() {
  const navigate = useNavigate();

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
      <Button
        variant="outline"
        onClick={() => navigate(createPageUrl("AdminDashboard"))}
        className="mb-4 sm:mb-6 min-h-[44px] w-full sm:w-auto"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Admin
      </Button>

      <div className="mb-4 sm:mb-6 md:mb-8">
        <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-gray-900 mb-2">
          Security & Compliance Documentation
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-gray-600">
          Comprehensive overview of Penn Sync's security measures and HIPAA compliance
        </p>
      </div>

      <SecurityDocumentation />
    </div>
  );
}
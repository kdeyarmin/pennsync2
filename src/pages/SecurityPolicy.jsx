import React from "react";
import SecurityDocumentation from "../components/security/SecurityDocumentation";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function SecurityPolicy() {
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <Button
        variant="outline"
        onClick={() => navigate(createPageUrl("AdminDashboard"))}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Admin
      </Button>

      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Security & Compliance Documentation
        </h1>
        <p className="text-gray-600">
          Comprehensive overview of Penn Sync's security measures and HIPAA compliance
        </p>
      </div>

      <SecurityDocumentation />
    </div>
  );
}
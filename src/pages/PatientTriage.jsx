import React from "react";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import PatientTriageSystem from "../components/triage/PatientTriageSystem";

export default function PatientTriage() {
  const navigate = useNavigate();

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <Button
        variant="outline"
        onClick={() => navigate(createPageUrl("Dashboard"))}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Dashboard
      </Button>

      <PatientTriageSystem />
    </div>
  );
}
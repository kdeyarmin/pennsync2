import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import RegulatoryMonitor from "../components/compliance/RegulatoryMonitor";
import NurseRegulatoryAlerts from "../components/compliance/NurseRegulatoryAlerts";

export default function RegulatoryCompliance() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Link to={createPageUrl("ComplianceDashboard")}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Regulatory Compliance Center</h1>
          <p className="text-gray-600">Monitor healthcare regulations and manage compliance updates</p>
        </div>
      </div>

      {!isAdmin && (
        <div className="mb-6">
          <NurseRegulatoryAlerts nurseEmail={currentUser?.email} />
        </div>
      )}

      <RegulatoryMonitor isAdmin={isAdmin} />
    </div>
  );
}
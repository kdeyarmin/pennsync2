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
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 mb-4 sm:mb-6">
        <Link to={createPageUrl("ComplianceCenter")} className="w-full sm:w-auto">
          <Button variant="outline" size="sm" className="min-h-[44px] w-full sm:w-auto">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
        </Link>
        <div className="min-w-0 flex-1">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 truncate">Regulatory Compliance Center</h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600 hidden sm:block">Monitor healthcare regulations and manage compliance updates</p>
        </div>
      </div>

      {!isAdmin && (
        <div className="mb-4 sm:mb-6">
          <NurseRegulatoryAlerts nurseEmail={currentUser?.email} />
        </div>
      )}

      <RegulatoryMonitor isAdmin={isAdmin} />
    </div>
  );
}
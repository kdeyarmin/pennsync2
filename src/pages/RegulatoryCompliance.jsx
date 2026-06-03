import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ClipboardList } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

import RegulatoryMonitor from "../components/compliance/RegulatoryMonitor";
import NurseRegulatoryAlerts from "../components/compliance/NurseRegulatoryAlerts";
import PageContainer from "@/components/ui/PageContainer";
import PageHeader from "@/components/ui/PageHeader";

export default function RegulatoryCompliance() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === 'admin';

  return (
    <PageContainer>
      <PageHeader
        icon={ClipboardList}
        eyebrow="Analytics"
        title="Regulatory Compliance Center"
        description="Monitor healthcare regulations and manage compliance updates"
        favoritePage="RegulatoryCompliance"
        actions={
          <Link to={createPageUrl("ComplianceDashboard")}>
            <Button variant="outline" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
          </Link>
        }
      />

      {!isAdmin && (
        <div className="mb-4 sm:mb-6">
          <NurseRegulatoryAlerts nurseEmail={currentUser?.email} />
        </div>
      )}

      <RegulatoryMonitor isAdmin={isAdmin} />
    </PageContainer>
  );
}
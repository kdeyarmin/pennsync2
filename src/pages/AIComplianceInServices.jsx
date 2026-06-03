import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import AIComplianceInServicesHub from "@/components/training/AIComplianceInServicesHub";
import MyTrainingDashboard from "@/components/training/MyTrainingDashboard";
import PageContainer from "@/components/ui/PageContainer";
import PageHeader from "@/components/ui/PageHeader";
import { Brain } from "lucide-react";

export default function AIComplianceInServices() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === 'admin';

  // Admins see the full management hub, regular users see their training view
  return isAdmin ? <AIComplianceInServicesHub /> : (
    <PageContainer>
      <PageHeader
        icon={Brain}
        eyebrow="My Learning"
        title="AI Compliance In-Services"
        description="Your assigned compliance in-service trainings"
        favoritePage="AIComplianceInServices"
      />
      <MyTrainingDashboard filterByType="in_service" />
    </PageContainer>
  );
}

import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import AIComplianceInServicesHub from "@/components/training/AIComplianceInServicesHub";
import MyTrainingDashboard from "@/components/training/MyTrainingDashboard";

export default function AIComplianceInServices() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === 'admin';

  // Admins see the full management hub, regular users see their training view
  return isAdmin ? <AIComplianceInServicesHub /> : (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">AI Compliance In-Services</h1>
        <p className="text-sm sm:text-base text-slate-600">Your assigned compliance in-service trainings</p>
      </div>
      <MyTrainingDashboard filterByType="in_service" />
    </div>
  );
}
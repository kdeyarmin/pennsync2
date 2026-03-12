import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import AdminDashboardOverview from "../components/admin/AdminDashboardOverview";
import UserActivityDashboard from "../components/admin/UserActivityDashboard";
import { ShieldAlert, Activity } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function AdminDashboardPage() {
  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  if (isLoading) return null;

  if (currentUser?.role !== 'admin') {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-12 text-center">
            <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
            <p className="text-gray-600">Only administrators can access the Admin Dashboard.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-4 sm:mb-6 w-full grid grid-cols-2 gap-1 h-auto p-1">
          <TabsTrigger value="overview" className="min-h-[44px]">Dashboard Overview</TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center gap-2 min-h-[44px]">
            <Activity className="h-4 w-4" />
            <span className="hidden sm:inline">User Activity</span>
            <span className="sm:hidden">Activity</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <AdminDashboardOverview />
        </TabsContent>

        <TabsContent value="activity">
          <UserActivityDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
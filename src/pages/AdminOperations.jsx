import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ShieldAlert, Activity, Database, Settings, Zap } from "lucide-react";
import AdminDashboardOverview from "@/components/admin/AdminDashboardOverview";
import UserActivityDashboard from "@/components/admin/UserActivityDashboard";
import DataQualityDashboard from "@/components/admin/DataQualityDashboard";
import SystemHealthPanel from "@/components/admin/SystemHealthPanel";
import SystemSettings from "@/components/admin/SystemSettings";
import PageHeader from "@/components/ui/PageHeader";

export default function AdminOperations() {
  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  if (isLoading) return null;

  if (currentUser?.role !== 'admin') {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <Card className="modern-card border-l-4 border-l-red-500">
          <CardContent className="p-12 text-center">
            <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-slate-900 mb-2">Access Restricted</h2>
            <p className="text-slate-600">Only administrators can access Admin Operations.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto animate-fade-in">
<<<<<<< HEAD
      <PageHeader
        icon={Settings}
        iconColor="bg-indigo-600"
        eyebrow="Administration"
        title="Admin Operations"
        description="System monitoring, data quality, user activity, and operational oversight"
        favoritePage="AdminOperations"
      />
=======
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
          <Settings className="w-8 h-8 text-indigo-600" />
          Admin Operations
        </h1>
        <p className="text-sm sm:text-base text-slate-600 mt-2">
          System monitoring, data quality, user activity, and operational oversight
        </p>
      </div>
>>>>>>> origin/main

      <Tabs defaultValue="overview" className="space-y-6">
        <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
          <TabsList className="inline-flex w-max min-w-full gap-1 h-auto p-1">
            <TabsTrigger value="overview" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
              <Activity className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="activity" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
              <Activity className="h-4 w-4 mr-2" />
              User Activity
            </TabsTrigger>
            <TabsTrigger value="data-quality" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
              <Database className="h-4 w-4 mr-2" />
              Data Quality
            </TabsTrigger>
            <TabsTrigger value="system-health" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
              <Zap className="h-4 w-4 mr-2" />
              System Health
            </TabsTrigger>
            <TabsTrigger value="settings" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
              <Settings className="h-4 w-4 mr-2" />
              Settings
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="overview">
          <AdminDashboardOverview />
        </TabsContent>

        <TabsContent value="activity">
          <UserActivityDashboard />
        </TabsContent>

        <TabsContent value="data-quality">
          <DataQualityDashboard />
        </TabsContent>

        <TabsContent value="system-health">
          <SystemHealthPanel />
        </TabsContent>

        <TabsContent value="settings">
          <SystemSettings />
        </TabsContent>
      </Tabs>
    </div>
  );
}
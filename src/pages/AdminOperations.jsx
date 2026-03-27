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

export default function AdminOperations() {
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
            <p className="text-gray-600">Only administrators can access Admin Operations.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="page-header-gradient bg-gradient-to-r from-slate-800 via-slate-700 to-indigo-800 mb-6">
        <div className="relative z-10 flex items-center gap-4">
          <div className="w-14 h-14 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center flex-shrink-0">
            <Settings className="w-8 h-8 text-white" />
          </div>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Admin Operations</h1>
            <p className="text-slate-300 mt-1">System monitoring, data quality, user activity, and operational oversight</p>
          </div>
        </div>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-1 h-auto p-1">
          <TabsTrigger value="overview" className="min-h-[44px]">
            <Activity className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="activity" className="min-h-[44px]">
            <Activity className="h-4 w-4 mr-2" />
            User Activity
          </TabsTrigger>
          <TabsTrigger value="data-quality" className="min-h-[44px]">
            <Database className="h-4 w-4 mr-2" />
            Data Quality
          </TabsTrigger>
          <TabsTrigger value="system-health" className="min-h-[44px]">
            <Zap className="h-4 w-4 mr-2" />
            System Health
          </TabsTrigger>
          <TabsTrigger value="settings" className="min-h-[44px]">
            <Settings className="h-4 w-4 mr-2" />
            Settings
          </TabsTrigger>
        </TabsList>

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
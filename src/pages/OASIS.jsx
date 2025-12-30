import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, BarChart3, ShieldAlert, ClipboardCheck } from "lucide-react";
import OASISAnalyzer from "./OASISAnalyzer";
import OASISAnalyticsDashboard from "./OASISAnalyticsDashboard";
import OASISAuditDashboard from "./OASISAuditDashboard";

export default function OASIS() {
  const [activeTab, setActiveTab] = useState("analyzer");

  const { data: currentUser, isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            Loading...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (currentUser?.role !== 'admin') {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card className="border-red-200 bg-red-50">
          <CardContent className="p-12 text-center">
            <ShieldAlert className="w-16 h-16 text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Restricted</h2>
            <p className="text-gray-600 mb-4">
              Only administrators can access the OASIS module.
            </p>
            <p className="text-sm text-gray-500">
              Please contact your administrator if you need access to this feature.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
              <TabsList className="inline-flex md:grid md:w-full md:max-w-2xl md:grid-cols-3 gap-1 min-w-max h-auto md:h-14">
                <TabsTrigger value="analyzer" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm whitespace-nowrap">
                  <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Analyzer</span>
                </TabsTrigger>
                <TabsTrigger value="audits" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm whitespace-nowrap">
                  <ClipboardCheck className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Audits</span>
                </TabsTrigger>
                <TabsTrigger value="analytics" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm whitespace-nowrap">
                  <BarChart3 className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Analytics</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
        </div>

        <TabsContent value="analyzer" className="m-0">
          <OASISAnalyzer />
        </TabsContent>

        <TabsContent value="audits" className="m-0">
          <OASISAuditDashboard />
        </TabsContent>

        <TabsContent value="analytics" className="m-0">
          <OASISAnalyticsDashboard />
        </TabsContent>
      </Tabs>
    </div>
  );
}
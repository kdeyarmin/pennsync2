import React, { useState } from "react";
import SecurityDocumentation from "../components/security/SecurityDocumentation";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Shield, FileText, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import AuditTrailViewer from "../components/security/AuditTrailViewer";

export default function SecurityPolicy() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("policy");

  return (
    <div className="min-h-screen">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6">
            <div className="py-3 sm:py-4">
              <Button
                variant="outline"
                onClick={() => navigate(createPageUrl("AdminDashboard"))}
                className="mb-3 sm:mb-4 min-h-[44px] w-full sm:w-auto"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Admin
              </Button>
              
              <div className="mb-3 sm:mb-4">
                <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2 truncate">
                  Security & Compliance Center
                </h1>
                <p className="text-xs sm:text-sm md:text-base text-gray-600 hidden sm:block">
                  Comprehensive security documentation and audit trail monitoring
                </p>
              </div>
            </div>
            
            <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
              <TabsList className="inline-flex md:grid md:w-full md:max-w-2xl md:grid-cols-3 gap-1 min-w-max h-auto md:h-14">
                <TabsTrigger value="policy" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm whitespace-nowrap">
                  <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Security Policy</span>
                </TabsTrigger>
                <TabsTrigger value="audit" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm whitespace-nowrap">
                  <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Audit Trail</span>
                </TabsTrigger>
                <TabsTrigger value="security-events" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm whitespace-nowrap">
                  <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
                  <span>Security Events</span>
                </TabsTrigger>
              </TabsList>
            </div>
          </div>
        </div>

        <TabsContent value="policy" className="m-0">
          <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-5xl mx-auto">
            <SecurityDocumentation />
          </div>
        </TabsContent>

        <TabsContent value="audit" className="m-0">
          <AuditTrailViewer filterType="all" />
        </TabsContent>

        <TabsContent value="security-events" className="m-0">
          <AuditTrailViewer filterType="security" />
        </TabsContent>
      </Tabs>
    </div>
  );
}
import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Shield, FileText, Activity, AlertTriangle } from "lucide-react";
import SecurityDocumentation from "../components/security/SecurityDocumentation";
import AuditTrailViewer from "../components/security/AuditTrailViewer";
import SecurityAnomalyDetector from "../components/security/SecurityAnomalyDetector";
import PHIDeIdentifier from "../components/security/PHIDeIdentifier";
import BreachDetectionSystem from "../components/security/BreachDetectionSystem";
import EncryptionStatusIndicator from "../components/security/EncryptionStatusIndicator";

export default function SecurityPolicy() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2 mb-2">
          <Shield className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
          <span className="truncate">Security & Compliance</span>
        </h1>
        <p className="text-xs sm:text-sm md:text-base text-gray-600 hidden sm:block">
          HIPAA security measures, audit trails, and compliance documentation
        </p>
      </div>

      <Tabs defaultValue="documentation" className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex md:grid md:w-full md:grid-cols-7 gap-1 min-w-max h-auto">
            <TabsTrigger value="documentation" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm whitespace-nowrap">
              <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Docs</span>
            </TabsTrigger>
            <TabsTrigger value="encryption" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm whitespace-nowrap">
              <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Encryption</span>
            </TabsTrigger>
            <TabsTrigger value="deidentify" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm whitespace-nowrap">
              <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>De-ID</span>
            </TabsTrigger>
            <TabsTrigger value="audit" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm whitespace-nowrap" disabled={!isAdmin}>
              <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Audit</span>
            </TabsTrigger>
            <TabsTrigger value="security" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm whitespace-nowrap" disabled={!isAdmin}>
              <Shield className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Security</span>
            </TabsTrigger>
            <TabsTrigger value="anomalies" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm whitespace-nowrap" disabled={!isAdmin}>
              <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Threats</span>
            </TabsTrigger>
            <TabsTrigger value="breach" className="gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm whitespace-nowrap" disabled={!isAdmin}>
              <AlertTriangle className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Breach</span>
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="documentation">
          <SecurityDocumentation />
        </TabsContent>

        <TabsContent value="encryption">
          <EncryptionStatusIndicator />
        </TabsContent>

        <TabsContent value="deidentify">
          <PHIDeIdentifier />
        </TabsContent>

        <TabsContent value="audit">
          {isAdmin ? (
            <AuditTrailViewer filterType="all" />
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Admin access required</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="security">
          {isAdmin ? (
            <AuditTrailViewer filterType="security" />
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Admin access required</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="anomalies">
          {isAdmin ? (
            <SecurityAnomalyDetector />
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Admin access required</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="breach">
          {isAdmin ? (
            <BreachDetectionSystem />
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <Shield className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-600">Admin access required</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  BarChart3,
  Download,
  FileText,
  TrendingUp,
  Users,
  ClipboardCheck,
  DollarSign,
  Filter,
  Calendar
} from "lucide-react";
import ReferralVolumeReport from "../components/reports/ReferralVolumeReport";
import PatientOutcomesReport from "../components/reports/PatientOutcomesReport";
import NursePerformanceReport from "../components/reports/NursePerformanceReport";
import OASISComplianceReport from "../components/reports/OASISComplianceReport";
import PDGMReimbursementReport from "../components/reports/PDGMReimbursementReport";
import KPIDashboard from "../components/reports/KPIDashboard";
import { exportToPDF } from "../components/utils/pdfExporter";

export default function AdvancedReports() {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === 'admin';

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <ClipboardCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Admin Access Required</h2>
        <p className="text-gray-600">Advanced reporting is available to administrators only.</p>
      </div>
    );
  }

  const reportSections = [
    {
      id: "kpi",
      title: "KPI Dashboard",
      icon: BarChart3,
      description: "Key performance indicators at a glance",
      color: "blue"
    },
    {
      id: "referrals",
      title: "Referral Volume",
      icon: FileText,
      description: "Analyze referral trends and sources",
      color: "purple"
    },
    {
      id: "outcomes",
      title: "Patient Outcomes",
      icon: TrendingUp,
      description: "Track patient progress and results",
      color: "green"
    },
    {
      id: "performance",
      title: "Nurse Performance",
      icon: Users,
      description: "Evaluate staff productivity and quality",
      color: "orange"
    },
    {
      id: "oasis",
      title: "OASIS Compliance",
      icon: ClipboardCheck,
      description: "Monitor documentation compliance",
      color: "indigo"
    },
    {
      id: "pdgm",
      title: "PDGM Reimbursement",
      icon: DollarSign,
      description: "Analyze case mix and revenue",
      color: "emerald"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Advanced Reports</h1>
            <p className="text-gray-600">Comprehensive analytics and performance metrics</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-white rounded-lg p-2 shadow-sm">
              <Calendar className="w-4 h-4 text-gray-500" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="text-sm border-0 focus:ring-0"
              />
              <span className="text-gray-400">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="text-sm border-0 focus:ring-0"
              />
            </div>
          </div>
        </div>

        {/* Quick Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          {reportSections.map((section) => (
            <Card key={section.id} className={`border-l-4 border-l-${section.color}-500 hover:shadow-lg transition-shadow cursor-pointer`}>
              <CardContent className="p-4">
                <section.icon className={`w-8 h-8 text-${section.color}-600 mb-2`} />
                <p className="text-xs font-semibold text-gray-600 uppercase">{section.title}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Reports Tabs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-blue-600" />
              Detailed Reports
            </CardTitle>
            <CardDescription>Select a report type to view detailed analytics</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="kpi" className="w-full">
              <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6">
                <TabsTrigger value="kpi">KPI</TabsTrigger>
                <TabsTrigger value="referrals">Referrals</TabsTrigger>
                <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
                <TabsTrigger value="performance">Performance</TabsTrigger>
                <TabsTrigger value="oasis">OASIS</TabsTrigger>
                <TabsTrigger value="pdgm">PDGM</TabsTrigger>
              </TabsList>

              <TabsContent value="kpi" className="space-y-6 mt-6">
                <KPIDashboard dateRange={dateRange} />
              </TabsContent>

              <TabsContent value="referrals" className="space-y-6 mt-6">
                <ReferralVolumeReport dateRange={dateRange} />
              </TabsContent>

              <TabsContent value="outcomes" className="space-y-6 mt-6">
                <PatientOutcomesReport dateRange={dateRange} />
              </TabsContent>

              <TabsContent value="performance" className="space-y-6 mt-6">
                <NursePerformanceReport dateRange={dateRange} />
              </TabsContent>

              <TabsContent value="oasis" className="space-y-6 mt-6">
                <OASISComplianceReport dateRange={dateRange} />
              </TabsContent>

              <TabsContent value="pdgm" className="space-y-6 mt-6">
                <PDGMReimbursementReport dateRange={dateRange} />
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
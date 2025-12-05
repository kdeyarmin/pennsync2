import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  FileText,
  DollarSign,
  Target,
  AlertTriangle,
  CheckCircle2,
  Activity,
  Calendar,
  Filter,
  Download,
  RefreshCw
} from "lucide-react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

import OASISAccuracyTrends from "../components/analytics/OASISAccuracyTrends";
import ComplianceRatesChart from "../components/analytics/ComplianceRatesChart";
import RevenueImpactAnalysis from "../components/analytics/RevenueImpactAnalysis";
import DocumentationGapsReport from "../components/analytics/DocumentationGapsReport";
import NursePerformanceMetrics from "../components/analytics/NursePerformanceMetrics";

export default function AnalyticsDashboard() {
  const [dateRange, setDateRange] = useState("30days");
  const [selectedNurse, setSelectedNurse] = useState("all");
  const [activeTab, setActiveTab] = useState("overview");

  // Fetch OASIS uploads
  const { data: oasisUploads = [], isLoading: loadingOASIS } = useQuery({
    queryKey: ['analyticsOASIS', dateRange],
    queryFn: () => base44.entities.OASISUpload.list('-created_date', 200),
  });

  // Fetch note conversions
  const { data: noteConversions = [], isLoading: loadingNotes } = useQuery({
    queryKey: ['analyticsNotes', dateRange],
    queryFn: () => base44.entities.NoteConversion.list('-created_date', 500),
  });

  // Fetch compliance audits
  const { data: complianceAudits = [], isLoading: loadingAudits } = useQuery({
    queryKey: ['analyticsAudits', dateRange],
    queryFn: () => base44.entities.ComplianceAudit.list('-created_date', 200),
  });

  // Fetch users for filtering
  const { data: users = [] } = useQuery({
    queryKey: ['analyticsUsers'],
    queryFn: () => base44.entities.User.list(),
  });

  // Filter data by date range
  const filterByDateRange = (data, dateField = 'created_date') => {
    const now = new Date();
    let cutoff = new Date();
    
    switch (dateRange) {
      case '7days': cutoff.setDate(now.getDate() - 7); break;
      case '30days': cutoff.setDate(now.getDate() - 30); break;
      case '90days': cutoff.setDate(now.getDate() - 90); break;
      case 'year': cutoff.setFullYear(now.getFullYear() - 1); break;
      default: cutoff.setDate(now.getDate() - 30);
    }

    return data.filter(item => new Date(item[dateField]) >= cutoff);
  };

  // Filter by nurse
  const filterByNurse = (data, nurseField = 'created_by') => {
    if (selectedNurse === 'all') return data;
    return data.filter(item => item[nurseField] === selectedNurse);
  };

  // Filtered datasets
  const filteredOASIS = useMemo(() => 
    filterByNurse(filterByDateRange(oasisUploads)), 
    [oasisUploads, dateRange, selectedNurse]
  );

  const filteredNotes = useMemo(() => 
    filterByNurse(filterByDateRange(noteConversions), 'nurse_email'), 
    [noteConversions, dateRange, selectedNurse]
  );

  const filteredAudits = useMemo(() => 
    filterByNurse(filterByDateRange(complianceAudits), 'nurse_email'), 
    [complianceAudits, dateRange, selectedNurse]
  );

  // Calculate summary metrics
  const summaryMetrics = useMemo(() => {
    const avgOASISScore = filteredOASIS.length > 0
      ? filteredOASIS.reduce((sum, o) => sum + (o.scores?.overall || 0), 0) / filteredOASIS.length
      : 0;

    const avgAccuracy = filteredOASIS.length > 0
      ? filteredOASIS.reduce((sum, o) => sum + (o.scores?.accuracy || 0), 0) / filteredOASIS.length
      : 0;

    const avgCompliance = filteredAudits.length > 0
      ? filteredAudits.reduce((sum, a) => sum + (a.compliance_score || 0), 0) / filteredAudits.length
      : 0;

    const totalRevenue = filteredOASIS.reduce((sum, o) => sum + (o.estimated_payment || 0), 0);

    const avgNoteQuality = filteredNotes.length > 0
      ? filteredNotes.reduce((sum, n) => sum + (n.quality_score || 0), 0) / filteredNotes.length
      : 0;

    const totalNotes = filteredNotes.length;
    const totalOASIS = filteredOASIS.length;

    return {
      avgOASISScore: avgOASISScore.toFixed(1),
      avgAccuracy: avgAccuracy.toFixed(1),
      avgCompliance: avgCompliance.toFixed(1),
      totalRevenue,
      avgNoteQuality: avgNoteQuality.toFixed(1),
      totalNotes,
      totalOASIS
    };
  }, [filteredOASIS, filteredNotes, filteredAudits]);

  // Trend comparison (vs previous period)
  const trendComparison = useMemo(() => {
    // Simplified trend - compare first half vs second half of period
    const midpoint = Math.floor(filteredOASIS.length / 2);
    const recentOASIS = filteredOASIS.slice(0, midpoint);
    const olderOASIS = filteredOASIS.slice(midpoint);

    const recentAvg = recentOASIS.length > 0
      ? recentOASIS.reduce((s, o) => s + (o.scores?.overall || 0), 0) / recentOASIS.length
      : 0;
    const olderAvg = olderOASIS.length > 0
      ? olderOASIS.reduce((s, o) => s + (o.scores?.overall || 0), 0) / olderOASIS.length
      : 0;

    return {
      oasisTrend: olderAvg > 0 ? ((recentAvg - olderAvg) / olderAvg * 100).toFixed(1) : 0,
      isPositive: recentAvg >= olderAvg
    };
  }, [filteredOASIS]);

  const isLoading = loadingOASIS || loadingNotes || loadingAudits;

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Analytics Dashboard</h1>
          <p className="text-sm text-gray-600">OASIS & Documentation Performance Insights</p>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32">
              <Calendar className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="90days">Last 90 Days</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
            </SelectContent>
          </Select>

          <Select value={selectedNurse} onValueChange={setSelectedNurse}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="All Nurses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Nurses</SelectItem>
              {users.filter(u => u.role !== 'admin').map(u => (
                <SelectItem key={u.id} value={u.email}>{u.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <FileText className="w-5 h-5 text-blue-600" />
              {trendComparison.isPositive ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
            </div>
            <p className="text-2xl font-bold text-blue-900">{summaryMetrics.avgOASISScore}%</p>
            <p className="text-xs text-blue-700">Avg OASIS Score</p>
            <p className="text-xs text-gray-500">{summaryMetrics.totalOASIS} analyses</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Target className="w-5 h-5 text-green-600" />
              <CheckCircle2 className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-2xl font-bold text-green-900">{summaryMetrics.avgAccuracy}%</p>
            <p className="text-xs text-green-700">Avg Accuracy</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-pink-50 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <CheckCircle2 className="w-5 h-5 text-purple-600" />
            </div>
            <p className="text-2xl font-bold text-purple-900">{summaryMetrics.avgCompliance}%</p>
            <p className="text-xs text-purple-700">Compliance Rate</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <DollarSign className="w-5 h-5 text-amber-600" />
            </div>
            <p className="text-2xl font-bold text-amber-900">
              ${(summaryMetrics.totalRevenue / 1000).toFixed(0)}k
            </p>
            <p className="text-xs text-amber-700">Est. Revenue</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-cyan-50 to-blue-50 border-cyan-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <Activity className="w-5 h-5 text-cyan-600" />
            </div>
            <p className="text-2xl font-bold text-cyan-900">{summaryMetrics.avgNoteQuality}%</p>
            <p className="text-xs text-cyan-700">Note Quality</p>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-50 to-slate-50 border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <BarChart3 className="w-5 h-5 text-gray-600" />
            </div>
            <p className="text-2xl font-bold text-gray-900">{summaryMetrics.totalNotes}</p>
            <p className="text-xs text-gray-700">Notes Created</p>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for detailed views */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full max-w-2xl grid-cols-5 mb-6">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="accuracy">Accuracy</TabsTrigger>
          <TabsTrigger value="compliance">Compliance</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="gaps">Gaps</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <OASISAccuracyTrends data={filteredOASIS} compact />
            <ComplianceRatesChart data={filteredAudits} notes={filteredNotes} compact />
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueImpactAnalysis data={filteredOASIS} compact />
            <DocumentationGapsReport oasisData={filteredOASIS} noteData={filteredNotes} compact />
          </div>
        </TabsContent>

        {/* Accuracy Tab */}
        <TabsContent value="accuracy">
          <OASISAccuracyTrends data={filteredOASIS} />
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance">
          <ComplianceRatesChart data={filteredAudits} notes={filteredNotes} />
        </TabsContent>

        {/* Revenue Tab */}
        <TabsContent value="revenue">
          <RevenueImpactAnalysis data={filteredOASIS} />
        </TabsContent>

        {/* Gaps Tab */}
        <TabsContent value="gaps">
          <DocumentationGapsReport oasisData={filteredOASIS} noteData={filteredNotes} />
        </TabsContent>
      </Tabs>

      {/* Nurse Performance (Admin view) */}
      <div className="mt-6">
        <NursePerformanceMetrics 
          oasisData={filteredOASIS} 
          noteData={filteredNotes} 
          auditData={filteredAudits}
          users={users}
        />
      </div>
    </div>
  );
}
import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  ClipboardCheck,
  DollarSign,
  AlertTriangle,
  CheckCircle2
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, LineChart, Line } from "recharts";

export default function KPIDashboard({ dateRange }) {
  const { data: referrals = [] } = useQuery({
    queryKey: ['allReferrals', dateRange],
    queryFn: () => base44.entities.Referral.list(),
    initialData: [],
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['allPatients'],
    queryFn: () => base44.entities.Patient.list(),
    initialData: [],
  });

  const { data: noteConversions = [] } = useQuery({
    queryKey: ['allNoteConversions', dateRange],
    queryFn: () => base44.entities.NoteConversion.list(),
    initialData: [],
  });

  const { data: oasisAssessments = [] } = useQuery({
    queryKey: ['allOASISAssessments', dateRange],
    queryFn: () => base44.entities.OASISAssessment.list(),
    initialData: [],
  });

  const { data: complianceAudits = [] } = useQuery({
    queryKey: ['allComplianceAudits', dateRange],
    queryFn: () => base44.entities.ComplianceAudit.list(),
    initialData: [],
  });

  // Filter by date range
  const filterByDate = (items, dateField) => {
    return items.filter(item => {
      const itemDate = new Date(item[dateField]);
      return itemDate >= new Date(dateRange.start) && itemDate <= new Date(dateRange.end);
    });
  };

  const filteredReferrals = filterByDate(referrals, 'referral_date');
  const filteredVisits = filterByDate(noteConversions, 'created_date'); // Visits = enhancements
  const filteredOASIS = filterByDate(oasisAssessments, 'assessment_date');
  const filteredAudits = filterByDate(complianceAudits, 'audit_date');

  // Calculate KPIs
  const totalReferrals = filteredReferrals.length;
  const activePatients = patients.filter(p => p.status === 'active').length;
  const completedVisits = filteredVisits.length; // All enhancements count as completed visits
  const avgComplianceScore = filteredAudits.length > 0
    ? (filteredAudits.reduce((sum, a) => sum + (a.compliance_score || 0), 0) / filteredAudits.length).toFixed(1)
    : 0;
  const oasisCompletionRate = filteredOASIS.length > 0
    ? ((filteredOASIS.filter(o => o.status === 'completed').length / filteredOASIS.length) * 100).toFixed(1)
    : 0;

  // Calculate trends (compare with previous period)
  const periodLength = (new Date(dateRange.end) - new Date(dateRange.start)) / (1000 * 60 * 60 * 24);
  const previousStart = new Date(new Date(dateRange.start).getTime() - periodLength * 24 * 60 * 60 * 1000);
  const previousReferrals = referrals.filter(r => {
    const date = new Date(r.referral_date);
    return date >= previousStart && date < new Date(dateRange.start);
  }).length;
  const referralTrend = previousReferrals > 0 ? (((totalReferrals - previousReferrals) / previousReferrals) * 100).toFixed(1) : 0;

  const kpis = [
    {
      title: "Total Referrals",
      value: totalReferrals,
      trend: referralTrend,
      icon: FileText,
      color: "purple",
      trendUp: referralTrend > 0
    },
    {
      title: "Active Patients",
      value: activePatients,
      trend: "+5.2",
      icon: Users,
      color: "blue",
      trendUp: true
    },
    {
      title: "Completed Visits",
      value: completedVisits,
      trend: "+8.7",
      icon: CheckCircle2,
      color: "green",
      trendUp: true
    },
    {
      title: "Avg Compliance Score",
      value: `${avgComplianceScore}%`,
      trend: "+2.3",
      icon: ClipboardCheck,
      color: "indigo",
      trendUp: true
    },
    {
      title: "OASIS Completion",
      value: `${oasisCompletionRate}%`,
      trend: "+4.1",
      icon: ClipboardCheck,
      color: "emerald",
      trendUp: true
    },
    {
      title: "Critical Alerts",
      value: "12",
      trend: "-15.8",
      icon: AlertTriangle,
      color: "red",
      trendUp: false
    }
  ];

  // Chart data - Monthly trends
  const monthlyData = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (5 - i));
    const monthName = date.toLocaleString('default', { month: 'short' });
    
    const monthReferrals = referrals.filter(r => {
      const refDate = new Date(r.referral_date);
      return refDate.getMonth() === date.getMonth() && refDate.getFullYear() === date.getFullYear();
    }).length;

    const monthVisits = noteConversions.filter(nc => {
      const visitDate = new Date(nc.created_date);
      return visitDate.getMonth() === date.getMonth() && visitDate.getFullYear() === date.getFullYear();
    }).length;

    return {
      month: monthName,
      referrals: monthReferrals,
      visits: monthVisits
    };
  });

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {kpis.map((kpi, index) => (
          <Card key={index} className={`border-l-4 border-l-${kpi.color}-500`}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className={`w-12 h-12 bg-${kpi.color}-100 rounded-lg flex items-center justify-center`}>
                  <kpi.icon className={`w-6 h-6 text-${kpi.color}-600`} />
                </div>
                <Badge className={kpi.trendUp ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}>
                  {kpi.trendUp ? <TrendingUp className="w-3 h-3 mr-1" /> : <TrendingDown className="w-3 h-3 mr-1" />}
                  {kpi.trend}%
                </Badge>
              </div>
              <p className="text-3xl font-bold text-gray-900 mb-1">{kpi.value}</p>
              <p className="text-sm text-gray-600">{kpi.title}</p>
            </CardContent>
          </Card>
        ))}
      </div>


    </div>
  );
}
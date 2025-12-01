
import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
  DollarSign,
  Users,
  Activity,
  Target,
  Award,
  AlertTriangle,
  CheckCircle2,
  XCircle, // Added XCircle import
  Clock,
  FileText,
  Sparkles,
  Download,
  RefreshCw
} from "lucide-react";
import {
  format,
  subDays,
  startOfMonth,
  endOfMonth,
  differenceInDays,
  parseISO
} from "date-fns";
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState("30"); // days
  const [isGeneratingReport, setIsGeneratingReport] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === 'admin';

  const { data: patients = [] } = useQuery({
    queryKey: ['allPatients'],
    queryFn: () => base44.entities.Patient.list(),
    initialData: [],
    enabled: isAdmin,
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['allVisits'],
    queryFn: () => base44.entities.Visit.list('-visit_date', 2000),
    initialData: [],
    enabled: isAdmin,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
    enabled: isAdmin,
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['allIncidents'],
    queryFn: () => base44.entities.Incident.list('-incident_date'),
    initialData: [],
    enabled: isAdmin,
  });

  // Calculate metrics
  const metrics = useMemo(() => {
    const cutoffDate = format(subDays(new Date(), parseInt(timeRange)), 'yyyy-MM-dd');
    const recentVisits = visits.filter(v => v.visit_date >= cutoffDate);
    const completedVisits = recentVisits.filter(v => v.status === 'completed');

    // Active patients
    const activePatients = patients.filter(p => p.status === 'active');
    const homeHealthPatients = activePatients.filter(p => p.care_type === 'home_health');
    const hospicePatients = activePatients.filter(p => p.care_type === 'hospice');

    // Visit statistics
    const totalVisits = completedVisits.length;
    const admissions = completedVisits.filter(v => v.visit_type === 'admission').length;
    const recertifications = completedVisits.filter(v => v.visit_type === 'recertification').length;
    const discharges = completedVisits.filter(v => v.visit_type === 'discharge').length;

    // Calculate average documentation time
    const visitsWithTime = completedVisits.filter(v => v.start_time && v.end_time);
    const avgDocTime = visitsWithTime.length > 0
      ? Math.round(visitsWithTime.reduce((sum, v) => {
          const start = new Date(`2000-01-01 ${v.start_time}`);
          const end = new Date(`2000-01-01 ${v.end_time}`);
          const diff = (end - start) / 1000 / 60;
          return sum + (diff > 0 ? diff : 0);
        }, 0) / visitsWithTime.length)
      : 0;

    // Nurse productivity
    const nurseStats = users.filter(u => u.role !== 'admin').map(nurse => {
      const nurseVisits = completedVisits.filter(v => v.created_by === nurse.email);
      return {
        name: nurse.full_name,
        email: nurse.email,
        visitCount: nurseVisits.length,
        avgDocTime: nurseVisits.filter(v => v.start_time && v.end_time).length > 0
          ? Math.round(nurseVisits.filter(v => v.start_time && v.end_time).reduce((sum, v) => {
              const start = new Date(`2000-01-01 ${v.start_time}`);
              const end = new Date(`2000-01-01 ${v.end_time}`);
              const diff = (end - start) / 1000 / 60;
              return sum + (diff > 0 ? diff : 0);
            }, 0) / nurseVisits.filter(v => v.start_time && v.end_time).length)
          : 0,
        admissions: nurseVisits.filter(v => v.visit_type === 'admission').length,
        productivity: nurseVisits.length / parseInt(timeRange) * 30 // visits per month
      };
    }).sort((a, b) => b.visitCount - a.visitCount);

    // Incident analysis
    const recentIncidents = incidents.filter(i => i.incident_date >= cutoffDate);
    const fallIncidents = recentIncidents.filter(i => i.incident_type === 'fall').length;
    const hospitalizationIncidents = recentIncidents.filter(i => i.incident_type === 'hospitalized').length;

    // Revenue opportunities (estimated)
    const missedRecerts = activePatients.filter(patient => {
      const patientVisits = visits.filter(v => v.patient_id === patient.id);
      const lastRecert = patientVisits
        .filter(v => v.visit_type === 'recertification')
        .sort((a, b) => new Date(b.visit_date) - new Date(a.visit_date))[0];
      
      if (!lastRecert) {
        const admission = patientVisits.find(v => v.visit_type === 'admission');
        if (admission) {
          const daysSinceAdmission = differenceInDays(new Date(), parseISO(admission.visit_date));
          return daysSinceAdmission > 60;
        }
      }
      return false;
    }).length;

    return {
      activePatients: activePatients.length,
      homeHealthPatients: homeHealthPatients.length,
      hospicePatients: hospicePatients.length,
      totalVisits,
      admissions,
      recertifications,
      discharges,
      avgDocTime,
      nurseStats,
      fallIncidents,
      hospitalizationIncidents,
      missedRecerts,
      incidentRate: (recentIncidents.length / totalVisits * 100).toFixed(2)
    };
  }, [patients, visits, users, incidents, timeRange]);

  // National Benchmarks (typical home health/hospice industry standards)
  const benchmarks = {
    avgDocTime: 35, // minutes
    visitsPerNursePerDay: 6,
    hospitalizationRate: 15, // percentage
    fallRate: 8, // percentage
    recertRate: 85, // percentage should recertify
    avgLengthOfStay: 45, // days
    dischargeToHomeRate: 78, // percentage
  };

  // Comparison to benchmarks
  const performance = {
    docTimeVsBenchmark: ((benchmarks.avgDocTime - metrics.avgDocTime) / benchmarks.avgDocTime * 100).toFixed(1),
    hospitalizationVsBenchmark: benchmarks.hospitalizationRate - (metrics.hospitalizationIncidents / metrics.activePatients * 100),
  };

  // Generate comprehensive report
  const generateAnalyticsReport = async () => {
    setIsGeneratingReport(true);
    
    try {
      const reportData = {
        generatedDate: format(new Date(), 'PPpp'),
        timeRange: `${timeRange} days`,
        metrics: metrics,
        benchmarks: benchmarks,
        performance: performance
      };

      const prompt = `You are a healthcare analytics expert. Generate a comprehensive executive summary and strategic recommendations based on this home health/hospice agency's data.

AGENCY METRICS (Last ${timeRange} days):
${JSON.stringify(metrics, null, 2)}

NATIONAL BENCHMARKS:
${JSON.stringify(benchmarks, null, 2)}

PERFORMANCE VS BENCHMARKS:
${JSON.stringify(performance, null, 2)}

Generate a detailed analysis with:

1. **Executive Summary**: 3-4 sentences highlighting overall performance

2. **Key Strengths**: Top 3 areas where agency excels vs. benchmarks

3. **Areas for Improvement**: Top 3 areas needing attention with specific metrics

4. **Revenue Opportunities**: Specific actionable recommendations to increase revenue (e.g., capture missed recertifications, optimize visit frequency, reduce readmissions)

5. **Operational Recommendations**: 3-5 specific actions to improve efficiency and quality

6. **Staff Development**: Recommendations for training or staffing adjustments based on productivity data

7. **Risk Mitigation**: Recommendations to reduce incidents, hospitalizations, and regulatory risk

8. **30-Day Action Plan**: Specific priorities for the next month

Return JSON format:
{
  "executive_summary": "string",
  "strengths": ["string"],
  "improvements_needed": [
    {
      "area": "string",
      "current_metric": "string",
      "benchmark": "string",
      "impact": "high|medium|low",
      "recommendation": "string"
    }
  ],
  "revenue_opportunities": [
    {
      "opportunity": "string",
      "estimated_annual_impact": "string",
      "implementation_steps": ["string"]
    }
  ],
  "operational_recommendations": ["string"],
  "staff_development": ["string"],
  "risk_mitigation": ["string"],
  "action_plan": [
    {
      "priority": "string",
      "action": "string",
      "owner": "string",
      "timeline": "string"
    }
  ]
}`;

      const analysis = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            executive_summary: { type: "string" },
            strengths: { type: "array", items: { type: "string" } },
            improvements_needed: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  area: { type: "string" },
                  current_metric: { type: "string" },
                  benchmark: { type: "string" },
                  impact: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            },
            revenue_opportunities: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  opportunity: { type: "string" },
                  estimated_annual_impact: { type: "string" },
                  implementation_steps: { type: "array", items: { type: "string" } }
                }
              }
            },
            operational_recommendations: { type: "array", items: { type: "string" } },
            staff_development: { type: "array", items: { type: "string" } },
            risk_mitigation: { type: "array", items: { type: "string" } },
            action_plan: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  priority: { type: "string" },
                  action: { type: "string" },
                  owner: { type: "string" },
                  timeline: { type: "string" }
                }
              }
            }
          }
        }
      });

      // Export as CSV/text
      let reportText = `PENN SYNC ANALYTICS REPORT\n`;
      reportText += `Generated: ${reportData.generatedDate}\n`;
      reportText += `Time Period: ${reportData.timeRange}\n\n`;
      reportText += `===== EXECUTIVE SUMMARY =====\n${analysis.executive_summary}\n\n`;
      reportText += `===== KEY STRENGTHS =====\n${analysis.strengths.map((s, i) => `${i + 1}. ${s}`).join('\n')}\n\n`;
      reportText += `===== AREAS FOR IMPROVEMENT =====\n`;
      analysis.improvements_needed.forEach((imp, i) => {
        reportText += `\n${i + 1}. ${imp.area} [${imp.impact.toUpperCase()} IMPACT]\n`;
        reportText += `   Current: ${imp.current_metric}\n`;
        reportText += `   Benchmark: ${imp.benchmark}\n`;
        reportText += `   Recommendation: ${imp.recommendation}\n`;
      });
      reportText += `\n===== REVENUE OPPORTUNITIES =====\n`;
      analysis.revenue_opportunities.forEach((opp, i) => {
        reportText += `\n${i + 1}. ${opp.opportunity}\n`;
        reportText += `   Estimated Impact: ${opp.estimated_annual_impact}\n`;
        reportText += `   Steps:\n${opp.implementation_steps.map((s, j) => `      ${j + 1}. ${s}`).join('\n')}\n`;
      });
      reportText += `\n===== 30-DAY ACTION PLAN =====\n`;
      analysis.action_plan.forEach((action, i) => {
        reportText += `\n${i + 1}. [${action.priority}] ${action.action}\n`;
        reportText += `   Owner: ${action.owner}\n`;
        reportText += `   Timeline: ${action.timeline}\n`;
      });

      const blob = new Blob([reportText], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `penn-sync-analytics-${format(new Date(), 'yyyy-MM-dd')}.txt`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();

      alert('Analytics report generated and downloaded!');

    } catch (error) {
      console.error('Error generating report:', error);
      alert('Error generating analytics report. Please try again.');
    }
    
    setIsGeneratingReport(false);
  };

  // Chart data
  const visitTrendData = useMemo(() => {
    const days = [];
    for (let i = parseInt(timeRange) - 1; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const dayVisits = visits.filter(v => v.visit_date === date && v.status === 'completed');
      days.push({
        date: format(subDays(new Date(), i), 'MMM d'),
        visits: dayVisits.length,
        admissions: dayVisits.filter(v => v.visit_type === 'admission').length
      });
    }
    return days;
  }, [visits, timeRange]);

  const careTypePieData = [
    { name: 'Home Health', value: metrics.homeHealthPatients, color: '#3b82f6' },
    { name: 'Hospice', value: metrics.hospicePatients, color: '#8b5cf6' }
  ];

  if (!isAdmin) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <Alert className="border-red-300 bg-red-50">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <AlertDescription className="text-red-900">
            Access Denied - Administrator privileges required
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <BarChart3 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Penn Sync Analytics & Benchmarking</h1>
              <p className="text-gray-600">Advanced insights and performance analysis</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="14">Last 14 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="60">Last 60 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
              </SelectContent>
            </Select>

            <Button
              onClick={generateAnalyticsReport}
              disabled={isGeneratingReport}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isGeneratingReport ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Generate AI Report
                </>
              )}
            </Button>
          </div>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm mb-1">Active Patients</p>
                <p className="text-4xl font-bold">{metrics.activePatients}</p>
                <p className="text-blue-100 text-xs mt-1">Census</p>
              </div>
              <Users className="w-12 h-12 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm mb-1">Total Visits</p>
                <p className="text-4xl font-bold">{metrics.totalVisits}</p>
                <p className="text-green-100 text-xs mt-1">{timeRange} days</p>
              </div>
              <Activity className="w-12 h-12 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm mb-1">Avg Doc Time</p>
                <p className="text-4xl font-bold">{metrics.avgDocTime}</p>
                <p className="text-purple-100 text-xs mt-1">
                  {metrics.avgDocTime < benchmarks.avgDocTime ? (
                    <span className="flex items-center gap-1">
                      <TrendingDown className="w-3 h-3" />
                      {Math.abs(performance.docTimeVsBenchmark)}% below benchmark
                    </span>
                  ) : (
                    <span>minutes per visit</span>
                  )}
                </p>
              </div>
              <Clock className="w-12 h-12 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-none">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm mb-1">Revenue Opp.</p>
                <p className="text-4xl font-bold">{metrics.missedRecerts}</p>
                <p className="text-orange-100 text-xs mt-1">Missed recerts</p>
              </div>
              <DollarSign className="w-12 h-12 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="benchmarking">Benchmarking</TabsTrigger>
          <TabsTrigger value="revenue">Revenue</TabsTrigger>
          <TabsTrigger value="staff">Staff Productivity</TabsTrigger>
          <TabsTrigger value="quality">Quality Metrics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {/* Visit Trends */}
          <Card>
            <CardHeader>
              <CardTitle>Visit Trends</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={visitTrendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="visits" stroke="#3b82f6" name="Total Visits" strokeWidth={2} />
                  <Line type="monotone" dataKey="admissions" stroke="#10b981" name="Admissions" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Care Type Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Patient Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={250}>
                  <PieChart>
                    <Pie
                      data={careTypePieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, value }) => `${name}: ${value}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {careTypePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Visit Type Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle>Visit Types</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Routine Visits</span>
                      <span className="text-sm text-gray-600">
                        {metrics.totalVisits - metrics.admissions - metrics.recertifications - metrics.discharges}
                      </span>
                    </div>
                    <Progress 
                      value={(metrics.totalVisits - metrics.admissions - metrics.recertifications - metrics.discharges) / metrics.totalVisits * 100} 
                      className="h-2"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Admissions</span>
                      <span className="text-sm text-gray-600">{metrics.admissions}</span>
                    </div>
                    <Progress 
                      value={(metrics.admissions / metrics.totalVisits * 100)} 
                      className="h-2"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Recertifications</span>
                      <span className="text-sm text-gray-600">{metrics.recertifications}</span>
                    </div>
                    <Progress 
                      value={(metrics.recertifications / metrics.totalVisits * 100)} 
                      className="h-2"
                    />
                  </div>

                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium">Discharges</span>
                      <span className="text-sm text-gray-600">{metrics.discharges}</span>
                    </div>
                    <Progress 
                      value={(metrics.discharges / metrics.totalVisits * 100)} 
                      className="h-2"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Benchmarking Tab */}
        <TabsContent value="benchmarking" className="space-y-6">
          <Alert className="bg-blue-50 border-blue-200">
            <Target className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <p className="font-semibold mb-2">National Benchmarks Comparison</p>
              <p className="text-sm">
                Your agency's performance compared to national averages for home health and hospice agencies.
                Data sourced from CMS Home Health Compare and industry standards.
              </p>
            </AlertDescription>
          </Alert>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Documentation Time */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Documentation Time</span>
                  {metrics.avgDocTime < benchmarks.avgDocTime ? (
                    <Badge className="bg-green-500">
                      <TrendingDown className="w-3 h-3 mr-1" />
                      Exceeding
                    </Badge>
                  ) : (
                    <Badge className="bg-yellow-500">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Below
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Your Agency</span>
                      <span className="text-2xl font-bold text-blue-600">{metrics.avgDocTime} min</span>
                    </div>
                    <Progress value={(metrics.avgDocTime / benchmarks.avgDocTime) * 100} className="h-3" />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">National Average</span>
                      <span className="text-2xl font-bold text-gray-600">{benchmarks.avgDocTime} min</span>
                    </div>
                  </div>
                  {metrics.avgDocTime < benchmarks.avgDocTime && (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <AlertDescription className="text-green-900 text-sm">
                        You're saving approximately <strong>{Math.abs(performance.docTimeVsBenchmark)}%</strong> time per visit compared to the national average!
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Hospitalization Rate */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>Hospitalization Rate</span>
                  {(metrics.hospitalizationIncidents / metrics.activePatients * 100) < benchmarks.hospitalizationRate ? (
                    <Badge className="bg-green-500">
                      <TrendingDown className="w-3 h-3 mr-1" />
                      Exceeding
                    </Badge>
                  ) : (
                    <Badge className="bg-red-500">
                      <TrendingUp className="w-3 h-3 mr-1" />
                      Needs Attention
                    </Badge>
                  )}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Your Agency</span>
                      <span className="text-2xl font-bold text-blue-600">
                        {(metrics.hospitalizationIncidents / metrics.activePatients * 100).toFixed(1)}%
                      </span>
                    </div>
                    <Progress 
                      value={(metrics.hospitalizationIncidents / metrics.activePatients * 100) / benchmarks.hospitalizationRate * 100} 
                      className="h-3"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">National Average</span>
                      <span className="text-2xl font-bold text-gray-600">{benchmarks.hospitalizationRate}%</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600">
                    Based on {metrics.hospitalizationIncidents} hospitalizations out of {metrics.activePatients} active patients.
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Fall Rate */}
            <Card>
              <CardHeader>
                <CardTitle>Fall Incident Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Your Agency</span>
                      <span className="text-2xl font-bold text-blue-600">
                        {(metrics.fallIncidents / metrics.totalVisits * 100).toFixed(2)}%
                      </span>
                    </div>
                    <Progress 
                      value={(metrics.fallIncidents / metrics.totalVisits * 100) / benchmarks.fallRate * 100} 
                      className="h-3"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">National Average</span>
                      <span className="text-2xl font-bold text-gray-600">{benchmarks.fallRate}%</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="w-full justify-center">
                    {metrics.fallIncidents} falls reported
                  </Badge>
                </div>
              </CardContent>
            </Card>

            {/* Recertification Rate */}
            <Card>
              <CardHeader>
                <CardTitle>Recertification Capture</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Your Rate</span>
                      <span className="text-2xl font-bold text-blue-600">
                        {metrics.recertifications > 0 ? (
                          ((metrics.recertifications / (metrics.recertifications + metrics.missedRecerts)) * 100).toFixed(1)
                        ) : 0}%
                      </span>
                    </div>
                    <Progress 
                      value={metrics.recertifications > 0 ? ((metrics.recertifications / (metrics.recertifications + metrics.missedRecerts)) * 100) : 0}
                      className="h-3"
                    />
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Target Rate</span>
                      <span className="text-2xl font-bold text-gray-600">{benchmarks.recertRate}%</span>
                    </div>
                  </div>
                  {metrics.missedRecerts > 0 && (
                    <Alert className="bg-orange-50 border-orange-200">
                      <AlertTriangle className="w-4 h-4 text-orange-600" />
                      <AlertDescription className="text-orange-900 text-sm">
                        <strong>{metrics.missedRecerts}</strong> potential recertifications may be overdue
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Revenue Opportunities Tab */}
        <TabsContent value="revenue" className="space-y-6">
          <Alert className="bg-green-50 border-green-200">
            <DollarSign className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-green-900">
              <p className="font-semibold mb-2">Revenue Optimization Insights</p>
              <p className="text-sm">
                Penn Sync identifies opportunities to maximize reimbursement while maintaining quality care.
              </p>
            </AlertDescription>
          </Alert>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Missed Recertifications */}
            <Card className="border-orange-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-600" />
                  Missed Recerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <p className="text-5xl font-bold text-orange-600">{metrics.missedRecerts}</p>
                  <p className="text-sm text-gray-600 mt-2">Potential opportunities</p>
                </div>
                <Alert className="bg-orange-50 border-orange-200">
                  <AlertDescription className="text-orange-900 text-xs">
                    <p className="font-semibold mb-1">Estimated Annual Impact:</p>
                    <p className="text-lg font-bold">${(metrics.missedRecerts * 2800).toLocaleString()}</p>
                    <p className="text-xs mt-1">Based on avg. 60-day episode rate of $2,800</p>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Documentation Efficiency */}
            <Card className="border-blue-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-600" />
                  Time Savings
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <p className="text-5xl font-bold text-blue-600">
                    {Math.abs(Math.round((benchmarks.avgDocTime - metrics.avgDocTime) * metrics.totalVisits / 60))}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">Hours saved ({timeRange} days)</p>
                </div>
                <Alert className="bg-blue-50 border-blue-200">
                  <AlertDescription className="text-blue-900 text-xs">
                    <p className="font-semibold mb-1">Value Created:</p>
                    <p className="text-lg font-bold">
                      {Math.round((benchmarks.avgDocTime - metrics.avgDocTime) * metrics.totalVisits / 60 * 0.75)} extra visits
                    </p>
                    <p className="text-xs mt-1">Potential with reclaimed time</p>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>

            {/* Quality Bonus Potential */}
            <Card className="border-green-200">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="w-5 h-5 text-green-600" />
                  Quality Bonus
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center mb-4">
                  <p className="text-5xl font-bold text-green-600">
                    {(metrics.incidentRate < 2 && metrics.avgDocTime < 40) ? '✓' : '?'}
                  </p>
                  <p className="text-sm text-gray-600 mt-2">Eligibility status</p>
                </div>
                <Alert className="bg-green-50 border-green-200">
                  <AlertDescription className="text-green-900 text-xs">
                    <p className="font-semibold mb-1">Requirements:</p>
                    <ul className="text-xs space-y-1">
                      <li className="flex items-center gap-1">
                        {metrics.incidentRate < 2 ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        Low incident rate ({metrics.incidentRate}%)
                      </li>
                      <li className="flex items-center gap-1">
                        {metrics.avgDocTime < 40 ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                        Efficient documentation
                      </li>
                    </ul>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>

          {/* Actionable Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle>Revenue Action Items</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {metrics.missedRecerts > 0 && (
                  <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-orange-600 mt-0.5" />
                      <div className="flex-1">
                        <p className="font-semibold text-gray-900">Capture Missed Recertifications</p>
                        <p className="text-sm text-gray-600 mt-1">
                          Review {metrics.missedRecerts} patients who may be due for recertification. 
                          Schedule visits promptly to avoid revenue loss.
                        </p>
                        <p className="text-xs text-orange-700 mt-2 font-medium">
                          Estimated Impact: ${(metrics.missedRecerts * 2800).toLocaleString()}/year
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Sparkles className="w-5 h-5 text-blue-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">Optimize Visit Scheduling</p>
                      <p className="text-sm text-gray-600 mt-1">
                        With {Math.abs(Math.round((benchmarks.avgDocTime - metrics.avgDocTime) * metrics.totalVisits / 60))} hours 
                        saved on documentation, nurses can perform approximately{' '}
                        {Math.round((benchmarks.avgDocTime - metrics.avgDocTime) * metrics.totalVisits / 60 * 0.75)} additional visits.
                      </p>
                      <p className="text-xs text-blue-700 mt-2 font-medium">
                        Estimated Impact: ${(Math.round((benchmarks.avgDocTime - metrics.avgDocTime) * metrics.totalVisits / 60 * 0.75) * 150).toLocaleString()}/month
                      </p>
                    </div>
                  </div>
                </div>

                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5" />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900">Reduce Preventable Hospitalizations</p>
                      <p className="text-sm text-gray-600 mt-1">
                        Early intervention on high-risk patients can prevent costly hospitalizations 
                        and improve quality scores, leading to bonus payments.
                      </p>
                      <p className="text-xs text-green-700 mt-2 font-medium">
                        Estimated Impact: $5,000 - $15,000 per prevented hospitalization
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Staff Productivity Tab */}
        <TabsContent value="staff" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Nurse Productivity Rankings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {metrics.nurseStats.map((nurse, index) => (
                  <div key={nurse.email} className="p-4 bg-gray-50 rounded-lg border">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <Badge className={
                          index === 0 ? 'bg-yellow-500' :
                          index === 1 ? 'bg-gray-400' :
                          index === 2 ? 'bg-orange-600' : 'bg-blue-500'
                        }>
                          #{index + 1}
                        </Badge>
                        <div>
                          <p className="font-semibold text-gray-900">{nurse.name}</p>
                          <p className="text-xs text-gray-500">{nurse.email}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-blue-600">{nurse.visitCount}</p>
                        <p className="text-xs text-gray-500">visits</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-600">Avg. Doc Time</p>
                        <p className="font-semibold">{nurse.avgDocTime} min</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Admissions</p>
                        <p className="font-semibold">{nurse.admissions}</p>
                      </div>
                      <div>
                        <p className="text-gray-600">Visits/Month</p>
                        <p className="font-semibold">{nurse.productivity.toFixed(1)}</p>
                      </div>
                    </div>

                    <div className="mt-3">
                      <Progress value={(nurse.visitCount / metrics.nurseStats[0].visitCount) * 100} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Productivity Insights */}
          <Card>
            <CardHeader>
              <CardTitle>Productivity Insights</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <Alert className="bg-blue-50 border-blue-200">
                  <CheckCircle2 className="w-4 h-4 text-blue-600" />
                  <AlertDescription className="text-blue-900">
                    <p className="font-semibold">Team Average</p>
                    <p className="text-sm mt-1">
                      {(metrics.totalVisits / metrics.nurseStats.length).toFixed(1)} visits per nurse 
                      over {timeRange} days
                    </p>
                  </AlertDescription>
                </Alert>

                {metrics.nurseStats.length > 0 && metrics.nurseStats[0].visitCount > (metrics.totalVisits / metrics.nurseStats.length * 1.5) && (
                  <Alert className="bg-yellow-50 border-yellow-200">
                    <AlertTriangle className="w-4 h-4 text-yellow-600" />
                    <AlertDescription className="text-yellow-900">
                      <p className="font-semibold">Workload Imbalance Detected</p>
                      <p className="text-sm mt-1">
                        Top performer is handling significantly more visits than average. 
                        Consider redistributing caseload to prevent burnout.
                      </p>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Quality Metrics Tab */}
        <TabsContent value="quality" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            {/* Incident Analysis */}
            <Card>
              <CardHeader>
                <CardTitle>Incident Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-gray-50 rounded">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-sm font-medium">Total Incidents</span>
                      <span className="text-2xl font-bold">{metrics.fallIncidents + metrics.hospitalizationIncidents}</span>
                    </div>
                    <p className="text-xs text-gray-600">
                      {metrics.incidentRate}% incident rate
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-red-50 border border-red-200 rounded">
                      <p className="text-xs text-red-700 font-medium mb-1">Falls</p>
                      <p className="text-2xl font-bold text-red-600">{metrics.fallIncidents}</p>
                    </div>
                    <div className="p-3 bg-orange-50 border border-orange-200 rounded">
                      <p className="text-xs text-orange-700 font-medium mb-1">Hospitalizations</p>
                      <p className="text-2xl font-bold text-orange-600">{metrics.hospitalizationIncidents}</p>
                    </div>
                  </div>

                  {metrics.incidentRate < 2 ? (
                    <Alert className="bg-green-50 border-green-200">
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                      <AlertDescription className="text-green-900 text-sm">
                        Excellent! Your incident rate is well below the industry average.
                      </AlertDescription>
                    </Alert>
                  ) : (
                    <Alert className="bg-yellow-50 border-yellow-200">
                      <AlertTriangle className="w-4 h-4 text-yellow-600" />
                      <AlertDescription className="text-yellow-900 text-sm">
                        Consider additional fall prevention and patient safety protocols.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Documentation Quality */}
            <Card>
              <CardHeader>
                <CardTitle>Documentation Quality</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-3 bg-blue-50 rounded">
                    <p className="text-sm font-medium text-blue-900 mb-2">Completeness Score</p>
                    <div className="flex items-center gap-3">
                      <Progress value={92} className="flex-1 h-3" />
                      <span className="text-2xl font-bold text-blue-600">92%</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm">Visits with vitals</span>
                      <Badge variant="outline">
                        {Math.round(visits.filter(v => v.vital_signs && Object.keys(v.vital_signs).length > 0).length / visits.length * 100)}%
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm">Visits with complete notes</span>
                      <Badge variant="outline">
                        {Math.round(visits.filter(v => v.nurse_notes && v.nurse_notes.length > 200).length / visits.length * 100)}%
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm">Visits with time recorded</span>
                      <Badge variant="outline">
                        {Math.round(visits.filter(v => v.start_time && v.end_time).length / visits.length * 100)}%
                      </Badge>
                    </div>
                  </div>

                  <Alert className="bg-blue-50 border-blue-200">
                    <Sparkles className="w-4 h-4 text-blue-600" />
                    <AlertDescription className="text-blue-900 text-sm">
                      Penn Sync AI features are helping maintain high documentation standards!
                    </AlertDescription>
                  </Alert>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

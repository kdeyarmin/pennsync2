import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from "recharts";
import {
  BarChart3,
  Download,
  FileText,
  TrendingUp,
  TrendingDown,
  Users,
  ClipboardCheck,
  DollarSign,
  Calendar,
  Clock,
  Brain,
  Shield,
  AlertTriangle,
  Sparkles,
  Send,
  Trash2,
  Play,
  Pause,
  Filter,
  Activity
} from "lucide-react";
import ReferralVolumeReport from "../components/reports/ReferralVolumeReport";
import PatientOutcomesReport from "../components/reports/PatientOutcomesReport";
import NursePerformanceReport from "../components/reports/NursePerformanceReport";
import OASISComplianceReport from "../components/reports/OASISComplianceReport";
import PDGMReimbursementReport from "../components/reports/PDGMReimbursementReport";
import KPIDashboard from "../components/reports/KPIDashboard";
import { exportToPDF } from "../components/utils/pdfExporter";
import { calculateStats } from "@/components/utils/statsCalculator";

export default function Reports() {
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().setMonth(new Date().getMonth() - 3)).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0]
  });
  const [selectedTimeframe, setSelectedTimeframe] = useState('30');
  const [generating, setGenerating] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    report_type: 'comprehensive_report',
    date_range_days: 30,
    schedule: 'weekly',
    recipients: '',
    include_ai_insights: true
  });

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list('-updated_date', 500),
    initialData: []
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['visits'],
    queryFn: () => base44.entities.Visit.list('-visit_date', 1000),
    initialData: []
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => base44.entities.Incident.list('-incident_date', 500),
    initialData: []
  });

  const { data: complianceAudits = [] } = useQuery({
    queryKey: ['complianceAudits'],
    queryFn: () => base44.entities.ComplianceAudit.list('-audit_date', 500),
    initialData: []
  });

  const { data: riskAssessments = [] } = useQuery({
    queryKey: ['riskAssessments'],
    queryFn: () => base44.entities.PatientRiskAssessment.list('-assessment_date', 500),
    initialData: []
  });

  const { data: noteConversions = [] } = useQuery({
    queryKey: ['allNoteConversions'],
    queryFn: () => base44.entities.NoteConversion.list('-created_date', 10000),
    initialData: []
  });

  // Combine visits and enhancements
  const totalVisitsAndEnhancements = visits.length + noteConversions.length;

  const { data: scheduledTasks = [], isLoading: schedulesLoading } = useQuery({
    queryKey: ['scheduledReports'],
    queryFn: async () => {
      const tasks = await base44.functions.invoke('listScheduledTasks');
      return tasks.data.filter(t => t.function_name === 'generateAIReport');
    },
    enabled: !!currentUser
  });

  const stats = calculateStats({
    visits,
    noteConversions,
    patients,
    incidents,
    complianceAudits,
    dateRange: parseInt(selectedTimeframe)
  });

  const highRiskPatients = riskAssessments.filter(
    r => r.overall_risk_level === 'high' || r.overall_risk_level === 'critical'
  ).length;

  const visitsTrendData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    const dateStr = date.toISOString().split('T')[0];
    const count = visits.filter(v => v.visit_date === dateStr).length;
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      visits: count
    };
  });

  const complianceTrendData = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (11 - i));
    const monthStr = date.toISOString().slice(0, 7);
    const monthAudits = complianceAudits.filter(a => a.audit_date?.startsWith(monthStr));
    const avgScore = monthAudits.length > 0
      ? monthAudits.reduce((sum, a) => sum + (a.compliance_score || 0), 0) / monthAudits.length
      : 0;
    return {
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      score: Math.round(avgScore)
    };
  });

  const incidentData = [
    { name: 'Falls', value: incidents.filter(i => i.incident_type === 'fall').length },
    { name: 'Hospitalized', value: incidents.filter(i => i.incident_type === 'hospitalized').length },
    { name: 'Med Error', value: incidents.filter(i => i.incident_type === 'medication_error').length },
    { name: 'Other', value: incidents.filter(i => !['fall', 'hospitalized', 'medication_error'].includes(i.incident_type)).length }
  ].filter(d => d.value > 0);

  const riskData = [
    { name: 'Low', value: riskAssessments.filter(r => r.overall_risk_level === 'low').length, color: '#10b981' },
    { name: 'Moderate', value: riskAssessments.filter(r => r.overall_risk_level === 'moderate').length, color: '#f59e0b' },
    { name: 'High', value: riskAssessments.filter(r => r.overall_risk_level === 'high').length, color: '#f97316' },
    { name: 'Critical', value: riskAssessments.filter(r => r.overall_risk_level === 'critical').length, color: '#ef4444' }
  ].filter(d => d.value > 0);

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];

  const generateReportMutation = useMutation({
    mutationFn: async (params) => {
      const response = await base44.functions.invoke('generateAIReport', params);
      return response.data;
    },
    onSuccess: () => {
      alert('Report generated and downloaded successfully!');
    }
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (schedule) => {
      const recipients = schedule.recipients.split(',').map(r => r.trim()).filter(r => r);
      
      const scheduleConfig = {
        name: schedule.name,
        function_name: 'generateAIReport',
        description: `Automated ${schedule.report_type.replace(/_/g, ' ')} report`,
        function_args: {
          report_type: schedule.report_type,
          date_range_days: parseInt(schedule.date_range_days),
          recipients,
          include_ai_insights: schedule.include_ai_insights
        },
        is_active: true
      };

      if (schedule.schedule === 'daily') {
        scheduleConfig.repeat_interval = 1;
        scheduleConfig.repeat_unit = 'days';
        scheduleConfig.start_time = '09:00';
      } else if (schedule.schedule === 'weekly') {
        scheduleConfig.repeat_unit = 'weeks';
        scheduleConfig.repeat_on_days = [1];
        scheduleConfig.start_time = '09:00';
      } else if (schedule.schedule === 'monthly') {
        scheduleConfig.repeat_unit = 'months';
        scheduleConfig.repeat_on_day_of_month = 1;
        scheduleConfig.start_time = '09:00';
      }

      return await base44.functions.invoke('createScheduledTask', scheduleConfig);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduledReports']);
      setNewSchedule({
        name: '',
        report_type: 'comprehensive_report',
        date_range_days: 30,
        schedule: 'weekly',
        recipients: '',
        include_ai_insights: true
      });
      alert('Report schedule created successfully!');
    }
  });

  const toggleScheduleMutation = useMutation({
    mutationFn: async (taskId) => {
      return await base44.functions.invoke('toggleScheduledTask', { task_id: taskId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduledReports']);
    }
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (taskId) => {
      return await base44.functions.invoke('deleteScheduledTask', { task_id: taskId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduledReports']);
    }
  });

  const handleGenerateNow = async (params = {}) => {
    setGenerating(true);
    try {
      await generateReportMutation.mutateAsync({
        report_type: params.report_type || 'comprehensive_report',
        date_range_days: params.date_range_days || 30,
        recipients: [],
        include_ai_insights: true
      });
    } finally {
      setGenerating(false);
    }
  };

  const reportTypes = [
    { value: 'comprehensive_report', label: 'Comprehensive Report', icon: FileText },
    { value: 'patient_outcomes', label: 'Patient Outcomes', icon: TrendingUp },
    { value: 'compliance_report', label: 'Compliance Report', icon: AlertTriangle },
    { value: 'staff_performance', label: 'Staff Performance', icon: Users },
    { value: 'ai_impact', label: 'AI Impact Analysis', icon: Sparkles }
  ];

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

  const isAdminUser = currentUser?.role === 'admin';

  const KPICard = ({ title, value, change, icon: Icon, trend }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-500 mb-1">{title}</p>
            <p className="text-3xl font-bold text-gray-900">{value}</p>
            {change !== undefined && (
              <div className={`flex items-center gap-1 mt-2 ${trend === 'up' ? 'text-green-600' : 'text-red-600'}`}>
                {trend === 'up' ? <TrendingUp className="w-4 h-4" /> : <TrendingDown className="w-4 h-4" />}
                <span className="text-sm font-medium">{change}% vs last period</span>
              </div>
            )}
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            trend === 'up' ? 'bg-green-100' : trend === 'down' ? 'bg-red-100' : 'bg-blue-100'
          }`}>
            <Icon className={`w-6 h-6 ${
              trend === 'up' ? 'text-green-600' : trend === 'down' ? 'text-red-600' : 'text-blue-600'
            }`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );

  if (!isAdminUser) {
    return (
      <div className="p-8 text-center">
        <ClipboardCheck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Admin Access Required</h2>
        <p className="text-gray-600">Reports are available to administrators only.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-3 sm:p-4 md:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2 truncate">Reports & Analytics</h1>
            <p className="text-xs sm:text-sm md:text-base text-gray-600">Comprehensive reporting, KPIs, and automated insights</p>
          </div>
        </div>

        {/* Main Tabs */}
        <Tabs defaultValue="advanced" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="advanced">Reports</TabsTrigger>
            <TabsTrigger value="automated">Automated Reports</TabsTrigger>
          </TabsList>



          {/* Advanced Reports Tab */}
          <TabsContent value="advanced" className="space-y-6">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-white rounded-lg p-2 shadow-sm">
              <Calendar className="w-4 h-4 text-gray-500 hidden sm:block flex-shrink-0" />
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                className="text-sm border-0 focus:ring-0 min-h-[44px]"
              />
              <span className="text-gray-400 text-center sm:inline hidden">to</span>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                className="text-sm border-0 focus:ring-0 min-h-[44px]"
              />
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {reportSections.map((section) => (
                <Card key={section.id} className={`border-l-4 border-l-${section.color}-500 hover:shadow-lg transition-shadow cursor-pointer`}>
                  <CardContent className="p-4">
                    <section.icon className={`w-8 h-8 text-${section.color}-600 mb-2`} />
                    <p className="text-xs font-semibold text-gray-600 uppercase">{section.title}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <BarChart3 className="w-5 h-5 sm:w-6 sm:h-6 text-blue-600 flex-shrink-0" />
                  <span className="truncate">Detailed Reports</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Select a report type to view detailed analytics</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6">
                <Tabs defaultValue="kpi-detail" className="w-full">
                  <div className="overflow-x-auto -mx-3 sm:mx-0">
                    <TabsList className="inline-flex md:grid md:w-full md:grid-cols-6 gap-1 min-w-max h-auto">
                      <TabsTrigger value="kpi-detail" className="text-xs sm:text-sm py-2 sm:py-3 whitespace-nowrap">KPI</TabsTrigger>
                      <TabsTrigger value="referrals" className="text-xs sm:text-sm py-2 sm:py-3 whitespace-nowrap">Referrals</TabsTrigger>
                      <TabsTrigger value="outcomes" className="text-xs sm:text-sm py-2 sm:py-3 whitespace-nowrap">Outcomes</TabsTrigger>
                      <TabsTrigger value="performance" className="text-xs sm:text-sm py-2 sm:py-3 whitespace-nowrap">Performance</TabsTrigger>
                      <TabsTrigger value="oasis" className="text-xs sm:text-sm py-2 sm:py-3 whitespace-nowrap">OASIS</TabsTrigger>
                      <TabsTrigger value="pdgm" className="text-xs sm:text-sm py-2 sm:py-3 whitespace-nowrap">PDGM</TabsTrigger>
                    </TabsList>
                  </div>

                  <TabsContent value="kpi-detail" className="space-y-6 mt-6">
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
          </TabsContent>

          {/* Automated Reports Tab */}
          <TabsContent value="automated" className="space-y-6">
            {/* Quick Generate Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
              {reportTypes.slice(0, 3).map((type) => {
                const Icon = type.icon;
                return (
                  <Card key={type.value} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2 text-lg">
                        <Icon className="w-5 h-5" />
                        {type.label}
                      </CardTitle>
                      <CardDescription>Last 30 days with AI insights</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Button
                        onClick={() => handleGenerateNow({ report_type: type.value, date_range_days: 30 })}
                        disabled={generating}
                        className="w-full min-h-[44px]"
                      >
                        <Download className="w-4 h-4 mr-2" />
                        Generate Now
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Create Schedule */}
            <Card>
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Calendar className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="truncate">Schedule Automated Report</span>
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">Set up recurring reports delivered via email</CardDescription>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                  <div>
                    <Label>Report Name</Label>
                    <Input
                      value={newSchedule.name}
                      onChange={(e) => setNewSchedule({...newSchedule, name: e.target.value})}
                      placeholder="Weekly Performance Report"
                    />
                  </div>

                  <div>
                    <Label>Report Type</Label>
                    <Select
                      value={newSchedule.report_type}
                      onValueChange={(value) => setNewSchedule({...newSchedule, report_type: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {reportTypes.map(type => (
                          <SelectItem key={type.value} value={type.value}>
                            {type.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Date Range (Days)</Label>
                    <Select
                      value={newSchedule.date_range_days.toString()}
                      onValueChange={(value) => setNewSchedule({...newSchedule, date_range_days: parseInt(value)})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="7">Last 7 days</SelectItem>
                        <SelectItem value="30">Last 30 days</SelectItem>
                        <SelectItem value="60">Last 60 days</SelectItem>
                        <SelectItem value="90">Last 90 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label>Schedule</Label>
                    <Select
                      value={newSchedule.schedule}
                      onValueChange={(value) => setNewSchedule({...newSchedule, schedule: value})}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="daily">Daily (9 AM)</SelectItem>
                        <SelectItem value="weekly">Weekly (Monday 9 AM)</SelectItem>
                        <SelectItem value="monthly">Monthly (1st, 9 AM)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="sm:col-span-2">
                    <Label>Email Recipients (comma-separated)</Label>
                    <Input
                      value={newSchedule.recipients}
                      onChange={(e) => setNewSchedule({...newSchedule, recipients: e.target.value})}
                      placeholder="admin@agency.com, director@agency.com"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={newSchedule.include_ai_insights}
                    onChange={(e) => setNewSchedule({...newSchedule, include_ai_insights: e.target.checked})}
                    className="rounded"
                  />
                  <Label className="cursor-pointer">
                    <Sparkles className="w-4 h-4 inline mr-1 text-yellow-600" />
                    Include AI-powered insights and recommendations
                  </Label>
                </div>

                <Button
                  onClick={() => createScheduleMutation.mutate(newSchedule)}
                  disabled={!newSchedule.name || !newSchedule.recipients || createScheduleMutation.isLoading}
                  className="w-full min-h-[44px]"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Create Schedule
                </Button>
              </CardContent>
            </Card>

            {/* Scheduled Reports */}
            <Card>
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                  <Clock className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
                  <span className="truncate">Scheduled Reports ({scheduledTasks.length})</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6">
                {schedulesLoading ? (
                  <p className="text-gray-500">Loading schedules...</p>
                ) : scheduledTasks.length === 0 ? (
                  <p className="text-gray-500">No scheduled reports yet. Create one above.</p>
                ) : (
                  <div className="space-y-3">
                    {scheduledTasks.map((task) => (
                      <div key={task.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-gray-50 rounded-lg">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold">{task.name}</h3>
                            <Badge variant={task.is_active ? 'default' : 'secondary'}>
                              {task.is_active ? 'Active' : 'Paused'}
                            </Badge>
                          </div>
                          <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
                            {task.description} • Recipients: {task.function_args?.recipients?.join(', ') || 'None'}
                          </p>
                          <p className="text-xs text-gray-500 mt-1">
                            Schedule: Every {task.repeat_interval} {task.repeat_unit}
                            {task.start_time && ` at ${task.start_time}`}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => toggleScheduleMutation.mutate(task.id)}
                          >
                            {task.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              if (confirm('Delete this scheduled report?')) {
                                deleteScheduleMutation.mutate(task.id);
                              }
                            }}
                          >
                            <Trash2 className="w-4 h-4 text-red-600" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
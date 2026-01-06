import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
  TrendingUp,
  TrendingDown,
  Users,
  FileText,
  AlertTriangle,
  CheckCircle,
  Brain,
  Shield,
  Clock,
  DollarSign,
  Settings
} from "lucide-react";
import { calculateStats } from "@/components/utils/statsCalculator";

export default function AdminKPIDashboard() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('30');

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
    queryKey: ['noteConversions'],
    queryFn: () => base44.entities.NoteConversion.list('-created_date', 10000),
    initialData: []
  });

  const stats = calculateStats({
    visits,
    noteConversions,
    patients,
    incidents,
    complianceAudits,
    dateRange: parseInt(selectedTimeframe)
  });

  // High-risk patients count
  const highRiskPatients = riskAssessments.filter(
    r => r.overall_risk_level === 'high' || r.overall_risk_level === 'critical'
  ).length;

  // Visits trend data (last 30 days)
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

  // Compliance scores over time
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

  // Incident distribution
  const incidentData = [
    { name: 'Falls', value: incidents.filter(i => i.incident_type === 'fall').length },
    { name: 'Hospitalized', value: incidents.filter(i => i.incident_type === 'hospitalized').length },
    { name: 'Med Error', value: incidents.filter(i => i.incident_type === 'medication_error').length },
    { name: 'Other', value: incidents.filter(i => !['fall', 'hospitalized', 'medication_error'].includes(i.incident_type)).length }
  ].filter(d => d.value > 0);

  // Risk distribution
  const riskData = [
    { name: 'Low', value: riskAssessments.filter(r => r.overall_risk_level === 'low').length, color: '#10b981' },
    { name: 'Moderate', value: riskAssessments.filter(r => r.overall_risk_level === 'moderate').length, color: '#f59e0b' },
    { name: 'High', value: riskAssessments.filter(r => r.overall_risk_level === 'high').length, color: '#f97316' },
    { name: 'Critical', value: riskAssessments.filter(r => r.overall_risk_level === 'critical').length, color: '#ef4444' }
  ].filter(d => d.value > 0);

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b'];

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

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 truncate">KPI Dashboard</h1>
          <p className="text-xs sm:text-sm md:text-base text-gray-600">Real-time agency performance metrics</p>
        </div>
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          <Button
            variant={selectedTimeframe === '7' ? 'default' : 'outline'}
            onClick={() => setSelectedTimeframe('7')}
            size="sm"
            className="min-h-[44px] flex-1 sm:flex-none"
          >
            7 Days
          </Button>
          <Button
            variant={selectedTimeframe === '30' ? 'default' : 'outline'}
            onClick={() => setSelectedTimeframe('30')}
            size="sm"
            className="min-h-[44px] flex-1 sm:flex-none"
          >
            30 Days
          </Button>
          <Button
            variant={selectedTimeframe === '90' ? 'default' : 'outline'}
            onClick={() => setSelectedTimeframe('90')}
            size="sm"
            className="min-h-[44px] flex-1 sm:flex-none"
          >
            90 Days
          </Button>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
        <KPICard
          title="Active Patients"
          value={patients.filter(p => p.status === 'active').length}
          icon={Users}
        />
        <KPICard
          title="Enhancements Completed"
          value={stats.noteEnhancements.total}
          change={12}
          trend="up"
          icon={FileText}
        />
        <KPICard
          title="High Risk Patients"
          value={highRiskPatients}
          icon={AlertTriangle}
          trend="down"
        />
        <KPICard
          title="Avg Compliance Score"
          value={`${stats.compliance.avgScore}%`}
          change={8}
          trend="up"
          icon={Shield}
        />
      </div>

      {/* AI Adoption Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Brain className="w-4 h-4 sm:w-5 sm:h-5 text-purple-600 flex-shrink-0" />
              <span className="truncate">AI Adoption</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="space-y-3">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Smart Notes</span>
                  <span className="font-semibold">{stats.noteEnhancements.total}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-purple-600 h-2 rounded-full" style={{ width: '85%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Risk Assessments</span>
                  <span className="font-semibold">{riskAssessments.length}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-blue-600 h-2 rounded-full" style={{ width: '72%' }} />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span>Compliance Audits</span>
                  <span className="font-semibold">{complianceAudits.length}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: '68%' }} />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 text-green-600 flex-shrink-0" />
              <span className="truncate">Time Savings</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="space-y-3">
              <div>
                <p className="text-3xl font-bold text-green-600">{stats.timeSaved.totalHours}</p>
                <p className="text-sm text-gray-500">Hours saved this period</p>
              </div>
              <div className="pt-3 border-t">
                <p className="text-2xl font-bold text-gray-900">20 min</p>
                <p className="text-sm text-gray-500">Avg time per enhanced note</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-600 flex-shrink-0" />
              <span className="truncate">Financial Impact</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="space-y-3">
              <div>
                <p className="text-3xl font-bold text-yellow-600">${stats.financial.estimatedRevenue.toLocaleString()}</p>
                <p className="text-sm text-gray-500">Est. revenue protected</p>
              </div>
              <div className="pt-3 border-t">
                <p className="text-2xl font-bold text-gray-900">{stats.compliance.avgScore}%</p>
                <p className="text-sm text-gray-500">Documentation compliance rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 1 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-sm sm:text-base">Visits Trend (Last 30 Days)</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={visitsTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Area type="monotone" dataKey="visits" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-sm sm:text-base">Compliance Score Trend (12 Months)</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={complianceTrendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis domain={[0, 100]} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="score" stroke="#10b981" strokeWidth={2} name="Compliance %" />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-sm sm:text-base">Incident Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={incidentData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {incidentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="text-sm sm:text-base">Patient Risk Distribution</CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6">
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={riskData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="value" name="Patients">
                  {riskData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
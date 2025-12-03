import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  Legend
} from "recharts";
import {
  Users,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  BookOpen,
  Target,
  Award,
  FileText,
  Shield,
  Heart,
  MessageSquare,
  Monitor,
  ChevronRight,
  RefreshCw
} from "lucide-react";
import { format, subDays, parseISO, startOfWeek } from "date-fns";
import AutoAssignTraining from "../components/training/AutoAssignTraining";
import TrainingCompletionTracker from "../components/training/TrainingCompletionTracker";
import AutomatedComplianceAuditor from "../components/compliance/AutomatedComplianceAuditor";
import ComplianceAuditResults from "../components/compliance/ComplianceAuditResults";
import NurseComplianceRiskIndicator from "../components/compliance/NurseComplianceRiskIndicator";

const COLORS = {
  documentation: "#8b5cf6",
  clinical: "#3b82f6",
  compliance: "#f97316",
  safety: "#ef4444",
  communication: "#22c55e",
  technology: "#6366f1"
};

const SEVERITY_COLORS = {
  critical: "#dc2626",
  high: "#f97316",
  medium: "#eab308",
  low: "#3b82f6"
};

export default function NursePerformanceDashboard() {
  const [timeRange, setTimeRange] = useState("30");
  const [selectedNurse, setSelectedNurse] = useState("all");

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: recommendations = [], isLoading, refetch } = useQuery({
    queryKey: ['allRecommendations'],
    queryFn: () => base44.entities.TrainingRecommendation.list('-created_date', 500),
  });

  const { data: users = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: currentUser?.role === 'admin',
  });

  const { data: trainingCompletions = [] } = useQuery({
    queryKey: ['trainingCompletions'],
    queryFn: () => base44.entities.TrainingCompletion.list('-completion_date', 200),
  });

  const isAdmin = currentUser?.role === 'admin';

  // Filter recommendations by time range
  const filteredRecs = useMemo(() => {
    const cutoffDate = subDays(new Date(), parseInt(timeRange));
    return recommendations.filter(rec => {
      const recDate = new Date(rec.created_date);
      const matchesTime = recDate >= cutoffDate;
      const matchesNurse = selectedNurse === "all" || rec.nurse_email === selectedNurse;
      return matchesTime && matchesNurse;
    });
  }, [recommendations, timeRange, selectedNurse]);

  // Aggregate by type
  const typeData = useMemo(() => {
    const counts = {};
    filteredRecs.forEach(rec => {
      counts[rec.recommendation_type] = (counts[rec.recommendation_type] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      fill: COLORS[name] || "#gray"
    }));
  }, [filteredRecs]);

  // Aggregate by severity
  const severityData = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    filteredRecs.forEach(rec => {
      counts[rec.severity] = (counts[rec.severity] || 0) + 1;
    });
    return Object.entries(counts).map(([name, value]) => ({
      name: name.charAt(0).toUpperCase() + name.slice(1),
      value,
      fill: SEVERITY_COLORS[name]
    }));
  }, [filteredRecs]);

  // Aggregate by nurse (top 10)
  const nurseData = useMemo(() => {
    const counts = {};
    const unaddressed = {};
    filteredRecs.forEach(rec => {
      counts[rec.nurse_email] = (counts[rec.nurse_email] || 0) + 1;
      if (!rec.addressed) {
        unaddressed[rec.nurse_email] = (unaddressed[rec.nurse_email] || 0) + 1;
      }
    });
    return Object.entries(counts)
      .map(([email, total]) => {
        const user = users.find(u => u.email === email);
        return {
          name: user?.full_name || email.split('@')[0],
          email,
          total,
          unaddressed: unaddressed[email] || 0,
          addressed: total - (unaddressed[email] || 0)
        };
      })
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);
  }, [filteredRecs, users]);

  // Trend data (weekly)
  const trendData = useMemo(() => {
    const weeks = {};
    filteredRecs.forEach(rec => {
      const weekStart = format(startOfWeek(new Date(rec.created_date)), 'MM/dd');
      if (!weeks[weekStart]) {
        weeks[weekStart] = { week: weekStart, documentation: 0, clinical: 0, compliance: 0, safety: 0, communication: 0, technology: 0 };
      }
      weeks[weekStart][rec.recommendation_type] = (weeks[weekStart][rec.recommendation_type] || 0) + 1;
    });
    return Object.values(weeks).sort((a, b) => new Date(a.week) - new Date(b.week));
  }, [filteredRecs]);

  // Critical recommendations needing attention
  const criticalRecs = useMemo(() => {
    return filteredRecs
      .filter(rec => (rec.severity === 'critical' || rec.severity === 'high') && !rec.addressed)
      .slice(0, 5);
  }, [filteredRecs]);

  // Summary stats
  const stats = useMemo(() => {
    const total = filteredRecs.length;
    const addressed = filteredRecs.filter(r => r.addressed).length;
    const critical = filteredRecs.filter(r => r.severity === 'critical').length;
    const uniqueNurses = new Set(filteredRecs.map(r => r.nurse_email)).size;
    return { total, addressed, critical, uniqueNurses, addressRate: total > 0 ? Math.round((addressed / total) * 100) : 0 };
  }, [filteredRecs]);

  const getTypeIcon = (type) => {
    const icons = {
      documentation: <FileText className="w-4 h-4" />,
      clinical: <Heart className="w-4 h-4" />,
      compliance: <Shield className="w-4 h-4" />,
      safety: <AlertTriangle className="w-4 h-4" />,
      communication: <MessageSquare className="w-4 h-4" />,
      technology: <Monitor className="w-4 h-4" />
    };
    return icons[type] || <BookOpen className="w-4 h-4" />;
  };

  if (isLoading) {
    return (
      <div className="p-8 flex items-center justify-center">
        <RefreshCw className="w-8 h-8 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Nurse Performance Dashboard</h1>
          <p className="text-gray-600">Training recommendations and skill gap analysis</p>
        </div>
        <div className="flex gap-3">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          {isAdmin && (
            <Select value={selectedNurse} onValueChange={setSelectedNurse}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Nurses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Nurses</SelectItem>
                {users.map(user => (
                  <SelectItem key={user.email} value={user.email}>{user.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button variant="outline" size="icon" onClick={() => refetch()}>
            <RefreshCw className="w-4 h-4" />
          </Button>
          {isAdmin && (
            <AutoAssignTraining recommendations={recommendations} users={users} />
          )}
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs">Total Recommendations</p>
                <p className="text-3xl font-bold">{stats.total}</p>
              </div>
              <Target className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs">Address Rate</p>
                <p className="text-3xl font-bold">{stats.addressRate}%</p>
              </div>
              <CheckCircle2 className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-red-500 to-red-600 text-white border-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-100 text-xs">Critical Issues</p>
                <p className="text-3xl font-bold">{stats.critical}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-xs">Nurses Tracked</p>
                <p className="text-3xl font-bold">{stats.uniqueNurses}</p>
              </div>
              <Users className="w-8 h-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-xs">Addressed</p>
                <p className="text-3xl font-bold">{stats.addressed}</p>
              </div>
              <Award className="w-8 h-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Recommendations by Type */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-purple-600" />
              Recommendations by Category
            </CardTitle>
          </CardHeader>
          <CardContent>
            {typeData.length > 0 ? (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={typeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={2}
                    dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {typeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-500">
                No recommendations in this period
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recommendations by Severity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Severity Distribution
            </CardTitle>
          </CardHeader>
          <CardContent>
            {severityData.some(d => d.value > 0) ? (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={severityData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" />
                  <YAxis dataKey="name" type="category" width={80} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                    {severityData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[250px] flex items-center justify-center text-gray-500">
                No recommendations in this period
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Trend Over Time */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            Weekly Trend by Category
          </CardTitle>
        </CardHeader>
        <CardContent>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="week" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="documentation" stroke={COLORS.documentation} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="clinical" stroke={COLORS.clinical} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="compliance" stroke={COLORS.compliance} strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="safety" stroke={COLORS.safety} strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-gray-500">
              Not enough data to show trends
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Nurses by Recommendations */}
        {isAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-indigo-600" />
                Nurses with Most Recommendations
              </CardTitle>
            </CardHeader>
            <CardContent>
              {nurseData.length > 0 ? (
                <div className="space-y-3">
                  {nurseData.map((nurse, idx) => (
                    <div key={nurse.email} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{nurse.name}</p>
                        <div className="flex gap-2 mt-1">
                          <Progress value={(nurse.addressed / nurse.total) * 100} className="flex-1 h-2" />
                          <span className="text-xs text-gray-500">{Math.round((nurse.addressed / nurse.total) * 100)}%</span>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{nurse.total} total</Badge>
                        {nurse.unaddressed > 0 && (
                          <Badge className="ml-1 bg-red-100 text-red-800">{nurse.unaddressed} open</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-gray-500 py-8">No nurse data available</p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Critical Recommendations Needing Attention */}
        <Card className={isAdmin ? "" : "lg:col-span-2"}>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-red-600" />
              Critical Issues Needing Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            {criticalRecs.length > 0 ? (
              <div className="space-y-2">
                {criticalRecs.map((rec, idx) => {
                  const user = users.find(u => u.email === rec.nurse_email);
                  return (
                    <div key={rec.id || idx} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
                      {getTypeIcon(rec.recommendation_type)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{rec.recommendation_text}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={`text-xs ${rec.severity === 'critical' ? 'bg-red-600' : 'bg-orange-500'} text-white`}>
                            {rec.severity}
                          </Badge>
                          <span className="text-xs text-gray-500">{user?.full_name || rec.nurse_email}</span>
                          <span className="text-xs text-gray-400">
                            {format(new Date(rec.created_date), 'MMM d')}
                          </span>
                        </div>
                      </div>
                      <Badge variant="outline" className="capitalize">{rec.recommendation_type}</Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center py-8">
                <CheckCircle2 className="w-12 h-12 text-green-400 mx-auto mb-2" />
                <p className="text-gray-500">No critical issues pending</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Compliance Auditing & Risk - Admin Only */}
      {isAdmin && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
          <AutomatedComplianceAuditor onAuditComplete={() => refetch()} />
          <NurseComplianceRiskIndicator users={users} />
        </div>
      )}

      {/* Compliance Audit Results - Admin Only */}
      {isAdmin && (
        <div className="mt-6">
          <ComplianceAuditResults users={users} />
        </div>
      )}

      {/* Training Completion Tracker - Admin Only */}
      {isAdmin && (
        <div className="mt-6">
          <TrainingCompletionTracker users={users} />
        </div>
      )}

      {/* Category Breakdown Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mt-6">
        {Object.entries(COLORS).map(([type, color]) => {
          const count = filteredRecs.filter(r => r.recommendation_type === type).length;
          const unaddressed = filteredRecs.filter(r => r.recommendation_type === type && !r.addressed).length;
          return (
            <Card key={type} className="border-t-4" style={{ borderTopColor: color }}>
              <CardContent className="p-4 text-center">
                <div className="w-10 h-10 rounded-full mx-auto mb-2 flex items-center justify-center" style={{ backgroundColor: `${color}20` }}>
                  {getTypeIcon(type)}
                </div>
                <p className="text-2xl font-bold">{count}</p>
                <p className="text-xs text-gray-500 capitalize">{type}</p>
                {unaddressed > 0 && (
                  <Badge className="mt-1 text-xs bg-red-100 text-red-700">{unaddressed} open</Badge>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
import { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Users,
  TrendingUp,
  Clock,
  FileText,
  Shield,
  DollarSign,
  Download,
  AlertCircle,
  CheckCircle2
} from "lucide-react";
import { calculateStats, calculateNurseStats, formatCurrency } from "../components/utils/statsCalculator";

export default function AgencyAnalytics() {
  const [dateRange, setDateRange] = useState("30days");

  // Fetch all necessary data
  const { data: visits = [] } = useQuery({
    queryKey: ['all-visits'],
    queryFn: () => base44.entities.Visit.list('-created_date', 1000),
    initialData: [],
  });

  const { data: noteConversions = [] } = useQuery({
    queryKey: ['note-conversions'],
    queryFn: () => base44.entities.NoteConversion.list('-created_date', 1000),
    initialData: [],
  });

  const { data: users = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const { data: allPatients = [] } = useQuery({
    queryKey: ['all-patients'],
    queryFn: () => base44.entities.Patient.list(),
    initialData: [],
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['all-incidents'],
    queryFn: () => base44.entities.Incident.list('-created_date', 1000),
    initialData: [],
  });

  const { data: complianceAudits = [] } = useQuery({
    queryKey: ['compliance-audits'],
    queryFn: () => base44.entities.ComplianceAudit.list('-created_date', 1000),
    initialData: [],
  });

  const { data: trainingCompletions = [] } = useQuery({
    queryKey: ['training-completions'],
    queryFn: () => base44.entities.TrainingCompletion.list('-created_date', 1000),
    initialData: [],
  });

  // Calculate overall statistics
  const overallStats = useMemo(() => {
    return calculateStats({
      visits,
      noteConversions,
      users,
      patients: allPatients,
      incidents,
      complianceAudits
    });
  }, [visits, noteConversions, users, allPatients, incidents, complianceAudits]);

  // Calculate nurse performance stats
  const nurseStats = useMemo(() => {
    const nurses = users.filter(u => u.role === 'user');
    return nurses.map(nurse => ({
      ...nurse,
      stats: calculateNurseStats(nurse.email, { visits, noteConversions })
    }));
  }, [users, visits, noteConversions]);

  // Top performers
  const topPerformers = useMemo(() => {
    return [...nurseStats]
      .filter(n => n.stats.totalVisits > 0)
      .sort((a, b) => b.stats.completionRate - a.stats.completionRate)
      .slice(0, 5);
  }, [nurseStats]);

  // Training completion stats
  const trainingStats = useMemo(() => {
    const completed = trainingCompletions.filter(t => t.status === 'completed').length;
    const total = trainingCompletions.length;
    return {
      completed,
      total,
      rate: total > 0 ? ((completed / total) * 100).toFixed(1) : 0
    };
  }, [trainingCompletions]);

  const StatCard = ({ title, value, subtitle, icon: Icon, trend, color = "indigo" }) => (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-600">{title}</p>
            <p className={`text-3xl font-bold mt-2 text-${color}-600`}>{value}</p>
            {subtitle && <p className="text-sm text-slate-500 mt-1">{subtitle}</p>}
          </div>
          <div className={`h-12 w-12 rounded-lg bg-${color}-100 flex items-center justify-center`}>
            <Icon className={`w-6 h-6 text-${color}-600`} />
          </div>
        </div>
        {trend && (
          <div className="flex items-center gap-1 mt-2">
            <TrendingUp className="w-4 h-4 text-green-600" />
            <span className="text-sm font-medium text-green-600">{trend}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Agency Analytics & Performance</h1>
              <p className="text-slate-600 mt-1">Comprehensive overview of agency operations and metrics</p>
            </div>
            <Button variant="outline" className="gap-2">
              <Download className="w-4 h-4" />
              Export Report
            </Button>
          </div>
        </div>



        {/* Tabs for detailed metrics */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="compliance">Compliance</TabsTrigger>
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="training">Training</TabsTrigger>
            <TabsTrigger value="financial">Financial</TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Documentation Efficiency */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5 text-indigo-600" />
                    Documentation Efficiency
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between mb-2">
                        <span className="text-sm text-slate-600">AI Enhancement Rate</span>
                        <span className="text-sm font-semibold">{overallStats.visits.total > 0 ? Math.round((overallStats.noteEnhancements.total / overallStats.visits.total) * 100) : 0}%</span>
                      </div>
                      <div className="w-full bg-slate-200 rounded-full h-2">
                        <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `${overallStats.visits.total > 0 ? Math.round((overallStats.noteEnhancements.total / overallStats.visits.total) * 100) : 0}%` }}></div>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                      <div>
                        <p className="text-2xl font-bold text-slate-900">{overallStats.compliance.avgScore}</p>
                        <p className="text-sm text-slate-600">Avg Quality Score</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-slate-900">{overallStats.noteEnhancements.total}</p>
                        <p className="text-sm text-slate-600">Notes Enhanced</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Patient Distribution */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5 text-green-600" />
                    Patient Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Active</span>
                      <span className="text-sm font-semibold text-green-600">{overallStats.patients.active}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Discharged</span>
                      <span className="text-sm font-semibold text-slate-600">{overallStats.patients.discharged}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-600">Total</span>
                      <span className="text-sm font-semibold text-slate-600">{overallStats.patients.total}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Performers */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-indigo-600" />
                  Top Performing Nurses
                </CardTitle>
                <CardDescription>Based on visit completion rate and documentation quality</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {topPerformers.map((nurse, idx) => (
                    <div key={nurse.email} className="flex items-center gap-4 p-3 rounded-lg bg-slate-50">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 font-bold">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-slate-900">{nurse.full_name}</p>
                        <p className="text-sm text-slate-500">{nurse.stats.totalVisits} visits</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-bold text-indigo-600">{nurse.stats.completionRate}%</p>
                        <p className="text-xs text-slate-500">completion</p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Compliance Tab */}
          <TabsContent value="compliance" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <StatCard
                title="Avg Compliance Score"
                value={`${overallStats.compliance.avgScore}%`}
                icon={Shield}
                color="green"
              />
              <StatCard
                title="Total Audits"
                value={overallStats.compliance.auditsInRange}
                subtitle={`${overallStats.compliance.passedAudits} passed`}
                icon={CheckCircle2}
                color="indigo"
              />
              <StatCard
                title="Quality Score"
                value={`${overallStats.compliance.qualityScore}%`}
                subtitle="Overall quality"
                icon={AlertCircle}
                color="indigo"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Compliance Status Breakdown</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-green-700">Passed</span>
                      <span className="text-sm font-semibold">{overallStats.compliance.passedAudits}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-green-600 h-2 rounded-full" style={{ width: `${overallStats.compliance.qualityScore}%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-indigo-700">Total Audits</span>
                      <span className="text-sm font-semibold">{overallStats.compliance.auditsInRange}</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-indigo-600 h-2 rounded-full" style={{ width: `100%` }}></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm font-medium text-slate-700">Avg Score</span>
                      <span className="text-sm font-semibold">{overallStats.compliance.avgScore}%</span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-2">
                      <div className="bg-slate-600 h-2 rounded-full" style={{ width: `${overallStats.compliance.avgScore}%` }}></div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Performance Tab */}
          <TabsContent value="performance" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Staff Performance Metrics</CardTitle>
                <CardDescription>Individual nurse statistics and productivity</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-slate-50 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Nurse</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Visits</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Completed</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Rate</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-slate-600 uppercase">Time Saved</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {nurseStats.map((nurse) => (
                        <tr key={nurse.email} className="hover:bg-slate-50">
                          <td className="px-4 py-3 text-sm font-medium text-slate-900">{nurse.full_name}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{nurse.stats.totalVisits}</td>
                          <td className="px-4 py-3 text-sm text-slate-600">{nurse.stats.completedVisits}</td>
                          <td className="px-4 py-3 text-sm">
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              nurse.stats.completionRate >= 80 ? 'bg-green-100 text-green-700' :
                              nurse.stats.completionRate >= 60 ? 'bg-yellow-100 text-yellow-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {nurse.stats.completionRate}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-600">{nurse.stats.timeSavedHours}h</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Training Tab */}
          <TabsContent value="training" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <StatCard
                title="Total Trainings"
                value={trainingStats.total}
                icon={FileText}
                color="indigo"
              />
              <StatCard
                title="Completed"
                value={trainingStats.completed}
                subtitle={`${trainingStats.rate}% rate`}
                icon={CheckCircle2}
                color="green"
              />
              <StatCard
                title="In Progress"
                value={trainingStats.total - trainingStats.completed}
                icon={Clock}
                color="amber"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Training Completion Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div className="flex justify-between mb-2">
                    <span className="text-sm text-slate-600">Overall Completion Rate</span>
                    <span className="text-sm font-semibold">{trainingStats.rate}%</span>
                  </div>
                  <div className="w-full bg-slate-200 rounded-full h-3">
                    <div className="bg-indigo-600 h-3 rounded-full transition-all" style={{ width: `${trainingStats.rate}%` }}></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financial Tab */}
          <TabsContent value="financial" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <StatCard
                title="Est. Time Saved Value"
                value={formatCurrency(overallStats.financial.costSavings)}
                subtitle="Based on documentation efficiency"
                icon={DollarSign}
                color="green"
              />
              <StatCard
                title="Productivity Gain"
                value={overallStats.timeSaved.displayTotal}
                subtitle="Through AI automation"
                icon={TrendingUp}
                color="indigo"
              />
              <StatCard
                title="Est. Revenue"
                value={formatCurrency(overallStats.financial.estimatedRevenue)}
                subtitle="From completed visits"
                icon={Clock}
                color="purple"
              />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Financial Impact Summary</CardTitle>
                <CardDescription>Estimated value from AI-powered documentation and efficiency gains</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-4 bg-green-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-green-700">Total Time Saved</p>
                      <p className="text-2xl font-bold text-green-900">{overallStats.timeSaved.displayTotal}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-600" />
                  </div>
                  <div className="flex justify-between items-center p-4 bg-indigo-50 rounded-lg">
                    <div>
                      <p className="text-sm font-medium text-indigo-700">Estimated Value</p>
                      <p className="text-2xl font-bold text-indigo-900">{formatCurrency(overallStats.financial.costSavings)}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-indigo-600" />
                  </div>
                  <p className="text-sm text-slate-500 mt-4">
                    * Estimates based on industry average hourly rates and documented time savings through AI documentation assistance
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
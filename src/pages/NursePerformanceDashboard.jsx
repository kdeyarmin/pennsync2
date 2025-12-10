import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Award,
  AlertTriangle,
  Target,
  BookOpen,
  Activity,
  CheckCircle2,
  Clock,
  Users,
  FileText,
  Brain,
  Sparkles,
  Lightbulb,
  ChevronRight
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

export default function NursePerformanceDashboard() {
  const [selectedNurse, setSelectedNurse] = useState('');
  const [dateRange, setDateRange] = useState('30');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: currentUser?.role === 'admin',
    initialData: []
  });

  const nurseEmail = currentUser?.role === 'admin' && selectedNurse 
    ? selectedNurse 
    : currentUser?.email;

  const { data: performanceData, isLoading, refetch } = useQuery({
    queryKey: ['nursePerformance', nurseEmail, dateRange],
    queryFn: async () => {
      const response = await base44.functions.invoke('analyzeNursePerformance', {
        nurse_email: nurseEmail,
        date_range_days: parseInt(dateRange)
      });
      return response.data || response;
    },
    enabled: !!nurseEmail
  });

  const metrics = performanceData?.metrics;
  const insights = performanceData?.insights;
  const skillGaps = performanceData?.skill_gaps || [];

  const getScoreColor = (score) => {
    if (score >= 90) return 'text-green-600 bg-green-50';
    if (score >= 80) return 'text-blue-600 bg-blue-50';
    if (score >= 70) return 'text-yellow-600 bg-yellow-50';
    return 'text-red-600 bg-red-50';
  };

  const getGradeColor = (grade) => {
    if (grade === 'A' || grade === 'A+') return 'bg-green-500';
    if (grade === 'B' || grade === 'B+') return 'bg-blue-500';
    if (grade === 'C') return 'bg-yellow-500';
    return 'bg-red-500';
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            Loading performance data...
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Nurse Performance Dashboard</h1>
            <p className="text-gray-600 mt-1">AI-powered insights and personalized recommendations</p>
          </div>
          {currentUser?.role === 'admin' && (
            <Select value={selectedNurse} onValueChange={setSelectedNurse}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select nurse..." />
              </SelectTrigger>
              <SelectContent>
                {allUsers.filter(u => u.role === 'user').map(user => (
                  <SelectItem key={user.email} value={user.email}>
                    {user.full_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        <div className="flex gap-2">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7">Last 7 days</SelectItem>
              <SelectItem value="30">Last 30 days</SelectItem>
              <SelectItem value="90">Last 90 days</SelectItem>
              <SelectItem value="365">Last year</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => refetch()} variant="outline">
            Refresh
          </Button>
        </div>
      </div>

      {!performanceData ? (
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            Select a nurse to view performance data
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Performance Grade & Summary */}
          <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className={`w-20 h-20 rounded-full ${getGradeColor(insights?.performance_grade || 'B')} flex items-center justify-center shadow-lg`}>
                    <span className="text-3xl font-bold text-white">{insights?.performance_grade || 'B'}</span>
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold text-gray-900 mb-1">Overall Performance</h2>
                    <p className="text-gray-700">{insights?.overall_summary}</p>
                  </div>
                </div>
                <Award className="w-16 h-16 text-blue-300" />
              </div>
            </CardContent>
          </Card>

          {/* Key Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Compliance Score</p>
                    <p className={`text-3xl font-bold ${getScoreColor(metrics?.avg_compliance_score)}`}>
                      {metrics?.avg_compliance_score || 0}%
                    </p>
                  </div>
                  <CheckCircle2 className="w-8 h-8 text-blue-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Completed Visits</p>
                    <p className="text-3xl font-bold text-gray-900">{metrics?.completed_visits || 0}</p>
                  </div>
                  <Users className="w-8 h-8 text-green-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">AI Adoption</p>
                    <p className="text-3xl font-bold text-purple-600">
                      {metrics?.suggestion_acceptance_rate || 0}%
                    </p>
                  </div>
                  <Brain className="w-8 h-8 text-purple-400" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 mb-1">Avg Doc Time</p>
                    <p className="text-3xl font-bold text-orange-600">
                      {metrics?.avg_documentation_time || 0}m
                    </p>
                  </div>
                  <Clock className="w-8 h-8 text-orange-400" />
                </div>
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="insights" className="space-y-6">
            <TabsList className="grid w-full grid-cols-5">
              <TabsTrigger value="insights">AI Insights</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="suggestions">AI Suggestions</TabsTrigger>
              <TabsTrigger value="skills">Skill Gaps</TabsTrigger>
              <TabsTrigger value="activities">Activities</TabsTrigger>
            </TabsList>

            {/* AI Insights Tab */}
            <TabsContent value="insights" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Strengths */}
                <Card className="border-green-200">
                  <CardHeader className="bg-green-50">
                    <CardTitle className="flex items-center gap-2 text-green-900">
                      <Award className="w-5 h-5" />
                      Key Strengths
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <ul className="space-y-3">
                      {insights?.strengths?.map((strength, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 flex-shrink-0" />
                          <span className="text-gray-700">{strength}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>

                {/* Areas for Improvement */}
                <Card className="border-amber-200">
                  <CardHeader className="bg-amber-50">
                    <CardTitle className="flex items-center gap-2 text-amber-900">
                      <Target className="w-5 h-5" />
                      Growth Opportunities
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="p-6">
                    <ul className="space-y-4">
                      {insights?.areas_for_improvement?.map((area, idx) => (
                        <li key={idx} className="border-l-4 border-amber-400 pl-3">
                          <p className="font-semibold text-gray-900 mb-1">{area.area}</p>
                          <p className="text-sm text-gray-600">{area.suggestion}</p>
                          <Badge className="mt-2 text-xs" variant={area.priority === 'high' ? 'destructive' : 'secondary'}>
                            {area.priority} priority
                          </Badge>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </div>

              {/* Training Recommendations */}
              <Card className="border-blue-200">
                <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                  <CardTitle className="flex items-center gap-2 text-blue-900">
                    <BookOpen className="w-5 h-5" />
                    Personalized Training Recommendations
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <div className="space-y-3">
                    {insights?.training_recommendations?.map((rec, idx) => (
                      <div key={idx} className="flex items-start gap-3 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <Lightbulb className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="font-semibold text-gray-900">{rec.topic}</p>
                          <p className="text-sm text-gray-600 mt-1">{rec.reason}</p>
                          <div className="flex items-center gap-2 mt-2">
                            <Badge variant={rec.urgency === 'high' ? 'destructive' : rec.urgency === 'medium' ? 'default' : 'secondary'}>
                              {rec.urgency} urgency
                            </Badge>
                            <Button size="sm" variant="outline" className="ml-auto">
                              Start Training
                              <ChevronRight className="w-3 h-3 ml-1" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Risk Factors */}
              {insights?.risk_factors?.length > 0 && (
                <Alert variant="destructive">
                  <AlertTriangle className="w-4 h-4" />
                  <AlertDescription>
                    <strong className="block mb-2">Performance Risk Factors:</strong>
                    <ul className="list-disc ml-4 space-y-1">
                      {insights.risk_factors.map((risk, idx) => (
                        <li key={idx}>{risk}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </TabsContent>

            {/* Trends Tab */}
            <TabsContent value="trends" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Compliance Trend */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Compliance Score Trend</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={metrics?.compliance_trend || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" />
                        <YAxis domain={[0, 100]} />
                        <Tooltip />
                        <Line type="monotone" dataKey="score" stroke="#3B82F6" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Productivity Trend */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Visit Productivity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={metrics?.productivity_trend || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="visits" fill="#10B981" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* AI Tool Adoption */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">AI Tool Adoption</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <LineChart data={metrics?.ai_adoption_trend || []}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="week" />
                        <YAxis />
                        <Tooltip />
                        <Line type="monotone" dataKey="usage" stroke="#8B5CF6" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* Visit Types Distribution */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Visit Types</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <PieChart>
                        <Pie
                          data={Object.entries(metrics?.visits_by_type || {}).map(([type, count]) => ({
                            name: type.replace(/_/g, ' '),
                            value: count
                          }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {Object.keys(metrics?.visits_by_type || {}).map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Detailed Metrics */}
              <div className="grid md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm text-gray-600 mb-2">Template Usage Rate</p>
                    <div className="flex items-center gap-3">
                      <Progress 
                        value={(metrics?.template_usage / metrics?.completed_visits * 100) || 0} 
                        className="flex-1"
                      />
                      <span className="text-lg font-semibold">
                        {Math.round((metrics?.template_usage / metrics?.completed_visits * 100) || 0)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm text-gray-600 mb-2">AI Scribe Adoption</p>
                    <div className="flex items-center gap-3">
                      <Progress 
                        value={(metrics?.ai_scribe_usage / metrics?.completed_visits * 100) || 0} 
                        className="flex-1"
                      />
                      <span className="text-lg font-semibold">
                        {Math.round((metrics?.ai_scribe_usage / metrics?.completed_visits * 100) || 0)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <p className="text-sm text-gray-600 mb-2">Voice Commands</p>
                    <div className="flex items-center gap-3">
                      <Progress 
                        value={Math.min((metrics?.voice_command_usage / 20) * 100, 100)} 
                        className="flex-1"
                      />
                      <span className="text-lg font-semibold">{metrics?.voice_command_usage || 0}</span>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>

            {/* AI Suggestions Tab */}
            <TabsContent value="suggestions" className="space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                {/* Suggestion Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">AI Suggestion Analytics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg">
                      <span className="text-gray-700">Total Suggestions Received</span>
                      <span className="text-2xl font-bold text-blue-600">{metrics?.total_suggestions_received}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-green-50 rounded-lg">
                      <span className="text-gray-700">Suggestions Applied</span>
                      <span className="text-2xl font-bold text-green-600">{metrics?.suggestions_applied}</span>
                    </div>
                    <div className="flex items-center justify-between p-4 bg-purple-50 rounded-lg">
                      <span className="text-gray-700">Acceptance Rate</span>
                      <span className="text-2xl font-bold text-purple-600">{metrics?.suggestion_acceptance_rate}%</span>
                    </div>
                  </CardContent>
                </Card>

                {/* Suggestions by Source */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Suggestions by Source</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={250}>
                      <BarChart data={Object.entries(metrics?.suggestions_by_source || {}).map(([source, count]) => ({
                        name: source.replace(/_/g, ' '),
                        count
                      }))}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8B5CF6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Unaddressed Recommendations */}
              <Card className="border-amber-200">
                <CardHeader className="bg-amber-50">
                  <CardTitle className="text-lg flex items-center gap-2 text-amber-900">
                    <Sparkles className="w-5 h-5" />
                    Pending AI Suggestions ({performanceData?.recent_recommendations?.length || 0})
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ScrollArea className="h-96">
                    <div className="space-y-3">
                      {performanceData?.recent_recommendations?.map((rec, idx) => (
                        <div key={idx} className="p-4 border rounded-lg hover:bg-gray-50">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <Badge variant={rec.severity === 'critical' ? 'destructive' : rec.severity === 'high' ? 'default' : 'secondary'}>
                                  {rec.severity}
                                </Badge>
                                <Badge variant="outline">{rec.recommendation_type}</Badge>
                                <span className="text-xs text-gray-500">{rec.source.replace(/_/g, ' ')}</span>
                              </div>
                              <p className="text-sm text-gray-900">{rec.recommendation_text}</p>
                              {rec.context_data?.element && (
                                <p className="text-xs text-gray-500 mt-1">Context: {rec.context_data.element}</p>
                              )}
                            </div>
                            <Button size="sm" variant="outline">Review</Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Skill Gaps Tab */}
            <TabsContent value="skills" className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="w-5 h-5 text-red-600" />
                    Identified Skill Gaps
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  {skillGaps.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-green-500" />
                      <p>No significant skill gaps identified. Great work!</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {skillGaps.map((gap, idx) => (
                        <div key={idx} className="border rounded-lg p-4 bg-gradient-to-r from-red-50 to-orange-50">
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2">
                                <h3 className="font-semibold text-gray-900">{gap.skill}</h3>
                                <Badge variant="destructive">{gap.gap_severity} priority</Badge>
                              </div>
                              <p className="text-sm text-gray-600 mb-3">{gap.recommendation}</p>
                              <div className="flex items-center gap-2">
                                <span className="text-xs text-gray-500">Current level:</span>
                                <Badge variant="outline">{gap.current_level.replace(/_/g, ' ')}</Badge>
                              </div>
                            </div>
                            <Button size="sm" className="bg-blue-600 hover:bg-blue-700">
                              Take Training
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Activities Tab */}
            <TabsContent value="activities">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="w-5 h-5" />
                    Recent Activity Log
                  </CardTitle>
                </CardHeader>
                <CardContent className="p-6">
                  <ScrollArea className="h-96">
                    <div className="space-y-2">
                      {performanceData?.recent_activities?.map((activity, idx) => (
                        <div key={idx} className="flex items-center gap-3 p-3 border-b hover:bg-gray-50">
                          <div className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0"></div>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-gray-900">
                              {activity.action.replace(/_/g, ' ')}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(activity.created_date).toLocaleString()}
                            </p>
                          </div>
                          {activity.details?.compliance_score && (
                            <Badge className={getScoreColor(activity.details.compliance_score)}>
                              {activity.details.compliance_score}%
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}
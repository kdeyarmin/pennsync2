import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
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
  ResponsiveContainer
} from 'recharts';
import {
  Award,
  AlertCircle,
  CheckCircle2,
  Clock,
  BarChart3
} from "lucide-react";
import PageContainer from "@/components/ui/PageContainer";
import PageHeader from "@/components/ui/PageHeader";

export default function AdminTrainingAnalytics() {
  const [_selectedModule, _setSelectedModule] = useState('all');
  const [_dateRange, _setDateRange] = useState('30');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    enabled: currentUser?.role === 'admin'
  });

  const { data: completions = [] } = useQuery({
    queryKey: ['allCompletions'],
    queryFn: () => base44.entities.TrainingCompletion.list(),
    enabled: currentUser?.role === 'admin'
  });

  const { data: modules = [] } = useQuery({
    queryKey: ['trainingModules'],
    queryFn: () => base44.entities.TrainingModule.list(),
    enabled: currentUser?.role === 'admin'
  });

  const { data: recommendations = [] } = useQuery({
    queryKey: ['allRecommendations'],
    queryFn: () => base44.entities.TrainingRecommendation.list(),
    enabled: currentUser?.role === 'admin'
  });

  if (currentUser?.role !== 'admin') {
    return (
      <div className="p-8">
        <Card>
          <CardContent className="p-12 text-center text-red-600">
            Access Denied: Admin privileges required
          </CardContent>
        </Card>
      </div>
    );
  }

  const nurses = allUsers.filter(u => u.role === 'user');
  
  // Analytics calculations
  const totalCompletions = completions.filter(c => c.status === 'completed').length;
  const avgScore = completions.length > 0
    ? completions.reduce((sum, c) => sum + (c.score || 0), 0) / completions.length
    : 0;
  const inProgress = completions.filter(c => c.status === 'in_progress').length;
  const unaddressedRecs = recommendations.filter(r => !r.addressed).length;

  // Completion rate by nurse
  const nurseCompletionData = nurses.map(nurse => {
    const nurseCompletions = completions.filter(c => 
      c.nurse_email === nurse.email && c.status === 'completed'
    );
    return {
      name: nurse.full_name || nurse.email,
      completions: nurseCompletions.length,
      avgScore: nurseCompletions.length > 0
        ? Math.round(nurseCompletions.reduce((sum, c) => sum + (c.score || 0), 0) / nurseCompletions.length)
        : 0
    };
  }).sort((a, b) => b.completions - a.completions);

  // Module popularity
  const moduleData = modules.map(module => {
    const moduleCompletions = completions.filter(c => c.training_module_id === module.id);
    return {
      name: module.title.substring(0, 30) + (module.title.length > 30 ? '...' : ''),
      completions: moduleCompletions.length,
      avgScore: moduleCompletions.length > 0
        ? Math.round(moduleCompletions.reduce((sum, c) => sum + (c.score || 0), 0) / moduleCompletions.length)
        : 0
    };
  }).sort((a, b) => b.completions - a.completions).slice(0, 10);

  // Category distribution
  const categoryData = {};
  modules.forEach(m => {
    categoryData[m.category] = (categoryData[m.category] || 0) + 1;
  });
  const categoryChartData = Object.entries(categoryData).map(([cat, count]) => ({
    name: cat,
    value: count
  }));

  // Completion trends (by week)
  const weeklyData = {};
  completions.forEach(c => {
    if (c.completion_date) {
      const week = new Date(c.completion_date).toISOString().substring(0, 10);
      weeklyData[week] = (weeklyData[week] || 0) + 1;
    }
  });
  const trendData = Object.entries(weeklyData)
    .sort((a, b) => a[0].localeCompare(b[0]))
    .slice(-8)
    .map(([date, count]) => ({
      date: date.substring(5),
      completions: count
    }));

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899'];

  return (
    <PageContainer>
      <PageHeader
        icon={BarChart3}
        eyebrow="Manage"
        title="Training Analytics Dashboard"
        description="Monitor training progress and effectiveness across your agency"
        favoritePage="AdminTrainingAnalytics"
      />

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Total Completions</p>
                <p className="text-3xl font-bold text-blue-900">{totalCompletions}</p>
              </div>
              <CheckCircle2 className="w-10 h-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Avg Score</p>
                <p className="text-3xl font-bold text-green-900">{avgScore.toFixed(0)}%</p>
              </div>
              <Award className="w-10 h-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 font-medium">In Progress</p>
                <p className="text-3xl font-bold text-orange-900">{inProgress}</p>
              </div>
              <Clock className="w-10 h-10 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Pending Recs</p>
                <p className="text-3xl font-bold text-purple-900">{unaddressedRecs}</p>
              </div>
              <AlertCircle className="w-10 h-10 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="nurses">Nurse Performance</TabsTrigger>
          <TabsTrigger value="modules">Module Analytics</TabsTrigger>
          <TabsTrigger value="trends">Trends</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Category Distribution</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={categoryChartData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                    >
                      {categoryChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Completion Trend</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={trendData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="completions" stroke="#3B82F6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="nurses" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Nurse Training Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {nurseCompletionData.map((nurse, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{nurse.name}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{nurse.completions} completed</Badge>
                          <Badge className="bg-green-500">{nurse.avgScore}% avg</Badge>
                        </div>
                      </div>
                      <Progress value={(nurse.completions / modules.length) * 100} className="h-2" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="modules" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Top 10 Training Modules</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <BarChart data={moduleData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" angle={-45} textAnchor="end" height={150} />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="completions" fill="#3B82F6" name="Completions" />
                  <Bar dataKey="avgScore" fill="#10B981" name="Avg Score %" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Training Activity Over Time</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={trendData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Legend />
                  <Line type="monotone" dataKey="completions" stroke="#3B82F6" strokeWidth={3} name="Completions" />
                </LineChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
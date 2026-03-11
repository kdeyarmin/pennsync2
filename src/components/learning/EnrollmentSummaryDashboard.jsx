import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { TrendingUp, Users, CheckCircle, AlertCircle } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import ReportFilters from './ReportFilters';

const COLORS = ['#0b407f', '#fbbf24', '#10b981', '#ef4444'];

export default function EnrollmentSummaryDashboard() {
  const [filters, setFilters] = useState({
    businessLine: 'home_health',
    dateStart: '',
    dateEnd: '',
    employee: '',
    course: '',
    plan: '',
    status: 'all'
  });

  const { data: assignments = [] } = useQuery({
    queryKey: ['assignments-summary', filters],
    queryFn: async () => {
      let query = {};
      if (filters.status && filters.status !== 'all') {
        query.status = filters.status;
      }
      return await base44.entities.TrainingAssignment.list('-created_date', 1000);
    },
    initialData: []
  });

  const { data: attempts = [] } = useQuery({
    queryKey: ['attempts-summary', filters],
    queryFn: () => base44.entities.TrainingAttempt.list('-submitted_at', 1000),
    initialData: []
  });

  const stats = useMemo(() => {
    const filtered = assignments.filter(a => {
      if (filters.status && filters.status !== 'all' && a.status !== filters.status) return false;
      if (filters.employee && !a.assigned_to_user_id?.includes(filters.employee)) return false;
      if (filters.course && !a.course_title?.includes(filters.course)) return false;
      return true;
    });

    const completed = filtered.filter(a => a.status === 'completed').length;
    const overdue = filtered.filter(a => a.status === 'overdue').length;
    const avgScore = attempts.length > 0
      ? Math.round(attempts.reduce((sum, a) => sum + (a.score || 0), 0) / attempts.length)
      : 0;

    return {
      totalEnrolled: filtered.length,
      completed,
      completionRate: filtered.length > 0 ? Math.round((completed / filtered.length) * 100) : 0,
      overdue,
      avgScore
    };
  }, [assignments, attempts, filters]);

  const courseCompletionData = useMemo(() => {
    const grouped = {};
    assignments.forEach(a => {
      if (!grouped[a.course_title]) {
        grouped[a.course_title] = { name: a.course_title, completed: 0, total: 0 };
      }
      grouped[a.course_title].total++;
      if (a.status === 'completed') {
        grouped[a.course_title].completed++;
      }
    });
    return Object.values(grouped).slice(0, 10);
  }, [assignments]);

  const statusData = useMemo(() => {
    const statuses = { assigned: 0, in_progress: 0, completed: 0, overdue: 0 };
    assignments.forEach(a => {
      if (statuses.hasOwnProperty(a.status)) {
        statuses[a.status]++;
      }
    });
    return [
      { name: 'Assigned', value: statuses.assigned, fill: '#93c5fd' },
      { name: 'In Progress', value: statuses.in_progress, fill: '#fbbf24' },
      { name: 'Completed', value: statuses.completed, fill: '#10b981' },
      { name: 'Overdue', value: statuses.overdue, fill: '#ef4444' }
    ];
  }, [assignments]);

  return (
    <div className="space-y-6">
      <ReportFilters
        onFilterChange={setFilters}
        businessLineOptions={[
          { value: 'home_health', label: 'Home Health' },
          { value: 'hospice', label: 'Hospice' },
          { value: 'all', label: 'All' }
        ]}
        showPlan={false}
        onExport={(format) => {
          // Export functionality
        }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border-l-4 border-l-blue-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Enrolled</p>
                <p className="text-3xl font-bold text-blue-600">{stats.totalEnrolled}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed</p>
                <p className="text-3xl font-bold text-green-600">{stats.completed}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-yellow-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completion Rate</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.completionRate}%</p>
              </div>
              <TrendingUp className="w-8 h-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-600">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Overdue</p>
                <p className="text-3xl font-bold text-red-600">{stats.overdue}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.fill} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top 10 Course Completions</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={courseCompletionData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="completed" fill="#10b981" name="Completed" />
                <Bar dataKey="total" fill="#93c5fd" name="Total" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
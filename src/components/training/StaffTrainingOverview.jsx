import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  Target,
  BarChart3
} from "lucide-react";

export default function StaffTrainingOverview() {
  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const { data: allCompletions = [] } = useQuery({
    queryKey: ['allTrainingCompletions'],
    queryFn: () => base44.entities.TrainingCompletion.list('-completion_date', 500),
    initialData: [],
  });

  const { data: allProgress = [] } = useQuery({
    queryKey: ['allTrainingProgress'],
    queryFn: () => base44.entities.MicroLearningProgress.list('-created_date', 500),
    initialData: [],
  });

  const nurses = allUsers.filter(u => u.role === 'user');

  // Calculate per-nurse statistics
  const nurseStats = nurses.map(nurse => {
    const nurseCompletions = allCompletions.filter(c => c.nurse_email === nurse.email);
    const nurseProgress = allProgress.filter(p => p.nurse_email === nurse.email);
    
    const completed = nurseCompletions.filter(c => c.status === 'completed').length;
    const inProgress = nurseCompletions.filter(c => c.status === 'in_progress').length;
    const assigned = nurseCompletions.length;
    
    const avgScore = nurseProgress.length > 0
      ? Math.round(nurseProgress.reduce((sum, p) => sum + (p.score || 0), 0) / nurseProgress.length)
      : 0;
    
    const completionRate = assigned > 0 ? Math.round((completed / assigned) * 100) : 0;

    return {
      nurse,
      completed,
      inProgress,
      assigned,
      avgScore,
      completionRate,
      lastActivity: nurseCompletions[0]?.completion_date || nurseProgress[0]?.created_date
    };
  });

  // Sort by completion rate (lowest first for action items)
  const sortedStats = [...nurseStats].sort((a, b) => a.completionRate - b.completionRate);

  // Calculate aggregate stats
  const totalAssigned = allCompletions.length;
  const totalCompleted = allCompletions.filter(c => c.status === 'completed').length;
  const overallCompletionRate = totalAssigned > 0 ? Math.round((totalCompleted / totalAssigned) * 100) : 0;
  const avgScoreAll = allProgress.length > 0
    ? Math.round(allProgress.reduce((sum, p) => sum + (p.score || 0), 0) / allProgress.length)
    : 0;

  const atRisk = nurseStats.filter(s => s.completionRate < 60 || s.avgScore < 70).length;

  return (
    <div className="space-y-6">
      {/* Aggregate Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                <Users className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Active Nurses</p>
                <p className="text-2xl font-bold">{nurses.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Completion Rate</p>
                <p className="text-2xl font-bold">{overallCompletionRate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-navy-100 rounded-lg flex items-center justify-center">
                <Target className="w-5 h-5 text-navy-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">Avg Score</p>
                <p className="text-2xl font-bold">{avgScoreAll}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <p className="text-sm text-slate-500">At Risk</p>
                <p className="text-2xl font-bold">{atRisk}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Staff Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Staff Training Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px]">
            <div className="space-y-2">
              {sortedStats.map((stat) => (
                <div
                  key={stat.nurse.email}
                  className={`p-4 rounded-lg border-2 ${
                    stat.completionRate < 60 ? 'bg-red-50 border-red-200' :
                    stat.completionRate < 80 ? 'bg-yellow-50 border-yellow-200' :
                    'bg-green-50 border-green-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white font-bold">
                        {stat.nurse.full_name?.charAt(0) || 'U'}
                      </div>
                      <div>
                        <p className="font-semibold text-slate-900">{stat.nurse.full_name}</p>
                        <p className="text-xs text-slate-500">{stat.nurse.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {stat.completionRate >= 80 ? (
                        <Badge className="bg-green-600 text-white">On Track</Badge>
                      ) : stat.completionRate >= 60 ? (
                        <Badge className="bg-yellow-600 text-white">Needs Attention</Badge>
                      ) : (
                        <Badge className="bg-red-600 text-white">At Risk</Badge>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                    <div className="text-center p-2 bg-white rounded border">
                      <p className="text-xs text-slate-500">Completion</p>
                      <p className="text-lg font-bold text-slate-900">{stat.completionRate}%</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded border">
                      <p className="text-xs text-slate-500">Avg Score</p>
                      <p className="text-lg font-bold text-slate-900">{stat.avgScore}%</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded border">
                      <p className="text-xs text-slate-500">Completed</p>
                      <p className="text-lg font-bold text-slate-900">{stat.completed}/{stat.assigned}</p>
                    </div>
                    <div className="text-center p-2 bg-white rounded border">
                      <p className="text-xs text-slate-500">In Progress</p>
                      <p className="text-lg font-bold text-slate-900">{stat.inProgress}</p>
                    </div>
                  </div>

                  <div className="mb-2">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-xs text-slate-600">Training Progress</span>
                      <span className="text-xs text-slate-500">{stat.completed}/{stat.assigned}</span>
                    </div>
                    <Progress value={stat.completionRate} className="h-2" />
                  </div>

                  {stat.lastActivity && (
                    <p className="text-xs text-slate-500">
                      Last activity: {new Date(stat.lastActivity).toLocaleDateString()}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}
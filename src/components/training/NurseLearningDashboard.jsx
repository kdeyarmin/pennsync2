import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  BarChart3,
  TrendingUp,
  Award,
  Target,
  AlertCircle,
  CheckCircle2,
  Clock,
  Brain,
  FileText
} from "lucide-react";
import { format } from "date-fns";

export default function NurseLearningDashboard({ 
  nurseEmail, 
  trainingProgress = [], 
  recommendations = [] 
}) {
  // Calculate statistics
  const totalCompleted = trainingProgress.filter(p => p.status === 'completed').length;
  const totalInProgress = trainingProgress.filter(p => p.status === 'in_progress').length;
  const averageScore = trainingProgress.length > 0
    ? trainingProgress.reduce((sum, p) => sum + (p.score || 0), 0) / trainingProgress.length
    : 0;

  // Group by skill area
  const skillAreas = trainingProgress.reduce((acc, item) => {
    if (!acc[item.skill_area]) {
      acc[item.skill_area] = [];
    }
    acc[item.skill_area].push(item);
    return acc;
  }, {});

  // Calculate skill area stats
  const skillAreaStats = Object.entries(skillAreas).map(([area, items]) => {
    const completed = items.filter(i => i.status === 'completed').length;
    const avgScore = items.reduce((sum, i) => sum + (i.score || 0), 0) / items.length;
    return {
      area,
      completed,
      total: items.length,
      avgScore,
      items
    };
  }).sort((a, b) => b.completed - a.completed);

  // Recent activity
  const recentActivity = [...trainingProgress]
    .sort((a, b) => new Date(b.created_date) - new Date(a.created_date))
    .slice(0, 10);

  // Identify weak areas (score < 70)
  const weakAreas = skillAreaStats.filter(s => s.avgScore < 70);

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Completion Rate</p>
                <p className="text-3xl font-bold text-gray-900">
                  {trainingProgress.length > 0 
                    ? Math.round((totalCompleted / trainingProgress.length) * 100)
                    : 0}%
                </p>
              </div>
              <CheckCircle2 className="w-12 h-12 text-green-600" />
            </div>
            <Progress 
              value={trainingProgress.length > 0 ? (totalCompleted / trainingProgress.length) * 100 : 0} 
              className="mt-3" 
            />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Average Score</p>
                <p className="text-3xl font-bold text-gray-900">{averageScore.toFixed(0)}%</p>
              </div>
              <Award className="w-12 h-12 text-yellow-600" />
            </div>
            <Progress value={averageScore} className="mt-3" />
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Modules</p>
                <p className="text-3xl font-bold text-gray-900">{trainingProgress.length}</p>
                <p className="text-xs text-gray-500 mt-1">
                  {totalInProgress} in progress
                </p>
              </div>
              <Brain className="w-12 h-12 text-indigo-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weak Areas Alert */}
      {weakAreas.length > 0 && (
        <Card className="bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              Areas Needing Attention
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {weakAreas.map((area) => (
                <div key={area.area} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                  <div>
                    <p className="font-medium text-gray-900">{area.area}</p>
                    <p className="text-sm text-gray-600">
                      {area.completed} / {area.total} completed
                    </p>
                  </div>
                  <Badge className="bg-orange-100 text-orange-800">
                    {area.avgScore.toFixed(0)}% avg
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Skill Area Performance */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Performance by Topic
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {skillAreaStats.map((stat) => (
              <div key={stat.area} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Target className="w-4 h-4 text-gray-500" />
                    <span className="font-medium text-gray-900">{stat.area}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-gray-600">
                      {stat.completed} / {stat.total} modules
                    </span>
                    <Badge 
                      className={
                        stat.avgScore >= 90 ? 'bg-green-100 text-green-800' :
                        stat.avgScore >= 70 ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }
                    >
                      {stat.avgScore.toFixed(0)}%
                    </Badge>
                  </div>
                </div>
                <Progress value={stat.avgScore} className="h-2" />
              </div>
            ))}

            {skillAreaStats.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Brain className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No training completed yet. Start with a practice scenario or quiz!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Recent Activity */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-indigo-600" />
            Recent Activity
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <div className={`p-2 rounded-lg ${
                  activity.module_type === 'quiz' ? 'bg-purple-100' : 'bg-indigo-100'
                }`}>
                  {activity.module_type === 'quiz' ? (
                    <Brain className="w-4 h-4 text-purple-600" />
                  ) : (
                    <FileText className="w-4 h-4 text-indigo-600" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-gray-900">{activity.skill_area}</p>
                    <Badge className={
                      activity.status === 'completed' ? 'bg-green-100 text-green-800' :
                      activity.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                      'bg-red-100 text-red-800'
                    }>
                      {activity.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="capitalize">{activity.module_type}</span>
                    {activity.score && (
                      <>
                        <span>•</span>
                        <span className="font-medium">{activity.score}%</span>
                      </>
                    )}
                    <span>•</span>
                    <span>{format(new Date(activity.created_date), 'MMM d, h:mm a')}</span>
                  </div>
                </div>
              </div>
            ))}

            {recentActivity.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                <p>No recent activity. Start your learning journey today!</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Active Recommendations */}
      {recommendations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-orange-600" />
              Training Recommendations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recommendations.map((rec) => (
                <div key={rec.id} className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge className="bg-amber-100 text-amber-800 text-xs">
                          {rec.recommendation_type}
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {rec.severity}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-700">{rec.recommendation_text}</p>
                      <p className="text-xs text-gray-500 mt-1">Source: {rec.source}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
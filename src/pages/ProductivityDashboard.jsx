import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  Target, 
  MapPin,
  Calendar,
  Trophy,
  Zap
} from "lucide-react";
import { format, startOfWeek, endOfWeek, differenceInMinutes } from "date-fns";

export default function ProductivityDashboard() {
  const today = format(new Date(), 'yyyy-MM-dd');
  const weekStart = format(startOfWeek(new Date()), 'yyyy-MM-dd');
  const weekEnd = format(endOfWeek(new Date()), 'yyyy-MM-dd');

  const { data: todayVisits } = useQuery({
    queryKey: ['todayVisits'],
    queryFn: () => base44.entities.Visit.filter({ visit_date: today }),
    initialData: [],
  });

  const { data: weekVisits } = useQuery({
    queryKey: ['weekVisits'],
    queryFn: async () => {
      const allVisits = await base44.entities.Visit.list('-visit_date', 100);
      return allVisits.filter(v => v.visit_date >= weekStart && v.visit_date <= weekEnd);
    },
    initialData: [],
  });

  // Calculate metrics
  const completedToday = todayVisits.filter(v => v.status === 'completed').length;
  const totalToday = todayVisits.length;
  const completionRate = totalToday > 0 ? Math.round((completedToday / totalToday) * 100) : 0;

  const completedThisWeek = weekVisits.filter(v => v.status === 'completed').length;
  
  // Calculate average documentation time
  const completedWithTimes = todayVisits.filter(v => 
    v.status === 'completed' && v.start_time && v.end_time
  );
  
  let avgDocTime = 0;
  if (completedWithTimes.length > 0) {
    const totalMinutes = completedWithTimes.reduce((sum, visit) => {
      const start = new Date(`2000-01-01 ${visit.start_time}`);
      const end = new Date(`2000-01-01 ${visit.end_time}`);
      return sum + differenceInMinutes(end, start);
    }, 0);
    avgDocTime = Math.round(totalMinutes / completedWithTimes.length);
  }

  // Time saved estimate (assumes AI features save 15 min per visit)
  const timeSavedToday = completedToday * 15;

  // Efficiency score (0-100)
  const targetTimePerVisit = 45; // minutes
  const efficiencyScore = avgDocTime > 0 
    ? Math.min(100, Math.round((targetTimePerVisit / avgDocTime) * 100))
    : 0;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">Productivity Dashboard</h1>
        <p className="text-gray-600">Track your efficiency and celebrate your wins</p>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium mb-1">Completion Rate</p>
                <p className="text-4xl font-bold">{completionRate}%</p>
                <p className="text-blue-100 text-xs mt-1">{completedToday} of {totalToday} today</p>
              </div>
              <CheckCircle2 className="w-12 h-12 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium mb-1">Avg Doc Time</p>
                <p className="text-4xl font-bold">{avgDocTime}</p>
                <p className="text-green-100 text-xs mt-1">minutes per visit</p>
              </div>
              <Clock className="w-12 h-12 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium mb-1">Time Saved Today</p>
                <p className="text-4xl font-bold">{timeSavedToday}</p>
                <p className="text-purple-100 text-xs mt-1">minutes via AI</p>
              </div>
              <Zap className="w-12 h-12 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-none shadow-lg">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium mb-1">Efficiency Score</p>
                <p className="text-4xl font-bold">{efficiencyScore}</p>
                <p className="text-orange-100 text-xs mt-1">out of 100</p>
              </div>
              <Trophy className="w-12 h-12 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Weekly Overview */}
      <Card className="mb-8">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            This Week's Performance
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <p className="text-3xl font-bold text-blue-600">{completedThisWeek}</p>
              <p className="text-sm text-gray-600 mt-1">Visits Completed</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-green-600">{Math.round(completedThisWeek * 15 / 60)}h</p>
              <p className="text-sm text-gray-600 mt-1">Time Saved by AI</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold text-purple-600">{Math.round(completedThisWeek / 5)}</p>
              <p className="text-sm text-gray-600 mt-1">Avg Visits per Day</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Achievements */}
      <Card className="mb-8 bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-yellow-600" />
            Recent Achievements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {completionRate === 100 && (
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-yellow-200">
                <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Perfect Day! 🎉</p>
                  <p className="text-sm text-gray-600">Completed all scheduled visits today</p>
                </div>
              </div>
            )}
            
            {avgDocTime > 0 && avgDocTime < 35 && (
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-green-200">
                <div className="w-10 h-10 bg-green-500 rounded-full flex items-center justify-center">
                  <Zap className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Speed Demon! ⚡</p>
                  <p className="text-sm text-gray-600">Documentation averaging under 35 minutes</p>
                </div>
              </div>
            )}

            {completedThisWeek >= 25 && (
              <div className="flex items-center gap-3 p-3 bg-white rounded-lg border border-blue-200">
                <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                  <Target className="w-5 h-5 text-white" />
                </div>
                <div>
                  <p className="font-semibold text-gray-900">Productivity Pro! 💼</p>
                  <p className="text-sm text-gray-600">25+ visits completed this week</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Tips & Insights */}
      <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-600" />
            AI Insights & Tips
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {avgDocTime > 45 && (
              <div className="p-3 bg-white rounded-lg border border-blue-200">
                <p className="text-sm font-medium text-gray-900 mb-1">💡 Tip: Speed up documentation</p>
                <p className="text-sm text-gray-600">
                  Try using the "Generate Smart Template" before dictating - it pre-fills Medicare requirements and saves 10-15 minutes per visit.
                </p>
              </div>
            )}

            <div className="p-3 bg-white rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-gray-900 mb-1">🎯 Goal for Tomorrow</p>
              <p className="text-sm text-gray-600">
                Complete all visits before 4pm to have admin time at end of day
              </p>
            </div>

            <div className="p-3 bg-white rounded-lg border border-blue-200">
              <p className="text-sm font-medium text-gray-900 mb-1">⭐ You're on track!</p>
              <p className="text-sm text-gray-600">
                Your completion rate is {completionRate >= 90 ? 'excellent' : 'good'}. Keep up the great work!
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { CheckCircle2, Clock, AlertCircle, Award, TrendingUp, Users, Calendar } from "lucide-react";
import { format } from "date-fns";

export default function CompletionTracker({ moduleId, moduleTitle }) {
  const { data: completions = [] } = useQuery({
    queryKey: ['moduleCompletions', moduleId],
    queryFn: () => base44.entities.TrainingCompletion.filter({ 
      training_module_id: moduleId 
    }, '-completion_date'),
    initialData: [],
    enabled: !!moduleId,
  });

  const { data: allUsers = [] } = useQuery({
    queryKey: ['allUsers'],
    queryFn: () => base44.entities.User.list(),
    initialData: [],
  });

  const stats = {
    total: completions.length,
    completed: completions.filter(c => c.status === 'completed').length,
    inProgress: completions.filter(c => c.status === 'in_progress').length,
    assigned: completions.filter(c => c.status === 'assigned').length,
    avgScore: completions.length > 0 
      ? Math.round(completions.reduce((sum, c) => sum + (c.score || 0), 0) / completions.filter(c => c.score).length || 0)
      : 0
  };

  const completionRate = stats.total > 0 ? (stats.completed / stats.total) * 100 : 0;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'in_progress': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'assigned': return <AlertCircle className="w-4 h-4 text-gray-400" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusBadge = (status) => {
    const styles = {
      completed: 'bg-green-100 text-green-800',
      in_progress: 'bg-yellow-100 text-yellow-800',
      assigned: 'bg-gray-100 text-gray-800',
      expired: 'bg-red-100 text-red-800'
    };
    return styles[status] || 'bg-gray-100 text-gray-800';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <TrendingUp className="w-5 h-5 text-blue-600" />
          Completion Tracking
          {moduleTitle && <span className="text-sm font-normal text-gray-500">- {moduleTitle}</span>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-blue-600" />
              <span className="text-xs text-blue-600">Total Assigned</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">{stats.total}</p>
          </div>

          <div className="bg-green-50 p-3 rounded-lg border border-green-200">
            <div className="flex items-center gap-2 mb-1">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-xs text-green-600">Completed</span>
            </div>
            <p className="text-2xl font-bold text-green-900">{stats.completed}</p>
          </div>

          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-yellow-600" />
              <span className="text-xs text-yellow-600">In Progress</span>
            </div>
            <p className="text-2xl font-bold text-yellow-900">{stats.inProgress}</p>
          </div>

          <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-1">
              <Award className="w-4 h-4 text-purple-600" />
              <span className="text-xs text-purple-600">Avg Score</span>
            </div>
            <p className="text-2xl font-bold text-purple-900">{stats.avgScore}%</p>
          </div>
        </div>

        {/* Completion Progress Bar */}
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Completion Rate</span>
            <span className="text-sm font-bold text-gray-900">{Math.round(completionRate)}%</span>
          </div>
          <Progress value={completionRate} className="h-3" />
        </div>

        {/* Individual Completions */}
        <div>
          <h4 className="text-sm font-semibold text-gray-700 mb-3">Individual Progress</h4>
          <ScrollArea className="h-[400px]">
            <div className="space-y-2">
              {completions.map((completion) => {
                const user = allUsers.find(u => u.email === completion.nurse_email);
                return (
                  <div key={completion.id} className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center gap-3 flex-1">
                      {getStatusIcon(completion.status)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">
                          {user?.full_name || completion.nurse_email}
                        </p>
                        <p className="text-xs text-gray-500">
                          {completion.status === 'completed' && completion.completion_date
                            ? `Completed ${format(new Date(completion.completion_date), 'MMM d, yyyy')}`
                            : completion.due_date
                            ? `Due ${format(new Date(completion.due_date), 'MMM d')}`
                            : 'No due date'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {completion.score !== null && completion.score !== undefined && (
                        <Badge className="bg-blue-100 text-blue-800">
                          {completion.score}%
                        </Badge>
                      )}
                      <Badge className={getStatusBadge(completion.status)}>
                        {completion.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                );
              })}
              {completions.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm">No staff assigned to this module yet</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </CardContent>
    </Card>
  );
}
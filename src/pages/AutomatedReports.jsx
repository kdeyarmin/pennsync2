import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Calendar, 
  Users, 
  Send, 
  Download, 
  Clock,
  BarChart3,
  TrendingUp,
  AlertCircle,
  Sparkles,
  Trash2,
  Play,
  Pause
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function AutomatedReports() {
  const [generating, setGenerating] = useState(false);
  const [newSchedule, setNewSchedule] = useState({
    name: '',
    report_type: 'comprehensive_report',
    date_range_days: 30,
    schedule: 'weekly',
    recipients: '',
    include_ai_insights: true
  });

  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: scheduledTasks = [], isLoading } = useQuery({
    queryKey: ['scheduledReports'],
    queryFn: async () => {
      const tasks = await base44.functions.invoke('listScheduledTasks');
      return tasks.data.filter(t => t.function_name === 'generateAIReport');
    },
    enabled: !!currentUser
  });

  const generateReportMutation = useMutation({
    mutationFn: async (params) => {
      const response = await base44.functions.invoke('generateAIReport', params);
      return response.data;
    },
    onSuccess: () => {
      alert('Report generated and downloaded successfully!');
    }
  });

  const createScheduleMutation = useMutation({
    mutationFn: async (schedule) => {
      const recipients = schedule.recipients.split(',').map(r => r.trim()).filter(r => r);
      
      const scheduleConfig = {
        name: schedule.name,
        function_name: 'generateAIReport',
        description: `Automated ${schedule.report_type.replace(/_/g, ' ')} report`,
        function_args: {
          report_type: schedule.report_type,
          date_range_days: parseInt(schedule.date_range_days),
          recipients,
          include_ai_insights: schedule.include_ai_insights
        },
        is_active: true
      };

      // Map schedule frequency to cron/interval
      if (schedule.schedule === 'daily') {
        scheduleConfig.repeat_interval = 1;
        scheduleConfig.repeat_unit = 'days';
        scheduleConfig.start_time = '09:00';
      } else if (schedule.schedule === 'weekly') {
        scheduleConfig.repeat_unit = 'weeks';
        scheduleConfig.repeat_on_days = [1]; // Monday
        scheduleConfig.start_time = '09:00';
      } else if (schedule.schedule === 'monthly') {
        scheduleConfig.repeat_unit = 'months';
        scheduleConfig.repeat_on_day_of_month = 1;
        scheduleConfig.start_time = '09:00';
      }

      return await base44.functions.invoke('createScheduledTask', scheduleConfig);
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduledReports']);
      setNewSchedule({
        name: '',
        report_type: 'comprehensive_report',
        date_range_days: 30,
        schedule: 'weekly',
        recipients: '',
        include_ai_insights: true
      });
      alert('Report schedule created successfully!');
    }
  });

  const toggleScheduleMutation = useMutation({
    mutationFn: async (taskId) => {
      return await base44.functions.invoke('toggleScheduledTask', { task_id: taskId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduledReports']);
    }
  });

  const deleteScheduleMutation = useMutation({
    mutationFn: async (taskId) => {
      return await base44.functions.invoke('deleteScheduledTask', { task_id: taskId });
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['scheduledReports']);
    }
  });

  const handleGenerateNow = async (params = {}) => {
    setGenerating(true);
    try {
      await generateReportMutation.mutateAsync({
        report_type: params.report_type || 'comprehensive_report',
        date_range_days: params.date_range_days || 30,
        recipients: [],
        include_ai_insights: true
      });
    } finally {
      setGenerating(false);
    }
  };

  const reportTypes = [
    { value: 'comprehensive_report', label: 'Comprehensive Report', icon: FileText },
    { value: 'patient_outcomes', label: 'Patient Outcomes', icon: TrendingUp },
    { value: 'compliance_report', label: 'Compliance Report', icon: AlertCircle },
    { value: 'staff_performance', label: 'Staff Performance', icon: Users },
    { value: 'ai_impact', label: 'AI Impact Analysis', icon: Sparkles }
  ];

  if (currentUser?.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-6">
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>Admin access required to manage automated reports.</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-3 sm:p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-4 sm:space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
              <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 text-blue-600 flex-shrink-0" />
              <span className="truncate">AI-Driven Automated Reports</span>
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-gray-600 mt-1">Generate and schedule intelligent reports with AI insights</p>
          </div>
        </div>

        {/* Quick Generate Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {reportTypes.slice(0, 3).map((type) => {
            const Icon = type.icon;
            return (
              <Card key={type.value} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Icon className="w-5 h-5" />
                    {type.label}
                  </CardTitle>
                  <CardDescription>Last 30 days with AI insights</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    onClick={() => handleGenerateNow({ report_type: type.value, date_range_days: 30 })}
                    disabled={generating}
                    className="w-full min-h-[44px]"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Generate Now
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Create Schedule */}
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="truncate">Schedule Automated Report</span>
            </CardTitle>
            <CardDescription className="text-xs sm:text-sm">Set up recurring reports delivered via email</CardDescription>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 sm:space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
              <div>
                <Label>Report Name</Label>
                <Input
                  value={newSchedule.name}
                  onChange={(e) => setNewSchedule({...newSchedule, name: e.target.value})}
                  placeholder="Weekly Performance Report"
                />
              </div>

              <div>
                <Label>Report Type</Label>
                <Select
                  value={newSchedule.report_type}
                  onValueChange={(value) => setNewSchedule({...newSchedule, report_type: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {reportTypes.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Date Range (Days)</Label>
                <Select
                  value={newSchedule.date_range_days.toString()}
                  onValueChange={(value) => setNewSchedule({...newSchedule, date_range_days: parseInt(value)})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">Last 7 days</SelectItem>
                    <SelectItem value="30">Last 30 days</SelectItem>
                    <SelectItem value="60">Last 60 days</SelectItem>
                    <SelectItem value="90">Last 90 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Schedule</Label>
                <Select
                  value={newSchedule.schedule}
                  onValueChange={(value) => setNewSchedule({...newSchedule, schedule: value})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="daily">Daily (9 AM)</SelectItem>
                    <SelectItem value="weekly">Weekly (Monday 9 AM)</SelectItem>
                    <SelectItem value="monthly">Monthly (1st, 9 AM)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="sm:col-span-2">
                <Label>Email Recipients (comma-separated)</Label>
                <Input
                  value={newSchedule.recipients}
                  onChange={(e) => setNewSchedule({...newSchedule, recipients: e.target.value})}
                  placeholder="admin@agency.com, director@agency.com"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={newSchedule.include_ai_insights}
                onChange={(e) => setNewSchedule({...newSchedule, include_ai_insights: e.target.checked})}
                className="rounded"
              />
              <Label className="cursor-pointer">
                <Sparkles className="w-4 h-4 inline mr-1 text-yellow-600" />
                Include AI-powered insights and recommendations
              </Label>
            </div>

            <Button
              onClick={() => createScheduleMutation.mutate(newSchedule)}
              disabled={!newSchedule.name || !newSchedule.recipients || createScheduleMutation.isLoading}
              className="w-full min-h-[44px]"
            >
              <Calendar className="w-4 h-4 mr-2" />
              Create Schedule
            </Button>
          </CardContent>
        </Card>

        {/* Scheduled Reports */}
        <Card>
          <CardHeader className="p-3 sm:p-4 md:p-6">
            <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5 flex-shrink-0" />
              <span className="truncate">Scheduled Reports ({scheduledTasks.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-3 sm:p-4 md:p-6">
            {isLoading ? (
              <p className="text-gray-500">Loading schedules...</p>
            ) : scheduledTasks.length === 0 ? (
              <p className="text-gray-500">No scheduled reports yet. Create one above.</p>
            ) : (
              <div className="space-y-3">
                {scheduledTasks.map((task) => (
                  <div key={task.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 bg-gray-50 rounded-lg">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold">{task.name}</h3>
                        <Badge variant={task.is_active ? 'default' : 'secondary'}>
                          {task.is_active ? 'Active' : 'Paused'}
                        </Badge>
                      </div>
                      <p className="text-xs sm:text-sm text-gray-600 mt-1 break-words">
                        {task.description} • Recipients: {task.function_args?.recipients?.join(', ') || 'None'}
                      </p>
                      <p className="text-xs text-gray-500 mt-1">
                        Schedule: Every {task.repeat_interval} {task.repeat_unit}
                        {task.start_time && ` at ${task.start_time}`}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => toggleScheduleMutation.mutate(task.id)}
                      >
                        {task.is_active ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm('Delete this scheduled report?')) {
                            deleteScheduleMutation.mutate(task.id);
                          }
                        }}
                      >
                        <Trash2 className="w-4 h-4 text-red-600" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
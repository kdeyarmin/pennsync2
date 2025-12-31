import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  FileText, 
  User, 
  CheckCircle2, 
  Clock, 
  AlertCircle,
  ClipboardList,
  ArrowRight,
  Calendar,
  Bell,
  Sparkles
} from "lucide-react";
import { todayEastern } from "../components/utils/timezone";

export default function NurseWorkflow() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: todayVisits = [] } = useQuery({
    queryKey: ['todayVisits'],
    queryFn: async () => {
      const today = todayEastern();
      return base44.entities.Visit.filter({ visit_date: today }, '-visit_time');
    },
    initialData: [],
  });

  const { data: myTasks = [] } = useQuery({
    queryKey: ['myTasks', currentUser?.email],
    queryFn: () => base44.entities.Task.filter({ 
      assigned_to: currentUser?.email,
      status: { $in: ['pending', 'in_progress'] }
    }, '-priority'),
    enabled: !!currentUser?.email,
    initialData: [],
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['myAlerts'],
    queryFn: () => base44.entities.PatientAlert.filter({ 
      status: 'active',
      severity: { $in: ['critical', 'high'] }
    }),
    initialData: [],
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list('-updated_date', 100),
    initialData: [],
  });

  const scheduled = todayVisits.filter(v => v.status === 'scheduled');
  const inProgress = todayVisits.filter(v => v.status === 'in_progress');
  const completed = todayVisits.filter(v => v.status === 'completed');

  const urgentTasks = myTasks.filter(t => t.priority === 'high');
  const criticalAlerts = alerts.filter(a => a.severity === 'critical');

  const workflows = [
    {
      title: "Today's Visits",
      icon: Calendar,
      color: "blue",
      count: todayVisits.length,
      items: [
        { label: `Scheduled (${scheduled.length})`, value: scheduled.length, action: 'view_scheduled' },
        { label: `In Progress (${inProgress.length})`, value: inProgress.length, action: 'view_in_progress' },
        { label: `Completed (${completed.length})`, value: completed.length, action: 'view_completed' }
      ],
      action: () => {
        if (scheduled.length > 0) {
          const visit = scheduled[0];
          window.location.href = createPageUrl(`DocumentVisit?visitId=${visit.id}`);
        }
      },
      actionLabel: scheduled.length > 0 ? "Start First Visit" : "View Schedule"
    },
    {
      title: "Smart Documentation",
      icon: FileText,
      color: "purple",
      count: null,
      items: [
        { label: "Quick Note", value: "Transform rough notes", action: 'quick_note' },
        { label: "Voice Dictation", value: "Speak your notes", action: 'voice' },
        { label: "Guided Workflow", value: "Step-by-step", action: 'guided' }
      ],
      action: () => window.location.href = createPageUrl("SmartNoteAssistant"),
      actionLabel: "Open Smart Note"
    },
    {
      title: "My Tasks",
      icon: ClipboardList,
      color: "green",
      count: myTasks.length,
      badge: urgentTasks.length > 0 ? { text: `${urgentTasks.length} Urgent`, color: "red" } : null,
      items: myTasks.slice(0, 3).map(t => ({
        label: t.title,
        value: t.priority,
        action: `task_${t.id}`
      })),
      action: () => {
        // Open first task or task list
      },
      actionLabel: "View All Tasks"
    },
    {
      title: "Patient Alerts",
      icon: Bell,
      color: "orange",
      count: alerts.length,
      badge: criticalAlerts.length > 0 ? { text: `${criticalAlerts.length} Critical`, color: "red" } : null,
      items: alerts.slice(0, 3).map(a => ({
        label: patients.find(p => p.id === a.patient_id)?.first_name + ' ' + patients.find(p => p.id === a.patient_id)?.last_name || 'Unknown',
        value: a.title,
        action: `alert_${a.id}`
      })),
      action: () => window.location.href = createPageUrl("PatientAlerts"),
      actionLabel: "View All Alerts"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 p-4 md:p-6 lg:p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome, {currentUser?.full_name?.split(' ')[0] || 'Nurse'}!
          </h1>
          <p className="text-gray-600">Your streamlined workflow dashboard</p>
        </div>

        {/* Workflow Cards */}
        <div className="grid md:grid-cols-2 gap-4 mb-6">
          {workflows.map((workflow) => {
            const Icon = workflow.icon;
            const colorClasses = {
              blue: "from-blue-500 to-blue-600 border-blue-300",
              purple: "from-purple-500 to-purple-600 border-purple-300",
              green: "from-green-500 to-green-600 border-green-300",
              orange: "from-orange-500 to-orange-600 border-orange-300"
            };

            return (
              <Card key={workflow.title} className="hover:shadow-xl transition-all">
                <CardHeader className={`bg-gradient-to-r ${colorClasses[workflow.color]} text-white`}>
                  <CardTitle className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="w-6 h-6" />
                      {workflow.title}
                    </div>
                    {workflow.count !== null && (
                      <Badge variant="secondary" className="bg-white/20 text-white">
                        {workflow.count}
                      </Badge>
                    )}
                  </CardTitle>
                  {workflow.badge && (
                    <Badge className={`bg-${workflow.badge.color}-600 text-white mt-2 w-fit`}>
                      {workflow.badge.text}
                    </Badge>
                  )}
                </CardHeader>
                <CardContent className="p-4 space-y-3">
                  {workflow.items.length > 0 ? (
                    workflow.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between py-2 border-b last:border-0">
                        <div>
                          <p className="text-sm font-medium text-gray-900">{item.label}</p>
                          <p className="text-xs text-gray-500">{item.value}</p>
                        </div>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500 text-center py-4">No items to display</p>
                  )}
                  
                  <Button 
                    onClick={workflow.action}
                    className="w-full mt-2"
                    variant="outline"
                  >
                    {workflow.actionLabel}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-yellow-600" />
              Quick Actions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Link to={createPageUrl("SmartNoteAssistant")} className="block">
                <Card className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-purple-400">
                  <CardContent className="p-4 text-center">
                    <FileText className="w-8 h-8 text-purple-600 mx-auto mb-2" />
                    <p className="font-semibold text-sm">New Note</p>
                  </CardContent>
                </Card>
              </Link>

              <Link to={createPageUrl("Patients")} className="block">
                <Card className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-blue-400">
                  <CardContent className="p-4 text-center">
                    <User className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                    <p className="font-semibold text-sm">Find Patient</p>
                  </CardContent>
                </Card>
              </Link>

              <Link to={createPageUrl("CarePlanManagement")} className="block">
                <Card className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-green-400">
                  <CardContent className="p-4 text-center">
                    <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                    <p className="font-semibold text-sm">Care Plans</p>
                  </CardContent>
                </Card>
              </Link>

              <Link to={createPageUrl("Messages")} className="block">
                <Card className="hover:shadow-lg transition-all cursor-pointer border-2 hover:border-indigo-400">
                  <CardContent className="p-4 text-center">
                    <Bell className="w-8 h-8 text-indigo-600 mx-auto mb-2" />
                    <p className="font-semibold text-sm">Messages</p>
                  </CardContent>
                </Card>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
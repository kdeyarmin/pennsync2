import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, CheckSquare, Bell } from "lucide-react";
import { format } from "date-fns";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function ClinicalEventsSummary({ patientId, limit = 5 }) {
  const { data: events = [], isLoading } = useQuery({
    queryKey: ['clinicalEvents', patientId],
    queryFn: () => base44.entities.ClinicalEvent.filter({ patient_id: patientId }, '-created_date', 50),
    initialData: [],
    enabled: !!patientId
  });

  const { data: relatedTasks = [] } = useQuery({
    queryKey: ['eventTasks', patientId],
    queryFn: () => base44.entities.Task.filter({ 
      patient_id: patientId, 
      source: 'ai_generated',
      status: 'pending'
    }, '-created_date', 20),
    initialData: [],
    enabled: !!patientId
  });

  const { data: relatedAlerts = [] } = useQuery({
    queryKey: ['eventAlerts', patientId],
    queryFn: () => base44.entities.PatientAlert.filter({ 
      patient_id: patientId,
      status: 'active'
    }, '-created_date', 20),
    initialData: [],
    enabled: !!patientId
  });

  if (!patientId || isLoading) return null;

  const recentEvents = events.slice(0, limit);
  const criticalCount = events.filter(e => 
    e.severity === 'critical' || e.severity === 'high'
  ).length;

  const eventsByType = events.reduce((acc, event) => {
    acc[event.event_type] = (acc[event.event_type] || 0) + 1;
    return acc;
  }, {});

  const topEventTypes = Object.entries(eventsByType)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  if (events.length === 0) {
    return (
      <Card className="bg-gray-50">
        <CardContent className="p-4 text-center text-sm text-gray-500">
          No clinical events recorded yet
        </CardContent>
      </Card>
    );
  }

  const pendingTaskCount = relatedTasks.filter(t => t.status === 'pending').length;
  const activeAlertCount = relatedAlerts.filter(a => a.status === 'active').length;

  return (
    <Card className="border-blue-300">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            Clinical Events ({events.length})
          </span>
          {criticalCount > 0 && (
            <Badge className="bg-red-600">{criticalCount} Critical</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Quick Stats */}
        <div className="flex gap-2 flex-wrap">
          {pendingTaskCount > 0 && (
            <Badge variant="outline" className="text-xs bg-yellow-50 border-yellow-300 text-yellow-700">
              <CheckSquare className="w-3 h-3 mr-1" />
              {pendingTaskCount} Task{pendingTaskCount > 1 ? 's' : ''}
            </Badge>
          )}
          {activeAlertCount > 0 && (
            <Badge variant="outline" className="text-xs bg-red-50 border-red-300 text-red-700">
              <Bell className="w-3 h-3 mr-1" />
              {activeAlertCount} Alert{activeAlertCount > 1 ? 's' : ''}
            </Badge>
          )}
        </div>
        {/* Top Event Types */}
        <div className="flex flex-wrap gap-2">
          {topEventTypes.map(([type, count]) => (
            <Badge key={type} variant="outline" className="text-xs">
              {type.replace(/_/g, ' ')}: {count}
            </Badge>
          ))}
        </div>

        {/* Recent Events */}
        <div className="space-y-2">
          {recentEvents.map((event) => (
            <div key={event.id} className="flex items-start gap-2 p-2 bg-gray-50 rounded text-xs">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge className={`text-xs ${
                    event.severity === 'critical' ? 'bg-red-600' :
                    event.severity === 'high' ? 'bg-orange-600' :
                    'bg-blue-600'
                  }`}>
                    {event.event_type.replace(/_/g, ' ')}
                  </Badge>
                  <span className="text-gray-500">
                    {format(new Date(event.event_date), 'MMM d')}
                  </span>
                </div>
                <p className="font-medium text-gray-900 truncate">{event.event_title}</p>
                <div className="flex gap-1 mt-1 flex-wrap">
                  {event.requires_followup && (
                    <Badge className="bg-yellow-600 text-xs">
                      <CheckSquare className="w-3 h-3 mr-1" />
                      Task
                    </Badge>
                  )}
                  {(event.severity === 'high' || event.severity === 'critical') && (
                    <Badge className="bg-red-600 text-xs">
                      <Bell className="w-3 h-3 mr-1" />
                      Alert
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        <Link to={createPageUrl(`PatientDetails?id=${patientId}`)}>
          <Button variant="outline" size="sm" className="w-full text-xs">
            View All Events
          </Button>
        </Link>
      </CardContent>
    </Card>
  );
}
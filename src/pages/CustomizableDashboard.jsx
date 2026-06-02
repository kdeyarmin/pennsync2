import { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import DashboardCustomizer from "../components/dashboard/DashboardCustomizer";
import InteractiveChart from "../components/charts/InteractiveChart";
import { 
  Users, 
  FileText, 
  AlertTriangle, 
  ClipboardCheck
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function CustomizableDashboard() {
  const navigate = useNavigate();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list('-updated_date', 500),
    initialData: []
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['visits'],
    queryFn: () => base44.entities.Visit.list('-visit_date', 500),
    initialData: []
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['incidents'],
    queryFn: () => base44.entities.Incident.list('-incident_date', 200),
    initialData: []
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['patient-alerts'],
    queryFn: () => base44.entities.PatientAlert.filter({ status: 'active' }, '-created_date', 100),
    initialData: []
  });

  const isAdmin = currentUser?.role === 'admin';

  // Define available widgets based on role
  const defaultWidgets = useMemo(() => {
    const nurseWidgets = [
      {
        id: 'my-patients',
        title: 'My Patients Overview',
        description: 'Quick view of your assigned patients',
        component: 'PatientOverview',
        visible: true,
        order: 0
      },
      {
        id: 'today-visits',
        title: "Today's Visits",
        description: 'Scheduled visits for today',
        component: 'TodayVisits',
        visible: true,
        order: 1
      },
      {
        id: 'active-alerts',
        title: 'Active Patient Alerts',
        description: 'Priority alerts requiring attention',
        component: 'ActiveAlerts',
        visible: true,
        order: 2
      },
      {
        id: 'visit-trends',
        title: 'Visit Completion Trends',
        description: 'Your visit performance over time',
        component: 'VisitTrends',
        visible: true,
        order: 3
      },
      {
        id: 'quick-actions',
        title: 'Quick Actions',
        description: 'Frequently used actions',
        component: 'QuickActions',
        visible: true,
        order: 4
      }
    ];

    const adminWidgets = [
      {
        id: 'agency-overview',
        title: 'Agency Overview',
        description: 'Key metrics at a glance',
        component: 'AgencyOverview',
        visible: true,
        order: 0
      },
      {
        id: 'visit-analytics',
        title: 'Visit Analytics',
        description: 'Visit trends and patterns',
        component: 'VisitAnalytics',
        visible: true,
        order: 1
      },
      {
        id: 'staff-performance',
        title: 'Staff Performance',
        description: 'Team productivity metrics',
        component: 'StaffPerformance',
        visible: true,
        order: 2
      },
      {
        id: 'incident-analysis',
        title: 'Incident Analysis',
        description: 'Safety and quality metrics',
        component: 'IncidentAnalysis',
        visible: true,
        order: 3
      },
      {
        id: 'patient-distribution',
        title: 'Patient Distribution',
        description: 'Patient census by status',
        component: 'PatientDistribution',
        visible: true,
        order: 4
      },
      {
        id: 'alerts-summary',
        title: 'Alerts Summary',
        description: 'System-wide alerts overview',
        component: 'AlertsSummary',
        visible: true,
        order: 5
      }
    ];

    return isAdmin ? adminWidgets : nurseWidgets;
  }, [isAdmin]);

  // Get user's saved preferences or use defaults
  const widgets = useMemo(() => {
    const savedPreferences = currentUser?.dashboard_preferences?.widgets;
    if (!savedPreferences) return defaultWidgets;

    return defaultWidgets.map(widget => {
      const saved = savedPreferences.find(s => s.id === widget.id);
      return saved ? { ...widget, ...saved } : widget;
    }).sort((a, b) => a.order - b.order);
  }, [currentUser, defaultWidgets]);

  const visibleWidgets = widgets.filter(w => w.visible);

  // Prepare chart data
  const visitTrendData = useMemo(() => {
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - (6 - i));
      const dateStr = date.toISOString().split('T')[0];
      
      return {
        name: date.toLocaleDateString('en-US', { weekday: 'short' }),
        completed: visits.filter(v => v.visit_date === dateStr && v.status === 'completed').length,
        scheduled: visits.filter(v => v.visit_date === dateStr).length
      };
    });
    return last7Days;
  }, [visits]);

  const patientStatusData = useMemo(() => [
    { name: 'Active', value: patients.filter(p => p.status === 'active').length },
    { name: 'Discharged', value: patients.filter(p => p.status === 'discharged').length },
    { name: 'Hospitalized', value: patients.filter(p => p.status === 'hospitalized').length }
  ].filter(d => d.value > 0), [patients]);

  const incidentTypeData = useMemo(() => {
    const types = {};
    incidents.forEach(i => {
      const type = i.incident_type || 'other';
      types[type] = (types[type] || 0) + 1;
    });
    return Object.entries(types).map(([name, value]) => ({
      name: name.replace(/_/g, ' '),
      value
    }));
  }, [incidents]);

  const handleDrillDown = (chartType, _data) => {
    // Navigate to detailed view based on chart type
    switch (chartType) {
      case 'patients':
        navigate(createPageUrl('Patients'));
        break;
      case 'visits':
        navigate(createPageUrl('Reports'));
        break;
      case 'incidents':
        navigate(createPageUrl('AdminDashboard'));
        break;
      default:
        break;
    }
  };

  // Widget renderers
  const renderWidget = (widget) => {
    switch (widget.component) {
      case 'AgencyOverview':
        return (
          <div className="grid grid-cols-2 gap-4">
            <StatCard
              title="Total Patients"
              value={patients.length}
              icon={Users}
              trend="+5%"
              trendUp={true}
            />
            <StatCard
              title="Active Visits"
              value={visits.filter(v => v.status !== 'completed').length}
              icon={FileText}
              trend="+12%"
              trendUp={true}
            />
            <StatCard
              title="Active Alerts"
              value={alerts.length}
              icon={AlertTriangle}
              trend="-8%"
              trendUp={false}
            />
            <StatCard
              title="Completion Rate"
              value={`${Math.round((visits.filter(v => v.status === 'completed').length / visits.length) * 100)}%`}
              icon={ClipboardCheck}
              trend="+3%"
              trendUp={true}
            />
          </div>
        );

      case 'VisitAnalytics':
        return (
          <InteractiveChart
            type="bar"
            data={visitTrendData}
            title="7-Day Visit Trend"
            dataKey="completed"
            xAxisKey="name"
            yAxisKey="completed"
            onDrillDown={() => handleDrillDown('visits')}
            drillDownLabel="View Full Report"
          />
        );

      case 'PatientDistribution':
        return (
          <InteractiveChart
            type="pie"
            data={patientStatusData}
            title="Patient Status Distribution"
            xAxisKey="name"
            yAxisKey="value"
            onDrillDown={() => handleDrillDown('patients')}
          />
        );

      case 'IncidentAnalysis':
        return (
          <InteractiveChart
            type="bar"
            data={incidentTypeData}
            title="Incidents by Type"
            xAxisKey="name"
            yAxisKey="value"
            onDrillDown={() => handleDrillDown('incidents')}
          />
        );

      case 'ActiveAlerts':
        return (
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Active Patient Alerts</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {alerts.slice(0, 5).map((alert, idx) => (
                  <div key={idx} className="flex items-center justify-between p-2 bg-red-50 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <span className="text-sm font-medium">{alert.title}</span>
                    </div>
                    <span className="text-xs text-slate-600">{alert.severity}</span>
                  </div>
                ))}
                {alerts.length === 0 && (
                  <p className="text-sm text-slate-500 text-center py-4">No active alerts</p>
                )}
              </div>
            </CardContent>
          </Card>
        );

      default:
        return (
          <Card>
            <CardContent className="p-6">
              <p className="text-slate-500">Widget: {widget.title}</p>
            </CardContent>
          </Card>
        );
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">
            {isAdmin ? 'Admin Dashboard' : 'My Dashboard'}
          </h1>
          <p className="text-slate-600 mt-1">
            {isAdmin ? 'Agency overview and analytics' : 'Your personalized workflow hub'}
          </p>
        </div>
        <DashboardCustomizer
          currentUser={currentUser}
          widgets={widgets}
          onUpdate={(_newWidgets) => {
            // Handle widget update if needed
          }}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {visibleWidgets.map(widget => (
          <div key={widget.id}>
            {renderWidget(widget)}
          </div>
        ))}
      </div>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, trend, trendUp }) {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-600 mb-1">{title}</p>
            <p className="text-3xl font-bold text-slate-900">{value}</p>
            {trend && (
              <p className={`text-xs mt-1 ${trendUp ? 'text-green-600' : 'text-red-600'}`}>
                {trend} vs last period
              </p>
            )}
          </div>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
            trendUp ? 'bg-green-100' : 'bg-blue-100'
          }`}>
            <Icon className={`w-6 h-6 ${trendUp ? 'text-green-600' : 'text-blue-600'}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
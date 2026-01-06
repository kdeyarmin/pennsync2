import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  User,
  Activity,
  Brain,
  FileText,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Heart,
  Pill,
  ArrowLeft,
  Target,
  Bell,
  Clock
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import SearchablePatientSelect from "@/components/ui/SearchablePatientSelect";
import AIPatientRiskAssessor from "@/components/risk/AIPatientRiskAssessor";
import AIProactiveOASISAssistant from "@/components/oasis/AIProactiveOASISAssistant";
import AIPatientInsights from "@/components/patient/AIPatientInsights";
import AIPatientDashboardSummary from "@/components/patient/AIPatientDashboardSummary";
import PatientRiskStratification from "@/components/patient/PatientRiskStratification";
import HealthTrendsChart from "@/components/dashboard/HealthTrendsChart";
import MedicalHistoryTimeline from "@/components/dashboard/MedicalHistoryTimeline";
import UpcomingAppointments from "@/components/dashboard/UpcomingAppointments";
import ActiveCarePlansWidget from "@/components/dashboard/ActiveCarePlansWidget";
import PatientAlertsWidget from "@/components/dashboard/PatientAlertsWidget";
import RecentVisitsSummary from "@/components/dashboard/RecentVisitsSummary";
import AIHealthInsights from "@/components/dashboard/AIHealthInsights";
import QuickStatsGrid from "@/components/dashboard/QuickStatsGrid";
import PredictiveHealthAnalytics from "@/components/dashboard/PredictiveHealthAnalytics";
import {
  AreaChart,
  Area,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from "recharts";

export default function Patient360() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const [selectedPatientId, setSelectedPatientId] = useState(urlParams.get('id') || null);

  const { data: allPatients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list('-updated_date', 500),
    initialData: []
  });

  const { data: patient } = useQuery({
    queryKey: ['patient', selectedPatientId],
    queryFn: async () => {
      const patients = await base44.entities.Patient.filter({ id: selectedPatientId });
      return patients[0];
    },
    enabled: !!selectedPatientId
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['patientVisits', selectedPatientId],
    queryFn: () => base44.entities.Visit.filter({ patient_id: selectedPatientId }, '-visit_date', 50),
    enabled: !!selectedPatientId,
    initialData: []
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['patientIncidents', selectedPatientId],
    queryFn: () => base44.entities.Incident.filter({ patient_id: selectedPatientId }, '-incident_date'),
    enabled: !!selectedPatientId,
    initialData: []
  });

  const { data: carePlans = [] } = useQuery({
    queryKey: ['patientCarePlans', selectedPatientId],
    queryFn: () => base44.entities.CarePlan.filter({ patient_id: selectedPatientId }),
    enabled: !!selectedPatientId,
    initialData: []
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ['patientTasks', selectedPatientId],
    queryFn: () => base44.entities.Task.filter({ patient_id: selectedPatientId }),
    enabled: !!selectedPatientId,
    initialData: []
  });

  const { data: riskAssessment } = useQuery({
    queryKey: ['latestRiskAssessment', selectedPatientId],
    queryFn: async () => {
      const assessments = await base44.entities.PatientRiskAssessment.filter(
        { patient_id: selectedPatientId },
        '-assessment_date',
        1
      );
      return assessments.length > 0 ? assessments[0] : null;
    },
    enabled: !!selectedPatientId
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['patientAlerts', selectedPatientId],
    queryFn: () => base44.entities.PatientAlert.filter({ patient_id: selectedPatientId }),
    enabled: !!selectedPatientId,
    initialData: []
  });

  const { data: oasisData = [] } = useQuery({
    queryKey: ['patientOASIS', selectedPatientId],
    queryFn: () => base44.entities.OASISUpload.filter({ patient_id: selectedPatientId }, '-created_date'),
    enabled: !!selectedPatientId,
    initialData: []
  });

  // Vital signs trend data
  const vitalsData = visits
    .filter(v => v.vital_signs?.blood_pressure_systolic)
    .slice(0, 10)
    .reverse()
    .map(v => ({
      date: new Date(v.visit_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      bp_sys: v.vital_signs.blood_pressure_systolic,
      bp_dia: v.vital_signs.blood_pressure_diastolic,
      hr: v.vital_signs.heart_rate,
      temp: v.vital_signs.temperature
    }));

  // Visit frequency data
  const visitFrequencyData = Array.from({ length: 12 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - (11 - i));
    const monthStr = date.toISOString().slice(0, 7);
    const count = visits.filter(v => v.visit_date?.startsWith(monthStr)).length;
    return {
      month: date.toLocaleDateString('en-US', { month: 'short' }),
      visits: count
    };
  });

  if (!selectedPatientId) {
    return (
      <div className="p-3 sm:p-4 md:p-6 max-w-4xl mx-auto">
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">Patient 360° Dashboard</h1>
        <Card>
          <CardContent className="p-8 sm:p-12 text-center">
            <User className="w-12 h-12 sm:w-16 sm:h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2">Select a Patient</h2>
            <p className="text-sm sm:text-base text-gray-600 mb-4 sm:mb-6">Choose a patient to view their comprehensive 360° profile</p>
            <div className="max-w-md mx-auto">
              <SearchablePatientSelect
                patients={allPatients}
                value={selectedPatientId}
                onValueChange={(patientId) => {
                  setSelectedPatientId(patientId);
                  window.history.pushState({}, '', `${createPageUrl('Patient360')}?id=${patientId}`);
                }}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-3 sm:p-4 md:p-6 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-8 sm:p-12 text-center text-gray-500">
            Loading patient information...
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeAlerts = alerts.filter(a => a.status === 'active');
  const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');
  const highAlerts = activeAlerts.filter(a => a.severity === 'high');

  return (
    <div className="p-3 sm:p-4 md:p-6 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setSelectedPatientId(null);
              window.history.pushState({}, '', createPageUrl('Patient360'));
            }}
            className="min-h-[44px] w-full sm:w-auto"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span className="hidden sm:inline">Change Patient</span>
            <span className="sm:hidden">Back</span>
          </Button>
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-lg sm:text-xl font-bold flex-shrink-0">
              {patient.first_name?.[0]}{patient.last_name?.[0]}
            </div>
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 truncate">
                {patient.first_name} {patient.middle_name ? `${patient.middle_name} ` : ''}{patient.last_name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">{patient.medical_record_number || 'No MRN'}</Badge>
                <Badge className={`text-xs ${patient.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`}>
                  {patient.status || 'Unknown'}
                </Badge>
              </div>
            </div>
          </div>
        </div>
        <Button 
          onClick={() => navigate(createPageUrl(`PatientDetails?id=${selectedPatientId}`))}
          className="min-h-[44px] w-full sm:w-auto"
        >
          <FileText className="w-4 h-4 mr-2" />
          <span className="hidden sm:inline">Full Chart</span>
          <span className="sm:hidden">Chart</span>
        </Button>
      </div>

      {/* Quick Stats */}
      <QuickStatsGrid
        visits={visits}
        carePlans={carePlans}
        alerts={activeAlerts}
        incidents={incidents}
        patient={patient}
      />

      {/* Critical Alerts Banner */}
      {(criticalAlerts.length > 0 || highAlerts.length > 0) && (
        <Alert className={criticalAlerts.length > 0 ? 'bg-red-50 border-red-300' : 'bg-orange-50 border-orange-300'}>
          <AlertTriangle className={`w-4 h-4 ${criticalAlerts.length > 0 ? 'text-red-600' : 'text-orange-600'}`} />
          <AlertDescription>
            <p className="font-semibold">
              {criticalAlerts.length > 0 && `${criticalAlerts.length} Critical Alert${criticalAlerts.length > 1 ? 's' : ''}`}
              {criticalAlerts.length > 0 && highAlerts.length > 0 && ' • '}
              {highAlerts.length > 0 && `${highAlerts.length} High Priority Alert${highAlerts.length > 1 ? 's' : ''}`}
            </p>
            <p className="text-sm mt-1">{alerts.slice(0, 2).map(a => a.title).join(', ')}</p>
          </AlertDescription>
        </Alert>
      )}

      {/* Predictive Health Analytics */}
      <PredictiveHealthAnalytics
        patientId={selectedPatientId}
        patient={patient}
        visits={visits}
        carePlans={carePlans}
        alerts={alerts}
        incidents={incidents}
      />

      {/* AI Health Insights */}
      <AIHealthInsights
        patientId={selectedPatientId}
        patient={patient}
        visits={visits}
        carePlans={carePlans}
        alerts={alerts}
        oasisData={oasisData}
      />

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex md:grid md:w-full md:grid-cols-6 gap-1 min-w-max h-auto">
            <TabsTrigger value="overview" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2 sm:py-3 whitespace-nowrap">
              <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="visits" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2 sm:py-3 whitespace-nowrap">
              <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
              Visits
            </TabsTrigger>
            <TabsTrigger value="careplans" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2 sm:py-3 whitespace-nowrap">
              <Target className="w-3 h-3 sm:w-4 sm:h-4" />
              Care Plans
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2 sm:py-3 whitespace-nowrap">
              <Bell className="w-3 h-3 sm:w-4 sm:h-4" />
              Alerts {activeAlerts.length > 0 && <Badge className="ml-1 bg-red-500">{activeAlerts.length}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="ai-insights" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2 sm:py-3 whitespace-nowrap">
              <Brain className="w-3 h-3 sm:w-4 sm:h-4" />
              AI Insights
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1 sm:gap-2 text-xs sm:text-sm py-2 sm:py-3 whitespace-nowrap">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              History
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <AIPatientDashboardSummary
              patient={patient}
              visits={visits}
              carePlans={carePlans}
              tasks={tasks}
              incidents={incidents}
            />
            <div className="space-y-4 sm:space-y-6">
              <Card>
                <CardHeader className="p-3 sm:p-4 md:p-6">
                  <CardTitle className="text-sm sm:text-base">Demographics</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 text-xs sm:text-sm">
                  <div>
                    <p className="text-gray-500">Date of Birth</p>
                    <p className="font-semibold">{patient.date_of_birth || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Primary Diagnosis</p>
                    <Badge>{patient.primary_diagnosis || 'N/A'}</Badge>
                  </div>
                  <div>
                    <p className="text-gray-500">Admission Date</p>
                    <p className="font-semibold">{patient.admission_date || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Care Type</p>
                    <Badge className={patient.care_type === 'hospice' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>
                      {patient.care_type || 'home_health'}
                    </Badge>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="p-3 sm:p-4 md:p-6">
                  <CardTitle className="text-sm sm:text-base">Contact Info</CardTitle>
                </CardHeader>
                <CardContent className="p-3 sm:p-4 md:p-6 space-y-3 text-xs sm:text-sm">
                  <div>
                    <p className="text-gray-500">Phone</p>
                    <p className="font-semibold">{patient.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Address</p>
                    <p className="font-semibold">{patient.address || 'N/A'}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <HealthTrendsChart visits={visits} patient={patient} />
            <UpcomingAppointments visits={visits} patientId={selectedPatientId} />
          </div>
        </TabsContent>

        {/* Visits Tab */}
        <TabsContent value="visits">
          <RecentVisitsSummary visits={visits} patient={patient} showAll={true} />
        </TabsContent>

        {/* Care Plans Tab */}
        <TabsContent value="careplans">
          <ActiveCarePlansWidget carePlans={carePlans} patientId={selectedPatientId} expanded={true} />
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <PatientAlertsWidget alerts={alerts} patientId={selectedPatientId} expanded={true} />
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="ai-insights" className="space-y-6">
          <AIPatientRiskAssessor patientId={selectedPatientId} autoAnalyze={false} />
          <AIPatientInsights patient={patient} visits={visits} carePlans={carePlans} incidents={incidents} />
          <PatientRiskStratification
            patient={patient}
            visits={visits}
            carePlans={carePlans}
            incidents={incidents}
            autoCalculate={false}
          />
          <AIProactiveOASISAssistant patientId={selectedPatientId} autoAnalyze={false} />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <MedicalHistoryTimeline 
            patient={patient}
            visits={visits}
            incidents={incidents}
            carePlans={carePlans}
            oasisData={oasisData}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
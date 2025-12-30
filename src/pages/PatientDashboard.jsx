import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Activity,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Heart,
  FileText,
  Brain,
  ChevronRight,
  Sparkles,
  Clock,
  Target,
  Bell
} from "lucide-react";
import SearchablePatientSelect from "../components/ui/SearchablePatientSelect";
import HealthTrendsChart from "../components/dashboard/HealthTrendsChart";
import MedicalHistoryTimeline from "../components/dashboard/MedicalHistoryTimeline";
import UpcomingAppointments from "../components/dashboard/UpcomingAppointments";
import ActiveCarePlansWidget from "../components/dashboard/ActiveCarePlansWidget";
import PatientAlertsWidget from "../components/dashboard/PatientAlertsWidget";
import RecentVisitsSummary from "../components/dashboard/RecentVisitsSummary";
import AIHealthInsights from "../components/dashboard/AIHealthInsights";
import QuickStatsGrid from "../components/dashboard/QuickStatsGrid";
import PredictiveHealthAnalytics from "../components/dashboard/PredictiveHealthAnalytics";
import { formatEastern } from "../components/utils/timezone";

export default function PatientDashboard() {
  const [selectedPatientId, setSelectedPatientId] = useState("");

  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
    initialData: [],
  });

  const { data: selectedPatient } = useQuery({
    queryKey: ['patient', selectedPatientId],
    queryFn: () => base44.entities.Patient.filter({ id: selectedPatientId }).then(res => res[0]),
    enabled: !!selectedPatientId,
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['patientVisits', selectedPatientId],
    queryFn: () => base44.entities.Visit.filter({ patient_id: selectedPatientId }, '-visit_date', 50),
    enabled: !!selectedPatientId,
    initialData: [],
  });

  const { data: carePlans = [] } = useQuery({
    queryKey: ['patientCarePlans', selectedPatientId],
    queryFn: () => base44.entities.CarePlan.filter({ patient_id: selectedPatientId }),
    enabled: !!selectedPatientId,
    initialData: [],
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['patientAlerts', selectedPatientId],
    queryFn: () => base44.entities.PatientAlert.filter({ patient_id: selectedPatientId }),
    enabled: !!selectedPatientId,
    initialData: [],
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['patientIncidents', selectedPatientId],
    queryFn: () => base44.entities.Incident.filter({ patient_id: selectedPatientId }, '-incident_date'),
    enabled: !!selectedPatientId,
    initialData: [],
  });

  const { data: oasisData = [] } = useQuery({
    queryKey: ['patientOASIS', selectedPatientId],
    queryFn: () => base44.entities.OASISUpload.filter({ patient_id: selectedPatientId }, '-created_date'),
    enabled: !!selectedPatientId,
    initialData: [],
  });

  // Auto-select first patient if none selected
  useEffect(() => {
    if (!selectedPatientId && patients.length > 0) {
      setSelectedPatientId(patients[0].id);
    }
  }, [patients, selectedPatientId]);

  if (!selectedPatientId) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <Brain className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Select a Patient</h3>
            <p className="text-gray-600 mb-6">Choose a patient to view their comprehensive health dashboard</p>
            <div className="max-w-md mx-auto">
              <SearchablePatientSelect
                patients={patients}
                value={selectedPatientId}
                onValueChange={setSelectedPatientId}
                placeholder="Search for a patient..."
              />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  const activeAlerts = alerts.filter(a => a.status === 'active');
  const criticalAlerts = activeAlerts.filter(a => a.severity === 'critical');

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <div className="mb-4 sm:mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 mb-3 sm:mb-4">
          <div className="flex items-center gap-3 sm:gap-4">
            <div className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-lg sm:text-xl md:text-2xl font-bold flex-shrink-0">
              {selectedPatient?.first_name?.[0]}{selectedPatient?.last_name?.[0]}
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="text-lg sm:text-xl md:text-2xl lg:text-3xl font-bold text-gray-900 truncate">
                {selectedPatient?.first_name} {selectedPatient?.middle_name ? `${selectedPatient.middle_name} ` : ''}{selectedPatient?.last_name}
              </h1>
              <div className="flex flex-wrap items-center gap-2 mt-1">
                <Badge variant="outline" className="text-xs">{selectedPatient?.medical_record_number || 'No MRN'}</Badge>
                <Badge className={`text-xs ${selectedPatient?.status === 'active' ? 'bg-green-500' : 'bg-gray-500'}`}>
                  {selectedPatient?.status || 'Unknown'}
                </Badge>
                <span className="text-xs sm:text-sm text-gray-600 truncate">
                  {selectedPatient?.primary_diagnosis || 'No primary diagnosis'}
                </span>
              </div>
            </div>
          </div>
          
          <div className="w-full md:w-80">
            <SearchablePatientSelect
              patients={patients}
              value={selectedPatientId}
              onValueChange={setSelectedPatientId}
              placeholder="Switch patient..."
            />
          </div>
        </div>

        {/* Critical Alerts Banner */}
        {criticalAlerts.length > 0 && (
          <Alert className="bg-red-50 border-red-300 mb-3 sm:mb-4">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            <AlertDescription className="text-red-900">
              <span className="font-semibold">{criticalAlerts.length} Critical Alert{criticalAlerts.length > 1 ? 's' : ''}</span>
              {' - '}{criticalAlerts[0].title}
              {criticalAlerts.length > 1 && ` and ${criticalAlerts.length - 1} more`}
            </AlertDescription>
          </Alert>
        )}
      </div>

      {/* Quick Stats */}
      <QuickStatsGrid
        visits={visits}
        carePlans={carePlans}
        alerts={activeAlerts}
        incidents={incidents}
        patient={selectedPatient}
      />

      {/* Predictive Health Analytics */}
      <PredictiveHealthAnalytics
        patientId={selectedPatientId}
        patient={selectedPatient}
        visits={visits}
        carePlans={carePlans}
        alerts={alerts}
        incidents={incidents}
      />

      {/* AI Health Insights - Prominent */}
      <AIHealthInsights
        patientId={selectedPatientId}
        patient={selectedPatient}
        visits={visits}
        carePlans={carePlans}
        alerts={alerts}
        oasisData={oasisData}
      />

      {/* Main Content Tabs */}
      <Tabs defaultValue="overview" className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex md:grid md:w-full md:grid-cols-5 gap-1 sm:gap-2 min-w-max h-auto">
            <TabsTrigger value="overview" className="gap-1 sm:gap-2 whitespace-nowrap py-2 sm:py-3 text-xs sm:text-sm">
              <Activity className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Overview</span>
            </TabsTrigger>
            <TabsTrigger value="visits" className="gap-1 sm:gap-2 whitespace-nowrap py-2 sm:py-3 text-xs sm:text-sm">
              <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Visits</span>
            </TabsTrigger>
            <TabsTrigger value="careplans" className="gap-1 sm:gap-2 whitespace-nowrap py-2 sm:py-3 text-xs sm:text-sm">
              <Target className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Care Plans</span>
            </TabsTrigger>
            <TabsTrigger value="alerts" className="gap-1 sm:gap-2 whitespace-nowrap py-2 sm:py-3 text-xs sm:text-sm">
              <Bell className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>Alerts</span>
              {activeAlerts.length > 0 && (
                <Badge className="ml-1 bg-red-500 text-white text-xs">{activeAlerts.length}</Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="history" className="gap-1 sm:gap-2 whitespace-nowrap py-2 sm:py-3 text-xs sm:text-sm">
              <Clock className="w-3 h-3 sm:w-4 sm:h-4" />
              <span>History</span>
            </TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <HealthTrendsChart visits={visits} patient={selectedPatient} />
            <UpcomingAppointments visits={visits} patientId={selectedPatientId} />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <ActiveCarePlansWidget carePlans={carePlans} patientId={selectedPatientId} />
            <RecentVisitsSummary visits={visits.slice(0, 5)} patient={selectedPatient} />
          </div>
        </TabsContent>

        {/* Visits Tab */}
        <TabsContent value="visits">
          <RecentVisitsSummary visits={visits} patient={selectedPatient} showAll={true} />
        </TabsContent>

        {/* Care Plans Tab */}
        <TabsContent value="careplans">
          <ActiveCarePlansWidget carePlans={carePlans} patientId={selectedPatientId} expanded={true} />
        </TabsContent>

        {/* Alerts Tab */}
        <TabsContent value="alerts">
          <PatientAlertsWidget alerts={alerts} patientId={selectedPatientId} expanded={true} />
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history">
          <MedicalHistoryTimeline 
            patient={selectedPatient}
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
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
  Shield,
  FileText,
  TrendingUp,
  AlertTriangle,
  Calendar,
  Heart,
  Pill,
  ArrowLeft
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import SearchablePatientSelect from "@/components/ui/SearchablePatientSelect";
import AIPatientRiskAssessor from "@/components/risk/AIPatientRiskAssessor";
import AIProactiveOASISAssistant from "@/components/oasis/AIProactiveOASISAssistant";
import AIPatientInsights from "@/components/patient/AIPatientInsights";
import AIPatientDashboardSummary from "@/components/patient/AIPatientDashboardSummary";
import PatientRiskStratification from "@/components/patient/PatientRiskStratification";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
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
    queryFn: () => base44.entities.PatientAlert.filter({ patient_id: selectedPatientId, status: 'active' }),
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
        <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-4 sm:mb-6">Patient 360° View</h1>
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

  const criticalAlerts = alerts.filter(a => a.severity === 'critical').length;
  const highAlerts = alerts.filter(a => a.severity === 'high').length;

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
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 truncate">
              {patient.first_name} {patient.last_name}
            </h1>
            <p className="text-xs sm:text-sm md:text-base text-gray-600">360° Patient View</p>
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Total Visits</p>
                <p className="text-2xl font-bold">{visits.length}</p>
              </div>
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Care Plans</p>
                <p className="text-2xl font-bold">{carePlans.filter(cp => cp.status === 'active').length}</p>
              </div>
              <Heart className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Risk Level</p>
                <Badge className={`${
                  riskAssessment?.overall_risk_level === 'critical' ? 'bg-red-600' :
                  riskAssessment?.overall_risk_level === 'high' ? 'bg-orange-600' :
                  riskAssessment?.overall_risk_level === 'moderate' ? 'bg-yellow-600' :
                  'bg-green-600'
                }`}>
                  {riskAssessment?.overall_risk_level?.toUpperCase() || 'N/A'}
                </Badge>
              </div>
              <TrendingUp className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Active Alerts</p>
                <p className="text-2xl font-bold text-red-600">{alerts.length}</p>
              </div>
              <AlertTriangle className="w-8 h-8 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500">Medications</p>
                <p className="text-2xl font-bold">{patient.current_medications?.length || 0}</p>
              </div>
              <Pill className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Critical Alerts Banner */}
      {(criticalAlerts > 0 || highAlerts > 0) && (
        <Alert className={criticalAlerts > 0 ? 'bg-red-50 border-red-300' : 'bg-orange-50 border-orange-300'}>
          <AlertTriangle className={`w-4 h-4 ${criticalAlerts > 0 ? 'text-red-600' : 'text-orange-600'}`} />
          <AlertDescription>
            <p className="font-semibold">
              {criticalAlerts > 0 && `${criticalAlerts} Critical Alert${criticalAlerts > 1 ? 's' : ''}`}
              {criticalAlerts > 0 && highAlerts > 0 && ' • '}
              {highAlerts > 0 && `${highAlerts} High Priority Alert${highAlerts > 1 ? 's' : ''}`}
            </p>
            <p className="text-sm mt-1">{alerts.slice(0, 2).map(a => a.title).join(', ')}</p>
          </AlertDescription>
        </Alert>
      )}

      {/* Main Tabs */}
      <Tabs defaultValue="overview" className="w-full">
        <div className="overflow-x-auto -mx-3 px-3 sm:mx-0 sm:px-0">
          <TabsList className="inline-flex md:grid md:w-full md:grid-cols-5 gap-1 min-w-max h-auto">
            <TabsTrigger value="overview" className="text-xs sm:text-sm py-2 sm:py-3 whitespace-nowrap">Overview</TabsTrigger>
            <TabsTrigger value="clinical" className="text-xs sm:text-sm py-2 sm:py-3 whitespace-nowrap">Clinical Data</TabsTrigger>
            <TabsTrigger value="ai-insights" className="text-xs sm:text-sm py-2 sm:py-3 whitespace-nowrap">AI Insights</TabsTrigger>
            <TabsTrigger value="compliance" className="text-xs sm:text-sm py-2 sm:py-3 whitespace-nowrap">Compliance</TabsTrigger>
            <TabsTrigger value="trends" className="text-xs sm:text-sm py-2 sm:py-3 whitespace-nowrap">Trends</TabsTrigger>
          </TabsList>
        </div>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
            <div className="lg:col-span-2">
              <AIPatientDashboardSummary
                patient={patient}
                visits={visits}
                carePlans={carePlans}
                tasks={tasks}
                incidents={incidents}
              />
            </div>
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
        </TabsContent>

        {/* Clinical Data Tab */}
        <TabsContent value="clinical" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="text-sm sm:text-base">Vital Signs Trends</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6">
                {vitalsData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <LineChart data={vitalsData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="bp_sys" stroke="#ef4444" name="BP Systolic" />
                      <Line type="monotone" dataKey="bp_dia" stroke="#f97316" name="BP Diastolic" />
                      <Line type="monotone" dataKey="hr" stroke="#3b82f6" name="Heart Rate" />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <p className="text-center text-gray-500 py-8">No vital signs data available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="text-sm sm:text-base">Medications ({patient.current_medications?.length || 0})</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6">
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {patient.current_medications?.map((med, i) => (
                    <div key={i} className="p-3 bg-gray-50 rounded-lg">
                      <p className="font-semibold text-sm">{med.name}</p>
                      <p className="text-xs text-gray-600">{med.dosage} • {med.frequency}</p>
                    </div>
                  )) || <p className="text-gray-500 text-sm">No medications recorded</p>}
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="text-sm sm:text-base">Recent Visits ({visits.slice(0, 5).length})</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6">
                {visits.length > 0 ? (
                  <div className="space-y-3">
                    {visits.slice(0, 5).map((visit) => (
                      <div key={visit.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-sm">{visit.visit_date}</p>
                            <Badge variant="outline" className="text-xs mt-1">
                              {visit.visit_type.replace(/_/g, ' ')}
                            </Badge>
                          </div>
                          <Badge className={visit.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}>
                            {visit.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No visits recorded</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="text-sm sm:text-base">Care Plans ({carePlans.length})</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6">
                {carePlans.length > 0 ? (
                  <div className="space-y-3">
                    {carePlans.slice(0, 5).map((plan) => (
                      <div key={plan.id} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-sm">{plan.problem}</p>
                            <p className="text-xs text-gray-600 mt-1">{plan.goal}</p>
                          </div>
                          <Badge className={
                            plan.status === 'met' ? 'bg-green-500' :
                            plan.status === 'active' ? 'bg-blue-500' : 'bg-gray-500'
                          }>
                            {plan.status}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No care plans recorded</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="ai-insights" className="space-y-6">
          {patient && (
            <>
              <AIPatientRiskAssessor patientId={selectedPatientId} autoAnalyze={false} />
              <AIPatientInsights patient={patient} visits={visits} carePlans={carePlans} incidents={incidents} />
              <PatientRiskStratification
                patient={patient}
                visits={visits}
                carePlans={carePlans}
                incidents={incidents}
                autoCalculate={false}
              />
            </>
          )}
        </TabsContent>

        {/* Compliance Tab */}
        <TabsContent value="compliance" className="space-y-6">
          {patient && <AIProactiveOASISAssistant patientId={selectedPatientId} autoAnalyze={false} />}
        </TabsContent>

        {/* Trends Tab */}
        <TabsContent value="trends" className="space-y-4 sm:space-y-6">
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-sm sm:text-base md:text-lg">Visit Frequency (Last 12 Months)</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4 md:p-6">
              <ResponsiveContainer width="100%" height={300}>
                <AreaChart data={visitFrequencyData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="month" />
                  <YAxis />
                  <Tooltip />
                  <Area type="monotone" dataKey="visits" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.3} />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
            <Card>
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="text-sm sm:text-base">Incident History</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6">
                {incidents.length > 0 ? (
                  <div className="space-y-3">
                    {incidents.slice(0, 5).map((incident, i) => (
                      <div key={i} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="font-semibold text-sm">{incident.incident_type.replace(/_/g, ' ')}</p>
                            <p className="text-xs text-gray-600">{incident.incident_date}</p>
                          </div>
                          <Badge className={
                            incident.severity === 'high' ? 'bg-red-500' :
                            incident.severity === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                          }>
                            {incident.severity}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No incidents recorded</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="p-3 sm:p-4 md:p-6">
                <CardTitle className="text-sm sm:text-base">Active Tasks ({tasks.filter(t => t.status === 'pending').length})</CardTitle>
              </CardHeader>
              <CardContent className="p-3 sm:p-4 md:p-6">
                {tasks.filter(t => t.status === 'pending').length > 0 ? (
                  <div className="space-y-3">
                    {tasks.filter(t => t.status === 'pending').slice(0, 5).map((task, i) => (
                      <div key={i} className="p-3 bg-gray-50 rounded-lg">
                        <p className="font-semibold text-sm">{task.title}</p>
                        <div className="flex gap-2 mt-2">
                          <Badge className={
                            task.priority === 'high' ? 'bg-red-500' :
                            task.priority === 'medium' ? 'bg-yellow-500' : 'bg-blue-500'
                          }>
                            {task.priority}
                          </Badge>
                          {task.due_date && (
                            <Badge variant="outline" className="text-xs">
                              Due: {task.due_date}
                            </Badge>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-8">No pending tasks</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
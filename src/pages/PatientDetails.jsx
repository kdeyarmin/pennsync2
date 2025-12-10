import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { ArrowLeft, Calendar, Plus, User, FileText, AlertTriangle, Phone, MapPin, Shield, Heart, Stethoscope, Activity } from "lucide-react";
import { format, isValid, parseISO } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { canAccessPatient, logSecurityEvent, sanitizeInput } from "@/components/utils/security";
import { logActivity, ActivityActions } from "@/components/utils/activityLogger";

import HospitalReadmissionRisk from "../components/patient/HospitalReadmissionRisk";
import ClinicalBestPracticeAlerts from "../components/quality/ClinicalBestPracticeAlerts";
import AIPatientSummary from "../components/patient/AIPatientSummary";
import AIPatientHistorySummary from "../components/patient/AIPatientHistorySummary";
import AICarePlanSuggestions from "../components/carePlan/AICarePlanSuggestions";
import CarePlanTimelinePredictor from "../components/carePlan/CarePlanTimelinePredictor";
import PatientFriendlyCarePlanSummary from "../components/carePlan/PatientFriendlyCarePlanSummary";
import CarePlanEvolution from "../components/carePlan/CarePlanEvolution";
import PatientRiskStratification from "../components/patient/PatientRiskStratification";
import DischargeSummaryGenerator from "../components/discharge/DischargeSummaryGenerator";
import AIPatientDashboardSummary from "../components/patient/AIPatientDashboardSummary";
import QuickActionsPanel from "../components/patient/QuickActionsPanel";
import AIPatientHistoryAnalyzer from "../components/patient/AIPatientHistoryAnalyzer";
import AIComplianceAuditor from "../components/compliance/AIComplianceAuditor";
import FavoriteButton from "../components/navigation/FavoriteButton";

export default function PatientDetails() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const patientId = urlParams.get('id') || urlParams.get('patientId');

  const [showVisitForm, setShowVisitForm] = useState(false);
  const [newVisit, setNewVisit] = useState({
    visit_date: format(new Date(), 'yyyy-MM-dd'),
    visit_time: '',
    visit_type: 'routine_visit',
    status: 'scheduled'
  });

  // Log access when component mounts
  React.useEffect(() => {
    if (patientId) {
      logSecurityEvent('PATIENT_DETAILS_ACCESSED', { patient_id: patientId });
      logActivity(ActivityActions.VIEW, {
        entity_type: 'Patient',
        entity_id: patientId,
        page: 'PatientDetails'
      });
    }
  }, [patientId]);

  const { data: patients } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
    initialData: [],
  });

  const patient = patients?.find(p => p.id === patientId);
  const isLoading = !patients;

  const { data: visits } = useQuery({
    queryKey: ['patientVisits', patientId],
    queryFn: () => base44.entities.Visit.filter({ patient_id: patientId }, '-visit_date'),
    initialData: [],
    enabled: !!patientId,
  });

  const { data: carePlans } = useQuery({
    queryKey: ['patientCarePlans', patientId],
    queryFn: () => base44.entities.CarePlan.filter({ patient_id: patientId }),
    initialData: [],
    enabled: !!patientId,
  });

  const { data: incidents } = useQuery({
    queryKey: ['patientIncidents', patientId],
    queryFn: () => base44.entities.Incident.filter({ patient_id: patientId }, '-incident_date'),
    initialData: [],
    enabled: !!patientId,
  });

  const { data: tasks } = useQuery({
    queryKey: ['patientTasks', patientId],
    queryFn: () => base44.entities.Task.filter({ patient_id: patientId }),
    initialData: [],
    enabled: !!patientId,
  });

  const { data: patientOASIS = [] } = useQuery({
    queryKey: ['patientOASIS', patientId],
    queryFn: () => base44.entities.OASISUpload.filter({ patient_id: patientId }, '-created_date'),
    initialData: [],
    enabled: !!patientId,
  });

  const { data: activeAlerts = [] } = useQuery({
    queryKey: ['patientActiveAlerts', patientId],
    queryFn: () => base44.entities.PatientAlert.filter({ patient_id: patientId, status: 'active' }),
    initialData: [],
    enabled: !!patientId,
  });

  // Calculate critical indicators
  const hasCriticalAlerts = activeAlerts.some(a => a.severity === 'critical');
  const hasHighAlerts = activeAlerts.some(a => a.severity === 'high');
  const criticalAlertCount = activeAlerts.filter(a => a.severity === 'critical').length;
  const highAlertCount = activeAlerts.filter(a => a.severity === 'high').length;

  const createCarePlanMutation = useMutation({
    mutationFn: (carePlanData) => base44.entities.CarePlan.create({ ...carePlanData, patient_id: patientId }),
    onSuccess: (newPlan) => {
      queryClient.invalidateQueries({ queryKey: ['patientCarePlans', patientId] });
      logActivity(ActivityActions.CARE_PLAN_CREATE, {
        entity_type: 'CarePlan',
        entity_id: newPlan.id,
        patient_id: patientId,
        problem: newPlan.problem,
        page: 'PatientDetails'
      });
    },
  });

  const createVisitMutation = useMutation({
    mutationFn: (visitData) => base44.entities.Visit.create({ ...visitData, patient_id: patientId }),
    onSuccess: (newVisit) => {
      queryClient.invalidateQueries({ queryKey: ['patientVisits', patientId] });
      setShowVisitForm(false);
      setNewVisit({
        visit_date: format(new Date(), 'yyyy-MM-dd'),
        visit_time: '',
        visit_type: 'routine_visit',
        status: 'scheduled'
      });
      logActivity(ActivityActions.CREATE, {
        entity_type: 'Visit',
        entity_id: newVisit.id,
        patient_id: patientId,
        visit_type: newVisit.visit_type,
        visit_date: newVisit.visit_date,
        page: 'PatientDetails'
      });
    },
  });

  const handleCreateVisit = () => {
    // Sanitize inputs
    const sanitizedVisit = {
      ...newVisit,
      visit_time: sanitizeInput(newVisit.visit_time),
    };
    createVisitMutation.mutate(sanitizedVisit);
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            Loading patient information...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!isLoading && !patient) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Patient not found</h2>
            <p className="text-sm text-gray-600 mb-4">Patient ID: {patientId}</p>
            <Button onClick={() => navigate(createPageUrl("Patients"))}>
              Return to Patients
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <Button
        variant="outline"
        onClick={() => navigate(createPageUrl("Patients"))}
        className="mb-4 sm:mb-6"
        size="sm"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        <span className="hidden sm:inline">Back to Patients</span>
        <span className="sm:hidden">Back</span>
      </Button>

      <Card className={`mb-4 sm:mb-6 ${hasCriticalAlerts ? 'bg-gradient-to-r from-red-50 to-orange-50 border-red-300' : hasHighAlerts ? 'bg-gradient-to-r from-orange-50 to-yellow-50 border-orange-300' : 'bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200'}`}>
        <CardContent className="p-3 sm:p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start gap-3 sm:gap-4">
            <div className={`w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 rounded-full flex items-center justify-center shadow-lg flex-shrink-0 relative ${hasCriticalAlerts ? 'bg-gradient-to-br from-red-500 to-orange-500' : hasHighAlerts ? 'bg-gradient-to-br from-orange-500 to-yellow-500' : 'bg-gradient-to-br from-blue-500 to-indigo-500'}`}>
              <User className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8 text-white" />
              {(hasCriticalAlerts || hasHighAlerts) && (
                <div className="absolute -top-1 -right-1 w-4 h-4 sm:w-5 sm:h-5 bg-red-600 rounded-full border-2 border-white animate-pulse flex items-center justify-center">
                  <AlertTriangle className="w-2 h-2 sm:w-3 sm:h-3 text-white" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0 w-full">
              <div className="flex flex-col gap-3">
                <div className="min-w-0">
                  <div className="flex items-start gap-2">
                    <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 mb-1 sm:mb-2 break-words flex-1">
                      {sanitizeInput(patient.first_name)} {sanitizeInput(patient.last_name)}
                    </h1>
                    <FavoriteButton 
                      type="patient" 
                      id={patient.id} 
                      name={`${patient.first_name} ${patient.last_name}`} 
                    />
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-3 text-xs sm:text-sm text-gray-600">
                    <span>MRN: {sanitizeInput(patient.medical_record_number) || 'N/A'}</span>
                    <span className="hidden sm:inline">•</span>
                    <span className="block sm:inline w-full sm:w-auto">DOB: {patient.date_of_birth && isValid(new Date(patient.date_of_birth)) ? format(new Date(patient.date_of_birth), 'MM/dd/yyyy') : 'N/A'}</span>
                  </div>
                </div>
                <div className="flex flex-wrap items-start gap-2">
                  <Badge 
                    className={`flex-shrink-0 ${patient.care_type === 'hospice' 
                      ? 'bg-purple-100 text-purple-800 border-purple-200' 
                      : 'bg-blue-100 text-blue-800 border-blue-200'
                    }`}
                  >
                    {patient.care_type === 'hospice' ? 'Hospice' : 'Home Health'}
                  </Badge>
                  {hasCriticalAlerts && (
                    <Badge className="bg-red-600 text-white animate-pulse">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {criticalAlertCount} Critical Alert{criticalAlertCount !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  {hasHighAlerts && !hasCriticalAlerts && (
                    <Badge className="bg-orange-600 text-white">
                      <AlertTriangle className="w-3 h-3 mr-1" />
                      {highAlertCount} High Alert{highAlertCount !== 1 ? 's' : ''}
                    </Badge>
                  )}
                  {patient.status !== 'discharged' && (
                    <DischargeSummaryGenerator 
                      patientId={patientId} 
                      onComplete={() => queryClient.invalidateQueries({ queryKey: ['patient', patientId] })}
                    />
                  )}
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* AI Patient Dashboard Summary & Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <div className="lg:col-span-2">
          <AIPatientDashboardSummary
            patient={patient}
            visits={visits}
            carePlans={carePlans}
            tasks={tasks}
            incidents={incidents}
          />
        </div>
        <div>
          <QuickActionsPanel
            patient={patient}
            recentVisits={visits.filter(v => v.status === 'completed').slice(0, 5)}
            upcomingVisits={visits.filter(v => v.status === 'scheduled')}
            activeCarePlans={carePlans.filter(cp => cp.status === 'active')}
            pendingTasks={tasks.filter(t => t.status === 'pending')}
          />
        </div>
      </div>

      {/* AI Compliance Auditor - Prominent */}
      {patient && (
        <div className="mb-6">
          <AIComplianceAuditor
            patientId={patientId}
            autoRun={false}
            scope="comprehensive"
          />
        </div>
      )}

      {/* AI Risk Stratification - Prominent */}
      {patient && (
        <div className="mb-6">
          <PatientRiskStratification
            patient={patient}
            visits={visits}
            carePlans={carePlans}
            incidents={incidents}
            autoCalculate={true}
          />
        </div>
      )}

      {/* AI Patient History Summary - Prominent */}
      {patient && (
        <div className="mb-6">
          <AIPatientHistorySummary
            patient={patient}
            visits={visits}
            carePlans={carePlans}
            incidents={incidents}
            autoGenerate={true}
            prominent={true}
          />
        </div>
      )}

      {/* AI Patient History Analyzer - Comprehensive Analysis with Gap Detection */}
      {patient && (
        <div className="mb-6">
          <AIPatientHistoryAnalyzer
            patient={patient}
            visits={visits}
            carePlans={carePlans}
            oasisData={patientOASIS}
            incidents={incidents}
          />
        </div>
      )}

      {/* AI Care Plan Evolution */}
      {patient && carePlans.length > 0 && (
        <div className="mb-6">
          <CarePlanEvolution
            patientId={patientId}
            patientName={`${patient.first_name} ${patient.last_name}`}
            carePlans={carePlans}
            visits={visits}
            onCarePlanUpdated={() => queryClient.invalidateQueries({ queryKey: ['patientCarePlans', patientId] })}
          />
        </div>
      )}

      {/* AI Care Plan Tools */}
      {patient && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
          <AICarePlanSuggestions 
            patient={patient} 
            existingCarePlans={carePlans}
            onAddCarePlan={(data) => createCarePlanMutation.mutate(data)}
          />
          <div className="space-y-4 md:space-y-6">
            <CarePlanTimelinePredictor patient={patient} carePlans={carePlans} />
            <PatientFriendlyCarePlanSummary patient={patient} carePlans={carePlans} />
          </div>
        </div>
      )}

      {/* Critical Alerts Banner */}
      {activeAlerts.length > 0 && (
        <Alert className={`mb-6 ${hasCriticalAlerts ? 'bg-red-50 border-red-300' : 'bg-orange-50 border-orange-300'}`}>
          <AlertTriangle className={`w-4 h-4 ${hasCriticalAlerts ? 'text-red-600' : 'text-orange-600'}`} />
          <AlertDescription>
            <p className="font-semibold mb-1">Active Patient Alerts ({activeAlerts.length})</p>
            <div className="space-y-1">
              {activeAlerts.slice(0, 3).map((alert, idx) => (
                <p key={idx} className="text-sm">• {alert.title}</p>
              ))}
              {activeAlerts.length > 3 && (
                <p className="text-sm text-gray-600">+ {activeAlerts.length - 3} more alerts</p>
              )}
            </div>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <Card>
          <CardHeader className="p-3 sm:p-6">
            <CardTitle className="text-base sm:text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-blue-600" />
              Patient Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-500 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Address
              </p>
              <p className="text-gray-900">{sanitizeInput(patient.address) || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500 flex items-center gap-1">
                <Phone className="w-3 h-3" />
                Phone
              </p>
              <p className="text-gray-900">{sanitizeInput(patient.phone) || 'Not specified'}</p>
            </div>
            {patient.email && (
              <div>
                <p className="text-sm font-medium text-gray-500">Email</p>
                <p className="text-gray-900">{sanitizeInput(patient.email)}</p>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <Badge variant="outline">{patient.status || 'active'}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Heart className="w-5 h-5 text-red-600" />
              Emergency Contact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {patient.emergency_contact_name ? (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-500">Name</p>
                  <p className="text-gray-900">{sanitizeInput(patient.emergency_contact_name)}</p>
                </div>
                {patient.emergency_contact_relationship && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Relationship</p>
                    <p className="text-gray-900">{sanitizeInput(patient.emergency_contact_relationship)}</p>
                  </div>
                )}
                {patient.emergency_contact_phone && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      Phone
                    </p>
                    <p className="text-gray-900">{sanitizeInput(patient.emergency_contact_phone)}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500">No emergency contact information on file</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-green-600" />
              Primary Care Physician
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {patient.physician_name ? (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-500">Name</p>
                  <p className="text-gray-900">{sanitizeInput(patient.physician_name)}</p>
                </div>
                {patient.physician_phone && (
                  <div>
                    <p className="text-sm font-medium text-gray-500 flex items-center gap-1">
                      <Phone className="w-3 h-3" />
                      Phone
                    </p>
                    <p className="text-gray-900">{sanitizeInput(patient.physician_phone)}</p>
                  </div>
                )}
                {patient.physician_email && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <p className="text-gray-900">{sanitizeInput(patient.physician_email)}</p>
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500">No physician information on file</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-purple-600" />
              Insurance Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {patient.insurance_primary?.provider ? (
              <>
                <div>
                  <p className="text-sm font-medium text-gray-500">Primary Insurance</p>
                  <p className="text-gray-900">{sanitizeInput(patient.insurance_primary.provider)}</p>
                  {patient.insurance_primary.policy_number && (
                    <p className="text-sm text-gray-600">Policy: {sanitizeInput(patient.insurance_primary.policy_number)}</p>
                  )}
                </div>
                {patient.insurance_secondary?.provider && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Secondary Insurance</p>
                    <p className="text-gray-900">{sanitizeInput(patient.insurance_secondary.provider)}</p>
                    {patient.insurance_secondary.policy_number && (
                      <p className="text-sm text-gray-600">Policy: {sanitizeInput(patient.insurance_secondary.policy_number)}</p>
                    )}
                  </div>
                )}
              </>
            ) : (
              <p className="text-sm text-gray-500">No insurance information on file</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mb-4 sm:mb-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Clinical Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-500">Primary Diagnosis</p>
              <p className="text-gray-900">{sanitizeInput(patient.primary_diagnosis) || 'Not specified'}</p>
            </div>
            {patient.secondary_diagnoses && patient.secondary_diagnoses.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Secondary Diagnoses</p>
                <div className="flex flex-wrap gap-2">
                  {patient.secondary_diagnoses.map((diagnosis, index) => (
                    <Badge key={index} variant="outline">{sanitizeInput(diagnosis)}</Badge>
                  ))}
                </div>
              </div>
            )}
            <div>
              <p className="text-sm font-medium text-gray-500">Allergies</p>
              <p className="text-gray-900">{sanitizeInput(patient.allergies) || 'NKDA'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Medical History
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {patient.past_medical_history && patient.past_medical_history.length > 0 ? (
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Past Medical Conditions</p>
                <div className="space-y-1">
                  {patient.past_medical_history.map((condition, index) => (
                    <p key={index} className="text-sm text-gray-900">• {sanitizeInput(condition)}</p>
                  ))}
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No past medical history documented</p>
            )}
            {patient.past_hospitalizations && patient.past_hospitalizations.length > 0 && (
              <div>
                <p className="text-sm font-medium text-gray-500 mb-2">Past Hospitalizations</p>
                <div className="space-y-2">
                  {patient.past_hospitalizations.slice(0, 3).map((hosp, index) => (
                    <div key={index} className="text-sm bg-gray-50 p-2 rounded">
                      <p className="font-medium text-gray-900">{hosp.reason}</p>
                      <p className="text-xs text-gray-600">
                        {hosp.date && isValid(new Date(hosp.date)) ? format(new Date(hosp.date), 'MMM yyyy') : 'Date unknown'} • {hosp.hospital || 'N/A'}
                      </p>
                    </div>
                  ))}
                  {patient.past_hospitalizations.length > 3 && (
                    <p className="text-xs text-gray-500">+ {patient.past_hospitalizations.length - 3} more</p>
                  )}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Visit History
            </CardTitle>
            <Button
              onClick={() => setShowVisitForm(!showVisitForm)}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="w-4 h-4 mr-2" />
              Schedule Visit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {showVisitForm && (
            <Card className="mb-6 bg-blue-50 border-blue-200">
              <CardContent className="p-4 space-y-4">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <Label>Visit Date</Label>
                    <Input
                      type="date"
                      value={newVisit.visit_date}
                      onChange={(e) => setNewVisit({...newVisit, visit_date: e.target.value})}
                    />
                  </div>
                  <div>
                    <Label>Visit Time</Label>
                    <Input
                      type="time"
                      value={newVisit.visit_time}
                      onChange={(e) => setNewVisit({...newVisit, visit_time: e.target.value})}
                    />
                  </div>
                </div>
                <div>
                  <Label>Visit Type</Label>
                  <Select
                    value={newVisit.visit_type}
                    onValueChange={(value) => setNewVisit({...newVisit, visit_type: value})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="skilled_nursing">Skilled Nursing</SelectItem>
                      <SelectItem value="admission">Admission</SelectItem>
                      <SelectItem value="recertification">Recertification</SelectItem>
                      <SelectItem value="discharge">Discharge</SelectItem>
                      <SelectItem value="routine_visit">Routine Visit</SelectItem>
                      <SelectItem value="prn">PRN Visit</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowVisitForm(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateVisit} className="bg-blue-600 hover:bg-blue-700">
                    Create Visit
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="space-y-3">
            {visits.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p>No visits scheduled yet</p>
              </div>
            ) : (
              visits.map((visit) => (
                <Card key={visit.id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-semibold text-gray-900">
                          {visit.visit_date && isValid(new Date(visit.visit_date)) ? format(new Date(visit.visit_date), 'MMMM d, yyyy') : 'Invalid date'}
                          {visit.visit_time && ` at ${sanitizeInput(visit.visit_time)}`}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant="outline">
                            {visit.visit_type.replace(/_/g, ' ')}
                          </Badge>
                          <Badge className={
                            visit.status === 'completed' ? 'bg-green-100 text-green-800' :
                            visit.status === 'in_progress' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-blue-100 text-blue-800'
                          }>
                            {visit.status.replace('_', ' ')}
                          </Badge>
                        </div>
                      </div>
                      {visit.status !== 'completed' && (
                        <Button
                          size="sm"
                          onClick={() => navigate(`${createPageUrl("DocumentVisit")}?visitId=${visit.id}`)}
                          className="bg-blue-600 hover:bg-blue-700"
                        >
                          Document
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
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
import { ArrowLeft, Calendar, Plus, User, FileText, AlertTriangle } from "lucide-react";
import { format } from "date-fns";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { canAccessPatient, logSecurityEvent, sanitizeInput } from "@/components/utils/security";

import HospitalReadmissionRisk from "../components/patient/HospitalReadmissionRisk";
import ClinicalBestPracticeAlerts from "../components/quality/ClinicalBestPracticeAlerts";
import AIPatientSummary from "../components/patient/AIPatientSummary";
import AIPatientHistorySummary from "../components/patient/AIPatientHistorySummary";
import AICarePlanSuggestions from "../components/carePlan/AICarePlanSuggestions";
import CarePlanTimelinePredictor from "../components/carePlan/CarePlanTimelinePredictor";
import PatientFriendlyCarePlanSummary from "../components/carePlan/PatientFriendlyCarePlanSummary";
import CarePlanEvolution from "../components/carePlan/CarePlanEvolution";
import PatientRiskStratification from "../components/patient/PatientRiskStratification";

export default function PatientDetails() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const patientId = urlParams.get('patientId');

  const [hasAccess, setHasAccess] = React.useState(null);
  const [showVisitForm, setShowVisitForm] = useState(false);
  const [newVisit, setNewVisit] = useState({
    visit_date: format(new Date(), 'yyyy-MM-dd'),
    visit_time: '',
    visit_type: 'routine_visit',
    status: 'scheduled'
  });

  // Security: Check access before loading patient data
  React.useEffect(() => {
    const checkAccess = async () => {
      if (!patientId) {
        setHasAccess(false);
        return;
      }
      
      const access = await canAccessPatient(patientId);
      setHasAccess(access);
      
      if (access) {
        await logSecurityEvent('PATIENT_DETAILS_ACCESSED', { patient_id: patientId });
      } else {
        await logSecurityEvent('UNAUTHORIZED_PATIENT_ACCESS_ATTEMPT', { patient_id: patientId });
      }
    };
    
    checkAccess();
  }, [patientId]);

  const { data: patient, isLoading } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => base44.entities.Patient.filter({ id: patientId }),
    select: (data) => data[0],
    enabled: !!patientId && hasAccess === true,
  });

  const { data: visits } = useQuery({
    queryKey: ['patientVisits', patientId],
    queryFn: () => base44.entities.Visit.filter({ patient_id: patientId }, '-visit_date'),
    initialData: [],
    enabled: !!patientId && hasAccess === true,
  });

  const { data: carePlans } = useQuery({
    queryKey: ['patientCarePlans', patientId],
    queryFn: () => base44.entities.CarePlan.filter({ patient_id: patientId }),
    initialData: [],
    enabled: !!patientId && hasAccess === true,
  });

  const { data: incidents } = useQuery({
    queryKey: ['patientIncidents', patientId],
    queryFn: () => base44.entities.Incident.filter({ patient_id: patientId }, '-incident_date'),
    initialData: [],
    enabled: !!patientId && hasAccess === true,
  });

  const createCarePlanMutation = useMutation({
    mutationFn: (carePlanData) => base44.entities.CarePlan.create({ ...carePlanData, patient_id: patientId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientCarePlans', patientId] });
    },
  });

  const createVisitMutation = useMutation({
    mutationFn: (visitData) => base44.entities.Visit.create({ ...visitData, patient_id: patientId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patientVisits', patientId] });
      setShowVisitForm(false);
      setNewVisit({
        visit_date: format(new Date(), 'yyyy-MM-dd'),
        visit_time: '',
        visit_type: 'routine_visit',
        status: 'scheduled'
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

  // Security: Check access status
  if (hasAccess === null) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center text-gray-500">
            Verifying access permissions...
          </CardContent>
        </Card>
      </div>
    );
  }

  if (hasAccess === false) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <Alert className="border-red-300 bg-red-50">
          <AlertTriangle className="w-5 h-5 text-red-600" />
          <AlertDescription className="text-red-900">
            <p className="font-semibold mb-2">Access Denied</p>
            <p>You do not have permission to view this patient's information. This incident has been logged.</p>
          </AlertDescription>
        </Alert>
        <Button 
          onClick={() => navigate(createPageUrl("Dashboard"))}
          className="mt-4"
        >
          Return to Dashboard
        </Button>
      </div>
    );
  }

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

  if (!patient) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Patient not found</h2>
            <Button onClick={() => navigate(createPageUrl("Patients"))}>
              Return to Patients
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <Button
        variant="outline"
        onClick={() => navigate(createPageUrl("Patients"))}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Patients
      </Button>

      <Card className="mb-6 bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
        <CardContent className="p-4 md:p-6">
          <div className="flex flex-col sm:flex-row items-start gap-4">
            <div className="w-12 h-12 md:w-16 md:h-16 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-lg flex-shrink-0">
              <User className="w-6 h-6 md:w-8 md:h-8 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                <div className="min-w-0">
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1 md:mb-2 truncate">
                    {sanitizeInput(patient.first_name)} {sanitizeInput(patient.last_name)}
                  </h1>
                  <div className="flex flex-wrap items-center gap-2 md:gap-3 text-xs md:text-sm text-gray-600">
                    <span>MRN: {sanitizeInput(patient.medical_record_number) || 'N/A'}</span>
                    <span className="hidden sm:inline">•</span>
                    <span>DOB: {patient.date_of_birth ? format(new Date(patient.date_of_birth), 'MM/dd/yyyy') : 'N/A'}</span>
                  </div>
                </div>
                <Badge 
                  className={`flex-shrink-0 ${patient.care_type === 'hospice' 
                    ? 'bg-purple-100 text-purple-800 border-purple-200' 
                    : 'bg-blue-100 text-blue-800 border-blue-200'
                  }`}
                >
                  {patient.care_type === 'hospice' ? 'Hospice' : 'Home Health'}
                </Badge>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

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
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 mb-6">
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

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>Patient Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm font-medium text-gray-500">Address</p>
              <p className="text-gray-900">{sanitizeInput(patient.address) || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Phone</p>
              <p className="text-gray-900">{sanitizeInput(patient.phone) || 'Not specified'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Status</p>
              <Badge variant="outline">{patient.status || 'active'}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Clinical Information</CardTitle>
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
                          {format(new Date(visit.visit_date), 'MMMM d, yyyy')}
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
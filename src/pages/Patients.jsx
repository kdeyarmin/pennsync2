import React, { useState, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Plus, Search, User, Phone, MapPin, FileText, X } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { format } from 'date-fns';
import { secureDelete, handleSecureError, logSecurityEvent } from "../components/utils/security";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import PatientForm from "../components/patient/PatientForm";
import VoiceCommandListener from "../components/voice/VoiceCommandListener";
import { getCommandsForContext } from "../components/voice/voiceCommands";
import AIPatientSummaryReport from "../components/smartNote/AIPatientSummaryReport";

export default function Patients() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingPatient, setEditingPatient] = useState(null);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [summaryPatient, setSummaryPatient] = useState(null);

  const { data: patients, isLoading, error: patientsError } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list('-created_date'),
    initialData: [],
  });

  // Fetch visits and care plans for summary dialog
  const { data: summaryVisits = [] } = useQuery({
    queryKey: ['summaryVisits', summaryPatient?.id],
    queryFn: () => base44.entities.Visit.filter({ patient_id: summaryPatient.id, status: 'completed' }, '-visit_date', 10),
    enabled: !!summaryPatient?.id,
  });

  const { data: summaryCarePlans = [] } = useQuery({
    queryKey: ['summaryCarePlans', summaryPatient?.id],
    queryFn: () => base44.entities.CarePlan.filter({ patient_id: summaryPatient.id }),
    enabled: !!summaryPatient?.id,
  });

  const handleShowSummary = (patient) => {
    setSummaryPatient(patient);
    setShowSummaryDialog(true);
  };

  // Handle query errors gracefully
  if (patientsError) {
    console.error('Error loading patients:', patientsError);
  }

  const createPatientMutation = useMutation({
    mutationFn: (patientData) => base44.entities.Patient.create(patientData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setShowForm(false);
      setEditingPatient(null);
    },
  });

  const updatePatientMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Patient.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setShowForm(false);
      setEditingPatient(null);
    },
  });

  const deletePatientMutation = useMutation({
    mutationFn: async (patientId) => {
      await secureDelete(base44.entities.Patient, patientId, 'Patient');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setShowDeleteDialog(false);
      setPatientToDelete(null);
    },
    onError: async (error) => {
      await handleSecureError(error, 'patient_delete', (msg) => alert(msg));
    }
  });

  const handleSubmit = (data) => {
    if (editingPatient) {
      updatePatientMutation.mutate({ id: editingPatient.id, data });
    } else {
      createPatientMutation.mutate(data);
    }
  };

  // Visit type template quick-add
  const createVisitFromTemplate = useMutation({
    mutationFn: async ({ patientId, templateType }) => {
      const today = format(new Date(), 'yyyy-MM-dd');
      const visitData = {
        patient_id: patientId,
        visit_date: today,
        visit_time: '', // Could be dynamic or default to empty
        visit_type: templateType,
        status: 'scheduled'
      };
      return base44.entities.Visit.create(visitData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['todayVisits'] }); // Invalidate relevant queries, e.g., for a dashboard showing today's visits
      alert('Visit scheduled successfully!'); // Simple feedback
    },
    onError: (error) => {
      console.error("Failed to schedule visit:", error);
      alert('Failed to schedule visit. Please try again.');
    }
  });

  const visitTemplates = [
    { type: 'routine_visit', label: 'Routine Visit', icon: '📋' },
    { type: 'skilled_nursing', label: 'Skilled Nursing', icon: '💉' },
    { type: 'admission', label: 'Admission', icon: '🏥' },
    { type: 'recertification', label: 'Recertification', icon: '📝' },
  ];

  const filteredPatients = (patients || []).filter(patient => {
    if (!patient) return false;
    const searchLower = (searchTerm || '').toLowerCase();
    return (
      (patient.first_name || '').toLowerCase().includes(searchLower) ||
      (patient.last_name || '').toLowerCase().includes(searchLower) ||
      (patient.medical_record_number || '').toLowerCase().includes(searchLower)
    );
  });

  // Voice command handler
  const handleVoiceCommand = (action, spokenText) => {
    switch (action) {
      case 'add_patient':
        setEditingPatient(null);
        setShowForm(true);
        break;
      case 'schedule_visit':
        // Open first patient's detail page or show message
        if (patients.length > 0) {
          alert('Please select a patient first to schedule a visit');
        } else {
          alert('No patients available. Please add a patient first.');
        }
        break;
      case 'search_patients':
        // Extract search term from spoken text
        const searchKeywords = ['search for', 'find patient', 'look up', 'search patient', 'find'];
        let extractedSearchTerm = spokenText;
        for (const keyword of searchKeywords) {
          if (extractedSearchTerm.toLowerCase().startsWith(keyword)) {
            extractedSearchTerm = extractedSearchTerm.substring(keyword.length);
            break;
          }
        }
        extractedSearchTerm = extractedSearchTerm.trim();
        if (extractedSearchTerm) {
          setSearchTerm(extractedSearchTerm);
        }
        break;
      default:
        console.log('Unhandled voice command:', action);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Patient Management</h1>
          <p className="text-sm md:text-base text-gray-600 mt-1">Manage your patient roster</p>
        </div>
        <Button
          onClick={() => {
            setEditingPatient(null);
            setShowForm(true);
          }}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Patient
        </Button>
      </div>

      {showForm && (
        <PatientForm
          patient={editingPatient}
          onSubmit={handleSubmit}
          onCancel={() => {
            setShowForm(false);
            setEditingPatient(null);
          }}
        />
      )}

      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <Input
              placeholder="Search patients by name or MRN..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
        {isLoading ? (
          <Card>
            <CardContent className="p-8 text-center text-gray-500">
              Loading patients...
            </CardContent>
          </Card>
        ) : filteredPatients.length === 0 ? (
          <Card className="md:col-span-2 border-2 border-dashed">
            <CardContent className="p-12 text-center">
              <User className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No patients found</h3>
              <p className="text-gray-500 mb-6">
                {searchTerm ? 'No patients match your search.' : 'Start by adding your first patient.'}
              </p>
              {!searchTerm && (
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Patient
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredPatients.map((patient) => (
            <Card 
              key={patient.id} 
              className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500"
            >
              <CardContent className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-md flex-shrink-0">
                      <User className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-gray-900">
                        {patient.first_name} {patient.last_name}
                      </h3>
                      <p className="text-sm text-gray-500">MRN: {patient.medical_record_number || 'N/A'}</p>
                    </div>
                  </div>
                  <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                    Home Health
                  </Badge>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Phone className="w-4 h-4" />
                    <span>{patient.phone || 'No phone'}</span>
                  </div>
                  {patient.address && (
                    <div className="flex items-start gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4 mt-0.5" />
                      <span>{patient.address}</span>
                    </div>
                  )}
                </div>

                {patient.primary_diagnosis && (
                  <div className="mb-4">
                    <p className="text-sm font-medium text-gray-700 mb-1">Primary Diagnosis</p>
                    <p className="text-sm text-gray-600">{patient.primary_diagnosis}</p>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleShowSummary(patient)}
                    className="gap-1"
                    title="View AI Summary"
                  >
                    <FileText className="w-3 h-3" />
                    Summary
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditingPatient(patient);
                      setShowForm(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Link 
                    to={`${createPageUrl("PatientDetails")}?patientId=${patient.id}`}
                    className="flex-1"
                  >
                    <Button size="sm" className="w-full bg-blue-600 hover:bg-blue-700">
                      View Details
                    </Button>
                  </Link>
                </div>

                {/* Visit type templates */}
                <div className="mt-3 pt-3 border-t">
                  <p className="text-xs font-medium text-gray-600 mb-2">Quick Schedule:</p>
                  <div className="grid grid-cols-2 gap-2">
                    {visitTemplates.map((template) => (
                      <Button
                        key={template.type}
                        size="sm"
                        variant="outline"
                        onClick={() => createVisitFromTemplate.mutate({ 
                          patientId: patient.id, 
                          templateType: template.type 
                        })}
                        className="text-xs h-auto py-2"
                        disabled={createVisitFromTemplate.isLoading}
                      >
                        <span className="mr-1">{template.icon}</span>
                        {template.label}
                      </Button>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Voice Commands */}
      <VoiceCommandListener
        onCommand={handleVoiceCommand}
        commands={getCommandsForContext('patients')}
        context="patients"
      />

      {/* Patient Summary Dialog */}
      <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Patient Summary: {summaryPatient?.first_name} {summaryPatient?.last_name}
            </DialogTitle>
          </DialogHeader>
          {summaryPatient && (
            <AIPatientSummaryReport
              patient={summaryPatient}
              previousVisits={summaryVisits}
              carePlans={summaryCarePlans}
              compact={false}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
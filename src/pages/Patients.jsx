import { useState, useEffect, useMemo, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, User, FileText, ArrowUpDown } from "lucide-react";
import { format } from 'date-fns';
import { secureDelete, handleSecureError } from "../components/utils/security";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

import PatientForm from "../components/patient/PatientForm";
import { patientMatchesSearch } from "../components/patient/AdvancedPatientFilters";
import AIPatientSummaryReport from "../components/smartNote/AIPatientSummaryReport";
import DuplicatePatientManager from "../components/patient/DuplicatePatientManager";
import AdvancedPatientFilters from "../components/patient/AdvancedPatientFilters";
import BulkPatientActions from "../components/patient/BulkPatientActions";
import PatientMergeDialog from "../components/patient/PatientMergeDialog";
import PaginatedPatientList from "../components/patient/PaginatedPatientList";
import PatientFileUpdateUploader from "../components/patient/PatientFileUpdateUploader";
import PatientsPageHeader from "../components/patient/PatientsPageHeader";
import { logActivity, ActivityActions } from "../components/utils/activityLogger";
import PatientCardSkeleton from "../components/loading/PatientCardSkeleton";
import SwipeablePatientCard from "../components/mobile/SwipeablePatientCard";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export default function Patients() {
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [filters, setFilters] = useState({});
  const [editingPatient, setEditingPatient] = useState(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [patientToDelete, setPatientToDelete] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showSummaryDialog, setShowSummaryDialog] = useState(false);
  const [summaryPatient, setSummaryPatient] = useState(null);
  const [selectedPatients, setSelectedPatients] = useState([]);
  const [mergeDialogOpen, setMergeDialogOpen] = useState(false);
  const [patientsToMerge, setPatientsToMerge] = useState({ patient1: null, patient2: null });
  const [sortBy, setSortBy] = useState('newest');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceTimer = useRef(null);

  // Debounce search input by 300ms to avoid filtering on every keystroke
  useEffect(() => {
    clearTimeout(debounceTimer.current);
    debounceTimer.current = setTimeout(() => {
      setDebouncedSearch(filters.search || '');
    }, 300);
    return () => clearTimeout(debounceTimer.current);
  }, [filters.search]);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Log page visit
  useEffect(() => {
    if (currentUser?.email) {
      logActivity(ActivityActions.PAGE_VISIT, {
        page: 'Patients',
        page_title: 'Patient Management'
      });
    }
  }, [currentUser?.email]);

  const { data: patients, isLoading, error: patientsError } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const allPatients = await base44.entities.Patient.list('-created_date', 2000);
      return allPatients.filter(patient => !patient.is_archived);
    },
    initialData: [],
  });

  const { data: allVisits = [] } = useQuery({
    queryKey: ['allVisits'],
    queryFn: () => base44.entities.Visit.list('-visit_date', 500),
    initialData: [],
    staleTime: 300000,
  });

  const { data: allCarePlans = [] } = useQuery({
    queryKey: ['allCarePlans'],
    queryFn: () => base44.entities.CarePlan.list('-updated_date', 300),
    initialData: [],
    staleTime: 300000,
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
    onSuccess: (newPatient) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setShowForm(false);
      setEditingPatient(null);
      
      toast.success(`Patient ${newPatient.first_name} ${newPatient.last_name} created successfully`);
      
      // Log patient creation
      logActivity(ActivityActions.CREATE, {
        entity_type: 'Patient',
        entity_id: newPatient.id,
        patient_name: `${newPatient.first_name} ${newPatient.last_name}`,
        page: 'Patients'
      });
    },
    onError: (error) => {
      toast.error(`Failed to create patient: ${error.message}`);
    }
  });

  const updatePatientMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Patient.update(id, data),
    onSuccess: (updatedPatient, variables) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setShowForm(false);
      setEditingPatient(null);
      
      toast.success('Patient updated successfully');
      
      // Log patient update
      logActivity(ActivityActions.UPDATE, {
        entity_type: 'Patient',
        entity_id: variables.id,
        page: 'Patients'
      });
    },
    onError: (error) => {
      toast.error(`Failed to update patient: ${error.message}`);
    }
  });

  const deletePatientMutation = useMutation({
    mutationFn: async (patientId) => {
      await secureDelete(base44.entities.Patient, patientId, 'Patient');
    },
    onSuccess: (_, deletedId) => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      setDeleteDialogOpen(false);
      setPatientToDelete(null);
      setIsDeleting(false);
      
      // Log patient deletion
      logActivity(ActivityActions.DELETE, {
        entity_type: 'Patient',
        entity_id: deletedId,
        page: 'Patients'
      });
    },
    onError: async (error) => {
      setIsDeleting(false);
      await handleSecureError(error, 'patient_delete', (msg) => toast.error(msg));
    }
  });

  const handleDeletePatient = () => {
    if (!patientToDelete) return;
    setIsDeleting(true);
    deletePatientMutation.mutate(patientToDelete.id);
  };

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
    queryClient.invalidateQueries({ queryKey: ['todayVisits'] });
    toast.success('Visit scheduled successfully!');
    },
    onError: (error) => {
      toast.error(`Failed to schedule visit: ${error.message}`);
    }
  });

  const visitTemplates = [
    { type: 'routine_visit', label: 'Routine Visit', icon: '📋' },
    { type: 'skilled_nursing', label: 'Skilled Nursing', icon: '💉' },
    { type: 'admission', label: 'Admission', icon: '🏥' },
    { type: 'recertification', label: 'Recertification', icon: '📝' },
  ];

  const calculateAge = (dob) => {
    if (!dob) return null;
    const today = new Date();
    const birthDate = new Date(dob);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  const lastVisitDateByPatientId = useMemo(() => {
    const map = {};
    for (const v of allVisits) {
      const existing = map[v.patient_id];
      if (!existing || new Date(v.visit_date) > new Date(existing)) {
        map[v.patient_id] = v.visit_date;
      }
    }
    return map;
  }, [allVisits]);

  const visitCountByPatientId = useMemo(() => {
    const map = {};
    for (const v of allVisits) {
      map[v.patient_id] = (map[v.patient_id] || 0) + 1;
    }
    return map;
  }, [allVisits]);

  const carePlanCountByPatientId = useMemo(() => {
    const map = {};
    for (const cp of allCarePlans) {
      map[cp.patient_id] = (map[cp.patient_id] || 0) + 1;
    }
    return map;
  }, [allCarePlans]);

  const filteredPatients = useMemo(() => (patients || []).filter(patient => {
    if (!patient) return false;

    // Fuzzy search across name, MRN, phone, diagnosis (debounced)
    const matchesSearch = patientMatchesSearch(patient, debouncedSearch);

    // Status filter
    const matchesStatus = !filters.status || filters.status === 'all' || patient.status === filters.status;

    // Diagnosis filter
    const matchesDiagnosis = !filters.diagnosis ||
      (patient.primary_diagnosis || '').toLowerCase().includes(filters.diagnosis.toLowerCase());

    // Age filter
    const patientAge = calculateAge(patient.date_of_birth);
    const matchesAgeMin = !filters.ageMin || (patientAge !== null && patientAge >= parseInt(filters.ageMin));
    const matchesAgeMax = !filters.ageMax || (patientAge !== null && patientAge <= parseInt(filters.ageMax));

    // Visit filter — use pre-built index instead of filtering allVisits per patient
    const patientVisitCount = visitCountByPatientId[patient.id] || 0;
    const matchesVisits = !filters.hasVisits || filters.hasVisits === 'all' ||
      (filters.hasVisits === 'yes' && patientVisitCount > 0) ||
      (filters.hasVisits === 'no' && patientVisitCount === 0);

    // Care plan filter — use pre-built index instead of filtering allCarePlans per patient
    const patientCarePlanCount = carePlanCountByPatientId[patient.id] || 0;
    const matchesCarePlans = !filters.hasCarePlans || filters.hasCarePlans === 'all' ||
      (filters.hasCarePlans === 'yes' && patientCarePlanCount > 0) ||
      (filters.hasCarePlans === 'no' && patientCarePlanCount === 0);

    // Date range filter
    const createdDate = new Date(patient.created_date);
    const matchesAfter = !filters.createdAfter || createdDate >= new Date(filters.createdAfter);
    const matchesBefore = !filters.createdBefore || createdDate <= new Date(filters.createdBefore);

    return matchesSearch && matchesStatus && matchesDiagnosis &&
           matchesAgeMin && matchesAgeMax && matchesVisits &&
           matchesCarePlans && matchesAfter && matchesBefore;
  }).sort((a, b) => {
    switch (sortBy) {
      case 'name-asc':
        return (`${a.last_name} ${a.first_name}`).localeCompare(`${b.last_name} ${b.first_name}`);
      case 'name-desc':
        return (`${b.last_name} ${b.first_name}`).localeCompare(`${a.last_name} ${a.first_name}`);
      case 'newest':
        return new Date(b.created_date || 0) - new Date(a.created_date || 0);
      case 'oldest':
        return new Date(a.created_date || 0) - new Date(b.created_date || 0);
      case 'last-visit': {
        const aDate = lastVisitDateByPatientId[a.id] || 0;
        const bDate = lastVisitDateByPatientId[b.id] || 0;
        return new Date(bDate) - new Date(aDate);
      }
      case 'most-visits': {
        const aCount = visitCountByPatientId[a.id] || 0;
        const bCount = visitCountByPatientId[b.id] || 0;
        return bCount - aCount;
      }
      default:
        return 0;
    }
  }), [patients, filters, debouncedSearch, sortBy, visitCountByPatientId, lastVisitDateByPatientId, carePlanCountByPatientId]);

  const togglePatientSelection = (patient) => {
    setSelectedPatients(prev => {
      const isSelected = prev.some(p => p.id === patient.id);
      if (isSelected) {
        return prev.filter(p => p.id !== patient.id);
      } else {
        return [...prev, patient];
      }
    });
  };

  const handleMergeSelected = () => {
    if (selectedPatients.length === 2) {
      setPatientsToMerge({ patient1: selectedPatients[0], patient2: selectedPatients[1] });
      setMergeDialogOpen(true);
    }
  };



  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <PatientsPageHeader
        patientCount={patients.length}
        activeCount={patients.filter(patient => patient.status === 'active').length}
        onAdd={() => {
          setEditingPatient(null);
          setShowForm(true);
        }}
      />

      {showForm && (
        <PatientForm
          patient={editingPatient}
          onSuccess={() => {
            setShowForm(false);
            setEditingPatient(null);
          }}
          onCancel={() => {
            setShowForm(false);
            setEditingPatient(null);
          }}
        />
      )}

      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-lg font-semibold text-slate-900">Roster tools</h2>
            <p className="text-sm text-slate-500">Import census files, review duplicates, and refine the active patient list.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.3fr)_minmax(340px,0.9fr)] gap-4 mb-4">
          <PatientFileUpdateUploader />
          <DuplicatePatientManager />
        </div>

        <AdvancedPatientFilters
          onFilterChange={setFilters}
          activeFilters={filters}
        />
      </div>

      {/* Sort & Results Count */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm text-slate-500">
          {filteredPatients.length} {filteredPatients.length === 1 ? 'patient' : 'patients'}
          {filters.search && ` matching "${filters.search}"`}
        </p>
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" />
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px] h-8 text-xs">
              <SelectValue placeholder="Sort by..." />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Newest First</SelectItem>
              <SelectItem value="oldest">Oldest First</SelectItem>
              <SelectItem value="name-asc">Name A-Z</SelectItem>
              <SelectItem value="name-desc">Name Z-A</SelectItem>
              <SelectItem value="last-visit">Last Visit</SelectItem>
              <SelectItem value="most-visits">Most Visits</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedPatients.length > 0 && (
        <div className="mb-3 sm:mb-4">
          <BulkPatientActions
            selectedPatients={selectedPatients}
            onClearSelection={() => setSelectedPatients([])}
          />
          {selectedPatients.length === 2 && (
            <Button
              onClick={handleMergeSelected}
              className="mt-2 bg-purple-600 hover:bg-purple-700 w-full sm:w-auto min-h-[44px]"
            >
              Merge Selected Patients
            </Button>
          )}
        </div>
      )}

      {/* Mobile Optimized List */}
      <div className="lg:hidden space-y-3 mb-20">
        {isLoading ? (
          <>
            <PatientCardSkeleton />
            <PatientCardSkeleton />
            <PatientCardSkeleton />
          </>
        ) : filteredPatients.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="p-8 text-center">
              <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No patients found</h3>
              <p className="text-slate-500 mb-6">
                {filters.search ? 'No patients match your search.' : 'Start by adding your first patient.'}
              </p>
              {!filters.search && (
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 min-h-[44px]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Patient
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          filteredPatients.map((patient) => (
            <SwipeablePatientCard
              key={patient.id}
              patient={patient}
              isSelected={selectedPatients.some(p => p.id === patient.id)}
              onToggleSelect={togglePatientSelection}
              onEdit={(p) => {
                setEditingPatient(p);
                setShowForm(true);
              }}
              onDelete={(p) => {
                setPatientToDelete(p);
                setDeleteDialogOpen(true);
              }}
            />
          ))
        )}
      </div>

      {/* Desktop Grid View */}
      <div className="hidden lg:grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
        {isLoading ? (
          <>
            <PatientCardSkeleton />
            <PatientCardSkeleton />
            <PatientCardSkeleton />
            <PatientCardSkeleton />
          </>
        ) : filteredPatients.length === 0 ? (
          <Card className="md:col-span-2 border-2 border-dashed">
            <CardContent className="p-8 sm:p-12 text-center">
              <User className="w-16 h-16 text-slate-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-slate-900 mb-2">No patients found</h3>
              <p className="text-slate-500 mb-6">
                {filters.search ? 'No patients match your search.' : 'Start by adding your first patient.'}
              </p>
              {!filters.search && (
                <Button
                  onClick={() => setShowForm(true)}
                  className="bg-blue-600 hover:bg-blue-700 min-h-[44px]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Add Your First Patient
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="md:col-span-2">
            <PaginatedPatientList
              patients={filteredPatients}
              showCheckboxes={true}
              showSearch={false}
              selectedPatients={selectedPatients.map(p => p.id)}
              onSelectionChange={(ids) => {
                const selected = filteredPatients.filter(p => ids.includes(p.id));
                setSelectedPatients(selected);
              }}
              onPatientSelect={(patientId) => {
                const patient = patients.find(p => p.id === patientId);
                if (patient) {
                  setEditingPatient(patient);
                  setShowForm(true);
                }
              }}
            />
          </div>
        )}
      </div>



      {/* Patient Merge Dialog */}
      <PatientMergeDialog
        open={mergeDialogOpen}
        onOpenChange={(open) => {
          setMergeDialogOpen(open);
          if (!open) {
            setSelectedPatients([]);
          }
        }}
        patient1={patientsToMerge.patient1}
        patient2={patientsToMerge.patient2}
      />



      {/* Patient Summary Dialog */}
                  <Dialog open={showSummaryDialog} onOpenChange={setShowSummaryDialog}>
                    <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
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

                  {/* Delete Confirmation Dialog */}
                  <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete Patient</AlertDialogTitle>
                        <AlertDialogDescription>
                          Are you sure you want to delete {patientToDelete?.first_name} {patientToDelete?.last_name}? 
                          This action cannot be undone and will remove all associated data.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                          onClick={handleDeletePatient}
                          disabled={isDeleting}
                          className="bg-red-600 hover:bg-red-700"
                        >
                          {isDeleting ? "Deleting..." : "Delete"}
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              );
            }
import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  UserX,
  Search
} from "lucide-react";
import {
  buildVisitsByPatient,
  findDuplicateGroups,
} from "@/components/patient/patientDuplicateUtils";
import PageContainer from "@/components/ui/PageContainer";
import PageHeader from "@/components/ui/PageHeader";

export default function DuplicatePatients() {
  const [isScanning, setIsScanning] = useState(false);
  const [hasScanned, setHasScanned] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const queryClient = useQueryClient();

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['all-patients-duplicate-scan'],
    queryFn: () => base44.entities.Patient.list('-created_date', 10000)
  });

  const { data: allVisits = [] } = useQuery({
    queryKey: ['all-visits-duplicate-analysis'],
    queryFn: () => base44.entities.Visit.list('-created_date', 5000),
    enabled: patients.length > 0
  });

  const mergePatientMutation = useMutation({
    mutationFn: async ({ _keepId, mergeIds }) => {
      for (const mergeId of mergeIds) {
        await base44.entities.Patient.update(mergeId, { status: 'discharged' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-patients-duplicate-scan'] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    }
  });

  const scanForDuplicates = async () => {
    setIsScanning(true);
    setDuplicateGroups([]);
    // Yield to the event loop so the "Scanning..." state actually paints
    // before the (potentially heavy) synchronous matching work runs.
    await new Promise((resolve) => setTimeout(resolve, 0));

    // Pre-index visits by patient once (O(V)) instead of filtering per pair.
    const visitsByPatient = buildVisitsByPatient(allVisits);
    const groups = findDuplicateGroups(patients, { visitsByPatient });

    setDuplicateGroups(groups);
    setHasScanned(true);
    setIsScanning(false);
  };

  const handleMerge = async (keepPatient, mergePatients) => {
    if (!confirm(`Are you sure you want to close ${mergePatients.length} duplicate patient(s) and keep "${keepPatient.first_name} ${keepPatient.last_name}"?`)) {
      return;
    }

    await mergePatientMutation.mutateAsync({
      keepId: keepPatient.id,
      mergeIds: mergePatients.map(p => p.patient.id)
    });

    setDuplicateGroups(prev => prev.filter(g => g.primary.id !== keepPatient.id));
  };

  const handleClosePrimary = async (group) => {
    if (!confirm(`Are you sure you want to close "${group.primary.first_name} ${group.primary.last_name}"?`)) {
      return;
    }

    await base44.entities.Patient.update(group.primary.id, { status: 'discharged' });
    setDuplicateGroups(prev => prev.filter(g => g.primary.id !== group.primary.id));
    queryClient.invalidateQueries({ queryKey: ['all-patients-duplicate-scan'] });
  };

  const handleCloseSpecific = async (groupPrimary, duplicatePatient) => {
    if (!confirm(`Are you sure you want to close "${duplicatePatient.patient.first_name} ${duplicatePatient.patient.last_name}"?`)) {
      return;
    }

    await base44.entities.Patient.update(duplicatePatient.patient.id, { status: 'discharged' });
    
    setDuplicateGroups(prev => prev.map(g => {
      if (g.primary.id === groupPrimary.id) {
        return {
          ...g,
          duplicates: g.duplicates.filter(d => d.patient.id !== duplicatePatient.patient.id)
        };
      }
      return g;
    }).filter(g => g.duplicates.length > 0));
    
    queryClient.invalidateQueries({ queryKey: ['all-patients-duplicate-scan'] });
  };

  if (isLoading) {
    return (
      <div className="p-6 max-w-7xl mx-auto">
        <Card>
          <CardContent className="p-8 text-center">
            <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
            <p className="text-sm text-slate-600">Loading patients...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHeader
        icon={Users}
        eyebrow="Patient Care"
        title="Duplicate Patients"
        description="Scan the database for potential duplicate patient records"
        favoritePage="DuplicatePatients"
      />

      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="w-5 h-5" />
            Scan for Duplicates
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-slate-600 mb-1">
                Total patients in database: <strong>{patients.length}</strong>
              </p>
              {duplicateGroups.length > 0 && (
                <p className="text-sm text-orange-600 font-medium">
                  Found {duplicateGroups.length} duplicate group(s)
                </p>
              )}
            </div>
            <Button
              onClick={scanForDuplicates}
              disabled={isScanning}
              className="bg-orange-600 hover:bg-orange-700"
            >
              {isScanning ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Scanning...
                </>
              ) : (
                <>
                  <Search className="w-4 h-4 mr-2" />
                  Scan for Duplicates
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>

      {hasScanned && duplicateGroups.length === 0 && !isScanning && (
        <Card className="border-emerald-200 bg-emerald-50">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-emerald-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-emerald-900 mb-2">No Duplicates Found</h3>
            <p className="text-sm text-emerald-700">
              The database is clean. No duplicate patient records detected.
            </p>
          </CardContent>
        </Card>
      )}

      {duplicateGroups.length > 0 && (
        <div className="space-y-6">
          <Alert className="bg-orange-50 border-orange-200">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <AlertDescription className="text-orange-900">
              <strong>{duplicateGroups.length} potential duplicate group(s) found.</strong> Review each group and choose to keep one patient or close specific duplicates.
            </AlertDescription>
          </Alert>

          {duplicateGroups.map((group, idx) => (
            <Card key={idx} className="border-2 border-orange-300">
              <CardHeader className="bg-orange-50">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="w-5 h-5 text-orange-600" />
                  Duplicate Group {idx + 1}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                {/* Primary Patient */}
                <Card className="mb-4 border-2 border-blue-300 bg-blue-50">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <Badge className="bg-blue-600 mb-2">Primary Record</Badge>
                        <h4 className="font-bold text-lg text-slate-900">
                          {group.primary.first_name} {group.primary.last_name}
                        </h4>
                        <div className="text-sm text-slate-600 mt-1 space-y-1">
                          <p>DOB: {group.primary.date_of_birth || 'N/A'}</p>
                          <p>MRN: {group.primary.medical_record_number || 'N/A'}</p>
                          <p>Phone: {group.primary.phone || 'N/A'}</p>
                          <p>Diagnosis: {group.primary.primary_diagnosis || 'N/A'}</p>
                        </div>
                      </div>
                      <Badge className={
                        group.primary.status === 'active' ? 'bg-emerald-600' :
                        group.primary.status === 'discharged' ? 'bg-slate-600' :
                        'bg-orange-600'
                      }>
                        {group.primary.status || 'unknown'}
                      </Badge>
                    </div>
                    <div className="flex gap-2 mt-3">
                      <Button
                        size="sm"
                        onClick={() => handleMerge(group.primary, group.duplicates)}
                        disabled={mergePatientMutation.isPending}
                        className="bg-emerald-600 hover:bg-emerald-700"
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Keep This & Close Others
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleClosePrimary(group)}
                        disabled={mergePatientMutation.isPending}
                        className="text-red-600 border-red-300 hover:bg-red-50"
                      >
                        <UserX className="w-4 h-4 mr-2" />
                        Close This Record
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Duplicate Patients */}
                <div className="space-y-3">
                  <h4 className="font-semibold text-sm text-slate-700">
                    Possible Duplicates ({group.duplicates.length}):
                  </h4>
                  {group.duplicates.map((dup, dupIdx) => (
                    <Card key={dupIdx} className="bg-slate-50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="font-semibold text-slate-900">
                              {dup.patient.first_name} {dup.patient.last_name}
                            </h5>
                            <div className="text-sm text-slate-600 mt-1 space-y-1">
                              <p>DOB: {dup.patient.date_of_birth || 'N/A'}</p>
                              <p>MRN: {dup.patient.medical_record_number || 'N/A'}</p>
                              <p>Phone: {dup.patient.phone || 'N/A'}</p>
                              <p>Diagnosis: {dup.patient.primary_diagnosis || 'N/A'}</p>
                            </div>
                            <div className="flex gap-1 mt-2 flex-wrap">
                              <Badge className={
                                dup.confidenceLevel === 'high' ? 'bg-red-100 text-red-800' :
                                dup.confidenceLevel === 'medium' ? 'bg-orange-100 text-orange-800' :
                                'bg-amber-100 text-amber-800'
                              }>
                                {dup.confidencePercent}% • {dup.confidenceLevel} confidence
                              </Badge>
                              {dup.matches.slice(0, 4).map((match, mIdx) => (
                                <Badge key={mIdx} variant="outline" className="text-xs">
                                  {match}
                                </Badge>
                              ))}
                              {dup.matches.length > 4 && (
                                <Badge variant="outline" className="text-xs text-slate-500">
                                  +{dup.matches.length - 4} more
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 ml-4">
                            <Badge className={
                              dup.patient.status === 'active' ? 'bg-emerald-600' :
                              dup.patient.status === 'discharged' ? 'bg-slate-600' :
                              'bg-orange-600'
                            }>
                              {dup.patient.status || 'unknown'}
                            </Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleCloseSpecific(group.primary, dup)}
                              disabled={mergePatientMutation.isPending}
                              className="text-red-600 border-red-300 hover:bg-red-50"
                            >
                              <UserX className="w-3 h-3 mr-1" />
                              Close
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
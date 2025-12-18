import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  UserX,
  RefreshCw,
  Search
} from "lucide-react";

const calculateMatchScore = (p1, p2) => {
  let score = 0;
  let matches = [];

  const name1 = `${p1.first_name} ${p1.last_name}`.toLowerCase().trim();
  const name2 = `${p2.first_name} ${p2.last_name}`.toLowerCase().trim();

  if (name1 === name2) {
    score += 40;
    matches.push('Exact name match');
  } else if (
    p1.first_name?.toLowerCase() === p2.first_name?.toLowerCase() ||
    p1.last_name?.toLowerCase() === p2.last_name?.toLowerCase()
  ) {
    score += 20;
    matches.push('Partial name match');
  }

  if (p1.date_of_birth && p2.date_of_birth && p1.date_of_birth === p2.date_of_birth) {
    score += 30;
    matches.push('DOB match');
  }

  if (p1.medical_record_number && p2.medical_record_number && 
      p1.medical_record_number === p2.medical_record_number) {
    score += 30;
    matches.push('MRN match');
  }

  if (p1.phone && p2.phone && p1.phone === p2.phone) {
    score += 10;
    matches.push('Phone match');
  }

  return { score, matches };
};

export default function DuplicatePatients() {
  const [isScanning, setIsScanning] = useState(false);
  const [duplicateGroups, setDuplicateGroups] = useState([]);
  const queryClient = useQueryClient();

  const { data: patients = [], isLoading } = useQuery({
    queryKey: ['all-patients-duplicate-scan'],
    queryFn: () => base44.entities.Patient.list('-created_date', 10000)
  });

  const mergePatientMutation = useMutation({
    mutationFn: async ({ keepId, mergeIds }) => {
      for (const mergeId of mergeIds) {
        await base44.entities.Patient.update(mergeId, { status: 'discharged' });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-patients-duplicate-scan'] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    }
  });

  const scanForDuplicates = () => {
    setIsScanning(true);
    const groups = [];
    const processed = new Set();

    patients.forEach((patient, idx) => {
      if (processed.has(patient.id)) return;

      const duplicates = [];
      
      patients.forEach((other, otherIdx) => {
        if (idx === otherIdx || processed.has(other.id)) return;
        
        const { score, matches } = calculateMatchScore(patient, other);
        
        if (score >= 40) {
          duplicates.push({ patient: other, score, matches });
          processed.add(other.id);
        }
      });

      if (duplicates.length > 0) {
        groups.push({
          primary: patient,
          duplicates: duplicates.sort((a, b) => b.score - a.score)
        });
        processed.add(patient.id);
      }
    });

    setDuplicateGroups(groups);
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
            <p className="text-sm text-gray-600">Loading patients...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-8 h-8 text-orange-600" />
          <h1 className="text-3xl font-bold text-gray-900">Duplicate Patients</h1>
        </div>
        <p className="text-gray-600">
          Scan the database for potential duplicate patient records
        </p>
      </div>

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
              <p className="text-sm text-gray-600 mb-1">
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

      {duplicateGroups.length === 0 && !isScanning && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto mb-3" />
            <h3 className="text-lg font-semibold text-green-900 mb-2">No Duplicates Found</h3>
            <p className="text-sm text-green-700">
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
                        <h4 className="font-bold text-lg text-gray-900">
                          {group.primary.first_name} {group.primary.last_name}
                        </h4>
                        <div className="text-sm text-gray-600 mt-1 space-y-1">
                          <p>DOB: {group.primary.date_of_birth || 'N/A'}</p>
                          <p>MRN: {group.primary.medical_record_number || 'N/A'}</p>
                          <p>Phone: {group.primary.phone || 'N/A'}</p>
                          <p>Diagnosis: {group.primary.primary_diagnosis || 'N/A'}</p>
                        </div>
                      </div>
                      <Badge className={
                        group.primary.status === 'active' ? 'bg-green-600' :
                        group.primary.status === 'discharged' ? 'bg-gray-600' :
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
                        className="bg-green-600 hover:bg-green-700"
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
                  <h4 className="font-semibold text-sm text-gray-700">
                    Possible Duplicates ({group.duplicates.length}):
                  </h4>
                  {group.duplicates.map((dup, dupIdx) => (
                    <Card key={dupIdx} className="bg-gray-50">
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h5 className="font-semibold text-gray-900">
                              {dup.patient.first_name} {dup.patient.last_name}
                            </h5>
                            <div className="text-sm text-gray-600 mt-1 space-y-1">
                              <p>DOB: {dup.patient.date_of_birth || 'N/A'}</p>
                              <p>MRN: {dup.patient.medical_record_number || 'N/A'}</p>
                              <p>Phone: {dup.patient.phone || 'N/A'}</p>
                              <p>Diagnosis: {dup.patient.primary_diagnosis || 'N/A'}</p>
                            </div>
                            <div className="flex gap-1 mt-2">
                              {dup.matches.map((match, mIdx) => (
                                <Badge key={mIdx} className="bg-orange-100 text-orange-800 text-xs">
                                  {match}
                                </Badge>
                              ))}
                              <Badge className="bg-blue-100 text-blue-800 text-xs">
                                {dup.score}% match
                              </Badge>
                            </div>
                          </div>
                          <div className="flex flex-col gap-2 ml-4">
                            <Badge className={
                              dup.patient.status === 'active' ? 'bg-green-600' :
                              dup.patient.status === 'discharged' ? 'bg-gray-600' :
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
    </div>
  );
}
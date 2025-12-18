import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Users, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  UserPlus,
  UserCheck,
  UserX,
  Loader2 
} from "lucide-react";

// Duplicate matching logic
const calculateMatchScore = (patient, existingPatient) => {
  let score = 0;
  let matches = [];

  // Name match (first + last)
  const patientFullName = `${patient.first_name} ${patient.last_name}`.toLowerCase().trim();
  const existingFullName = `${existingPatient.first_name} ${existingPatient.last_name}`.toLowerCase().trim();
  
  if (patientFullName === existingFullName) {
    score += 40;
    matches.push('Name match');
  } else if (
    patient.first_name?.toLowerCase() === existingPatient.first_name?.toLowerCase() ||
    patient.last_name?.toLowerCase() === existingPatient.last_name?.toLowerCase()
  ) {
    score += 20;
    matches.push('Partial name match');
  }

  // Date of birth match
  if (patient.date_of_birth && existingPatient.date_of_birth) {
    if (patient.date_of_birth === existingPatient.date_of_birth) {
      score += 30;
      matches.push('DOB match');
    }
  }

  // Medical record number match
  if (patient.medical_record_number && existingPatient.medical_record_number) {
    if (patient.medical_record_number === existingPatient.medical_record_number) {
      score += 30;
      matches.push('MRN match');
    }
  }

  return { score, matches };
};

const findDuplicates = (patient, existingPatients) => {
  const potentialDuplicates = [];

  existingPatients.forEach(existing => {
    const { score, matches } = calculateMatchScore(patient, existing);
    
    if (score >= 40) { // Threshold for considering as duplicate
      potentialDuplicates.push({
        patient: existing,
        score,
        matches
      });
    }
  });

  return potentialDuplicates.sort((a, b) => b.score - a.score);
};

export default function DuplicateDetector({ patients, onResolve }) {
  const [resolution, setResolution] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: existingPatients = [], isLoading } = useQuery({
    queryKey: ['all-patients-duplicate-check'],
    queryFn: () => base44.entities.Patient.list('-created_date', 10000)
  });

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Loader2 className="w-8 h-8 animate-spin text-blue-600 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Checking for duplicate patients...</p>
        </CardContent>
      </Card>
    );
  }

  // Find duplicates for each patient
  const duplicateAnalysis = patients.map((patient, idx) => {
    const duplicates = findDuplicates(patient, existingPatients);
    return {
      index: idx,
      patient,
      duplicates,
      resolution: resolution[idx] || null
    };
  });

  const patientsWithDuplicates = duplicateAnalysis.filter(p => p.duplicates.length > 0);
  const patientsWithoutDuplicates = duplicateAnalysis.filter(p => p.duplicates.length === 0);

  const handleSetResolution = (index, action, existingPatientId = null) => {
    setResolution(prev => ({
      ...prev,
      [index]: { action, existingPatientId }
    }));
  };

  const handleApplyResolutions = async () => {
    setIsProcessing(true);
    
    const results = {
      added: [],
      updated: [],
      closed: [],
      skipped: []
    };

    for (const analysis of duplicateAnalysis) {
      const res = resolution[analysis.index];
      
      if (!res) {
        // No resolution set - default to add if no duplicates
        if (analysis.duplicates.length === 0) {
          results.added.push(analysis.patient);
        } else {
          results.skipped.push(analysis.patient);
        }
        continue;
      }

      switch (res.action) {
        case 'add':
          results.added.push(analysis.patient);
          break;
        case 'update':
          results.updated.push({
            id: res.existingPatientId,
            data: analysis.patient
          });
          break;
        case 'close':
          results.closed.push(res.existingPatientId);
          break;
        case 'skip':
          results.skipped.push(analysis.patient);
          break;
      }
    }

    onResolve(results);
    setIsProcessing(false);
  };

  const allResolved = duplicateAnalysis.every(p => 
    resolution[p.index] || p.duplicates.length === 0
  );

  return (
    <div className="space-y-4">
      <Card className="border-2 border-orange-300">
        <CardHeader className="bg-orange-50">
          <CardTitle className="flex items-center gap-2 text-orange-900">
            <AlertCircle className="w-6 h-6" />
            Duplicate Detection Results
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4 mb-6">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <p className="text-sm text-green-700 mb-1">No Duplicates Found</p>
              <p className="text-2xl font-bold text-green-900">{patientsWithoutDuplicates.length}</p>
            </div>
            <div className="p-4 bg-orange-50 rounded-lg border border-orange-200">
              <p className="text-sm text-orange-700 mb-1">Possible Duplicates</p>
              <p className="text-2xl font-bold text-orange-900">{patientsWithDuplicates.length}</p>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <p className="text-sm text-blue-700 mb-1">Resolved</p>
              <p className="text-2xl font-bold text-blue-900">
                {Object.keys(resolution).length + patientsWithoutDuplicates.length}
              </p>
            </div>
          </div>

          {patientsWithoutDuplicates.length > 0 && (
            <Alert className="bg-green-50 border-green-200 mb-4">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-900">
                {patientsWithoutDuplicates.length} patient(s) have no duplicates and will be added automatically.
              </AlertDescription>
            </Alert>
          )}

          {patientsWithDuplicates.length > 0 && (
            <>
              <Alert className="bg-orange-50 border-orange-200 mb-4">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                <AlertDescription className="text-orange-900">
                  {patientsWithDuplicates.length} patient(s) have potential duplicates. Review each one and choose an action.
                </AlertDescription>
              </Alert>

              <ScrollArea className="h-96">
                <div className="space-y-4 pr-4">
                  {patientsWithDuplicates.map(({ index, patient, duplicates }) => (
                    <Card key={index} className="border-2 border-orange-200">
                      <CardContent className="p-4">
                        <div className="mb-3">
                          <h4 className="font-semibold text-gray-900 mb-1">
                            Import Row {index + 1}: {patient.first_name} {patient.last_name}
                          </h4>
                          <div className="text-sm text-gray-600">
                            DOB: {patient.date_of_birth || 'N/A'} | MRN: {patient.medical_record_number || 'N/A'}
                          </div>
                        </div>

                        <div className="space-y-3">
                          <p className="text-sm font-medium text-orange-900">
                            {duplicates.length} potential duplicate(s) found:
                          </p>
                          
                          {duplicates.map((dup, dupIdx) => (
                            <Card key={dupIdx} className="bg-gray-50">
                              <CardContent className="p-3">
                                <div className="flex items-start justify-between mb-2">
                                  <div>
                                    <p className="font-medium text-gray-900">
                                      {dup.patient.first_name} {dup.patient.last_name}
                                    </p>
                                    <p className="text-xs text-gray-600">
                                      DOB: {dup.patient.date_of_birth || 'N/A'} | MRN: {dup.patient.medical_record_number || 'N/A'}
                                    </p>
                                    <div className="flex gap-1 mt-1">
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
                                  <Badge variant="outline" className={
                                    dup.patient.status === 'active' ? 'bg-green-100 text-green-800' :
                                    dup.patient.status === 'discharged' ? 'bg-gray-100 text-gray-800' :
                                    'bg-orange-100 text-orange-800'
                                  }>
                                    {dup.patient.status || 'unknown'}
                                  </Badge>
                                </div>

                                <div className="grid grid-cols-3 gap-2 mt-3">
                                  <Button
                                    size="sm"
                                    variant={resolution[index]?.action === 'update' && resolution[index]?.existingPatientId === dup.patient.id ? 'default' : 'outline'}
                                    onClick={() => handleSetResolution(index, 'update', dup.patient.id)}
                                    className="text-xs"
                                  >
                                    <RefreshCw className="w-3 h-3 mr-1" />
                                    Update
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={resolution[index]?.action === 'close' && resolution[index]?.existingPatientId === dup.patient.id ? 'default' : 'outline'}
                                    onClick={() => handleSetResolution(index, 'close', dup.patient.id)}
                                    className="text-xs"
                                  >
                                    <UserX className="w-3 h-3 mr-1" />
                                    Close
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant={resolution[index]?.action === 'skip' ? 'default' : 'outline'}
                                    onClick={() => handleSetResolution(index, 'skip')}
                                    className="text-xs"
                                  >
                                    Skip
                                  </Button>
                                </div>
                              </CardContent>
                            </Card>
                          ))}

                          <div className="pt-2 border-t">
                            <Button
                              size="sm"
                              variant={resolution[index]?.action === 'add' ? 'default' : 'outline'}
                              onClick={() => handleSetResolution(index, 'add')}
                              className="w-full bg-green-600 hover:bg-green-700 text-white"
                            >
                              <UserPlus className="w-4 h-4 mr-2" />
                              Add as New Patient (Ignore Duplicates)
                            </Button>
                          </div>

                          {resolution[index] && (
                            <Alert className="bg-blue-50 border-blue-200">
                              <CheckCircle2 className="w-4 h-4 text-blue-600" />
                              <AlertDescription className="text-sm text-blue-900">
                                <strong>Action selected:</strong>{' '}
                                {resolution[index].action === 'add' && 'Add as new patient'}
                                {resolution[index].action === 'update' && 'Update existing patient'}
                                {resolution[index].action === 'close' && 'Close existing patient'}
                                {resolution[index].action === 'skip' && 'Skip this row'}
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>
            </>
          )}

          <div className="mt-6 pt-4 border-t">
            <Button
              onClick={handleApplyResolutions}
              disabled={!allResolved || isProcessing}
              className="w-full bg-blue-600 hover:bg-blue-700"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  <UserCheck className="w-4 h-4 mr-2" />
                  Apply Resolutions & Continue Import
                </>
              )}
            </Button>
            {!allResolved && (
              <p className="text-sm text-orange-600 text-center mt-2">
                Please resolve all duplicates before continuing
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
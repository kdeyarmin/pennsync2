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
  Loader2,
  ArrowRight,
  AlertTriangle
} from "lucide-react";

// Duplicate matching logic
const calculateMatchScore = (patient, existingPatient) => {
  let score = 0;
  let matches = [];

  // Normalize strings
  const normalize = (str) => str?.toLowerCase().trim().replace(/\s+/g, ' ') || '';
  
  // Name match (first + last)
  const patientFullName = normalize(`${patient.first_name} ${patient.last_name}`);
  const existingFullName = normalize(`${existingPatient.first_name} ${existingPatient.last_name}`);
  
  if (patientFullName === existingFullName && patientFullName !== '') {
    score += 40;
    matches.push('Full name match');
  } else if (
    normalize(patient.first_name) === normalize(existingPatient.first_name) &&
    normalize(patient.last_name) === normalize(existingPatient.last_name) &&
    normalize(patient.first_name) !== '' &&
    normalize(patient.last_name) !== ''
  ) {
    score += 40;
    matches.push('First & Last name match');
  } else if (
    normalize(patient.first_name) === normalize(existingPatient.first_name) &&
    normalize(patient.first_name) !== ''
  ) {
    score += 15;
    matches.push('First name match');
  } else if (
    normalize(patient.last_name) === normalize(existingPatient.last_name) &&
    normalize(patient.last_name) !== ''
  ) {
    score += 15;
    matches.push('Last name match');
  }

  // Date of birth match
  if (patient.date_of_birth && existingPatient.date_of_birth) {
    const normalizeDOB = (dob) => dob.replace(/\D/g, '');
    if (normalizeDOB(patient.date_of_birth) === normalizeDOB(existingPatient.date_of_birth)) {
      score += 35;
      matches.push('DOB match');
    }
  }

  // Medical record number match (exact or very similar)
  if (patient.medical_record_number && existingPatient.medical_record_number) {
    const normalizeMRN = (mrn) => String(mrn).trim().replace(/\s+/g, '');
    const patientMRN = normalizeMRN(patient.medical_record_number);
    const existingMRN = normalizeMRN(existingPatient.medical_record_number);
    
    if (patientMRN === existingMRN) {
      score += 40;
      matches.push('MRN exact match');
    }
  }

  // Phone match (if both have phone numbers)
  if (patient.phone && existingPatient.phone) {
    const normalizePhone = (phone) => String(phone).replace(/\D/g, '');
    const patientPhone = normalizePhone(patient.phone);
    const existingPhone = normalizePhone(existingPatient.phone);
    
    if (patientPhone === existingPhone && patientPhone.length >= 10) {
      score += 15;
      matches.push('Phone match');
    }
  }

  // Address similarity (partial match)
  if (patient.address && existingPatient.address) {
    const patientAddr = normalize(patient.address);
    const existingAddr = normalize(existingPatient.address);
    
    if (patientAddr === existingAddr) {
      score += 10;
      matches.push('Address match');
    } else if (patientAddr.includes(existingAddr) || existingAddr.includes(patientAddr)) {
      score += 5;
      matches.push('Partial address match');
    }
  }

  return { score, matches };
};

const findDuplicates = (patient, existingPatients) => {
  const potentialDuplicates = [];

  existingPatients.forEach(existing => {
    const { score, matches } = calculateMatchScore(patient, existing);
    
    // Lower threshold to catch more potential duplicates - let user decide
    if (score >= 30) {
      potentialDuplicates.push({
        patient: existing,
        score,
        matches
      });
    }
  });

  return potentialDuplicates.sort((a, b) => b.score - a.score);
};

// Compare patient data and identify differences
const comparePatients = (importedPatient, existingPatient) => {
  const differences = [];
  const fields = [
    'first_name', 'last_name', 'middle_name', 'date_of_birth', 
    'medical_record_number', 'phone', 'email', 'address',
    'primary_diagnosis', 'physician_name', 'physician_phone',
    'emergency_contact_name', 'emergency_contact_phone', 'status',
    'care_type', 'admission_date'
  ];

  fields.forEach(field => {
    const importedValue = importedPatient[field];
    const existingValue = existingPatient[field];
    
    // Normalize for comparison
    const normalize = (val) => {
      if (!val) return '';
      return String(val).toLowerCase().trim();
    };
    
    const normalizedImported = normalize(importedValue);
    const normalizedExisting = normalize(existingValue);
    
    if (normalizedImported && normalizedImported !== normalizedExisting) {
      differences.push({
        field,
        importedValue: importedValue || '',
        existingValue: existingValue || 'Not set',
        isNew: !existingValue,
        isUpdate: !!existingValue && normalizedImported !== normalizedExisting
      });
    }
  });
  
  return differences;
};

export default function DuplicateDetector({ patients, onResolve }) {
  const [resolution, setResolution] = useState({});
  const [isProcessing, setIsProcessing] = useState(false);

  const { data: existingPatients = [], isLoading } = useQuery({
    queryKey: ['all-patients-duplicate-check'],
    queryFn: async () => {
      // Fetch all patients including active and discharged to check against all records
      const allPatients = await base44.entities.Patient.list('-created_date', 10000);
      return allPatients;
    }
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

  // Find duplicates for each patient and analyze differences
  const duplicateAnalysis = patients.map((patient, idx) => {
    const duplicates = findDuplicates(patient, existingPatients).map(dup => ({
      ...dup,
      differences: comparePatients(patient, dup.patient)
    }));
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
                        <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <h4 className="font-semibold text-gray-900 mb-2">
                            Import Row {index + 1}: {patient.first_name} {patient.last_name}
                          </h4>
                          <div className="text-sm text-gray-700 space-y-1">
                            <div>DOB: {patient.date_of_birth || 'N/A'} | MRN: {patient.medical_record_number || 'N/A'}</div>
                            {patient.phone && <div>Phone: {patient.phone}</div>}
                            {patient.address && <div>Address: {patient.address}</div>}
                            {patient.primary_diagnosis && <div>Diagnosis: {patient.primary_diagnosis}</div>}
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
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <p className="font-medium text-gray-900">
                                        Existing: {dup.patient.first_name} {dup.patient.last_name}
                                      </p>
                                      <Badge variant="outline" className={
                                        dup.patient.status === 'active' ? 'bg-green-100 text-green-800 text-xs' :
                                        dup.patient.status === 'discharged' ? 'bg-gray-100 text-gray-800 text-xs' :
                                        'bg-orange-100 text-orange-800 text-xs'
                                      }>
                                        {dup.patient.status || 'unknown'}
                                      </Badge>
                                    </div>
                                    <div className="flex gap-1 mt-1 flex-wrap">
                                      {dup.matches.map((match, mIdx) => (
                                        <Badge key={mIdx} className="bg-orange-100 text-orange-800 text-xs">
                                          {match}
                                        </Badge>
                                      ))}
                                      <Badge className={`text-xs ${
                                        dup.score >= 80 ? 'bg-red-100 text-red-800' :
                                        dup.score >= 60 ? 'bg-orange-100 text-orange-800' :
                                        'bg-yellow-100 text-yellow-800'
                                      }`}>
                                        {dup.score}% match
                                      </Badge>
                                      {dup.differences.length > 0 && (
                                        <Badge className="bg-blue-100 text-blue-800 text-xs">
                                          {dup.differences.length} difference{dup.differences.length > 1 ? 's' : ''}
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                {/* Show differences */}
                                {dup.differences.length > 0 ? (
                                  <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200">
                                    <div className="flex items-center gap-2 mb-2">
                                      <AlertTriangle className="w-4 h-4 text-blue-600" />
                                      <p className="text-sm font-semibold text-blue-900">
                                        Fields that would be updated:
                                      </p>
                                    </div>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                      {dup.differences.map((diff, diffIdx) => (
                                        <div key={diffIdx} className="text-xs p-2 bg-blue-50 rounded border border-blue-200">
                                          <div className="font-semibold text-gray-800 mb-1 capitalize">
                                            {diff.field.replace(/_/g, ' ')}
                                          </div>
                                          <div className="flex items-center gap-2">
                                            <span className={`flex-1 ${diff.isNew ? 'text-gray-500 italic' : 'text-red-700'}`}>
                                              Current: {diff.existingValue}
                                            </span>
                                            <ArrowRight className="w-3 h-3 text-blue-600 flex-shrink-0" />
                                            <span className="flex-1 text-green-700 font-medium">
                                              New: {diff.importedValue}
                                            </span>
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                ) : (
                                  <Alert className="mt-3 bg-green-50 border-green-200">
                                    <CheckCircle2 className="w-4 h-4 text-green-600" />
                                    <AlertDescription className="text-xs text-green-900">
                                      All data matches existing record - no updates needed
                                    </AlertDescription>
                                  </Alert>
                                )}

                                <div className="grid grid-cols-3 gap-2 mt-3">
                                  <Button
                                    size="sm"
                                    variant={resolution[index]?.action === 'update' && resolution[index]?.existingPatientId === dup.patient.id ? 'default' : 'outline'}
                                    onClick={() => handleSetResolution(index, 'update', dup.patient.id)}
                                    className="text-xs"
                                    disabled={dup.differences.length === 0}
                                  >
                                    <RefreshCw className="w-3 h-3 mr-1" />
                                    Update{dup.differences.length > 0 && ` (${dup.differences.length})`}
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
                                    Skip Row
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
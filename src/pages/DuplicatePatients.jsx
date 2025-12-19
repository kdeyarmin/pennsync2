import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Users,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  UserX,
  RefreshCw,
  Search
} from "lucide-react";

// Levenshtein distance for fuzzy matching
const levenshteinDistance = (str1, str2) => {
  const matrix = [];
  for (let i = 0; i <= str2.length; i++) matrix[i] = [i];
  for (let j = 0; j <= str1.length; j++) matrix[0][j] = j;
  for (let i = 1; i <= str2.length; i++) {
    for (let j = 1; j <= str1.length; j++) {
      if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(matrix[i - 1][j - 1] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j] + 1);
      }
    }
  }
  return matrix[str2.length][str1.length];
};

const calculateSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 100 : ((maxLength - distance) / maxLength) * 100;
};

// Normalize address for better matching
const normalizeAddress = (address) => {
  if (!address) return '';
  return address.toLowerCase()
    .replace(/\b(street|st|avenue|ave|road|rd|drive|dr|lane|ln|boulevard|blvd|court|ct|circle|cir|place|pl|parkway|pkwy|way)\b/g, '')
    .replace(/\b(apt|apartment|unit|ste|suite|#)\s*\w+/gi, '')
    .replace(/[.,#]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
};

// Extract name variations for better matching
const getNameVariations = (patient) => {
  const variations = new Set();
  const first = patient.first_name?.toLowerCase().trim() || '';
  const middle = patient.middle_name?.toLowerCase().trim() || '';
  const last = patient.last_name?.toLowerCase().trim() || '';
  
  if (first && last) {
    variations.add(`${first} ${last}`);
    if (middle) {
      variations.add(`${first} ${middle} ${last}`);
      variations.add(`${first} ${middle.charAt(0)} ${last}`);
      variations.add(`${first.charAt(0)} ${middle} ${last}`);
    }
    variations.add(`${first.charAt(0)} ${last}`);
    variations.add(`${last} ${first}`);
  }
  
  return Array.from(variations);
};

const calculateMatchScore = (p1, p2) => {
  let score = 0;
  let matches = [];

  const name1 = `${p1.first_name} ${p1.last_name}`.toLowerCase().trim();
  const name2 = `${p2.first_name} ${p2.last_name}`.toLowerCase().trim();
  const firstName1 = p1.first_name?.toLowerCase().trim() || '';
  const firstName2 = p2.first_name?.toLowerCase().trim() || '';
  const lastName1 = p1.last_name?.toLowerCase().trim() || '';
  const lastName2 = p2.last_name?.toLowerCase().trim() || '';

  // Exact full name match
  if (name1 === name2) {
    score += 50;
    matches.push('Exact name match');
  }
  
  // Check exact component matches separately (more important than fuzzy)
  if (firstName1 === firstName2 && lastName1 === lastName2) {
    if (name1 !== name2) { // Don't double-count if we already matched above
      score += 50;
      matches.push('Exact first and last name');
    }
  } else {
    // Fuzzy full name matching
    const fullNameSimilarity = calculateSimilarity(name1, name2);
    if (fullNameSimilarity >= 90) {
      score += 35;
      matches.push('Very similar name');
    } else if (fullNameSimilarity >= 75) {
      score += 28;
      matches.push('Similar name');
    }
    
    // Component matching
    const firstSimilarity = calculateSimilarity(firstName1, firstName2);
    const lastSimilarity = calculateSimilarity(lastName1, lastName2);
    
    if (firstSimilarity >= 85 && lastSimilarity >= 85) {
      score += 30;
      matches.push('Both names similar');
    } else if (firstSimilarity === 100 || lastSimilarity === 100) {
      score += 18;
      matches.push('Partial name match');
    }
  }

  // DOB matching with typo detection
  if (p1.date_of_birth && p2.date_of_birth) {
    const dob1 = p1.date_of_birth.replace(/\D/g, '');
    const dob2 = p2.date_of_birth.replace(/\D/g, '');
    
    if (dob1 === dob2) {
      score += 30;
      matches.push('DOB match');
    } else if (dob1 && dob2) {
      // Check for swapped month/day
      if (dob1.substring(0, 4) === dob2.substring(0, 4)) {
        const similarity = calculateSimilarity(dob1, dob2);
        if (similarity >= 75) {
          score += 20;
          matches.push('DOB similar (typo)');
        }
      }
    }
  }

  // MRN matching
  if (p1.medical_record_number && p2.medical_record_number) {
    const mrn1 = p1.medical_record_number.toString().trim();
    const mrn2 = p2.medical_record_number.toString().trim();
    
    if (mrn1 === mrn2) {
      score += 30;
      matches.push('MRN match');
    } else {
      const mrnSim = calculateSimilarity(mrn1, mrn2);
      if (mrnSim >= 85) {
        score += 22;
        matches.push('MRN similar');
      }
    }
  }

  // Phone matching
  if (p1.phone && p2.phone) {
    const phone1 = p1.phone.replace(/\D/g, '');
    const phone2 = p2.phone.replace(/\D/g, '');
    if (phone1 === phone2 && phone1.length >= 10) {
      score += 10;
      matches.push('Phone match');
    } else if (phone1.slice(-4) === phone2.slice(-4) && phone1.length >= 10) {
      score += 5;
      matches.push('Phone last 4 match');
    }
  }

  // Enhanced address matching with normalization
  if (p1.address && p2.address) {
    const addr1 = p1.address.toLowerCase().trim();
    const addr2 = p2.address.toLowerCase().trim();
    const addrSim = calculateSimilarity(addr1, addr2);
    
    // Try normalized addresses
    const normalizedAddr1 = normalizeAddress(p1.address);
    const normalizedAddr2 = normalizeAddress(p2.address);
    const normalizedSim = calculateSimilarity(normalizedAddr1, normalizedAddr2);
    
    const bestSim = Math.max(addrSim, normalizedSim);
    
    if (bestSim >= 90) {
      score += 12;
      matches.push('Address match');
    } else if (bestSim >= 75) {
      score += 8;
      matches.push('Address similar');
    } else if (bestSim >= 60) {
      score += 4;
      matches.push('Address partial match');
    }
  }

  // Middle name handling
  if (p1.middle_name && p2.middle_name) {
    const middle1 = p1.middle_name.toLowerCase().trim();
    const middle2 = p2.middle_name.toLowerCase().trim();
    if (middle1 === middle2 || middle1.charAt(0) === middle2.charAt(0)) {
      score += 5;
      matches.push('Middle name/initial match');
    }
  }

  // Name variation cross-check
  const variations1 = getNameVariations(p1);
  const variations2 = getNameVariations(p2);
  for (const v1 of variations1) {
    for (const v2 of variations2) {
      const varSim = calculateSimilarity(v1, v2);
      if (varSim >= 95 && !matches.includes('Exact name match')) {
        score += 8;
        matches.push('Name variation match');
        break;
      }
    }
    if (matches.includes('Name variation match')) break;
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

  const { data: allVisits = [] } = useQuery({
    queryKey: ['all-visits-duplicate-analysis'],
    queryFn: () => base44.entities.Visit.list('-created_date', 5000),
    enabled: patients.length > 0
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

  const analyzeRelatedEntities = (p1, p2) => {
    let relatedScore = 0;
    const relatedMatches = [];

    // Check visits
    const p1Visits = allVisits.filter(v => v.patient_id === p1.id);
    const p2Visits = allVisits.filter(v => v.patient_id === p2.id);

    if (p1Visits.length > 0 && p2Visits.length > 0) {
      // Check for similar visit dates
      const p1Dates = p1Visits.map(v => v.visit_date).filter(d => d);
      const p2Dates = p2Visits.map(v => v.visit_date).filter(d => d);
      
      const commonDates = p1Dates.filter(d => p2Dates.includes(d));
      if (commonDates.length > 0) {
        relatedScore += 15;
        relatedMatches.push(`${commonDates.length} matching visit date(s)`);
      }

      // Check same nurse documentation
      const p1Nurses = new Set(p1Visits.map(v => v.created_by).filter(n => n));
      const p2Nurses = new Set(p2Visits.map(v => v.created_by).filter(n => n));
      const commonNurses = [...p1Nurses].filter(n => p2Nurses.has(n));
      
      if (commonNurses.length > 0) {
        relatedScore += 8;
        relatedMatches.push('Same nurse documentation');
      }

      // Check similar diagnoses in notes
      const p1Notes = p1Visits.map(v => v.nurse_notes || '').join(' ').toLowerCase();
      const p2Notes = p2Visits.map(v => v.nurse_notes || '').join(' ').toLowerCase();
      
      if (p1Notes.length > 50 && p2Notes.length > 50) {
        const noteSim = calculateSimilarity(
          p1Notes.substring(0, 500),
          p2Notes.substring(0, 500)
        );
        if (noteSim >= 70) {
          relatedScore += 10;
          relatedMatches.push('Similar clinical notes');
        }
      }
    }

    return { relatedScore, relatedMatches };
  };

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
        const { relatedScore, relatedMatches } = analyzeRelatedEntities(patient, other);
        
        const totalScore = score + relatedScore;
        const allMatches = [...matches, ...relatedMatches];
        
        // Lowered threshold to 25 to catch more potential duplicates
        if (totalScore >= 25) {
          duplicates.push({ patient: other, score: totalScore, matches: allMatches });
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
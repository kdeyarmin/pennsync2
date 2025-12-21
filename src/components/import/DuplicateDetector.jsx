import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
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
  AlertTriangle,
  Settings
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

// Calculate string similarity (0-100)
const calculateSimilarity = (str1, str2) => {
  if (!str1 || !str2) return 0;
  const distance = levenshteinDistance(str1, str2);
  const maxLength = Math.max(str1.length, str2.length);
  return maxLength === 0 ? 100 : ((maxLength - distance) / maxLength) * 100;
};

// Enhanced duplicate matching logic with configurable sensitivity and criteria
const calculateMatchScore = (patient, existingPatient, sensitivity = 'medium', criteria = {}) => {
  let score = 0;
  let matches = [];
  const criteriaMatched = {};

  // Normalize strings
  const normalize = (str) => str?.toLowerCase().trim().replace(/\s+/g, ' ') || '';
  
  // Sensitivity thresholds for fuzzy matching
  const thresholds = {
    strict: { name: 95, address: 90, phone: 100 },
    medium: { name: 85, address: 80, phone: 100 },
    loose: { name: 75, address: 70, phone: 100 }
  };
  
  const threshold = thresholds[sensitivity] || thresholds.medium;
  
  // Apply matching criteria filters
  const enabledCriteria = {
    mrn: criteria.mrn !== false,
    nameAndDob: criteria.nameAndDob !== false,
    phoneAndLastName: criteria.phoneAndLastName !== false,
    emailAndLastName: criteria.emailAndLastName !== false,
    address: criteria.address !== false
  };

  // NAME MATCHING (Multiple strategies)
  const firstName1 = normalize(patient.first_name);
  const firstName2 = normalize(existingPatient.first_name);
  const lastName1 = normalize(patient.last_name);
  const lastName2 = normalize(existingPatient.last_name);
  
  // Exact name match
  if (firstName1 === firstName2 && lastName1 === lastName2 && firstName1 !== '' && lastName1 !== '') {
    score += 40;
    matches.push('✓ Exact name match');
    criteriaMatched.name = true;
  } 
  // Fuzzy name match
  else if (firstName1 && firstName2 && lastName1 && lastName2) {
    const firstNameSim = calculateSimilarity(firstName1, firstName2);
    const lastNameSim = calculateSimilarity(lastName1, lastName2);
    const avgNameSim = (firstNameSim + lastNameSim) / 2;
    
    if (avgNameSim >= threshold.name) {
      const points = Math.round((avgNameSim / 100) * 35);
      score += points;
      matches.push(`Similar name (${Math.round(avgNameSim)}% match)`);
      criteriaMatched.name = true;
    } else if (firstNameSim >= threshold.name || lastNameSim >= threshold.name) {
      score += 15;
      matches.push('Partial name match');
    }
  }

  // DATE OF BIRTH MATCHING
  if (patient.date_of_birth && existingPatient.date_of_birth) {
    const normalizeDOB = (dob) => dob.replace(/\D/g, '');
    const dob1 = normalizeDOB(patient.date_of_birth);
    const dob2 = normalizeDOB(existingPatient.date_of_birth);
    
    if (dob1 === dob2 && dob1.length >= 8) {
      score += 35;
      matches.push('✓ DOB exact match');
      criteriaMatched.dob = true;
    } else {
      // Check for partial DOB match (year + month or year + day)
      if (dob1.length >= 8 && dob2.length >= 8) {
        const year1 = dob1.substring(0, 4);
        const year2 = dob2.substring(0, 4);
        const month1 = dob1.substring(4, 6);
        const month2 = dob2.substring(4, 6);
        const day1 = dob1.substring(6, 8);
        const day2 = dob2.substring(6, 8);
        
        if (year1 === year2 && (month1 === month2 || day1 === day2)) {
          score += 15;
          matches.push('Partial DOB match');
        }
      }
    }
  }

  // MEDICAL RECORD NUMBER MATCHING - PRIORITY CHECK
  if (enabledCriteria.mrn && patient.medical_record_number && existingPatient.medical_record_number) {
    const normalizeMRN = (mrn) => String(mrn).trim().replace(/\s+/g, '').toUpperCase();
    const mrn1 = normalizeMRN(patient.medical_record_number);
    const mrn2 = normalizeMRN(existingPatient.medical_record_number);
    
    if (mrn1 === mrn2) {
      score += 100; // Maximum score for MRN match - definitive match
      matches.push('✓ MRN EXACT MATCH - SAME PATIENT');
      criteriaMatched.mrn = true;
      criteriaMatched.definitive = true; // Flag as definitive match
    } else {
      const mrnSim = calculateSimilarity(mrn1, mrn2);
      if (mrnSim >= 80) {
        score += 20;
        matches.push(`Similar MRN (${Math.round(mrnSim)}%)`);
      }
    }
  }
  
  // NAME + DOB COMBINATION MATCHING
  if (enabledCriteria.nameAndDob && criteriaMatched.name && criteriaMatched.dob) {
    score += 20; // Bonus for matching both name and DOB
    matches.push('✓ Name + DOB Match');
  }
  
  // PHONE + LAST NAME COMBINATION MATCHING
  if (enabledCriteria.phoneAndLastName && criteriaMatched.phone && lastName1 === lastName2) {
    score += 15; // Bonus for phone + last name match
    matches.push('✓ Phone + Last Name Match');
  }
  
  // EMAIL + LAST NAME COMBINATION MATCHING
  if (enabledCriteria.emailAndLastName && criteriaMatched.email && lastName1 === lastName2) {
    score += 15; // Bonus for email + last name match
    matches.push('✓ Email + Last Name Match');
  }

  // PHONE NUMBER MATCHING (Enhanced)
  if (patient.phone && existingPatient.phone) {
    const normalizePhone = (phone) => String(phone).replace(/\D/g, '');
    const phone1 = normalizePhone(patient.phone);
    const phone2 = normalizePhone(existingPatient.phone);
    
    if (phone1 === phone2 && phone1.length >= 10) {
      score += 25;
      matches.push('✓ Phone exact match');
      criteriaMatched.phone = true;
    } else if (phone1.length >= 10 && phone2.length >= 10) {
      // Check last 7 digits (local number)
      if (phone1.slice(-7) === phone2.slice(-7)) {
        score += 15;
        matches.push('Phone number match (local)');
      } else if (phone1.slice(-4) === phone2.slice(-4)) {
        score += 5;
        matches.push('Phone last 4 match');
      }
    }
  }

  // ADDRESS MATCHING (Enhanced with street number extraction)
  if (enabledCriteria.address && patient.address && existingPatient.address) {
    const addr1 = normalize(patient.address);
    const addr2 = normalize(existingPatient.address);
    
    // Extract street numbers
    const streetNum1 = patient.address.match(/^\d+/)?.[0];
    const streetNum2 = existingPatient.address.match(/^\d+/)?.[0];
    
    // Exact address match
    if (addr1 === addr2) {
      score += 20;
      matches.push('✓ Address exact match');
      criteriaMatched.address = true;
    } 
    // Same street number (strong indicator)
    else if (streetNum1 && streetNum1 === streetNum2 && streetNum1.length >= 1) {
      const addrSim = calculateSimilarity(addr1, addr2);
      if (addrSim >= threshold.address) {
        score += 18;
        matches.push('Address match (same street)');
        criteriaMatched.address = true;
      } else if (addrSim >= 60) {
        score += 10;
        matches.push('Partial address match');
      }
    }
    // Fuzzy address match
    else {
      const addrSim = calculateSimilarity(addr1, addr2);
      if (addrSim >= threshold.address) {
        score += 15;
        matches.push(`Similar address (${Math.round(addrSim)}%)`);
        criteriaMatched.address = true;
      } else if (addrSim >= 60) {
        score += 5;
        matches.push('Partial address match');
      }
    }
  }

  // EMAIL MATCHING
  if (patient.email && existingPatient.email) {
    const email1 = normalize(patient.email);
    const email2 = normalize(existingPatient.email);
    
    if (email1 === email2) {
      score += 30;
      matches.push('✓ Email exact match');
      criteriaMatched.email = true;
    }
  }

  // EMERGENCY CONTACT MATCHING
  if (patient.emergency_contact_phone && existingPatient.emergency_contact_phone) {
    const normalizePhone = (phone) => String(phone).replace(/\D/g, '');
    const ePhone1 = normalizePhone(patient.emergency_contact_phone);
    const ePhone2 = normalizePhone(existingPatient.emergency_contact_phone);
    
    if (ePhone1 === ePhone2 && ePhone1.length >= 10) {
      score += 15;
      matches.push('Emergency contact match');
    }
  }

  // Determine confidence level
  let confidenceLevel = 'low';
  const criteriaMet = Object.keys(criteriaMatched).length;
  
  // MRN match is definitive - always very high confidence
  if (criteriaMatched.definitive) {
    confidenceLevel = 'definitive';
  } else if (score >= 90 || criteriaMet >= 3) {
    confidenceLevel = 'very_high';
  } else if (score >= 70 || criteriaMet >= 2) {
    confidenceLevel = 'high';
  } else if (score >= 50) {
    confidenceLevel = 'medium';
  }

  return { score, matches, confidenceLevel, criteriaMatched };
};

const findDuplicates = (patient, existingPatients, sensitivity = 'medium', threshold = null, criteria = {}) => {
  const potentialDuplicates = [];
  
  // Sensitivity-based thresholds
  const defaultThresholds = {
    strict: 60,
    medium: 40,
    loose: 25
  };
  
  const minScore = threshold !== null ? threshold : defaultThresholds[sensitivity] || 40;

  existingPatients.forEach(existing => {
    const { score, matches, confidenceLevel, criteriaMatched } = calculateMatchScore(patient, existing, sensitivity, criteria);
    
    if (score >= minScore) {
      potentialDuplicates.push({
        patient: existing,
        score,
        matches,
        confidenceLevel,
        criteriaMatched,
        criteriaMet: Object.keys(criteriaMatched).length
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
  const [sensitivity, setSensitivity] = useState('medium');
  const [customThreshold, setCustomThreshold] = useState(40);
  const [showSettings, setShowSettings] = useState(false);
  const [matchingCriteria, setMatchingCriteria] = useState({
    mrn: true,
    nameAndDob: true,
    phoneAndLastName: true,
    emailAndLastName: false,
    address: true
  });
  const [autoResolveStrategy, setAutoResolveStrategy] = useState('manual'); // manual, merge, mark_duplicate, ignore

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
    const duplicates = findDuplicates(patient, existingPatients, sensitivity, customThreshold, matchingCriteria).map(dup => ({
      ...dup,
      differences: comparePatients(patient, dup.patient)
    }));
    
    // Auto-set resolution based on strategy
    let autoResolution = resolution[idx] || null;
    if (!autoResolution && duplicates.length > 0 && autoResolveStrategy !== 'manual') {
      const topMatch = duplicates[0];
      
      if (autoResolveStrategy === 'merge' && topMatch.confidenceLevel === 'definitive') {
        autoResolution = { action: 'update', existingPatientId: topMatch.patient.id, auto: true };
      } else if (autoResolveStrategy === 'ignore') {
        autoResolution = { action: 'add', auto: true };
      } else if (autoResolveStrategy === 'mark_duplicate') {
        autoResolution = { action: 'skip', auto: true };
      } else {
        // Default: auto-select for definitive MRN matches with updates
        const definitiveMatch = duplicates.find(d => d.confidenceLevel === 'definitive');
        if (definitiveMatch && definitiveMatch.differences.length > 0) {
          autoResolution = { action: 'update', existingPatientId: definitiveMatch.patient.id, auto: true };
        }
      }
    }
    
    return {
      index: idx,
      patient,
      duplicates,
      resolution: autoResolution
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

    // Batch operations for efficiency and rate limit prevention
    onResolve(results);
    setIsProcessing(false);
  };

  const allResolved = duplicateAnalysis.every(p => 
    resolution[p.index] || p.duplicates.length === 0
  );

  const getConfidenceBadgeColor = (level) => {
    switch (level) {
      case 'definitive':
        return 'bg-purple-100 text-purple-900 border-purple-400';
      case 'very_high':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'high':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default:
        return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  const getConfidenceLabel = (level) => {
    switch (level) {
      case 'definitive':
        return '✓ DEFINITIVE MATCH';
      case 'very_high':
        return 'Very High Confidence';
      case 'high':
        return 'High Confidence';
      case 'medium':
        return 'Medium Confidence';
      default:
        return 'Low Confidence';
    }
  };

  return (
    <div className="space-y-4">
      {/* Sensitivity Configuration */}
      <Card className="border-2 border-blue-300 bg-blue-50">
        <CardHeader 
          className="cursor-pointer hover:bg-blue-100 transition-colors"
          onClick={() => setShowSettings(!showSettings)}
        >
          <CardTitle className="flex items-center justify-between text-blue-900">
            <div className="flex items-center gap-2">
              <Settings className="w-5 h-5" />
              Duplicate Detection Settings
            </div>
            <Badge className="bg-blue-200 text-blue-900">
              {sensitivity.charAt(0).toUpperCase() + sensitivity.slice(1)} Sensitivity
            </Badge>
          </CardTitle>
        </CardHeader>
        {showSettings && (
          <CardContent className="space-y-4">
            <div>
              <Label className="text-sm font-medium mb-2 block">Detection Sensitivity</Label>
              <div className="grid grid-cols-3 gap-2 mb-3">
                <Button
                  variant={sensitivity === 'strict' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setSensitivity('strict'); setCustomThreshold(60); }}
                  className={sensitivity === 'strict' ? 'bg-blue-600' : ''}
                >
                  Strict
                </Button>
                <Button
                  variant={sensitivity === 'medium' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setSensitivity('medium'); setCustomThreshold(40); }}
                  className={sensitivity === 'medium' ? 'bg-blue-600' : ''}
                >
                  Medium
                </Button>
                <Button
                  variant={sensitivity === 'loose' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => { setSensitivity('loose'); setCustomThreshold(25); }}
                  className={sensitivity === 'loose' ? 'bg-blue-600' : ''}
                >
                  Loose
                </Button>
              </div>
              <div className="text-xs text-gray-600 space-y-1 bg-white p-3 rounded-lg border">
               <p><strong>MRN Matching:</strong> Medical Record Number matches are always treated as definitive</p>
               <p><strong>Strict:</strong> Only very close matches (60%+ score) - fewer false positives</p>
               <p><strong>Medium:</strong> Balanced approach (40%+ score) - recommended</p>
               <p><strong>Loose:</strong> Catches more potential duplicates (25%+ score) - may include uncertain matches</p>
              </div>
            </div>

            <div>
              <Label className="text-sm font-medium mb-2 block">
                Custom Threshold: {customThreshold}%
              </Label>
              <Slider
                value={[customThreshold]}
                onValueChange={(value) => setCustomThreshold(value[0])}
                min={20}
                max={80}
                step={5}
                className="mb-2"
              />
              <p className="text-xs text-gray-600">
                Matches scoring {customThreshold}% or higher will be flagged as potential duplicates
              </p>
            </div>

            <div className="border-t pt-4">
              <Label className="text-sm font-medium mb-3 block">Matching Criteria</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={matchingCriteria.mrn}
                    onChange={(e) => setMatchingCriteria({...matchingCriteria, mrn: e.target.checked})}
                    className="rounded"
                  />
                  <span className="text-sm">MRN (Medical Record Number)</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={matchingCriteria.nameAndDob}
                    onChange={(e) => setMatchingCriteria({...matchingCriteria, nameAndDob: e.target.checked})}
                    className="rounded"
                  />
                  <span className="text-sm">Name + Date of Birth</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={matchingCriteria.phoneAndLastName}
                    onChange={(e) => setMatchingCriteria({...matchingCriteria, phoneAndLastName: e.target.checked})}
                    className="rounded"
                  />
                  <span className="text-sm">Phone + Last Name</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={matchingCriteria.emailAndLastName}
                    onChange={(e) => setMatchingCriteria({...matchingCriteria, emailAndLastName: e.target.checked})}
                    className="rounded"
                  />
                  <span className="text-sm">Email + Last Name</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={matchingCriteria.address}
                    onChange={(e) => setMatchingCriteria({...matchingCriteria, address: e.target.checked})}
                    className="rounded"
                  />
                  <span className="text-sm">Address</span>
                </label>
              </div>
            </div>

            <div className="border-t pt-4">
              <Label className="text-sm font-medium mb-3 block">Automatic Resolution Strategy</Label>
              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="autoResolve"
                    checked={autoResolveStrategy === 'manual'}
                    onChange={() => setAutoResolveStrategy('manual')}
                    className="rounded-full"
                  />
                  <div>
                    <span className="text-sm font-medium">Manual Review</span>
                    <p className="text-xs text-gray-600">Review each duplicate manually</p>
                  </div>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="autoResolve"
                    checked={autoResolveStrategy === 'merge'}
                    onChange={() => setAutoResolveStrategy('merge')}
                    className="rounded-full"
                  />
                  <div>
                    <span className="text-sm font-medium">Auto-Merge Definitive Matches</span>
                    <p className="text-xs text-gray-600">Automatically update records with definitive matches (MRN)</p>
                  </div>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="autoResolve"
                    checked={autoResolveStrategy === 'ignore'}
                    onChange={() => setAutoResolveStrategy('ignore')}
                    className="rounded-full"
                  />
                  <div>
                    <span className="text-sm font-medium">Ignore Duplicates</span>
                    <p className="text-xs text-gray-600">Add all as new patients, ignore detected duplicates</p>
                  </div>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="autoResolve"
                    checked={autoResolveStrategy === 'mark_duplicate'}
                    onChange={() => setAutoResolveStrategy('mark_duplicate')}
                    className="rounded-full"
                  />
                  <div>
                    <span className="text-sm font-medium">Mark as Duplicate</span>
                    <p className="text-xs text-gray-600">Skip all rows with potential duplicates</p>
                  </div>
                </label>
              </div>
            </div>

            <Alert className="bg-blue-100 border-blue-300">
              <AlertDescription className="text-xs text-blue-900">
                💡 <strong>Tip:</strong> Start with Manual Review. Use Auto-Merge for trusted data sources with reliable MRNs.
              </AlertDescription>
            </Alert>
          </CardContent>
        )}
      </Card>

      <Card className="border-2 border-orange-300">
        <CardHeader className="bg-orange-50">
          <CardTitle className="flex items-center gap-2 text-orange-900">
            <AlertCircle className="w-6 h-6" />
            Duplicate Detection Results (MRN-Priority Matching)
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
                                    <div className="flex items-center gap-2 mb-1 flex-wrap">
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
                                      <Badge className={`text-xs border ${getConfidenceBadgeColor(dup.confidenceLevel)}`}>
                                        {getConfidenceLabel(dup.confidenceLevel)}
                                      </Badge>
                                    </div>
                                    <div className="flex gap-1 mt-2 flex-wrap">
                                      {dup.matches.map((match, mIdx) => (
                                        <Badge key={mIdx} className={`text-xs ${
                                          match.includes('✓') ? 'bg-green-100 text-green-800 border-green-300' :
                                          'bg-orange-100 text-orange-800 border-orange-300'
                                        }`}>
                                          {match}
                                        </Badge>
                                      ))}
                                    </div>
                                    <div className="flex gap-2 mt-2 flex-wrap">
                                      <Badge className={`text-xs font-bold ${
                                        dup.score >= 80 ? 'bg-red-500 text-white' :
                                        dup.score >= 60 ? 'bg-orange-500 text-white' :
                                        dup.score >= 40 ? 'bg-yellow-500 text-white' :
                                        'bg-blue-500 text-white'
                                      }`}>
                                        Match Score: {Math.round(dup.score)}%
                                      </Badge>
                                      <Badge className="bg-purple-100 text-purple-800 border-purple-300 text-xs">
                                        {dup.criteriaMet} of 6 criteria met
                                      </Badge>
                                      {dup.differences.length > 0 && (
                                        <Badge className="bg-blue-100 text-blue-800 border-blue-300 text-xs">
                                          {dup.differences.length} field{dup.differences.length > 1 ? 's' : ''} to update
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
                                   className={`text-xs ${dup.confidenceLevel === 'definitive' && dup.differences.length > 0 ? 'bg-purple-600 hover:bg-purple-700 text-white' : ''}`}
                                   disabled={dup.differences.length === 0}
                                 >
                                   <RefreshCw className="w-3 h-3 mr-1" />
                                   {dup.confidenceLevel === 'definitive' ? '✓ Update' : 'Update'}{dup.differences.length > 0 && ` (${dup.differences.length})`}
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
                            <Alert className={resolution[index].auto ? 'bg-purple-50 border-purple-300' : 'bg-blue-50 border-blue-200'}>
                              <CheckCircle2 className={`w-4 h-4 ${resolution[index].auto ? 'text-purple-600' : 'text-blue-600'}`} />
                              <AlertDescription className={`text-sm ${resolution[index].auto ? 'text-purple-900' : 'text-blue-900'}`}>
                                <strong>{resolution[index].auto ? 'Auto-selected (MRN Match):' : 'Action selected:'}</strong>{' '}
                                {resolution[index].action === 'add' && 'Add as new patient'}
                                {resolution[index].action === 'update' && 'Update existing patient with new information'}
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
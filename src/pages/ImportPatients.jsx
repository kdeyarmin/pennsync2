import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Upload,
  FileSpreadsheet,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  Users,
  Download,
  Trash2
} from "lucide-react";

export default function ImportPatients() {
  const [file, setFile] = useState(null);
  const [parsedData, setParsedData] = useState([]);
  const [duplicates, setDuplicates] = useState([]);
  const [selectedRows, setSelectedRows] = useState(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [importResult, setImportResult] = useState(null);
  const [parseError, setParseError] = useState(null);

  const queryClient = useQueryClient();

  const { data: existingPatients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Check if user is admin
  if (currentUser && currentUser.role !== 'admin') {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <Alert className="bg-red-50 border-red-200">
          <XCircle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-800">
            You do not have permission to access this page. Admin access required.
          </AlertDescription>
        </Alert>
      </div>
    );
  }

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV must have a header row and at least one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    
    // Map common header variations - supports standard format AND agency export format
    const headerMap = {
      'first_name': ['first_name', 'firstname', 'first name', 'fname'],
      'middle_name': ['middle_name', 'middlename', 'middle name', 'middle_initial', 'mi', 'mname'],
      'last_name': ['last_name', 'lastname', 'last name', 'lname'],
      'patient_name': ['patient', 'patient name', 'patientname'], // Agency format - full name
      'date_of_birth': ['date_of_birth', 'dob', 'dateofbirth', 'birth_date', 'birthdate'],
      'medical_record_number': ['medical_record_number', 'mrn', 'medical_record', 'record_number'],
      'admitted_date': ['admitted date', 'admitted_date', 'admitteddate', 'admission_date', 'admission date'],
      'address': ['address', 'street_address', 'home_address'],
      'phone': ['phone', 'phone_number', 'telephone', 'mobile'],
      'email': ['email', 'email_address', 'e-mail'],
      'primary_diagnosis': ['primary_diagnosis', 'diagnosis', 'dx', 'primary_dx', 'primary diagnosis'],
      'allergies': ['allergies', 'allergy'],
      'status': ['status', 'patient_status', 'current admission status', 'current_admission_status', 'currentadmissionstatus'],
      'gender': ['gender', 'sex']
    };

    const getColumnIndex = (field) => {
      const variations = headerMap[field] || [field];
      for (const variation of variations) {
        const index = headers.indexOf(variation);
        if (index !== -1) return index;
      }
      return -1;
    };

    const patients = [];
    for (let i = 1; i < lines.length; i++) {
      const values = parseCSVLine(lines[i]);
      if (values.length === 0) continue;

      // Handle combined "Patient" column (agency format: "Last, First Middle" or "First Middle Last")
      let firstName = values[getColumnIndex('first_name')] || '';
      let middleName = values[getColumnIndex('middle_name')] || '';
      let lastName = values[getColumnIndex('last_name')] || '';
      
      const patientNameIdx = getColumnIndex('patient_name');
      if (patientNameIdx !== -1 && (!firstName || !lastName)) {
        const fullName = values[patientNameIdx] || '';
        if (fullName.includes(',')) {
          // Format: "Last, First Middle" or "Last, First M."
          const parts = fullName.split(',').map(p => p.trim());
          lastName = parts[0] || '';
          const firstPart = parts[1] || '';
          const nameParts = firstPart.trim().split(/\s+/);
          firstName = nameParts[0] || '';
          middleName = nameParts.slice(1).join(' ') || ''; // Could be "Middle" or "M." or "M"
        } else {
          // Format: "First Middle Last" or "First M. Last" or "First M Last"
          const parts = fullName.trim().split(/\s+/);
          if (parts.length >= 3) {
            firstName = parts[0] || '';
            middleName = parts.slice(1, -1).join(' ') || ''; // Everything between first and last
            lastName = parts[parts.length - 1] || '';
          } else if (parts.length === 2) {
            firstName = parts[0] || '';
            lastName = parts[1] || '';
          } else {
            firstName = parts[0] || '';
          }
        }
      }

      // Parse DOB from various formats
      let dob = values[getColumnIndex('date_of_birth')] || '';
      if (dob) {
        // Handle MM/DD/YYYY format
        if (dob.includes('/')) {
          const parts = dob.split('/');
          if (parts.length === 3) {
            const month = parts[0].padStart(2, '0');
            const day = parts[1].padStart(2, '0');
            const year = parts[2].length === 2 ? (parseInt(parts[2]) > 50 ? '19' + parts[2] : '20' + parts[2]) : parts[2];
            dob = `${year}-${month}-${day}`;
          }
        }
      }

      // Map admission status to our status enum
      let status = values[getColumnIndex('status')] || 'active';
      status = status.toLowerCase().trim();
      if (status === 'admitted' || status === 'current' || status === 'open') {
        status = 'active';
      } else if (status === 'discharged' || status === 'closed') {
        status = 'discharged';
      } else if (status === 'hospitalized' || status === 'inpatient') {
        status = 'hospitalized';
      } else {
        status = 'active'; // Default
      }

      const patient = {
        first_name: firstName,
        middle_name: middleName,
        last_name: lastName,
        date_of_birth: dob,
        medical_record_number: values[getColumnIndex('medical_record_number')] || '',
        address: values[getColumnIndex('address')] || '',
        phone: values[getColumnIndex('phone')] || '',
        email: values[getColumnIndex('email')] || '',
        primary_diagnosis: values[getColumnIndex('primary_diagnosis')] || '',
        allergies: values[getColumnIndex('allergies')] || '',
        status: status,
        _rowIndex: i,
        _issues: []
      };

      // Validate required fields
      if (!patient.first_name) patient._issues.push('Missing first name');
      if (!patient.last_name) patient._issues.push('Missing last name');

      patients.push(patient);
    }

    return patients;
  };

  const parseCSVLine = (line) => {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current.trim().replace(/^"|"$/g, ''));
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current.trim().replace(/^"|"$/g, ''));
    return result;
  };

  const checkDuplicates = (patients) => {
    const foundDuplicates = [];

    patients.forEach((patient, idx) => {
      // Check against existing patients
      const existingMatch = existingPatients.find(existing => {
        // MRN match
        if (patient.medical_record_number && existing.medical_record_number &&
            patient.medical_record_number === existing.medical_record_number) {
          return true;
        }
        // Name + DOB match
        if (patient.first_name?.toLowerCase() === existing.first_name?.toLowerCase() &&
            patient.last_name?.toLowerCase() === existing.last_name?.toLowerCase() &&
            patient.date_of_birth && existing.date_of_birth &&
            patient.date_of_birth === existing.date_of_birth) {
          return true;
        }
        return false;
      });

      if (existingMatch) {
        foundDuplicates.push({
          rowIndex: idx,
          type: 'existing',
          match: existingMatch,
          patient
        });
      }

      // Check within CSV for duplicates
      for (let j = idx + 1; j < patients.length; j++) {
        const other = patients[j];
        if (patient.medical_record_number && other.medical_record_number &&
            patient.medical_record_number === other.medical_record_number) {
          foundDuplicates.push({
            rowIndex: j,
            type: 'csv',
            matchRow: idx,
            patient: other
          });
        }
      }
    });

    return foundDuplicates;
  };

  const handleFileChange = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;

    setFile(selectedFile);
    setParseError(null);
    setImportResult(null);
    setParsedData([]);
    setDuplicates([]);
    setSelectedRows(new Set());

    try {
      const text = await selectedFile.text();
      const patients = parseCSV(text);
      const foundDuplicates = checkDuplicates(patients);

      setParsedData(patients);
      setDuplicates(foundDuplicates);

      // Auto-select all non-duplicate, valid rows
      const duplicateIndices = new Set(foundDuplicates.map(d => d.rowIndex));
      const validRows = new Set();
      patients.forEach((p, idx) => {
        if (!duplicateIndices.has(idx) && p._issues.length === 0) {
          validRows.add(idx);
        }
      });
      setSelectedRows(validRows);

    } catch (error) {
      setParseError(error.message);
    }
  };

  const toggleRow = (idx) => {
    setSelectedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(idx)) {
        newSet.delete(idx);
      } else {
        newSet.add(idx);
      }
      return newSet;
    });
  };

  const toggleAll = () => {
    if (selectedRows.size === parsedData.length) {
      setSelectedRows(new Set());
    } else {
      setSelectedRows(new Set(parsedData.map((_, idx) => idx)));
    }
  };

  const handleImport = async () => {
    if (selectedRows.size === 0) return;

    setIsProcessing(true);
    setImportResult(null);

    try {
      const toImport = parsedData
        .filter((_, idx) => selectedRows.has(idx))
        .map(p => ({
          first_name: p.first_name,
          middle_name: p.middle_name || null,
          last_name: p.last_name,
          date_of_birth: p.date_of_birth || null,
          medical_record_number: p.medical_record_number || null,
          address: p.address || null,
          phone: p.phone || null,
          email: p.email || null,
          primary_diagnosis: p.primary_diagnosis || null,
          allergies: p.allergies || null,
          status: p.status || 'active'
        }));

      await base44.entities.Patient.bulkCreate(toImport);

      queryClient.invalidateQueries({ queryKey: ['patients'] });

      setImportResult({
        success: true,
        count: toImport.length
      });

      // Reset state
      setFile(null);
      setParsedData([]);
      setDuplicates([]);
      setSelectedRows(new Set());

    } catch (error) {
      setImportResult({
        success: false,
        error: error.message
      });
    }

    setIsProcessing(false);
  };

  const getDuplicateInfo = (idx) => {
    return duplicates.find(d => d.rowIndex === idx);
  };

  const getRowStatus = (patient, idx) => {
    const duplicate = getDuplicateInfo(idx);
    if (duplicate) {
      return { status: 'duplicate', color: 'bg-yellow-50', badge: 'bg-yellow-100 text-yellow-800' };
    }
    if (patient._issues.length > 0) {
      return { status: 'invalid', color: 'bg-red-50', badge: 'bg-red-100 text-red-800' };
    }
    return { status: 'valid', color: 'bg-green-50', badge: 'bg-green-100 text-green-800' };
  };

  const downloadTemplate = () => {
    const template = 'first_name,middle_name,last_name,date_of_birth,medical_record_number,phone,email,address,primary_diagnosis,allergies,status\nJohn,A,Doe,1950-01-15,MRN001,555-123-4567,john@example.com,"123 Main St, City, ST 12345",CHF,Penicillin,active';
    const blob = new Blob([template], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'patient_import_template.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Import Patients</h1>
          <p className="text-gray-600">Upload a CSV file to bulk import patients</p>
        </div>
        <Button variant="outline" onClick={downloadTemplate}>
          <Download className="w-4 h-4 mr-2" />
          Download Template
        </Button>
      </div>

      {/* Upload Section */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload CSV File
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
            <FileSpreadsheet className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <Input
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="max-w-xs mx-auto"
            />
            <p className="text-sm text-gray-500 mt-2">
              Supports standard format (first_name, last_name, etc.) or agency export format (Patient, MRN, DOB, Primary Diagnosis, etc.)
            </p>
          </div>

          {parseError && (
            <Alert className="mt-4 bg-red-50 border-red-200">
              <XCircle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-800">{parseError}</AlertDescription>
            </Alert>
          )}

          {importResult && (
            <Alert className={`mt-4 ${importResult.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              {importResult.success ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-green-800">
                    Successfully imported {importResult.count} patients!
                  </AlertDescription>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-red-600" />
                  <AlertDescription className="text-red-800">
                    Import failed: {importResult.error}
                  </AlertDescription>
                </>
              )}
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Preview Section */}
      {parsedData.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5" />
                Preview ({parsedData.length} patients found)
              </div>
              <div className="flex items-center gap-4">
                <div className="flex gap-2 text-sm">
                  <Badge className="bg-green-100 text-green-800">
                    {parsedData.filter((p, i) => getRowStatus(p, i).status === 'valid').length} Valid
                  </Badge>
                  <Badge className="bg-yellow-100 text-yellow-800">
                    {duplicates.length} Duplicates
                  </Badge>
                  <Badge className="bg-red-100 text-red-800">
                    {parsedData.filter(p => p._issues.length > 0).length} Invalid
                  </Badge>
                </div>
                <Button
                  onClick={handleImport}
                  disabled={selectedRows.size === 0 || isProcessing}
                  className="bg-blue-600 hover:bg-blue-700"
                >
                  {isProcessing ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Importing...</>
                  ) : (
                    <>Import {selectedRows.size} Selected</>
                  )}
                </Button>
              </div>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {duplicates.length > 0 && (
              <Alert className="mb-4 bg-yellow-50 border-yellow-200">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  {duplicates.length} potential duplicate(s) detected. Review before importing.
                </AlertDescription>
              </Alert>
            )}

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={selectedRows.size === parsedData.length}
                        onCheckedChange={toggleAll}
                      />
                    </TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>DOB</TableHead>
                    <TableHead>MRN</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Diagnosis</TableHead>
                    <TableHead>Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {parsedData.map((patient, idx) => {
                    const rowStatus = getRowStatus(patient, idx);
                    const duplicate = getDuplicateInfo(idx);

                    return (
                      <TableRow key={idx} className={rowStatus.color}>
                        <TableCell>
                          <Checkbox
                            checked={selectedRows.has(idx)}
                            onCheckedChange={() => toggleRow(idx)}
                          />
                        </TableCell>
                        <TableCell>
                          <Badge className={rowStatus.badge}>
                            {rowStatus.status === 'valid' && <CheckCircle2 className="w-3 h-3 mr-1" />}
                            {rowStatus.status === 'duplicate' && <AlertTriangle className="w-3 h-3 mr-1" />}
                            {rowStatus.status === 'invalid' && <XCircle className="w-3 h-3 mr-1" />}
                            {rowStatus.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="font-medium">
                          {patient.first_name} {patient.middle_name && `${patient.middle_name} `}{patient.last_name}
                        </TableCell>
                        <TableCell>{patient.date_of_birth || '-'}</TableCell>
                        <TableCell>{patient.medical_record_number || '-'}</TableCell>
                        <TableCell>{patient.phone || '-'}</TableCell>
                        <TableCell className="max-w-32 truncate">{patient.primary_diagnosis || '-'}</TableCell>
                        <TableCell>
                          {patient._issues.length > 0 && (
                            <span className="text-red-600 text-xs">{patient._issues.join(', ')}</span>
                          )}
                          {duplicate && (
                            <span className="text-yellow-700 text-xs">
                              {duplicate.type === 'existing' 
                                ? `Matches existing: ${duplicate.match.first_name} ${duplicate.match.last_name}`
                                : `Duplicate of row ${duplicate.matchRow + 2}`
                              }
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
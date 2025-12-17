import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { 
  Upload, 
  FileSpreadsheet, 
  CheckCircle2, 
  AlertCircle, 
  Download,
  Users,
  Loader2,
  ArrowRight,
  GripVertical,
  Eye,
  X,
  RefreshCw,
  FileDown,
  Zap
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { validatePatient, validatePhone, validateEmail, validateDate, SEVERITY } from "../components/utils/patientValidation";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import ValidationSummary from "../components/import/ValidationSummary";
import AIValidationHelper from "../components/import/AIValidationHelper";

const REQUIRED_FIELDS = ['first_name', 'last_name'];

const FIELD_MAPPINGS = {
  // Patient basic info
  'first_name': { label: 'First Name', type: 'string', required: true, aliases: ['patient'] },
  'last_name': { label: 'Last Name', type: 'string', required: true },
  'middle_name': { label: 'Middle Name', type: 'string' },
  'date_of_birth': { label: 'Date of Birth', type: 'date', format: 'YYYY-MM-DD', aliases: ['dob'] },
  'medical_record_number': { label: 'Medical Record Number', type: 'string', aliases: ['mrn'] },
  'phone': { label: 'Phone Number', type: 'string' },
  'email': { label: 'Email', type: 'email' },
  'address': { label: 'Address', type: 'string' },
  'gender': { label: 'Gender', type: 'string' },
  
  // Emergency contact
  'emergency_contact_name': { label: 'Emergency Contact Name', type: 'string' },
  'emergency_contact_phone': { label: 'Emergency Contact Phone', type: 'string' },
  'emergency_contact_relationship': { label: 'Emergency Contact Relationship', type: 'string' },
  
  // Medical info
  'primary_diagnosis': { label: 'Primary Diagnosis', type: 'string' },
  'allergies': { label: 'Allergies', type: 'string' },
  'physician_name': { label: 'Physician Name', type: 'string', aliases: ['physician'] },
  'physician_phone': { label: 'Physician Phone', type: 'string' },
  'physician_email': { label: 'Physician Email', type: 'email' },
  
  // Admission info
  'admission_date': { label: 'Admission Date', type: 'date', format: 'YYYY-MM-DD', aliases: ['admitted_date'] },
  'care_type': { label: 'Care Type', type: 'enum', options: ['home_health', 'hospice'], aliases: ['organization_type'] },
  'status': { label: 'Status', type: 'enum', options: ['active', 'discharged', 'hospitalized'], aliases: ['current_admission_status'] },
  'insurance_primary_provider': { label: 'Primary Insurance', type: 'string', aliases: ['primary_payor'] },
  'icd_code': { label: 'ICD Code', type: 'string', aliases: ['icd_code'] }
};

// Columns to skip/ignore
const SKIP_COLUMNS = ['company', 'top_unit', 'parent_unit', 'sub_unit', 'branch_name', 'patient_team_name'];

export default function ImportPatients() {
  const [file, setFile] = useState(null);
  const [csvData, setCsvData] = useState(null);
  const [columnMapping, setColumnMapping] = useState({});
  const [mappingErrors, setMappingErrors] = useState({});
  const [validationErrors, setValidationErrors] = useState([]);
  const [validRecords, setValidRecords] = useState([]);
  const [showPreview, setShowPreview] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importResults, setImportResults] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [skipErrors, setSkipErrors] = useState(true);
  const [selectedRowPreview, setSelectedRowPreview] = useState(null);
  const [autoImporting, setAutoImporting] = useState(false);
  
  const queryClient = useQueryClient();

  const parseCSV = (text) => {
    const lines = text.split('\n').filter(line => line.trim());
    if (lines.length === 0) return { headers: [], rows: [] };
    
    const parseCSVLine = (line) => {
      const result = [];
      let current = '';
      let inQuotes = false;
      
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        const nextChar = line[i + 1];
        
        if (char === '"') {
          if (inQuotes && nextChar === '"') {
            current += '"';
            i++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };
    
    const headers = parseCSVLine(lines[0]);
    const rows = lines.slice(1).map(line => parseCSVLine(line));
    
    return { headers, rows };
  };

  const importPatientsMutation = useMutation({
    mutationFn: async (patients) => {
      const results = { success: 0, failed: 0, errors: [], failedRecords: [] };
      
      for (let i = 0; i < patients.length; i++) {
        try {
          await base44.entities.Patient.create(patients[i]);
          results.success++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            row: i + 1,
            patient: `${patients[i].first_name} ${patients[i].last_name}`,
            error: error.message
          });
          results.failedRecords.push({
            ...patients[i],
            error_description: error.message,
            original_row: i + 1
          });
        }
        setImportProgress(Math.round(((i + 1) / patients.length) * 100));
      }
      
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    }
  });

  const handleAutoImport = async (selectedFile) => {
    if (!selectedFile) return;

    setAutoImporting(true);
    setImportProgress(0);
    setImportResults(null);

    try {
      // Read file content
      const text = await selectedFile.text();
      
      const response = await base44.functions.invoke('autoImportPatients', { fileContent: text });
      
      // Handle response - it may be in response.data or response directly
      const data = response.data || response;
      
      if (data.success) {
        setImportResults(data.results);
        queryClient.invalidateQueries({ queryKey: ['patients'] });
        setImportProgress(100);
      } else {
        alert('Import failed: ' + (data.error || 'Unknown error'));
      }
    } catch (error) {
      console.error('Auto import error:', error);
      alert('Auto import failed: ' + (error.response?.data?.error || error.message));
    }

    setAutoImporting(false);
  };

  const handleFileUpload = async (event) => {
    const selectedFile = event.target.files?.[0];
    if (!selectedFile) return;

    if (!selectedFile.name.endsWith('.csv')) {
      alert('Please upload a CSV file');
      return;
    }

    setFile(selectedFile);
    setIsProcessing(true);
    setCsvData(null);
    setColumnMapping({});
    setValidationErrors([]);
    setImportResults(null);

    try {
      // Read CSV file directly
      const text = await selectedFile.text();
      const { headers, rows } = parseCSV(text);
      
      if (!headers || headers.length === 0) {
        alert('No headers found in CSV file');
        setIsProcessing(false);
        return;
      }
      
      if (rows.length === 0) {
        alert('No data rows found in CSV file');
        setIsProcessing(false);
        return;
      }
      
      setCsvData({ headers, rows });
      
      // Auto-map columns based on header names
      const autoMapping = {};
      headers.forEach((header, idx) => {
        const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9_]/g, '_').trim();
        
        // Skip columns that should be ignored
        if (SKIP_COLUMNS.includes(normalizedHeader)) {
          return;
        }
        
        // Try exact match
        if (FIELD_MAPPINGS[normalizedHeader]) {
          autoMapping[idx] = normalizedHeader;
          return;
        }
        
        // Try alias matches
        for (const fieldKey in FIELD_MAPPINGS) {
          const field = FIELD_MAPPINGS[fieldKey];
          if (field.aliases && field.aliases.some(alias => normalizedHeader === alias.toLowerCase().replace(/[^a-z0-9_]/g, '_'))) {
            autoMapping[idx] = fieldKey;
            return;
          }
        }
        
        // Try partial matches
        for (const fieldKey in FIELD_MAPPINGS) {
          if (normalizedHeader.includes(fieldKey) || fieldKey.includes(normalizedHeader)) {
            autoMapping[idx] = fieldKey;
            break;
          }
        }
      });
      
      setColumnMapping(autoMapping);
      validateMapping(autoMapping);
    } catch (error) {
      console.error('Error processing CSV:', error);
      alert('Error processing CSV file: ' + error.message);
    }
    
    setIsProcessing(false);
  };

  const validateMapping = (mapping) => {
    const errors = {};
    const mappedFields = Object.values(mapping);
    const requiredFieldsMissing = REQUIRED_FIELDS.filter(field => !mappedFields.includes(field));
    
    if (requiredFieldsMissing.length > 0) {
      errors.missing = `Missing required fields: ${requiredFieldsMissing.map(f => FIELD_MAPPINGS[f].label).join(', ')}`;
    }

    // Check for duplicate mappings
    const duplicates = mappedFields.filter((item, index) => mappedFields.indexOf(item) !== index);
    if (duplicates.length > 0) {
      errors.duplicates = `Duplicate mappings found: ${[...new Set(duplicates)].map(f => FIELD_MAPPINGS[f].label).join(', ')}`;
    }

    setMappingErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const sourceIndex = parseInt(result.draggableId.split('-')[1]);
    const destinationField = result.destination.droppableId === 'unassigned' ? null : result.destination.droppableId;

    setColumnMapping(prev => {
      const newMapping = { ...prev };
      if (destinationField) {
        // Remove any existing mapping to this field
        Object.keys(newMapping).forEach(key => {
          if (newMapping[key] === destinationField) {
            delete newMapping[key];
          }
        });
        newMapping[sourceIndex] = destinationField;
      } else {
        delete newMapping[sourceIndex];
      }
      validateMapping(newMapping);
      return newMapping;
    });
  };

  const validateData = () => {
    if (!csvData?.rows || csvData.rows.length === 0) {
      alert('No data rows found to validate');
      return;
    }
    
    if (!validateMapping(columnMapping)) {
      alert('Please fix mapping errors before validating data');
      return;
    }

    const errors = [];
    const valid = [];

    csvData.rows.forEach((row, rowIndex) => {
      const patient = {};
      const rowErrors = [];

      // Map columns to patient fields
      Object.entries(columnMapping).forEach(([colIndex, fieldKey]) => {
        const value = row[colIndex]?.trim();
        const field = FIELD_MAPPINGS[fieldKey];

        if (value) {
          // Enhanced type validation
          if (field.type === 'email') {
            const emailError = validateEmail(value);
            if (emailError && emailError.severity === SEVERITY.ERROR) {
              rowErrors.push(emailError.message);
            }
          }
          
          if (field.type === 'date') {
            const dateError = validateDate(value, fieldKey);
            if (dateError && dateError.severity === SEVERITY.ERROR) {
              rowErrors.push(dateError.message);
            }
          }
          
          if (field.type === 'enum' && !field.options.includes(value.toLowerCase())) {
            // Try to map common values
            const valueLower = value.toLowerCase();
            if (fieldKey === 'care_type') {
              if (valueLower.includes('home') || valueLower.includes('health')) {
                patient[fieldKey] = 'home_health';
              } else if (valueLower.includes('hospice')) {
                patient[fieldKey] = 'hospice';
              } else {
                rowErrors.push(`Invalid value "${value}" for ${field.label}. Must be one of: ${field.options.join(', ')}`);
              }
            } else if (fieldKey === 'status') {
              if (valueLower.includes('active') || valueLower === 'a') {
                patient[fieldKey] = 'active';
              } else if (valueLower.includes('discharge')) {
                patient[fieldKey] = 'discharged';
              } else if (valueLower.includes('hospital')) {
                patient[fieldKey] = 'hospitalized';
              } else {
                patient[fieldKey] = 'active'; // default to active
              }
            } else {
              rowErrors.push(`Invalid value "${value}" for ${field.label}. Must be one of: ${field.options.join(', ')}`);
            }
          } else if (field.type === 'enum') {
            patient[fieldKey] = value.toLowerCase();
          } else {
            // Phone validation
            if (fieldKey === 'phone' || fieldKey === 'emergency_contact_phone' || fieldKey === 'physician_phone') {
              const phoneError = validatePhone(value);
              if (phoneError) {
                rowErrors.push(`${field.label}: ${phoneError.message}`);
              }
            }
            
            // Handle special field mappings
            if (fieldKey === 'insurance_primary_provider') {
              patient.insurance_primary = { provider: value };
            } else {
              patient[fieldKey] = value;
            }
          }
        }
      });

      // Comprehensive patient validation
      const validationResults = validatePatient(patient, { skipWarnings: false });
      
      // Only add blocking errors
      const blockingErrors = validationResults.filter(v => v.severity === SEVERITY.ERROR);
      blockingErrors.forEach(err => {
        rowErrors.push(err.message);
      });

      if (rowErrors.length > 0) {
        errors.push({
          row: rowIndex + 1,
          patient: `${patient.first_name || ''} ${patient.last_name || ''}`.trim() || `Row ${rowIndex + 1}`,
          errors: rowErrors
        });
      } else {
        valid.push(patient);
      }
    });

    setValidationErrors(errors);
    setValidRecords(valid);
    if (valid.length > 0) {
      setShowPreview(true);
    }
  };

  const handleImport = async () => {
    if (validRecords.length === 0) {
      alert('No valid records to import');
      return;
    }

    setImportProgress(0);
    const results = await importPatientsMutation.mutateAsync(validRecords);
    setImportResults(results);
  };

  const downloadTemplate = () => {
    const headers = [
      'Company', 'Top Unit', 'Parent Unit', 'Sub Unit', 'Branch Name', 'Patient Team Name',
      'Organization Type', 'Primary Payor', 'Patient', 'MRN', 'Admitted Date', 'DOB',
      'Current Admission Status', 'Primary Diagnosis', 'Gender', 'Physician', 'ICD Code'
    ];
    const sampleRow = [
      '', '', '', '', '', '',
      'Home Health', 'Medicare', 'John Doe', '12345', '2024-01-15', '1950-05-20',
      'Active', 'CHF', 'M', 'Dr. Smith', 'I50.9'
    ];
    const csv = headers.join(',') + '\n' + sampleRow.join(',') + '\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'patient_import_template.csv';
    a.click();
  };

  const downloadFailedRows = () => {
    if (!importResults?.failedRecords || importResults.failedRecords.length === 0) return;
    
    // Get all field keys from failed records
    const fieldKeys = Object.keys(FIELD_MAPPINGS);
    const headers = [...fieldKeys, 'error_description', 'original_row'];
    
    // Create CSV content
    let csvContent = headers.join(',') + '\n';
    
    importResults.failedRecords.forEach(record => {
      const row = headers.map(header => {
        const value = record[header] || '';
        // Escape quotes and wrap in quotes if contains comma or quote
        if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
          return `"${value.replace(/"/g, '""')}"`;
        }
        return value;
      });
      csvContent += row.join(',') + '\n';
    });
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `failed_patients_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleReImportFailed = () => {
    // Reset to allow re-upload of corrected file
    setFile(null);
    setCsvData(null);
    setColumnMapping({});
    setMappingErrors({});
    setValidationErrors([]);
    setValidRecords([]);
    setShowPreview(false);
    setImportResults(null);
    setImportProgress(0);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Auto-validate is removed - user must click "Validate & Continue" button

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <Users className="w-8 h-8 text-blue-600" />
          <h1 className="text-3xl font-bold text-gray-900">Import Patients</h1>
        </div>
        <p className="text-gray-600">
          Upload a CSV file to import multiple patient records at once
        </p>
      </div>

      {/* Download Template */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg">Get Started</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Download our CSV template to ensure your data is formatted correctly
          </p>
          <Button onClick={downloadTemplate} variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Download CSV Template
          </Button>
        </CardContent>
      </Card>

      {/* File Upload with Auto Import */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Upload & Import Patients
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-4 mb-4">
            {/* Auto Import */}
            <Card className="border-2 border-green-300 bg-green-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <Zap className="w-5 h-5 text-green-600" />
                  <h3 className="font-semibold text-green-900">Quick Auto Import</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Upload your file and automatically import all patients with the expected format
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleAutoImport(file);
                  }}
                  className="hidden"
                  id="auto-import"
                  disabled={autoImporting}
                />
                <label htmlFor="auto-import">
                  <Button 
                    className="w-full bg-green-600 hover:bg-green-700" 
                    disabled={autoImporting}
                    asChild
                  >
                    <span>
                      {autoImporting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Importing...
                        </>
                      ) : (
                        <>
                          <Zap className="w-4 h-4 mr-2" />
                          Auto Import
                        </>
                      )}
                    </span>
                  </Button>
                </label>
              </CardContent>
            </Card>

            {/* Manual Import */}
            <Card className="border-2 border-blue-300 bg-blue-50">
              <CardContent className="p-6">
                <div className="flex items-center gap-2 mb-3">
                  <ArrowRight className="w-5 h-5 text-blue-600" />
                  <h3 className="font-semibold text-blue-900">Manual Mapping</h3>
                </div>
                <p className="text-sm text-gray-600 mb-4">
                  Upload and manually map columns if format differs from template
                </p>
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                  disabled={isProcessing}
                />
                <label htmlFor="csv-upload">
                  <Button 
                    className="w-full bg-blue-600 hover:bg-blue-700" 
                    disabled={isProcessing}
                    asChild
                  >
                    <span>
                      {isProcessing ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          <Upload className="w-4 h-4 mr-2" />
                          Manual Import
                        </>
                      )}
                    </span>
                  </Button>
                </label>
              </CardContent>
            </Card>
          </div>

          {autoImporting && (
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-medium text-gray-700">Importing patients...</span>
                <span className="text-sm text-gray-600">{importProgress}%</span>
              </div>
              <Progress value={importProgress} className="h-2" />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Column Mapping with Drag & Drop */}
      {csvData && !showPreview && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowRight className="w-5 h-5" />
              Step 2: Map Columns (Drag & Drop)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Drag CSV columns to the corresponding patient fields. Auto-mapped fields are already assigned.
            </p>

            {/* Mapping Errors */}
            {Object.keys(mappingErrors).length > 0 && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription>
                  <ul className="list-disc ml-4">
                    {Object.values(mappingErrors).map((error, idx) => (
                      <li key={idx}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            <DragDropContext onDragEnd={handleDragEnd}>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* CSV Columns (Source) */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <FileSpreadsheet className="w-4 h-4" />
                    CSV Columns
                  </h3>
                  <Droppable droppableId="unassigned">
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`border-2 border-dashed rounded-lg p-4 min-h-[400px] ${
                          snapshot.isDraggingOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300'
                        }`}
                      >
                        <div className="space-y-2">
                          {(csvData?.headers || []).map((header, idx) => {
                            const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9_]/g, '_').trim();
                            const isSkipped = SKIP_COLUMNS.includes(normalizedHeader);
                            const isMapped = columnMapping[idx] !== undefined;
                            if (isMapped || isSkipped) return null;
                            
                            return (
                              <Draggable key={`col-${idx}`} draggableId={`col-${idx}`} index={idx}>
                                {(provided, snapshot) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className={`p-3 bg-white border rounded-lg flex items-center gap-2 cursor-move ${
                                      snapshot.isDragging ? 'shadow-lg ring-2 ring-blue-500' : 'hover:shadow-md'
                                    }`}
                                  >
                                    <GripVertical className="w-4 h-4 text-gray-400" />
                                    <span className="font-medium text-sm">{header}</span>
                                  </div>
                                )}
                              </Draggable>
                            );
                          })}
                        </div>
                        {provided.placeholder}
                        {Object.keys(columnMapping).length === csvData?.headers?.length && (
                          <p className="text-sm text-gray-500 text-center mt-4">All columns mapped</p>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>

                {/* Patient Fields (Target) */}
                <div>
                  <h3 className="font-semibold mb-3 flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Patient Fields
                  </h3>
                  <ScrollArea className="h-[400px] border rounded-lg p-4">
                    <div className="space-y-2">
                      {Object.entries(FIELD_MAPPINGS).map(([fieldKey, field]) => {
                        const mappedColIndex = Object.keys(columnMapping).find(
                          key => columnMapping[key] === fieldKey
                        );
                        const mappedColumn = mappedColIndex !== undefined ? csvData?.headers?.[mappedColIndex] : null;

                        return (
                          <Droppable key={fieldKey} droppableId={fieldKey}>
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.droppableProps}
                                className={`p-3 border-2 rounded-lg ${
                                  snapshot.isDraggingOver
                                    ? 'border-blue-500 bg-blue-50'
                                    : mappedColumn
                                    ? 'border-green-500 bg-green-50'
                                    : field.required
                                    ? 'border-red-200 bg-red-50'
                                    : 'border-gray-200 bg-gray-50'
                                }`}
                              >
                                <div className="flex items-center justify-between mb-1">
                                  <span className="font-medium text-sm">
                                    {field.label}
                                    {field.required && <span className="text-red-500 ml-1">*</span>}
                                  </span>
                                  {mappedColumn && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => {
                                        setColumnMapping(prev => {
                                          const newMapping = { ...prev };
                                          delete newMapping[mappedColIndex];
                                          validateMapping(newMapping);
                                          return newMapping;
                                        });
                                      }}
                                      className="h-6 w-6 p-0"
                                    >
                                      <X className="w-3 h-3" />
                                    </Button>
                                  )}
                                </div>
                                {mappedColumn ? (
                                  <div className="p-2 bg-white border border-green-300 rounded flex items-center gap-2">
                                    <GripVertical className="w-3 h-3 text-gray-400" />
                                    <span className="text-sm font-medium">{mappedColumn}</span>
                                  </div>
                                ) : (
                                  <p className="text-xs text-gray-500">Drop column here</p>
                                )}
                                {provided.placeholder}
                              </div>
                            )}
                          </Droppable>
                        );
                      })}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </DragDropContext>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                💡 Drag CSV columns from the left to patient fields on the right. Required fields are marked with <span className="text-red-500">*</span>
              </p>
            </div>

            {/* Sample Data Preview */}
            {Object.keys(columnMapping).length > 0 && (
              <Card className="mt-4 border-purple-200 bg-purple-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Sample Data Preview (First 3 Rows)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {csvData.rows.slice(0, 3).map((row, rowIdx) => (
                      <div key={rowIdx} className="p-3 bg-white rounded-lg border text-xs">
                        <p className="font-semibold mb-2 text-gray-700">Row {rowIdx + 1}</p>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(columnMapping).map(([colIdx, fieldKey]) => {
                            const value = row[colIdx]?.trim() || '';
                            const field = FIELD_MAPPINGS[fieldKey];
                            let validationError = null;

                            if (value) {
                              if (field.type === 'email') {
                                const emailError = validateEmail(value);
                                if (emailError?.severity === SEVERITY.ERROR) {
                                  validationError = emailError.message;
                                }
                              } else if (field.type === 'date') {
                                const dateError = validateDate(value, fieldKey);
                                if (dateError?.severity === SEVERITY.ERROR) {
                                  validationError = dateError.message;
                                }
                              } else if (fieldKey.includes('phone')) {
                                const phoneError = validatePhone(value);
                                if (phoneError?.severity === SEVERITY.ERROR) {
                                  validationError = phoneError.message;
                                }
                              }
                            }

                            return (
                              <div key={fieldKey} className={`p-2 rounded ${validationError ? 'bg-red-50 border border-red-200' : 'bg-gray-50'}`}>
                                <p className="font-medium text-gray-700">{field.label}</p>
                                <p className={`mt-1 ${validationError ? 'text-red-700' : 'text-gray-900'}`}>
                                  {value || <span className="text-gray-400 italic">empty</span>}
                                </p>
                                {validationError && (
                                  <p className="text-xs text-red-600 mt-1">⚠️ {validationError}</p>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Validate Button */}
            <div className="mt-6 flex justify-end">
              <Button
                onClick={validateData}
                disabled={Object.keys(mappingErrors).length > 0}
                className="bg-blue-600 hover:bg-blue-700"
                size="lg"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Validate & Preview Data
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Preview & Validation Results */}
      {showPreview && (validationErrors.length > 0 || validRecords.length > 0) && (
        <>
          {/* Validation Summary */}
          <ValidationSummary
            validationErrors={validationErrors}
            validRecords={validRecords}
            totalRows={csvData?.rows?.length || 0}
          />

          {/* AI Validation Helper */}
          {validationErrors.length > 0 && (
            <AIValidationHelper
              validationErrors={validationErrors}
              onApplySuggestions={(suggestions) => {
                console.log('Apply suggestions:', suggestions);
              }}
            />
          )}

          <Card className="mb-6 border-blue-300 border-2">
            <CardHeader className="bg-blue-50">
              <CardTitle className="text-lg flex items-center gap-2">
                <Eye className="w-5 h-5 text-blue-600" />
                Step 3: Review Validation Results
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Quick Summary Stats */}
                <div className="grid grid-cols-3 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-900">Valid Records</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700">{validRecords.length}</p>
                </div>

                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="font-semibold text-red-900">Errors</span>
                  </div>
                  <p className="text-2xl font-bold text-red-700">{validationErrors.length}</p>
                </div>

                <div className="p-4 bg-blue-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <FileSpreadsheet className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold text-blue-900">Total Rows</span>
                  </div>
                  <p className="text-2xl font-bold text-blue-700">{csvData?.rows.length || 0}</p>
                </div>
              </div>

              {/* Detailed Error List */}
              {validationErrors.length > 0 && (
                <div>
                  <h3 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    Detailed Error Report ({validationErrors.length} rows)
                  </h3>
                  <ScrollArea className="h-64 border rounded-lg p-4">
                    <div className="space-y-3">
                      {(validationErrors || []).map((error, idx) => (
                        <Alert key={idx} variant="destructive">
                          <AlertCircle className="w-4 h-4" />
                          <AlertDescription>
                            <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold">Row {error.row}</span>
                                <Badge variant="outline" className="bg-red-100">
                                  {error.patient}
                                </Badge>
                              </div>
                              <ul className="ml-4 space-y-1">
                                {(error.errors || []).map((err, errIdx) => (
                                  <li key={errIdx} className="text-sm flex items-start gap-2">
                                    <span className="text-red-600 mt-0.5">•</span>
                                    <span>{err}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </ScrollArea>

                  <div className="mt-3 flex items-center gap-2">
                    <Checkbox
                      id="skip-errors"
                      checked={skipErrors}
                      onCheckedChange={setSkipErrors}
                    />
                    <Label htmlFor="skip-errors" className="text-sm cursor-pointer">
                      Skip rows with errors and import only valid records ({validRecords.length} records)
                    </Label>
                  </div>
                </div>
              )}

              {/* Detailed Row Preview */}
              {validRecords.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Detailed Row Preview</h3>
                  <ScrollArea className="h-80 border rounded-lg">
                    <div className="p-4 space-y-3">
                      {validRecords.slice(0, 20).map((record, idx) => {
                        const validationResults = validatePatient(record, { skipWarnings: false });
                        const warnings = validationResults.filter(v => v.severity === SEVERITY.WARNING);
                        const infos = validationResults.filter(v => v.severity === SEVERITY.INFO);
                        const isExpanded = selectedRowPreview === idx;
                        
                        return (
                          <Card 
                            key={idx} 
                            className={`cursor-pointer transition-all ${isExpanded ? 'border-blue-500 shadow-md' : 'hover:border-gray-400'}`}
                            onClick={() => setSelectedRowPreview(isExpanded ? null : idx)}
                          >
                            <CardContent className="p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                                  <div>
                                    <p className="font-semibold">
                                      Row {idx + 1}: {record.first_name} {record.last_name}
                                    </p>
                                    <div className="flex gap-2 mt-1">
                                      {warnings.length > 0 && (
                                        <Badge variant="outline" className="text-xs bg-yellow-100 text-yellow-800">
                                          {warnings.length} warning{warnings.length > 1 ? 's' : ''}
                                        </Badge>
                                      )}
                                      {infos.length > 0 && (
                                        <Badge variant="outline" className="text-xs bg-blue-100 text-blue-800">
                                          {infos.length} info
                                        </Badge>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <Eye className="w-4 h-4 text-gray-400" />
                              </div>

                              {isExpanded && (
                                <div className="mt-4 pt-4 border-t space-y-3">
                                  <div className="grid grid-cols-2 gap-3 text-sm">
                                    {Object.entries(record).map(([key, value]) => {
                                      const field = FIELD_MAPPINGS[key];
                                      if (!field) return null;
                                      
                                      return (
                                        <div key={key} className="p-2 bg-gray-50 rounded">
                                          <p className="text-xs text-gray-600 font-medium">{field.label}</p>
                                          <p className="mt-1 text-gray-900">{value || <span className="text-gray-400 italic">empty</span>}</p>
                                        </div>
                                      );
                                    })}
                                  </div>

                                  {(warnings.length > 0 || infos.length > 0) && (
                                    <div className="space-y-2">
                                      {warnings.map((warn, wIdx) => (
                                        <Alert key={wIdx} className="bg-yellow-50 border-yellow-300">
                                          <AlertDescription className="text-sm text-yellow-900">
                                            ⚠️ {warn.message}
                                            {warn.suggestion && <span className="block mt-1 text-xs">💡 {warn.suggestion}</span>}
                                          </AlertDescription>
                                        </Alert>
                                      ))}
                                      {infos.map((info, iIdx) => (
                                        <Alert key={iIdx} className="bg-blue-50 border-blue-300">
                                          <AlertDescription className="text-sm text-blue-900">
                                            ℹ️ {info.message}
                                          </AlertDescription>
                                        </Alert>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        );
                      })}
                      {validRecords.length > 20 && (
                        <p className="text-sm text-gray-500 text-center py-2">
                          Showing first 20 of {validRecords.length} valid records
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              )}

              {/* Import Button */}
              {validRecords.length > 0 && (
                <div className="pt-4 border-t">
                  <Button
                    onClick={handleImport}
                    disabled={importPatientsMutation.isPending || (!skipErrors && validationErrors.length > 0)}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    {importPatientsMutation.isPending ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Importing... {importProgress}%
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Import {validRecords.length} Valid Records
                      </>
                    )}
                  </Button>

                  {importPatientsMutation.isPending && (
                    <Progress value={importProgress} className="mt-3" />
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        </>
      )}

      {/* Import Results */}
      {importResults && (
        <Card className="border-green-300 border-2">
          <CardHeader className="bg-gradient-to-r from-green-50 to-green-100">
            <CardTitle className="text-2xl flex items-center gap-3 text-green-900">
              <CheckCircle2 className="w-8 h-8 text-green-600" />
              Import Successfully Completed!
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="space-y-6">
              {/* Success Banner */}
              <Alert className="bg-green-50 border-green-300 border-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <AlertDescription className="text-green-900 font-semibold text-lg">
                  ✅ {importResults.success} new patient{importResults.success !== 1 ? 's' : ''} successfully added to the system!
                </AlertDescription>
              </Alert>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="bg-green-50 border-green-200 border-2">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-green-600 text-sm font-medium mb-1">Patients Added</p>
                        <p className="text-5xl font-bold text-green-700">{importResults.success}</p>
                      </div>
                      <Users className="w-16 h-16 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                {importResults.failed > 0 && (
                  <Card className="bg-red-50 border-red-200 border-2">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-red-600 text-sm font-medium mb-1">Failed</p>
                          <p className="text-5xl font-bold text-red-700">{importResults.failed}</p>
                        </div>
                        <AlertCircle className="w-16 h-16 text-red-500" />
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {importResults.errors.length > 0 && (
                <div>
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="font-semibold text-red-900 flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />
                        Import Errors ({importResults.errors.length} rows failed)
                      </h3>
                      <Button
                        onClick={downloadFailedRows}
                        variant="outline"
                        size="sm"
                        className="text-red-700 border-red-300 hover:bg-red-50"
                      >
                        <FileDown className="w-4 h-4 mr-2" />
                        Download Failed Rows CSV
                      </Button>
                    </div>
                    
                    <Alert className="bg-yellow-50 border-yellow-300 mb-3">
                      <AlertDescription className="text-sm text-yellow-900">
                        💡 <strong>Tip:</strong> Download the failed rows CSV, fix the errors described in each row, remove the 'error_description' and 'original_row' columns, then re-upload the corrected file.
                      </AlertDescription>
                    </Alert>

                    <ScrollArea className="h-48 border rounded-lg p-4">
                      <div className="space-y-2">
                        {(importResults.errors || []).map((error, idx) => (
                          <Alert key={idx} variant="destructive">
                            <AlertDescription>
                              <div className="space-y-1">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold">Row {error.row}</span>
                                  <Badge variant="outline" className="bg-red-100 text-red-800">
                                    {error.patient}
                                  </Badge>
                                </div>
                                <p className="text-sm font-mono bg-red-100 p-2 rounded">{error.error}</p>
                              </div>
                            </AlertDescription>
                          </Alert>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
              )}

              <div className="border-t my-4"></div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <Button
                  onClick={() => {
                    setFile(null);
                    setCsvData(null);
                    setColumnMapping({});
                    setMappingErrors({});
                    setValidationErrors([]);
                    setValidRecords([]);
                    setShowPreview(false);
                    setImportResults(null);
                    setImportProgress(0);
                  }}
                  variant="outline"
                  className="w-full"
                >
                  <Upload className="w-4 h-4 mr-2" />
                  Import Another File
                </Button>

                {importResults.failed > 0 && (
                  <Button
                    onClick={handleReImportFailed}
                    className="w-full bg-orange-600 hover:bg-orange-700"
                  >
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Re-Import Failed Rows
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
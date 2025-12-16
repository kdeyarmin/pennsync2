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
  X
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { validatePatient, validatePhone, validateEmail, validateDate, SEVERITY } from "../components/utils/patientValidation";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';

const REQUIRED_FIELDS = ['first_name', 'last_name'];

const FIELD_MAPPINGS = {
  // Patient basic info
  'first_name': { label: 'First Name', type: 'string', required: true },
  'last_name': { label: 'Last Name', type: 'string', required: true },
  'middle_name': { label: 'Middle Name', type: 'string' },
  'date_of_birth': { label: 'Date of Birth', type: 'date', format: 'YYYY-MM-DD' },
  'medical_record_number': { label: 'Medical Record Number', type: 'string' },
  'phone': { label: 'Phone Number', type: 'string' },
  'email': { label: 'Email', type: 'email' },
  'address': { label: 'Address', type: 'string' },
  
  // Emergency contact
  'emergency_contact_name': { label: 'Emergency Contact Name', type: 'string' },
  'emergency_contact_phone': { label: 'Emergency Contact Phone', type: 'string' },
  'emergency_contact_relationship': { label: 'Emergency Contact Relationship', type: 'string' },
  
  // Medical info
  'primary_diagnosis': { label: 'Primary Diagnosis', type: 'string' },
  'allergies': { label: 'Allergies', type: 'string' },
  'physician_name': { label: 'Physician Name', type: 'string' },
  'physician_phone': { label: 'Physician Phone', type: 'string' },
  'physician_email': { label: 'Physician Email', type: 'email' },
  
  // Admission info
  'admission_date': { label: 'Admission Date', type: 'date', format: 'YYYY-MM-DD' },
  'care_type': { label: 'Care Type', type: 'enum', options: ['home_health', 'hospice'] },
  'status': { label: 'Status', type: 'enum', options: ['active', 'discharged', 'hospitalized'] }
};

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
  
  const queryClient = useQueryClient();

  const uploadFileMutation = useMutation({
    mutationFn: async (file) => {
      const response = await base44.integrations.Core.UploadFile({ file });
      return response.file_url;
    }
  });

  const extractDataMutation = useMutation({
    mutationFn: async (fileUrl) => {
      const response = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url: fileUrl,
        json_schema: {
          type: 'object',
          properties: {
            headers: { type: 'array', items: { type: 'string' } },
            rows: { 
              type: 'array', 
              items: { 
                type: 'array',
                items: { type: 'string' }
              }
            }
          }
        }
      });
      return response;
    }
  });

  const importPatientsMutation = useMutation({
    mutationFn: async (patients) => {
      const results = { success: 0, failed: 0, errors: [] };
      
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
        }
        setImportProgress(Math.round(((i + 1) / patients.length) * 100));
      }
      
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    }
  });

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
      // Upload file
      const fileUrl = await uploadFileMutation.mutateAsync(selectedFile);
      
      // Extract CSV data
      const extractedData = await extractDataMutation.mutateAsync(fileUrl);
      
      if (extractedData?.status === 'success' && extractedData?.output) {
        const { headers = [], rows = [] } = extractedData.output;
        
        if (!headers || headers.length === 0) {
          alert('No headers found in CSV file');
          setIsProcessing(false);
          return;
        }
        
        setCsvData({ headers, rows });
        
        // Auto-map columns based on header names
        const autoMapping = {};
        headers.forEach((header, idx) => {
          const normalizedHeader = header.toLowerCase().replace(/[^a-z0-9_]/g, '_');
          
          // Try exact match
          if (FIELD_MAPPINGS[normalizedHeader]) {
            autoMapping[idx] = normalizedHeader;
          } else {
            // Try partial matches
            for (const fieldKey in FIELD_MAPPINGS) {
              if (normalizedHeader.includes(fieldKey) || fieldKey.includes(normalizedHeader)) {
                autoMapping[idx] = fieldKey;
                break;
              }
            }
          }
        });
        
        setColumnMapping(autoMapping);
        validateMapping(autoMapping);
      } else {
        alert('Failed to extract data from CSV: ' + (extractedData.details || 'Unknown error'));
      }
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
          
          if (field.type === 'enum' && !field.options.includes(value)) {
            rowErrors.push(`Invalid value "${value}" for ${field.label}. Must be one of: ${field.options.join(', ')}`);
          }
          
          // Phone validation
          if (fieldKey === 'phone' || fieldKey === 'emergency_contact_phone' || fieldKey === 'physician_phone') {
            const phoneError = validatePhone(value);
            if (phoneError) {
              rowErrors.push(`${field.label}: ${phoneError.message}`);
            }
          }
          
          patient[fieldKey] = value;
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
    const headers = ['first_name', 'last_name', 'date_of_birth', 'medical_record_number', 'phone', 'email', 'address', 'primary_diagnosis', 'admission_date'];
    const csv = headers.join(',') + '\n';
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'patient_import_template.csv';
    a.click();
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

      {/* File Upload */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5" />
            Step 1: Upload CSV File
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-500 transition-colors">
            <input
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="hidden"
              id="csv-upload"
              disabled={isProcessing}
            />
            <label htmlFor="csv-upload" className="cursor-pointer">
              <Upload className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <p className="text-lg font-medium text-gray-700 mb-2">
                {file ? file.name : 'Click to upload CSV file'}
              </p>
              <p className="text-sm text-gray-500">
                CSV files only • Maximum 1000 rows recommended
              </p>
            </label>
          </div>
          
          {isProcessing && (
            <div className="mt-4 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span className="text-sm text-gray-600">Processing file...</span>
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
                            const isMapped = columnMapping[idx] !== undefined;
                            if (isMapped) return null;
                            
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
      {showPreview && (validationErrors.length > 0 || validRecords.length > 0) ? (
        <Card className="mb-6 border-blue-300 border-2">
          <CardHeader className="bg-blue-50">
            <CardTitle className="text-lg flex items-center gap-2">
              <Eye className="w-5 h-5 text-blue-600" />
              Step 3: Preview & Validate Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Summary */}
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

              {/* Error Details */}
              {validationErrors.length > 0 && (
                <div>
                  <h3 className="font-semibold text-red-900 mb-3">Errors Found</h3>
                  <ScrollArea className="h-64 border rounded-lg p-4">
                    <div className="space-y-3">
                      {(validationErrors || []).map((error, idx) => (
                        <Alert key={idx} variant="destructive">
                          <AlertCircle className="w-4 h-4" />
                          <AlertDescription>
                            <span className="font-semibold">Row {error.row}</span> ({error.patient})
                            <ul className="mt-1 ml-4 list-disc text-sm">
                              {(error.errors || []).map((err, errIdx) => (
                                <li key={errIdx}>{err}</li>
                              ))}
                            </ul>
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

              {/* Data Preview */}
              {validRecords.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3">Preview Valid Records</h3>
                  <ScrollArea className="h-64 border rounded-lg">
                    <div className="p-4">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b bg-gray-50">
                            <th className="text-left p-2 font-semibold">#</th>
                            <th className="text-left p-2 font-semibold">Name</th>
                            <th className="text-left p-2 font-semibold">DOB</th>
                            <th className="text-left p-2 font-semibold">MRN</th>
                            <th className="text-left p-2 font-semibold">Phone</th>
                            <th className="text-left p-2 font-semibold">Email</th>
                          </tr>
                        </thead>
                        <tbody>
                          {validRecords.slice(0, 10).map((record, idx) => (
                            <tr key={idx} className="border-b hover:bg-gray-50">
                              <td className="p-2">{idx + 1}</td>
                              <td className="p-2 font-medium">
                                {record.first_name} {record.last_name}
                              </td>
                              <td className="p-2">{record.date_of_birth || '-'}</td>
                              <td className="p-2">{record.medical_record_number || '-'}</td>
                              <td className="p-2">{record.phone || '-'}</td>
                              <td className="p-2">{record.email || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {validRecords.length > 10 && (
                        <p className="text-sm text-gray-500 text-center mt-3">
                          Showing first 10 of {validRecords.length} valid records
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
      ) : null}

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
                  <h3 className="font-semibold text-red-900 mb-3">Import Errors</h3>
                  <ScrollArea className="h-48 border rounded-lg p-4">
                    <div className="space-y-2">
                      {(importResults.errors || []).map((error, idx) => (
                        <Alert key={idx} variant="destructive">
                          <AlertDescription>
                            <span className="font-semibold">Row {error.row}</span> ({error.patient}): {error.error}
                          </AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              )}

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
                Import Another File
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
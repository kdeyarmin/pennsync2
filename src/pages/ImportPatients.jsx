import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
  ArrowRight
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

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
  const [validationErrors, setValidationErrors] = useState([]);
  const [validRecords, setValidRecords] = useState([]);
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
    const selectedFile = event.target.files[0];
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
      
      if (extractedData.status === 'success' && extractedData.output) {
        const { headers, rows } = extractedData.output;
        
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
      } else {
        alert('Failed to extract data from CSV: ' + (extractedData.details || 'Unknown error'));
      }
    } catch (error) {
      console.error('Error processing CSV:', error);
      alert('Error processing CSV file: ' + error.message);
    }
    
    setIsProcessing(false);
  };

  const validateData = () => {
    if (!csvData || !csvData.rows) return;

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
          // Type validation
          if (field.type === 'email' && value && !value.includes('@')) {
            rowErrors.push(`Invalid email format in ${field.label}`);
          }
          
          if (field.type === 'date' && value) {
            const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
            if (!dateRegex.test(value)) {
              rowErrors.push(`Invalid date format in ${field.label} (expected YYYY-MM-DD)`);
            }
          }
          
          if (field.type === 'enum' && value && !field.options.includes(value)) {
            rowErrors.push(`Invalid value "${value}" for ${field.label}. Must be one of: ${field.options.join(', ')}`);
          }
          
          patient[fieldKey] = value;
        }
      });

      // Check required fields
      REQUIRED_FIELDS.forEach(fieldKey => {
        if (!patient[fieldKey]) {
          rowErrors.push(`Missing required field: ${FIELD_MAPPINGS[fieldKey].label}`);
        }
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

  React.useEffect(() => {
    if (csvData && Object.keys(columnMapping).length > 0) {
      validateData();
    }
  }, [columnMapping, csvData]);

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

      {/* Column Mapping */}
      {csvData && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <ArrowRight className="w-5 h-5" />
              Step 2: Map Columns
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              Map your CSV columns to patient fields. Auto-mapped fields are pre-selected.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {csvData.headers.map((header, idx) => (
                <div key={idx} className="flex items-center gap-3">
                  <div className="flex-1">
                    <Label className="text-xs text-gray-500 mb-1">CSV Column</Label>
                    <div className="p-2 bg-gray-100 rounded text-sm font-medium">
                      {header}
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <div className="flex-1">
                    <Label className="text-xs text-gray-500 mb-1">Patient Field</Label>
                    <Select
                      value={columnMapping[idx] || 'skip'}
                      onValueChange={(value) => {
                        setColumnMapping(prev => {
                          const newMapping = { ...prev };
                          if (value === 'skip') {
                            delete newMapping[idx];
                          } else {
                            newMapping[idx] = value;
                          }
                          return newMapping;
                        });
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="skip">
                          <span className="text-gray-400">Skip this column</span>
                        </SelectItem>
                        {Object.entries(FIELD_MAPPINGS).map(([key, field]) => (
                          <SelectItem key={key} value={key}>
                            {field.label} {field.required && <span className="text-red-500">*</span>}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <span className="text-red-500">*</span> = Required field
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Validation Results */}
      {validationErrors.length > 0 || validRecords.length > 0 ? (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Validation Results</CardTitle>
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
                      {validationErrors.map((error, idx) => (
                        <Alert key={idx} variant="destructive">
                          <AlertCircle className="w-4 h-4" />
                          <AlertDescription>
                            <span className="font-semibold">Row {error.row}</span> ({error.patient})
                            <ul className="mt-1 ml-4 list-disc text-sm">
                              {error.errors.map((err, errIdx) => (
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
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Import Complete</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-green-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-900">Successfully Imported</span>
                  </div>
                  <p className="text-2xl font-bold text-green-700">{importResults.success}</p>
                </div>

                <div className="p-4 bg-red-50 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="w-5 h-5 text-red-600" />
                    <span className="font-semibold text-red-900">Failed</span>
                  </div>
                  <p className="text-2xl font-bold text-red-700">{importResults.failed}</p>
                </div>
              </div>

              {importResults.errors.length > 0 && (
                <div>
                  <h3 className="font-semibold text-red-900 mb-3">Import Errors</h3>
                  <ScrollArea className="h-48 border rounded-lg p-4">
                    <div className="space-y-2">
                      {importResults.errors.map((error, idx) => (
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
                  setValidationErrors([]);
                  setValidRecords([]);
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
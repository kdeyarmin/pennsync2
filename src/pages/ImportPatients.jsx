import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  Zap,
  BarChart3
} from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { validatePatient, validatePhone, validateEmail, validateDate, SEVERITY } from "../components/utils/patientValidation";
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import ValidationSummary from "../components/import/ValidationSummary";
import AIValidationHelper from "../components/import/AIValidationHelper";
import ErrorCategoryAnalyzer from "../components/import/ErrorCategoryAnalyzer";
import BulkErrorResolver from "../components/import/BulkErrorResolver";
import ImportAnalyticsDashboard from "../components/import/ImportAnalyticsDashboard";
import ImportReportGenerator from "../components/import/ImportReportGenerator";
import DuplicateDetector from "../components/import/DuplicateDetector";
import ErrorPatternAnalyzer from "../components/import/ErrorPatternAnalyzer";
import AutoCorrector from "../components/import/AutoCorrector";
import AIErrorInterpreter from "../components/import/AIErrorInterpreter";

const REQUIRED_FIELDS = ['first_name', 'last_name'];

const FIELD_MAPPINGS = {
  // Patient basic info
  'first_name': { label: 'First Name', type: 'string', required: true, aliases: ['patient_first_name', 'patient', 'firstname', 'fname'] },
  'last_name': { label: 'Last Name', type: 'string', required: true, aliases: ['patient_last_name', 'lastname', 'lname', 'patientlastname'] },
  'middle_name': { label: 'Middle Name', type: 'string' },
  'date_of_birth': { label: 'Date of Birth', type: 'date', format: 'MM/DD/YYYY', aliases: ['dob'] },
  'medical_record_number': { label: 'Medical Record Number', type: 'string', aliases: ['mrn'] },
  'phone': { label: 'Phone Number', type: 'string' },
  'email': { label: 'Email', type: 'email' },
  'address': { label: 'Address', type: 'string' },
  'gender': { label: 'Gender', type: 'string' },
  'payor': { label: 'Payor', type: 'string', aliases: ['primary_payor', 'insurance_type', 'payer'] },
  'living_situation': { label: 'Living Situation', type: 'enum', options: ['home', 'personal_care_home', 'assisted_living', 'group_home', 'alone', 'with_family'], aliases: ['organization_type'] },
  
  // Emergency contact
  'emergency_contact_name': { label: 'Emergency Contact Name', type: 'string', aliases: ['emergency_name'] },
  'emergency_contact_phone': { label: 'Emergency Contact Phone', type: 'string', aliases: ['emergency_phone'] },
  'emergency_contact_relationship': { label: 'Emergency Contact Relationship', type: 'string', aliases: ['emergency_relationship'] },
  
  // Physician info
  'physician_name': { label: 'Physician Name', type: 'string', aliases: ['physician', 'doctor_name', 'md_name', 'physician_name'] },
  'physician_phone': { label: 'Physician Phone', type: 'string', aliases: ['doctor_phone', 'md_phone'] },
  'physician_email': { label: 'Physician Email', type: 'email', aliases: ['doctor_email'] },
  
  // Caregiver info
  'caregiver_name': { label: 'Caregiver Name', type: 'string' },
  'caregiver_phone': { label: 'Caregiver Phone', type: 'string' },
  'caregiver_email': { label: 'Caregiver Email', type: 'email' },
  
  // Medical info
  'primary_diagnosis': { label: 'Primary Diagnosis', type: 'string', aliases: ['diagnosis', 'dx', 'primary_diagnosis'] },
  'secondary_diagnoses': { label: 'Secondary Diagnoses', type: 'string', aliases: ['secondary_dx', 'other_diagnoses', 'secondary_diagnosis'] },
  'allergies': { label: 'Allergies', type: 'string', aliases: ['allergy'] },
  'icd_code': { label: 'ICD Code', type: 'string', aliases: ['icd10_code', 'diagnosis_code'] },
  
  // Admission info
  'admission_date': { label: 'Admission Date', type: 'date', format: 'MM/DD/YYYY', aliases: ['admitted_date', 'soc_date', 'start_of_care', 'admitted_date'] },
  'discharge_date': { label: 'Discharge Date', type: 'date', format: 'MM/DD/YYYY' },
  'admission_source': { label: 'Admission Source', type: 'enum', options: ['home', 'hospital', 'skilled_nursing_facility', 'rehab', 'other'] },
  'discharge_disposition': { label: 'Discharge Disposition', type: 'enum', options: ['home', 'hospital', 'skilled_nursing_facility', 'deceased', 'other'] },
  'care_type': { label: 'Care Type', type: 'enum', options: ['home_health', 'hospice'], aliases: ['organization_type', 'service_type'] },
  'status': { label: 'Status', type: 'enum', options: ['active', 'discharged', 'hospitalized'], aliases: ['current_admission_status', 'patient_status'] },
  
  // Insurance
  'insurance_primary_provider': { label: 'Primary Insurance Provider', type: 'string', aliases: ['primary_insurance'] },
  'insurance_primary_policy': { label: 'Primary Insurance Policy Number', type: 'string', aliases: ['policy_number', 'policy_no'] },
  'insurance_secondary_provider': { label: 'Secondary Insurance Provider', type: 'string', aliases: ['secondary_insurance'] }

};

// Columns to skip/ignore
const SKIP_COLUMNS = ['company', 'top_unit', 'parent_unit', 'sub_unit', 'branch_name', 'patient_team_name', 'branch_na', 'patient_tea'];

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
  const [selectedErrorIndices, setSelectedErrorIndices] = useState([]);
  const [showBulkResolver, setShowBulkResolver] = useState(false);
  const [importHistory, setImportHistory] = useState([]);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showDuplicateCheck, setShowDuplicateCheck] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [editingRow, setEditingRow] = useState(null);
  const [editedData, setEditedData] = useState({});
  
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
      
      try {
        // Use bulk create to avoid rate limiting
        const createdPatients = await base44.entities.Patient.bulkCreate(patients);
        results.success = createdPatients.length;
        setImportProgress(100);
      } catch (error) {
        // If bulk create fails, fall back to individual creates with enhanced error tracking
        for (let i = 0; i < patients.length; i++) {
          try {
            await base44.entities.Patient.create(patients[i]);
            results.success++;
          } catch (error) {
            results.failed++;
            const errorMsg = error.message || 'Unknown error occurred';
            
            // Enhanced context-specific error messages and suggestions
            let suggestion = 'Review and correct the data before re-importing.';
            let contextualHelp = '';
            
            if (errorMsg.toLowerCase().includes('duplicate')) {
              suggestion = 'This patient may already exist in the system.';
              contextualHelp = `Check patient: ${patients[i].first_name} ${patients[i].last_name}${patients[i].medical_record_number ? ` (MRN: ${patients[i].medical_record_number})` : ''}. Consider updating the existing record instead.`;
            } else if (errorMsg.toLowerCase().includes('required') || errorMsg.toLowerCase().includes('missing')) {
              const missingFields = [];
              if (!patients[i].first_name) missingFields.push('First Name');
              if (!patients[i].last_name) missingFields.push('Last Name');
              
              suggestion = `Missing required field(s): ${missingFields.join(', ')}`;
              contextualHelp = 'These fields are mandatory for all patient records. Please ensure they are filled in your CSV file.';
            } else if (errorMsg.toLowerCase().includes('invalid') || errorMsg.toLowerCase().includes('format')) {
              suggestion = 'One or more fields have invalid format.';
              contextualHelp = 'Check: dates (YYYY-MM-DD), emails (user@domain.com), phone numbers (10 digits), and enum values match allowed options.';
            } else if (errorMsg.toLowerCase().includes('validation')) {
              suggestion = 'Data validation failed.';
              contextualHelp = 'Review the patient data for consistency: age calculations, date sequences, phone/email formats.';
            }
            
            results.errors.push({
              row: i + 1,
              patient: `${patients[i].first_name || 'Unknown'} ${patients[i].last_name || 'Patient'}`,
              error: errorMsg,
              suggestion: suggestion,
              contextualHelp: contextualHelp,
              patientData: {
                first_name: patients[i].first_name,
                last_name: patients[i].last_name,
                date_of_birth: patients[i].date_of_birth,
                medical_record_number: patients[i].medical_record_number
              }
            });
            results.failedRecords.push({
              ...patients[i],
              error_description: errorMsg,
              error_suggestion: suggestion,
              contextual_help: contextualHelp,
              original_row: i + 1
            });
          }
          setImportProgress(Math.round(((i + 1) / patients.length) * 100));
        }
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
      
      // Normalize function for consistent header/alias comparison
      const normalize = (str) => {
        return str.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      };

      // Auto-map columns based on header names
      const autoMapping = {};
      headers.forEach((header, idx) => {
        const normalizedHeader = normalize(header);
        
        // Skip columns that should be ignored
        if (SKIP_COLUMNS.some(skip => normalize(skip) === normalizedHeader)) {
          return;
        }
        
        // Try exact match with field key
        for (const fieldKey in FIELD_MAPPINGS) {
          if (normalize(fieldKey) === normalizedHeader) {
            autoMapping[idx] = fieldKey;
            return;
          }
        }
        
        // Try alias matches
        for (const fieldKey in FIELD_MAPPINGS) {
          const field = FIELD_MAPPINGS[fieldKey];
          if (field.aliases && field.aliases.some(alias => normalize(alias) === normalizedHeader)) {
            autoMapping[idx] = fieldKey;
            return;
          }
        }
        
        // Try partial matches (less strict)
        for (const fieldKey in FIELD_MAPPINGS) {
          const normalizedFieldKey = normalize(fieldKey);
          if (normalizedHeader.includes(normalizedFieldKey) || normalizedFieldKey.includes(normalizedHeader)) {
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
        const columnHeader = csvData.headers[colIndex]; // Track original column header

        if (value) {
          // Enhanced type validation with detailed suggestions
          if (field.type === 'email') {
            const emailError = validateEmail(value);
            if (emailError && emailError.severity === SEVERITY.ERROR) {
              rowErrors.push({
                field: field.label,
                columnHeader: columnHeader,
                columnIndex: parseInt(colIndex) + 1,
                value: value,
                error: emailError.message,
                suggestion: emailError.suggestion || `Correct format: name@example.com`
              });
            }
          }
          
          if (field.type === 'date') {
            const dateError = validateDate(value, fieldKey);
            if (dateError && dateError.severity === SEVERITY.ERROR) {
              rowErrors.push({
                field: field.label,
                columnHeader: columnHeader,
                columnIndex: parseInt(colIndex) + 1,
                value: value,
                error: dateError.message,
                suggestion: dateError.suggestion || `Required format: MM/DD/YYYY (e.g., 01/15/2024)`
              });
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
                rowErrors.push({
                  field: field.label,
                  value: value,
                  error: `Invalid value for ${field.label}`,
                  suggestion: `Must be one of: ${field.options.join(', ')}`
                });
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
              rowErrors.push({
                field: field.label,
                columnHeader: columnHeader,
                columnIndex: parseInt(colIndex) + 1,
                value: value,
                error: `Invalid value for ${field.label}`,
                suggestion: `Must be one of: ${field.options.join(', ')}`
              });
            }
          } else if (field.type === 'enum') {
            patient[fieldKey] = value.toLowerCase();
          } else {
            // Phone validation
            if (fieldKey === 'phone' || fieldKey === 'emergency_contact_phone' || fieldKey === 'physician_phone') {
              const phoneError = validatePhone(value);
              if (phoneError) {
                rowErrors.push({
                  field: field.label,
                  columnHeader: columnHeader,
                  columnIndex: parseInt(colIndex) + 1,
                  value: value,
                  error: phoneError.message,
                  suggestion: `Valid formats: (555) 123-4567, 555-123-4567, or 5551234567`
                });
              }
            }
            
            // Handle special field mappings
            if (fieldKey === 'insurance_primary_provider') {
              if (!patient.insurance_primary) patient.insurance_primary = {};
              patient.insurance_primary.provider = value;
            } else if (fieldKey === 'insurance_primary_policy') {
              if (!patient.insurance_primary) patient.insurance_primary = {};
              patient.insurance_primary.policy_number = value;
            } else if (fieldKey === 'insurance_secondary_provider') {
              if (!patient.insurance_secondary) patient.insurance_secondary = {};
              patient.insurance_secondary.provider = value;
            } else if (fieldKey === 'secondary_diagnoses') {
              // Parse comma-separated secondary diagnoses into array
              patient.secondary_diagnoses = value.split(/[,;]/).map(d => d.trim()).filter(d => d);
            } else if (fieldKey === 'icd_code') {
              // Store ICD code but don't overwrite primary_diagnosis
              patient.icd_code = value;
            } else if (fieldKey === 'living_situation') {
              // Map organization type to living situation in social_history
              const valueLower = value.toLowerCase();
              let livingSituation = 'alone';
              if (valueLower.includes('personal care') || valueLower.includes('pch')) {
                livingSituation = 'assisted_living';
              } else if (valueLower.includes('home') || valueLower.includes('residence')) {
                livingSituation = 'alone';
              } else if (valueLower.includes('family')) {
                livingSituation = 'with_family';
              } else if (valueLower.includes('group')) {
                livingSituation = 'group_home';
              }
              if (!patient.social_history) patient.social_history = {};
              patient.social_history.living_situation = livingSituation;
            } else {
              patient[fieldKey] = value;
            }
          }
        }
      });

      // Comprehensive patient validation
      const validationResults = validatePatient(patient, { skipWarnings: false });

      // Only add blocking errors with detailed info
      const blockingErrors = validationResults.filter(v => v.severity === SEVERITY.ERROR);
      blockingErrors.forEach(err => {
        // Try to find the column header for this field
        const fieldKey = Object.keys(FIELD_MAPPINGS).find(key => 
          FIELD_MAPPINGS[key].label === err.field || key === err.field
        );
        const colIndex = Object.entries(columnMapping).find(([_, fKey]) => fKey === fieldKey)?.[0];
        const columnHeader = colIndex ? csvData.headers[colIndex] : null;

        rowErrors.push({
          field: err.field || 'General',
          columnHeader: columnHeader || 'N/A',
          columnIndex: colIndex ? parseInt(colIndex) + 1 : null,
          value: err.value || '',
          error: err.message,
          suggestion: err.suggestion || 'Please review and correct this field'
        });
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

  const handleDuplicateResolution = async (resolutionResults) => {
    setImportProgress(0);
    const startTime = Date.now();
    const results = { success: 0, failed: 0, errors: [], failedRecords: [] };
    let processed = 0;
    const total = resolutionResults.added.length + resolutionResults.updated.length + resolutionResults.closed.length;

    // Add new patients using bulk create to avoid rate limiting
    if (resolutionResults.added.length > 0) {
      try {
        const created = await base44.entities.Patient.bulkCreate(resolutionResults.added);
        results.success += created.length;
        processed += resolutionResults.added.length;
        setImportProgress(Math.round((processed / total) * 100));
      } catch (error) {
        // Fall back to individual creates with delay if bulk fails
        for (const patient of resolutionResults.added) {
          try {
            await base44.entities.Patient.create(patient);
            results.success++;
          } catch (error) {
            results.failed++;
            results.errors.push({
              patient: `${patient.first_name} ${patient.last_name}`,
              error: error.message
            });
          }
          processed++;
          setImportProgress(Math.round((processed / total) * 100));
          // Small delay to prevent rate limiting
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }
    }

    // Update existing patients with small delays
    for (const update of resolutionResults.updated) {
      try {
        await base44.entities.Patient.update(update.id, update.data);
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          patient: `${update.data.first_name} ${update.data.last_name}`,
          error: error.message
        });
      }
      processed++;
      setImportProgress(Math.round((processed / total) * 100));
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Close patients (set status to discharged) with small delays
    for (const patientId of resolutionResults.closed) {
      try {
        await base44.entities.Patient.update(patientId, { status: 'discharged' });
        results.success++;
      } catch (error) {
        results.failed++;
        results.errors.push({
          patient: patientId,
          error: error.message
        });
      }
      processed++;
      setImportProgress(Math.round((processed / total) * 100));
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    const resolutionTime = (Date.now() - startTime) / 1000;
    const historyEntry = {
      ...results,
      timestamp: new Date().toISOString(),
      resolutionTime,
      totalRecords: total
    };
    setImportHistory(prev => [...prev, historyEntry]);
    
    setImportResults(results);
    setShowDuplicateCheck(false);
    queryClient.invalidateQueries({ queryKey: ['patients'] });
  };

  const handleImport = async () => {
    if (validRecords.length === 0) {
      alert('No valid records to import');
      return;
    }

    // Show confirmation dialog
    setShowConfirmDialog(true);
  };

  const confirmImport = () => {
    setShowConfirmDialog(false);
    setShowDuplicateCheck(true);
  };

  const quickFixError = (errorIdx, field) => {
    const error = validationErrors[errorIdx];
    const rowIndex = error.row - 1;
    const row = csvData.rows[rowIndex];
    
    // Find column index for this field
    const colIdx = Object.entries(columnMapping).find(([_, fKey]) => 
      FIELD_MAPPINGS[fKey].label === field
    )?.[0];
    
    if (colIdx === undefined) return;
    
    const value = row[colIdx]?.trim();
    const fieldKey = columnMapping[colIdx];
    
    // Apply auto-fixes
    let fixedValue = value;
    if (fieldKey.includes('phone') && value) {
      fixedValue = value.replace(/\D/g, '').slice(-10);
      if (fixedValue.length === 10) {
        fixedValue = `(${fixedValue.slice(0,3)}) ${fixedValue.slice(3,6)}-${fixedValue.slice(6)}`;
      }
    } else if (FIELD_MAPPINGS[fieldKey].type === 'email' && value) {
      fixedValue = value.toLowerCase().trim();
    }
    
    // Update CSV data
    const newRows = [...csvData.rows];
    newRows[rowIndex][colIdx] = fixedValue;
    setCsvData({ ...csvData, rows: newRows });
    
    // Re-validate
    setTimeout(() => validateData(), 100);
  };

  const handleBulkResolve = async (resolution) => {
    // Apply resolution based on mode
    if (resolution.mode === 'skip') {
      // Remove selected error rows from validation errors
      const newErrors = validationErrors.filter((_, idx) => !resolution.selectedIndices.includes(idx));
      setValidationErrors(newErrors);
      setShowBulkResolver(false);
      setSelectedErrorIndices([]);
    } else if (resolution.mode === 'apply_defaults') {
      // Apply default values and re-validate
      alert('Default values applied. Please re-validate the data.');
      setShowBulkResolver(false);
      setSelectedErrorIndices([]);
    } else if (resolution.mode === 'manual_fix') {
      // Apply manual fixes - would need CSV data update logic
      alert('Manual fixes will be applied on next validation.');
      setShowBulkResolver(false);
      setSelectedErrorIndices([]);
    }
  };

  const downloadTemplate = () => {
    const headers = [
      'first_name', 'last_name', 'middle_name', 'date_of_birth', 'medical_record_number',
      'phone', 'email', 'address', 'payor',
      'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship',
      'physician_name', 'physician_phone', 'physician_email',
      'caregiver_name', 'caregiver_phone', 'caregiver_email',
      'primary_diagnosis', 'secondary_diagnoses', 'allergies', 'icd_code',
      'admission_date', 'discharge_date', 'admission_source', 'care_type', 'status',
      'insurance_primary_provider', 'insurance_primary_policy', 'insurance_secondary_provider'
    ];
    const sampleRow = [
      'John', 'Doe', 'A', '1950-05-20', '12345',
      '555-123-4567', 'john.doe@email.com', '123 Main St, City, ST 12345', 'Medicare',
      'Jane Doe', '555-987-6543', 'Spouse',
      'Dr. Smith', '555-111-2222', 'dr.smith@clinic.com',
      'Mary Johnson', '555-333-4444', 'mary.j@email.com',
      'Congestive Heart Failure', 'Hypertension, Type 2 Diabetes', 'NKDA', 'I50.9',
      '2024-01-15', '', 'hospital', 'home_health', 'active',
      'Medicare Part A', 'MB123456789', 'Blue Cross'
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
    if (!importResults?.failedRecords || importResults.failedRecords.length === 0) {
      alert('No failed records to re-import');
      return;
    }

    // Convert failed records back to CSV format
    const failedRecordsCSV = convertRecordsToCSV(importResults.failedRecords);
    
    // Parse the CSV data
    const { headers, rows } = parseCSV(failedRecordsCSV);
    
    // Reset state and pre-load failed records
    setFile(null);
    setCsvData({ headers, rows });
    setImportResults(null);
    setImportProgress(0);
    setShowPreview(false);
    setValidationErrors([]);
    setValidRecords([]);
    
    // Auto-map columns
    const autoMapping = {};
    headers.forEach((header, idx) => {
      const normalize = (str) => str.trim().toLowerCase().replace(/[^a-z0-9]/g, '');
      const normalizedHeader = normalize(header);
      
      for (const fieldKey in FIELD_MAPPINGS) {
        if (normalize(fieldKey) === normalizedHeader) {
          autoMapping[idx] = fieldKey;
          break;
        }
      }
    });
    
    setColumnMapping(autoMapping);
    validateMapping(autoMapping);
    
    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const convertRecordsToCSV = (records) => {
    const fieldKeys = Object.keys(FIELD_MAPPINGS).filter(key => !key.includes('insurance_')); // Simplified fields
    const headers = fieldKeys.join(',');
    
    const rows = records.map(record => {
      return fieldKeys.map(key => {
        let value = record[key] || '';
        
        // Handle special fields
        if (key === 'secondary_diagnoses' && Array.isArray(value)) {
          value = value.join('; ');
        } else if (typeof value === 'object') {
          value = JSON.stringify(value);
        }
        
        // Escape CSV values
        value = String(value);
        if (value.includes(',') || value.includes('"') || value.includes('\n')) {
          value = `"${value.replace(/"/g, '""')}"`;
        }
        
        return value;
      }).join(',');
    });
    
    return headers + '\n' + rows.join('\n');
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

      {/* Download Template & Analytics Toggle */}
      <div className="grid md:grid-cols-2 gap-4 mb-6">
        <Card>
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

        <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
          <CardHeader>
            <CardTitle className="text-lg">Import Analytics</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-600 mb-4">
              View detailed analytics and success metrics
            </p>
            <Button 
              onClick={() => setShowAnalytics(!showAnalytics)}
              variant="outline"
              className="border-purple-300"
            >
              <BarChart3 className="w-4 h-4 mr-2" />
              {showAnalytics ? 'Hide' : 'Show'} Analytics
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Import Analytics Dashboard */}
      {showAnalytics && importHistory.length > 0 && (
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-xl flex items-center gap-2">
              <BarChart3 className="w-6 h-6 text-purple-600" />
              Import Analytics Dashboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ImportAnalyticsDashboard importHistory={importHistory} />
          </CardContent>
        </Card>
      )}

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
              Step 2: Map Columns {importResults?.failedRecords && '(Retry Mode - Failed Records Loaded)'}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {importResults?.failedRecords && (
              <Alert className="bg-orange-50 border-orange-300 mb-4">
                <AlertCircle className="w-4 h-4 text-orange-600" />
                <AlertDescription className="text-orange-900">
                  <strong>Retry Mode Active:</strong> {importResults.failedRecords.length} previously failed record(s) loaded. 
                  Review and correct the errors before re-validating.
                </AlertDescription>
              </Alert>
            )}
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
                            const normalizedHeader = header.trim().toLowerCase().replace(/[^a-z0-9_]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
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

            {/* Auto-Corrector */}
            <div className="mt-4">
              <AutoCorrector
                csvData={csvData}
                columnMapping={columnMapping}
                onCorrectedData={(correctedData) => {
                  setCsvData(correctedData);
                }}
              />
            </div>

            {/* Real-time Validation Preview */}
            {Object.keys(columnMapping).length > 0 && (
              <Card className="mt-4 border-purple-200 bg-purple-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <Eye className="w-4 h-4" />
                    Live Validation Preview (First 5 Rows)
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {csvData.rows.slice(0, 5).map((row, rowIdx) => {
                      const rowIssues = [];
                      
                      Object.entries(columnMapping).forEach(([colIdx, fieldKey]) => {
                        const value = row[colIdx]?.trim() || '';
                        const field = FIELD_MAPPINGS[fieldKey];

                        if (field.required && !value) {
                          rowIssues.push({ field: field.label, error: 'Required field is empty' });
                        } else if (value) {
                          if (field.type === 'email') {
                            const err = validateEmail(value);
                            if (err?.severity === SEVERITY.ERROR) rowIssues.push({ field: field.label, error: err.message, fix: err.suggestion });
                          } else if (field.type === 'date') {
                            const err = validateDate(value, fieldKey);
                            if (err?.severity === SEVERITY.ERROR) rowIssues.push({ field: field.label, error: err.message, fix: err.suggestion });
                          } else if (fieldKey.includes('phone')) {
                            const err = validatePhone(value);
                            if (err?.severity === SEVERITY.ERROR) rowIssues.push({ field: field.label, error: err.message, fix: err.suggestion });
                          }
                        }
                      });

                      return (
                        <div key={rowIdx} className={`p-3 rounded-lg border text-xs ${
                          rowIssues.length > 0 ? 'bg-red-50 border-red-300' : 'bg-white border-green-300'
                        }`}>
                          <div className="flex items-center justify-between mb-2">
                            <p className="font-semibold text-gray-700">Row {rowIdx + 1}</p>
                            {rowIssues.length > 0 ? (
                              <Badge variant="destructive" className="text-xs">{rowIssues.length} issue{rowIssues.length > 1 ? 's' : ''}</Badge>
                            ) : (
                              <Badge className="bg-green-100 text-green-800 text-xs">✓ Valid</Badge>
                            )}
                          </div>

                          {rowIssues.length > 0 && (
                            <div className="mb-2 p-2 bg-red-100 rounded border border-red-200">
                              {rowIssues.map((issue, idx) => (
                                <div key={idx} className="mb-1 last:mb-0">
                                  <p className="text-red-800 font-medium">• {issue.field}: {issue.error}</p>
                                  {issue.fix && <p className="text-xs text-green-700 ml-4">→ {issue.fix}</p>}
                                </div>
                              ))}
                            </div>
                          )}

                          <div className="grid grid-cols-2 gap-2">
                            {Object.entries(columnMapping).map(([colIdx, fieldKey]) => {
                              const value = row[colIdx]?.trim() || '';
                              const field = FIELD_MAPPINGS[fieldKey];
                              const hasError = rowIssues.some(i => i.field === field.label);

                              return (
                                <div key={fieldKey} className={`p-2 rounded ${hasError ? 'bg-red-100 border border-red-300' : 'bg-gray-50'}`}>
                                  <p className="text-xs font-medium">{field.label}{field.required && <span className="text-red-500">*</span>}</p>
                                  <p className={`mt-1 ${hasError ? 'text-red-700 font-medium' : 'text-gray-900'}`}>
                                    {value || <span className="text-gray-400 italic">empty</span>}
                                  </p>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <p className="text-xs text-gray-600 mt-3 text-center">
                    Issues shown here will be flagged during validation
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Mapping Confirmation Summary */}
            {Object.keys(columnMapping).length > 0 && (
              <Card className="mt-4 border-blue-200 bg-blue-50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    Column Mapping Summary
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    {Object.entries(columnMapping).map(([colIdx, fieldKey]) => (
                      <div key={colIdx} className="flex items-center gap-2 p-2 bg-white rounded">
                        <span className="text-gray-600">{csvData.headers[colIdx]}</span>
                        <ArrowRight className="w-3 h-3 text-blue-500" />
                        <span className="font-medium text-blue-900">{FIELD_MAPPINGS[fieldKey].label}</span>
                        {FIELD_MAPPINGS[fieldKey].required && <span className="text-red-500">*</span>}
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

          {/* Error Analysis & Resolution Tools */}
          {validationErrors.length > 0 && (
          <>
          {/* AI Error Interpreter */}
          <div className="mb-6">
            <AIErrorInterpreter
              errors={validationErrors}
              onApplySuggestions={(suggestions) => {
                console.log('Apply AI suggestions:', suggestions);
              }}
            />
          </div>

          {/* Error Pattern Analysis */}
          <div className="mb-6">
            <ErrorPatternAnalyzer validationErrors={validationErrors} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
            {/* Error Category Analyzer */}
            <ErrorCategoryAnalyzer
              validationErrors={validationErrors}
              onSelectErrors={(indices) => {
                setSelectedErrorIndices(indices);
                setShowBulkResolver(true);
              }}
            />

            {/* AI Validation Helper */}
            <AIValidationHelper
              validationErrors={validationErrors}
              onApplySuggestions={(suggestions) => {
                console.log('Apply suggestions:', suggestions);
              }}
            />
          </div>
          </>
          )}

          {/* Bulk Error Resolver */}
          {showBulkResolver && selectedErrorIndices.length > 0 && (
            <div className="mb-6">
              <BulkErrorResolver
                selectedErrors={selectedErrorIndices}
                validationErrors={validationErrors}
                onResolve={handleBulkResolve}
                onCancel={() => {
                  setShowBulkResolver(false);
                  setSelectedErrorIndices([]);
                }}
              />
            </div>
          )}

          {/* Import Report Generator */}
          <div className="mb-6">
            <ImportReportGenerator
              importHistory={importHistory}
              validRecords={validRecords}
              validationErrors={validationErrors}
              importResults={importResults}
            />
          </div>

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
                            <div className="space-y-3">
                              <div className="flex items-center justify-between">
                                <span className="font-semibold text-base">Row {error.row}</span>
                                <Badge variant="outline" className="bg-red-100 text-red-800">
                                  {error.patient}
                                </Badge>
                              </div>
                              <div className="space-y-2">
                                {(error.errors || []).map((err, errIdx) => {
                                  const isDetailed = typeof err === 'object';
                                  const canQuickFix = isDetailed && (
                                    err.field.includes('Phone') || 
                                    err.field.includes('Email') ||
                                    err.field.includes('Date')
                                  );

                                  return (
                                    <div key={errIdx} className="bg-red-50 border border-red-200 rounded-lg p-3">
                                      {isDetailed ? (
                                        <>
                                          <div className="flex items-start justify-between gap-2 mb-2">
                                            <div>
                                              <span className="font-semibold text-sm text-red-900">
                                                {err.field}
                                              </span>
                                              {err.columnHeader && (
                                                <div className="text-xs text-gray-600 mt-0.5">
                                                  CSV Column: "{err.columnHeader}" {err.columnIndex && `(Column ${err.columnIndex})`}
                                                </div>
                                              )}
                                            </div>
                                            {err.value && (
                                              <Badge variant="outline" className="text-xs bg-white">
                                                "{err.value}"
                                              </Badge>
                                            )}
                                          </div>
                                          <p className="text-sm text-red-800 mb-2">
                                            ❌ {err.error}
                                          </p>
                                          {err.suggestion && (
                                            <div className="space-y-2">
                                              <p className="text-xs text-green-700 bg-green-50 p-2 rounded border border-green-200">
                                                💡 <strong>Fix:</strong> {err.suggestion}
                                              </p>
                                              {canQuickFix && (
                                                <Button
                                                  size="sm"
                                                  variant="outline"
                                                  className="text-xs h-7"
                                                  onClick={() => quickFixError(idx, err.field)}
                                                >
                                                  <RefreshCw className="w-3 h-3 mr-1" />
                                                  Quick Fix
                                                </Button>
                                              )}
                                            </div>
                                          )}
                                        </>
                                      ) : (
                                        <p className="text-sm text-red-800">❌ {err}</p>
                                      )}
                                    </div>
                                  );
                                 })}
                              </div>
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
              {validRecords.length > 0 && !showDuplicateCheck && (
                <div className="pt-4 border-t">
                  <Button
                    onClick={handleImport}
                    disabled={importPatientsMutation.isPending || (!skipErrors && validationErrors.length > 0)}
                    className="w-full bg-blue-600 hover:bg-blue-700"
                    size="lg"
                  >
                    <Users className="w-4 h-4 mr-2" />
                    Check for Duplicates & Import {validRecords.length} Records
                  </Button>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        </>
      )}

      {/* Duplicate Detection */}
      {showDuplicateCheck && validRecords.length > 0 && (
        <div className="mb-6">
          <DuplicateDetector
            patients={validRecords}
            onResolve={handleDuplicateResolution}
          />
        </div>
      )}

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-blue-600" />
              Confirm Import
            </DialogTitle>
            <DialogDescription>
              Please review the import summary before proceeding
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                <p className="text-sm text-green-600 font-medium mb-1">Valid Records</p>
                <p className="text-3xl font-bold text-green-700">{validRecords.length}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-200">
                <p className="text-sm text-red-600 font-medium mb-1">Records with Errors</p>
                <p className="text-3xl font-bold text-red-700">{validationErrors.length}</p>
              </div>
            </div>

            <Alert className="bg-blue-50 border-blue-200">
              <AlertDescription className="text-sm text-blue-900">
                <strong>What will happen:</strong>
                <ul className="list-disc ml-4 mt-2 space-y-1">
                  <li>System will check for duplicate patients</li>
                  <li>{validRecords.length} valid record{validRecords.length !== 1 ? 's' : ''} will be processed</li>
                  {skipErrors && validationErrors.length > 0 && (
                    <li className="text-orange-700">{validationErrors.length} record{validationErrors.length !== 1 ? 's' : ''} with errors will be skipped</li>
                  )}
                </ul>
              </AlertDescription>
            </Alert>

            {validationErrors.length > 0 && !skipErrors && (
              <Alert variant="destructive">
                <AlertCircle className="w-4 h-4" />
                <AlertDescription className="text-sm">
                  You have {validationErrors.length} record{validationErrors.length !== 1 ? 's' : ''} with errors. 
                  Please resolve errors or enable "Skip rows with errors" to proceed.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowConfirmDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={confirmImport}
              disabled={!skipErrors && validationErrors.length > 0}
              className="bg-blue-600 hover:bg-blue-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Proceed to Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
                        💡 <strong>Quick Fix Options:</strong>
                        <ul className="list-disc ml-4 mt-2 space-y-1">
                          <li><strong>Option 1:</strong> Click "Retry Import - Failed Rows Only" below to automatically reload failed records for correction</li>
                          <li><strong>Option 2:</strong> Download failed rows CSV, fix errors in Excel/Sheets, then upload the corrected file</li>
                        </ul>
                      </AlertDescription>
                    </Alert>

                    <ScrollArea className="h-48 border rounded-lg p-4">
                      <div className="space-y-3">
                        {(importResults.errors || []).map((error, idx) => (
                          <Alert key={idx} variant="destructive">
                            <AlertDescription>
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-base">
                                    {error.row ? `Row ${error.row}` : 'Import Error'}
                                  </span>
                                  <Badge variant="outline" className="bg-red-100 text-red-800">
                                    {error.patient}
                                  </Badge>
                                </div>
                                
                                {error.patientData && (
                                  <div className="text-xs text-gray-700 p-2 bg-gray-50 rounded border">
                                    <strong>Patient Info:</strong> {error.patientData.first_name} {error.patientData.last_name}
                                    {error.patientData.medical_record_number && ` | MRN: ${error.patientData.medical_record_number}`}
                                    {error.patientData.date_of_birth && ` | DOB: ${error.patientData.date_of_birth}`}
                                  </div>
                                )}

                                <div className="bg-red-50 border border-red-200 rounded p-3">
                                  <p className="text-sm text-red-900 mb-2">
                                    <strong>Error:</strong> {error.error}
                                  </p>
                                  
                                  <div className="space-y-2">
                                    <p className="text-xs text-orange-700 bg-orange-50 p-2 rounded border border-orange-200">
                                      <strong>Suggestion:</strong> {error.suggestion}
                                    </p>
                                    
                                    {error.contextualHelp && (
                                      <p className="text-xs text-blue-700 bg-blue-50 p-2 rounded border border-blue-200">
                                        💡 <strong>Context:</strong> {error.contextualHelp}
                                      </p>
                                    )}
                                  </div>
                                </div>
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
                  <div className="space-y-2">
                    <Button
                      onClick={handleReImportFailed}
                      className="w-full bg-orange-600 hover:bg-orange-700"
                    >
                      <RefreshCw className="w-4 h-4 mr-2" />
                      Retry Import - Failed Rows Only ({importResults.failed})
                    </Button>
                    <p className="text-xs text-center text-gray-600">
                      Failed records will be pre-loaded for correction and re-validation
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
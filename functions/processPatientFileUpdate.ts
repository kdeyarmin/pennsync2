import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    console.log('Starting processPatientFileUpdate function');
    const base44 = createClientFromRequest(req);
    
    console.log('Authenticating user...');
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    console.log('User authenticated:', user.email);

    const { file_url } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }
    console.log('File URL received:', file_url);

    // Fetch the file content
    console.log('Fetching file content...');
    const fileResponse = await fetch(file_url);
    const fileContent = await fileResponse.text();
    
    let uploadedPatients = [];

    // Check if it's a CSV file
    if (file_url.toLowerCase().endsWith('.csv') || fileContent.includes(',')) {
      console.log('Processing as CSV file...');
      
      // Parse CSV manually
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

      const lines = fileContent.split('\n').filter(line => line.trim());
      if (lines.length < 2) {
        return Response.json({ 
          error: 'CSV file must have at least a header row and one data row' 
        }, { status: 400 });
      }

      const headers = parseCSVLine(lines[0]).map(h => h.toLowerCase().trim());
      const rows = lines.slice(1).map(line => parseCSVLine(line));

      // Field mapping
      const fieldMap = {
        'first_name': ['first_name', 'firstname', 'fname', 'patient_first_name'],
        'last_name': ['last_name', 'lastname', 'lname', 'surname', 'patient_last_name', 'patient'],
        'middle_name': ['middle_name', 'middlename', 'mname'],
        'medical_record_number': ['medical_record_number', 'mrn', 'medical_record_no'],
        'date_of_birth': ['date_of_birth', 'dob', 'birth_date', 'birthdate'],
        'phone': ['phone', 'phone_number', 'telephone'],
        'email': ['email', 'email_address'],
        'address': ['address', 'street_address', 'home_address'],
        'emergency_contact_name': ['emergency_contact_name', 'emergency_name', 'emergency_contact'],
        'emergency_contact_phone': ['emergency_contact_phone', 'emergency_phone'],
        'emergency_contact_relationship': ['emergency_contact_relationship', 'emergency_relationship'],
        'physician_name': ['physician_name', 'physician', 'doctor_name', 'doctor'],
        'physician_phone': ['physician_phone', 'doctor_phone'],
        'physician_email': ['physician_email', 'doctor_email'],
        'caregiver_name': ['caregiver_name', 'caregiver'],
        'caregiver_phone': ['caregiver_phone'],
        'caregiver_email': ['caregiver_email'],
        'primary_diagnosis': ['primary_diagnosis', 'diagnosis', 'primary_dx', 'dx'],
        'allergies': ['allergies', 'allergy'],
        'admission_date': ['admission_date', 'admitted_date', 'admit_date', 'soc_date'],
        'status': ['status', 'patient_status', 'current_admission_status'],
        'care_type': ['care_type', 'service_type', 'organization_type'],
        'payor': ['payor', 'payer', 'primary_payor', 'insurance_type']
      };

      // Build column index map
      const colIndexMap = {};
      for (const [field, aliases] of Object.entries(fieldMap)) {
        for (let i = 0; i < headers.length; i++) {
          const header = headers[i].replace(/[^a-z0-9_]/g, '_');
          if (aliases.includes(header) || aliases.some(alias => header.includes(alias))) {
            colIndexMap[field] = i;
            break;
          }
        }
      }

      // Parse rows into patient objects
      for (const row of rows) {
        const patient = {};
        
        for (const [field, colIndex] of Object.entries(colIndexMap)) {
          const value = row[colIndex]?.trim();
          if (!value || value === '') continue;
          
          if (field === 'status') {
            const val = value.toLowerCase();
            patient.status = val.includes('active') ? 'active' : 
                            val.includes('discharge') ? 'discharged' : 
                            val.includes('hospital') ? 'hospitalized' : 'active';
          } else if (field === 'care_type') {
            const val = value.toLowerCase();
            patient.care_type = val.includes('hospice') ? 'hospice' : 'home_health';
          } else {
            patient[field] = value;
          }
        }
        
        if (patient.first_name || patient.last_name) {
          // Set default MRN if missing
          if (!patient.medical_record_number) {
            patient.medical_record_number = `TEMP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
          }
          uploadedPatients.push(patient);
        }
      }

      console.log('CSV parsed successfully:', uploadedPatients.length, 'patients');
    } else {
      // Use AI extraction for PDFs and images
      console.log('Extracting data using AI...');
      const extractResponse = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: 'object',
          properties: {
            patients: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  first_name: { type: 'string' },
                  middle_name: { type: 'string' },
                  last_name: { type: 'string' },
                  medical_record_number: { type: 'string' },
                  date_of_birth: { type: 'string' },
                  phone: { type: 'string' },
                  email: { type: 'string' },
                  address: { type: 'string' },
                  primary_diagnosis: { type: 'string' },
                  allergies: { type: 'string' },
                  status: { type: 'string' },
                  care_type: { type: 'string' }
                }
              }
            }
          }
        }
      });

      if (extractResponse.status !== 'success' || !extractResponse.output?.patients) {
        console.error('Extraction failed:', extractResponse);
        return Response.json({ 
          error: 'Failed to extract patient data from file',
          details: extractResponse.details 
        }, { status: 400 });
      }

      uploadedPatients = extractResponse.output.patients;
    }
    console.log('Extracted patients count:', uploadedPatients.length);
    
    const results = {
      processed: 0,
      created: 0,
      updated: 0,
      autoApplied: 0,
      pendingReview: 0,
      noChanges: 0,
      errors: [],
      changes: [],
      pendingChanges: []
    };

    // Get all existing patients
    console.log('Fetching existing patients...');
    const existingPatients = await base44.asServiceRole.entities.Patient.list();
    console.log('Existing patients count:', existingPatients.length);

    // Define critical fields that require approval
    const criticalFields = [
      'date_of_birth',
      'medical_record_number',
      'allergies',
      'primary_diagnosis',
      'physician_name',
      'physician_phone',
      'emergency_contact_name',
      'emergency_contact_phone'
    ];

    // Define fields that can be auto-updated
    const autoUpdateFields = [
      'phone',
      'email',
      'address',
      'caregiver_name',
      'caregiver_email',
      'caregiver_phone'
    ];

    for (const uploadedPatient of uploadedPatients) {
      results.processed++;
      console.log(`Processing patient ${results.processed}/${uploadedPatients.length}:`, uploadedPatient.first_name, uploadedPatient.last_name);

      try {
        // Find matching patient by MRN, or by name + DOB
        let matchingPatient = null;

        if (uploadedPatient.medical_record_number) {
          matchingPatient = existingPatients.find(p => 
            p.medical_record_number === uploadedPatient.medical_record_number
          );
        }

        if (!matchingPatient && uploadedPatient.first_name && uploadedPatient.last_name) {
          matchingPatient = existingPatients.find(p => 
            p.first_name?.toLowerCase() === uploadedPatient.first_name?.toLowerCase() &&
            p.last_name?.toLowerCase() === uploadedPatient.last_name?.toLowerCase() &&
            (!uploadedPatient.date_of_birth || p.date_of_birth === uploadedPatient.date_of_birth)
          );
        }

        if (!matchingPatient) {
          // Create new patient
          console.log('Creating new patient...');
          try {
            const newPatient = await base44.asServiceRole.entities.Patient.create(uploadedPatient);
            console.log('Patient created successfully:', newPatient.id);
            results.created++;
            
            // Log creation (non-blocking)
            try {
              await base44.asServiceRole.entities.SystemLog.create({
                job_name: 'Patient File Update',
                job_type: 'other',
                status: 'success',
                message: `Created new patient ${uploadedPatient.first_name} ${uploadedPatient.last_name}`,
                details: {
                  patient_id: newPatient.id,
                  uploaded_by: user.email,
                  file_url
                }
              });
            } catch (logError) {
              console.error('Failed to create system log:', logError);
            }
          } catch (error) {
            console.error('Error creating patient:', error);
            results.errors.push({
              patient: `${uploadedPatient.first_name} ${uploadedPatient.last_name}`,
              error: `Failed to create patient: ${error.message}`
            });
          }
          continue;
        }
        
        console.log('Found matching patient:', matchingPatient.id);

        // Compare and detect changes with intelligent merging
        const changes = {};
        const changeLog = [];
        const criticalChanges = [];
        const conflicts = [];

        for (const [key, value] of Object.entries(uploadedPatient)) {
          if (!value) continue; // Skip empty values
          
          const existingValue = matchingPatient[key];
          let hasChanges = false;
          let changeDetail = null;
          
          // Handle arrays (like medications, diagnoses)
          if (Array.isArray(value)) {
            const existingArray = existingValue || [];
            
            // Intelligent array merging - add new items, keep existing
            const mergedArray = [...existingArray];
            let addedItems = [];
            
            for (const item of value) {
              const itemStr = typeof item === 'object' ? JSON.stringify(item) : item;
              const exists = existingArray.some(existing => {
                const existingStr = typeof existing === 'object' ? JSON.stringify(existing) : existing;
                return existingStr === itemStr;
              });
              
              if (!exists) {
                mergedArray.push(item);
                addedItems.push(item);
              }
            }
            
            if (addedItems.length > 0) {
              hasChanges = true;
              changes[key] = mergedArray;
              changeDetail = {
                field: key,
                oldValue: existingArray,
                newValue: mergedArray,
                addedItems: addedItems,
                is_critical: criticalFields.includes(key)
              };
            }
          }
          // Handle objects (like insurance)
          else if (typeof value === 'object' && value !== null) {
            const existingObj = existingValue || {};
            const mergedObj = { ...existingObj, ...value };
            
            const hasObjectChanges = JSON.stringify(existingObj) !== JSON.stringify(mergedObj);
            
            if (hasObjectChanges) {
              hasChanges = true;
              changes[key] = mergedObj;
              changeDetail = {
                field: key,
                oldValue: existingObj,
                newValue: mergedObj,
                is_critical: criticalFields.includes(key)
              };
            }
          }
          // Handle primitives
          else if (existingValue !== value) {
            hasChanges = true;
            
            // Detect conflicts - if existing value is not empty and different
            if (existingValue && existingValue !== '(empty)' && existingValue !== value) {
              conflicts.push({
                field: key,
                existingValue,
                newValue: value,
                reason: 'Value exists but differs from uploaded data'
              });
            }
            
            changes[key] = value;
            changeDetail = {
              field: key,
              oldValue: existingValue || '(empty)',
              newValue: value,
              is_critical: criticalFields.includes(key)
            };
          }
          
          if (changeDetail) {
            changeLog.push(changeDetail);
            if (changeDetail.is_critical) {
              criticalChanges.push(changeDetail);
            }
          }
        }

        if (Object.keys(changes).length === 0) {
          results.noChanges++;
          continue;
        }

        // Determine change type and whether to auto-apply
        let changeType = 'minor';
        let requiresApproval = false;

        if (criticalChanges.length > 0) {
          changeType = 'critical';
          requiresApproval = true;
        } else if (conflicts.length > 0) {
          changeType = 'moderate';
          requiresApproval = true;
        } else if (Object.keys(changes).length > 5) {
          changeType = 'moderate';
          requiresApproval = true;
        }

        if (requiresApproval) {
          // Create pending update for review
          console.log('Creating pending update for review...');
          await base44.asServiceRole.entities.PendingPatientUpdate.create({
            patient_id: matchingPatient.id,
            source_file_url: file_url,
            change_type: changeType,
            field_changes: changeLog,
            proposed_updates: changes,
            status: 'pending',
            conflict_detected: conflicts.length > 0,
            conflict_details: conflicts.length > 0 ? JSON.stringify(conflicts) : null
          });

          results.pendingReview++;
          results.pendingChanges.push({
            patient: `${matchingPatient.first_name} ${matchingPatient.last_name}`,
            patientId: matchingPatient.id,
            changeCount: Object.keys(changes).length,
            changeType,
            criticalFieldCount: criticalChanges.length,
            conflictCount: conflicts.length,
            requiresReview: true
          });
        } else {
          // Auto-apply non-critical changes
          console.log('Auto-applying changes...');
          await base44.asServiceRole.entities.Patient.update(matchingPatient.id, changes);
          
          // Log as auto-applied
          await base44.asServiceRole.entities.PendingPatientUpdate.create({
            patient_id: matchingPatient.id,
            source_file_url: file_url,
            change_type: changeType,
            field_changes: changeLog,
            proposed_updates: changes,
            status: 'auto_applied',
            conflict_detected: false
          });
          
          results.autoApplied++;
          results.changes.push({
            patient: `${matchingPatient.first_name} ${matchingPatient.last_name}`,
            patientId: matchingPatient.id,
            changeCount: Object.keys(changes).length,
            changes: changeLog,
            autoApplied: true
          });
        }

        results.updated++;

        // Log the update (non-blocking)
        try {
          await base44.asServiceRole.entities.SystemLog.create({
            job_name: 'Patient File Update',
            job_type: 'other',
            status: 'success',
            message: `Updated ${changeLog.length} field(s) for patient ${matchingPatient.first_name} ${matchingPatient.last_name}`,
            details: {
              patient_id: matchingPatient.id,
              updated_by: user.email,
              changes: changeLog,
              file_url
            }
          });
        } catch (logError) {
          console.error('Failed to create system log:', logError);
        }

      } catch (error) {
        console.error('Error processing individual patient:', error);
        results.errors.push({
          patient: `${uploadedPatient.first_name || ''} ${uploadedPatient.last_name || ''}`,
          error: error.message,
          details: error.stack
        });
      }
    }

    console.log('Processing complete. Results:', results);
    return Response.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Error processing patient file update:', error);
    
    // Create a detailed error log
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.SystemLog.create({
        job_name: 'Patient File Update',
        job_type: 'other',
        status: 'error',
        message: `Failed to process patient file update: ${error.message}`,
        details: {
          error: error.message,
          stack: error.stack,
          timestamp: new Date().toISOString()
        }
      });
    } catch (logError) {
      console.error('Failed to log error:', logError);
    }
    
    return Response.json({ 
      success: false,
      error: 'Failed to process patient file',
      details: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});
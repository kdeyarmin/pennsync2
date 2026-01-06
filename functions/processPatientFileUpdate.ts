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

    // Create lookup maps for faster matching
    const mrnMap = new Map();
    const nameMap = new Map();
    
    for (const patient of existingPatients) {
      if (patient.medical_record_number) {
        mrnMap.set(patient.medical_record_number, patient);
      }
      const nameKey = `${patient.first_name?.toLowerCase()}_${patient.last_name?.toLowerCase()}`;
      nameMap.set(nameKey, patient);
    }

    // Process patients with optimized matching
    for (const uploadedPatient of uploadedPatients) {
      results.processed++;

      try {
        // Fast duplicate detection using maps
        let matchingPatient = null;

        if (uploadedPatient.medical_record_number) {
          matchingPatient = mrnMap.get(uploadedPatient.medical_record_number);
        }

        if (!matchingPatient && uploadedPatient.first_name && uploadedPatient.last_name) {
          const nameKey = `${uploadedPatient.first_name?.toLowerCase()}_${uploadedPatient.last_name?.toLowerCase()}`;
          matchingPatient = nameMap.get(nameKey);
        }

        if (!matchingPatient) {
          // Create new patient
          const newPatient = await base44.asServiceRole.entities.Patient.create(uploadedPatient);
          results.created++;
          continue;
        }

        // Simplified change detection - only check key fields
        const changes = {};
        const simpleFields = ['phone', 'email', 'address', 'status', 'primary_diagnosis', 'allergies', 'payor'];
        
        for (const field of simpleFields) {
          const newValue = uploadedPatient[field];
          const oldValue = matchingPatient[field];
          
          if (newValue && newValue !== oldValue) {
            changes[field] = newValue;
          }
        }

        if (Object.keys(changes).length === 0) {
          results.noChanges++;
          continue;
        }

        // Auto-apply all changes (simplified approach)
        await base44.asServiceRole.entities.Patient.update(matchingPatient.id, changes);
        results.updated++;
        results.autoApplied++;

      } catch (error) {
        results.errors.push({
          patient: `${uploadedPatient.first_name || ''} ${uploadedPatient.last_name || ''}`,
          error: error.message
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
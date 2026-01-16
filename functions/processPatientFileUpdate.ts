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
        'discharge_date': ['discharge_date', 'discharged_date', 'discharge_date_time'],
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
        
        // Only include patients with required fields
        if (patient.first_name && patient.last_name) {
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

    // Track which existing patients were matched in the upload
    const matchedPatientIds = new Set();

    // Process patients with enhanced matching
    for (const uploadedPatient of uploadedPatients) {
      results.processed++;

      try {
        let matchingPatient = null;

        // Step 1: Try MRN match (most definitive)
        if (uploadedPatient.medical_record_number) {
          matchingPatient = mrnMap.get(uploadedPatient.medical_record_number);
        }

        // Step 2: Try exact name match
        if (!matchingPatient && uploadedPatient.first_name && uploadedPatient.last_name) {
          const nameKey = `${uploadedPatient.first_name?.toLowerCase()}_${uploadedPatient.last_name?.toLowerCase()}`;
          matchingPatient = nameMap.get(nameKey);
        }

        // Step 3: Aggressive fuzzy duplicate detection
        if (!matchingPatient) {
          const uploadFirst = uploadedPatient.first_name?.toLowerCase().trim() || '';
          const uploadLast = uploadedPatient.last_name?.toLowerCase().trim() || '';
          const uploadMiddle = uploadedPatient.middle_name?.toLowerCase().trim() || '';
          const uploadDOB = uploadedPatient.date_of_birth;
          const uploadPhone = uploadedPatient.phone?.replace(/\D/g, '') || '';
          const uploadEmail = uploadedPatient.email?.toLowerCase().trim() || '';
          
          // Fuzzy name matching helper
          const namesSimilar = (name1, name2) => {
            if (!name1 || !name2) return false;
            const n1 = name1.toLowerCase().trim();
            const n2 = name2.toLowerCase().trim();
            if (n1 === n2) return true;
            // Check if one contains the other (handles nicknames)
            if (n1.includes(n2) || n2.includes(n1)) return true;
            // Levenshtein distance <= 2 for typos
            const distance = (a, b) => {
              const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));
              for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
              for (let j = 0; j <= b.length; j++) matrix[j][0] = j;
              for (let j = 1; j <= b.length; j++) {
                for (let i = 1; i <= a.length; i++) {
                  matrix[j][i] = Math.min(
                    matrix[j][i - 1] + 1,
                    matrix[j - 1][i] + 1,
                    matrix[j - 1][i - 1] + (a[i - 1] === b[j - 1] ? 0 : 1)
                  );
                }
              }
              return matrix[b.length][a.length];
            };
            return distance(n1, n2) <= 2;
          };
          
          const potentialMatches = existingPatients.filter(p => {
            const existFirst = p.first_name?.toLowerCase().trim() || '';
            const existLast = p.last_name?.toLowerCase().trim() || '';
            const existMiddle = p.middle_name?.toLowerCase().trim() || '';
            const existDOB = p.date_of_birth;
            const existPhone = p.phone?.replace(/\D/g, '') || '';
            const existEmail = p.email?.toLowerCase().trim() || '';
            
            let matchScore = 0;
            
            // Exact name match (strong)
            if (uploadFirst === existFirst && uploadLast === existLast) matchScore += 10;
            
            // Similar names (medium)
            if (namesSimilar(uploadFirst, existFirst) && namesSimilar(uploadLast, existLast)) matchScore += 8;
            
            // First/last name match with middle initial
            if (uploadFirst === existFirst && uploadLast === existLast) {
              if (uploadMiddle && existMiddle && uploadMiddle[0] === existMiddle[0]) matchScore += 2;
            }
            
            // Name transposition (common data entry error)
            if (uploadFirst === existLast && uploadLast === existFirst) matchScore += 6;
            
            // DOB match (very strong)
            if (uploadDOB && existDOB === uploadDOB) matchScore += 15;
            
            // DOB match with any name similarity
            if (uploadDOB && existDOB === uploadDOB) {
              if (namesSimilar(uploadFirst, existFirst) || namesSimilar(uploadLast, existLast)) matchScore += 5;
            }
            
            // Phone number match (strong)
            if (uploadPhone && existPhone) {
              if (uploadPhone === existPhone) matchScore += 12;
              // Last 7 digits match (different area code)
              else if (uploadPhone.slice(-7) === existPhone.slice(-7)) matchScore += 8;
            }
            
            // Email match (very strong)
            if (uploadEmail && existEmail === uploadEmail) matchScore += 15;
            
            // Address similarity
            if (uploadedPatient.address && p.address) {
              const uploadAddr = uploadedPatient.address.toLowerCase().replace(/[^a-z0-9]/g, '');
              const existAddr = p.address.toLowerCase().replace(/[^a-z0-9]/g, '');
              if (uploadAddr.includes(existAddr.slice(0, 15)) || existAddr.includes(uploadAddr.slice(0, 15))) {
                matchScore += 5;
              }
            }
            
            // Emergency contact match
            if (uploadedPatient.emergency_contact_phone && p.emergency_contact_phone) {
              const uploadEmergPhone = uploadedPatient.emergency_contact_phone.replace(/\D/g, '');
              const existEmergPhone = p.emergency_contact_phone.replace(/\D/g, '');
              if (uploadEmergPhone === existEmergPhone) matchScore += 8;
            }
            
            // Physician match
            if (uploadedPatient.physician_name && p.physician_name) {
              if (namesSimilar(uploadedPatient.physician_name, p.physician_name)) matchScore += 4;
            }
            
            // Match threshold: 10+ points = likely duplicate
            return matchScore >= 10;
          });

          if (potentialMatches.length === 1) {
            // Single confident match - use it for update
            matchingPatient = potentialMatches[0];
          } else if (potentialMatches.length > 1) {
            // Multiple potential matches - flag as duplicate and skip
            results.errors.push({
              patient: `${uploadedPatient.first_name} ${uploadedPatient.last_name}`,
              error: `Duplicate detected - matches ${potentialMatches.length} existing patients: ${potentialMatches.map(p => `${p.first_name} ${p.last_name} (MRN: ${p.medical_record_number || 'N/A'}, DOB: ${p.date_of_birth || 'N/A'})`).join(' | ')}`
            });
            continue;
          }
        }

        // If no match found, create new patient
        if (!matchingPatient) {
          const newPatient = await base44.asServiceRole.entities.Patient.create(uploadedPatient);
          results.created++;
          results.changes.push({
            patient: `${uploadedPatient.first_name} ${uploadedPatient.last_name}`,
            changeCount: 1,
            changes: [{ field: 'status', oldValue: null, newValue: 'Created new patient' }]
          });
          continue;
        }

        // Mark this patient as matched
        matchedPatientIds.add(matchingPatient.id);

        // Enhanced change detection - merge new data with existing
        const changes = {};
        const detectedChanges = [];
        const allFields = [
          'middle_name', 'phone', 'email', 'address', 'status', 'care_type',
          'primary_diagnosis', 'allergies', 'payor', 'admission_date', 'discharge_date',
          'physician_name', 'physician_phone', 'physician_email',
          'caregiver_name', 'caregiver_phone', 'caregiver_email',
          'emergency_contact_name', 'emergency_contact_phone', 'emergency_contact_relationship'
        ];
        
        for (const field of allFields) {
          const newValue = uploadedPatient[field];
          const oldValue = matchingPatient[field];
          
          // Only update if new value exists and is different
          if (newValue && newValue !== oldValue && newValue.trim() !== '') {
            changes[field] = newValue;
            detectedChanges.push({
              field: field.replace(/_/g, ' '),
              oldValue: oldValue || '(empty)',
              newValue: newValue
            });
          }
        }

        // Auto-discharge if discharge_date is present
        if (uploadedPatient.discharge_date) {
          changes.status = 'discharged';
          if (!detectedChanges.find(c => c.field === 'status')) {
            detectedChanges.push({
              field: 'status',
              oldValue: matchingPatient.status || '(empty)',
              newValue: 'discharged'
            });
          }
        }

        // Special handling for MRN - only update if old one is missing or temp
        if (uploadedPatient.medical_record_number) {
          const existingMRN = matchingPatient.medical_record_number;
          if (!existingMRN || existingMRN.startsWith('TEMP_')) {
            changes.medical_record_number = uploadedPatient.medical_record_number;
            detectedChanges.push({
              field: 'medical_record_number',
              oldValue: existingMRN || '(empty)',
              newValue: uploadedPatient.medical_record_number
            });
          }
        }

        if (Object.keys(changes).length === 0) {
          results.noChanges++;
          continue;
        }

        // Apply updates to existing patient
        await base44.asServiceRole.entities.Patient.update(matchingPatient.id, changes);
        results.updated++;
        results.autoApplied++;
        
        results.changes.push({
          patient: `${matchingPatient.first_name} ${matchingPatient.last_name}`,
          changeCount: detectedChanges.length,
          changes: detectedChanges
        });

      } catch (error) {
        results.errors.push({
          patient: `${uploadedPatient.first_name || ''} ${uploadedPatient.last_name || ''}`,
          error: error.message
        });
      }
    }

    // Discharge patients not in the uploaded file (active or hospitalized patients)
    console.log('Discharging patients not in upload...');
    const patientsToDischarge = existingPatients.filter(p => 
      !matchedPatientIds.has(p.id) && 
      (p.status === 'active' || p.status === 'hospitalized')
    );

    let dischargedCount = 0;
    for (const patient of patientsToDischarge) {
      try {
        await base44.asServiceRole.entities.Patient.update(patient.id, { 
          status: 'discharged',
          discharge_date: new Date().toISOString().split('T')[0]
        });
        dischargedCount++;
      } catch (error) {
        console.error('Failed to discharge patient:', patient.id, error);
      }
    }

    if (dischargedCount > 0) {
      results.discharged = dischargedCount;
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
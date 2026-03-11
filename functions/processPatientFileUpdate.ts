import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const cleanValue = (value) => String(value ?? '').replace(/\uFEFF/g, '').trim();
const normalizeHeader = (value) => cleanValue(value).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
const normalizeText = (value) => cleanValue(value).toLowerCase().replace(/\s+/g, ' ').trim();
const normalizeName = (value) => normalizeText(value).replace(/[^a-z0-9 ]/g, '');
const normalizeMrn = (value) => cleanValue(value).toLowerCase().replace(/[^a-z0-9]/g, '');

const toIsoDate = (value) => {
  const raw = cleanValue(value);
  if (!raw) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const date = new Date(`${raw}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? null : raw;
  }

  const slashMatch = raw.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2}|\d{4})$/);
  if (slashMatch) {
    let [, month, day, year] = slashMatch;
    if (year.length === 2) year = `20${year}`;
    const iso = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    const date = new Date(`${iso}T00:00:00Z`);
    return Number.isNaN(date.getTime()) ? null : iso;
  }

  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
};

const parseCsvLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }

  values.push(current);
  return values.map(value => cleanValue(value));
};

const parseFullName = (value) => {
  const raw = cleanValue(value);
  if (!raw) return { first_name: '', middle_name: '', last_name: '' };

  if (raw.includes(',')) {
    const [lastNamePart, firstNamePart] = raw.split(',').map(part => cleanValue(part));
    const firstParts = firstNamePart.split(/\s+/).filter(Boolean);
    return {
      first_name: firstParts[0] || '',
      middle_name: firstParts.length > 2 ? firstParts.slice(1, -1).join(' ') : firstParts[1] || '',
      last_name: lastNamePart || (firstParts.length > 1 ? firstParts[firstParts.length - 1] : ''),
    };
  }

  const parts = raw.split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return { first_name: parts[0], middle_name: '', last_name: '' };
  }

  return {
    first_name: parts[0] || '',
    middle_name: parts.length > 2 ? parts.slice(1, -1).join(' ') : '',
    last_name: parts[parts.length - 1] || '',
  };
};

const normalizeStatus = (value) => {
  const normalized = normalizeText(value);
  if (!normalized) return 'active';
  if (normalized.includes('discharg')) return 'discharged';
  if (normalized.includes('hospital')) return 'hospitalized';
  return 'active';
};

const buildAddress = (row) => {
  const line1 = cleanValue(row.addr_1_care || row.address || row.care_address_1);
  const line2 = cleanValue(row.addr_2_care || row.care_address_2);
  const apt = cleanValue(row.apt_care || row.apartment || row.unit);
  const city = cleanValue(row.city_care || row.city);
  const state = cleanValue(row.state_care || row.state);
  const zip = cleanValue(row.zip_code_care || row.zip || row.zip_code);

  const streetParts = [line1, line2, apt ? `Apt ${apt}` : ''].filter(Boolean).join(', ');
  const localityParts = [city, state, zip].filter(Boolean).join(', ');
  return [streetParts, localityParts].filter(Boolean).join(' • ');
};

const buildRowObject = (headers, row) => {
  const mapped = {};
  headers.forEach((header, index) => {
    mapped[normalizeHeader(header) || `column_${index}`] = cleanValue(row[index]);
  });
  return mapped;
};

const getNameDobKey = (patient) => {
  const first = normalizeName(patient.first_name);
  const last = normalizeName(patient.last_name);
  const dob = toIsoDate(patient.date_of_birth);
  if (!first || !last || !dob) return null;
  return `${first}|${last}|${dob}`;
};

const pushToLookup = (map, key, value) => {
  if (!key) return;
  const existing = map.get(key) || [];
  existing.push(value);
  map.set(key, existing);
};

const parseUploadedPatient = (row, rowNumber) => {
  const parsedName = parseFullName(row.patient || `${row.first_name || ''} ${row.last_name || ''}`.trim());
  const firstName = cleanValue(row.first_name || parsedName.first_name);
  const lastName = cleanValue(row.last_name || parsedName.last_name);
  const middleName = cleanValue(row.middle_name || parsedName.middle_name);
  const dob = toIsoDate(row.dob || row.date_of_birth);
  const admissionDate = toIsoDate(row.admitted_date || row.admission_date);
  const medicalRecordNumber = cleanValue(row.mrn || row.medical_record_number);
  const status = normalizeStatus(row.current_admission_status || row.status);
  const address = buildAddress(row);
  const secondaryDiagnoses = cleanValue(row.secondary_diagnosis)
    .split(/[;,]/)
    .map(item => cleanValue(item))
    .filter(Boolean);

  return {
    rowNumber,
    patientLabel: cleanValue(row.patient) || `${firstName} ${lastName}`.trim() || `Row ${rowNumber}`,
    first_name: firstName,
    middle_name: middleName,
    last_name: lastName,
    date_of_birth: dob,
    medical_record_number: medicalRecordNumber,
    admission_date: admissionDate,
    status,
    payor: cleanValue(row.primary_payor || row.payor),
    primary_diagnosis: cleanValue(row.primary_diagnosis),
    secondary_diagnoses: secondaryDiagnoses,
    phone: cleanValue(row.home_phone || row.phone),
    address,
    care_type: 'home_health',
    is_archived: false,
  };
};

const resolveMatch = (patient, existingByMrn, existingByNameDob) => {
  const mrnKey = normalizeMrn(patient.medical_record_number);
  const nameDobKey = getNameDobKey(patient);
  const mrnMatches = mrnKey ? (existingByMrn.get(mrnKey) || []) : [];
  const nameDobMatches = nameDobKey ? (existingByNameDob.get(nameDobKey) || []) : [];
  const mrnMatch = mrnMatches[0] || null;
  const nameDobMatch = nameDobMatches[0] || null;

  if (mrnMatches.length > 1) {
    return { error: 'Multiple existing patients already share this MRN.' };
  }

  if (nameDobMatches.length > 1) {
    return { error: 'Multiple existing patients already share this name and DOB.' };
  }

  if (mrnMatch && nameDobMatch && mrnMatch.id !== nameDobMatch.id) {
    return { error: 'MRN matched one patient, but name and DOB matched a different patient.' };
  }

  return {
    match: mrnMatch || nameDobMatch || null,
    matchedBy: mrnMatch ? 'MRN' : nameDobMatch ? 'Name + DOB' : null,
    lookupKeys: {
      mrnKey,
      nameDobKey,
    },
  };
};

const runInBatches = async (items, batchSize, worker) => {
  for (let index = 0; index < items.length; index += batchSize) {
    const batch = items.slice(index, index + batchSize);
    await Promise.all(batch.map(worker));
  }
};

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (user.role !== 'admin') {
      return Response.json({ success: false, error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const body = await req.json();
    const reportType = body.report_type === 'discharge_report' ? 'discharge_report' : 'active_census';
    let fileContent = cleanValue(body.file_content);

    if (!fileContent && body.file_url) {
      const fileResponse = await fetch(body.file_url);
      if (!fileResponse.ok) {
        return Response.json({ success: false, error: 'Failed to read the uploaded file' }, { status: 400 });
      }
      fileContent = await fileResponse.text();
    }

    if (!fileContent) {
      return Response.json({ success: false, error: 'CSV file content is required' }, { status: 400 });
    }

    const lines = fileContent.split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2) {
      return Response.json({ success: false, error: 'CSV file must include a header row and at least one patient row' }, { status: 400 });
    }

    const headers = parseCsvLine(lines[0]);
    const rawRows = lines.slice(1).map((line, index) => ({
      rowNumber: index + 2,
      data: buildRowObject(headers, parseCsvLine(line)),
    }));

    const existingPatients = await base44.asServiceRole.entities.Patient.list('-created_date', 2000);
    const existingByMrn = new Map();
    const existingByNameDob = new Map();

    existingPatients.forEach((patient) => {
      pushToLookup(existingByMrn, normalizeMrn(patient.medical_record_number), patient);
      pushToLookup(existingByNameDob, getNameDobKey(patient), patient);
    });

    const results = {
      reportType,
      processed: 0,
      created: 0,
      matchedExisting: 0,
      discharged: 0,
      archived: 0,
      skippedInFileDuplicates: 0,
      noChanges: 0,
      errors: [],
    };

    const createQueue = [];
    const dischargeQueue = [];
    const seenUploadKeys = new Set();
    const queuedDischargeIds = new Set();

    for (const rawRow of rawRows) {
      const hasData = Object.values(rawRow.data).some(Boolean);
      if (!hasData) continue;

      results.processed++;
      const patient = parseUploadedPatient(rawRow.data, rawRow.rowNumber);

      if (!patient.first_name || !patient.last_name) {
        results.errors.push({
          row: rawRow.rowNumber,
          patient: patient.patientLabel,
          error: 'Missing patient name; first and last name are required for verification.',
        });
        continue;
      }

      const verificationHasMrn = !!normalizeMrn(patient.medical_record_number);
      const verificationHasNameDob = !!getNameDobKey(patient);

      if (!verificationHasMrn && !verificationHasNameDob) {
        results.errors.push({
          row: rawRow.rowNumber,
          patient: patient.patientLabel,
          error: 'Cannot safely verify this patient. Provide an MRN or a name with DOB.',
        });
        continue;
      }

      const uploadKeys = [];
      if (verificationHasMrn) uploadKeys.push(`mrn:${normalizeMrn(patient.medical_record_number)}`);
      if (verificationHasNameDob) uploadKeys.push(`namedob:${getNameDobKey(patient)}`);

      if (uploadKeys.some(key => seenUploadKeys.has(key))) {
        results.skippedInFileDuplicates++;
        results.errors.push({
          row: rawRow.rowNumber,
          patient: patient.patientLabel,
          error: 'This patient appears more than once in the uploaded file.',
        });
        continue;
      }

      uploadKeys.forEach(key => seenUploadKeys.add(key));

      const matchResult = resolveMatch(patient, existingByMrn, existingByNameDob);
      if (matchResult.error) {
        results.errors.push({
          row: rawRow.rowNumber,
          patient: patient.patientLabel,
          error: matchResult.error,
        });
        continue;
      }

      if (reportType === 'active_census') {
        if (matchResult.match) {
          results.matchedExisting++;
          results.noChanges++;
          continue;
        }

        createQueue.push({
          rowNumber: rawRow.rowNumber,
          patientLabel: patient.patientLabel,
          payload: {
            first_name: patient.first_name,
            middle_name: patient.middle_name || undefined,
            last_name: patient.last_name,
            date_of_birth: patient.date_of_birth || undefined,
            medical_record_number: patient.medical_record_number || undefined,
            admission_date: patient.admission_date || undefined,
            status: patient.status || 'active',
            payor: patient.payor || undefined,
            primary_diagnosis: patient.primary_diagnosis || undefined,
            secondary_diagnoses: patient.secondary_diagnoses.length ? patient.secondary_diagnoses : undefined,
            phone: patient.phone || undefined,
            address: patient.address || undefined,
            care_type: 'home_health',
            is_archived: false,
          },
        });
        continue;
      }

      if (patient.status !== 'discharged') {
        results.noChanges++;
        continue;
      }

      if (!matchResult.match) {
        results.errors.push({
          row: rawRow.rowNumber,
          patient: patient.patientLabel,
          error: 'No matching patient was found in the system for this discharged record.',
        });
        continue;
      }

      results.matchedExisting++;

      if (queuedDischargeIds.has(matchResult.match.id)) {
        results.skippedInFileDuplicates++;
        continue;
      }

      if (matchResult.match.status === 'discharged' && matchResult.match.is_archived) {
        results.noChanges++;
        continue;
      }

      queuedDischargeIds.add(matchResult.match.id);
      dischargeQueue.push({
        id: matchResult.match.id,
        patientLabel: patient.patientLabel,
        payload: {
          status: 'discharged',
          is_archived: true,
          discharge_date: patient.discharge_date || new Date().toISOString().slice(0, 10),
        },
      });
    }

    await runInBatches(createQueue, 25, async (item) => {
      try {
        await base44.asServiceRole.entities.Patient.create(item.payload);
        results.created++;
      } catch (error) {
        results.errors.push({
          row: item.rowNumber,
          patient: item.patientLabel,
          error: error.message,
        });
      }
    });

    await runInBatches(dischargeQueue, 25, async (item) => {
      try {
        await base44.asServiceRole.entities.Patient.update(item.id, item.payload);
        results.discharged++;
        results.archived++;
      } catch (error) {
        results.errors.push({
          patient: item.patientLabel,
          error: error.message,
        });
      }
    });

    return Response.json({
      success: true,
      results,
    });
  } catch (error) {
    return Response.json({
      success: false,
      error: error.message,
    }, { status: 500 });
  }
});
  }
  if (patient.phone && validatePhone(patient.phone)) {
    errors.push({ field: 'phone', error: validatePhone(patient.phone) });
  }
  if (patient.emergency_contact_phone && validatePhone(patient.emergency_contact_phone)) {
    errors.push({ field: 'emergency_contact_phone', error: validatePhone(patient.emergency_contact_phone) });
  }
  if (patient.date_of_birth && validateDate(patient.date_of_birth)) {
    errors.push({ field: 'date_of_birth', error: validateDate(patient.date_of_birth) });
  }
  if (patient.admission_date && validateDate(patient.admission_date)) {
    errors.push({ field: 'admission_date', error: validateDate(patient.admission_date) });
  }
  if (patient.discharge_date && validateDate(patient.discharge_date)) {
    errors.push({ field: 'discharge_date', error: validateDate(patient.discharge_date) });
  }
  
  // Cross-field validation
  if (patient.admission_date && patient.discharge_date) {
    const admission = new Date(patient.admission_date + 'T00:00:00');
    const discharge = new Date(patient.discharge_date + 'T00:00:00');
    if (admission > discharge) {
      errors.push({ field: 'date_order', error: 'Admission date must be before discharge date' });
    }
  }
  
  return errors;
};

// Levenshtein distance for fuzzy matching
const levenshteinDistance = (str1, str2) => {
  const a = str1.toLowerCase().trim();
  const b = str2.toLowerCase().trim();
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

         // Only include patients with required fields
         if (patient.first_name && patient.last_name) {
           // Validate patient record before adding
           const validationErrors = validatePatientRecord(patient);
           if (validationErrors.length > 0) {
             console.warn(`Validation errors for ${patient.first_name} ${patient.last_name}:`, validationErrors);
           }

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
          'primary_diagnosis', 'allergies', 'payor', 'admission_date',
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

        // Ensure patient from upload is marked active
        if (matchingPatient.status !== 'active') {
          changes.status = 'active';
          detectedChanges.push({
            field: 'status',
            oldValue: matchingPatient.status || '(empty)',
            newValue: 'active'
          });
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

    // Discharge patients not in the uploaded file (upload file = all active patients)
    console.log('Discharging patients not in upload...');
    const patientsToDischarge = existingPatients.filter(p => 
     !matchedPatientIds.has(p.id) && 
     p.status !== 'discharged'
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
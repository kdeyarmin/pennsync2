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
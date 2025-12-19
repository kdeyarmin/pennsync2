import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    
    if (!user) {
      return Response.json({ error: 'Unauthorized', success: false }, { status: 401 });
    }

    const body = await req.json();
    const text = body.fileContent;
    
    if (!text) {
      return Response.json({ error: 'No file content provided', success: false }, { status: 400 });
    }
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      return Response.json({ error: 'Empty file' }, { status: 400 });
    }

    // Parse CSV
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

    // Auto-map columns based on header names
    const columnMapping = {};
    const skipColumns = ['company', 'top_unit', 'parent_unit', 'sub_unit', 'branch_name', 'patient_team_name'];
    
    const fieldAliases = {
      'patient': 'first_name',
      'dob': 'date_of_birth',
      'mrn': 'medical_record_number',
      'physician': 'physician_name',
      'admitted_date': 'admission_date',
      'organization_type': 'care_type',
      'current_admission_status': 'status',
      'primary_payor': 'insurance_primary_provider',
      'icd_code': 'primary_diagnosis',
      'diagnosis': 'primary_diagnosis',
      'primary_diagnosis': 'primary_diagnosis',
      'secondary_diagnoses': 'secondary_diagnoses',
      'secondary_diagnosis': 'secondary_diagnoses'
    };

    headers.forEach((header, idx) => {
      const normalized = header.toLowerCase().replace(/[^a-z0-9_]/g, '_').trim();
      
      if (skipColumns.includes(normalized)) return;
      
      if (fieldAliases[normalized]) {
        columnMapping[idx] = fieldAliases[normalized];
      }
    });

    const results = { success: 0, failed: 0, errors: [], patients: [] };

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const patient = {};

      Object.entries(columnMapping).forEach(([colIndex, fieldKey]) => {
        const value = row[colIndex]?.trim();
        if (!value) return;

        if (fieldKey === 'first_name') {
          // Split full name if needed
          const nameParts = value.split(' ');
          if (nameParts.length > 1) {
            patient.first_name = nameParts[0];
            patient.last_name = nameParts.slice(1).join(' ');
          } else {
            patient.first_name = value;
          }
        } else if (fieldKey === 'care_type') {
          const valueLower = value.toLowerCase();
          if (valueLower.includes('home') || valueLower.includes('health')) {
            patient.care_type = 'home_health';
          } else if (valueLower.includes('hospice')) {
            patient.care_type = 'hospice';
          } else {
            patient.care_type = 'home_health';
          }
        } else if (fieldKey === 'status') {
          const valueLower = value.toLowerCase();
          if (valueLower.includes('active') || valueLower === 'a') {
            patient.status = 'active';
          } else if (valueLower.includes('discharge')) {
            patient.status = 'discharged';
          } else if (valueLower.includes('hospital')) {
            patient.status = 'hospitalized';
          } else {
            patient.status = 'active';
          }
        } else if (fieldKey === 'insurance_primary_provider') {
          patient.insurance_primary = { provider: value };
        } else if (fieldKey === 'secondary_diagnoses') {
          patient.secondary_diagnoses = value.split(/[,;|]+/).map(d => d.trim()).filter(d => d.length > 0);
        } else {
          patient[fieldKey] = value;
        }
      });

      // Validate required fields
      if (!patient.first_name || !patient.last_name) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          patient: row[columnMapping['first_name']] || `Row ${i + 1}`,
          error: 'Missing required fields: first_name or last_name'
        });
        continue;
      }

      try {
        const created = await base44.asServiceRole.entities.Patient.create(patient);
        results.success++;
        results.patients.push(created);
      } catch (error) {
        results.failed++;
        results.errors.push({
          row: i + 1,
          patient: `${patient.first_name} ${patient.last_name}`,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Auto import error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    console.log('Starting discharge report processing...');
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { file_url } = await req.json();
    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    console.log('Extracting discharge data from file...');
    
    // Extract patient discharge data using AI
    const extractResponse = await base44.asServiceRole.integrations.Core.ExtractDataFromUploadedFile({
      file_url,
      json_schema: {
        type: 'object',
        properties: {
          discharged_patients: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                first_name: { type: 'string' },
                last_name: { type: 'string' },
                medical_record_number: { type: 'string' },
                discharge_date: { type: 'string' },
                discharge_reason: { type: 'string' },
                discharge_disposition: { type: 'string' }
              }
            }
          }
        }
      }
    });

    if (extractResponse.status !== 'success' || !extractResponse.output?.discharged_patients) {
      console.error('Extraction failed:', extractResponse);
      return Response.json({ 
        success: false,
        error: 'Failed to extract discharge data from file',
        details: extractResponse.details 
      }, { status: 400 });
    }

    const dischargedPatientsData = extractResponse.output.discharged_patients;
    console.log(`Extracted ${dischargedPatientsData.length} discharged patients`);

    // Fetch active patients (bounded to the SDK's 5000/request max; omitting a
    // limit silently caps at the SDK default of 50).
    const allPatients = await base44.asServiceRole.entities.Patient.list('-created_date', 5000);
    
    const results = {
      total_processed: dischargedPatientsData.length,
      discharged_count: 0,
      files_closed: 0,
      not_found: 0,
      discharged_patients: [],
      not_found_patients: [],
      errors: []
    };

    // Create lookup maps
    const mrnMap = new Map();
    const nameMap = new Map();
    
    for (const patient of allPatients) {
      if (patient.medical_record_number) {
        mrnMap.set(patient.medical_record_number.trim().toLowerCase(), patient);
      }
      const nameKey = `${patient.first_name?.toLowerCase()}_${patient.last_name?.toLowerCase()}`;
      nameMap.set(nameKey, patient);
    }

    // Process each discharged patient with batching
    const BATCH_SIZE = 10;
    const BATCH_DELAY = 1000;
    const updateBatch = [];

    for (const dischargeData of dischargedPatientsData) {
      try {
        // Find matching patient
        let matchingPatient = null;

        if (dischargeData.medical_record_number) {
          const mrn = dischargeData.medical_record_number.trim().toLowerCase();
          matchingPatient = mrnMap.get(mrn);
        }

        if (!matchingPatient && dischargeData.first_name && dischargeData.last_name) {
          const nameKey = `${dischargeData.first_name.toLowerCase()}_${dischargeData.last_name.toLowerCase()}`;
          matchingPatient = nameMap.get(nameKey);
        }

        if (!matchingPatient) {
          results.not_found++;
          results.not_found_patients.push({
            name: `${dischargeData.first_name || ''} ${dischargeData.last_name || ''}`,
            mrn: dischargeData.medical_record_number
          });
          continue;
        }

        // Prepare discharge update
        const dischargeUpdate = {
          status: 'discharged',
          discharge_date: dischargeData.discharge_date || new Date().toISOString().split('T')[0],
          discharge_disposition: dischargeData.discharge_disposition || 'home'
        };

        // Add discharge reason if provided
        if (dischargeData.discharge_reason) {
          dischargeUpdate.clinical_notes = (matchingPatient.clinical_notes || '') + 
            `\n\nDischarged: ${dischargeData.discharge_date || 'today'} - ${dischargeData.discharge_reason}`;
        }

        updateBatch.push({
          id: matchingPatient.id,
          data: dischargeUpdate,
          patientInfo: {
            name: `${matchingPatient.first_name} ${matchingPatient.last_name}`,
            mrn: matchingPatient.medical_record_number,
            discharge_date: dischargeData.discharge_date,
            discharge_reason: dischargeData.discharge_reason
          }
        });

        results.discharged_count++;

      } catch (error) {
        results.errors.push(`${dischargeData.first_name} ${dischargeData.last_name}: ${error.message}`);
      }
    }

    // Process updates in batches to avoid rate limiting
    console.log(`Processing ${updateBatch.length} discharges in batches...`);
    for (let i = 0; i < updateBatch.length; i += BATCH_SIZE) {
      const batch = updateBatch.slice(i, i + BATCH_SIZE);
      
      await Promise.all(
        batch.map(update => 
          base44.asServiceRole.entities.Patient.update(update.id, update.data)
            .then(() => {
              results.files_closed++;
              results.discharged_patients.push(update.patientInfo);
            })
            .catch(err => {
              results.errors.push(`Failed to discharge ${update.patientInfo.name}: ${err.message}`);
            })
        )
      );
      
      // Delay between batches
      if (i + BATCH_SIZE < updateBatch.length) {
        await new Promise(resolve => setTimeout(resolve, BATCH_DELAY));
      }
    }

    // Log the discharge processing activity
    await base44.asServiceRole.entities.SystemLog.create({
      job_name: 'Discharge Report Processing',
      job_type: 'other',
      status: 'success',
      message: `Processed ${results.discharged_count} patient discharges`,
      details: {
        file_url,
        processed_by: user.email,
        results
      }
    });

    console.log('Discharge processing complete:', results);
    return Response.json({
      success: true,
      ...results
    });

  } catch (error) {
    console.error('Error processing discharge report:', error);
    
    return Response.json({ 
      success: false,
      error: 'Failed to process discharge report',
      details: error.message
    }, { status: 500 });
  }
});
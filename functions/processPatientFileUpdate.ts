import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { file_url } = await req.json();

    if (!file_url) {
      return Response.json({ error: 'file_url is required' }, { status: 400 });
    }

    // Extract data from the uploaded file
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
                emergency_contact_name: { type: 'string' },
                emergency_contact_phone: { type: 'string' },
                emergency_contact_relationship: { type: 'string' },
                physician_name: { type: 'string' },
                physician_phone: { type: 'string' },
                physician_email: { type: 'string' },
                caregiver_name: { type: 'string' },
                caregiver_email: { type: 'string' },
                caregiver_phone: { type: 'string' },
                primary_diagnosis: { type: 'string' },
                secondary_diagnoses: { type: 'array' },
                allergies: { type: 'string' },
                current_medications: { type: 'array' },
                past_medical_history: { type: 'array' },
                insurance_primary: { type: 'object' },
                insurance_secondary: { type: 'object' },
                admission_date: { type: 'string' },
                admission_source: { type: 'string' },
                care_type: { type: 'string' }
              }
            }
          }
        }
      }
    });

    if (extractResponse.status !== 'success' || !extractResponse.output?.patients) {
      return Response.json({ 
        error: 'Failed to extract patient data from file',
        details: extractResponse.details 
      }, { status: 400 });
    }

    const uploadedPatients = extractResponse.output.patients;
    const results = {
      processed: 0,
      updated: 0,
      noChanges: 0,
      errors: [],
      changes: []
    };

    // Get all existing patients
    const existingPatients = await base44.asServiceRole.entities.Patient.list();

    for (const uploadedPatient of uploadedPatients) {
      results.processed++;

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
          results.errors.push({
            patient: `${uploadedPatient.first_name} ${uploadedPatient.last_name}`,
            error: 'No matching patient found in system'
          });
          continue;
        }

        // Compare and detect changes
        const changes = {};
        const changeLog = [];

        for (const [key, value] of Object.entries(uploadedPatient)) {
          if (!value) continue; // Skip empty values
          
          const existingValue = matchingPatient[key];
          
          // Handle arrays (like medications)
          if (Array.isArray(value)) {
            const existingArray = existingValue || [];
            const hasChanges = JSON.stringify(existingArray) !== JSON.stringify(value);
            
            if (hasChanges) {
              changes[key] = value;
              changeLog.push({
                field: key,
                oldValue: existingArray,
                newValue: value
              });
            }
          }
          // Handle objects
          else if (typeof value === 'object' && value !== null) {
            const hasChanges = JSON.stringify(existingValue) !== JSON.stringify(value);
            
            if (hasChanges) {
              changes[key] = value;
              changeLog.push({
                field: key,
                oldValue: existingValue,
                newValue: value
              });
            }
          }
          // Handle primitives
          else if (existingValue !== value) {
            changes[key] = value;
            changeLog.push({
              field: key,
              oldValue: existingValue || '(empty)',
              newValue: value
            });
          }
        }

        if (Object.keys(changes).length === 0) {
          results.noChanges++;
          continue;
        }

        // Update patient with changes
        await base44.asServiceRole.entities.Patient.update(matchingPatient.id, changes);
        
        results.updated++;
        results.changes.push({
          patient: `${matchingPatient.first_name} ${matchingPatient.last_name}`,
          patientId: matchingPatient.id,
          changeCount: Object.keys(changes).length,
          changes: changeLog
        });

        // Log the update
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

      } catch (error) {
        results.errors.push({
          patient: `${uploadedPatient.first_name || ''} ${uploadedPatient.last_name || ''}`,
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Error processing patient file update:', error);
    return Response.json({ 
      error: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});
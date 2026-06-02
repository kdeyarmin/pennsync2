import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { audio_url, patient_id } = await req.json();

    if (!audio_url) {
      return Response.json({ error: 'audio_url is required' }, { status: 400 });
    }

    // Get patient context if available
    let patientContext = '';
    if (patient_id) {
      const patient = await base44.entities.Patient.filter({ id: patient_id });
      if (patient.length > 0) {
        const p = patient[0];
        patientContext = `Patient: ${p.first_name} ${p.last_name}, DOB: ${p.date_of_birth}, Primary Diagnosis: ${p.primary_diagnosis || 'None'}, Medications: ${JSON.stringify(p.current_medications || [])}`;
      }
    }

    // Step 1: Transcribe audio using AI
    const transcriptionPrompt = `Transcribe the following medical conversation audio file. Provide a clear, accurate transcription of the spoken words.`;
    
    const transcriptionResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: transcriptionPrompt,
      file_urls: [audio_url]
    });

    const fullTranscript = transcriptionResponse;

    // Step 2: Extract structured clinical data
    const extractionPrompt = `You are a medical scribe assistant. Analyze the following patient-provider conversation transcript and extract structured clinical information.

${patientContext ? `Patient Context: ${patientContext}\n\n` : ''}Transcript:
${fullTranscript}

Extract and structure the following information:
1. Chief Complaint
2. History of Present Illness (HPI)
3. Vital Signs mentioned
4. Assessment (diagnoses discussed)
5. Current Medications mentioned
6. New/Changed Medications
7. Allergies mentioned
8. Plan/Treatment recommendations
9. Patient Education topics
10. Follow-up instructions
11. Action Items for provider
12. Symptoms reported

Be specific and use medical terminology where appropriate. If information is not mentioned, indicate "Not discussed".`;

    const structuredData = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: extractionPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          chief_complaint: { type: 'string' },
          hpi: { type: 'string' },
          vital_signs: {
            type: 'object',
            properties: {
              blood_pressure: { type: 'string' },
              heart_rate: { type: 'string' },
              temperature: { type: 'string' },
              respiratory_rate: { type: 'string' },
              oxygen_saturation: { type: 'string' },
              weight: { type: 'string' },
              pain_level: { type: 'string' }
            }
          },
          assessment: {
            type: 'array',
            items: { type: 'string' }
          },
          current_medications: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                dosage: { type: 'string' },
                frequency: { type: 'string' }
              }
            }
          },
          new_medications: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                dosage: { type: 'string' },
                frequency: { type: 'string' },
                instructions: { type: 'string' }
              }
            }
          },
          allergies: {
            type: 'array',
            items: { type: 'string' }
          },
          plan: { type: 'string' },
          patient_education: {
            type: 'array',
            items: { type: 'string' }
          },
          follow_up: { type: 'string' },
          action_items: {
            type: 'array',
            items: { type: 'string' }
          },
          symptoms: {
            type: 'array',
            items: { type: 'string' }
          }
        }
      }
    });

    // Step 3: Generate Medicare-compliant clinical narrative
    const narrativePrompt = `Based on the following structured clinical data, generate a comprehensive, Medicare-compliant clinical narrative suitable for home health visit documentation.

Data:
${JSON.stringify(structuredData, null, 2)}

Generate a professional narrative that includes:
- Homebound status justification
- Skilled nursing needs
- Patient response to care
- Clinical observations
- Teaching provided
- Care plan progress

Format it as a cohesive, professional clinical note.`;

    const clinicalNarrative = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: narrativePrompt
    });

    // Log the transcription
    await base44.asServiceRole.entities.SystemLog.create({
      job_name: 'Medical Scribe Transcription',
      job_type: 'other',
      status: 'success',
      message: `Transcribed and extracted clinical data from audio`,
      details: {
        user_email: user.email,
        patient_id,
        audio_url,
        transcript_length: fullTranscript.length,
        extracted_fields: Object.keys(structuredData).length
      }
    });

    return Response.json({
      success: true,
      transcript: fullTranscript,
      structured_data: structuredData,
      clinical_narrative: clinicalNarrative
    });

  } catch (error) {
    console.error('Error in medical scribe:', error);
    
    // Log error
    try {
      const base44 = createClientFromRequest(req);
      await base44.asServiceRole.entities.SystemLog.create({
        job_name: 'Medical Scribe Error',
        job_type: 'other',
        status: 'error',
        message: 'Failed to transcribe and extract clinical data',
        error_stack: error.stack,
        details: { error: error.message }
      });
    } catch (logErr) {
      console.error('Failed to log error:', logErr);
    }

    return Response.json({
      error: error.message
    }, { status: 500 });
  }
});
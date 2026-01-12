import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { audioUrl, patientId, visitType, diagnosis } = await req.json();

    if (!audioUrl) {
      return Response.json({ error: 'Audio URL required' }, { status: 400 });
    }

    // Transcribe audio using LLM with audio processing
    const transcriptionResponse = await base44.integrations.Core.InvokeLLM({
      prompt: 'Please transcribe this audio recording of a nurse-patient interaction. Provide a complete, accurate transcription.',
      add_context_from_internet: false,
      file_urls: [audioUrl]
    });

    const transcription = transcriptionResponse;

    // Get patient data for context
    let patientContext = '';
    if (patientId) {
      try {
        const patient = await base44.entities.Patient.read(patientId);
        const carePlans = await base44.entities.CarePlan.filter({ patient_id: patientId }, '-created_date', 5);
        
        patientContext = `
Patient: ${patient.first_name} ${patient.last_name}
MRN: ${patient.medical_record_number || 'N/A'}
Age: ${patient.date_of_birth ? Math.floor((new Date() - new Date(patient.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000)) : 'N/A'}
Primary Diagnosis: ${patient.primary_diagnosis || 'N/A'}
Care Type: ${patient.care_type || 'home_health'}

Active Care Plans:
${carePlans.map(cp => `- ${cp.problem}: ${cp.goal}`).join('\n')}
`;
      } catch (e) {
        console.error('Error fetching patient context:', e);
      }
    }

    // Generate comprehensive note from transcription
    const noteResponse = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a clinical documentation expert. Based on the following nurse-patient interaction transcription, generate a comprehensive, Medicare-compliant clinical note. 

TRANSCRIPTION:
${transcription}

${patientContext}

Visit Type: ${visitType || 'Routine Visit'}
Diagnosis/Focus: ${diagnosis || 'General Assessment'}

Generate a well-structured clinical note with the following sections:
1. **HOMEBOUND STATUS**: Assess and document
2. **SUBJECTIVE**: Patient's report, symptoms, concerns
3. **OBJECTIVE**: Vital signs, physical findings, observations
4. **ASSESSMENT**: Clinical impression, status changes
5. **PLAN**: Interventions, medications, follow-up, education

Ensure the note:
- Is clear, concise, and clinically accurate
- Uses appropriate medical terminology
- Documents specific findings and measurements
- Includes patient/family education provided
- Notes any changes in status or concerns
- Is compliant with Medicare documentation standards
- References the care plan when applicable`,
      add_context_from_internet: false
    });

    return Response.json({
      success: true,
      transcription,
      generatedNote: noteResponse,
      patientId,
      visitType,
      diagnosis,
      audioUrl
    });
  } catch (error) {
    console.error('Error generating note from recording:', error);
    return Response.json(
      { error: error.message || 'Failed to generate note from recording' },
      { status: 500 }
    );
  }
});
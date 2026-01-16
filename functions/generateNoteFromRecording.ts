import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { audio_url, patient_id, visit_type, diagnosis } = await req.json();

    if (!audio_url || !patient_id || !visit_type) {
      return Response.json(
        { error: 'Missing required fields: audio_url, patient_id, visit_type' },
        { status: 400 }
      );
    }

    // Fetch patient data for context
    const patient = await base44.asServiceRole.entities.Patient.get(patient_id);
    if (!patient) {
      return Response.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Step 1: Transcribe audio using AI
    console.log('Transcribing audio...');
    const transcriptionResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: `Please transcribe the following audio file of a medical visit. Provide a clear, complete transcription of the conversation between the healthcare provider and patient.`,
      file_urls: [audio_url],
      add_context_from_internet: false
    });

    const transcription = typeof transcriptionResponse === 'string' 
      ? transcriptionResponse 
      : transcriptionResponse.transcription || transcriptionResponse.text || '';

    if (!transcription) {
      return Response.json({ error: 'Failed to transcribe audio' }, { status: 400 });
    }

    // Step 2: Generate structured clinical note
    console.log('Generating clinical note...');
    const notePrompt = `Based on the following patient interaction transcription, generate a professional structured clinical note in SOAP format (Subjective, Objective, Assessment, Plan).

Patient Information:
- Name: ${patient.first_name} ${patient.last_name}
- DOB: ${patient.date_of_birth || 'N/A'}
- Primary Diagnosis: ${diagnosis}
- Visit Type: ${visit_type.replace(/_/g, ' ')}

Transcription:
${transcription}

Generate a comprehensive, Medicare-compliant clinical note that includes:
1. Subjective: Patient's reported symptoms, concerns, and relevant history
2. Objective: Vital signs, physical findings, assessment results
3. Assessment: Clinical impression and diagnosis
4. Plan: Treatment recommendations, medications, follow-up care

Format the note professionally for medical records.`;

    const noteResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: notePrompt,
      add_context_from_internet: false
    });

    const generatedNote = typeof noteResponse === 'string' ? noteResponse : noteResponse.text || '';

    // Step 3: Generate treatment suggestions
    console.log('Generating treatment suggestions...');
    const treatmentPrompt = `Based on this patient interaction transcript and diagnosis, suggest relevant treatment options:

Diagnosis: ${diagnosis}
Transcription: ${transcription.substring(0, 1000)}...

Provide 3-5 specific treatment suggestions in JSON format:
[
  {
    "treatment": "treatment name",
    "rationale": "why this is recommended based on the patient's condition",
    "category": "medication|therapy|monitoring|education",
    "confidence": 85
  }
]

Only include clinically appropriate suggestions.`;

    const treatmentResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
      prompt: treatmentPrompt,
      response_json_schema: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            treatment: { type: 'string' },
            rationale: { type: 'string' },
            category: { type: 'string' },
            confidence: { type: 'number' }
          }
        }
      },
      add_context_from_internet: false
    });

    const treatmentSuggestions = Array.isArray(treatmentResponse) ? treatmentResponse : [];

    return Response.json({
      success: true,
      data: {
        transcription,
        generatedNote,
        treatmentSuggestions,
        metadata: {
          processedAt: new Date().toISOString(),
          patientId: patient_id,
          visitType: visit_type,
          diagnosis
        }
      }
    });

  } catch (error) {
    console.error('Error generating note from recording:', error);
    return Response.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
});
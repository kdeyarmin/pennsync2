import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Unified Smart Note Assistant Function
 * Handles: note enhancement, voice transcription, event extraction, and compliance checking
 * Replaces: enhanceNoteOptimized, transcribeAndExtractClinicalData, extractClinicalEvents
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, autoExtractEvents = false, ...params } = await req.json();

    switch (action) {
      case 'enhance_note':
        return await enhanceNote(base44, user, params);
      
      case 'transcribe_audio':
        return await transcribeAudio(base44, user, params);
      
      case 'extract_events':
        return await extractEventsFromNote(base44, user, params);
      
      case 'full_documentation':
        // Complete workflow: transcribe -> enhance -> extract events
        return await fullDocumentation(base44, user, params);
      
      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Smart note assistant error:', error);
    return Response.json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
});

async function enhanceNote(base44, user, params) {
  const { 
    roughNote,
    patientId,
    visitType,
    visitDate,
    diagnosis,
    vitalSigns,
    nurseType = 'RN'
  } = params;

  if (!roughNote || !patientId) {
    return Response.json({ error: 'roughNote and patientId required' }, { status: 400 });
  }

  // Fetch patient context
  const [patient, carePlans, recentVisits, oasisData] = await Promise.all([
    base44.asServiceRole.entities.Patient.filter({ id: patientId }, '', 1),
    base44.asServiceRole.entities.CarePlan.filter({ patient_id: patientId, status: 'active' }),
    base44.asServiceRole.entities.Visit.filter({ patient_id: patientId, status: 'completed' }, '-visit_date', 3),
    base44.asServiceRole.entities.OASISUpload.filter({ patient_id: patientId }, '-created_date', 1)
  ]);

  const patientData = patient[0];
  if (!patientData) {
    return Response.json({ error: 'Patient not found' }, { status: 404 });
  }
  // Authorize against the patient (assigned nurse or admin) before its chart
  // drives the prompt or the enhanced-note write. RLS-independent code check.
  if (user.role !== 'admin' && !(Array.isArray(patientData.assigned_nurses) && patientData.assigned_nurses.includes(user.email))) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const contextPrompt = buildPatientContext(patientData, carePlans, recentVisits, oasisData[0], {
    visitType,
    visitDate,
    diagnosis,
    vitalSigns,
    nurseType,
    roughNote
  });

  // Parallel compliance check and enhancement
  const [roughComplianceResult, enhancementResult] = await Promise.all([
    base44.asServiceRole.integrations.Core.InvokeLLM({
      model: "gpt_5_5",
      prompt: `Analyze rough note for MEDICARE HOME HEALTH compliance per 42 CFR 484.

${contextPrompt}

Return JSON with compliance_score (0-100), missing_elements array, and specific_gaps array.`,
      response_json_schema: {
        type: "object",
        properties: {
          compliance_score: { type: "number" },
          missing_elements: { type: "array", items: { type: "string" } },
          specific_gaps: { 
            type: "array", 
            items: { 
              type: "object",
              properties: {
                element: { type: "string" },
                reason: { type: "string" },
                cop_reference: { type: "string" },
                severity: { type: "string" }
              }
            }
          }
        }
      }
    }),
    base44.asServiceRole.integrations.Core.InvokeLLM({
      model: "gpt_5_5",
      prompt: `Transform rough notes into MEDICARE HOME HEALTH COMPLIANT clinical narrative per 42 CFR 484 and CMS Conditions of Participation.

${contextPrompt}

${getComplianceRequirements(visitType, diagnosis, nurseType)}

MANDATORY ELEMENTS - MUST INCLUDE ALL:

1. HOMEBOUND STATUS DOCUMENTATION:
   - Specific reason patient confined to home (medical contraindication or taxing effort)
   - Use exact language: "Patient remains homebound due to [specific reason]"
   - Note: "Leaving home requires taxing effort due to [assistive devices/assistance needed]"
   - Document if patient leaves only for medical/religious purposes

2. SKILLED NEED JUSTIFICATION:
   - WHY skilled nursing is necessary (complexity, teaching, assessment, management)
   - Explain clinical judgment used during visit
   - Show services require professional nursing skills
   - Link to physician orders and care plan

3. MEDICAL NECESSITY:
   - Demonstrate reasonable expectation of improvement
   - Show complexity requiring skilled services
   - Link interventions directly to diagnoses
   - Justify frequency and duration

4. PROGRESS MEASUREMENT:
   - Compare findings to baseline/previous visit with specific data
   - Document progress toward EACH active care plan goal
   - Include measurable outcomes (vital signs, functional status, pain scores)

5. PATIENT/CAREGIVER EDUCATION:
   - Specific topics taught (medication names, disease management, safety)
   - Teaching methods used
   - Patient/caregiver response and comprehension
   - Need for continued teaching if applicable

6. SAFETY ASSESSMENT:
   - Fall risk evaluation and interventions
   - Home safety hazards identified and addressed
   - Emergency plan discussed
   - Medication safety addressed

7. COORDINATION OF CARE:
   - Communication with MD (reason, method, outcome)
   - Referrals to other disciplines with rationale
   - DME/supply orders with justification
   - Follow-up plan specific to patient needs

8. MEDICATION RECONCILIATION:
   - All medications verified (name, dose, frequency)
   - Compliance and understanding assessed
   - Side effects monitored
   - Changes documented with MD order reference

FORMATTING REQUIREMENTS:
- Complete sentences with proper grammar
- Professional medical terminology (spell out first use)
- Specific measurements, not vague terms ("4cm wound" not "small wound")
- Avoid abbreviations except standard medical terms
- Include exact vital sign values with comparison to baseline
- Use objective, measurable language
- Demonstrate skilled nursing judgment throughout

STRUCTURE - Use clear section headings:
- HOMEBOUND STATUS
- SKILLED NURSING ASSESSMENT  
- VITAL SIGNS
- PHYSICAL ASSESSMENT (by system)
- MEDICATION REVIEW
- FUNCTIONAL STATUS
- SAFETY ASSESSMENT
- CARE PLAN PROGRESS (for each goal)
- PATIENT/CAREGIVER EDUCATION
- SKILLED INTERVENTIONS
- COORDINATION OF CARE
- PLAN FOR NEXT VISIT

Return comprehensive Medicare-compliant note that would pass CMS audit. Make medical necessity crystal clear.`,
      response_json_schema: {
        type: "object",
        properties: {
          enhanced_note: { type: "string" },
          quality_score: { type: "number" }
        }
      }
    })
  ]);

  // Check enhanced compliance
  const enhancedComplianceResult = await base44.asServiceRole.integrations.Core.InvokeLLM({
    model: "gpt_5_5",
    prompt: `Analyze enhanced note for compliance.

ENHANCED NOTE:
${enhancementResult.enhanced_note}

VISIT TYPE: ${visitType}

Return compliance_score and compliant_elements.`,
    response_json_schema: {
      type: "object",
      properties: {
        compliance_score: { type: "number" },
        compliant_elements: { type: "array", items: { type: "string" } }
      }
    }
  });

  // Save to patient history
  const currentHistory = patientData.enhanced_notes_history || [];
  const updatedHistory = [
    ...currentHistory,
    {
      date: new Date().toISOString(),
      visit_type: visitType,
      diagnosis,
      enhanced_note: enhancementResult.enhanced_note,
      rough_note: roughNote,
      quality_score: enhancementResult.quality_score,
      nurse_email: user.email,
      vital_signs: vitalSigns
    }
  ].slice(-10);

  await base44.asServiceRole.entities.Patient.update(patientId, {
    enhanced_notes_history: updatedHistory
  });

  // Track conversion
  const complianceImprovement = enhancedComplianceResult.compliance_score - roughComplianceResult.compliance_score;

  await base44.asServiceRole.entities.NoteConversion.create({
    nurse_email: user.email,
    patient_id: patientId,
    visit_type: visitType,
    diagnosis,
    rough_note_length: roughNote.length,
    enhanced_note_length: enhancementResult.enhanced_note.length,
    quality_score: enhancementResult.quality_score,
    rough_note_compliance: roughComplianceResult.compliance_score,
    enhanced_note_compliance: enhancedComplianceResult.compliance_score,
    compliance_improvement: complianceImprovement
  });

  // Auto-extract clinical events if enabled
  let detectedEvents = [];
  if (autoExtractEvents && patientId) {
    try {
      const eventsResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
        model: "gpt_5_5",
        prompt: `Analyze this clinical note and extract ALL significant clinical events. Be thorough and specific.

ENHANCED NOTE:
${enhancementResult.enhanced_note}

ROUGH NOTE (for context):
${roughNote}

Extract events such as:
- Medication changes (started, stopped, dose changes, side effects reported)
- Vital sign abnormalities or concerning trends
- New symptoms, symptom exacerbations, or symptom resolutions
- Falls, injuries, or safety incidents  
- Wound assessments or changes in wound status
- Cognitive changes or behavioral changes
- Functional status changes (mobility, ADLs)
- Pain level changes or new pain
- Hospitalizations, ER visits, or physician appointments mentioned
- New diagnoses or complications
- Lab results or test results
- Infections or signs of infection
- Equipment/DME orders or changes
- Patient education topics or concerns

For each event, provide:
- type: medication_change, medication_started, medication_stopped, fall, vital_change, symptom_new, symptom_resolved, wound_new, wound_change, cognitive_change, functional_change, pain_change, hospitalization, er_visit, physician_appointment, lab_result, infection, surgery, therapy_change, dme_ordered, other
- title: Brief, specific title (e.g., "Metoprolol increased to 50mg BID" not just "Medication Change")
- description: Detailed clinical description with full context
- date: Visit date or date mentioned in note
- severity: low/medium/high/critical based on clinical significance
- structured_data: Object with specific details (medication name, dosage, vital values, wound location/size, etc.)
- source_text: Exact relevant text from note (verbatim quote)
- requires_followup: true if needs action/monitoring/physician notification
- confidence: 0-100 (only include events with confidence >= 75)

Be thorough - extract ALL clinically significant events, not just major ones. Include both positive and negative findings.`,
        response_json_schema: {
          type: "object",
          properties: {
            events: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  type: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  date: { type: "string" },
                  severity: { type: "string" },
                  structured_data: { type: "object" },
                  source_text: { type: "string" },
                  requires_followup: { type: "boolean" },
                  confidence: { type: "number" }
                }
              }
            }
          }
        }
      });
      
      detectedEvents = eventsResponse.events || [];
    } catch (error) {
      console.error('Auto event extraction error:', error);
    }
  }

  return Response.json({
    success: true,
    enhanced_note: enhancementResult.enhanced_note,
    quality_score: enhancementResult.quality_score,
    rough_compliance: roughComplianceResult,
    enhanced_compliance: enhancedComplianceResult,
    compliance_improvement: complianceImprovement,
    documentation_gaps: roughComplianceResult.specific_gaps,
    detected_events: detectedEvents
  });
}

async function transcribeAudio(base44, user, params) {
  const { audio_url, patient_id } = params;

  if (!audio_url) {
    return Response.json({ error: 'audio_url is required' }, { status: 400 });
  }

  let patientContext = '';
  if (patient_id) {
    const patient = await base44.asServiceRole.entities.Patient.filter({ id: patient_id });
    const p = patient[0];
    if (!p) return Response.json({ error: 'Patient not found' }, { status: 404 });
    if (user.role !== 'admin' && !(Array.isArray(p.assigned_nurses) && p.assigned_nurses.includes(user.email))) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }
    patientContext = `Patient: ${p.first_name} ${p.last_name}, DOB: ${p.date_of_birth}, Primary Diagnosis: ${p.primary_diagnosis || 'None'}`;
  }

  // Transcribe audio
  const transcriptionResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
    prompt: `Transcribe the following medical conversation audio file. Provide a clear, accurate transcription.`,
    file_urls: [audio_url]
  });

  // Extract structured clinical data
  const structuredData = await base44.asServiceRole.integrations.Core.InvokeLLM({
    model: "gpt_5_5",
    prompt: `Extract structured clinical information from this transcript.

${patientContext ? `Patient Context: ${patientContext}\n\n` : ''}Transcript:
${transcriptionResponse}

Extract: Chief Complaint, HPI, Vital Signs, Assessment, Medications, Allergies, Plan, Education, Follow-up, Action Items, Symptoms.`,
    response_json_schema: {
      type: 'object',
      properties: {
        chief_complaint: { type: 'string' },
        hpi: { type: 'string' },
        vital_signs: { type: 'object' },
        assessment: { type: 'array', items: { type: 'string' } },
        current_medications: { type: 'array', items: { type: 'object' } },
        new_medications: { type: 'array', items: { type: 'object' } },
        allergies: { type: 'array', items: { type: 'string' } },
        plan: { type: 'string' },
        patient_education: { type: 'array', items: { type: 'string' } },
        follow_up: { type: 'string' },
        action_items: { type: 'array', items: { type: 'string' } },
        symptoms: { type: 'array', items: { type: 'string' } }
      }
    }
  });

  // Generate clinical narrative
  const clinicalNarrative = await base44.asServiceRole.integrations.Core.InvokeLLM({
    model: "gpt_5_5",
    prompt: `Generate a Medicare-compliant clinical narrative from this data:

${JSON.stringify(structuredData, null, 2)}

Include: homebound status, skilled needs, patient response, observations, teaching, care plan progress.`
  });

  await base44.asServiceRole.entities.SystemLog.create({
    job_name: 'Medical Scribe Transcription',
    job_type: 'other',
    status: 'success',
    message: `Transcribed and extracted clinical data`,
    details: {
      user_email: user.email,
      patient_id,
      audio_url,
      transcript_length: transcriptionResponse.length
    }
  });

  return Response.json({
    success: true,
    transcript: transcriptionResponse,
    structured_data: structuredData,
    clinical_narrative: clinicalNarrative
  });
}

async function extractEventsFromNote(base44, user, params) {
  const { visit_id, patient_id, nurse_notes, visit_date } = params;

  if (!visit_id || !patient_id || !nurse_notes) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  // Authorize: only an assigned nurse (or admin) may write ClinicalEvent rows to
  // this patient's chart. RLS-independent code check.
  const [evPatient] = await base44.asServiceRole.entities.Patient.filter({ id: patient_id }, '', 1);
  if (!evPatient) return Response.json({ error: 'Patient not found' }, { status: 404 });
  if (user.role !== 'admin' && !(Array.isArray(evPatient.assigned_nurses) && evPatient.assigned_nurses.includes(user.email))) {
    return Response.json({ error: 'Forbidden' }, { status: 403 });
  }

  const result = await base44.integrations.Core.InvokeLLM({
    model: "gpt_5_5",
    prompt: `Extract ALL significant clinical events from this note.

${nurse_notes}

Extract: medication changes, appointments, hospitalizations, falls, wounds, labs, symptoms, vital changes, cognitive/functional changes, pain, infections, procedures, therapy changes, DME.

For each: event_type, event_title, event_description, structured_data, severity, requires_followup, followup_notes, source_text (exact quote), source_section, extraction_confidence (0-100).`,
    response_json_schema: {
      type: "object",
      properties: {
        events: {
          type: "array",
          items: {
            type: "object",
            properties: {
              event_type: { type: "string" },
              event_title: { type: "string" },
              event_description: { type: "string" },
              structured_data: { type: "object" },
              severity: { type: "string" },
              requires_followup: { type: "boolean" },
              followup_notes: { type: "string" },
              source_text: { type: "string" },
              source_section: { type: "string" },
              extraction_confidence: { type: "number" }
            }
          }
        }
      }
    }
  });

  // Save events
  const savedEvents = [];
  for (const event of result.events || []) {
    let text_anchor_start = null;
    let text_anchor_end = null;
    
    if (event.source_text && nurse_notes) {
      const index = nurse_notes.indexOf(event.source_text.trim());
      if (index !== -1) {
        text_anchor_start = index;
        text_anchor_end = index + event.source_text.length;
      }
    }

    const savedEvent = await base44.asServiceRole.entities.ClinicalEvent.create({
      patient_id,
      visit_id,
      event_date: visit_date,
      ...event,
      text_anchor_start,
      text_anchor_end,
      verified: false
    });
    savedEvents.push(savedEvent);
  }

  return Response.json({
    success: true,
    events_extracted: savedEvents.length,
    events: savedEvents
  });
}

async function fullDocumentation(base44, user, params) {
  const { audio_url, patient_id, visit_type, visit_date, diagnosis, vital_signs, nurse_type, visit_id } = params;

  // Step 1: Transcribe if audio provided
  let roughNote = params.rough_note;
  let transcript = null;
  let structuredData = null;

  if (audio_url && !roughNote) {
    const transcribeResult = await transcribeAudio(base44, user, { audio_url, patient_id });
    const transcribeData = await transcribeResult.json();
    
    if (!transcribeData.success) {
      return transcribeResult;
    }

    transcript = transcribeData.transcript;
    structuredData = transcribeData.structured_data;
    roughNote = transcribeData.clinical_narrative;
  }

  // Step 2: Enhance the note
  const enhanceResult = await enhanceNote(base44, user, {
    roughNote,
    patientId: patient_id,
    visitType: visit_type,
    visitDate: visit_date,
    diagnosis,
    vitalSigns: vital_signs,
    nurseType: nurse_type
  });

  const enhanceData = await enhanceResult.json();
  if (!enhanceData.success) {
    return enhanceResult;
  }

  // Step 3: Extract clinical events if visit_id provided
  let eventsData = null;
  if (visit_id) {
    const eventsResult = await extractEventsFromNote(base44, user, {
      visit_id,
      patient_id,
      nurse_notes: enhanceData.enhanced_note,
      visit_date
    });
    eventsData = await eventsResult.json();
  }

  return Response.json({
    success: true,
    transcript,
    structured_data: structuredData,
    enhanced_note: enhanceData.enhanced_note,
    quality_score: enhanceData.quality_score,
    compliance_improvement: enhanceData.compliance_improvement,
    documentation_gaps: enhanceData.documentation_gaps,
    events_extracted: eventsData?.events_extracted || 0,
    events: eventsData?.events || []
  });
}

function buildPatientContext(patient, carePlans, recentVisits, oasis, visitInfo) {
  return `
PATIENT CONTEXT:
- Name: ${patient.first_name} ${patient.last_name}
- Primary Diagnosis: ${patient.primary_diagnosis || visitInfo.diagnosis}
- Secondary Diagnoses: ${patient.secondary_diagnoses?.join(', ') || 'None'}
- Allergies: ${patient.allergies || 'None'}
- Current Medications: ${patient.current_medications?.map(m => m.name).slice(0, 5).join(', ') || 'None'}
- Age: ${patient.date_of_birth ? Math.floor((new Date() - new Date(patient.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000)) : 'Unknown'}

VISIT DETAILS:
- Visit Type: ${visitInfo.visitType}
- Visit Date: ${visitInfo.visitDate}
- Nurse: ${visitInfo.nurseType}
- Vitals: ${JSON.stringify(visitInfo.vitalSigns)}

ACTIVE CARE PLANS:
${carePlans.map(cp => `- ${cp.problem}: ${cp.goal}`).join('\n') || '- None'}

RECENT HISTORY:
${recentVisits.length > 0 ? `Last visit ${recentVisits[0].visit_date}: ${recentVisits[0].visit_type}` : 'No previous visits'}

${oasis ? `OASIS DATA:
- Functional Level: ${oasis.pdgm_data?.functional_impairment_level || 'Not specified'}
- Clinical Group: ${oasis.pdgm_data?.clinical_grouping || 'Not specified'}` : ''}

ROUGH NOTES:
${visitInfo.roughNote}
`;
}

function getComplianceRequirements(visitType, diagnosis, nurseType) {
  let requirements = `
CRITICAL MEDICARE CoP REQUIREMENTS (42 CFR 484):

1. HOMEBOUND STATUS (484.55(a)) - MANDATORY
   - Document specific medical reason patient confined to home
   - Note taxing effort required to leave (wheelchair, walker, assistance)
   - State patient leaves home only for medical appointments/religious services
   - Must be evident in EVERY visit note

2. SKILLED NURSING NEED (484.20) - MANDATORY
   - Explain complexity requiring professional nursing judgment
   - Show assessment and management skills used
   - Document teaching requiring nursing knowledge
   - Justify why non-skilled person cannot safely provide care

3. MEDICAL NECESSITY (484.60) - MANDATORY
   - Link all interventions to physician orders
   - Show reasonable expectation of improvement or stabilization
   - Demonstrate services are reasonable and necessary
   - Document frequency/duration justification

4. PATIENT RESPONSE TO TREATMENT (484.60) - MANDATORY
   - Compare current status to baseline/previous visit with data
   - Document objective measurements (vitals, pain scores, wound size)
   - Note patient/caregiver reported changes
   - Show clinical response to interventions

5. COORDINATION OF CARE (484.60) - REQUIRED
   - MD communication documented with reason and outcome
   - Referrals to PT/OT/ST/MSW with clinical justification
   - Equipment/supply orders with medical necessity
   - Follow-up plans specific to patient condition

6. SAFETY ASSESSMENT (484.80) - REQUIRED
   - Fall risk assessment and prevention strategies
   - Home environment hazards identified and addressed
   - Emergency procedures reviewed with patient/caregiver
   - Medication safety (storage, administration, interactions)

7. FUNCTIONAL STATUS & PROGRESS (484.55) - REQUIRED
   - Baseline functional level established (ADLs, mobility)
   - Progress toward goals measured objectively
   - Changes from previous visit documented
   - Barriers to progress identified and addressed

8. PATIENT/CAREGIVER EDUCATION (484.60) - REQUIRED
   - Specific topics taught (disease process, medications, self-care)
   - Teaching methods and materials used
   - Patient/caregiver comprehension verified
   - Need for continued teaching documented
`;

  // Add condition-specific requirements
  if (diagnosis?.includes('CHF') || diagnosis?.includes('Heart Failure')) {
    requirements += `\nCHF DOCUMENTATION: Daily weight, edema, lung sounds, fluid restriction compliance, medication compliance, patient knowledge.`;
  }

  if (diagnosis?.includes('COPD')) {
    requirements += `\nCOPD DOCUMENTATION: O2 saturation (room air & O2), respiratory rate, lung sounds, dyspnea level, inhaler technique, O2 safety.`;
  }

  if (diagnosis?.includes('Diabetes')) {
    requirements += `\nDIABETES DOCUMENTATION: Blood glucose, diabetic foot exam, neuropathy assessment, monitoring technique, hypoglycemia plan, foot care education.`;
  }

  if (diagnosis?.includes('Wound') || diagnosis?.includes('Ulcer')) {
    requirements += `\nWOUND DOCUMENTATION: Measurements (L×W×D), wound bed %, exudate, periwound skin, undermining/tunneling, treatment, pain, infection signs.`;
  }

  // Add visit-type specific requirements
  if (visitType === 'admission' || visitType === 'start_of_care') {
    requirements += `\nSTART OF CARE MANDATORY: Comprehensive assessment, admission source, medication reconciliation, skilled need establishment, homebound justification, baseline functional status, safety assessment, patient rights, emergency plan.`;
  } else if (visitType === 'recertification') {
    requirements += `\nRECERTIFICATION MANDATORY: Progress toward goals with data, functional changes from baseline, continued homebound status, continued skilled need, medication review, safety update.`;
  } else if (visitType === 'discharge') {
    requirements += `\nDISCHARGE MANDATORY: Discharge reason, goals met/not met, functional status at discharge vs admission, education completed, discharge instructions, follow-up arranged, physician notified, safety measures.`;
  }

  return requirements;
}
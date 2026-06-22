// AI prompt builders for DocumentVisit. Pure string assembly — no React, no side effects.
// Extracted from pages/DocumentVisit.jsx to keep the page focused on UI/state.

// Smart-template prompt: diagnosis-prioritized, Medicare-compliant visit template.
export function buildSmartTemplatePrompt({ patient, visit, vitalSigns, previousVisit }) {
  let prompt = `You are an expert home health and hospice nurse documentation specialist. Generate a comprehensive, Medicare-compliant template for a ${visit.visit_type.replace(/_/g, ' ')} visit.

CRITICAL REQUIREMENTS:
1. DYNAMIC SECTION PRIORITIZATION: Reorder sections based on the patient's PRIMARY DIAGNOSIS
2. PROACTIVE MEDICARE COMPLIANCE: Include all required Medicare elements for ${patient.care_type === 'hospice' ? 'HOSPICE' : 'HOME HEALTH'} ${visit.visit_type.replace(/_/g, ' ')}

PATIENT INFORMATION:
- Name: ${patient.first_name} ${patient.last_name}
- Primary Diagnosis: ${patient.primary_diagnosis || 'Not specified'}
- Secondary Diagnoses: ${patient.secondary_diagnoses?.join(', ') || 'None'}
- Allergies: ${patient.allergies || 'NKDA'}
- Care Type: ${patient.care_type === 'hospice' ? 'Hospice Care' : 'Home Health'}
- Visit Type: ${visit.visit_type.replace(/_/g, ' ')}

`;

  if (Object.keys(vitalSigns).length > 0) {
    prompt += `\nCURRENT VITAL SIGNS ENTERED:
`;
    if (vitalSigns.temperature) prompt += `- Temperature: ${vitalSigns.temperature}°F\n`;
    if (vitalSigns.blood_pressure_systolic && vitalSigns.blood_pressure_diastolic) {
      prompt += `- Blood Pressure: ${vitalSigns.blood_pressure_systolic}/${vitalSigns.blood_pressure_diastolic} mmHg\n`;
    }
    if (vitalSigns.heart_rate) prompt += `- Heart Rate: ${vitalSigns.heart_rate} bpm\n`;
    if (vitalSigns.respiratory_rate) prompt += `- Respiratory Rate: ${vitalSigns.respiratory_rate} /min\n`;
    if (vitalSigns.oxygen_saturation) prompt += `- Oxygen Saturation: ${vitalSigns.oxygen_saturation}%\n`;
    if (vitalSigns.pain_level !== undefined) prompt += `- Pain Level: ${vitalSigns.pain_level}/10\n`;
  }

  if (previousVisit) {
    prompt += `\nPREVIOUS VISIT DATA (for comparison):
- Date: ${previousVisit.visit_date}
- Notes excerpt: ${previousVisit.nurse_notes?.substring(0, 300) || 'No previous notes'}
`;

    if (previousVisit.vital_signs && Object.keys(vitalSigns).length > 0) {
      prompt += `\nCOMPARISON TO PREVIOUS VISIT:
`;
      const prev = previousVisit.vital_signs;

      if (vitalSigns.blood_pressure_systolic && prev.blood_pressure_systolic) {
        const diff = vitalSigns.blood_pressure_systolic - prev.blood_pressure_systolic;
        prompt += `- BP: ${vitalSigns.blood_pressure_systolic}/${vitalSigns.blood_pressure_diastolic} today vs ${prev.blood_pressure_systolic}/${prev.blood_pressure_diastolic} last visit (${diff > 0 ? '+' : ''}${diff} systolic)\n`;
      }

      if (vitalSigns.heart_rate && prev.heart_rate) {
        const diff = vitalSigns.heart_rate - prev.heart_rate;
        prompt += `- Heart Rate: ${vitalSigns.heart_rate} today vs ${prev.heart_rate} last visit (${diff > 0 ? '+' : ''}${diff})\n`;
      }

      if (vitalSigns.oxygen_saturation && prev.oxygen_saturation) {
        const diff = vitalSigns.oxygen_saturation - prev.oxygen_saturation;
        prompt += `- O2 Saturation: ${vitalSigns.oxygen_saturation}% today vs ${prev.oxygen_saturation}% last visit (${diff > 0 ? '+' : ''}${diff}%)\n`;
      }
    }
  }

  prompt += `\n=== DYNAMIC SECTION PRIORITIZATION ===
Based on PRIMARY DIAGNOSIS "${patient.primary_diagnosis}" (or implied from conditions):
`;

  if (patient.primary_diagnosis?.toLowerCase().includes('chf') ||
      patient.primary_diagnosis?.toLowerCase().includes('heart failure')) {
    prompt += `
PRIORITIZE THESE SECTIONS FIRST (in this order):
1. CARDIOVASCULAR ASSESSMENT (TOP PRIORITY)
   - Weight comparison to baseline/previous visit (CRITICAL for CHF)
   - Edema assessment with specific grading
   - JVD, peripheral pulses
   - Dyspnea on exertion/at rest
   - Orthopnea/PND
   
2. RESPIRATORY ASSESSMENT
   - Lung sounds (crackles indicate fluid overload)
   - Oxygen saturation
   
3. MEDICATION MANAGEMENT
   - Diuretic compliance
   - Daily weight monitoring compliance
`;
  } else if (patient.primary_diagnosis?.toLowerCase().includes('copd') ||
             patient.primary_diagnosis?.toLowerCase().includes('emphysema')) {
    prompt += `
PRIORITIZE THESE SECTIONS FIRST (in this order):
1. RESPIRATORY ASSESSMENT (TOP PRIORITY)
   - Lung sounds (wheezes, diminished, crackles)
   - Dyspnea level
   - Use of accessory muscles
   - Oxygen therapy details
   
2. ACTIVITY TOLERANCE
   
3. MEDICATION MANAGEMENT
   - Inhaler technique
   - Oxygen compliance
`;
  } else if (patient.primary_diagnosis?.toLowerCase().includes('diabetes')) {
    prompt += `
PRIORITIZE THESE SECTIONS FIRST (in this order):
1. ENDOCRINE/METABOLIC ASSESSMENT (TOP PRIORITY)
   - Blood glucose readings
   - HbA1c trends
   - Hypoglycemic episodes
   
2. INTEGUMENTARY (Diabetic Foot Assessment)
   - Bilateral foot inspection
   - Sensation testing
   
3. MEDICATION MANAGEMENT
   - Insulin/oral medication compliance
   - Glucometer technique
`;
  } else if (patient.primary_diagnosis?.toLowerCase().includes('wound') ||
             patient.primary_diagnosis?.toLowerCase().includes('ulcer')) {
    prompt += `
PRIORITIZE THESE SECTIONS FIRST (in this order):
1. WOUND ASSESSMENT (TOP PRIORITY)
   - Measurements (L x W x D)
   - Wound bed characteristics
   - Drainage
   - Periwound condition
   
2. PAIN MANAGEMENT
   
3. NUTRITIONAL STATUS
`;
  } else {
    prompt += `
Use standard section ordering but emphasize areas most relevant to "${patient.primary_diagnosis}"
`;
  }

  prompt += `\n\n=== PROACTIVE MEDICARE COMPLIANCE ===
`;

  if (patient.care_type === 'home_health') {
    prompt += `
REQUIRED HOME HEALTH MEDICARE ELEMENTS (must include these sections with prompts):

1. **HOMEBOUND STATUS JUSTIFICATION** (CRITICAL - required for all home health visits):
   "HOMEBOUND STATUS: Patient remains homebound due to [nurse to document: taxing effort to leave home, requires assistance of another person, medical contraindication to leaving home, leaves home infrequently for medical appointments only]. Objective evidence: [nurse to document specific observations such as: severe SOB with minimal exertion, requires walker and assistance, bedbound, severe pain limiting mobility, cognitive impairment requiring supervision]."

2. **SKILLED NEED/MEDICAL NECESSITY** (CRITICAL):
   "SKILLED NURSING NECESSITY: Skilled nursing services required for [assessment of complex/unstable condition, medication management requiring RN judgment, wound care requiring sterile technique, patient/caregiver education for safe self-management]. Patient unable to safely self-manage due to [nurse to document]."

3. **PATIENT/CAREGIVER RESPONSE TO TEACHING**:
   Must document comprehension, barriers, and plan for continued education.

4. **FUNCTIONAL LIMITATIONS**:
   Document specific ADL/IADL limitations that require skilled intervention.

5. **SAFETY ASSESSMENT**:
   Home safety, fall risk, emergency plan.
`;
  }

  if (patient.care_type === 'hospice') {
    prompt += `
REQUIRED HOSPICE MEDICARE ELEMENTS (must include these sections with prompts):

1. **TERMINAL PROGNOSIS INDICATORS** (CRITICAL):
   "DISEASE PROGRESSION: [Nurse to document objective evidence of disease progression/decline consistent with terminal prognosis, such as: increased symptom burden, functional decline, weight loss, increased care needs]."

2. **SYMPTOM MANAGEMENT** (CRITICAL):
   Detailed assessment of pain and other distressing symptoms.
   "SYMPTOM ASSESSMENT: Pain [location/intensity/character], Dyspnea [severity/interventions], Nausea/Vomiting, Constipation, Anxiety/Agitation. Current management: [medications/interventions]. Effectiveness: [patient/family report]."

3. **PATIENT/FAMILY COPING**:
   "PSYCHOSOCIAL/SPIRTUAL: Patient and family coping with disease progression. [Nurse to document emotional status, spiritual concerns, grief anticipation]. Support systems in place: [document]."

4. **DECLINE IN FUNCTIONAL STATUS**:
   "FUNCTIONAL STATUS: [Document specific ADL dependencies, Karnofsky/Palliative Performance Scale if applicable]. Changes since last visit: [improved/declined/stable]."

5. **CAREGIVER EDUCATION & SUPPORT**:
   Must document education on disease process, what to expect, comfort measures, and 24-hour hospice availability.
`;
  }

  if (visit.visit_type === 'admission') {
    prompt += `\nADMISSION VISIT ADDITIONAL REQUIREMENTS:
- Complete medication reconciliation with source verification
- Advance directives discussion and documentation
- Emergency contact verification
- Comprehensive baseline assessment of all systems
- Patient/caregiver orientation to services
- Copy of rights and responsibilities provided
`;
  } else if (visit.visit_type === 'recertification') {
    prompt += `\nRECERTIFICATION VISIT ADDITIONAL REQUIREMENTS:
- Comprehensive reassessment of all systems
- Progress toward all care plan goals
- Continued need for services justification
- Update of all medications and diagnoses
- Discussion of ongoing plan of care
`;
  }

  prompt += `\n\nINSTRUCTIONS:
1. Generate a comprehensive template with ALL required Medicare elements above
2. Prioritize sections based on the primary diagnosis as specified
3. Auto-populate vital signs data with clinical narrative
4. Include comparison language where previous visit data exists
5. Use placeholders like [nurse to document specific observation] where nurse input is needed
6. Make it detailed and professional
7. Ensure every required Medicare element has a dedicated, clearly marked section
8. Format with clear section headers (use ** for headers)

Generate the complete template now:`;

  return prompt;
}

// Audio-transcription prompt: transcribe + intelligently merge into the narrative.
export function buildAudioNarrativePrompt({ patient, visit, vitalSigns, previousVisit, narrativeText }) {
  let prompt = `You are a skilled home health and hospice nursing documentation specialist. Your task is to accurately transcribe the provided audio and intelligently integrate the spoken observations into the clinical narrative.

CONTEXT - PATIENT INFORMATION:
- Name: ${patient.first_name} ${patient.last_name}
- Primary Diagnosis: ${patient.primary_diagnosis || 'Not specified'}
- Secondary Diagnoses: ${patient.secondary_diagnoses?.join(', ') || 'None'}
- Care Type: ${patient.care_type === 'hospice' ? 'Hospice Care' : 'Home Health'}
- Visit Type: ${visit.visit_type.replace(/_/g, ' ')}

`;
  if (Object.keys(vitalSigns).length > 0) {
    prompt += `VITAL SIGNS DOCUMENTED:
`;
    if (vitalSigns.temperature) prompt += `- Temperature: ${vitalSigns.temperature}°F\n`;
    if (vitalSigns.blood_pressure_systolic && vitalSigns.blood_pressure_diastolic) {
      prompt += `- Blood Pressure: ${vitalSigns.blood_pressure_systolic}/${vitalSigns.blood_pressure_diastolic} mmHg\n`;
    }
    if (vitalSigns.heart_rate) prompt += `- Heart Rate: ${vitalSigns.heart_rate} bpm\n`;
    if (vitalSigns.respiratory_rate) prompt += `- Respiratory Rate: ${vitalSigns.respiratory_rate} /min\n`;
    if (vitalSigns.oxygen_saturation) prompt += `- Oxygen Saturation: ${vitalSigns.oxygen_saturation}%\n`;
    if (vitalSigns.pain_level !== undefined) prompt += `- Pain Level: ${vitalSigns.pain_level}/10\n`;
  }

  if (previousVisit && previousVisit.vital_signs) {
    prompt += `\nPREVIOUS VISIT VITAL SIGNS (for comparison):
`;
    const prev = previousVisit.vital_signs;
    if (prev.blood_pressure_systolic) prompt += `- BP: ${prev.blood_pressure_systolic}/${prev.blood_pressure_diastolic} mmHg\n`;
    if (prev.heart_rate) prompt += `- Heart Rate: ${prev.heart_rate} bpm\n`;
    if (prev.oxygen_saturation) prompt += `- O2 Saturation: ${prev.oxygen_saturation}%\n`;
    if (prev.pain_level !== undefined) prompt += `- Pain Level: ${prev.pain_level}/10\n`;

    if (previousVisit.nurse_notes) {
      prompt += `\nPREVIOUS VISIT NOTES EXCERPT (for general context, not for copying): ${previousVisit.nurse_notes.substring(0, 500)}...\n`;
    }
  }

  if (narrativeText && narrativeText.length > 0) {
    prompt += `\nEXISTING NARRATIVE:
${narrativeText}

`;
  }

  prompt += `TASK:
1. Transcribe the audio content provided.
2. Integrate the transcribed observations and assessments into a coherent, professional clinical narrative.
3. If there is existing narrative (above), intelligently merge the new observations into it, enhancing or adding details without duplicating. Fill in any [nurse to document] placeholders from the existing narrative with information from the audio.
4. Ensure the output is Medicare-compliant for a ${patient.care_type === 'hospice' ? 'hospice' : 'home health'} visit.
5. Automatically incorporate the vital signs listed above into the narrative with proper clinical language.
6. ${previousVisit ? 'Compare current vital signs to previous visit and note trends (improved, stable, worsened).' : ''}
7. Use professional nursing terminology.
8. Follow SOAP format where applicable.
9. Include patient response to interventions, changes in condition, medication compliance, and education provided.

Generate the complete clinical narrative based on the audio and context:`;

  return prompt;
}
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { referral_id } = await req.json();

    if (!referral_id) {
      return Response.json({ error: 'referral_id is required' }, { status: 400 });
    }

    // Fetch the referral
    const referral = await base44.asServiceRole.entities.Referral.filter({ id: referral_id });
    if (!referral?.length || !referral[0].extracted_data) {
      return Response.json({ error: 'Referral not found or not processed' }, { status: 404 });
    }

    const refData = referral[0].extracted_data;

    // Extract and format data for Smart Note pre-population
    const smartNoteData = {
      patient_id: referral[0].patient_id,
      visit_type: 'admission',
      visit_date: refData.admission_details?.admission_date || new Date().toISOString().split('T')[0],
      
      // Diagnosis
      diagnosis: refData.diagnoses?.primary_diagnosis || '',
      secondary_diagnoses: refData.diagnoses?.secondary_diagnoses || [],
      
      // Vitals from referral
      vital_signs: {
        bp_systolic: refData.vital_signs?.blood_pressure_systolic || '',
        bp_diastolic: refData.vital_signs?.blood_pressure_diastolic || '',
        hr: refData.vital_signs?.heart_rate || '',
        temp: refData.vital_signs?.temperature || '',
        o2: refData.vital_signs?.oxygen_saturation || '',
        pain: refData.vital_signs?.pain_level || ''
      },
      
      // Admission-specific notes template
      admission_note_template: generateAdmissionNoteTemplate(refData),
      
      // Key clinical points
      clinical_summary: {
        primary_diagnosis: refData.diagnoses?.primary_diagnosis,
        icd10_codes: refData.diagnoses?.icd10_codes || [],
        skilled_needs: refData.care_needs?.skilled_nursing || [],
        medications: refData.medications || [],
        allergies: refData.diagnoses?.allergies || 'NKDA',
        
        // Clinical urgency flags
        urgent_clinical_items: refData.urgent_clinical_items || [],
        
        // Pre-visit instructions
        instructions_from_referral: refData.admission_details?.special_instructions || ''
      },
      
      // Patient demographics for context
      patient_demographics: {
        name: refData.demographics?.full_name,
        dob: refData.demographics?.date_of_birth,
        address: refData.demographics?.address,
        phone: refData.demographics?.phone,
        emergency_contact: refData.demographics?.emergency_contact,
        physician: refData.demographics?.referring_physician
      }
    };

    return Response.json({ smartNoteData });
  } catch (error) {
    console.error('Error extracting referral data:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

function generateAdmissionNoteTemplate(refData) {
  const sections = [];
  
  // Chief Complaint / Reason for Admission
  sections.push(`REASON FOR ADMISSION:\n${refData.admission_details?.referral_reason || 'Admission to home health services'}`);
  
  // History of Present Illness (from referral)
  if (refData.admission_details?.clinical_history) {
    sections.push(`\nHISTORY OF PRESENT ILLNESS:\n${refData.admission_details.clinical_history}`);
  }
  
  // Past Medical History
  if (refData.diagnoses?.past_medical_history?.length > 0) {
    sections.push(`\nPAST MEDICAL HISTORY:\n${refData.diagnoses.past_medical_history.join(', ')}`);
  }
  
  // Current Medications (from referral)
  if (refData.medications?.length > 0) {
    const medsList = refData.medications.map(m => 
      `${m.name} ${m.dosage ? m.dosage + ' ' : ''}${m.frequency ? m.frequency : ''}`
    ).join('\n');
    sections.push(`\nCURRENT MEDICATIONS:\n${medsList}`);
  }
  
  // Allergies
  sections.push(`\nALLERGIES:\n${refData.diagnoses?.allergies || 'NKDA'}`);
  
  // Skilled Nursing Needs
  if (refData.care_needs?.skilled_nursing?.length > 0) {
    sections.push(`\nSKILLED NURSING NEEDS:\n${refData.care_needs.skilled_nursing.join(', ')}`);
  }
  
  // Vital Signs (from referral)
  if (refData.vital_signs) {
    const vitals = [];
    if (refData.vital_signs.blood_pressure_systolic) vitals.push(`BP: ${refData.vital_signs.blood_pressure_systolic}/${refData.vital_signs.blood_pressure_diastolic}`);
    if (refData.vital_signs.heart_rate) vitals.push(`HR: ${refData.vital_signs.heart_rate}`);
    if (refData.vital_signs.temperature) vitals.push(`Temp: ${refData.vital_signs.temperature}`);
    if (refData.vital_signs.oxygen_saturation) vitals.push(`O2 Sat: ${refData.vital_signs.oxygen_saturation}%`);
    if (vitals.length > 0) {
      sections.push(`\nVITAL SIGNS (from referral):\n${vitals.join(', ')}`);
    }
  }
  
  // Special Instructions
  if (refData.admission_details?.special_instructions) {
    sections.push(`\nSPECIAL INSTRUCTIONS:\n${refData.admission_details.special_instructions}`);
  }
  
  return sections.join('\n\n');
}
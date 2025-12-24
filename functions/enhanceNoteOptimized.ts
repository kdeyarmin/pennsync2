import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { 
      roughNote,
      patientId,
      visitType,
      visitDate,
      diagnosis,
      vitalSigns,
      nurseType = 'RN'
    } = await req.json();

    if (!roughNote || !patientId) {
      return Response.json({ error: 'roughNote and patientId required' }, { status: 400 });
    }

    // Fetch all required data in parallel
    const [patient, carePlans, recentVisits, oasisData] = await Promise.all([
      base44.asServiceRole.entities.Patient.filter({ id: patientId }, '', 1),
      base44.asServiceRole.entities.CarePlan.filter({ patient_id: patientId, status: 'active' }),
      base44.asServiceRole.entities.Visit.filter({ patient_id: patientId, status: 'completed' }, '-visit_date', 3),
      base44.asServiceRole.entities.OASISUpload.filter({ patient_id: patientId }, '-created_date', 1)
    ]);

    const patientData = patient[0];
    const oasis = oasisData[0];

    if (!patientData) {
      return Response.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Build comprehensive context
    const contextPrompt = `
PATIENT CONTEXT:
- Name: ${patientData.first_name} ${patientData.last_name}
- Primary Diagnosis: ${patientData.primary_diagnosis || diagnosis}
- Secondary Diagnoses: ${patientData.secondary_diagnoses?.join(', ') || 'None'}
- Allergies: ${patientData.allergies || 'None'}
- Current Medications: ${patientData.current_medications?.map(m => m.name).slice(0, 5).join(', ') || 'None'}
- Age: ${patientData.date_of_birth ? Math.floor((new Date() - new Date(patientData.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000)) : 'Unknown'}

VISIT DETAILS:
- Visit Type: ${visitType}
- Visit Date: ${visitDate}
- Documenting Nurse: ${nurseType}
- Vitals: ${JSON.stringify(vitalSigns)}

ACTIVE CARE PLANS:
${carePlans.map(cp => `- ${cp.problem}: ${cp.goal}`).join('\n') || '- No active care plans'}

RECENT HISTORY:
${recentVisits.length > 0 ? `Last visit ${recentVisits[0].visit_date}: ${recentVisits[0].visit_type}` : 'No previous visits'}

${oasis ? `OASIS DATA:
- Functional Level: ${oasis.pdgm_data?.functional_impairment_level || 'Not specified'}
- Clinical Group: ${oasis.pdgm_data?.clinical_grouping || 'Not specified'}
- Cognitive Status: ${oasis.extracted_data?.cognitive_functioning || 'Not assessed'}
- ADL Limitations: ${oasis.extracted_data?.adl_limitations ? Object.keys(oasis.extracted_data.adl_limitations).join(', ') : 'None'}` : ''}

ROUGH NOTES:
${roughNote}
`;

    // Run rough compliance check and enhancement in parallel
    const [roughComplianceResult, enhancementResult] = await Promise.all([
      base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Analyze rough note for Medicare compliance. Return score and gaps.

${contextPrompt}

Return JSON with compliance_score, missing_elements, and specific_gaps.`,
        response_json_schema: {
          type: "object",
          properties: {
            compliance_score: { type: "number" },
            missing_elements: { type: "array", items: { type: "string" } },
            specific_gaps: { type: "array", items: { type: "object" } }
          }
        }
      }),
      base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Transform rough notes into Medicare-compliant clinical narrative.

${contextPrompt}

CRITICAL REQUIREMENTS:
1. HOMEBOUND STATUS: Document specific mobility limitations
2. SKILLED NEED: Clearly state why ${nurseType} skills required
3. PATIENT RESPONSE: Include patient understanding and feedback
4. FUNCTIONAL ASSESSMENT: Document ADL/IADL status
5. SAFETY FACTORS: Address fall risk and other safety concerns

${diagnosis?.includes('CHF') ? '- CHF: Document weight, edema grading, lung sounds, fluid status' : ''}
${diagnosis?.includes('COPD') ? '- COPD: Document O2 sat, respiratory status, lung sounds' : ''}
${diagnosis?.includes('Diabetes') ? '- Diabetes: Document glucose, foot exam, neuropathy assessment' : ''}

Format as complete clinical narrative. No meta-commentary about documentation.

Return JSON with enhanced_note and quality_score.`,
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
      prompt: `Analyze enhanced note for compliance score.

ENHANCED NOTE:
${enhancementResult.enhanced_note}

VISIT TYPE: ${visitType}

Return JSON with compliance_score and compliant_elements.`,
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
        diagnosis: diagnosis,
        enhanced_note: enhancementResult.enhanced_note,
        rough_note: roughNote,
        quality_score: enhancementResult.quality_score,
        nurse_email: user.email,
        vital_signs: vitalSigns
      }
    ].slice(-10); // Keep last 10

    await base44.asServiceRole.entities.Patient.update(patientId, {
      enhanced_notes_history: updatedHistory
    });

    // Track conversion
    const complianceImprovement = enhancedComplianceResult.compliance_score - roughComplianceResult.compliance_score;

    await base44.asServiceRole.entities.NoteConversion.create({
      nurse_email: user.email,
      patient_id: patientId,
      visit_type: visitType,
      diagnosis: diagnosis,
      rough_note_length: roughNote.length,
      enhanced_note_length: enhancementResult.enhanced_note.length,
      quality_score: enhancementResult.quality_score,
      rough_note_compliance: roughComplianceResult.compliance_score,
      enhanced_note_compliance: enhancedComplianceResult.compliance_score,
      compliance_improvement: complianceImprovement
    });

    return Response.json({
      success: true,
      enhanced_note: enhancementResult.enhanced_note,
      quality_score: enhancementResult.quality_score,
      rough_compliance: roughComplianceResult,
      enhanced_compliance: enhancedComplianceResult,
      compliance_improvement: complianceImprovement,
      documentation_gaps: roughComplianceResult.specific_gaps
    });

  } catch (error) {
    console.error('Note enhancement error:', error);
    return Response.json({ 
      error: error.message,
      success: false 
    }, { status: 500 });
  }
});
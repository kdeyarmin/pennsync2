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
        prompt: `Analyze rough note for MEDICARE HOME HEALTH compliance per 42 CFR 484 Conditions of Participation.

${contextPrompt}

MEDICARE HOME HEALTH DOCUMENTATION REQUIREMENTS (42 CFR 484):

MANDATORY ELEMENTS:
1. HOMEBOUND STATUS (484.55(a)): Specific reasons patient cannot leave home without taxing effort
2. SKILLED NEED (484.20): Why skilled nursing/therapy services are reasonable and necessary
3. PHYSICIAN ORDERS: All services must be under physician's orders
4. PLAN OF CARE: Documented goals and interventions
5. COORDINATION: Communication with physician and other providers
6. PATIENT/CAREGIVER INSTRUCTION: Education provided and comprehension verified
7. SAFETY ASSESSMENT: Fall risk, medication safety, environment
8. FUNCTIONAL STATUS: ADL/IADL limitations and assistance needs
9. PATIENT RESPONSE: Response to treatment/interventions
10. PROGRESS TOWARD GOALS: Documented improvement/decline

PENNSYLVANIA REQUIREMENTS:
- RN supervision for LPN visits
- Infection control measures
- Patient rights acknowledgment

Return JSON with compliance_score, missing_elements array, and specific_gaps array with element, reason, cop_reference, severity.`,
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
        prompt: `Transform rough notes into MEDICARE HOME HEALTH COMPLIANT clinical narrative per 42 CFR 484.

${contextPrompt}

CRITICAL MEDICARE CoP REQUIREMENTS (42 CFR 484):

1. HOMEBOUND STATUS (484.55(a)) - MANDATORY:
   - Specific physical limitations (e.g., shortness of breath after 10 feet, severe pain, wheelchair-bound)
   - Why leaving home requires considerable and taxing effort
   - Assistance/supportive devices needed
   - Infrequent absences for medical care or religious services noted if applicable
   ${oasis ? `- OASIS functional level ${oasis.pdgm_data?.functional_impairment_level} requires documentation` : ''}

2. SKILLED NURSING NEED (484.20) - MANDATORY:
   ${nurseType === 'RN' ? `RN SKILLED SERVICES INCLUDE:
   - Comprehensive assessment requiring clinical judgment
   - Complex medication management requiring nursing expertise
   - Patient/caregiver teaching requiring professional skills
   - Observation and assessment of unstable condition
   - Wound care requiring sterile technique and clinical decisions
   - Management of multi-system diseases
   - Coordination of complex care with physician` : `LPN SKILLED SERVICES (Under RN Supervision per PA regulations):
   - Specific skilled tasks per established care plan
   - Medication administration requiring nursing judgment
   - Wound care per protocol
   - Implementation of teaching plan (not initial assessment/planning)
   - Monitoring vital signs with clinical assessment
   - Report significant changes to supervising RN`}
   - Must explain WHY skilled professional needed (not just what was done)
   - Unskilled care that family/aide could provide does NOT meet skilled criteria

3. PATIENT RESPONSE TO TREATMENT (484.60) - MANDATORY:
   - Objective measurable response to interventions
   - Changes from previous visit
   - Patient/caregiver understanding demonstrated (teach-back)
   - Modifications to care plan based on response

4. COORDINATION OF CARE (484.60):
   - Physician communication documented (when applicable)
   - Collaboration with other disciplines noted
   - Medication reconciliation with physician orders

5. SAFETY ASSESSMENT (484.80):
   - Fall risk factors and interventions
   - Home safety hazards identified and addressed
   - Emergency plan established
   - Medication safety reviewed

6. FUNCTIONAL STATUS & PROGRESS (484.55):
   - Current ADL/IADL abilities
   - Changes from baseline/previous visit
   - Progress toward care plan goals with measurable data
   - Barriers to progress identified

7. PATIENT/CAREGIVER EDUCATION (484.60):
   - Specific teaching provided
   - Methods used for education
   - Comprehension verified via teach-back or demonstration
   - Written materials provided

CONDITION-SPECIFIC REQUIREMENTS:
${diagnosis?.includes('CHF') || diagnosis?.includes('Heart Failure') ? `CHF DOCUMENTATION:
- Daily weight trend and comparison to dry weight
- Bilateral lower extremity edema (grade 0-4+, location)
- Lung sounds bilateral (crackles, wheezes location)
- Jugular venous distension presence/absence
- Orthopnea, paroxysmal nocturnal dyspnea
- Fluid restriction compliance
- Medication compliance (diuretics, ACE-I, beta blockers)
- Patient knowledge of weight monitoring and when to call MD` : ''}

${diagnosis?.includes('COPD') || diagnosis?.includes('Pulmonary') ? `COPD DOCUMENTATION:
- Oxygen saturation on room air AND on prescribed O2
- Respiratory rate, work of breathing, accessory muscle use
- Lung sounds bilateral (wheezes, rhonchi, diminished sounds)
- Dyspnea level with activity (specific distance/activity)
- Inhaler technique demonstration and competency
- Oxygen equipment safety teaching
- Signs of exacerbation recognized by patient` : ''}

${diagnosis?.includes('Diabetes') || diagnosis?.includes('Diabetic') ? `DIABETES DOCUMENTATION:
- Blood glucose reading at visit with trend over past week
- Diabetic foot exam: pedal pulses (DP, PT), capillary refill, skin integrity between toes, sensation test (monofilament)
- Peripheral neuropathy assessment (numbness, tingling, pain)
- Patient demonstrates proper glucose monitoring technique
- Medication administration technique verified
- Hypoglycemia recognition and treatment plan understood
- Foot care education and comprehension` : ''}

${diagnosis?.includes('Wound') || diagnosis?.includes('Ulcer') || diagnosis?.includes('Pressure') ? `WOUND DOCUMENTATION:
- Wound measurements (length x width x depth in cm)
- Wound bed: % granulation, % slough, % eschar
- Exudate: type (serous/serosanguinous/purulent), amount (scant/moderate/copious), odor
- Periwound skin: intact, macerated, erythema, induration
- Undermining or tunneling: location (clock face) and depth
- Treatment rendered: cleansing agent, dressing type and layers
- Pain level before/during/after treatment
- Signs of infection assessed (increased warmth, erythema, purulent drainage, fever)
- Patient/caregiver ability to assist with dressing changes` : ''}

${diagnosis?.includes('Stroke') || diagnosis?.includes('CVA') ? `STROKE DOCUMENTATION:
${nurseType === 'RN' ? `- Level of consciousness: alert, oriented x 3 (person/place/time)
- Speech: clear, slurred, aphasia (expressive/receptive)
- Facial symmetry: equal bilaterally or facial droop noted
- Motor strength: bilateral upper/lower extremities (0-5 scale)
- Sensation: intact or deficits noted bilateral
- Coordination: finger to nose, heel to shin tests
- Gait: steady, unsteady, assistive device used
- Swallowing safety: choking risk, diet modifications` : `- Level of consciousness and orientation observed
- Speech clarity during interaction
- Observed mobility and transfers
- Assistance provided with ADLs per care plan
- Swallowing observed during meal/medication (report concerns to RN)
- Safety measures maintained (fall risk)
- Patient response to therapy exercises per plan`}
- Fall prevention measures implemented and reinforced` : ''}

VISIT TYPE-SPECIFIC REQUIREMENTS:
${visitType === 'admission' || visitType === 'start_of_care' ? `START OF CARE VISIT MANDATORY ELEMENTS:
- Comprehensive initial assessment all body systems
- Admission source (home, hospital, SNF) documented
- Complete medication reconciliation with physician orders
- Initial skilled need establishment
- Initial homebound justification
- Baseline functional status (ADLs/IADLs)
- Initial safety assessment
- Patient rights reviewed and acknowledged
- Emergency plan established
- Care plan goals established with patient/family input
- Initial patient/caregiver teaching plan` : ''}

${visitType === 'recertification' ? `RECERTIFICATION VISIT MANDATORY ELEMENTS:
- Progress toward each care plan goal with objective data
- Functional status changes from admission baseline
- Continued homebound status with current justification
- Continued skilled need documented
- Medication review and reconciliation
- Ongoing safety assessment
- Updated patient/caregiver teaching needs
- Plan for continued services or discharge planning initiated` : ''}

${visitType === 'discharge' ? `DISCHARGE VISIT MANDATORY ELEMENTS:
- Reason for discharge clearly stated
- Goals met/partially met/not met with objective outcomes
- Functional status at discharge vs admission
- Patient/caregiver education completed and comprehension verified
- Discharge instructions provided in writing
- Follow-up appointments arranged
- Physician notification of discharge
- Equipment/supplies status (DME removal, remaining supplies)
- Safety measures in place for independent management
- Emergency contact information provided
- Patient verbalized understanding of self-care` : ''}

FORMATTING REQUIREMENTS:
- Complete sentences in narrative paragraph format
- Past tense for completed actions
- Objective, measurable terminology (avoid vague terms like "stable" or "doing well")
- Specific clinical findings with measurements
- Professional medical terminology
- No abbreviations except standard medical abbreviations
- Document time in/time out if visit >60 minutes

CRITICAL - DOCUMENTATION STANDARDS:
- Write ONLY the clinical narrative as it would appear in patient chart
- NO meta-commentary about documentation requirements
- NO statements about compliance or reimbursement
- Focus on WHAT was observed, assessed, done, taught, and patient response
- If rough notes lack required elements, ADD them with [bracket placeholders] for nurse completion

Return JSON with enhanced_note and quality_score (0-100).`,
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
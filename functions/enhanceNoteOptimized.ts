import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';
import OpenAI from 'npm:openai';

const openai = new OpenAI({
  apiKey: Deno.env.get("OPENAI_API_KEY"),
});

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

    const patientAge = patientData.date_of_birth
      ? Math.floor((new Date() - new Date(patientData.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000))
      : 'Unknown';

    const contextBlock = `
PATIENT CONTEXT:
- Name: ${patientData.first_name} ${patientData.last_name}
- Age: ${patientAge}
- Primary Diagnosis: ${patientData.primary_diagnosis || diagnosis || 'Not specified'}
- Secondary Diagnoses: ${patientData.secondary_diagnoses?.join(', ') || 'None'}
- Allergies: ${patientData.allergies || 'NKDA'}
- Current Medications: ${patientData.current_medications?.map(m => m.name).slice(0, 8).join(', ') || 'See medication list'}

VISIT DETAILS:
- Visit Type: ${visitType}
- Visit Date: ${visitDate}
- Documenting Nurse: ${nurseType}
- Vitals Recorded: ${JSON.stringify(vitalSigns)}

ACTIVE CARE PLANS:
${carePlans.map(cp => `- ${cp.problem}: Goal: ${cp.goal}`).join('\n') || '- No active care plans on file'}

RECENT VISIT HISTORY:
${recentVisits.length > 0
  ? recentVisits.map(v => `- ${v.visit_date} (${v.visit_type}): ${v.nurse_notes?.slice(0, 150) || 'No notes'}...`).join('\n')
  : '- No previous visits on record'}

${oasis ? `OASIS FUNCTIONAL DATA:
- Functional Level: ${oasis.pdgm_data?.functional_impairment_level || 'Not specified'}
- Clinical Group: ${oasis.pdgm_data?.clinical_grouping || 'Not specified'}
- Cognitive Status: ${oasis.extracted_data?.cognitive_functioning || 'Not assessed'}
- ADL Limitations: ${oasis.extracted_data?.adl_limitations ? Object.keys(oasis.extracted_data.adl_limitations).join(', ') : 'See OASIS'}` : ''}

ROUGH NURSE NOTE TO REVIEW AND ENHANCE:
${roughNote}
`;

    const systemPrompt = `You are an expert Medicare home health compliance specialist and clinical documentation reviewer with deep knowledge of:
- 42 CFR 484 Conditions of Participation (CoP)
- CMS Home Health Benefit requirements
- Medicare documentation standards for skilled nursing
- OASIS data set requirements
- PDGM clinical groupings and reimbursement

Your role is to:
1. Review rough nurse notes for regulatory, compliance, and Medicare standards
2. Identify every missing required element
3. Generate a fully Medicare-compliant clinical note that will withstand ADR (Additional Documentation Request) review

You must ensure EVERY note contains ALL required Medicare elements or it will be flagged for non-payment.`;

    const complianceCheckPrompt = `${systemPrompt}

${contextBlock}

STEP 1 - MEDICARE COMPLIANCE AUDIT:
Thoroughly analyze the rough note above against ALL of these mandatory Medicare Home Health documentation requirements per 42 CFR 484:

MANDATORY ELEMENTS CHECKLIST:
1. HOMEBOUND STATUS (42 CFR 484.55(a)) - Patient cannot leave home without considerable/taxing effort; specific physical limitations documented
2. SKILLED NURSING NEED (42 CFR 484.20) - Why a licensed nurse (not aide/family) is required; clinical complexity documented
3. PHYSICIAN ORDERS (42 CFR 484.60) - All services ordered by physician; orders acknowledged
4. PLAN OF CARE ALIGNMENT (42 CFR 484.60) - Goals addressed; interventions match care plan
5. PATIENT/CAREGIVER EDUCATION (42 CFR 484.60) - Specific teaching provided; teach-back or demonstration of comprehension documented
6. SAFETY ASSESSMENT (42 CFR 484.80) - Fall risk, home hazards, medication safety, emergency plan
7. FUNCTIONAL STATUS (42 CFR 484.55) - ADL/IADL current abilities with measurable data
8. PATIENT RESPONSE TO TREATMENT (42 CFR 484.60) - Objective response to interventions; changes from last visit
9. PROGRESS TOWARD GOALS - Measurable progress with objective data; or barriers documented
10. COORDINATION OF CARE (42 CFR 484.60) - MD communication; interdisciplinary coordination
11. VITAL SIGNS WITH CLINICAL INTERPRETATION - Not just numbers; clinical significance addressed
12. MEDICATION REVIEW - Compliance, adverse effects, interactions noted
13. CONDITION-SPECIFIC CLINICAL FINDINGS - Diagnosis-appropriate assessment documented

VISIT TYPE SPECIFIC (${visitType}):
${visitType === 'admission' ? '- Comprehensive baseline assessment all body systems\n- Initial skilled need establishment\n- Complete medication reconciliation\n- Patient rights reviewed\n- Emergency plan established\n- Care plan goals set with patient/family input' : ''}
${visitType === 'recertification' ? '- Progress toward each care plan goal with objective data\n- Functional status changes from admission baseline\n- Continued homebound status current justification\n- Updated teaching needs\n- Discharge planning initiated if appropriate' : ''}
${visitType === 'discharge' ? '- Reason for discharge clearly stated\n- Goals met/partially met/not met with outcomes\n- Discharge instructions provided in writing\n- Follow-up appointments arranged\n- Patient verbalized understanding of self-care' : ''}

Return a JSON object with:
{
  "compliance_score": <number 0-100>,
  "missing_elements": [<array of missing element names>],
  "specific_gaps": [
    {
      "element": "<element name>",
      "reason": "<why it's missing or insufficient>",
      "cop_reference": "<42 CFR 484.XX>",
      "severity": "<critical|high|medium>"
    }
  ],
  "strengths": [<array of well-documented elements>]
}`;

    const noteEnhancementPrompt = `${systemPrompt}

${contextBlock}

STEP 2 - GENERATE FULLY MEDICARE-COMPLIANT CLINICAL NOTE:

Using the rough note and all patient context above, generate a complete, Medicare-compliant home health nursing note that will pass ADR review and support reimbursement under PDGM.

MANDATORY REQUIREMENTS FOR THE FINAL NOTE:

1. HOMEBOUND STATUS (42 CFR 484.55(a)) — MUST INCLUDE:
   - Specific physical limitations preventing leaving home without taxing effort
   - Assistive devices required (walker, wheelchair, O2, etc.)
   - Distance/exertion limitations (e.g., "SOB after walking 10 feet on room air")
   - Infrequent absence exceptions documented if applicable

2. SKILLED NURSING NEED (42 CFR 484.20) — MUST INCLUDE:
   ${nurseType === 'RN'
     ? '- Clinical complexity requiring RN assessment and judgment\n   - Services that cannot be safely performed by untrained person\n   - Assessment, teaching, medication management, or wound care requiring professional skill'
     : '- Specific skilled tasks performed under RN supervision per care plan\n   - PA state requirement: RN supervision documented\n   - Tasks requiring nursing judgment and licensure'}

3. VITAL SIGNS WITH CLINICAL INTERPRETATION — include all recorded vitals and their clinical significance

4. HEAD-TO-TOE / SYSTEM-SPECIFIC ASSESSMENT:
${diagnosis?.toLowerCase().includes('chf') || diagnosis?.toLowerCase().includes('heart failure') ? `   CHF REQUIRED ELEMENTS:
   - Daily weight and comparison to dry weight/previous weight
   - Bilateral lower extremity edema (grade 0-4+)
   - Lung sounds bilateral (clear, crackles location/quality)
   - JVD presence/absence
   - Orthopnea, PND symptoms
   - Fluid restriction compliance
   - Diuretic/ACE-I/beta-blocker compliance and response` : ''}
${diagnosis?.toLowerCase().includes('copd') || diagnosis?.toLowerCase().includes('pulmonary') ? `   COPD REQUIRED ELEMENTS:
   - O2 sat on room air AND prescribed O2 flow rate
   - Respiratory rate and work of breathing
   - Lung sounds bilateral (wheezes, rhonchi, diminished)
   - Dyspnea level with specific activity/distance
   - Inhaler technique observed
   - O2 equipment safety
   - Signs of exacerbation` : ''}
${diagnosis?.toLowerCase().includes('diabet') ? `   DIABETES REQUIRED ELEMENTS:
   - Blood glucose at visit and trend
   - Diabetic foot exam: pedal pulses (DP/PT), capillary refill, skin between toes, monofilament sensation
   - Peripheral neuropathy symptoms
   - Glucose monitoring technique demonstrated
   - Injection technique if applicable
   - Hypoglycemia recognition/treatment verbalized
   - Foot care compliance` : ''}
${diagnosis?.toLowerCase().includes('wound') || diagnosis?.toLowerCase().includes('ulcer') || diagnosis?.toLowerCase().includes('pressure') ? `   WOUND CARE REQUIRED ELEMENTS:
   - Measurements: length x width x depth in cm
   - Wound bed: % granulation, slough, eschar
   - Exudate: type, amount, odor
   - Periwound skin condition
   - Undermining/tunneling: clock face location and depth
   - Treatment rendered: cleansing agent, dressing layers
   - Pain before/during/after
   - Infection signs assessed` : ''}
${diagnosis?.toLowerCase().includes('stroke') || diagnosis?.toLowerCase().includes('cva') ? `   STROKE/CVA REQUIRED ELEMENTS:
   - LOC and orientation (person/place/time)
   - Speech quality (clear, slurred, aphasia type)
   - Facial symmetry
   - Motor strength bilateral UE/LE (0-5 scale)
   - Gait and assistive device
   - Swallowing safety
   - Fall prevention measures` : ''}

5. PATIENT/CAREGIVER EDUCATION — MUST INCLUDE:
   - Specific topics taught this visit
   - Teaching method (verbal, demonstration, written materials)
   - Comprehension verified via teach-back or return demonstration
   - Patient/caregiver verbalized understanding or demonstrated skill

6. SAFETY ASSESSMENT — MUST INCLUDE:
   - Fall risk level and specific interventions
   - Home environment safety
   - Medication safety
   - Emergency plan

7. PATIENT RESPONSE TO TREATMENT — MUST INCLUDE:
   - Objective response to interventions
   - Comparison to previous visit
   - Progress toward care plan goals with measurable data
   - Barriers if applicable

8. PLAN / COORDINATION:
   - Physician notification if applicable
   - Next visit plan
   - Any referrals or coordination

FORMATTING STANDARDS:
- Professional clinical narrative in paragraph format
- Past tense for completed actions
- Objective, measurable language (NO vague terms like "stable," "doing well," "no complaints")
- Use clinical measurements and specifics
- Standard medical abbreviations only
- If rough note is missing required data, insert [PLACEHOLDER: description] for nurse to complete
- Write ONLY the clinical note — no meta-commentary, no compliance notes, no instructions

Return a JSON object with:
{
  "enhanced_note": "<full clinical note text>",
  "quality_score": <number 0-100>,
  "elements_added": [<list of Medicare elements added that were missing>],
  "placeholders_added": [<list of placeholders inserted for nurse to complete>]
}`;

    // Run compliance check and note enhancement in parallel using ChatGPT
    const [complianceResponse, enhancementResponse] = await Promise.all([
      openai.chat.completions.create({
        model: "gpt-4o-2024-11-20",
        messages: [
          { role: "system", content: "You are a Medicare home health compliance expert. Always return valid JSON." },
          { role: "user", content: complianceCheckPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.2
      }),
      openai.chat.completions.create({
        model: "gpt-4o-2024-11-20",
        messages: [
          { role: "system", content: "You are an expert Medicare home health clinical documentation specialist. Always return valid JSON." },
          { role: "user", content: noteEnhancementPrompt }
        ],
        response_format: { type: "json_object" },
        temperature: 0.3
      })
    ]);

    const roughComplianceResult = JSON.parse(complianceResponse.choices[0].message.content);
    const enhancementResult = JSON.parse(enhancementResponse.choices[0].message.content);

    // Run enhanced note compliance check with ChatGPT
    const enhancedComplianceResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a Medicare home health compliance auditor. Return valid JSON." },
        { role: "user", content: `Audit this enhanced home health nursing note for Medicare compliance per 42 CFR 484.

VISIT TYPE: ${visitType}
DIAGNOSIS: ${diagnosis || patientData.primary_diagnosis}

NOTE TO AUDIT:
${enhancementResult.enhanced_note}

Return JSON:
{
  "compliance_score": <number 0-100>,
  "compliant_elements": [<list of all compliant Medicare elements present>],
  "remaining_gaps": [<any still-missing elements>]
}` }
      ],
      response_format: { type: "json_object" },
      temperature: 0.1
    });

    const enhancedComplianceResult = JSON.parse(enhancedComplianceResponse.choices[0].message.content);

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
    ].slice(-10);

    await base44.asServiceRole.entities.Patient.update(patientId, {
      enhanced_notes_history: updatedHistory
    });

    const complianceImprovement = (enhancedComplianceResult.compliance_score || 0) - (roughComplianceResult.compliance_score || 0);

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
      elements_added: enhancementResult.elements_added || [],
      placeholders_added: enhancementResult.placeholders_added || [],
      rough_compliance: roughComplianceResult,
      enhanced_compliance: enhancedComplianceResult,
      compliance_improvement: complianceImprovement,
      documentation_gaps: roughComplianceResult.specific_gaps || []
    });

  } catch (error) {
    console.error('Note enhancement error:', error);
    return Response.json({
      error: error.message,
      success: false
    }, { status: 500 });
  }
});
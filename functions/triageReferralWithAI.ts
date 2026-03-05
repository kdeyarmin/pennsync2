import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { referralData } = body;

    if (!referralData) {
      return Response.json({ error: 'Referral data required' }, { status: 400 });
    }

    // Use OpenAI to analyze and structure the referral
    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: `You are an expert home health triage nurse. Analyze the following unstructured referral data and provide a structured assessment.

REFERRAL DATA:
${referralData}

Provide a JSON response with this exact structure:
{
  "patient_name": "extracted patient name or 'Not provided'",
  "date_of_birth": "extracted DOB or 'Not provided'",
  "primary_diagnosis": "main diagnosis extracted",
  "secondary_diagnoses": ["list of other conditions"],
  "urgency_level": "CRITICAL|HIGH|MEDIUM|LOW",
  "urgency_reason": "brief explanation for urgency assignment",
  "key_risk_factors": ["list of identified risk factors"],
  "clinical_summary": "concise assessment of patient's current status",
  "preliminary_care_plan": {
    "skilled_nursing_frequency": "e.g., 3x weekly",
    "initial_focus_areas": ["primary interventions needed"],
    "medications_to_reconcile": "notable medications mentioned",
    "equipment_needed": ["supplies or equipment required"],
    "safety_concerns": ["identified safety issues"],
    "discharge_readiness": "assessment of current status"
  },
  "admission_notes": "brief notes for admission nurse",
  "data_gaps": ["information missing from referral"]
}

Return ONLY valid JSON, no markdown or explanation.`,
      response_json_schema: {
        type: 'object',
        properties: {
          patient_name: { type: 'string' },
          date_of_birth: { type: 'string' },
          primary_diagnosis: { type: 'string' },
          secondary_diagnoses: { type: 'array', items: { type: 'string' } },
          urgency_level: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] },
          urgency_reason: { type: 'string' },
          key_risk_factors: { type: 'array', items: { type: 'string' } },
          clinical_summary: { type: 'string' },
          preliminary_care_plan: {
            type: 'object',
            properties: {
              skilled_nursing_frequency: { type: 'string' },
              initial_focus_areas: { type: 'array', items: { type: 'string' } },
              medications_to_reconcile: { type: 'string' },
              equipment_needed: { type: 'array', items: { type: 'string' } },
              safety_concerns: { type: 'array', items: { type: 'string' } },
              discharge_readiness: { type: 'string' },
            },
          },
          admission_notes: { type: 'string' },
          data_gaps: { type: 'array', items: { type: 'string' } },
        },
      },
    });

    // Log the triage analysis for audit trail
    await base44.entities.UserActivity.create({
      user_email: user.email,
      user_name: user.full_name,
      action: 'referral_triage_analysis',
      details: {
        patient_name: analysis.patient_name,
        urgency_level: analysis.urgency_level,
        timestamp: new Date().toISOString(),
      },
      page: 'referral_triage',
      user_agent: req.headers.get('user-agent'),
    }).catch(err => console.error('Activity logging failed:', err));

    return Response.json({
      success: true,
      analysis,
      processedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Triage analysis error:', error);
    return Response.json(
      { error: 'Triage analysis failed', details: error.message },
      { status: 500 }
    );
  }
});
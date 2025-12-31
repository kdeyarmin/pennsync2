import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { patient_id } = await req.json();

    if (!patient_id) {
      return Response.json({ error: 'Missing patient_id' }, { status: 400 });
    }

    // Fetch patient data
    const [patients, carePlans, clinicalEvents] = await Promise.all([
      base44.entities.Patient.filter({ id: patient_id }),
      base44.entities.CarePlan.filter({ patient_id, status: 'active' }),
      base44.entities.ClinicalEvent.filter({ patient_id }, '-event_date', 20)
    ]);

    const patient = patients[0];
    if (!patient) {
      return Response.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Generate education materials
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Create personalized patient education materials for a home health patient. Write in clear, simple language appropriate for patients and families (6th-8th grade reading level).

PATIENT INFORMATION:
- Primary Diagnosis: ${patient.primary_diagnosis || 'Not specified'}
- Secondary Diagnoses: ${patient.secondary_diagnoses?.join(', ') || 'None'}
- Current Medications: ${patient.current_medications?.map(m => `${m.name} ${m.dosage || ''}`).join(', ') || 'None'}
- Allergies: ${patient.allergies || 'None documented'}
- Active Care Plans: ${carePlans.map(cp => cp.problem).join(', ') || 'None'}

Create education materials for each relevant topic:
1. Condition Overview (for each diagnosis)
2. Medication Guide (for key medications)
3. Care Plan Education (related to active care plans)
4. Warning Signs (what to watch for)
5. Self-Care Tips (practical daily management)

For each material, provide:
- Title (clear, descriptive)
- Category (condition, medication, care_plan, warning_signs, self_care)
- Content (2-4 paragraphs in simple language)
- Key Points (3-5 bullet points)
- When to Call (specific warning signs or situations)
- Additional Resources (optional)

Make content practical, actionable, and empowering. Focus on what the patient/family needs to know to manage care at home.`,
      response_json_schema: {
        type: "object",
        properties: {
          materials: {
            type: "array",
            items: {
              type: "object",
              properties: {
                title: { type: "string" },
                category: { type: "string" },
                content: { type: "string" },
                key_points: {
                  type: "array",
                  items: { type: "string" }
                },
                when_to_call: {
                  type: "array",
                  items: { type: "string" }
                },
                additional_resources: { type: "string" }
              }
            }
          },
          summary: { type: "string" }
        }
      }
    });

    return Response.json({
      success: true,
      patient_name: `${patient.first_name} ${patient.last_name}`,
      ...result
    });

  } catch (error) {
    console.error('Error generating patient education:', error);
    return Response.json({ 
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
});
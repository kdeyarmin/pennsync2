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

    // Fetch all unverified clinical events for the patient
    const events = await base44.entities.ClinicalEvent.filter({
      patient_id,
      verified: false
    }, '-event_date');

    if (events.length === 0) {
      return Response.json({
        success: true,
        flagged_events: [],
        message: 'No unverified events to analyze'
      });
    }

    // Also fetch patient data for context
    const patients = await base44.entities.Patient.filter({ id: patient_id });
    const patient = patients[0];

    // Analyze events for inconsistencies
    const eventsContext = events.map(e => ({
      id: e.id,
      type: e.event_type,
      title: e.event_title,
      description: e.event_description,
      structured_data: e.structured_data,
      event_date: e.event_date,
      severity: e.severity,
      extraction_confidence: e.extraction_confidence
    }));

    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze these clinical events for a patient and identify potential issues:

Patient Context:
- Name: ${patient?.first_name} ${patient?.last_name}
- Primary Diagnosis: ${patient?.primary_diagnosis}
- Current Medications: ${patient?.current_medications?.map(m => m.name).join(', ') || 'None listed'}

Clinical Events to Review:
${JSON.stringify(eventsContext, null, 2)}

For each event, identify:
1. Missing critical information (e.g., medication without dosage, wound without location/stage)
2. Potential inconsistencies (e.g., conflicting information, unlikely values)
3. Events that need clarification or more detail
4. Events that might be duplicates or related to other events
5. Safety concerns or red flags

Only flag events that have actual issues. If an event looks complete and accurate, don't flag it.

For each flagged event, provide:
- The event ID
- Issue category (missing_info, inconsistency, needs_clarification, safety_concern, potential_duplicate)
- Specific issue description
- Suggested action or questions to ask the clinician
- Priority (high, medium, low)`,
      response_json_schema: {
        type: "object",
        properties: {
          flagged_events: {
            type: "array",
            items: {
              type: "object",
              properties: {
                event_id: { type: "string" },
                issue_category: { type: "string" },
                issue_description: { type: "string" },
                suggested_action: { type: "string" },
                priority: { type: "string" },
                questions_for_clinician: {
                  type: "array",
                  items: { type: "string" }
                }
              }
            }
          },
          overall_summary: { type: "string" }
        }
      }
    });

    return Response.json({
      success: true,
      flagged_events: result?.flagged_events || [],
      overall_summary: result?.overall_summary || '',
      total_events_analyzed: events.length
    });

  } catch (error) {
    console.error('Error analyzing clinical events:', error);
    return Response.json({
      error: error.message
    }, { status: 500 });
  }
});

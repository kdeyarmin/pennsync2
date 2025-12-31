import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { visit_id, patient_id, nurse_notes, visit_date } = await req.json();

    if (!visit_id || !patient_id || !nurse_notes) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Use AI to extract clinical events from the note
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Extract ALL significant clinical events from this nursing note. Be thorough and capture everything that should be tracked.

Visit Note:
${nurse_notes}

Extract events such as:
- Medication changes (started, stopped, dose changed)
- Physician appointments (scheduled, attended, results)
- Hospitalizations or ER visits
- Falls or near-falls
- New wounds or wound changes
- Lab results mentioned
- New symptoms or symptom resolution
- Significant vital sign changes
- Cognitive or functional status changes
- Pain level changes
- Infections or signs of infection
- Surgeries or procedures
- Therapy changes (PT, OT, ST)
- DME (durable medical equipment) ordered or received
- Any other clinically significant events

For each event, provide:
- event_type (use the most specific type from the enum list)
- event_title (brief, clear title)
- event_description (detailed description)
- structured_data (extract specific data like medication names, dosages, dates, physician names, etc.)
- severity (low, medium, high, critical)
- requires_followup (boolean)
- followup_notes (if follow-up is needed)
- source_text (exact quote from note)
- extraction_confidence (0-100)`,
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
                extraction_confidence: { type: "number" }
              }
            }
          }
        }
      }
    });

    // Save extracted events to database
    const savedEvents = [];
    for (const event of result.events || []) {
      const eventData = {
        patient_id,
        visit_id,
        event_date: visit_date,
        ...event,
        verified: false
      };

      const savedEvent = await base44.asServiceRole.entities.ClinicalEvent.create(eventData);
      savedEvents.push(savedEvent);
    }

    return Response.json({
      success: true,
      events_extracted: savedEvents.length,
      events: savedEvents
    });

  } catch (error) {
    console.error('Error extracting clinical events:', error);
    return Response.json({ 
      error: error.message,
      details: error.toString()
    }, { status: 500 });
  }
});
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
- source_text (exact quote from note - the specific sentence or paragraph)
- source_section (identify the section: assessment, medications, vital_signs, subjective, objective, plan, intervention, etc.)
- extraction_confidence (0-100)

IMPORTANT: For source_text, provide the EXACT verbatim text from the note, not a paraphrase. This will be used to locate the text in the document.`,
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

    // Save extracted events to database with text anchors
    const savedEvents = [];
    for (const event of result.events || []) {
      // Find text position in source document
      let text_anchor_start = null;
      let text_anchor_end = null;
      
      if (event.source_text && nurse_notes) {
        const sourceText = event.source_text.trim();
        const index = nurse_notes.indexOf(sourceText);
        if (index !== -1) {
          text_anchor_start = index;
          text_anchor_end = index + sourceText.length;
        } else {
          // Try fuzzy matching if exact match fails
          const lowerNotes = nurse_notes.toLowerCase();
          const lowerSource = sourceText.toLowerCase();
          const fuzzyIndex = lowerNotes.indexOf(lowerSource);
          if (fuzzyIndex !== -1) {
            text_anchor_start = fuzzyIndex;
            text_anchor_end = fuzzyIndex + sourceText.length;
          }
        }
      }

      const eventData = {
        patient_id,
        visit_id,
        event_date: visit_date,
        ...event,
        text_anchor_start,
        text_anchor_end,
        verified: false
      };

      const savedEvent = await base44.asServiceRole.entities.ClinicalEvent.create(eventData);
      savedEvents.push(savedEvent);

      // Auto-create follow-up task if needed
      if (event.requires_followup) {
        const taskPriority = event.severity === 'critical' ? 'high' : 
                           event.severity === 'high' ? 'high' : 'medium';
        
        let taskType = 'followup';
        if (event.event_type?.includes('medication')) taskType = 'call';
        if (event.event_type === 'fall') taskType = 'safety';
        if (event.event_type?.includes('wound')) taskType = 'document';
        
        await base44.asServiceRole.entities.Task.create({
          patient_id,
          title: `Follow-up: ${event.event_title}`,
          description: event.followup_notes || event.event_description,
          type: taskType,
          priority: taskPriority,
          status: 'pending',
          due_timeframe: event.severity === 'critical' ? 'today' : '48_hours',
          source: 'ai_generated',
          ai_reason: `Auto-generated from clinical event: ${event.event_type}`,
          related_visit_id: visit_id
        });
      }

      // Create patient alert for high/critical events
      if (event.severity === 'high' || event.severity === 'critical') {
        let alertType = 'urgent_intervention';
        if (event.event_type?.includes('medication')) alertType = 'medication_risk';
        if (event.event_type === 'fall') alertType = 'fall_risk';
        if (event.event_type?.includes('vital')) alertType = 'vital_deterioration';
        if (event.event_type === 'infection') alertType = 'infection_risk';
        if (event.event_type === 'cognitive_change') alertType = 'symptom_escalation';
        
        await base44.asServiceRole.entities.PatientAlert.create({
          patient_id,
          alert_type: alertType,
          severity: event.severity,
          title: event.event_title,
          message: event.event_description,
          contributing_factors: [event.event_type, `Detected from visit ${visit_id}`],
          recommended_actions: event.followup_notes ? [event.followup_notes] : [],
          data_sources: {
            clinical_event_id: savedEvent.id,
            visit_id,
            event_type: event.event_type,
            structured_data: event.structured_data
          },
          status: 'active',
          flagged_urgent: event.severity === 'critical'
        });
      }
    }

    return Response.json({
      success: true,
      events_extracted: savedEvents.length,
      events: savedEvents,
      tasks_created: savedEvents.filter(e => e.requires_followup).length,
      alerts_created: savedEvents.filter(e => e.severity === 'high' || e.severity === 'critical').length
    });

  } catch (error) {
    console.error('Error extracting clinical events:', error);
    return Response.json({
      error: error.message
    }, { status: 500 });
  }
});
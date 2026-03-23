import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Unified Clinical Data Analysis Function
 * Handles: event extraction, event analysis, trend analysis, and care plan generation
 * Replaces: extractClinicalEvents, analyzeClinicalEvents, analyzeClinicalTrends, generateCarePlanSuggestions
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { action, ...params } = await req.json();

    switch (action) {
      case 'extract_events': {
        const { noteText, patientId } = params;
        
        const eventsResponse = await base44.asServiceRole.integrations.Core.InvokeLLM({
          prompt: `Analyze this clinical note and extract ALL significant clinical events with high accuracy.

Clinical Note:
${noteText}

Extract events such as:
- Medication changes (started, stopped, dose changes, side effects)
- Vital sign abnormalities or concerning trends
- New symptoms, symptom exacerbations, or resolutions
- Falls, injuries, or safety incidents
- Wound assessments or changes in wound status
- Cognitive changes or behavioral changes
- Functional status changes (ADL, mobility)
- Pain level changes
- Hospitalizations, ER visits, or physician appointments
- New diagnoses or complications
- Lab results or test results
- Infections or signs of infection
- Equipment/DME orders or changes

For each event:
- type: medication_change, medication_started, medication_stopped, fall, vital_change, symptom_new, symptom_resolved, wound_new, wound_change, cognitive_change, functional_change, pain_change, hospitalization, er_visit, physician_appointment, lab_result, infection, surgery, dme_ordered, other
- title: Brief, specific title (e.g., "BP Elevated to 160/95" not just "Vital Change")
- description: Detailed clinical description with context
- date: Date mentioned or infer from context
- severity: low/medium/high/critical based on clinical significance
- structured_data: Specific details (med name, dosage, vital values, location, etc.)
- source_text: Exact relevant text from note
- requires_followup: true if needs action/monitoring
- confidence: 0-100 (only include events with confidence >= 70)

Be thorough - extract ALL clinically significant events, not just major ones.`,
          response_json_schema: {
            type: "object",
            properties: {
              events: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string" },
                    title: { type: "string" },
                    description: { type: "string" },
                    date: { type: "string" },
                    severity: { type: "string" },
                    structured_data: { type: "object" },
                    source_text: { type: "string" },
                    requires_followup: { type: "boolean" },
                    confidence: { type: "number" }
                  }
                }
              }
            }
          }
        });
        
        return Response.json({ events: eventsResponse.events || [] });
      }
      
      case 'extract_events':
        return await extractEvents(base44, params);
      
      case 'analyze_events':
        return await analyzeEvents(base44, params);
      
      case 'analyze_trends':
        return await analyzeTrends(base44, params);
      
      case 'generate_care_plans':
        return await generateCarePlans(base44, params);
      
      case 'full_clinical_analysis':
        // Complete clinical analysis with all components
        return await fullClinicalAnalysis(base44, params);
      
      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('Clinical data analysis error:', error);
    return Response.json({ 
      error: error.message,
      success: false
    }, { status: 500 });
  }
});

async function extractEvents(base44, params) {
  const { visit_id, patient_id, nurse_notes, visit_date } = params;

  if (!visit_id || !patient_id || !nurse_notes) {
    return Response.json({ error: 'Missing required fields' }, { status: 400 });
  }

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Extract ALL significant clinical events from this nursing note. Be thorough.

Visit Note:
${nurse_notes}

Extract: medication changes, appointments, hospitalizations, falls, wounds, labs, symptoms, vital changes, cognitive/functional changes, pain, infections, procedures, therapy changes, DME, and other significant events.

For each event provide: event_type, event_title, event_description, structured_data, severity, requires_followup, followup_notes, source_text (exact quote), source_section, extraction_confidence (0-100).`,
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

  // Save extracted events
  const savedEvents = [];
  for (const event of result.events || []) {
    let text_anchor_start = null;
    let text_anchor_end = null;
    
    if (event.source_text && nurse_notes) {
      const index = nurse_notes.indexOf(event.source_text.trim());
      if (index !== -1) {
        text_anchor_start = index;
        text_anchor_end = index + event.source_text.length;
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
  }

  return Response.json({
    success: true,
    events_extracted: savedEvents.length,
    events: savedEvents
  });
}

async function analyzeEvents(base44, params) {
  const { patient_id } = params;

  if (!patient_id) {
    return Response.json({ error: 'Missing patient_id' }, { status: 400 });
  }

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

  const patients = await base44.entities.Patient.filter({ id: patient_id });
  const patient = patients[0];

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

Patient: ${patient?.first_name} ${patient?.last_name}
Primary Diagnosis: ${patient?.primary_diagnosis}
Current Medications: ${patient?.current_medications?.map(m => m.name).join(', ') || 'None'}

Clinical Events:
${JSON.stringify(eventsContext, null, 2)}

Identify:
1. Missing critical information
2. Potential inconsistencies
3. Events needing clarification
4. Potential duplicates or related events
5. Safety concerns or red flags

Only flag events with actual issues. For each flagged event provide: event_id, issue_category, issue_description, suggested_action, priority, questions_for_clinician.`,
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
    ...result,
    total_events_analyzed: events.length
  });
}

async function analyzeTrends(base44, params) {
  const { patient_id } = params;

  if (!patient_id) {
    return Response.json({ error: 'Missing patient_id' }, { status: 400 });
  }

  const [patients, visits, clinicalEvents] = await Promise.all([
    base44.entities.Patient.filter({ id: patient_id }),
    base44.entities.Visit.filter({ patient_id }, '-visit_date', 100),
    base44.entities.ClinicalEvent.filter({ patient_id }, '-event_date', 100)
  ]);

  const patient = patients[0];
  if (!patient) {
    return Response.json({ error: 'Patient not found' }, { status: 404 });
  }

  const vitalsHistory = visits
    .filter(v => v.vital_signs)
    .map(v => ({ date: v.visit_date, vitals: v.vital_signs }));

  const medicationEvents = clinicalEvents.filter(e => e.event_type.includes('medication'));
  const symptomEvents = clinicalEvents.filter(e => e.event_type.includes('symptom'));
  const labEvents = clinicalEvents.filter(e => e.event_type.includes('lab'));

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Analyze this patient's clinical data over time and identify significant trends, patterns, and risks.

PATIENT: ${patient.first_name} ${patient.last_name}
Primary Diagnosis: ${patient.primary_diagnosis}

VITAL SIGNS HISTORY (${vitalsHistory.length} visits):
${JSON.stringify(vitalsHistory, null, 2)}

MEDICATION CHANGES (${medicationEvents.length} events):
${JSON.stringify(medicationEvents.map(e => ({ date: e.event_date, title: e.event_title, description: e.event_description })), null, 2)}

SYMPTOM PROGRESSION (${symptomEvents.length} events):
${JSON.stringify(symptomEvents.map(e => ({ date: e.event_date, title: e.event_title, severity: e.severity })), null, 2)}

LAB RESULTS (${labEvents.length} events):
${JSON.stringify(labEvents.map(e => ({ date: e.event_date, title: e.event_title })), null, 2)}

Analyze and provide:
1. VITAL SIGNS TRENDS: Overall trend, concerns, rate of change, clinical significance
2. SYMPTOM PATTERNS: Recurring symptoms, progression/resolution, triggers, severity trends
3. MEDICATION ADHERENCE & EFFECTIVENESS
4. COMPARATIVE ANALYSIS: Correlations between metrics
5. PREDICTIVE ANALYTICS: Readmission risk (0-100), deterioration signs, goal achievement likelihood
6. RISK INDICATORS: Early warnings, deteriorating metrics
7. POSITIVE TRENDS: Improvements, goals met

Provide actionable insights for clinicians.`,
    response_json_schema: {
      type: "object",
      properties: {
        vital_trends: {
          type: "array",
          items: {
            type: "object",
            properties: {
              vital_type: { type: "string" },
              trend_direction: { type: "string" },
              concern_level: { type: "string" },
              description: { type: "string" },
              recommendation: { type: "string" }
            }
          }
        },
        symptom_patterns: {
          type: "array",
          items: {
            type: "object",
            properties: {
              symptom: { type: "string" },
              pattern: { type: "string" },
              severity_trend: { type: "string" },
              clinical_notes: { type: "string" }
            }
          }
        },
        medication_insights: {
          type: "object",
          properties: {
            adherence_assessment: { type: "string" },
            effectiveness_notes: { type: "string" },
            concerns: { type: "array", items: { type: "string" } }
          }
        },
        risk_indicators: {
          type: "array",
          items: {
            type: "object",
            properties: {
              risk_type: { type: "string" },
              severity: { type: "string" },
              evidence: { type: "string" },
              action_needed: { type: "string" }
            }
          }
        },
        positive_trends: {
          type: "array",
          items: {
            type: "object",
            properties: {
              achievement: { type: "string" },
              supporting_data: { type: "string" }
            }
          }
        },
        comparative_insights: {
          type: "array",
          items: {
            type: "object",
            properties: {
              correlation: { type: "string" },
              metric_a: { type: "string" },
              metric_b: { type: "string" },
              relationship: { type: "string" },
              clinical_significance: { type: "string" }
            }
          }
        },
        predictive_analytics: {
          type: "object",
          properties: {
            readmission_risk_score: { type: "number" },
            readmission_risk_level: { type: "string" },
            deterioration_risk_score: { type: "number" },
            key_risk_factors: { type: "array", items: { type: "string" } },
            predicted_outcomes: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  outcome: { type: "string" },
                  probability: { type: "string" },
                  timeframe: { type: "string" },
                  prevention_strategies: { type: "array", items: { type: "string" } }
                }
              }
            }
          }
        },
        overall_trajectory: { type: "string" },
        priority_recommendations: { type: "array", items: { type: "string" } }
      }
    }
  });

  return Response.json({
    success: true,
    patient_name: `${patient.first_name} ${patient.last_name}`,
    data_analyzed: {
      visits: vitalsHistory.length,
      medication_events: medicationEvents.length,
      symptom_events: symptomEvents.length,
      lab_events: labEvents.length
    },
    vitals_data: vitalsHistory,
    ...result
  });
}

async function generateCarePlans(base44, params) {
  const { patient_id } = params;

  if (!patient_id) {
    return Response.json({ error: 'Missing patient_id' }, { status: 400 });
  }

  const [patients, clinicalEvents, existingCarePlans, visits, incidents] = await Promise.all([
    base44.entities.Patient.filter({ id: patient_id }),
    base44.entities.ClinicalEvent.filter({ patient_id }, '-event_date', 50),
    base44.entities.CarePlan.filter({ patient_id }),
    base44.entities.Visit.filter({ patient_id }, '-visit_date', 10),
    base44.entities.Incident.filter({ patient_id }, '-incident_date', 10)
  ]);

  const patient = patients[0];
  if (!patient) {
    return Response.json({ error: 'Patient not found' }, { status: 404 });
  }

  const result = await base44.integrations.Core.InvokeLLM({
    prompt: `Generate comprehensive care plan suggestions for this home health patient.

PATIENT: ${patient.first_name} ${patient.last_name}, Age: ${patient.date_of_birth ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear() : 'Unknown'}
Primary Diagnosis: ${patient.primary_diagnosis}
Secondary Diagnoses: ${patient.secondary_diagnoses?.join(', ') || 'None'}
Medications: ${patient.current_medications?.map(m => `${m.name} ${m.dosage || ''}`).join(', ')}

RECENT CLINICAL EVENTS: ${JSON.stringify(clinicalEvents.slice(0, 20), null, 2)}
RECENT VISITS: ${JSON.stringify(visits.slice(0, 5), null, 2)}
INCIDENTS: ${JSON.stringify(incidents, null, 2)}
EXISTING CARE PLANS: ${existingCarePlans.map(cp => cp.problem).join(', ') || 'None'}

Generate care plan suggestions addressing:
1. Unaddressed clinical needs
2. Risk factors requiring prevention
3. Medication management
4. Functional improvement opportunities
5. Safety concerns
6. Patient education needs
7. Chronic disease management

For each: problem (NANDA-I), measurable goal, 3-5 interventions, expected outcomes, baseline measurement, frequency, priority, rationale, medicare considerations, target_days.

Only suggest NEW care plans not already covered.`,
    response_json_schema: {
      type: "object",
      properties: {
        suggestions: {
          type: "array",
          items: {
            type: "object",
            properties: {
              problem: { type: "string" },
              goal: { type: "string" },
              interventions: { type: "array", items: { type: "string" } },
              expected_outcomes: { type: "string" },
              baseline_measurement: { type: "string" },
              frequency: { type: "string" },
              priority: { type: "string" },
              rationale: { type: "string" },
              medicare_considerations: { type: "string" },
              target_days: { type: "number" }
            }
          }
        },
        overall_assessment: { type: "string" },
        critical_gaps_identified: { type: "array", items: { type: "string" } }
      }
    }
  });

  return Response.json({
    success: true,
    patient_name: `${patient.first_name} ${patient.last_name}`,
    ...result
  });
}

async function fullClinicalAnalysis(base44, params) {
  const { patient_id } = params;

  // Run all analyses in parallel
  const [trendsResult, carePlansResult, eventsResult] = await Promise.all([
    analyzeTrends(base44, { patient_id }),
    generateCarePlans(base44, { patient_id }),
    analyzeEvents(base44, { patient_id })
  ]);

  const trendsData = await trendsResult.json();
  const carePlansData = await carePlansResult.json();
  const eventsData = await eventsResult.json();

  return Response.json({
    success: true,
    trends: trendsData,
    care_plan_suggestions: carePlansData,
    event_analysis: eventsData
  });
}
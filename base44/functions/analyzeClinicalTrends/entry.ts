import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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

    // Fetch comprehensive historical data
    const [patients, visits, clinicalEvents] = await Promise.all([
      base44.entities.Patient.filter({ id: patient_id }),
      base44.entities.Visit.filter({ patient_id }, '-visit_date', 100),
      base44.entities.ClinicalEvent.filter({ patient_id }, '-event_date', 100)
    ]);

    const patient = patients[0];
    if (!patient) {
      return Response.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Extract vital signs over time
    const vitalsHistory = visits
      .filter(v => v.vital_signs)
      .map(v => ({
        date: v.visit_date,
        vitals: v.vital_signs
      }));

    // Group events by type
    const medicationEvents = clinicalEvents.filter(e =>
      e.event_type.includes('medication')
    );
    const symptomEvents = clinicalEvents.filter(e =>
      e.event_type.includes('symptom')
    );
    const labEvents = clinicalEvents.filter(e =>
      e.event_type.includes('lab')
    );

    // Analyze trends with AI
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `Analyze this patient's clinical data over time and identify significant trends, patterns, and risks.

PATIENT: ${patient.first_name} ${patient.last_name}
Primary Diagnosis: ${patient.primary_diagnosis || 'Not specified'}
Current Medications: ${patient.current_medications?.map(m => m.name).join(', ') || 'None'}

VITAL SIGNS HISTORY (${vitalsHistory.length} visits):
${JSON.stringify(vitalsHistory, null, 2)}

MEDICATION CHANGES (${medicationEvents.length} events):
${JSON.stringify(medicationEvents.map(e => ({ date: e.event_date, title: e.event_title, description: e.event_description })), null, 2)}

SYMPTOM PROGRESSION (${symptomEvents.length} events):
${JSON.stringify(symptomEvents.map(e => ({ date: e.event_date, title: e.event_title, description: e.event_description, severity: e.severity })), null, 2)}

LAB RESULTS (${labEvents.length} events):
${JSON.stringify(labEvents.map(e => ({ date: e.event_date, title: e.event_title, description: e.event_description })), null, 2)}

Analyze and provide:

1. VITAL SIGNS TRENDS: For each vital sign (BP, HR, temp, O2, weight), identify:
   - Overall trend (improving, stable, declining, fluctuating)
   - Specific concerns or patterns
   - Rate of change
   - Clinical significance

2. SYMPTOM PATTERNS: Identify:
   - Recurring symptoms
   - Symptom progression or resolution
   - Triggers or correlations
   - Severity trends

3. MEDICATION ADHERENCE & EFFECTIVENESS:
   - Changes over time
   - Potential side effects appearing in timeline
   - Effectiveness indicators

4. COMPARATIVE ANALYSIS: Identify correlations between:
   - Symptoms appearing after medication changes
   - Vital sign changes following symptom reports
   - Lab results correlating with clinical deterioration
   - Time-based patterns (e.g., symptoms worsening before hospitalization)

5. PREDICTIVE ANALYTICS:
   - Calculate hospital readmission risk (0-100 score)
   - Identify early warning signs of clinical deterioration
   - Predict likelihood of care plan goal achievement
   - Forecast potential complications based on current trajectory

6. RISK INDICATORS:
   - Early warning signs
   - Deteriorating metrics
   - Hospital readmission risks

7. POSITIVE TRENDS:
   - Improvements
   - Goals being met
   - Successful interventions

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
              concerns: {
                type: "array",
                items: { type: "string" }
              }
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
              deterioration_risk_level: { type: "string" },
              key_risk_factors: {
                type: "array",
                items: { type: "string" }
              },
              predicted_outcomes: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    outcome: { type: "string" },
                    probability: { type: "string" },
                    timeframe: { type: "string" },
                    prevention_strategies: {
                      type: "array",
                      items: { type: "string" }
                    }
                  }
                }
              }
            }
          },
          overall_trajectory: { type: "string" },
          priority_recommendations: {
            type: "array",
            items: { type: "string" }
          }
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
      vital_trends: result?.vital_trends || [],
      symptom_patterns: result?.symptom_patterns || [],
      medication_insights: result?.medication_insights || {},
      risk_indicators: result?.risk_indicators || [],
      positive_trends: result?.positive_trends || [],
      comparative_insights: result?.comparative_insights || [],
      predictive_analytics: result?.predictive_analytics || {},
      overall_trajectory: result?.overall_trajectory || 'unknown',
      priority_recommendations: result?.priority_recommendations || []
    });

  } catch (error) {
    console.error('Error analyzing clinical trends:', error);
    return Response.json({
      error: error.message
    }, { status: 500 });
  }
});
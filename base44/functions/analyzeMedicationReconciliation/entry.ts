import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { patient_id, medications, patient_conditions, patient_age, allergies } = await req.json();

    if (!medications || medications.length === 0) {
      return Response.json({ error: 'No medications provided' }, { status: 400 });
    }

    // Use AI to analyze medications comprehensively
    const analysisPrompt = `You are a clinical pharmacist conducting a comprehensive medication reconciliation review.

PATIENT INFORMATION:
- Age: ${patient_age || 'Unknown'}
- Primary Condition: ${patient_conditions?.[0] || 'Not specified'}
- Other Conditions: ${patient_conditions?.slice(1).join(', ') || 'None'}
- Known Allergies: ${allergies || 'None documented'}

CURRENT MEDICATION LIST:
${medications.map((med, idx) => `${idx + 1}. ${med.name} ${med.dosage} ${med.frequency} - ${med.route || 'PO'} (Started: ${med.start_date || 'Unknown'})`).join('\n')}

Perform a comprehensive medication safety analysis:

1. DRUG-DRUG INTERACTIONS: Identify ALL potential interactions between medications, including:
   - Critical interactions requiring immediate intervention
   - Significant interactions needing monitoring
   - Moderate interactions with clinical recommendations

2. CLINICAL GUIDELINE COMPLIANCE: Check medications against:
   - Evidence-based treatment guidelines for diagnosed conditions
   - Medicare/CMS medication appropriateness criteria
   - Beers Criteria for elderly patients (if age ≥65)
   - Disease-specific treatment protocols

3. AGE & CONDITION-SPECIFIC RISKS: Identify:
   - Medications potentially inappropriate for patient age
   - Contraindications based on patient conditions
   - Medications requiring dose adjustments
   - Medications requiring specific monitoring

4. ACTION ITEMS: Prioritized clinical recommendations

Return analysis in this exact JSON structure:
{
  "interactions": [
    {
      "drug1": "Medication name",
      "drug2": "Medication name",
      "severity": "critical|high|moderate|low",
      "description": "Clear explanation of the interaction mechanism",
      "recommendation": "Specific clinical action (contact physician, monitor, adjust timing, etc.)"
    }
  ],
  "guidelines_issues": [
    {
      "medication": "Medication name",
      "issue": "Description of guideline deviation",
      "guideline": "Specific guideline reference",
      "recommendation": "Clinical action needed"
    }
  ],
  "guidelines_compliance": {
    "compliant_count": 0,
    "total_checked": 0,
    "summary": "Brief compliance summary"
  },
  "age_condition_risks": [
    {
      "medication": "Medication name",
      "risk_type": "Beers Criteria|Contraindication|Dose Adjustment|Monitoring",
      "severity": "critical|high|moderate|low",
      "description": "Explanation of risk",
      "recommendation": "Specific action"
    }
  ],
  "action_items": [
    {
      "priority": "urgent|high|routine",
      "title": "Action title",
      "description": "Detailed action description"
    }
  ],
  "documentation_summary": "Concise summary for clinical documentation (3-4 sentences covering key findings and recommendations)"
}

Be thorough and specific. Focus on actionable clinical recommendations.`;

    const aiResponse = await base44.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      response_json_schema: {
        type: 'object',
        properties: {
          interactions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                drug1: { type: 'string' },
                drug2: { type: 'string' },
                severity: { type: 'string' },
                description: { type: 'string' },
                recommendation: { type: 'string' }
              }
            }
          },
          guidelines_issues: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                medication: { type: 'string' },
                issue: { type: 'string' },
                guideline: { type: 'string' },
                recommendation: { type: 'string' }
              }
            }
          },
          guidelines_compliance: {
            type: 'object',
            properties: {
              compliant_count: { type: 'number' },
              total_checked: { type: 'number' },
              summary: { type: 'string' }
            }
          },
          age_condition_risks: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                medication: { type: 'string' },
                risk_type: { type: 'string' },
                severity: { type: 'string' },
                description: { type: 'string' },
                recommendation: { type: 'string' }
              }
            }
          },
          action_items: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                priority: { type: 'string' },
                title: { type: 'string' },
                description: { type: 'string' }
              }
            }
          },
          documentation_summary: { type: 'string' }
        }
      },
      model: 'claude_opus_4_7'
    });

    // Defensive: the LLM may omit arrays — never assume they exist.
    const interactions = Array.isArray(aiResponse.interactions) ? aiResponse.interactions : [];
    const guidelinesIssues = Array.isArray(aiResponse.guidelines_issues) ? aiResponse.guidelines_issues : [];
    const ageRisks = Array.isArray(aiResponse.age_condition_risks) ? aiResponse.age_condition_risks : [];

    // Create medication reconciliation record
    await base44.asServiceRole.entities.MedicationReconciliation.create({
      patient_id,
      reconciliation_date: new Date().toISOString(),
      trigger_source: 'manual_review',
      current_medications: medications.map(m => ({
        medication_id: m.id,
        medication_name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        route: m.route,
        status: m.status
      })),
      discrepancies: [
        ...interactions.map(i => ({
          discrepancy_type: 'potential_interaction',
          severity: i.severity,
          medication_name: `${i.drug1} + ${i.drug2}`,
          description: i.description,
          ai_recommendation: i.recommendation,
          status: 'pending'
        })),
        ...guidelinesIssues.map(g => ({
          discrepancy_type: 'missing_from_discharge',
          severity: 'moderate',
          medication_name: g.medication,
          description: g.issue,
          ai_recommendation: g.recommendation,
          status: 'pending'
        }))
      ],
      status: 'pending_review',
      // Don't fabricate certainty: use the model's reported confidence if present.
      ai_confidence_score: typeof aiResponse.confidence_score === 'number' ? aiResponse.confidence_score : null,
      total_discrepancies: interactions.length + guidelinesIssues.length + ageRisks.length,
      critical_discrepancies: interactions.filter(i => i.severity === 'critical').length +
        ageRisks.filter(r => r.severity === 'critical').length
    });

    return Response.json(aiResponse);
  } catch (error) {
    console.error('Error analyzing medications:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

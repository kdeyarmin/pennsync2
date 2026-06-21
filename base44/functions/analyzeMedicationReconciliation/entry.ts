import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Tolerant JSON extractor: we ask for strict JSON in-prompt instead of passing
// response_json_schema, because the provider rejects deeply-nested object
// schemas that lack an explicit `required` array at every level.
function parseLLMJson(raw) {
  if (!raw) return null;
  if (typeof raw === 'object') return raw;
  const text = String(raw).trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim();
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end <= start) return null;
    try { return JSON.parse(text.slice(start, end + 1)); } catch { return null; }
  }
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { patient_id, medications, patient_conditions, patient_age, allergies } = await req.json();

    if (!medications || medications.length === 0) {
      return Response.json({ error: 'No medications provided' }, { status: 400 });
    }

    // Verify the caller can see this patient (user-scoped read enforces RLS/tenant
    // scoping) before writing a MedicationReconciliation against it via the
    // service-role client below. Mirrors reconcileMedications.
    if (!patient_id) {
      return Response.json({ error: 'patient_id is required' }, { status: 400 });
    }
    const patientRows = await base44.entities.Patient.filter({ id: patient_id });
    if (!patientRows || patientRows.length === 0) {
      return Response.json({ error: 'Patient not found' }, { status: 404 });
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

Be thorough and specific. Focus on actionable clinical recommendations.

Return ONLY the JSON object described above, with no prose or code fences.`;

    const rawResponse = await base44.integrations.Core.InvokeLLM({
      prompt: analysisPrompt
    });
    const aiResponse = parseLLMJson(rawResponse) || {};

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
        })),
        // Age/condition (Beers, contraindication) risks were counted in
        // total/critical but had no visible row for the reviewer — include them.
        ...ageRisks.map(r => ({
          discrepancy_type: 'age_condition_risk',
          severity: r.severity,
          medication_name: r.medication || 'Multiple',
          description: r.risk_type ? `${r.risk_type}: ${r.description || ''}`.trim() : (r.description || ''),
          ai_recommendation: r.recommendation,
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
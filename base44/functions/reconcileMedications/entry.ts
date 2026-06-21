import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { patient_id, discharge_document_url, trigger_source } = await req.json();

    if (!patient_id) {
      return Response.json({ error: 'patient_id is required' }, { status: 400 });
    }

    // Fetch patient
    const [patient] = await base44.entities.Patient.filter({ id: patient_id });
    if (!patient) {
      return Response.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Fetch current medications
    const currentMedications = await base44.entities.Medication.filter({ 
      patient_id,
      status: 'active'
    });

    // Extract medications from discharge document if provided
    let extractedMeds = [];
    let aiConfidence = 0;

    if (discharge_document_url) {
      const extractionPrompt = `You are a clinical pharmacist. Extract all medications from this discharge summary document.

For each medication, extract:
- Medication name (generic name preferred)
- Dosage (e.g., "500mg", "10mg")
- Frequency (e.g., "twice daily", "once daily at bedtime", "every 8 hours")
- Route (oral, injection, topical, etc.)
- Indication/reason (why the patient is taking it)
- Prescriber name if mentioned

Return as JSON array. Be precise with dosages and frequencies.`;

      const extraction = await base44.integrations.Core.InvokeLLM({
        prompt: extractionPrompt,
        file_urls: [discharge_document_url],
        response_json_schema: {
          type: "object",
          properties: {
            medications: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  medication_name: { type: "string" },
                  dosage: { type: "string" },
                  frequency: { type: "string" },
                  route: { type: "string" },
                  indication: { type: "string" },
                  prescriber: { type: "string" }
                }
              }
            },
            confidence: { type: "number" }
          }
        }
      });

      extractedMeds = extraction?.medications || [];
      aiConfidence = extraction?.confidence || 85;
    }

    // AI-powered discrepancy detection
    const analysisPrompt = `You are a clinical pharmacist performing medication reconciliation.

CURRENT MEDICATIONS (from patient record):
${JSON.stringify(currentMedications.map(m => ({
  name: m.name,
  dosage: m.dosage,
  frequency: m.frequency,
  route: m.route,
  indication: m.indication
})), null, 2)}

DISCHARGE MEDICATIONS (from hospital):
${JSON.stringify(extractedMeds, null, 2)}

Analyze and identify ALL discrepancies including:
1. NEW medications in discharge orders not in current list
2. DISCONTINUED medications in current list not in discharge orders
3. DOSAGE CHANGES (e.g., 500mg changed to 250mg)
4. FREQUENCY CHANGES (e.g., twice daily changed to once daily)
5. DUPLICATES (same drug, different brand names)
6. POTENTIAL INTERACTIONS between new and existing medications

For each discrepancy, provide:
- discrepancy_type: new_medication | discontinued_medication | dosage_change | frequency_change | missing_from_discharge | duplicate | potential_interaction
- severity: critical | high | moderate | low
- medication_name
- current_value: what it is now (or "not present")
- discharge_value: what discharge orders say (or "not present")
- description: clear explanation
- ai_recommendation: what action to take

Return JSON with discrepancies array.`;

    const analysis = await base44.integrations.Core.InvokeLLM({
      prompt: analysisPrompt,
      model: 'gpt_5_5',
      response_json_schema: {
        type: "object",
        properties: {
          discrepancies: {
            type: "array",
            items: {
              type: "object",
              properties: {
                discrepancy_type: { type: "string" },
                severity: { type: "string" },
                medication_name: { type: "string" },
                current_value: { type: "string" },
                discharge_value: { type: "string" },
                description: { type: "string" },
                ai_recommendation: { type: "string" }
              }
            }
          }
        }
      }
    });

    const discrepancies = analysis?.discrepancies || [];
    
    // Add status to each discrepancy
    const discrepanciesWithStatus = discrepancies.map(d => ({
      ...d,
      status: 'pending'
    }));

    // Count critical discrepancies
    const criticalCount = discrepancies.filter(d => d.severity === 'critical').length;

    // Create reconciliation record
    const reconciliation = await base44.entities.MedicationReconciliation.create({
      patient_id,
      patient_name: `${patient.first_name} ${patient.last_name}`,
      reconciliation_date: new Date().toISOString(),
      trigger_source: trigger_source || 'hospital_discharge',
      discharge_document_url,
      extracted_discharge_medications: extractedMeds,
      current_medications: currentMedications.map(m => ({
        medication_id: m.id,
        medication_name: m.name,
        dosage: m.dosage,
        frequency: m.frequency,
        route: m.route,
        status: m.status
      })),
      discrepancies: discrepanciesWithStatus,
      status: criticalCount > 0 ? 'pending_review' : 'in_progress',
      total_discrepancies: discrepancies.length,
      critical_discrepancies: criticalCount,
      ai_confidence_score: aiConfidence
    });

    // Create alert if critical discrepancies found
    if (criticalCount > 0) {
      await base44.entities.PatientAlert.create({
        patient_id,
        alert_type: 'medication_risk',
        severity: 'high',
        title: `Critical Medication Discrepancies Detected`,
        message: `${criticalCount} critical medication discrepancies found during reconciliation. Immediate review required.`,
        status: 'active'
      });
    }

    return Response.json({
      success: true,
      reconciliation,
      summary: {
        total_discrepancies: discrepancies.length,
        critical_discrepancies: criticalCount,
        requires_physician_notification: criticalCount > 0
      }
    });

  } catch (error) {
    console.error('Error reconciling medications:', error);
    return Response.json({ 
      error: error.message || 'Failed to reconcile medications' 
    }, { status: 500 });
  }
});
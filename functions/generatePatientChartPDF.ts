import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { patientId, includeVisits = true, includeCarePlans = true, includeIncidents = true } = body;

    if (!patientId) {
      return Response.json({ error: 'Missing patientId' }, { status: 400 });
    }

    // Fetch patient data
    const patient = await base44.entities.Patient.get(patientId);
    if (!patient) {
      return Response.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Fetch related data in parallel
    const [visits, carePlans, incidents] = await Promise.all([
      includeVisits ? base44.entities.Visit.filter({ patient_id: patientId }, '-visit_date', 100) : [],
      includeCarePlans ? base44.entities.CarePlan.filter({ patient_id: patientId }, '-created_date', 100) : [],
      includeIncidents ? base44.entities.Incident.filter({ patient_id: patientId }, '-incident_date', 100) : []
    ]);

    // Use AI to generate professional formatted document
    const prompt = `Generate a professional, HIPAA-compliant patient medical chart PDF document with the following information:

PATIENT DEMOGRAPHICS:
Name: ${patient.first_name} ${patient.middle_name || ''} ${patient.last_name}
DOB: ${patient.date_of_birth}
MRN: ${patient.medical_record_number || 'N/A'}
Address: ${patient.address || 'N/A'}
Phone: ${patient.phone || 'N/A'}
Email: ${patient.email || 'N/A'}

PRIMARY CARE PHYSICIAN:
Name: ${patient.physician_name || 'N/A'}
Phone: ${patient.physician_phone || 'N/A'}
Email: ${patient.physician_email || 'N/A'}

EMERGENCY CONTACT:
Name: ${patient.emergency_contact_name || 'N/A'}
Phone: ${patient.emergency_contact_phone || 'N/A'}
Relationship: ${patient.emergency_contact_relationship || 'N/A'}

CLINICAL INFORMATION:
Primary Diagnosis: ${patient.primary_diagnosis || 'N/A'}
Secondary Diagnoses: ${patient.secondary_diagnoses?.join(', ') || 'None'}
Allergies: ${patient.allergies || 'No known allergies'}
Current Medications: ${patient.current_medications?.map(m => \`\${m.name} \${m.dosage} \${m.frequency}\`).join('; ') || 'None'}
Past Medical History: ${patient.past_medical_history?.join('; ') || 'None'}

BASELINE VITALS:
BP: \${patient.baseline_vitals?.blood_pressure_systolic || 'N/A'}/\${patient.baseline_vitals?.blood_pressure_diastolic || 'N/A'}
HR: ${patient.baseline_vitals?.heart_rate || 'N/A'} bpm
RR: ${patient.baseline_vitals?.respiratory_rate || 'N/A'} rpm
Temp: ${patient.baseline_vitals?.temperature || 'N/A'}°F
O2 Sat: ${patient.baseline_vitals?.oxygen_saturation || 'N/A'}%
Weight: ${patient.baseline_vitals?.weight || 'N/A'} lbs
Height: ${patient.baseline_vitals?.height || 'N/A'} inches
BMI: ${patient.baseline_vitals?.bmi || 'N/A'}

FUNCTIONAL STATUS:
Ambulation: ${patient.functional_status?.ambulation || 'N/A'}
ADL Independence: ${patient.functional_status?.adl_independence || 'N/A'}
Cognitive Status: ${patient.functional_status?.cognitive_status || 'N/A'}
Fall Risk: ${patient.functional_status?.fall_risk || 'N/A'}

SOCIAL HISTORY:
Living Situation: ${patient.social_history?.living_situation || 'N/A'}
Primary Language: ${patient.social_history?.primary_language || 'English'}
Support System: ${patient.social_history?.support_system || 'N/A'}
Smoking Status: ${patient.social_history?.smoking_status || 'N/A'}

ADVANCE DIRECTIVES:
Has Living Will: ${patient.advance_directives?.has_living_will ? 'Yes' : 'No'}
Has Healthcare Proxy: ${patient.advance_directives?.has_healthcare_proxy ? 'Yes' : 'No'}
DNR Status: ${patient.advance_directives?.dnr_status ? 'Yes' : 'No'}

RECENT VISITS (${visits?.length || 0}):
${visits?.slice(0, 10).map(v => \`- \${v.visit_date}: \${v.visit_type} - \${v.nurse_notes?.substring(0, 100) || 'No notes'}\`).join('\n')}

ACTIVE CARE PLANS (${carePlans?.length || 0}):
${carePlans?.slice(0, 10).map(cp => \`- Problem: \${cp.problem}\n  Goal: \${cp.goal}\n  Status: \${cp.status}\`).join('\n\n')}

CLINICAL INCIDENTS (${incidents?.length || 0}):
${incidents?.slice(0, 10).map(i => \`- \${i.incident_date}: \${i.incident_type} - \${i.severity} severity\`).join('\n')}

Create a professional medical chart PDF with:
1. Clean, medical-standard layout with proper sections
2. HIPAA-compliant formatting (no sensitive data in headers/footers)
3. Date/time of document generation
4. Document classification (CONFIDENTIAL MEDICAL RECORD)
5. Page numbers
6. Professional typography and spacing
7. Easy-to-read tables for medications and vital signs
8. Proper medical terminology and formatting

The document should be suitable for sharing with specialists, insurance companies, and other healthcare providers while maintaining patient privacy standards.`;

    const result = await base44.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: "object",
        properties: {
          document_content: {
            type: "string",
            description: "Full HTML/formatted content for the PDF"
          },
          page_count: {
            type: "number",
            description: "Estimated page count"
          },
          includes_phi: {
            type: "boolean",
            description: "Whether document contains PHI (Protected Health Information)"
          }
        }
      }
    });

    // Log the export action for compliance
    await base44.entities.SecurityLog.create({
      user_email: user.email,
      user_role: user.role,
      action: 'export_patient_chart_pdf',
      details: {
        patient_id: patientId,
        patient_name: `${patient.first_name} ${patient.last_name}`,
        includes_visits: includeVisits,
        includes_care_plans: includeCarePlans,
        includes_incidents: includeIncidents,
        exported_at: new Date().toISOString()
      },
      timestamp: new Date().toISOString(),
      ip_address: req.headers.get('x-forwarded-for') || 'unknown'
    });

    return Response.json({
      success: true,
      document: result.document_content,
      patient_name: `${patient.first_name} ${patient.last_name}`,
      mrn: patient.medical_record_number,
      export_date: new Date().toISOString(),
      exported_by: user.full_name,
      pages: result.page_count
    });

  } catch (error) {
    console.error('Error generating patient chart PDF:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
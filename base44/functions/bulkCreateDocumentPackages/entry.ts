import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Admin access required' }, { status: 403 });
    }

    const { patient_ids, template_ids, due_date } = await req.json();

    if (!patient_ids || !Array.isArray(patient_ids) || patient_ids.length === 0) {
      return Response.json({ error: 'At least one patient required' }, { status: 400 });
    }

    if (!template_ids || !Array.isArray(template_ids) || template_ids.length === 0) {
      return Response.json({ error: 'At least one template required' }, { status: 400 });
    }

    if (!due_date) {
      return Response.json({ error: 'Due date required' }, { status: 400 });
    }

    const createdPackages = [];

    // Create a package for each patient-template combination
    for (const patientId of patient_ids) {
      const patient = await base44.asServiceRole.entities.Patient.get(patientId);
      if (!patient) continue;

      for (const templateId of template_ids) {
        const template = await base44.asServiceRole.entities.DocumentTemplate.get(templateId);
        if (!template) continue;

        // Create document signature from template
        const signature = await base44.asServiceRole.entities.DocumentSignature.create({
          patient_id: patientId,
          document_name: template.name,
          document_type: template.category,
          status: 'pending',
          signer_name: patient.caregiver_name || `${patient.first_name} ${patient.last_name}`,
          signer_email: patient.caregiver_email || patient.email,
        });

        // Create document package
        const pkg = await base44.asServiceRole.entities.DocumentPackage.create({
          package_name: `${template.name} - ${patient.first_name} ${patient.last_name}`,
          patient_id: patientId,
          document_signatures: [signature.id],
          status: 'pending',
          due_date,
          signer_name: patient.caregiver_name || `${patient.first_name} ${patient.last_name}`,
          signer_email: patient.caregiver_email || patient.email,
          auto_reminder_enabled: true,
          sent_to_patient_at: new Date().toISOString(),
        });

        createdPackages.push(pkg);
      }
    }

    return Response.json({
      success: true,
      packages_created: createdPackages.length,
      packages: createdPackages,
    });
  } catch (error) {
    console.error('Error in bulkCreateDocumentPackages:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all patients
    const allPatients = await base44.asServiceRole.entities.Patient.list();

    // Filter patients without first_name
    const patientsToDelete = allPatients.filter(p => !p.first_name || p.first_name.trim() === '');

    if (patientsToDelete.length === 0) {
      return Response.json({
        success: true,
        message: 'No patients found without first name',
        deletedCount: 0
      });
    }

    // Delete patients
    let deletedCount = 0;
    const failedDeletions = [];

    for (const patient of patientsToDelete) {
      try {
        await base44.asServiceRole.entities.Patient.delete(patient.id);
        deletedCount++;
      } catch (error) {
        failedDeletions.push({
          id: patient.id,
          name: patient.last_name || 'Unknown',
          error: error.message
        });
      }
    }

    return Response.json({
      success: true,
      message: `Deleted ${deletedCount} patient(s) without first name`,
      deletedCount,
      failedDeletions,
      totalProcessed: patientsToDelete.length
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
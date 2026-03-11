import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { patient_id, nurse_email } = await req.json();

    if (!patient_id || !nurse_email) {
      return Response.json({ error: 'patient_id and nurse_email are required' }, { status: 400 });
    }

    // Get patient using service role to bypass RLS
    const patient = await base44.asServiceRole.entities.Patient.get(patient_id);
    
    if (!patient) {
      return Response.json({ error: 'Patient not found' }, { status: 404 });
    }

    // Add nurse to assigned_nurses array if not already present
    const assignedNurses = patient.assigned_nurses || [];
    if (!assignedNurses.includes(nurse_email)) {
      assignedNurses.push(nurse_email);
      
      await base44.asServiceRole.entities.Patient.update(patient_id, {
        assigned_nurses: assignedNurses
      });
    }

    return Response.json({ 
      success: true, 
      message: 'Nurse assigned to patient',
      assigned_nurses: assignedNurses
    });
  } catch (error) {
    console.error('Error assigning nurse:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
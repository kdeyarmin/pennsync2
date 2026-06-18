import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    // Entity-trigger (fires on Visit create): invoked by the platform with no
    // identity / no custom header, so a secret gate would 403 the legitimate
    // trigger when INTERNAL_FN_SECRET is set. Defense for a trigger: re-fetch the
    // canonical Visit by id and derive the nurse + patient FROM the real record.
    // The id is ALWAYS present on a real trigger payload, so we require it and
    // NEVER fall back to the posted body — otherwise an unauthenticated caller
    // could omit the id and have arbitrary patient_id/created_by trusted, granting
    // an attacker-chosen email PHI access to any patient.
    const visitId = payload.data?.id;
    if (!visitId) {
      return Response.json({ success: true, skipped: 'no visit id' });
    }
    const visit = await base44.asServiceRole.entities.Visit.get(visitId).catch(() => null);
    if (!visit) {
      return Response.json({ success: true, skipped: 'visit not found' });
    }
    const patient_id = visit.patient_id;
    const nurse_email = visit.created_by;

    if (!patient_id || !nurse_email) {
      console.error('Missing patient_id or created_by on Visit:', visitId);
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
      
      const updateData = { assigned_nurses: assignedNurses };
      
      // Fill missing required fields for legacy/incomplete records to pass schema validation
      if (!patient.address || typeof patient.address !== 'string') updateData.address = patient.address ? String(patient.address) : 'Unknown';
      if (!patient.phone || typeof patient.phone !== 'string') updateData.phone = patient.phone ? String(patient.phone) : '000-000-0000';
      if (!patient.emergency_contact_name || typeof patient.emergency_contact_name !== 'string') updateData.emergency_contact_name = patient.emergency_contact_name ? String(patient.emergency_contact_name) : 'Unknown';
      if (!patient.emergency_contact_phone || typeof patient.emergency_contact_phone !== 'string') updateData.emergency_contact_phone = patient.emergency_contact_phone ? String(patient.emergency_contact_phone) : '000-000-0000';
      if (!patient.date_of_birth || typeof patient.date_of_birth !== 'string') updateData.date_of_birth = '1900-01-01';

      await base44.asServiceRole.entities.Patient.update(patient_id, updateData);
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
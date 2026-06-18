import { createClientFromRequest } from 'npm:@base44/sdk@0.8.21';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();

    // Opt-in auth gate (mirrors checkExpiredInvitations): this grants a nurse
    // access to a patient (assigned_nurses is the primary PHI access-scoping
    // field) via service role, so when INTERNAL_FN_SECRET is set require admin OR
    // the internal secret header. Unset => the Visit-automation (no identity) path
    // stays allowed; an authenticated non-admin is rejected.
    const me = await base44.auth.me().catch(() => null);
    const isAdmin = me?.role === 'admin';
    const internalSecret = Deno.env.get('INTERNAL_FN_SECRET');
    if (internalSecret) {
      if (!isAdmin && req.headers.get('x-internal-secret') !== internalSecret) {
        return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
    } else if (me && !isAdmin) {
      return Response.json({ error: 'Forbidden: admin access required' }, { status: 403 });
    }

    // Extract from entity automation payload
    const patient_id = payload.data?.patient_id;
    const nurse_email = payload.data?.created_by;

    if (!patient_id || !nurse_email) {
      console.error('Missing patient_id or nurse_email from Visit:', payload);
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
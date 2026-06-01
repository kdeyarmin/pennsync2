import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * getScopedPatientAlerts — returns PatientAlert rows the caller is authorized to
 * see, filtered SERVER-SIDE so a browser never receives other patients' PHI
 * alerts. Authorization model (matches the rest of the app):
 *   - admins: all alerts
 *   - everyone else: only alerts for patients they are assigned to
 *     (Patient.assigned_nurses includes their email)
 *
 * This is defense-in-depth; entity-level row security in the Base44 dashboard
 * remains the primary control. The client may still apply a favorites filter
 * on top for UX, but it is no longer an access boundary.
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { patient_id, limit } = await req.json().catch(() => ({}));
    const cap = Math.min(Number(limit) || 100, 500);
    const isAdmin = user.role === 'admin';

    // Single-patient view: authorize against assignment (or admin).
    if (patient_id) {
      if (!isAdmin) {
        const [patient] = await base44.asServiceRole.entities.Patient.filter({ id: patient_id });
        const assigned = Array.isArray(patient?.assigned_nurses) && patient.assigned_nurses.includes(user.email);
        if (!assigned) return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      const alerts = await base44.asServiceRole.entities.PatientAlert.filter({ patient_id }, '-created_date', cap);
      return Response.json({ alerts });
    }

    // All-alerts view.
    if (isAdmin) {
      const alerts = await base44.asServiceRole.entities.PatientAlert.list('-created_date', cap);
      return Response.json({ alerts });
    }

    // Non-admin: restrict to the caller's assigned patients.
    const myPatients = await base44.asServiceRole.entities.Patient
      .filter({ assigned_nurses: user.email }, '-created_date', 1000).catch(() => []);
    const allowed = new Set((myPatients || []).map((p: any) => p.id));
    if (allowed.size === 0) return Response.json({ alerts: [] });

    // Pull a recent window server-side, then keep only authorized rows.
    const recent = await base44.asServiceRole.entities.PatientAlert.list('-created_date', 1000).catch(() => []);
    const alerts = (recent || []).filter((a: any) => allowed.has(a.patient_id)).slice(0, cap);
    return Response.json({ alerts });
  } catch (error) {
    console.error('getScopedPatientAlerts error:', error?.message);
    return Response.json({ error: 'Failed to load alerts' }, { status: 500 });
  }
});

import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * getPatientContext — returns the core datasets the PatientDetails page needs for
 * a single patient (the patient record, visits, care plans, incidents, tasks, and
 * active alerts) in ONE round-trip instead of the page firing six independent
 * entity queries. Scoped to the caller so a non-admin can only load a patient
 * they're assigned to.
 *   - admins (role admin / agency_admin / super_admin / platform owner): any patient
 *   - everyone else: only when the patient's `assigned_nurses` includes their email
 *
 * Defense-in-depth; Base44 row-level security remains the primary control. The
 * client seeds the per-entity React Query caches (['patient',id], ['patientVisits',id],
 * …) from this payload so the page's child components get cache hits. OASIS uploads
 * are intentionally NOT included: that cache key is shape-inconsistent across
 * components (financial-stripped function result vs. raw entity), so it's left to
 * each component's own query.
 *
 * Shapes mirror the client queryFns exactly so seeding is a drop-in:
 *   visits   — Visit.filter({patient_id}, '-visit_date')
 *   incidents— Incident.filter({patient_id}, '-incident_date')
 *   alerts   — PatientAlert.filter({patient_id, status:'active'})
 *   carePlans/tasks — unsorted filter by patient_id
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json().catch(() => ({}));
    const patientId = body?.patientId;
    if (!patientId) return Response.json({ error: 'patientId is required' }, { status: 400 });

    const sr = base44.asServiceRole.entities;

    // Administrator tiers (mirrors getDashboardData / lib roles — kept inline since
    // Deno functions can't import frontend modules).
    const SUPER_ADMIN_EMAIL = ((typeof Deno !== 'undefined' && Deno.env.get('SUPER_ADMIN_EMAIL')) || 'kdeyarmin@comcast.net').trim().toLowerCase();
    const callerEmail = String(user.email || '').trim().toLowerCase();
    const isAdmin =
      user.role === 'admin' ||
      user.account_type === 'agency_admin' ||
      user.account_type === 'super_admin' ||
      callerEmail === SUPER_ADMIN_EMAIL;

    const patientArr = await sr.Patient.filter({ id: patientId }, '-updated_date', 1);
    const patient = patientArr?.[0] || null;
    if (!patient) return Response.json({ error: 'Patient not found' }, { status: 404 });

    // Non-admins may only read a patient they're assigned to.
    if (!isAdmin) {
      const assigned = Array.isArray(patient.assigned_nurses) ? patient.assigned_nurses : [];
      const allowed = assigned.map((e) => String(e).trim().toLowerCase()).includes(callerEmail);
      if (!allowed) return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const [visits, carePlans, incidents, tasks, activeAlerts] = await Promise.all([
      sr.Visit.filter({ patient_id: patientId }, '-visit_date'),
      sr.CarePlan.filter({ patient_id: patientId }),
      sr.Incident.filter({ patient_id: patientId }, '-incident_date'),
      sr.Task.filter({ patient_id: patientId }),
      sr.PatientAlert.filter({ patient_id: patientId, status: 'active' }),
    ]);

    return Response.json({ patient, visits, carePlans, incidents, tasks, activeAlerts });
  } catch (error) {
    console.error('getPatientContext error:', error?.message);
    return Response.json({ error: 'Failed to load patient context' }, { status: 500 });
  }
});

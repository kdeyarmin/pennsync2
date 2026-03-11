import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const createdAssignments = [];

    const certificates = await base44.asServiceRole.entities.TrainingCertificate.filter({ revoked: false }, '-issued_at', 1000);
    const activeAssignments = await base44.asServiceRole.entities.TrainingAssignment.list('-created_date', 1000);

    for (const certificate of certificates) {
      if (!certificate.expiration_date) continue;
      if (certificate.expiration_date > todayIso) continue;

      const existingRenewal = activeAssignments.find((assignment) =>
        assignment.course_id === certificate.course_id &&
        assignment.assigned_to_user_id === certificate.user_id &&
        ['assigned', 'in_progress', 'overdue', 'failed'].includes(assignment.status)
      );
      if (existingRenewal) continue;

      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + 14);

      const newAssignment = await base44.asServiceRole.entities.TrainingAssignment.create({
        course_id: certificate.course_id,
        course_title: certificate.course_title,
        assigned_to_user_id: certificate.user_id,
        assigned_by: 'system-renewal',
        assigned_date: today.toISOString(),
        due_date: dueDate.toISOString().slice(0, 10),
        priority: 'high',
        status: 'assigned',
        required: true,
        passing_score_required: certificate.score || 80,
        renewal_frequency: 'renewal',
        renewal_due_date: dueDate.toISOString().slice(0, 10),
        progress_percentage: 0,
        notes: 'Automatically reassigned for renewal.'
      });
      createdAssignments.push(newAssignment.id);

      await base44.asServiceRole.entities.Notification.create({
        user_email: certificate.user_id,
        title: 'Renewal training assigned',
        message: `A renewal in-service for "${certificate.course_title}" has been assigned to you.`,
        type: 'training_due',
        priority: 'high',
        action_url: '/MyTraining',
        action_label: 'Open training',
        metadata: { assignment_id: newAssignment.id, course_id: certificate.course_id }
      });
    }

    return Response.json({ success: true, renewal_assignments_created: createdAssignments.length });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date();
    const todayIso = today.toISOString().slice(0, 10);
    const dueAssignments = await base44.asServiceRole.entities.TrainingAssignment.filter({ renewal_due_date: todayIso }, '-updated_date', 100);
    const activeAssignments = await base44.asServiceRole.entities.TrainingAssignment.list('-created_date', 500);
    let renewalAssignmentsCreated = 0;

    for (const assignment of dueAssignments) {
      const existingRenewal = activeAssignments.find((item) =>
        item.course_id === assignment.course_id &&
        item.assigned_to_user_id === assignment.assigned_to_user_id &&
        item.id !== assignment.id &&
        ['assigned', 'in_progress', 'overdue', 'failed'].includes(item.status)
      );

      if (existingRenewal) continue;

      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + 14);

      const newAssignment = await base44.asServiceRole.entities.TrainingAssignment.create({
        course_id: assignment.course_id,
        course_title: assignment.course_title,
        assigned_to_user_id: assignment.assigned_to_user_id,
        assigned_to_role: assignment.assigned_to_role,
        assigned_to_department: assignment.assigned_to_department,
        assigned_to_location: assignment.assigned_to_location,
        assigned_to_business_line: assignment.assigned_to_business_line,
        assigned_by: 'system-renewal',
        assigned_date: today.toISOString(),
        due_date: dueDate.toISOString().slice(0, 10),
        priority: assignment.priority || 'high',
        status: 'assigned',
        required: assignment.required !== false,
        passing_score_required: assignment.passing_score_required || 80,
        max_attempts: assignment.max_attempts,
        waiting_period_hours: assignment.waiting_period_hours || 0,
        regenerate_test_on_retake: assignment.regenerate_test_on_retake !== false,
        renewal_frequency: assignment.renewal_frequency || 'renewal',
        attestation_required: assignment.attestation_required || false,
        remediation_message: assignment.remediation_message || 'Please complete the renewal in-service.',
        progress_percentage: 0,
        notes: 'Automatically reassigned for renewal.'
      });

      await base44.asServiceRole.entities.Notification.create({
        user_email: assignment.assigned_to_user_id,
        title: 'Renewal training assigned',
        message: `A renewal in-service for "${assignment.course_title}" has been assigned to you.`,
        type: 'training_due',
        priority: 'high',
        action_url: '/MyTraining',
        action_label: 'Open training',
        metadata: { assignment_id: newAssignment.id, course_id: assignment.course_id }
      });

      renewalAssignmentsCreated++;
    }

    return Response.json({ success: true, renewal_assignments_created: renewalAssignmentsCreated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
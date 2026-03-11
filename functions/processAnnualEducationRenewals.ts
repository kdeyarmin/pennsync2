import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date();
    const nextYear = today.getFullYear() + 1;
    const assignments = await base44.asServiceRole.entities.TrainingAssignment.list('-updated_date', 1000);
    let created = 0;

    for (const assignment of assignments) {
      if (assignment.annual_cycle_year !== today.getFullYear()) continue;
      if (!assignment.renewal_due_date || assignment.renewal_due_date > today.toISOString().slice(0, 10)) continue;
      const existing = assignments.find((item) => item.course_id === assignment.course_id && item.assigned_to_user_id === assignment.assigned_to_user_id && item.annual_cycle_year === nextYear);
      if (existing) continue;

      const dueDate = new Date(today);
      dueDate.setDate(dueDate.getDate() + 14);

      await base44.asServiceRole.entities.TrainingAssignment.create({
        ...assignment,
        assigned_date: today.toISOString(),
        due_date: dueDate.toISOString().slice(0, 10),
        annual_cycle_year: nextYear,
        status: 'assigned',
        progress_percentage: 0,
        latest_attempt_number: 0,
        score_percentage: null,
        pass_fail_result: 'pending',
        completion_date: null,
        certificate_id: null,
        retake_required: false,
        started_date: null,
        last_accessed: null,
        renewal_due_date: dueDate.toISOString().slice(0, 10)
      });

      await base44.asServiceRole.entities.Notification.create({
        user_email: assignment.assigned_to_user_id,
        title: 'Next annual education assigned',
        message: `Your ${nextYear} annual mandatory education for "${assignment.course_title}" has been assigned.`,
        type: 'training_due',
        priority: 'high',
        action_url: '/MyAnnualEducation',
        action_label: 'Open annual education',
        metadata: { course_id: assignment.course_id, annual_cycle_year: nextYear }
      });
      created++;
    }

    return Response.json({ success: true, created });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
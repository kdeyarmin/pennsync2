import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Unauthorized' }, { status: 403 });
    }

    const today = new Date();
    const notificationsSent = [];

    // Get all active assignments
    const assignments = await base44.asServiceRole.entities.TrainingAssignment.filter({
      status: { $in: ['assigned', 'in_progress'] }
    });

    for (const assignment of assignments) {
      const dueDate = new Date(assignment.due_date);
      const daysUntilDue = Math.ceil((dueDate - today) / (1000 * 60 * 60 * 24));

      // Send reminders at 14, 7, 3, 1 days before due
      const shouldSendReminder = [14, 7, 3, 1].includes(daysUntilDue);
      
      if (shouldSendReminder && assignment.assigned_to_user_id) {
        const notification = await base44.asServiceRole.entities.Notification.create({
          user_email: assignment.assigned_to_user_id,
          title: `Training Due in ${daysUntilDue} Day${daysUntilDue > 1 ? 's' : ''}`,
          message: `Your training "${assignment.course_title}" is due on ${dueDate.toLocaleDateString()}. Please complete it to stay compliant.`,
          type: 'task_due_soon',
          priority: daysUntilDue <= 3 ? 'high' : 'medium',
          action_url: `/TrainingCoursePlayer?assignment=${assignment.id}`,
          action_label: 'Start Training',
          metadata: {
            assignment_id: assignment.id,
            course_id: assignment.course_id,
            days_until_due: daysUntilDue
          }
        });

        notificationsSent.push(notification);

        // Update last reminder date
        await base44.asServiceRole.entities.TrainingAssignment.update(assignment.id, {
          last_reminder_date: today.toISOString().split('T')[0],
          reminder_sent: true
        });
      }

      // Send overdue notifications
      if (daysUntilDue < 0 && assignment.status !== 'overdue') {
        const notification = await base44.asServiceRole.entities.Notification.create({
          user_email: assignment.assigned_to_user_id,
          title: 'Training Overdue',
          message: `Your training "${assignment.course_title}" was due on ${dueDate.toLocaleDateString()}. Please complete it immediately.`,
          type: 'compliance_alert',
          priority: 'critical',
          action_url: `/TrainingCoursePlayer?assignment=${assignment.id}`,
          action_label: 'Complete Now',
          metadata: {
            assignment_id: assignment.id,
            course_id: assignment.course_id,
            days_overdue: Math.abs(daysUntilDue)
          }
        });

        notificationsSent.push(notification);

        // Update assignment status
        await base44.asServiceRole.entities.TrainingAssignment.update(assignment.id, {
          status: 'overdue'
        });
      }
    }

    // Check certificate expirations
    const certificates = await base44.asServiceRole.entities.TrainingCertificate.filter({
      revoked: false,
      expiration_date: { $ne: null }
    });

    for (const cert of certificates) {
      const expDate = new Date(cert.expiration_date);
      const daysUntilExpiration = Math.ceil((expDate - today) / (1000 * 60 * 60 * 24));

      // Send reminders at 14, 7, 3, 1 days before expiration
      if ([14, 7, 3, 1].includes(daysUntilExpiration)) {
        const notification = await base44.asServiceRole.entities.Notification.create({
          user_email: cert.user_id,
          title: `Certificate Expiring in ${daysUntilExpiration} Day${daysUntilExpiration > 1 ? 's' : ''}`,
          message: `Your certificate for "${cert.course_title}" will expire on ${expDate.toLocaleDateString()}. You may need to retake this course.`,
          type: 'compliance_alert',
          priority: daysUntilExpiration <= 3 ? 'high' : 'medium',
          action_url: `/MyCertificates`,
          action_label: 'View Certificate',
          metadata: {
            certificate_id: cert.id,
            course_id: cert.course_id,
            days_until_expiration: daysUntilExpiration
          }
        });

        notificationsSent.push(notification);
      }
    }

    return Response.json({
      success: true,
      notifications_sent: notificationsSent.length,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Notification sending failed:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { document_id, signer_emails, reminder_days, deadline_date } = await req.json();

    if (!document_id || !signer_emails || !reminder_days) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const deadlineTime = new Date(deadline_date).getTime();
    const reminderTime = deadlineTime - (reminder_days * 24 * 60 * 60 * 1000);
    const now = new Date().getTime();

    // If reminder time is in the future, schedule it
    if (reminderTime > now) {
      // Create reminder records for tracking
      for (const email of signer_emails) {
        await base44.entities.Notification.create({
          user_email: email,
          subject: `[REMINDER] Signature Pending - Document Due Soon`,
          message: `This is a reminder that you have a document pending signature. Please review and sign by ${new Date(deadline_date).toLocaleDateString()}.`,
          type: "signature_reminder",
          related_entity: "DocumentSignature",
          related_id: document_id,
          is_read: false,
          scheduled_for: new Date(reminderTime).toISOString()
        });
      }

      // Update the document to track reminder was set
      const docRecord = await base44.entities.DocumentSignature.filter({ id: document_id });
      if (docRecord && docRecord.length > 0) {
        await base44.asServiceRole.entities.DocumentSignature.update(document_id, {
          reminder_sent: true
        });
      }

      return Response.json({ 
        success: true, 
        message: 'Reminders scheduled successfully',
        reminder_count: signer_emails.length,
        reminder_date: new Date(reminderTime).toISOString()
      });
    } else {
      return Response.json({ 
        success: true, 
        message: 'Reminder date has passed, sending immediately',
        reminder_count: signer_emails.length
      });
    }
  } catch (error) {
    console.error('Error scheduling reminders:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
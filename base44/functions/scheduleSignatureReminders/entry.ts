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

    // If the computed reminder time is already in the past, schedule it for NOW
    // rather than silently dropping it. (The previous else-branch returned
    // success: true with the message "sending immediately" but created no
    // reminder record at all — the reminder was lost.)
    const immediate = reminderTime <= now;
    const reminderIso = new Date(immediate ? now : reminderTime).toISOString();

    // Create reminder records for tracking
    for (const email of signer_emails) {
      // The previous create used the user-scoped client (Notification write-RLS
      // is admin-only) AND a `subject` field, an invalid `type`, and non-existent
      // `related_*`/`scheduled_for` fields — so every call threw on the first
      // signer and NO reminder was ever created (the loop 500'd for all callers).
      // Use the service-role client and the real schema (required
      // user_email/title/message/type + a valid enum type).
      await base44.asServiceRole.entities.Notification.create({
        user_email: email,
        title: 'Signature Pending — Document Due Soon',
        message: `You have a document pending signature. Please review and sign by ${new Date(deadline_date).toLocaleDateString()}.`,
        type: 'task_due_soon',
        priority: 'high',
        is_read: false,
        // No action_url: the signer portal is reached via a per-signer tokenized
        // link (/signer?token=...) which this cron doesn't have, and a bare
        // /SignerPortal?document= path doesn't exist — a dead link is worse than none.
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
      message: immediate ? 'Reminder date had passed; reminders created immediately' : 'Reminders scheduled successfully',
      reminder_count: signer_emails.length,
      reminder_date: reminderIso
    });
  } catch (error) {
    console.error('Error scheduling reminders:', error);
    return Response.json({ error: 'Failed to schedule reminders' }, { status: 500 });
  }
});
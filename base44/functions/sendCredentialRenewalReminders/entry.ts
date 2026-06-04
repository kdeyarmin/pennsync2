import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const credentials = await base44.asServiceRole.entities.PersonnelCredential.list('-expiration_date', 5000);
    const today = new Date();
    const sixtyDaysFromNow = new Date(today);
    sixtyDaysFromNow.setDate(today.getDate() + 60);

    const notificationsSent = [];

    for (const cred of credentials) {
      if (!cred.expiration_date || cred.status === 'expired') continue;

      const expirationDate = new Date(cred.expiration_date);
      const daysUntilExpiry = Math.floor((expirationDate - today) / (1000 * 60 * 60 * 24));

      // Send renewal request at 60, 30, 14, and 7 days before expiration.
      // Determine which tiers are newly crossed in ONE pass. Iterating and
      // updating per-offset previously read a stale local `remindersSent`, so a
      // credential first seen at <=7 days fired all four tiers at once (and the
      // per-iteration write overwrote the tracking, causing repeats every run).
      const reminderOffsets = [60, 30, 14, 7];
      const remindersSent = cred.reminder_offsets_sent || [];
      const dueOffsets = reminderOffsets.filter(
        (offset) => daysUntilExpiry <= offset && !remindersSent.includes(offset)
      );

      if (dueOffsets.length > 0) {
        const userRecord = await base44.asServiceRole.entities.User.filter({ email: cred.user_id });

        if (userRecord && userRecord.length > 0) {
          const userName = userRecord[0].full_name || cred.user_id;

          // One consolidated email per run; the body already shows the real
          // days remaining. Per-credential try/catch so one failed send (bad
          // address, provider error) doesn't strand every later reminder.
          try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: cred.user_id,
            subject: `🔔 Credential Renewal Required: ${cred.title}`,
            body: `Dear ${userName},

Your ${cred.title} is expiring soon and requires renewal.

Credential: ${cred.title}
Issued By: ${cred.issuing_organization || 'N/A'}
Expiration Date: ${new Date(cred.expiration_date).toLocaleDateString()}
Days Remaining: ${daysUntilExpiry}

Please take action:
1. Go to your Personnel File in the app
2. Upload your renewed credential document
3. Submit for admin approval

Failure to renew before expiration may affect your assignment eligibility.

If you need assistance, please contact your supervisor.

Thank you,
Credential Management System`
          });

          // Record every newly-crossed tier so they are never re-sent.
          await base44.asServiceRole.entities.PersonnelCredential.update(cred.id, {
            reminder_offsets_sent: [...remindersSent, ...dueOffsets],
            last_reminder_sent_at: new Date().toISOString()
          });

          notificationsSent.push({
            user_id: cred.user_id,
            credential: cred.title,
            days_until_expiry: daysUntilExpiry,
            offsets: dueOffsets
          });
          } catch (sendErr) {
            console.error(`Failed to send renewal reminder for credential ${cred.id}:`, sendErr?.message || sendErr);
          }
        }
      }
    }

    return Response.json({
      success: true,
      notifications_sent: notificationsSent.length,
      details: notificationsSent
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});

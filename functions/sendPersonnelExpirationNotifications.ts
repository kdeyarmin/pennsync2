import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

const reminderOffsets = [90, 60, 30, 14];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const today = new Date();
    const items = await base44.asServiceRole.entities.PersonnelCredential.list('-expiration_date', 1000);
    const users = await base44.asServiceRole.entities.User.list('-created_date', 400);
    let notificationsSent = 0;

    for (const item of items) {
      if (!item.expiration_date || !item.user_id) continue;
      const expiration = new Date(`${item.expiration_date}T00:00:00Z`);
      const daysUntilExpiration = Math.ceil((expiration.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      const sentOffsets = Array.isArray(item.reminder_offsets_sent) ? item.reminder_offsets_sent : [];

      if (daysUntilExpiration < 0 && item.status !== 'expired') {
        await base44.asServiceRole.entities.PersonnelCredential.update(item.id, { status: 'expired' });
      }

      if (!reminderOffsets.includes(daysUntilExpiration) || sentOffsets.includes(daysUntilExpiration)) continue;

      const employee = users.find((user) => user.email === item.user_id);
      const agencyAdmins = users.filter((user) => user.account_type === 'agency_admin' && (!employee?.agency_name || user.agency_name === employee.agency_name));

      await base44.asServiceRole.entities.Notification.create({
        user_email: item.user_id,
        title: `${item.title} expires in ${daysUntilExpiration} days`,
        message: `Your ${item.item_type} "${item.title}" expires on ${new Date(item.expiration_date).toLocaleDateString()}. Please upload a renewed copy to your personnel file.`,
        type: 'compliance_alert',
        priority: daysUntilExpiration <= 30 ? 'high' : 'medium',
        action_url: '/PersonnelFile',
        action_label: 'Open personnel file',
        metadata: { personnel_credential_id: item.id, days_until_expiration: daysUntilExpiration }
      });

      await base44.asServiceRole.integrations.Core.SendEmail({
        to: item.user_id,
        subject: `${item.title} expires in ${daysUntilExpiration} days`,
        body: `Your ${item.item_type} "${item.title}" expires on ${new Date(item.expiration_date).toLocaleDateString()}. Please upload a renewed copy to your personnel file for approval.`,
        from_name: 'Penn Sync HR'
      });

      for (const manager of agencyAdmins) {
        await base44.asServiceRole.entities.Notification.create({
          user_email: manager.email,
          title: `Employee personnel file item expires in ${daysUntilExpiration} days`,
          message: `${item.user_name || item.user_id} has a ${item.item_type} item (${item.title}) expiring on ${new Date(item.expiration_date).toLocaleDateString()}.`,
          type: 'compliance_alert',
          priority: daysUntilExpiration <= 30 ? 'high' : 'medium',
          action_url: '/PersonnelFile',
          action_label: 'Review personnel file',
          metadata: { personnel_credential_id: item.id, employee_email: item.user_id, days_until_expiration: daysUntilExpiration }
        });

        await base44.asServiceRole.integrations.Core.SendEmail({
          to: manager.email,
          subject: `Personnel file expiration reminder: ${item.user_name || item.user_id}`,
          body: `${item.user_name || item.user_id} has a ${item.item_type} item (${item.title}) expiring on ${new Date(item.expiration_date).toLocaleDateString()}.`,
          from_name: 'Penn Sync HR'
        });
      }

      await base44.asServiceRole.entities.PersonnelCredential.update(item.id, {
        reminder_offsets_sent: [...sentOffsets, daysUntilExpiration],
        last_reminder_sent_at: new Date().toISOString()
      });
      notificationsSent++;
    }

    return Response.json({ success: true, notifications_sent: notificationsSent });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
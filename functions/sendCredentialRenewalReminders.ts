import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  const base44 = createClientFromRequest(req);
  const user = await base44.auth.me();

  if (!user || user.role !== 'admin') {
    return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
  }

  try {
    const credentials = await base44.asServiceRole.entities.PersonnelCredential.list();
    const today = new Date();
    const sixtyDaysFromNow = new Date(today);
    sixtyDaysFromNow.setDate(today.getDate() + 60);
    
    const notificationsSent = [];
    
    for (const cred of credentials) {
      if (!cred.expiration_date || cred.status === 'expired') continue;
      
      const expirationDate = new Date(cred.expiration_date);
      const daysUntilExpiry = Math.floor((expirationDate - today) / (1000 * 60 * 60 * 24));
      
      // Send renewal request at 60, 30, 14, and 7 days before expiration
      const reminderOffsets = [60, 30, 14, 7];
      const remindersSent = cred.reminder_offsets_sent || [];
      
      for (const offset of reminderOffsets) {
        if (daysUntilExpiry <= offset && !remindersSent.includes(offset)) {
          const userRecord = await base44.asServiceRole.entities.User.filter({ email: cred.user_id });
          
          if (userRecord && userRecord.length > 0) {
            const userName = userRecord[0].full_name || cred.user_id;
            
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
            
            // Update reminder tracking
            await base44.asServiceRole.entities.PersonnelCredential.update(cred.id, {
              reminder_offsets_sent: [...remindersSent, offset],
              last_reminder_sent_at: new Date().toISOString()
            });
            
            notificationsSent.push({
              user_id: cred.user_id,
              credential: cred.title,
              days_until_expiry: daysUntilExpiry,
              offset
            });
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
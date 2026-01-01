import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const {
      user_email,
      title,
      message,
      type,
      priority = 'medium',
      action_url,
      action_label,
      metadata,
      send_email = false
    } = await req.json();

    if (!user_email || !title || !message || !type) {
      return Response.json(
        { error: 'Missing required fields: user_email, title, message, type' },
        { status: 400 }
      );
    }

    // Create notification
    const notification = await base44.asServiceRole.entities.Notification.create({
      user_email,
      title,
      message,
      type,
      priority,
      action_url,
      action_label,
      metadata,
      is_read: false,
      email_sent: false
    });

    // Check user preferences and send email if appropriate
    if (send_email) {
      const preferences = await base44.asServiceRole.entities.NotificationPreference.filter({
        user_email
      });

      const userPref = preferences[0];
      const shouldSendEmail = userPref?.email_notifications_enabled !== false &&
                              userPref?.preferences?.[type] !== false;

      if (shouldSendEmail) {
        // Check quiet hours
        const now = new Date();
        const currentHour = now.getHours();
        const currentMinute = now.getMinutes();
        const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMinute.toString().padStart(2, '0')}`;

        const quietHoursEnabled = userPref?.quiet_hours?.enabled;
        const startTime = userPref?.quiet_hours?.start_time || '22:00';
        const endTime = userPref?.quiet_hours?.end_time || '08:00';

        let inQuietHours = false;
        if (quietHoursEnabled) {
          if (startTime > endTime) {
            // Quiet hours span midnight
            inQuietHours = currentTime >= startTime || currentTime <= endTime;
          } else {
            inQuietHours = currentTime >= startTime && currentTime <= endTime;
          }
        }

        // Send email if not in quiet hours or if priority is critical
        if (!inQuietHours || priority === 'critical') {
          try {
            await base44.asServiceRole.integrations.Core.SendEmail({
              to: user_email,
              subject: `Penn Sync: ${title}`,
              body: `
                <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                  <div style="background: linear-gradient(135deg, #3B82F6 0%, #6366F1 100%); padding: 20px; border-radius: 8px 8px 0 0;">
                    <h1 style="color: white; margin: 0; font-size: 24px;">Penn Sync Notification</h1>
                  </div>
                  <div style="background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
                    <h2 style="color: #1f2937; margin-top: 0;">${title}</h2>
                    <p style="color: #4b5563; font-size: 16px; line-height: 1.6;">${message}</p>
                    ${action_url ? `
                      <div style="margin-top: 30px;">
                        <a href="${action_url}" style="display: inline-block; background: #3B82F6; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600;">
                          ${action_label || 'View Details'}
                        </a>
                      </div>
                    ` : ''}
                    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e5e7eb;">
                      <p style="color: #9ca3af; font-size: 12px; margin: 0;">
                        This is an automated notification from Penn Sync. 
                        <a href="${action_url || '#'}" style="color: #3B82F6;">Manage your notification preferences</a>
                      </p>
                    </div>
                  </div>
                </div>
              `
            });

            await base44.asServiceRole.entities.Notification.update(notification.id, {
              email_sent: true
            });
          } catch (emailError) {
            console.error('Failed to send email notification:', emailError);
          }
        }
      }
    }

    return Response.json({ 
      success: true, 
      notification,
      email_sent: notification.email_sent
    });

  } catch (error) {
    console.error('Create notification error:', error);
    return Response.json(
      { error: error.message || 'Failed to create notification' },
      { status: 500 }
    );
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

/**
 * Creates a notification and sends it via appropriate channels based on user preferences
 * 
 * Request body:
 * {
 *   user_email: string (required),
 *   title: string (required),
 *   message: string (required),
 *   type: string (required - one of the notification types),
 *   priority: string (optional - low, medium, high, critical),
 *   action_url: string (optional),
 *   action_label: string (optional),
 *   metadata: object (optional)
 * }
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Authenticate user
    const currentUser = await base44.auth.me();
    if (!currentUser) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { user_email, title, message, type, priority = 'medium', action_url, action_label, metadata, patient_id } = body;

    // Validate required fields FIRST — otherwise a missing user_email would fall
    // into the patient-authorization query below as created_by: undefined and
    // return a misleading 403 ("has not charted") instead of a 400.
    if (!user_email || !title || !message || !type) {
      return Response.json({
        error: 'Missing required fields: user_email, title, message, type'
      }, { status: 400 });
    }

    // If this is a patient-related notification, verify the recipient has charted on this patient
    if (patient_id && type !== 'compliance_alert' && type !== 'report_ready' && type !== 'training_due') {
      const chartedVisits = await base44.asServiceRole.entities.Visit.filter({
        patient_id: patient_id,
        created_by: user_email
      });

      if (!chartedVisits || chartedVisits.length === 0) {
        return Response.json({
          error: 'Unauthorized: User has not charted on this patient',
          notificationCreated: false
        }, { status: 403 });
      }
    }

    // Get user's notification preferences
    const preferences = await base44.asServiceRole.entities.NotificationPreference.filter({
      user_email: user_email
    });

    const userPrefs = preferences[0] || {
      email_notifications_enabled: true,
      in_app_notifications_enabled: true,
      push_notifications_enabled: false,
      preferences: {}
    };

    // Check if notification type is enabled for in-app
    const typePrefs = userPrefs.preferences?.[type] || { 
      email: true, 
      in_app: true, 
      push: false 
    };

    // Always create in-app notification if in_app is enabled
    if (userPrefs.in_app_notifications_enabled && typePrefs.in_app !== false) {
      await base44.asServiceRole.entities.Notification.create({
        user_email,
        title,
        message,
        type,
        priority,
        action_url,
        action_label,
        metadata,
        is_read: false,
        email_sent: false,
        push_sent: false,
        dismissed: false
      });
    }

    // Check if should send email
    const shouldSendEmail = userPrefs.email_notifications_enabled && 
                           typePrefs.email !== false &&
                           userPrefs.digest_mode === 'instant';

    if (shouldSendEmail) {
      // Check quiet hours
      const now = new Date();
      const hours = now.getHours();
      const minutes = now.getMinutes();
      const currentTime = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
      
      let inQuietHours = false;
      if (userPrefs.quiet_hours?.enabled) {
        const start = userPrefs.quiet_hours.start_time;
        const end = userPrefs.quiet_hours.end_time;
        
        // Handle quiet hours across midnight
        if (start < end) {
          inQuietHours = currentTime >= start && currentTime <= end;
        } else {
          inQuietHours = currentTime >= start || currentTime <= end;
        }
      }

      // Send email if not in quiet hours or if critical priority
      if (!inQuietHours || priority === 'critical') {
        try {
          await base44.asServiceRole.integrations.Core.SendEmail({
            to: user_email,
            subject: `[Penn Sync] ${title}`,
            body: `
              ${message}
              
              ${action_url ? `\n\nView details: ${action_url}` : ''}
              
              ---
              This notification was sent because you have email notifications enabled for this type of alert.
              To manage your notification preferences, visit the Notification Settings page.
            `
          });
        } catch (emailError) {
          console.error('Failed to send email:', emailError);
        }
      }
    }

    return Response.json({ 
      success: true, 
      message: 'Notification created',
      channels: {
        in_app: userPrefs.in_app_notifications_enabled && typePrefs.in_app !== false,
        email: shouldSendEmail,
        push: userPrefs.push_notifications_enabled && typePrefs.push !== false
      }
    });

  } catch (error) {
    console.error('Error creating notification:', error);
    return Response.json({ 
      error: error.message || 'Internal server error' 
    }, { status: 500 });
  }
});
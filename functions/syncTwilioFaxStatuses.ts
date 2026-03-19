import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Background Service: Sync Twilio Fax Statuses
 * Polls Twilio API for pending faxes and updates status in database
 * Should be run as a scheduled automation every 5-10 minutes
 */
Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    // Verify admin access for background jobs
    const user = await base44.auth.me();
    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Get Twilio credentials
    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');

    if (!accountSid || !authToken) {
      return Response.json({ 
        error: 'Missing Twilio credentials' 
      }, { status: 500 });
    }

    // Find all faxes that are still pending or sending (not in final state)
    // Reduced limit to 50 to avoid CPU time limits
    const pendingStatuses = ['queued', 'sending'];
    const pendingFaxes = await base44.asServiceRole.entities.FaxLog.filter({
      status: { $in: pendingStatuses }
    }, '-created_date', 50);

    console.log(`Found ${pendingFaxes.length} pending faxes to check`);
    
    // Early exit if no pending faxes
    if (pendingFaxes.length === 0) {
      return Response.json({
        success: true,
        summary: { checked: 0, updated: 0, errors: 0, statuses: {} },
        message: 'No pending faxes to check',
      });
    }

    const results = {
      checked: 0,
      updated: 0,
      errors: 0,
      statuses: {},
    };

    // Check status of each pending fax with timeout safeguard
    const startTime = Date.now();
    const maxDuration = 40000; // 40 seconds max to stay within CPU limits
    
    for (const faxLog of pendingFaxes) {
      // Break early if approaching CPU time limit
      if (Date.now() - startTime > maxDuration) {
        console.warn(`Timeout approaching, stopping fax checks after ${results.checked} faxes`);
        break;
      }
      if (!faxLog.telnyx_fax_id) {
        console.warn(`FaxLog ${faxLog.id} missing telnyx_fax_id (Twilio SID)`);
        continue;
      }

      try {
        results.checked++;

        // Query Twilio API for fax status
        const twilioUrl = `https://fax.twilio.com/v1/Faxes/${faxLog.telnyx_fax_id}`;
        const response = await fetch(twilioUrl, {
          headers: {
            'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
          },
        });

        if (!response.ok) {
          console.error(`Twilio API error for ${faxLog.telnyx_fax_id}: ${response.status}`);
          results.errors++;
          continue;
        }

        const faxData = await response.json();
        const twilioStatus = faxData.status; // queued, processing, sending, delivered, failed, canceled
        const mappedStatus = mapTwilioStatus(twilioStatus);

        // Track status distribution
        results.statuses[twilioStatus] = (results.statuses[twilioStatus] || 0) + 1;

        // Only update if status has changed
        if (mappedStatus !== faxLog.status) {
          console.log(`Updating FaxLog ${faxLog.id}: ${faxLog.status} → ${mappedStatus}`);

          const updateData = {
            status: mappedStatus,
            pages: faxData.num_pages || faxLog.pages,
          };

          // Add error info if failed
          if (twilioStatus === 'failed') {
            updateData.failure_reason = faxData.error_message || 'Delivery failed';
          }

          await base44.asServiceRole.entities.FaxLog.update(faxLog.id, updateData);
          results.updated++;

          // Send notification
          await sendStatusNotification(
            base44, 
            faxLog, 
            twilioStatus, 
            faxData.num_pages,
            updateData.failure_reason
          );

          // Log activity
          if (faxLog.sent_by) {
            await base44.asServiceRole.entities.UserActivity.create({
              user_email: faxLog.sent_by,
              action: 'fax_status_sync',
              entity_type: 'FaxLog',
              entity_id: faxLog.id,
              details: {
                old_status: faxLog.status,
                new_status: mappedStatus,
                sync_method: 'background_poll',
                to_number: faxLog.to_number,
              },
              status: twilioStatus === 'failed' ? 'failure' : 'success',
            }).catch(() => {}); // Fail silently
          }
        }

      } catch (error) {
        console.error(`Error checking fax ${faxLog.id}:`, error);
        results.errors++;
      }
    }

    console.log('Fax status sync completed:', results);

    return Response.json({
      success: true,
      summary: results,
      message: `Checked ${results.checked} faxes, updated ${results.updated}`,
    });

  } catch (error) {
    console.error('Fax status sync error:', error);
    return Response.json({ 
      error: error.message,
      details: error.toString(),
    }, { status: 500 });
  }
});

function mapTwilioStatus(twilioStatus) {
  const statusMap = {
    'queued': 'queued',
    'processing': 'sending',
    'sending': 'sending',
    'delivered': 'delivered',
    'failed': 'failed',
    'canceled': 'failed'
  };
  return statusMap[twilioStatus] || 'sending';
}

async function sendStatusNotification(base44, faxLog, status, numPages, failureReason) {
  if (!faxLog.sent_by) return;

  const recipientName = faxLog.to_name || faxLog.to_number;
  
  try {
    let notificationData = null;

    switch (status) {
      case 'delivered':
        notificationData = {
          user_email: faxLog.sent_by,
          title: '✅ Fax Delivered Successfully',
          message: `Your fax to ${recipientName} has been delivered. Document: ${faxLog.document_name || 'Untitled'} (${numPages || faxLog.pages || 'N/A'} pages).`,
          type: 'fax_delivered',
          priority: 'normal',
          related_entity: 'FaxLog',
          related_entity_id: faxLog.id,
          is_read: false,
        };
        break;

      case 'failed':
        notificationData = {
          user_email: faxLog.sent_by,
          title: '❌ Fax Delivery Failed',
          message: `Your fax to ${recipientName} failed. Document: ${faxLog.document_name || 'Untitled'}. Reason: ${failureReason || 'Unknown error'}. Retry from Fax Dashboard.`,
          type: 'fax_failed',
          priority: 'high',
          related_entity: 'FaxLog',
          related_entity_id: faxLog.id,
          is_read: false,
        };
        break;

      case 'canceled':
        notificationData = {
          user_email: faxLog.sent_by,
          title: '🚫 Fax Canceled',
          message: `Your fax to ${recipientName} was canceled. Document: ${faxLog.document_name || 'Untitled'}.`,
          type: 'fax_canceled',
          priority: 'normal',
          related_entity: 'FaxLog',
          related_entity_id: faxLog.id,
          is_read: false,
        };
        break;
    }

    if (notificationData) {
      // Check if notification already exists to avoid duplicates
      const existingNotifications = await base44.asServiceRole.entities.Notification.filter({
        user_email: faxLog.sent_by,
        related_entity_id: faxLog.id,
        type: notificationData.type,
      }, '-created_date', 1);

      if (existingNotifications.length === 0) {
        await base44.asServiceRole.entities.Notification.create(notificationData);
        console.log(`Created ${status} notification for user: ${faxLog.sent_by}`);
      } else {
        console.log(`Notification already exists for fax ${faxLog.id}, status ${status}`);
      }
    }
  } catch (err) {
    console.error(`Failed to create ${status} notification:`, err);
  }
}
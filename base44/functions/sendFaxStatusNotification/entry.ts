import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { event, data } = await req.json();

    // Only process delivered or failed status changes
    const status = data?.status?.toLowerCase();
    if (!['delivered', 'failed'].includes(status)) {
      return Response.json({ skipped: true, reason: 'Status not delivered or failed' });
    }

    // Check if this is an update event with a previous status
    const oldStatus = event?.old_data?.status?.toLowerCase();
    if (oldStatus === status) {
      return Response.json({ skipped: true, reason: 'Status unchanged' });
    }

    const recipientFax = data?.recipient_fax_number || 'Unknown';
    const documentName = data?.document_name || 'Untitled Document';
    const timestamp = new Date().toLocaleString();

    // Prepare notification content
    const subject = `Fax ${status === 'delivered' ? 'Delivered' : 'Failed'}: ${documentName}`;
    const emailBody = `
Your fax has been ${status}.

Document: ${documentName}
Recipient: ${recipientFax}
Time: ${timestamp}
Status: ${status.charAt(0).toUpperCase() + status.slice(1)}
${data?.error_message ? `\nError: ${data.error_message}` : ''}
${data?.twilio_sid ? `\nTracking ID: ${data.twilio_sid}` : ''}

Please log in to your dashboard to view more details.
    `.trim();

    const smsMessage = `Fax ${status === 'delivered' ? 'delivered' : 'failed'}: ${documentName} to ${recipientFax}`;

    // Fetch user preferences (if stored)
    const userPrefs = await base44.auth.me();
    const notifyEmail = userPrefs?.email;
    const notifyPhone = userPrefs?.phone; // Assuming phone is stored on user

    const notifications = [];

    // Send Email notification
    if (notifyEmail) {
      try {
        await base44.integrations.Core.SendEmail({
          to: notifyEmail,
          subject: subject,
          body: emailBody,
          from_name: 'Fax System',
        });
        notifications.push({ type: 'email', status: 'sent' });
      } catch (emailError) {
        console.error('Email notification failed:', emailError);
        notifications.push({ type: 'email', status: 'failed', error: emailError.message });
      }
    }

    // Send SMS notification via Twilio
    if (notifyPhone) {
      try {
        const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
        const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
        const fromNumber = Deno.env.get('TWILIO_FAX_NUMBER'); // Reuse fax number or dedicated SMS number

        if (accountSid && authToken && fromNumber) {
          const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${btoa(`${accountSid}:${authToken}`)}`,
              'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
              From: fromNumber,
              To: notifyPhone,
              Body: smsMessage,
            }).toString(),
          });

          if (response.ok) {
            notifications.push({ type: 'sms', status: 'sent' });
          } else {
            const error = await response.text();
            notifications.push({ type: 'sms', status: 'failed', error });
          }
        }
      } catch (smsError) {
        console.error('SMS notification failed:', smsError);
        notifications.push({ type: 'sms', status: 'failed', error: smsError.message });
      }
    }

    // Log notification attempt
    try {
      await base44.asServiceRole.entities.Notification.create({
        user_id: user.email,
        type: 'fax_status',
        title: subject,
        message: `Fax to ${recipientFax} has been ${status}`,
        status: 'sent',
        related_fax_id: data?.id,
        created_at: new Date().toISOString(),
      });
    } catch (logError) {
      console.error('Failed to log notification:', logError);
    }

    return Response.json({
      success: true,
      notifications: notifications,
      faxId: data?.id,
      recipientFax: recipientFax,
      faxStatus: status,
    });
  } catch (error) {
    console.error('Notification service error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
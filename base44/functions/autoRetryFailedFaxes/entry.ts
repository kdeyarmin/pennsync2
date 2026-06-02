import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * Exponential backoff retry schedule: attempt 1 → 5 min, attempt 2 → 15 min, attempt 3 → 60 min
 * Called every 5 minutes by a scheduled automation.
 * Sends a final failure email/notification ONLY when all retries are exhausted.
 */

const BACKOFF_MINUTES = [5, 15, 60]; // delay before each retry attempt
const MAX_RETRIES = BACKOFF_MINUTES.length;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all faxes that are failed and have a scheduled next_retry_at
    const allFailed = await base44.asServiceRole.entities.FaxLog.filter(
      { status: 'failed' },
      '-updated_date',
      200
    );

    const now = new Date();
    let retriedCount = 0;
    let skippedCount = 0;

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const fromNumber = Deno.env.get('TWILIO_FAX_NUMBER');

    if (!accountSid || !authToken || !fromNumber) {
      return Response.json({ error: 'Twilio credentials not configured' }, { status: 500 });
    }

    for (const fax of allFailed) {
      // Skip if no retry is scheduled
      if (!fax.next_retry_at) {
        skippedCount++;
        continue;
      }

      // Skip if it's not time yet
      if (now < new Date(fax.next_retry_at)) {
        skippedCount++;
        continue;
      }

      // Attempt the retry via Twilio
      try {
        if (!fax.document_url) {
          console.error(`Fax ${fax.id} has no document_url, skipping retry`);
          skippedCount++;
          continue;
        }

        const formBody = new URLSearchParams();
        formBody.append('From', fromNumber);
        formBody.append('To', fax.to_number);
        formBody.append('MediaUrl', fax.document_url);
        formBody.append('Quality', 'fine');

        const twilioResp = await fetch('https://fax.twilio.com/v1/Faxes', {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
            'Content-Type': 'application/x-www-form-urlencoded'
          },
          body: formBody.toString()
        });

        if (twilioResp.ok) {
          const twilioData = await twilioResp.json();
          // Reset status to queued with new Twilio SID — webhook will update from here
          await base44.asServiceRole.entities.FaxLog.update(fax.id, {
            status: 'queued',
            telnyx_fax_id: twilioData.sid,
            next_retry_at: null,
            failure_reason: null
          });
          retriedCount++;
          console.log(`Retry attempt ${fax.retry_count} dispatched for fax ${fax.id} → new SID ${twilioData.sid}`);
        } else {
          const errText = await twilioResp.text();
          console.error(`Twilio error on retry for fax ${fax.id}:`, errText);
          // Twilio itself rejected — treat as a failed attempt
          await handleRetryExhausted(base44, fax, `Twilio rejected retry: ${errText}`);
        }
      } catch (err) {
        console.error(`Network error retrying fax ${fax.id}:`, err.message);
        await handleRetryExhausted(base44, fax, err.message);
      }
    }

    return Response.json({
      success: true,
      retried: retriedCount,
      skipped: skippedCount,
      timestamp: now.toISOString()
    });

  } catch (error) {
    console.error('autoRetryFailedFaxes error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

/**
 * Mark fax as permanently failed and notify user (only called when all retries exhausted).
 */
async function handleRetryExhausted(base44, fax, reason) {
  if (fax.final_failure_notified) return;

  await base44.asServiceRole.entities.FaxLog.update(fax.id, {
    next_retry_at: null,
    final_failure_notified: true,
    failure_reason: reason || fax.failure_reason
  });

  if (!fax.sent_by) return;

  const docName = fax.document_name || 'your document';
  const recipient = fax.to_name ? `${fax.to_name} (${fax.to_number})` : fax.to_number;

  // In-app notification
  try {
    await base44.asServiceRole.entities.Notification.create({
      user_email: fax.sent_by,
      title: '❌ Fax Failed — All Retries Exhausted',
      message: `"${docName}" to ${recipient} could not be delivered after ${MAX_RETRIES} attempts.`,
      type: 'error',
      is_read: false,
      action_url: `/send-fax?fax_id=${fax.id}`
    });
  } catch (e) {
    console.error('Failed to create in-app notification:', e.message);
  }

  // Email notification
  try {
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: fax.sent_by,
      subject: `❌ Fax Failed After ${MAX_RETRIES} Attempts`,
      body: `Your fax could not be delivered after ${MAX_RETRIES} automatic retry attempts.\n\nDocument: ${docName}\nRecipient: ${recipient}\nLast Error: ${fax.failure_reason || reason || 'Unknown'}\n\nPlease verify the recipient fax number and resend manually from the Fax Center.`
    });
  } catch (e) {
    console.error('Failed to send final failure email:', e.message);
  }
}
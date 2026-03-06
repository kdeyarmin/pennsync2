import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Allow scheduled (service role) or admin user calls
    let isAuthorized = false;
    try {
      const user = await base44.auth.me();
      if (user?.role === 'admin') isAuthorized = true;
    } catch (_) {
      // Called from automation without user context — use service role
      isAuthorized = true;
    }

    if (!isAuthorized) {
      return Response.json({ error: 'Forbidden' }, { status: 403 });
    }

    const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const authToken = Deno.env.get('TWILIO_AUTH_TOKEN');

    if (!accountSid || !authToken) {
      return Response.json({ error: 'Twilio credentials not configured' }, { status: 500 });
    }

    const authHeader = 'Basic ' + btoa(`${accountSid}:${authToken}`);

    // Fetch all faxes still in queued or sending state
    const pendingFaxes = await base44.asServiceRole.entities.FaxLog.filter(
      { status: 'queued' },
      '-created_date',
      100
    );
    const sendingFaxes = await base44.asServiceRole.entities.FaxLog.filter(
      { status: 'sending' },
      '-created_date',
      100
    );

    const toCheck = [...pendingFaxes, ...sendingFaxes].filter(f => f.telnyx_fax_id);

    if (toCheck.length === 0) {
      return Response.json({ message: 'No pending faxes to poll', updated: 0 });
    }

    let updatedCount = 0;
    const results = [];

    for (const fax of toCheck) {
      try {
        const twilioRes = await fetch(
          `https://fax.twilio.com/v1/Faxes/${fax.telnyx_fax_id}`,
          { headers: { 'Authorization': authHeader } }
        );

        if (!twilioRes.ok) {
          results.push({ id: fax.id, sid: fax.telnyx_fax_id, error: `Twilio returned ${twilioRes.status}` });
          continue;
        }

        const twilioData = await twilioRes.json();
        const twilioStatus = twilioData.status; // queued, processing, sending, delivered, no-answer, busy, failed, canceled

        // Map Twilio status to our FaxLog status enum
        let newStatus = null;
        if (twilioStatus === 'delivered') {
          newStatus = 'delivered';
        } else if (['failed', 'no-answer', 'busy', 'canceled'].includes(twilioStatus)) {
          newStatus = 'failed';
        } else if (twilioStatus === 'sending' || twilioStatus === 'processing') {
          newStatus = 'sending';
        }

        if (newStatus && newStatus !== fax.status) {
          const updatePayload = { status: newStatus };
          if (twilioData.num_pages) updatePayload.pages = twilioData.num_pages;
          if (newStatus === 'failed') {
            updatePayload.failure_reason = twilioStatus;
          }

          await base44.asServiceRole.entities.FaxLog.update(fax.id, updatePayload);
          updatedCount++;
          results.push({ id: fax.id, sid: fax.telnyx_fax_id, old: fax.status, new: newStatus });
        } else {
          results.push({ id: fax.id, sid: fax.telnyx_fax_id, status: fax.status, unchanged: true });
        }
      } catch (err) {
        results.push({ id: fax.id, sid: fax.telnyx_fax_id, error: err.message });
      }
    }

    return Response.json({
      message: `Polled ${toCheck.length} faxes, updated ${updatedCount}`,
      updated: updatedCount,
      results
    });

  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
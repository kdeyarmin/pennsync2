import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

/**
 * setNurseDutyStatus — self-service duty toggle + off-duty message editor.
 * A nurse updates their own status; an admin may target another user.
 *
 * No 8x8 call is needed: the inbound VCA webhook (handleEightXEightVoiceCall)
 * reads duty_status live at call time, so the change takes effect immediately.
 */

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { duty_status, off_duty_message, target_user_email } = await req.json();

    if (duty_status && !['on_duty', 'off_duty'].includes(duty_status)) {
      return Response.json({ error: 'duty_status must be "on_duty" or "off_duty"' }, { status: 400 });
    }

    // Resolve who is being updated.
    let target = user;
    if (target_user_email && target_user_email !== user.email) {
      if (user.role !== 'admin') {
        return Response.json({ error: 'Only administrators can change another user\'s duty status' }, { status: 403 });
      }
      const found = await base44.asServiceRole.entities.User.filter({ email: target_user_email });
      if (!found[0]) return Response.json({ error: 'Target user not found' }, { status: 404 });
      target = found[0];
    }

    const update: Record<string, unknown> = {};
    if (duty_status) update.duty_status = duty_status;
    if (off_duty_message !== undefined) update.off_duty_message = off_duty_message;
    if (Object.keys(update).length === 0) {
      return Response.json({ error: 'Nothing to update' }, { status: 400 });
    }

    await base44.asServiceRole.entities.User.update(target.id, update);

    await base44.entities.UserActivity.create({
      user_email: user.email,
      user_name: user.full_name,
      action: 'duty_status_changed',
      entity_type: 'User',
      entity_id: target.id,
      details: {
        target_user_email: target.email,
        duty_status: update.duty_status ?? target.duty_status,
        off_duty_message_set: off_duty_message !== undefined,
        timestamp: new Date().toISOString(),
      },
      status: 'success',
    }).catch((err) => console.error('Failed to log activity:', err));

    return Response.json({ success: true, duty_status: update.duty_status ?? target.duty_status });
  } catch (error) {
    console.error('setNurseDutyStatus error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

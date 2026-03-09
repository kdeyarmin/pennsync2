import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Scheduled every 10 minutes.
// Finds any users who are NOT approved but have a pending UserInvitation,
// then auto-approves them and sends a welcome email.
// This is a safety net in case the onUserSignup hook fails.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get all pending invitations
    const invitations = await base44.asServiceRole.entities.UserInvitation.filter({ status: 'pending' });
    if (!invitations || invitations.length === 0) {
      return Response.json({ success: true, message: 'No pending invitations found' });
    }

    const appUrl = 'https://hub.base44.app/apps/68ee80d98929370f9e8f2932';
    let approvedCount = 0;

    for (const invitation of invitations) {
      // Find the registered user with this email
      const matchingUsers = await base44.asServiceRole.entities.User.filter({ email: invitation.email });
      if (!matchingUsers || matchingUsers.length === 0) continue;

      const user = matchingUsers[0];

      // Skip if already approved
      if (user.is_approved) {
        // Clean up stale invitation
        await base44.asServiceRole.entities.UserInvitation.update(invitation.id, {
          status: 'accepted',
          accepted_at: new Date().toISOString()
        });
        continue;
      }

      console.log('Found stuck user, auto-approving:', user.email);

      // Auto-approve
      await base44.asServiceRole.entities.User.update(user.id, {
        is_approved: true,
        role: invitation.role || 'user',
        care_scope: invitation.care_scope || 'home_health',
        ...(invitation.phone ? { phone: invitation.phone } : {}),
        ...(invitation.credentials ? { credentials: invitation.credentials } : {})
      });

      // Mark invitation accepted
      await base44.asServiceRole.entities.UserInvitation.update(invitation.id, {
        status: 'accepted',
        accepted_at: new Date().toISOString()
      });

      // Send welcome email
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: user.email,
        from_name: 'Penn Sync',
        subject: 'Welcome to Penn Sync — Your Account is Active',
        body: `Hello ${invitation.full_name || user.email},

Your Penn Sync account has been activated and is ready to use.

🔗 Login: ${appUrl}
👤 Email: ${user.email}

If you have any questions, please reach out to your administrator.

Best regards,
Penn Sync Team`
      });

      approvedCount++;
      console.log('✓ Auto-approved:', user.email);
    }

    return Response.json({ success: true, approved: approvedCount });

  } catch (error) {
    console.error('autoApproveInvitedUser error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
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

      if (user.is_approved && user.is_verified) {
        await base44.asServiceRole.entities.UserInvitation.update(invitation.id, {
          status: 'accepted',
          accepted_at: new Date().toISOString()
        });
        continue;
      }

      console.log('Found invited user needing recovery:', user.email);

      if (!user.is_approved) {
        await base44.asServiceRole.entities.User.update(user.id, {
          is_approved: true,
          role: invitation.role || 'user',
          care_scope: invitation.care_scope || 'home_health',
          ...(invitation.phone ? { phone: invitation.phone } : {}),
          ...(invitation.credentials ? { credentials: invitation.credentials } : {})
        });
      }

      const verification = await verifyInvitedUser(base44, user.email);
      if (!verification.success) {
        console.log('Verification still pending for:', user.email);
        continue;
      }

      await base44.asServiceRole.entities.UserInvitation.update(invitation.id, {
        status: 'accepted',
        accepted_at: new Date().toISOString()
      });

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
      console.log('✓ Auto-approved and verified:', user.email);
    }

    return Response.json({ success: true, approved: approvedCount });

  } catch (error) {
    console.error('autoApproveInvitedUser error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});

async function verifyInvitedUser(base44, email) {
  try {
    const config = base44.getConfig();
    let users = await base44.asServiceRole.entities.User.filter({ email });
    let authUser = users?.[0];

    if (authUser?.is_verified) {
      return { success: true, already_verified: true };
    }

    const otpExpired = !authUser?.otp_code || !authUser?.otp_expires_at || new Date(authUser.otp_expires_at) <= new Date();

    if (otpExpired) {
      const resendResponse = await fetch(`${config.serverUrl}/api/apps/${config.appId}/auth/resend-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });

      if (!resendResponse.ok) {
        return { success: false, step: 'resend_failed' };
      }

      users = await base44.asServiceRole.entities.User.filter({ email });
      authUser = users?.[0];
    }

    if (!authUser?.otp_code) {
      return { success: false, step: 'missing_otp_code' };
    }

    const verifyResponse = await fetch(`${config.serverUrl}/api/apps/${config.appId}/auth/verify-otp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp_code: authUser.otp_code })
    });

    const result = await verifyResponse.json();
    return { success: verifyResponse.ok, result };
  } catch (error) {
    console.error('verifyInvitedUser error:', error);
    return { success: false, step: 'exception', error: String(error?.message || error) };
  }
}
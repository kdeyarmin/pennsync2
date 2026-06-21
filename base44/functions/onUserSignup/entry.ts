import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Operational logs are gated behind FUNCTIONS_DEBUG so they don't run in
// production by default. console.error/warn remain ungated for visibility.
const DEBUG = !!Deno.env.get('FUNCTIONS_DEBUG');
const debugLog = (...args) => { if (DEBUG) console.log(...args); };

Deno.serve(async (req) => {
  try {
    debugLog('onUserSignup triggered');
    const base44 = createClientFromRequest(req);
    const { user } = await req.json();
    debugLog('User data received:', user?.email ? '[email present]' : '[no email]');

    if (!user || !user.email) {
      console.error('No user data provided');
      return Response.json({ error: 'No user data provided' }, { status: 400 });
    }

    // Opt-in webhook-secret gate: if SIGNUP_WEBHOOK_SECRET is set, require it so
    // arbitrary HTTP callers can't forge signups / role escalation. Unset => no
    // enforcement (so the platform trigger keeps working).
    const signupSecret = Deno.env.get('SIGNUP_WEBHOOK_SECRET');
    if (signupSecret && req.headers.get('x-webhook-secret') !== signupSecret) {
      return Response.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // Check if user was invited
    debugLog('Checking for invitation...');
    const invitations = await base44.asServiceRole.entities.UserInvitation.filter({ 
      email: user.email,
      status: 'pending'
    });
    debugLog('Found invitations:', invitations?.length || 0);

    if (invitations && invitations.length > 0) {
      const invitation = invitations[0];

      // Don't trust the body's user.id<->email pairing: confirm the id resolves
      // to the invited email before granting role/approval.
      const actualUsers = await base44.asServiceRole.entities.User.filter({ id: user.id });
      if (!actualUsers?.[0] || actualUsers[0].email !== user.email) {
        return Response.json({ error: 'User id/email mismatch' }, { status: 400 });
      }
      
      // Auto-approve ALL invited users (admin-added users should be automatically approved)
      debugLog('Auto-approving invited user...');
      
      try {
        await base44.asServiceRole.entities.User.update(user.id, {
          // Apply the admin-provided name from the invitation so invited users
          // start with their real name (not an email-derived placeholder).
          // Fall back to whatever the signup already set so we never wipe a name.
          full_name: invitation.full_name || user.full_name,
          role: invitation.role,
          care_scope: invitation.care_scope,
          phone: invitation.phone,
          credentials: invitation.credentials,
          is_approved: true
        });

        const verification = await verifyInvitedUser(base44, user.email);

        if (verification.success) {
          await base44.asServiceRole.entities.UserInvitation.delete(invitation.id);
        }

        try {
          await base44.asServiceRole.entities.UserActivity.create({
            user_email: user.email,
            user_name: user.full_name,
            action: 'user_signup_auto_approved',
            details: {
              invitation_id: invitation.id,
              role: invitation.role,
              care_scope: invitation.care_scope,
              invited_by: invitation.invited_by,
              auth_verified: verification.success
            },
            page: 'Signup',
            entity_type: 'User',
            entity_id: user.id
          });
        } catch (logError) {
          console.error('Failed to log activity:', logError);
        }

        debugLog('Auto-approved invited user', verification.success ? '(verified)' : '(verification pending)');
        return Response.json({ success: true, auto_approved: true, auth_verified: verification.success });
      } catch (updateError) {
        console.error('Failed to auto-approve user:', updateError);
      }
    }

    // Not invited - notify admins for manual approval
    debugLog('Fetching admin users...');
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    debugLog('Found admins:', admins.length);

    const emailBody = `
    Hello,

    A new user has signed up for Penn Sync and is awaiting approval:

    👤 Name: ${user.full_name || 'Not provided'}
    📧 Email: ${user.email}
    📅 Signup Date: ${new Date().toLocaleString()}
    🎭 Role: ${user.role || 'user'}

    Action Required:
    Please log in to Penn Sync and navigate to the User Management page to approve or review this user's access.

    ➡️ Go to Admin Dashboard > User Management

    The user will not be able to access the system until approved by an administrator.

    Best regards,
    Penn Sync System
    `.trim();

    // Send email to all admins
    const emailPromises = admins.map(admin => 
      base44.asServiceRole.integrations.Core.SendEmail({
        to: admin.email,
        subject: `🔔 New User Awaiting Approval - Penn Sync`,
        from_name: 'Penn Sync Notifications',
        body: `Hello ${admin.full_name || 'Admin'},\n\n${emailBody}`
      })
    );

    // Also send notification to kdeyarmin@pennhospice.com
    emailPromises.push(
      base44.asServiceRole.integrations.Core.SendEmail({
        to: 'kdeyarmin@pennhospice.com',
        subject: `🔔 New User Awaiting Approval - Penn Sync`,
        from_name: 'Penn Sync Notifications',
        body: `Hello,\n\n${emailBody}`
      })
    );

    debugLog('Sending signup notification emails to admins...');
    await Promise.all(emailPromises);
    debugLog('Signup notification complete');

    return Response.json({ 
      success: true, 
      message: `Notification sent to ${admins.length} admin(s)` 
    });

  } catch (error) {
    console.error('Error in onUserSignup:', error);
    console.error('Error stack:', error.stack);
    
    // Return success even if notification fails - don't block signup
    return Response.json({ 
      success: true,
      warning: 'User created but notification failed',
      error: error.message 
    });
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
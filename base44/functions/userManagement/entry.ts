import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

/**
 * Unified User Management Function
 * Handles: user creation, invitation, password reset, invitation management
 * Replaces: createUserWithTempPassword, resetUserPassword, resendInvitation, checkExpiredInvitations
 */

// Cryptographically strong temporary password: fixed length, mixed character
// classes, drawn from a CSPRNG (not Math.random).
function generateTempPassword(length = 16) {
  const charset = 'ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  const bytes = new Uint8Array(length);
  crypto.getRandomValues(bytes);
  let out = '';
  for (let i = 0; i < length; i++) out += charset[bytes[i] % charset.length];
  return out;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, ...params } = await req.json();

    // Verify admin for most actions
    const currentUser = await base44.auth.me();
    const isAdmin = currentUser?.role === 'admin';

    switch (action) {
      case 'invite_user':
        return await inviteUser(base44, currentUser, params, isAdmin);
      
      case 'resend_invitation':
        return await resendInvitation(base44, currentUser, params, isAdmin);
      
      case 'reset_password':
        return await resetPassword(base44, currentUser, params, isAdmin);
      
      case 'check_expired_invitations':
        // Gate like every other action: this reads all invitations and emails
        // all admins, so it must not be callable by a non-admin.
        if (!isAdmin) {
          return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
        }
        return await checkExpiredInvitations(base44);
      
      case 'cancel_invitation':
        return await cancelInvitation(base44, currentUser, params, isAdmin);
      
      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('User management error:', error);
    return Response.json({ 
      error: 'Internal server error', 
      details: error.message 
    }, { status: 500 });
  }
});

async function inviteUser(base44, currentUser, params, isAdmin) {
  if (!isAdmin) {
    return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
  }

  const { email, full_name, role, care_scope, phone, credentials } = params;

  if (!email || !full_name) {
    return Response.json({ error: 'Email and full name are required' }, { status: 400 });
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  const invitation = await base44.asServiceRole.entities.UserInvitation.create({
    email,
    full_name,
    role: role || 'user',
    care_scope: care_scope || 'home_health',
    phone: phone || null,
    credentials: credentials || null,
    invited_by: currentUser.email,
    status: 'pending',
    expires_at: expiresAt.toISOString(),
    last_sent_at: now.toISOString(),
    resend_count: 0
  });

  // Send invitation email
  try {
    const signupUrl = `${Deno.env.get('APP_URL') || 'https://app.base44.app'}`;
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      subject: 'Invitation to Penn Sync',
      body: `Hello ${full_name},\n\nYou've been invited to join Penn Sync.\n\nEmail: ${email}\nRole: ${role || 'user'}\n\nPlease visit ${signupUrl} to create your account.\n\n⏰ This invitation expires in 7 days (${expiresAt.toLocaleDateString()}).\n\nWelcome to Penn Sync!`,
      from_name: 'Penn Sync'
    });
  } catch (emailError) {
    console.error('Email send failed (non-critical):', emailError.message);
  }

  // Log activity
  await base44.asServiceRole.entities.UserActivity.create({
    user_email: currentUser.email,
    user_name: currentUser.full_name,
    action: 'user_invited',
    details: { invited_email: email, invited_name: full_name, role },
    page: 'UserManagement',
    entity_type: 'UserInvitation',
    entity_id: invitation.id
  });

  return Response.json({ 
    success: true, 
    message: 'Invitation sent successfully',
    invitation_id: invitation.id,
    expires_at: expiresAt.toISOString()
  });
}

async function resendInvitation(base44, currentUser, params, isAdmin) {
  if (!isAdmin) {
    return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
  }

  const { invitation_id } = params;
  if (!invitation_id) {
    return Response.json({ error: 'invitation_id is required' }, { status: 400 });
  }

  const invitations = await base44.asServiceRole.entities.UserInvitation.filter({ id: invitation_id });
  if (!invitations || invitations.length === 0) {
    return Response.json({ error: 'Invitation not found' }, { status: 404 });
  }

  const invitation = invitations[0];
  const now = new Date();
  const newExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  await base44.asServiceRole.entities.UserInvitation.update(invitation_id, {
    status: 'pending',
    expires_at: newExpiresAt.toISOString(),
    last_sent_at: now.toISOString(),
    resend_count: (invitation.resend_count || 0) + 1
  });

  // Resend email
  const signupUrl = `${Deno.env.get('APP_URL') || 'https://app.base44.app'}`;
  await base44.asServiceRole.integrations.Core.SendEmail({
    to: invitation.email,
    subject: 'Reminder: Invitation to Penn Sync',
    body: `Hello ${invitation.full_name},\n\nThis is a reminder that you've been invited to join Penn Sync.\n\nEmail: ${invitation.email}\nRole: ${invitation.role || 'user'}\n\nPlease visit ${signupUrl} to create your account.\n\n⏰ This invitation expires in 7 days (${newExpiresAt.toLocaleDateString()}).\n\nWelcome to Penn Sync!`,
    from_name: 'Penn Sync'
  });

  // Log activity
  await base44.asServiceRole.entities.UserActivity.create({
    user_email: currentUser.email,
    user_name: currentUser.full_name,
    action: 'invitation_resent',
    details: {
      invited_email: invitation.email,
      resend_count: (invitation.resend_count || 0) + 1,
      new_expires_at: newExpiresAt.toISOString()
    },
    page: 'UserManagement',
    entity_type: 'UserInvitation',
    entity_id: invitation_id
  });

  return Response.json({ 
    success: true, 
    message: 'Invitation resent successfully',
    new_expires_at: newExpiresAt.toISOString()
  });
}

async function resetPassword(base44, currentUser, params, isAdmin) {
  if (!isAdmin) {
    return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
  }

  const { userEmail } = params;
  if (!userEmail) {
    return Response.json({ error: 'User email is required' }, { status: 400 });
  }

  // Generate a temporary password from a CSPRNG with a guaranteed length and
  // character mix. `Math.random().toString(36).slice(-8)` is non-cryptographic
  // and can yield far fewer than 8 chars (e.g. when the fraction is short),
  // producing a weak, short credential.
  const tempPassword = generateTempPassword();

  const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
  if (!users || users.length === 0) {
    return Response.json({ error: 'User not found' }, { status: 404 });
  }

  const targetUser = users[0];

  // Update password
  await base44.asServiceRole.auth.updateUserPassword(userEmail, tempPassword);

  // Send email
  await base44.asServiceRole.integrations.Core.SendEmail({
    to: userEmail,
    subject: 'Your Password Has Been Reset',
    body: `Hello ${targetUser.full_name || 'User'},\n\nYour password has been reset by an administrator.\n\nYour temporary password is: ${tempPassword}\n\nPlease log in and change your password immediately for security purposes.\n\nIf you did not request this password reset, please contact your administrator immediately.\n\nBest regards,\nPenn Sync Team`
  });

  // Log activity
  await base44.asServiceRole.entities.UserActivity.create({
    user_email: currentUser.email,
    user_name: currentUser.full_name,
    action: 'password_reset',
    details: { target_user: userEmail, reset_by: currentUser.email },
    page: 'UserManagement',
    entity_type: 'User',
    entity_id: targetUser.id
  });

  return Response.json({
    success: true,
    message: 'Password reset successfully. Temporary password sent via email.'
  });
}

async function checkExpiredInvitations(base44) {
  const now = new Date();
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

  const pendingInvitations = await base44.asServiceRole.entities.UserInvitation.filter({ 
    status: 'pending' 
  });

  const expired = [];
  const expiringSoon = [];

  for (const invitation of pendingInvitations) {
    const expiresAt = new Date(invitation.expires_at);
    
    if (now > expiresAt) {
      expired.push(invitation);
      await base44.asServiceRole.entities.UserInvitation.update(invitation.id, {
        status: 'expired'
      });
    } else if (tomorrow > expiresAt) {
      expiringSoon.push(invitation);
    }
  }

  // Notify admins if needed
  if (expired.length > 0 || expiringSoon.length > 0) {
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });

    for (const admin of admins) {
      let emailBody = `Hello ${admin.full_name},\n\nUser Invitation Status Update:\n\n`;

      if (expired.length > 0) {
        emailBody += `⚠️ EXPIRED INVITATIONS (${expired.length}):\n`;
        expired.forEach(inv => {
          emailBody += `  • ${inv.full_name} (${inv.email}) - Expired: ${new Date(inv.expires_at).toLocaleString()}\n`;
        });
        emailBody += '\n';
      }

      if (expiringSoon.length > 0) {
        emailBody += `⏰ EXPIRING SOON (within 24 hours) (${expiringSoon.length}):\n`;
        expiringSoon.forEach(inv => {
          emailBody += `  • ${inv.full_name} (${inv.email}) - Expires: ${new Date(inv.expires_at).toLocaleString()}\n`;
        });
        emailBody += '\n';
      }

      emailBody += 'Please consider resending these invitations from the User Management page.\n\nPenn Sync';

      try {
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: admin.email,
          subject: `📧 User Invitation Status - ${expired.length} Expired, ${expiringSoon.length} Expiring Soon`,
          body: emailBody,
          from_name: 'Penn Sync'
        });
      } catch (emailError) {
        console.error('Failed to send email to admin:', admin.email, emailError);
      }
    }
  }

  return Response.json({ 
    success: true,
    expired: expired.length,
    expiring_soon: expiringSoon.length
  });
}

async function cancelInvitation(base44, currentUser, params, isAdmin) {
  if (!isAdmin) {
    return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
  }

  const { invitation_id } = params;
  if (!invitation_id) {
    return Response.json({ error: 'invitation_id is required' }, { status: 400 });
  }

  await base44.asServiceRole.entities.UserInvitation.delete(invitation_id);

  return Response.json({ 
    success: true, 
    message: 'Invitation cancelled successfully' 
  });
}
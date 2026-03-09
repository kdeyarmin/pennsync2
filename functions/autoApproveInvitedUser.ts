import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

// Triggered by User entity create automation.
// Ensures invited users are always auto-approved on signup,
// even if the onUserSignup hook fails or fires late.

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { event, data } = await req.json();

    const userId = event?.entity_id;
    const userEmail = data?.email;

    if (!userId || !userEmail) {
      return Response.json({ skipped: true, reason: 'Missing user id or email' });
    }

    // Already approved — nothing to do
    if (data?.is_approved === true) {
      return Response.json({ skipped: true, reason: 'Already approved' });
    }

    // Look for a matching pending invitation
    const invitations = await base44.asServiceRole.entities.UserInvitation.filter({
      email: userEmail,
      status: 'pending'
    });

    if (!invitations || invitations.length === 0) {
      console.log('No pending invitation found for:', userEmail, '— leaving for manual admin approval');
      return Response.json({ skipped: true, reason: 'No pending invitation' });
    }

    const invitation = invitations[0];
    console.log('Found invitation for', userEmail, '— auto-approving...');

    // Auto-approve with invitation metadata
    await base44.asServiceRole.entities.User.update(userId, {
      is_approved: true,
      role: invitation.role || 'user',
      care_scope: invitation.care_scope || 'home_health',
      ...(invitation.phone ? { phone: invitation.phone } : {}),
      ...(invitation.credentials ? { credentials: invitation.credentials } : {})
    });

    // Mark invitation as accepted
    await base44.asServiceRole.entities.UserInvitation.update(invitation.id, {
      status: 'accepted',
      accepted_at: new Date().toISOString()
    });

    console.log('✓ Auto-approved invited user:', userEmail);

    // Send welcome email
    const appUrl = 'https://hub.base44.app/apps/68ee80d98929370f9e8f2932';
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: userEmail,
      from_name: 'Penn Sync',
      subject: 'Welcome to Penn Sync — Your Account is Active',
      body: `Hello ${invitation.full_name || userEmail},

Your Penn Sync account has been activated and is ready to use.

🔗 Login: ${appUrl}
👤 Email: ${userEmail}

If you have any questions, please reach out to your administrator.

Best regards,
Penn Sync Team`
    });

    return Response.json({ success: true, approved: true, user: userEmail });

  } catch (error) {
    console.error('autoApproveInvitedUser error:', error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
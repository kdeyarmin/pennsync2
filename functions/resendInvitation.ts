import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    console.log('=== resendInvitation started ===');
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const { invitation_id } = await req.json();
    
    if (!invitation_id) {
      return Response.json({ error: 'invitation_id is required' }, { status: 400 });
    }

    // Get invitation
    const invitations = await base44.asServiceRole.entities.UserInvitation.filter({ id: invitation_id });
    
    if (!invitations || invitations.length === 0) {
      return Response.json({ error: 'Invitation not found' }, { status: 404 });
    }

    const invitation = invitations[0];

    // Extend expiration by 7 days from now
    const now = new Date();
    const newExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Update invitation
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

    console.log('✓ Invitation resent successfully');
    return Response.json({ 
      success: true, 
      message: 'Invitation resent successfully',
      new_expires_at: newExpiresAt.toISOString()
    });

  } catch (error) {
    console.error('Error resending invitation:', error);
    return Response.json({ 
      error: 'Failed to resend invitation', 
      details: error.message 
    }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    const user = await base44.auth.me();
    if (!user || user.role !== 'admin') {
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const payload = await req.json();
    const { email, full_name, role, care_scope, phone, credentials } = payload;

    if (!email || !full_name) {
      return Response.json({ error: 'Email and full name are required' }, { status: 400 });
    }

    const userRole = role || 'user';

    // Use the platform's built-in invite (handles email delivery natively)
    await base44.users.inviteUser(email, userRole);
    console.log('✓ Platform invite sent to:', email);

    // Store invitation record for onUserSignup auto-approval with extra metadata
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    await base44.asServiceRole.entities.UserInvitation.create({
      email,
      full_name,
      role: userRole,
      care_scope: care_scope || 'home_health',
      phone: phone || null,
      credentials: credentials || null,
      invited_by: user.email,
      status: 'pending',
      expires_at: expiresAt.toISOString(),
      last_sent_at: now.toISOString(),
      resend_count: 0
    });
    console.log('✓ Invitation record created');

    // Log activity
    try {
      await base44.asServiceRole.entities.UserActivity.create({
        user_email: user.email,
        user_name: user.full_name,
        action: 'user_invited',
        details: { invited_email: email, invited_name: full_name, role: userRole },
        page: 'UserManagement',
        entity_type: 'UserInvitation'
      });
    } catch (logError) {
      console.error('Failed to log activity:', logError.message);
    }

    return Response.json({ 
      success: true, 
      message: 'Invitation sent successfully',
      user_email: email
    });

  } catch (error) {
    console.error('Error in createUserWithTempPassword:', error.message);
    return Response.json({ 
      error: 'Failed to send invitation', 
      details: error.message 
    }, { status: 500 });
  }
});
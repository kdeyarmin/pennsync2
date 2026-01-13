import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    console.log('=== createUserWithTempPassword started ===');
    const base44 = createClientFromRequest(req);
    
    // Verify admin user
    console.log('Step 1: Verifying admin user...');
    let user;
    try {
      user = await base44.auth.me();
      console.log('Current user:', user?.email, 'Role:', user?.role);
    } catch (authError) {
      console.error('Auth error:', authError.message);
      return Response.json({ error: 'Authentication failed', details: authError.message }, { status: 401 });
    }
    
    if (!user || user.role !== 'admin') {
      console.error('Unauthorized: User is not admin');
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    console.log('Step 2: Parsing request payload...');
    let payload;
    try {
      payload = await req.json();
      console.log('Request payload:', { email: payload.email, full_name: payload.full_name, role: payload.role });
    } catch (parseError) {
      console.error('JSON parse error:', parseError.message);
      return Response.json({ error: 'Invalid JSON payload', details: parseError.message }, { status: 400 });
    }
    
    const { email, full_name, role, staff_type, temporary_password, care_scope, phone, credentials } = payload;

    if (!email || !full_name || !temporary_password) {
      console.error('Missing required fields');
      return Response.json({ error: 'Email, full name, and temporary password are required' }, { status: 400 });
    }

    console.log('Step 3: Creating invitation record...');
    try {
      const now = new Date();
      const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
      
      const userData = {
        email,
        full_name,
        role: role || 'user',
        temporary_password,
        care_scope: care_scope || 'home_health',
        phone: phone || null,
        credentials: credentials || null,
        staff_type: staff_type || null,
        invited_by: user.email,
        status: 'pending',
        expires_at: expiresAt.toISOString(),
        last_sent_at: now.toISOString(),
        resend_count: 0
      };

      const invitation = await base44.asServiceRole.entities.UserInvitation.create(userData);
      console.log('✓ Invitation record created:', invitation.id, 'Expires:', expiresAt.toISOString());
      
      console.log('Step 4: Sending invitation email...');
      try {
        const signupUrl = `${Deno.env.get('APP_URL') || 'https://app.base44.app'}`;
        
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: 'Welcome to Penn Sync - Account Created',
          body: `Hello ${full_name},\n\nYour account has been created in Penn Sync.\n\nEmail: ${email}\nRole: ${role || 'user'}${staff_type ? '\nStaff Type: ' + staff_type.toUpperCase() : ''}\nTemporary Password: ${temporary_password}\n\nPlease log in at ${signupUrl} and change your password on first login.\n\n⏰ Your temporary password will expire in 7 days.\n\nWelcome to Penn Sync!`,
          from_name: 'Penn Sync'
        });
        console.log('✓ Invitation email sent');
      } catch (emailError) {
        console.error('Email send failed (non-critical):', emailError.message);
      }
      
      console.log('=== User invitation completed successfully ===');
      return Response.json({ 
        success: true, 
        message: 'Invitation sent successfully',
        user_email: email
      });
      
    } catch (dbError) {
      console.error('Database error:', dbError);
      console.error('Error name:', dbError.name);
      console.error('Error message:', dbError.message);
      console.error('Error stack:', dbError.stack);
      return Response.json({ 
        error: 'Failed to create invitation', 
        details: dbError.message,
        errorName: dbError.name
      }, { status: 500 });
    }

  } catch (error) {
    console.error('=== FATAL ERROR ===');
    console.error('Error:', error);
    console.error('Error name:', error.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    return Response.json({ 
      error: 'Internal server error', 
      details: error.message,
      errorName: error.name,
      stack: error.stack 
    }, { status: 500 });
  }
});
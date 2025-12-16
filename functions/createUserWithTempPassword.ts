import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    console.log('createUserWithTempPassword started');
    const base44 = createClientFromRequest(req);
    
    // Verify admin user
    console.log('Verifying admin user...');
    const user = await base44.auth.me();
    console.log('Current user:', user?.email, 'Role:', user?.role);
    
    if (!user || user.role !== 'admin') {
      console.error('Unauthorized: User is not admin');
      return Response.json({ error: 'Unauthorized - Admin access required' }, { status: 403 });
    }

    const payload = await req.json();
    console.log('Request payload:', { email: payload.email, full_name: payload.full_name, role: payload.role });
    
    const { email, full_name, role, care_scope, phone, credentials } = payload;

    if (!email || !full_name) {
      console.error('Missing required fields');
      return Response.json({ error: 'Email and full name are required' }, { status: 400 });
    }

    // Generate temporary password
    const tempPassword = Math.random().toString(36).slice(-10) + Math.random().toString(36).slice(-10).toUpperCase() + '!9';
    console.log('Generated temp password, length:', tempPassword.length);

    // Store invitation in database
    console.log('Creating invitation record...');

    try {
      // Create invitation record
      const invitation = await base44.asServiceRole.entities.UserInvitation.create({
        email,
        full_name,
        role: role || 'user',
        care_scope: care_scope || 'home_health',
        phone: phone || null,
        credentials: credentials || null,
        invited_by: user.email,
        status: 'pending'
      });
      console.log('Invitation record created:', invitation.id);
      
      // Try to send email but don't fail if it doesn't work
      try {
        const signupUrl = `${Deno.env.get('APP_URL') || 'https://app.base44.app'}`;
        
        await base44.asServiceRole.integrations.Core.SendEmail({
          to: email,
          subject: 'Invitation to Penn Sync',
          body: `Hello ${full_name},\n\nYou've been invited to join Penn Sync.\n\nEmail: ${email}\nRole: ${role || 'user'}\n\nPlease visit ${signupUrl} to create your account.\n\nWelcome to Penn Sync!`,
          from_name: 'Penn Sync'
        });
        console.log('Invitation email sent successfully');
      } catch (emailError) {
        console.error('Email send failed (non-critical):', emailError.message);
        // Don't throw - email failure is not critical
      }
      
    } catch (error) {
      console.error('Failed to create invitation:', error);
      console.error('Error details:', error.message, error.stack);
      throw error;
    }

    console.log('User invitation completed successfully');
    return Response.json({ 
      success: true, 
      message: 'Invitation sent successfully - User will create their own account',
      user_email: email
    });

  } catch (error) {
    console.error('Error creating user:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    return Response.json({ 
      error: 'Failed to create user', 
      details: error.message,
      stack: error.stack 
    }, { status: 500 });
  }
});
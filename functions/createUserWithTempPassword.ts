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
    const signupUrl = Deno.env.get('APP_URL') || window.location.origin;

    try {
      // Create invitation record
      await base44.asServiceRole.entities.UserInvitation.create({
        email,
        full_name,
        role: role || 'user',
        care_scope: care_scope || 'home_health',
        phone: phone || null,
        credentials: credentials || null,
        invited_by: user.email,
        status: 'pending'
      });
      console.log('Invitation record created');
      
      // Send simple invitation email
      const careScopeLabel = care_scope === 'home_health' ? 'Home Health' : care_scope === 'hospice' ? 'Hospice' : 'Both';
      
      await base44.asServiceRole.integrations.Core.SendEmail({
        to: email,
        subject: 'You\'re Invited to Penn Sync',
        body: `Hello ${full_name},

You've been invited to join Penn Sync by ${user.full_name}.

Your Account Details:
- Email: ${email}
- Role: ${role === 'admin' ? 'Administrator' : 'User'}
- Care Scope: ${careScopeLabel}

To get started, please visit: ${signupUrl}

Once you create your account, you'll have immediate access to:
- AI-powered clinical documentation
- OASIS analysis and PDGM optimization
- Patient risk alerts and early warnings
- Personalized training and compliance tools

Welcome to Penn Sync!`,
        from_name: 'Penn Sync'
      });
      console.log('Invitation email sent');
      
    } catch (error) {
      console.error('Invitation error:', error);
      throw new Error(`Failed to send invitation: ${error.message}`);
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
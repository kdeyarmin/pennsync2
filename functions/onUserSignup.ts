import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    console.log('onUserSignup triggered');
    const base44 = createClientFromRequest(req);
    const { user } = await req.json();
    console.log('User data received:', user?.email);

    if (!user || !user.email) {
      console.error('No user data provided');
      return Response.json({ error: 'No user data provided' }, { status: 400 });
    }

    // Get all admin users
    console.log('Fetching admin users...');
    const admins = await base44.asServiceRole.entities.User.filter({ role: 'admin' });
    console.log('Found admins:', admins.length);
    
    // Send email to all admins
    const emailPromises = admins.map(admin => 
      base44.asServiceRole.integrations.Core.SendEmail({
        to: admin.email,
        subject: `🔔 New User Awaiting Approval - Penn Sync`,
        from_name: 'Penn Sync Notifications',
        body: `
Hello ${admin.full_name || 'Admin'},

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
        `.trim()
      })
    );
    
    console.log('Sending emails to admins...');
    await Promise.all(emailPromises);
    console.log('Signup notification complete');

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
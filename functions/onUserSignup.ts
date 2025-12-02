import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user } = await req.json();

    if (!user || !user.email) {
      return Response.json({ error: 'No user data provided' }, { status: 400 });
    }

    // Get all admin users
    const adminUsers = await base44.asServiceRole.entities.User.filter({ role: 'admin' });

    if (adminUsers.length === 0) {
      console.log('No admin users found to notify');
      return Response.json({ success: true, message: 'No admins to notify' });
    }

    // Send email to each admin
    const emailPromises = adminUsers.map(admin => 
      base44.asServiceRole.integrations.Core.SendEmail({
        to: admin.email,
        subject: `New User Signup: ${user.full_name || user.email}`,
        body: `
Hello Admin,

A new user has signed up for Penn Sync:

Name: ${user.full_name || 'Not provided'}
Email: ${user.email}
Signup Date: ${new Date().toLocaleString()}

You can manage users from the Admin Dashboard.

Best regards,
Penn Sync System
        `.trim()
      })
    );

    await Promise.all(emailPromises);

    return Response.json({ 
      success: true, 
      message: `Notified ${adminUsers.length} admin(s)` 
    });

  } catch (error) {
    console.error('Error sending signup notification:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
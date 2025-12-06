import { createClientFromRequest } from 'npm:@base44/sdk@0.8.4';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { user } = await req.json();

    if (!user || !user.email) {
      return Response.json({ error: 'No user data provided' }, { status: 400 });
    }

    // Send email to specific address
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: 'kdeyarmin@pennhospice.com',
      subject: `New User Signup: ${user.full_name || user.email}`,
      body: `
Hello,

A new user has signed up for Penn Sync:

Name: ${user.full_name || 'Not provided'}
Email: ${user.email}
Signup Date: ${new Date().toLocaleString()}
Role: ${user.role || 'user'}

Best regards,
Penn Sync System
      `.trim()
    });

    return Response.json({ 
      success: true, 
      message: 'Notification sent to kdeyarmin@pennhospice.com' 
    });

  } catch (error) {
    console.error('Error sending signup notification:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
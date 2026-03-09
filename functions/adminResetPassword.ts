import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { userEmail } = await req.json();

    if (!userEmail) {
      return Response.json({ error: 'userEmail is required' }, { status: 400 });
    }

    // Generate temp password
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789';
    let tempPassword = '';
    for (let i = 0; i < 10; i++) tempPassword += chars[Math.floor(Math.random() * chars.length)];

    // Update user password via users API
    const users = await base44.asServiceRole.entities.User.filter({ email: userEmail });
    if (!users || users.length === 0) {
      return Response.json({ error: 'User not found' }, { status: 404 });
    }

    // Use base44 users API to reset
    await base44.asServiceRole.users.resetPassword(userEmail, tempPassword);

    const appUrl = `https://hub.base44.app/apps/68ee80d98929370f9e8f2932`;

    // Send email
    await base44.asServiceRole.integrations.Core.SendEmail({
      to: userEmail,
      from_name: 'Penn Sync',
      subject: 'Your Penn Sync Login Credentials',
      body: `Hello,

Your password has been reset by an administrator. Here are your login details:

🔗 Login URL: ${appUrl}
👤 Username / Email: ${userEmail}
🔑 Temporary Password: ${tempPassword}

Please log in and update your password at your earliest convenience.

If you have any questions, please contact your administrator.

Best regards,
Penn Sync Team`
    });

    return Response.json({
      success: true,
      message: `Password reset and email sent to ${userEmail}`,
      tempPassword
    });

  } catch (error) {
    console.error('adminResetPassword error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
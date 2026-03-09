import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { userEmail } = await req.json();

    if (!userEmail) {
      return Response.json({ error: 'userEmail is required' }, { status: 400 });
    }

    // Generate temp password
    const tempPassword = Math.random().toString(36).slice(-6) + Math.random().toString(36).slice(-4).toUpperCase() + Math.floor(Math.random() * 90 + 10);

    // Reset the password
    await base44.asServiceRole.auth.updateUserPassword(userEmail, tempPassword);

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
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

    // In Base44, users must sign up themselves via the auth system
    // Admins can only update existing users or send invitations
    // So we'll send an invitation email with signup instructions
    console.log('Sending invitation email to new user...');

    // Generate user manual HTML (compact version for email)
    const userManualHTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Penn Sync User Manual</title>
  <style>
    body { font-family: Arial, sans-serif; padding: 20px; color: #333; line-height: 1.6; }
    h1 { color: #4F46E5; border-bottom: 3px solid #4F46E5; padding-bottom: 10px; }
    h2 { color: #6366F1; margin-top: 20px; border-left: 4px solid #6366F1; padding-left: 10px; }
    .step { background: #F9FAFB; border-left: 4px solid #3B82F6; padding: 10px; margin: 8px 0; border-radius: 4px; }
    .tip { background: #FEF3C7; border-left: 4px solid #F59E0B; padding: 10px; margin: 8px 0; border-radius: 4px; }
  </style>
</head>
<body>
  <h1>Welcome to Penn Sync</h1>
  <p>This manual will help you get started with Penn Sync's AI-powered documentation system.</p>
  
  <h2>Getting Started</h2>
  <div class="step">1. Log in with your credentials</div>
  <div class="step">2. Complete your profile with professional credentials</div>
  <div class="step">3. Navigate to Smart Note Assistant to start documenting</div>
  
  <h2>Smart Note Assistant</h2>
  <p>Your main tool for visit documentation:</p>
  <div class="step">1. Select patient and visit type</div>
  <div class="step">2. Enter vital signs or use voice entry</div>
  <div class="step">3. Type or dictate your observations</div>
  <div class="step">4. Click "Enhance with AI" to get Medicare-compliant narrative</div>
  <div class="step">5. Review and copy to your EHR</div>
  
  <div class="tip">💡 Voice dictation saves 15-20 minutes per visit!</div>
  
  <h2>OASIS Analyzer</h2>
  <p>Upload OASIS PDFs for automatic analysis:</p>
  <div class="step">1. Upload completed OASIS PDF</div>
  <div class="step">2. AI extracts data and matches patient</div>
  <div class="step">3. Review PDGM analysis and revenue optimization</div>
  
  <h2>Support</h2>
  <p>For questions or technical issues, contact your administrator.</p>
  <p style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
    © Penn Sync - AI-Powered Home Health Documentation
  </p>
</body>
</html>`;

    // Send invitation email with signup link
    console.log('Preparing invitation email...');
    const careScopeLabel = care_scope === 'home_health' 
      ? 'Home Health' 
      : care_scope === 'hospice' 
      ? 'Hospice' 
      : 'Home Health & Hospice';
    
    const signupUrl = Deno.env.get('APP_URL') || 'https://your-app-url.base44.app';

    try {
      const emailResult = await base44.asServiceRole.integrations.Core.SendEmail({
      to: email,
      subject: 'You\'re Invited to Penn Sync - Create Your Account',
      body: `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background: #f9fafb; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #2563eb 0%, #4f46e5 100%); color: white; padding: 30px; text-align: center; border-radius: 8px; }
    .logo { width: 80px; height: 80px; margin: 0 auto 15px; }
    .content { background: #ffffff; padding: 30px; border: 1px solid #e5e7eb; border-radius: 8px; margin-top: 20px; }
    .credentials { background: #f3f4f6; padding: 20px; border-radius: 6px; margin: 20px 0; border-left: 4px solid #4f46e5; }
    .password-box { background: #fef3c7; padding: 15px; border-radius: 6px; font-family: 'Courier New', monospace; font-size: 18px; font-weight: bold; text-align: center; margin: 15px 0; border: 2px dashed #f59e0b; }
    .warning { background: #fee2e2; padding: 15px; border-radius: 6px; border-left: 4px solid #dc2626; margin: 20px 0; }
    .button { display: inline-block; background: #4f46e5; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; font-weight: bold; margin: 10px 0; }
    .footer { text-align: center; color: #6b7280; padding-top: 20px; margin-top: 30px; border-top: 1px solid #e5e7eb; font-size: 12px; }
    .info-row { margin: 10px 0; }
    .label { font-weight: bold; color: #4b5563; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee80d98929370f9e8f2932/52cac091f_20170AA9-BB95-4BA4-B4E7-793615312CC4.png" alt="Penn Sync Logo" class="logo" />
      <h1 style="margin: 0; font-size: 28px;">You're Invited to Penn Sync!</h1>
      <p style="margin: 10px 0 0 0; opacity: 0.9;">AI-Powered Home Health Documentation</p>
    </div>
    
    <div class="content">
      <p>Hello <strong>${full_name}</strong>,</p>
      
      <p>Your administrator has invited you to join Penn Sync! You now have access to AI-powered clinical documentation, OASIS analytics, and advanced decision support tools.</p>
      
      <div class="credentials">
        <h3 style="margin-top: 0;">Your Account Details</h3>
        <div class="info-row">
          <span class="label">Email:</span> ${email}
        </div>
        <div class="info-row">
          <span class="label">Role:</span> ${role === 'admin' ? 'Administrator' : 'User'}
        </div>
        <div class="info-row">
          <span class="label">Care Scope:</span> ${careScopeLabel}
        </div>
      </div>
      
      <div class="warning">
        <strong>⚠️ IMPORTANT - Getting Started:</strong>
        <ul style="margin: 10px 0;">
          <li>Click the button below to create your account</li>
          <li>Choose a strong password with at least 8 characters</li>
          <li>Complete your profile with professional credentials and license number</li>
          <li>Your account will be pre-approved and ready to use immediately</li>
        </ul>
      </div>
      
      <div style="text-align: center; margin: 30px 0;">
        <a href="${signupUrl}" class="button">
          Create Your Account
        </a>
      </div>
      
      <h3>What You Can Do:</h3>
      <ul>
        <li>✨ <strong>Smart Note Assistant:</strong> Voice-to-text documentation with AI enhancement</li>
        <li>📊 <strong>OASIS Analyzer:</strong> Automated PDGM analysis and revenue optimization</li>
        <li>🎯 <strong>Patient Alerts:</strong> Proactive risk detection and early warning</li>
        <li>📚 <strong>Training Hub:</strong> Personalized learning paths and skill development</li>
        <li>🛡️ <strong>Compliance:</strong> Real-time Medicare compliance checking</li>
      </ul>
      
      <h3>Getting Help:</h3>
      <p>Attached to this email is a comprehensive user manual. You can also access help documentation within the app.</p>
      
      <p>If you have any questions, please contact your administrator.</p>
      
      <p style="margin-top: 30px;">Welcome aboard!<br>
      <strong>The Penn Sync Team</strong></p>
    </div>
    
    <div class="footer">
      <p>This is an automated email from Penn Sync. Please do not reply to this message.</p>
      <p>© Penn Sync - Secure, HIPAA-Compliant Clinical Documentation</p>
    </div>
  </div>
</body>
</html>`,
      from_name: 'Penn Sync Admin'
      });
      console.log('Invitation email sent successfully:', emailResult);
      
      // Pre-approve the user by storing their info
      // When they sign up, the onUserSignup webhook can auto-approve them
      await base44.asServiceRole.entities.SystemLog.create({
        job_name: 'User Invitation',
        job_type: 'other',
        status: 'success',
        message: `Invitation sent to ${email}`,
        details: {
          email,
          full_name,
          role: role || 'user',
          care_scope: care_scope || 'home_health',
          invited_by: user.email,
          auto_approve: true
        }
      });
      
    } catch (emailError) {
      console.error('Failed to send invitation email:', emailError);
      console.error('Email error details:', emailError.message);
      console.error('Email error stack:', emailError.stack);
      
      // Still log the invitation attempt even if email fails
      try {
        await base44.asServiceRole.entities.SystemLog.create({
          job_name: 'User Invitation',
          job_type: 'other',
          status: 'error',
          message: `Failed to send invitation to ${email}: ${emailError.message}`,
          details: {
            email,
            full_name,
            role: role || 'user',
            care_scope: care_scope || 'home_health',
            invited_by: user.email,
            error: emailError.message
          }
        });
      } catch (logError) {
        console.error('Failed to log error:', logError);
      }
      
      throw new Error(`Failed to send invitation: ${emailError.message}`);
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
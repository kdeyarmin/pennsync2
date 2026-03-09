import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const currentUser = await base44.auth.me();

    if (!currentUser || currentUser.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { action, email, otp } = await req.json();

    if (!email) {
      return Response.json({ error: 'Email is required' }, { status: 400 });
    }

    if (action === 'inspect') {
      return Response.json({
        config: base44.getConfig ? base44.getConfig() : null,
        verifyOtpSource: String(base44.auth.verifyOtp),
        resendOtpSource: String(base44.auth.resendOtp)
      });
    }

    if (action === 'resend') {
      const result = await base44.auth.resendOtp(email);
      return Response.json({ success: true, action, result });
    }

    if (action === 'verify') {
      try {
        const result = await base44.auth.verifyOtp(email, otp);
        return Response.json({ success: true, action, result });
      } catch (error) {
        return Response.json({
          error: String(error?.message || error),
          status: error?.status || 500,
          data: error?.data || null,
          original: error?.originalError?.response?.data || null
        }, { status: 500 });
      }
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('manageUserVerification error:', error);
    return Response.json({ error: String(error?.message || error), details: JSON.stringify(error, Object.getOwnPropertyNames(error || {})) }, { status: 500 });
  }
});
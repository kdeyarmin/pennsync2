import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { userId, updates } = await req.json();

    // Try entity update first
    const result = await base44.asServiceRole.entities.User.update(userId, updates);

    // Also try force-verifying via users API
    let verifyResult = null;
    try {
      verifyResult = await base44.asServiceRole.users.verifyUser(userId);
    } catch(e) {
      verifyResult = e.message;
    }

    return Response.json({ success: true, result, verifyResult });
  } catch (error) {
    console.error('fixUserAccount error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
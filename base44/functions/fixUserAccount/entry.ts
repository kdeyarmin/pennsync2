import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Privileged operation: only an admin / super-admin may mutate User records.
    // Previously this was unauthenticated, so any caller could self-escalate via
    // { userId: <self>, updates: { role: 'admin', account_type: 'super_admin' } }.
    const currentUser = await base44.auth.me();
    if (!currentUser || (currentUser.role !== 'admin' && currentUser.account_type !== 'super_admin')) {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    const { userId, updates } = await req.json();
    if (!userId || !updates || typeof updates !== 'object') {
      return Response.json({ error: 'userId and updates are required' }, { status: 400 });
    }

    const result = await base44.asServiceRole.entities.User.update(userId, updates);

    return Response.json({ success: true, result });
  } catch (error) {
    console.error('fixUserAccount error:', error);
    // Generic message — don't leak internals to the client.
    return Response.json({ error: 'Failed to update user account' }, { status: 500 });
  }
});
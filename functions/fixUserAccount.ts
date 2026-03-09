import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { userId, updates } = await req.json();

    const result = await base44.asServiceRole.entities.User.update(userId, updates);

    return Response.json({ success: true, result });
  } catch (error) {
    console.error('fixUserAccount error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});
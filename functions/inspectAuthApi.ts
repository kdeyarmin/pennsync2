import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    return Response.json({
      asServiceRoleKeys: Object.keys(base44.asServiceRole || {}),
      authKeys: Object.keys(base44.asServiceRole?.auth || {}),
      usersKeys: Object.keys(base44.asServiceRole?.users || {}),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.20';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    return Response.json({
      rootKeys: Object.keys(base44 || {}),
      authKeys: Object.keys(base44.auth || {}),
      usersKeys: Object.keys(base44.users || {}),
      asServiceRoleKeys: Object.keys(base44.asServiceRole || {}),
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});
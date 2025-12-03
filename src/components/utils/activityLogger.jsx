import { base44 } from "@/api/base44Client";

export const logActivity = async (action, details = {}) => {
  try {
    const user = await base44.auth.me();
    if (!user) return;

    await base44.entities.UserActivity.create({
      user_email: user.email,
      user_name: user.full_name,
      action,
      details,
      page: details.page || window.location.pathname,
      entity_type: details.entity_type || null,
      entity_id: details.entity_id || null,
      user_agent: navigator.userAgent
    });
  } catch (error) {
    console.error("Failed to log activity:", error);
  }
};

export const ActivityActions = {
  VIEW: 'view',
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LOGIN: 'login',
  PAGE_VISIT: 'page_visit',
  EXPORT: 'export',
  GENERATE: 'generate'
};
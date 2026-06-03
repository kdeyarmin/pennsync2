/**
 * superAdmin — single source of truth for who the platform super administrator
 * is and the helpers used to gate the super-admin-only surfaces (the 8x8 /
 * integration configuration page).
 *
 * The super admin is identified two ways, and EITHER is sufficient:
 *   1. The designated super-admin email below (the platform owner). This makes
 *      the account self-bootstrapping — the very first time the owner signs in,
 *      the Super Admin page promotes their account (see ensureSuperAdmin).
 *   2. account_type === 'super_admin' on the User record (what the rest of the
 *      app — Learning Center, skill dashboards — already keys off of).
 *
 * Keeping the email here (not scattered as string literals) means there is one
 * place to change the owner, and the frontend + backend agree on it.
 */

/** The platform owner. This account is always treated as the super admin. */
export const SUPER_ADMIN_EMAIL = "kdeyarmin@comcast.net";

/** Case/whitespace-insensitive email match against the designated super admin. */
export function isSuperAdminEmail(email) {
  return String(email || "").trim().toLowerCase() === SUPER_ADMIN_EMAIL;
}

/**
 * True when `user` is the platform super admin — either by designated email or
 * by an explicit super_admin account_type.
 */
export function isSuperAdmin(user) {
  if (!user) return false;
  return isSuperAdminEmail(user.email) || user.account_type === "super_admin";
}

/**
 * True for any administrator surface (the agency `admin` role, an agency_admin
 * or super_admin account_type, or the designated super admin). Mirrors the
 * ad-hoc checks already used across the app, in one reusable place.
 */
export function isAdminLike(user) {
  if (!user) return false;
  return (
    user.role === "admin" ||
    user.account_type === "agency_admin" ||
    user.account_type === "super_admin" ||
    isSuperAdminEmail(user.email)
  );
}

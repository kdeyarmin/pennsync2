/**
 * superAdmin — single source of truth for who the platform super administrator
 * is and the helpers used to gate the super-admin-only surfaces (the Telnyx
 * integration configuration page).
 *
 * The super admin is identified two ways, and EITHER is sufficient:
 *   1. The designated super-admin email below (the platform owner). This makes
 *      the account self-bootstrapping — the very first time the owner signs in,
 *      the Super Admin page promotes their account (see ensureSuperAdmin).
 *   2. account_type === 'super_admin' on the User record (what the rest of the
 *      app — Learning Center, skill dashboards — already keys off of).
 *
 * This is the single source of truth for the owner email on the FRONTEND. The
 * Base44 backend functions (ensureSuperAdmin, saveTelnyxSecret, etc.) run
 * as standalone Deno modules that can't import this file, so each mirrors the
 * same literal; keep them in sync when changing the owner.
 */

/**
 * The platform owner. This account is always treated as the super admin.
 *
 * Configurable per deployment via the build-time env var
 * `VITE_SUPER_ADMIN_EMAIL`; when unset it falls back to the original owner so
 * existing deployments are unaffected. Normalized (trimmed + lower-cased) so the
 * case-insensitive comparisons below hold for any configured value.
 */
export const SUPER_ADMIN_EMAIL = (
  import.meta.env?.VITE_SUPER_ADMIN_EMAIL || "kdeyarmin@comcast.net"
)
  .trim()
  .toLowerCase();

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

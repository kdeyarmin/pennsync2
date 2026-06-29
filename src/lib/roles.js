/**
 * roles.js — single source of truth for the app's three-tier role model.
 *
 * The platform distinguishes three user views:
 *
 *   1. super_admin   — the platform owner / super_admin account_type. Sees
 *                      EVERYTHING, including platform-level / system configuration
 *                      (Telnyx secrets, background jobs, AI tools, comms, agency
 *                      settings, PDGM rates).
 *   2. facility_admin — an agency administrator (role === 'admin' or
 *                      account_type === 'agency_admin'). Sees everything relative
 *                      to THEIR facility — clinical work plus analytics, reporting,
 *                      compliance, user management — but NOT the platform-level
 *                      system configuration reserved for the super admin.
 *   3. nurse         — every other clinical user. Sees only clinical information
 *                      (patients, care plans, OASIS, notes, communication,
 *                      learning) — no analytics, reporting, or administration.
 *
 * This builds on lib/superAdmin.js (which owns the owner-email + super_admin
 * detection) and centralizes the facility-admin vs nurse split so the sidebar,
 * command palette, routes, and route guards all agree.
 *
 * ─── Staff discipline (orthogonal to the admin tiers) ────────────────────────
 * The three tiers above answer "how much administration can you see". A SECOND,
 * independent axis — `staff_role` — answers "which clinical surfaces apply to
 * your discipline", so the app can serve non-nurses (office staff, social
 * workers, spiritual care) alongside nurses:
 *
 *   nurse          — clinical staff. Sees nursing tools (OASIS, clinical notes,
 *                    care plans) AND patient records. The default for every
 *                    existing user, so the change is backward-compatible.
 *   social_worker  — care-team member. Can VIEW patients/records but NOT the
 *   spiritual_care   nursing tools.
 *   office_staff   — back-office. No clinical/patient surfaces at all — only the
 *                    shared functions (learning, PTO, messaging, resources…).
 *
 * Admins (any tier) always see everything, so staff_role only narrows the view
 * of NON-admin users. Pages declare the discipline they require via an `access`
 * level in nav.manifest.js (see ACCESS below); the nav builders and route guard
 * call canAccessLevel() so the sidebar, palette and routes stay in agreement.
 */

import { isSuperAdmin, isSuperAdminEmail } from "@/lib/superAdmin";

/** Resolve a user to one of: 'super_admin' | 'facility_admin' | 'nurse'. */
export function getRoleView(user) {
  if (!user) return "nurse";
  if (isSuperAdmin(user)) return "super_admin";
  if (user.role === "admin" || user.account_type === "agency_admin") {
    return "facility_admin";
  }
  return "nurse";
}

/** True for the platform super admin only. */
export function isSuperAdminView(user) {
  return getRoleView(user) === "super_admin";
}

/**
 * True for any administrator surface (facility admin OR super admin). This is the
 * "isAdmin" gate the app already used — both admin tiers see the admin sections;
 * super-admin-only pages are gated separately via `isSuperAdminView`.
 */
export function isAdminView(user) {
  const view = getRoleView(user);
  return view === "super_admin" || view === "facility_admin";
}

/** True for the clinical-only nurse view. */
export function isNurseView(user) {
  return getRoleView(user) === "nurse";
}

// ─── Staff discipline (staff_role) ─────────────────────────────────────────────

/** Canonical staff_role values. */
export const STAFF_ROLES = ["nurse", "office_staff", "social_worker", "spiritual_care"];

/**
 * Selectable staff-role options (for onboarding + admin registration dropdowns).
 * `clinical` marks the disciplines that work with patients; `nursing` marks the
 * one that uses nursing documentation tools — both drive the gating below but are
 * also handy for UI copy.
 */
export const STAFF_ROLE_OPTIONS = [
  { value: "nurse", label: "Nurse", description: "RN/LPN clinical staff — full patient care, OASIS, clinical notes, and care plans.", clinical: true, nursing: true },
  { value: "office_staff", label: "Office Staff", description: "Back-office / administrative staff — learning, PTO, messaging, and resources.", clinical: false, nursing: false },
  { value: "social_worker", label: "Social Worker", description: "Care-team member — can view patients and records; no nursing documentation tools.", clinical: true, nursing: false },
  { value: "spiritual_care", label: "Spiritual Care", description: "Chaplain / spiritual care — can view patients and records; no nursing documentation tools.", clinical: true, nursing: false },
];

/** Human-readable label for a staff_role value (falls back to the raw value). */
export function staffRoleLabel(value) {
  return STAFF_ROLE_OPTIONS.find((o) => o.value === value)?.label || value || "Nurse";
}

/**
 * Friendly label for a user's effective role, for UI chrome (sidebar footer).
 * Admins show their admin tier; everyone else shows their staff discipline, so a
 * social worker reads as "Social Worker" instead of the raw account role "user".
 */
export function userRoleLabel(user) {
  if (!user) return "User";
  const view = getRoleView(user);
  if (view === "super_admin") return "Super Admin";
  if (view === "facility_admin") return "Admin";
  if (user.role === "manager") return "Manager";
  return staffRoleLabel(getStaffRole(user));
}

/**
 * Resolve a user's staff discipline. Unknown / unset defaults to 'nurse' so
 * every pre-existing account keeps its current (full clinical) view — adding the
 * field never silently removes access from anyone already in the system.
 */
export function getStaffRole(user) {
  const r = user?.staff_role;
  return STAFF_ROLES.includes(r) ? r : "nurse";
}

/**
 * True when the user works with nursing documentation tools (OASIS, clinical
 * notes, care plans). That's nurses and any administrator (admins see all).
 *
 * Fails closed for a not-yet-loaded user (falsy) so a clinical surface never
 * flashes before the user record resolves — distinct from getStaffRole's nurse
 * default, which is only for an EXISTING user that predates the staff_role field.
 */
export function isClinicalUser(user) {
  if (!user) return false;
  return isAdminView(user) || getStaffRole(user) === "nurse";
}

/**
 * True when the user may see patient records (roster, charts, alerts). Everyone
 * EXCEPT office staff — nurses, social workers, spiritual care, and admins. Fails
 * closed for a not-yet-loaded (falsy) user.
 */
export function canViewPatients(user) {
  if (!user) return false;
  if (isAdminView(user)) return true;
  return getStaffRole(user) !== "office_staff";
}

/**
 * Page access levels, declared per entry in nav.manifest.js:
 *   GENERAL — everyone (the default when no `access` is set).
 *   PATIENT — requires patient access (nurse, social_worker, spiritual_care, admin).
 *   NURSING — nursing tools (nurse or admin only).
 */
export const ACCESS = { GENERAL: "general", PATIENT: "patient", NURSING: "nursing" };

/**
 * Whether `user` may see a surface declared at the given access level. Admins
 * always pass; otherwise the staff discipline decides. This is the single gate
 * the sidebar, command palette and route guard share, so it FAILS CLOSED: a
 * not-yet-loaded (falsy) user gets only general surfaces, and an unrecognized
 * `level` is denied rather than waved through.
 */
export function canAccessLevel(user, level) {
  if (!level || level === ACCESS.GENERAL) return true;
  if (!user) return false;
  if (isAdminView(user)) return true;
  if (level === ACCESS.NURSING) return getStaffRole(user) === "nurse";
  if (level === ACCESS.PATIENT) return getStaffRole(user) !== "office_staff";
  return false;
}

export { isSuperAdmin, isSuperAdminEmail };
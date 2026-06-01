/**
 * phoneUtils — shared phone-number helpers for the 8x8 phone integration.
 *
 * These mirror the inline helpers in the Deno backend functions (which must
 * stay single-file for the Base44 deploy model). Keeping the algorithm here —
 * and unit-tested — is the source of truth; the backend copies follow it.
 */

/** Normalize a free-form phone string to E.164 (US-centric), or null if invalid. */
export function normalizeE164(raw) {
  if (!raw) return null;
  const digits = String(raw).replace(/[^\d]/g, "");
  if (digits.length === 10) return `+1${digits}`;
  if (digits.length === 11 && digits.startsWith("1")) return `+${digits}`;
  if (String(raw).trim().startsWith("+") && digits.length >= 8) return `+${digits}`;
  return null;
}

/** Last 10 digits of any phone string (for loose matching against free-form data). */
export function last10(raw) {
  return (raw || "").replace(/[^\d]/g, "").slice(-10);
}

/**
 * Candidate stored formats for a number, used to match an inbound E.164 number
 * against the free-form `Patient.phone` field.
 */
export function phoneVariants(value) {
  const d = (value || "").replace(/[^\d]/g, "");
  const ten = d.slice(-10);
  if (ten.length !== 10) return value ? [value] : [];
  const a = ten.slice(0, 3);
  const b = ten.slice(3, 6);
  const c = ten.slice(6);
  return [value, `+1${ten}`, `1${ten}`, ten, `(${a}) ${b}-${c}`, `${a}-${b}-${c}`, `${a}.${b}.${c}`];
}

/**
 * Deterministic conversation key for a pair of numbers, independent of order/
 * direction, so a nurse↔patient thread groups consistently.
 */
export function getThreadId(a, b) {
  const na = normalizeE164(a) || a;
  const nb = normalizeE164(b) || b;
  return [na, nb].sort().join("|");
}

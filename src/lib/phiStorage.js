import { clearCachedPatients } from './indexedDB';

/**
 * Local PHI hygiene for shared/kiosk devices.
 *
 * The app caches re-fetchable PHI in localStorage and IndexedDB (patient roster,
 * recently-viewed patients, OASIS extracts, cached chart data). On logout and on
 * idle session timeout this must be purged so the next user on the same device
 * cannot read the previous user's patient data.
 *
 * IMPORTANT — we intentionally do NOT clear unsynced offline work:
 *   - localStorage: `offline_pending`, `offline_visit_drafts`, `offline_conflicts`,
 *     `visit_draft_*`
 *   - IndexedDB: DRAFT_NOTES and SYNC_QUEUE stores
 * Wiping those when a 15-minute idle timeout fires mid-visit (frequently while
 * offline in the field) would be silent loss of documented care. They survive
 * until they sync. The proper long-term fix for that residual exposure is
 * encryption-at-rest with a session-derived key, tracked separately.
 */

// Re-fetchable PHI caches in localStorage (exact key or prefix match).
const PHI_CACHE_KEY_PREFIXES = [
  'offline_patients',          // full cached patient roster (largest exposure)
  'offline_patient_data',      // cached per-patient detail
  'offline_cache_timestamp',
  'recentPatients_',           // recently-viewed patient names/ids
  'favoritedPatients_',        // favorited patient names/ids
  'oasis_data_',               // extracted OASIS assessment data
  'penn_sync_offline_cache_',  // generic offline cache (STORAGE_PREFIX + "cache_")
];

/**
 * Purge re-fetchable cached PHI from local storage. Best-effort and never throws.
 */
export function clearCachedPHI() {
  try {
    if (typeof localStorage !== 'undefined') {
      const toRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && PHI_CACHE_KEY_PREFIXES.some((p) => key === p || key.startsWith(p))) {
          toRemove.push(key);
        }
      }
      toRemove.forEach((key) => localStorage.removeItem(key));
    }
  } catch {
    /* storage unavailable — nothing to purge */
  }

  // Clear the IndexedDB patient cache (re-fetchable); preserves drafts/sync queue.
  try {
    clearCachedPatients().catch(() => {});
  } catch {
    /* indexedDB unavailable */
  }
}

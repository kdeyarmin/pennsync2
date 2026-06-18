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
 *     `offline_sync_queue` (OfflineSyncService), and the *unsynced* entries of
 *     `penn_sync_offline_pending_visits` / `penn_sync_offline_pending_updates`,
 *     `visit_draft_*`
 *   - IndexedDB: DRAFT_NOTES and SYNC_QUEUE stores
 * Wiping those when a 15-minute idle timeout fires mid-visit (frequently while
 * offline in the field) would be silent loss of documented care. They survive
 * until they sync. The proper long-term fix for that residual exposure is
 * encryption-at-rest with a session-derived key, tracked separately.
 *
 * BUT the *synced* copies of that offline work ARE re-fetchable PHI and must be
 * purged: `OfflineStorage` (src/components/mobile/OfflineStorage.jsx) retains
 * successfully-synced visits/updates for 24h after upload and logs full failed
 * items (PHI + stack traces) to `penn_sync_offline_sync_errors`. Those would
 * otherwise survive logout/idle-timeout on a shared device — the exact exposure
 * this module exists to close.
 */

// Re-fetchable PHI caches in localStorage (exact key or prefix match) that are
// always safe to purge in full.
const PHI_CACHE_KEY_PREFIXES = [
  'offline_patients',          // full cached patient roster (largest exposure)
  'offline_patient_data',      // cached per-patient detail
  'offline_cache_timestamp',
  'recentPatients_',           // recently-viewed patient names/ids
  'favoritedPatients_',        // favorited patient names/ids
  'oasis_data_',               // extracted OASIS assessment data
  'penn_sync_offline_cache_',  // generic offline cache (STORAGE_PREFIX + "cache_")
  'penn_sync_offline_sync_errors',  // failed-sync log: full item PHI + stack traces
  'penn_sync_offline_sync_status',  // sync bookkeeping (timestamps/counts)
];

// Offline-work queues that mix unsynced field work (must be preserved) with
// already-synced copies (re-fetchable PHI, must be purged). We rewrite these to
// keep only the entries still pending sync rather than removing the whole key.
const OFFLINE_PENDING_KEYS = [
  'penn_sync_offline_pending_visits',
  'penn_sync_offline_pending_updates',
];

/**
 * Drop the already-synced entries from an offline-work queue while preserving
 * anything still pending sync. Best-effort: a malformed value is left untouched
 * (it isn't re-fetchable PHI we can safely interpret), never throwing.
 */
function purgeSyncedOfflineEntries() {
  if (typeof localStorage === 'undefined') return;
  for (const key of OFFLINE_PENDING_KEYS) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const items = JSON.parse(raw);
      if (!Array.isArray(items)) continue;
      const pending = items.filter((item) => !item?.synced);
      if (pending.length === 0) {
        localStorage.removeItem(key);
      } else if (pending.length !== items.length) {
        localStorage.setItem(key, JSON.stringify(pending));
      }
    } catch {
      /* malformed entry — leave as-is */
    }
  }
}

/**
 * Purge re-fetchable cached PHI from local storage. Best-effort and never
 * throws. Returns a promise that resolves once the IndexedDB patient cache has
 * actually been cleared — await it before redirecting on logout/timeout so the
 * clear isn't abandoned mid-flight by the navigation, leaving the roster behind.
 */
export async function clearCachedPHI() {
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
      // Drop the synced (already-on-server) copies from the offline-work queues
      // while preserving anything still pending sync.
      purgeSyncedOfflineEntries();
    }
  } catch {
    /* storage unavailable — nothing to purge */
  }

  // Clear the IndexedDB patient cache (re-fetchable); preserves drafts/sync queue.
  try {
    await clearCachedPatients();
  } catch {
    /* indexedDB unavailable or clear failed — localStorage purge already done */
  }
}

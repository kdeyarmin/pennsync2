/**
 * Offline Storage Utility for Penn Sync
 * Handles local storage of visit data when offline
 */

const STORAGE_PREFIX = 'penn_sync_offline_';
const PENDING_VISITS_KEY = `${STORAGE_PREFIX}pending_visits`;
const PENDING_UPDATES_KEY = `${STORAGE_PREFIX}pending_updates`;

class OfflineStorage {
  constructor() {
    this.isOnline = navigator.onLine;
    this.setupListeners();
  }

  setupListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      this.syncPendingData();
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // Save visit data locally
  saveVisit(visitData) {
    try {
      const pending = this.getPendingVisits();
      const visitId = `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      pending.push({
        id: visitId,
        data: visitData,
        timestamp: new Date().toISOString(),
        synced: false
      });

      localStorage.setItem(PENDING_VISITS_KEY, JSON.stringify(pending));
      return visitId;
    } catch (error) {
      console.error('Error saving offline visit:', error);
      throw error;
    }
  }

  // Save update to existing visit
  saveUpdate(visitId, updateData) {
    try {
      const pending = this.getPendingUpdates();
      
      pending.push({
        visitId,
        data: updateData,
        timestamp: new Date().toISOString(),
        synced: false
      });

      localStorage.setItem(PENDING_UPDATES_KEY, JSON.stringify(pending));
      return true;
    } catch (error) {
      console.error('Error saving offline update:', error);
      throw error;
    }
  }

  // Get all pending visits
  getPendingVisits() {
    try {
      const data = localStorage.getItem(PENDING_VISITS_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  // Get all pending updates
  getPendingUpdates() {
    try {
      const data = localStorage.getItem(PENDING_UPDATES_KEY);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  // Get count of pending items
  getPendingCount() {
    return this.getPendingVisits().filter(v => !v.synced).length +
           this.getPendingUpdates().filter(u => !u.synced).length;
  }

  // Get sync status summary
  getSyncStatus() {
    const visits = this.getPendingVisits();
    const updates = this.getPendingUpdates();
    const all = [...visits, ...updates];
    
    return {
      total: all.length,
      pending: all.filter(i => !i.synced).length,
      syncing: 0,
      failed: 0,
      synced: all.filter(i => i.synced).length
    };
  }

  // Store data for offline access
  cacheData(key, data) {
    try {
      const timestamp = new Date().toISOString();
      localStorage.setItem(`${STORAGE_PREFIX}cache_${key}`, JSON.stringify({ data, timestamp }));
    } catch (error) {
      console.error('Cache storage error:', error);
    }
  }

  // Retrieve cached data
  getCachedData(key) {
    try {
      const cached = localStorage.getItem(`${STORAGE_PREFIX}cache_${key}`);
      if (!cached) return null;
      const { data, timestamp } = JSON.parse(cached);
      return { data, timestamp };
    } catch (error) {
      console.error('Cache retrieval error:', error);
      return null;
    }
  }

  // Store pending changes to sync later
  addPendingChange(type, data, entityId = null) {
    try {
      const pending = JSON.parse(localStorage.getItem('offline_pending') || '[]');
      const change = {
        id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
        type,
        entityType: data.entityType || type,
        data,
        entityId,
        timestamp: new Date().toISOString(),
        status: 'pending',
        retryCount: 0
      };
      pending.push(change);
      localStorage.setItem('offline_pending', JSON.stringify(pending));
      
      window.dispatchEvent(new CustomEvent('offline-change-added', { detail: change }));
      
      return change.id;
    } catch (error) {
      console.error('Pending change storage error:', error);
      return null;
    }
  }

  // Get all pending changes
  getPendingChanges() {
    try {
      return JSON.parse(localStorage.getItem('offline_pending') || '[]');
    } catch (error) {
      console.error('Pending changes retrieval error:', error);
      return [];
    }
  }

  // Clear pending changes after sync
  clearPendingChanges() {
    try {
      localStorage.setItem('offline_pending', '[]');
      window.dispatchEvent(new CustomEvent('offline-changes-cleared'));
    } catch (error) {
      console.error('Clear pending error:', error);
    }
  }

  // Sync pending data when back online
  async syncPendingData() {
    if (!this.isOnline) return;

    const { base44 } = await import('@/api/base44Client');
    
    // Sync pending visits
    const pendingVisits = this.getPendingVisits().filter(v => !v.synced);
    for (const visit of pendingVisits) {
      try {
        await base44.entities.Visit.create(visit.data);
        this.markVisitSynced(visit.id);
      } catch (error) {
        console.error('Error syncing visit:', error);
      }
    }

    // Sync pending updates
    const pendingUpdates = this.getPendingUpdates().filter(u => !u.synced);
    for (const update of pendingUpdates) {
      try {
        await base44.entities.Visit.update(update.visitId, update.data);
        this.markUpdateSynced(update.visitId, update.timestamp);
      } catch (error) {
        console.error('Error syncing update:', error);
      }
    }

    // Clean up old synced items
    this.cleanupSyncedItems();
  }

  markVisitSynced(visitId) {
    const pending = this.getPendingVisits();
    const updated = pending.map(v => 
      v.id === visitId ? { ...v, synced: true } : v
    );
    localStorage.setItem(PENDING_VISITS_KEY, JSON.stringify(updated));
  }

  markUpdateSynced(visitId, timestamp) {
    const pending = this.getPendingUpdates();
    const updated = pending.map(u => 
      u.visitId === visitId && u.timestamp === timestamp ? { ...u, synced: true } : u
    );
    localStorage.setItem(PENDING_UPDATES_KEY, JSON.stringify(updated));
  }

  cleanupSyncedItems() {
    // Keep synced items for 24 hours, then remove
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
    
    const visits = this.getPendingVisits().filter(v => 
      !v.synced || v.timestamp > cutoff
    );
    localStorage.setItem(PENDING_VISITS_KEY, JSON.stringify(visits));

    const updates = this.getPendingUpdates().filter(u => 
      !u.synced || u.timestamp > cutoff
    );
    localStorage.setItem(PENDING_UPDATES_KEY, JSON.stringify(updates));
  }

  // Clear all offline data
  clearAll() {
    localStorage.removeItem(PENDING_VISITS_KEY);
    localStorage.removeItem(PENDING_UPDATES_KEY);
  }
}

export const offlineStorage = new OfflineStorage();
export default offlineStorage;
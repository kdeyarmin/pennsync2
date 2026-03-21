/**
 * Offline Storage Utility for Penn Sync
 * Handles local storage of visit data when offline
 */

const STORAGE_PREFIX = 'penn_sync_offline_';
const PENDING_VISITS_KEY = `${STORAGE_PREFIX}pending_visits`;
const PENDING_UPDATES_KEY = `${STORAGE_PREFIX}pending_updates`;
const SYNC_ERRORS_KEY = `${STORAGE_PREFIX}sync_errors`;
const SYNC_STATUS_KEY = `${STORAGE_PREFIX}sync_status`;

class OfflineStorage {
  constructor() {
    this.isOnline = navigator.onLine;
    this.isSyncing = false;
    this.syncInterval = null;
    this.setupListeners();
    this.startBackgroundSync();
  }

  setupListeners() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      setTimeout(() => this.syncPendingData(), 2000);
    });

    window.addEventListener('offline', () => {
      this.isOnline = false;
    });
  }

  // Start background sync every 30 seconds when online
  startBackgroundSync() {
    this.syncInterval = setInterval(() => {
      if (this.isOnline && !this.isSyncing && this.getPendingCount() > 0) {
        this.syncPendingData();
      }
    }, 30000);
  }

  stopBackgroundSync() {
    if (this.syncInterval) {
      clearInterval(this.syncInterval);
      this.syncInterval = null;
    }
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
        synced: false,
        syncAttempts: 0,
        lastSyncAttempt: null,
        conflictResolution: 'server_wins' // default strategy
      });

      localStorage.setItem(PENDING_VISITS_KEY, JSON.stringify(pending));
      this.updateSyncStatus();
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

  // Log sync error
  logSyncError(item, error, type = 'visit') {
    try {
      const errors = this.getSyncErrors();
      errors.push({
        id: Date.now().toString(),
        itemId: item.id,
        type,
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString(),
        itemData: item,
        resolved: false
      });
      
      // Keep only last 50 errors
      if (errors.length > 50) {
        errors.splice(0, errors.length - 50);
      }
      
      localStorage.setItem(SYNC_ERRORS_KEY, JSON.stringify(errors));
      window.dispatchEvent(new CustomEvent('sync-error', { detail: { item, error } }));
    } catch (err) {
      console.error('Error logging sync error:', err);
    }
  }

  getSyncErrors() {
    try {
      return JSON.parse(localStorage.getItem(SYNC_ERRORS_KEY) || '[]');
    } catch {
      return [];
    }
  }

  clearSyncErrors() {
    localStorage.setItem(SYNC_ERRORS_KEY, '[]');
  }

  // Update sync status
  updateSyncStatus(status = {}) {
    try {
      const currentStatus = {
        lastSyncAttempt: new Date().toISOString(),
        isSyncing: this.isSyncing,
        ...status
      };
      localStorage.setItem(SYNC_STATUS_KEY, JSON.stringify(currentStatus));
      window.dispatchEvent(new CustomEvent('sync-status-changed', { detail: currentStatus }));
    } catch (err) {
      console.error('Error updating sync status:', err);
    }
  }

  // Conflict resolution strategies
  async resolveConflict(localData, serverData, strategy = 'server_wins') {
    switch (strategy) {
      case 'server_wins':
        return serverData;
      case 'client_wins':
        return localData;
      case 'merge':
        // Merge by taking newer fields
        return {
          ...serverData,
          ...Object.keys(localData).reduce((acc, key) => {
            const localDate = new Date(localData.updated_date || localData.timestamp);
            const serverDate = new Date(serverData.updated_date || serverData.timestamp);
            if (localDate > serverDate) {
              acc[key] = localData[key];
            }
            return acc;
          }, {})
        };
      case 'manual':
        // Store for manual resolution
        this.storeConflict(localData, serverData);
        return null;
      default:
        return serverData;
    }
  }

  storeConflict(localData, serverData) {
    let conflicts = [];
    try { conflicts = JSON.parse(localStorage.getItem('offline_conflicts') || '[]'); } catch {}
    conflicts.push({
      id: Date.now().toString(),
      localData,
      serverData,
      timestamp: new Date().toISOString(),
      resolved: false
    });
    localStorage.setItem('offline_conflicts', JSON.stringify(conflicts));
  }

  getConflicts() {
    try {
      return JSON.parse(localStorage.getItem('offline_conflicts') || '[]');
    } catch {
      return [];
    }
  }

  // Enhanced sync with conflict resolution and detailed status
  async syncPendingData() {
    if (!this.isOnline || this.isSyncing) return;

    this.isSyncing = true;
    this.updateSyncStatus({ isSyncing: true, startTime: new Date().toISOString() });

    const { base44 } = await import('@/api/base44Client');
    
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    try {
      // Sync pending visits
      const pendingVisits = this.getPendingVisits().filter(v => !v.synced);
      
      for (const visit of pendingVisits) {
        try {
          // Check if visit was modified on server (conflict detection)
          let existingVisit = null;
          if (visit.data.id && !visit.id.startsWith('offline_')) {
            try {
              existingVisit = await base44.entities.Visit.filter({ id: visit.data.id });
              existingVisit = existingVisit[0];
            } catch (e) {
              // Visit doesn't exist on server
            }
          }

          let dataToSync = visit.data;
          
          // Handle conflicts if server version exists
          if (existingVisit) {
            const localTimestamp = new Date(visit.timestamp);
            const serverTimestamp = new Date(existingVisit.updated_date);
            
            if (serverTimestamp > localTimestamp) {
              // Conflict detected
              dataToSync = await this.resolveConflict(
                visit.data, 
                existingVisit, 
                visit.conflictResolution || 'server_wins'
              );
              
              if (!dataToSync) {
                // Manual resolution needed - skip this item
                continue;
              }
            }
          }

          // Sync the visit
          if (visit.id.startsWith('offline_')) {
            await base44.entities.Visit.create(dataToSync);
          } else {
            await base44.entities.Visit.update(visit.data.id, dataToSync);
          }
          
          this.markVisitSynced(visit.id);
          successCount++;
          
        } catch (error) {
          console.error('Error syncing visit:', error);
          this.logSyncError(visit, error, 'visit');
          this.incrementSyncAttempts(visit.id, 'visit');
          errorCount++;
          errors.push({ id: visit.id, error: error.message });
        }
      }

      // Sync pending updates
      const pendingUpdates = this.getPendingUpdates().filter(u => !u.synced);
      
      for (const update of pendingUpdates) {
        try {
          await base44.entities.Visit.update(update.visitId, update.data);
          this.markUpdateSynced(update.visitId, update.timestamp);
          successCount++;
        } catch (error) {
          console.error('Error syncing update:', error);
          this.logSyncError(update, error, 'update');
          errorCount++;
          errors.push({ id: update.visitId, error: error.message });
        }
      }

      this.updateSyncStatus({
        isSyncing: false,
        lastSyncSuccess: new Date().toISOString(),
        successCount,
        errorCount,
        errors
      });

      window.dispatchEvent(new CustomEvent('sync-complete', {
        detail: { success: successCount, failed: errorCount, errors }
      }));

      // Clean up old synced items
      this.cleanupSyncedItems();
      
    } catch (error) {
      console.error('Sync error:', error);
      this.updateSyncStatus({
        isSyncing: false,
        lastSyncError: error.message,
        errorCount: pendingVisits.length + pendingUpdates.length
      });
    }

    this.isSyncing = false;
  }

  incrementSyncAttempts(itemId, type = 'visit') {
    if (type === 'visit') {
      const pending = this.getPendingVisits();
      const updated = pending.map(v => {
        if (v.id === itemId) {
          return {
            ...v,
            syncAttempts: (v.syncAttempts || 0) + 1,
            lastSyncAttempt: new Date().toISOString()
          };
        }
        return v;
      });
      localStorage.setItem(PENDING_VISITS_KEY, JSON.stringify(updated));
    }
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
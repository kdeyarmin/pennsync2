import { useState, useEffect, useCallback } from 'react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Wifi, WifiOff, Upload, AlertCircle, Clock } from 'lucide-react';

// Local storage keys
const STORAGE_KEYS = {
  PENDING_VISITS: 'offline_pending_visits',
  PENDING_NOTES: 'offline_pending_notes',
  PENDING_VITALS: 'offline_pending_vitals',
  PENDING_TASKS: 'offline_pending_tasks',
  SYNC_QUEUE: 'offline_sync_queue',
  LAST_SYNC: 'offline_last_sync',
  CONFLICT_LOG: 'offline_conflicts'
};

// Offline storage manager
class OfflineStorageManager {
  static saveToQueue(type, data) {
    try {
      const queue = this.getQueue();
      const item = {
        id: `offline_${Date.now()}_${Math.random()}`,
        type,
        data,
        timestamp: new Date().toISOString(),
        status: 'pending',
        retryCount: 0
      };
      queue.push(item);
      localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue));
      return item.id;
    } catch (error) {
      console.error('Failed to save to offline queue:', error);
      return null;
    }
  }

  static getQueue() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.SYNC_QUEUE);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static updateQueueItem(id, updates) {
    const queue = this.getQueue();
    const index = queue.findIndex(item => item.id === id);
    if (index !== -1) {
      queue[index] = { ...queue[index], ...updates };
      try { localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue)); } catch {}
    }
  }

  static removeFromQueue(id) {
    const queue = this.getQueue().filter(item => item.id !== id);
    try { localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify(queue)); } catch {}
  }

  static clearQueue() {
    try { localStorage.setItem(STORAGE_KEYS.SYNC_QUEUE, JSON.stringify([])); } catch {}
  }

  static saveConflict(conflict) {
    try {
      const conflicts = this.getConflicts();
      conflicts.push({
        ...conflict,
        timestamp: new Date().toISOString()
      });
      localStorage.setItem(STORAGE_KEYS.CONFLICT_LOG, JSON.stringify(conflicts));
    } catch (error) {
      console.error('Failed to save conflict:', error);
    }
  }

  static getConflicts() {
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CONFLICT_LOG);
      return data ? JSON.parse(data) : [];
    } catch {
      return [];
    }
  }

  static clearConflicts() {
    try { localStorage.setItem(STORAGE_KEYS.CONFLICT_LOG, JSON.stringify([])); } catch {}
  }

  static getLastSync() {
    try { return localStorage.getItem(STORAGE_KEYS.LAST_SYNC); } catch { return null; }
  }

  static setLastSync() {
    try { localStorage.setItem(STORAGE_KEYS.LAST_SYNC, new Date().toISOString()); } catch {}
  }
}

// Sync worker
class OfflineSyncWorker {
  static async syncItem(item) {
    try {
      let result;
      
      switch (item.type) {
        case 'visit':
          if (item.data.id && item.data.id.startsWith('offline_')) {
            // New visit - create
            const { id, ...visitData } = item.data;
            result = await base44.entities.Visit.create(visitData);
          } else if (item.data.id) {
            // Update existing visit
            const { id, ...visitData } = item.data;
            result = await base44.entities.Visit.update(id, visitData);
          } else {
            // Create new visit
            result = await base44.entities.Visit.create(item.data);
          }
          break;

        case 'note':
          if (item.data.visit_id && item.data.visit_id.startsWith('offline_')) {
            // Skip - visit hasn't been synced yet
            return { status: 'pending', reason: 'waiting_for_visit' };
          }
          result = await base44.entities.Visit.update(item.data.visit_id, {
            nurse_notes: item.data.nurse_notes
          });
          break;

        case 'vitals':
          if (item.data.visit_id && item.data.visit_id.startsWith('offline_')) {
            return { status: 'pending', reason: 'waiting_for_visit' };
          }
          result = await base44.entities.Visit.update(item.data.visit_id, {
            vital_signs: item.data.vital_signs
          });
          break;

        case 'task':
          if (item.data.id && item.data.id.startsWith('offline_')) {
            const { id, ...taskData } = item.data;
            result = await base44.entities.Task.create(taskData);
          } else if (item.data.id) {
            const { id, ...taskData } = item.data;
            result = await base44.entities.Task.update(id, taskData);
          } else {
            result = await base44.entities.Task.create(item.data);
          }
          break;

        default:
          throw new Error(`Unknown sync type: ${item.type}`);
      }

      return { status: 'success', result };
    } catch (error) {
      // Check for conflicts
      if (error.status === 409 || error.message?.includes('conflict')) {
        return { status: 'conflict', error };
      }
      return { status: 'error', error };
    }
  }

  static async syncAll(onProgress) {
    const queue = OfflineStorageManager.getQueue();
    const results = {
      success: 0,
      failed: 0,
      conflicts: 0,
      pending: 0
    };

    for (let i = 0; i < queue.length; i++) {
      const item = queue[i];
      
      if (onProgress) {
        onProgress({
          current: i + 1,
          total: queue.length,
          item
        });
      }

      const result = await this.syncItem(item);

      switch (result.status) {
        case 'success':
          results.success++;
          OfflineStorageManager.removeFromQueue(item.id);
          break;

        case 'pending':
          results.pending++;
          OfflineStorageManager.updateQueueItem(item.id, {
            status: 'pending',
            pendingReason: result.reason
          });
          break;

        case 'conflict':
          results.conflicts++;
          OfflineStorageManager.saveConflict({
            item,
            error: result.error
          });
          OfflineStorageManager.updateQueueItem(item.id, {
            status: 'conflict',
            error: result.error.message
          });
          break;

        case 'error':
          results.failed++;
          const retryCount = (item.retryCount || 0) + 1;
          if (retryCount >= 3) {
            OfflineStorageManager.updateQueueItem(item.id, {
              status: 'failed',
              error: result.error.message,
              retryCount
            });
          } else {
            OfflineStorageManager.updateQueueItem(item.id, {
              retryCount,
              lastError: result.error.message
            });
          }
          break;
      }
    }

    OfflineStorageManager.setLastSync();
    return results;
  }
}

// React hook for offline sync
export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);

  useEffect(() => {
    const updateOnlineStatus = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  useEffect(() => {
    const updatePendingCount = () => {
      const queue = OfflineStorageManager.getQueue();
      setPendingCount(queue.filter(item => item.status === 'pending').length);
    };

    updatePendingCount();
    const interval = setInterval(updatePendingCount, 5000);
    return () => clearInterval(interval);
  }, []);

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && pendingCount > 0) {
      const timer = setTimeout(() => {
        syncNow();
      }, 2000); // Wait 2 seconds to ensure stable connection
      return () => clearTimeout(timer);
    }
  }, [isOnline]);

  const saveOffline = useCallback((type, data) => {
    const id = OfflineStorageManager.saveToQueue(type, data);
    setPendingCount(prev => prev + 1);
    toast.info('Saved offline - will sync when online');
    return id;
  }, []);

  const syncNow = useCallback(async () => {
    if (!isOnline) {
      toast.error('Cannot sync while offline');
      return;
    }

    setIsSyncing(true);
    setSyncProgress({ current: 0, total: pendingCount });

    try {
      const results = await OfflineSyncWorker.syncAll((progress) => {
        setSyncProgress(progress);
      });

      if (results.success > 0) {
        toast.success(`Synced ${results.success} item${results.success > 1 ? 's' : ''}`);
      }

      if (results.conflicts > 0) {
        toast.warning(`${results.conflicts} conflict${results.conflicts > 1 ? 's' : ''} detected`);
      }

      if (results.failed > 0) {
        toast.error(`${results.failed} item${results.failed > 1 ? 's' : ''} failed to sync`);
      }

      setPendingCount(results.pending);
    } catch (error) {
      toast.error('Sync failed: ' + error.message);
    } finally {
      setIsSyncing(false);
      setSyncProgress(null);
    }
  }, [isOnline, pendingCount]);

  const clearQueue = useCallback(() => {
    OfflineStorageManager.clearQueue();
    setPendingCount(0);
    toast.success('Offline queue cleared');
  }, []);

  return {
    isOnline,
    isSyncing,
    syncProgress,
    pendingCount,
    saveOffline,
    syncNow,
    clearQueue,
    getQueue: OfflineStorageManager.getQueue,
    getConflicts: OfflineStorageManager.getConflicts
  };
}

// Offline sync status widget
export default function OfflineSyncService() {
  const {
    isOnline,
    isSyncing,
    syncProgress,
    pendingCount,
    syncNow,
    clearQueue,
    getQueue,
    getConflicts
  } = useOfflineSync();

  const [showDetails, setShowDetails] = useState(false);
  const [queue, setQueue] = useState([]);
  const [conflicts, setConflicts] = useState([]);

  useEffect(() => {
    if (showDetails) {
      setQueue(getQueue());
      setConflicts(getConflicts());
    }
  }, [showDetails]);

  if (!showDetails && pendingCount === 0 && isOnline) {
    return null; // Hide when nothing to sync
  }

  return (
    <Card className="border-2">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            {isOnline ? (
              <Wifi className="w-5 h-5 text-green-600" />
            ) : (
              <WifiOff className="w-5 h-5 text-red-600" />
            )}
            <div>
              <h3 className="font-semibold text-slate-900">
                {isOnline ? 'Online' : 'Offline Mode'}
              </h3>
              <p className="text-xs text-slate-500">
                {pendingCount > 0 ? `${pendingCount} item${pendingCount > 1 ? 's' : ''} pending sync` : 'All synced'}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendingCount > 0 && (
              <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-300">
                {pendingCount} pending
              </Badge>
            )}
            {conflicts.length > 0 && (
              <Badge variant="outline" className="bg-red-50 text-red-700 border-red-300">
                {conflicts.length} conflicts
              </Badge>
            )}
          </div>
        </div>

        {isSyncing && syncProgress && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-slate-600">Syncing...</span>
              <span className="text-slate-900 font-medium">
                {syncProgress.current} / {syncProgress.total}
              </span>
            </div>
            <div className="w-full bg-slate-200 rounded-full h-2">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(syncProgress.current / syncProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        <div className="flex gap-2">
          {isOnline && pendingCount > 0 && !isSyncing && (
            <Button onClick={syncNow} size="sm" className="flex-1">
              <Upload className="w-4 h-4 mr-2" />
              Sync Now
            </Button>
          )}
          <Button
            onClick={() => setShowDetails(!showDetails)}
            variant="outline"
            size="sm"
            className="flex-1"
          >
            {showDetails ? 'Hide Details' : 'View Details'}
          </Button>
        </div>

        {showDetails && (
          <div className="mt-4 space-y-3 max-h-64 overflow-auto">
            <div>
              <h4 className="text-sm font-semibold text-slate-700 mb-2">Sync Queue</h4>
              {queue.length === 0 ? (
                <p className="text-sm text-slate-500">No pending items</p>
              ) : (
                <div className="space-y-2">
                  {queue.map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-2 bg-slate-50 rounded text-xs">
                      <div className="flex items-center gap-2">
                        {item.status === 'pending' && <Clock className="w-3 h-3 text-orange-600" />}
                        {item.status === 'conflict' && <AlertCircle className="w-3 h-3 text-red-600" />}
                        {item.status === 'failed' && <AlertCircle className="w-3 h-3 text-red-600" />}
                        <span className="font-medium capitalize">{item.type}</span>
                        <span className="text-slate-500">
                          {new Date(item.timestamp).toLocaleTimeString()}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={
                          item.status === 'pending'
                            ? 'bg-orange-50 text-orange-700 border-orange-300'
                            : 'bg-red-50 text-red-700 border-red-300'
                        }
                      >
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {conflicts.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-slate-700 mb-2">Conflicts</h4>
                <div className="space-y-2">
                  {conflicts.map((conflict, idx) => (
                    <div key={idx} className="p-2 bg-red-50 border border-red-200 rounded text-xs">
                      <div className="font-medium text-red-900 mb-1">
                        {conflict.item.type} - {new Date(conflict.timestamp).toLocaleString()}
                      </div>
                      <div className="text-red-700">{conflict.error?.message}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {pendingCount > 0 && (
              <Button
                onClick={clearQueue}
                variant="outline"
                size="sm"
                className="w-full text-red-600 border-red-300 hover:bg-red-50"
              >
                Clear Queue
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Export utilities for use in other components
export { OfflineStorageManager, OfflineSyncWorker };
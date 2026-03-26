import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { 
  getSyncQueue, 
  removeFromSyncQueue, 
  savePatients
} from '@/lib/indexedDB';

export default function OfflineManager() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = async () => {
      setIsOnline(true);
      toast.success('Back online! Syncing data...');
      
      try {
        const queue = await getSyncQueue();
        for (const item of queue) {
          if (item.action === 'CREATE_VISIT') {
            await base44.entities.Visit.create(item.payload);
            await removeFromSyncQueue(item.id);
          }
        }

        if (queue.length > 0) {
            toast.success(`Successfully synced ${queue.length} items.`);
        }
      } catch (err) {
        console.error('Error syncing data:', err);
        toast.error('Some items failed to sync.');
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      toast.warning('You are offline. Changes will be saved locally and synced when you reconnect.');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial cache of patients
    if (isOnline) {
      base44.entities.Patient.filter({ status: "active" }, "first_name", 200)
        .then(patients => {
          savePatients(patients);
        })
        .catch(console.error);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [isOnline]);

  return null;
}
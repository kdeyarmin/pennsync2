import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Database, 
  Download, 
  Upload, 
  CheckCircle2, 
  AlertTriangle,
  Loader2,
  Trash2,
  RefreshCw,
  Wifi,
  WifiOff
} from "lucide-react";
import OfflinePatientSelector from "./OfflinePatientSelector";
import OfflineSyncManager from "./OfflineSyncManager";

export default function OfflineDataManager() {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isCaching, setIsCaching] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: offlineCache = [] } = useQuery({
    queryKey: ['offlineCache', currentUser?.email],
    queryFn: () => base44.entities.OfflineDataCache.filter({ 
      user_email: currentUser?.email,
      is_synced: false 
    }),
    enabled: !!currentUser?.email && isOnline,
  });

  const cachePatientData = async () => {
    if (!currentUser?.email) return;

    setIsCaching(true);
    try {
      // Get today's scheduled patients
      const today = new Date().toISOString().split('T')[0];
      const todayVisits = await base44.entities.Visit.filter({ 
        visit_date: today, 
        status: 'scheduled' 
      });

      const patientIds = [...new Set(todayVisits.map(v => v.patient_id))];
      const patients = await base44.entities.Patient.list();
      const todayPatients = patients.filter(p => patientIds.includes(p.id));

      // Cache each patient's essential data
      for (const patient of todayPatients.slice(0, 10)) { // Limit to 10 patients
        await base44.entities.OfflineDataCache.create({
          user_email: currentUser.email,
          data_type: 'patient',
          entity_id: patient.id,
          cached_data: {
            id: patient.id,
            first_name: patient.first_name,
            last_name: patient.last_name,
            primary_diagnosis: patient.primary_diagnosis,
            allergies: patient.allergies,
            current_medications: patient.current_medications,
            address: patient.address,
            phone: patient.phone,
            emergency_contact_name: patient.emergency_contact_name,
            emergency_contact_phone: patient.emergency_contact_phone
          },
          cached_at: new Date().toISOString(),
          is_synced: true
        });
      }

      // Store in localStorage as well
      localStorage.setItem('offline_patients', JSON.stringify(todayPatients.slice(0, 10)));
      
      queryClient.invalidateQueries({ queryKey: ['offlineCache'] });
      setSyncStatus({ type: 'success', message: `Cached ${todayPatients.length} patients for offline access` });
    } catch (error) {
      console.error('Caching error:', error);
      setSyncStatus({ type: 'error', message: 'Failed to cache data' });
    }
    setIsCaching(false);
  };

  const syncOfflineData = async () => {
    if (!isOnline || !currentUser?.email) return;

    setIsSyncing(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      for (const cache of offlineCache) {
        try {
          if (cache.data_type === 'visit_draft') {
            // Sync visit draft to actual visit
            await base44.entities.Visit.create(cache.cached_data);
          } else if (cache.data_type === 'vital_signs') {
            // Update visit with vital signs
            await base44.entities.Visit.update(cache.entity_id, {
              vital_signs: cache.cached_data
            });
          }

          // Mark as synced
          await base44.entities.OfflineDataCache.update(cache.id, {
            is_synced: true,
            synced_at: new Date().toISOString()
          });

          successCount++;
        } catch (error) {
          console.error('Sync error for item:', cache.id, error);
          errorCount++;
        }
      }

      queryClient.invalidateQueries({ queryKey: ['offlineCache'] });
      queryClient.invalidateQueries({ queryKey: ['todayVisits'] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });

      if (successCount > 0) {
        setSyncStatus({ 
          type: 'success', 
          message: `Synced ${successCount} item${successCount !== 1 ? 's' : ''}${errorCount > 0 ? `, ${errorCount} failed` : ''}`
        });
      }
    } catch (error) {
      console.error('Sync error:', error);
      setSyncStatus({ type: 'error', message: 'Sync failed' });
    }

    setIsSyncing(false);
  };

  const clearCache = async () => {
    try {
      for (const cache of offlineCache) {
        await base44.entities.OfflineDataCache.delete(cache.id);
      }
      localStorage.removeItem('offline_patients');
      queryClient.invalidateQueries({ queryKey: ['offlineCache'] });
      setSyncStatus({ type: 'success', message: 'Cache cleared' });
    } catch (error) {
      console.error('Clear cache error:', error);
    }
  };

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && offlineCache.length > 0 && !isSyncing) {
      syncOfflineData();
    }
  }, [isOnline]);

  return (
    <Card className={`border-2 ${isOnline ? 'border-green-300' : 'border-orange-300'}`}>
      <CardHeader className={`${isOnline ? 'bg-green-50' : 'bg-orange-50'}`}>
        <CardTitle className="text-base flex items-center gap-2">
          {isOnline ? <Wifi className="w-5 h-5 text-green-600" /> : <WifiOff className="w-5 h-5 text-orange-600" />}
          Offline Mode
          <Badge className={`ml-auto ${isOnline ? 'bg-green-600' : 'bg-orange-600'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        <Tabs defaultValue="sync" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="sync">Sync</TabsTrigger>
            <TabsTrigger value="download">Download</TabsTrigger>
            <TabsTrigger value="tasks">Tasks</TabsTrigger>
          </TabsList>

          <TabsContent value="sync" className="space-y-4 mt-4">
            <OfflineSyncManager />
          </TabsContent>

          <TabsContent value="download" className="space-y-4 mt-4">
            <OfflinePatientSelector 
              onCacheComplete={(count) => {
                queryClient.invalidateQueries();
              }}
            />
          </TabsContent>

          <TabsContent value="tasks" className="space-y-4 mt-4">
            <Alert className="bg-blue-50 border-blue-300">
              <AlertDescription className="text-sm">
                Use the Offline Mode page to document visits and incidents offline. Changes will sync automatically.
              </AlertDescription>
            </Alert>
          </TabsContent>
        </Tabs>

        {/* Legacy content below */}
        <div className="hidden">
        {!isOnline && (
          <Alert className="bg-orange-50 border-orange-300">
            <AlertTriangle className="w-4 h-4 text-orange-600" />
            <AlertDescription className="text-sm text-orange-800">
              You're currently offline. Cached data is available below.
            </AlertDescription>
          </Alert>
        )}

        {syncStatus && (
          <Alert className={syncStatus.type === 'success' ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}>
            {syncStatus.type === 'success' ? 
              <CheckCircle2 className="w-4 h-4 text-green-600" /> : 
              <AlertTriangle className="w-4 h-4 text-red-600" />
            }
            <AlertDescription className="text-sm">
              {syncStatus.message}
            </AlertDescription>
          </Alert>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-semibold">Cached Patients</p>
              <p className="text-xs text-gray-600">Available offline</p>
            </div>
            <Badge variant="outline">
              {localStorage.getItem('offline_patients') ? 
                JSON.parse(localStorage.getItem('offline_patients')).length : 0
              } patients
            </Badge>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div>
              <p className="text-sm font-semibold">Pending Sync</p>
              <p className="text-xs text-gray-600">Drafts waiting to upload</p>
            </div>
            <Badge variant="outline" className={offlineCache.length > 0 ? 'bg-yellow-100' : ''}>
              {offlineCache.length} item{offlineCache.length !== 1 ? 's' : ''}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Button
            onClick={cachePatientData}
            disabled={!isOnline || isCaching}
            variant="outline"
            className="w-full"
          >
            {isCaching ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            Cache Data
          </Button>

          <Button
            onClick={syncOfflineData}
            disabled={!isOnline || isSyncing || offlineCache.length === 0}
            className="w-full bg-green-600 hover:bg-green-700"
          >
            {isSyncing ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            Sync Now
          </Button>
        </div>

        {offlineCache.length > 0 && (
          <Button
            onClick={clearCache}
            variant="outline"
            size="sm"
            className="w-full text-red-600 hover:bg-red-50"
          >
            <Trash2 className="w-3 h-3 mr-2" />
            Clear Cache
          </Button>
        )}
        </div>
      </CardContent>
    </Card>
  );
}
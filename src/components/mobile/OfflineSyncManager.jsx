import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Upload, 
  CheckCircle2, 
  AlertTriangle, 
  Loader2,
  Database,
  Wifi,
  WifiOff,
  Clock,
  FileText
} from "lucide-react";

export default function OfflineSyncManager() {
  const queryClient = useQueryClient();
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncProgress, setSyncProgress] = useState(0);
  const [syncResult, setSyncResult] = useState(null);
  const [pendingDrafts, setPendingDrafts] = useState([]);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load pending drafts
    loadPendingDrafts();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const loadPendingDrafts = () => {
    const drafts = JSON.parse(localStorage.getItem('offline_visit_drafts') || '[]');
    setPendingDrafts(drafts);
  };

  // Auto-sync when coming online
  useEffect(() => {
    if (isOnline && pendingDrafts.length > 0 && !isSyncing) {
      // Wait 2 seconds to ensure connection is stable
      setTimeout(() => {
        syncOfflineData();
      }, 2000);
    }
  }, [isOnline]);

  const syncOfflineData = async () => {
    if (!isOnline || pendingDrafts.length === 0) return;

    setIsSyncing(true);
    setSyncResult(null);
    let successCount = 0;
    let errorCount = 0;
    const errors = [];

    try {
      for (let i = 0; i < pendingDrafts.length; i++) {
        const draft = pendingDrafts[i];
        setSyncProgress(((i + 1) / pendingDrafts.length) * 100);

        try {
          // Create visit from draft
          await base44.entities.Visit.create({
            patient_id: draft.patient_id,
            visit_date: draft.visit_date,
            visit_type: draft.visit_type,
            status: 'completed',
            nurse_notes: draft.nurse_notes,
            raw_transcription: draft.raw_transcription,
            vital_signs: draft.vital_signs
          });

          successCount++;
        } catch (error) {
          console.error('Sync error for draft:', draft, error);
          errorCount++;
          errors.push({
            patient: draft.patient_name,
            error: error.message
          });
        }
      }

      // Clear synced drafts
      if (successCount > 0) {
        const remaining = errors.map(e => 
          pendingDrafts.find(d => d.patient_name === e.patient)
        ).filter(Boolean);
        
        localStorage.setItem('offline_visit_drafts', JSON.stringify(remaining));
        loadPendingDrafts();
      }

      setSyncResult({
        success: successCount,
        failed: errorCount,
        errors
      });

      // Refresh all queries
      queryClient.invalidateQueries({ queryKey: ['todayVisits'] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
      queryClient.invalidateQueries({ queryKey: ['patientVisits'] });

    } catch (error) {
      console.error('Sync error:', error);
      setSyncResult({
        success: 0,
        failed: pendingDrafts.length,
        errors: [{ patient: 'All', error: error.message }]
      });
    }

    setIsSyncing(false);
    setSyncProgress(0);
  };

  return (
    <Card className={`border-2 ${isOnline ? 'border-green-300' : 'border-orange-300'}`}>
      <CardHeader className={isOnline ? 'bg-green-50' : 'bg-orange-50'}>
        <CardTitle className="text-base flex items-center gap-2">
          {isOnline ? <Wifi className="w-5 h-5 text-green-600" /> : <WifiOff className="w-5 h-5 text-orange-600" />}
          Sync Status
          <Badge className={`ml-auto ${isOnline ? 'bg-green-600' : 'bg-orange-600'}`}>
            {isOnline ? 'Online' : 'Offline'}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {!isOnline && (
          <Alert className="bg-orange-50 border-orange-300">
            <WifiOff className="w-4 h-4 text-orange-600" />
            <AlertDescription className="text-sm text-orange-800">
              You're offline. Notes will be saved locally and synced when connection returns.
            </AlertDescription>
          </Alert>
        )}

        {/* Pending Drafts */}
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-gray-600" />
              <div>
                <p className="text-sm font-semibold">Pending Drafts</p>
                <p className="text-xs text-gray-600">Waiting to sync</p>
              </div>
            </div>
            <Badge variant="outline" className={pendingDrafts.length > 0 ? 'bg-yellow-100 border-yellow-300' : ''}>
              {pendingDrafts.length}
            </Badge>
          </div>

          {/* Draft List */}
          {pendingDrafts.length > 0 && (
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {pendingDrafts.map((draft, idx) => (
                <div key={idx} className="p-2 bg-white border rounded text-xs">
                  <p className="font-medium">{draft.patient_name}</p>
                  <p className="text-gray-600">{draft.visit_date} - {draft.visit_type}</p>
                  <p className="text-gray-500">{draft.nurse_notes?.substring(0, 60)}...</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sync Button */}
        {pendingDrafts.length > 0 && (
          <>
            {isSyncing && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-gray-600">Syncing...</span>
                  <span className="font-semibold">{Math.round(syncProgress)}%</span>
                </div>
                <Progress value={syncProgress} className="h-2" />
              </div>
            )}

            <Button
              onClick={syncOfflineData}
              disabled={!isOnline || isSyncing}
              className="w-full bg-green-600 hover:bg-green-700"
            >
              {isSyncing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Syncing {Math.round(syncProgress)}%
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Sync {pendingDrafts.length} Draft{pendingDrafts.length !== 1 ? 's' : ''} Now
                </>
              )}
            </Button>
          </>
        )}

        {/* Sync Result */}
        {syncResult && (
          <Alert className={syncResult.success > 0 ? 'bg-green-50 border-green-300' : 'bg-red-50 border-red-300'}>
            <CheckCircle2 className="w-4 h-4" />
            <AlertDescription className="text-sm">
              <p className="font-semibold mb-1">Sync Complete</p>
              <p>✅ {syncResult.success} synced successfully</p>
              {syncResult.failed > 0 && (
                <>
                  <p className="text-red-600">❌ {syncResult.failed} failed</p>
                  {syncResult.errors.slice(0, 3).map((err, idx) => (
                    <p key={idx} className="text-xs text-red-700 mt-1">
                      • {err.patient}: {err.error}
                    </p>
                  ))}
                </>
              )}
            </AlertDescription>
          </Alert>
        )}

        {/* Cached Data Info */}
        <div className="p-3 bg-gray-50 rounded-lg border">
          <div className="flex items-center gap-2 mb-2">
            <Database className="w-4 h-4 text-gray-600" />
            <p className="text-sm font-semibold">Cached Patient Data</p>
          </div>
          <p className="text-xs text-gray-600">
            {JSON.parse(localStorage.getItem('offline_patient_data') || '[]').length} patients available offline
          </p>
          {localStorage.getItem('offline_cache_timestamp') && (
            <p className="text-xs text-gray-500 mt-1">
              <Clock className="w-3 h-3 inline mr-1" />
              Last cached: {new Date(localStorage.getItem('offline_cache_timestamp')).toLocaleString()}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
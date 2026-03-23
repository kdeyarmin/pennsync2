import { useState, useEffect } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { WifiOff, Wifi, Users, FileText, Database } from "lucide-react";
import OfflinePatientSelector from "../components/mobile/OfflinePatientSelector";
import OfflineSyncManager from "../components/mobile/OfflineSyncManager";
import OfflineTaskManager from "../components/mobile/OfflineTaskManager";

export default function OfflineMode() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);

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

  let cachedPatients = [];
  try {
    cachedPatients = JSON.parse(localStorage.getItem('offline_patient_data') || '[]');
  } catch (e) {
    console.warn('Failed to parse cached patient data:', e);
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
      <div className="mb-4 sm:mb-6">
        <div className="flex items-center gap-2 sm:gap-3 mb-2">
          <div className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-lg flex-shrink-0 ${
            isOnline ? 'bg-green-500' : 'bg-orange-500'
          }`}>
            {isOnline ? <Wifi className="w-5 h-5 sm:w-6 sm:h-6 text-white" /> : <WifiOff className="w-5 h-5 sm:w-6 sm:h-6 text-white" />}
          </div>
          <div className="min-w-0">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-900 truncate">Offline Mode</h1>
            <p className="text-xs sm:text-sm text-gray-600">Work without internet, sync when ready</p>
          </div>
        </div>

        <Alert className={isOnline ? 'bg-green-50 border-green-300' : 'bg-orange-50 border-orange-300'}>
          <AlertDescription className="text-sm flex items-center gap-2">
            {isOnline ? (
              <>
                <Wifi className="w-4 h-4 text-green-600" />
                <span className="text-green-800">✅ Connected - Data will sync automatically</span>
              </>
            ) : (
              <>
                <WifiOff className="w-4 h-4 text-orange-600" />
                <span className="text-orange-800">⚠️ Offline - Using cached data</span>
              </>
            )}
          </AlertDescription>
        </Alert>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 md:gap-6 mb-4 sm:mb-6">
        <Card className="border-blue-200">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-blue-600 font-medium mb-1 truncate">Cached Patients</p>
                <p className="text-2xl sm:text-3xl font-bold text-blue-900">{cachedPatients.length}</p>
              </div>
              <Users className="w-8 h-8 sm:w-10 sm:h-10 text-blue-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-yellow-200">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-yellow-600 font-medium mb-1 truncate">Pending Sync</p>
                <p className="text-2xl sm:text-3xl font-bold text-yellow-900">
                  {(() => { try { return JSON.parse(localStorage.getItem('offline_visit_drafts') || '[]').length; } catch { return 0; } })()}
                </p>
              </div>
              <FileText className="w-8 h-8 sm:w-10 sm:h-10 text-yellow-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200">
          <CardContent className="p-3 sm:p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-xs sm:text-sm text-purple-600 font-medium mb-1 truncate">Storage Used</p>
                <p className="text-2xl sm:text-3xl font-bold text-purple-900">
                  {(
                    (localStorage.getItem('offline_patient_data')?.length || 0) / 1024
                  ).toFixed(0)}
                  <span className="text-base sm:text-lg ml-1">KB</span>
                </p>
              </div>
              <Database className="w-8 h-8 sm:w-10 sm:h-10 text-purple-400 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        <div className="space-y-6">
          <OfflineSyncManager />
          <OfflinePatientSelector onCacheComplete={() => {
            toast.success('Patient data cached for offline use');
          }} />
        </div>

        <div className="space-y-4 sm:space-y-6">
          {/* Cached Patients List */}
          <Card>
            <CardHeader className="p-3 sm:p-4 md:p-6">
              <CardTitle className="text-sm sm:text-base">Cached Patients</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-4">
              {cachedPatients.length === 0 ? (
                <div className="text-center py-4 sm:py-6 text-gray-500">
                  <Users className="w-10 h-10 sm:w-12 sm:h-12 text-gray-300 mx-auto mb-2" />
                  <p className="text-xs sm:text-sm">No patients cached</p>
                  <p className="text-xs mt-1">Download patient data to work offline</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 sm:max-h-96 overflow-y-auto">
                  {cachedPatients.map((cache, idx) => (
                    <div
                     key={idx}
                     className={`p-3 sm:p-4 border rounded-lg cursor-pointer transition-colors min-h-[60px] touch-target ${
                       selectedPatientId === cache.patient.id 
                         ? 'bg-blue-50 border-blue-300' 
                         : 'bg-white hover:bg-gray-50'
                     }`}
                     onClick={() => {
                       setSelectedPatientId(cache.patient.id);
                       setSelectedPatient(cache.patient);
                     }}
                    >
                      <p className="font-medium text-sm sm:text-base">
                        {cache.patient.first_name} {cache.patient.last_name}
                      </p>
                      <p className="text-xs sm:text-sm text-gray-600 truncate">{cache.patient.primary_diagnosis}</p>
                      <div className="flex flex-wrap gap-2 mt-2">
                        <Badge variant="outline" className="text-xs">
                          {cache.carePlans?.length || 0} care plans
                        </Badge>
                        <Badge variant="outline" className="text-xs">
                          {cache.recentVisits?.length || 0} visits
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Offline Task Manager */}
          {selectedPatientId && selectedPatient && (
            <OfflineTaskManager
              patientId={selectedPatientId}
              patientName={`${selectedPatient.first_name} ${selectedPatient.last_name}`}
            />
          )}
        </div>
      </div>
    </div>
  );
}
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import OfflineSyncService from '../components/offline/OfflineSyncService';
import OfflineVisitDocumentation from '../components/offline/OfflineVisitDocumentation';
import { FileText, Upload, AlertCircle, Info } from 'lucide-react';

export default function OfflineDocumentation() {
  const [selectedPatientId, _setSelectedPatientId] = useState(null);

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Offline Documentation</h1>
        <p className="text-gray-500">
          Document patient visits even without internet connection - data syncs automatically when online
        </p>
      </div>

      {/* Sync Status */}
      <OfflineSyncService />

      {/* Info Card */}
      <Card className="border-blue-200 bg-blue-50">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <Info className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 mb-1">How Offline Mode Works</h3>
              <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
                <li>All documentation is saved locally to your device storage</li>
                <li>Data automatically syncs when internet connection is restored</li>
                <li>Auto-save every 30 seconds prevents data loss</li>
                <li>Conflict detection ensures data integrity during sync</li>
                <li>View pending items and sync status anytime</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="document" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="document" className="gap-2">
            <FileText className="w-4 h-4" />
            Document Visit
          </TabsTrigger>
          <TabsTrigger value="pending" className="gap-2">
            <Upload className="w-4 h-4" />
            Pending Sync
          </TabsTrigger>
        </TabsList>

        <TabsContent value="document" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>New Visit Documentation</CardTitle>
              <CardDescription>
                Document patient visits with offline support - works seamlessly with or without internet
              </CardDescription>
            </CardHeader>
            <CardContent>
              <OfflineVisitDocumentation
                patientId={selectedPatientId || 'demo-patient-123'}
                onSaved={(data) => {
                  console.log('Visit saved:', data);
                }}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="pending" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Sync Queue Management</CardTitle>
              <CardDescription>
                View and manage documentation waiting to be synced to the server
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-gray-500">
                <AlertCircle className="w-12 h-12 mx-auto mb-3 text-gray-400" />
                <p>Use the sync status widget above to view pending items</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Technical Info */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Storage & Sync Information</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 space-y-2">
          <p><strong>Storage Location:</strong> Browser Local Storage (persistent across sessions)</p>
          <p><strong>Auto-Sync Trigger:</strong> Automatically syncs 2 seconds after connection is restored</p>
          <p><strong>Retry Logic:</strong> Failed items retry up to 3 times with exponential backoff</p>
          <p><strong>Conflict Resolution:</strong> Server version takes precedence; conflicts logged for review</p>
          <p><strong>Data Retention:</strong> Offline data persists until successfully synced</p>
        </CardContent>
      </Card>
    </div>
  );
}
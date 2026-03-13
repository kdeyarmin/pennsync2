import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCircle2, AlertCircle, Clock, RefreshCw, X, Bell } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const statusConfig = {
  delivered: { color: 'bg-green-50', icon: CheckCircle2, label: 'Delivered', badge: 'text-green-700 bg-green-100' },
  failed: { color: 'bg-red-50', icon: AlertCircle, label: 'Failed', badge: 'text-red-700 bg-red-100' },
  pending: { color: 'bg-blue-50', icon: Clock, label: 'Pending', badge: 'text-blue-700 bg-blue-100' },
  queued: { color: 'bg-amber-50', icon: Clock, label: 'Queued', badge: 'text-amber-700 bg-amber-100' },
};

export default function RealtimeFaxStatusTracker() {
  const [selectedFax, setSelectedFax] = useState(null);
  const queryClient = useQueryClient();

  // Fetch recent fax logs with real-time polling
  const { data: faxLogs = [], isLoading, refetch } = useQuery({
    queryKey: ['faxLogs', 'recent'],
    queryFn: async () => {
      try {
        const logs = await base44.entities.FaxLog.list('-created_date', 50);
        return logs.filter(log => {
          const createdDate = new Date(log.created_date);
          const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
          return createdDate > oneDayAgo;
        });
      } catch (error) {
        console.error('Error fetching fax logs:', error);
        return [];
      }
    },
    refetchInterval: 5000, // Poll every 5 seconds
    staleTime: 2000,
  });

  // Subscribe to fax status changes
  useEffect(() => {
    const unsubscribe = base44.entities.FaxLog.subscribe((event) => {
      if (event.type === 'update') {
        queryClient.invalidateQueries({ queryKey: ['faxLogs'] });
      }
    });

    return unsubscribe;
  }, [queryClient]);

  const dismissFax = (faxId) => {
    setSelectedFax(null);
  };

  const getStatusPercentage = (faxLogs) => {
    if (faxLogs.length === 0) return { delivered: 0, failed: 0, pending: 0 };
    const statuses = { delivered: 0, failed: 0, pending: 0, queued: 0 };
    faxLogs.forEach(log => {
      const status = log.status?.toLowerCase() || 'pending';
      if (status in statuses) statuses[status]++;
    });
    return statuses;
  };

  const stats = getStatusPercentage(faxLogs);
  const total = Object.values(stats).reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      {/* Notification Alert */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-3">
        <Bell className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium text-blue-900">Smart Notifications Enabled</p>
          <p className="text-xs text-blue-700 mt-0.5">You'll receive alerts when faxes are delivered or fail. Configure preferences in Settings.</p>
        </div>
      </div>

      {/* Summary Cards */}
      {total > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { key: 'delivered', label: 'Delivered' },
            { key: 'pending', label: 'Pending' },
            { key: 'queued', label: 'Queued' },
            { key: 'failed', label: 'Failed' },
          ].map(({ key, label }) => {
            const config = statusConfig[key];
            const Icon = config.icon;
            return (
              <div key={key} className={`${config.color} rounded-lg p-3 border border-gray-200`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-medium text-gray-600">{label}</span>
                </div>
                <p className="text-xl font-bold text-gray-900">{stats[key]}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Status List */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Fax Status Tracker</CardTitle>
              <CardDescription>Real-time delivery status from the last 24 hours</CardDescription>
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              className="h-8 w-8"
            >
              <RefreshCw className="w-4 h-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin">
                <Clock className="w-6 h-6 text-indigo-600" />
              </div>
            </div>
          ) : faxLogs.length === 0 ? (
            <p className="text-center text-gray-500 py-6">No faxes sent in the last 24 hours</p>
          ) : (
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {faxLogs.map((fax) => {
                const status = fax.status?.toLowerCase() || 'pending';
                const config = statusConfig[status] || statusConfig.pending;
                const Icon = config.icon;
                const sentTime = new Date(fax.created_date);
                const now = new Date();
                const diffMinutes = Math.floor((now - sentTime) / 60000);
                let timeLabel = '';
                if (diffMinutes < 1) timeLabel = 'Just now';
                else if (diffMinutes < 60) timeLabel = `${diffMinutes}m ago`;
                else timeLabel = `${Math.floor(diffMinutes / 60)}h ago`;

                return (
                  <div
                    key={fax.id}
                    className={`${config.color} rounded-lg p-3 border border-gray-200 flex items-start justify-between gap-3 cursor-pointer hover:shadow-sm transition`}
                    onClick={() => setSelectedFax(fax)}
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Icon className="w-5 h-5 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-sm text-gray-900 truncate">
                          To: {fax.recipient_fax_number || 'Unknown'}
                        </p>
                        <p className="text-xs text-gray-600 mt-0.5">
                          {fax.document_name || 'Untitled'} · {timeLabel}
                        </p>
                        {fax.error_message && (
                          <p className="text-xs text-red-700 mt-1">{fax.error_message}</p>
                        )}
                      </div>
                    </div>
                    <span className={`${config.badge} text-xs font-semibold px-2 py-1 rounded-full whitespace-nowrap flex-shrink-0`}>
                      {config.label}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detail Modal */}
      {selectedFax && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle>Fax Details</CardTitle>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => dismissFax(selectedFax.id)}
                  className="h-6 w-6"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase">Recipient</p>
                <p className="text-sm font-semibold text-gray-900">{selectedFax.recipient_fax_number || 'Unknown'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase">Document</p>
                <p className="text-sm text-gray-900">{selectedFax.document_name || 'Untitled'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase">Status</p>
                <span className={`${statusConfig[selectedFax.status?.toLowerCase()]?.badge} text-xs font-semibold px-2 py-1 rounded inline-block mt-1`}>
                  {statusConfig[selectedFax.status?.toLowerCase()]?.label || 'Unknown'}
                </span>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-600 uppercase">Sent</p>
                <p className="text-sm text-gray-900">{new Date(selectedFax.created_date).toLocaleString()}</p>
              </div>
              {selectedFax.error_message && (
                <div className="bg-red-50 border border-red-200 rounded p-3">
                  <p className="text-xs font-medium text-red-900 uppercase mb-1">Error</p>
                  <p className="text-sm text-red-700">{selectedFax.error_message}</p>
                </div>
              )}
              {selectedFax.twilio_sid && (
                <div>
                  <p className="text-xs font-medium text-gray-600 uppercase">Tracking ID</p>
                  <p className="text-xs font-mono text-gray-600 break-all">{selectedFax.twilio_sid}</p>
                </div>
              )}
              <Button
                variant="outline"
                className="w-full"
                onClick={() => dismissFax(selectedFax.id)}
              >
                Close
              </Button>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
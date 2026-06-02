import { useEffect, useState, useMemo } from 'react';
import { openExternalUrl } from "@/components/utils/security";
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CheckCircle, AlertCircle, Clock, RefreshCw, Eye, Download, Search
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';

const STATUS_CONFIG = {
  queued: { icon: Clock, color: 'bg-yellow-100 text-yellow-800', label: 'Queued' },
  sending: { icon: Clock, color: 'bg-blue-100 text-blue-800', label: 'Sending' },
  sent: { icon: CheckCircle, color: 'bg-teal-100 text-teal-800', label: 'Sent' },
  delivered: { icon: CheckCircle, color: 'bg-green-100 text-green-800', label: 'Delivered' },
  failed: { icon: AlertCircle, color: 'bg-red-100 text-red-800', label: 'Failed' },
  retried: { icon: RefreshCw, color: 'bg-orange-100 text-orange-800', label: 'Retried' }
};

export default function FaxDashboard() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateRange, setDateRange] = useState('7days');
  const [expandedFaxId, setExpandedFaxId] = useState(null);

  // Fetch fax logs with real-time updates
  const { data: faxLogs = [], isLoading, error } = useQuery({
    queryKey: ['faxLogs'],
    queryFn: async () => {
      const logs = await base44.entities.FaxLog.list('-created_date', 100);
      return logs;
    },
    refetchInterval: 5000, // Poll every 5 seconds for status updates
    refetchOnWindowFocus: true
  });

  // Subscribe to real-time FaxLog updates
  useEffect(() => {
    const unsubscribe = base44.entities.FaxLog.subscribe((event) => {
      if (event.type === 'update') {
        queryClient.invalidateQueries({ queryKey: ['faxLogs'] });
      }
    });
    return unsubscribe;
  }, [queryClient]);

  // Retry mutation
  const retryMutation = useMutation({
    mutationFn: async (faxLogId) => {
      const response = await base44.functions.invoke('retryFailedFax', {
        fax_log_id: faxLogId
      });
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Fax retry #${data.retry_count} queued`);
      queryClient.invalidateQueries({ queryKey: ['faxLogs'] });
    },
    onError: (err) => {
      toast.error(err.message || 'Failed to retry fax');
    }
  });

  // Filter faxes
  const filteredFaxes = useMemo(() => {
    let filtered = faxLogs;

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(f => f.status === statusFilter);
    }

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(f =>
        f.to_number?.includes(searchTerm) ||
        f.to_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        f.document_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Date filter
    const now = new Date();
    let cutoffDate = new Date();
    if (dateRange === '24h') cutoffDate.setHours(cutoffDate.getHours() - 24);
    else if (dateRange === '7days') cutoffDate.setDate(cutoffDate.getDate() - 7);
    else if (dateRange === '30days') cutoffDate.setDate(cutoffDate.getDate() - 30);

    filtered = filtered.filter(f => new Date(f.created_date) >= cutoffDate);

    return filtered;
  }, [faxLogs, statusFilter, searchTerm, dateRange]);

  // Calculate stats
  const stats = useMemo(() => {
    const total = faxLogs.length;
    const delivered = faxLogs.filter(f => f.status === 'delivered').length;
    const failed = faxLogs.filter(f => f.status === 'failed').length;
    const pending = faxLogs.filter(f => ['queued', 'sending'].includes(f.status)).length;
    return { total, delivered, failed, pending };
  }, [faxLogs]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-slate-900 mb-2">Outbound Fax Dashboard</h1>
        <p className="text-slate-600">Track and monitor all faxes sent from PennSync</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-slate-500 text-sm mb-1">Total Sent</p>
              <p className="text-3xl font-bold text-slate-900">{stats.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-slate-500 text-sm mb-1">Delivered</p>
              <p className="text-3xl font-bold text-green-600">{stats.delivered}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-slate-500 text-sm mb-1">Pending</p>
              <p className="text-3xl font-bold text-blue-600">{stats.pending}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center">
              <p className="text-slate-500 text-sm mb-1">Failed</p>
              <p className="text-3xl font-bold text-red-600">{stats.failed}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Filters</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                placeholder="Search by number, name, or document..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="queued">Queued</SelectItem>
                <SelectItem value="sending">Sending</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
                <SelectItem value="retried">Retried</SelectItem>
              </SelectContent>
            </Select>

            {/* Date Range */}
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue placeholder="Last 7 days" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24h">Last 24 hours</SelectItem>
                <SelectItem value="7days">Last 7 days</SelectItem>
                <SelectItem value="30days">Last 30 days</SelectItem>
                <SelectItem value="all">All time</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Fax List */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            Fax History ({filteredFaxes.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <p className="text-slate-500">Loading faxes...</p>
            </div>
          ) : error ? (
            <div className="flex justify-center py-8">
              <p className="text-red-600">Failed to load faxes</p>
            </div>
          ) : filteredFaxes.length === 0 ? (
            <div className="flex justify-center py-8">
              <p className="text-slate-500">No faxes found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredFaxes.map((fax) => {
                const statusConfig = STATUS_CONFIG[fax.status] || STATUS_CONFIG.queued;
                const StatusIcon = statusConfig.icon;
                const isExpanded = expandedFaxId === fax.id;

                return (
                  <div key={fax.id} className="border border-slate-200 rounded-lg overflow-hidden hover:shadow-md transition-shadow">
                    {/* Main Row */}
                    <button
                      onClick={() => setExpandedFaxId(isExpanded ? null : fax.id)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-slate-50 transition-colors"
                    >
                      <StatusIcon className={`h-5 w-5 flex-shrink-0 ${statusConfig.color.split(' ')[1]}`} />

                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-slate-900 truncate">
                            {fax.to_name || 'Unknown Recipient'}
                          </p>
                          <Badge className={statusConfig.color}>
                            {statusConfig.label}
                          </Badge>
                          {fax.retry_count > 0 && (
                            <Badge variant="outline" className="ml-auto">
                              Retry #{fax.retry_count}
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-slate-500">{fax.to_number}</p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {fax.document_name} • {fax.pages || '?'} pages
                        </p>
                      </div>

                      <div className="text-right flex-shrink-0">
                        <p className="text-xs text-slate-500">
                          {new Date(fax.created_date).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-slate-400">
                          {new Date(fax.created_date).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>

                      <Eye className="h-4 w-4 text-slate-400 ml-2" />
                    </button>

                    {/* Expanded Details */}
                    {isExpanded && (
                      <div className="border-t border-slate-200 bg-slate-50 px-4 py-4 space-y-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-slate-500 text-xs uppercase mb-1">From</p>
                            <p className="font-medium text-slate-900">{fax.from_number}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs uppercase mb-1">To</p>
                            <p className="font-medium text-slate-900">{fax.to_number}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs uppercase mb-1">Pages</p>
                            <p className="font-medium text-slate-900">{fax.pages || 'Pending'}</p>
                          </div>
                          <div>
                            <p className="text-slate-500 text-xs uppercase mb-1">Priority</p>
                            <Badge className={
                              fax.priority === 'urgent'
                                ? 'bg-red-100 text-red-800'
                                : fax.priority === 'high'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-slate-100 text-slate-800'
                            }>
                              {fax.priority || 'normal'}
                            </Badge>
                          </div>
                        </div>

                        {fax.failure_reason && (
                          <div className="bg-red-50 border border-red-200 rounded p-3">
                            <p className="text-xs text-red-600 font-medium mb-1">Failure Reason</p>
                            <p className="text-sm text-red-700">{fax.failure_reason}</p>
                          </div>
                        )}

                        {fax.cover_page_details && (
                          <div className="bg-blue-50 border border-blue-200 rounded p-3">
                            <p className="text-xs text-blue-600 font-medium mb-1">Cover Sheet</p>
                            <p className="text-sm text-blue-700">
                              From: {fax.cover_page_details.sender_name || 'N/A'} • 
                              To: {fax.cover_page_details.recipient_name || 'N/A'}
                            </p>
                          </div>
                        )}

                        {fax.ocr_processed && (
                          <div className="bg-green-50 border border-green-200 rounded p-3">
                            <p className="text-xs text-green-600 font-medium mb-1">OCR Status</p>
                            <p className="text-sm text-green-700">
                              Confidence: {fax.ocr_confidence || 'N/A'}% • {fax.ocr_text?.substring(0, 100)}...
                            </p>
                          </div>
                        )}

                        <div className="flex gap-2 pt-2">
                          {fax.status === 'failed' && fax.retry_count < 3 && (
                            <Button
                              size="sm"
                              onClick={() => retryMutation.mutate(fax.id)}
                              disabled={retryMutation.isPending}
                              className="gap-1.5"
                            >
                              {retryMutation.isPending ? (
                                <>
                                  <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                                  Retrying...
                                </>
                              ) : (
                                <>
                                  <RefreshCw className="h-3.5 w-3.5" />
                                  Retry Fax
                                </>
                              )}
                            </Button>
                          )}
                          {fax.document_url && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openExternalUrl(fax.document_url)}
                              className="gap-1.5"
                            >
                              <Download className="h-3.5 w-3.5" />
                              View Document
                            </Button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
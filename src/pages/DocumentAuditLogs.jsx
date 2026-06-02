import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import DocumentAuditLogViewer from '@/components/documents/DocumentAuditLogViewer';
import { AlertCircle } from 'lucide-react';

export default function DocumentAuditLogs() {
  useEffect(() => {
    base44.analytics.track({
      eventName: 'document_audit_logs_page_viewed',
      properties: { page: 'DocumentAuditLogs' },
    });
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Document Audit Logs</h1>
        <p className="text-slate-600 mt-1">
          Track the complete history of document packages, including assignments, opens, and signatures.
        </p>
      </div>

      {/* Info Banner */}
      <div className="flex gap-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-blue-900">
          This audit log provides a complete read-only record of all document package activities for compliance and tracking purposes.
        </p>
      </div>

      <DocumentAuditLogViewer />
    </div>
  );
}
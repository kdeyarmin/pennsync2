import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import BulkDocumentPackageCreator from '@/components/documents/BulkDocumentPackageCreator';

export default function BulkSignatureRequests() {
  useEffect(() => {
    base44.analytics.track({
      eventName: 'bulk_signature_requests_page_viewed',
      properties: { page: 'BulkSignatureRequests' },
    });
  }, []);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-3xl font-bold text-slate-900">Bulk Signature Requests</h1>
        <p className="text-slate-600 mt-1">
          Send document signature requests to multiple patients at once using templates.
        </p>
      </div>

      <BulkDocumentPackageCreator />
    </div>
  );
}
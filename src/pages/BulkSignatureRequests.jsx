import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import BulkDocumentPackageCreator from '@/components/documents/BulkDocumentPackageCreator';
import PageContainer from '@/components/ui/PageContainer';
import PageHeader from '@/components/ui/PageHeader';
import { Pen } from 'lucide-react';

export default function BulkSignatureRequests() {
  useEffect(() => {
    base44.analytics.track({
      eventName: 'bulk_signature_requests_page_viewed',
      properties: { page: 'BulkSignatureRequests' },
    });
  }, []);

  return (
    <PageContainer>
      <PageHeader
        icon={Pen}
        eyebrow="Documentation"
        title="Bulk Signature Requests"
        description="Send document signature requests to multiple patients at once using templates."
        favoritePage="BulkSignatureRequests"
      />
      <BulkDocumentPackageCreator />
    </PageContainer>
  );
}

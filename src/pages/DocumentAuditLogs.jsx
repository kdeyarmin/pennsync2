import { useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import DocumentAuditLogViewer from '@/components/documents/DocumentAuditLogViewer';
import { Archive } from 'lucide-react';
import PageContainer from '@/components/ui/PageContainer';
import PageHeader from '@/components/ui/PageHeader';

export default function DocumentAuditLogs() {
  useEffect(() => {
    base44.analytics.track({
      eventName: 'document_audit_logs_page_viewed',
      properties: { page: 'DocumentAuditLogs' },
    });
  }, []);

  return (
    <PageContainer>
      <PageHeader
        icon={Archive}
        eyebrow="Documentation"
        title="Document Audit Logs"
        description="Track the complete history of document packages, including assignments, opens, and signatures."
        favoritePage="DocumentAuditLogs"
      />

      <DocumentAuditLogViewer />
    </PageContainer>
  );
}
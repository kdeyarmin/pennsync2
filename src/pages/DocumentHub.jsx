import { lazy, Suspense, useEffect, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, FileText, Pen, FolderOpen, ClipboardCheck, BarChart3, BookOpen, Archive, Loader2,
} from "lucide-react";
import PageHeader from "@/components/ui/PageHeader";
import PageContainer from "@/components/ui/PageContainer";
import TemplateLibrary from "@/components/documents/TemplateLibrary";
import PDFTemplateBuilder from "@/components/documents/PDFTemplateBuilder";
import DocumentAnalytics from "@/components/documents/DocumentAnalytics";
import { isSuperAdmin } from "@/lib/superAdmin";

const DocumentSignatures = lazy(() => import("@/pages/DocumentSignatures"));
const CreateSignatureRequest = lazy(() => import("@/pages/CreateSignatureRequest"));
const BulkSignatureRequests = lazy(() => import("@/pages/BulkSignatureRequests"));
const DocumentManagement = lazy(() => import("@/pages/DocumentManagement"));
const DocumentIngestion = lazy(() => import("@/pages/DocumentIngestion"));
const DischargeSummaries = lazy(() => import("@/pages/DischargeSummaries"));
const DocumentAuditLogs = lazy(() => import("@/pages/DocumentAuditLogs"));

// Hub tab keys, kept in sync with the TabsTrigger values below. Used to validate
// the ?tab= deep-link so the retired standalone pages (Document Signatures,
// Document Management, Discharge Summaries, etc.) can redirect straight to the
// right tab. "audit" is admin-only and is appended at render time.
const TAB_KEYS = ["signatures", "documents", "discharge", "library", "analytics"];

const SpokeFallback = (
  <div className="flex justify-center py-12">
    <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
  </div>
);

export default function DocumentHub() {
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === 'admin' || isSuperAdmin(currentUser);

  const validTabKeys = isAdmin ? [...TAB_KEYS, "audit"] : TAB_KEYS;

  const [searchParams, setSearchParams] = useSearchParams();
  const requestedTab = searchParams.get("tab");
  const activeTab = validTabKeys.includes(requestedTab) ? requestedTab : "signatures";

  // Reflect the active tab in the URL so hub tabs are shareable/bookmarkable and
  // redirects from the retired pages deep-link correctly. "signatures" is the
  // default, so it stays a clean /DocumentHub with no query string.
  const handleTabChange = (value) => {
    setSearchParams(value === "signatures" ? {} : { tab: value });
  };

  // Converge on the canonical URL: strip a redundant or unknown ?tab= (e.g. a
  // bookmarked ?tab=signatures, or a stale/forbidden tab key) so the default tab
  // is plain /DocumentHub. Only fires when the param resolved to the default tab,
  // so a valid deep-link like ?tab=discharge is left untouched.
  useEffect(() => {
    if (requestedTab !== null && activeTab === "signatures") {
      setSearchParams({}, { replace: true });
    }
  }, [requestedTab, activeTab, setSearchParams]);

  return (
    <PageContainer>
      <PageHeader
        icon={FileText}
        eyebrow="Documentation"
        title="Document Hub"
        description="Manage signatures, documents, discharge summaries, templates, and analytics"
        favoritePage="DocumentHub"
        actions={activeTab === "library" && isAdmin && (
          <Button
            onClick={() => setShowTemplateBuilder(true)}
            variant="outline"
            className="w-full sm:w-auto min-h-[44px]"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Template
          </Button>
        )}
      />

      <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-6">
        <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
          <TabsList className="inline-flex w-max min-w-full gap-1 h-auto p-1">
            <TabsTrigger value="signatures" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
              <Pen className="h-4 w-4 mr-2" />
              Signatures
            </TabsTrigger>
            <TabsTrigger value="documents" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
              <FolderOpen className="h-4 w-4 mr-2" />
              Documents
            </TabsTrigger>
            <TabsTrigger value="discharge" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
              <ClipboardCheck className="h-4 w-4 mr-2" />
              Discharge Summaries
            </TabsTrigger>
            <TabsTrigger value="library" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
              <BookOpen className="h-4 w-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="analytics" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="audit" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
                <Archive className="h-4 w-4 mr-2" />
                Audit Logs
              </TabsTrigger>
            )}
          </TabsList>
        </div>

        {/* Signatures Tab — All / Create / Bulk sub-tabs */}
        <TabsContent value="signatures" className="space-y-6">
          <Tabs defaultValue="all" className="space-y-4">
            <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
              <TabsList className="inline-flex w-max min-w-full gap-1 h-auto p-1">
                <TabsTrigger value="all" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
                  All Signatures
                </TabsTrigger>
                <TabsTrigger value="create" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
                  Create
                </TabsTrigger>
                <TabsTrigger value="bulk" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
                  Bulk
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="all">
              <Suspense fallback={SpokeFallback}>
                <DocumentSignatures />
              </Suspense>
            </TabsContent>
            <TabsContent value="create">
              <Suspense fallback={SpokeFallback}>
                <CreateSignatureRequest />
              </Suspense>
            </TabsContent>
            <TabsContent value="bulk">
              <Suspense fallback={SpokeFallback}>
                <BulkSignatureRequests />
              </Suspense>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Documents Tab — Storage / Intake sub-tabs */}
        <TabsContent value="documents" className="space-y-6">
          <Tabs defaultValue="storage" className="space-y-4">
            <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
              <TabsList className="inline-flex w-max min-w-full gap-1 h-auto p-1">
                <TabsTrigger value="storage" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
                  Storage
                </TabsTrigger>
                <TabsTrigger value="intake" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
                  Intake
                </TabsTrigger>
              </TabsList>
            </div>
            <TabsContent value="storage">
              <Suspense fallback={SpokeFallback}>
                <DocumentManagement />
              </Suspense>
            </TabsContent>
            <TabsContent value="intake">
              <Suspense fallback={SpokeFallback}>
                <DocumentIngestion />
              </Suspense>
            </TabsContent>
          </Tabs>
        </TabsContent>

        {/* Discharge Summaries Tab */}
        <TabsContent value="discharge" className="space-y-6">
          <Suspense fallback={SpokeFallback}>
            <DischargeSummaries />
          </Suspense>
        </TabsContent>

        {/* Templates Tab */}
        <TabsContent value="library" className="space-y-6">
          <TemplateLibrary />

          <PDFTemplateBuilder
            open={showTemplateBuilder}
            onClose={() => setShowTemplateBuilder(false)}
          />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <DocumentAnalytics />
        </TabsContent>

        {/* Audit Logs Tab (Admin Only) */}
        {isAdmin && (
          <TabsContent value="audit" className="space-y-6">
            <Suspense fallback={SpokeFallback}>
              <DocumentAuditLogs />
            </Suspense>
          </TabsContent>
        )}
      </Tabs>
    </PageContainer>
  );
}

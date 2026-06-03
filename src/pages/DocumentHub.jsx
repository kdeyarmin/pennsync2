import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus, FileText
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import PageHeader from "@/components/ui/PageHeader";
import PageContainer from "@/components/ui/PageContainer";
import DocumentManagementDashboard from "@/components/documents/DocumentManagementDashboard";
import DocumentPackageCreator from "@/components/documents/DocumentPackageCreator";
import SignatureTracking from "@/components/documents/SignatureTracking";
import TemplateLibrary from "@/components/documents/TemplateLibrary";
import PDFTemplateBuilder from "@/components/documents/PDFTemplateBuilder";
import DocumentAnalytics from "@/components/documents/DocumentAnalytics";
import { getNormalizedSignatureStatus, isSignatureOverdue } from "@/components/signature/signatureUtils";

export default function DocumentHub() {
  const [activeTab, setActiveTab] = useState("signatures");
  const [showPackageCreator, setShowPackageCreator] = useState(false);
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
  const navigate = useNavigate();

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allSignatures = [] } = useQuery({
    queryKey: ['all-signatures'],
    queryFn: () => base44.entities.DocumentSignature.list('-created_date', 200),
    initialData: [],
  });

  const normalizedSignatures = useMemo(() => allSignatures.map((signature) => ({
    ...signature,
    normalizedStatus: getNormalizedSignatureStatus(signature),
    isOverdue: isSignatureOverdue(signature),
  })), [allSignatures]);

  const stats = useMemo(() => ({
    pending: normalizedSignatures.filter((signature) => signature.normalizedStatus !== 'signed').length,
    signed: normalizedSignatures.filter((signature) => signature.normalizedStatus === 'signed').length,
    overdue: normalizedSignatures.filter((signature) => signature.isOverdue).length,
  }), [normalizedSignatures]);

  return (
    <PageContainer>
      <PageHeader
        icon={FileText}
        eyebrow="Documentation"
        title="Document Hub"
        description="Manage signatures, templates, and patient documents"
        favoritePage="DocumentHub"
        actions={activeTab === "signatures" && (
          <>
            <Button
              onClick={() => navigate('/CreateSignatureRequest')}
              className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 min-h-[44px]"
            >
              <Plus className="w-4 h-4 mr-2" />
              Send for Signature
            </Button>
            {currentUser?.role === 'admin' && (
              <Button
                onClick={() => setShowTemplateBuilder(true)}
                variant="outline"
                className="w-full sm:w-auto min-h-[44px]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Template
              </Button>
            )}
          </>
        )}
      />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1 h-auto p-1">
          <TabsTrigger value="signatures" className="relative min-h-[44px] text-sm">
            Signatures
            {stats.pending > 0 && (
              <span className="absolute -top-1 -right-1 bg-yellow-500 text-white text-xs rounded-full px-2 py-0.5 min-w-[20px] text-center">
                {stats.pending}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="documents" className="min-h-[44px] text-sm">
            Documents
          </TabsTrigger>
          {currentUser?.role === 'admin' && (
            <TabsTrigger value="library" className="min-h-[44px] text-sm col-span-2 sm:col-span-1">
              Document Library
            </TabsTrigger>
          )}
          <TabsTrigger value="analytics" className="min-h-[44px] text-sm col-span-2 sm:col-span-1">
            Analytics
          </TabsTrigger>
        </TabsList>

        {/* Signatures Tab */}
        <TabsContent value="signatures" className="space-y-6">
          <SignatureTracking stats={stats} />
          
          <DocumentPackageCreator
            open={showPackageCreator}
            onClose={() => setShowPackageCreator(false)}
          />
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <DocumentManagementDashboard />
        </TabsContent>

        {/* Library Tab (Admin Only) */}
        {currentUser?.role === 'admin' && (
          <TabsContent value="library" className="space-y-6">
            <TemplateLibrary />
            
            <PDFTemplateBuilder
              open={showTemplateBuilder}
              onClose={() => setShowTemplateBuilder(false)}
            />
          </TabsContent>
        )}

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <DocumentAnalytics />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
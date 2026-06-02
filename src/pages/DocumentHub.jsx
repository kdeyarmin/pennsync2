<<<<<<< HEAD
import { useState } from "react";
=======
import { useMemo, useState } from "react";
>>>>>>> origin/main
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
<<<<<<< HEAD
  Plus
} from "lucide-react";
import { useNavigate } from "react-router-dom";
=======
  Plus, FileText
} from "lucide-react";
>>>>>>> origin/main
import DocumentManagementDashboard from "@/components/documents/DocumentManagementDashboard";
import DocumentPackageCreator from "@/components/documents/DocumentPackageCreator";
import SignatureTracking from "@/components/documents/SignatureTracking";
import TemplateLibrary from "@/components/documents/TemplateLibrary";
import PDFTemplateBuilder from "@/components/documents/PDFTemplateBuilder";
<<<<<<< HEAD
import DocumentAnalytics from "@/components/documents/DocumentAnalytics";
=======
import { getNormalizedSignatureStatus, isSignatureOverdue } from "@/components/signature/signatureUtils";
>>>>>>> origin/main

export default function DocumentHub() {
  const [activeTab, setActiveTab] = useState("signatures");
  const [showPackageCreator, setShowPackageCreator] = useState(false);
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);
<<<<<<< HEAD
  const navigate = useNavigate();
=======
>>>>>>> origin/main

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allSignatures = [] } = useQuery({
    queryKey: ['all-signatures'],
    queryFn: () => base44.entities.DocumentSignature.list('-created_date', 200),
    initialData: [],
  });

<<<<<<< HEAD
  const stats = {
    pending: allSignatures.filter(s => s.status === 'pending').length,
    signed: allSignatures.filter(s => s.status === 'signed').length,
    overdue: allSignatures.filter(s => 
      s.status === 'pending' && s.due_date && new Date(s.due_date) < new Date()
    ).length,
  };

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Document Hub</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Manage signatures, templates, and patient documents
          </p>
        </div>
=======
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
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <div className="page-header-gradient bg-gradient-to-r from-slate-700 via-blue-700 to-indigo-800 mb-1">
        <div className="relative z-10 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 bg-white/10 backdrop-blur rounded-2xl flex items-center justify-center flex-shrink-0">
              <FileText className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-white">Document Hub</h1>
              <p className="text-blue-200 mt-1">Manage signatures, templates, and patient documents</p>
            </div>
          </div>
>>>>>>> origin/main
        <div className="flex flex-wrap gap-2">
          {activeTab === "signatures" && (
            <>
              <Button 
<<<<<<< HEAD
                onClick={() => navigate('/CreateSignatureRequest')}
=======
                onClick={() => setShowPackageCreator(true)}
>>>>>>> origin/main
                className="w-full sm:w-auto bg-indigo-600 hover:bg-indigo-700 min-h-[44px]"
              >
                <Plus className="w-4 h-4 mr-2" />
                Send for Signature
              </Button>
              {currentUser?.role === 'admin' && (
                <Button 
<<<<<<< HEAD
                  onClick={() => setShowTemplateBuilder(true)}
=======
                  onClick={() => {
                    setActiveTab('templates');
                    setShowTemplateBuilder(true);
                  }}
>>>>>>> origin/main
                  variant="outline"
                  className="w-full sm:w-auto min-h-[44px]"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Template
                </Button>
              )}
            </>
          )}
        </div>
      </div>
<<<<<<< HEAD

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 gap-1 h-auto p-1">
=======
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 gap-1 h-auto p-1">
>>>>>>> origin/main
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
<<<<<<< HEAD
            <TabsTrigger value="library" className="min-h-[44px] text-sm col-span-2 sm:col-span-1">
              Document Library
            </TabsTrigger>
          )}
          <TabsTrigger value="analytics" className="min-h-[44px] text-sm col-span-2 sm:col-span-1">
            Analytics
          </TabsTrigger>
=======
            <TabsTrigger value="templates" className="min-h-[44px] text-sm col-span-2 sm:col-span-1">
              Templates
            </TabsTrigger>
          )}
>>>>>>> origin/main
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

<<<<<<< HEAD
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
    </div>
  );
}
=======
        {/* Templates Tab (Admin Only) */}
        {currentUser?.role === 'admin' && (
          <TabsContent value="templates" className="space-y-6">
            <TemplateLibrary />
            
          </TabsContent>
        )}
      </Tabs>

      <PDFTemplateBuilder
        open={showTemplateBuilder}
        onClose={() => setShowTemplateBuilder(false)}
      />
    </div>
  );
}
>>>>>>> origin/main

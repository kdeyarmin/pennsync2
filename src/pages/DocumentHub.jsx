import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Plus
} from "lucide-react";
import DocumentManagementDashboard from "@/components/documents/DocumentManagementDashboard";
import DocumentPackageCreator from "@/components/documents/DocumentPackageCreator";
import SignatureTracking from "@/components/documents/SignatureTracking";
import TemplateLibrary from "@/components/documents/TemplateLibrary";
import PDFTemplateBuilder from "@/components/documents/PDFTemplateBuilder";

export default function DocumentHub() {
  const [activeTab, setActiveTab] = useState("signatures");
  const [showPackageCreator, setShowPackageCreator] = useState(false);
  const [showTemplateBuilder, setShowTemplateBuilder] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allSignatures = [] } = useQuery({
    queryKey: ['all-signatures'],
    queryFn: () => base44.entities.DocumentSignature.list('-created_date', 200),
    initialData: [],
  });

  const stats = {
    pending: allSignatures.filter(s => s.status === 'pending').length,
    signed: allSignatures.filter(s => s.status === 'signed').length,
    overdue: allSignatures.filter(s => 
      s.status === 'pending' && s.due_date && new Date(s.due_date) < new Date()
    ).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Document Hub</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Manage signatures, templates, and patient documents
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {activeTab === "signatures" && (
            <>
              <Button 
                onClick={() => setShowPackageCreator(true)}
                className="w-full sm:w-auto"
              >
                <Plus className="w-4 h-4 mr-2" />
                Send for Signature
              </Button>
              {currentUser?.role === 'admin' && (
                <Button 
                  onClick={() => setShowTemplateBuilder(true)}
                  variant="outline"
                  className="w-full sm:w-auto"
                >
                  <Plus className="w-4 h-4 mr-2" />
                  Create Template
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="signatures" className="relative">
            Signatures
            {stats.pending > 0 && (
              <span className="absolute top-0 right-0 bg-yellow-500 text-white text-xs rounded-full px-2 py-0.5">
                {stats.pending}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="documents">
            Documents
          </TabsTrigger>
          {currentUser?.role === 'admin' && (
            <TabsTrigger value="templates">
              Templates
            </TabsTrigger>
          )}
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

        {/* Templates Tab (Admin Only) */}
        {currentUser?.role === 'admin' && (
          <TabsContent value="templates" className="space-y-6">
            <TemplateLibrary />
            
            <PDFTemplateBuilder
              open={showTemplateBuilder}
              onClose={() => setShowTemplateBuilder(false)}
            />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
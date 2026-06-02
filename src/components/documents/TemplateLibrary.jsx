import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
<<<<<<< HEAD
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
=======
>>>>>>> origin/main
import {
  FileText,
  Trash2,
  Search,
  Archive,
<<<<<<< HEAD
  AlertTriangle,
  Upload
} from "lucide-react";
import { toast } from "sonner";
=======
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";


>>>>>>> origin/main
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
<<<<<<< HEAD
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
=======
>>>>>>> origin/main

export default function TemplateLibrary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
<<<<<<< HEAD
  const [selectedItem, setSelectedItem] = useState(null); // { id, type: 'template' | 'document' }
  const [activeTab, setActiveTab] = useState("templates");
  
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadData, setUploadData] = useState({
    title: '',
    description: '',
    category: 'other',
    file: null
  });
  const [isUploading, setIsUploading] = useState(false);

  const queryClient = useQueryClient();

  const { data: templates = [], isLoading: isLoadingTemplates } = useQuery({
=======
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
>>>>>>> origin/main
    queryKey: ['pdfTemplates'],
    queryFn: () => base44.entities.PDFTemplate.list('-created_date', 100),
    initialData: []
  });

<<<<<<< HEAD
  const { data: documents = [], isLoading: isLoadingDocs } = useQuery({
    queryKey: ['libraryDocuments'],
    queryFn: () => base44.entities.LibraryDocument.list('-created_date', 100),
    initialData: []
  });

  const deleteMutation = useMutation({
    mutationFn: (item) => {
      if (item.type === 'template') {
        return base44.entities.PDFTemplate.delete(item.id);
      } else {
        return base44.entities.LibraryDocument.delete(item.id);
      }
    },
    onSuccess: (_, item) => {
      queryClient.invalidateQueries({ queryKey: item.type === 'template' ? ['pdfTemplates'] : ['libraryDocuments'] });
      toast.success('Deleted successfully');
      setShowDeleteDialog(false);
      setSelectedItem(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete: ${error.message}`);
=======
  const deleteTemplateMutation = useMutation({
    mutationFn: (templateId) => base44.entities.PDFTemplate.delete(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdfTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['pdf-templates-active'] });
      toast.success('Template deleted successfully');
      setShowDeleteDialog(false);
      setSelectedTemplate(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete template: ${error.message}`);
>>>>>>> origin/main
    }
  });

  const toggleActiveMutation = useMutation({
<<<<<<< HEAD
    mutationFn: (item) => {
      if (item.type === 'template') {
        const template = templates.find(t => t.id === item.id);
        return base44.entities.PDFTemplate.update(item.id, {
          is_active: !template?.is_active
        });
      } else {
        const doc = documents.find(d => d.id === item.id);
        return base44.entities.LibraryDocument.update(item.id, {
          is_active: !doc?.is_active
        });
      }
    },
    onSuccess: (_, item) => {
      queryClient.invalidateQueries({ queryKey: item.type === 'template' ? ['pdfTemplates'] : ['libraryDocuments'] });
      toast.success('Status updated');
    },
    onError: (error) => {
      toast.error(`Failed to update: ${error.message}`);
    }
  });

  const handleUpload = async () => {
    if (!uploadData.title || !uploadData.file) {
      toast.error("Please provide a title and select a file");
      return;
    }
    
    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file: uploadData.file });
      await base44.entities.LibraryDocument.create({
        title: uploadData.title,
        description: uploadData.description,
        category: uploadData.category,
        file_url,
        file_type: uploadData.file.name.split('.').pop()
      });
      toast.success("Document uploaded successfully");
      setShowUploadModal(false);
      setUploadData({ title: '', description: '', category: 'other', file: null });
      queryClient.invalidateQueries({ queryKey: ['libraryDocuments'] });
    } catch (error) {
      toast.error("Upload failed: " + error.message);
    } finally {
      setIsUploading(false);
    }
  };

=======
    mutationFn: (templateId) => {
      const template = templates.find(t => t.id === templateId);
      return base44.entities.PDFTemplate.update(templateId, {
        is_active: !template?.is_active
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdfTemplates'] });
      queryClient.invalidateQueries({ queryKey: ['pdf-templates-active'] });
      toast.success('Template status updated');
    },
    onError: (error) => {
      toast.error(`Failed to update template: ${error.message}`);
    }
  });

>>>>>>> origin/main
  const filteredTemplates = templates.filter(template =>
    template.template_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

<<<<<<< HEAD
  const filteredDocs = documents.filter(doc =>
    doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    doc.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const templateCategoryColor = (category) => {
=======
  const categoryColor = (category) => {
>>>>>>> origin/main
    const colors = {
      consent: 'bg-blue-100 text-blue-800',
      assessment: 'bg-purple-100 text-purple-800',
      care_plan: 'bg-green-100 text-green-800',
      discharge: 'bg-orange-100 text-orange-800',
      admission: 'bg-cyan-100 text-cyan-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors.other;
  };

<<<<<<< HEAD
  const docCategoryColor = (category) => {
    const colors = {
      policy: 'bg-red-100 text-red-800',
      procedure: 'bg-yellow-100 text-yellow-800',
      form: 'bg-blue-100 text-blue-800',
      education: 'bg-green-100 text-green-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[category] || colors.other;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-3 justify-between items-start sm:items-center">
        <div className="relative w-full sm:w-96">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search templates & documents..."
=======
  return (
    <div className="space-y-6">
      {/* Header with Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search templates..."
>>>>>>> origin/main
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
<<<<<<< HEAD
        <div className="flex gap-2">
          <Button onClick={() => setShowUploadModal(true)} className="bg-white text-gray-900 border hover:bg-gray-50">
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="templates">PDF Templates ({templates.length})</TabsTrigger>
          <TabsTrigger value="documents">Common Documents ({documents.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="pt-4">
          {filteredTemplates.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="flex flex-col hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{template.template_name}</CardTitle>
                        <Badge className={`mt-2 ${templateCategoryColor(template.template_category)}`}>
                          {template.template_category}
                        </Badge>
                      </div>
                      {!template.is_active && (
                        <Archive className="w-5 h-5 text-gray-400 shrink-0" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-3">
                    {template.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
                    )}
                    
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>Version: {template.version}</p>
                      <p>Used {template.usage_count || 0} times</p>
                      {template.signature_fields?.length > 0 && (
                        <p>{template.signature_fields.length} signature field(s)</p>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => window.open(template.template_file_url, '_blank')}
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        title={template.is_active ? 'Archive template' : 'Activate template'}
                        onClick={() => toggleActiveMutation.mutate({ id: template.id, type: 'template' })}
                      >
                        <Archive className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setSelectedItem({ id: template.id, type: 'template', name: template.template_name });
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">
                  {searchQuery ? 'No templates match your search' : 'No templates created yet'}
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="documents" className="pt-4">
          {filteredDocs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredDocs.map((doc) => (
                <Card key={doc.id} className="flex flex-col hover:shadow-lg transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base truncate">{doc.title}</CardTitle>
                        <Badge className={`mt-2 ${docCategoryColor(doc.category)}`}>
                          {doc.category}
                        </Badge>
                      </div>
                      {!doc.is_active && (
                        <Archive className="w-5 h-5 text-gray-400 shrink-0" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 space-y-3">
                    {doc.description && (
                      <p className="text-sm text-gray-600 line-clamp-2">{doc.description}</p>
                    )}
                    
                    <div className="text-xs text-gray-500 space-y-1">
                      <p>Type: {doc.file_type?.toUpperCase()}</p>
                      <p>Added: {new Date(doc.created_date).toLocaleDateString()}</p>
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        onClick={() => window.open(doc.file_url, '_blank')}
                      >
                        <FileText className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1"
                        title={doc.is_active ? 'Archive document' : 'Activate document'}
                        onClick={() => toggleActiveMutation.mutate({ id: doc.id, type: 'document' })}
                      >
                        <Archive className="w-4 h-4" />
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="flex-1 text-red-600 hover:bg-red-50"
                        onClick={() => {
                          setSelectedItem({ id: doc.id, type: 'document', name: doc.title });
                          setShowDeleteDialog(true);
                        }}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="text-center py-12">
                <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-600">
                  {searchQuery ? 'No documents match your search' : 'No common documents uploaded yet'}
                </p>
                <Button onClick={() => setShowUploadModal(true)} variant="outline" className="mt-4">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload First Document
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
=======
      </div>

      {/* Templates Grid */}
      {filteredTemplates.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template) => (
            <Card key={template.id} className="flex flex-col hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base truncate">{template.template_name}</CardTitle>
                    <Badge className={`mt-2 ${categoryColor(template.template_category)}`}>
                      {template.template_category}
                    </Badge>
                  </div>
                  {!template.is_active && (
                    <Archive className="w-5 h-5 text-gray-400 shrink-0" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-3">
                {template.description && (
                  <p className="text-sm text-gray-600 line-clamp-2">{template.description}</p>
                )}
                
                <div className="text-xs text-gray-500 space-y-1">
                  <p>Version: {template.version}</p>
                  <p>{template.is_packet ? `${template.document_count || template.packet_documents?.length || 1} documents in packet` : 'Single document template'}</p>
                  <p>Used {template.usage_count || 0} times</p>
                  {template.signature_fields?.length > 0 && (
                    <p>{template.signature_fields.length} signature field(s)</p>
                  )}
                  {template.carry_forward_fields?.length > 0 && (
                    <p>{template.carry_forward_fields.length} patient carry-forward field(s)</p>
                  )}
                </div>

                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => window.open(template.template_file_url, '_blank')}
                  >
                    <FileText className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    title={template.is_active ? 'Archive template' : 'Activate template'}
                    onClick={() => toggleActiveMutation.mutate(template.id)}
                  >
                    <Archive className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setSelectedTemplate(template);
                      setShowDeleteDialog(true);
                    }}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">
              {searchQuery ? 'No templates match your search' : 'No templates created yet'}
            </p>
          </CardContent>
        </Card>
      )}
>>>>>>> origin/main

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
<<<<<<< HEAD
            Confirm Deletion
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{selectedItem?.name}"? This action cannot be undone.
=======
            Delete Template
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{selectedTemplate?.template_name}"? This action cannot be undone.
>>>>>>> origin/main
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
<<<<<<< HEAD
              onClick={() => selectedItem && deleteMutation.mutate(selectedItem)}
=======
              onClick={() => selectedTemplate && deleteTemplateMutation.mutate(selectedTemplate.id)}
>>>>>>> origin/main
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
<<<<<<< HEAD

      {/* Upload Modal */}
      <Dialog open={showUploadModal} onOpenChange={setShowUploadModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Common Document</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Document Title</Label>
              <Input 
                value={uploadData.title}
                onChange={(e) => setUploadData({...uploadData, title: e.target.value})}
                placeholder="e.g. Employee Handbook"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Input 
                value={uploadData.description}
                onChange={(e) => setUploadData({...uploadData, description: e.target.value})}
                placeholder="Brief description of this document"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={uploadData.category} onValueChange={(v) => setUploadData({...uploadData, category: v})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="policy">Policy</SelectItem>
                  <SelectItem value="procedure">Procedure</SelectItem>
                  <SelectItem value="form">Form</SelectItem>
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>File (PDF, DOCX, etc.)</Label>
              <Input 
                type="file" 
                onChange={(e) => setUploadData({...uploadData, file: e.target.files[0]})}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadModal(false)}>Cancel</Button>
            <Button onClick={handleUpload} disabled={isUploading || !uploadData.file || !uploadData.title}>
              {isUploading ? "Uploading..." : "Upload Document"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
=======
>>>>>>> origin/main
    </div>
  );
}
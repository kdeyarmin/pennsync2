import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Trash2,
  Search,
  Archive,
  AlertTriangle
} from "lucide-react";
import { toast } from "sonner";


import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function TemplateLibrary() {
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ['pdfTemplates'],
    queryFn: () => base44.entities.PDFTemplate.list('-created_date', 100),
    initialData: []
  });

  const deleteTemplateMutation = useMutation({
    mutationFn: (templateId) => base44.entities.PDFTemplate.delete(templateId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdfTemplates'] });
      toast.success('Template deleted successfully');
      setShowDeleteDialog(false);
      setSelectedTemplate(null);
    },
    onError: (error) => {
      toast.error(`Failed to delete template: ${error.message}`);
    }
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (templateId) => {
      const template = templates.find(t => t.id === templateId);
      return base44.entities.PDFTemplate.update(templateId, {
        is_active: !template?.is_active
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdfTemplates'] });
      toast.success('Template status updated');
    },
    onError: (error) => {
      toast.error(`Failed to update template: ${error.message}`);
    }
  });

  const filteredTemplates = templates.filter(template =>
    template.template_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const categoryColor = (category) => {
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

  return (
    <div className="space-y-6">
      {/* Header with Search */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            placeholder="Search templates..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
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

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Delete Template
          </AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete "{selectedTemplate?.template_name}"? This action cannot be undone.
          </AlertDialogDescription>
          <div className="flex gap-3 justify-end">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => selectedTemplate && deleteTemplateMutation.mutate(selectedTemplate.id)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
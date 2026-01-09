import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Package, 
  Plus, 
  Trash2,
  CheckSquare,
  Square,
  Send,
  Upload,
  File,
  X
} from "lucide-react";
import { toast } from "sonner";
import SearchablePatientSelect from "../ui/SearchablePatientSelect";

export default function DocumentPackageCreator({ open, onClose }) {
  const queryClient = useQueryClient();
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [packageName, setPackageName] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [selectedDocuments, setSelectedDocuments] = useState([]);
  const [uploadedFiles, setUploadedFiles] = useState([]);

  const { data: templates = [] } = useQuery({
    queryKey: ['pdf-templates-active'],
    queryFn: () => base44.entities.PDFTemplate.filter({ is_active: true }),
    initialData: [],
    enabled: open
  });

  const createPackageMutation = useMutation({
    mutationFn: async (packageData) => {
      const signaturePromises = [];
      
      // Create document signatures for each template
      selectedDocuments.forEach(templateId => {
        const template = templates.find(t => t.id === templateId);
        signaturePromises.push(
          base44.entities.DocumentSignature.create({
            patient_id: selectedPatient,
            document_type: template.template_category,
            document_name: template.template_name,
            original_pdf_url: template.template_file_url,
            status: 'pending',
            required_signatures: template.signature_fields || [],
            due_date: dueDate || null
          })
        );
      });

      // Create document signatures for uploaded files
      for (const file of uploadedFiles) {
        const { file_url } = await base44.integrations.Core.UploadFile({ file: file.file });
        signaturePromises.push(
          base44.entities.DocumentSignature.create({
            patient_id: selectedPatient,
            document_type: 'other',
            document_name: file.name,
            original_pdf_url: file_url,
            status: 'pending',
            required_signatures: [],
            due_date: dueDate || null
          })
        );
      }

      const signatures = await Promise.all(signaturePromises);
      const signatureIds = signatures.map(s => s.id);

      // Create the package
      const pkg = await base44.entities.DocumentPackage.create({
        package_name: packageName,
        patient_id: selectedPatient,
        document_signatures: signatureIds,
        status: 'pending',
        due_date: dueDate || null,
        sent_to_patient_at: new Date().toISOString()
      });

      return pkg;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['document-packages'] });
      queryClient.invalidateQueries({ queryKey: ['document-signatures-dashboard'] });
      toast.success("Document package created successfully!");
      resetForm();
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to create package: ${error.message}`);
    }
  });

  const resetForm = () => {
    setSelectedPatient(null);
    setPackageName('');
    setDueDate('');
    setSelectedDocuments([]);
    setUploadedFiles([]);
  };

  const toggleDocument = (templateId) => {
    setSelectedDocuments(prev => 
      prev.includes(templateId)
        ? prev.filter(id => id !== templateId)
        : [...prev, templateId]
    );
  };

  const handleCreate = () => {
    if (!selectedPatient || !packageName || (selectedDocuments.length === 0 && uploadedFiles.length === 0)) {
      toast.error("Please fill in all required fields and select or upload at least one document");
      return;
    }

    createPackageMutation.mutate();
  };

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    const pdfFiles = files.filter(file => file.type === 'application/pdf');
    
    if (pdfFiles.length !== files.length) {
      toast.error("Only PDF files are allowed");
    }
    
    const newFiles = pdfFiles.map(file => ({
      id: Math.random().toString(36).substr(2, 9),
      name: file.name,
      file: file
    }));
    
    setUploadedFiles(prev => [...prev, ...newFiles]);
  };

  const removeUploadedFile = (fileId) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== fileId));
  };

  // Preset packages
  const presets = {
    admission: {
      name: 'Admission Onboarding',
      categories: ['consent', 'admission']
    },
    consent: {
      name: 'Consent Packet',
      categories: ['consent']
    },
    discharge: {
      name: 'Discharge Package',
      categories: ['discharge']
    },
    assessment: {
      name: 'Full Assessment',
      categories: ['assessment', 'care_plan']
    }
  };

  const applyPreset = (preset) => {
    const presetTemplates = templates.filter(t => 
      preset.categories.includes(t.template_category)
    ).map(t => t.id);
    
    setPackageName(preset.name);
    setSelectedDocuments(presetTemplates);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-4 sm:p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg sm:text-xl">
            <Package className="w-5 h-5" />
            Create Document Package
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 sm:space-y-6">
          {/* Patient Selection */}
          <div>
            <Label>Patient *</Label>
            <SearchablePatientSelect
              value={selectedPatient}
              onChange={setSelectedPatient}
            />
          </div>

          {/* Package Name */}
          <div>
            <Label>Package Name *</Label>
            <Input
              placeholder="e.g., Admission Onboarding"
              value={packageName}
              onChange={(e) => setPackageName(e.target.value)}
            />
          </div>

          {/* Due Date */}
          <div>
            <Label>Due Date (Optional)</Label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
            />
          </div>

          {/* Presets */}
          <div>
            <Label>Quick Presets</Label>
            <div className="flex flex-wrap gap-2 mt-2">
              {Object.entries(presets).map(([key, preset]) => (
                <Button
                  key={key}
                  variant="outline"
                  size="sm"
                  onClick={() => applyPreset(preset)}
                  className="flex-shrink-0"
                >
                  {preset.name}
                </Button>
              ))}
            </div>
          </div>

          {/* File Upload */}
          <div>
            <Label>Upload Additional Documents</Label>
            <p className="text-xs text-gray-500 mt-1 mb-2">Upload custom PDFs to include in this package</p>
            <div className="mt-2">
              <label htmlFor="file-upload" className="cursor-pointer">
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 hover:border-blue-400 hover:bg-blue-50 transition-all text-center">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                  <p className="text-sm text-gray-600">Click to upload PDF files</p>
                  <p className="text-xs text-gray-500 mt-1">or drag and drop</p>
                </div>
              </label>
              <input
                id="file-upload"
                type="file"
                accept=".pdf"
                multiple
                onChange={handleFileUpload}
                className="hidden"
              />
              
              {uploadedFiles.length > 0 && (
                <div className="mt-3 space-y-2">
                  {uploadedFiles.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg border">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <File className="w-4 h-4 text-blue-600 shrink-0" />
                        <span className="text-sm truncate">{file.name}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeUploadedFile(file.id)}
                        className="shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Document Selection */}
          <div>
            <Label>Or Select from Templates ({selectedDocuments.length} selected)</Label>
            <p className="text-xs text-gray-500 mt-1 mb-2">Patient information will auto-populate if patient exists in system</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2 max-h-96 overflow-y-auto p-2 border rounded-lg">
              {templates.map((template) => (
                <div
                  key={template.id}
                  onClick={() => toggleDocument(template.id)}
                  className={`p-3 border rounded-lg cursor-pointer transition-all ${
                    selectedDocuments.includes(template.id)
                      ? 'bg-blue-50 border-blue-300'
                      : 'hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {selectedDocuments.includes(template.id) ? (
                      <CheckSquare className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                    ) : (
                      <Square className="w-5 h-5 text-gray-400 shrink-0 mt-0.5" />
                    )}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-sm break-words">{template.template_name}</h4>
                      <Badge variant="outline" className="mt-1 text-xs capitalize">
                        {template.template_category}
                      </Badge>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row justify-end gap-2 pt-4 border-t">
            <Button 
              variant="outline" 
              onClick={() => { resetForm(); onClose(); }}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleCreate}
              disabled={createPackageMutation.isPending}
              className="w-full sm:w-auto"
            >
              <Send className="w-4 h-4 mr-2" />
              {createPackageMutation.isPending ? 'Creating...' : 'Create Package'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
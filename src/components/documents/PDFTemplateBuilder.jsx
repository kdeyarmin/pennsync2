import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Upload, FileText, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import VisualFieldEditor from "./VisualFieldEditor";

const TEMPLATE_CATEGORIES = [
  { value: 'consent', label: 'Consent Form' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'care_plan', label: 'Care Plan' },
  { value: 'discharge', label: 'Discharge Summary' },
  { value: 'admission', label: 'Admission Form' },
  { value: 'other', label: 'Other' }
];

export default function PDFTemplateBuilder({ open, onClose }) {
  const [step, setStep] = useState('info'); // info, upload, fields, confirm
  const [formData, setFormData] = useState({
    template_name: '',
    template_category: 'consent',
    description: ''
  });
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfUrl, setPdfUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [fields, setFields] = useState([]);
  const fileInputRef = React.useRef(null);
  const queryClient = useQueryClient();

  const createTemplateMutation = useMutation({
    mutationFn: async (templateData) => {
      const signatureFields = fields.filter(f => f.field_type === 'signature');
      const visualElements = fields.map((f, i) => ({
        id: f.id,
        type: f.field_type,
        label: f.label,
        position: f.position || { x: 50, y: 50 + (i * 40) },
        size: f.size || { width: 200, height: 30 },
        properties: {
          required: f.required,
          placeholder: f.placeholder,
          defaultValue: f.default_value,
          conditional: f.conditional
        }
      }));

      return base44.entities.PDFTemplate.create({
        template_name: templateData.template_name,
        template_category: templateData.template_category,
        description: templateData.description,
        template_file_url: templateData.template_file_url,
        version: '1.0',
        is_active: true,
        field_mappings: fields.filter(f => f.field_type !== 'signature').map(f => ({
          pdf_field_name: f.field_name,
          data_source: f.data_source,
          field_path: f.field_path,
          label: f.label,
          field_type: f.field_type,
          default_value: f.default_value,
          format: f.field_type === 'date' ? 'MM/dd/yyyy' : undefined
        })),
        signature_fields: signatureFields.map(f => ({
          field_name: f.field_name,
          label: f.label,
          role: f.role || 'patient',
          required: f.required
        })),
        visual_elements: visualElements,
        usage_count: 0
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['pdfTemplates'] });
      toast.success('Template created successfully!');
      resetForm();
      onClose();
    },
    onError: (error) => {
      toast.error(`Failed to create template: ${error.message}`);
    }
  });

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please select a PDF file');
      return;
    }

    setUploading(true);
    try {
      const uploadedFile = await base44.integrations.Core.UploadFile({ file });
      setPdfUrl(uploadedFile.file_url);
      setPdfFile(file);
      setStep('confirm');
    } catch (error) {
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      template_name: '',
      template_category: 'consent',
      description: ''
    });
    setPdfFile(null);
    setPdfUrl('');
    setFields([]);
    setStep('info');
  };

  const handleCreate = () => {
    if (!formData.template_name.trim()) {
      toast.error('Please enter a template name');
      return;
    }
    if (!pdfUrl) {
      toast.error('Please upload a PDF file');
      return;
    }
    createTemplateMutation.mutate({
      ...formData,
      template_file_url: pdfUrl
    });
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      if (!isOpen) {
        resetForm();
        onClose();
      }
    }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Create PDF Template</DialogTitle>
          <DialogDescription>
            Upload a PDF and configure it as a template for patient documents
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Step Indicator */}
          <div className="flex gap-2">
            <div className={`flex-1 h-1 rounded-full transition-colors ${step === 'info' || step === 'upload' || step === 'confirm' ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className={`flex-1 h-1 rounded-full transition-colors ${step === 'upload' || step === 'confirm' ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <div className={`flex-1 h-1 rounded-full transition-colors ${step === 'confirm' ? 'bg-blue-600' : 'bg-gray-200'}`} />
          </div>

          {/* Step 1: Template Info */}
          {step === 'info' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Template Name
                </label>
                <Input
                  placeholder="e.g., Admission Consent Form"
                  value={formData.template_name}
                  onChange={(e) => setFormData({ ...formData, template_name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <Select value={formData.template_category} onValueChange={(value) => 
                  setFormData({ ...formData, template_category: value })
                }>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TEMPLATE_CATEGORIES.map(cat => (
                      <SelectItem key={cat.value} value={cat.value}>
                        {cat.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description (Optional)
                </label>
                <Input
                  placeholder="What is this template for?"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>
            </div>
          )}

          {/* Step 2: Upload PDF */}
           {step === 'upload' && (
             <div className="space-y-4">
               <div 
                 className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:bg-gray-50 transition-colors"
                 onClick={() => fileInputRef.current?.click()}
               >
                 <div className="space-y-2">
                   {uploading ? (
                     <>
                       <Loader2 className="w-12 h-12 text-blue-600 mx-auto animate-spin" />
                       <p className="text-sm text-gray-600">Uploading...</p>
                     </>
                   ) : pdfUrl ? (
                     <>
                       <CheckCircle2 className="w-12 h-12 text-green-600 mx-auto" />
                       <p className="text-sm font-medium text-gray-700">{pdfFile?.name}</p>
                       <p className="text-xs text-gray-500">Ready to configure fields</p>
                     </>
                   ) : (
                     <>
                       <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                       <p className="text-sm font-medium text-gray-700">Click to upload PDF</p>
                       <p className="text-xs text-gray-500">or drag and drop</p>
                     </>
                   )}
                 </div>
               </div>
             </div>
           )}

           {/* Step 3: Configure Fields */}
           {step === 'fields' && (
             <VisualFieldEditor 
               pdfUrl={pdfUrl}
               initialFields={fields}
               onFieldsChange={setFields}
             />
           )}

          {/* Step 3: Confirm */}
          {/* Step 4: Confirm */}
          {step === 'confirm' && (
            <div className="space-y-4">
              <Card className="bg-green-50 border-green-200">
                <CardContent className="pt-6 space-y-4">
                  <div className="flex items-start gap-3">
                    <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-gray-900">{formData.template_name}</p>
                      <p className="text-sm text-gray-600">{pdfFile?.name}</p>
                      <div className="mt-2 inline-block">
                        <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                          {TEMPLATE_CATEGORIES.find(c => c.value === formData.template_category)?.label}
                        </span>
                      </div>
                    </div>
                  </div>
                  {formData.description && (
                    <p className="text-sm text-gray-700 p-3 bg-white rounded border">
                      {formData.description}
                    </p>
                  )}
                  <div className="pt-3 border-t">
                    <p className="text-xs font-semibold text-gray-700 mb-2">Fields Configured: {fields.length}</p>
                    <div className="space-y-1">
                      {fields.map(f => (
                        <p key={f.id} className="text-xs text-gray-600">• {f.label} ({f.field_type})</p>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
           {step === 'info' && (
             <>
               <Button variant="outline" onClick={onClose}>
                 Cancel
               </Button>
               <Button onClick={() => setStep('upload')}>
                 Next
               </Button>
             </>
           )}
           {step === 'upload' && (
             <>
               <Button variant="outline" onClick={() => setStep('info')}>
                 Back
               </Button>
               <Button 
                 onClick={() => fileInputRef.current?.click()}
                 disabled={uploading}
               >
                 {uploading ? 'Uploading...' : pdfUrl ? 'PDF Uploaded ✓' : 'Select & Upload PDF'}
               </Button>
               {pdfUrl && (
                 <Button onClick={() => setStep('fields')}>
                   Configure Fields
                 </Button>
               )}
               <input
                 ref={fileInputRef}
                 type="file"
                 accept=".pdf"
                 onChange={handleFileSelect}
                 className="hidden"
               />
             </>
           )}
           {step === 'fields' && (
             <>
               <Button variant="outline" onClick={() => setStep('upload')}>
                 Back
               </Button>
               <Button onClick={() => setStep('confirm')}>
                 Review & Create
               </Button>
             </>
           )}
           {step === 'confirm' && (
             <>
               <Button variant="outline" onClick={() => setStep('fields')}>
                 Edit Fields
               </Button>
               <Button 
                 onClick={handleCreate}
                 disabled={createTemplateMutation.isPending}
               >
                 {createTemplateMutation.isPending ? (
                   <>
                     <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                     Creating...
                   </>
                 ) : (
                   'Create Template'
                 )}
               </Button>
             </>
           )}
         </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
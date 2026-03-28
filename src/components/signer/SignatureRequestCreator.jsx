import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, Plus, GripVertical, Trash2, Send, FileText, LayoutTemplate } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function SignatureRequestCreator({ onCancel }) {
  const [step, setStep] = useState(1);
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [fields, setFields] = useState([
    { id: 'field-1', type: 'signature', label: 'Signature', required: true }
  ]);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file);
      setPreviewUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [file]);

  const handleFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
      setStep(2);
    }
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const items = Array.from(fields);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);
    setFields(items);
  };

  const addField = () => {
    const newId = `field-${Date.now()}`;
    setFields([...fields, { id: newId, type: 'signature', label: 'Signature', required: true }]);
  };

  const removeField = (id) => {
    setFields(fields.filter(f => f.id !== id));
  };

  const updateField = (id, newLabel) => {
    setFields(fields.map(f => f.id === id ? { ...f, label: newLabel } : f));
  };

  const handleSend = async () => {
    if (!file || !recipientEmail || !recipientName) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    setIsSending(true);
    try {
      // 1. Upload file
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      // 2. Create DocumentSignature record
      const docSig = await base44.entities.DocumentSignature.create({
        document_name: file.name,
        document_url: file_url,
        patient_id: "none",
        signer_email: recipientEmail,
        status: "pending",
        signature_fields: fields.map(f => ({
          id: f.id,
          label: f.label,
          required: f.required,
          signed: false
        })),
        requires_signature: true
      });

      // 3. Create DocumentPackage
      const pkg = await base44.entities.DocumentPackage.create({
        package_name: `Signature Request: ${file.name}`,
        patient_id: "none",
        document_signatures: [docSig.id],
        status: "pending",
        due_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        signer_email: recipientEmail,
        signer_name: recipientName
      });

      // 4. Create Token
      const token = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      await base44.entities.DocumentPackageToken.create({
        package_id: pkg.id,
        token: token,
        signer_email: recipientEmail,
        signer_name: recipientName,
        expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
      });

      // 5. Send Email
      const origin = window.location.origin;
      const signingUrl = `${origin}/signer?token=${token}`;
      
      await base44.integrations.Core.SendEmail({
        to: recipientEmail,
        subject: `Signature Requested: ${file.name}`,
        body: `Hello ${recipientName},\n\nYou have been requested to sign a document: ${file.name}.\n\nPlease review and sign the document by clicking the link below:\n\n${signingUrl}\n\nThank you.`
      });

      toast.success('Signature request sent successfully!');
      
      if (onCancel) {
        onCancel();
      } else {
        setStep(1);
        setFile(null);
        setRecipientName('');
        setRecipientEmail('');
        setFields([{ id: 'field-1', type: 'signature', label: 'Signature', required: true }]);
      }
      
    } catch (err) {
      console.error(err);
      toast.error('Failed to send signature request: ' + err.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="border-0 shadow-lg">
      <CardHeader className="border-b bg-slate-50/50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-2xl font-bold flex items-center gap-2">
            <LayoutTemplate className="w-6 h-6 text-blue-600" />
            Create Signature Request
          </CardTitle>
          {onCancel && <Button variant="ghost" onClick={onCancel}>Cancel</Button>}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {/* Progress Steps */}
        <div className="flex items-center justify-between mb-8 relative max-w-2xl mx-auto">
           <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-slate-100 -z-10"></div>
           <div className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 -z-10 transition-all" style={{ width: step === 1 ? '0%' : step === 2 ? '50%' : '100%' }}></div>
           
           <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 border-white ${step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>1</div>
           <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 border-white ${step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>2</div>
           <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold border-4 border-white ${step >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-200 text-slate-500'}`}>3</div>
        </div>

        {step === 1 && (
          <div className="max-w-2xl mx-auto text-center py-16 px-4 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors">
            <Upload className="w-12 h-12 mx-auto text-slate-400 mb-4" />
            <h3 className="text-lg font-semibold text-slate-900 mb-2">Upload Document</h3>
            <p className="text-slate-500 mb-6">Select a PDF document that requires a signature</p>
            <div className="relative inline-block">
              <Button className="bg-blue-600 hover:bg-blue-700 pointer-events-none">
                Browse Files
              </Button>
              <input 
                type="file" 
                accept=".pdf" 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleFileChange}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-blue-50 p-4 rounded-lg flex items-center gap-3">
               <FileText className="w-5 h-5 text-blue-600" />
               <div>
                 <p className="text-sm font-medium text-blue-900">Selected File</p>
                 <p className="text-sm text-blue-700">{file?.name}</p>
               </div>
               <Button variant="ghost" size="sm" className="ml-auto text-blue-600 hover:text-blue-800 hover:bg-blue-100" onClick={() => setStep(1)}>Change</Button>
            </div>

            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Recipient Details</h3>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="name">Recipient Name</Label>
                  <Input 
                    id="name" 
                    placeholder="John Doe" 
                    value={recipientName}
                    onChange={(e) => setRecipientName(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Recipient Email</Label>
                  <Input 
                    id="email" 
                    type="email" 
                    placeholder="john@example.com" 
                    value={recipientEmail}
                    onChange={(e) => setRecipientEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button 
                onClick={() => setStep(3)} 
                disabled={!recipientName || !recipientEmail}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Next: Setup Fields
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 animate-in fade-in slide-in-from-bottom-4">
            {/* Left side: Document Preview */}
            <div className="border rounded-xl bg-slate-100 h-[600px] overflow-hidden flex flex-col">
              <div className="bg-slate-800 text-slate-200 text-sm font-medium p-2 text-center">
                Document Preview
              </div>
              <div className="flex-1 p-4">
                {previewUrl ? (
                  <iframe 
                    src={previewUrl} 
                    className="w-full h-full rounded shadow-sm bg-white" 
                    title="PDF Preview"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-400">No preview available</div>
                )}
              </div>
            </div>

            {/* Right side: Fields Setup */}
            <div className="flex flex-col h-[600px]">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold">Configure Signature Fields</h3>
                  <p className="text-sm text-slate-500 mt-1">Drag to reorder required fields.</p>
                </div>
                <Button variant="outline" size="sm" onClick={addField} className="gap-2 shrink-0">
                  <Plus className="w-4 h-4" /> Add Field
                </Button>
              </div>
              
              <div className="flex-1 overflow-y-auto pr-2">
                <DragDropContext onDragEnd={handleDragEnd}>
                  <Droppable droppableId="fields">
                    {(provided) => (
                      <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                        {fields.map((field, index) => (
                          <Draggable key={field.id} draggableId={field.id} index={index}>
                            {(provided) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className="flex items-center gap-3 bg-white border border-slate-200 p-3 rounded-lg shadow-sm"
                              >
                                <div {...provided.dragHandleProps} className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing p-1">
                                  <GripVertical className="w-5 h-5" />
                                </div>
                                <div className="flex-1 flex gap-3">
                                  <Input 
                                    value={field.label}
                                    onChange={(e) => updateField(field.id, e.target.value)}
                                    placeholder="Field Label (e.g. Signature)"
                                    className="flex-1"
                                  />
                                </div>
                                <Button 
                                  variant="ghost" 
                                  size="icon" 
                                  className="text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                                  onClick={() => removeField(field.id)}
                                  disabled={fields.length === 1}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {provided.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              </div>

              <div className="flex justify-between pt-4 border-t mt-4">
                <Button variant="outline" onClick={() => setStep(2)}>Back</Button>
                <Button 
                  onClick={handleSend} 
                  disabled={isSending || fields.length === 0}
                  className="bg-green-600 hover:bg-green-700 gap-2"
                >
                  {isSending ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  Send Request
                </Button>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
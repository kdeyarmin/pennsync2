import { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Check, RefreshCw, Download, FileText, User } from "lucide-react";
import { toast } from "sonner";

export default function PDFSignatureCapture({ 
  pdfUrl, 
  patientId, 
  documentType = "Admission Consent",
  signatureFields = [{ name: "patient_signature", label: "Patient Signature", role: "Patient" }],
  formFields = [],
  onComplete 
}) {
  const sigCanvasRefs = useRef({});
  const [isSigning, setIsSigning] = useState(false);
  const [signedPdfUrl, setSignedPdfUrl] = useState(null);
  const [currentSignatureIndex, setCurrentSignatureIndex] = useState(0);
  const [signatures, setSignatures] = useState({});
  const [formData, setFormData] = useState(
    formFields.reduce((acc, field) => ({ ...acc, [field.name]: field.defaultValue || '' }), {})
  );

  const clearSignature = (fieldName) => {
    if (sigCanvasRefs.current[fieldName]) {
      sigCanvasRefs.current[fieldName].clear();
    }
  };

  const saveCurrentSignature = () => {
    const currentField = signatureFields[currentSignatureIndex];
    const canvas = sigCanvasRefs.current[currentField.name];
    
    if (!canvas || canvas.isEmpty()) {
      toast.error("Please provide a signature");
      return;
    }

    const signerName = formData[`${currentField.name}_name`];
    if (!signerName?.trim()) {
      toast.error(`Please enter ${currentField.label} name`);
      return;
    }

    const signatureDataUrl = canvas.toDataURL("image/png");
    setSignatures(prev => ({
      ...prev,
      [currentField.name]: {
        dataUrl: signatureDataUrl,
        signerName: signerName.trim(),
        role: currentField.role,
        signedAt: new Date().toISOString()
      }
    }));

    toast.success(`${currentField.label} captured`);

    // Move to next signature or submit
    if (currentSignatureIndex < signatureFields.length - 1) {
      setCurrentSignatureIndex(currentSignatureIndex + 1);
    }
  };

  const allSignaturesComplete = () => {
    return signatureFields.every(field => signatures[field.name]);
  };

  const handleSubmitAll = async () => {
    if (!allSignaturesComplete()) {
      toast.error("Please complete all required signatures");
      return;
    }

    setIsSigning(true);
    try {
      // Call backend function to embed all signatures into PDF
      const response = await base44.functions.invoke('embedSignatureToPDF', {
        pdf_url: pdfUrl,
        signatures: Object.entries(signatures).map(([fieldName, sig]) => ({
          field_name: fieldName,
          signature_data_url: sig.dataUrl,
          signer_name: sig.signerName,
          signer_role: sig.role,
          signature_date: sig.signedAt
        })),
        form_data: formData,
        patient_id: patientId,
        document_type: documentType
      });

      setSignedPdfUrl(response.data.signed_pdf_url);
      
      // Auto-route: Update DocumentSignature if exists
      if (patientId && response.data.signed_pdf_url) {
        try {
          const existingDocs = await base44.entities.DocumentSignature.filter({
            patient_id: patientId,
            original_pdf_url: pdfUrl,
            status: 'pending'
          });
          
          if (existingDocs.length > 0) {
            await base44.entities.DocumentSignature.update(existingDocs[0].id, {
              signed_pdf_url: response.data.signed_pdf_url,
              status: 'signed',
              signed_at: new Date().toISOString(),
              signed_by: (await base44.auth.me()).email
            });
          }
        } catch (err) {
          console.error("Failed to auto-route document:", err);
        }
      }
      
      toast.success("Document signed successfully!");
      
      if (onComplete) {
        onComplete(response.data.signed_pdf_url);
      }
    } catch (error) {
      console.error("Signature error:", error);
      toast.error(`Failed to sign document: ${error.message}`);
    } finally {
      setIsSigning(false);
    }
  };

  if (signedPdfUrl) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-600">
            <Check className="w-5 h-5" />
            Document Signed Successfully
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            {signatureFields.map(field => (
              <p key={field.name} className="text-sm text-slate-600">
                <strong>{field.label}:</strong> {signatures[field.name]?.signerName}
              </p>
            ))}
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => window.open(signedPdfUrl, '_blank')}
              className="flex-1"
            >
              <FileText className="w-4 h-4 mr-2" />
              View Signed Document
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                const link = document.createElement('a');
                link.href = signedPdfUrl;
                link.download = `signed-${documentType.toLowerCase().replace(/\s+/g, '-')}.pdf`;
                link.click();
              }}
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Sign Document: {documentType}</CardTitle>
        <div className="flex gap-2 mt-2">
          {signatureFields.map((field, idx) => (
            <div
              key={field.name}
              className={`h-2 flex-1 rounded-full ${
                signatures[field.name] ? 'bg-green-500' : idx === currentSignatureIndex ? 'bg-blue-500' : 'bg-slate-200'
              }`}
            />
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs value={currentSignatureIndex.toString()} onValueChange={(v) => setCurrentSignatureIndex(parseInt(v))}>
          <TabsList className="grid w-full" style={{ gridTemplateColumns: `repeat(${Math.max(signatureFields.length, formFields.length > 0 ? signatureFields.length + 1 : signatureFields.length)}, 1fr)` }}>
            {formFields.length > 0 && <TabsTrigger value="-1">Form</TabsTrigger>}
            {signatureFields.map((field, idx) => (
              <TabsTrigger key={field.name} value={idx.toString()}>
                {signatures[field.name] ? <Check className="w-4 h-4 mr-1" /> : <User className="w-4 h-4 mr-1" />}
                {field.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {/* Form Fields Tab */}
          {formFields.length > 0 && (
            <TabsContent value="-1" className="space-y-4">
              <div className="border rounded-lg overflow-hidden bg-slate-50 mb-4">
                <iframe src={pdfUrl} className="w-full h-96" title="Document Preview" />
              </div>
              
              <div className="grid gap-4 md:grid-cols-2">
                {formFields.map(field => (
                  <div key={field.name}>
                    <Label htmlFor={field.name}>{field.label}</Label>
                    <Input
                      id={field.name}
                      type={field.type || "text"}
                      placeholder={field.placeholder}
                      value={formData[field.name] || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, [field.name]: e.target.value }))}
                      className="text-base"
                    />
                  </div>
                ))}
              </div>

              <Button
                onClick={() => {
                  setCurrentSignatureIndex(0);
                  toast.success("Form fields saved. Please complete signatures.");
                }}
                className="w-full"
              >
                Continue to Signatures
              </Button>
            </TabsContent>
          )}

          {/* Signature Tabs */}
          {signatureFields.map((field, idx) => (
            <TabsContent key={field.name} value={idx.toString()} className="space-y-4">
              <div className="border rounded-lg overflow-hidden bg-slate-50">
                <iframe src={pdfUrl} className="w-full h-64" title="Document Preview" />
              </div>

              <div>
                <Label htmlFor={`${field.name}_name`}>
                  {field.label} - Full Name
                </Label>
                <Input
                  id={`${field.name}_name`}
                  type="text"
                  placeholder={`Enter ${(field.role || '').toLowerCase()} name`}
                  value={formData[`${field.name}_name`] || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, [`${field.name}_name`]: e.target.value }))}
                  className="text-base"
                />
              </div>

              <div>
                <Label>{field.label}</Label>
                <div className="border-2 border-slate-300 rounded-lg bg-white touch-none">
                  <SignatureCanvas
                    ref={(ref) => { sigCanvasRefs.current[field.name] = ref; }}
                    canvasProps={{
                      className: 'w-full h-48 cursor-crosshair',
                      style: { touchAction: 'none' }
                    }}
                    backgroundColor="white"
                  />
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Sign above using your finger or stylus
                </p>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => clearSignature(field.name)}
                  className="flex-1"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Clear
                </Button>
                <Button
                  onClick={saveCurrentSignature}
                  className="flex-1 bg-blue-600 hover:bg-blue-700"
                >
                  <Check className="w-4 h-4 mr-2" />
                  {idx < signatureFields.length - 1 ? 'Next Signature' : 'Save Signature'}
                </Button>
              </div>

              {signatures[field.name] && (
                <div className="text-sm text-green-600 flex items-center gap-2">
                  <Check className="w-4 h-4" />
                  Signed by {signatures[field.name].signerName}
                </div>
              )}
            </TabsContent>
          ))}
        </Tabs>

        {/* Submit All Button */}
        {allSignaturesComplete() && (
          <Button
            onClick={handleSubmitAll}
            disabled={isSigning}
            className="w-full bg-green-600 hover:bg-green-700"
            size="lg"
          >
            {isSigning ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Processing Document...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Complete & Submit Document
              </>
            )}
          </Button>
        )}

        <p className="text-xs text-slate-500 text-center">
          By signing, you acknowledge that you have read and agree to the terms outlined in this document.
        </p>
      </CardContent>
    </Card>
  );
}
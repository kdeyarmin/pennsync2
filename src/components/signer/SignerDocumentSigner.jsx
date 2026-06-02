import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Download } from 'lucide-react';
import { toast } from 'sonner';
import SignaturePadCanvas from '@/components/signature/SignaturePadCanvas';

export default function SignerDocumentSigner({
  documentId,
  packageData,
  _token,
  onComplete,
  onCancel,
}) {
  const [isLoading, setIsLoading] = useState(false);
  const [documentUrl, setDocumentUrl] = useState(null);
  const [signatureName, setSignatureName] = useState(packageData.signerName);
  const [signatureImage, setSignatureImage] = useState(null);

  const document = packageData.documents.find((d) => d.id === documentId);

  const handleFetchDocument = async () => {
    try {
      setIsLoading(true);
      const signature = await base44.entities.DocumentSignature.get(documentId);
      setDocumentUrl(signature.pdf_url);
    } catch {
      toast.error('Failed to load document');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignatureCapture = (dataUrl) => {
    setSignatureImage(dataUrl);
  };

  const handleSign = async () => {
    if (!signatureImage) {
      toast.error('Please provide a signature');
      return;
    }

    if (!signatureName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    try {
      setIsLoading(true);

      // Convert data URL to blob
      const response = await fetch(signatureImage);
      const blob = await response.blob();

      // Upload signature
      const uploadResponse = await base44.integrations.Core.UploadFile({
        file: blob,
      });

      // Update document signature
      await base44.entities.DocumentSignature.update(documentId, {
        status: 'signed',
        signed_at: new Date().toISOString(),
        signer_name: signatureName,
        signature_image_url: uploadResponse.file_url,
      });

      toast.success('Document signed successfully!');
      setTimeout(() => onComplete(), 1500);
    } catch (error) {
      toast.error(error.message || 'Failed to save signature');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Back Button */}
      <Button
        variant="ghost"
        onClick={onCancel}
        className="gap-2"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Package
      </Button>

      {/* Document Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">{document.name}</CardTitle>
        </CardHeader>
        <CardContent>
          {!documentUrl ? (
            <Button
              onClick={handleFetchDocument}
              disabled={isLoading}
              className="w-full"
            >
              {isLoading ? 'Loading...' : 'View Document'}
            </Button>
          ) : (
            <div className="space-y-4">
              <iframe
                src={documentUrl}
                className="w-full h-96 border border-slate-300 rounded"
                title={document.name}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => window.open(documentUrl, '_blank')}
                className="gap-2"
              >
                <Download className="w-4 h-4" />
                Download
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signature Capture */}
      {documentUrl && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your Signature</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Signature Pad */}
            <SignaturePadCanvas
              onSignatureCapture={handleSignatureCapture}
              disabled={isLoading}
            />

            {/* Name Input */}
            <div>
              <Label htmlFor="signature-name" className="text-sm">
                Printed Name
              </Label>
              <Input
                id="signature-name"
                type="text"
                value={signatureName}
                onChange={(e) => setSignatureName(e.target.value)}
                placeholder="Enter your full name"
                className="mt-2"
              />
            </div>

            {/* Agreement Checkbox */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-xs text-slate-700">
              By signing, I confirm that I have reviewed this document and agree to its contents. This signature is legally binding.
            </div>

            {/* Sign Button */}
            <Button
              onClick={handleSign}
              disabled={isLoading}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? 'Saving...' : 'Sign Document'}
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
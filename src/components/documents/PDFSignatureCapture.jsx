import React, { useRef, useState } from "react";
import SignatureCanvas from "react-signature-canvas";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Check, RefreshCw, Download, FileText } from "lucide-react";
import { toast } from "sonner";

export default function PDFSignatureCapture({ pdfUrl, patientId, documentType = "Admission Consent", onComplete }) {
  const sigCanvas = useRef(null);
  const [isSigning, setIsSigning] = useState(false);
  const [signedPdfUrl, setSignedPdfUrl] = useState(null);
  const [signerName, setSignerName] = useState("");

  const clearSignature = () => {
    sigCanvas.current.clear();
  };

  const handleSign = async () => {
    if (sigCanvas.current.isEmpty()) {
      toast.error("Please provide a signature");
      return;
    }

    if (!signerName.trim()) {
      toast.error("Please enter signer name");
      return;
    }

    setIsSigning(true);
    try {
      // Get signature as base64 image
      const signatureDataUrl = sigCanvas.current.toDataURL("image/png");

      // Call backend function to embed signature into PDF
      const response = await base44.functions.invoke('embedSignatureToPDF', {
        pdf_url: pdfUrl,
        signature_data_url: signatureDataUrl,
        signer_name: signerName.trim(),
        signature_date: new Date().toISOString(),
        patient_id: patientId,
        document_type: documentType
      });

      setSignedPdfUrl(response.data.signed_pdf_url);
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
          <p className="text-sm text-gray-600">
            The document has been signed by <strong>{signerName}</strong>
          </p>
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
      </CardHeader>
      <CardContent className="space-y-4">
        {/* PDF Preview */}
        <div className="border rounded-lg overflow-hidden bg-gray-50">
          <iframe
            src={pdfUrl}
            className="w-full h-96"
            title="Document to Sign"
          />
        </div>

        {/* Signer Name Input */}
        <div>
          <Label htmlFor="signerName">Full Name</Label>
          <Input
            id="signerName"
            type="text"
            placeholder="Enter your full name"
            value={signerName}
            onChange={(e) => setSignerName(e.target.value)}
            className="text-base"
          />
        </div>

        {/* Signature Pad */}
        <div>
          <Label>Signature</Label>
          <div className="border-2 border-gray-300 rounded-lg bg-white touch-none">
            <SignatureCanvas
              ref={sigCanvas}
              canvasProps={{
                className: 'w-full h-48 cursor-crosshair',
                style: { touchAction: 'none' }
              }}
              backgroundColor="white"
            />
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Sign above using your finger or stylus
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={clearSignature}
            className="flex-1"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Clear
          </Button>
          <Button
            onClick={handleSign}
            disabled={isSigning}
            className="flex-1 bg-blue-600 hover:bg-blue-700"
          >
            {isSigning ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Signing...
              </>
            ) : (
              <>
                <Check className="w-4 h-4 mr-2" />
                Sign Document
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-gray-500 text-center">
          By signing, you acknowledge that you have read and agree to the terms outlined in this document.
        </p>
      </CardContent>
    </Card>
  );
}
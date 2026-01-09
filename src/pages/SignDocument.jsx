import React, { useState } from "react";
import PDFSignatureCapture from "../components/documents/PDFSignatureCapture";
import PatientInfoSignatureFlow from "../components/documents/PatientInfoSignatureFlow";
import InteractivePDFSigner from "../components/documents/InteractivePDFSigner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";
import { Wand2, FileEdit } from "lucide-react";

export default function SignDocument() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const pdfUrl = urlParams.get('pdf_url');
  const patientId = urlParams.get('patient_id');
  const documentType = urlParams.get('document_type') || 'Consent Form';
  const withPatientInfo = urlParams.get('patient_info') === 'true';
  const useInteractive = urlParams.get('interactive') === 'true';
  
  const [signingMode, setSigningMode] = useState(useInteractive ? 'interactive' : 'standard');

  if (!pdfUrl) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              No PDF document specified. Please provide a valid PDF URL.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handleComplete = (signedPdfUrl, patientInfo) => {
    console.log("Document signed:", signedPdfUrl);
    toast.success("Document signed successfully!");
    
    // Navigate back to patient details or show success
    if (patientId) {
      setTimeout(() => {
        navigate(createPageUrl(`PatientDetails?id=${patientId}`));
      }, 2000);
    }
  };

  // Use enhanced flow with patient info if requested
  if (withPatientInfo) {
    return (
      <div className="max-w-5xl mx-auto p-6">
        <PatientInfoSignatureFlow
          pdfTemplateUrl={pdfUrl}
          patientId={patientId}
          documentType={documentType}
          onComplete={handleComplete}
        />
      </div>
    );
  }

  // Standard signature flow (direct PDF signing)
  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6">
      {/* Mode Selector */}
      <Card className="mb-4">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              variant={signingMode === 'standard' ? 'default' : 'outline'}
              onClick={() => setSigningMode('standard')}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <Wand2 className="w-4 h-4" />
              Standard Signing
            </Button>
            <Button
              variant={signingMode === 'interactive' ? 'default' : 'outline'}
              onClick={() => setSigningMode('interactive')}
              className="flex-1 flex items-center justify-center gap-2"
            >
              <FileEdit className="w-4 h-4" />
              Interactive Editor (Fill & Sign)
            </Button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            {signingMode === 'interactive' 
              ? 'Fill out forms, add text, dates, and place signatures directly on the PDF'
              : 'Quick signature capture with automatic placement'}
          </p>
        </CardContent>
      </Card>
      
      {/* Signing Component */}
      {signingMode === 'interactive' ? (
        <InteractivePDFSigner
          pdfUrl={pdfUrl}
          patientId={patientId}
          documentType={documentType}
          onComplete={handleComplete}
        />
      ) : (
        <PDFSignatureCapture
          pdfUrl={pdfUrl}
          patientId={patientId}
          documentType={documentType}
          signatureFields={[
            { name: "patient_signature", label: "Patient Signature", role: "Patient" },
            { name: "witness_signature", label: "Witness Signature", role: "Witness" }
          ]}
          onComplete={handleComplete}
        />
      )}
    </div>
  );
}
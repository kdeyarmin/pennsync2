import React from "react";
import PDFSignatureCapture from "../components/documents/PDFSignatureCapture";
import PatientInfoSignatureFlow from "../components/documents/PatientInfoSignatureFlow";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { toast } from "sonner";

export default function SignDocument() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const pdfUrl = urlParams.get('pdf_url');
  const patientId = urlParams.get('patient_id');
  const documentType = urlParams.get('document_type') || 'Consent Form';
  const withPatientInfo = urlParams.get('patient_info') === 'true';

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
    <div className="max-w-4xl mx-auto p-6">
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
    </div>
  );
}
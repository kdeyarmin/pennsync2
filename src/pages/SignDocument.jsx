import React from "react";
import PDFSignatureCapture from "../components/documents/PDFSignatureCapture";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

export default function SignDocument() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const pdfUrl = urlParams.get('pdf_url');
  const patientId = urlParams.get('patient_id');
  const documentType = urlParams.get('document_type') || 'Consent Form';

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

  const handleComplete = (signedPdfUrl) => {
    console.log("Document signed:", signedPdfUrl);
    // Navigate back to patient details or show success
    if (patientId) {
      setTimeout(() => {
        navigate(createPageUrl(`PatientDetails?id=${patientId}`));
      }, 2000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6">
      <PDFSignatureCapture
        pdfUrl={pdfUrl}
        patientId={patientId}
        documentType={documentType}
        onComplete={handleComplete}
      />
    </div>
  );
}
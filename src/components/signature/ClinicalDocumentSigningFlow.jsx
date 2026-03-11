import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FileText,
  PenTool,
  CheckCircle2,
  Clock,
  AlertCircle,
  Users,
  Shield,
  Download,
  Eye
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import SecureESignatureCapture from "./SecureESignatureCapture";
import DocumentSignatureManager from "./DocumentSignatureManager";

export default function ClinicalDocumentSigningFlow({
  document,
  documentType = "clinical_note",
  onDocumentSigned
}) {
  const [signingDialogOpen, setSigningDialogOpen] = useState(false);
  const [signingRole, setSigningRole] = useState("clinician"); // clinician or patient
  const [isLocked, setIsLocked] = useState(document?.is_locked || false);

  const handleSignatureComplete = async (signatureRecord) => {
    try {
      // Update document as signed
      if (document?.id) {
        await base44.entities[documentType === "clinical_note" ? "Document" : "Document"].update(
          document.id,
          {
            is_signed: true,
            signed_date: new Date().toISOString(),
            signed_by: signatureRecord.signed_by
          }
        );
      }

      setSigningDialogOpen(false);
      toast.success("Document signed successfully");

      if (onDocumentSigned) {
        onDocumentSigned(signatureRecord);
      }
    } catch (error) {
      console.error("Error updating document:", error);
      toast.error("Failed to complete signature");
    }
  };

  const lockDocument = async () => {
    try {
      if (document?.id) {
        await base44.entities.Document.update(document.id, { is_locked: true });
        setIsLocked(true);
        toast.success("Document locked for signature verification");
      }
    } catch (error) {
      console.error("Error locking document:", error);
      toast.error("Failed to lock document");
    }
  };

  return (
    <div className="space-y-4">
      {/* Document Header */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-blue-600" />
                {document?.title || "Clinical Document"}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {document?.description || documentType}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {document?.is_signed ? (
                <Badge className="bg-green-600 flex items-center gap-1">
                  <CheckCircle2 className="w-4 h-4" />
                  Signed
                </Badge>
              ) : (
                <Badge variant="outline" className="flex items-center gap-1 border-amber-300 text-amber-700">
                  <AlertCircle className="w-4 h-4" />
                  Pending Signature
                </Badge>
              )}
              {isLocked && (
                <Badge className="bg-gray-600 flex items-center gap-1">
                  <Shield className="w-4 h-4" />
                  Locked
                </Badge>
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Status Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Signing Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {/* Clinician Signature */}
            <div className="flex items-start gap-3 pb-3 border-b">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">Clinician Signature</p>
                {document?.clinician_signed ? (
                  <p className="text-sm text-green-700 mt-1">
                    ✓ Signed by {document.clinician_name} on {format(new Date(document.clinician_signed_date), "MMM d, yyyy")}
                  </p>
                ) : (
                  <p className="text-sm text-gray-600 mt-1">Awaiting clinician signature</p>
                )}
              </div>
            </div>

            {/* Patient/Guardian Signature */}
            <div className="flex items-start gap-3 pb-3 border-b">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">Patient/Guardian Signature</p>
                {document?.patient_signed ? (
                  <p className="text-sm text-green-700 mt-1">
                    ✓ Signed by {document.patient_name} on {format(new Date(document.patient_signed_date), "MMm d, yyyy")}
                  </p>
                ) : (
                  <p className="text-sm text-gray-600 mt-1">Awaiting patient/guardian signature</p>
                )}
              </div>
            </div>

            {/* Document Lock Status */}
            <div className="flex items-start gap-3">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                <Shield className="w-4 h-4 text-gray-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">Document Lock</p>
                {isLocked ? (
                  <p className="text-sm text-green-700 mt-1">✓ Locked for signature verification</p>
                ) : (
                  <p className="text-sm text-gray-600 mt-1">Not yet locked</p>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signing Actions */}
      {!isLocked && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Add Signatures</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Button
                onClick={() => {
                  setSigningRole("clinician");
                  setSigningDialogOpen(true);
                }}
                disabled={document?.clinician_signed}
                className={!document?.clinician_signed ? "bg-blue-600 hover:bg-blue-700" : ""}
              >
                <PenTool className="w-4 h-4 mr-2" />
                {document?.clinician_signed ? "Clinician Signed" : "Sign as Clinician"}
              </Button>

              <Button
                onClick={() => {
                  setSigningRole("patient");
                  setSigningDialogOpen(true);
                }}
                disabled={document?.patient_signed}
                className={!document?.patient_signed ? "bg-purple-600 hover:bg-purple-700" : ""}
              >
                <PenTool className="w-4 h-4 mr-2" />
                {document?.patient_signed ? "Patient Signed" : "Sign as Patient/Guardian"}
              </Button>
            </div>

            {document?.clinician_signed && document?.patient_signed && (
              <Button
                onClick={lockDocument}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                <Shield className="w-4 h-4 mr-2" />
                Lock Document for Verification
              </Button>
            )}

            <Alert className="bg-amber-50 border-amber-200">
              <AlertCircle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-800 text-sm">
                All signatures must be captured before locking the document. Once locked, no modifications can be made.
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      )}

      {/* Document Preview */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Document Content
          </CardTitle>
        </CardHeader>
        <CardContent>
          {document?.content ? (
            <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto whitespace-pre-wrap text-sm text-gray-700">
              {document.content}
            </div>
          ) : (
            <p className="text-gray-600 text-sm">No document content available</p>
          )}
        </CardContent>
      </Card>

      {/* Signature Verification Manager */}
      <DocumentSignatureManager
        documentId={document?.id}
        documentType={documentType}
        patientId={document?.patient_id}
      />

      {/* Signature Capture Dialog */}
      <Dialog open={signingDialogOpen} onOpenChange={setSigningDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">
            Sign Document as {signingRole === "clinician" ? "Clinician" : "Patient"}
          </DialogTitle>
          <SecureESignatureCapture
            documentType={documentType}
            documentId={document?.id}
            documentTitle={document?.title || "Clinical Document"}
            onSignatureComplete={handleSignatureComplete}
          />
        </DialogContent>
      </Dialog>

      {/* HIPAA Compliance Badge */}
      <Alert className="bg-indigo-50 border-indigo-200">
        <Shield className="w-4 h-4 text-indigo-600" />
        <AlertDescription className="text-indigo-800 text-sm">
          <strong>HIPAA-Compliant Workflow:</strong> This document uses 21 CFR Part 11 compliant electronic signatures with tamper detection, audit trails, IP tracking, and non-repudiation.
        </AlertDescription>
      </Alert>
    </div>
  );
}
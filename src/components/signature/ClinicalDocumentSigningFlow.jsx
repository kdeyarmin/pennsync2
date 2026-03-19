import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
  FileText,
  PenTool,
  CheckCircle2,
  AlertCircle,
  Users,
  Shield,
  Eye,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import SecureESignatureCapture from "./SecureESignatureCapture";
import DocumentSignatureManager from "./DocumentSignatureManager";

export default function ClinicalDocumentSigningFlow({
  document,
  documentType = "clinical_note",
  onDocumentSigned,
}) {
  const [signingDialogOpen, setSigningDialogOpen] = useState(false);
  const [signingRole, setSigningRole] = useState("clinician");
  const [documentState, setDocumentState] = useState(document || {});

  const isLocked = documentState?.is_locked || false;
  const isFullySigned = Boolean(documentState?.clinician_signed && documentState?.patient_signed);

  const signingRoles = useMemo(() => ({
    clinician: {
      signedField: 'clinician_signed',
      signedDateField: 'clinician_signed_date',
      signerNameField: 'clinician_name',
      label: 'Clinician Signature',
    },
    patient: {
      signedField: 'patient_signed',
      signedDateField: 'patient_signed_date',
      signerNameField: 'patient_name',
      label: 'Patient/Guardian Signature',
    },
  }), []);

  const handleSignatureComplete = async (signatureRecord) => {
    const roleConfig = signingRoles[signingRole];
    const signedAt = new Date().toISOString();
    const nextDocumentState = {
      ...documentState,
      [roleConfig.signedField]: true,
      [roleConfig.signedDateField]: signatureRecord?.signed_date || signedAt,
      [roleConfig.signerNameField]: signatureRecord?.signed_by_name || documentState?.[roleConfig.signerNameField],
    };

    nextDocumentState.is_signed = Boolean(nextDocumentState.clinician_signed && nextDocumentState.patient_signed);
    nextDocumentState.signed_date = nextDocumentState.is_signed ? signedAt : documentState?.signed_date;
    nextDocumentState.signed_by = nextDocumentState.is_signed ? signatureRecord?.signed_by : documentState?.signed_by;

    try {
      if (documentState?.id) {
        await base44.entities.Document.update(documentState.id, {
          [roleConfig.signedField]: true,
          [roleConfig.signedDateField]: signatureRecord?.signed_date || signedAt,
          [roleConfig.signerNameField]: signatureRecord?.signed_by_name || documentState?.[roleConfig.signerNameField],
          is_signed: nextDocumentState.is_signed,
          signed_date: nextDocumentState.is_signed ? signedAt : documentState?.signed_date,
          signed_by: nextDocumentState.is_signed ? signatureRecord?.signed_by : documentState?.signed_by,
        });
      }

      setDocumentState(nextDocumentState);
      setSigningDialogOpen(false);
      toast.success(`${roleConfig.label} captured successfully`);

      if (onDocumentSigned) {
        onDocumentSigned(signatureRecord);
      }
    } catch (error) {
      console.error("Error updating document:", error);
      toast.error("Failed to complete signature");
    }
  };

  const lockDocument = async () => {
    if (!isFullySigned) {
      toast.error("Capture both clinician and patient signatures before locking the document");
      return;
    }

    try {
      if (documentState?.id) {
        await base44.entities.Document.update(documentState.id, { is_locked: true });
      }
      setDocumentState((prev) => ({ ...prev, is_locked: true }));
      toast.success("Document locked for signature verification");
    } catch (error) {
      console.error("Error locking document:", error);
      toast.error("Failed to lock document");
    }
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between gap-4">
            <div>
              <CardTitle className="flex items-center gap-2 text-lg">
                <FileText className="w-5 h-5 text-blue-600" />
                {documentState?.title || "Clinical Document"}
              </CardTitle>
              <p className="text-sm text-gray-600 mt-1">
                {documentState?.description || documentType}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {documentState?.is_signed ? (
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Signing Status</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-start gap-3 pb-3 border-b">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-blue-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">Clinician Signature</p>
                {documentState?.clinician_signed ? (
                  <p className="text-sm text-green-700 mt-1">
                    ✓ Signed by {documentState.clinician_name || 'Clinician'} on {format(new Date(documentState.clinician_signed_date), "MMM d, yyyy")}
                  </p>
                ) : (
                  <p className="text-sm text-gray-600 mt-1">Awaiting clinician signature</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 pb-3 border-b">
              <div className="flex-shrink-0 w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center">
                <Users className="w-4 h-4 text-purple-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-gray-900">Patient/Guardian Signature</p>
                {documentState?.patient_signed ? (
                  <p className="text-sm text-green-700 mt-1">
                    ✓ Signed by {documentState.patient_name || 'Patient'} on {format(new Date(documentState.patient_signed_date), "MMM d, yyyy")}
                  </p>
                ) : (
                  <p className="text-sm text-gray-600 mt-1">Awaiting patient/guardian signature</p>
                )}
              </div>
            </div>

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
                disabled={documentState?.clinician_signed}
                className={!documentState?.clinician_signed ? "bg-blue-600 hover:bg-blue-700" : ""}
              >
                <PenTool className="w-4 h-4 mr-2" />
                {documentState?.clinician_signed ? "Clinician Signed" : "Sign as Clinician"}
              </Button>

              <Button
                onClick={() => {
                  setSigningRole("patient");
                  setSigningDialogOpen(true);
                }}
                disabled={documentState?.patient_signed}
                className={!documentState?.patient_signed ? "bg-purple-600 hover:bg-purple-700" : ""}
              >
                <PenTool className="w-4 h-4 mr-2" />
                {documentState?.patient_signed ? "Patient Signed" : "Sign as Patient/Guardian"}
              </Button>
            </div>

            {isFullySigned && (
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Eye className="w-4 h-4" />
            Document Content
          </CardTitle>
        </CardHeader>
        <CardContent>
          {documentState?.content ? (
            <div className="bg-white border border-gray-200 rounded-lg p-4 max-h-96 overflow-y-auto whitespace-pre-wrap text-sm text-gray-700">
              {documentState.content}
            </div>
          ) : (
            <p className="text-gray-600 text-sm">No document content available</p>
          )}
        </CardContent>
      </Card>

      <DocumentSignatureManager
        documentId={documentState?.id}
        documentType={documentType}
        patientId={documentState?.patient_id}
      />

      <Dialog open={signingDialogOpen} onOpenChange={setSigningDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">
            Sign Document as {signingRole === "clinician" ? "Clinician" : "Patient"}
          </DialogTitle>
          <SecureESignatureCapture
            documentType={documentType}
            documentId={documentState?.id}
            documentTitle={documentState?.title || "Clinical Document"}
            signatureRole={signingRole}
            onSignatureComplete={handleSignatureComplete}
          />
        </DialogContent>
      </Dialog>

      <Alert className="bg-indigo-50 border-indigo-200">
        <Shield className="w-4 h-4 text-indigo-600" />
        <AlertDescription className="text-indigo-800 text-sm">
          <strong>HIPAA-Compliant Workflow:</strong> This document uses 21 CFR Part 11 compliant electronic signatures with tamper detection, audit trails, IP tracking, and non-repudiation.
        </AlertDescription>
      </Alert>
    </div>
  );
}

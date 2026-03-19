import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, FileText, Lock, Pen, User } from "lucide-react";
import { toast } from "sonner";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import SignatureCanvas from "../components/documents/SignatureCanvas";
import {
  getDocumentDisplayName,
  getNormalizedSignatureStatus,
  getSignatureDueDate,
  getSignatureSignedAt,
  getSignerProgress,
} from "@/components/signature/signatureUtils";

export default function SignDocument() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const urlParams = new URLSearchParams(window.location.search);
  const signatureId = urlParams.get('signature_id');
  const patientId = urlParams.get('patient_id');

  const [showSignatureDialog, setShowSignatureDialog] = useState(false);
  const [currentSignerIndex, setCurrentSignerIndex] = useState(0);
  const [signatures, setSignatures] = useState({});

  const { data: signatureRecord } = useQuery({
    queryKey: ['signature-record', signatureId],
    queryFn: () => base44.entities.DocumentSignature.filter({ id: signatureId }),
    select: (data) => data[0],
    enabled: !!signatureId,
  });

  const { data: patient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => base44.entities.Patient.filter({ id: patientId }),
    select: (data) => data[0],
    enabled: !!patientId,
  });

  const updateSignatureMutation = useMutation({
    mutationFn: async ({ signatureData }) => base44.entities.DocumentSignature.update(signatureId, signatureData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['signature-record', signatureId] });
      queryClient.invalidateQueries({ queryKey: ['all-signatures'] });
      queryClient.invalidateQueries({ queryKey: ['document-signatures'] });
    },
  });

  const signatureSummary = useMemo(() => getSignerProgress(signatureRecord), [signatureRecord]);

  const workingSigners = useMemo(() => {
    if (Array.isArray(signatureRecord?.signers) && signatureRecord.signers.length > 0) {
      return signatureRecord.signers;
    }

    if (Array.isArray(signatureRecord?.required_signatures) && signatureRecord.required_signatures.length > 0) {
      return signatureRecord.required_signatures.map((signer, index) => ({
        id: signer.signer_id || signer.id || `${index}`,
        name: signer.name || signer.label || signer.role || `Signer ${index + 1}`,
        email: signer.email || '',
        role: signer.role || 'signer',
        required: signer.is_required !== false,
        signature: signer.signature || null,
        signed_date: signer.signed_date || null,
        signature_method: signer.signature_method || null,
        order: signer.order || index + 1,
      }));
    }

    return [];
  }, [signatureRecord]);

  const patientDisplay = patient || {
    first_name: signatureRecord?.form_data?.first_name || 'Unknown',
    last_name: signatureRecord?.form_data?.last_name || 'Patient',
  };


  const isSignerLocallySigned = (signer) => Boolean(signatures[signer.id]);
  const isSignerAlreadySigned = (signer) => Boolean(signer.signature || signer.signed_date || signatures[signer.id]);

  const canSignSigner = (signerIndex) => {
    const orderedSigners = workingSigners;
    const priorRequiredSigners = orderedSigners.slice(0, signerIndex).filter((signer) => signer.required !== false);

    return priorRequiredSigners.every((signer) => isSignerAlreadySigned(signer));
  };

  const handleOpenSignature = (signerIndex) => {
    if (!canSignSigner(signerIndex)) {
      toast.error("Please complete required earlier signatures first");
      return;
    }

    setCurrentSignerIndex(signerIndex);
    setShowSignatureDialog(true);
  };

  const handleSaveSignature = (dataUrl, method) => {
    const signer = workingSigners[currentSignerIndex];
    if (!signer) {
      return;
    }

    setSignatures((prev) => ({
      ...prev,
      [signer.id]: {
        dataUrl,
        method,
        timestamp: new Date().toISOString(),
      },
    }));

    setShowSignatureDialog(false);
    toast.success("Signature saved!");
  };

  const handleSubmitAll = async () => {
    if (!workingSigners.length) {
      toast.error("No signers were found for this document");
      return;
    }

    const updatedSigners = workingSigners.map((signer) => {
      const newSignature = signatures[signer.id];
      return {
        ...signer,
        signature: newSignature?.dataUrl || signer.signature || null,
        signature_method: newSignature?.method || signer.signature_method || null,
        signed_date: newSignature?.timestamp || signer.signed_date || null,
        ip_address: signer.ip_address || "unknown",
      };
    });

    const requiredSigners = updatedSigners.filter((signer) => signer.required !== false);
    const allRequiredSigned = requiredSigners.every((signer) => signer.signature);

    if (!allRequiredSigned) {
      toast.error("Please complete all required signatures");
      return;
    }

    const signedAt = new Date().toISOString();

    try {
      await updateSignatureMutation.mutateAsync({
        signatureData: {
          signers: updatedSigners,
          required_signatures: updatedSigners.map((signer) => ({
            signer_id: signer.id,
            name: signer.name,
            role: signer.role,
            is_required: signer.required !== false,
            is_signed: Boolean(signer.signature),
            signed_date: signer.signed_date,
            signature: signer.signature || null,
            signature_method: signer.signature_method || null,
            order: signer.order,
          })),
          document_name: getDocumentDisplayName(signatureRecord),
          document_title: signatureRecord.document_title || getDocumentDisplayName(signatureRecord),
          status: "signed",
          completed_date: signedAt,
          signed_at: signedAt,
          signed_date: signedAt,
          audit_trail: [
            ...(signatureRecord.audit_trail || []),
            {
              action: "all_signatures_completed",
              timestamp: signedAt,
              notes: `${updatedSigners.filter((signer) => signer.signature).length} signature(s) collected`,
            },
          ],
        },
      });

      toast.success("Document signed successfully!");

      setTimeout(() => {
        navigate(createPageUrl("DocumentSignatures"));
      }, 1200);
    } catch (error) {
      console.error(error);
      toast.error("Failed to save signatures");
    }
  };

  if (!signatureRecord) {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        <Card>
          <CardContent className="p-12 text-center">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600">Loading document...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getSignerStatus = (signer) => {
    if (isSignerLocallySigned(signer)) {
      return { label: "Ready to submit", color: "bg-blue-600" };
    }

    if (signer.signature || signer.signed_date) {
      return { label: "Signed", color: "bg-green-600" };
    }

    if (!canSignSigner(workingSigners.findIndex((candidate) => candidate.id === signer.id))) {
      return { label: "Waiting", color: "bg-slate-500" };
    }

    return { label: "Pending", color: "bg-yellow-600" };
  };

  const normalizedStatus = getNormalizedSignatureStatus(signatureRecord);
  const signedAt = getSignatureSignedAt(signatureRecord);
  const dueDate = getSignatureDueDate(signatureRecord);

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Sign Document</h1>
        <p className="text-gray-600">
          {patientDisplay.first_name} {patientDisplay.last_name} • {getDocumentDisplayName(signatureRecord)}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center justify-between gap-3">
            <span>Signing Summary</span>
            <Badge className={normalizedStatus === 'signed' ? 'bg-green-600' : 'bg-yellow-600'}>
              {normalizedStatus === 'signed' ? 'Signed' : 'Awaiting signatures'}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 sm:grid-cols-3 text-sm">
          <div className="rounded-lg border p-3">
            <p className="text-gray-500">Required signatures</p>
            <p className="text-lg font-semibold text-gray-900">
              {signatureSummary.signedRequiredCount} / {signatureSummary.requiredSigners || signatureSummary.totalSigners}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-gray-500">Due date</p>
            <p className="text-lg font-semibold text-gray-900">
              {dueDate ? new Date(dueDate).toLocaleDateString() : 'Not specified'}
            </p>
          </div>
          <div className="rounded-lg border p-3">
            <p className="text-gray-500">Completed</p>
            <p className="text-lg font-semibold text-gray-900">
              {signedAt ? new Date(signedAt).toLocaleString() : 'Not yet signed'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Document Preview</CardTitle>
        </CardHeader>
        <CardContent>
          {signatureRecord.document_url || urlParams.get('pdf_url') ? (
            <div className="border rounded-lg overflow-hidden">
              <iframe
                src={signatureRecord.document_url || urlParams.get('pdf_url')}
                className="w-full h-96"
                title="Document Preview"
              />
            </div>
          ) : signatureRecord.document_content ? (
            <div className="p-4 border rounded-lg bg-gray-50 max-h-96 overflow-auto">
              <div className="prose prose-sm max-w-none whitespace-pre-wrap">{signatureRecord.document_content}</div>
            </div>
          ) : (
            <Alert>
              <AlertDescription>Document content not available.</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Required Signatures</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {workingSigners.map((signer, index) => {
              const status = getSignerStatus(signer);
              const localSignature = signatures[signer.id];
              const isSigned = isSignerAlreadySigned(signer);
              const isLocked = !isSigned && !canSignSigner(index);

              return (
                <div
                  key={signer.id}
                  className="flex flex-col gap-3 border rounded-lg p-4 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="rounded-full bg-slate-100 p-2 shrink-0">
                      {isLocked ? <Lock className="w-5 h-5 text-slate-500" /> : <User className="w-5 h-5 text-gray-600" />}
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 break-words">{signer.name}</p>
                      <p className="text-sm text-gray-600 break-words">
                        {signer.role}
                        {signer.required !== false && <span className="text-red-600"> *</span>}
                        {signer.email ? ` • ${signer.email}` : ''}
                      </p>
                      {(signer.signed_date || localSignature?.timestamp) && (
                        <p className="text-xs text-gray-500 mt-1">
                          Signed: {new Date(localSignature?.timestamp || signer.signed_date).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-3 justify-end">
                    <Badge className={status.color}>{status.label}</Badge>

                    {!isSigned && (
                      <Button
                        size="sm"
                        onClick={() => handleOpenSignature(index)}
                        disabled={isLocked}
                        className="bg-blue-600 hover:bg-blue-700"
                      >
                        <Pen className="w-4 h-4 mr-2" />
                        {isLocked ? 'Waiting on prior signer' : 'Sign'}
                      </Button>
                    )}

                    {(localSignature?.dataUrl || signer.signature) && (
                      <div className="border rounded-lg p-1 bg-white">
                        <img
                          src={localSignature?.dataUrl || signer.signature}
                          alt="Signature"
                          className="h-8 w-24 object-contain"
                        />
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 justify-end">
        <Button
          variant="outline"
          onClick={() => navigate(createPageUrl("DocumentSignatures"))}
        >
          Cancel
        </Button>
        <Button
          onClick={handleSubmitAll}
          disabled={updateSignatureMutation.isPending || normalizedStatus === 'signed'}
          className="bg-green-600 hover:bg-green-700"
        >
          <CheckCircle2 className="w-4 h-4 mr-2" />
          {normalizedStatus === 'signed'
            ? 'Already Signed'
            : updateSignatureMutation.isPending
              ? 'Submitting...'
              : 'Submit All Signatures'}
        </Button>
      </div>

      {showSignatureDialog && (
        <Dialog open={showSignatureDialog} onOpenChange={setShowSignatureDialog}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {workingSigners[currentSignerIndex]?.name} - Please Sign
              </DialogTitle>
            </DialogHeader>
            <SignatureCanvas
              onSave={handleSaveSignature}
              onCancel={() => setShowSignatureDialog(false)}
              signerName={workingSigners[currentSignerIndex]?.name}
              isInitials={false}
            />
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

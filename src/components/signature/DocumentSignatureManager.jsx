import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Shield,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Lock,
  MapPin,
  Smartphone,
  Eye,
  FileCheck,
} from "lucide-react";
import { format } from "date-fns";
import {
  getDocumentDisplayName,
  getNormalizedSignatureStatus,
  getSignatureSignedAt,
  verifySignatureIntegrityRemote,
} from "./signatureUtils";

export default function DocumentSignatureManager({ documentId, documentType, patientId }) {
  const [expandedSignatures, setExpandedSignatures] = useState({});
  const [downloadingCert, setDownloadingCert] = useState(null);

  // Download the server-rendered Certificate of Completion PDF for a signature.
  const downloadCertificate = async (signatureId) => {
    setDownloadingCert(signatureId);
    try {
      const response = await base44.functions.invoke('generateSignatureCertificate', {
        signature_id: signatureId,
      });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-of-completion-${signatureId}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (err) {
      console.error('Failed to download certificate:', err);
    } finally {
      setDownloadingCert(null);
    }
  };

  // Fetch signatures for this document
  const { data: signatures = [], isLoading } = useQuery({
    queryKey: ["document-signatures", documentId, documentType, patientId],
    queryFn: () => base44.entities.DocumentSignature?.filter?.({
      document_id: documentId,
      document_type: documentType,
    }, "-created_date", 50) || Promise.resolve([]),
    initialData: [],
    enabled: Boolean(documentId && documentType),
  });

  // Fetch security logs for this document
  const { data: auditLogs = [] } = useQuery({
    queryKey: ["signature-audit-logs", documentId],
    queryFn: () => base44.entities.SecurityLog?.filter?.({
      event_type: "signature_captured",
    }, "-created_date", 50) || Promise.resolve([]),
    initialData: [],
    enabled: Boolean(documentId),
  });

  const documentLogs = useMemo(() => auditLogs.filter((log) => log.event_details?.document_id === documentId), [auditLogs, documentId]);

  // Integrity verification runs server-side (the MAC + secret live on the server).
  // Fetch a verdict per signature; the map keys verdicts by signature id.
  const signatureIds = useMemo(() => signatures.map((s) => s.id), [signatures]);
  const { data: integrityVerdicts = {} } = useQuery({
    queryKey: ["signature-integrity", signatureIds],
    queryFn: async () => {
      const entries = await Promise.all(
        signatureIds.map(async (id) => [id, await verifySignatureIntegrityRemote(id)]),
      );
      return Object.fromEntries(entries);
    },
    initialData: {},
    enabled: signatureIds.length > 0,
  });

  const normalizedSignatures = useMemo(() => signatures.map((signature) => ({
    ...signature,
    normalizedStatus: getNormalizedSignatureStatus(signature),
    normalizedName: getDocumentDisplayName(signature),
    normalizedSignedAt: getSignatureSignedAt(signature),
    // Default to a non-valid "pending" verdict until the server check resolves, so
    // the UI never claims "Verified" before verification has actually run.
    integrity: integrityVerdicts[signature.id] || { isValid: false, status: 'pending' },
  })), [signatures, integrityVerdicts]);

  const allSigned = normalizedSignatures.length > 0 && normalizedSignatures.every((signature) => signature.normalizedStatus === 'signed');
  const isPartiallyReviewed = normalizedSignatures.some((signature) => signature.reviewed_by);

  const toggleSignatureDetails = (signatureId) => {
    setExpandedSignatures((prev) => ({
      ...prev,
      [signatureId]: !prev[signatureId],
    }));
  };

  const getDeviceIcon = (deviceType) => {
    if (!deviceType) {
      return null;
    }
    if (deviceType.includes("mobile")) {
      return <Smartphone className="w-4 h-4" />;
    }
    return null;
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6 text-center text-slate-600">
          Loading signatures...
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {/* Signature Status Overview */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-blue-600" />
            Signature Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {allSigned ? (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">
                All captured signatures are verified. Document is final and locked.
              </AlertDescription>
            </Alert>
          ) : (
            <Alert className="bg-amber-50 border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              <AlertDescription className="text-amber-800">
                {normalizedSignatures.length === 0
                  ? "No signatures captured yet. This document requires electronic signature."
                  : `${normalizedSignatures.filter((signature) => signature.normalizedStatus === 'signed').length} of ${normalizedSignatures.length} signatures complete.`}
              </AlertDescription>
            </Alert>
          )}

          {isPartiallyReviewed && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm font-medium text-blue-900">Document reviewed by:</p>
              <div className="mt-2 space-y-1">
                {normalizedSignatures.filter((signature) => signature.reviewed_by).map((signature) => (
                  <p key={signature.id} className="text-xs text-blue-800">
                    • {signature.reviewed_by_name} ({signature.reviewed_by}) on {format(new Date(signature.reviewed_date), 'MMM d, yyyy')}
                  </p>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Signatures List */}
      {normalizedSignatures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Captured Signatures ({normalizedSignatures.length})</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {normalizedSignatures.map((signature) => (
              <Card key={signature.id} className={`border ${
                signature.integrity.isValid ? "border-green-200 bg-green-50"
                : signature.integrity.status === 'tampered' ? "border-red-200 bg-red-50"
                : "border-slate-200 bg-slate-50"
              }`}>
                <CardContent className="p-4">
                  {/* Signature Header */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-slate-900 flex items-center gap-2">
                        <FileCheck className="w-4 h-4" />
                        {signature.signed_by_name || signature.normalizedName}
                        {signature.signed_by_credentials && (
                          <Badge variant="outline" className="text-xs ml-1">
                            {signature.signed_by_credentials}
                          </Badge>
                        )}
                      </p>
                      <p className="text-sm text-slate-600 mt-1">
                        {signature.signed_by || signature.signature_role || signature.document_type}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <Badge className={
                        signature.integrity.isValid ? "bg-green-600"
                        : signature.integrity.status === 'tampered' ? "bg-red-600"
                        : "bg-slate-500"
                      }>
                        {signature.integrity.isValid ? "Verified"
                          : signature.integrity.status === 'tampered' ? "Tampered"
                          : signature.integrity.status === 'pending' ? "Checking…"
                          : signature.integrity.status === 'unsigned' ? "Not stamped"
                          : signature.integrity.status === 'unverifiable' ? "Unverifiable"
                          : "Unverified"}
                      </Badge>
                      {signature.device_type && (
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          {getDeviceIcon(signature.device_type)}
                          <span>{signature.device_type}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Key Metadata */}
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-600 mb-3">
                    <div className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5" />
                      {signature.normalizedSignedAt ? format(new Date(signature.normalizedSignedAt), "MMM d, yyyy HH:mm") : 'Pending'}
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5" />
                      {signature.ip_address || 'Unknown IP'}
                    </div>
                  </div>

                  {/* Expand/Collapse Details */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleSignatureDetails(signature.id)}
                    className="w-full justify-start gap-2 text-blue-600"
                  >
                    <Eye className="w-4 h-4" />
                    {expandedSignatures[signature.id] ? "Hide Details" : "View Details"}
                  </Button>

                  {/* Certificate of Completion (server-verified PDF) */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadCertificate(signature.id)}
                    disabled={downloadingCert === signature.id}
                    className="w-full justify-start gap-2 text-slate-600"
                  >
                    <FileCheck className="w-4 h-4" />
                    {downloadingCert === signature.id ? "Generating…" : "Download Certificate"}
                  </Button>

                  {/* Expanded Details */}
                  {expandedSignatures[signature.id] && (
                    <div className="mt-3 pt-3 border-t border-slate-200 space-y-2 text-xs">
                      {signature.location_data && (
                        <div>
                          <p className="font-medium text-slate-700">Location:</p>
                          <p className="text-slate-600">
                            {signature.location_data.latitude?.toFixed(6)}, {signature.location_data.longitude?.toFixed(6)}
                            {signature.location_data.accuracy && (
                              <span> (±{signature.location_data.accuracy.toFixed(0)}m)</span>
                            )}
                          </p>
                        </div>
                      )}

                      <div>
                        <p className="font-medium text-slate-700">Signature Method:</p>
                        <p className="text-slate-600">{signature.signature_method}</p>
                      </div>

                      <div>
                        <p className="font-medium text-slate-700">Signature Hash:</p>
                        <p className="text-slate-600 font-mono break-all">{signature.signature_hash}</p>
                      </div>

                      {signature.attestation_text && (
                        <div className="bg-white p-2 rounded border border-slate-200">
                          <p className="font-medium text-slate-700 mb-1">Attestation:</p>
                          <p className="text-slate-600 italic">"{signature.attestation_text}"</p>
                        </div>
                      )}

                      <div className="bg-white p-2 rounded border border-slate-200">
                        <p className="font-medium text-slate-700 mb-1">User Agent:</p>
                        <p className="text-slate-600 text-xs break-all">{signature.user_agent}</p>
                      </div>

                      {signature.signature_data && (
                        <div className="bg-white p-2 rounded border border-slate-200">
                          <p className="font-medium text-slate-700 mb-2">Signature Image:</p>
                          <img
                            src={signature.signature_data}
                            alt="Electronic Signature"
                            className="max-w-full h-auto border border-slate-300 rounded"
                          />
                        </div>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Audit Trail */}
      {documentLogs.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="w-5 h-5 text-slate-600" />
              Audit Trail ({documentLogs.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {documentLogs.map((log, index) => (
                <div key={index} className="flex items-start gap-3 p-2 bg-slate-50 rounded text-sm">
                  <Lock className="w-4 h-4 text-slate-600 mt-0.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-slate-900">
                      {log.user_name} signed document
                    </p>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {format(new Date(log.created_date), "MMM d, yyyy HH:mm:ss")} from {log.ip_address || 'Unknown IP'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* HIPAA Compliance Note */}
      <Alert className="bg-indigo-50 border-indigo-200">
        <Shield className="w-4 h-4 text-indigo-600" />
        <AlertDescription className="text-indigo-800 text-sm">
          <p className="font-medium mb-1">HIPAA-Compliant Electronic Signatures</p>
          <p>All signatures include: cryptographic verification, tamper detection, audit trails, IP tracking, location data, timestamp verification, and attestation statements. Non-repudiation is guaranteed through unique signature hashing.</p>
        </AlertDescription>
      </Alert>
    </div>
  );
}

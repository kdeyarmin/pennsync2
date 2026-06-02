import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  MapPin,
  Monitor,
  FileText,
  Download,
} from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { verifySignatureIntegrity } from './signatureUtils';

export default function SignatureAuditTrail({ documentId, documentType }) {
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [verificationResults, setVerificationResults] = useState({});

  useEffect(() => {
    loadSignatures();
  }, [documentId, documentType]);

  const loadSignatures = async () => {
    try {
      const signatureResults = await base44.entities.DocumentSignature.filter({
        document_id: documentId,
        document_type: documentType,
      }, '-created_date', 50);

      setSignatures(signatureResults);

      // Verify each signature using the shared integrity util (same hash used to sign)
      const results = {};
      for (const signature of signatureResults) {
        results[signature.id] = verifySignatureIntegrity(signature);
      }
      setVerificationResults(results);
    } catch (error) {
      console.error('Failed to load signatures:', error);
      toast.error('Failed to load signature audit trail');
    } finally {
      setLoading(false);
    }
  };

  const exportAuditTrail = async () => {
    try {
      if (signatures.length === 0) {
        toast.error('No audit trail data available to export');
        return;
      }

      const auditData = signatures.map((signature) => ({
        signature_id: signature.id,
        document_type: signature.document_type,
        document_id: signature.document_id,
        signed_by: signature.signed_by_name,
        credentials: signature.signed_by_credentials,
        signed_date: signature.signed_date,
        ip_address: signature.ip_address,
        location: signature.location_data ? `${signature.location_data.latitude}, ${signature.location_data.longitude}` : 'N/A',
        device_type: signature.device_type,
        verification_status: verificationResults[signature.id]?.isValid ? 'VALID' : 'TAMPERED',
        signature_hash: signature.signature_hash,
      }));

      const csvContent = [
        Object.keys(auditData[0]).join(','),
        ...auditData.map((row) => Object.values(row).map((value) => `"${String(value ?? '').replaceAll('"', '""')}"`).join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `signature_audit_trail_${documentId}_${Date.now()}.csv`;
      anchor.click();
      window.URL.revokeObjectURL(url);

      toast.success('Audit trail exported successfully');
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Failed to export audit trail');
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-slate-600">Loading signature audit trail...</p>
        </CardContent>
      </Card>
    );
  }

  if (signatures.length === 0) {
    return (
      <Card>
        <CardContent className="p-6">
          <p className="text-slate-600">No signatures found for this document.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-indigo-600" />
              <CardTitle>Signature Audit Trail</CardTitle>
            </div>
            <Button variant="outline" size="sm" onClick={exportAuditTrail}>
              <Download className="w-4 h-4 mr-2" />
              Export Audit Trail
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {signatures.map((signature) => {
            const verification = verificationResults[signature.id];
            return (
              <Card key={signature.id} className="border-2 border-slate-200">
                <CardContent className="p-4 space-y-3">
                  {/* Verification Status */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {verification?.isValid ? (
                        <>
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          <Badge className="bg-green-500">Verified</Badge>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-5 h-5 text-red-600" />
                          <Badge className="bg-red-500">Tampered</Badge>
                        </>
                      )}
                    </div>
                    <span className="text-xs text-slate-500">
                      Signature ID: {signature.id.slice(0, 8)}
                    </span>
                  </div>

                  {/* Signature Preview */}
                  <div className="border rounded-lg p-2 bg-white">
                    <img
                      src={signature.signature_data}
                      alt="Signature"
                      className="h-16 mx-auto"
                    />
                  </div>

                  {/* Signer Info */}
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="flex items-start gap-2">
                      <FileText className="w-4 h-4 text-slate-500 mt-0.5" />
                      <div>
                        <p className="font-semibold text-slate-900">Signed By:</p>
                        <p className="text-slate-700">{signature.signed_by_name}</p>
                        <p className="text-slate-600 text-xs">{signature.signed_by_credentials}</p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Calendar className="w-4 h-4 text-slate-500 mt-0.5" />
                      <div>
                        <p className="font-semibold text-slate-900">Date & Time:</p>
                        <p className="text-slate-700">
                          {new Date(signature.signed_date).toLocaleString()}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-start gap-2">
                      <Monitor className="w-4 h-4 text-slate-500 mt-0.5" />
                      <div>
                        <p className="font-semibold text-slate-900">Device:</p>
                        <p className="text-slate-700">{signature.device_type}</p>
                        <p className="text-slate-600 text-xs">IP: {signature.ip_address}</p>
                      </div>
                    </div>

                    {signature.location_data && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-4 h-4 text-slate-500 mt-0.5" />
                        <div>
                          <p className="font-semibold text-slate-900">Location:</p>
                          <p className="text-slate-700 text-xs">
                            {signature.location_data.latitude.toFixed(6)}, {signature.location_data.longitude.toFixed(6)}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Cryptographic Hash */}
                  <div className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs font-semibold text-slate-900 mb-1">Cryptographic Hash:</p>
                    <code className="text-xs text-slate-700 font-mono break-all">
                      {signature.signature_hash}
                    </code>
                  </div>

                  {/* Tamper Warning */}
                  {!verification?.isValid && (
                    <Alert className="bg-red-50 border-red-300">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <AlertDescription className="text-sm text-red-900">
                        <strong>Warning:</strong> This signature has been tampered with or corrupted. The calculated hash does not match the stored hash.
                      </AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </CardContent>
      </Card>

      {/* Security Info */}
      <Alert className="bg-blue-50 border-blue-300">
        <Shield className="w-4 h-4 text-blue-600" />
        <AlertDescription className="text-sm text-blue-900">
          <p className="font-semibold mb-1">Regulatory Compliance</p>
          <p>All signatures are secured with cryptographic hashing and include comprehensive audit metadata (timestamp, IP address, location, device information) to meet HIPAA and Medicare regulatory requirements.</p>
        </AlertDescription>
      </Alert>
    </div>
  );
}

import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { PenTool, CheckCircle2, Eye } from 'lucide-react';
import SecureESignatureCapture from './SecureESignatureCapture';
import SignatureAuditTrail from './SignatureAuditTrail';

export default function VisitNoteSignatureWorkflow({ visitId, visitNote, onSignatureComplete }) {
  const [signatureDialogOpen, setSignatureDialogOpen] = useState(false);
  const [auditTrailOpen, setAuditTrailOpen] = useState(false);
  const [isSigned, setIsSigned] = useState(visitNote?.is_signed || false);

  const handleSignatureComplete = (signatureRecord) => {
    setIsSigned(true);
    setSignatureDialogOpen(false);
    if (onSignatureComplete) {
      onSignatureComplete(signatureRecord);
    }
  };

  return (
    <>
      <Card className="border-2 border-indigo-200">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {isSigned ? (
                <>
                  <CheckCircle2 className="w-6 h-6 text-green-600" />
                  <div>
                    <p className="font-semibold text-gray-900">Document Signed</p>
                    <p className="text-sm text-gray-600">This visit note has been electronically signed</p>
                  </div>
                </>
              ) : (
                <>
                  <PenTool className="w-6 h-6 text-indigo-600" />
                  <div>
                    <p className="font-semibold text-gray-900">Signature Required</p>
                    <p className="text-sm text-gray-600">Sign this visit note to finalize documentation</p>
                  </div>
                </>
              )}
            </div>

            <div className="flex items-center gap-2">
              {isSigned && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setAuditTrailOpen(true)}
                >
                  <Eye className="w-4 h-4 mr-2" />
                  View Audit Trail
                </Button>
              )}
              
              {!isSigned && (
                <Button
                  onClick={() => setSignatureDialogOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700"
                >
                  <PenTool className="w-4 h-4 mr-2" />
                  Sign Document
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Signature Capture Dialog */}
      <Dialog open={signatureDialogOpen} onOpenChange={setSignatureDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Sign Visit Note</DialogTitle>
          <SecureESignatureCapture
            documentType="visit_note"
            documentId={visitId}
            documentTitle={`Visit Note - ${visitNote?.patient_name || 'Patient'}`}
            onSignatureComplete={handleSignatureComplete}
          />
        </DialogContent>
      </Dialog>

      {/* Audit Trail Dialog */}
      <Dialog open={auditTrailOpen} onOpenChange={setAuditTrailOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogTitle className="sr-only">Signature Audit Trail</DialogTitle>
          <SignatureAuditTrail
            documentId={visitId}
            documentType="visit_note"
          />
        </DialogContent>
      </Dialog>
    </>
  );
}
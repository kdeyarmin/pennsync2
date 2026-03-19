import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Pen,
  Send,
  Eye,
  Search,
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import SearchablePatientSelect from "../components/ui/SearchablePatientSelect";
import {
  getDocumentDisplayName,
  getNormalizedSignatureStatus,
  getSignatureDueDate,
  getSignatureSignedAt,
} from "@/components/signature/signatureUtils";

export default function DocumentSignatures() {
  const navigate = useNavigate();
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: allSignatures = [], refetch } = useQuery({
    queryKey: ['all-signatures', selectedPatient],
    queryFn: () => {
      if (selectedPatient) {
        return base44.entities.DocumentSignature.filter({ patient_id: selectedPatient }, '-created_date', 200);
      }
      return base44.entities.DocumentSignature.list('-created_date', 200);
    },
    initialData: [],
    refetchInterval: 5000,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients-list'],
    queryFn: () => base44.entities.Patient.list('-created_date', 500),
    initialData: [],
  });

  const normalizedSignatures = useMemo(() => allSignatures.map((signature) => ({
    ...signature,
    normalizedStatus: getNormalizedSignatureStatus(signature),
    normalizedName: getDocumentDisplayName(signature),
    normalizedDueDate: getSignatureDueDate(signature),
    normalizedSignedAt: getSignatureSignedAt(signature),
  })), [allSignatures]);

  const handleSignDocument = (signature) => {
    const params = new URLSearchParams({
      signature_id: signature.id,
      patient_id: signature.patient_id,
    });

    if (signature.original_pdf_url || signature.document_url) {
      params.set('pdf_url', signature.original_pdf_url || signature.document_url);
    }

    navigate(createPageUrl(`SignDocument?${params.toString()}`));
  };

  const handleSendReminder = async (signature) => {
    try {
      await base44.functions.invoke('sendSignatureReminder', {
        signature_id: signature.id,
      });
      toast.success("Reminder sent successfully!");
    } catch (error) {
      toast.error(`Failed to send reminder: ${error.message}`);
    }
  };

  const isOverdue = (signature) => (
    signature.normalizedStatus !== 'signed'
    && signature.normalizedDueDate
    && new Date(signature.normalizedDueDate) < new Date()
  );

  const filteredSignatures = normalizedSignatures.filter((signature) => {
    if (!searchQuery.trim()) {
      return true;
    }

    const query = searchQuery.toLowerCase();
    const patient = patients.find((candidate) => candidate.id === signature.patient_id);
    const patientName = patient ? `${patient.first_name} ${patient.last_name}`.toLowerCase() : '';

    return (
      signature.normalizedName.toLowerCase().includes(query)
      || patientName.includes(query)
      || signature.document_type?.toLowerCase().includes(query)
    );
  });

  const pendingSignatures = filteredSignatures.filter((signature) => signature.normalizedStatus !== 'signed');
  const signedSignatures = filteredSignatures.filter((signature) => signature.normalizedStatus === 'signed');

  const stats = {
    total: normalizedSignatures.length,
    pending: normalizedSignatures.filter((signature) => signature.normalizedStatus !== 'signed').length,
    signed: normalizedSignatures.filter((signature) => signature.normalizedStatus === 'signed').length,
    overdue: normalizedSignatures.filter((signature) => isOverdue(signature)).length,
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Document Signatures</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Track and manage electronic signatures
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge className="bg-yellow-100 text-yellow-800">
            {stats.pending} Pending
          </Badge>
          {stats.overdue > 0 && (
            <Badge className="bg-red-100 text-red-800">
              {stats.overdue} Overdue
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-900' },
          { label: 'Pending', value: stats.pending, color: 'text-yellow-600' },
          { label: 'Signed', value: stats.signed, color: 'text-green-600' },
          { label: 'Overdue', value: stats.overdue, color: 'text-red-600' },
        ].map((stat) => (
          <Card key={stat.label}>
            <CardContent className="p-4">
              <div className="text-center">
                <p className={`text-xl sm:text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-gray-600">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <SearchablePatientSelect
                value={selectedPatient}
                onChange={setSelectedPatient}
                placeholder="Filter by patient (optional)"
              />
            </div>
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="pl-10"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => refetch()}
              className="w-full sm:w-auto"
            >
              Refresh
            </Button>
          </div>
        </CardContent>
      </Card>

      {pendingSignatures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg text-yellow-700">
              Pending Signatures ({pendingSignatures.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {pendingSignatures.map((signature) => {
                const patient = patients.find((candidate) => candidate.id === signature.patient_id);
                const patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown';

                return (
                  <div
                    key={signature.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border rounded-lg hover:bg-yellow-50"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <Clock className="w-5 h-5 text-yellow-600 shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 break-words">{signature.normalizedName}</h4>
                        <p className="text-sm text-gray-600">{patientName}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1">
                          {isOverdue(signature) && (
                            <Badge className="bg-red-100 text-red-700">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Overdue
                            </Badge>
                          )}
                          {signature.normalizedDueDate && (
                            <span className="text-xs text-gray-500">
                              Due: {new Date(signature.normalizedDueDate).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col sm:flex-row gap-2">
                      <Button
                        size="sm"
                        onClick={() => handleSignDocument(signature)}
                        className="w-full sm:w-auto"
                      >
                        <Pen className="w-4 h-4 mr-2" />
                        Sign
                      </Button>
                      {currentUser?.role === 'admin' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendReminder(signature)}
                          className="w-full sm:w-auto"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Remind
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {signedSignatures.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base sm:text-lg text-green-700">
              Completed Signatures ({signedSignatures.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {signedSignatures.map((signature) => {
                const patient = patients.find((candidate) => candidate.id === signature.patient_id);
                const patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown';

                return (
                  <div
                    key={signature.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 border rounded-lg hover:bg-green-50"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 break-words">{signature.normalizedName}</h4>
                        <p className="text-sm text-gray-600">{patientName}</p>
                        {signature.normalizedSignedAt && (
                          <span className="text-xs text-gray-500">
                            Signed: {new Date(signature.normalizedSignedAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                    {(signature.signed_pdf_url || signature.document_url || signature.original_pdf_url) && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(signature.signed_pdf_url || signature.document_url || signature.original_pdf_url, '_blank')}
                        className="w-full sm:w-auto"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {filteredSignatures.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600">No signatures found</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

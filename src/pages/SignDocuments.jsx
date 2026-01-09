import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  FileText, 
  Clock, 
  CheckCircle2,
  AlertTriangle,
  Pen
} from "lucide-react";
import { createPageUrl } from "@/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export default function SignDocuments() {
  const navigate = useNavigate();
  const [selectedPatient, setSelectedPatient] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: patients = [] } = useQuery({
    queryKey: ['patients-for-signing'],
    queryFn: () => base44.entities.Patient.list('-created_date', 500),
    initialData: []
  });

  const { data: pendingSignatures = [], refetch } = useQuery({
    queryKey: ['pending-signatures', selectedPatient],
    queryFn: () => {
      if (selectedPatient) {
        return base44.entities.DocumentSignature.filter({ 
          patient_id: selectedPatient,
          status: 'pending'
        });
      }
      return base44.entities.DocumentSignature.filter({ status: 'pending' });
    },
    initialData: [],
    refetchInterval: 5000 // Real-time updates every 5 seconds
  });

  const handleSignDocument = (signature) => {
    const url = createPageUrl(`SignDocument?pdf_url=${encodeURIComponent(signature.original_pdf_url)}&signature_id=${signature.id}&patient_id=${signature.patient_id}`);
    navigate(url);
  };

  const handleSendReminder = async (signature) => {
    try {
      await base44.functions.invoke('sendSignatureReminder', {
        signature_id: signature.id
      });
      toast.success("Reminder sent successfully!");
    } catch (error) {
      toast.error(`Failed to send reminder: ${error.message}`);
    }
  };

  const isOverdue = (signature) => {
    return signature.due_date && new Date(signature.due_date) < new Date();
  };

  const groupedByPatient = pendingSignatures.reduce((acc, sig) => {
    const patient = patients.find(p => p.id === sig.patient_id);
    const patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown Patient';
    
    if (!acc[sig.patient_id]) {
      acc[sig.patient_id] = {
        patient_name: patientName,
        signatures: []
      };
    }
    acc[sig.patient_id].signatures.push(sig);
    return acc;
  }, {});

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Pending Signatures</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Sign documents electronically and track signature status
          </p>
        </div>
        <Badge className="bg-yellow-100 text-yellow-800 self-start sm:self-auto">
          {pendingSignatures.length} Pending
        </Badge>
      </div>

      {/* Filter by Patient */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={selectedPatient || ''}
              onChange={(e) => setSelectedPatient(e.target.value || null)}
              className="flex-1 h-10 w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm"
            >
              <option value="">All Patients</option>
              {patients.map(p => (
                <option key={p.id} value={p.id}>
                  {p.first_name} {p.last_name}
                </option>
              ))}
            </select>
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

      {/* Pending Signatures */}
      <div className="space-y-4">
        {Object.entries(groupedByPatient).map(([patientId, data]) => (
          <Card key={patientId}>
            <CardHeader>
              <CardTitle className="text-base sm:text-lg">{data.patient_name}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.signatures.map((signature) => (
                  <div
                    key={signature.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 border rounded-lg hover:bg-gray-50"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-blue-600 shrink-0 mt-1" />
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 break-words">{signature.document_name}</h4>
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          <Badge className="bg-yellow-100 text-yellow-800">
                            <Clock className="w-3 h-3 mr-1" />
                            Pending
                          </Badge>
                          {isOverdue(signature) && (
                            <Badge className="bg-red-100 text-red-700">
                              <AlertTriangle className="w-3 h-3 mr-1" />
                              Overdue
                            </Badge>
                          )}
                          {signature.due_date && (
                            <span className="text-xs text-gray-600">
                              Due: {new Date(signature.due_date).toLocaleDateString()}
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
                        Sign Now
                      </Button>
                      {currentUser?.role === 'admin' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSendReminder(signature)}
                          className="w-full sm:w-auto"
                        >
                          Send Reminder
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}

        {pendingSignatures.length === 0 && (
          <Card>
            <CardContent className="text-center py-12">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-1">All Caught Up!</h3>
              <p className="text-gray-600">No pending signatures at this time.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
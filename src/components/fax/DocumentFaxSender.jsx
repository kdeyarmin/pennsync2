import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sendFax } from "@/functions/sendFax";
import FaxAddressBook from "./FaxAddressBook";
import FaxSignaturePanel from "./FaxSignaturePanel";

export default function DocumentFaxSender({ patientId }) {
  const [selectedDocId, setSelectedDocId] = useState("");
  const [toNumber, setToNumber] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [signatureDataUrl, setSignatureDataUrl] = useState(null);

  const { data: documents = [] } = useQuery({
    queryKey: patientId ? ['patient-documents', patientId] : ['documents'],
    queryFn: () => patientId
      ? base44.entities.Document.filter({ patient_id: patientId }, '-created_date', 100)
      : base44.entities.Document.list('-created_date', 100),
    initialData: []
  });

  const pdfDocuments = documents.filter(doc =>
    doc.file_type?.includes('pdf') || doc.file_name?.toLowerCase().endsWith('.pdf')
  );

  const handleSendFax = async () => {
    if (!selectedDocId || !toNumber.trim()) {
      toast.error("Please select a document and enter a recipient number");
      return;
    }
    const doc = pdfDocuments.find(d => d.id === selectedDocId);
    if (!doc) return toast.error("Document not found");

    setIsSending(true);
    try {
      await sendFax({
        file_url: doc.file_url,
        to_number: toNumber,
        document_name: doc.title,
        patient_id: patientId
      });
      toast.success("Fax sent successfully!");
      setSelectedDocId("");
      setToNumber("");
    } catch (error) {
      toast.error("Failed to send fax: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-5">
        <div className="space-y-2">
          <Label>Select Document</Label>
          <Select value={selectedDocId} onValueChange={setSelectedDocId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a PDF document" />
            </SelectTrigger>
            <SelectContent>
              {pdfDocuments.length === 0 ? (
                <div className="p-4 text-sm text-gray-500 text-center">No PDF documents available</div>
              ) : (
                pdfDocuments.map(doc => (
                  <SelectItem key={doc.id} value={doc.id}>{doc.title}</SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label>Recipient Fax Number</Label>
          <Input
            type="tel"
            placeholder="+1234567890"
            value={toNumber}
            onChange={(e) => setToNumber(e.target.value)}
          />
          <FaxAddressBook onSelectContact={(c) => setToNumber(c.fax_number)} />
        </div>

        <Button onClick={handleSendFax} disabled={isSending || !selectedDocId || !toNumber.trim()} className="w-full" size="lg">
          {isSending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Send className="w-5 h-5 mr-2" />}
          {isSending ? "Sending..." : "Send Fax"}
        </Button>
      </CardContent>
    </Card>
  );
}
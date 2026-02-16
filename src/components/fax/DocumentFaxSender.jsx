import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileText, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { sendFax } from "@/functions/sendFax";
import FaxAddressBook from "./FaxAddressBook";

export default function DocumentFaxSender({ patientId }) {
  const [selectedDocId, setSelectedDocId] = useState("");
  const [fromNumber, setFromNumber] = useState("");
  const [toNumber, setToNumber] = useState("");
  const [isSending, setIsSending] = useState(false);

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
    if (!selectedDocId || !fromNumber || !toNumber) {
      toast.error("Please fill in all fields");
      return;
    }

    const doc = pdfDocuments.find(d => d.id === selectedDocId);
    if (!doc) {
      toast.error("Document not found");
      return;
    }

    setIsSending(true);
    try {
      await sendFax({ 
        from: fromNumber, 
        to: toNumber, 
        media_url: doc.file_url,
        document_name: doc.title,
        patient_id: patientId
      });

      toast.success("Fax sent successfully!");
      setSelectedDocId("");
      setFromNumber("");
      setToNumber("");
    } catch (error) {
      toast.error("Failed to send fax: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Send Document as Fax
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Select Document</Label>
          <Select value={selectedDocId} onValueChange={setSelectedDocId}>
            <SelectTrigger>
              <SelectValue placeholder="Choose a PDF document" />
            </SelectTrigger>
            <SelectContent>
              {pdfDocuments.length === 0 ? (
                <div className="p-4 text-sm text-gray-500 text-center">
                  No PDF documents available
                </div>
              ) : (
                pdfDocuments.map(doc => (
                  <SelectItem key={doc.id} value={doc.id}>
                    {doc.title} - {doc.category}
                  </SelectItem>
                ))
              )}
            </SelectContent>
          </Select>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label>From Number</Label>
            <Input
              type="tel"
              placeholder="+1234567890"
              value={fromNumber}
              onChange={(e) => setFromNumber(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>To Number</Label>
            <Input
              type="tel"
              placeholder="+1234567890"
              value={toNumber}
              onChange={(e) => setToNumber(e.target.value)}
            />
          </div>
        </div>

        <div>
          <Label className="mb-2 block">Or Select from Address Book</Label>
          <FaxAddressBook
            onSelectContact={(contact) => {
              setToNumber(contact.fax_number);
              toast.success(`Selected ${contact.name}`);
            }}
          />
        </div>

        <Button
          onClick={handleSendFax}
          disabled={isSending}
          className="w-full"
          size="lg"
        >
          {isSending ? (
            <>
              <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              Sending Fax...
            </>
          ) : (
            <>
              <Send className="w-5 h-5 mr-2" />
              Send Fax
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, Loader2, X, Send, Camera } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import FaxAddressBook from "./FaxAddressBook";
import FaxSignaturePanel from "./FaxSignaturePanel";

export default function PhotoUploadFaxSender() {
  const [uploadedImages, setUploadedImages] = useState([]);
  const [toNumber, setToNumber] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);
  const queryClient = useQueryClient();

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setIsProcessing(true);
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`);
        continue;
      }
      try {
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setUploadedImages(prev => [...prev, { url: file_url, name: file.name }]);
      } catch {
        toast.error(`Failed to upload ${file.name}`);
      }
    }
    setIsProcessing(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const generatePDF = async () => {
    const pdf = new jsPDF();
    let isFirstPage = true;
    for (const image of uploadedImages) {
      if (!isFirstPage) pdf.addPage();
      const response = await fetch(image.url);
      const blob = await response.blob();
      const dataUrl = await new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result);
        reader.readAsDataURL(blob);
      });
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(dataUrl, 'JPEG', 0, 0, pageWidth, pageHeight);
      isFirstPage = false;
    }
    const pdfBlob = pdf.output('blob');
    const pdfFile = new File([pdfBlob], 'fax-document.pdf', { type: 'application/pdf' });
    const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });
    return file_url;
  };

  const handleSendFax = async () => {
    if (!toNumber.trim()) return toast.error("Please enter a recipient fax number");
    if (uploadedImages.length === 0) return toast.error("Please upload at least one image");
    setIsSending(true);
    try {
      const pdfUrl = await generatePDF();
      await base44.functions.invoke('sendFax', {
        to_number: toNumber,
        document_url: pdfUrl,
        document_name: 'Photo Fax'
      });
      toast.success("Fax sent successfully!");
      setUploadedImages([]);
      setToNumber("");
      queryClient.invalidateQueries(['fax-logs']);
    } catch (error) {
      toast.error("Failed to send fax: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-5">
        {/* Upload */}
        <div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple onChange={handleFileSelect} className="hidden" />
          <Button onClick={() => fileInputRef.current?.click()} disabled={isProcessing} className="w-full" size="lg" variant="outline">
            {isProcessing ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Camera className="w-5 h-5 mr-2" />}
            {isProcessing ? "Uploading..." : "Select Photos"}
          </Button>
        </div>

        {/* Preview */}
        {uploadedImages.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {uploadedImages.map((image, index) => (
              <div key={index} className="relative group">
                <img src={image.url} alt={image.name} className="w-full h-24 object-cover rounded-lg border" />
                <button
                  onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== index))}
                  className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Recipient */}
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

        {/* Send */}
        <Button
          onClick={handleSendFax}
          disabled={uploadedImages.length === 0 || isSending || !toNumber.trim()}
          className="w-full"
          size="lg"
        >
          {isSending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Send className="w-5 h-5 mr-2" />}
          {isSending ? "Sending..." : "Send Fax"}
        </Button>
      </CardContent>
    </Card>
  );
}
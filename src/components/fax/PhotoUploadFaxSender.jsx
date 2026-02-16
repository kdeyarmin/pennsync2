import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Upload, Image as ImageIcon, FileText, Loader2, X, Send, Save, Camera, Lightbulb, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import jsPDF from "jspdf";
import FaxAddressBook from "./FaxAddressBook";

export default function PhotoUploadFaxSender() {
  const [uploadedImages, setUploadedImages] = useState([]);
  const [fromNumber, setFromNumber] = useState("");
  const [toNumbers, setToNumbers] = useState([""]);
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
        // Upload image
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        
        setUploadedImages(prev => [...prev, {
          url: file_url,
          name: file.name,
          size: file.size
        }]);

        toast.success(`${file.name} uploaded`);
      } catch (error) {
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setIsProcessing(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeImage = (index) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const generatePDF = async () => {
    if (uploadedImages.length === 0) {
      toast.error("No images to convert");
      return null;
    }

    try {
      const pdf = new jsPDF();
      let isFirstPage = true;

      for (const image of uploadedImages) {
        if (!isFirstPage) {
          pdf.addPage();
        }

        // Fetch image and add to PDF
        const response = await fetch(image.url);
        const blob = await response.blob();
        const dataUrl = await new Promise((resolve) => {
          const reader = new FileReader();
          reader.onloadend = () => resolve(reader.result);
          reader.readAsDataURL(blob);
        });

        // Add image to PDF (fit to page)
        const pageWidth = pdf.internal.pageSize.getWidth();
        const pageHeight = pdf.internal.pageSize.getHeight();
        pdf.addImage(dataUrl, 'JPEG', 0, 0, pageWidth, pageHeight);

        isFirstPage = false;
      }

      // Convert to blob and upload
      const pdfBlob = pdf.output('blob');
      const pdfFile = new File([pdfBlob], 'fax-document.pdf', { type: 'application/pdf' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfFile });

      return file_url;
    } catch (error) {
      console.error('PDF generation failed:', error);
      throw error;
    }
  };

  const handleSavePDF = async () => {
    setIsProcessing(true);
    try {
      const pdfUrl = await generatePDF();
      
      // Download the PDF
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = 'fax-document.pdf';
      link.click();

      toast.success("PDF saved successfully");
    } catch (error) {
      toast.error("Failed to save PDF");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSendFax = async () => {
    if (!fromNumber || toNumbers.filter(n => n.trim()).length === 0) {
      toast.error("Please enter sender and recipient fax numbers");
      return;
    }

    if (uploadedImages.length === 0) {
      toast.error("Please upload at least one image");
      return;
    }

    setIsSending(true);

    try {
      // Generate PDF
      const pdfUrl = await generatePDF();

      // Send fax to each recipient
      const validRecipients = toNumbers.filter(n => n.trim());
      for (const recipient of validRecipients) {
        await base44.functions.invoke('sendFax', {
          from_number: fromNumber,
          to_number: recipient,
          document_url: pdfUrl,
          document_name: 'Photo Fax Document'
        });
      }

      toast.success(`Fax sent to ${validRecipients.length} recipient(s)`);
      
      // Reset form
      setUploadedImages([]);
      setFromNumber("");
      setToNumbers([""]);
      
      queryClient.invalidateQueries(['fax-logs']);
    } catch (error) {
      toast.error("Failed to send fax: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  const addRecipient = () => {
    setToNumbers([...toNumbers, ""]);
  };

  const updateRecipient = (index, value) => {
    const updated = [...toNumbers];
    updated[index] = value;
    setToNumbers(updated);
  };

  const removeRecipient = (index) => {
    if (toNumbers.length > 1) {
      setToNumbers(toNumbers.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="space-y-6">
      {/* Photo Tips Card */}
      <Card className="border-yellow-200 bg-gradient-to-br from-yellow-50 to-amber-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Lightbulb className="w-5 h-5 text-yellow-600" />
            Tips for Better Photo Quality
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="space-y-2 text-sm text-gray-700">
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span><strong>Good lighting:</strong> Use natural light or bright room lighting. Avoid shadows on the document.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span><strong>Flat surface:</strong> Place document on a flat, contrasting surface to ensure clear edges.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span><strong>Directly overhead:</strong> Hold your camera/phone directly above the document, parallel to it.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span><strong>Fill the frame:</strong> Get close enough so the document fills most of the photo frame.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span><strong>Steady hands:</strong> Hold steady or use a surface to rest your device. Tap to focus before capturing.</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
              <span><strong>Check clarity:</strong> Review the photo before uploading. Text should be sharp and readable.</span>
            </li>
          </ul>
        </CardContent>
      </Card>

      {/* Upload Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="w-5 h-5" />
            Upload Photos
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="w-full"
              size="lg"
            >
              {isProcessing ? (
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
              ) : (
                <Camera className="w-5 h-5 mr-2" />
              )}
              Select Photos
            </Button>
          </div>

          {/* Image Preview */}
          {uploadedImages.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-700">
                  Uploaded Images ({uploadedImages.length})
                </p>
                <Badge variant="outline">{uploadedImages.length} page{uploadedImages.length !== 1 ? 's' : ''}</Badge>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {uploadedImages.map((image, index) => (
                  <div key={index} className="relative group">
                    <img
                      src={image.url}
                      alt={image.name}
                      className="w-full h-32 object-cover rounded-lg border border-gray-200"
                    />
                    <Button
                      variant="destructive"
                      size="icon"
                      className="absolute top-2 right-2 h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                      onClick={() => removeImage(index)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                    <p className="text-xs text-gray-500 mt-1 truncate">{image.name}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fax Details Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Fax Details
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>From (Your Fax Number)</Label>
            <Input
              placeholder="+1234567890"
              value={fromNumber}
              onChange={(e) => setFromNumber(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label>To (Recipient Fax Numbers)</Label>
            {toNumbers.map((number, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder="+1234567890"
                  value={number}
                  onChange={(e) => updateRecipient(index, e.target.value)}
                />
                {toNumbers.length > 1 && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => removeRecipient(index)}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addRecipient}>
              + Add Recipient
            </Button>
          </div>

          {/* Address Book Integration */}
          <div className="pt-4 border-t">
            <FaxAddressBook
              onSelectContact={(contact) => {
                if (toNumbers[toNumbers.length - 1] === "") {
                  updateRecipient(toNumbers.length - 1, contact.fax_number);
                } else {
                  setToNumbers([...toNumbers, contact.fax_number]);
                }
              }}
            />
          </div>
        </CardContent>
      </Card>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          onClick={handleSavePDF}
          disabled={uploadedImages.length === 0 || isProcessing}
          variant="outline"
          className="flex-1"
        >
          {isProcessing ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Save className="w-4 h-4 mr-2" />
          )}
          Save as PDF
        </Button>
        <Button
          onClick={handleSendFax}
          disabled={uploadedImages.length === 0 || isSending || !fromNumber || toNumbers.filter(n => n.trim()).length === 0}
          className="flex-1"
        >
          {isSending ? (
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          ) : (
            <Send className="w-4 h-4 mr-2" />
          )}
          Send Fax
        </Button>
      </div>
    </div>
  );
}
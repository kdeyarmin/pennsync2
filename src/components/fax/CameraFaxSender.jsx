import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Send, X, Loader2, BookUser } from "lucide-react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { sendFax } from "@/functions/sendFax";
import FaxAddressBook from "./FaxAddressBook";

export default function CameraFaxSender() {
  const [stream, setStream] = useState(null);
  const [capturedImages, setCapturedImages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [toNumber, setToNumber] = useState("");
  const [fromNumber, setFromNumber] = useState("");
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      toast.error("Failed to access camera: " + error.message);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageDataUrl = canvas.toDataURL("image/jpeg", 0.9);
    setCapturedImages(prev => [...prev, imageDataUrl]);
    toast.success(`Photo ${capturedImages.length + 1} captured`);
  };

  const removeImage = (index) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
  };

  const convertToPDF = async () => {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    
    for (let i = 0; i < capturedImages.length; i++) {
      const img = new Image();
      img.src = capturedImages[i];
      
      await new Promise((resolve) => {
        img.onload = () => {
          if (i > 0) pdf.addPage();
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          const ratio = Math.min(pageWidth / img.width, pageHeight / img.height);
          const width = img.width * ratio;
          const height = img.height * ratio;
          const x = (pageWidth - width) / 2;
          const y = (pageHeight - height) / 2;
          pdf.addImage(img, "JPEG", x, y, width, height);
          resolve();
        };
      });
    }
    
    return pdf.output("blob");
  };

  const handleSendFax = async () => {
    if (capturedImages.length === 0) {
      toast.error("Please capture at least one photo");
      return;
    }
    if (!toNumber || !fromNumber) {
      toast.error("Please enter both phone numbers");
      return;
    }

    setIsSending(true);

    try {
      const pdfBlob = await convertToPDF();
      const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfBlob });

      const response = await sendFax({
        file_url,
        to_number: toNumber,
        from_number: fromNumber,
        document_name: `Camera Fax - ${capturedImages.length} page(s)`
      });

      if (response.data.success) {
        toast.success(`Fax sent successfully! ${capturedImages.length} page(s)`);
        setCapturedImages([]);
        setToNumber("");
        setFromNumber("");
        stopCamera();
      } else {
        throw new Error(response.data.error || "Failed to send fax");
      }
    } catch (error) {
      toast.error("Error sending fax: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Camera to Fax
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* No Camera Active */}
        {!stream && capturedImages.length === 0 && (
          <Button onClick={startCamera} className="w-full" size="lg">
            <Camera className="w-5 h-5 mr-2" />
            Start Camera
          </Button>
        )}

        {/* Camera View */}
        {stream && (
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video ref={videoRef} autoPlay playsInline className="w-full" />
            </div>
            <div className="flex gap-2">
              <Button onClick={capturePhoto} className="flex-1">
                <Camera className="w-4 h-4 mr-2" />
                Capture Page {capturedImages.length + 1}
              </Button>
              <Button onClick={stopCamera} variant="outline">
                <X className="w-4 h-4 mr-2" />
                Done
              </Button>
            </div>
          </div>
        )}

        {/* Captured Images Preview */}
        {capturedImages.length > 0 && !stream && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-gray-900">{capturedImages.length} page(s) captured</p>
              <Button onClick={startCamera} variant="outline" size="sm">
                <Camera className="w-4 h-4 mr-2" />
                Add More Pages
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {capturedImages.map((img, index) => (
                <div key={index} className="relative rounded-lg overflow-hidden border-2 border-gray-200 group">
                  <img src={img} alt={`Page ${index + 1}`} className="w-full" />
                  <div className="absolute top-2 right-2">
                    <Button
                      onClick={() => removeImage(index)}
                      variant="destructive"
                      size="sm"
                      className="opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                  <div className="absolute bottom-2 left-2 bg-black/70 text-white px-2 py-1 rounded text-xs">
                    Page {index + 1}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Fax Details */}
        {capturedImages.length > 0 && (
          <div className="space-y-4 pt-4 border-t">
            <Tabs defaultValue="manual" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="manual">Manual Entry</TabsTrigger>
                <TabsTrigger value="addressbook">
                  <BookUser className="w-4 h-4 mr-2" />
                  Address Book
                </TabsTrigger>
              </TabsList>
              <TabsContent value="manual" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label htmlFor="from-number">From Number</Label>
                  <Input
                    id="from-number"
                    type="tel"
                    placeholder="+1234567890"
                    value={fromNumber}
                    onChange={(e) => setFromNumber(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="to-number">To Number</Label>
                  <Input
                    id="to-number"
                    type="tel"
                    placeholder="+1234567890"
                    value={toNumber}
                    onChange={(e) => setToNumber(e.target.value)}
                  />
                </div>
              </TabsContent>
              <TabsContent value="addressbook" className="mt-4">
                <FaxAddressBook
                  onSelectContact={(contact) => {
                    setToNumber(contact.fax_number);
                    toast.success(`Selected ${contact.name}`);
                  }}
                />
              </TabsContent>
            </Tabs>
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
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
}
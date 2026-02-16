import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, FileText, Send, X, RotateCcw, Loader2, BookUser } from "lucide-react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { sendFax } from "@/functions/sendFax";
import FaxAddressBook from "./FaxAddressBook";

export default function CameraFaxSender() {
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isSending, setIsSending] = useState(false);
  const [toNumber, setToNumber] = useState("");
  const [fromNumber, setFromNumber] = useState("");
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" } // Use rear camera on mobile
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
    setCapturedImage(imageDataUrl);
    stopCamera();
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const convertToPDF = async (imageDataUrl) => {
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4"
    });

    const img = new Image();
    img.src = imageDataUrl;

    await new Promise((resolve) => {
      img.onload = resolve;
    });

    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = img.width;
    const imgHeight = img.height;
    const ratio = Math.min(pageWidth / imgWidth, pageHeight / imgHeight);

    const width = imgWidth * ratio;
    const height = imgHeight * ratio;
    const x = (pageWidth - width) / 2;
    const y = (pageHeight - height) / 2;

    pdf.addImage(imageDataUrl, "JPEG", x, y, width, height);

    return pdf.output("blob");
  };

  const handleSendFax = async () => {
    if (!capturedImage) {
      toast.error("Please capture a photo first");
      return;
    }
    if (!toNumber || !fromNumber) {
      toast.error("Please enter both phone numbers");
      return;
    }

    setIsSending(true);

    try {
      // Convert image to PDF
      const pdfBlob = await convertToPDF(capturedImage);

      // Upload PDF to Base44 storage
      const { data: uploadData } = await base44.integrations.Core.UploadFile({
        file: pdfBlob
      });

      if (!uploadData?.file_url) {
        throw new Error("Failed to upload PDF");
      }

      // Send fax via backend function
      const response = await sendFax({
        file_url: uploadData.file_url,
        to_number: toNumber,
        from_number: fromNumber
      });

      if (response.data.success) {
        toast.success("Fax sent successfully!");
        setCapturedImage(null);
        setToNumber("");
        setFromNumber("");
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
        {/* Camera View */}
        {stream && !capturedImage && (
          <div className="space-y-4">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={capturePhoto} className="flex-1">
                <Camera className="w-4 h-4 mr-2" />
                Capture Photo
              </Button>
              <Button onClick={stopCamera} variant="outline">
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Captured Image Preview */}
        {capturedImage && (
          <div className="space-y-4">
            <div className="relative bg-gray-100 rounded-lg overflow-hidden">
              <img src={capturedImage} alt="Captured" className="w-full" />
            </div>
            <Button onClick={retakePhoto} variant="outline" className="w-full">
              <RotateCcw className="w-4 h-4 mr-2" />
              Retake Photo
            </Button>
          </div>
        )}

        {/* No Camera Active */}
        {!stream && !capturedImage && (
          <Button onClick={startCamera} className="w-full" size="lg">
            <Camera className="w-5 h-5 mr-2" />
            Start Camera
          </Button>
        )}

        {/* Fax Details */}
        {capturedImage && (
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

        {/* Hidden canvas for image capture */}
        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
}
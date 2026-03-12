import { useState, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Camera, Upload, X, Check, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function CameraScanner({ onScanComplete, documentType = "general" }) {
  const [isScanning, setIsScanning] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" } // Use back camera on mobile
      });
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        streamRef.current = stream;
        setIsScanning(true);
      }
    } catch (error) {
      console.error("Camera access error:", error);
      alert("Unable to access camera. Please check permissions.");
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setIsScanning(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(video, 0, 0);
      
      canvas.toBlob((blob) => {
        const imageUrl = URL.createObjectURL(blob);
        setCapturedImage({ blob, url: imageUrl });
        stopCamera();
      }, 'image/jpeg', 0.9);
    }
  };

  const uploadDocument = async () => {
    if (!capturedImage) return;
    
    setIsUploading(true);
    try {
      const file = new File([capturedImage.blob], `${documentType}_${Date.now()}.jpg`, {
        type: 'image/jpeg'
      });

      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      onScanComplete?.({
        url: file_url,
        type: documentType,
        timestamp: new Date().toISOString()
      });

      setCapturedImage(null);
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload document. Please try again.");
    }
    setIsUploading(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      onScanComplete?.({
        url: file_url,
        type: documentType,
        timestamp: new Date().toISOString()
      });
    } catch (error) {
      console.error("Upload error:", error);
      alert("Failed to upload file. Please try again.");
    }
    setIsUploading(false);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <Camera className="w-5 h-5" />
          Document Scanner
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {!isScanning && !capturedImage && (
          <div className="space-y-3">
            <Button
              onClick={startCamera}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Camera className="w-4 h-4 mr-2" />
              Open Camera
            </Button>

            <div className="relative">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                className="hidden"
                id="file-upload"
                disabled={isUploading}
              />
              <label htmlFor="file-upload">
                <Button
                  variant="outline"
                  className="w-full"
                  disabled={isUploading}
                  asChild
                >
                  <span>
                    {isUploading ? (
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    ) : (
                      <Upload className="w-4 h-4 mr-2" />
                    )}
                    Upload from Gallery
                  </span>
                </Button>
              </label>
            </div>
          </div>
        )}

        {isScanning && (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden bg-black">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={capturePhoto}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <Camera className="w-4 h-4 mr-2" />
                Capture
              </Button>
              <Button
                onClick={stopCamera}
                variant="outline"
                className="flex-1"
              >
                <X className="w-4 h-4 mr-2" />
                Cancel
              </Button>
            </div>
          </div>
        )}

        {capturedImage && (
          <div className="space-y-3">
            <div className="relative rounded-lg overflow-hidden">
              <img
                src={capturedImage.url}
                alt="Captured"
                className="w-full"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={uploadDocument}
                disabled={isUploading}
                className="flex-1 bg-blue-600 hover:bg-blue-700"
              >
                {isUploading ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Check className="w-4 h-4 mr-2" />
                )}
                Upload
              </Button>
              <Button
                onClick={() => setCapturedImage(null)}
                variant="outline"
                className="flex-1"
                disabled={isUploading}
              >
                <X className="w-4 h-4 mr-2" />
                Retake
              </Button>
            </div>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </CardContent>
    </Card>
  );
}
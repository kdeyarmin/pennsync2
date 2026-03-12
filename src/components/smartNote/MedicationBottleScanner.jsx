import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Camera, X, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { base44 } from "@/api/base44Client";

export default function MedicationBottleScanner({ onMedicationExtracted }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [capturedImage, setCapturedImage] = useState(null);
  const [extractedData, setExtractedData] = useState(null);
  const [isExtracting, setIsExtracting] = useState(false);
  const [error, setError] = useState(null);
  const [editedData, setEditedData] = useState(null);

  // Open camera
  const openCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setIsCameraOpen(true);
        setError(null);
      }
    } catch (err) {
      setError("Unable to access camera. Please check permissions.");
      console.error(err);
    }
  };

  // Capture photo
  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const ctx = canvasRef.current.getContext("2d");
      const video = videoRef.current;
      canvasRef.current.width = video.videoWidth;
      canvasRef.current.height = video.videoHeight;
      ctx.drawImage(video, 0, 0);
      const imageData = canvasRef.current.toDataURL("image/png");
      setCapturedImage(imageData);
      closeCamera();
      extractMedicationInfo(imageData);
    }
  };

  // Close camera
  const closeCamera = () => {
    if (videoRef.current?.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
      setIsCameraOpen(false);
    }
  };

  // Extract info from image using LLM vision
  const extractMedicationInfo = async (imageData) => {
    setIsExtracting(true);
    setError(null);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this medication bottle image and extract the following information:
1. Medication name
2. Strength/dosage (e.g., 500mg, 10mg/5mL)
3. Frequency/instructions (e.g., twice daily, every 6 hours)
4. Prescriber name if visible
5. Any warnings or special instructions

Return ONLY a JSON object with keys: name, dosage, frequency, prescriber, notes.
If a field is not visible or unclear, use null.
Example: {"name": "Lisinopril", "dosage": "10mg", "frequency": "once daily", "prescriber": null, "notes": "Take with food"}`,
        file_urls: [imageData],
        response_json_schema: {
          type: "object",
          properties: {
            name: { type: "string" },
            dosage: { type: "string" },
            frequency: { type: "string" },
            prescriber: { type: "string" },
            notes: { type: "string" },
          },
        },
      });

      if (result && result.name) {
        setExtractedData(result);
        setEditedData({ ...result, status: "active" });
      } else {
        setError("Could not extract medication information. Please try another photo.");
      }
    } catch (err) {
      console.error("Extraction error:", err);
      setError("Failed to extract medication information. Please try again or enter manually.");
    } finally {
      setIsExtracting(false);
    }
  };

  // Handle file upload
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const imageData = event.target?.result;
        setCapturedImage(imageData);
        extractMedicationInfo(imageData);
      };
      reader.readAsDataURL(file);
    }
  };

  // Add medication
  const addMedication = () => {
    if (editedData?.name?.trim() && onMedicationExtracted) {
      onMedicationExtracted({
        name: editedData.name,
        dosage: editedData.dosage || "",
        frequency: editedData.frequency || "",
        prescriber: editedData.prescriber || "",
        status: editedData.status || "active",
      });
      resetScanner();
    }
  };

  // Reset scanner
  const resetScanner = () => {
    setCapturedImage(null);
    setExtractedData(null);
    setEditedData(null);
    setError(null);
    closeCamera();
  };

  // Camera open state
  if (isCameraOpen) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-95 z-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-md">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="w-full rounded-lg border-2 border-indigo-500"
          />
          <canvas ref={canvasRef} className="hidden" />
          <div className="flex gap-2 mt-4">
            <Button
              onClick={capturePhoto}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 h-12 gap-2 font-semibold"
            >
              <Camera className="w-4 h-4" /> Capture
            </Button>
            <Button
              onClick={closeCamera}
              variant="outline"
              className="flex-1 h-12"
            >
              <X className="w-4 h-4" /> Close
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Extraction result state
  if (isExtracting) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 className="w-8 h-8 text-indigo-600 animate-spin" />
          <p className="font-semibold text-gray-800">Extracting medication information…</p>
          <p className="text-xs text-gray-500">Analyzing bottle label</p>
        </div>
      </div>
    );
  }

  if (extractedData && editedData) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-green-600" /> Medication Extracted
          </h3>
          <button onClick={resetScanner} className="p-1 hover:bg-gray-100 rounded-lg transition-colors">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        {capturedImage && (
          <div className="rounded-lg overflow-hidden border border-gray-200">
            <img src={capturedImage} alt="Captured medication bottle" className="w-full h-auto max-h-[200px] object-cover" />
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">{error}</p>
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Medication Name *</label>
            <Input
              value={editedData.name || ""}
              onChange={(e) => setEditedData({ ...editedData, name: e.target.value })}
              className="h-9 text-sm bg-gray-50"
              placeholder="e.g., Lisinopril"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1 block">Dosage</label>
              <Input
                value={editedData.dosage || ""}
                onChange={(e) => setEditedData({ ...editedData, dosage: e.target.value })}
                className="h-9 text-sm bg-gray-50"
                placeholder="e.g., 10mg"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1 block">Frequency</label>
              <Input
                value={editedData.frequency || ""}
                onChange={(e) => setEditedData({ ...editedData, frequency: e.target.value })}
                className="h-9 text-sm bg-gray-50"
                placeholder="e.g., twice daily"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Prescriber</label>
            <Input
              value={editedData.prescriber || ""}
              onChange={(e) => setEditedData({ ...editedData, prescriber: e.target.value })}
              className="h-9 text-sm bg-gray-50"
              placeholder="Optional"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-700 mb-1 block">Status</label>
            <div className="flex gap-2">
              {["active", "held", "discontinued"].map((s) => (
                <button
                  key={s}
                  onClick={() => setEditedData({ ...editedData, status: s })}
                  className={`flex-1 text-xs py-1.5 rounded-lg border font-medium transition-all ${
                    editedData.status === s
                      ? s === "active"
                        ? "bg-green-100 border-green-300 text-green-800"
                        : s === "held"
                        ? "bg-yellow-100 border-yellow-300 text-yellow-800"
                        : "bg-red-100 border-red-300 text-red-800"
                      : "bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-300"
                  }`}
                >
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-2 pt-2">
          <Button
            onClick={addMedication}
            disabled={!editedData.name?.trim()}
            className="flex-1 bg-green-600 hover:bg-green-700 h-10 gap-2 font-semibold"
          >
            <CheckCircle2 className="w-4 h-4" /> Add Medication
          </Button>
          <Button onClick={resetScanner} variant="outline" className="h-10 px-4">
            Scan Another
          </Button>
        </div>
      </div>
    );
  }

  // Initial state
  return (
    <div className="bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-4 shadow-sm">
      <p className="text-sm font-semibold text-indigo-900 mb-3 flex items-center gap-2">
        <Camera className="w-4 h-4" /> Scan Medication Bottle
      </p>
      <p className="text-xs text-indigo-700 mb-3">Take a photo of the medication bottle label to automatically extract details.</p>
      <div className="flex gap-2">
        <Button
          onClick={openCamera}
          className="flex-1 bg-indigo-600 hover:bg-indigo-700 h-10 gap-2 text-sm font-semibold"
        >
          <Camera className="w-4 h-4" /> Open Camera
        </Button>
        <Button
          onClick={() => fileInputRef.current?.click()}
          variant="outline"
          className="flex-1 h-10 text-sm font-semibold"
        >
          Upload Photo
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
        />
      </div>
    </div>
  );
}
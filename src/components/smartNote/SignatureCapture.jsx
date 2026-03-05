import React, { useRef, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Trash2, Check } from "lucide-react";

export default function SignatureCapture({ onSignatureCapture, disabled = false }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [signatureImage, setSignatureImage] = useState(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    canvas.width = canvas.offsetWidth;
    canvas.height = 150;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = "#1f2937";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const startDrawing = (e) => {
    if (disabled) return;
    setIsDrawing(true);
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.beginPath();
    ctx.moveTo(x, y);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctx.lineTo(x, y);
    ctx.stroke();
    setIsEmpty(false);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
    setSignatureImage(null);
  };

  const saveSignature = async () => {
    const canvas = canvasRef.current;
    const imageData = canvas.toDataURL("image/png");
    setSignatureImage(imageData);
    onSignatureCapture(imageData);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-3">
      <div>
        <label className="text-sm font-semibold text-gray-700 block mb-2">
          Clinician Signature
        </label>
        <p className="text-xs text-gray-500 mb-3">
          Sign below to digitally sign the finalized note.
        </p>
      </div>

      {!signatureImage ? (
        <>
          <canvas
            ref={canvasRef}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            className={`w-full border-2 border-dashed border-gray-300 rounded-lg cursor-crosshair bg-white ${
              disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
          />
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={clearSignature}
              className="gap-2"
              disabled={isEmpty || disabled}
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear
            </Button>
            <Button
              size="sm"
              onClick={saveSignature}
              className="bg-indigo-600 hover:bg-indigo-700 gap-2 flex-1"
              disabled={isEmpty || disabled}
            >
              <Check className="w-3.5 h-3.5" /> Save Signature
            </Button>
          </div>
        </>
      ) : (
        <>
          <div className="border-2 border-green-300 bg-green-50 rounded-lg p-3">
            <img src={signatureImage} alt="Signature" className="w-full max-h-32 object-contain" />
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSignatureImage(null)}
              className="flex-1"
            >
              Re-sign
            </Button>
            <Button
              size="sm"
              className="bg-green-600 hover:bg-green-700 gap-2"
              onClick={() => onSignatureCapture(signatureImage)}
            >
              <Check className="w-3.5 h-3.5" /> Confirmed
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
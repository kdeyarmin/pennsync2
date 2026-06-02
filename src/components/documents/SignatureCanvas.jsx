import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RotateCcw, Check } from "lucide-react";
import { toast } from "sonner";

export default function SignatureCanvas({ onSave, onCancel, signerName, isInitials = false }) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [typedSignature, setTypedSignature] = useState("");
  const [selectedFont, setSelectedFont] = useState("cursive");
  const [signatureMethod, setSignatureMethod] = useState("draw");

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext("2d");
    ctx.strokeStyle = "#000";
    ctx.lineWidth = 2;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, []);

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    
    const x = e.clientX ? e.clientX - rect.left : e.touches[0].clientX - rect.left;
    const y = e.clientY ? e.clientY - rect.top : e.touches[0].clientY - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    e.preventDefault();
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const ctx = canvas.getContext("2d");
    
    const x = e.clientX ? e.clientX - rect.left : e.touches[0].clientX - rect.left;
    const y = e.clientY ? e.clientY - rect.top : e.touches[0].clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const generateTypedSignature = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    
    clearCanvas();
    
    const text = isInitials ? typedSignature.substring(0, 3) : typedSignature;
    const fontSize = isInitials ? 60 : 40;
    
    ctx.font = `${fontSize}px ${selectedFont}`;
    ctx.fillStyle = "#000";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    
    // Check if canvas is empty
    const ctx = canvas.getContext("2d");
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const isEmpty = !imageData.data.some(channel => channel !== 0);
    
    if (isEmpty && signatureMethod === "draw") {
      toast.error("Please draw your signature before saving");
      return;
    }
    
    if (!typedSignature && signatureMethod === "type") {
      toast.error("Please enter your signature");
      return;
    }
    
    if (signatureMethod === "type") {
      generateTypedSignature();
      setTimeout(() => {
        const dataUrl = canvas.toDataURL("image/png");
        onSave(dataUrl, signatureMethod);
      }, 100);
    } else {
      const dataUrl = canvas.toDataURL("image/png");
      onSave(dataUrl, signatureMethod);
    }
  };

  useEffect(() => {
    if (signatureMethod === "type" && typedSignature) {
      generateTypedSignature();
    }
  }, [typedSignature, selectedFont, signatureMethod]);

  const fonts = [
    { value: "cursive", label: "Cursive", style: "font-['Brush_Script_MT',_cursive]" },
    { value: "serif", label: "Formal", style: "font-serif" },
    { value: "sans-serif", label: "Modern", style: "font-sans" }
  ];

  return (
    <div className="space-y-4">
      <Tabs value={signatureMethod} onValueChange={setSignatureMethod}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="draw">Draw</TabsTrigger>
          <TabsTrigger value="type">Type</TabsTrigger>
        </TabsList>

        <TabsContent value="draw" className="space-y-4">
          <Card className="p-4">
            <canvas
              ref={canvasRef}
              width={500}
              height={200}
              className="border-2 border-slate-300 rounded-lg w-full cursor-crosshair touch-none"
              style={{ maxWidth: '100%', height: 'auto', aspectRatio: '500/200' }}
              onMouseDown={startDrawing}
              onMouseMove={draw}
              onMouseUp={stopDrawing}
              onMouseLeave={stopDrawing}
              onTouchStart={startDrawing}
              onTouchMove={draw}
              onTouchEnd={stopDrawing}
            />
            <p className="text-xs text-slate-500 mt-2 text-center">
              {isInitials ? "Draw your initials" : "Sign your name"} in the box above
            </p>
          </Card>
          
          <Button
            variant="outline"
            onClick={clearCanvas}
            className="w-full"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </TabsContent>

        <TabsContent value="type" className="space-y-4">
          <div>
            <Label>
              {isInitials ? "Enter your initials" : "Type your full name"}
            </Label>
            <Input
              value={typedSignature}
              onChange={(e) => setTypedSignature(e.target.value)}
              placeholder={isInitials ? "e.g., JD" : signerName || "Enter your name"}
              maxLength={isInitials ? 3 : 50}
              className="mt-1"
            />
          </div>

          <div>
            <Label>Font Style</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {fonts.map((font) => (
                <Button
                  key={font.value}
                  type="button"
                  variant={selectedFont === font.value ? "default" : "outline"}
                  onClick={() => setSelectedFont(font.value)}
                  className={`${font.style} text-lg h-12`}
                >
                  {typedSignature || "Abc"}
                </Button>
              ))}
            </div>
          </div>

          <Card className="p-4">
            <canvas
              ref={canvasRef}
              width={500}
              height={200}
              className="border-2 border-slate-300 rounded-lg w-full"
              style={{ maxWidth: '100%', height: 'auto', aspectRatio: '500/200' }}
            />
            <p className="text-xs text-slate-500 mt-2 text-center">Preview</p>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex gap-2 justify-end">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} className="bg-blue-600 hover:bg-blue-700">
          <Check className="w-4 h-4 mr-2" />
          Save Signature
        </Button>
      </div>
    </div>
  );
}
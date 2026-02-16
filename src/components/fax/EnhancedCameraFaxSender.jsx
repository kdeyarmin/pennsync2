import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Camera, Send, X, Loader2, BookUser, FileText, RotateCw, ArrowUp, ArrowDown, Trash2, Save, Clock, Sparkles } from "lucide-react";
import { jsPDF } from "jspdf";
import { toast } from "sonner";
import { sendFax } from "@/functions/sendFax";
import { sendBatchFax } from "@/functions/sendBatchFax";
import FaxAddressBook from "./FaxAddressBook";
import AICoverPageEditor from "./AICoverPageEditor";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";

export default function EnhancedCameraFaxSender() {
  const [stream, setStream] = useState(null);
  const [capturedImages, setCapturedImages] = useState([]);
  const [isSending, setIsSending] = useState(false);
  const [toNumbers, setToNumbers] = useState([""]);
  const [fromNumber, setFromNumber] = useState("");
  const [includeCoverPage, setIncludeCoverPage] = useState(false);
  const [aiCoverPageData, setAiCoverPageData] = useState(null);
  const [imageQuality, setImageQuality] = useState("high");
  const [priority, setPriority] = useState("normal");
  const [scheduledTime, setScheduledTime] = useState("");
  const [draftName, setDraftName] = useState("");
  
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const queryClient = useQueryClient();

  const { data: templates = [] } = useQuery({
    queryKey: ['fax-templates'],
    queryFn: () => base44.entities.FaxTemplate.list('-created_date', 50),
    initialData: []
  });

  const { data: drafts = [] } = useQuery({
    queryKey: ['fax-drafts'],
    queryFn: () => base44.entities.FaxDraft.list('-created_date', 50),
    initialData: []
  });

  const saveDraftMutation = useMutation({
    mutationFn: (data) => base44.entities.FaxDraft.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['fax-drafts']);
      toast.success("Draft saved");
    }
  });

  const saveTemplateMutation = useMutation({
    mutationFn: (data) => base44.entities.FaxTemplate.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries(['fax-templates']);
      toast.success("Template saved");
    }
  });

  const scheduleCreateMutation = useMutation({
    mutationFn: (data) => base44.entities.ScheduledFax.create(data),
    onSuccess: () => {
      toast.success("Fax scheduled successfully");
    }
  });

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

    const quality = imageQuality === "high" ? 0.95 : imageQuality === "medium" ? 0.7 : 0.5;
    const imageDataUrl = canvas.toDataURL("image/jpeg", quality);
    setCapturedImages(prev => [...prev, imageDataUrl]);
    toast.success(`Photo ${capturedImages.length + 1} captured (${imageQuality} quality)`);
  };

  const removeImage = (index) => {
    setCapturedImages(prev => prev.filter((_, i) => i !== index));
  };

  const rotateImage = async (index) => {
    const img = new Image();
    img.src = capturedImages[index];
    
    await new Promise((resolve) => {
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.height;
        canvas.height = img.width;
        const ctx = canvas.getContext('2d');
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.rotate(Math.PI / 2);
        ctx.drawImage(img, -img.width / 2, -img.height / 2);
        const rotated = canvas.toDataURL("image/jpeg", 0.9);
        setCapturedImages(prev => {
          const newImages = [...prev];
          newImages[index] = rotated;
          return newImages;
        });
        resolve();
      };
    });
    toast.success("Image rotated");
  };

  const moveImage = (index, direction) => {
    const newImages = [...capturedImages];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newImages.length) return;
    [newImages[index], newImages[targetIndex]] = [newImages[targetIndex], newImages[index]];
    setCapturedImages(newImages);
  };

  const generateCoverPagePDF = (coverPageData) => {
    const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    const pageWidth = pdf.internal.pageSize.getWidth();
    
    pdf.setFontSize(18);
    pdf.text("FAX COVER PAGE", pageWidth / 2, 20, { align: 'center' });
    
    pdf.setFontSize(10);
    let y = 40;
    
    pdf.text(`Date: ${coverPageData.date}`, 20, y);
    y += 10;
    pdf.text(`From: ${coverPageData.from.name} (${coverPageData.from.phone})`, 20, y);
    y += 8;
    pdf.text(`To: ${coverPageData.to.name} (${coverPageData.to.fax})`, 20, y);
    y += 15;
    
    pdf.setFontSize(12);
    pdf.text(`Subject: ${coverPageData.subject}`, 20, y);
    y += 12;
    
    if (coverPageData.patient_info?.name) {
      pdf.setFontSize(11);
      pdf.text('Patient Information:', 20, y);
      y += 7;
      pdf.setFontSize(9);
      pdf.text(`Name: ${coverPageData.patient_info.name}`, 25, y);
      y += 5;
      if (coverPageData.patient_info.dob) {
        pdf.text(`DOB: ${coverPageData.patient_info.dob}`, 25, y);
        y += 5;
      }
      if (coverPageData.patient_info.mrn) {
        pdf.text(`MRN: ${coverPageData.patient_info.mrn}`, 25, y);
        y += 5;
      }
      y += 5;
    }
    
    if (coverPageData.message) {
      pdf.setFontSize(11);
      pdf.text('Notes:', 20, y);
      y += 7;
      pdf.setFontSize(9);
      const lines = pdf.splitTextToSize(coverPageData.message, pageWidth - 40);
      pdf.text(lines, 25, y);
    }
    
    return pdf;
  };

  const convertToPDF = async (includeCover = false) => {
    let pdf;
    
    if (includeCover && aiCoverPageData) {
      pdf = generateCoverPagePDF(aiCoverPageData);
    } else {
      pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
    }
    
    for (let i = 0; i < capturedImages.length; i++) {
      const img = new Image();
      img.src = capturedImages[i];
      
      await new Promise((resolve) => {
        img.onload = () => {
          if (includeCover || i > 0) pdf.addPage();
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

  const handleSaveDraft = () => {
    if (!draftName.trim()) {
      toast.error("Please enter a draft name");
      return;
    }

    saveDraftMutation.mutate({
      name: draftName,
      from_number: fromNumber,
      to_numbers: toNumbers.filter(n => n.trim()),
      captured_images: capturedImages,
      cover_page_data: aiCoverPageData,
      include_cover_page: includeCoverPage
    });
    setDraftName("");
  };

  const handleLoadDraft = (draft) => {
    setFromNumber(draft.from_number || "");
    setToNumbers(draft.to_numbers || [""]);
    setCapturedImages(draft.captured_images || []);
    setAiCoverPageData(draft.cover_page_data);
    setIncludeCoverPage(draft.include_cover_page || false);
    toast.success(`Loaded draft: ${draft.name}`);
  };

  const handleSaveTemplate = () => {
    if (!aiCoverPageData) {
      toast.error("Please generate a cover page first");
      return;
    }

    const templateName = prompt("Enter template name:");
    if (!templateName) return;

    saveTemplateMutation.mutate({
      name: templateName,
      cover_page_data: aiCoverPageData
    });
  };

  const handleLoadTemplate = (template) => {
    setAiCoverPageData(template.cover_page_data);
    setIncludeCoverPage(true);
    toast.success(`Loaded template: ${template.name}`);
  };

  const handleSendFax = async () => {
    if (capturedImages.length === 0 && !includeCoverPage) {
      toast.error("Please capture at least one photo or enable cover page");
      return;
    }

    const validToNumbers = toNumbers.filter(n => n.trim());
    if (validToNumbers.length === 0 || !fromNumber) {
      toast.error("Please enter phone numbers");
      return;
    }

    if (includeCoverPage && !aiCoverPageData) {
      toast.error("Please wait for AI cover page to generate");
      return;
    }

    setIsSending(true);

    try {
      const pdfBlob = await convertToPDF(includeCoverPage);
      const { file_url } = await base44.integrations.Core.UploadFile({ file: pdfBlob });

      const totalPages = capturedImages.length + (includeCoverPage ? 1 : 0);

      // Schedule or send immediately
      if (scheduledTime) {
        await scheduleCreateMutation.mutateAsync({
          scheduled_time: new Date(scheduledTime).toISOString(),
          from_number: fromNumber,
          to_numbers: validToNumbers,
          document_url: file_url,
          document_name: `Camera Fax - ${totalPages} page(s)`,
          cover_page_details: includeCoverPage ? aiCoverPageData : null,
          priority
        });
        toast.success("Fax scheduled successfully");
      } else if (validToNumbers.length > 1) {
        // Batch send
        const response = await sendBatchFax({
          file_url,
          to_numbers: validToNumbers,
          from_number: fromNumber,
          document_name: `Camera Fax - ${totalPages} page(s)`,
          cover_page_details: includeCoverPage ? aiCoverPageData : null,
          priority
        });
        toast.success(`Sent to ${response.data.successful}/${response.data.total} recipients`);
      } else {
        // Single send
        const response = await sendFax({
          file_url,
          to_number: validToNumbers[0],
          from_number: fromNumber,
          document_name: `Camera Fax - ${totalPages} page(s)`,
          cover_page_details: includeCoverPage ? aiCoverPageData : null,
          priority
        });
        if (response.data.success) {
          toast.success(`Fax sent successfully! ${totalPages} page(s)`);
        }
      }

      // Reset form
      setCapturedImages([]);
      setToNumbers([""]);
      setFromNumber("");
      setIncludeCoverPage(false);
      setAiCoverPageData(null);
      setScheduledTime("");
      stopCamera();
    } catch (error) {
      toast.error("Error sending fax: " + error.message);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Camera className="w-5 h-5" />
          Enhanced Camera to Fax
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quality Selection */}
        <div className="flex items-center gap-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
          <Label className="text-sm font-medium">Image Quality:</Label>
          <Select value={imageQuality} onValueChange={setImageQuality}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="low">Low</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-xs text-gray-600">
            {imageQuality === "high" && "Best quality, larger file"}
            {imageQuality === "medium" && "Balanced"}
            {imageQuality === "low" && "Smaller file, faster"}
          </span>
        </div>

        {/* Camera Controls */}
        {!stream && capturedImages.length === 0 && (
          <Button onClick={startCamera} className="w-full" size="lg">
            <Camera className="w-5 h-5 mr-2" />
            Start Camera
          </Button>
        )}

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

        {/* Captured Images with Management */}
        {capturedImages.length > 0 && !stream && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="font-medium text-gray-900">{capturedImages.length} page(s) captured</p>
              <Button onClick={startCamera} variant="outline" size="sm">
                <Camera className="w-4 h-4 mr-2" />
                Add More
              </Button>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {capturedImages.map((img, index) => (
                <div key={index} className="relative rounded-lg overflow-hidden border-2 border-gray-200 group">
                  <img src={img} alt={`Page ${index + 1}`} className="w-full" />
                  <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button onClick={() => rotateImage(index)} variant="secondary" size="sm">
                      <RotateCw className="w-3 h-3" />
                    </Button>
                    {index > 0 && (
                      <Button onClick={() => moveImage(index, 'up')} variant="secondary" size="sm">
                        <ArrowUp className="w-3 h-3" />
                      </Button>
                    )}
                    {index < capturedImages.length - 1 && (
                      <Button onClick={() => moveImage(index, 'down')} variant="secondary" size="sm">
                        <ArrowDown className="w-3 h-3" />
                      </Button>
                    )}
                    <Button onClick={() => removeImage(index)} variant="destructive" size="sm">
                      <Trash2 className="w-3 h-3" />
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

        {/* Draft & Template Management */}
        {(capturedImages.length > 0 || includeCoverPage) && (
          <div className="space-y-4 pt-4 border-t">
            <div className="flex gap-2">
              <Input
                placeholder="Draft name..."
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                className="flex-1"
              />
              <Button onClick={handleSaveDraft} variant="outline" disabled={saveDraftMutation.isPending}>
                <Save className="w-4 h-4 mr-2" />
                Save Draft
              </Button>
            </div>

            {drafts.length > 0 && (
              <div className="flex gap-2 flex-wrap">
                <Label className="text-xs text-gray-600 w-full">Load Draft:</Label>
                {drafts.map(draft => (
                  <Button
                    key={draft.id}
                    variant="outline"
                    size="sm"
                    onClick={() => handleLoadDraft(draft)}
                  >
                    {draft.name}
                  </Button>
                ))}
              </div>
            )}

            {/* Priority Selection */}
            <div className="flex items-center gap-4">
              <Label>Priority:</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="urgent">
                    <span className="flex items-center gap-1">
                      <Badge className="bg-red-600">Urgent</Badge>
                    </span>
                  </SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Schedule Option */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-blue-600" />
                <Label>Schedule for later (optional):</Label>
              </div>
              <Input
                type="datetime-local"
                value={scheduledTime}
                onChange={(e) => setScheduledTime(e.target.value)}
              />
            </div>

            {/* Cover Page */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="includeCoverPage"
                checked={includeCoverPage}
                onCheckedChange={setIncludeCoverPage}
              />
              <Label htmlFor="includeCoverPage" className="text-sm font-medium flex items-center gap-1 cursor-pointer">
                <FileText className="w-4 h-4" /> Include AI Cover Page
              </Label>
            </div>

            {includeCoverPage && (
              <>
                <AICoverPageEditor 
                  recipientNumber={toNumbers[0]}
                  senderNumber={fromNumber}
                  onCoverPageGenerated={setAiCoverPageData}
                />
                
                {aiCoverPageData && (
                  <div className="flex gap-2">
                    <Button onClick={handleSaveTemplate} variant="outline" size="sm" disabled={saveTemplateMutation.isPending}>
                      <Save className="w-4 h-4 mr-2" />
                      Save as Template
                    </Button>
                  </div>
                )}

                {templates.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    <Label className="text-xs text-gray-600 w-full">Load Template:</Label>
                    {templates.map(template => (
                      <Button
                        key={template.id}
                        variant="outline"
                        size="sm"
                        onClick={() => handleLoadTemplate(template)}
                      >
                        <Sparkles className="w-3 h-3 mr-1" />
                        {template.name}
                      </Button>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Recipient Numbers */}
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
                  <div className="flex items-center justify-between">
                    <Label>To Numbers ({toNumbers.filter(n => n.trim()).length})</Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setToNumbers([...toNumbers, ""])}
                    >
                      + Add Recipient
                    </Button>
                  </div>
                  {toNumbers.map((num, idx) => (
                    <div key={idx} className="flex gap-2">
                      <Input
                        type="tel"
                        placeholder="+1234567890"
                        value={num}
                        onChange={(e) => {
                          const newNumbers = [...toNumbers];
                          newNumbers[idx] = e.target.value;
                          setToNumbers(newNumbers);
                        }}
                      />
                      {toNumbers.length > 1 && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setToNumbers(toNumbers.filter((_, i) => i !== idx))}
                        >
                          <X className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </TabsContent>
              <TabsContent value="addressbook" className="mt-4">
                <FaxAddressBook
                  onSelectContact={(contact) => {
                    if (!toNumbers.some(n => n === contact.fax_number)) {
                      const emptyIndex = toNumbers.findIndex(n => !n.trim());
                      if (emptyIndex >= 0) {
                        const newNumbers = [...toNumbers];
                        newNumbers[emptyIndex] = contact.fax_number;
                        setToNumbers(newNumbers);
                      } else {
                        setToNumbers([...toNumbers, contact.fax_number]);
                      }
                      toast.success(`Added ${contact.name}`);
                    }
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
                  {scheduledTime ? "Scheduling..." : "Sending..."}
                </>
              ) : (
                <>
                  {scheduledTime ? <Clock className="w-5 h-5 mr-2" /> : <Send className="w-5 h-5 mr-2" />}
                  {scheduledTime ? "Schedule Fax" : toNumbers.filter(n => n.trim()).length > 1 ? `Send to ${toNumbers.filter(n => n.trim()).length} Recipients` : "Send Fax"}
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
import { useState, useRef, useEffect } from 'react';
import { configNotReadyMessage } from '@/lib/aiFeatureError';
import { Button } from "@/components/ui/button";
import { Square, Loader2, FileAudio } from 'lucide-react';
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

export default function SOAPAudioRecorder({ onSOAPGenerated, disabled }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = handleStop;
      mediaRecorder.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      toast.error("Could not access microphone.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach(t => t.stop());
      setIsRecording(false);
    }
  };

  // Stop the recorder and release the mic if the component unmounts mid-recording
  // (otherwise the microphone stays live on a shared device).
  useEffect(() => {
    return () => {
      const mr = mediaRecorderRef.current;
      if (!mr) return;
      // Detach onstop FIRST so cleanup only releases the mic — navigating away
      // mid-recording must not run handleStop (which uploads the partial audio
      // to transcribeAndGenerateSOAPNote and setStates after unmount).
      mr.onstop = null;
      try { if (mr.state !== "inactive") mr.stop(); } catch { /* already stopped */ }
      mr.stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const handleStop = async () => {
    const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
    if (audioBlob.size === 0) return;
    
    setIsProcessing(true);
    try {
      const reader = new FileReader();
      reader.readAsDataURL(audioBlob);
      reader.onloadend = async () => {
        const base64AudioMessage = reader.result.split(',')[1];
        
        try {
            const res = await base44.functions.invoke("transcribeAndGenerateSOAPNote", {
              audio_base64: base64AudioMessage,
              mime_type: audioBlob.type
            });

            if (res.data && res.data.success) {
                const soap = res.data.data;
                const formattedSOAP = `
[SOAP Note Generated from Audio]
Subjective: ${soap.subjective || 'N/A'}

Objective: ${soap.objective || 'N/A'}

Assessment: ${soap.assessment || 'N/A'}

Plan: ${soap.plan || 'N/A'}
`.trim();
                onSOAPGenerated(formattedSOAP);
                toast.success("SOAP Note Generated!");
            } else {
                toast.error("Failed to generate SOAP note.");
            }
        } catch (err) {
            const friendly = configNotReadyMessage(err);
            if (friendly) {
                toast.error(friendly);
            } else {
                console.error("Function error:", err);
                toast.error("Error processing audio.");
            }
        } finally {
            setIsProcessing(false);
        }
      };
    } catch (error) {
      console.error("Processing error:", error);
      toast.error("Error processing audio recording.");
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {!isRecording && !isProcessing && (
        <Button 
          onClick={startRecording} 
          disabled={disabled}
          className="bg-navy-600 hover:bg-navy-700 text-white gap-2"
        >
          <FileAudio className="w-4 h-4" /> Record SOAP Visit
        </Button>
      )}
      
      {isRecording && (
        <Button 
          onClick={stopRecording} 
          variant="destructive" 
          className="gap-2 animate-pulse"
        >
          <Square className="w-4 h-4" /> Stop Recording
        </Button>
      )}

      {isProcessing && (
        <Button disabled variant="outline" className="gap-2 text-navy-600 border-navy-200">
          <Loader2 className="w-4 h-4 animate-spin" /> Generating SOAP Note...
        </Button>
      )}
    </div>
  );
}
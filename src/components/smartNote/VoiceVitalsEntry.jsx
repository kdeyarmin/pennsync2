import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  Loader2,
  Activity,
  Check
} from "lucide-react";

export default function VoiceVitalsEntry({ onVitalsRecognized, onPhraseRecognized }) {
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [lastRecognized, setLastRecognized] = useState(null);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const startListening = async () => {
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

      mediaRecorder.onstop = async () => {
        stream.getTracks().forEach(track => track.stop());
        await processVoiceCommand();
      };

      mediaRecorder.start();
      setIsListening(true);

      // Auto-stop after 5 seconds for quick commands
      setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
          setIsListening(false);
        }
      }, 5000);

    } catch (error) {
      console.error("Microphone error:", error);
      alert("Could not access microphone.");
    }
  };

  const stopListening = () => {
    if (mediaRecorderRef.current && isListening) {
      mediaRecorderRef.current.stop();
      setIsListening(false);
    }
  };

  const processVoiceCommand = async () => {
    if (audioChunksRef.current.length === 0) return;

    setIsProcessing(true);
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file: audioBlob });

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a medical voice command processor. Listen for vital signs or common clinical phrases.

VITAL SIGNS TO DETECT:
- Blood pressure (e.g., "BP 120 over 80", "blood pressure one twenty over eighty")
- Heart rate/Pulse (e.g., "heart rate 72", "pulse 88")
- Temperature (e.g., "temp 98.6", "temperature ninety nine point two")
- Oxygen saturation (e.g., "O2 sat 97", "oxygen 95 percent")
- Respiratory rate (e.g., "respirations 18", "RR 20")
- Pain level (e.g., "pain 5 out of 10", "pain level 3")
- Weight (e.g., "weight 165 pounds")

COMMON PHRASES TO DETECT:
- "lungs clear" → "Lungs clear to auscultation bilaterally"
- "no edema" → "No peripheral edema noted"
- "alert and oriented" → "Patient alert and oriented x4"
- "wounds healing" → "Wound healing well with no signs of infection"
- "med compliant" → "Patient reports medication compliance"
- "denies pain" → "Patient denies pain at this time"
- "tolerating diet" → "Patient tolerating diet well"

Return JSON:
{
  "type": "vitals" | "phrase" | "unknown",
  "vitals": {
    "bp": "120/80" or null,
    "hr": "72" or null,
    "temp": "98.6" or null,
    "o2": "97" or null,
    "rr": "18" or null,
    "pain": "5" or null,
    "weight": "165" or null
  },
  "phrase": "Expanded clinical phrase" or null,
  "raw_text": "What was spoken"
}`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            type: { type: "string" },
            vitals: { type: "object" },
            phrase: { type: "string" },
            raw_text: { type: "string" }
          }
        }
      });

      setLastRecognized(result);

      if (result.type === 'vitals' && result.vitals) {
        onVitalsRecognized && onVitalsRecognized(result.vitals);
      } else if (result.type === 'phrase' && result.phrase) {
        onPhraseRecognized && onPhraseRecognized(result.phrase);
      }

    } catch (error) {
      console.error("Voice processing error:", error);
    }
    setIsProcessing(false);
  };

  return (
    <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50 to-purple-50">
      <CardContent className="p-3">
        <div className="flex items-center gap-3">
          <Button
            size="sm"
            onClick={isListening ? stopListening : startListening}
            disabled={isProcessing}
            className={`rounded-full ${isListening ? 'bg-red-600 hover:bg-red-700 animate-pulse' : 'bg-indigo-600 hover:bg-indigo-700'}`}
          >
            {isProcessing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Mic className="w-4 h-4" />
            )}
          </Button>
          
          <div className="flex-1">
            <p className="text-xs font-medium text-indigo-800">
              {isListening ? 'Listening... say vitals or phrase' : 
               isProcessing ? 'Processing...' : 
               'Quick Voice Entry'}
            </p>
            <p className="text-xs text-gray-500">
              "BP 120 over 80" • "lungs clear" • "pain 3 out of 10"
            </p>
          </div>

          {lastRecognized && (
            <Badge className="bg-green-100 text-green-800 text-xs">
              <Check className="w-3 h-3 mr-1" />
              {lastRecognized.type === 'vitals' ? 'Vitals added' : 'Phrase added'}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
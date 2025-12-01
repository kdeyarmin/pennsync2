import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
  MicOff,
  Square,
  Loader2,
  Volume2
} from "lucide-react";

export default function VoiceDictation({ onTranscriptionComplete }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioLevel, setAudioLevel] = useState(0);
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);
  const analyserRef = useRef(null);
  const animationRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Set up audio analyzer for visual feedback
      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      // Start level monitoring
      const dataArray = new Uint8Array(analyser.frequencyBinCount);
      const updateLevel = () => {
        analyser.getByteFrequencyData(dataArray);
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
        setAudioLevel(average / 255);
        animationRef.current = requestAnimationFrame(updateLevel);
      };
      updateLevel();

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        cancelAnimationFrame(animationRef.current);
        stream.getTracks().forEach(track => track.stop());
        await processRecording();
      };

      mediaRecorder.start(1000);
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

    } catch (error) {
      console.error("Error accessing microphone:", error);
      alert("Could not access microphone. Please ensure microphone permissions are granted.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const processRecording = async () => {
    if (audioChunksRef.current.length === 0) return;

    setIsProcessing(true);
    try {
      const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
      
      // Upload audio file
      const { file_url } = await base44.integrations.Core.UploadFile({ file: audioBlob });

      // Transcribe using LLM with audio context
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a medical transcription AI. Transcribe this audio recording of a nurse's clinical notes.

Instructions:
1. Transcribe the spoken words accurately
2. Maintain medical terminology as spoken
3. Keep the natural flow of the dictation
4. Include any pauses or corrections the speaker makes
5. Do NOT enhance or modify the content - just transcribe

Return JSON:
{
  "transcription": "The full transcribed text",
  "duration_detected": "approximate duration mentioned or detected",
  "clarity_score": 1-10
}`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            transcription: { type: "string" },
            duration_detected: { type: "string" },
            clarity_score: { type: "number" }
          }
        }
      });

      onTranscriptionComplete(result.transcription);
      
    } catch (error) {
      console.error("Error processing recording:", error);
      alert("Error transcribing audio. Please try again or type your notes manually.");
    }
    setIsProcessing(false);
    setRecordingTime(0);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className={`border-2 transition-all ${isRecording ? 'border-red-400 bg-red-50' : 'border-gray-200'}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Recording Button */}
          <Button
            size="lg"
            onClick={isRecording ? stopRecording : startRecording}
            disabled={isProcessing}
            className={`rounded-full w-14 h-14 ${
              isRecording 
                ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                : 'bg-blue-600 hover:bg-blue-700'
            }`}
          >
            {isProcessing ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : isRecording ? (
              <Square className="w-6 h-6" />
            ) : (
              <Mic className="w-6 h-6" />
            )}
          </Button>

          {/* Status and Timer */}
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              {isRecording ? (
                <>
                  <Badge className="bg-red-600 animate-pulse">Recording</Badge>
                  <span className="font-mono text-lg font-bold">{formatTime(recordingTime)}</span>
                </>
              ) : isProcessing ? (
                <Badge className="bg-yellow-600">Transcribing...</Badge>
              ) : (
                <span className="text-gray-600">Click to start voice dictation</span>
              )}
            </div>

            {/* Audio Level Indicator */}
            {isRecording && (
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-gray-500" />
                <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-red-500 transition-all duration-75"
                    style={{ width: `${audioLevel * 100}%` }}
                  />
                </div>
              </div>
            )}

            {!isRecording && !isProcessing && (
              <p className="text-xs text-gray-500">
                Speak your clinical notes naturally. The AI will transcribe them for review.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Mic, MicOff, Play, Download, X, CheckCircle2, AlertCircle } from "lucide-react";
import { enhanceTranscription } from "../utils/medicalDictionary";
import DictationSectionMapper from "./DictationSectionMapper";

export default function EnhancedAudioRecorder({ onTranscribed, disabled = false }) {
  const [recording, setRecording] = useState(false);
  const [transcribing, setTranscribing] = useState(false);
  const [audioUrl, setAudioUrl] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [error, setError] = useState(null);
  const [transcript, setTranscript] = useState(null);
  const [showMapper, setShowMapper] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const streamRef = useRef(null);
  const timerRef = useRef(null);

  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);
      mediaRecorder.onstop = async () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/mp3" });
        const url = URL.createObjectURL(blob);
        setAudioUrl(url);
        
        // Auto-transcribe
        await transcribeAudio(blob);
      };

      mediaRecorder.start();
      setRecording(true);
      setRecordingTime(0);
      
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      setError("Microphone access denied. Please enable microphone in browser settings.");
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && recording) {
      mediaRecorderRef.current.stop();
      streamRef.current?.getTracks().forEach(track => track.stop());
      setRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const transcribeAudio = async (blob) => {
    setTranscribing(true);
    try {
      const formData = new FormData();
      formData.append("file", blob, "audio.mp3");
      
      // Call backend Whisper transcriber
      const response = await fetch("/api/transcribeAudioWithWhisper", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Transcription failed");
      }

      const data = await response.json();
      const transcriptText = data.text || "";
      const enhanced = enhanceTranscription(transcriptText);
      
      setTranscript(enhanced);
      setShowMapper(true);
    } catch (err) {
      setError(`Transcription error: ${err.message}`);
      console.error("Transcription error:", err);
    } finally {
      setTranscribing(false);
    }
  };

  const clearRecording = () => {
    setAudioUrl(null);
    setRecordingTime(0);
    setError(null);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-3 space-y-2">
      {error && (
        <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded p-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
          <p className="text-xs text-red-700">{error}</p>
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-3 h-3 text-red-600" />
          </button>
        </div>
      )}

      {!audioUrl ? (
        <div className="flex items-center gap-2">
          <Button
            onClick={recording ? stopRecording : startRecording}
            disabled={disabled || transcribing}
            variant={recording ? "destructive" : "outline"}
            size="sm"
            className="h-9 gap-1.5 text-xs flex-1"
          >
            {recording ? (
              <>
                <MicOff className="w-3.5 h-3.5 animate-pulse" />
                Stop Recording ({formatTime(recordingTime)})
              </>
            ) : (
              <>
                <Mic className="w-3.5 h-3.5" />
                {transcribing ? "Transcribing..." : "Start Recording"}
              </>
            )}
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded p-2">
            <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            <span className="text-xs text-green-700 font-medium flex-1">
              {transcribing ? "Transcribing audio..." : "Audio recorded & transcribed"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <audio src={audioUrl} controls className="flex-1 h-8 text-xs" />
            <Button
              onClick={clearRecording}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 shrink-0"
              title="Clear recording"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
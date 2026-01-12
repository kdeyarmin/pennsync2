import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, Square, Play, Pause, Download, Loader, Check, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { base44 } from "@/api/base44Client";

export default function ScribeNoteRecorder({ patientId, visitType, diagnosis, onNoteGenerated }) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);

  const mediaRecorderRef = useRef(null);
  const audioContextRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const audioRef = useRef(null);

  // Initialize recording
  const startRecording = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => chunksRef.current.push(e.data);
      mediaRecorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/wav" });
        setAudioBlob(blob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      // Timer
      timerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      setError("Microphone access denied. Please enable microphone permissions.");
      console.error("Recording error:", err);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const downloadAudio = () => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recording_${new Date().toISOString().slice(0, 10)}.wav`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
  };

  const generateNote = async () => {
    if (!audioBlob) return;

    setIsGenerating(true);
    try {
      // Upload audio
      const formData = new FormData();
      formData.append('file', audioBlob);
      const uploadRes = await base44.integrations.Core.UploadFile({ file: audioBlob });
      const audioUrl = uploadRes.file_url;

      // Generate note
      const { data: response } = await base44.functions.invoke('generateNoteFromRecording', {
        audioUrl,
        patientId,
        visitType,
        diagnosis
      });

      if (response.success) {
        onNoteGenerated({
          transcription: response.transcription,
          generatedNote: response.generatedNote,
          patientId: response.patientId,
          visitType: response.visitType,
          diagnosis: response.diagnosis,
          audioUrl: response.audioUrl
        });
      }
    } catch (err) {
      setError("Failed to generate note. Please try again.");
      console.error("Generation error:", err);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Mic className="w-5 h-5 text-indigo-600" />
          Voice Scribe Assistant
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Recording Section */}
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Record your complete interaction with the patient. The note will be automatically generated from the recording.
          </p>

          {!audioBlob ? (
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  {isRecording && (
                    <div className="w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  )}
                  <span className="text-sm font-medium">
                    {isRecording ? "Recording..." : "Ready to record"}
                  </span>
                </div>
                {isRecording && (
                  <span className="text-lg font-mono font-medium text-red-600">
                    {formatTime(recordingTime)}
                  </span>
                )}
              </div>

              <div className="flex gap-3">
                {!isRecording ? (
                  <Button
                    onClick={startRecording}
                    className="flex-1 gap-2 bg-red-600 hover:bg-red-700"
                  >
                    <Mic className="w-4 h-4" />
                    Start Recording
                  </Button>
                ) : (
                  <Button
                    onClick={stopRecording}
                    className="flex-1 gap-2 bg-gray-600 hover:bg-gray-700"
                  >
                    <Square className="w-4 h-4" />
                    Stop Recording
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Playback Section */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <audio
                  ref={audioRef}
                  src={URL.createObjectURL(audioBlob)}
                  onEnded={() => setIsPlaying(false)}
                />
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={togglePlayback}
                    className="flex-shrink-0"
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4" />
                    ) : (
                      <Play className="w-4 h-4" />
                    )}
                  </Button>
                  <span className="text-sm font-medium text-gray-700">
                    Recording: {formatTime(recordingTime)}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={downloadAudio}
                    className="ml-auto gap-2"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </Button>
                </div>
              </div>

              {/* Generate Note Section */}
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Ready to generate your clinical note from this recording?
                </p>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setAudioBlob(null)}
                    className="flex-1"
                  >
                    Re-record
                  </Button>
                  <Button
                    onClick={generateNote}
                    disabled={isGenerating}
                    className="flex-1 gap-2 bg-indigo-600 hover:bg-indigo-700"
                  >
                    {isGenerating ? (
                      <>
                        <Loader className="w-4 h-4 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Check className="w-4 h-4" />
                        Generate Note
                      </>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
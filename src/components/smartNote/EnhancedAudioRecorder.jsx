import { useState, useRef, useEffect } from "react";
import { configNotReadyMessage } from "@/lib/aiFeatureError";
import { Button } from "@/components/ui/button";
import { base44 } from "@/api/base44Client";
import { Mic, MicOff, X, CheckCircle2, AlertCircle } from "lucide-react";
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
    } catch {
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
      // Wrap the recorded Blob in a File so the SDK uploads it as
      // multipart/form-data (with auth) to the backend function, which reads
      // the `file` field via req.formData() and returns { text }.
      const audioFile = new File([blob], `recording-${Date.now()}.mp3`, {
        type: "audio/mp3",
      });

      // functions.invoke does not unwrap the response (interceptResponses:
      // false), so the backend's JSON body lives on response.data.
      const response = await base44.functions.invoke("transcribeAudioWithWhisper", {
        file: audioFile,
      });
      const transcriptText = response.data?.text || "";
      const enhanced = enhanceTranscription(transcriptText);
      
      setTranscript(enhanced);
      setShowMapper(true);
    } catch (err) {
      const friendly = configNotReadyMessage(err);
      setError(friendly || `Transcription error: ${err.message}`);
      if (!friendly) console.error("Transcription error:", err);
    } finally {
      setTranscribing(false);
    }
  };

  const clearRecording = () => {
    setAudioUrl(null);
    setRecordingTime(0);
    setError(null);
    setTranscript(null);
    setShowMapper(false);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  // Release the microphone, recorder, and timer if the component unmounts mid-
  // recording (e.g. navigating away without pressing Stop) — otherwise the mic
  // stays live on a shared device and the interval keeps firing setState.
  useEffect(() => {
    return () => {
      const mr = mediaRecorderRef.current;
      if (mr && mr.state !== "inactive") {
        // Detach onstop FIRST: cleanup must only release the mic, not run the
        // transcribe/upload side-effect for a recording the user never accepted
        // (navigating away mid-recording must not upload PHI audio or setState
        // after unmount).
        mr.onstop = null;
        try { mr.stop(); } catch { /* already stopped */ }
      }
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Revoke the recorded-audio object URL when it changes, is cleared, or the
  // component unmounts, so blob URLs don't accumulate for the page lifetime.
  useEffect(() => {
    return () => {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
    };
  }, [audioUrl]);

  return (
    <div className="bg-white border border-slate-200 rounded-lg p-3 space-y-2">
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

          {/* Section Mapper - shown after transcription */}
          {transcript && showMapper && (
            <div className="border-t border-slate-200 pt-3 mt-3">
              <p className="text-xs font-semibold text-slate-600 mb-2">📍 Auto-map transcription into note sections</p>
              <DictationSectionMapper
                transcript={transcript}
                onSectionsMapped={(sections) => {
                  if (sections && Object.values(sections).some(v => v?.trim())) {
                    const fullNote = Object.entries(sections)
                      .filter(([_, v]) => v?.trim())
                      .map(([_, v]) => v.trim())
                      .join("\n\n");
                    if (onTranscribed) {
                      onTranscribed(fullNote);
                    }
                  }
                }}
              />
            </div>
          )}
          </div>
          )}
          </div>
          );
          }
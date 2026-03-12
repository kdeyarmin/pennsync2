import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, Mic, Square, Upload, AlertCircle } from "lucide-react";

export default function ScribeNoteRecorder({ patientId, visitType, diagnosis, onNoteGenerated }) {
  const [isRecording, setIsRecording] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);
  const timerRef = useRef(null);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(blob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingTime(0);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (error) {
      alert("Failed to access microphone: " + error.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      setIsRecording(false);
      clearInterval(timerRef.current);
    }
  };

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (file) {
      setAudioBlob(file);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const processAudio = async () => {
    if (!audioBlob) return;

    setIsProcessing(true);
    try {
      // Upload audio file
      const uploadResponse = await base44.integrations.Core.UploadFile({
        file: audioBlob,
      });

      // Generate note from recording
      const response = await base44.functions.invoke("generateNoteFromRecording", {
        audio_url: uploadResponse.file_url,
        patient_id: patientId,
        visit_type: visitType,
        diagnosis: diagnosis,
      });

      if (response.data) {
        onNoteGenerated({
          transcription: response.data.transcription,
          generatedNote: response.data.generatedNote,
          treatmentSuggestions: response.data.treatmentSuggestions,
        });
      }
    } catch (error) {
      console.error("Error processing audio:", error);
      alert("Failed to process recording: " + error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Patient Interaction</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="bg-blue-50 border-blue-200">
          <AlertCircle className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800">
            Record or upload audio of your patient interaction. AI will transcribe and generate structured clinical notes.
          </AlertDescription>
        </Alert>

        <div className="space-y-4">
          {/* Recording Controls */}
          {!audioBlob ? (
            <div className="space-y-4">
              <div className="flex gap-4">
                {!isRecording ? (
                  <Button
                    onClick={startRecording}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white"
                    size="lg"
                  >
                    <Mic className="w-5 h-5 mr-2" />
                    Start Recording
                  </Button>
                ) : (
                  <>
                    <Button
                      onClick={stopRecording}
                      className="flex-1 bg-gray-600 hover:bg-gray-700"
                      size="lg"
                    >
                      <Square className="w-5 h-5 mr-2" />
                      Stop Recording
                    </Button>
                    <div className="flex items-center justify-center px-4 py-2 bg-red-100 rounded-lg">
                      <div className="w-3 h-3 bg-red-600 rounded-full mr-2 animate-pulse" />
                      <span className="font-mono text-red-700">{formatTime(recordingTime)}</span>
                    </div>
                  </>
                )}
              </div>

              {/* File Upload Alternative */}
              <div className="border-2 border-dashed border-blue-300 rounded-lg p-6 text-center hover:bg-blue-50 transition-colors">
                <input
                  type="file"
                  accept="audio/*,video/*"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="audio-upload"
                />
                <label htmlFor="audio-upload" className="cursor-pointer">
                  <Upload className="w-10 h-10 mx-auto mb-2 text-blue-400" />
                  <p className="text-sm font-medium text-gray-700">
                    Or click to upload pre-recorded file
                  </p>
                  <p className="text-xs text-gray-500">MP3, WAV, M4A, MP4, OGG, WebM (up to 500MB)</p>
                </label>
              </div>
            </div>
          ) : (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-900">
                    ✓ Audio ready for processing
                  </p>
                  <p className="text-xs text-green-700 mt-1">
                    {formatFileSize(audioBlob.size)}
                  </p>
                </div>
                <Button
                  onClick={() => setAudioBlob(null)}
                  variant="outline"
                  size="sm"
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  Clear
                </Button>
              </div>
            </div>
          )}

          {/* Process Button */}
          {audioBlob && (
            <Button
              onClick={processAudio}
              disabled={isProcessing}
              className="w-full bg-indigo-600 hover:bg-indigo-700"
              size="lg"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Generating Clinical Note...
                </>
              ) : (
                "Generate Clinical Note"
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
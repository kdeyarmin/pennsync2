import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mic, Upload, Loader2, Check } from "lucide-react";
import AudioRecorder from "../components/visit/AudioRecorder";
import UnifiedDocumentReview from "../components/smartNote/UnifiedDocumentReview";

export default function VisitScribe() {
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [uploadedAudio, setUploadedAudio] = useState(null);
  const [transcription, setTranscription] = useState(null);
  const [roughNote, setRoughNote] = useState("");
  const [activeTab, setActiveTab] = useState("record");
  const queryClient = useQueryClient();

  // Process audio file (both recorded and uploaded)
  const processAudioMutation = useMutation({
    mutationFn: async (audioFile) => {
      const uploadResult = await base44.integrations.Core.UploadFile({
        file: audioFile,
      });
      
      const result = await base44.functions.invoke('generateNoteFromRecording', {
        audio_url: uploadResult.file_url,
      });
      
      return result;
    },
    onSuccess: (data) => {
      setTranscription(data.transcription || "");
      setRoughNote(data.rough_note || data.transcription || "");
    },
  });

  const handleRecordingComplete = (audioBlob) => {
    setRecordedAudio(audioBlob);
    processAudioMutation.mutate(audioBlob);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setUploadedAudio(file);
      processAudioMutation.mutate(file);
    }
  };

  const hasAudio = recordedAudio || uploadedAudio;
  const isProcessing = processAudioMutation.isPending;
  const hasRoughNote = !!roughNote;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-2">
            <Mic className="w-8 h-8 text-indigo-600" />
            Visit Scribe
          </h1>
          <p className="text-gray-600 mt-2">Record or upload patient interactions to generate compliant clinical notes</p>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="record">Record Visit</TabsTrigger>
            <TabsTrigger value="upload">Upload Audio</TabsTrigger>
          </TabsList>

          {/* Record Tab */}
          <TabsContent value="record" className="space-y-4">
            <Card className="modern-card">
              <CardHeader>
                <CardTitle>Record Patient Interaction</CardTitle>
                <CardDescription>Click record to capture the patient visit conversation</CardDescription>
              </CardHeader>
              <CardContent>
                {!hasAudio ? (
                  <AudioRecorder onRecordingComplete={handleRecordingComplete} />
                ) : (
                  <div className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                      <Check className="w-5 h-5 text-green-600" />
                      <span className="text-green-700 font-medium">Audio recorded successfully</span>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Upload Tab */}
          <TabsContent value="upload" className="space-y-4">
            <Card className="modern-card">
              <CardHeader>
                <CardTitle>Upload Audio File</CardTitle>
                <CardDescription>Upload a previously recorded audio file (MP3, WAV, M4A)</CardDescription>
              </CardHeader>
              <CardContent>
                {!hasAudio ? (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="audio-upload"
                    />
                    <label htmlFor="audio-upload" className="cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                      <p className="text-gray-900 font-medium">Click to upload or drag audio file</p>
                      <p className="text-gray-500 text-sm">MP3, WAV, M4A up to 100MB</p>
                    </label>
                  </div>
                ) : (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
                    <Check className="w-5 h-5 text-green-600" />
                    <span className="text-green-700 font-medium">Audio uploaded successfully</span>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Processing Status */}
        {isProcessing && (
          <Alert className="bg-blue-50 border-blue-200">
            <Loader2 className="w-4 h-4 animate-spin text-blue-600" />
            <AlertDescription className="text-blue-700">Processing audio and generating rough note...</AlertDescription>
          </Alert>
        )}

        {/* Error Alert */}
        {processAudioMutation.isError && (
          <Alert variant="destructive">
            <AlertDescription>
              Error processing audio: {processAudioMutation.error?.message}
            </AlertDescription>
          </Alert>
        )}

        {/* Rough Note Section */}
        {hasRoughNote && (
          <Card className="modern-card">
            <CardHeader>
              <CardTitle>Rough Note from Recording</CardTitle>
              <CardDescription>Review and refine the transcribed content</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 rounded-lg p-4 max-h-64 overflow-y-auto border border-gray-200">
                <p className="text-gray-800 whitespace-pre-wrap">{roughNote}</p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Document Review & Enhancement */}
        {hasRoughNote && (
          <Card className="modern-card">
            <CardHeader>
              <CardTitle>Enhance Note</CardTitle>
              <CardDescription>AI will review and generate a compliant clinical note</CardDescription>
            </CardHeader>
            <CardContent>
              <UnifiedDocumentReview 
                roughNote={roughNote}
                onSuggestionApplied={(updatedNote) => setRoughNote(updatedNote)}
              />
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Mic, Upload, Loader2, Check } from "lucide-react";
import PageContainer from "@/components/ui/PageContainer";
import PageHeader from "@/components/ui/PageHeader";
import AudioRecorder from "../components/visit/AudioRecorder";
import UnifiedDocumentReview from "../components/smartNote/UnifiedDocumentReview";
import RealTimeDictationScribe from "../components/visit/RealTimeDictationScribe";
import { logActivity, ActivityActions } from "../components/utils/activityLogger";

export default function VisitScribe() {
  const [recordedAudio, setRecordedAudio] = useState(null);
  const [uploadedAudio, setUploadedAudio] = useState(null);
  const [_transcription, setTranscription] = useState(null);
  const [roughNote, setRoughNote] = useState("");
  const [activeTab, setActiveTab] = useState("record");

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  useEffect(() => {
    if (currentUser?.email) {
      logActivity(ActivityActions.PAGE_VISIT, { page: 'VisitScribe' });
    }
  }, [currentUser?.email]);

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
      // functions.invoke returns the full axios response; this function's body
      // additionally nests its payload under `data`, so peel two layers. The
      // field is `generatedNote` (not `rough_note`).
      const body = data?.data || data;
      const payload = body?.data || body;
      setTranscription(payload.transcription || "");
      setRoughNote(payload.generatedNote || payload.transcription || "");
      logActivity(ActivityActions.NOTE_AI_GENERATED, { page: 'VisitScribe', source: 'audio_recording' });
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
    <PageContainer>
      <PageHeader
        icon={Mic}
        eyebrow="Documentation"
        title="Visit Scribe"
        description="Record or upload patient interactions to generate compliant clinical notes"
        favoritePage="VisitScribe"
      />

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dictate">🎙️ Live Dictation</TabsTrigger>
            <TabsTrigger value="record">Record Visit</TabsTrigger>
            <TabsTrigger value="upload">Upload Audio</TabsTrigger>
          </TabsList>

          {/* Live Dictation Tab */}
          <TabsContent value="dictate" className="space-y-4">
            <RealTimeDictationScribe currentUser={currentUser} />
          </TabsContent>

          {/* Record Tab */}
          <TabsContent value="record" className="space-y-4">
            <Card className="modern-card">
              <CardHeader>
                <CardTitle>Record Patient Interaction</CardTitle>
                <CardDescription>Click record to capture the patient visit conversation</CardDescription>
              </CardHeader>
              <CardContent>
                {!hasAudio ? (
                  <AudioRecorder onAudioProcessed={handleRecordingComplete} isProcessing={isProcessing} />
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
                  <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors cursor-pointer">
                    <input
                      type="file"
                      accept="audio/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="audio-upload"
                    />
                    <label htmlFor="audio-upload" className="cursor-pointer">
                      <Upload className="w-8 h-8 mx-auto mb-2 text-slate-400" />
                      <p className="text-slate-900 font-medium">Click to upload or drag audio file</p>
                      <p className="text-slate-500 text-sm">MP3, WAV, M4A up to 100MB</p>
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
              <div className="bg-slate-50 rounded-lg p-4 max-h-64 overflow-y-auto border border-slate-200">
                <p className="text-slate-800 whitespace-pre-wrap">{roughNote}</p>
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
                currentUser={currentUser}
              />
            </CardContent>
          </Card>
        )}
    </PageContainer>
  );
}
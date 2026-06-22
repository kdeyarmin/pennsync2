import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Mic, 
  Upload, 
  Loader2, 
  FileAudio, 
  CheckCircle2,
  Copy,
  Stethoscope
} from "lucide-react";
import { trackScribeUsage, trackAISuggestion } from "../utils/performanceTracking";
import { toast } from 'sonner';

export default function MedicalScribeAssistant({ patientId, onDataExtracted }) {
  const [isRecording, setIsRecording] = useState(false);
  const [audioFile, setAudioFile] = useState(null);
  const [transcriptionResult, setTranscriptionResult] = useState(null);
  const [editedNarrative, setEditedNarrative] = useState('');
  const [activeTab, setActiveTab] = useState('upload');
  
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const uploadAudioMutation = useMutation({
    mutationFn: async (file) => {
      const response = await base44.integrations.Core.UploadFile({ file });
      return response.file_url;
    }
  });

  const transcribeMutation = useMutation({
    mutationFn: async (audioUrl) => {
      const response = await base44.functions.invoke('transcribeAndExtractClinicalData', {
        audio_url: audioUrl,
        patient_id: patientId
      });
      return response.data || response;
    },
    onSuccess: async (data) => {
      setTranscriptionResult(data);
      setEditedNarrative(data.clinical_narrative || '');
      
      // Track scribe usage
      await trackScribeUsage({
        visit_id: null,
        patient_id: patientId,
        transcript_length: data.transcript?.length || 0,
        fields_extracted: Object.keys(data.structured_data || {}).length,
        applied: false
      });

      // Track each AI suggestion from structured data
      if (data.structured_data?.action_items) {
        for (const actionItem of data.structured_data.action_items) {
          await trackAISuggestion({
            type: 'clinical',
            text: `Action Item: ${actionItem}`,
            source: 'ai_scribe',
            severity: 'high',
            patient_id: patientId,
            element: 'Action Items',
            context: data.transcript?.substring(0, 200)
          });
        }
      }
    }
  });

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const audioFile = new File([audioBlob], 'recording.webm', { type: 'audio/webm' });
        setAudioFile(audioFile);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecording(true);
    } catch (error) {
      console.error('Error starting recording:', error);
      toast.error('Unable to access microphone: ' + error.message);
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // The mic stream is otherwise stopped only in the recorder's onstop handler
  // (i.e. when the user presses Stop). Stop it on unmount too so navigating away
  // mid-recording doesn't leave the microphone live on a shared device.
  useEffect(() => {
    return () => {
      const mr = mediaRecorderRef.current;
      if (!mr) return;
      // Detach onstop so cleanup only releases the mic (the handler setStates
      // after unmount otherwise).
      mr.onstop = null;
      try { if (mr.state !== "inactive") mr.stop(); } catch { /* already stopped */ }
      mr.stream?.getTracks().forEach((track) => track.stop());
    };
  }, []);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      setAudioFile(file);
    }
  };

  const handleTranscribe = async () => {
    if (!audioFile) return;

    try {
      const audioUrl = await uploadAudioMutation.mutateAsync(audioFile);
      await transcribeMutation.mutateAsync(audioUrl);
    } catch (error) {
      console.error('Transcription error:', error);
      toast.error('Failed to transcribe audio: ' + error.message);
    }
  };

  const handleApplyData = async () => {
    if (!transcriptionResult || !onDataExtracted) return;

    // Track that scribe data was applied
    await trackScribeUsage({
      visit_id: null,
      patient_id: patientId,
      transcript_length: transcriptionResult.transcript?.length || 0,
      fields_extracted: Object.keys(transcriptionResult.structured_data || {}).length,
      applied: true
    });

    onDataExtracted({
      narrative: editedNarrative,
      structuredData: transcriptionResult.structured_data,
      transcript: transcriptionResult.transcript
    });
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard!');
  };

  const isProcessing = uploadAudioMutation.isPending || transcribeMutation.isPending;

  return (
    <Card className="border-navy-200">
      <CardHeader className="bg-gradient-to-r from-navy-50 to-indigo-50">
        <CardTitle className="flex items-center gap-2">
          <Stethoscope className="w-5 h-5 text-navy-600" />
          AI Medical Scribe
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6 space-y-4">
        {!transcriptionResult ? (
          <>
            <p className="text-sm text-slate-600">
              Record or upload audio of a patient conversation. The AI will transcribe and extract clinical data.
            </p>

            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="upload">Upload Audio</TabsTrigger>
                <TabsTrigger value="record">Record Live</TabsTrigger>
              </TabsList>

              <TabsContent value="upload" className="space-y-4">
                <div className="border-2 border-dashed border-slate-300 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileUpload}
                    className="hidden"
                    id="audio-upload"
                    disabled={isProcessing}
                  />
                  <label htmlFor="audio-upload" className="cursor-pointer">
                    <Upload className="w-10 h-10 mx-auto mb-3 text-slate-400" />
                    <p className="text-sm font-medium text-slate-700">
                      {audioFile ? audioFile.name : 'Click to upload audio file'}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">MP3, WAV, WebM, or other audio formats</p>
                  </label>
                </div>
              </TabsContent>

              <TabsContent value="record" className="space-y-4">
                <div className="border rounded-lg p-6 text-center bg-slate-50">
                  {isRecording ? (
                    <>
                      <div className="w-16 h-16 bg-red-500 rounded-full mx-auto mb-4 flex items-center justify-center animate-pulse">
                        <Mic className="w-8 h-8 text-white" />
                      </div>
                      <p className="text-sm font-medium text-slate-900 mb-2">Recording in progress...</p>
                      <Button onClick={stopRecording} variant="destructive">
                        Stop Recording
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="w-16 h-16 bg-navy-500 rounded-full mx-auto mb-4 flex items-center justify-center">
                        <Mic className="w-8 h-8 text-white" />
                      </div>
                      <p className="text-sm font-medium text-slate-900 mb-2">
                        {audioFile ? 'Recording captured' : 'Ready to record'}
                      </p>
                      <Button onClick={startRecording} className="bg-navy-600 hover:bg-navy-700">
                        Start Recording
                      </Button>
                    </>
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {audioFile && (
              <Alert className="border-navy-200 bg-navy-50">
                <FileAudio className="w-4 h-4 text-navy-600" />
                <AlertDescription className="flex items-center justify-between">
                  <span className="text-navy-900">Audio file ready: {audioFile.name}</span>
                </AlertDescription>
              </Alert>
            )}

            <Button
              onClick={handleTranscribe}
              disabled={!audioFile || isProcessing}
              className="w-full bg-navy-600 hover:bg-navy-700"
            >
              {isProcessing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processing...
                </>
              ) : (
                'Transcribe & Extract Data'
              )}
            </Button>
          </>
        ) : (
          <div className="space-y-4">
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-900">
                Transcription complete! Review and edit the extracted data below.
              </AlertDescription>
            </Alert>

            <Tabs defaultValue="narrative" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="narrative">Clinical Note</TabsTrigger>
                <TabsTrigger value="structured">Structured Data</TabsTrigger>
                <TabsTrigger value="transcript">Transcript</TabsTrigger>
              </TabsList>

              <TabsContent value="narrative" className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Medicare-Compliant Clinical Narrative</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(editedNarrative)}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <Textarea
                  value={editedNarrative}
                  onChange={(e) => setEditedNarrative(e.target.value)}
                  className="min-h-[300px] font-mono text-sm"
                  placeholder="Clinical narrative will appear here..."
                />
              </TabsContent>

              <TabsContent value="structured" className="space-y-3">
                <ScrollArea className="h-[400px] border rounded-lg p-4">
                  <div className="space-y-4">
                    {transcriptionResult.structured_data?.chief_complaint && (
                      <div>
                        <Label className="text-navy-700">Chief Complaint</Label>
                        <p className="text-sm mt-1">{transcriptionResult.structured_data.chief_complaint}</p>
                      </div>
                    )}

                    {transcriptionResult.structured_data?.vital_signs && (
                      <div>
                        <Label className="text-navy-700">Vital Signs</Label>
                        <div className="grid grid-cols-2 gap-2 mt-1 text-sm">
                          {Object.entries(transcriptionResult.structured_data.vital_signs).map(([key, value]) => (
                            value && (
                              <div key={key}>
                                <span className="font-medium">{key.replace(/_/g, ' ')}:</span> {value}
                              </div>
                            )
                          ))}
                        </div>
                      </div>
                    )}

                    {transcriptionResult.structured_data?.assessment?.length > 0 && (
                      <div>
                        <Label className="text-navy-700">Assessment</Label>
                        <ul className="list-disc ml-5 mt-1 text-sm space-y-1">
                          {transcriptionResult.structured_data.assessment.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {transcriptionResult.structured_data?.new_medications?.length > 0 && (
                      <div>
                        <Label className="text-navy-700">New Medications</Label>
                        <div className="space-y-2 mt-1">
                          {transcriptionResult.structured_data.new_medications.map((med, idx) => (
                            <div key={idx} className="text-sm border-l-2 border-navy-300 pl-2">
                              <p className="font-medium">{med.name}</p>
                              <p className="text-slate-600">{med.dosage} - {med.frequency}</p>
                              {med.instructions && <p className="text-xs text-slate-500">{med.instructions}</p>}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {transcriptionResult.structured_data?.action_items?.length > 0 && (
                      <div>
                        <Label className="text-navy-700">Action Items</Label>
                        <ul className="list-disc ml-5 mt-1 text-sm space-y-1">
                          {transcriptionResult.structured_data.action_items.map((item, idx) => (
                            <li key={idx}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {transcriptionResult.structured_data?.plan && (
                      <div>
                        <Label className="text-navy-700">Plan</Label>
                        <p className="text-sm mt-1">{transcriptionResult.structured_data.plan}</p>
                      </div>
                    )}
                  </div>
                </ScrollArea>
              </TabsContent>

              <TabsContent value="transcript">
                <div className="flex items-center justify-between mb-2">
                  <Label>Full Transcript</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(transcriptionResult.transcript)}
                  >
                    <Copy className="w-3 h-3 mr-1" />
                    Copy
                  </Button>
                </div>
                <ScrollArea className="h-[400px] border rounded-lg p-4">
                  <p className="text-sm whitespace-pre-wrap">{transcriptionResult.transcript}</p>
                </ScrollArea>
              </TabsContent>
            </Tabs>

            <div className="flex gap-2">
              <Button
                onClick={handleApplyData}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Apply to Visit
              </Button>
              <Button
                onClick={() => {
                  setTranscriptionResult(null);
                  setAudioFile(null);
                  setEditedNarrative('');
                }}
                variant="outline"
              >
                New Recording
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
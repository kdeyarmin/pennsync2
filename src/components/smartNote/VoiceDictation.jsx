import { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Mic,
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

  const _startRecording = async () => {
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
        prompt: `You are an expert medical transcription AI specialized in nursing documentation. Transcribe this audio recording with the highest accuracy for medical terminology.

CRITICAL TRANSCRIPTION RULES:
1. Transcribe EXACTLY what is spoken - word-for-word accuracy is paramount
2. Recognize and correctly spell medical terms (medications, diagnoses, procedures, anatomical terms)
3. Handle common medical abbreviations and their phonetic spellings:
   - "BP" or "blood pressure"
   - "HR" or "heart rate"
   - "O2 sat" or "oxygen saturation"
   - "resp rate" or "respiratory rate"
   - "temp" or "temperature"
   - "PRN" (as needed), "BID" (twice daily), "TID" (three times daily), "QID" (four times daily)
4. Correctly transcribe vital signs with numbers and units:
   - Blood pressure: "120 over 80" → "120/80"
   - Temperature: "ninety-eight point six" → "98.6"
   - Weight: "one fifty" → "150 lbs"
5. Handle medical phrases accurately:
   - "Alert and oriented times three" → "Alert and oriented x3"
   - "No acute distress" → "NAD"
   - "Within normal limits" → "WNL"
6. Preserve clinical context and timing phrases
7. Maintain speaker corrections and clarifications
8. Use proper punctuation for clarity
9. If audio quality is poor in sections, mark unclear portions with [inaudible] or [unclear]
10. Return raw medical transcription - do NOT summarize, interpret, or add clinical notes

AUDIO QUALITY ASSESSMENT:
- Evaluate clarity, background noise, and speaker articulation
- Note any technical issues that may affect accuracy

Return JSON:
{
  "transcription": "Complete word-for-word medical transcription",
  "duration_detected": "Approximate recording duration in minutes",
  "clarity_score": 1-10 (10 = crystal clear, 1 = very poor),
  "medical_terms_detected": ["list", "of", "medical", "terms"],
  "quality_notes": "Brief assessment of audio quality and any transcription challenges"
}`,
        file_urls: [file_url],
        response_json_schema: {
          type: "object",
          properties: {
            transcription: { type: "string" },
            duration_detected: { type: "string" },
            clarity_score: { type: "number" },
            medical_terms_detected: { type: "array", items: { type: "string" } },
            quality_notes: { type: "string" }
          }
        }
      });

      if (result?.transcription) {
        onTranscriptionComplete(result.transcription);
      }
      
    } catch (error) {
      console.error("Error processing recording:", error);
      // Fallback: Try using Web Speech API for transcription
      tryWebSpeechFallback();
    }
    setIsProcessing(false);
    setRecordingTime(0);
  };

  const tryWebSpeechFallback = () => {
    // If LLM transcription fails, show a message to use browser speech recognition
    setUseWebSpeech(true);
  };

  const [useWebSpeech, setUseWebSpeech] = useState(false);
  const recognitionRef = useRef(null);

  const startWebSpeechRecording = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert("Speech recognition not supported in this browser. Please use Chrome.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';
    recognition.maxAlternatives = 3;
    
    // Enhanced accuracy settings for medical dictation
    if ('grammars' in recognition) {
      const speechRecognitionList = new (window.SpeechGrammarList || window.webkitSpeechGrammarList)();
      const grammar = '#JSGF V1.0; grammar medical; public <medical> = vitals | blood pressure | heart rate | temperature | oxygen saturation | respiratory rate | pain level | ambulating | edema | lungs clear | oriented | medication | diagnosis | assessment | intervention;';
      speechRecognitionList.addFromString(grammar, 1);
      recognition.grammars = speechRecognitionList;
    }

    let finalTranscript = '';

    recognition.onresult = (event) => {
      let interimTranscript = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }
      setCurrentTranscript(finalTranscript + interimTranscript);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsRecording(false);
    };

    recognition.onend = () => {
      if (finalTranscript.trim()) {
        onTranscriptionComplete(finalTranscript.trim());
      }
      setIsRecording(false);
      setCurrentTranscript('');
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);
  };

  const stopWebSpeechRecording = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
    }
  };

  const [currentTranscript, setCurrentTranscript] = useState('');

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card className={`border-2 transition-all ${isRecording ? 'border-red-400 bg-red-50' : 'border-slate-200'}`}>
      <CardContent className="p-4">
        <div className="flex items-center gap-4">
          {/* Recording Button */}
          <Button
            size="lg"
            onClick={isRecording ? (useWebSpeech ? stopWebSpeechRecording : stopRecording) : (useWebSpeech ? startWebSpeechRecording : startWebSpeechRecording)}
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
                <span className="text-slate-600">Click to start voice dictation</span>
              )}
            </div>

            {/* Audio Level Indicator */}
            {isRecording && (
              <div className="flex items-center gap-2">
                <Volume2 className="w-4 h-4 text-slate-500" />
                <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-green-500 to-red-500 transition-all duration-75"
                    style={{ width: `${audioLevel * 100}%` }}
                  />
                </div>
              </div>
            )}

            {currentTranscript && (
              <p className="text-sm text-slate-700 mt-2 p-2 bg-white rounded border">
                {currentTranscript}
              </p>
            )}

            {!isRecording && !isProcessing && (
              <p className="text-xs text-slate-500">
                Speak your clinical notes naturally. They will be transcribed in real-time.
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
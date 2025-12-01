import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Mic,
  MicOff,
  Volume2,
  CheckCircle2,
  XCircle,
  Edit,
  Zap,
  Activity,
  FileText,
  Loader2,
  Sparkles
} from "lucide-react";

export default function VoiceDataEntry({ 
  onVitalsUpdate, 
  onNarrativeUpdate,
  currentVitals = {},
  currentNarrative = "" 
}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [capturedData, setCapturedData] = useState(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [error, setError] = useState(null);
  const [sessionTranscript, setSessionTranscript] = useState("");
  
  const recognitionRef = useRef(null);
  const interimTranscriptRef = useRef("");

  useEffect(() => {
    // Check browser support
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError("Voice recognition not supported in this browser. Please use Chrome, Edge, or Safari.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      if (finalTranscript) {
        setSessionTranscript(prev => prev + finalTranscript);
        interimTranscriptRef.current = '';
      } else {
        interimTranscriptRef.current = interimTranscript;
      }

      setTranscript((finalTranscript || interimTranscript).trim());
    };

    recognition.onerror = (event) => {
      if (event.error !== 'no-speech') {
        console.error('Speech recognition error:', event.error);
        setError(`Recognition error: ${event.error}`);
      }
    };

    recognition.onend = () => {
      if (recognitionRef.current === recognition && isListening) {
        try {
          recognition.start();
        } catch (e) {
          console.log("Recognition restart prevented");
        }
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isListening]);

  const startListening = () => {
    if (recognitionRef.current) {
      try {
        setSessionTranscript("");
        setTranscript("");
        setError(null);
        recognitionRef.current.start();
        setIsListening(true);
      } catch (error) {
        console.error('Error starting recognition:', error);
        setError("Could not start voice recognition");
      }
    }
  };

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
      
      // Process the captured data
      if (sessionTranscript.trim()) {
        processVoiceData(sessionTranscript);
      }
    }
  };

  const processVoiceData = async (spokenText) => {
    setIsProcessing(true);
    
    try {
      const prompt = `You are an AI assistant helping nurses document patient visits. Parse the following spoken input and extract:
1. Structured vital signs data (temperature, blood pressure, heart rate, respiratory rate, oxygen saturation, pain level, weight)
2. Clinical narrative (observations, assessments, patient responses, etc.)

SPOKEN INPUT:
"${spokenText}"

RULES FOR PARSING:
- Extract vital signs even if stated casually (e.g., "BP is one twenty over eighty" → blood_pressure_systolic: 120, blood_pressure_diastolic: 80)
- Temperature: Convert to Fahrenheit if needed, accept "ninety-eight point six" or "98.6"
- Blood Pressure: Handle "120 over 80", "one twenty over eighty", "BP 120/80"
- Heart Rate: "heart rate 72", "pulse 72", "HR 72"
- Respiratory Rate: "breathing 16 times per minute", "resp rate 16", "RR 16"
- Oxygen Saturation: "O2 sat 98%", "sats at 98", "oxygen 98 percent"
- Pain Level: "pain is 3 out of 10", "pain level three", "no pain" (0)
- Weight: "weight 150 pounds", "weighs 150", "150 lbs"
- Everything else goes into narrative

- For narrative: Clean up filler words ("um", "like", "you know"), fix grammar, use professional nursing terminology
- Keep clinical observations intact and detailed
- If structured data is mentioned, DON'T include it in narrative (to avoid duplication)

Return JSON with this structure:
{
  "vitals": {
    "temperature": number or null,
    "blood_pressure_systolic": number or null,
    "blood_pressure_diastolic": number or null,
    "heart_rate": number or null,
    "respiratory_rate": number or null,
    "oxygen_saturation": number or null,
    "pain_level": number or null,
    "weight": number or null
  },
  "narrative": "Professional clinical narrative text here, or empty string if none",
  "confidence": "high" | "medium" | "low",
  "parsing_notes": "Brief note about what was extracted or any ambiguities"
}

Example Input: "Blood pressure is one thirty over eighty five, heart rate seventy two, patient reports feeling dizzy when standing, oriented times three, skin warm and dry"

Example Output:
{
  "vitals": {
    "blood_pressure_systolic": 130,
    "blood_pressure_diastolic": 85,
    "heart_rate": 72,
    "temperature": null,
    "respiratory_rate": null,
    "oxygen_saturation": null,
    "pain_level": null,
    "weight": null
  },
  "narrative": "Patient reports feeling dizzy when standing. Alert and oriented x3. Skin warm and dry.",
  "confidence": "high",
  "parsing_notes": "Extracted BP, HR, and clinical observations successfully"
}

Now parse the input above:`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: prompt,
        response_json_schema: {
          type: "object",
          properties: {
            vitals: {
              type: "object",
              properties: {
                temperature: { type: ["number", "null"] },
                blood_pressure_systolic: { type: ["number", "null"] },
                blood_pressure_diastolic: { type: ["number", "null"] },
                heart_rate: { type: ["number", "null"] },
                respiratory_rate: { type: ["number", "null"] },
                oxygen_saturation: { type: ["number", "null"] },
                pain_level: { type: ["number", "null"] },
                weight: { type: ["number", "null"] }
              }
            },
            narrative: { type: "string" },
            confidence: { type: "string" },
            parsing_notes: { type: "string" }
          }
        }
      });

      // Filter out null vitals
      const extractedVitals = {};
      if (result.vitals) {
        Object.entries(result.vitals).forEach(([key, value]) => {
          if (value !== null && value !== undefined) {
            extractedVitals[key] = value;
          }
        });
      }

      setCapturedData({
        vitals: extractedVitals,
        narrative: result.narrative || "",
        confidence: result.confidence || "medium",
        parsing_notes: result.parsing_notes || "",
        original_text: spokenText
      });

      setShowConfirmDialog(true);

    } catch (error) {
      console.error("Error processing voice data:", error);
      setError("Error processing voice input. Please try again.");
    }
    
    setIsProcessing(false);
  };

  const handleConfirm = () => {
    if (capturedData) {
      // Update vitals
      if (Object.keys(capturedData.vitals).length > 0) {
        const mergedVitals = {
          ...currentVitals,
          ...capturedData.vitals
        };
        onVitalsUpdate(mergedVitals);
      }

      // Update narrative
      if (capturedData.narrative) {
        const updatedNarrative = currentNarrative 
          ? currentNarrative + "\n\n" + capturedData.narrative
          : capturedData.narrative;
        onNarrativeUpdate(updatedNarrative);
      }

      setShowConfirmDialog(false);
      setCapturedData(null);
      setSessionTranscript("");
      setTranscript("");
    }
  };

  const handleReject = () => {
    setShowConfirmDialog(false);
    setCapturedData(null);
  };

  const handleEdit = () => {
    // Keep dialog open, user can manually edit in the main form
    alert("Please edit the values directly in the form fields above.");
  };

  const getConfidenceColor = (confidence) => {
    switch (confidence) {
      case 'high': return 'bg-green-100 text-green-800 border-green-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <>
      <Card className="bg-gradient-to-r from-purple-50 to-indigo-50 border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="w-5 h-5 text-purple-600" />
            Voice Data Entry
            <Badge variant="outline" className="ml-auto">
              Hands-free Documentation
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {error && (
            <Alert className="bg-red-50 border-red-200">
              <XCircle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-900">
                {error}
              </AlertDescription>
            </Alert>
          )}

          <Alert className="bg-blue-50 border-blue-200">
            <Sparkles className="w-4 h-4 text-blue-600" />
            <AlertDescription className="text-blue-900">
              <strong>💡 Voice Data Entry Tips:</strong>
              <ul className="list-disc ml-5 mt-2 space-y-1 text-sm">
                <li><strong>Vitals:</strong> "Blood pressure 120 over 80, heart rate 72, temp 98.6, oxygen sat 98%, pain level 2"</li>
                <li><strong>Narrative:</strong> "Patient ambulating independently, lungs clear bilaterally, no edema noted"</li>
                <li><strong>Combined:</strong> "BP one thirty over eighty, patient reports improved shortness of breath, compliance with medications good"</li>
                <li>Speak naturally - AI will extract structured data and clean up narrative</li>
              </ul>
            </AlertDescription>
          </Alert>

          <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-lg border-2 border-dashed border-purple-200">
            {!isListening && !isProcessing && (
              <Button
                onClick={startListening}
                size="lg"
                className="bg-purple-600 hover:bg-purple-700 w-full md:w-auto"
              >
                <Mic className="w-5 h-5 mr-2" />
                Start Voice Entry
              </Button>
            )}

            {isListening && (
              <div className="w-full space-y-4">
                <div className="flex items-center justify-center gap-3">
                  <div className="relative">
                    <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center animate-pulse">
                      <Mic className="w-8 h-8 text-white" />
                    </div>
                    <div className="absolute inset-0 w-16 h-16 bg-red-500 rounded-full animate-ping opacity-75"></div>
                  </div>
                  <div>
                    <p className="text-xl font-bold text-gray-900">Listening...</p>
                    <p className="text-sm text-gray-600">Speak your vitals and observations</p>
                  </div>
                </div>

                {transcript && (
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <p className="text-sm font-medium text-gray-700 mb-2">Live Transcript:</p>
                    <p className="text-gray-900 italic">"{transcript}"</p>
                  </div>
                )}

                <Button
                  onClick={stopListening}
                  variant="destructive"
                  size="lg"
                  className="w-full"
                >
                  <MicOff className="w-5 h-5 mr-2" />
                  Stop & Process
                </Button>
              </div>
            )}

            {isProcessing && (
              <div className="flex flex-col items-center gap-3 py-8">
                <Loader2 className="w-12 h-12 text-purple-600 animate-spin" />
                <div className="text-center">
                  <p className="font-semibold text-gray-900">Processing your input...</p>
                  <p className="text-sm text-gray-600">AI is extracting vitals and formatting narrative</p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Confirmation Dialog */}
      <Dialog open={showConfirmDialog} onOpenChange={setShowConfirmDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-6 h-6 text-green-600" />
              Confirm Voice Data Entry
            </DialogTitle>
            <DialogDescription>
              Review the extracted data before adding to your documentation
            </DialogDescription>
          </DialogHeader>

          {capturedData && (
            <div className="space-y-4 py-4">
              {/* Confidence Badge */}
              <div className="flex items-center gap-2">
                <Badge className={getConfidenceColor(capturedData.confidence)}>
                  {capturedData.confidence.toUpperCase()} CONFIDENCE
                </Badge>
                <span className="text-sm text-gray-600">{capturedData.parsing_notes}</span>
              </div>

              {/* Original Text */}
              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                <p className="text-sm font-medium text-gray-700 mb-2">
                  <Volume2 className="w-4 h-4 inline mr-1" />
                  What you said:
                </p>
                <p className="text-gray-900 italic">"{capturedData.original_text}"</p>
              </div>

              {/* Extracted Vitals */}
              {Object.keys(capturedData.vitals).length > 0 && (
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-sm font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Extracted Vital Signs:
                  </p>
                  <div className="grid grid-cols-2 gap-3">
                    {capturedData.vitals.temperature && (
                      <div className="bg-white rounded p-2 border border-blue-100">
                        <p className="text-xs text-gray-600">Temperature</p>
                        <p className="text-lg font-bold text-gray-900">{capturedData.vitals.temperature}°F</p>
                      </div>
                    )}
                    {capturedData.vitals.blood_pressure_systolic && (
                      <div className="bg-white rounded p-2 border border-blue-100">
                        <p className="text-xs text-gray-600">Blood Pressure</p>
                        <p className="text-lg font-bold text-gray-900">
                          {capturedData.vitals.blood_pressure_systolic}/{capturedData.vitals.blood_pressure_diastolic}
                        </p>
                      </div>
                    )}
                    {capturedData.vitals.heart_rate && (
                      <div className="bg-white rounded p-2 border border-blue-100">
                        <p className="text-xs text-gray-600">Heart Rate</p>
                        <p className="text-lg font-bold text-gray-900">{capturedData.vitals.heart_rate} bpm</p>
                      </div>
                    )}
                    {capturedData.vitals.respiratory_rate && (
                      <div className="bg-white rounded p-2 border border-blue-100">
                        <p className="text-xs text-gray-600">Respiratory Rate</p>
                        <p className="text-lg font-bold text-gray-900">{capturedData.vitals.respiratory_rate} /min</p>
                      </div>
                    )}
                    {capturedData.vitals.oxygen_saturation && (
                      <div className="bg-white rounded p-2 border border-blue-100">
                        <p className="text-xs text-gray-600">O2 Saturation</p>
                        <p className="text-lg font-bold text-gray-900">{capturedData.vitals.oxygen_saturation}%</p>
                      </div>
                    )}
                    {capturedData.vitals.pain_level !== undefined && (
                      <div className="bg-white rounded p-2 border border-blue-100">
                        <p className="text-xs text-gray-600">Pain Level</p>
                        <p className="text-lg font-bold text-gray-900">{capturedData.vitals.pain_level}/10</p>
                      </div>
                    )}
                    {capturedData.vitals.weight && (
                      <div className="bg-white rounded p-2 border border-blue-100">
                        <p className="text-xs text-gray-600">Weight</p>
                        <p className="text-lg font-bold text-gray-900">{capturedData.vitals.weight} lbs</p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Extracted Narrative */}
              {capturedData.narrative && (
                <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                  <p className="text-sm font-semibold text-green-900 mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Clinical Narrative:
                  </p>
                  <p className="text-gray-900 whitespace-pre-wrap">{capturedData.narrative}</p>
                </div>
              )}

              {Object.keys(capturedData.vitals).length === 0 && !capturedData.narrative && (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertDescription className="text-yellow-900">
                    No structured data or narrative could be extracted. Please try again or enter data manually.
                  </AlertDescription>
                </Alert>
              )}
            </div>
          )}

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleReject}
            >
              <XCircle className="w-4 h-4 mr-2" />
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={handleEdit}
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Manually
            </Button>
            <Button
              onClick={handleConfirm}
              className="bg-green-600 hover:bg-green-700"
            >
              <CheckCircle2 className="w-4 h-4 mr-2" />
              Confirm & Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Mic,
  MicOff,
  CheckCircle2,
  Volume2,
  Heart,
  Thermometer,
  Wind,
  Activity,
  AlertCircle
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function EnhancedVoiceVitalsEntry({
  onVitalsRecognized,
  currentVitals = {}
}) {
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [recognizedVitals, setRecognizedVitals] = useState({});
  const [recentlyUpdated, setRecentlyUpdated] = useState({});
  const recognitionRef = useRef(null);

  const vitalConfigs = [
    { key: 'bp', label: 'Blood Pressure', icon: Heart, unit: 'mmHg', color: 'text-red-500' },
    { key: 'hr', label: 'Heart Rate', icon: Activity, unit: 'bpm', color: 'text-pink-500' },
    { key: 'temp', label: 'Temperature', icon: Thermometer, unit: '°F', color: 'text-orange-500' },
    { key: 'o2', label: 'O2 Saturation', icon: Wind, unit: '%', color: 'text-blue-500' },
    { key: 'pain', label: 'Pain Level', icon: AlertCircle, unit: '/10', color: 'text-purple-500' }
  ];

  useEffect(() => {
    if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      recognitionRef.current = new SpeechRecognition();
      recognitionRef.current.continuous = true;
      recognitionRef.current.interimResults = true;
      
      recognitionRef.current.onresult = (event) => {
        let finalTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          if (event.results[i].isFinal) {
            finalTranscript += event.results[i][0].transcript;
          }
        }
        if (finalTranscript) {
          setTranscript(finalTranscript);
          parseVitals(finalTranscript.toLowerCase());
        }
      };

      recognitionRef.current.onerror = (event) => {
        console.error('Speech recognition error:', event.error);
        setIsListening(false);
      };

      recognitionRef.current.onend = () => {
        if (isListening) {
          recognitionRef.current.start();
        }
      };
    }

    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, [isListening]);

  const parseVitals = (text) => {
    const newVitals = {};
    const updates = {};

    // Blood pressure patterns
    const bpMatch = text.match(/(?:blood pressure|bp|b\.p\.)?\s*(\d{2,3})\s*(?:over|\/)\s*(\d{2,3})/i);
    if (bpMatch) {
      newVitals.bp = `${bpMatch[1]}/${bpMatch[2]}`;
      updates.bp = true;
    }

    // Heart rate patterns
    const hrMatch = text.match(/(?:heart rate|pulse|hr)\s*(?:is|of|at)?\s*(\d{2,3})/i);
    if (hrMatch) {
      newVitals.hr = hrMatch[1];
      updates.hr = true;
    }

    // Temperature patterns
    const tempMatch = text.match(/(?:temperature|temp)\s*(?:is|of|at)?\s*(\d{2,3}(?:\.\d)?)/i);
    if (tempMatch) {
      newVitals.temp = tempMatch[1];
      updates.temp = true;
    }

    // O2 saturation patterns
    const o2Match = text.match(/(?:o2|oxygen|sat|saturation|spo2)\s*(?:is|of|at)?\s*(\d{2,3})\s*(?:percent|%)?/i);
    if (o2Match) {
      newVitals.o2 = o2Match[1];
      updates.o2 = true;
    }

    // Pain level patterns
    const painMatch = text.match(/(?:pain|pain level|pain scale)\s*(?:is|of|at)?\s*(\d{1,2})\s*(?:out of|\/|of)?\s*(?:10|ten)?/i);
    if (painMatch) {
      newVitals.pain = painMatch[1];
      updates.pain = true;
    }

    if (Object.keys(newVitals).length > 0) {
      setRecognizedVitals(prev => ({ ...prev, ...newVitals }));
      setRecentlyUpdated(updates);
      onVitalsRecognized(newVitals);

      // Clear the "recently updated" indicator after 3 seconds
      setTimeout(() => {
        setRecentlyUpdated({});
      }, 3000);
    }
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
      setTranscript("");
    }
  };

  const getVitalValue = (key) => {
    return recognizedVitals[key] || currentVitals[key] || null;
  };

  return (
    <Card className="border-blue-200">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Volume2 className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium">Voice Vitals Entry</span>
            {isListening && (
              <Badge className="bg-green-500 animate-pulse">Listening...</Badge>
            )}
          </div>
          <Button
            size="sm"
            variant={isListening ? "destructive" : "default"}
            onClick={toggleListening}
            className="gap-1"
          >
            {isListening ? (
              <>
                <MicOff className="w-4 h-4" />
                Stop
              </>
            ) : (
              <>
                <Mic className="w-4 h-4" />
                Start
              </>
            )}
          </Button>
        </div>

        {/* Vital Signs Display */}
        <div className="grid grid-cols-5 gap-2">
          {vitalConfigs.map((vital) => {
            const value = getVitalValue(vital.key);
            const isUpdated = recentlyUpdated[vital.key];
            
            return (
              <motion.div
                key={vital.key}
                animate={isUpdated ? { scale: [1, 1.1, 1] } : {}}
                transition={{ duration: 0.3 }}
                className={`p-2 rounded-lg border text-center transition-all ${
                  isUpdated 
                    ? 'bg-green-100 border-green-400 ring-2 ring-green-300' 
                    : value 
                      ? 'bg-slate-50 border-slate-200' 
                      : 'bg-slate-50 border-dashed border-slate-300'
                }`}
              >
                <vital.icon className={`w-4 h-4 mx-auto mb-1 ${vital.color}`} />
                <p className="text-xs text-slate-500">{vital.label}</p>
                <div className="flex items-center justify-center gap-1">
                  {value ? (
                    <>
                      <span className="text-sm font-bold">{value}</span>
                      {isUpdated && (
                        <CheckCircle2 className="w-3 h-3 text-green-600" />
                      )}
                    </>
                  ) : (
                    <span className="text-xs text-slate-400">--</span>
                  )}
                </div>
                <p className="text-xs text-slate-400">{vital.unit}</p>
              </motion.div>
            );
          })}
        </div>

        {/* Voice Feedback */}
        <AnimatePresence>
          {isListening && transcript && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-3"
            >
              <Alert className="bg-blue-50 border-blue-200">
                <Mic className="w-4 h-4 text-blue-600" />
                <AlertDescription className="text-xs text-blue-800">
                  Heard: "{transcript}"
                </AlertDescription>
              </Alert>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Usage Hint */}
        <p className="text-xs text-slate-500 mt-2 text-center">
          Say: "Blood pressure 120 over 80" or "Heart rate 72" or "O2 sat 98 percent"
        </p>
      </CardContent>
    </Card>
  );
}
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Mic, MicOff, Activity, MessageSquare } from "lucide-react";

export default function UnifiedVoiceHub({ 
  onTranscription, 
  onVitalsRecognized, 
  isListening = false,
  compact = false 
}) {
  const [mode, setMode] = useState('dictate'); // 'dictate' | 'vitals'
  const [listening, setListening] = useState(false);
  const [lastRecognized, setLastRecognized] = useState(null);

  const startListening = async () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setLastRecognized(transcript);
      
      if (mode === 'vitals') {
        parseVitals(transcript);
      } else {
        onTranscription?.(transcript);
      }
    };

    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);

    setListening(true);
    recognition.start();
  };

  const parseVitals = (text) => {
    const vitals = {};
    const bpMatch = text.match(/blood pressure\s*(\d+)\s*(?:over|\/)\s*(\d+)/i) || 
                    text.match(/bp\s*(\d+)\s*(?:over|\/)\s*(\d+)/i);
    if (bpMatch) vitals.bp = `${bpMatch[1]}/${bpMatch[2]}`;

    const hrMatch = text.match(/(?:heart rate|pulse|hr)\s*(\d+)/i);
    if (hrMatch) vitals.hr = hrMatch[1];

    const tempMatch = text.match(/(?:temperature|temp)\s*([\d.]+)/i);
    if (tempMatch) vitals.temp = tempMatch[1];

    const o2Match = text.match(/(?:oxygen|o2|sat)\s*(\d+)/i);
    if (o2Match) vitals.o2 = o2Match[1];

    const painMatch = text.match(/pain\s*(\d+)/i);
    if (painMatch) vitals.pain = painMatch[1];

    if (Object.keys(vitals).length > 0) {
      onVitalsRecognized?.(vitals);
    }
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Button
          size="sm"
          variant={listening ? "destructive" : "outline"}
          onClick={listening ? () => setListening(false) : startListening}
          className="gap-1"
        >
          {listening ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
          {listening ? 'Stop' : 'Voice'}
        </Button>
        <div className="flex gap-1">
          <Badge 
            variant={mode === 'dictate' ? 'default' : 'outline'} 
            className="cursor-pointer text-xs"
            onClick={() => setMode('dictate')}
          >
            <MessageSquare className="w-3 h-3 mr-1" />
            Dictate
          </Badge>
          <Badge 
            variant={mode === 'vitals' ? 'default' : 'outline'} 
            className="cursor-pointer text-xs"
            onClick={() => setMode('vitals')}
          >
            <Activity className="w-3 h-3 mr-1" />
            Vitals
          </Badge>
        </div>
      </div>
    );
  }

  return (
    <Card className="border-indigo-200 bg-indigo-50">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant={listening ? "destructive" : "default"}
              onClick={listening ? () => setListening(false) : startListening}
              className={listening ? "" : "bg-indigo-600 hover:bg-indigo-700"}
            >
              {listening ? <MicOff className="w-4 h-4 mr-1" /> : <Mic className="w-4 h-4 mr-1" />}
              {listening ? 'Stop' : 'Start Voice'}
            </Button>
            <div className="flex gap-1">
              <Badge 
                variant={mode === 'dictate' ? 'default' : 'outline'} 
                className="cursor-pointer"
                onClick={() => setMode('dictate')}
              >
                Dictate Notes
              </Badge>
              <Badge 
                variant={mode === 'vitals' ? 'default' : 'outline'} 
                className="cursor-pointer"
                onClick={() => setMode('vitals')}
              >
                Say Vitals
              </Badge>
            </div>
          </div>
          {listening && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
              <span className="text-xs text-red-600">Listening...</span>
            </div>
          )}
        </div>
        {lastRecognized && (
          <p className="text-xs text-slate-600 mt-2 truncate">Last: "{lastRecognized}"</p>
        )}
      </CardContent>
    </Card>
  );
}
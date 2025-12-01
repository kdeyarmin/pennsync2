import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Mic, MicOff, HelpCircle, CheckCircle2, Volume2, Activity, Zap } from "lucide-react";
import { smartNoteCommands, parseVitalFromSpeech } from "./voiceCommands";

export default function SmartNoteVoiceListener({ 
  onVitalChange,
  onPhraseInsert,
  onAction,
  isActive = false 
}) {
  const [isListening, setIsListening] = useState(false);
  const [recognizedCommand, setRecognizedCommand] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [showHelp, setShowHelp] = useState(false);
  const [error, setError] = useState(null);
  const [lastAction, setLastAction] = useState(null);
  const recognitionRef = useRef(null);

  const processCommand = useCallback((spokenText) => {
    const text = spokenText.toLowerCase().trim();
    
    // Find matching command
    for (const cmd of smartNoteCommands) {
      const matched = cmd.triggers.some(trigger => text.includes(trigger.toLowerCase()));

      if (matched) {
        setRecognizedCommand(cmd);
        
        // Handle vital sign extraction
        if (cmd.action.startsWith('vital_')) {
          const value = parseVitalFromSpeech(cmd.action, text);
          if (value && onVitalChange) {
            const vitalType = cmd.action.replace('vital_', '');
            onVitalChange(vitalType, value);
            setLastAction({ type: 'vital', name: cmd.name, value });
          }
        }
        // Handle phrase insertion
        else if (cmd.action.startsWith('phrase_') && cmd.insertText) {
          if (onPhraseInsert) {
            onPhraseInsert(cmd.insertText);
            setLastAction({ type: 'phrase', name: cmd.name });
          }
        }
        // Handle compliance insertions
        else if (cmd.action.startsWith('compliance_') && cmd.insertText) {
          if (onPhraseInsert) {
            onPhraseInsert(cmd.insertText);
            setLastAction({ type: 'compliance', name: cmd.name });
          }
        }
        // Handle actions
        else if (cmd.action.startsWith('action_')) {
          if (onAction) {
            onAction(cmd.action.replace('action_', ''));
            setLastAction({ type: 'action', name: cmd.name });
          }
        }

        // Show feedback
        setTimeout(() => {
          setRecognizedCommand(null);
          setTranscript("");
        }, 2500);

        return;
      }
    }
  }, [onVitalChange, onPhraseInsert, onAction]);

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      setError("Voice commands not supported. Use Chrome, Edge, or Safari.");
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      setIsListening(true);
      setError(null);
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognition.onerror = (event) => {
      if (event.error !== 'no-speech' && event.error !== 'aborted') {
        setError(`Voice error: ${event.error}`);
      }
    };

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      setTranscript(finalTranscript || interimTranscript);

      if (finalTranscript) {
        processCommand(finalTranscript);
      }
    };

    recognitionRef.current = recognition;

    return () => {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.stop();
        } catch (e) {}
      }
    };
  }, [processCommand]);

  const toggleListening = () => {
    if (!recognitionRef.current) return;

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
      } catch (error) {
        // Might already be started
      }
    }
  };

  // Group commands by category
  const commandsByCategory = smartNoteCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {});

  return (
    <>
      <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-3">
        {/* Listening feedback */}
        {isListening && (
          <div className="bg-white rounded-lg shadow-xl p-4 max-w-sm border-2 border-purple-400 animate-in fade-in slide-in-from-bottom-5">
            <div className="flex items-center gap-3 mb-2">
              <div className="relative">
                <Mic className="w-5 h-5 text-purple-600" />
                <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
              </div>
              <span className="text-sm font-semibold text-gray-900">Listening for commands...</span>
            </div>
            
            {transcript && (
              <p className="text-sm text-gray-600 italic mb-2">"{transcript}"</p>
            )}
            
            {recognizedCommand && (
              <div className="flex items-center gap-2 text-green-600 bg-green-50 p-2 rounded">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">✓ {recognizedCommand.name}</span>
                {lastAction?.value && (
                  <Badge className="bg-green-600 text-white ml-auto">{lastAction.value}</Badge>
                )}
              </div>
            )}

            <div className="mt-2 text-xs text-gray-500">
              Try: "BP 120 over 80" • "Lungs clear" • "Save note"
            </div>
          </div>
        )}

        {error && (
          <Alert className="max-w-sm bg-red-50 border-red-300">
            <AlertDescription className="text-red-900 text-sm">{error}</AlertDescription>
          </Alert>
        )}

        {/* Control buttons */}
        <div className="flex items-center gap-2">
          <Button
            size="icon"
            variant="outline"
            onClick={() => setShowHelp(true)}
            className="rounded-full shadow-lg"
            title="View voice commands"
          >
            <HelpCircle className="w-5 h-5" />
          </Button>

          <Button
            size="lg"
            onClick={toggleListening}
            className={`rounded-full shadow-lg ${
              isListening 
                ? 'bg-red-600 hover:bg-red-700 animate-pulse' 
                : 'bg-purple-600 hover:bg-purple-700'
            }`}
            title={isListening ? 'Stop listening' : 'Start voice commands'}
          >
            {isListening ? (
              <>
                <MicOff className="w-5 h-5 mr-2" />
                Stop
              </>
            ) : (
              <>
                <Mic className="w-5 h-5 mr-2" />
                Voice
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Help Dialog */}
      <Dialog open={showHelp} onOpenChange={setShowHelp}>
        <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Volume2 className="w-6 h-6 text-purple-600" />
              Smart Note Voice Commands
            </DialogTitle>
            <DialogDescription>
              Speak these commands while voice mode is active to control documentation.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {Object.entries(commandsByCategory).map(([category, commands]) => (
              <div key={category}>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  {category === 'Vital Signs' && <Activity className="w-4 h-4 text-red-500" />}
                  {category === 'Clinical Phrases' && <Zap className="w-4 h-4 text-blue-500" />}
                  {category === 'Actions' && <CheckCircle2 className="w-4 h-4 text-green-500" />}
                  {category}
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {commands.map((cmd, idx) => (
                    <div key={idx} className="p-3 bg-gray-50 rounded-lg border">
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-medium text-sm">{cmd.name}</span>
                      </div>
                      <div className="flex flex-wrap gap-1 mb-1">
                        {cmd.triggers.slice(0, 2).map((trigger, tIdx) => (
                          <Badge key={tIdx} variant="secondary" className="font-mono text-xs">
                            "{trigger}"
                          </Badge>
                        ))}
                      </div>
                      {cmd.example && (
                        <p className="text-xs text-gray-500">{cmd.example}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t pt-4">
            <Alert className="bg-purple-50 border-purple-200">
              <AlertDescription className="text-purple-900 text-sm">
                <strong>💡 Tips:</strong>
                <ul className="list-disc ml-5 mt-2 space-y-1">
                  <li><strong>Vitals:</strong> Say the value after the vital type (e.g., "BP 120 over 80")</li>
                  <li><strong>Phrases:</strong> Just say the phrase name to insert standard text</li>
                  <li><strong>Actions:</strong> Commands like "save note" trigger specific functions</li>
                  <li>Speak clearly at normal pace in a quiet environment</li>
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
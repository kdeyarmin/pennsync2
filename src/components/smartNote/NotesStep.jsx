import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Edit3, CheckCircle2, Mic, MicOff } from "lucide-react";

export default function NotesStep({
  roughNote, onNotesChange, listening, interimText, onStartDictation, onStopDictation,
  isCollapsed, onToggleCollapse, currentStep
}) {
  return (
    <Card id="step-notes" className={`border-2 transition-all duration-300 ${currentStep === 'notes' ? 'border-purple-500 shadow-lg' : 'border-gray-300'}`}>
      <CardHeader className={`py-4 md:py-5 ${currentStep === 'notes' ? 'bg-gradient-to-r from-purple-100 to-pink-100' : 'bg-gray-50'}`}>
        <CardTitle className="text-base md:text-lg flex items-center justify-between gap-2">
          <div className="flex items-center gap-3 flex-1 min-w-0">
            <div className={`p-2 rounded-full ${roughNote.length >= 50 ? 'bg-green-500' : 'bg-purple-500'}`}>
              <Edit3 className="w-4 h-4 text-white flex-shrink-0" />
            </div>
            <span className="truncate">3. Notes</span>
            {roughNote.length >= 50 && <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />}
          </div>
        </CardTitle>
      </CardHeader>
      {!isCollapsed && (
        <CardContent className="p-4 md:p-6 space-y-4">
          <div className="relative">
            <Textarea
              value={roughNote}
              onChange={(e) => onNotesChange(e.target.value)}
              placeholder="Type or dictate your rough notes or bullet points...&#10;&#10;Examples:&#10;• Patient states feeling better&#10;• Wound improving, less drainage&#10;• Taught medication management&#10;• BP elevated, pt needs MD follow-up"
              className="min-h-[700px] text-base touch-target"
            />
            {interimText && (
              <div className="absolute bottom-2 left-2 right-2 bg-blue-100/90 border border-blue-300 rounded px-3 py-2 text-sm text-blue-900 italic pointer-events-none">
                <Mic className="w-3 h-3 inline mr-1" />
                {interimText}...
              </div>
            )}
          </div>
          <div className="flex items-center justify-between">
            <Button
              size="sm"
              variant={listening ? "destructive" : "outline"}
              onClick={listening ? onStopDictation : onStartDictation}
              className="gap-2 min-h-[44px]"
            >
              {listening ? (
                <>
                  <MicOff className="w-4 h-4" />
                  Stop Dictation
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4" />
                  Start Dictation
                </>
              )}
            </Button>
            <div className="flex items-center gap-3 text-sm">
              {listening && (
                <div className="flex items-center gap-1 animate-pulse text-red-600">
                  <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                  <span className="text-xs">Recording</span>
                </div>
              )}
              <p className={`${roughNote.length >= 50 ? 'text-green-600 font-medium' : 'text-gray-400'}`}>
                {roughNote.length} chars {roughNote.length < 50 && roughNote.length > 0 && <span className="text-orange-500">(min 50)</span>}
              </p>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
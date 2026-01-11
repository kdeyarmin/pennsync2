import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Brain, CheckCircle2, Copy, RotateCcw, Sparkles } from "lucide-react";

export default function EnhancementStep({
  roughNote, enhancedNote, copied, savedSuccessfully, recheckMode,
  onEnhance, onCopy, onRecheck, onClear, onNoteChange,
  isEnhancingRunning, analysisResults
}) {
  if (!roughNote || roughNote.length < 50) return null;

  if (recheckMode && !enhancedNote) {
    return (
      <div id="step-review-running">
        <Card className="border-2 border-blue-400 bg-blue-50">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-600" />
              Enhancing Your Note...
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-blue-200 rounded w-3/4"></div>
              <div className="h-4 bg-blue-200 rounded w-5/6"></div>
              <div className="h-4 bg-blue-200 rounded w-4/5"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (enhancedNote) {
    return (
      <Card id="step-complete" className="border-3 border-green-500 shadow-xl">
        <CardHeader className="py-5 bg-green-100">
          <CardTitle className="text-lg flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span>Ready for EHR</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 md:p-6 space-y-4">
          <Textarea
            value={enhancedNote}
            onChange={(e) => onNoteChange(e.target.value)}
            className="min-h-[500px] font-mono text-sm touch-target"
          />
          <div className="flex flex-col sm:flex-row gap-3">
            <Button
              onClick={onCopy}
              className="flex-1 bg-green-600 hover:bg-green-700 min-h-[44px]"
            >
              {copied ? (
                <><CheckCircle2 className="w-4 h-4 mr-2" /> Copied!</>
              ) : (
                <><Copy className="w-4 h-4 mr-2" /> Copy to EHR</>
              )}
            </Button>
            <Button
              onClick={onRecheck}
              variant="outline"
              className="flex-1 min-h-[44px]"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Re-check Note
            </Button>
            <Button
              onClick={onClear}
              variant="outline"
              className="flex-1 min-h-[44px]"
            >
              <RotateCcw className="w-4 h-4 mr-2" />
              Start New
            </Button>
          </div>
          {savedSuccessfully && (
            <Alert className="bg-green-50 border-green-300">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Note saved to patient chart!
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    );
  }

  return (
    <Card id="step-review" className="border-2 border-indigo-400 bg-indigo-50">
      <CardHeader className="py-4">
        <CardTitle className="text-base md:text-lg flex items-center gap-3">
          <Brain className="w-5 h-5 text-indigo-600" />
          Ready to Enhance
        </CardTitle>
      </CardHeader>
      <CardContent className="py-4 space-y-3">
        <p className="text-sm text-gray-700">
          Your note is ready for AI enhancement. Click below to transform it into a Medicare-compliant document.
        </p>
        <Button 
          onClick={onEnhance}
          className="w-full bg-indigo-600 hover:bg-indigo-700 min-h-[44px] text-base"
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Enhance Note
        </Button>
      </CardContent>
    </Card>
  );
}
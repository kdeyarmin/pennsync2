import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Copy,
  CheckCircle2,
  RotateCcw,
  Loader2,
  ClipboardList
} from "lucide-react";

export default function FloatingActionBar({
  roughNoteLength,
  hasEnhancedNote,
  isProcessing,
  copied,
  complianceScore,
  onEnhance,
  onCopy,
  onClear,
  onGenerateTasks
}) {
  const canEnhance = roughNoteLength >= 20 && !hasEnhancedNote;
  const showBar = roughNoteLength >= 10 || hasEnhancedNote;

  if (!showBar) return null;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-white/95 backdrop-blur-md shadow-2xl rounded-full px-4 py-2 border-2 border-gray-200 flex items-center gap-3">
        {/* Character count */}
        <div className="text-xs text-gray-500 hidden sm:block">
          <span className={roughNoteLength >= 20 ? 'text-green-600 font-medium' : 'text-gray-400'}>
            {roughNoteLength}
          </span>
          <span className="text-gray-400"> chars</span>
        </div>

        {/* Compliance score indicator */}
        {complianceScore !== null && (
          <Badge 
            className={`text-xs ${
              complianceScore >= 80 ? 'bg-green-100 text-green-800' :
              complianceScore >= 60 ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}
          >
            {complianceScore}%
          </Badge>
        )}

        {/* Main action buttons */}
        {!hasEnhancedNote ? (
          <Button
            onClick={onEnhance}
            disabled={!canEnhance || isProcessing}
            size="sm"
            className="bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 rounded-full px-6"
          >
            {isProcessing ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Enhancing...</>
            ) : (
              <><Sparkles className="w-4 h-4 mr-2" /> Enhance</>
            )}
          </Button>
        ) : (
          <>
            <Button
              onClick={onCopy}
              size="sm"
              className="bg-green-600 hover:bg-green-700 rounded-full px-6"
            >
              {copied ? (
                <><CheckCircle2 className="w-4 h-4 mr-2" /> Copied!</>
              ) : (
                <><Copy className="w-4 h-4 mr-2" /> Copy to EHR</>
              )}
            </Button>
            <Button
              onClick={onGenerateTasks}
              size="sm"
              variant="outline"
              className="rounded-full"
            >
              <ClipboardList className="w-4 h-4" />
            </Button>
          </>
        )}

        {/* Clear/Reset button */}
        {(roughNoteLength > 0 || hasEnhancedNote) && (
          <Button
            onClick={onClear}
            size="sm"
            variant="ghost"
            className="rounded-full text-gray-500 hover:text-gray-700"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
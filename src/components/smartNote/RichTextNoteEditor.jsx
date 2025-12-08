import React, { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Undo2,
  Redo2,
  Copy,
  CheckCircle2,
  Sparkles
} from "lucide-react";

export default function RichTextNoteEditor({
  value,
  onChange,
  onCopy,
  copied,
  qualityScore
}) {
  const [history, setHistory] = useState([value || '']);
  const [historyIndex, setHistoryIndex] = useState(0);
  const lastValueRef = useRef(value);

  // Track changes for undo/redo
  useEffect(() => {
    if (value !== lastValueRef.current && value !== history[historyIndex]) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(value);
      // Keep max 50 history items
      if (newHistory.length > 50) newHistory.shift();
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
      lastValueRef.current = value;
    }
  }, [value]);

  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const newIndex = historyIndex - 1;
      setHistoryIndex(newIndex);
      onChange(history[newIndex]);
      lastValueRef.current = history[newIndex];
    }
  }, [historyIndex, history, onChange]);

  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const newIndex = historyIndex + 1;
      setHistoryIndex(newIndex);
      onChange(history[newIndex]);
      lastValueRef.current = history[newIndex];
    }
  }, [historyIndex, history, onChange]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        if (e.shiftKey) {
          e.preventDefault();
          handleRedo();
        } else {
          e.preventDefault();
          handleUndo();
        }
      }
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        handleRedo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);



  const handleCopyPlainText = () => {
    navigator.clipboard.writeText(value);
    onCopy?.();
  };

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b">
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="outline"
            onClick={handleUndo}
            disabled={historyIndex <= 0}
            className="h-8 px-2"
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleRedo}
            disabled={historyIndex >= history.length - 1}
            className="h-8 px-2"
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-4 h-4" />
          </Button>
          <span className="text-xs text-gray-400 ml-2">
            {historyIndex + 1}/{history.length} versions
          </span>
        </div>

        <div className="flex items-center gap-2">
          {qualityScore && (
            <Badge className="bg-green-600 text-white">
              <Sparkles className="w-3 h-3 mr-1" />
              {qualityScore}% Quality
            </Badge>
          )}
          <Button
            size="sm"
            variant="outline"
            onClick={handleCopyPlainText}
            className="h-8"
          >
            {copied ? (
              <><CheckCircle2 className="w-4 h-4 mr-1 text-green-600" /> Copied!</>
            ) : (
              <><Copy className="w-4 h-4 mr-1" /> Copy</>
            )}
          </Button>
        </div>
      </div>

      {/* Content Display - Plain Text */}
      <div 
        className="bg-white p-4 rounded-lg border min-h-[300px] whitespace-pre-wrap font-sans text-sm leading-relaxed"
      >
        {value || <span className="text-gray-400">Enhanced note will appear here...</span>}
      </div>

      <p className="text-xs text-gray-500 text-center">
        Use undo/redo buttons or Ctrl+Z / Ctrl+Shift+Z keyboard shortcuts
      </p>
    </div>
  );
}
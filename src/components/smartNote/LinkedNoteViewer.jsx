import React, { useEffect, useRef } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { createPageUrl } from "@/utils";

export default function LinkedNoteViewer({ event, visit, onClose }) {
  const highlightRef = useRef(null);

  useEffect(() => {
    if (highlightRef.current) {
      highlightRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, []);

  if (!visit || !visit.nurse_notes) {
    return null;
  }

  const renderNoteWithHighlight = () => {
    const notes = visit.nurse_notes;
    
    if (event.text_anchor_start !== null && event.text_anchor_end !== null) {
      const before = notes.substring(0, event.text_anchor_start);
      const highlighted = notes.substring(event.text_anchor_start, event.text_anchor_end);
      const after = notes.substring(event.text_anchor_end);

      return (
        <div className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
          {before}
          <span 
            ref={highlightRef}
            className="bg-yellow-200 border-2 border-yellow-400 px-1 py-0.5 rounded font-semibold animate-pulse"
          >
            {highlighted}
          </span>
          {after}
        </div>
      );
    }

    // Fallback: highlight by source_text if anchors not available
    if (event.source_text) {
      const parts = notes.split(event.source_text);
      if (parts.length > 1) {
        return (
          <div className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
            {parts[0]}
            <span 
              ref={highlightRef}
              className="bg-yellow-200 border-2 border-yellow-400 px-1 py-0.5 rounded font-semibold"
            >
              {event.source_text}
            </span>
            {parts.slice(1).join(event.source_text)}
          </div>
        );
      }
    }

    // No highlighting possible
    return (
      <div className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed">
        {notes}
      </div>
    );
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <Card className="w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
        <CardHeader className="flex-shrink-0 border-b">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg mb-2">Source Document</CardTitle>
              <div className="flex items-center gap-2 flex-wrap">
                <Badge className="bg-blue-600 text-white">
                  {visit.visit_type.replace('_', ' ').toUpperCase()}
                </Badge>
                <Badge variant="outline">
                  {format(new Date(visit.visit_date), 'MMM d, yyyy')}
                </Badge>
                {event.source_section && (
                  <Badge className="bg-purple-600 text-white">
                    {event.source_section.replace('_', ' ').toUpperCase()}
                  </Badge>
                )}
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="flex-shrink-0"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex-1 overflow-y-auto p-6">
          <div className="mb-4 p-3 bg-indigo-50 border-l-4 border-indigo-500 rounded">
            <p className="text-sm font-semibold text-indigo-900 mb-1">Event Context:</p>
            <p className="text-sm text-indigo-800">{event.event_title}</p>
            <p className="text-xs text-indigo-700 mt-1">{event.event_description}</p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Full Visit Note</h3>
              {event.text_anchor_start !== null && (
                <Badge className="bg-green-600 text-white text-xs">
                  Highlighted below ↓
                </Badge>
              )}
            </div>
            {renderNoteWithHighlight()}
          </div>

          <div className="mt-4 flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                window.open(createPageUrl(`SmartNoteAssistant`), '_blank');
              }}
              className="flex-1"
            >
              <ExternalLink className="w-4 h-4 mr-2" />
              Open in Smart Notes
            </Button>
            <Button
              onClick={onClose}
              variant="default"
              size="sm"
              className="flex-1"
            >
              Close
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
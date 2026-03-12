import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  Pill,
  Calendar,
  Activity,
  TrendingUp,
  Eye,
  EyeOff
} from "lucide-react";

export default function AutoEventExtractor({ visitId, patientId, nurseNotes, visitDate, onEventsExtracted }) {
  const [isExtracting, setIsExtracting] = useState(false);
  const [extractedEvents, setExtractedEvents] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const extractEvents = async () => {
    if (!nurseNotes || nurseNotes.length < 50) {
      alert('Note is too short to extract meaningful events');
      return;
    }

    setIsExtracting(true);
    try {
      const { data } = await base44.functions.invoke('extractClinicalEvents', {
        visit_id: visitId,
        patient_id: patientId,
        nurse_notes: nurseNotes,
        visit_date: visitDate
      });

      setExtractedEvents(data);
      if (onEventsExtracted) {
        onEventsExtracted(data.events);
      }
    } catch (error) {
      console.error('Error extracting events:', error);
      alert('Failed to extract events. Please try again.');
    } finally {
      setIsExtracting(false);
    }
  };

  const getEventIcon = (eventType) => {
    if (eventType.includes('medication')) return Pill;
    if (eventType.includes('appointment')) return Calendar;
    if (eventType.includes('fall') || eventType.includes('wound')) return AlertCircle;
    return Activity;
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-600';
      case 'high': return 'bg-orange-600';
      case 'medium': return 'bg-yellow-600';
      case 'low': return 'bg-blue-600';
      default: return 'bg-gray-600';
    }
  };

  if (!extractedEvents) {
    return (
      <Card className="border-2 border-purple-300 bg-purple-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-purple-900">
            <Sparkles className="w-4 h-4" />
            Auto-Extract Clinical Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-purple-800 mb-3">
            AI will automatically identify and save significant events from this note (medications, appointments, falls, wounds, etc.)
          </p>
          <Button
            onClick={extractEvents}
            disabled={isExtracting}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 w-full"
          >
            {isExtracting ? (
              <>
                <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                Extracting Events...
              </>
            ) : (
              <>
                <TrendingUp className="w-4 h-4 mr-2" />
                Extract & Save Events
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-green-300 bg-green-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2 text-green-900">
            <CheckCircle2 className="w-4 h-4" />
            {extractedEvents.events_extracted} Events Extracted & Saved
          </CardTitle>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
            className="text-green-700 hover:text-green-900"
          >
            {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      {showDetails && (
        <CardContent className="space-y-2">
          {extractedEvents.events.map((event, idx) => {
            const Icon = getEventIcon(event.event_type);
            return (
              <Alert key={idx} className="bg-white border-l-4 border-purple-400">
                <AlertDescription>
                  <div className="flex items-start gap-2">
                    <Icon className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold text-sm text-gray-900">{event.event_title}</p>
                        <Badge className={`${getSeverityColor(event.severity)} text-white text-xs`}>
                          {event.severity}
                        </Badge>
                        {event.extraction_confidence && (
                          <Badge variant="outline" className="text-xs">
                            {event.extraction_confidence}% confident
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-gray-700 mb-1">{event.event_description}</p>
                      {event.requires_followup && (
                        <p className="text-xs text-orange-700 font-medium">
                          ⚠️ Follow-up: {event.followup_notes}
                        </p>
                      )}
                    </div>
                  </div>
                </AlertDescription>
              </Alert>
            );
          })}
          
          <div className="pt-2 border-t border-green-200">
            <p className="text-xs text-green-800">
              ℹ️ These events are now saved to the patient's timeline and can be used for trend analysis, alerts, and reporting.
            </p>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
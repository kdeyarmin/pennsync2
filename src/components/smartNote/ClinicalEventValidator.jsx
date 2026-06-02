import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  Eye,
  EyeOff,
  Shield,
  RefreshCw
} from "lucide-react";

export default function ClinicalEventValidator({ patientId, onValidationComplete }) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [flaggedEvents, setFlaggedEvents] = useState(null);
  const [expandedEvents, setExpandedEvents] = useState([]);
  const [resolutionNotes, setResolutionNotes] = useState({});
  const [verifyingEvents, setVerifyingEvents] = useState(new Set());

  const analyzeEvents = async () => {
    if (!patientId) return;

    setIsAnalyzing(true);
    try {
      const { data } = await base44.functions.invoke('analyzeClinicalEvents', {
        patient_id: patientId
      });

      setFlaggedEvents(data);
      if (data.flagged_events?.length > 0) {
        setExpandedEvents([data.flagged_events[0].event_id]);
      }
    } catch (error) {
      console.error('Error analyzing events:', error);
      alert('Failed to analyze events. Please try again.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  useEffect(() => {
    if (patientId) {
      analyzeEvents();
    }
  }, [patientId]);

  const handleVerifyEvent = async (eventId, resolution) => {
    setVerifyingEvents(prev => new Set([...prev, eventId]));
    try {
      await base44.entities.ClinicalEvent.update(eventId, {
        verified: true,
        verified_by: (await base44.auth.me()).email,
        review_notes: resolutionNotes[eventId] || resolution
      });

      setFlaggedEvents(prev => ({
        ...prev,
        flagged_events: prev.flagged_events.filter(e => e.event_id !== eventId)
      }));

      if (onValidationComplete) {
        onValidationComplete();
      }
    } catch (error) {
      console.error('Error verifying event:', error);
      alert('Failed to verify event. Please try again.');
    } finally {
      setVerifyingEvents(prev => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    }
  };

  const handleDismissFlag = async (eventId) => {
    setVerifyingEvents(prev => new Set([...prev, eventId]));
    try {
      await base44.entities.ClinicalEvent.update(eventId, {
        verified: true,
        verified_by: (await base44.auth.me()).email,
        review_notes: resolutionNotes[eventId] || 'Reviewed - no action needed'
      });

      setFlaggedEvents(prev => ({
        ...prev,
        flagged_events: prev.flagged_events.filter(e => e.event_id !== eventId)
      }));
    } catch (error) {
      console.error('Error dismissing flag:', error);
    } finally {
      setVerifyingEvents(prev => {
        const next = new Set(prev);
        next.delete(eventId);
        return next;
      });
    }
  };

  const toggleExpanded = (eventId) => {
    setExpandedEvents(prev =>
      prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId]
    );
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-600';
      case 'medium': return 'bg-orange-600';
      case 'low': return 'bg-yellow-600';
      default: return 'bg-gray-600';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'safety_concern': return AlertTriangle;
      case 'missing_info': return MessageSquare;
      case 'inconsistency': return XCircle;
      default: return Shield;
    }
  };

  if (!flaggedEvents) {
    return (
      <Card className="border-2 border-purple-300 bg-purple-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-purple-900">
            <Shield className="w-4 h-4" />
            Event Validation
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button
            onClick={analyzeEvents}
            disabled={isAnalyzing}
            size="sm"
            className="bg-purple-600 hover:bg-purple-700 w-full"
          >
            {isAnalyzing ? (
              <>
                <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                Analyzing Events...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                Validate Clinical Events
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (flaggedEvents.flagged_events?.length === 0) {
    return (
      <Card className="border-2 border-green-300 bg-green-50">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2 text-green-900">
            <CheckCircle2 className="w-4 h-4" />
            All Events Validated
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-green-800 mb-3">
            No issues found with clinical events. All extractions appear accurate and complete.
          </p>
          <Button
            onClick={analyzeEvents}
            variant="outline"
            size="sm"
            className="w-full"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Re-analyze
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-orange-300 bg-orange-50">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2 text-orange-900">
            <AlertTriangle className="w-4 h-4" />
            Events Flagged for Review
          </CardTitle>
          <Badge className="bg-orange-600 text-white">
            {flaggedEvents.flagged_events.length} issues
          </Badge>
        </div>
        {flaggedEvents.overall_summary && (
          <p className="text-xs text-orange-800 mt-2">{flaggedEvents.overall_summary}</p>
        )}
      </CardHeader>
      <CardContent className="space-y-3">
        {flaggedEvents.flagged_events.map((flagged) => {
          const isExpanded = expandedEvents.includes(flagged.event_id);
          const isVerifying = verifyingEvents.has(flagged.event_id);
          const CategoryIcon = getCategoryIcon(flagged.issue_category);

          return (
            <Alert key={flagged.event_id} className="bg-white border-l-4 border-orange-400">
              <AlertDescription>
                <div className="space-y-2">
                  <div
                    className="flex items-start justify-between cursor-pointer"
                    onClick={() => toggleExpanded(flagged.event_id)}
                  >
                    <div className="flex items-start gap-2 flex-1">
                      <CategoryIcon className="w-4 h-4 text-orange-600 mt-0.5 flex-shrink-0" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`${getPriorityColor(flagged.priority)} text-white text-xs`}>
                            {flagged.priority}
                          </Badge>
                          <span className="text-xs font-medium text-gray-500 uppercase">
                            {(flagged.issue_category || '').replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm font-semibold text-gray-900">{flagged.issue_description}</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" className="flex-shrink-0">
                      {isExpanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                  </div>

                  {isExpanded && (
                    <div className="pl-6 space-y-3 mt-3 border-t border-gray-200 pt-3">
                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-1">Suggested Action:</p>
                        <p className="text-xs text-gray-600">{flagged.suggested_action}</p>
                      </div>

                      {flagged.questions_for_clinician?.length > 0 && (
                        <div>
                          <p className="text-xs font-semibold text-gray-700 mb-1">Questions to Consider:</p>
                          <ul className="space-y-1">
                            {flagged.questions_for_clinician.map((question, idx) => (
                              <li key={idx} className="text-xs text-gray-600">• {question}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div>
                        <p className="text-xs font-semibold text-gray-700 mb-1">Resolution Notes (Optional):</p>
                        <Textarea
                          value={resolutionNotes[flagged.event_id] || ''}
                          onChange={(e) => setResolutionNotes(prev => ({
                            ...prev,
                            [flagged.event_id]: e.target.value
                          }))}
                          placeholder="Add notes about how this was resolved..."
                          className="text-xs min-h-[60px]"
                        />
                      </div>

                      <div className="flex gap-2">
                        <Button
                          onClick={() => handleVerifyEvent(flagged.event_id, 'Reviewed and verified')}
                          disabled={isVerifying}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 flex-1"
                        >
                          {isVerifying ? (
                            <Sparkles className="w-3 h-3 mr-1 animate-spin" />
                          ) : (
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                          )}
                          Verify Event
                        </Button>
                        <Button
                          onClick={() => handleDismissFlag(flagged.event_id)}
                          disabled={isVerifying}
                          variant="outline"
                          size="sm"
                          className="flex-1"
                        >
                          <XCircle className="w-3 h-3 mr-1" />
                          Dismiss Flag
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              </AlertDescription>
            </Alert>
          );
        })}
      </CardContent>
    </Card>
  );
}
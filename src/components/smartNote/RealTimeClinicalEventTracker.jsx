import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Activity,
  FileWarning,
  Pill,
  Heart,
  Thermometer,
  Brain,
  RefreshCw
} from "lucide-react";

const EVENT_TYPE_CONFIG = {
  medication_change: { icon: Pill, color: "text-purple-600", bg: "bg-purple-50", label: "Medication Change" },
  medication_started: { icon: Pill, color: "text-blue-600", bg: "bg-blue-50", label: "Med Started" },
  medication_stopped: { icon: Pill, color: "text-red-600", bg: "bg-red-50", label: "Med Stopped" },
  fall: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", label: "Fall Incident" },
  wound_new: { icon: FileWarning, color: "text-orange-600", bg: "bg-orange-50", label: "New Wound" },
  wound_change: { icon: TrendingUp, color: "text-yellow-600", bg: "bg-yellow-50", label: "Wound Status" },
  vital_change: { icon: Heart, color: "text-red-600", bg: "bg-red-50", label: "Vital Sign Change" },
  symptom_new: { icon: AlertTriangle, color: "text-orange-600", bg: "bg-orange-50", label: "New Symptom" },
  symptom_resolved: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-50", label: "Symptom Resolved" },
  cognitive_change: { icon: Brain, color: "text-indigo-600", bg: "bg-indigo-50", label: "Cognitive Change" },
  hospitalization: { icon: Activity, color: "text-red-600", bg: "bg-red-50", label: "Hospitalization" },
  er_visit: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50", label: "ER Visit" },
  infection: { icon: Thermometer, color: "text-red-600", bg: "bg-red-50", label: "Infection" }
};

export default function RealTimeClinicalEventTracker({ 
  noteText, 
  patientId, 
  visitId,
  onEventsDetected,
  autoDetect = true 
}) {
  const queryClient = useQueryClient();
  const [detectedEvents, setDetectedEvents] = useState([]);
  const [confirmedEvents, setConfirmedEvents] = useState([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [lastAnalyzedText, setLastAnalyzedText] = useState("");

  const createEventMutation = useMutation({
    mutationFn: (eventData) => base44.entities.ClinicalEvent.create(eventData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clinicalEvents'] });
      queryClient.invalidateQueries({ queryKey: ['patients'] });
    }
  });

  const analyzeForEvents = async (text) => {
    if (!text || text.length < 50 || !patientId) return;
    
    setAnalyzing(true);
    try {
      const response = await base44.functions.invoke('analyzeClinicalData', {
        action: 'extract_events',
        noteText: text,
        patientId
      });

      const events = response.data?.events || [];
      setDetectedEvents(events);
      
      if (onEventsDetected) {
        onEventsDetected(events);
      }
    } catch (error) {
      console.error('Event detection failed:', error);
    }
    setAnalyzing(false);
  };

  useEffect(() => {
    if (!autoDetect || !noteText) return;
    
    const debounceTimer = setTimeout(() => {
      if (noteText !== lastAnalyzedText && noteText.length >= 100) {
        setLastAnalyzedText(noteText);
        analyzeForEvents(noteText);
      }
    }, 2000);

    return () => clearTimeout(debounceTimer);
  }, [noteText, autoDetect, lastAnalyzedText, patientId]);

  const handleConfirmEvent = async (event) => {
    const eventData = {
      patient_id: patientId,
      visit_id: visitId,
      event_type: event.type,
      event_date: event.date || new Date().toISOString().split('T')[0],
      event_title: event.title,
      event_description: event.description,
      structured_data: event.structured_data || {},
      severity: event.severity || 'medium',
      requires_followup: event.requires_followup || false,
      followup_notes: event.followup_notes,
      source_text: event.source_text,
      extraction_confidence: event.confidence,
      verified: true,
      verified_by: 'current_user'
    };

    const savedEvent = await createEventMutation.mutateAsync(eventData);

    // Auto-create follow-up task
    if (event.requires_followup) {
      const taskPriority = event.severity === 'critical' ? 'high' : 
                         event.severity === 'high' ? 'high' : 'medium';
      
      let taskType = 'followup';
      if (event.type?.includes('medication')) taskType = 'call';
      if (event.type === 'fall') taskType = 'safety';
      if (event.type?.includes('wound')) taskType = 'document';
      
      await base44.entities.Task.create({
        patient_id: patientId,
        title: `Follow-up: ${event.title}`,
        description: event.followup_notes || event.description,
        type: taskType,
        priority: taskPriority,
        status: 'pending',
        due_timeframe: event.severity === 'critical' ? 'today' : '48_hours',
        source: 'ai_generated',
        ai_reason: `Auto-generated from clinical event: ${event.type}`,
        related_visit_id: visitId
      });
    }

    // Create patient alert for high/critical events
    if (event.severity === 'high' || event.severity === 'critical') {
      let alertType = 'urgent_intervention';
      if (event.type?.includes('medication')) alertType = 'medication_risk';
      if (event.type === 'fall') alertType = 'fall_risk';
      if (event.type?.includes('vital')) alertType = 'vital_deterioration';
      if (event.type === 'infection') alertType = 'infection_risk';
      if (event.type === 'cognitive_change') alertType = 'symptom_escalation';
      
      await base44.entities.PatientAlert.create({
        patient_id: patientId,
        alert_type: alertType,
        severity: event.severity,
        title: event.title,
        message: event.description,
        contributing_factors: [event.type, `Detected during documentation`],
        recommended_actions: event.followup_notes ? [event.followup_notes] : [],
        data_sources: {
          clinical_event_id: savedEvent.id,
          visit_id: visitId,
          event_type: event.type,
          structured_data: event.structured_data
        },
        status: 'active',
        flagged_urgent: event.severity === 'critical'
      });
      
      queryClient.invalidateQueries({ queryKey: ['patientAlerts'] });
    }

    queryClient.invalidateQueries({ queryKey: ['tasks'] });
    setConfirmedEvents([...confirmedEvents, event.id || event.title]);
    setDetectedEvents(detectedEvents.filter(e => e !== event));
  };

  const handleDismissEvent = (event) => {
    setDetectedEvents(detectedEvents.filter(e => e !== event));
  };

  const criticalEvents = detectedEvents.filter(e => 
    e.severity === 'critical' || e.severity === 'high' || 
    ['fall', 'hospitalization', 'er_visit', 'infection'].includes(e.type)
  );

  if (!patientId) {
    return null;
  }

  return (
    <div className="space-y-3">
      {analyzing && (
        <Alert className="bg-blue-50 border-blue-200">
          <RefreshCw className="w-4 h-4 text-blue-600 animate-spin" />
          <AlertDescription className="text-blue-900 text-sm">
            AI analyzing note for clinical events...
          </AlertDescription>
        </Alert>
      )}

      {criticalEvents.length > 0 && (
        <Alert className="bg-red-50 border-red-300">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-900 font-medium text-sm">
            {criticalEvents.length} critical event{criticalEvents.length > 1 ? 's' : ''} detected - review below
          </AlertDescription>
        </Alert>
      )}

      {detectedEvents.length > 0 && (
        <Card className="border-2 border-purple-300 bg-gradient-to-br from-purple-50 to-indigo-50">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm sm:text-base flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-purple-600" />
              AI Detected Clinical Events ({detectedEvents.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {detectedEvents.map((event, idx) => {
              const config = EVENT_TYPE_CONFIG[event.type] || EVENT_TYPE_CONFIG.symptom_new;
              const Icon = config.icon;
              
              return (
                <Card key={idx} className={`border-l-4 ${
                  event.severity === 'critical' ? 'border-l-red-500' :
                  event.severity === 'high' ? 'border-l-orange-500' :
                  'border-l-blue-500'
                }`}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-lg ${config.bg} flex-shrink-0`}>
                        <Icon className={`w-5 h-5 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <Badge className="text-xs">{config.label}</Badge>
                          <Badge variant="outline" className={`text-xs ${
                            event.severity === 'critical' ? 'bg-red-50 text-red-700 border-red-300' :
                            event.severity === 'high' ? 'bg-orange-50 text-orange-700 border-orange-300' :
                            'bg-blue-50 text-blue-700 border-blue-300'
                          }`}>
                            {event.severity}
                          </Badge>
                          {event.confidence && (
                            <Badge variant="outline" className="text-xs">
                              {Math.round(event.confidence)}% confidence
                            </Badge>
                          )}
                        </div>
                        <p className="font-semibold text-sm text-gray-900 mb-1">{event.title}</p>
                        <p className="text-xs text-gray-700 mb-2">{event.description}</p>
                        
                        {event.structured_data && Object.keys(event.structured_data).length > 0 && (
                          <div className="bg-white rounded p-2 mb-2 text-xs">
                            {Object.entries(event.structured_data).map(([key, value]) => (
                              <div key={key} className="flex gap-2">
                                <span className="font-medium text-gray-700">{key}:</span>
                                <span className="text-gray-600">{String(value)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {event.source_text && (
                          <p className="text-xs text-gray-500 italic mb-2 bg-gray-50 p-2 rounded">
                            "{event.source_text.substring(0, 100)}..."
                          </p>
                        )}

                        {event.requires_followup && (
                          <div className="bg-yellow-50 border border-yellow-300 rounded p-2 mb-2">
                            <Badge className="bg-yellow-600 text-xs mb-1">Requires Follow-up</Badge>
                            {event.followup_notes && (
                              <p className="text-xs text-yellow-900 mt-1">{event.followup_notes}</p>
                            )}
                            <p className="text-xs text-yellow-700 mt-1">
                              ✓ Task will be auto-created upon confirmation
                            </p>
                          </div>
                        )}

                        {(event.severity === 'high' || event.severity === 'critical') && (
                          <div className="bg-red-50 border border-red-300 rounded p-2 mb-2">
                            <p className="text-xs text-red-900">
                              ⚠ Patient alert will be auto-created for care team review
                            </p>
                          </div>
                        )}

                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            onClick={() => handleConfirmEvent(event)}
                            disabled={createEventMutation.isPending}
                            className="bg-green-600 hover:bg-green-700 h-8 text-xs"
                          >
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Confirm & Save
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDismissEvent(event)}
                            className="h-8 text-xs"
                          >
                            <XCircle className="w-3 h-3 mr-1" />
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </CardContent>
        </Card>
      )}

      {confirmedEvents.length > 0 && (
        <Alert className="bg-green-50 border-green-300">
          <CheckCircle2 className="w-4 h-4 text-green-600" />
          <AlertDescription className="text-green-900 text-sm">
            {confirmedEvents.length} event{confirmedEvents.length > 1 ? 's' : ''} saved to patient chart
          </AlertDescription>
        </Alert>
      )}

      {!autoDetect && noteText && noteText.length >= 50 && (
        <Button
          onClick={() => analyzeForEvents(noteText)}
          variant="outline"
          disabled={analyzing}
          className="w-full"
        >
          {analyzing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4 mr-2" />
              Detect Clinical Events
            </>
          )}
        </Button>
      )}
    </div>
  );
}
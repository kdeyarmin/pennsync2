import { useState, useEffect, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Calendar,
  Activity,
  Target,
  AlertCircle,
  Hospital,
  Pill,
  FileText,
  TrendingUp,
  Filter,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Clock,
  FlaskConical,
  MessageSquare,
  Link as LinkIcon,
  ExternalLink,
  AlertTriangle
} from "lucide-react";
import { format, parseISO } from "date-fns";
import ClinicalEventValidator from "./ClinicalEventValidator";
import LinkedNoteViewer from "./LinkedNoteViewer";
import AICarePlanSuggester from "../carePlan/AICarePlanSuggester";
import PatientEducationPanel from "../education/PatientEducationPanel";
import ClinicalTrendsAnalyzer from "../analytics/ClinicalTrendsAnalyzer";

const EVENT_TYPES = {
  visit: { label: 'Visits', icon: Activity, color: 'blue' },
  care_plan: { label: 'Care Plans', icon: Target, color: 'green' },
  incident: { label: 'Incidents', icon: AlertCircle, color: 'red' },
  hospitalization: { label: 'Hospitalizations', icon: Hospital, color: 'purple' },
  diagnosis: { label: 'Diagnoses', icon: FileText, color: 'indigo' },
  medication: { label: 'Medications', icon: Pill, color: 'orange' },
  lab_result: { label: 'Lab Results', icon: FlaskConical, color: 'teal' },
  symptom: { label: 'Symptoms', icon: MessageSquare, color: 'pink' }
};

export default function PatientTimelineView({ patient }) {
  const [timelineEvents, setTimelineEvents] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [activeFilters, setActiveFilters] = useState(Object.keys(EVENT_TYPES));
  const [aiSummary, setAiSummary] = useState(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [expandedEvents, setExpandedEvents] = useState([]);
  const [periodSummaries, setPeriodSummaries] = useState({});
  const [correlations, setCorrelations] = useState(null);
  const [isAnalyzingCorrelations, setIsAnalyzingCorrelations] = useState(false);
  const [linkedNoteView, setLinkedNoteView] = useState(null);
  const [visits, setVisits] = useState([]);

  useEffect(() => {
    if (patient?.id) {
      loadTimelineData();
    }
  }, [patient?.id]);

  const loadTimelineData = async () => {
    if (!patient?.id) return;

    setIsLoading(true);
    try {
      // Fetch all relevant data
      const [visitsData, carePlans, incidents, clinicalEvents] = await Promise.all([
        base44.entities.Visit.filter({ patient_id: patient.id }, '-visit_date'),
        base44.entities.CarePlan.filter({ patient_id: patient.id }),
        base44.entities.Incident.filter({ patient_id: patient.id }, '-incident_date'),
        base44.entities.ClinicalEvent.filter({ patient_id: patient.id }, '-event_date')
      ]);

      setVisits(visitsData);

      // Compile timeline events
      const events = [];

      // Add visits
      visitsData.forEach(visit => {
        events.push({
          id: `visit-${visit.id}`,
          type: 'visit',
          date: visit.visit_date,
          title: `${visit.visit_type.replace('_', ' ').toUpperCase()}`,
          description: visit.nurse_notes?.substring(0, 200),
          fullData: visit,
          icon: Activity,
          color: 'blue'
        });
      });

      // Add care plans
      carePlans.forEach(cp => {
        events.push({
          id: `careplan-${cp.id}`,
          type: 'care_plan',
          date: cp.created_date,
          title: `Care Plan: ${cp.problem}`,
          description: `Goal: ${cp.goal}`,
          status: cp.status,
          fullData: cp,
          icon: Target,
          color: 'green'
        });
      });

      // Add incidents
      incidents.forEach(incident => {
        events.push({
          id: `incident-${incident.id}`,
          type: 'incident',
          date: incident.incident_date,
          title: `Incident: ${incident.incident_name || incident.incident_type}`,
          description: incident.report?.substring(0, 200),
          severity: incident.severity,
          fullData: incident,
          icon: AlertCircle,
          color: 'red'
        });
      });

      // Add hospitalizations from patient data
      if (patient.past_hospitalizations?.length > 0) {
        patient.past_hospitalizations.forEach((hosp, idx) => {
          events.push({
            id: `hosp-${idx}`,
            type: 'hospitalization',
            date: hosp.date,
            title: `Hospitalization: ${hosp.reason}`,
            description: `${hosp.hospital} (${hosp.length_of_stay} days)`,
            fullData: hosp,
            icon: Hospital,
            color: 'purple'
          });
        });
      }

      // Add diagnosis changes
      if (patient.primary_diagnosis) {
        events.push({
          id: 'dx-primary',
          type: 'diagnosis',
          date: patient.admission_date || patient.created_date,
          title: `Primary Diagnosis`,
          description: patient.primary_diagnosis,
          icon: FileText,
          color: 'indigo'
        });
      }

      // Add medication changes from patient data
      if (patient.current_medications?.length > 0) {
        patient.current_medications.forEach((med, idx) => {
          events.push({
            id: `med-${idx}`,
            type: 'medication',
            date: med.start_date || patient.admission_date || patient.created_date,
            title: `Medication: ${med.name}`,
            description: `${med.dosage} ${med.frequency}`,
            fullData: med,
            icon: Pill,
            color: 'orange'
          });
        });
      }

      // Add extracted clinical events (from AI auto-extraction)
      clinicalEvents.forEach(event => {
        const eventIcon = event.event_type.includes('medication') ? Pill :
                         event.event_type.includes('appointment') ? Calendar :
                         event.event_type.includes('fall') || event.event_type.includes('wound') ? AlertCircle :
                         event.event_type.includes('lab') ? FlaskConical :
                         event.event_type.includes('symptom') ? MessageSquare :
                         Activity;
        
        const eventColor = event.event_type.includes('medication') ? 'orange' :
                          event.event_type.includes('fall') || event.event_type.includes('wound') ? 'red' :
                          event.event_type.includes('lab') ? 'teal' :
                          event.event_type.includes('symptom') ? 'pink' :
                          'blue';

        events.push({
          id: `clinical-${event.id}`,
          type: event.event_type,
          date: event.event_date,
          title: event.event_title,
          description: event.event_description,
          severity: event.severity,
          fullData: event,
          linkedRecordId: event.visit_id,
          linkedRecordType: 'visit',
          extractedEvent: true,
          verified: event.verified,
          hasTextAnchor: event.text_anchor_start !== null && event.text_anchor_end !== null,
          hasSourceLink: event.visit_id && (event.text_anchor_start !== null || event.source_text),
          icon: eventIcon,
          color: eventColor
        });
      });

      // Sort by date (most recent first)
      events.sort((a, b) => new Date(b.date) - new Date(a.date));

      setTimelineEvents(events);
    } catch (error) {
      console.error('Error loading timeline data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredEvents = useMemo(() => {
    return timelineEvents.filter(event => activeFilters.includes(event.type));
  }, [timelineEvents, activeFilters]);

  const toggleFilter = (type) => {
    setActiveFilters(prev => 
      prev.includes(type) 
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const generateAISummary = async () => {
    if (!patient || timelineEvents.length === 0) return;

    setIsGeneratingSummary(true);
    try {
      const eventsContext = timelineEvents.slice(0, 20).map(e => 
        `${e.date}: ${e.title} - ${e.description || ''}`
      ).join('\n');

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this patient's timeline and provide a comprehensive clinical summary:

Patient: ${patient.first_name} ${patient.last_name}
Timeline Events:
${eventsContext}

Provide:
1. Overall clinical trajectory
2. Key milestones and turning points
3. Patterns or trends
4. Current status assessment
5. Notable concerns or successes`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_trajectory: { type: "string" },
            key_milestones: { type: "array", items: { type: "string" } },
            patterns: { type: "array", items: { type: "string" } },
            current_status: { type: "string" },
            concerns: { type: "array", items: { type: "string" } },
            positive_developments: { type: "array", items: { type: "string" } }
          }
        }
      });

      setAiSummary(result);
    } catch (error) {
      console.error('Error generating summary:', error);
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const generatePeriodSummary = async (startDate, endDate) => {
    const periodKey = `${startDate}-${endDate}`;
    if (periodSummaries[periodKey]) return;

    const periodEvents = filteredEvents.filter(e => {
      const eventDate = new Date(e.date);
      return eventDate >= new Date(startDate) && eventDate <= new Date(endDate);
    });

    if (periodEvents.length === 0) return;

    try {
      const eventsContext = periodEvents.map(e => 
        `${e.date}: ${e.title} - ${e.description || ''}`
      ).join('\n');

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Summarize this period in the patient's care journey (${format(new Date(startDate), 'MMM d')} - ${format(new Date(endDate), 'MMM d, yyyy')}):

${eventsContext}

Provide a concise 2-3 sentence summary highlighting the most significant events and outcomes.`,
        response_json_schema: {
          type: "object",
          properties: {
            summary: { type: "string" }
          }
        }
      });

      setPeriodSummaries(prev => ({
        ...prev,
        [periodKey]: result.summary
      }));
    } catch (error) {
      console.error('Error generating period summary:', error);
    }
  };

  const toggleEventExpand = (eventId) => {
    setExpandedEvents(prev =>
      prev.includes(eventId) ? prev.filter(id => id !== eventId) : [...prev, eventId]
    );
  };

  const analyzeCorrelations = async () => {
    if (!patient || timelineEvents.length < 5) return;

    setIsAnalyzingCorrelations(true);
    try {
      const eventsContext = timelineEvents.map(e => ({
        date: e.date,
        type: e.type,
        title: e.title,
        description: e.description?.substring(0, 150)
      }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Analyze this patient timeline for correlations and causal relationships:

Patient: ${patient.first_name} ${patient.last_name}
Events: ${JSON.stringify(eventsContext, null, 2)}

Identify:
1. Potential causal links (e.g., medication change → symptom improvement)
2. Patterns preceding incidents or hospitalizations
3. Early warning signs that appeared before deterioration
4. Treatment effectiveness indicators
5. Risk factors or triggers

Be specific and reference actual events by date and type.`,
        response_json_schema: {
          type: "object",
          properties: {
            causal_links: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  cause_event: { type: "string" },
                  effect_event: { type: "string" },
                  confidence: { type: "string" },
                  explanation: { type: "string" }
                }
              }
            },
            warning_signs: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  event: { type: "string" },
                  preceded: { type: "string" },
                  timeframe: { type: "string" },
                  recommendation: { type: "string" }
                }
              }
            },
            patterns: {
              type: "array",
              items: { type: "string" }
            },
            risk_triggers: {
              type: "array",
              items: { type: "string" }
            }
          }
        }
      });

      setCorrelations(result);
    } catch (error) {
      console.error('Error analyzing correlations:', error);
    } finally {
      setIsAnalyzingCorrelations(false);
    }
  };

  const groupEventsByMonth = () => {
    const groups = {};
    filteredEvents.forEach(event => {
      const monthKey = format(new Date(event.date), 'yyyy-MM');
      if (!groups[monthKey]) {
        groups[monthKey] = [];
      }
      groups[monthKey].push(event);
    });
    return groups;
  };

  const eventGroups = useMemo(() => groupEventsByMonth(), [filteredEvents]);

  if (!patient) {
    return (
      <Alert>
        <AlertCircle className="w-4 h-4" />
        <AlertDescription>Select a patient to view their timeline</AlertDescription>
      </Alert>
    );
  }

  return (
    <>
      {linkedNoteView && (
        <LinkedNoteViewer
          event={linkedNoteView.event}
          visit={linkedNoteView.visit}
          onClose={() => setLinkedNoteView(null)}
        />
      )}

    <div className="space-y-4">
      {/* Clinical Trends Analyzer */}
      <ClinicalTrendsAnalyzer patientId={patient?.id} />

      {/* Patient Education Materials */}
      <PatientEducationPanel patientId={patient?.id} />

      {/* AI Care Plan Suggester */}
      <AICarePlanSuggester 
        patientId={patient?.id}
        onCarePlanCreated={() => {
          loadTimelineData();
        }}
      />

      {/* Clinical Event Validator */}
      <ClinicalEventValidator 
        patientId={patient?.id}
        onValidationComplete={() => {
          loadTimelineData();
        }}
      />

      {/* Header with AI Summary */}
      <Card className="border-2 border-indigo-300 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg font-bold flex items-center gap-2 text-indigo-900">
              <Clock className="w-5 h-5 text-indigo-700" />
              Patient Timeline
            </CardTitle>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={analyzeCorrelations}
                disabled={isAnalyzingCorrelations || timelineEvents.length < 5}
                className="bg-white border-2 border-indigo-400 text-indigo-700 hover:bg-indigo-50 font-semibold min-h-[36px]"
              >
                {isAnalyzingCorrelations ? (
                  <>
                    <TrendingUp className="w-4 h-4 mr-2 animate-pulse" />
                    Finding Patterns...
                  </>
                ) : (
                  <>
                    <TrendingUp className="w-4 h-4 mr-2" />
                    Correlations
                  </>
                )}
              </Button>
              <Button
                variant="default"
                size="sm"
                onClick={generateAISummary}
                disabled={isGeneratingSummary || timelineEvents.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold min-h-[36px]"
              >
                {isGeneratingSummary ? (
                  <>
                    <Sparkles className="w-4 h-4 mr-2 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    AI Summary
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        {aiSummary && (
          <CardContent className="pt-0 space-y-3">
            <div className="bg-white border-l-4 border-indigo-500 p-3 rounded">
              <h4 className="font-bold text-indigo-900 mb-1">Clinical Trajectory</h4>
              <p className="text-sm text-slate-700">{aiSummary.overall_trajectory}</p>
            </div>

            {aiSummary.key_milestones?.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-indigo-600" />
                  Key Milestones
                </h4>
                <div className="space-y-1">
                  {aiSummary.key_milestones.map((milestone, idx) => (
                    <div key={idx} className="text-sm bg-indigo-50 p-2 rounded border border-indigo-200 text-indigo-900">
                      • {milestone}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {aiSummary.concerns?.length > 0 && (
                <Alert className="bg-red-50 border-red-300">
                  <AlertDescription>
                    <strong className="text-red-950">Concerns:</strong>
                    <ul className="mt-1 space-y-1">
                      {aiSummary.concerns.map((concern, idx) => (
                        <li key={idx} className="text-sm text-red-900">• {concern}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}

              {aiSummary.positive_developments?.length > 0 && (
                <Alert className="bg-green-50 border-green-300">
                  <AlertDescription>
                    <strong className="text-green-950">Positive Progress:</strong>
                    <ul className="mt-1 space-y-1">
                      {aiSummary.positive_developments.map((dev, idx) => (
                        <li key={idx} className="text-sm text-green-900">• {dev}</li>
                      ))}
                    </ul>
                  </AlertDescription>
                </Alert>
              )}
            </div>
          </CardContent>
        )}

        {correlations && (
          <CardContent className="pt-0 space-y-3 border-t-2 border-indigo-200 mt-3">
            <h3 className="font-bold text-lg text-indigo-900 flex items-center gap-2">
              <LinkIcon className="w-5 h-5" />
              AI Correlation Analysis
            </h3>

            {correlations.causal_links?.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Potential Causal Links</h4>
                <div className="space-y-2">
                  {correlations.causal_links.map((link, idx) => (
                    <Alert key={idx} className="bg-blue-50 border-blue-300">
                      <AlertDescription>
                        <div className="flex items-start gap-2">
                          <Badge className="bg-blue-600 text-white text-xs">{link.confidence}</Badge>
                          <div className="flex-1">
                            <p className="text-sm font-medium text-blue-950">
                              {link.cause_event} → {link.effect_event}
                            </p>
                            <p className="text-xs text-blue-800 mt-1">{link.explanation}</p>
                          </div>
                        </div>
                      </AlertDescription>
                    </Alert>
                  ))}
                </div>
              </div>
            )}

            {correlations.warning_signs?.length > 0 && (
              <Alert className="bg-yellow-50 border-yellow-400">
                <AlertTriangle className="w-4 h-4 text-yellow-600" />
                <AlertDescription>
                  <strong className="text-yellow-950">Early Warning Signs Identified:</strong>
                  <div className="mt-2 space-y-2">
                    {correlations.warning_signs.map((warning, idx) => (
                      <div key={idx} className="bg-white p-2 rounded border border-yellow-300">
                        <p className="text-sm font-medium text-yellow-950">{warning.event} preceded {warning.preceded}</p>
                        <p className="text-xs text-yellow-800">Timeframe: {warning.timeframe}</p>
                        <p className="text-xs text-yellow-900 mt-1">💡 {warning.recommendation}</p>
                      </div>
                    ))}
                  </div>
                </AlertDescription>
              </Alert>
            )}

            {correlations.patterns?.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Patterns Detected</h4>
                <div className="space-y-1">
                  {correlations.patterns.map((pattern, idx) => (
                    <div key={idx} className="text-sm bg-purple-50 p-2 rounded border border-purple-200 text-purple-900">
                      📊 {pattern}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {correlations.risk_triggers?.length > 0 && (
              <div>
                <h4 className="font-semibold text-slate-900 mb-2">Risk Triggers</h4>
                <div className="space-y-1">
                  {correlations.risk_triggers.map((trigger, idx) => (
                    <div key={idx} className="text-sm bg-red-50 p-2 rounded border border-red-200 text-red-900">
                      ⚠️ {trigger}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        )}
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Filter className="w-4 h-4" />
            Filter Events
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {(() => {
              const btnColors = {
                blue: 'bg-blue-600 hover:bg-blue-700', green: 'bg-green-600 hover:bg-green-700',
                red: 'bg-red-600 hover:bg-red-700', purple: 'bg-purple-600 hover:bg-purple-700',
                indigo: 'bg-indigo-600 hover:bg-indigo-700', orange: 'bg-orange-600 hover:bg-orange-700',
                teal: 'bg-teal-600 hover:bg-teal-700', pink: 'bg-pink-600 hover:bg-pink-700',
              };
              return Object.entries(EVENT_TYPES).map(([type, config]) => {
              const Icon = config.icon;
              const isActive = activeFilters.includes(type);
              const count = timelineEvents.filter(e => e.type === type).length;

              return (
                <Button
                  key={type}
                  variant={isActive ? "default" : "outline"}
                  size="sm"
                  onClick={() => toggleFilter(type)}
                  className={`min-h-[36px] font-semibold ${isActive ? btnColors[config.color] || '' : ''}`}
                >
                  <Icon className="w-4 h-4 mr-2" />
                  {config.label} ({count})
                </Button>
              );
            });
            })()}
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      {isLoading ? (
        <Card>
          <CardContent className="p-8 text-center">
            <Sparkles className="w-6 h-6 animate-spin mx-auto text-indigo-600 mb-2" />
            <p className="text-slate-600">Loading timeline...</p>
          </CardContent>
        </Card>
      ) : filteredEvents.length === 0 ? (
        <Alert>
          <AlertCircle className="w-4 h-4" />
          <AlertDescription>
            No events found. Try adjusting your filters.
          </AlertDescription>
        </Alert>
      ) : (
        <div className="space-y-6">
          {Object.entries(eventGroups).map(([monthKey, events]) => {
            const monthDate = parseISO(`${monthKey}-01`);
            const monthLabel = format(monthDate, 'MMMM yyyy');
            const periodKey = `${monthKey}-01-${monthKey}-31`;

            return (
              <Card key={monthKey} className="border-l-4 border-indigo-400">
                <CardHeader className="bg-indigo-50 pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-bold text-indigo-900">
                      <Calendar className="w-4 h-4 inline mr-2" />
                      {monthLabel}
                    </CardTitle>
                    <Badge className="bg-indigo-600 text-white">{events.length} events</Badge>
                  </div>
                  {periodSummaries[periodKey] && (
                    <div className="mt-2 bg-white border border-indigo-200 rounded p-2 text-sm text-slate-700">
                      <strong className="text-indigo-900">Period Summary:</strong> {periodSummaries[periodKey]}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    {events.map(event => {
                      const Icon = event.icon;
                      const isExpanded = expandedEvents.includes(event.id);
                      const eventConfig = EVENT_TYPES[event.type];

                      return (
                        <div
                          key={event.id}
                          className={`border-l-4 rounded-r p-3 hover:shadow-md transition-shadow cursor-pointer ${
                            {blue: 'border-blue-400 bg-blue-50', green: 'border-green-400 bg-green-50', red: 'border-red-400 bg-red-50', purple: 'border-purple-400 bg-purple-50', indigo: 'border-indigo-400 bg-indigo-50', orange: 'border-orange-400 bg-orange-50', teal: 'border-teal-400 bg-teal-50', pink: 'border-pink-400 bg-pink-50'}[eventConfig.color] || 'border-slate-400 bg-slate-50'
                          }`}
                          onClick={() => toggleEventExpand(event.id)}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1 min-w-0">
                              <div className={`p-2 rounded-full flex-shrink-0 ${
                                {blue: 'bg-blue-100', green: 'bg-green-100', red: 'bg-red-100', purple: 'bg-purple-100', indigo: 'bg-indigo-100', orange: 'bg-orange-100', teal: 'bg-teal-100', pink: 'bg-pink-100'}[eventConfig.color] || 'bg-slate-100'
                              }`}>
                                <Icon className={`w-4 h-4 ${
                                  {blue: 'text-blue-700', green: 'text-green-700', red: 'text-red-700', purple: 'text-purple-700', indigo: 'text-indigo-700', orange: 'text-orange-700', teal: 'text-teal-700', pink: 'text-pink-700'}[eventConfig.color] || 'text-slate-700'
                                }`} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                  <h4 className="font-semibold text-slate-900">{event.title}</h4>
                                  {event.status && (
                                    <Badge className={`text-xs ${
                                      event.status === 'active' ? 'bg-green-600' :
                                      event.status === 'met' ? 'bg-blue-600' :
                                      'bg-slate-500'
                                    } text-white`}>
                                      {event.status}
                                    </Badge>
                                  )}
                                  {event.severity && (
                                    <Badge className={`text-xs ${
                                      event.severity === 'high' ? 'bg-red-600' :
                                      event.severity === 'medium' ? 'bg-yellow-600' :
                                      'bg-blue-600'
                                    } text-white`}>
                                      {event.severity}
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-xs text-slate-600 mb-1">
                                  {format(new Date(event.date), 'MMM d, yyyy')}
                                </p>
                                {event.description && (
                                  <p className="text-sm text-slate-700">
                                    {isExpanded ? event.description : `${event.description.substring(0, 100)}...`}
                                  </p>
                                )}
                                {event.hasSourceLink && (
                                  <div className="mt-2">
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        const sourceVisit = visits.find(v => v.id === event.linkedRecordId);
                                        if (sourceVisit) {
                                          setLinkedNoteView({ event: event.fullData, visit: sourceVisit });
                                        }
                                      }}
                                      className="text-xs text-indigo-600 hover:text-indigo-800 font-medium h-auto p-1 -ml-1"
                                    >
                                      <ExternalLink className="w-3 h-3 mr-1" />
                                      View source in note {event.hasTextAnchor && '(jump to section)'}
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                            <Button variant="ghost" size="sm" className="flex-shrink-0">
                              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                            </Button>
                          </div>

                          {isExpanded && event.fullData && (
                           <div className="mt-3 pt-3 border-t border-slate-200 text-sm space-y-2">
                             {event.type === 'visit' && event.fullData.vital_signs && (
                               <div className="bg-white p-2 rounded">
                                 <strong className="text-slate-900">Vitals:</strong>
                                 <div className="flex flex-wrap gap-3 mt-1 text-xs">
                                   {event.fullData.vital_signs.blood_pressure_systolic && (
                                     <span>BP: {event.fullData.vital_signs.blood_pressure_systolic}/{event.fullData.vital_signs.blood_pressure_diastolic}</span>
                                   )}
                                   {event.fullData.vital_signs.heart_rate && (
                                     <span>HR: {event.fullData.vital_signs.heart_rate}</span>
                                   )}
                                   {event.fullData.vital_signs.temperature && (
                                     <span>Temp: {event.fullData.vital_signs.temperature}°F</span>
                                   )}
                                   {event.fullData.vital_signs.oxygen_saturation && (
                                     <span>O2: {event.fullData.vital_signs.oxygen_saturation}%</span>
                                   )}
                                 </div>
                               </div>
                             )}
                             {event.type === 'care_plan' && event.fullData.interventions && (
                               <div className="bg-white p-2 rounded">
                                 <strong className="text-slate-900">Interventions:</strong>
                                 <ul className="mt-1 space-y-1">
                                   {event.fullData.interventions.map((intervention, idx) => (
                                     <li key={idx} className="text-xs">• {intervention}</li>
                                   ))}
                                 </ul>
                               </div>
                             )}
                             {event.type === 'medication' && (
                               <div className="bg-white p-2 rounded">
                                 <div className="text-xs space-y-1">
                                   {event.fullData.prescriber && <p><strong>Prescriber:</strong> {event.fullData.prescriber}</p>}
                                   {event.fullData.start_date && <p><strong>Started:</strong> {format(new Date(event.fullData.start_date), 'MMM d, yyyy')}</p>}
                                 </div>
                               </div>
                             )}
                             {event.type === 'incident' && event.fullData.resolution_notes && (
                               <div className="bg-white p-2 rounded">
                                 <strong className="text-slate-900">Resolution:</strong>
                                 <p className="text-xs mt-1 text-slate-700">{event.fullData.resolution_notes}</p>
                               </div>
                             )}
                             {event.fullData.nurse_notes && (
                               <div className="bg-white p-2 rounded">
                                 <strong className="text-slate-900">Full Note:</strong>
                                 <p className="text-xs mt-1 text-slate-700">{event.fullData.nurse_notes}</p>
                               </div>
                             )}
                           </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Summary Stats */}
      <Card className="bg-gradient-to-r from-slate-50 to-slate-100">
        <CardContent className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{timelineEvents.filter(e => e.type === 'visit').length}</p>
              <p className="text-xs text-slate-600">Visits</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{timelineEvents.filter(e => e.type === 'care_plan').length}</p>
              <p className="text-xs text-slate-600">Care Plans</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-red-600">{timelineEvents.filter(e => e.type === 'incident').length}</p>
              <p className="text-xs text-slate-600">Incidents</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">{timelineEvents.filter(e => e.type === 'hospitalization').length}</p>
              <p className="text-xs text-slate-600">Hospitalizations</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-teal-600">{timelineEvents.filter(e => e.type === 'lab_result').length}</p>
              <p className="text-xs text-slate-600">Lab Results</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-pink-600">{timelineEvents.filter(e => e.type === 'symptom').length}</p>
              <p className="text-xs text-slate-600">Symptoms</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
    </>
  );
}
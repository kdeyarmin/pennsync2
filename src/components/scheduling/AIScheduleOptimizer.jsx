import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";


import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Calendar,
  Clock,
  MapPin,
  Route,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  ThumbsUp,
  ThumbsDown,
  RefreshCw,
  Navigation,
  Zap,
  MessageSquare
} from "lucide-react";
import { format, parseISO } from "date-fns";

export default function AIScheduleOptimizer({ nurseEmail, selectedDate }) {
  const [optimizedSchedule, setOptimizedSchedule] = useState(null);
  const [isOptimizing, setIsOptimizing] = useState(false);
  const [conflicts, setConflicts] = useState([]);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackVisit, setFeedbackVisit] = useState(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackRating, setFeedbackRating] = useState(null);
  const [appliedSchedule, setAppliedSchedule] = useState(false);
  const [submittingFeedback, setSubmittingFeedback] = useState(false);

  const dateToUse = selectedDate || format(new Date(), 'yyyy-MM-dd');

  // Fetch scheduled visits for the date
  const { data: visits = [], refetch: refetchVisits } = useQuery({
    queryKey: ['scheduledVisits', dateToUse],
    queryFn: () => base44.entities.Visit.filter({ visit_date: dateToUse }),
  });

  // Fetch all patients for location/acuity data
  const { data: patients = [] } = useQuery({
    queryKey: ['allPatients'],
    queryFn: () => base44.entities.Patient.list(),
  });

  // Fetch historical visit data for duration estimates
  const { data: historicalVisits = [] } = useQuery({
    queryKey: ['historicalVisits'],
    queryFn: () => base44.entities.Visit.filter({ status: 'completed' }, '-visit_date', 100),
  });

  // Fetch previous schedule feedback
  const { data: scheduleFeedback = [] } = useQuery({
    queryKey: ['scheduleFeedback'],
    queryFn: () => base44.entities.ScheduleFeedback?.filter({}, '-created_date', 50).catch(() => []),
  });

  const getPatient = (patientId) => patients.find(p => p.id === patientId);

  const optimizeSchedule = async () => {
    if (visits.length === 0) {
      alert("No visits scheduled for this date.");
      return;
    }

    setIsOptimizing(true);
    setConflicts([]);

    try {
      // Build context with patient data and historical patterns
      const visitsWithPatients = visits.map(v => {
        const patient = getPatient(v.patient_id);
        return {
          ...v,
          patient_name: patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown',
          patient_address: patient?.address || 'Unknown location',
          patient_diagnosis: patient?.primary_diagnosis,
          patient_care_type: patient?.care_type,
          patient_acuity: patient ? determineAcuity(patient, v) : 5
        };
      });

      // Calculate average visit durations by type
      const durationsByType = {};
      historicalVisits.forEach(hv => {
        if (hv.start_time && hv.end_time) {
          const duration = calculateDuration(hv.start_time, hv.end_time);
          if (!durationsByType[hv.visit_type]) {
            durationsByType[hv.visit_type] = [];
          }
          durationsByType[hv.visit_type].push(duration);
        }
      });

      const avgDurations = {};
      Object.keys(durationsByType).forEach(type => {
        const durations = durationsByType[type];
        avgDurations[type] = Math.round(durations.reduce((a, b) => a + b, 0) / durations.length);
      });

      // Get feedback patterns for learning
      const feedbackPatterns = scheduleFeedback.slice(0, 20).map(f => ({
        issue: f.feedback_type,
        context: f.feedback_text
      }));

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an AI scheduling optimizer for home health nurses. Analyze these visits and create an optimized daily schedule.

SCHEDULED VISITS FOR ${dateToUse}:
${JSON.stringify(visitsWithPatients, null, 2)}

AVERAGE VISIT DURATIONS BY TYPE (in minutes):
${JSON.stringify(avgDurations, null, 2)}

PREVIOUS FEEDBACK PATTERNS (learn from these):
${JSON.stringify(feedbackPatterns, null, 2)}

OPTIMIZATION CRITERIA:
1. ROUTE EFFICIENCY: Minimize travel time between visits by grouping geographically close patients
2. ACUITY PRIORITY: High-acuity patients should be seen earlier in the day when nurse is fresh
3. VISIT TYPE TIMING: Admissions need more time, schedule with buffer
4. PATIENT PREFERENCES: Consider typical appointment windows (morning vs afternoon)
5. REALISTIC SCHEDULING: Include travel time (estimate 15-30 min between visits based on area)
6. BUFFER TIME: Include 15-min buffer for documentation between visits
7. LEARN FROM FEEDBACK: Apply lessons from previous scheduling issues

Create an optimized schedule with:
- Suggested order of visits
- Recommended start times
- Estimated duration for each
- Travel time estimates
- Any conflicts or concerns flagged

Return JSON:
{
  "optimized_visits": [
    {
      "visit_id": "id",
      "patient_name": "Name",
      "address": "Address",
      "suggested_time": "HH:MM",
      "estimated_duration_minutes": 45,
      "travel_time_to_next_minutes": 20,
      "priority_score": 1-10,
      "optimization_reason": "Why this order/time",
      "visit_type": "type"
    }
  ],
  "route_summary": {
    "total_visits": 5,
    "total_drive_time_minutes": 90,
    "total_patient_time_minutes": 240,
    "estimated_end_time": "HH:MM",
    "efficiency_score": 85
  },
  "conflicts": [
    {
      "type": "overload" | "travel_impossible" | "time_conflict" | "acuity_concern",
      "description": "Description of conflict",
      "affected_visits": ["visit_id"],
      "suggested_resolution": "How to fix"
    }
  ],
  "recommendations": [
    "General recommendation for the day"
  ]
}`,
        response_json_schema: {
          type: "object",
          properties: {
            optimized_visits: { type: "array", items: { type: "object" } },
            route_summary: { type: "object" },
            conflicts: { type: "array", items: { type: "object" } },
            recommendations: { type: "array", items: { type: "string" } }
          }
        }
      });

      setOptimizedSchedule(result);
      setConflicts(result.conflicts || []);
    } catch (error) {
      console.error("Error optimizing schedule:", error);
      alert("Error optimizing schedule. Please try again.");
    }
    setIsOptimizing(false);
  };

  const determineAcuity = (patient, visit) => {
    // Simple acuity scoring based on available data
    let score = 5; // baseline
    if (patient?.care_type === 'hospice') score += 2;
    if (visit?.visit_type === 'admission') score += 2;
    if (visit?.visit_type === 'prn') score += 1;
    if (patient?.primary_diagnosis?.toLowerCase().includes('chf')) score += 1;
    if (patient?.primary_diagnosis?.toLowerCase().includes('copd')) score += 1;
    return Math.min(score, 10);
  };

  const calculateDuration = (start, end) => {
    const startParts = start.split(':').map(Number);
    const endParts = end.split(':').map(Number);
    const startMinutes = startParts[0] * 60 + startParts[1];
    const endMinutes = endParts[0] * 60 + endParts[1];
    return endMinutes - startMinutes;
  };

  const applyOptimizedSchedule = async () => {
    if (!optimizedSchedule?.optimized_visits) return;

    try {
      for (const optVisit of optimizedSchedule.optimized_visits) {
        await base44.entities.Visit.update(optVisit.visit_id, {
          visit_time: optVisit.suggested_time
        });
      }
      setAppliedSchedule(true);
      refetchVisits();
      alert("Schedule updated successfully!");
    } catch (error) {
      console.error("Error applying schedule:", error);
      alert("Error applying schedule. Please try again.");
    }
  };

  const openFeedbackDialog = (visit) => {
    setFeedbackVisit(visit);
    setFeedbackText("");
    setFeedbackRating(null);
    setShowFeedbackDialog(true);
  };

  const submitFeedback = async () => {
    if (!feedbackRating) {
      alert("Please select a rating.");
      return;
    }

    setSubmittingFeedback(true);
    try {
      await base44.entities.ScheduleFeedback.create({
        visit_id: feedbackVisit?.visit_id,
        nurse_email: nurseEmail,
        schedule_date: dateToUse,
        feedback_type: feedbackRating,
        feedback_text: feedbackText,
        suggested_time: feedbackVisit?.suggested_time,
        actual_preference: feedbackText
      });

      setShowFeedbackDialog(false);
      alert("Feedback submitted! This will help improve future scheduling.");
    } catch {
      // If entity doesn't exist, just close dialog
      setShowFeedbackDialog(false);
      console.log("Feedback noted (entity may not exist yet)");
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const getConflictIcon = (type) => {
    switch (type) {
      case 'overload': return <AlertTriangle className="w-4 h-4 text-red-600" />;
      case 'travel_impossible': return <Navigation className="w-4 h-4 text-orange-600" />;
      case 'time_conflict': return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'acuity_concern': return <Zap className="w-4 h-4 text-purple-600" />;
      default: return <AlertTriangle className="w-4 h-4 text-slate-600" />;
    }
  };

  return (
    <div className="space-y-4">
      <Card className="border-indigo-200">
        <CardHeader className="bg-gradient-to-r from-indigo-50 to-purple-50">
          <CardTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Route className="w-5 h-5 text-indigo-600" />
              AI Schedule Optimizer
            </div>
            <Badge variant="outline" className="bg-white">
              <Calendar className="w-3 h-3 mr-1" />
              {format(parseISO(dateToUse), 'MMM d, yyyy')}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {!optimizedSchedule ? (
            <div className="text-center py-6">
              <Route className="w-12 h-12 text-indigo-300 mx-auto mb-3" />
              <p className="text-slate-600 mb-4">
                {visits.length} visit(s) scheduled for this day
              </p>
              <Button
                onClick={optimizeSchedule}
                disabled={isOptimizing || visits.length === 0}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isOptimizing ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Optimizing Route...</>
                ) : (
                  <><Zap className="w-4 h-4 mr-2" /> Optimize Schedule & Route</>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Route Summary */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-indigo-50 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-indigo-700">
                    {optimizedSchedule.route_summary?.total_visits || 0}
                  </p>
                  <p className="text-xs text-indigo-600">Total Visits</p>
                </div>
                <div className="bg-blue-50 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-blue-700">
                    {optimizedSchedule.route_summary?.total_drive_time_minutes || 0}m
                  </p>
                  <p className="text-xs text-blue-600">Drive Time</p>
                </div>
                <div className="bg-green-50 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-green-700">
                    {optimizedSchedule.route_summary?.estimated_end_time || '--:--'}
                  </p>
                  <p className="text-xs text-green-600">Est. End Time</p>
                </div>
                <div className="bg-purple-50 p-3 rounded-lg text-center">
                  <p className="text-2xl font-bold text-purple-700">
                    {optimizedSchedule.route_summary?.efficiency_score || 0}%
                  </p>
                  <p className="text-xs text-purple-600">Efficiency</p>
                </div>
              </div>

              {/* Conflicts */}
              {conflicts.length > 0 && (
                <div className="space-y-2">
                  <p className="text-sm font-semibold text-red-700 flex items-center gap-1">
                    <AlertTriangle className="w-4 h-4" /> Conflicts Detected
                  </p>
                  {conflicts.map((conflict, idx) => (
                    <Alert key={idx} className="bg-red-50 border-red-200">
                      <div className="flex items-start gap-2">
                        {getConflictIcon(conflict.type)}
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-800">{conflict.description}</p>
                          <p className="text-xs text-red-600 mt-1">
                            💡 {conflict.suggested_resolution}
                          </p>
                        </div>
                      </div>
                    </Alert>
                  ))}
                </div>
              )}

              {/* Optimized Visit Order */}
              <div>
                <p className="text-sm font-semibold text-slate-700 mb-2">Optimized Route</p>
                <div className="space-y-2">
                  {optimizedSchedule.optimized_visits?.map((visit, idx) => (
                    <div
                      key={visit.visit_id}
                      className="flex items-center gap-3 p-3 bg-white border rounded-lg hover:shadow-md transition-shadow"
                    >
                      <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-slate-900 truncate">{visit.patient_name}</p>
                          <Badge variant="outline" className="text-xs">
                            {visit.visit_type?.replace(/_/g, ' ')}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3" /> {visit.suggested_time}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> {visit.address?.substring(0, 30)}...
                          </span>
                        </div>
                        <p className="text-xs text-indigo-600 mt-1">{visit.optimization_reason}</p>
                      </div>
                      <div className="text-right text-xs text-slate-500">
                        <p>{visit.estimated_duration_minutes}min visit</p>
                        {visit.travel_time_to_next_minutes > 0 && (
                          <p className="flex items-center gap-1 text-blue-600">
                            <Navigation className="w-3 h-3" /> +{visit.travel_time_to_next_minutes}min
                          </p>
                        )}
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openFeedbackDialog(visit)}
                        className="text-slate-400 hover:text-indigo-600"
                      >
                        <MessageSquare className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Recommendations */}
              {optimizedSchedule.recommendations?.length > 0 && (
                <div className="bg-blue-50 p-3 rounded-lg">
                  <p className="text-sm font-semibold text-blue-800 mb-2">💡 Recommendations</p>
                  <ul className="text-xs text-blue-700 space-y-1">
                    {optimizedSchedule.recommendations.map((rec, idx) => (
                      <li key={idx}>• {rec}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-3 border-t">
                <Button
                  onClick={applyOptimizedSchedule}
                  disabled={appliedSchedule}
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  {appliedSchedule ? (
                    <><CheckCircle2 className="w-4 h-4 mr-2" /> Schedule Applied</>
                  ) : (
                    <><CheckCircle2 className="w-4 h-4 mr-2" /> Apply This Schedule</>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setOptimizedSchedule(null);
                    setAppliedSchedule(false);
                  }}
                >
                  <RefreshCw className="w-4 h-4 mr-2" /> Re-optimize
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Feedback Dialog */}
      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="w-5 h-5 text-indigo-600" />
              Schedule Feedback
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">How was this scheduling suggestion?</p>
              <div className="flex gap-2">
                <Button
                  variant={feedbackRating === 'good' ? 'default' : 'outline'}
                  className={feedbackRating === 'good' ? 'bg-green-600' : ''}
                  onClick={() => setFeedbackRating('good')}
                >
                  <ThumbsUp className="w-4 h-4 mr-2" /> Good
                </Button>
                <Button
                  variant={feedbackRating === 'timing_issue' ? 'default' : 'outline'}
                  className={feedbackRating === 'timing_issue' ? 'bg-yellow-600' : ''}
                  onClick={() => setFeedbackRating('timing_issue')}
                >
                  <Clock className="w-4 h-4 mr-2" /> Timing Issue
                </Button>
                <Button
                  variant={feedbackRating === 'route_issue' ? 'default' : 'outline'}
                  className={feedbackRating === 'route_issue' ? 'bg-orange-600' : ''}
                  onClick={() => setFeedbackRating('route_issue')}
                >
                  <Route className="w-4 h-4 mr-2" /> Route Issue
                </Button>
                <Button
                  variant={feedbackRating === 'bad' ? 'default' : 'outline'}
                  className={feedbackRating === 'bad' ? 'bg-red-600' : ''}
                  onClick={() => setFeedbackRating('bad')}
                >
                  <ThumbsDown className="w-4 h-4 mr-2" /> Bad
                </Button>
              </div>
            </div>

            <div>
              <p className="text-sm font-medium mb-2">Additional feedback (optional)</p>
              <Textarea
                placeholder="What would make this schedule better? e.g., 'This patient prefers morning visits' or 'Too much driving between visits 2 and 3'"
                value={feedbackText}
                onChange={(e) => setFeedbackText(e.target.value)}
                rows={3}
              />
            </div>

            <p className="text-xs text-slate-500">
              Your feedback helps the AI learn your preferences and improve future scheduling suggestions.
            </p>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFeedbackDialog(false)}>
              Cancel
            </Button>
            <Button onClick={submitFeedback} disabled={submittingFeedback} className="bg-indigo-600 hover:bg-indigo-700">
              {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  AlertTriangle,
  AlertCircle,
  Activity,
  Heart,
  Thermometer,
  Wind,
  TrendingUp,
  TrendingDown,
  Bell,
  X,
  Phone,
  FileText,
  CheckCircle2,
  Stethoscope
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function RealTimeClinicalAlertMonitor({
  patientData,
  vitalSigns,
  noteContent,
  diagnosis,
  onAlertAction,
  onDismissAlert,
  recentVisits = []
}) {
  const [activeAlerts, setActiveAlerts] = useState([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [dismissedAlerts, setDismissedAlerts] = useState(new Set());
  const lastAnalysisRef = useRef({ vitals: null, noteLength: 0 });
  const analysisTimeoutRef = useRef(null);

  // Analyze vitals and note content for clinical alerts
  const analyzeForAlerts = async () => {
    if (!patientData || isAnalyzing) return;

    // Check if there's new data to analyze
    const currentVitalsString = JSON.stringify(vitalSigns);
    const currentNoteLength = noteContent?.length || 0;
    
    if (
      lastAnalysisRef.current.vitals === currentVitalsString &&
      lastAnalysisRef.current.noteLength === currentNoteLength
    ) {
      return; // No new data
    }

    setIsAnalyzing(true);

    try {
      // Get baseline vitals from patient record
      const baselineVitals = patientData.baseline_vitals || {};
      const recentVitals = recentVisits[0]?.vital_signs || {};

      // Build analysis context
      const analysisContext = {
        patient: {
          age: patientData.date_of_birth ? 
            Math.floor((new Date() - new Date(patientData.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000)) : null,
          primary_diagnosis: patientData.primary_diagnosis || diagnosis,
          secondary_diagnoses: patientData.secondary_diagnoses || [],
          current_medications: patientData.current_medications || [],
          allergies: patientData.allergies,
          past_medical_history: patientData.past_medical_history || [],
          baseline_vitals: baselineVitals,
          recent_vitals: recentVitals
        },
        current_vitals: vitalSigns,
        note_excerpt: noteContent?.substring(0, 500) || '',
        visit_context: diagnosis
      };

      const response = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a clinical alert system analyzing real-time patient data. Identify IMMEDIATE clinical concerns that require urgent attention.

PATIENT CONTEXT:
- Age: ${analysisContext.patient.age || 'Unknown'}
- Primary Diagnosis: ${analysisContext.patient.primary_diagnosis || 'Not specified'}
- Secondary Diagnoses: ${analysisContext.patient.secondary_diagnoses.join(', ') || 'None'}
- Current Medications: ${analysisContext.patient.current_medications.map(m => m.name).join(', ') || 'Not documented'}
- Allergies: ${analysisContext.patient.allergies || 'None documented'}

BASELINE VITALS (Patient's Normal):
- BP: ${baselineVitals.blood_pressure_systolic}/${baselineVitals.blood_pressure_diastolic} mmHg
- HR: ${baselineVitals.heart_rate} bpm
- Temp: ${baselineVitals.temperature}°F
- O2 Sat: ${baselineVitals.oxygen_saturation}%

CURRENT VITALS:
- BP: ${vitalSigns.bp || 'Not recorded'}
- HR: ${vitalSigns.hr || 'Not recorded'} bpm
- Temp: ${vitalSigns.temp || 'Not recorded'}°F
- O2 Sat: ${vitalSigns.o2 || 'Not recorded'}% ${vitalSigns.o2Source === 'on_oxygen' ? `on ${vitalSigns.o2Flow || ''}L O2` : 'on room air'}
- RR: ${vitalSigns.rr || 'Not recorded'}
- Pain: ${vitalSigns.pain || 'Not recorded'}/10

CLINICAL NOTE EXCERPT:
${analysisContext.note_excerpt}

CRITICAL ANALYSIS INSTRUCTIONS:
1. Compare current vitals to baseline and identify SIGNIFICANT deviations
2. Assess for condition-specific warning signs (CHF, COPD, diabetes, etc.)
3. Identify documented symptoms in notes that require immediate attention
4. Consider medication-related concerns
5. Flag any life-threatening or urgent situations

SEVERITY LEVELS:
- CRITICAL: Immediate life-threatening (call 911/MD stat)
- HIGH: Urgent attention needed within hours
- MEDIUM: Monitor closely, may need MD notification

Return JSON array of alerts (maximum 3 most critical):
[
  {
    "severity": "CRITICAL|HIGH|MEDIUM",
    "title": "Brief alert title",
    "description": "Specific clinical finding and why it's concerning",
    "vital_sign_involved": "bp|hr|temp|o2|rr|pain|multiple|none",
    "recommended_actions": ["Action 1", "Action 2"],
    "rationale": "Clinical reasoning for this alert",
    "time_sensitivity": "Minutes|Hours|24 hours"
  }
]

ONLY return alerts for GENUINE clinical concerns. Empty array [] if no significant issues.`,
        response_json_schema: {
          type: "object",
          properties: {
            alerts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  severity: { type: "string" },
                  title: { type: "string" },
                  description: { type: "string" },
                  vital_sign_involved: { type: "string" },
                  recommended_actions: { type: "array", items: { type: "string" } },
                  rationale: { type: "string" },
                  time_sensitivity: { type: "string" }
                }
              }
            }
          }
        }
      });

      const newAlerts = (response.alerts || []).map((alert, idx) => ({
        ...alert,
        id: `${Date.now()}-${idx}`,
        timestamp: new Date().toISOString()
      }));

      // Filter out dismissed alerts
      const filteredAlerts = newAlerts.filter(
        alert => !dismissedAlerts.has(`${alert.title}-${alert.severity}`)
      );

      setActiveAlerts(filteredAlerts);
      lastAnalysisRef.current = {
        vitals: currentVitalsString,
        noteLength: currentNoteLength
      };

    } catch (error) {
      console.error('Error analyzing for alerts:', error);
    }

    setIsAnalyzing(false);
  };

  // Debounce analysis - run 2 seconds after changes stop
  useEffect(() => {
    if (analysisTimeoutRef.current) {
      clearTimeout(analysisTimeoutRef.current);
    }

    // Only analyze if we have meaningful data
    const hasVitals = vitalSigns?.bp || vitalSigns?.hr || vitalSigns?.temp || vitalSigns?.o2;
    const hasNote = noteContent && noteContent.length > 50;

    if (hasVitals || hasNote) {
      analysisTimeoutRef.current = setTimeout(() => {
        analyzeForAlerts();
      }, 2000);
    }

    return () => {
      if (analysisTimeoutRef.current) {
        clearTimeout(analysisTimeoutRef.current);
      }
    };
  }, [vitalSigns, noteContent, patientData]);

  const handleDismissAlert = (alert) => {
    setDismissedAlerts(prev => new Set([...prev, `${alert.title}-${alert.severity}`]));
    setActiveAlerts(prev => prev.filter(a => a.id !== alert.id));
    onDismissAlert?.(alert);
  };

  const handleAlertAction = (alert, action) => {
    onAlertAction?.(alert, action);
  };

  const getSeverityConfig = (severity) => {
    const configs = {
      CRITICAL: {
        bg: 'bg-red-100',
        border: 'border-red-500',
        text: 'text-red-900',
        icon: AlertTriangle,
        iconColor: 'text-red-600',
        badge: 'bg-red-600 text-white',
        pulse: true
      },
      HIGH: {
        bg: 'bg-orange-100',
        border: 'border-orange-500',
        text: 'text-orange-900',
        icon: AlertCircle,
        iconColor: 'text-orange-600',
        badge: 'bg-orange-600 text-white',
        pulse: false
      },
      MEDIUM: {
        bg: 'bg-yellow-100',
        border: 'border-yellow-500',
        text: 'text-yellow-900',
        icon: AlertCircle,
        iconColor: 'text-yellow-600',
        badge: 'bg-yellow-600 text-white',
        pulse: false
      }
    };
    return configs[severity] || configs.MEDIUM;
  };

  const getVitalIcon = (vitalSign) => {
    const icons = {
      bp: Activity,
      hr: Heart,
      temp: Thermometer,
      o2: Wind,
      rr: Activity,
      pain: AlertCircle,
      multiple: Stethoscope
    };
    return icons[vitalSign] || Activity;
  };

  if (activeAlerts.length === 0 && !isAnalyzing) {
    return null;
  }

  return (
    <div className="space-y-3">
      <AnimatePresence>
        {activeAlerts.map((alert) => {
          const config = getSeverityConfig(alert.severity);
          const Icon = config.icon;
          const VitalIcon = getVitalIcon(alert.vital_sign_involved);

          return (
            <motion.div
              key={alert.id}
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, x: 100, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <Card className={`border-4 ${config.border} ${config.bg} ${config.pulse ? 'animate-pulse' : ''}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <div className={`${config.pulse ? 'animate-bounce' : ''}`}>
                        <Icon className={`w-6 h-6 ${config.iconColor}`} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <Badge className={`${config.badge} text-xs font-bold`}>
                            {alert.severity}
                          </Badge>
                          {alert.time_sensitivity && (
                            <Badge variant="outline" className="text-xs">
                              <Bell className="w-3 h-3 mr-1" />
                              {alert.time_sensitivity}
                            </Badge>
                          )}
                          {alert.vital_sign_involved !== 'none' && (
                            <Badge variant="outline" className="text-xs flex items-center gap-1">
                              <VitalIcon className="w-3 h-3" />
                              {alert.vital_sign_involved === 'multiple' ? 'Multiple vitals' : alert.vital_sign_involved.toUpperCase()}
                            </Badge>
                          )}
                        </div>
                        <h3 className={`text-lg font-bold ${config.text}`}>
                          {alert.title}
                        </h3>
                        <p className={`text-sm ${config.text} mt-1`}>
                          {alert.description}
                        </p>
                        {alert.rationale && (
                          <p className={`text-xs ${config.text} mt-2 opacity-75 italic`}>
                            Clinical reasoning: {alert.rationale}
                          </p>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDismissAlert(alert)}
                      className="flex-shrink-0"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-3">
                    {alert.recommended_actions && alert.recommended_actions.length > 0 && (
                      <div>
                        <p className={`text-sm font-semibold ${config.text} mb-2`}>
                          Recommended Actions:
                        </p>
                        <div className="space-y-2">
                          {alert.recommended_actions.map((action, idx) => (
                            <div key={idx} className="flex items-start gap-2">
                              <CheckCircle2 className={`w-4 h-4 mt-0.5 flex-shrink-0 ${config.iconColor}`} />
                              <span className={`text-sm ${config.text}`}>{action}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2">
                      {alert.severity === 'CRITICAL' && (
                        <Button
                          size="sm"
                          className="bg-red-700 hover:bg-red-800 text-white"
                          onClick={() => handleAlertAction(alert, 'call_911')}
                        >
                          <Phone className="w-4 h-4 mr-2" />
                          Call 911
                        </Button>
                      )}
                      {(alert.severity === 'CRITICAL' || alert.severity === 'HIGH') && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-2"
                          onClick={() => handleAlertAction(alert, 'notify_md')}
                        >
                          <Phone className="w-4 h-4 mr-2" />
                          Notify MD
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-2"
                        onClick={() => handleAlertAction(alert, 'add_to_note')}
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        Add to Note
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-2"
                        onClick={() => handleAlertAction(alert, 'create_task')}
                      >
                        <CheckCircle2 className="w-4 h-4 mr-2" />
                        Create Task
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          );
        })}
      </AnimatePresence>

      {isAnalyzing && activeAlerts.length === 0 && (
        <Alert className="border-blue-200 bg-blue-50">
          <Activity className="w-4 h-4 text-blue-600 animate-spin" />
          <AlertDescription className="text-blue-900 text-sm">
            Analyzing clinical data for alerts...
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}

import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { invokeLLM } from "@/lib/invokeLLM";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  AlertTriangle,
  Bell,
  Activity,
  Heart,
  Wind,
  Droplet,
  CheckCircle2,
  Clock,
  Target,
  AlertOctagon,
  BellRing,
  X,
  Calendar, // Added Calendar icon
  Ambulance, // Added Ambulance icon
  Info // Added Info icon
} from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

export default function EarlyWarningSystem({ patient, _currentVisit, allVisits }) {
  const [alerts, setAlerts] = useState([]);
  const [_isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState(null);
  const [dismissedAlerts, setDismissedAlerts] = useState([]);

  // Fetch all incidents for trend analysis
  const { data: incidents = [] } = useQuery({
    queryKey: ['patientIncidents', patient?.id],
    queryFn: () => base44.entities.Incident.filter({ patient_id: patient.id }),
    enabled: !!patient?.id,
    initialData: [],
  });

  useEffect(() => {
    if (patient && allVisits && allVisits.length > 0) {
      analyzePatientData();
    }
  }, [patient, allVisits, incidents]);

  const analyzePatientData = async () => {
    setIsAnalyzing(true);
    
    try {
      const recentVisits = allVisits.slice(0, 10);
      const detectedAlerts = [];

      // === VITAL SIGNS TREND ANALYSIS ===
      const vitalsAlerts = analyzeVitalsTrends(recentVisits);
      detectedAlerts.push(...vitalsAlerts);

      // === VISIT PATTERN ANALYSIS ===
      const visitAlerts = analyzeVisitPatterns(recentVisits);
      detectedAlerts.push(...visitAlerts);

      // === INCIDENT PATTERN ANALYSIS ===
      const incidentAlerts = analyzeIncidents(incidents);
      detectedAlerts.push(...incidentAlerts);

      // === DIAGNOSIS-SPECIFIC WARNINGS ===
      const diagnosisAlerts = analyzeDiagnosisSpecific(patient, recentVisits);
      detectedAlerts.push(...diagnosisAlerts);

      // === AI-POWERED COMPREHENSIVE ANALYSIS ===
      if (recentVisits.length >= 3) {
        const aiAlerts = await performAIAnalysis(patient, recentVisits, incidents);
        detectedAlerts.push(...aiAlerts);
      }

      // Filter out dismissed alerts and sort by severity
      const activeAlerts = detectedAlerts
        .filter(alert => !dismissedAlerts.includes(alert.id))
        .sort((a, b) => {
          const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
          return severityOrder[a.severity] - severityOrder[b.severity];
        });

      setAlerts(activeAlerts);

    } catch (error) {
      console.error("Error analyzing patient data:", error);
    }
    
    setIsAnalyzing(false);
  };

  // Analyze vital signs trends
  const analyzeVitalsTrends = (visits) => {
    const alerts = [];
    const visitsWithVitals = visits.filter(v => v.vital_signs && Object.keys(v.vital_signs).length > 0);
    
    if (visitsWithVitals.length < 2) return alerts;

    // Blood Pressure Trends
    const bpReadings = visitsWithVitals
      .filter(v => v.vital_signs.blood_pressure_systolic)
      .map(v => ({
        date: v.visit_date,
        systolic: v.vital_signs.blood_pressure_systolic,
        diastolic: v.vital_signs.blood_pressure_diastolic
      }));

    if (bpReadings.length >= 3) {
      const recent = bpReadings.slice(0, 3);
      const avgRecent = recent.reduce((sum, r) => sum + r.systolic, 0) / recent.length;
      const trend = recent[0].systolic - recent[recent.length - 1].systolic;

      // Hypertensive Crisis Warning
      if (recent[0].systolic >= 180 || recent[0].diastolic >= 120) {
        alerts.push({
          id: 'bp-crisis',
          severity: 'critical',
          type: 'vital_signs',
          icon: Heart,
          title: 'HYPERTENSIVE CRISIS DETECTED',
          summary: `Current BP: ${recent[0].systolic}/${recent[0].diastolic} - Immediate intervention required`,
          details: `Blood pressure readings indicate hypertensive crisis. This is a medical emergency requiring immediate physician notification and potential emergency department evaluation.`,
          trend: 'worsening',
          recommendations: [
            'IMMEDIATE: Notify physician - consider 911 if symptomatic',
            'Assess for symptoms: headache, chest pain, shortness of breath, vision changes',
            'Review medication compliance',
            'Check for drug interactions or missed doses',
            'Document all findings and physician notification'
          ],
          riskFactors: [
            'Hypertensive crisis can lead to stroke, heart attack, or organ damage',
            'May indicate medication non-compliance or new medical issue'
          ],
          timeline: 'IMMEDIATE ACTION REQUIRED'
        });
      }
      // Progressive Hypertension
      else if (trend > 20 && avgRecent > 140) {
        alerts.push({
          id: 'bp-rising',
          severity: 'high',
          type: 'vital_signs',
          icon: Heart,
          title: 'Progressive Hypertension Detected',
          summary: `BP increased ${Math.round(trend)} points over last ${recent.length} visits`,
          details: `Blood pressure trending upward from ${recent[recent.length-1].systolic}/${recent[recent.length-1].diastolic} to ${recent[0].systolic}/${recent[0].diastolic}. Average recent BP: ${Math.round(avgRecent)}/${Math.round(recent.reduce((sum, r) => sum + r.diastolic, 0) / recent.length)} mmHg`,
          trend: 'worsening',
          recommendations: [
            'Notify physician within 24 hours',
            'Assess medication compliance and barriers',
            'Review diet (sodium intake)',
            'Check for new medications or supplements',
            'Consider home BP monitoring diary',
            'Educate on hypertension risks and lifestyle modifications'
          ],
          riskFactors: [
            'Increased stroke risk',
            'Heart disease progression',
            'Kidney damage',
            'Potential medication adjustment needed'
          ],
          timeline: 'Physician notification within 24 hours'
        });
      }

      // Hypotension Warning
      if (recent[0].systolic < 90) {
        alerts.push({
          id: 'bp-low',
          severity: 'high',
          type: 'vital_signs',
          icon: Heart,
          title: 'Hypotension Detected',
          summary: `Low blood pressure: ${recent[0].systolic}/${recent[0].diastolic} mmHg`,
          details: `Blood pressure below normal range. May indicate dehydration, medication effects, or underlying condition.`,
          trend: 'worsening',
          recommendations: [
            'Assess for orthostatic hypotension',
            'Check hydration status',
            'Review medications (especially diuretics, antihypertensives)',
            'Assess for symptoms: dizziness, lightheadedness, falls',
            'Notify physician if symptomatic or persistent',
            'Fall risk precautions'
          ],
          riskFactors: [
            'Increased fall risk',
            'Syncope (fainting)',
            'Inadequate organ perfusion',
            'May indicate overmedication'
          ],
          timeline: 'Assess and monitor - notify MD if symptomatic'
        });
      }
    }

    // Oxygen Saturation Trends
    const o2Readings = visitsWithVitals
      .filter(v => v.vital_signs.oxygen_saturation)
      .map(v => ({ date: v.visit_date, o2: v.vital_signs.oxygen_saturation }));

    if (o2Readings.length >= 2) {
      const recent = o2Readings.slice(0, 3);
      const current = recent[0].o2;
      const trend = current - (recent[recent.length - 1]?.o2 || current);

      if (current < 90) {
        alerts.push({
          id: 'o2-critical',
          severity: 'critical',
          type: 'vital_signs',
          icon: Wind,
          title: 'CRITICAL HYPOXIA DETECTED',
          summary: `Oxygen saturation ${current}% - Below 90%`,
          details: `Severe hypoxia detected. Patient requires immediate respiratory assessment and physician notification.`,
          trend: 'critical',
          recommendations: [
            'IMMEDIATE: Assess respiratory status',
            'IMMEDIATE: Notify physician - consider 911',
            'Assess for dyspnea, cyanosis, altered mental status',
            'Check oxygen therapy equipment if applicable',
            'Obtain lung sounds assessment',
            'Consider emergency department evaluation'
          ],
          riskFactors: [
            'Respiratory failure',
            'Cardiac complications',
            'End-organ damage',
            'Potential hospitalization'
          ],
          timeline: 'IMMEDIATE ACTION REQUIRED'
        });
      } else if (current < 92 || trend < -3) {
        alerts.push({
          id: 'o2-declining',
          severity: 'high',
          type: 'vital_signs',
          icon: Wind,
          title: 'Declining Oxygen Saturation',
          summary: `O2 sat ${current}% - ${trend < 0 ? `Declined ${Math.abs(trend)}%` : 'Below target'}`,
          details: `Oxygen saturation declining or below target range. Respiratory status should be assessed.`,
          trend: 'worsening',
          recommendations: [
            'Comprehensive respiratory assessment',
            'Notify physician within 4 hours',
            'Assess for increased work of breathing',
            'Check lung sounds for changes',
            'Review respiratory medications and compliance',
            'Consider need for oxygen therapy or adjustment',
            'Assess for signs of infection'
          ],
          riskFactors: [
            'Progressive respiratory decline',
            'Potential COPD exacerbation or CHF',
            'Increased hospitalization risk',
            'May indicate pneumonia or other infection'
          ],
          timeline: 'Physician notification within 4 hours'
        });
      }
    }

    // Weight Trends (Critical for CHF)
    if (patient.primary_diagnosis?.toLowerCase().includes('chf') || 
        patient.primary_diagnosis?.toLowerCase().includes('heart failure')) {
      
      const weightReadings = visitsWithVitals
        .filter(v => v.vital_signs.weight)
        .map(v => ({ date: v.visit_date, weight: v.vital_signs.weight }));

      if (weightReadings.length >= 2) {
        const current = weightReadings[0].weight;
        const previous = weightReadings[1].weight;
        const change = current - previous;
        const daysBetween = differenceInDays(parseISO(weightReadings[0].date), parseISO(weightReadings[1].date));

        if (change > 3 && daysBetween <= 7) {
          alerts.push({
            id: 'weight-gain',
            severity: 'critical',
            type: 'vital_signs',
            icon: Droplet,
            title: 'RAPID WEIGHT GAIN - CHF EXACERBATION',
            summary: `Gained ${change.toFixed(1)} lbs in ${daysBetween} days`,
            details: `Rapid weight gain in CHF patient suggests fluid retention and potential heart failure exacerbation. This is a critical warning sign.`,
            trend: 'critical',
            recommendations: [
              'URGENT: Notify cardiologist/physician immediately',
              'Assess for edema (grade and location)',
              'Assess lung sounds for crackles/rales',
              'Check for dyspnea, orthopnea, PND',
              'Review diuretic compliance',
              'Assess dietary sodium intake',
              'Consider same-day or next-day physician visit',
              'May require diuretic adjustment or IV diuresis'
            ],
            riskFactors: [
              'CHF exacerbation',
              'High hospitalization risk',
              'Pulmonary edema',
              'Respiratory distress'
            ],
            timeline: 'IMMEDIATE physician notification - potential ED visit'
          });
        }
      }
    }

    // Heart Rate Trends
    const hrReadings = visitsWithVitals
      .filter(v => v.vital_signs.heart_rate)
      .map(v => ({ date: v.visit_date, hr: v.vital_signs.heart_rate }));

    if (hrReadings.length > 0) {
      const current = hrReadings[0].hr;

      if (current > 120 || current < 50) {
        const severity = current > 140 || current < 40 ? 'critical' : 'high';
        const type = current > 120 ? 'Tachycardia' : 'Bradycardia';
        
        alerts.push({
          id: 'hr-abnormal',
          severity: severity,
          type: 'vital_signs',
          icon: Heart,
          title: `${severity === 'critical' ? 'SEVERE ' : ''}${type.toUpperCase()} DETECTED`,
          summary: `Heart rate: ${current} bpm`,
          details: `Heart rate outside normal range. ${current > 120 ? 'Tachycardia may indicate infection, dehydration, pain, or cardiac issue.' : 'Bradycardia may indicate medication effect or cardiac conduction issue.'}`,
          trend: 'abnormal',
          recommendations: [
            severity === 'critical' ? 'IMMEDIATE physician notification' : 'Notify physician within 4 hours',
            'Assess for symptoms: chest pain, palpitations, dizziness, syncope',
            'Check blood pressure',
            'Review cardiac medications',
            current > 120 ? 'Assess for infection, dehydration, pain' : 'Assess for overmedication (beta blockers, calcium channel blockers)',
            'Consider 12-lead EKG if available',
            severity === 'critical' ? 'Consider emergency department evaluation' : 'Close monitoring'
          ],
          riskFactors: [
            'Cardiac arrhythmia',
            current > 120 ? 'Underlying infection or acute illness' : 'Medication toxicity',
            'Syncope risk',
            'Cardiovascular instability'
          ],
          timeline: severity === 'critical' ? 'IMMEDIATE' : 'Within 4 hours'
        });
      }
    }

    // Pain Trend Analysis
    const painReadings = visitsWithVitals
      .filter(v => v.vital_signs.pain_level !== undefined)
      .map(v => ({ date: v.visit_date, pain: v.vital_signs.pain_level }));

    if (painReadings.length >= 2) {
      const avgPain = painReadings.slice(0, 3).reduce((sum, r) => sum + r.pain, 0) / Math.min(painReadings.length, 3);
      
      if (avgPain >= 7) {
        alerts.push({
          id: 'pain-severe',
          severity: 'high',
          type: 'vital_signs',
          icon: AlertTriangle,
          title: 'Severe Persistent Pain',
          summary: `Average pain level: ${avgPain.toFixed(1)}/10 over recent visits`,
          details: `Patient reporting severe pain consistently. Pain management plan should be reassessed.`,
          trend: 'persistent',
          recommendations: [
            'Comprehensive pain assessment (PQRST)',
            'Notify physician for pain management review',
            'Assess current medication effectiveness',
            'Consider need for pain specialist referral',
            'Evaluate non-pharmacological interventions',
            'Assess impact on ADLs and quality of life',
            'Screen for breakthrough pain'
          ],
          riskFactors: [
            'Reduced quality of life',
            'Depression risk',
            'Functional decline',
            'Inadequate pain control'
          ],
          timeline: 'Physician notification within 24-48 hours'
        });
      }
    }

    return alerts;
  };

  // Analyze visit patterns
  const analyzeVisitPatterns = (visits) => {
    const alerts = [];

    if (visits.length < 2) return alerts;

    // Check for missed visits or gaps
    const completedVisits = visits.filter(v => v.status === 'completed');
    if (completedVisits.length >= 2) {
      const daysSinceLastVisit = differenceInDays(
        new Date(),
        parseISO(completedVisits[0].visit_date)
      );

      if (daysSinceLastVisit > 10 && patient.status === 'active') {
        alerts.push({
          id: 'visit-gap',
          severity: 'medium',
          type: 'care_continuity',
          icon: Calendar,
          title: 'Extended Gap in Care',
          summary: `${daysSinceLastVisit} days since last completed visit`,
          details: `Extended period without skilled nursing visit may impact patient outcomes and care continuity.`,
          trend: 'concerning',
          recommendations: [
            'Schedule visit as soon as possible',
            'Assess for any acute changes or concerns',
            'Review care plan frequency',
            'Check for barriers to visit completion',
            'Verify patient is still homebound',
            'Assess ongoing need for skilled services'
          ],
          riskFactors: [
            'Care plan goals may not be met',
            'Potential for undetected deterioration',
            'Medicare compliance concerns',
            'Patient safety risk'
          ],
          timeline: 'Schedule visit within 2-3 days'
        });
      }
    }

    // Check for pattern of cancelled visits
    const recentCancellations = visits.slice(0, 5).filter(v => v.status === 'cancelled');
    if (recentCancellations.length >= 2) {
      alerts.push({
        id: 'cancellation-pattern',
        severity: 'medium',
        type: 'care_continuity',
        icon: AlertTriangle,
        title: 'Pattern of Visit Cancellations',
        summary: `${recentCancellations.length} cancelled visits in recent history`,
        details: `Multiple visit cancellations may indicate barriers to care, patient non-compliance, or changing care needs.`,
        trend: 'concerning',
        recommendations: [
          'Contact patient/caregiver to identify barriers',
          'Assess patient willingness to continue services',
          'Evaluate if patient still meets homebound criteria',
          'Consider care plan adjustment',
          'Social work referral if appropriate',
          'Document barriers and interventions'
        ],
        riskFactors: [
          'Potential discharge consideration',
            'Unmet care needs',
            'Safety concerns',
            'Possible service denial'
          ],
          timeline: 'Address within 1 week'
        });
      }

      return alerts;
    };

    // Analyze incident patterns
    const analyzeIncidents = (incidents) => {
      const alerts = [];

      if (incidents.length === 0) return alerts;

      const recentIncidents = incidents.slice(0, 10);
      const last30Days = incidents.filter(i => 
        differenceInDays(new Date(), parseISO(i.incident_date)) <= 30
      );

      // Multiple falls
      const falls = recentIncidents.filter(i => i.incident_type === 'fall');
      if (falls.length >= 2) {
        alerts.push({
          id: 'falls-pattern',
          severity: 'high',
          type: 'safety',
          icon: AlertOctagon,
          title: 'RECURRENT FALL PATTERN',
          summary: `${falls.length} falls documented in recent history`,
          details: `Multiple falls indicate high fall risk and need for comprehensive fall prevention intervention.`,
          trend: 'critical',
          recommendations: [
            'URGENT: Comprehensive fall risk assessment',
            'Home safety evaluation',
            'PT evaluation for gait, balance, strength',
            'Review medications causing dizziness/sedation',
            'Assess for orthostatic hypotension',
            'Consider need for assistive device or adjustment',
            'Educate on fall prevention strategies',
            'Consider bed/chair alarm if appropriate',
            'Notify physician for medication review'
          ],
          riskFactors: [
            'Serious injury (fractures, head trauma)',
            'Hospitalization',
            'Fear of falling leading to reduced mobility',
            'Loss of independence',
            'Increased care needs'
          ],
          timeline: 'Immediate fall prevention interventions'
        });
      }

      // Multiple hospitalizations
      const hospitalizations = last30Days.filter(i => i.incident_type === 'hospitalized');
      if (hospitalizations.length >= 2) {
        alerts.push({
          id: 'readmission-risk',
          severity: 'high',
          type: 'care_continuity',
          icon: Ambulance,
          title: 'High Readmission Risk',
          summary: `${hospitalizations.length} hospitalizations in last 30 days`,
          details: `Frequent hospitalizations indicate unstable condition and high readmission risk. Intensive care coordination needed.`,
          trend: 'critical',
          recommendations: [
            'Intensify monitoring (increase visit frequency)',
            'Comprehensive medication reconciliation',
            'Review hospital discharge instructions and compliance',
            'Identify root causes of hospitalizations',
            'Consider transitional care management',
            'Enhanced caregiver education and support',
            'Coordinate with physicians and specialists',
            'Social work involvement for care coordination'
          ],
          riskFactors: [
            'Continued hospital readmissions',
            'Potential Medicare penalty for agency',
            'Disease progression',
            'Care plan not adequately addressing needs'
          ],
          timeline: 'Immediate care plan review and adjustment'
        });
      }

      return alerts;
    };

    // Diagnosis-specific analysis
    const analyzeDiagnosisSpecific = (patient, visits) => {
      const alerts = [];
      const diagnosis = patient.primary_diagnosis?.toLowerCase() || '';

      // CHF-specific monitoring
      if (diagnosis.includes('chf') || diagnosis.includes('heart failure')) {
        const hasRecentEdemaDocs = visits.slice(0, 3).some(v => 
          v.nurse_notes?.toLowerCase().includes('edema')
        );
        
        if (!hasRecentEdemaDocs) {
          alerts.push({
            id: 'chf-edema-missing',
            severity: 'medium',
            type: 'documentation',
            icon: Droplet,
            title: 'CHF: Edema Assessment Missing',
            summary: 'Edema assessment not documented in recent visits',
            details: 'For CHF patients, edema assessment is critical for monitoring fluid status and treatment effectiveness.',
            trend: 'documentation_gap',
            recommendations: [
              'Document bilateral lower extremity assessment',
              'Grade edema if present (1+ to 4+)',
              'Document location and characteristics',
              'Compare to previous visits',
              'Document daily weights if applicable'
            ],
            riskFactors: [
              'Missed CHF exacerbation',
              'Delayed intervention',
              'OASIS scoring accuracy'
            ],
            timeline: 'Document at next visit'
          });
        }
      }

      // COPD-specific monitoring
      if (diagnosis.includes('copd') || diagnosis.includes('emphysema')) {
        const hasRecentLungSounds = visits.slice(0, 2).some(v =>
          v.nurse_notes?.toLowerCase().includes('lung') || 
          v.nurse_notes?.toLowerCase().includes('breath sounds')
        );

        if (!hasRecentLungSounds) {
          alerts.push({
            id: 'copd-resp-missing',
            severity: 'medium',
            type: 'documentation',
            icon: Wind,
            title: 'COPD: Respiratory Assessment Incomplete',
            summary: 'Detailed lung assessment not found in recent visits',
            details: 'COPD patients require comprehensive respiratory assessment to detect exacerbations early.',
            trend: 'documentation_gap',
            recommendations: [
              'Document lung sounds in detail',
              'Assess for dyspnea and work of breathing',
              'Check oxygen saturation',
              'Assess for signs of respiratory infection',
              'Document oxygen therapy compliance'
            ],
            riskFactors: [
              'Missed COPD exacerbation',
              'Delayed antibiotic therapy',
              'Potential hospitalization'
            ],
            timeline: 'Document at next visit'
          });
        }
      }

      // Diabetes-specific monitoring
      if (diagnosis.includes('diabetes')) {
        const hasRecentBloodSugar = visits.slice(0, 3).some(v =>
          v.nurse_notes?.toLowerCase().includes('blood sugar') ||
          v.nurse_notes?.toLowerCase().includes('glucose') ||
          v.nurse_notes?.toLowerCase().includes('blood glucose')
        );

        if (!hasRecentBloodSugar) {
          alerts.push({
            id: 'diabetes-glucose-missing',
            severity: 'medium',
            type: 'documentation',
            icon: Activity,
            title: 'Diabetes: Blood Glucose Monitoring Gap',
            summary: 'Blood glucose not documented in recent visits',
            details: 'Regular blood glucose monitoring and documentation is essential for diabetes management.',
            trend: 'documentation_gap',
            recommendations: [
              'Obtain blood glucose reading',
              'Assess for hypo/hyperglycemia symptoms',
              'Review patient home monitoring compliance',
              'Document medication compliance',
              'Provide diabetes self-management education'
            ],
            riskFactors: [
              'Undetected hypo/hyperglycemia',
              'Poor diabetes control',
              'Complications risk'
            ],
            timeline: 'Document at next visit'
          });
        }
      }

      return alerts;
    };

    // AI-powered comprehensive analysis
    const performAIAnalysis = async (patient, visits, incidents) => {
      try {
        const prompt = `You are an expert clinical AI specializing in early detection of patient deterioration in home health/hospice settings. Analyze this patient's data and identify subtle patterns or concerning trends that may not be obvious.

PATIENT PROFILE:
- Primary Diagnosis: ${patient.primary_diagnosis}
- Secondary Diagnoses: ${patient.secondary_diagnoses?.join(', ') || 'None'}
- Care Type: ${patient.care_type}
- Age: ${patient.date_of_birth ? new Date().getFullYear() - new Date(patient.date_of_birth).getFullYear() : 'Unknown'}

RECENT VISITS (Last ${Math.min(visits.length, 5)}):
${visits.slice(0, 5).map((v, idx) => `
Visit ${idx + 1} (${v.visit_date}):
- Type: ${v.visit_type}
- Vitals: ${v.vital_signs ? JSON.stringify(v.vital_signs) : 'Not recorded'}
- Notes excerpt: ${v.nurse_notes?.substring(0, 300) || 'No notes'}
`).join('\n')}

RECENT INCIDENTS:
${incidents.length > 0 ? incidents.slice(0, 5).map(i => `- ${i.incident_type} on ${i.incident_date}`).join('\n') : 'No incidents'}

ANALYZE FOR:
1. Subtle deterioration patterns not caught by standard rules
2. Multi-system trends indicating overall decline
3. Patterns suggesting social determinants of health issues
4. Early signs of specific complications based on diagnosis
5. Medication adherence issues
6. Caregiver stress indicators
7. Hidden hospitalization risks

Return ONLY critical or high-severity concerns (not duplicates of obvious issues). Focus on non-obvious patterns.

Return JSON array:
[
  {
    "id": "unique-id",
    "severity": "critical" | "high",
    "type": "ai_detected",
    "title": "Brief title",
    "summary": "One sentence summary",
    "details": "Detailed explanation of the pattern detected",
    "trend": "Pattern description",
    "recommendations": ["action 1", "action 2", ...],
    "riskFactors": ["risk 1", "risk 2", ...],
    "timeline": "When to act",
    "confidence": "high" | "medium"
  }
]

Return empty array if no significant AI-detected patterns found.`;

        const result = await invokeLLM({
          prompt,
          response_json_schema: {
            type: "object",
            properties: {
              alerts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    severity: { type: "string" },
                    type: { type: "string" },
                    title: { type: "string" },
                    summary: { type: "string" },
                    details: { type: "string" },
                    trend: { type: "string" },
                    recommendations: { type: "array", items: { type: "string" } },
                    riskFactors: { type: "array", items: { type: "string" } },
                    timeline: { type: "string" },
                    confidence: { type: "string" }
                  }
                }
              }
            }
          }
        });

        return result.alerts || [];

      } catch (error) {
        console.error("Error in AI analysis:", error);
        return [];
      }
    };

    const handleViewDetails = (alert) => {
      setSelectedAlert(alert);
      setShowDetailDialog(true);
    };

    const handleDismissAlert = (alertId) => {
      setDismissedAlerts([...dismissedAlerts, alertId]);
      setAlerts(alerts.filter(a => a.id !== alertId));
    };

    const getSeverityColor = (severity) => {
      switch (severity) {
        case 'critical': return 'bg-red-100 border-red-500 text-red-900';
        case 'high': return 'bg-orange-100 border-orange-500 text-orange-900';
        case 'medium': return 'bg-yellow-100 border-yellow-500 text-yellow-900';
        case 'low': return 'bg-blue-100 border-blue-500 text-blue-900';
        default: return 'bg-slate-100 border-slate-500 text-slate-900';
      }
    };

    const getSeverityIcon = (severity) => {
      switch (severity) {
        case 'critical': return AlertOctagon;
        case 'high': return AlertTriangle;
        case 'medium': return Bell;
        case 'low': return Info;
        default: return Bell;
      }
    };

    if (!patient || alerts.length === 0) {
      return (
        <Card className="mb-6 bg-green-50 border-green-200">
          <CardContent className="p-6 flex items-center gap-4">
            <CheckCircle2 className="w-8 h-8 text-green-600" />
            <div>
              <h3 className="font-bold text-green-900 text-lg">No Active Alerts</h3>
              <p className="text-sm text-green-700">
                Early warning system monitoring is active. No concerning patterns detected at this time.
              </p>
            </div>
          </CardContent>
        </Card>
      );
    }

    const criticalAlerts = alerts.filter(a => a.severity === 'critical');
    const highAlerts = alerts.filter(a => a.severity === 'high');

    return (
      <>
        {/* Alert Summary Card */}
        <Card className="mb-6 border-2 border-red-500 bg-gradient-to-r from-red-50 to-orange-50">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-3 text-xl">
              <div className="relative">
                <BellRing className="w-7 h-7 text-red-600 animate-pulse" />
                <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white text-xs font-bold rounded-full flex items-center justify-center">
                  {alerts.length}
                </span>
              </div>
              Early Warning System - Active Alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white p-4 rounded-lg border-2 border-red-300">
                <p className="text-sm text-slate-600 mb-1">Critical Alerts</p>
                <p className="text-3xl font-bold text-red-600">{criticalAlerts.length}</p>
                <p className="text-xs text-slate-500 mt-1">Immediate action required</p>
              </div>
              <div className="bg-white p-4 rounded-lg border-2 border-orange-300">
                <p className="text-sm text-slate-600 mb-1">High Priority Alerts</p>
                <p className="text-3xl font-bold text-orange-600">{highAlerts.length}</p>
                <p className="text-xs text-slate-500 mt-1">Urgent attention needed</p>
              </div>
            </div>

            {/* Alert List */}
            <div className="space-y-2">
              {alerts.map((alert) => {
                const Icon = alert.icon || getSeverityIcon(alert.severity);
                const _SeverityIcon = getSeverityIcon(alert.severity); // This variable is not used but kept as it was in the original code.

                return (
                  <Alert 
                    key={alert.id} 
                    className={`border-l-4 ${getSeverityColor(alert.severity)} cursor-pointer hover:shadow-md transition-shadow`}
                    onClick={() => handleViewDetails(alert)}
                  >
                    <div className="flex items-start gap-3">
                      <Icon className="w-6 h-6 mt-1 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <AlertDescription className="font-bold text-base mb-0">
                            {alert.title}
                          </AlertDescription>
                          <Badge className={`flex-shrink-0 ${
                            alert.severity === 'critical' ? 'bg-red-600' :
                            alert.severity === 'high' ? 'bg-orange-600' :
                            alert.severity === 'medium' ? 'bg-yellow-600' :
                            'bg-blue-600'
                          } text-white`}>
                            {alert.severity.toUpperCase()}
                          </Badge>
                        </div>
                        <AlertDescription className="text-sm mb-2">
                          {alert.summary}
                        </AlertDescription>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">
                            {alert.type.replace(/_/g, ' ')}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {alert.timeline}
                          </Badge>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDismissAlert(alert.id);
                        }}
                        className="flex-shrink-0"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  </Alert>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Alert Detail Dialog */}
        <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3 text-2xl">
                {selectedAlert && React.createElement(selectedAlert.icon || AlertTriangle, { 
                  className: "w-7 h-7 text-red-600" 
                })}
                {selectedAlert?.title}
              </DialogTitle>
              <DialogDescription>
                <Badge className={`${
                  selectedAlert?.severity === 'critical' ? 'bg-red-600' :
                  selectedAlert?.severity === 'high' ? 'bg-orange-600' :
                  selectedAlert?.severity === 'medium' ? 'bg-yellow-600' :
                  'bg-blue-600'
                } text-white`}>
                  {selectedAlert?.severity?.toUpperCase()} PRIORITY
                </Badge>
              </DialogDescription>
            </DialogHeader>

            {selectedAlert && (
              <div className="space-y-4 py-4">
                {/* Summary */}
                <div className="bg-slate-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-slate-900 mb-2">Summary</h4>
                  <p className="text-slate-700">{selectedAlert.summary}</p>
                </div>

                {/* Details */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                    <Activity className="w-4 h-4" />
                    Detailed Analysis
                  </h4>
                  <p className="text-blue-900">{selectedAlert.details}</p>
                  {selectedAlert.confidence && (
                    <p className="text-xs text-blue-700 mt-2">
                      AI Confidence: {selectedAlert.confidence}
                    </p>
                  )}
                </div>

                {/* Recommendations */}
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                    <Target className="w-4 h-4" />
                    Recommended Actions
                  </h4>
                  <ul className="space-y-2">
                    {selectedAlert.recommendations?.map((rec, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-green-900">
                        <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span className="text-sm">{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Risk Factors */}
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" />
                    Risk Factors if Not Addressed
                  </h4>
                  <ul className="space-y-1">
                    {selectedAlert.riskFactors?.map((risk, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-red-900">
                        <span className="text-red-600 font-bold">•</span>
                        <span className="text-sm">{risk}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Timeline */}
                <Alert className="bg-yellow-50 border-yellow-300">
                  <Clock className="w-4 h-4 text-yellow-700" />
                  <AlertDescription className="text-yellow-900">
                    <strong>Action Timeline:</strong> {selectedAlert.timeline}
                  </AlertDescription>
                </Alert>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={() => setShowDetailDialog(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  handleDismissAlert(selectedAlert.id);
                  setShowDetailDialog(false);
                }}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Mark as Acknowledged
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </>
    );
  }

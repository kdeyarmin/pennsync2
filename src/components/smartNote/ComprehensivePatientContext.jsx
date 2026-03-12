import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  User, 
  Heart, 
  Pill, 
  AlertTriangle, 
  Calendar,
  FileText,
  TrendingUp,
  Loader2
} from "lucide-react";

export function buildComprehensiveContext(patient, visits, carePlans, incidents, medications, alerts) {
  const context = {
    // Patient Demographics
    demographics: {
      name: `${patient.first_name} ${patient.last_name}`,
      age: patient.date_of_birth ? calculateAge(patient.date_of_birth) : 'Unknown',
      mrn: patient.medical_record_number,
      careType: patient.care_type
    },

    // Medical History
    medicalHistory: {
      primaryDiagnosis: patient.primary_diagnosis,
      secondaryDiagnoses: patient.secondary_diagnoses || [],
      allergies: patient.allergies || 'NKDA',
      pastMedicalHistory: patient.past_medical_history || [],
      pastHospitalizations: patient.past_hospitalizations || []
    },

    // Current Medications
    medications: (patient.current_medications || []).map(med => ({
      name: med.name,
      dosage: med.dosage,
      frequency: med.frequency,
      prescriber: med.prescriber
    })),

    // Recent Visit History
    recentVisits: (visits || []).slice(0, 5).map(visit => ({
      date: visit.visit_date,
      type: visit.visit_type,
      findings: visit.nurse_notes ? extractKeyFindings(visit.nurse_notes) : [],
      vitalSigns: visit.vital_signs || {}
    })),

    // Active Care Plans
    activeCarePlans: (carePlans || [])
      .filter(cp => cp.status === 'active')
      .map(cp => ({
        problem: cp.problem,
        goal: cp.goal,
        interventions: cp.interventions || [],
        targetDate: cp.target_date
      })),

    // Recent Incidents
    recentIncidents: (incidents || []).slice(0, 3).map(inc => ({
      type: inc.incident_type,
      date: inc.incident_date,
      severity: inc.severity,
      details: inc.report
    })),

    // Active Alerts
    activeAlerts: (alerts || [])
      .filter(a => a.status === 'active')
      .map(a => ({
        type: a.alert_type,
        severity: a.severity,
        message: a.message,
        recommendations: a.recommended_actions || []
      })),

    // Clinical Trends
    trends: analyzeTrends(visits),

    // Functional Status
    functionalStatus: patient.functional_status || {},

    // Social History
    socialHistory: patient.social_history || {}
  };

  return context;
}

function calculateAge(dateOfBirth) {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const monthDiff = today.getMonth() - dob.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < dob.getDate())) {
    age--;
  }
  return age;
}

function extractKeyFindings(notes) {
  // Extract key clinical findings from notes
  const findings = [];
  const keywords = ['improved', 'worsened', 'stable', 'increased', 'decreased', 'new', 'resolved'];
  
  const sentences = notes.split(/[.!?]+/);
  sentences.forEach(sentence => {
    if (keywords.some(keyword => sentence.toLowerCase().includes(keyword))) {
      findings.push(sentence.trim());
    }
  });
  
  return findings.slice(0, 3); // Top 3 findings
}

function analyzeTrends(visits) {
  if (!visits || visits.length < 2) return null;

  const recentVisits = visits.slice(0, 5);
  const trends = {};

  // Analyze vital signs trends
  const vitalTypes = ['blood_pressure_systolic', 'heart_rate', 'temperature', 'oxygen_saturation'];
  
  vitalTypes.forEach(vital => {
    const values = recentVisits
      .map(v => v.vital_signs?.[vital])
      .filter(v => v != null);
    
    if (values.length >= 2) {
      const recent = values[0];
      const older = values[values.length - 1];
      const change = recent - older;
      
      if (Math.abs(change) > 0) {
        trends[vital] = change > 0 ? 'increasing' : 'decreasing';
      }
    }
  });

  return Object.keys(trends).length > 0 ? trends : null;
}

export function formatContextForAI(context) {
  return `
COMPREHENSIVE PATIENT CONTEXT:

PATIENT DEMOGRAPHICS:
- Name: ${context.demographics.name}
- Age: ${context.demographics.age} years
- MRN: ${context.demographics.mrn}
- Care Type: ${context.demographics.careType}

MEDICAL HISTORY:
- Primary Diagnosis: ${context.medicalHistory.primaryDiagnosis || 'Not specified'}
- Secondary Diagnoses: ${context.medicalHistory.secondaryDiagnoses.join(', ') || 'None'}
- Allergies: ${context.medicalHistory.allergies}
- Past Medical History: ${context.medicalHistory.pastMedicalHistory.join(', ') || 'None documented'}

CURRENT MEDICATIONS (${context.medications.length}):
${context.medications.map(med => `- ${med.name} ${med.dosage} ${med.frequency}`).join('\n') || 'None documented'}

RECENT VISIT HISTORY (Last ${context.recentVisits.length} visits):
${context.recentVisits.map((v, idx) => `
Visit ${idx + 1} (${v.date}):
- Type: ${v.type}
- Key Findings: ${v.findings.join('; ') || 'None noted'}
- Vitals: BP ${v.vitalSigns.blood_pressure_systolic || 'N/A'}/${v.vitalSigns.blood_pressure_diastolic || 'N/A'}, HR ${v.vitalSigns.heart_rate || 'N/A'}, O2 ${v.vitalSigns.oxygen_saturation || 'N/A'}%
`).join('\n') || 'No recent visits'}

ACTIVE CARE PLANS (${context.activeCarePlans.length}):
${context.activeCarePlans.map((cp, idx) => `
${idx + 1}. Problem: ${cp.problem}
   Goal: ${cp.goal}
   Interventions: ${cp.interventions.join(', ')}
`).join('\n') || 'No active care plans'}

${context.recentIncidents.length > 0 ? `
RECENT INCIDENTS (${context.recentIncidents.length}):
${context.recentIncidents.map((inc, idx) => `
${idx + 1}. ${inc.type} (${inc.date}) - Severity: ${inc.severity}
`).join('\n')}
` : ''}

${context.activeAlerts.length > 0 ? `
ACTIVE CLINICAL ALERTS (${context.activeAlerts.length}):
${context.activeAlerts.map((alert, idx) => `
${idx + 1}. [${alert.severity.toUpperCase()}] ${alert.type}: ${alert.message}
   Recommendations: ${alert.recommendations.join(', ')}
`).join('\n')}
` : ''}

${context.trends ? `
CLINICAL TRENDS:
${Object.entries(context.trends).map(([vital, trend]) => `- ${vital}: ${trend}`).join('\n')}
` : ''}

FUNCTIONAL STATUS:
- Ambulation: ${context.functionalStatus.ambulation || 'Not assessed'}
- ADL Independence: ${context.functionalStatus.adl_independence || 'Not assessed'}
- Cognitive Status: ${context.functionalStatus.cognitive_status || 'Not assessed'}
- Fall Risk: ${context.functionalStatus.fall_risk || 'Not assessed'}

SOCIAL HISTORY:
- Living Situation: ${context.socialHistory.living_situation || 'Not documented'}
- Primary Language: ${context.socialHistory.primary_language || 'English'}
- Support System: ${context.socialHistory.support_system || 'Not documented'}
`;
}

export default function ComprehensivePatientContext({ patientId, onContextReady }) {
  const { data: patient } = useQuery({
    queryKey: ['patient', patientId],
    queryFn: () => base44.entities.Patient.filter({ id: patientId }).then(p => p[0]),
    enabled: !!patientId
  });

  const { data: visits = [] } = useQuery({
    queryKey: ['patientVisits', patientId],
    queryFn: () => base44.entities.Visit.filter({ patient_id: patientId }, '-visit_date'),
    enabled: !!patientId
  });

  const { data: carePlans = [] } = useQuery({
    queryKey: ['patientCarePlans', patientId],
    queryFn: () => base44.entities.CarePlan.filter({ patient_id: patientId }),
    enabled: !!patientId
  });

  const { data: incidents = [] } = useQuery({
    queryKey: ['patientIncidents', patientId],
    queryFn: () => base44.entities.Incident.filter({ patient_id: patientId }, '-incident_date'),
    enabled: !!patientId
  });

  const { data: alerts = [] } = useQuery({
    queryKey: ['patientAlerts', patientId],
    queryFn: () => base44.entities.PatientAlert.filter({ patient_id: patientId, status: 'active' }),
    enabled: !!patientId
  });

  const context = React.useMemo(() => {
    if (!patient) return null;
    return buildComprehensiveContext(patient, visits, carePlans, incidents, patient.current_medications, alerts);
  }, [patient, visits, carePlans, incidents, alerts]);

  React.useEffect(() => {
    if (context && onContextReady) {
      onContextReady(context);
    }
  }, [context, onContextReady]);

  if (!context) {
    return (
      <Card className="border-gray-200">
        <CardContent className="p-6 text-center">
          <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-gray-400" />
          <p className="text-sm text-gray-500">Loading comprehensive patient context...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <User className="w-5 h-5 text-indigo-600" />
          Comprehensive Patient Context Loaded
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ScrollArea className="max-h-[400px]">
          <div className="space-y-4 pr-4">
            {/* Patient Summary */}
            <div className="bg-white rounded-lg p-3 border border-indigo-200">
              <div className="flex items-center gap-2 mb-2">
                <User className="w-4 h-4 text-indigo-600" />
                <span className="font-semibold text-sm">Patient Summary</span>
              </div>
              <div className="text-xs space-y-1">
                <p><strong>{context.demographics.name}</strong>, {context.demographics.age} years old</p>
                <p>MRN: {context.demographics.mrn}</p>
              </div>
            </div>

            {/* Active Diagnoses */}
            {(context.medicalHistory.primaryDiagnosis || context.medicalHistory.secondaryDiagnoses?.length > 0) && (
              <div className="bg-white rounded-lg p-3 border border-indigo-200">
                <div className="flex items-center gap-2 mb-2">
                  <Heart className="w-4 h-4 text-red-600" />
                  <span className="font-semibold text-sm">Active Diagnoses</span>
                </div>
                <div className="text-xs space-y-1">
                  {context.medicalHistory.primaryDiagnosis && (
                    <p className="font-medium">Primary: {context.medicalHistory.primaryDiagnosis}</p>
                  )}
                  {context.medicalHistory.secondaryDiagnoses?.length > 0 && (
                    <>
                      <p className="font-medium mt-2">Secondary:</p>
                      <div className="space-y-1">
                        {context.medicalHistory.secondaryDiagnoses.map((dx, idx) => (
                          <p key={idx}>• {dx}</p>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Medications */}
            {context.medications.length > 0 && (
              <div className="bg-white rounded-lg p-3 border border-indigo-200">
                <div className="flex items-center gap-2 mb-2">
                  <Pill className="w-4 h-4 text-blue-600" />
                  <span className="font-semibold text-sm">Current Medications ({context.medications.length})</span>
                </div>
                <div className="text-xs space-y-1">
                  {context.medications.slice(0, 5).map((med, idx) => (
                    <p key={idx}>• {med.name} {med.dosage} {med.frequency}</p>
                  ))}
                  {context.medications.length > 5 && (
                    <p className="text-gray-500 italic">+ {context.medications.length - 5} more</p>
                  )}
                </div>
              </div>
            )}

            {/* Active Care Plans */}
            {context.activeCarePlans.length > 0 && (
              <div className="bg-white rounded-lg p-3 border border-indigo-200">
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="w-4 h-4 text-green-600" />
                  <span className="font-semibold text-sm">Active Care Plans ({context.activeCarePlans.length})</span>
                </div>
                <div className="text-xs space-y-2">
                  {context.activeCarePlans.map((cp, idx) => (
                    <div key={idx} className="bg-green-50 p-2 rounded">
                      <p className="font-medium">{cp.problem}</p>
                      <p className="text-gray-600 text-xs">Goal: {cp.goal}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Alerts */}
            {context.activeAlerts.length > 0 && (
              <div className="bg-white rounded-lg p-3 border border-red-200">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <span className="font-semibold text-sm">Active Alerts ({context.activeAlerts.length})</span>
                </div>
                <div className="text-xs space-y-2">
                  {context.activeAlerts.map((alert, idx) => (
                    <div key={idx} className={`p-2 rounded ${
                      alert.severity === 'critical' ? 'bg-red-100' :
                      alert.severity === 'high' ? 'bg-orange-100' : 'bg-yellow-100'
                    }`}>
                      <Badge className="mb-1 text-xs">{alert.severity}</Badge>
                      <p className="font-medium">{alert.type}</p>
                      <p className="text-gray-700">{alert.message}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Recent Visits */}
            {context.recentVisits.length > 0 && (
              <div className="bg-white rounded-lg p-3 border border-indigo-200">
                <div className="flex items-center gap-2 mb-2">
                  <Calendar className="w-4 h-4 text-purple-600" />
                  <span className="font-semibold text-sm">Recent Visit History</span>
                </div>
                <div className="text-xs space-y-2">
                  {context.recentVisits.slice(0, 3).map((visit, idx) => (
                    <div key={idx} className="bg-purple-50 p-2 rounded">
                      <p className="font-medium">{visit.date} - {visit.type}</p>
                      {visit.findings.length > 0 && (
                        <p className="text-gray-600 mt-1">{visit.findings[0]}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Trends */}
            {context.trends && (
              <div className="bg-white rounded-lg p-3 border border-indigo-200">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="w-4 h-4 text-orange-600" />
                  <span className="font-semibold text-sm">Clinical Trends</span>
                </div>
                <div className="text-xs space-y-1">
                  {Object.entries(context.trends).map(([vital, trend], idx) => (
                    <p key={idx}>• {vital}: <Badge className="text-xs">{trend}</Badge></p>
                  ))}
                </div>
              </div>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
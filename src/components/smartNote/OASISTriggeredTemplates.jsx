import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  ChevronDown,
  ChevronUp,
  Zap,
  AlertTriangle,
  TrendingDown,
  Activity,
  Heart,
  Brain,
  Stethoscope,
  Shield,
  Plus,
  CheckCircle2
} from "lucide-react";

// Template definitions based on OASIS findings
const OASIS_TEMPLATES = {
  functional_decline: {
    trigger: (oasis) => {
      const fs = oasis?.functional_scores || {};
      return fs.m1860_ambulation >= 3 || fs.m1850_transferring >= 3 || fs.m1830_bathing >= 4;
    },
    icon: TrendingDown,
    color: 'orange',
    title: 'Functional Decline Assessment',
    description: 'Document functional status changes and safety concerns',
    template: `FUNCTIONAL STATUS ASSESSMENT:
Ambulation: Patient [ambulates with/requires assistance for] ambulation. [Describe gait, balance, distance capability].
Transfers: [Independent/Requires assistance] with bed-to-chair transfers. [Note any equipment used].
ADLs: Patient [independent/requires assistance] with bathing and dressing. [Specific limitations noted].
Safety: [Fall risk assessment, home safety concerns, equipment needs].
Plan: [Therapy referral, equipment recommendations, caregiver education].`
  },
  high_fall_risk: {
    trigger: (oasis) => {
      const fs = oasis?.functional_scores || {};
      return fs.m1860_ambulation >= 4 || (fs.m1850_transferring >= 3 && fs.m1860_ambulation >= 2);
    },
    icon: AlertTriangle,
    color: 'red',
    title: 'Fall Risk Documentation',
    description: 'Required fall risk assessment and interventions',
    template: `FALL RISK ASSESSMENT:
Fall History: [Recent falls, frequency, circumstances].
Risk Factors: [Gait instability, medication effects, environmental hazards, vision issues].
Current Mobility: [Assistive device used, supervision needs, distance limitations].
Home Environment: [Stairs, rugs, lighting, bathroom safety].
Interventions Implemented:
- Fall prevention education provided to patient/caregiver
- [Home safety modifications recommended/implemented]
- [Assistive device assessment/training]
- [Medication review for fall-risk medications]
Patient/Caregiver Verbalized Understanding: [Yes/No]`
  },
  cardiac_condition: {
    trigger: (oasis) => {
      const dx = (oasis?.primary_diagnosis || '').toLowerCase();
      const comorbidities = (oasis?.comorbidities || []).join(' ').toLowerCase();
      return dx.includes('heart') || dx.includes('chf') || dx.includes('cardiac') || 
             comorbidities.includes('heart') || comorbidities.includes('chf');
    },
    icon: Heart,
    color: 'red',
    title: 'Cardiac Assessment',
    description: 'CHF/cardiac condition monitoring template',
    template: `CARDIAC ASSESSMENT:
Vital Signs: BP [___/___ ], HR [___], RR [___], O2 Sat [___]% on [room air/O2 at ___ L/min].
Weight: [___] lbs. Weight change from last visit: [+/- ___] lbs.
Cardiovascular: Heart sounds [regular/irregular], [murmur present/absent]. Edema: [location, severity +1-+4].
Respiratory: Lung sounds [clear/crackles/wheezes] [bilateral/location]. Dyspnea: [at rest/with exertion/none].
Symptoms: [Chest pain, SOB, orthopnea, PND, fatigue - describe].
Medications: [Compliance with cardiac medications, diuretic effectiveness].
Diet: [Sodium intake, fluid restriction compliance].
Patient Education: [Daily weights, sodium restriction, symptom recognition, when to call MD].
Plan: [MD notification if indicated, medication adjustments, follow-up].`
  },
  respiratory_condition: {
    trigger: (oasis) => {
      const dx = (oasis?.primary_diagnosis || '').toLowerCase();
      const comorbidities = (oasis?.comorbidities || []).join(' ').toLowerCase();
      return dx.includes('copd') || dx.includes('respiratory') || dx.includes('pneumonia') ||
             dx.includes('lung') || comorbidities.includes('copd');
    },
    icon: Activity,
    color: 'blue',
    title: 'Respiratory Assessment',
    description: 'COPD/respiratory condition monitoring',
    template: `RESPIRATORY ASSESSMENT:
Vital Signs: RR [___], O2 Sat [___]% on [room air/O2 at ___ L/min]. BP [___/___], HR [___].
Respiratory Status: Lung sounds [clear/diminished/wheezes/crackles] [bilateral/location].
Breathing Pattern: [Labored/unlabored], [pursed lip breathing], accessory muscle use [yes/no].
Oxygen Use: [Continuous/PRN], [compliance with prescribed flow rate].
Cough: [Productive/nonproductive], sputum [color, amount, consistency].
Activity Tolerance: [Dyspnea level with activity, rest periods needed].
Medications: [Inhaler technique observed, nebulizer compliance, steroid use].
Patient Education: [Breathing techniques, energy conservation, inhaler use, infection prevention].
Plan: [Pulmonary rehab, MD notification, medication adjustments].`
  },
  diabetes_management: {
    trigger: (oasis) => {
      const dx = (oasis?.primary_diagnosis || '').toLowerCase();
      const comorbidities = (oasis?.comorbidities || []).join(' ').toLowerCase();
      return dx.includes('diabetes') || dx.includes('diabetic') || 
             comorbidities.includes('diabetes') || comorbidities.includes('dm');
    },
    icon: Stethoscope,
    color: 'purple',
    title: 'Diabetes Management',
    description: 'Blood sugar monitoring and foot care',
    template: `DIABETES MANAGEMENT:
Blood Glucose: [Fasting/Random] BG [___] mg/dL. Recent BG log reviewed: [range, patterns].
Medication Compliance: [Oral agents/Insulin] taken as prescribed [yes/no]. [Barriers noted].
Insulin Administration: [Site rotation, technique, storage observed if applicable].
Hypoglycemia Assessment: [Signs/symptoms, recent episodes, patient recognition].
Foot Assessment: [Skin integrity, sensation, pulses, deformities, footwear].
Diet: [Carbohydrate intake, meal planning compliance].
Patient Education: [BG monitoring, medication management, hypoglycemia treatment, foot care].
A1C: [Last result if known, date].
Plan: [MD notification, dietary referral, podiatry referral, medication adjustments].`
  },
  wound_care: {
    trigger: (oasis) => {
      const dx = (oasis?.primary_diagnosis || '').toLowerCase();
      const clinical = oasis?.clinical_items || {};
      return dx.includes('wound') || dx.includes('ulcer') || 
             clinical.pressure_ulcer_present || clinical.surgical_wound;
    },
    icon: Shield,
    color: 'green',
    title: 'Wound Assessment',
    description: 'Wound care documentation template',
    template: `WOUND ASSESSMENT:
Location: [Anatomical location].
Wound Type: [Pressure ulcer/Surgical/Venous/Arterial/Diabetic].
Measurements: Length [___] cm x Width [___] cm x Depth [___] cm.
Wound Bed: [Granulation ___%, Slough ___%, Eschar ___%, Epithelialization ____%].
Drainage: [Type, amount, odor].
Periwound Skin: [Intact/Macerated/Erythema/Induration - describe].
Pain: [___/10] [at rest/with dressing change].
Staging (if pressure ulcer): Stage [I/II/III/IV/Unstageable/DTI].
Treatment Provided: [Cleansing, dressing type, frequency].
Signs of Infection: [Present/Absent - describe if present].
Plan: [Dressing change schedule, MD notification, wound care specialist referral].`
  },
  cognitive_impairment: {
    trigger: (oasis) => {
      const dx = (oasis?.primary_diagnosis || '').toLowerCase();
      const comorbidities = (oasis?.comorbidities || []).join(' ').toLowerCase();
      return dx.includes('dementia') || dx.includes('alzheimer') || dx.includes('cognitive') ||
             comorbidities.includes('dementia') || comorbidities.includes('alzheimer');
    },
    icon: Brain,
    color: 'indigo',
    title: 'Cognitive Assessment',
    description: 'Dementia/cognitive impairment documentation',
    template: `COGNITIVE ASSESSMENT:
Orientation: [Person/Place/Time/Situation - specify deficits].
Memory: [Short-term/Long-term impairment, examples].
Behavior: [Cooperative/Agitated/Wandering/Sundowning - describe].
Communication: [Ability to follow commands, express needs].
Safety Awareness: [Judgment, recognition of dangers].
Medication Management: [Self-administers/Requires assistance/Unable].
Caregiver Status: [Present, capable, caregiver stress level].
Supervision Needs: [24-hour/Intermittent/Minimal].
Wandering Risk: [Low/Moderate/High - describe precautions].
Patient Education: [Provided to caregiver - routine, safety, behavior management].
Plan: [Caregiver support, respite referral, behavioral interventions].`
  },
  institutional_discharge: {
    trigger: (oasis) => oasis?.admission_source === 'institutional',
    icon: FileText,
    color: 'teal',
    title: 'Post-Discharge Assessment',
    description: 'Recent facility discharge follow-up',
    template: `POST-DISCHARGE ASSESSMENT:
Discharge From: [Hospital/SNF/Rehab] on [date].
Discharge Diagnosis: [Primary reason for hospitalization].
Current Status: [Compared to discharge - improved/stable/declined].
Medication Reconciliation: [Completed, discrepancies noted and resolved].
New Medications: [List any new medications, patient understanding].
Follow-up Appointments: [Scheduled, transportation arranged].
Discharge Instructions: [Reviewed, patient/caregiver understanding].
Red Flags Reviewed: [When to seek emergency care].
Home Safety: [Environment assessment, DME in place and functioning].
Support System: [Caregiver availability, community resources].
Rehospitalization Risk: [Low/Moderate/High - factors].
Plan: [Frequency of visits, coordination with PCP, specialist follow-up].`
  }
};

export default function OASISTriggeredTemplates({ 
  patientId, 
  onInsertTemplate,
  compact = false 
}) {
  const [isExpanded, setIsExpanded] = useState(!compact);
  const [appliedTemplates, setAppliedTemplates] = useState([]);

  // Fetch patient's OASIS data
  const { data: patientOASIS = [] } = useQuery({
    queryKey: ['patientOASISTemplates', patientId],
    queryFn: async () => {
      if (!patientId) return [];
      return await base44.entities.OASISUpload.filter({ patient_id: patientId }, '-created_date', 1);
    },
    enabled: !!patientId
  });

  const latestOASIS = patientOASIS[0]?.pdgm_data;

  // Determine which templates are triggered
  const triggeredTemplates = Object.entries(OASIS_TEMPLATES)
    .filter(([key, template]) => template.trigger(latestOASIS))
    .map(([key, template]) => ({ key, ...template }));

  const handleInsertTemplate = (key, template) => {
    onInsertTemplate?.(template);
    setAppliedTemplates(prev => [...prev, key]);
  };

  if (!patientId || !latestOASIS || triggeredTemplates.length === 0) {
    return null;
  }

  const getColorClasses = (color) => {
    const colors = {
      red: 'bg-red-100 text-red-800 border-red-200',
      orange: 'bg-orange-100 text-orange-800 border-orange-200',
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      indigo: 'bg-indigo-100 text-indigo-800 border-indigo-200',
      teal: 'bg-teal-100 text-teal-800 border-teal-200'
    };
    return colors[color] || 'bg-slate-100 text-slate-800 border-slate-200';
  };

  return (
    <Card className="border-2 border-amber-200">
      <CardHeader 
        className="pb-2 bg-gradient-to-r from-amber-50 to-yellow-50 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-600" />
            OASIS-Suggested Templates
            <Badge variant="outline" className="text-xs bg-white">
              {triggeredTemplates.length} relevant
            </Badge>
          </div>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-3 space-y-2">
          <p className="text-xs text-slate-600 mb-2">
            Based on OASIS findings, these documentation templates are recommended:
          </p>

          {triggeredTemplates.map((template) => {
            const Icon = template.icon;
            const isApplied = appliedTemplates.includes(template.key);

            return (
              <div 
                key={template.key}
                className={`p-3 rounded-lg border ${getColorClasses(template.color)}`}
              >
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <Icon className="w-4 h-4" />
                    <span className="text-sm font-medium">{template.title}</span>
                  </div>
                  {isApplied ? (
                    <Badge className="bg-green-600 text-white text-xs">
                      <CheckCircle2 className="w-3 h-3 mr-1" /> Added
                    </Badge>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs bg-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInsertTemplate(template.key, template.template);
                      }}
                    >
                      <Plus className="w-3 h-3 mr-1" /> Use Template
                    </Button>
                  )}
                </div>
                <p className="text-xs opacity-80">{template.description}</p>
              </div>
            );
          })}
        </CardContent>
      )}
    </Card>
  );
}
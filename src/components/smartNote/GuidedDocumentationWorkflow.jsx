import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CheckCircle2, AlertTriangle, ClipboardList } from "lucide-react";

export default function GuidedDocumentationWorkflow({ visitType, diagnosis, _careType }) {
  const getWorkflowSteps = () => {
    const baseSteps = [
      { id: 'vitals', label: 'Vital Signs', required: true },
      { id: 'assessment', label: 'Patient Assessment', required: true },
      { id: 'interventions', label: 'Interventions Performed', required: true },
      { id: 'response', label: 'Patient Response', required: true },
      { id: 'plan', label: 'Plan of Care', required: true }
    ];

    // Admission-specific requirements
    if (visitType === 'admission') {
      return [
        { id: 'homebound', label: 'Homebound Status', required: true, critical: true },
        { id: 'skilled_need', label: 'Skilled Nursing Need', required: true, critical: true },
        ...baseSteps,
        { id: 'safety', label: 'Home Safety Assessment', required: true },
        { id: 'caregiver', label: 'Caregiver Assessment', required: true },
        { id: 'equipment', label: 'DME/Equipment Needs', required: false }
      ];
    }

    // Recertification-specific requirements
    if (visitType === 'recertification') {
      return [
        { id: 'homebound', label: 'Homebound Status Update', required: true, critical: true },
        { id: 'skilled_need', label: 'Ongoing Skilled Need', required: true, critical: true },
        { id: 'progress', label: 'Progress Toward Goals', required: true, critical: true },
        ...baseSteps,
        { id: 'functional', label: 'Functional Status Changes', required: true }
      ];
    }

    // Discharge-specific requirements
    if (visitType === 'discharge') {
      return [
        { id: 'goals_met', label: 'Goals Achievement Summary', required: true, critical: true },
        { id: 'final_assessment', label: 'Final Assessment', required: true },
        { id: 'discharge_plan', label: 'Discharge Plan & Instructions', required: true, critical: true },
        { id: 'followup', label: 'Follow-up Arrangements', required: true },
        { id: 'education', label: 'Patient/Caregiver Education', required: true }
      ];
    }

    // Routine visit
    return baseSteps;
  };

  const getDiagnosisGuidance = () => {
    const upperDiagnosis = diagnosis?.toUpperCase() || '';
    
    if (upperDiagnosis.includes('CHF') || upperDiagnosis.includes('HEART FAILURE')) {
      return {
        critical: ['Daily weight', 'Edema assessment (0-4+ grading)', 'JVD assessment', 'Lung sounds (crackles, S3)'],
        suggested: ['Fluid intake/output', 'Medication compliance', 'Dietary adherence', 'Activity tolerance']
      };
    }

    if (upperDiagnosis.includes('COPD')) {
      return {
        critical: ['O2 sat on room air AND supplemental O2', 'Respiratory rate & effort', 'Lung sounds', 'Accessory muscle use'],
        suggested: ['Cyanosis check', 'Medication compliance', 'Inhaler technique', 'Activity tolerance']
      };
    }

    if (upperDiagnosis.includes('DIABETES')) {
      return {
        critical: ['Blood glucose reading', 'Diabetic foot exam', 'Peripheral pulses', 'Skin integrity between toes'],
        suggested: ['Medication compliance', 'Dietary adherence', 'Vision check', 'Neuropathy assessment']
      };
    }

    if (upperDiagnosis.includes('WOUND') || upperDiagnosis.includes('ULCER')) {
      return {
        critical: ['Wound dimensions (L x W x D cm)', 'Wound bed % (granulation/slough/eschar)', 'Exudate type/amount/odor', 'Periwound condition'],
        suggested: ['Undermining/tunneling', 'Pain level at wound', 'Treatment effectiveness', 'Healing progress']
      };
    }

    if (upperDiagnosis.includes('STROKE') || upperDiagnosis.includes('CVA')) {
      return {
        critical: ['LOC & orientation', 'Speech/aphasia status', 'Motor strength bilateral (0-5)', 'Facial symmetry'],
        suggested: ['Swallowing safety', 'Sensation assessment', 'Fall risk', 'ADL modifications']
      };
    }

    return {
      critical: ['Condition-specific assessment', 'Treatment response', 'Functional status'],
      suggested: ['Safety assessment', 'Medication review', 'Patient education']
    };
  };

  const steps = getWorkflowSteps();
  const guidance = getDiagnosisGuidance();

  return (
    <Card className="border-2 border-blue-200 bg-gradient-to-br from-blue-50 to-indigo-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-blue-600" />
          Documentation Checklist for {visitType.replace(/_/g, ' ')}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Required Documentation Steps */}
        <div>
          <p className="text-xs font-semibold text-slate-500 mb-2 uppercase">Required Elements</p>
          <div className="space-y-2">
            {steps.filter(s => s.required).map((step) => (
              <div key={step.id} className={`flex items-center gap-2 p-2 rounded ${step.critical ? 'bg-red-50 border border-red-200' : 'bg-white border border-slate-200'}`}>
                <CheckCircle2 className={`w-4 h-4 ${step.critical ? 'text-red-600' : 'text-blue-600'}`} />
                <span className="text-sm flex-1">{step.label}</span>
                {step.critical && (
                  <Badge className="bg-red-600 text-xs">Critical</Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Diagnosis-Specific Guidance */}
        {diagnosis && (
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase">
              {diagnosis.split(' ')[0]} - Critical Elements
            </p>
            <Alert className="bg-orange-50 border-orange-200">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <AlertDescription>
                <p className="font-semibold text-sm mb-2">Must Document:</p>
                <ul className="space-y-1 text-xs">
                  {guidance.critical.map((item, idx) => (
                    <li key={idx}>• {item}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          </div>
        )}

        {/* Suggested Elements */}
        {diagnosis && guidance.suggested.length > 0 && (
          <div>
            <p className="text-xs font-semibold text-slate-500 mb-2 uppercase">Recommended</p>
            <div className="bg-white rounded-lg border border-slate-200 p-3">
              <ul className="space-y-1 text-xs text-slate-700">
                {guidance.suggested.map((item, idx) => (
                  <li key={idx} className="flex items-start gap-2">
                    <span className="text-blue-600">✓</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
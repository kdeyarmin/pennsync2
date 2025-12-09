import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { 
  Wand2, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Loader2,
  XCircle,
  Play
} from "lucide-react";

export default function OneClickComplianceFixer({ 
  complianceIssues = [],
  currentNote,
  onApplyFix,
  onFixAll,
  patientData,
  vitalSigns,
  diagnosis,
  appliedFixes = []
}) {
  const [fixingIssue, setFixingIssue] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [wizardMode, setWizardMode] = useState(false);

  // Filter for actionable issues
  const actionableIssues = complianceIssues.filter(issue => 
    issue.status !== 'present' && !appliedFixes.includes(issue.element || issue.name)
  );

  const getFixText = (issue) => {
    const element = issue.element || issue.name;
    
    // Pre-written compliant text templates based on common issues
    const fixTemplates = {
      'HOMEBOUND STATUS': `Patient is homebound due to ${patientData?.functional_status?.ambulation === 'wheelchair' ? 'wheelchair dependence' : 'significant mobility impairment'}. Leaving home requires considerable and taxing effort${vitalSigns?.o2 ? ` and supplemental oxygen at ${vitalSigns.o2}%` : ''}. Patient experiences ${patientData?.pain_management?.chronic_pain ? 'chronic pain' : 'fatigue and weakness'} with ambulation, limiting ability to leave home except for medical appointments with assistance.`,
      
      'SKILLED NEED': `Skilled nursing required for comprehensive assessment of complex ${diagnosis || 'medical condition'}, medication management and monitoring for adverse effects, patient/caregiver education requiring nursing judgment${vitalSigns?.bp ? `, and ongoing evaluation of cardiovascular status (current BP ${vitalSigns.bp})` : ''}. Patient's condition requires skilled observation and assessment that cannot be performed by unlicensed personnel.`,
      
      'PATIENT RESPONSE': `Patient verbalized understanding of teaching. When asked to repeat back key instructions, patient accurately stated ${diagnosis?.includes('CHF') ? 'daily weight monitoring protocol and when to call nurse' : diagnosis?.includes('diabetes') ? 'blood glucose monitoring schedule and signs of hypo/hyperglycemia' : 'signs/symptoms to report and medication schedule'}. Patient demonstrated ${diagnosis?.includes('wound') ? 'proper wound care technique' : diagnosis?.includes('diabetes') ? 'correct blood glucose testing technique' : 'comprehension of care instructions'} with 100% accuracy.`,
      
      'FUNCTIONAL ASSESSMENT': `Patient requires ${patientData?.functional_status?.adl_independence === 'total_assist' ? 'total assistance' : patientData?.functional_status?.adl_independence === 'moderate_assist' ? 'moderate assistance' : 'minimal assistance'} with ADLs including bathing, dressing, and transfers. Ambulation status: ${patientData?.functional_status?.ambulation || 'limited, uses assistive device'}. Patient demonstrates ${patientData?.functional_status?.cognitive_status === 'alert_oriented' ? 'intact cognition' : 'cognitive impairment requiring cueing and supervision'}. Fall risk: ${patientData?.functional_status?.fall_risk || 'moderate'} due to ${patientData?.functional_status?.ambulation === 'wheelchair' ? 'wheelchair use and transfer needs' : 'gait instability and environmental hazards'}.`,
      
      'SAFETY ASSESSMENT': `Home safety assessment completed. Identified ${patientData?.functional_status?.fall_risk === 'high' ? 'significant fall hazards including loose rugs, poor lighting, and bathroom safety concerns' : 'moderate safety concerns addressed during visit'}. Emergency call system ${patientData?.emergency_contact_phone ? 'in place, emergency contact verified' : 'discussed, patient able to access phone'}. ${patientData?.advance_directives?.dnr_status ? 'DNR status confirmed and documented' : 'Advance directives discussed'}. Patient/caregiver educated on safety measures and when to seek emergency care.`,
      
      'MEDICATION RECONCILIATION': `Current medications reviewed and reconciled with patient/caregiver. Patient taking ${patientData?.current_medications?.length || 0} medications as prescribed${patientData?.current_medications?.length > 0 ? ': ' + patientData.current_medications.slice(0, 3).map(m => m.name).join(', ') + (patientData.current_medications.length > 3 ? `, and ${patientData.current_medications.length - 3} others` : '') : ''}. No discrepancies noted. Patient/caregiver demonstrates understanding of medication purpose, dosing schedule, and potential side effects. Medication organizer in use to promote adherence.`,
      
      'VITAL SIGNS TRENDING': `Current vital signs: BP ${vitalSigns?.bp || 'not recorded'}, HR ${vitalSigns?.hr || 'not recorded'}, O2 sat ${vitalSigns?.o2 || 'not recorded'}%${vitalSigns?.temp ? `, Temp ${vitalSigns.temp}°F` : ''}. Compared to baseline${patientData?.baseline_vitals ? ` (BP ${patientData.baseline_vitals.blood_pressure_systolic}/${patientData.baseline_vitals.blood_pressure_diastolic}, HR ${patientData.baseline_vitals.heart_rate})` : ''}, patient demonstrates ${diagnosis?.includes('CHF') ? 'improved fluid balance' : diagnosis?.includes('COPD') ? 'stable respiratory status' : 'stable vital signs'}. ${vitalSigns?.bp && vitalSigns.bp.includes('/') && parseInt(vitalSigns.bp.split('/')[0]) > 140 ? 'Blood pressure elevated, patient educated on lifestyle modifications and medication compliance.' : 'Vital signs within expected parameters for diagnosis.'}`,
      
      'CARE PLAN PROGRESS': `Progress toward care plan goals assessed. ${diagnosis?.includes('wound') ? 'Wound healing progressing, size decreased from baseline' : diagnosis?.includes('CHF') ? 'Fluid balance improved, weight stable, reduced edema noted' : diagnosis?.includes('diabetes') ? 'Blood glucose trending toward target range, patient adherence improving' : 'Patient demonstrating gradual improvement in functional status'}. Will continue current plan of care with ongoing assessment and intervention. Next visit scheduled to reassess and modify plan as needed.`,
      
      'PAIN ASSESSMENT': `Pain assessment completed using 0-10 scale. Patient rates current pain as ${vitalSigns?.pain || '3'}/10${patientData?.pain_management?.pain_location?.length > 0 ? ` located in ${patientData.pain_management.pain_location[0]}` : ''}. ${patientData?.pain_management?.chronic_pain ? 'Chronic pain management plan reviewed' : 'Pain management discussed'}. Patient using ${patientData?.pain_management?.pain_interventions?.join(', ') || 'prescribed analgesics and non-pharmacological interventions'} with ${vitalSigns?.pain <= 5 ? 'adequate' : 'partial'} relief. Patient educated on pain scale, when to take medications, and non-pharmacological pain management techniques.`,
      
      'WOUND ASSESSMENT': `Wound assessment completed. ${patientData?.wounds?.length > 0 ? `${patientData.wounds[0].location} ${patientData.wounds[0].type} measures ${patientData.wounds[0].size_length}cm x ${patientData.wounds[0].size_width}cm x ${patientData.wounds[0].size_depth}cm. Wound bed shows ${patientData.wounds[0].stage === 'Stage I' ? 'intact skin with non-blanchable erythema' : 'appropriate healing with granulation tissue'}. Periwound skin intact, no signs of infection. Dressed with ${patientData.wounds[0].treatment_plan || 'appropriate dressing per protocol'}` : 'No active wounds noted'}. Patient/caregiver instructed on wound care technique, signs of infection, and when to notify nurse.`
    };

    return fixTemplates[element] || `Skilled nursing assessment and intervention provided. Patient demonstrates understanding and appropriate response to care.`;
  };

  const handleQuickFix = async (issue) => {
    setFixingIssue(issue.element || issue.name);
    
    // Simulate brief processing
    await new Promise(resolve => setTimeout(resolve, 500));
    
    const fixText = getFixText(issue);
    onApplyFix?.(fixText, issue.element || issue.name);
    
    setFixingIssue(null);
  };

  const handleFixAll = async () => {
    if (onFixAll) {
      const fixes = actionableIssues.map(issue => getFixText(issue));
      const elements = actionableIssues.map(i => i.element || i.name);
      onFixAll(fixes, elements);
    }
  };

  const startWizard = () => {
    setWizardMode(true);
    setCurrentStep(0);
  };

  const handleWizardNext = () => {
    if (currentStep < actionableIssues.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      setWizardMode(false);
      setCurrentStep(0);
    }
  };

  const handleWizardApply = () => {
    const issue = actionableIssues[currentStep];
    handleQuickFix(issue);
    handleWizardNext();
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  if (actionableIssues.length === 0) {
    return (
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-4 text-center">
          <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
          <p className="text-sm font-medium text-green-800">All Compliance Issues Resolved!</p>
          <p className="text-xs text-green-600">Your note meets all documentation requirements</p>
        </CardContent>
      </Card>
    );
  }

  if (wizardMode) {
    const currentIssue = actionableIssues[currentStep];
    const progressPercent = ((currentStep + 1) / actionableIssues.length) * 100;

    return (
      <Card className="border-purple-200 bg-gradient-to-b from-purple-50 to-white">
        <CardHeader className="py-3">
          <CardTitle className="text-sm flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wand2 className="w-4 h-4 text-purple-600" />
              <span>Guided Compliance Wizard</span>
            </div>
            <Badge className="bg-purple-600 text-white">
              {currentStep + 1} of {actionableIssues.length}
            </Badge>
          </CardTitle>
        </CardHeader>

        <CardContent className="p-4 space-y-3">
          <Progress value={progressPercent} className="h-2" />

          <Alert className={`${getSeverityColor(currentIssue.severity || 'medium')}`}>
            <AlertTriangle className="w-4 h-4" />
            <AlertDescription>
              <p className="font-semibold text-sm mb-1">{currentIssue.element || currentIssue.name}</p>
              <p className="text-xs mb-2">{currentIssue.issue || currentIssue.problem || 'Missing required documentation'}</p>
              
              <div className="bg-white p-3 rounded border mt-3">
                <p className="text-xs font-semibold mb-1">Suggested Fix:</p>
                <p className="text-xs text-gray-700 italic mb-3">
                  "{getFixText(currentIssue).substring(0, 200)}..."
                </p>
                
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    className="flex-1 bg-purple-600 hover:bg-purple-700"
                    onClick={handleWizardApply}
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1" /> Apply Fix
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleWizardNext}
                  >
                    Skip
                  </Button>
                </div>
              </div>
            </AlertDescription>
          </Alert>

          <div className="flex justify-between text-xs text-gray-500">
            <span>{actionableIssues.length - currentStep - 1} issues remaining</span>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
              onClick={() => setWizardMode(false)}
            >
              Exit Wizard
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-purple-200 bg-gradient-to-b from-purple-50 to-white">
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Quick Compliance Fixes</span>
            <Badge className="bg-purple-600 text-white">
              {actionableIssues.length} issues
            </Badge>
          </div>
          <Button
            size="sm"
            onClick={handleFixAll}
            className="h-7 bg-purple-600 hover:bg-purple-700"
          >
            <Wand2 className="w-3 h-3 mr-1" /> Fix All
          </Button>
        </CardTitle>
      </CardHeader>

      <CardContent className="p-3 space-y-2">
        <Button
          size="sm"
          variant="outline"
          className="w-full mb-2"
          onClick={startWizard}
        >
          <Play className="w-4 h-4 mr-2" /> Start Guided Wizard
        </Button>

        <div className="space-y-2 max-h-[400px] overflow-y-auto">
          {actionableIssues.map((issue, idx) => (
            <div 
              key={idx} 
              className={`p-2 rounded border ${getSeverityColor(issue.severity || 'medium')}`}
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <p className="text-xs font-semibold">{issue.element || issue.name}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">
                    {issue.suggestion || issue.problem || 'Required for compliance'}
                  </p>
                </div>
                <Badge className={getSeverityColor(issue.severity || 'medium')}>
                  {issue.severity || 'medium'}
                </Badge>
              </div>

              <Button
                size="sm"
                className="w-full h-7 text-xs bg-purple-600 hover:bg-purple-700"
                onClick={() => handleQuickFix(issue)}
                disabled={fixingIssue === (issue.element || issue.name)}
              >
                {fixingIssue === (issue.element || issue.name) ? (
                  <><Loader2 className="w-3 h-3 mr-1 animate-spin" /> Applying...</>
                ) : (
                  <><CheckCircle2 className="w-3 h-3 mr-1" /> One-Click Fix</>
                )}
              </Button>
            </div>
          ))}
        </div>

        {appliedFixes.length > 0 && (
          <Alert className="bg-green-50 border-green-200 mt-3">
            <CheckCircle2 className="w-4 h-4 text-green-600" />
            <AlertDescription className="text-xs text-green-800">
              Fixed {appliedFixes.length} issue{appliedFixes.length > 1 ? 's' : ''}! 
              {actionableIssues.length > 0 && ` ${actionableIssues.length} remaining.`}
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  );
}
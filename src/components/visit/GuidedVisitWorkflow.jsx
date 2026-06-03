import { useState, useEffect } from "react";
import { invokeLLM } from "@/lib/invokeLLM";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Lightbulb,
  AlertCircle,
  Sparkles,
  Activity,
  FileText,
  Stethoscope,
  Target,
  ClipboardCheck
} from "lucide-react";

const VISIT_TYPE_WORKFLOWS = {
  admission: [
    { id: 'demographics', title: 'Demographics & Insurance', icon: FileText },
    { id: 'clinical_assessment', title: 'Clinical Assessment', icon: Stethoscope },
    { id: 'vitals', title: 'Vital Signs', icon: Activity },
    { id: 'medications', title: 'Medication Review', icon: ClipboardCheck },
    { id: 'care_plan', title: 'Care Plan Setup', icon: Target },
    { id: 'teaching', title: 'Patient Teaching', icon: Lightbulb },
    { id: 'documentation', title: 'Final Documentation', icon: FileText }
  ],
  routine_visit: [
    { id: 'vitals', title: 'Vital Signs', icon: Activity },
    { id: 'assessment', title: 'Assessment', icon: Stethoscope },
    { id: 'interventions', title: 'Interventions', icon: ClipboardCheck },
    { id: 'teaching', title: 'Patient Teaching', icon: Lightbulb },
    { id: 'documentation', title: 'Documentation', icon: FileText }
  ],
  recertification: [
    { id: 'vitals', title: 'Vital Signs', icon: Activity },
    { id: 'comprehensive_assessment', title: 'Comprehensive Assessment', icon: Stethoscope },
    { id: 'progress_review', title: 'Progress Review', icon: Target },
    { id: 'care_plan_update', title: 'Care Plan Update', icon: Target },
    { id: 'documentation', title: 'Documentation', icon: FileText }
  ],
  discharge: [
    { id: 'final_assessment', title: 'Final Assessment', icon: Stethoscope },
    { id: 'goals_achieved', title: 'Goals Achieved', icon: CheckCircle2 },
    { id: 'discharge_teaching', title: 'Discharge Teaching', icon: Lightbulb },
    { id: 'documentation', title: 'Discharge Summary', icon: FileText }
  ]
};

export default function GuidedVisitWorkflow({ 
  patientData, 
  visitType, 
  carePlans = [],
  recentVisits = [],
  onComplete 
}) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [formData, setFormData] = useState({});
  const [smartSuggestions, setSmartSuggestions] = useState([]);
  const [isGeneratingSuggestions, setIsGeneratingSuggestions] = useState(false);
  const [completedSteps, setCompletedSteps] = useState([]);

  const workflow = VISIT_TYPE_WORKFLOWS[visitType] || VISIT_TYPE_WORKFLOWS.routine_visit;
  const currentStep = workflow[currentStepIndex];
  const progress = ((currentStepIndex + 1) / workflow.length) * 100;

  // Pre-fill data when patient or step changes
  useEffect(() => {
    prefillStepData(currentStep.id);
  }, [currentStepIndex, patientData]);

  // Generate smart suggestions when step changes
  useEffect(() => {
    generateSmartSuggestions(currentStep.id);
  }, [currentStepIndex]);

  const prefillStepData = (stepId) => {
    const prefilled = {};

    switch (stepId) {
      case 'demographics':
        if (patientData) {
          prefilled.name = `${patientData.first_name} ${patientData.last_name}`;
          prefilled.dob = patientData.date_of_birth;
          prefilled.address = patientData.address;
          prefilled.phone = patientData.phone;
          prefilled.insurance_primary = patientData.insurance_primary?.provider || '';
          prefilled.emergency_contact = patientData.emergency_contact_name || '';
          prefilled.emergency_phone = patientData.emergency_contact_phone || '';
        }
        break;

      case 'vitals':
        if (patientData?.baseline_vitals) {
          const baseline = patientData.baseline_vitals;
          prefilled.previous_bp = baseline.blood_pressure_systolic && baseline.blood_pressure_diastolic
            ? `${baseline.blood_pressure_systolic}/${baseline.blood_pressure_diastolic}`
            : '';
          prefilled.previous_hr = baseline.heart_rate || '';
          prefilled.previous_temp = baseline.temperature || '';
          prefilled.previous_o2 = baseline.oxygen_saturation || '';
        }
        break;

      case 'medications':
        if (patientData?.current_medications) {
          prefilled.medications = patientData.current_medications;
        }
        break;

      case 'care_plan':
      case 'care_plan_update':
        if (carePlans.length > 0) {
          prefilled.active_care_plans = carePlans.filter(cp => cp.status === 'active');
        }
        break;

      case 'assessment':
      case 'comprehensive_assessment':
        if (recentVisits.length > 0) {
          prefilled.last_visit_date = recentVisits[0].visit_date;
          prefilled.last_visit_summary = recentVisits[0].nurse_notes?.substring(0, 200);
        }
        break;
    }

    setFormData(prev => ({ ...prev, [stepId]: { ...prefilled, ...(prev[stepId] || {}) } }));
  };

  const generateSmartSuggestions = async (stepId) => {
    if (!patientData) return;
    
    setIsGeneratingSuggestions(true);
    
    try {
      const context = buildContextForAI(stepId);
      
      const result = await invokeLLM({
        prompt: `You are a home health nursing assistant. Based on the following context, provide 3-5 brief, actionable suggestions for the ${currentStep.title} step.

Context:
${context}

Provide specific suggestions that would help the nurse complete this step efficiently. Return as JSON with a suggestions array.`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: { type: "array", items: { type: "string" } }
          }
        }
      });

      setSmartSuggestions(result?.suggestions || []);
    } catch (error) {
      console.error('Error generating suggestions:', error);
      setSmartSuggestions([]);
    } finally {
      setIsGeneratingSuggestions(false);
    }
  };

  const buildContextForAI = (stepId) => {
    let context = `Patient: ${patientData?.first_name} ${patientData?.last_name}\n`;
    context += `Visit Type: ${visitType}\n`;
    context += `Current Step: ${currentStep.title}\n\n`;

    if (patientData?.primary_diagnosis) {
      context += `Primary Diagnosis: ${patientData.primary_diagnosis}\n`;
    }

    if (patientData?.allergies) {
      context += `Allergies: ${patientData.allergies}\n`;
    }

    if (recentVisits.length > 0) {
      context += `\nRecent Visit Notes:\n${recentVisits[0].nurse_notes?.substring(0, 300)}\n`;
    }

    if (carePlans.length > 0) {
      context += `\nActive Care Plan Goals:\n`;
      carePlans.filter(cp => cp.status === 'active').forEach(cp => {
        context += `- ${cp.goal}\n`;
      });
    }

    // Add data from previous steps
    Object.keys(formData).forEach(key => {
      if (key !== stepId) {
        context += `\n${key} data: ${JSON.stringify(formData[key]).substring(0, 100)}\n`;
      }
    });

    return context;
  };

  const updateFormField = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [currentStep.id]: {
        ...(prev[currentStep.id] || {}),
        [field]: value
      }
    }));
  };

  const getFieldValue = (field) => {
    return formData[currentStep.id]?.[field] || '';
  };

  const isStepComplete = () => {
    const stepData = formData[currentStep.id] || {};
    const requiredFields = getRequiredFields(currentStep.id);
    return requiredFields.every(field => stepData[field] && stepData[field].length > 0);
  };

  const getRequiredFields = (stepId) => {
    switch (stepId) {
      case 'vitals':
        return ['bp', 'hr', 'temp', 'o2'];
      case 'assessment':
        return ['assessment_notes'];
      case 'interventions':
        return ['interventions'];
      case 'teaching':
        return ['teaching_provided'];
      case 'documentation':
        return ['summary'];
      default:
        return [];
    }
  };

  const handleNext = () => {
    if (!completedSteps.includes(currentStep.id)) {
      setCompletedSteps(prev => [...prev, currentStep.id]);
    }
    
    if (currentStepIndex < workflow.length - 1) {
      setCurrentStepIndex(prev => prev + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(prev => prev - 1);
    }
  };

  const handleComplete = () => {
    onComplete?.(formData);
  };

  const applySuggestion = (suggestion) => {
    const field = getMainFieldForStep(currentStep.id);
    const currentValue = getFieldValue(field);
    const newValue = currentValue 
      ? `${currentValue}\n• ${suggestion}`
      : `• ${suggestion}`;
    updateFormField(field, newValue);
  };

  const getMainFieldForStep = (stepId) => {
    const fieldMap = {
      assessment: 'assessment_notes',
      interventions: 'interventions',
      teaching: 'teaching_provided',
      documentation: 'summary',
      comprehensive_assessment: 'assessment_notes'
    };
    return fieldMap[stepId] || 'notes';
  };

  return (
    <div className="space-y-4">
      {/* Progress Header */}
      <Card className="bg-gradient-to-r from-blue-100 to-indigo-100 border-2 border-blue-300">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between mb-2">
            <CardTitle className="text-xl font-bold text-blue-900">
              Step {currentStepIndex + 1} of {workflow.length}: {currentStep.title}
            </CardTitle>
            <Badge className={isStepComplete() ? 'bg-green-600 text-white text-sm px-3 py-1' : 'bg-slate-500 text-white text-sm px-3 py-1'}>
              {completedSteps.length}/{workflow.length} Complete
            </Badge>
          </div>
          <Progress value={progress} className="h-3" />
        </CardHeader>
      </Card>

      {/* Workflow Steps */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {workflow.map((step, idx) => {
          const StepIcon = step.icon;
          const isCompleted = completedSteps.includes(step.id);
          const isCurrent = idx === currentStepIndex;
          
          return (
            <Button
              key={step.id}
              variant={isCurrent ? 'default' : 'outline'}
              size="default"
              onClick={() => setCurrentStepIndex(idx)}
              className={`flex-shrink-0 min-h-[44px] font-semibold ${
                isCompleted ? 'border-2 border-green-500 bg-green-50' : ''
              } ${isCurrent ? 'bg-blue-600 hover:bg-blue-700 text-white' : 'hover:bg-slate-100'}`}
            >
              <StepIcon className="w-5 h-5 mr-2" />
              {step.title}
              {isCompleted && <CheckCircle2 className="w-5 h-5 ml-2 text-green-600" />}
            </Button>
          );
        })}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Form Section */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <currentStep.icon className="w-5 h-5" />
                {currentStep.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {renderStepContent(currentStep.id, { 
                formData: formData[currentStep.id] || {}, 
                updateField: updateFormField,
                getValue: getFieldValue,
                patientData,
                carePlans,
                recentVisits
              })}

              {/* Navigation Buttons */}
              <div className="flex justify-between pt-4">
                <Button
                  variant="outline"
                  onClick={handleBack}
                  disabled={currentStepIndex === 0}
                  size="lg"
                  className="min-h-[48px] font-semibold text-base"
                >
                  <ChevronLeft className="w-5 h-5 mr-2" />
                  Back
                </Button>
                <Button
                  onClick={handleNext}
                  disabled={!isStepComplete()}
                  size="lg"
                  className="bg-blue-600 hover:bg-blue-700 text-white min-h-[48px] font-semibold text-base px-6"
                >
                  {currentStepIndex === workflow.length - 1 ? 'Complete Visit' : 'Next Step'}
                  <ChevronRight className="w-5 h-5 ml-2" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Smart Suggestions Sidebar */}
        <div className="space-y-4">
          <Card className="border-2 border-indigo-400 shadow-lg">
            <CardHeader className="bg-gradient-to-r from-indigo-100 to-purple-100 border-b-2 border-indigo-200">
              <CardTitle className="text-lg font-bold flex items-center gap-2 text-indigo-900">
                <Sparkles className="w-5 h-5 text-indigo-700" />
                Smart Suggestions
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-3">
              {isGeneratingSuggestions ? (
                <div className="text-center py-4">
                  <Sparkles className="w-6 h-6 animate-spin mx-auto text-indigo-600" />
                  <p className="text-sm text-slate-600 mt-2">Generating suggestions...</p>
                </div>
              ) : smartSuggestions.length > 0 ? (
                smartSuggestions.map((suggestion, idx) => (
                  <Alert key={idx} className="cursor-pointer hover:bg-indigo-100 border-2 border-indigo-300 bg-indigo-50" onClick={() => applySuggestion(suggestion)}>
                    <Lightbulb className="w-5 h-5 text-indigo-700" />
                    <AlertDescription className="text-sm text-indigo-900 font-medium">
                      {suggestion}
                      <Button variant="default" size="sm" className="ml-2 h-7 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">Add</Button>
                    </AlertDescription>
                  </Alert>
                ))
              ) : (
                <p className="text-sm text-slate-500">No suggestions available</p>
              )}
            </CardContent>
          </Card>

          {/* Pre-filled Data Indicator */}
          {Object.keys(formData[currentStep.id] || {}).filter(k => 
            formData[currentStep.id][k] && k.startsWith('previous_')
          ).length > 0 && (
            <Alert className="bg-blue-100 border-2 border-blue-400">
              <AlertCircle className="w-5 h-5 text-blue-700" />
              <AlertDescription className="text-sm text-blue-900 font-semibold">
                Previous data has been pre-filled for reference
              </AlertDescription>
            </Alert>
          )}
        </div>
      </div>
    </div>
  );
}

function renderStepContent(stepId, { _formData, updateField, getValue, _patientData, _carePlans, _recentVisits }) {
  switch (stepId) {
    case 'vitals':
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Blood Pressure</Label>
              <Input
                placeholder="120/80"
                value={getValue('bp')}
                onChange={(e) => updateField('bp', e.target.value)}
              />
              {getValue('previous_bp') && (
                <p className="text-xs text-slate-500 mt-1">Previous: {getValue('previous_bp')}</p>
              )}
            </div>
            <div>
              <Label>Heart Rate</Label>
              <Input
                type="number"
                placeholder="72"
                value={getValue('hr')}
                onChange={(e) => updateField('hr', e.target.value)}
              />
              {getValue('previous_hr') && (
                <p className="text-xs text-slate-500 mt-1">Previous: {getValue('previous_hr')}</p>
              )}
            </div>
            <div>
              <Label>Temperature (°F)</Label>
              <Input
                type="number"
                step="0.1"
                placeholder="98.6"
                value={getValue('temp')}
                onChange={(e) => updateField('temp', e.target.value)}
              />
            </div>
            <div>
              <Label>O2 Saturation (%)</Label>
              <Input
                type="number"
                placeholder="98"
                value={getValue('o2')}
                onChange={(e) => updateField('o2', e.target.value)}
              />
            </div>
          </div>
        </div>
      );

    case 'assessment':
    case 'comprehensive_assessment':
      return (
        <div className="space-y-4">
          {getValue('last_visit_summary') && (
            <Alert className="bg-blue-100 border-2 border-blue-400">
              <AlertDescription className="text-sm text-blue-900 font-medium">
                <strong className="text-blue-950">Last Visit ({getValue('last_visit_date')}):</strong><br />
                {getValue('last_visit_summary')}...
              </AlertDescription>
            </Alert>
          )}
          <div>
            <Label>Assessment Notes</Label>
            <Textarea
              placeholder="Document your assessment findings..."
              value={getValue('assessment_notes')}
              onChange={(e) => updateField('assessment_notes', e.target.value)}
              className="min-h-[200px]"
            />
          </div>
        </div>
      );

    case 'interventions':
      return (
        <div className="space-y-4">
          <div>
            <Label>Interventions Performed</Label>
            <Textarea
              placeholder="List interventions performed during this visit..."
              value={getValue('interventions')}
              onChange={(e) => updateField('interventions', e.target.value)}
              className="min-h-[150px]"
            />
          </div>
        </div>
      );

    case 'teaching':
    case 'discharge_teaching':
      return (
        <div className="space-y-4">
          <div>
            <Label>Patient/Caregiver Teaching</Label>
            <Textarea
              placeholder="Document teaching provided and patient/caregiver understanding..."
              value={getValue('teaching_provided')}
              onChange={(e) => updateField('teaching_provided', e.target.value)}
              className="min-h-[150px]"
            />
          </div>
        </div>
      );

    case 'care_plan':
    case 'care_plan_update':
      return (
        <div className="space-y-4">
          {getValue('active_care_plans')?.length > 0 && (
            <Alert className="bg-green-100 border-2 border-green-400">
              <AlertDescription>
                <strong className="text-green-950 font-bold">Active Care Plans:</strong>
                <ul className="mt-2 space-y-1">
                  {getValue('active_care_plans').map((cp, idx) => (
                    <li key={idx} className="text-sm text-green-900 font-medium">• {cp.goal}</li>
                  ))}
                </ul>
              </AlertDescription>
            </Alert>
          )}
          <div>
            <Label>Care Plan Updates/Notes</Label>
            <Textarea
              placeholder="Document progress toward goals and any care plan updates..."
              value={getValue('care_plan_notes')}
              onChange={(e) => updateField('care_plan_notes', e.target.value)}
              className="min-h-[150px]"
            />
          </div>
        </div>
      );

    case 'documentation':
      return (
        <div className="space-y-4">
          <div>
            <Label>Visit Summary</Label>
            <Textarea
              placeholder="Comprehensive visit summary..."
              value={getValue('summary')}
              onChange={(e) => updateField('summary', e.target.value)}
              className="min-h-[200px]"
            />
          </div>
        </div>
      );

    default:
      return (
        <div>
          <Label>Notes</Label>
          <Textarea
            placeholder="Enter notes..."
            value={getValue('notes')}
            onChange={(e) => updateField('notes', e.target.value)}
            className="min-h-[150px]"
          />
        </div>
      );
  }
}
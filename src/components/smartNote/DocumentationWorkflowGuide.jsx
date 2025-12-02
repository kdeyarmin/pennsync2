import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  User,
  Activity,
  FileText,
  Mic,
  Sparkles,
  Shield,
  CheckCircle2,
  ChevronRight
} from "lucide-react";

const steps = [
  { id: 'patient', label: 'Select Patient', icon: User, key: 'patientSelected' },
  { id: 'vitals', label: 'Enter Vitals', icon: Activity, key: 'vitalsEntered' },
  { id: 'template', label: 'Use Template', icon: FileText, key: 'templateUsed', optional: true },
  { id: 'dictate', label: 'Document Notes', icon: Mic, key: 'notesEntered' },
  { id: 'enhance', label: 'AI Enhance', icon: Sparkles, key: 'noteEnhanced' },
  { id: 'compliance', label: 'Review & Copy', icon: Shield, key: 'compliancePassed' }
];

export default function DocumentationWorkflowGuide({
  patientSelected,
  vitalsEntered,
  templateUsed,
  notesEntered,
  noteEnhanced,
  compliancePassed,
  onStepClick
}) {
  const progress = {
    patientSelected,
    vitalsEntered,
    templateUsed,
    notesEntered,
    noteEnhanced,
    compliancePassed
  };

  const getStepStatus = (step) => {
    if (progress[step.key]) return 'completed';
    
    // Find current step (first incomplete non-optional step)
    const currentIdx = steps.findIndex(s => !s.optional && !progress[s.key]);
    const stepIdx = steps.findIndex(s => s.id === step.id);
    
    if (stepIdx === currentIdx) return 'current';
    if (stepIdx < currentIdx) return 'completed';
    return 'pending';
  };

  const completedCount = steps.filter(s => progress[s.key]).length;
  const progressPercent = Math.round((completedCount / steps.length) * 100);

  return (
    <Card className="border-indigo-200 bg-gradient-to-r from-indigo-50/50 to-purple-50/50">
      <CardContent className="p-3">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-semibold text-indigo-900">Documentation Progress</span>
          <Badge variant="outline" className={
            progressPercent === 100 ? 'bg-green-100 text-green-800' :
            progressPercent >= 50 ? 'bg-blue-100 text-blue-800' :
            'bg-gray-100 text-gray-800'
          }>
            {progressPercent}%
          </Badge>
        </div>
        
        {/* Progress bar */}
        <div className="h-1.5 bg-gray-200 rounded-full mb-3 overflow-hidden">
          <div 
            className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        {/* Steps */}
        <div className="flex items-center justify-between gap-1">
          {steps.map((step, idx) => {
            const status = getStepStatus(step);
            const StepIcon = step.icon;
            
            return (
              <React.Fragment key={step.id}>
                <button
                  onClick={() => onStepClick?.(step.id)}
                  className={`flex flex-col items-center gap-1 p-1.5 rounded-lg transition-all flex-1 min-w-0 ${
                    status === 'completed' ? 'bg-green-100' :
                    status === 'current' ? 'bg-indigo-100 ring-2 ring-indigo-400' :
                    'bg-gray-100 opacity-50'
                  }`}
                  title={step.label}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                    status === 'completed' ? 'bg-green-500 text-white' :
                    status === 'current' ? 'bg-indigo-500 text-white' :
                    'bg-gray-300 text-gray-600'
                  }`}>
                    {status === 'completed' ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <StepIcon className="w-3 h-3" />
                    )}
                  </div>
                  <span className={`text-[9px] font-medium truncate w-full text-center ${
                    status === 'current' ? 'text-indigo-700' :
                    status === 'completed' ? 'text-green-700' :
                    'text-gray-500'
                  }`}>
                    {step.label}
                  </span>
                </button>
                {idx < steps.length - 1 && (
                  <ChevronRight className={`w-3 h-3 flex-shrink-0 ${
                    progress[step.key] ? 'text-green-400' : 'text-gray-300'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
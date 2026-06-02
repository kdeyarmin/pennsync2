import React from "react";
import { CheckCircle2, User, Activity, FileText, Sparkles, ClipboardCheck } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const stepConfig = [
  { id: 'patient', label: 'Patient', icon: User, tip: 'Select patient & visit type' },
  { id: 'vitals', label: 'Vitals', icon: Activity, tip: 'Enter vital signs' },
  { id: 'notes', label: 'Notes', icon: FileText, tip: 'Type or dictate your notes' },
  { id: 'enhance', label: 'Enhance', icon: Sparkles, tip: 'AI enhances your notes' },
  { id: 'review', label: 'Review', icon: ClipboardCheck, tip: 'Review & copy to EHR' },
];

export default function ImprovedStepIndicator({ currentStep, completedSteps = [], onStepClick }) {
  const currentIndex = stepConfig.findIndex(s => s.id === currentStep);

  return (
    <TooltipProvider>
      <div className="bg-white border rounded-xl p-3 mb-4 shadow-sm">
        <div className="flex items-center justify-between">
          {stepConfig.map((step, index) => {
            const isCompleted = completedSteps.includes(step.id);
            const isCurrent = step.id === currentStep;
            const isPast = index < currentIndex;
            const isClickable = isCompleted || isPast || index <= currentIndex;
            const Icon = step.icon;

            return (
              <React.Fragment key={step.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => isClickable && onStepClick?.(step.id)}
                      disabled={!isClickable}
                      className={`flex flex-col items-center gap-1 p-2 rounded-lg transition-all ${
                        isCurrent 
                          ? 'bg-blue-100 text-blue-700 scale-105' 
                          : isCompleted || isPast 
                            ? 'text-green-600 hover:bg-green-50 cursor-pointer' 
                            : 'text-slate-300 cursor-not-allowed'
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isCurrent 
                          ? 'bg-blue-600 text-white' 
                          : isCompleted || isPast 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-slate-100 text-slate-400'
                      }`}>
                        {isCompleted || isPast ? (
                          <CheckCircle2 className="w-5 h-5" />
                        ) : (
                          <Icon className="w-4 h-4" />
                        )}
                      </div>
                      <span className={`text-xs font-medium ${
                        isCurrent ? 'text-blue-700' : 
                        isCompleted || isPast ? 'text-green-600' : 'text-slate-400'
                      }`}>
                        {step.label}
                      </span>
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom">
                    <p className="text-xs">{step.tip}</p>
                  </TooltipContent>
                </Tooltip>

                {index < stepConfig.length - 1 && (
                  <div className={`flex-1 h-0.5 mx-1 rounded ${
                    index < currentIndex ? 'bg-green-400' : 'bg-slate-200'
                  }`} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* Progress text */}
        <div className="mt-2 text-center">
          <p className="text-xs text-slate-500">
            Step {currentIndex + 1} of {stepConfig.length}: <span className="font-medium text-slate-700">{stepConfig[currentIndex]?.tip}</span>
          </p>
        </div>
      </div>
    </TooltipProvider>
  );
}
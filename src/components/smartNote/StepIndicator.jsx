import React from "react";
import { CheckCircle2, Circle, ChevronRight } from "lucide-react";

const steps = [
  { id: 'patient', label: 'Patient' },
  { id: 'vitals', label: 'Vitals' },
  { id: 'notes', label: 'Notes' },
  { id: 'enhance', label: 'Enhance' },
  { id: 'review', label: 'Review' },
];

export default function StepIndicator({ currentStep, completedSteps = [] }) {
  const currentIndex = steps.findIndex(s => s.id === currentStep);

  return (
    <div className="flex items-center justify-between bg-white border rounded-lg p-2 mb-4 overflow-x-auto">
      {steps.map((step, index) => {
        const isCompleted = completedSteps.includes(step.id);
        const isCurrent = step.id === currentStep;
        const isPast = index < currentIndex;

        return (
          <React.Fragment key={step.id}>
            <div className={`flex items-center gap-1.5 px-2 py-1 rounded-md transition-colors flex-shrink-0 ${
              isCurrent ? 'bg-blue-100 text-blue-700' : 
              isCompleted || isPast ? 'text-green-600' : 'text-gray-400'
            }`}>
              {isCompleted || isPast ? (
                <CheckCircle2 className="w-4 h-4" />
              ) : (
                <Circle className={`w-4 h-4 ${isCurrent ? 'fill-blue-600 text-blue-600' : ''}`} />
              )}
              <span className="text-xs font-medium whitespace-nowrap">{step.label}</span>
            </div>
            {index < steps.length - 1 && (
              <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
<<<<<<< HEAD
import { FileText, Sparkles, CheckCircle2 } from "lucide-react";

const STEPS = [
  { label: "Write", icon: FileText },
  { label: "Generate", icon: Sparkles },
];

export default function StepIndicator({ step }) {
  return (
    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
      {STEPS.map((s, i) => {
        const n = i + 1;
        const active = step === n;
        const done = step > n;
        return (
          <div key={n} className="flex items-center">
            <div className={`flex items-center gap-1.5 text-xs font-semibold ${active ? "text-indigo-700" : done ? "text-green-600" : "text-gray-400"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${active ? "bg-indigo-600 text-white" : done ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"}`}>
                {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : n}
              </div>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-0.5 bg-gray-200 mx-1">
                <div className={`h-full ${step > n ? "bg-green-400 w-full" : "w-0"} transition-all duration-500`} />
              </div>
=======
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
          <div key={step.id} className="flex items-center gap-1">
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
>>>>>>> origin/main
            )}
          </div>
        );
      })}
    </div>
  );
}
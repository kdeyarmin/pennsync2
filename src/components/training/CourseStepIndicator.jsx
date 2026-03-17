import { Check, BookOpen, ClipboardCheck, FileQuestion, Award } from "lucide-react";

const STEPS = [
  { key: "objectives", label: "Overview", icon: BookOpen },
  { key: "content",    label: "Content",  icon: ClipboardCheck },
  { key: "test",       label: "Quiz",     icon: FileQuestion },
  { key: "result",     label: "Result",   icon: Award },
];

// attestation is hidden from the stepper bar — it sits between content and quiz
const STEP_ORDER = ["objectives", "content", "attestation", "test", "result"];

export default function CourseStepIndicator({ step }) {
  const currentIndex = STEP_ORDER.indexOf(step);

  return (
    <div className="flex items-center justify-center gap-0 w-full">
      {STEPS.map((s, i) => {
        const stepIndex = STEP_ORDER.indexOf(s.key);
        const done      = currentIndex > stepIndex;
        const active    = currentIndex === stepIndex || (s.key === "test" && step === "attestation");
        const Icon = s.icon;

        return (
          <div key={s.key} className="flex items-center flex-1 last:flex-none">
            {/* Circle */}
            <div className="flex flex-col items-center flex-shrink-0">
              <div
                className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-200 ${
                  done
                    ? "bg-emerald-500 border-emerald-500 text-white"
                    : active
                    ? "bg-blue-600 border-blue-600 text-white shadow-md shadow-blue-200"
                    : "bg-white border-slate-300 text-slate-400"
                }`}
              >
                {done ? <Check className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
              </div>
              <span
                className={`mt-1 text-[10px] font-semibold tracking-wide whitespace-nowrap ${
                  active ? "text-blue-600" : done ? "text-emerald-600" : "text-slate-400"
                }`}
              >
                {s.label}
              </span>
            </div>
            {/* Connector line */}
            {i < STEPS.length - 1 && (
              <div
                className={`flex-1 h-0.5 mx-1 mb-4 rounded-full transition-all duration-300 ${
                  done ? "bg-emerald-400" : "bg-slate-200"
                }`}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}
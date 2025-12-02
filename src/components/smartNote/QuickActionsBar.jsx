import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Copy,
  CheckCircle2,
  AlertTriangle,
  Mic,
  FileText,
  ClipboardCheck,
  ArrowRight,
  Zap
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function QuickActionsBar({
  currentStep,
  hasRoughNotes,
  hasEnhancedNote,
  isProcessing,
  compliancePassed,
  complianceIssuesCount = 0,
  onEnhance,
  onCopy,
  onStartDictation,
  onRunCompliance,
  copied
}) {
  // Determine the primary action based on current state
  const getPrimaryAction = () => {
    if (!hasRoughNotes) {
      return {
        label: "Start Dictation",
        icon: Mic,
        action: onStartDictation,
        color: "bg-blue-600 hover:bg-blue-700",
        hint: "Speak your observations"
      };
    }
    if (hasRoughNotes && !hasEnhancedNote) {
      return {
        label: "Enhance Note",
        icon: Sparkles,
        action: onEnhance,
        color: "bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700",
        hint: "AI will format your notes"
      };
    }
    if (hasEnhancedNote && !compliancePassed && complianceIssuesCount > 0) {
      return {
        label: "Fix Compliance",
        icon: AlertTriangle,
        action: onRunCompliance,
        color: "bg-orange-600 hover:bg-orange-700",
        hint: `${complianceIssuesCount} issue(s) to resolve`
      };
    }
    if (hasEnhancedNote) {
      return {
        label: copied ? "Copied!" : "Copy to EHR",
        icon: copied ? CheckCircle2 : Copy,
        action: onCopy,
        color: copied ? "bg-green-600" : "bg-green-600 hover:bg-green-700",
        hint: compliancePassed ? "Ready for your EHR" : "Copy enhanced note"
      };
    }
    return null;
  };

  const primaryAction = getPrimaryAction();

  const steps = [
    { id: 1, label: "Notes", complete: hasRoughNotes },
    { id: 2, label: "Enhance", complete: hasEnhancedNote },
    { id: 3, label: "Comply", complete: compliancePassed },
    { id: 4, label: "Copy", complete: copied }
  ];

  if (!primaryAction) return null;

  return (
    <motion.div
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t shadow-lg p-3 md:p-4"
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Progress Steps - Hidden on mobile */}
        <div className="hidden md:flex items-center gap-2">
          {steps.map((step, idx) => (
            <React.Fragment key={step.id}>
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm ${
                step.complete 
                  ? 'bg-green-100 text-green-800' 
                  : 'bg-gray-100 text-gray-500'
              }`}>
                {step.complete ? (
                  <CheckCircle2 className="w-4 h-4" />
                ) : (
                  <span className="w-4 h-4 rounded-full border-2 border-current flex items-center justify-center text-xs">
                    {step.id}
                  </span>
                )}
                <span className="font-medium">{step.label}</span>
              </div>
              {idx < steps.length - 1 && (
                <ArrowRight className="w-4 h-4 text-gray-300" />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Mobile Progress Indicator */}
        <div className="flex md:hidden items-center gap-2">
          <div className="flex gap-1">
            {steps.map((step) => (
              <div
                key={step.id}
                className={`w-2 h-2 rounded-full ${
                  step.complete ? 'bg-green-500' : 'bg-gray-300'
                }`}
              />
            ))}
          </div>
          <span className="text-xs text-gray-500">
            Step {steps.filter(s => s.complete).length + 1}/4
          </span>
        </div>

        {/* Primary Action */}
        <div className="flex items-center gap-3">
          <AnimatePresence mode="wait">
            <motion.div
              key={primaryAction.label}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="flex items-center gap-3"
            >
              <span className="hidden sm:block text-sm text-gray-500">
                {primaryAction.hint}
              </span>
              <Button
                onClick={primaryAction.action}
                disabled={isProcessing}
                size="lg"
                className={`${primaryAction.color} gap-2 px-6 shadow-lg`}
              >
                {isProcessing ? (
                  <>
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white" />
                    Processing...
                  </>
                ) : (
                  <>
                    <primaryAction.icon className="w-5 h-5" />
                    {primaryAction.label}
                  </>
                )}
              </Button>
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
}
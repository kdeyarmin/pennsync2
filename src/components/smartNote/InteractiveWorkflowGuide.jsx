import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  User,
  Activity,
  FileText,
  Sparkles,
  Shield,
  Copy,
  CheckCircle2,
  ArrowRight,
  Lightbulb
} from "lucide-react";
import { motion } from "framer-motion";

export default function InteractiveWorkflowGuide({
  patientSelected,
  vitalsEntered,
  templateUsed,
  notesEntered,
  noteEnhanced,
  compliancePassed,
  onStepClick,
  currentActiveStep
}) {
  const steps = [
    {
      id: 'patient',
      label: 'Patient',
      icon: User,
      complete: patientSelected,
      description: 'Select a patient',
      tools: ['Patient History', 'AI Summary'],
      color: 'blue'
    },
    {
      id: 'vitals',
      label: 'Vitals',
      icon: Activity,
      complete: vitalsEntered,
      description: 'Record vital signs',
      tools: ['Voice Entry', 'Trend Analysis'],
      color: 'pink'
    },
    {
      id: 'document',
      label: 'Document',
      icon: FileText,
      complete: notesEntered,
      description: 'Enter observations',
      tools: ['Voice Dictation', 'Templates', 'Smart Fill'],
      color: 'purple'
    },
    {
      id: 'enhance',
      label: 'Enhance',
      icon: Sparkles,
      complete: noteEnhanced,
      description: 'AI enhancement',
      tools: ['Format', 'Expand', 'Terminology'],
      color: 'indigo'
    },
    {
      id: 'comply',
      label: 'Comply',
      icon: Shield,
      complete: compliancePassed,
      description: 'Check compliance',
      tools: ['Medicare Audit', 'Fixes'],
      color: 'green'
    },
    {
      id: 'copy',
      label: 'Copy',
      icon: Copy,
      complete: false,
      description: 'Copy to EHR',
      tools: ['Clipboard'],
      color: 'gray'
    }
  ];

  // Determine current step
  const getCurrentStepIndex = () => {
    if (!patientSelected) return 0;
    if (!vitalsEntered) return 1;
    if (!notesEntered) return 2;
    if (!noteEnhanced) return 3;
    if (!compliancePassed) return 4;
    return 5;
  };

  const currentStepIdx = getCurrentStepIndex();

  return (
    <div className="bg-white rounded-lg border p-3 mb-4">
      {/* Steps Row */}
      <div className="flex items-center justify-between gap-1 mb-3 overflow-x-auto pb-2">
        {(() => {
          const stepColors = {
            blue: { active: 'bg-blue-100 ring-2 ring-blue-400', circle: 'bg-blue-500 text-white', text: 'text-blue-700' },
            pink: { active: 'bg-pink-100 ring-2 ring-pink-400', circle: 'bg-pink-500 text-white', text: 'text-pink-700' },
            purple: { active: 'bg-purple-100 ring-2 ring-purple-400', circle: 'bg-purple-500 text-white', text: 'text-purple-700' },
            indigo: { active: 'bg-indigo-100 ring-2 ring-indigo-400', circle: 'bg-indigo-500 text-white', text: 'text-indigo-700' },
            green: { active: 'bg-green-100 ring-2 ring-green-400', circle: 'bg-green-500 text-white', text: 'text-green-700' },
            gray: { active: 'bg-gray-100 ring-2 ring-gray-400', circle: 'bg-gray-500 text-white', text: 'text-gray-700' },
          };
          return steps.map((step, idx) => {
          const isActive = idx === currentStepIdx;
          const isComplete = step.complete;
          const isPast = idx < currentStepIdx;
          const sc = stepColors[step.color] || stepColors.blue;

          return (
            <React.Fragment key={step.id}>
              <motion.button
                onClick={() => onStepClick(step.id)}
                className={`flex flex-col items-center p-2 rounded-lg transition-all min-w-[60px] ${
                  isActive
                    ? sc.active
                    : isComplete || isPast
                      ? 'bg-green-50 hover:bg-green-100'
                      : 'bg-gray-50 hover:bg-gray-100'
                }`}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center mb-1 ${
                  isComplete
                    ? 'bg-green-500 text-white'
                    : isActive
                      ? sc.circle
                      : 'bg-gray-200 text-gray-500'
                }`}>
                  {isComplete ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <step.icon className="w-4 h-4" />
                  )}
                </div>
                <span className={`text-xs font-medium ${
                  isActive ? sc.text : isComplete ? 'text-green-700' : 'text-gray-600'
                }`}>
                  {step.label}
                </span>
              </motion.button>

              {idx < steps.length - 1 && (
                <ArrowRight className={`w-4 h-4 flex-shrink-0 ${
                  idx < currentStepIdx ? 'text-green-400' : 'text-gray-300'
                }`} />
              )}
            </React.Fragment>
          );
        });
        })()}
      </div>

      {/* Current Step Details */}
      <motion.div
        key={currentStepIdx}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-3"
      >
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Lightbulb className="w-4 h-4 text-yellow-500" />
              <span className="text-sm font-semibold text-gray-800">
                {steps[currentStepIdx]?.description}
              </span>
            </div>
            <div className="flex flex-wrap gap-1">
              {steps[currentStepIdx]?.tools.map((tool, idx) => (
                <Badge key={idx} variant="outline" className="text-xs bg-white">
                  {tool}
                </Badge>
              ))}
            </div>
          </div>
          <Button
            size="sm"
            onClick={() => onStepClick(steps[currentStepIdx]?.id)}
            className="bg-blue-600 hover:bg-blue-700 text-xs"
          >
            Go
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
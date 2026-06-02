import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  Copy,
  Save,
  RotateCcw,
  ClipboardList,
  Loader2,
  CheckCircle2,
  Mic,
  MicOff
} from "lucide-react";

export default function QuickActionsBar({
  currentStep,
  isProcessing,
  isSaving,
  saved,
  copied,
  isListening,
  complianceScore,
  onEnhance,
  onCopy,
  onSave,
  onClear,
  onGenerateTasks,
  onToggleVoice
}) {
  // Don't show until notes step
  if (currentStep === 'patient' || currentStep === 'vitals') return null;

  const actions = [];

  // Voice control
  if (currentStep === 'notes' || currentStep === 'enhance') {
    actions.push({
      id: 'voice',
      label: isListening ? 'Stop Dictating' : 'Dictate',
      icon: isListening ? MicOff : Mic,
      variant: isListening ? 'destructive' : 'outline',
      onClick: onToggleVoice,
      className: isListening ? 'animate-pulse' : ''
    });
  }

  // Enhance button - show when on notes step
  if (currentStep === 'notes') {
    actions.push({
      id: 'enhance',
      label: 'Enhance with AI',
      icon: Sparkles,
      variant: 'default',
      onClick: onEnhance,
      disabled: isProcessing,
      className: 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700',
      loading: isProcessing
    });
  }

  // Enhanced note actions
  if (currentStep === 'enhance' || currentStep === 'review') {
    actions.push(
      {
        id: 'copy',
        label: copied ? 'Copied!' : 'Copy Note',
        icon: copied ? CheckCircle2 : Copy,
        variant: 'outline',
        onClick: onCopy,
        className: copied ? 'border-green-500 text-green-600' : ''
      },
      {
        id: 'save',
        label: saved ? 'Saved' : 'Save to Chart',
        icon: saved ? CheckCircle2 : Save,
        variant: 'default',
        onClick: onSave,
        disabled: isSaving,
        loading: isSaving,
        className: saved ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700'
      },
      {
        id: 'tasks',
        label: 'Tasks',
        icon: ClipboardList,
        variant: 'outline',
        onClick: onGenerateTasks
      }
    );
  }

  // Clear/New note - always show after notes step
  if (currentStep !== 'patient' && currentStep !== 'vitals') {
    actions.push({
      id: 'clear',
      label: 'New Note',
      icon: RotateCcw,
      variant: 'ghost',
      onClick: onClear,
      className: 'text-slate-500 hover:text-slate-700'
    });
  }

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 print:hidden">
      <div className="bg-white shadow-lg rounded-full border border-indigo-300 px-3 py-1.5 flex items-center gap-1.5">
        {complianceScore !== null && complianceScore !== undefined && (
          <Badge 
            className={`text-[10px] ${
              complianceScore >= 90 ? 'bg-green-100 text-green-800' :
              complianceScore >= 75 ? 'bg-yellow-100 text-yellow-800' :
              'bg-red-100 text-red-800'
            }`}
          >
            {complianceScore}%
          </Badge>
        )}
        
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <Button
              key={action.id}
              size="sm"
              variant={action.variant}
              onClick={action.onClick}
              disabled={action.disabled}
              className={`gap-0.5 text-xs px-2 py-0.5 h-auto ${action.className || ''}`}
            >
              {action.loading ? (
                <Loader2 className="w-2.5 h-2.5 animate-spin" />
              ) : (
                <Icon className="w-2.5 h-2.5" />
              )}
              <span className="hidden sm:inline text-[10px]">{action.label}</span>
            </Button>
          );
        })}
      </div>
    </div>
  );
}
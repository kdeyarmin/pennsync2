import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Brain, 
  Sparkles, 
  Copy, 
  ClipboardList, 
  RotateCcw,
  ArrowRight,
  Lightbulb
} from "lucide-react";
import ClinicalGuidelinesAssistant from "./ClinicalGuidelinesAssistant";
import OASISItemLinker from "./OASISItemLinker";

export default function DynamicAISidebar({
  _currentStep,
  hasPatient,
  hasNotes,
  hasEnhancedNote,
  diagnosis,
  complianceScore,
  patientData,
  vitalSigns,
  hasOASIS,
  oasisLinkedItems = [],
  onAction,
  onInsertGuideline,
  onAddOASISLink,
  onRemoveOASISLink
}) {
  // Determine which tools to show based on workflow step
  const getContent = () => {
    // Step 1: No patient selected - don't show sidebar
    if (!hasPatient) {
      return null;
    }

    // Step 2-3: Patient selected, working on notes
    if (!hasEnhancedNote) {
      return {
        title: hasNotes ? "✨ Ready to Enhance" : "📝 Document Visit",
        message: hasNotes 
          ? `AI will transform your notes into Medicare-compliant documentation${diagnosis ? ` optimized for ${diagnosis.split(' ')[0]}` : ''}`
          : "Enter your rough notes to get started",
        actions: hasNotes ? [
          { label: "Enhance with AI", action: "enhance", icon: Sparkles, primary: true }
        ] : [],
        showGuidelines: true,
        showOASISLinker: hasOASIS
      };
    }

    // Step 4: Enhanced note ready
    return {
      title: "🎉 Note Complete!",
      message: complianceScore 
        ? `${complianceScore}% Medicare compliant`
        : "Review and finalize your note",
      actions: [
        { label: "Copy to EHR", action: "copy", icon: Copy, primary: true },
        { label: "Generate Tasks", action: "tasks", icon: ClipboardList },
        { label: "Start New Note", action: "clear", icon: RotateCcw }
      ]
    };
  };

  const content = getContent();

  if (!content) return null;

  return (
    <div className="space-y-4">
      {/* Main AI Assistant Card */}
      <Card className="border-2 border-indigo-200 bg-gradient-to-b from-indigo-50 to-white sticky top-4">
        <CardHeader className="py-3 pb-2">
          <CardTitle className="text-sm flex items-center gap-2">
            <Brain className="w-4 h-4 text-indigo-600" />
            {content.title}
          </CardTitle>
        </CardHeader>
        <CardContent className="py-2 space-y-3">
          <p className="text-xs text-gray-600 flex items-start gap-2">
            <Lightbulb className="w-3 h-3 flex-shrink-0 mt-0.5 text-indigo-500" />
            {content.message}
          </p>

          {content.actions.length > 0 && (
            <div className="space-y-2">
              {content.actions.map((action, idx) => (
                <Button
                  key={idx}
                  size="sm"
                  variant={action.primary ? "default" : "outline"}
                  className={`w-full justify-between ${action.primary ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                  onClick={() => onAction?.(action.action)}
                >
                  <span className="flex items-center gap-2">
                    {action.icon && <action.icon className="w-3 h-3" />}
                    {action.label}
                  </span>
                  <ArrowRight className="w-4 h-4" />
                </Button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Clinical Guidelines - Only before enhancement */}
      {content.showGuidelines && diagnosis && (
        <ClinicalGuidelinesAssistant
          diagnosis={diagnosis}
          patientData={patientData}
          vitalSigns={vitalSigns}
          onInsertGuideline={onInsertGuideline}
        />
      )}

      {/* OASIS Item Linker - Only if OASIS data exists */}
      {content.showOASISLinker && hasOASIS && (
        <OASISItemLinker
          linkedItems={oasisLinkedItems}
          onAddLink={onAddOASISLink}
          onRemoveLink={onRemoveOASISLink}
          selectedText=""
        />
      )}
    </div>
  );
}
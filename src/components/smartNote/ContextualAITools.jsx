import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Brain,
  Sparkles,
  AlertTriangle,
  CheckCircle2,
  FileText,
  ChevronRight
} from "lucide-react";

export default function ContextualAITools({
  currentStep,
  hasPatient,
  hasNotes,
  hasEnhancedNote,
  complianceIssues = 0,
  suggestions = [],
  onAction
}) {
  // Show different tools based on workflow step
  const getContextualTools = () => {
    if (!hasPatient) {
      return {
        title: "Getting Started",
        icon: Brain,
        color: "blue",
        items: [
          { label: "Select a patient to begin", type: "info" }
        ]
      };
    }

    if (!hasNotes) {
      return {
        title: "Ready to Document",
        icon: FileText,
        color: "purple",
        items: [
          { label: "Use voice dictation", action: "dictate", type: "action" },
          { label: "Type your observations", type: "info" },
          { label: "AI will help format your notes", type: "info" }
        ]
      };
    }

    if (!hasEnhancedNote) {
      return {
        title: "Notes Ready",
        icon: Sparkles,
        color: "indigo",
        items: [
          { label: "Click 'Enhance with AI' to transform notes", action: "enhance", type: "action", primary: true },
          { label: "AI will add Medicare-compliant language", type: "info" }
        ]
      };
    }

    // After enhancement
    return {
      title: complianceIssues > 0 ? "Review Required" : "Ready to Copy",
      icon: complianceIssues > 0 ? AlertTriangle : CheckCircle2,
      color: complianceIssues > 0 ? "orange" : "green",
      items: [
        ...(complianceIssues > 0 ? [{ 
          label: `${complianceIssues} compliance issue(s) to review`, 
          action: "compliance", 
          type: "warning" 
        }] : []),
        ...(suggestions.length > 0 ? [{ 
          label: `${suggestions.length} suggestion(s) available`, 
          action: "suggestions", 
          type: "info" 
        }] : []),
        { label: "Copy to clipboard", action: "copy", type: "action", primary: complianceIssues === 0 },
        { label: "Generate tasks", action: "tasks", type: "action" },
        { label: "Update care plans", action: "careplans", type: "action" }
      ]
    };
  };

  const tools = getContextualTools();
  const colorClasses = {
    blue: "border-blue-200 bg-blue-50",
    purple: "border-purple-200 bg-purple-50",
    indigo: "border-indigo-200 bg-indigo-50",
    orange: "border-orange-200 bg-orange-50",
    green: "border-green-200 bg-green-50"
  };

  return (
    <Card className={`${colorClasses[tools.color]} border-2`}>
      <CardHeader className="py-3">
        <CardTitle className="text-sm flex items-center gap-2">
          <tools.icon className="w-4 h-4" />
          {tools.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="py-2 space-y-2">
        {tools.items.map((item, idx) => (
          <div key={idx} className="flex items-center justify-between">
            {item.type === 'action' ? (
              <Button
                size="sm"
                variant={item.primary ? "default" : "outline"}
                className={`w-full justify-between ${item.primary ? 'bg-indigo-600 hover:bg-indigo-700' : ''}`}
                onClick={() => onAction?.(item.action)}
              >
                {item.label}
                <ChevronRight className="w-4 h-4" />
              </Button>
            ) : item.type === 'warning' ? (
              <div className="flex items-center gap-2 text-orange-700 text-sm w-full p-2 bg-orange-100 rounded">
                <AlertTriangle className="w-4 h-4" />
                <span>{item.label}</span>
              </div>
            ) : (
              <p className="text-xs text-gray-600 flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-gray-400 rounded-full" />
                {item.label}
              </p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
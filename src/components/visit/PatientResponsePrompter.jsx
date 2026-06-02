import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Plus, CheckCircle2 } from "lucide-react";

const RESPONSE_PROMPTS = [
  {
    category: "Teaching Response",
    prompts: [
      "Patient verbalized understanding of medication purpose and administration.",
      "Patient demonstrated proper technique via return demonstration.",
      "Patient/caregiver able to state warning signs to report.",
      "Teaching reinforced; patient requires additional education."
    ]
  },
  {
    category: "Pain Response",
    prompts: [
      "Patient reports pain well controlled with current regimen.",
      "Patient reports improvement in pain level from previous visit.",
      "Patient reports pain not adequately controlled; physician notified.",
      "Non-pharmacological interventions provided with positive response."
    ]
  },
  {
    category: "Activity Response",
    prompts: [
      "Patient tolerating activity as prescribed without distress.",
      "Patient demonstrates improved endurance and mobility.",
      "Patient reports increased fatigue with activity; plan modified.",
      "Patient ambulating safely with assistive device as instructed."
    ]
  },
  {
    category: "Medication Response",
    prompts: [
      "Patient reports compliance with medication regimen.",
      "No adverse effects reported from current medications.",
      "Patient identified barriers to compliance; solutions discussed.",
      "Medication reconciliation completed; no discrepancies noted."
    ]
  }
];

export default function PatientResponsePrompter({ narrativeText, onAddSuggestion }) {
  const [addedPrompts, setAddedPrompts] = useState([]);

  const handleAddPrompt = (prompt) => {
    if (!addedPrompts.includes(prompt)) {
      setAddedPrompts([...addedPrompts, prompt]);
      onAddSuggestion(`\n${prompt}`);
    }
  };

  // Check if narrative already has response documentation
  const hasResponses = narrativeText?.toLowerCase().includes('patient') && 
    (narrativeText?.toLowerCase().includes('verbalized') || 
     narrativeText?.toLowerCase().includes('demonstrated') ||
     narrativeText?.toLowerCase().includes('reports') ||
     narrativeText?.toLowerCase().includes('tolerating'));

  if (hasResponses) {
    return null;
  }

  return (
    <Card className="border-orange-200 bg-orange-50">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2 text-orange-800">
          <MessageSquare className="w-4 h-4" />
          Patient Response Documentation
          <Badge variant="outline" className="ml-auto text-xs border-orange-300 text-orange-700">
            Medicare Required
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-2">
        <p className="text-xs text-orange-700 mb-3">
          Add patient response to interventions and teaching:
        </p>
        <div className="space-y-3">
          {RESPONSE_PROMPTS.map((category) => (
            <div key={category.category}>
              <p className="text-xs font-medium text-slate-600 mb-1">{category.category}</p>
              <div className="flex flex-wrap gap-1">
                {category.prompts.slice(0, 2).map((prompt, idx) => (
                  <Button
                    key={idx}
                    size="sm"
                    variant="outline"
                    className={`text-xs h-auto py-1 px-2 ${
                      addedPrompts.includes(prompt) 
                        ? 'bg-green-100 border-green-300 text-green-700' 
                        : 'hover:bg-orange-100'
                    }`}
                    onClick={() => handleAddPrompt(prompt)}
                    disabled={addedPrompts.includes(prompt)}
                  >
                    {addedPrompts.includes(prompt) ? (
                      <CheckCircle2 className="w-3 h-3 mr-1" />
                    ) : (
                      <Plus className="w-3 h-3 mr-1" />
                    )}
                    {prompt.substring(0, 40)}...
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
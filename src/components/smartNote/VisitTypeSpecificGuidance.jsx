import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  FileText,
  Calendar,
  LogOut,
  Clipboard,
  Loader2,
  Sparkles,
  CheckCircle2,
  Copy,
  ChevronDown,
  ChevronUp,
  AlertTriangle
} from "lucide-react";

const VISIT_TYPE_TEMPLATES = {
  admission: {
    icon: Calendar,
    color: "blue",
    title: "Start of Care (SOC)",
    requiredElements: [
      "Admission date and source (hospital/home/facility)",
      "Primary diagnosis with ICD-10 code",
      "Complete medication reconciliation",
      "Initial functional assessment (ADLs/IADLs)",
      "Comprehensive system assessment",
      "Homebound status with specific limitations",
      "Skilled need justification for RN/LPN services",
      "Care plan established with measurable goals",
      "Patient/caregiver education plan",
      "Safety assessment and fall risk"
    ],
    aiPromptFocus: "comprehensive baseline assessment, admission source documentation, initial care planning"
  },
  recertification: {
    icon: Clipboard,
    color: "purple",
    title: "Recertification (ROC)",
    requiredElements: [
      "Progress toward care plan goals",
      "Changes in functional status since SOC",
      "Current medication list with any changes",
      "Continued homebound status justification",
      "Ongoing skilled need documentation",
      "Clinical improvement or decline noted",
      "Updated care plan goals if needed",
      "Patient response to interventions",
      "Continued need for home health services"
    ],
    aiPromptFocus: "progress documentation, functional comparison to baseline, continued homebound/skilled need justification"
  },
  discharge: {
    icon: LogOut,
    color: "green",
    title: "Discharge (DC)",
    requiredElements: [
      "Discharge date and reason",
      "Goals met/not met with specific outcomes",
      "Functional status at discharge vs admission",
      "Patient/caregiver education completed",
      "Discharge instructions provided",
      "Follow-up plan and physician notifications",
      "Safety measures in place",
      "Equipment/supplies status",
      "Patient's understanding of self-care"
    ],
    aiPromptFocus: "outcome documentation, goal achievement, discharge planning, patient education effectiveness"
  },
  routine_visit: {
    icon: FileText,
    color: "orange",
    title: "Routine Skilled Visit",
    requiredElements: [
      "Current clinical status and vital signs",
      "Skilled interventions performed",
      "Patient response to care",
      "Progress toward care plan goals",
      "Changes from previous visit",
      "Medication compliance and effectiveness",
      "Patient/caregiver teaching provided",
      "Safety assessment",
      "Plan for next visit"
    ],
    aiPromptFocus: "skilled interventions, patient response, progress updates, visit-to-visit changes"
  },
  prn: {
    icon: AlertTriangle,
    color: "red",
    title: "PRN/Unscheduled Visit",
    requiredElements: [
      "Reason for unscheduled visit (specific trigger)",
      "Patient/family concerns addressed",
      "Clinical assessment findings",
      "Skilled interventions provided",
      "Communication with physician (if applicable)",
      "Changes in condition since last visit",
      "Immediate actions taken",
      "Plan modifications if needed",
      "Follow-up arrangements"
    ],
    aiPromptFocus: "acute change documentation, skilled response, physician communication, care plan modifications"
  }
};

export default function VisitTypeSpecificGuidance({ 
  visitType, 
  diagnosis,
  patientData,
  onGenerateTemplate 
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTemplate, setGeneratedTemplate] = useState(null);
  const [expanded, setExpanded] = useState(true);
  const [copiedTemplate, setCopiedTemplate] = useState(false);

  const template = VISIT_TYPE_TEMPLATES[visitType] || VISIT_TYPE_TEMPLATES.routine_visit;
  const Icon = template.icon;

  const generateAITemplate = async () => {
    setIsGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate a professional clinical note template for a ${template.title} visit.

VISIT TYPE: ${visitType}
DIAGNOSIS: ${diagnosis}
PATIENT: ${patientData ? `${patientData.first_name} ${patientData.last_name}` : 'Patient'}

REQUIRED ELEMENTS FOR ${template.title.toUpperCase()}:
${template.requiredElements.map((el, i) => `${i + 1}. ${el}`).join('\n')}

FOCUS AREAS: ${template.aiPromptFocus}

Generate a TEMPLATE with placeholders that the nurse can fill in. Use brackets [like this] for areas to complete.

The template should:
- Include all required elements listed above
- Use professional medical terminology
- Follow Medicare documentation standards
- Be specific to ${template.title}
- Include prompts for ${diagnosis} specific assessments
- Guide the nurse on what details to add

Format as a complete clinical narrative with clear sections. Do NOT write a finished note - write a TEMPLATE with guidance.`,
        response_json_schema: {
          type: "object",
          properties: {
            template_text: { type: "string" },
            key_sections: { type: "array", items: { type: "string" } },
            diagnosis_specific_prompts: { type: "array", items: { type: "string" } }
          }
        }
      });

      setGeneratedTemplate(result);
    } catch (error) {
      console.error("Template generation error:", error);
    }
    setIsGenerating(false);
  };

  const copyTemplate = () => {
    if (generatedTemplate?.template_text) {
      navigator.clipboard.writeText(generatedTemplate.template_text);
      setCopiedTemplate(true);
      setTimeout(() => setCopiedTemplate(false), 2000);
    }
  };

  return (
    <Card className={`border-2 border-${template.color}-300`}>
      <CardHeader className={`pb-3 bg-${template.color}-50 cursor-pointer`} onClick={() => setExpanded(!expanded)}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Icon className={`w-4 h-4 text-${template.color}-600`} />
            {template.title} Guidance
          </CardTitle>
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </div>
      </CardHeader>
      {expanded && (
        <CardContent className="pt-4 space-y-3">
          <Alert className={`bg-${template.color}-50 border-${template.color}-200`}>
            <Info className={`w-4 h-4 text-${template.color}-600`} />
            <AlertDescription className={`text-xs text-${template.color}-900`}>
              <strong>AI Focus:</strong> {template.aiPromptFocus}
            </AlertDescription>
          </Alert>

          <div>
            <p className="text-xs font-semibold text-gray-700 mb-2">Required Documentation Elements:</p>
            <ScrollArea className="max-h-48">
              <div className="space-y-1">
                {template.requiredElements.map((element, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 className={`w-3 h-3 text-${template.color}-600 mt-0.5 flex-shrink-0`} />
                    <span className="text-gray-700">{element}</span>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </div>

          <div className="space-y-2">
            <Button
              onClick={generateAITemplate}
              disabled={isGenerating}
              className={`w-full bg-${template.color}-600 hover:bg-${template.color}-700`}
              size="sm"
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Template...</>
              ) : (
                <><Sparkles className="w-4 h-4 mr-2" /> Generate AI Template</>
              )}
            </Button>

            {generatedTemplate && (
              <>
                <div className="bg-gray-50 p-3 rounded-lg border text-xs max-h-64 overflow-y-auto">
                  <pre className="whitespace-pre-wrap font-mono text-gray-800">
                    {generatedTemplate.template_text}
                  </pre>
                </div>

                {generatedTemplate.diagnosis_specific_prompts?.length > 0 && (
                  <div className="bg-blue-50 p-2 rounded border border-blue-200">
                    <p className="text-xs font-semibold text-blue-800 mb-1">
                      {diagnosis} Specific Reminders:
                    </p>
                    <ul className="text-xs text-blue-700 space-y-0.5">
                      {generatedTemplate.diagnosis_specific_prompts.map((prompt, i) => (
                        <li key={i}>• {prompt}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button
                    onClick={copyTemplate}
                    variant="outline"
                    size="sm"
                    className="flex-1"
                  >
                    {copiedTemplate ? (
                      <><CheckCircle2 className="w-3 h-3 mr-1 text-green-600" /> Copied!</>
                    ) : (
                      <><Copy className="w-3 h-3 mr-1" /> Copy Template</>
                    )}
                  </Button>
                  <Button
                    onClick={() => onGenerateTemplate?.(generatedTemplate.template_text)}
                    variant="default"
                    size="sm"
                    className="flex-1"
                  >
                    <CheckCircle2 className="w-3 h-3 mr-1" /> Use Template
                  </Button>
                </div>
              </>
            )}
          </div>

          {target < recommendation.target && (
            <Alert className="bg-yellow-50 border-yellow-300">
              <AlertDescription className="text-xs text-yellow-900">
                <strong>Recommended:</strong> {recommendation.target}% for {visitType.replace('_', ' ')} visits
                <br />
                {recommendation.reason}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      )}
    </Card>
  );
}
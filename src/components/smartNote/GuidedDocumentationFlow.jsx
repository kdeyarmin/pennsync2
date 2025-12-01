import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  User,
  Stethoscope,
  ClipboardList,
  Target,
  Lightbulb,
  CheckCircle2,
  ChevronRight
} from "lucide-react";

const SOAP_SECTIONS = [
  {
    id: 'subjective',
    label: 'Subjective',
    icon: User,
    placeholder: "Patient's complaints, symptoms, what they report...\nExample: Patient reports increased shortness of breath over past 2 days. States 'I can barely walk to the bathroom.' Denies chest pain.",
    prompts: []
  },
  {
    id: 'objective',
    label: 'Objective',
    icon: Stethoscope,
    placeholder: "Vital signs, physical findings, observations...\nExample: VS: BP 142/88, HR 92, RR 22, O2 94% RA. Lungs with bilateral crackles. 2+ pitting edema bilateral lower extremities.",
    prompts: []
  },
  {
    id: 'assessment',
    label: 'Assessment',
    icon: ClipboardList,
    placeholder: "Your clinical assessment, patient status...\nExample: CHF exacerbation with fluid overload. Patient showing signs of decompensation. Medication compliance appears good.",
    prompts: []
  },
  {
    id: 'plan',
    label: 'Plan',
    icon: Target,
    placeholder: "Interventions performed, teaching, next steps...\nExample: Reinforced daily weight monitoring. Educated on low sodium diet. Will notify physician of findings. RTC in 2 days.",
    prompts: []
  }
];

export default function GuidedDocumentationFlow({
  diagnosis,
  careType,
  visitType,
  onNoteChange,
  initialNote = ""
}) {
  const [activeSection, setActiveSection] = useState('subjective');
  const [sections, setSections] = useState({
    subjective: '',
    objective: '',
    assessment: '',
    plan: ''
  });
  const [contextualPrompts, setContextualPrompts] = useState([]);
  const [isLoadingPrompts, setIsLoadingPrompts] = useState(false);

  // Load contextual prompts when diagnosis/visit type changes
  useEffect(() => {
    if (diagnosis) {
      loadContextualPrompts();
    }
  }, [diagnosis, visitType, careType]);

  // Combine sections and notify parent
  useEffect(() => {
    const combinedNote = Object.entries(sections)
      .filter(([_, value]) => value.trim())
      .map(([key, value]) => `${key.toUpperCase()}:\n${value}`)
      .join('\n\n');
    onNoteChange && onNoteChange(combinedNote);
  }, [sections]);

  const loadContextualPrompts = async () => {
    setIsLoadingPrompts(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate contextual documentation prompts for a ${careType} ${visitType} visit for a patient with ${diagnosis}.

For each SOAP section, provide 2-3 specific questions/prompts the nurse should document.

Return JSON:
{
  "subjective": ["prompt1", "prompt2"],
  "objective": ["prompt1", "prompt2"],
  "assessment": ["prompt1", "prompt2"],
  "plan": ["prompt1", "prompt2"]
}`,
        response_json_schema: {
          type: "object",
          properties: {
            subjective: { type: "array", items: { type: "string" } },
            objective: { type: "array", items: { type: "string" } },
            assessment: { type: "array", items: { type: "string" } },
            plan: { type: "array", items: { type: "string" } }
          }
        }
      });
      setContextualPrompts(result);
    } catch (error) {
      console.error("Error loading prompts:", error);
    }
    setIsLoadingPrompts(false);
  };

  const handleSectionChange = (sectionId, value) => {
    setSections(prev => ({ ...prev, [sectionId]: value }));
  };

  const insertPromptText = (text) => {
    setSections(prev => ({
      ...prev,
      [activeSection]: prev[activeSection] + (prev[activeSection] ? '\n' : '') + text + ' '
    }));
  };

  const getSectionCompleteness = (sectionId) => {
    const content = sections[sectionId];
    if (!content) return 0;
    if (content.length < 20) return 25;
    if (content.length < 50) return 50;
    if (content.length < 100) return 75;
    return 100;
  };

  const goToNextSection = () => {
    const sectionIds = SOAP_SECTIONS.map(s => s.id);
    const currentIndex = sectionIds.indexOf(activeSection);
    if (currentIndex < sectionIds.length - 1) {
      setActiveSection(sectionIds[currentIndex + 1]);
    }
  };

  return (
    <Card className="border-2 border-indigo-200">
      <CardHeader className="py-3 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardTitle className="text-sm flex items-center justify-between">
          <span>Guided SOAP Documentation</span>
          <div className="flex gap-1">
            {SOAP_SECTIONS.map((section) => (
              <Badge
                key={section.id}
                variant="outline"
                className={`text-xs ${
                  getSectionCompleteness(section.id) === 100 
                    ? 'bg-green-100 border-green-300 text-green-700' 
                    : getSectionCompleteness(section.id) > 0
                    ? 'bg-yellow-100 border-yellow-300 text-yellow-700'
                    : 'bg-gray-100'
                }`}
              >
                {section.label.charAt(0)}
                {getSectionCompleteness(section.id) === 100 && <CheckCircle2 className="w-3 h-3 ml-1" />}
              </Badge>
            ))}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs value={activeSection} onValueChange={setActiveSection}>
          <TabsList className="w-full rounded-none border-b">
            {SOAP_SECTIONS.map((section) => (
              <TabsTrigger 
                key={section.id} 
                value={section.id}
                className="flex-1 gap-1"
              >
                <section.icon className="w-4 h-4" />
                {section.label}
              </TabsTrigger>
            ))}
          </TabsList>

          {SOAP_SECTIONS.map((section) => (
            <TabsContent key={section.id} value={section.id} className="p-4 space-y-3">
              {/* Contextual Prompts */}
              {contextualPrompts[section.id]?.length > 0 && (
                <div className="bg-blue-50 p-2 rounded-lg border border-blue-200">
                  <p className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" />
                    Document for {diagnosis}:
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {contextualPrompts[section.id].map((prompt, idx) => (
                      <Button
                        key={idx}
                        size="sm"
                        variant="outline"
                        className="h-auto py-1 px-2 text-xs bg-white hover:bg-blue-100"
                        onClick={() => insertPromptText(prompt)}
                      >
                        {prompt}
                      </Button>
                    ))}
                  </div>
                </div>
              )}

              <Textarea
                value={sections[section.id]}
                onChange={(e) => handleSectionChange(section.id, e.target.value)}
                placeholder={section.placeholder}
                className="min-h-[150px] font-mono text-sm"
              />

              <div className="flex justify-between">
                <p className="text-xs text-gray-500">
                  {sections[section.id].length} characters
                </p>
                {activeSection !== 'plan' && (
                  <Button
                    size="sm"
                    onClick={goToNextSection}
                    className="bg-indigo-600 hover:bg-indigo-700"
                  >
                    Next: {SOAP_SECTIONS[SOAP_SECTIONS.findIndex(s => s.id === activeSection) + 1]?.label}
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                )}
              </div>
            </TabsContent>
          ))}
        </Tabs>
      </CardContent>
    </Card>
  );
}
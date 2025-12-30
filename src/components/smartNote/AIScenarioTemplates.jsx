import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { FileText, Sparkles, Loader2 } from "lucide-react";

export default function AIScenarioTemplates({ 
  visitType, 
  diagnosis, 
  patientData,
  onInsertTemplate 
}) {
  const [generating, setGenerating] = useState(false);
  const [templates, setTemplates] = useState([]);

  const generateTemplates = async () => {
    setGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate 3 context-specific clinical documentation templates for home health nursing.

SCENARIO:
- Visit Type: ${visitType}
- Primary Diagnosis: ${diagnosis}
- Patient Age: ${patientData?.date_of_birth ? Math.floor((new Date() - new Date(patientData.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000)) : 'Unknown'}
- Living Situation: ${patientData?.social_history?.living_situation || 'Unknown'}

Create templates for:
1. Standard/typical visit documentation
2. Complication or deterioration scenario
3. Teaching/education-focused visit

Each template should include:
- Key assessment points to document
- Common interventions for this scenario
- Medicare compliance elements
- Suggested clinical narrative starter

Return JSON with array of 3 templates.`,
        response_json_schema: {
          type: "object",
          properties: {
            templates: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  scenario: { type: "string" },
                  template_text: { type: "string" },
                  key_elements: { type: "array", items: { type: "string" } },
                  compliance_focus: { type: "string" }
                }
              }
            }
          }
        }
      });

      setTemplates(result.templates || []);
    } catch (error) {
      console.error('Error generating templates:', error);
    }
    setGenerating(false);
  };

  React.useEffect(() => {
    if (visitType && diagnosis) {
      generateTemplates();
    }
  }, [visitType, diagnosis]);

  if (!templates.length && !generating) return null;

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-br from-purple-50 to-pink-50">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <FileText className="w-5 h-5 text-purple-600" />
          AI Documentation Templates
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {generating ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
            <span className="ml-2 text-sm text-gray-600">Generating templates...</span>
          </div>
        ) : (
          templates.map((template, idx) => (
            <div key={idx} className="bg-white rounded-lg border border-purple-200 p-4 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1">
                  <h4 className="font-semibold text-gray-900">{template.name}</h4>
                  <p className="text-xs text-gray-600 mt-1">{template.scenario}</p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onInsertTemplate(template.template_text)}
                  className="flex-shrink-0"
                >
                  <Sparkles className="w-3 h-3 mr-1" />
                  Use
                </Button>
              </div>
              
              <div className="flex flex-wrap gap-1">
                {template.key_elements?.slice(0, 3).map((element, i) => (
                  <Badge key={i} variant="outline" className="text-xs bg-purple-50">
                    {element}
                  </Badge>
                ))}
              </div>

              <p className="text-xs text-purple-700 italic">
                Focus: {template.compliance_focus}
              </p>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
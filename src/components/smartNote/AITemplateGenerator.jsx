import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Sparkles,
  FileText,
  Loader2,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  RefreshCw,
  Lightbulb
} from "lucide-react";

export default function AITemplateGenerator({
  visitType,
  diagnosis,
  patientData,
  carePlans,
  recentVisits,
  onUseTemplate,
  autoGenerate = true
}) {
  const [template, setTemplate] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (autoGenerate && visitType && diagnosis && !template) {
      generateTemplate();
    }
  }, [visitType, diagnosis, autoGenerate]);

  const generateTemplate = async () => {
    if (!visitType || !diagnosis) return;

    setIsGenerating(true);
    setError(null);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert home health nursing documentation assistant. Generate a comprehensive, Medicare-compliant documentation template for this visit.

VISIT CONTEXT:
- Visit Type: ${visitType.replace(/_/g, ' ').toUpperCase()}
- Primary Diagnosis: ${diagnosis}
- Patient: ${patientData ? `${patientData.first_name} ${patientData.last_name}, Age: ${patientData.date_of_birth ? Math.floor((new Date() - new Date(patientData.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000)) : 'Unknown'}` : 'Unknown'}
${patientData?.secondary_diagnoses?.length > 0 ? `- Secondary Diagnoses: ${patientData.secondary_diagnoses.join(', ')}` : ''}
${patientData?.current_medications?.length > 0 ? `- Current Medications: ${patientData.current_medications.slice(0, 5).map(m => m.name).join(', ')}${patientData.current_medications.length > 5 ? '...' : ''}` : ''}
${carePlans?.length > 0 ? `\nACTIVE CARE PLAN GOALS:\n${carePlans.filter(cp => cp.status === 'active').map(cp => `- ${cp.problem}: ${cp.goal}`).join('\n')}` : ''}
${recentVisits?.length > 0 ? `\nLAST VISIT (${recentVisits[0].visit_date}): ${recentVisits[0].visit_type} - ${recentVisits[0].nurse_notes?.substring(0, 150)}...` : ''}

GENERATE A STRUCTURED TEMPLATE with these sections:

1. CHIEF COMPLAINT/REASON FOR VISIT
   - ${visitType === 'admission' ? 'Admission reason and source' : visitType === 'discharge' ? 'Discharge status and summary' : 'Current status and concerns'}

2. VITAL SIGNS & ASSESSMENT
   - Placeholders for vital signs
   - Key assessment areas for this diagnosis
   - Comparison to baseline/last visit

3. SYSTEMS REVIEW
   - Diagnosis-specific system assessments
   - Focus on systems affected by ${diagnosis}

4. FUNCTIONAL STATUS
   - ADL/IADL assessment
   - Mobility and safety
   - Cognitive status if relevant

5. MEDICATION REVIEW
   - Compliance assessment
   - Side effects/concerns
   - Education needs

6. HOMEBOUND STATUS (if applicable)
   - Specific reasons patient homebound
   - Taxing effort to leave home

7. SKILLED NURSING INTERVENTIONS
   - Specific interventions performed today
   - Clinical judgment/teaching provided
   - Wound care/treatments if applicable

8. PATIENT/CAREGIVER RESPONSE
   - Patient understanding
   - Teach-back results
   - Engagement level

9. CARE PLAN PROGRESS
   - Progress toward each active goal
   - Barriers identified
   - Plan modifications needed

10. PATIENT/CAREGIVER EDUCATION
    - Topics covered today
    - Teaching methods used
    - Comprehension verified

11. PLAN OF CARE
    - Continue current plan with modifications if needed
    - Next visit plan
    - When to contact nurse/MD

CRITICAL INSTRUCTIONS:
- Use [BRACKETS] for placeholders that need nurse input
- Include specific prompts relevant to ${diagnosis}
- Reference active care plan goals
- For ${visitType}, focus on relevant assessment areas
- Use professional clinical language
- Ensure Medicare compliance elements are addressed
- Keep template concise but comprehensive (aim for 400-600 words)

Return JSON:
{
  "template_title": "Visit type and diagnosis specific title",
  "template_text": "Full structured template with [PLACEHOLDERS] for nurse input",
  "key_focus_areas": ["area 1", "area 2", "area 3"],
  "compliance_elements_included": ["element 1", "element 2"],
  "estimated_completion_time": "X minutes"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            template_title: { type: "string" },
            template_text: { type: "string" },
            key_focus_areas: { type: "array", items: { type: "string" } },
            compliance_elements_included: { type: "array", items: { type: "string" } },
            estimated_completion_time: { type: "string" }
          }
        }
      });

      setTemplate(result);
      setIsExpanded(true);
    } catch (error) {
      console.error('Error generating template:', error);
      setError('Failed to generate template. Please try again.');
    }

    setIsGenerating(false);
  };

  if (!visitType || !diagnosis) return null;

  return (
    <Card className="border-2 border-indigo-300 bg-gradient-to-r from-indigo-50 to-purple-50 shadow-lg">
      <CardHeader 
        className="py-3 bg-gradient-to-r from-indigo-100 to-purple-100 cursor-pointer"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <CardTitle className="text-sm flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-indigo-600" />
            <span>AI Documentation Template</span>
            {template && (
              <Badge className="bg-green-100 text-green-800">
                Ready
              </Badge>
            )}
            {isGenerating && (
              <Loader2 className="w-4 h-4 animate-spin text-indigo-600" />
            )}
          </div>
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </CardTitle>
      </CardHeader>

      {isExpanded && (
        <CardContent className="p-4 space-y-3">
          {isGenerating && (
            <div className="text-center py-6">
              <Loader2 className="w-8 h-8 animate-spin mx-auto mb-2 text-indigo-600" />
              <p className="text-sm text-gray-600">Generating personalized template...</p>
              <p className="text-xs text-gray-500 mt-1">
                Based on {visitType.replace(/_/g, ' ')} visit for {diagnosis}
              </p>
            </div>
          )}

          {error && (
            <Alert className="bg-red-50 border-red-200">
              <AlertDescription className="text-sm text-red-800">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {!template && !isGenerating && !error && (
            <div className="text-center py-6">
              <Sparkles className="w-8 h-8 mx-auto mb-2 text-indigo-400" />
              <p className="text-sm text-gray-600 mb-3">
                Get a smart documentation template for this visit
              </p>
              <Button
                onClick={generateTemplate}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Template
              </Button>
            </div>
          )}

          {template && (
            <div className="space-y-3">
              <div className="bg-white p-3 rounded-lg border border-indigo-200">
                <h4 className="text-sm font-bold text-indigo-900 mb-2">
                  {template.template_title}
                </h4>
                
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <div className="bg-blue-50 p-2 rounded">
                    <p className="text-xs text-blue-600 font-semibold">Est. Time</p>
                    <p className="text-xs text-gray-700">{template.estimated_completion_time}</p>
                  </div>
                  <div className="bg-green-50 p-2 rounded">
                    <p className="text-xs text-green-600 font-semibold">Compliance</p>
                    <p className="text-xs text-gray-700">
                      {template.compliance_elements_included?.length || 0} elements
                    </p>
                  </div>
                </div>

                {template.key_focus_areas?.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Key Focus Areas:</p>
                    <div className="flex flex-wrap gap-1">
                      {template.key_focus_areas.map((area, idx) => (
                        <Badge key={idx} variant="outline" className="text-xs bg-indigo-50 text-indigo-700">
                          {area}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <Alert className="bg-yellow-50 border-yellow-200 mb-3">
                  <Lightbulb className="w-4 h-4 text-yellow-600" />
                  <AlertDescription className="text-xs text-yellow-800">
                    Template includes [PLACEHOLDERS] - fill these in as you document the visit
                  </AlertDescription>
                </Alert>

                <div className="bg-gray-50 p-3 rounded border max-h-64 overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap font-mono text-gray-800">
                    {template.template_text}
                  </pre>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={() => onUseTemplate(template.template_text)}
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700"
                >
                  <CheckCircle2 className="w-4 h-4 mr-2" />
                  Use This Template
                </Button>
                <Button
                  variant="outline"
                  onClick={generateTemplate}
                  disabled={isGenerating}
                >
                  <RefreshCw className="w-4 h-4" />
                </Button>
              </div>

              {template.compliance_elements_included?.length > 0 && (
                <div className="bg-green-50 p-2 rounded border border-green-200">
                  <p className="text-xs font-semibold text-green-900 mb-1">
                    ✓ Medicare Compliance Elements Included:
                  </p>
                  <ul className="text-xs text-green-800 space-y-0.5">
                    {template.compliance_elements_included.map((element, idx) => (
                      <li key={idx}>• {element}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
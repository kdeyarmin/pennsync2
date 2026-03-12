import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  CheckCircle2,
  BookOpen,
  Target,
  Plus,
  AlertCircle
} from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export default function AICarePlanSuggestionEngine({
  patientId,
  patientData,
  diagnosis,
  existingCarePlans = [],
  onAcceptSuggestion,
  autoGenerate = false
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [suggestions, setSuggestions] = useState(null);
  const [acceptedSuggestions, setAcceptedSuggestions] = useState(new Set());

  const { data: medicareRules = [] } = useQuery({
    queryKey: ['medicareComplianceRules'],
    queryFn: () => base44.entities.MedicareComplianceRule.list(),
    initialData: [],
  });

  const { data: educationMaterials = [] } = useQuery({
    queryKey: ['patientEducationForCarePlan', diagnosis],
    queryFn: async () => {
      // Simulated - would query generated education materials
      return [];
    },
    initialData: [],
    enabled: !!diagnosis
  });

  useEffect(() => {
    if (autoGenerate && diagnosis && !suggestions) {
      generateSuggestions();
    }
  }, [autoGenerate, diagnosis]);

  const generateSuggestions = async () => {
    if (!diagnosis) return;

    setIsGenerating(true);
    try {
      const existingProblems = existingCarePlans.map(cp => cp.problem);
      const existingGoals = existingCarePlans.map(cp => cp.goal);

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Generate Medicare-compliant care plan suggestions for Pennsylvania home health patient.

PATIENT CONTEXT:
- Diagnosis: ${diagnosis}
- Current Medications: ${patientData?.current_medications?.map(m => m.name).join(', ') || 'None documented'}
- Functional Status: ${JSON.stringify(patientData?.functional_status || {})}
- Age: ${patientData?.date_of_birth ? Math.floor((new Date() - new Date(patientData.date_of_birth)) / 31557600000) : 'Unknown'}
- Allergies: ${patientData?.allergies || 'None'}

EXISTING CARE PLANS (do NOT duplicate):
${existingCarePlans.length > 0 ? existingCarePlans.map(cp => `- ${cp.problem}: ${cp.goal}`).join('\n') : 'None'}

MEDICARE REQUIREMENTS (42 CFR 484):
${medicareRules.filter(r => r.category === 'plan_of_care').map(r => `- ${r.rule_name}: ${r.description}`).join('\n')}

Generate 3-5 NEW care plan suggestions that:
1. Are NOT duplicates of existing plans
2. Address key aspects of ${diagnosis} management
3. Include measurable, time-bound goals (SMART goals)
4. Follow Medicare CoP requirements for home health
5. Are appropriate for Pennsylvania home health setting

For EACH suggestion provide:
- problem: Nursing diagnosis (clear, specific)
- goal: Measurable outcome with timeframe
- interventions: Array of 3-5 specific nursing interventions
- rationale: Why this is important for Medicare compliance
- priority: high, medium, low
- frequency: How often to assess
- baseline_measurement: What to measure initially
- target_timeframe_days: Number of days to achieve goal (typically 60)
- education_topics: Array of patient education topics needed
- medicare_compliance_note: Which CoP requirement this addresses

Return JSON with suggestions array.`,
        response_json_schema: {
          type: "object",
          properties: {
            suggestions: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  problem: { type: "string" },
                  goal: { type: "string" },
                  interventions: { type: "array", items: { type: "string" } },
                  rationale: { type: "string" },
                  priority: { type: "string" },
                  frequency: { type: "string" },
                  baseline_measurement: { type: "string" },
                  target_timeframe_days: { type: "number" },
                  education_topics: { type: "array", items: { type: "string" } },
                  medicare_compliance_note: { type: "string" }
                }
              }
            }
          }
        }
      });

      setSuggestions(result.suggestions || []);
    } catch (error) {
      console.error('Error generating care plan suggestions:', error);
    }
    setIsGenerating(false);
  };

  const handleAcceptSuggestion = async (suggestion, index) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + (suggestion.target_timeframe_days || 60));

    const carePlanData = {
      patient_id: patientId,
      problem: suggestion.problem,
      goal: suggestion.goal,
      interventions: suggestion.interventions,
      target_date: targetDate.toISOString().split('T')[0],
      status: 'active',
      baseline_measurement: suggestion.baseline_measurement,
      frequency: suggestion.frequency
    };

    await onAcceptSuggestion?.(carePlanData, suggestion.education_topics);
    setAcceptedSuggestions(prev => new Set([...prev, index]));
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      case 'low': return 'bg-blue-100 text-blue-800 border-blue-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  if (!diagnosis) {
    return (
      <Card className="border-2 border-gray-200">
        <CardContent className="p-6 text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Enter patient diagnosis to generate AI care plan suggestions</p>
        </CardContent>
      </Card>
    );
  }

  if (isGenerating) {
    return (
      <Card className="border-2 border-purple-200">
        <CardContent className="p-6 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4" />
          <p className="text-sm text-gray-600">AI analyzing {diagnosis} and generating Medicare-compliant care plan suggestions...</p>
        </CardContent>
      </Card>
    );
  }

  if (!suggestions) {
    return (
      <Card className="border-2 border-purple-200">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Care Plan Suggestions
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600 mb-4">
            Generate evidence-based care plan recommendations for {diagnosis}
          </p>
          <Button onClick={generateSuggestions} className="w-full">
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Suggestions
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-2 border-purple-200 bg-gradient-to-b from-purple-50 to-white">
      <CardHeader>
        <CardTitle className="text-lg flex items-center justify-between">
          <span className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-purple-600" />
            AI Care Plan Suggestions
          </span>
          <Badge variant="outline">{suggestions.length} suggestions</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <Accordion type="multiple" className="space-y-2">
          {suggestions.map((suggestion, idx) => {
            const isAccepted = acceptedSuggestions.has(idx);
            
            return (
              <AccordionItem
                key={idx}
                value={`suggestion-${idx}`}
                className={`border-2 rounded-lg ${getPriorityColor(suggestion.priority)} ${isAccepted ? 'opacity-60' : ''}`}
              >
                <AccordionTrigger className="px-4 py-3 hover:no-underline">
                  <div className="flex items-center justify-between w-full pr-4">
                    <div className="text-left">
                      <p className="font-semibold text-sm">{suggestion.problem}</p>
                      <Badge className={`mt-1 ${getPriorityColor(suggestion.priority)}`}>
                        {suggestion.priority} priority
                      </Badge>
                    </div>
                    {isAccepted && (
                      <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4 space-y-3">
                  {/* Goal */}
                  <div className="bg-white p-3 rounded border">
                    <div className="flex items-start gap-2 mb-2">
                      <Target className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-semibold text-gray-700">SMART Goal</p>
                        <p className="text-sm text-gray-900 font-medium">{suggestion.goal}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 text-xs text-gray-600 mt-2">
                      <Badge variant="outline" className="text-xs">
                        Target: {suggestion.target_timeframe_days} days
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        Assess: {suggestion.frequency}
                      </Badge>
                    </div>
                  </div>

                  {/* Interventions */}
                  <div className="bg-blue-50 p-3 rounded border border-blue-200">
                    <p className="text-xs font-semibold text-blue-900 mb-2">Nursing Interventions:</p>
                    <ul className="space-y-1">
                      {suggestion.interventions.map((intervention, i) => (
                        <li key={i} className="text-xs text-blue-800 flex items-start gap-2">
                          <span className="text-blue-600">•</span>
                          <span>{intervention}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  {/* Baseline Measurement */}
                  <div className="bg-gray-50 p-3 rounded border">
                    <p className="text-xs font-semibold text-gray-700 mb-1">Baseline Measurement:</p>
                    <p className="text-xs text-gray-600">{suggestion.baseline_measurement}</p>
                  </div>

                  {/* Education Topics */}
                  {suggestion.education_topics?.length > 0 && (
                    <div className="bg-green-50 p-3 rounded border border-green-200">
                      <div className="flex items-center gap-2 mb-2">
                        <BookOpen className="w-4 h-4 text-green-700" />
                        <p className="text-xs font-semibold text-green-900">Patient Education Topics:</p>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {suggestion.education_topics.map((topic, i) => (
                          <Badge key={i} className="bg-green-100 text-green-800 text-xs">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Medicare Compliance */}
                  <div className="bg-purple-50 p-3 rounded border border-purple-200">
                    <p className="text-xs font-semibold text-purple-900 mb-1">Medicare Compliance:</p>
                    <p className="text-xs text-purple-800">{suggestion.medicare_compliance_note}</p>
                  </div>

                  {/* Rationale */}
                  <div className="bg-yellow-50 p-3 rounded border border-yellow-200">
                    <p className="text-xs font-semibold text-yellow-900 mb-1">Clinical Rationale:</p>
                    <p className="text-xs text-yellow-800">{suggestion.rationale}</p>
                  </div>

                  {/* Action Button */}
                  {!isAccepted && (
                    <Button
                      onClick={() => handleAcceptSuggestion(suggestion, idx)}
                      className="w-full bg-purple-600 hover:bg-purple-700"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Add to Care Plan
                    </Button>
                  )}

                  {isAccepted && (
                    <div className="text-center py-2 text-sm text-green-700 font-medium">
                      ✓ Added to Care Plan
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>

        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            setSuggestions(null);
            setAcceptedSuggestions(new Set());
          }}
          className="w-full"
        >
          Generate New Suggestions
        </Button>
      </CardContent>
    </Card>
  );
}
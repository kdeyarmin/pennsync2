import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  User,
  Stethoscope,
  MessageSquare,
  Loader2,
  Sparkles,
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Brain,
  FileText,
  Target,
  Award
} from "lucide-react";

export default function AIPatientSimulation({ 
  scenario = "general",
  difficulty = "intermediate",
  onComplete 
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [simulation, setSimulation] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [responses, setResponses] = useState([]);
  const [currentResponse, setCurrentResponse] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [simulationComplete, setSimulationComplete] = useState(false);
  const [overallFeedback, setOverallFeedback] = useState(null);

  const scenarios = {
    "homebound": "Homebound Status Documentation",
    "skilled_need": "Skilled Nursing Need Justification",
    "medication": "Medication Reconciliation",
    "wound_care": "Wound Care Assessment",
    "fall_risk": "Fall Risk Assessment",
    "chf": "CHF Patient Management",
    "copd": "COPD Exacerbation",
    "diabetes": "Diabetic Patient Education",
    "general": "General Home Health Visit"
  };

  const generateSimulation = async () => {
    setIsGenerating(true);
    setSimulation(null);
    setCurrentStep(0);
    setResponses([]);
    setFeedback(null);
    setSimulationComplete(false);
    setOverallFeedback(null);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Create an interactive patient simulation for home health nurse training.

SCENARIO TYPE: ${scenarios[scenario] || scenario}
DIFFICULTY: ${difficulty}

Create a realistic patient encounter with:
1. Patient background (demographics, diagnosis, history)
2. 4-5 interaction steps that test documentation and clinical skills
3. Each step should present a situation requiring nurse response
4. Include vital signs, symptoms, and patient statements

Make it realistic and challenging, focusing on Medicare compliance documentation.`,
        response_json_schema: {
          type: "object",
          properties: {
            title: { type: "string" },
            patient: {
              type: "object",
              properties: {
                name: { type: "string" },
                age: { type: "number" },
                gender: { type: "string" },
                diagnosis: { type: "string" },
                secondary_diagnoses: { type: "array", items: { type: "string" } },
                medications: { type: "array", items: { type: "string" } },
                history: { type: "string" },
                living_situation: { type: "string" }
              }
            },
            vital_signs: {
              type: "object",
              properties: {
                bp: { type: "string" },
                hr: { type: "string" },
                temp: { type: "string" },
                o2: { type: "string" },
                pain: { type: "string" }
              }
            },
            steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "number" },
                  situation: { type: "string" },
                  patient_statement: { type: "string" },
                  observation: { type: "string" },
                  prompt: { type: "string" },
                  key_elements_to_address: { type: "array", items: { type: "string" } },
                  ideal_response_points: { type: "array", items: { type: "string" } }
                }
              }
            },
            learning_objectives: { type: "array", items: { type: "string" } }
          }
        }
      });

      setSimulation(result);
    } catch (error) {
      console.error("Error generating simulation:", error);
    }
    setIsGenerating(false);
  };

  const evaluateResponse = async () => {
    setIsEvaluating(true);
    const step = simulation.steps[currentStep];

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Evaluate this nurse's response in a patient simulation.

SCENARIO: ${simulation.title}
PATIENT: ${simulation.patient.name}, ${simulation.patient.age}yo ${simulation.patient.gender}
DIAGNOSIS: ${simulation.patient.diagnosis}

CURRENT SITUATION: ${step.situation}
PATIENT SAID: "${step.patient_statement}"
OBSERVATION: ${step.observation}

PROMPT FOR NURSE: ${step.prompt}

KEY ELEMENTS TO ADDRESS:
${step.key_elements_to_address.map(e => `- ${e}`).join('\n')}

IDEAL RESPONSE SHOULD INCLUDE:
${step.ideal_response_points.map(p => `- ${p}`).join('\n')}

NURSE'S RESPONSE:
"${currentResponse}"

Provide detailed, constructive feedback. Be encouraging but thorough in identifying gaps.`,
        response_json_schema: {
          type: "object",
          properties: {
            score: { type: "number" },
            strengths: { type: "array", items: { type: "string" } },
            areas_for_improvement: { type: "array", items: { type: "string" } },
            missed_elements: { type: "array", items: { type: "string" } },
            documentation_tips: { type: "array", items: { type: "string" } },
            example_improvement: { type: "string" },
            encouragement: { type: "string" }
          }
        }
      });

      setFeedback(result);
      setResponses([...responses, { 
        step: currentStep, 
        response: currentResponse, 
        feedback: result 
      }]);
    } catch (error) {
      console.error("Error evaluating response:", error);
    }
    setIsEvaluating(false);
  };

  const nextStep = async () => {
    if (currentStep < simulation.steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setCurrentResponse("");
      setFeedback(null);
    } else {
      // Generate overall feedback
      setIsEvaluating(true);
      try {
        const allResponses = [...responses, { step: currentStep, response: currentResponse, feedback }];
        const avgScore = Math.round(allResponses.reduce((sum, r) => sum + (r.feedback?.score || 0), 0) / allResponses.length);

        const result = await base44.integrations.Core.InvokeLLM({
          prompt: `Provide overall feedback for a nurse who completed a patient simulation.

SCENARIO: ${simulation.title}
AVERAGE SCORE: ${avgScore}%

RESPONSES AND FEEDBACK:
${allResponses.map((r, i) => `
Step ${i + 1}:
- Response: "${r.response}"
- Score: ${r.feedback?.score}%
- Strengths: ${r.feedback?.strengths?.join(', ')}
- Improvements: ${r.feedback?.areas_for_improvement?.join(', ')}
`).join('\n')}

Provide comprehensive final feedback with specific recommendations for continued learning.`,
          response_json_schema: {
            type: "object",
            properties: {
              overall_score: { type: "number" },
              performance_summary: { type: "string" },
              top_strengths: { type: "array", items: { type: "string" } },
              priority_improvements: { type: "array", items: { type: "string" } },
              recommended_training: { type: "array", items: { type: "string" } },
              clinical_pearls: { type: "array", items: { type: "string" } },
              final_encouragement: { type: "string" }
            }
          }
        });

        setOverallFeedback(result);
        setSimulationComplete(true);
        onComplete?.({
          scenario,
          score: result.overall_score,
          responses: allResponses,
          overallFeedback: result
        });
      } catch (error) {
        console.error("Error generating overall feedback:", error);
      }
      setIsEvaluating(false);
    }
  };

  if (!simulation && !isGenerating) {
    return (
      <Card className="border-2 border-teal-200">
        <CardContent className="p-6 text-center">
          <Stethoscope className="w-12 h-12 text-teal-600 mx-auto mb-3" />
          <h3 className="font-semibold text-lg mb-2">AI Patient Simulation</h3>
          <p className="text-sm text-gray-600 mb-4">
            Practice with: <strong>{scenarios[scenario] || scenario}</strong>
          </p>
          <Badge variant="outline" className="mb-4">{difficulty}</Badge>
          <br />
          <Button onClick={generateSimulation} className="bg-teal-600 hover:bg-teal-700 mt-4">
            <Sparkles className="w-4 h-4 mr-2" /> Start Simulation
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isGenerating) {
    return (
      <Card className="border-2 border-teal-200">
        <CardContent className="p-8 text-center">
          <Loader2 className="w-10 h-10 animate-spin text-teal-600 mx-auto mb-3" />
          <p className="text-sm text-gray-600">Creating your patient simulation...</p>
        </CardContent>
      </Card>
    );
  }

  if (simulationComplete && overallFeedback) {
    return (
      <Card className="border-2 border-teal-200">
        <CardHeader className="bg-gradient-to-r from-teal-50 to-emerald-50">
          <CardTitle className="flex items-center gap-2">
            <Award className="w-5 h-5 text-teal-600" />
            Simulation Complete
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-4">
          {/* Score */}
          <div className="text-center py-4">
            <div className={`text-5xl font-bold mb-2 ${
              overallFeedback.overall_score >= 80 ? 'text-green-600' :
              overallFeedback.overall_score >= 60 ? 'text-yellow-600' : 'text-orange-600'
            }`}>
              {overallFeedback.overall_score}%
            </div>
            <p className="text-gray-600">{overallFeedback.performance_summary}</p>
          </div>

          {/* Strengths */}
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> Top Strengths
            </p>
            <ul className="space-y-1">
              {overallFeedback.top_strengths?.map((s, i) => (
                <li key={i} className="text-xs text-green-700">✓ {s}</li>
              ))}
            </ul>
          </div>

          {/* Improvements */}
          <div className="bg-orange-50 p-3 rounded-lg">
            <p className="text-xs font-semibold text-orange-800 mb-2 flex items-center gap-1">
              <Target className="w-4 h-4" /> Priority Improvements
            </p>
            <ul className="space-y-1">
              {overallFeedback.priority_improvements?.map((i, idx) => (
                <li key={idx} className="text-xs text-orange-700">• {i}</li>
              ))}
            </ul>
          </div>

          {/* Clinical Pearls */}
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-xs font-semibold text-blue-800 mb-2 flex items-center gap-1">
              <Brain className="w-4 h-4" /> Clinical Pearls
            </p>
            <ul className="space-y-1">
              {overallFeedback.clinical_pearls?.map((p, i) => (
                <li key={i} className="text-xs text-blue-700">💡 {p}</li>
              ))}
            </ul>
          </div>

          {/* Recommended Training */}
          <div className="bg-purple-50 p-3 rounded-lg">
            <p className="text-xs font-semibold text-purple-800 mb-2">Recommended Training:</p>
            <div className="flex flex-wrap gap-1">
              {overallFeedback.recommended_training?.map((t, i) => (
                <Badge key={i} variant="outline" className="text-xs text-purple-700">
                  {t}
                </Badge>
              ))}
            </div>
          </div>

          {/* Encouragement */}
          <div className="bg-indigo-50 p-3 rounded-lg text-center">
            <p className="text-sm text-indigo-800 italic">"{overallFeedback.final_encouragement}"</p>
          </div>

          <div className="flex gap-2">
            <Button onClick={generateSimulation} variant="outline" className="flex-1">
              <RotateCcw className="w-4 h-4 mr-2" /> Try Again
            </Button>
            <Button onClick={() => { setSimulation(null); setSimulationComplete(false); }} className="flex-1 bg-teal-600 hover:bg-teal-700">
              <Sparkles className="w-4 h-4 mr-2" /> New Scenario
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  const step = simulation.steps[currentStep];

  return (
    <Card className="border-2 border-teal-200">
      <CardHeader className="bg-gradient-to-r from-teal-50 to-emerald-50 py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Stethoscope className="w-4 h-4 text-teal-600" />
            {simulation.title}
          </CardTitle>
          <Badge variant="outline">
            Step {currentStep + 1} / {simulation.steps.length}
          </Badge>
        </div>
        <Progress value={((currentStep + 1) / simulation.steps.length) * 100} className="h-1 mt-2" />
      </CardHeader>

      <CardContent className="p-4 space-y-4">
        {/* Patient Info */}
        <div className="bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <User className="w-4 h-4 text-gray-600" />
            <span className="font-medium text-sm">{simulation.patient.name}</span>
            <Badge variant="outline" className="text-xs">
              {simulation.patient.age}yo {simulation.patient.gender}
            </Badge>
          </div>
          <p className="text-xs text-gray-600">Dx: {simulation.patient.diagnosis}</p>
          <div className="flex gap-2 mt-2 text-xs">
            <span>BP: {simulation.vital_signs.bp}</span>
            <span>HR: {simulation.vital_signs.hr}</span>
            <span>O2: {simulation.vital_signs.o2}</span>
          </div>
        </div>

        {/* Situation */}
        <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
          <p className="text-xs font-semibold text-blue-800 mb-1">Situation:</p>
          <p className="text-sm text-blue-900">{step.situation}</p>
        </div>

        {/* Patient Statement */}
        {step.patient_statement && (
          <div className="bg-yellow-50 p-3 rounded-lg border border-yellow-200">
            <p className="text-xs font-semibold text-yellow-800 mb-1 flex items-center gap-1">
              <MessageSquare className="w-3 h-3" /> Patient says:
            </p>
            <p className="text-sm text-yellow-900 italic">"{step.patient_statement}"</p>
          </div>
        )}

        {/* Observation */}
        {step.observation && (
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
            <p className="text-xs font-semibold text-purple-800 mb-1">Your Observation:</p>
            <p className="text-sm text-purple-900">{step.observation}</p>
          </div>
        )}

        {/* Prompt */}
        <div className="bg-teal-50 p-3 rounded-lg border border-teal-200">
          <p className="text-xs font-semibold text-teal-800 mb-1 flex items-center gap-1">
            <FileText className="w-3 h-3" /> Your Task:
          </p>
          <p className="text-sm text-teal-900 font-medium">{step.prompt}</p>
        </div>

        {/* Response Input */}
        <div>
          <Textarea
            value={currentResponse}
            onChange={(e) => setCurrentResponse(e.target.value)}
            placeholder="Type your response, documentation, or action here..."
            className="min-h-[120px]"
            disabled={!!feedback}
          />
          <p className="text-xs text-gray-400 mt-1">
            {currentResponse.length} characters
          </p>
        </div>

        {/* Feedback */}
        {feedback && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium">Your Score:</span>
              <Badge className={
                feedback.score >= 80 ? 'bg-green-100 text-green-800' :
                feedback.score >= 60 ? 'bg-yellow-100 text-yellow-800' :
                'bg-orange-100 text-orange-800'
              }>
                {feedback.score}%
              </Badge>
            </div>

            {feedback.strengths?.length > 0 && (
              <div className="bg-green-50 p-2 rounded">
                <p className="text-xs font-semibold text-green-800 mb-1">Strengths:</p>
                <ul className="space-y-0.5">
                  {feedback.strengths.map((s, i) => (
                    <li key={i} className="text-xs text-green-700">✓ {s}</li>
                  ))}
                </ul>
              </div>
            )}

            {feedback.areas_for_improvement?.length > 0 && (
              <div className="bg-orange-50 p-2 rounded">
                <p className="text-xs font-semibold text-orange-800 mb-1">Areas for Improvement:</p>
                <ul className="space-y-0.5">
                  {feedback.areas_for_improvement.map((a, i) => (
                    <li key={i} className="text-xs text-orange-700">• {a}</li>
                  ))}
                </ul>
              </div>
            )}

            {feedback.documentation_tips?.length > 0 && (
              <div className="bg-blue-50 p-2 rounded">
                <p className="text-xs font-semibold text-blue-800 mb-1">Documentation Tips:</p>
                <ul className="space-y-0.5">
                  {feedback.documentation_tips.map((t, i) => (
                    <li key={i} className="text-xs text-blue-700">💡 {t}</li>
                  ))}
                </ul>
              </div>
            )}

            <div className="bg-indigo-50 p-2 rounded">
              <p className="text-xs text-indigo-800 italic">{feedback.encouragement}</p>
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          {!feedback ? (
            <Button
              onClick={evaluateResponse}
              disabled={currentResponse.length < 20 || isEvaluating}
              className="w-full bg-teal-600 hover:bg-teal-700"
            >
              {isEvaluating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Evaluating...</>
              ) : (
                <><Brain className="w-4 h-4 mr-2" /> Get AI Feedback</>
              )}
            </Button>
          ) : (
            <Button onClick={nextStep} disabled={isEvaluating} className="w-full bg-teal-600 hover:bg-teal-700">
              {isEvaluating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
              ) : currentStep < simulation.steps.length - 1 ? (
                <>Next Step <ChevronRight className="w-4 h-4 ml-2" /></>
              ) : (
                <>Complete Simulation <Award className="w-4 h-4 ml-2" /></>
              )}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
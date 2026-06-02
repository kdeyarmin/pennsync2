import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Brain,
  Loader2,
  Sparkles,
  CheckCircle2,
  XCircle,
  Target,
  Lightbulb,
  RotateCcw,
  Trophy,
  ChevronRight,
  AlertTriangle,
  GraduationCap
} from "lucide-react";

export default function DocumentationPracticeScenarios({ 
  weakAreas = [],
  recentErrors = [],
  nurseEmail,
  _onComplete,
  isOpen,
  onOpenChange
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [scenario, setScenario] = useState(null);
  const [userResponse, setUserResponse] = useState("");
  const [feedback, setFeedback] = useState(null);
  const [isEvaluating, setIsEvaluating] = useState(false);
  const [scenarioCount, setScenarioCount] = useState(0);
  const [totalScore, setTotalScore] = useState(0);

  const generateScenario = async () => {
    setIsGenerating(true);
    setUserResponse("");
    setFeedback(null);

    // Determine focus area based on weak areas or recent errors
    const focusArea = weakAreas[0]?.area || recentErrors[0]?.element || "Homebound Status";

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Create a realistic home health nursing documentation practice scenario focusing on: ${focusArea}

The nurse has shown weakness in this area. Create a scenario that tests their ability to document correctly.

Include:
1. A brief patient scenario (2-3 sentences)
2. Key observations the nurse would make
3. The specific documentation element they need to write
4. What a perfect response should include (for evaluation)

Make it realistic and educational.`,
        response_json_schema: {
          type: "object",
          properties: {
            focus_area: { type: "string" },
            patient_scenario: { type: "string" },
            observations: { type: "array", items: { type: "string" } },
            task: { type: "string" },
            documentation_element: { type: "string" },
            ideal_response_elements: { type: "array", items: { type: "string" } },
            common_mistakes: { type: "array", items: { type: "string" } },
            tip: { type: "string" }
          }
        }
      });

      setScenario(result);
    } catch (error) {
      console.error("Error generating scenario:", error);
    }
    setIsGenerating(false);
  };

  const evaluateResponse = async () => {
    if (!userResponse.trim() || !scenario) return;
    setIsEvaluating(true);

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `Evaluate this nurse's documentation practice response.

SCENARIO: ${scenario.patient_scenario}
TASK: Document the ${scenario.documentation_element}
OBSERVATIONS PROVIDED: ${scenario.observations.join(', ')}

IDEAL RESPONSE SHOULD INCLUDE:
${scenario.ideal_response_elements.map(e => `- ${e}`).join('\n')}

COMMON MISTAKES TO WATCH FOR:
${scenario.common_mistakes.map(m => `- ${m}`).join('\n')}

NURSE'S RESPONSE:
"${userResponse}"

Provide constructive, educational feedback. Be encouraging but thorough.`,
        response_json_schema: {
          type: "object",
          properties: {
            score: { type: "number" },
            overall_assessment: { type: "string" },
            strengths: { type: "array", items: { type: "string" } },
            improvements_needed: { type: "array", items: { type: "string" } },
            missing_elements: { type: "array", items: { type: "string" } },
            example_improvement: { type: "string" },
            medicare_tip: { type: "string" },
            encouragement: { type: "string" }
          }
        }
      });

      setFeedback(result);
      setScenarioCount(prev => prev + 1);
      setTotalScore(prev => prev + result.score);

      // Track progress
      if (nurseEmail) {
        try {
          await base44.entities.MicroLearningProgress.create({
            nurse_email: nurseEmail,
            skill_area: scenario.focus_area,
            module_type: 'practice_exercise',
            status: result.score >= 70 ? 'completed' : 'needs_review',
            score: result.score,
            source: 'note_review'
          });
        } catch (e) {
          console.error("Error tracking progress:", e);
        }
      }
    } catch (error) {
      console.error("Error evaluating response:", error);
    }
    setIsEvaluating(false);
  };

  const resetPractice = () => {
    setScenario(null);
    setUserResponse("");
    setFeedback(null);
  };

  const averageScore = scenarioCount > 0 ? Math.round(totalScore / scenarioCount) : 0;

  const content = (
    <div className="space-y-4">
      {/* Progress Header */}
      {scenarioCount > 0 && (
        <div className="flex items-center justify-between p-3 bg-indigo-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Trophy className={`w-5 h-5 ${averageScore >= 80 ? 'text-yellow-500' : 'text-slate-400'}`} />
            <span className="text-sm font-medium">Practice Session</span>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline">{scenarioCount} completed</Badge>
            <Badge className={averageScore >= 80 ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
              Avg: {averageScore}%
            </Badge>
          </div>
        </div>
      )}

      {/* No Scenario Yet */}
      {!scenario && !isGenerating && (
        <div className="text-center py-8">
          <GraduationCap className="w-12 h-12 text-indigo-600 mx-auto mb-3" />
          <h3 className="font-semibold text-lg mb-2">Documentation Practice</h3>
          <p className="text-sm text-slate-600 mb-4">
            Practice writing compliant documentation with AI-generated scenarios
          </p>
          {weakAreas.length > 0 && (
            <div className="mb-4">
              <p className="text-xs text-slate-500 mb-2">Focus areas based on your notes:</p>
              <div className="flex flex-wrap justify-center gap-1">
                {weakAreas.slice(0, 3).map((area, idx) => (
                  <Badge key={idx} variant="outline" className="text-xs">
                    {area.area || area}
                  </Badge>
                ))}
              </div>
            </div>
          )}
          <Button onClick={generateScenario} className="bg-indigo-600 hover:bg-indigo-700">
            <Sparkles className="w-4 h-4 mr-2" /> Generate Practice Scenario
          </Button>
        </div>
      )}

      {/* Loading */}
      {isGenerating && (
        <div className="text-center py-8">
          <Loader2 className="w-10 h-10 animate-spin text-indigo-600 mx-auto mb-3" />
          <p className="text-sm text-slate-600">Creating your practice scenario...</p>
        </div>
      )}

      {/* Scenario Display */}
      {scenario && !feedback && (
        <div className="space-y-4">
          {/* Scenario Info */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-blue-600">{scenario.focus_area}</Badge>
              <span className="text-xs text-blue-600">Practice Scenario</span>
            </div>
            <p className="text-sm text-blue-900 mb-3">{scenario.patient_scenario}</p>
            
            <div className="bg-white/70 p-2 rounded mb-2">
              <p className="text-xs font-semibold text-blue-800 mb-1">Your Observations:</p>
              <ul className="space-y-1">
                {scenario.observations.map((obs, idx) => (
                  <li key={idx} className="text-xs text-blue-700">• {obs}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Task */}
          <div className="bg-purple-50 p-3 rounded-lg border border-purple-200">
            <p className="text-xs font-semibold text-purple-800 mb-1 flex items-center gap-1">
              <Target className="w-3 h-3" /> Your Task:
            </p>
            <p className="text-sm text-purple-900 font-medium">{scenario.task}</p>
            <p className="text-xs text-purple-700 mt-1">
              Document the: <strong>{scenario.documentation_element}</strong>
            </p>
          </div>

          {/* Tip */}
          <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
            <p className="text-xs text-yellow-800 flex items-center gap-1">
              <Lightbulb className="w-3 h-3" /> <strong>Tip:</strong> {scenario.tip}
            </p>
          </div>

          {/* Response Input */}
          <div>
            <Textarea
              value={userResponse}
              onChange={(e) => setUserResponse(e.target.value)}
              placeholder="Write your documentation here..."
              className="min-h-[120px]"
            />
            <div className="flex justify-between items-center mt-2">
              <p className="text-xs text-slate-400">{userResponse.length} characters</p>
              <Button
                onClick={evaluateResponse}
                disabled={userResponse.length < 20 || isEvaluating}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                {isEvaluating ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Evaluating...</>
                ) : (
                  <><Brain className="w-4 h-4 mr-2" /> Get Feedback</>
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Feedback Display */}
      {feedback && (
        <div className="space-y-4">
          {/* Score */}
          <div className={`text-center p-4 rounded-lg ${
            feedback.score >= 80 ? 'bg-green-50 border border-green-200' :
            feedback.score >= 60 ? 'bg-yellow-50 border border-yellow-200' :
            'bg-orange-50 border border-orange-200'
          }`}>
            <div className={`text-4xl font-bold mb-1 ${
              feedback.score >= 80 ? 'text-green-600' :
              feedback.score >= 60 ? 'text-yellow-600' : 'text-orange-600'
            }`}>
              {feedback.score}%
            </div>
            <p className="text-sm text-slate-700">{feedback.overall_assessment}</p>
          </div>

          {/* Strengths */}
          {feedback.strengths?.length > 0 && (
            <div className="bg-green-50 p-3 rounded-lg">
              <p className="text-xs font-semibold text-green-800 mb-2 flex items-center gap-1">
                <CheckCircle2 className="w-4 h-4" /> What You Did Well
              </p>
              <ul className="space-y-1">
                {feedback.strengths.map((s, idx) => (
                  <li key={idx} className="text-xs text-green-700">✓ {s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Improvements */}
          {feedback.improvements_needed?.length > 0 && (
            <div className="bg-orange-50 p-3 rounded-lg">
              <p className="text-xs font-semibold text-orange-800 mb-2 flex items-center gap-1">
                <AlertTriangle className="w-4 h-4" /> Areas to Improve
              </p>
              <ul className="space-y-1">
                {feedback.improvements_needed.map((i, idx) => (
                  <li key={idx} className="text-xs text-orange-700">• {i}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Missing Elements */}
          {feedback.missing_elements?.length > 0 && (
            <div className="bg-red-50 p-3 rounded-lg">
              <p className="text-xs font-semibold text-red-800 mb-2 flex items-center gap-1">
                <XCircle className="w-4 h-4" /> Missing Elements
              </p>
              <ul className="space-y-1">
                {feedback.missing_elements.map((m, idx) => (
                  <li key={idx} className="text-xs text-red-700">✗ {m}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Example Improvement */}
          {feedback.example_improvement && (
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-xs font-semibold text-blue-800 mb-1">Example Improvement:</p>
              <p className="text-xs text-blue-900 italic">"{feedback.example_improvement}"</p>
            </div>
          )}

          {/* Medicare Tip */}
          {feedback.medicare_tip && (
            <div className="bg-indigo-50 p-3 rounded-lg">
              <p className="text-xs font-semibold text-indigo-800 mb-1 flex items-center gap-1">
                <GraduationCap className="w-3 h-3" /> Medicare Compliance Tip:
              </p>
              <p className="text-xs text-indigo-700">{feedback.medicare_tip}</p>
            </div>
          )}

          {/* Encouragement */}
          <div className="text-center p-3 bg-purple-50 rounded-lg">
            <p className="text-sm text-purple-800 italic">"{feedback.encouragement}"</p>
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={resetPractice} className="flex-1">
              <RotateCcw className="w-4 h-4 mr-2" /> Try Again
            </Button>
            <Button onClick={generateScenario} className="flex-1 bg-indigo-600 hover:bg-indigo-700">
              Next Scenario <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );

  if (isOpen !== undefined) {
    return (
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-600" />
              Documentation Practice
            </DialogTitle>
          </DialogHeader>
          {content}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Card className="border-indigo-200">
      <CardHeader className="py-3 bg-gradient-to-r from-indigo-50 to-purple-50">
        <CardTitle className="text-sm flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-indigo-600" />
          Practice Scenarios
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        {content}
      </CardContent>
    </Card>
  );
}
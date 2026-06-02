import { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  GraduationCap, 
  Loader2, 
  TrendingUp,
  Target,
  Award,
  Lightbulb,
  ChevronDown,
  ChevronUp
} from "lucide-react";

export default function PersonalizedFeedback({ 
  auditResults,
  userEmail 
}) {
  const [feedback, setFeedback] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isExpanded, setIsExpanded] = useState(true);
  const [historicalScores, setHistoricalScores] = useState([]);

  // Track scores over time (simulated with local storage)
  useEffect(() => {
    if (auditResults?.quality_score) {
      try {
        const stored = localStorage.getItem(`doc_scores_${userEmail}`) || '[]';
        const scores = JSON.parse(stored);
        scores.push({
          date: new Date().toISOString(),
          score: auditResults.quality_score,
          compliance: auditResults.compliance_items_present?.length || 0,
          missing: auditResults.missing_critical_elements?.length || 0
        });
        // Keep last 10 scores
        const recentScores = scores.slice(-10);
        localStorage.setItem(`doc_scores_${userEmail}`, JSON.stringify(recentScores));
        setHistoricalScores(recentScores);
      } catch {}
    }
  }, [auditResults, userEmail]);

  const generateFeedback = async () => {
    if (!auditResults) return;

    setIsGenerating(true);
    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a clinical documentation coach providing personalized feedback to improve a nurse's documentation skills.

CURRENT AUDIT RESULTS:
- Quality Score: ${auditResults.quality_score || 'N/A'}/100
- Compliance Items Present: ${JSON.stringify(auditResults.compliance_items_present || [])}
- Missing Critical Elements: ${JSON.stringify(auditResults.missing_critical_elements || [])}
- Suggestions Given: ${JSON.stringify(auditResults.suggestions?.slice(0, 5) || [])}

HISTORICAL PERFORMANCE (last 10 notes):
${JSON.stringify(historicalScores)}

Analyze the nurse's documentation patterns and provide:
1. Personalized strengths to maintain
2. Specific areas for improvement with actionable tips
3. Skill-building exercises
4. Progress tracking insights

Return JSON:
{
  "overall_assessment": "Brief overall assessment",
  "score_trend": "improving" | "stable" | "declining",
  "strengths": [
    {
      "area": "Strength area",
      "tip": "How to maintain this"
    }
  ],
  "improvement_areas": [
    {
      "area": "Area to improve",
      "current_issue": "What's missing or wrong",
      "action_tip": "Specific actionable tip",
      "example": "Example of good documentation for this"
    }
  ],
  "skill_exercises": [
    {
      "exercise": "Exercise name",
      "description": "What to practice",
      "benefit": "How this helps"
    }
  ],
  "next_goal": "Specific goal for next documentation session",
  "encouragement": "Motivational message"
}`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_assessment: { type: "string" },
            score_trend: { type: "string" },
            strengths: { type: "array", items: { type: "object" } },
            improvement_areas: { type: "array", items: { type: "object" } },
            skill_exercises: { type: "array", items: { type: "object" } },
            next_goal: { type: "string" },
            encouragement: { type: "string" }
          }
        }
      });

      setFeedback(result);
    } catch (error) {
      console.error("Error generating feedback:", error);
    }
    setIsGenerating(false);
  };

  const getTrendIcon = (trend) => {
    switch (trend) {
      case "improving":
        return <TrendingUp className="w-4 h-4 text-green-600" />;
      case "declining":
        return <TrendingUp className="w-4 h-4 text-red-600 rotate-180" />;
      default:
        return <Target className="w-4 h-4 text-blue-600" />;
    }
  };

  const averageScore = historicalScores.length > 0
    ? Math.round(historicalScores.reduce((sum, s) => sum + s.score, 0) / historicalScores.length)
    : null;

  if (!auditResults) {
    return null;
  }

  return (
    <Card className="border-purple-200">
      <CardHeader className="py-3 bg-gradient-to-r from-purple-50 to-pink-50">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-purple-600" />
            Personal Documentation Coach
          </CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0"
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="p-3">
          {/* Score Overview */}
          <div className="bg-white p-3 rounded border mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Current Score</span>
              <Badge className="bg-purple-100 text-purple-800">
                {auditResults.quality_score || 0}/100
              </Badge>
            </div>
            <Progress value={auditResults.quality_score || 0} className="h-2" />
            
            {averageScore && (
              <div className="flex items-center justify-between mt-2 text-xs text-gray-600">
                <span>Your Average: {averageScore}/100</span>
                <span>{historicalScores.length} notes tracked</span>
              </div>
            )}
          </div>

          {!feedback ? (
            <Button
              onClick={generateFeedback}
              disabled={isGenerating}
              className="w-full bg-purple-600 hover:bg-purple-700"
              size="sm"
            >
              {isGenerating ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
              ) : (
                <><GraduationCap className="w-4 h-4 mr-2" /> Get Personalized Feedback</>
              )}
            </Button>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {/* Trend & Assessment */}
              <div className="flex items-center gap-2">
                {getTrendIcon(feedback.score_trend)}
                <span className="text-sm font-medium capitalize">{feedback.score_trend}</span>
              </div>
              <p className="text-xs text-gray-700">{feedback.overall_assessment}</p>

              {/* Strengths */}
              {feedback.strengths?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-green-700 mb-1 flex items-center gap-1">
                    <Award className="w-3 h-3" /> Your Strengths
                  </p>
                  {feedback.strengths.map((s, idx) => (
                    <div key={idx} className="bg-green-50 p-2 rounded text-xs mb-1">
                      <strong>{s.area}</strong>
                      <p className="text-gray-600">{s.tip}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Improvement Areas */}
              {feedback.improvement_areas?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-orange-700 mb-1 flex items-center gap-1">
                    <Target className="w-3 h-3" /> Focus Areas
                  </p>
                  {feedback.improvement_areas.map((area, idx) => (
                    <div key={idx} className="bg-orange-50 p-2 rounded text-xs mb-1 border border-orange-200">
                      <strong>{area.area}</strong>
                      <p className="text-gray-600 mb-1">{area.current_issue}</p>
                      <p className="text-orange-800"><strong>Tip:</strong> {area.action_tip}</p>
                      {area.example && (
                        <p className="text-gray-500 italic mt-1 text-xs">Example: "{area.example}"</p>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Skill Exercises */}
              {feedback.skill_exercises?.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-blue-700 mb-1 flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" /> Practice Exercises
                  </p>
                  {feedback.skill_exercises.map((ex, idx) => (
                    <div key={idx} className="bg-blue-50 p-2 rounded text-xs mb-1">
                      <strong>{ex.exercise}</strong>
                      <p className="text-gray-600">{ex.description}</p>
                    </div>
                  ))}
                </div>
              )}

              {/* Next Goal */}
              {feedback.next_goal && (
                <div className="bg-purple-50 p-2 rounded border border-purple-200">
                  <p className="text-xs font-semibold text-purple-700">🎯 Your Next Goal</p>
                  <p className="text-xs text-gray-700">{feedback.next_goal}</p>
                </div>
              )}

              {/* Encouragement */}
              {feedback.encouragement && (
                <p className="text-xs text-center text-purple-600 italic">
                  💜 {feedback.encouragement}
                </p>
              )}

              <Button
                size="sm"
                variant="outline"
                className="w-full text-xs"
                onClick={() => setFeedback(null)}
              >
                Refresh Feedback
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
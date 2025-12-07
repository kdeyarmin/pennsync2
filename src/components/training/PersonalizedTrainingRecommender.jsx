import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Target,
  TrendingUp,
  AlertCircle,
  Brain,
  ArrowRight,
  Lightbulb,
  FileText,
  CheckCircle2
} from "lucide-react";

export default function PersonalizedTrainingRecommender({ 
  nurseEmail, 
  onStartTraining 
}) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [aiRecommendations, setAiRecommendations] = useState(null);

  const { data: suggestions = [] } = useQuery({
    queryKey: ['nurseSuggestions', nurseEmail],
    queryFn: () => base44.entities.TrainingRecommendation.filter({
      nurse_email: nurseEmail,
      addressed: false
    }, '-created_date', 50),
    enabled: !!nurseEmail,
  });

  const { data: completedTraining = [] } = useQuery({
    queryKey: ['nurseCompletedTraining', nurseEmail],
    queryFn: () => base44.entities.MicroLearningProgress.filter({
      nurse_email: nurseEmail,
      status: 'completed'
    }),
    enabled: !!nurseEmail,
  });

  // Analyze deficits
  const deficitAnalysis = React.useMemo(() => {
    const categoryCounts = suggestions.reduce((acc, sugg) => {
      const category = sugg.recommendation_type;
      acc[category] = (acc[category] || 0) + 1;
      return acc;
    }, {});

    const sortedDeficits = Object.entries(categoryCounts)
      .map(([category, count]) => ({
        category,
        count,
        severity: count >= 5 ? 'high' : count >= 3 ? 'medium' : 'low',
        recentExamples: suggestions
          .filter(s => s.recommendation_type === category)
          .slice(0, 3)
          .map(s => s.recommendation_text)
      }))
      .sort((a, b) => b.count - a.count);

    return sortedDeficits;
  }, [suggestions]);

  const generatePersonalizedPlan = async () => {
    setIsGenerating(true);
    try {
      const prompt = `You are an expert nursing education specialist. Analyze this nurse's documentation patterns and create a personalized training plan.

NURSE'S DEFICIT PATTERNS:
${deficitAnalysis.map(d => `- ${d.category}: ${d.count} suggestions\n  Examples: ${d.recentExamples.join('; ')}`).join('\n')}

COMPLETED TRAINING:
${completedTraining.map(t => `- ${t.skill_area} (Score: ${t.score}%)`).join('\n')}

Create a personalized training plan with specific, actionable recommendations.

Return JSON:
{
  "priorityAreas": [
    {
      "area": "area name",
      "urgency": "high/medium/low",
      "trainingModules": ["specific module 1", "specific module 2"],
      "rationale": "why this is important for this nurse",
      "estimatedTime": "time in minutes"
    }
  ],
  "strengthAreas": ["areas where nurse is doing well"],
  "overallStrategy": "personalized learning strategy summary"
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            priorityAreas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  area: { type: "string" },
                  urgency: { type: "string" },
                  trainingModules: { type: "array", items: { type: "string" } },
                  rationale: { type: "string" },
                  estimatedTime: { type: "string" }
                }
              }
            },
            strengthAreas: { type: "array", items: { type: "string" } },
            overallStrategy: { type: "string" }
          }
        }
      });

      setAiRecommendations(result);
    } catch (error) {
      console.error("Error generating plan:", error);
    }
    setIsGenerating(false);
  };

  return (
    <div className="space-y-6">
      {/* Deficit Summary */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-indigo-600" />
            Your Documentation Patterns
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {deficitAnalysis.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-3" />
              <p className="text-gray-600">Great job! No recent AI suggestions needed.</p>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600">
                Based on {suggestions.length} AI suggestions across your recent documentation:
              </p>
              <div className="space-y-3">
                {deficitAnalysis.slice(0, 5).map((deficit) => (
                  <div key={deficit.category} className="bg-white p-4 rounded-lg border">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <AlertCircle className={`w-4 h-4 ${
                          deficit.severity === 'high' ? 'text-red-600' :
                          deficit.severity === 'medium' ? 'text-orange-600' :
                          'text-yellow-600'
                        }`} />
                        <span className="font-medium text-gray-900 capitalize">
                          {deficit.category}
                        </span>
                      </div>
                      <Badge className={
                        deficit.severity === 'high' ? 'bg-red-100 text-red-800' :
                        deficit.severity === 'medium' ? 'bg-orange-100 text-orange-800' :
                        'bg-yellow-100 text-yellow-800'
                      }>
                        {deficit.count} suggestions
                      </Badge>
                    </div>
                    <div className="space-y-1">
                      {deficit.recentExamples.slice(0, 2).map((example, idx) => (
                        <p key={idx} className="text-xs text-gray-600 italic">
                          • {example.substring(0, 80)}...
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <Button
                onClick={generatePersonalizedPlan}
                disabled={isGenerating}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                {isGenerating ? (
                  <>
                    <Brain className="w-4 h-4 mr-2 animate-pulse" />
                    Analyzing Your Patterns...
                  </>
                ) : (
                  <>
                    <Lightbulb className="w-4 h-4 mr-2" />
                    Generate Personalized Training Plan
                  </>
                )}
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* AI-Generated Personalized Plan */}
      {aiRecommendations && (
        <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-blue-600" />
              Your Personalized Training Plan
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Overall Strategy */}
            <div className="bg-white p-4 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
                <TrendingUp className="w-4 h-4" />
                Recommended Strategy
              </h4>
              <p className="text-sm text-gray-700">{aiRecommendations.overallStrategy}</p>
            </div>

            {/* Strength Areas */}
            {aiRecommendations.strengthAreas?.length > 0 && (
              <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                <h4 className="font-semibold text-green-900 mb-2 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4" />
                  Your Strengths
                </h4>
                <div className="flex flex-wrap gap-2">
                  {aiRecommendations.strengthAreas.map((strength, idx) => (
                    <Badge key={idx} className="bg-green-600 text-white">
                      {strength}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Priority Training Areas */}
            <div className="space-y-4">
              <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-600" />
                Recommended Training Modules
              </h4>
              {aiRecommendations.priorityAreas.map((area, idx) => (
                <Card key={idx} className="hover:shadow-lg transition-all">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h5 className="font-semibold text-lg">{area.area}</h5>
                          <Badge className={
                            area.urgency === 'high' ? 'bg-red-100 text-red-800' :
                            area.urgency === 'medium' ? 'bg-orange-100 text-orange-800' :
                            'bg-yellow-100 text-yellow-800'
                          }>
                            {area.urgency} priority
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-3">{area.rationale}</p>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span>⏱️ {area.estimatedTime}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {area.trainingModules.map((module, mIdx) => (
                        <div key={mIdx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                          <div className="flex items-center gap-2">
                            <FileText className="w-3 h-3 text-gray-500" />
                            <span className="text-sm text-gray-700">{module}</span>
                          </div>
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => onStartTraining?.(area.area, module)}
                          >
                            Start
                            <ArrowRight className="w-3 h-3 ml-1" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
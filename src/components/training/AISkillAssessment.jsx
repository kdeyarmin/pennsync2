import React from "react";
import { base44 } from "@/api/base44Client";
// Standard component AI-call hook (shared timeout/retry + managed loading/error).
import { useAICall } from "@/hooks/useAICall";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Brain,
  TrendingUp,
  Target,
  Award,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Loader2,
  BookOpen,
  BarChart3,
  Download
} from "lucide-react";
import { toast } from 'sonner';

export default function AISkillAssessment({ userEmail }) {
  const [assessment, setAssessment] = React.useState(null);
  const ai = useAICall();
  const [isDownloading, setIsDownloading] = React.useState(false);

  const { data: trainingCompletions } = useQuery({
    queryKey: ['trainingCompletions', userEmail],
    queryFn: () => base44.entities.TrainingCompletion.filter({ nurse_email: userEmail }),
    initialData: []
  });

  const { data: practiceProgress } = useQuery({
    queryKey: ['practiceProgress', userEmail],
    queryFn: () => base44.entities.MicroLearningProgress.filter({ nurse_email: userEmail }),
    initialData: []
  });

  const { data: recommendations } = useQuery({
    queryKey: ['recommendations', userEmail],
    queryFn: () => base44.entities.TrainingRecommendation.filter({ nurse_email: userEmail }),
    initialData: []
  });

  const downloadAssessmentPDF = async () => {
    setIsDownloading(true);
    try {
      const response = await base44.functions.invoke('generateSkillAssessmentPDF', { assessment });
      const blob = new Blob([response.data], { type: 'application/pdf' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `Skill_Assessment_${new Date().toISOString().split('T')[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      a.remove();
    } catch (error) {
      console.error('Error downloading PDF:', error);
      toast.error('Failed to generate PDF report');
    }
    setIsDownloading(false);
  };

  const analyzeSkills = async () => {
    try {
      const prompt = `You are an expert clinical education specialist. Analyze this nurse's training performance data and provide a comprehensive skills assessment with personalized training recommendations.

TRAINING COMPLETIONS:
${JSON.stringify(trainingCompletions, null, 2)}

PRACTICE EXERCISES:
${JSON.stringify(practiceProgress, null, 2)}

TRAINING RECOMMENDATIONS HISTORY:
${JSON.stringify(recommendations.slice(-20), null, 2)}

ANALYZE AND PROVIDE:

1. Overall Skill Level (beginner/intermediate/advanced/expert)
2. Skill Breakdown by Category:
   - Documentation Compliance (0-100)
   - Clinical Knowledge (0-100)
   - Patient Assessment (0-100)
   - Care Planning (0-100)
   - Communication (0-100)

3. Strengths: Areas where the nurse excels
4. Growth Areas: Specific skills that need improvement
5. Learning Style Analysis: Based on performance patterns
6. Personalized Training Pathways: 3-5 specific advanced modules to take next

7. Performance Trends: Are skills improving, plateauing, or declining?
8. Time to Proficiency Estimate: For each growth area

Return JSON:
{
  "overall_skill_level": "beginner|intermediate|advanced|expert",
  "skill_scores": {
    "documentation_compliance": number,
    "clinical_knowledge": number,
    "patient_assessment": number,
    "care_planning": number,
    "communication": number
  },
  "strengths": [
    {
      "skill": "skill name",
      "description": "why this is a strength",
      "evidence": "specific examples from data"
    }
  ],
  "growth_areas": [
    {
      "skill": "skill name",
      "current_level": "description",
      "target_level": "description",
      "priority": "high|medium|low",
      "estimated_time_to_proficiency": "e.g., 2-3 weeks"
    }
  ],
  "learning_style": {
    "primary_style": "visual|auditory|kinesthetic|reading",
    "engagement_pattern": "description",
    "optimal_learning_time": "description"
  },
  "recommended_pathways": [
    {
      "pathway_name": "name",
      "description": "what this pathway covers",
      "modules": ["module 1", "module 2"],
      "expected_outcomes": ["outcome 1", "outcome 2"],
      "estimated_duration": "duration",
      "priority": "high|medium|low"
    }
  ],
  "performance_trends": {
    "trend": "improving|plateauing|declining",
    "insights": "analysis of trends",
    "recommendations": "what to do next"
  },
  "next_steps": [
    {
      "action": "specific action",
      "reason": "why this action",
      "timeline": "when to do this"
    }
  ]
}`;

      const result = await ai.run({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_skill_level: { type: "string" },
            skill_scores: {
              type: "object",
              properties: {
                documentation_compliance: { type: "number" },
                clinical_knowledge: { type: "number" },
                patient_assessment: { type: "number" },
                care_planning: { type: "number" },
                communication: { type: "number" }
              }
            },
            strengths: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  skill: { type: "string" },
                  description: { type: "string" },
                  evidence: { type: "string" }
                }
              }
            },
            growth_areas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  skill: { type: "string" },
                  current_level: { type: "string" },
                  target_level: { type: "string" },
                  priority: { type: "string" },
                  estimated_time_to_proficiency: { type: "string" }
                }
              }
            },
            learning_style: {
              type: "object",
              properties: {
                primary_style: { type: "string" },
                engagement_pattern: { type: "string" },
                optimal_learning_time: { type: "string" }
              }
            },
            recommended_pathways: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  pathway_name: { type: "string" },
                  description: { type: "string" },
                  modules: { type: "array", items: { type: "string" } },
                  expected_outcomes: { type: "array", items: { type: "string" } },
                  estimated_duration: { type: "string" },
                  priority: { type: "string" }
                }
              }
            },
            performance_trends: {
              type: "object",
              properties: {
                trend: { type: "string" },
                insights: { type: "string" },
                recommendations: { type: "string" }
              }
            },
            next_steps: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  action: { type: "string" },
                  reason: { type: "string" },
                  timeline: { type: "string" }
                }
              }
            }
          }
        }
      });

      setAssessment(result);
    } catch (error) {
      console.error('Error analyzing skills:', error);
      toast.error('Failed to generate the skills assessment. Please try again.');
    }
  };

  const skillLevelColors = {
    beginner: { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-300' },
    intermediate: { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-300' },
    advanced: { bg: 'bg-navy-100', text: 'text-navy-800', border: 'border-navy-300' },
    expert: { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-300' }
  };

  const priorityColors = {
    high: 'bg-red-100 text-red-800 border-red-300',
    medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
    low: 'bg-green-100 text-green-800 border-green-300'
  };

  if (!assessment) {
    return (
      <Card className="border-2 border-indigo-300">
        <CardContent className="p-8 text-center">
          <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-navy-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h3 className="text-xl font-bold text-slate-900 mb-2">AI Skills Assessment</h3>
          <p className="text-slate-600 mb-6 max-w-lg mx-auto">
            Get a comprehensive analysis of your skills across all training modules. AI will evaluate your performance, identify strengths and growth areas, and recommend personalized advanced training pathways.
          </p>
          <Button
            onClick={analyzeSkills}
            disabled={ai.loading || trainingCompletions.length === 0}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {ai.loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing Your Skills...
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 mr-2" />
                Generate Skills Assessment
              </>
            )}
          </Button>
          {trainingCompletions.length === 0 && (
            <p className="text-sm text-slate-500 mt-3">
              Complete some training modules first to generate your assessment
            </p>
          )}
        </CardContent>
      </Card>
    );
  }

  const levelColors = skillLevelColors[assessment.overall_skill_level] || skillLevelColors.beginner;

  return (
    <div className="space-y-6">
      {/* Overall Skill Level */}
      <Card className={`border-2 ${levelColors.border} bg-gradient-to-br from-white to-${levelColors.bg}`}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-6 h-6 text-indigo-600" />
                Your Skill Profile
              </CardTitle>
              <p className="text-sm text-slate-600 mt-1">AI-powered comprehensive assessment</p>
            </div>
            <div className="flex items-center gap-2">
              <Badge className={`${levelColors.bg} ${levelColors.text} text-lg px-4 py-2`}>
                {assessment.overall_skill_level.toUpperCase()}
              </Badge>
              <Button
                onClick={downloadAssessmentPDF}
                disabled={isDownloading}
                variant="outline"
                size="sm"
                className="gap-2"
              >
                {isDownloading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <><Download className="w-4 h-4" /> PDF</>
                )}
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {Object.entries(assessment.skill_scores).map(([skill, score]) => (
              <Card key={skill} className="bg-white border border-slate-200">
                <CardContent className="p-4">
                  <p className="text-xs text-slate-600 mb-2 capitalize">
                    {skill.replace(/_/g, ' ')}
                  </p>
                  <div className="flex items-end gap-2">
                    <span className="text-2xl font-bold text-slate-900">{Math.round(score)}</span>
                    <span className="text-sm text-slate-500 mb-1">/100</span>
                  </div>
                  <Progress value={score} className="h-2 mt-2" />
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Strengths */}
      {assessment.strengths?.length > 0 && (
        <Card className="border-2 border-green-300 bg-gradient-to-br from-green-50 to-emerald-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <CheckCircle2 className="w-5 h-5" />
              Your Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {assessment.strengths.map((strength, idx) => (
                <Card key={idx} className="bg-white border-green-200">
                  <CardContent className="p-4">
                    <h4 className="font-semibold text-slate-900 mb-1">{strength.skill}</h4>
                    <p className="text-sm text-slate-700 mb-2">{strength.description}</p>
                    <p className="text-xs text-slate-600 italic">Evidence: {strength.evidence}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Growth Areas */}
      {assessment.growth_areas?.length > 0 && (
        <Card className="border-2 border-orange-300 bg-gradient-to-br from-orange-50 to-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <Target className="w-5 h-5" />
              Growth Opportunities
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3">
              {assessment.growth_areas.map((area, idx) => (
                <Card key={idx} className={`bg-white border-2 ${priorityColors[area.priority]}`}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h4 className="font-semibold text-slate-900">{area.skill}</h4>
                      <Badge className={priorityColors[area.priority]}>
                        {area.priority} priority
                      </Badge>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600">Current:</span>
                        <span className="text-slate-900">{area.current_level}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <ArrowRight className="w-4 h-4 text-slate-400" />
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-600">Target:</span>
                        <span className="text-slate-900 font-medium">{area.target_level}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-600 mt-2">
                        <AlertCircle className="w-3 h-3" />
                        <span>Est. time to proficiency: {area.estimated_time_to_proficiency}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Learning Style */}
      {assessment.learning_style && (
        <Card className="border-2 border-navy-300 bg-gradient-to-br from-navy-50 to-gold-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-navy-900">
              <Brain className="w-5 h-5" />
              Your Learning Profile
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-3 gap-4">
              <Card className="bg-white border-navy-200">
                <CardContent className="p-4">
                  <p className="text-xs text-slate-600 mb-1">Primary Learning Style</p>
                  <p className="font-semibold text-navy-900 capitalize">
                    {assessment.learning_style.primary_style}
                  </p>
                </CardContent>
              </Card>
              <Card className="bg-white border-navy-200">
                <CardContent className="p-4">
                  <p className="text-xs text-slate-600 mb-1">Engagement Pattern</p>
                  <p className="text-sm text-slate-900">{assessment.learning_style.engagement_pattern}</p>
                </CardContent>
              </Card>
              <Card className="bg-white border-navy-200">
                <CardContent className="p-4">
                  <p className="text-xs text-slate-600 mb-1">Optimal Learning Time</p>
                  <p className="text-sm text-slate-900">{assessment.learning_style.optimal_learning_time}</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommended Training Pathways */}
      {assessment.recommended_pathways?.length > 0 && (
        <Card className="border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 to-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-900">
              <BookOpen className="w-5 h-5" />
              Personalized Training Pathways
            </CardTitle>
            <p className="text-sm text-slate-600">Recommended advanced training based on your profile</p>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <div className="grid gap-4 pr-4">
                {assessment.recommended_pathways.map((pathway, idx) => (
                  <Card key={idx} className={`bg-white border-2 ${priorityColors[pathway.priority]}`}>
                    <CardContent className="p-5">
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <h4 className="font-bold text-lg text-slate-900">{pathway.pathway_name}</h4>
                        <Badge className={priorityColors[pathway.priority]}>
                          {pathway.priority}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-700 mb-3">{pathway.description}</p>
                      
                      <div className="space-y-3">
                        <div>
                          <p className="text-xs font-semibold text-slate-600 mb-2">Modules:</p>
                          <div className="flex flex-wrap gap-2">
                            {pathway.modules.map((module, mIdx) => (
                              <Badge key={mIdx} variant="outline" className="bg-blue-50">
                                {module}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div>
                          <p className="text-xs font-semibold text-slate-600 mb-2">Expected Outcomes:</p>
                          <ul className="text-xs text-slate-700 space-y-1">
                            {pathway.expected_outcomes.map((outcome, oIdx) => (
                              <li key={oIdx} className="flex items-start gap-2">
                                <CheckCircle2 className="w-3 h-3 text-green-600 mt-0.5 flex-shrink-0" />
                                <span>{outcome}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                        
                        <div className="flex items-center gap-4 text-xs text-slate-600 pt-2 border-t">
                          <span className="flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" />
                            Duration: {pathway.estimated_duration}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Performance Trends */}
      {assessment.performance_trends && (
        <Card className="border-2 border-blue-300 bg-gradient-to-br from-blue-50 to-navy-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <TrendingUp className="w-5 h-5" />
              Performance Trends
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Badge className={
                  assessment.performance_trends.trend === 'improving' ? 'bg-green-600' :
                  assessment.performance_trends.trend === 'plateauing' ? 'bg-yellow-600' :
                  'bg-orange-600'
                }>
                  {assessment.performance_trends.trend}
                </Badge>
              </div>
              <p className="text-sm text-slate-700">{assessment.performance_trends.insights}</p>
              <Card className="bg-white border-blue-200">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-slate-600 mb-2">Recommendations:</p>
                  <p className="text-sm text-slate-900">{assessment.performance_trends.recommendations}</p>
                </CardContent>
              </Card>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Next Steps */}
      {assessment.next_steps?.length > 0 && (
        <Card className="border-2 border-navy-300 bg-gradient-to-br from-navy-50 to-emerald-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-navy-900">
              <Target className="w-5 h-5" />
              Your Next Steps
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {assessment.next_steps.map((step, idx) => (
                <Card key={idx} className="bg-white border-navy-200">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 bg-navy-600 text-white rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm">
                        {idx + 1}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-slate-900 mb-1">{step.action}</h4>
                        <p className="text-sm text-slate-700 mb-2">{step.reason}</p>
                        <p className="text-xs text-slate-600">Timeline: {step.timeline}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Refresh Button */}
      <Button
        onClick={analyzeSkills}
        disabled={ai.loading}
        variant="outline"
        className="w-full"
      >
        {ai.loading ? (
          <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Regenerating Assessment...</>
        ) : (
          <><BarChart3 className="w-4 h-4 mr-2" /> Refresh Assessment</>
        )}
      </Button>
    </div>
  );
}
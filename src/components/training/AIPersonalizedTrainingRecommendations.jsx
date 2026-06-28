import { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { useAICall } from "@/hooks/useAICall";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  GraduationCap, 
  TrendingUp, 
  AlertTriangle, 
  Target,
  BookOpen,
  Award,
  Sparkles,
  CheckCircle2,
  Clock,
  BarChart3
} from "lucide-react";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { toast } from 'sonner';

export default function AIPersonalizedTrainingRecommendations({ nurseEmail }) {
  const ai = useAICall();
  const [recommendations, setRecommendations] = useState(null);

  // Fetch nurse's documentation history
  const { data: visits = [] } = useQuery({
    queryKey: ['nurse-visits', nurseEmail],
    queryFn: () => base44.entities.Visit.filter({ created_by: nurseEmail }, '-created_date', 100),
    initialData: []
  });

  // Fetch training recommendations for this nurse
  const { data: existingRecommendations = [] } = useQuery({
    queryKey: ['training-recommendations', nurseEmail],
    queryFn: () => base44.entities.TrainingRecommendation.filter({ nurse_email: nurseEmail, addressed: false }),
    initialData: []
  });

  // Fetch completed training
  const { data: completedTraining = [] } = useQuery({
    queryKey: ['completed-training', nurseEmail],
    queryFn: () => base44.entities.TrainingCompletion.filter({ 
      nurse_email: nurseEmail, 
      status: 'completed' 
    }),
    initialData: []
  });

  // Fetch available training modules
  const { data: allModules = [] } = useQuery({
    queryKey: ['training-modules'],
    queryFn: () => base44.entities.TrainingModule.filter({}),
    initialData: []
  });

  const analyzeAndRecommend = useCallback(async () => {

    try {
      // Aggregate documentation patterns
      const _complianceIssues = existingRecommendations.filter(r => 
        r.recommendation_type === 'compliance' || r.recommendation_type === 'documentation'
      );

      const _clinicalIssues = existingRecommendations.filter(r => 
        r.recommendation_type === 'clinical'
      );

      // Group by context
      const issuesByContext = {};
      existingRecommendations.forEach(rec => {
        const context = rec.context_data?.element || rec.recommendation_type;
        if (!issuesByContext[context]) {
          issuesByContext[context] = [];
        }
        issuesByContext[context].push(rec);
      });

      const result = await ai.run({
        model: "claude_opus_4_8",
        prompt: `You are an expert nursing educator and clinical development specialist.

Analyze this nurse's documentation patterns and performance data to provide personalized training recommendations:

NURSE EMAIL: ${nurseEmail}

DOCUMENTATION STATISTICS:
- Total visits documented: ${visits.length}
- Recent visits (last 30): ${visits.slice(0, 30).length}
- Completed training modules: ${completedTraining.length}

IDENTIFIED GAPS & RECOMMENDATIONS:
${JSON.stringify(existingRecommendations.slice(0, 50), null, 2)}

ISSUE PATTERNS BY CATEGORY:
${JSON.stringify(Object.keys(issuesByContext).map(key => ({
  category: key,
  frequency: issuesByContext[key].length,
  examples: issuesByContext[key].slice(0, 3).map(r => r.recommendation_text)
})), null, 2)}

AVAILABLE TRAINING MODULES:
${JSON.stringify(allModules.map(m => ({
  id: m.id,
  title: m.title,
  category: m.category,
  module_type: m.module_type,
  related_skills: m.related_skills
})), null, 2)}

Provide comprehensive training recommendations:

**PRIORITY AREAS:**
Identify 3-5 highest priority skill gaps based on:
- Frequency of issues
- Severity/compliance impact
- Patient safety implications
- Reimbursement impact

For each priority area:
- skill_area: specific skill needing development
- current_performance: brief assessment (e.g., "60% compliance on homebound documentation")
- gap_description: what specifically needs improvement
- impact: why this matters (compliance, safety, reimbursement)
- priority_score: 1-10 (10 = most urgent)

**RECOMMENDED MODULES:**
Match priority areas to specific training modules:
- module_id: from available modules
- module_title: name of module
- relevance_explanation: why this module addresses the gap
- estimated_time: time to complete
- expected_improvement: what will improve after completion

**LEARNING PATH:**
Suggest a structured development plan:
- step_number: sequential order
- focus_area: what to learn
- action: specific activity (e.g., "Complete 'Homebound Documentation' module")
- timeline: when to complete (e.g., "Week 1-2")
- success_metric: how to measure improvement

**MICRO-LEARNING OPPORTUNITIES:**
Quick wins and just-in-time learning:
- topic: specific concept or skill
- trigger: when to review (e.g., "Before admission visits")
- quick_tip: brief actionable advice
- resource: where to learn more

**STRENGTHS:**
Identify what this nurse does well:
- strength_area: area of competency
- evidence: examples from data
- leverage_opportunity: how to use this strength

**PERFORMANCE GOALS:**
Specific, measurable goals:
- goal: what to achieve
- current_baseline: current performance
- target: desired performance
- timeframe: when to achieve
- tracking_method: how to measure progress

Be specific, actionable, and encouraging. Focus on growth and development, not criticism.`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_assessment: {
              type: "string",
              description: "Brief overall performance summary"
            },
            development_score: {
              type: "number",
              description: "Overall development score 0-100"
            },
            priority_areas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  skill_area: { type: "string" },
                  current_performance: { type: "string" },
                  gap_description: { type: "string" },
                  impact: { type: "string" },
                  priority_score: { type: "number" }
                }
              }
            },
            recommended_modules: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  module_id: { type: "string" },
                  module_title: { type: "string" },
                  relevance_explanation: { type: "string" },
                  estimated_time: { type: "string" },
                  expected_improvement: { type: "string" }
                }
              }
            },
            learning_path: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  step_number: { type: "number" },
                  focus_area: { type: "string" },
                  action: { type: "string" },
                  timeline: { type: "string" },
                  success_metric: { type: "string" }
                }
              }
            },
            micro_learning: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  topic: { type: "string" },
                  trigger: { type: "string" },
                  quick_tip: { type: "string" },
                  resource: { type: "string" }
                }
              }
            },
            strengths: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  strength_area: { type: "string" },
                  evidence: { type: "string" },
                  leverage_opportunity: { type: "string" }
                }
              }
            },
            performance_goals: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  goal: { type: "string" },
                  current_baseline: { type: "string" },
                  target: { type: "string" },
                  timeframe: { type: "string" },
                  tracking_method: { type: "string" }
                }
              }
            }
          }
        }
      });

      setRecommendations(result);
    } catch (error) {
      console.error('Error generating recommendations:', error);
    }
  }, [existingRecommendations, nurseEmail, visits, completedTraining, allModules]);

  useEffect(() => {
    // Guard with !recommendations && !ai.loading so a query refetch (which gives the
    // dependency arrays new identities) can't re-fire an expensive LLM call.
    if (nurseEmail && visits.length > 0 && existingRecommendations.length > 0 && !recommendations && !ai.loading) {
      analyzeAndRecommend();
    }
  }, [nurseEmail, visits, existingRecommendations, recommendations, ai.loading, analyzeAndRecommend]);

  const handleEnrollModule = async (moduleId) => {
    try {
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);

      await base44.entities.TrainingCompletion.create({
        nurse_email: nurseEmail,
        training_module_id: moduleId,
        status: 'assigned',
        due_date: dueDate.toISOString().split('T')[0]
      });

      toast.error('Enrolled in training module!');
    } catch (error) {
      console.error('Error enrolling:', error);
      toast.error('Failed to enroll in module');
    }
  };

  if (ai.loading) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <Sparkles className="w-12 h-12 text-blue-600 mx-auto mb-4 animate-pulse" />
          <p className="text-lg font-medium text-slate-700">Analyzing Your Performance...</p>
          <p className="text-sm text-slate-500 mt-2">
            Reviewing documentation patterns, compliance scores, and clinical gaps
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!recommendations && existingRecommendations.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            Personalized Training Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-600 mb-4">
            No recommendations available yet. Complete more documentation to receive personalized training suggestions.
          </p>
        </CardContent>
      </Card>
    );
  }

  if (!recommendations) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-blue-600" />
            Personalized Training Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={analyzeAndRecommend} className="bg-blue-600 hover:bg-blue-700">
            <Sparkles className="w-4 h-4 mr-2" />
            Generate Recommendations
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Overall Assessment */}
      <Card className="border-2 border-blue-300">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-blue-600" />
              Your Development Profile
            </CardTitle>
            <Badge className={`text-lg px-3 py-1 ${
              recommendations.development_score >= 80 ? 'bg-green-100 text-green-800' :
              recommendations.development_score >= 60 ? 'bg-yellow-100 text-yellow-800' :
              'bg-orange-100 text-orange-800'
            }`}>
              {recommendations.development_score}%
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-slate-700 mb-4">{recommendations.overall_assessment}</p>
          <Progress value={recommendations.development_score} className="h-3" />
        </CardContent>
      </Card>

      {/* Strengths */}
      {recommendations.strengths?.length > 0 && (
        <Card className="border-2 border-green-300 bg-green-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-900">
              <Award className="w-5 h-5" />
              Your Strengths
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.strengths.map((strength, index) => (
                <div key={index} className="bg-white p-3 rounded-lg border border-green-200">
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-slate-900">{strength.strength_area}</p>
                      <p className="text-sm text-slate-600 mt-1">{strength.evidence}</p>
                      <p className="text-xs text-green-700 mt-1 italic">
                        💡 {strength.leverage_opportunity}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Priority Development Areas */}
      {recommendations.priority_areas?.length > 0 && (
        <Card className="border-2 border-orange-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-900">
              <Target className="w-5 h-5" />
              Priority Development Areas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.priority_areas.map((area, index) => (
                <div key={index} className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-slate-900">{area.skill_area}</h4>
                        <Badge className="bg-orange-600 text-white">
                          Priority {area.priority_score}/10
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600">{area.current_performance}</p>
                    </div>
                  </div>
                  <p className="text-sm text-slate-700 mb-2">{area.gap_description}</p>
                  <div className="bg-white p-2 rounded border border-orange-200">
                    <p className="text-xs text-orange-900">
                      <AlertTriangle className="w-3 h-3 inline mr-1" />
                      <strong>Impact:</strong> {area.impact}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Recommended Training Modules */}
      {recommendations.recommended_modules?.length > 0 && (
        <Card className="border-2 border-navy-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-navy-900">
              <BookOpen className="w-5 h-5" />
              Recommended Training Modules
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Accordion type="multiple" className="space-y-2">
              {recommendations.recommended_modules.map((module, index) => (
                <AccordionItem key={index} value={`module-${index}`} className="border rounded-lg">
                  <AccordionTrigger className="px-3 hover:no-underline">
                    <div className="flex items-center gap-2">
                      <GraduationCap className="w-4 h-4 text-navy-600" />
                      <span className="font-medium text-left">{module.module_title}</span>
                      <Badge variant="outline" className="ml-auto">
                        <Clock className="w-3 h-3 mr-1" />
                        {module.estimated_time}
                      </Badge>
                    </div>
                  </AccordionTrigger>
                  <AccordionContent className="px-3 pb-3">
                    <div className="space-y-3">
                      <div>
                        <p className="text-xs font-semibold text-slate-700 mb-1">Why This Module:</p>
                        <p className="text-sm text-slate-600">{module.relevance_explanation}</p>
                      </div>
                      <div>
                        <p className="text-xs font-semibold text-slate-700 mb-1">Expected Improvement:</p>
                        <p className="text-sm text-green-700">{module.expected_improvement}</p>
                      </div>
                      <Button 
                        size="sm" 
                        onClick={() => handleEnrollModule(module.module_id)}
                        className="bg-navy-600 hover:bg-navy-700 w-full"
                      >
                        <GraduationCap className="w-4 h-4 mr-2" />
                        Enroll in This Module
                      </Button>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </CardContent>
        </Card>
      )}

      {/* Learning Path */}
      {recommendations.learning_path?.length > 0 && (
        <Card className="border-2 border-blue-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-900">
              <TrendingUp className="w-5 h-5" />
              Your Personalized Learning Path
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recommendations.learning_path.map((step, index) => (
                <div key={index} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center font-bold">
                      {step.step_number}
                    </div>
                    {index < recommendations.learning_path.length - 1 && (
                      <div className="w-0.5 h-full bg-blue-200 my-1" />
                    )}
                  </div>
                  <div className="flex-1 pb-4">
                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                      <h4 className="font-semibold text-slate-900 mb-1">{step.focus_area}</h4>
                      <p className="text-sm text-slate-700 mb-2">{step.action}</p>
                      <div className="flex items-center gap-4 text-xs text-slate-600">
                        <span>
                          <Clock className="w-3 h-3 inline mr-1" />
                          {step.timeline}
                        </span>
                        <span>📊 {step.success_metric}</span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Performance Goals */}
      {recommendations.performance_goals?.length > 0 && (
        <Card className="border-2 border-indigo-300">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-indigo-900">
              <Target className="w-5 h-5" />
              Your Performance Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recommendations.performance_goals.map((goal, index) => (
                <div key={index} className="bg-indigo-50 p-4 rounded-lg border border-indigo-200">
                  <h4 className="font-semibold text-slate-900 mb-2">{goal.goal}</h4>
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <div>
                      <p className="text-xs text-slate-600">Current</p>
                      <p className="text-sm font-medium text-slate-900">{goal.current_baseline}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-600">Target</p>
                      <p className="text-sm font-medium text-green-700">{goal.target}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between text-xs text-slate-600">
                    <span>⏰ {goal.timeframe}</span>
                    <span>📈 {goal.tracking_method}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Tips */}
      {recommendations.micro_learning?.length > 0 && (
        <Card className="border-2 border-yellow-300 bg-yellow-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-900">
              <Sparkles className="w-5 h-5" />
              Quick Tips & Micro-Learning
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {recommendations.micro_learning.map((tip, index) => (
                <div key={index} className="bg-white p-3 rounded border border-yellow-200">
                  <div className="flex items-start gap-2">
                    <div className="w-6 h-6 rounded-full bg-yellow-400 text-yellow-900 flex items-center justify-center text-xs font-bold flex-shrink-0">
                      {index + 1}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-900">{tip.topic}</p>
                      <p className="text-xs text-slate-600 mt-1">💡 {tip.quick_tip}</p>
                      <p className="text-xs text-yellow-700 mt-1">
                        <strong>When:</strong> {tip.trigger}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
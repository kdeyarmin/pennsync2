import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Brain,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Target,
  Award,
  Loader2,
  Sparkles,
  Clock,
  BarChart3
} from "lucide-react";

export default function AIPersonalizedTrainingHub({ nurseEmail }) {
  const [isGeneratingPath, setIsGeneratingPath] = useState(false);
  const [learningPath, setLearningPath] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);

  // Fetch nurse's compliance audits
  const { data: complianceAudits = [] } = useQuery({
    queryKey: ['nurseComplianceAudits', nurseEmail],
    queryFn: () => base44.entities.ComplianceAudit.filter({ nurse_email: nurseEmail }, '-audit_date', 50),
    enabled: !!nurseEmail
  });

  // Fetch AI training recommendations
  const { data: recommendations = [] } = useQuery({
    queryKey: ['nurseRecommendations', nurseEmail],
    queryFn: () => base44.entities.TrainingRecommendation.filter({ nurse_email: nurseEmail, addressed: false }, '-created_date', 100),
    enabled: !!nurseEmail
  });

  // Fetch training completions
  const { data: completions = [] } = useQuery({
    queryKey: ['nurseTrainingCompletions', nurseEmail],
    queryFn: () => base44.entities.TrainingCompletion.filter({ nurse_email: nurseEmail }, '-completion_date', 100),
    enabled: !!nurseEmail
  });

  // Fetch available training modules
  const { data: allModules = [] } = useQuery({
    queryKey: ['trainingModules'],
    queryFn: () => base44.entities.TrainingModule.filter({ is_active: true }),
  });

  // Calculate skill gaps and performance metrics
  const skillGaps = React.useMemo(() => {
    const gaps = {};
    
    // Analyze compliance issues
    complianceAudits.forEach(audit => {
      if (audit.compliance_score < 85) {
        audit.issues?.forEach(issue => {
          const category = issue.element || 'general';
          if (!gaps[category]) {
            gaps[category] = { count: 0, severity: [], examples: [] };
          }
          gaps[category].count++;
          gaps[category].severity.push(issue.severity);
          gaps[category].examples.push(issue.problem);
        });
      }
    });

    // Analyze AI recommendations
    recommendations.forEach(rec => {
      const category = rec.recommendation_type;
      if (!gaps[category]) {
        gaps[category] = { count: 0, severity: [], examples: [] };
      }
      gaps[category].count++;
      gaps[category].severity.push(rec.severity);
      gaps[category].examples.push(rec.recommendation_text);
    });

    return Object.entries(gaps).map(([category, data]) => ({
      category,
      occurrences: data.count,
      avgSeverity: data.severity.filter(s => s === 'high' || s === 'critical').length / data.count,
      examples: data.examples.slice(0, 3),
      priority: data.count * (data.severity.filter(s => s === 'critical').length * 3 + 
                data.severity.filter(s => s === 'high').length * 2 + 
                data.severity.filter(s => s === 'medium').length)
    })).sort((a, b) => b.priority - a.priority);
  }, [complianceAudits, recommendations]);

  // Calculate overall performance metrics
  const performanceMetrics = React.useMemo(() => {
    const recentAudits = complianceAudits.slice(0, 10);
    const avgCompliance = recentAudits.reduce((sum, a) => sum + (a.compliance_score || 0), 0) / (recentAudits.length || 1);
    
    const completedModules = completions.filter(c => c.status === 'completed').length;
    const avgScore = completions.filter(c => c.score).reduce((sum, c) => sum + c.score, 0) / (completions.filter(c => c.score).length || 1);
    
    const criticalIssues = recommendations.filter(r => r.severity === 'critical').length;
    const highIssues = recommendations.filter(r => r.severity === 'high').length;

    return {
      avgCompliance: Math.round(avgCompliance),
      completedModules,
      avgScore: Math.round(avgScore),
      criticalIssues,
      highIssues,
      totalRecommendations: recommendations.length,
      improvementTrend: recentAudits.length >= 2 ? 
        recentAudits[0].compliance_score - recentAudits[recentAudits.length - 1].compliance_score : 0
    };
  }, [complianceAudits, completions, recommendations]);

  // Generate AI-powered learning path
  const generateLearningPath = async () => {
    setIsGeneratingPath(true);
    try {
      const prompt = `You are an expert clinical training specialist. Analyze this nurse's performance data and create a personalized learning path.

NURSE PERFORMANCE SUMMARY:
- Average Compliance Score: ${performanceMetrics.avgCompliance}%
- Completed Training Modules: ${performanceMetrics.completedModules}
- Average Training Score: ${performanceMetrics.avgScore}%
- Critical Issues: ${performanceMetrics.criticalIssues}
- High Priority Issues: ${performanceMetrics.highIssues}
- Improvement Trend: ${performanceMetrics.improvementTrend > 0 ? 'Improving' : 'Needs attention'} (${performanceMetrics.improvementTrend.toFixed(1)}%)

IDENTIFIED SKILL GAPS (Top 10):
${skillGaps.slice(0, 10).map((gap, idx) => `${idx + 1}. ${gap.category}: ${gap.occurrences} occurrences
   Examples: ${gap.examples.slice(0, 2).join('; ')}`).join('\n')}

RECENT AI RECOMMENDATIONS:
${recommendations.slice(0, 15).map(r => `- ${r.recommendation_type}: ${r.recommendation_text.substring(0, 100)}...`).join('\n')}

AVAILABLE TRAINING MODULES:
${allModules.slice(0, 20).map(m => `- ${m.title} (${m.category}, ${m.difficulty_level})`).join('\n')}

Create a personalized 4-week learning path with:
1. Priority ranking of areas to address
2. Specific modules to complete (from available modules)
3. Custom micro-lessons for gaps without existing modules
4. Weekly goals and milestones
5. Expected compliance improvement`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            priority_areas: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  area: { type: "string" },
                  severity: { type: "string" },
                  current_proficiency: { type: "string" },
                  target_proficiency: { type: "string" },
                  estimated_hours: { type: "number" }
                }
              }
            },
            weekly_plan: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  week: { type: "number" },
                  focus_area: { type: "string" },
                  modules: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        title: { type: "string" },
                        type: { type: "string" },
                        duration_minutes: { type: "number" },
                        description: { type: "string" }
                      }
                    }
                  },
                  goals: { type: "array", items: { type: "string" } },
                  success_criteria: { type: "string" }
                }
              }
            },
            custom_micro_lessons: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string" },
                  skill_area: { type: "string" },
                  content: { type: "string" },
                  practice_scenario: { type: "string" },
                  key_points: { type: "array", items: { type: "string" } }
                }
              }
            },
            expected_outcomes: {
              type: "object",
              properties: {
                compliance_improvement: { type: "number" },
                timeline: { type: "string" },
                key_milestones: { type: "array", items: { type: "string" } }
              }
            }
          }
        }
      });

      setLearningPath(result);
    } catch (error) {
      console.error('Error generating learning path:', error);
    }
    setIsGeneratingPath(false);
  };

  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-300';
      default: return 'bg-blue-100 text-blue-800 border-blue-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Performance Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-2 border-blue-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Avg Compliance</p>
                <p className="text-3xl font-bold text-blue-600">{performanceMetrics.avgCompliance}%</p>
              </div>
              <BarChart3 className="w-10 h-10 text-blue-600" />
            </div>
            {performanceMetrics.improvementTrend !== 0 && (
              <div className={`flex items-center gap-1 mt-2 text-sm ${performanceMetrics.improvementTrend > 0 ? 'text-green-600' : 'text-red-600'}`}>
                <TrendingUp className="w-4 h-4" />
                {performanceMetrics.improvementTrend > 0 ? '+' : ''}{performanceMetrics.improvementTrend.toFixed(1)}% trend
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-2 border-green-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Training Modules</p>
                <p className="text-3xl font-bold text-green-600">{performanceMetrics.completedModules}</p>
              </div>
              <Award className="w-10 h-10 text-green-600" />
            </div>
            <p className="text-sm text-gray-500 mt-2">Avg Score: {performanceMetrics.avgScore}%</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-orange-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Priority Issues</p>
                <p className="text-3xl font-bold text-orange-600">{performanceMetrics.criticalIssues + performanceMetrics.highIssues}</p>
              </div>
              <AlertTriangle className="w-10 h-10 text-orange-600" />
            </div>
            <p className="text-sm text-gray-500 mt-2">{performanceMetrics.criticalIssues} critical, {performanceMetrics.highIssues} high</p>
          </CardContent>
        </Card>

        <Card className="border-2 border-purple-200">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">AI Recommendations</p>
                <p className="text-3xl font-bold text-purple-600">{performanceMetrics.totalRecommendations}</p>
              </div>
              <Brain className="w-10 h-10 text-purple-600" />
            </div>
            <p className="text-sm text-gray-500 mt-2">To be addressed</p>
          </CardContent>
        </Card>
      </div>

      {/* AI Learning Path Generator */}
      <Card className="border-2 border-indigo-300 bg-gradient-to-br from-indigo-50 to-purple-50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" />
            AI-Powered Personalized Learning Path
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!learningPath ? (
            <div className="text-center py-8">
              <Brain className="w-16 h-16 mx-auto text-indigo-600 mb-4" />
              <h3 className="text-lg font-semibold mb-2">Generate Your Custom Learning Path</h3>
              <p className="text-gray-600 mb-6">AI will analyze your performance data, compliance history, and skill gaps to create a personalized 4-week training plan.</p>
              <Button
                onClick={generateLearningPath}
                disabled={isGeneratingPath}
                className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700"
              >
                {isGeneratingPath ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Analyzing Performance Data...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Generate Learning Path</>
                )}
              </Button>
            </div>
          ) : (
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="weekly">Weekly Plan</TabsTrigger>
                <TabsTrigger value="micro">Micro-Lessons</TabsTrigger>
                <TabsTrigger value="outcomes">Outcomes</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-4">
                <h3 className="font-semibold text-lg">Priority Areas</h3>
                <div className="space-y-3">
                  {learningPath.priority_areas?.map((area, idx) => (
                    <div key={idx} className="border rounded-lg p-4 bg-white">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{area.area}</h4>
                            <Badge className={getSeverityColor(area.severity)}>
                              {area.severity}
                            </Badge>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
                            <p>Current: <span className="font-medium">{area.current_proficiency}</span></p>
                            <p>Target: <span className="font-medium text-green-600">{area.target_proficiency}</span></p>
                          </div>
                        </div>
                        <div className="text-right">
                          <Clock className="w-4 h-4 inline mr-1 text-gray-500" />
                          <span className="text-sm text-gray-600">{area.estimated_hours}h</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>

              <TabsContent value="weekly" className="space-y-4">
                {learningPath.weekly_plan?.map((week) => (
                  <Card key={week.week} className="border-2">
                    <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
                      <CardTitle className="text-base">
                        Week {week.week}: {week.focus_area}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Modules:</h4>
                        <div className="space-y-2">
                          {week.modules?.map((module, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                              <div>
                                <p className="font-medium text-sm">{module.title}</p>
                                <p className="text-xs text-gray-600">{module.description}</p>
                              </div>
                              <Badge variant="outline">{module.duration_minutes}min</Badge>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Goals:</h4>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                          {week.goals?.map((goal, idx) => (
                            <li key={idx}>{goal}</li>
                          ))}
                        </ul>
                      </div>
                      <Alert>
                        <Target className="w-4 h-4" />
                        <AlertDescription className="text-sm">
                          <strong>Success Criteria:</strong> {week.success_criteria}
                        </AlertDescription>
                      </Alert>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="micro" className="space-y-4">
                {learningPath.custom_micro_lessons?.map((lesson, idx) => (
                  <Card key={idx} className="border-2 border-purple-200">
                    <CardHeader className="bg-gradient-to-r from-purple-50 to-pink-50">
                      <CardTitle className="text-base">{lesson.title}</CardTitle>
                      <Badge className="w-fit">{lesson.skill_area}</Badge>
                    </CardHeader>
                    <CardContent className="pt-4 space-y-3">
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Content:</h4>
                        <p className="text-sm text-gray-700">{lesson.content}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Practice Scenario:</h4>
                        <div className="bg-blue-50 border border-blue-200 rounded p-3 text-sm">
                          {lesson.practice_scenario}
                        </div>
                      </div>
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Key Points:</h4>
                        <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                          {lesson.key_points?.map((point, pidx) => (
                            <li key={pidx}>{point}</li>
                          ))}
                        </ul>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </TabsContent>

              <TabsContent value="outcomes" className="space-y-4">
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <AlertDescription>
                    <strong className="text-green-900">Expected Compliance Improvement:</strong>
                    <p className="text-green-800 mt-1">
                      +{learningPath.expected_outcomes?.compliance_improvement}% within {learningPath.expected_outcomes?.timeline}
                    </p>
                  </AlertDescription>
                </Alert>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base">Key Milestones</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {learningPath.expected_outcomes?.key_milestones?.map((milestone, idx) => (
                        <div key={idx} className="flex items-start gap-3">
                          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm font-semibold text-indigo-600">{idx + 1}</span>
                          </div>
                          <p className="text-sm text-gray-700 pt-1">{milestone}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                <Button
                  onClick={generateLearningPath}
                  variant="outline"
                  className="w-full"
                >
                  Regenerate Learning Path
                </Button>
              </TabsContent>
            </Tabs>
          )}
        </CardContent>
      </Card>

      {/* Skill Gaps Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="w-5 h-5 text-orange-600" />
            Identified Skill Gaps ({skillGaps.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {skillGaps.slice(0, 8).map((gap, idx) => (
              <div key={idx} className="border rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-semibold capitalize">{gap.category.replace(/_/g, ' ')}</h4>
                  <Badge variant="outline">{gap.occurrences} times</Badge>
                </div>
                <div className="space-y-1">
                  {gap.examples.slice(0, 2).map((example, eidx) => (
                    <p key={eidx} className="text-xs text-gray-600 italic">• {example.substring(0, 100)}...</p>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
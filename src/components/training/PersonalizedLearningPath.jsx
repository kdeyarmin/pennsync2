import React, { useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  GraduationCap,
  Target,
  TrendingUp,
  Award,
  BookOpen,
  CheckCircle2,
  Clock,
  Brain,
  RefreshCw,
  ChevronRight,
  Star
} from "lucide-react";

const KNOWLEDGE_AREAS = [
  { id: 'oasis', name: 'OASIS Documentation', icon: '📋' },
  { id: 'medicare_compliance', name: 'Medicare Compliance', icon: '📜' },
  { id: 'clinical_assessment', name: 'Clinical Assessment', icon: '🩺' },
  { id: 'wound_care', name: 'Wound Care', icon: '🩹' },
  { id: 'cardiac_care', name: 'Cardiac Care', icon: '❤️' },
  { id: 'respiratory', name: 'Respiratory Care', icon: '🫁' },
  { id: 'diabetes', name: 'Diabetes Management', icon: '💉' },
  { id: 'hospice', name: 'Hospice & Palliative', icon: '🕊️' },
  { id: 'elder_care', name: 'Elder Care Best Practices', icon: '👴' },
  { id: 'quality_measures', name: 'Quality Measures', icon: '⭐' },
  { id: 'communication', name: 'Patient Communication', icon: '💬' },
  { id: 'safety', name: 'Safety & Fall Prevention', icon: '🛡️' }
];

export default function PersonalizedLearningPath({ userPerformance = [], userId }) {
  const [learningPath, setLearningPath] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [completedModules, setCompletedModules] = useState([]);

  useEffect(() => {
    const saved = localStorage.getItem(`learning_path_${userId}`);
    if (saved) {
      setLearningPath(JSON.parse(saved));
    }
    const completed = localStorage.getItem(`completed_modules_${userId}`);
    if (completed) {
      setCompletedModules(JSON.parse(completed));
    }
  }, [userId]);

  const generateLearningPath = async () => {
    setIsGenerating(true);
    try {
      const performanceSummary = userPerformance.length > 0 
        ? userPerformance.map(p => `${p.scenarioType}: ${p.score}%`).join(', ')
        : 'No completed scenarios yet';

      const prompt = `Create a personalized learning path for a home health/hospice nurse based on their performance.

PERFORMANCE DATA:
${performanceSummary}

KNOWLEDGE AREAS TO ASSESS:
${KNOWLEDGE_AREAS.map(a => a.name).join(', ')}

Based on the performance (or lack thereof), create a tailored learning path that:
1. Identifies knowledge gaps
2. Prioritizes areas needing improvement
3. Builds on existing strengths
4. Includes specific learning modules

Return JSON:
{
  "overall_assessment": "Brief assessment of current knowledge level",
  "skill_levels": [
    {
      "area": "Knowledge area name",
      "area_id": "area_id",
      "current_level": 0-100,
      "priority": "high|medium|low",
      "gap_description": "What needs improvement"
    }
  ],
  "recommended_path": [
    {
      "module_id": "unique_id",
      "title": "Module title",
      "area_id": "knowledge_area_id",
      "description": "What this module covers",
      "learning_objectives": ["Objective 1", "Objective 2"],
      "estimated_time": "15 mins",
      "difficulty": "beginner|intermediate|advanced",
      "content_type": "reading|interactive|quiz|scenario",
      "key_topics": ["Topic 1", "Topic 2"]
    }
  ],
  "quick_wins": ["Easy improvement 1", "Easy improvement 2"],
  "long_term_goals": ["Goal 1", "Goal 2"],
  "recommended_focus": "What to focus on first"
}`;

      const result = await base44.integrations.Core.InvokeLLM({
        prompt,
        response_json_schema: {
          type: "object",
          properties: {
            overall_assessment: { type: "string" },
            skill_levels: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  area: { type: "string" },
                  area_id: { type: "string" },
                  current_level: { type: "number" },
                  priority: { type: "string" },
                  gap_description: { type: "string" }
                }
              }
            },
            recommended_path: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  module_id: { type: "string" },
                  title: { type: "string" },
                  area_id: { type: "string" },
                  description: { type: "string" },
                  learning_objectives: { type: "array", items: { type: "string" } },
                  estimated_time: { type: "string" },
                  difficulty: { type: "string" },
                  content_type: { type: "string" },
                  key_topics: { type: "array", items: { type: "string" } }
                }
              }
            },
            quick_wins: { type: "array", items: { type: "string" } },
            long_term_goals: { type: "array", items: { type: "string" } },
            recommended_focus: { type: "string" }
          }
        }
      });

      setLearningPath(result);
      localStorage.setItem(`learning_path_${userId}`, JSON.stringify(result));
    } catch (error) {
      console.error('Error generating learning path:', error);
    }
    setIsGenerating(false);
  };

  const markModuleComplete = (moduleId) => {
    const updated = [...completedModules, moduleId];
    setCompletedModules(updated);
    localStorage.setItem(`completed_modules_${userId}`, JSON.stringify(updated));
  };

  const getLevelColor = (level) => {
    if (level >= 80) return 'text-green-600';
    if (level >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getPriorityBadge = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-500 text-white';
      case 'medium': return 'bg-yellow-500 text-black';
      case 'low': return 'bg-green-500 text-white';
      default: return 'bg-gray-500 text-white';
    }
  };

  const completionPercentage = learningPath 
    ? Math.round((completedModules.length / learningPath.recommended_path.length) * 100)
    : 0;

  if (!learningPath) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="w-5 h-5 text-indigo-600" />
            Personalized Learning Path
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center py-8">
          <Brain className="w-16 h-16 text-indigo-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">Get Your Personalized Learning Plan</h3>
          <p className="text-gray-500 mb-6">
            AI will analyze your performance and create a customized path to improve your clinical skills.
          </p>
          <Button 
            onClick={generateLearningPath} 
            disabled={isGenerating}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            {isGenerating ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Analyzing...</>
            ) : (
              <><Brain className="w-4 h-4 mr-2" /> Generate Learning Path</>
            )}
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Overview */}
      <Card className="bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-indigo-900">Your Learning Journey</h2>
              <p className="text-indigo-600">{completedModules.length} of {learningPath.recommended_path.length} modules completed</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-bold text-indigo-600">{completionPercentage}%</p>
              <p className="text-sm text-indigo-500">Complete</p>
            </div>
          </div>
          <Progress value={completionPercentage} className="h-3" />
        </CardContent>
      </Card>

      {/* Assessment */}
      <Alert className="bg-white">
        <Target className="w-4 h-4 text-indigo-600" />
        <AlertDescription>
          <strong>AI Assessment:</strong> {learningPath.overall_assessment}
        </AlertDescription>
      </Alert>

      {/* Recommended Focus */}
      <Card className="bg-yellow-50 border-yellow-200">
        <CardContent className="p-4">
          <p className="text-sm font-semibold text-yellow-800 mb-1">
            <Star className="w-4 h-4 inline mr-1" /> Recommended Focus
          </p>
          <p className="text-yellow-900">{learningPath.recommended_focus}</p>
        </CardContent>
      </Card>

      {/* Skill Levels */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Skill Assessment</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid md:grid-cols-2 gap-3">
            {learningPath.skill_levels?.slice(0, 8).map((skill, idx) => (
              <div key={idx} className="p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-medium">{skill.area}</span>
                  <Badge className={getPriorityBadge(skill.priority)}>
                    {skill.priority}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Progress value={skill.current_level} className="flex-1 h-2" />
                  <span className={`text-sm font-bold ${getLevelColor(skill.current_level)}`}>
                    {skill.current_level}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Learning Modules */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Your Learning Modules
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {learningPath.recommended_path?.map((module, idx) => {
              const isCompleted = completedModules.includes(module.module_id);
              return (
                <div 
                  key={module.module_id} 
                  className={`p-4 rounded-lg border transition-all ${
                    isCompleted 
                      ? 'bg-green-50 border-green-200' 
                      : 'bg-white hover:shadow-md'
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        isCompleted ? 'bg-green-500' : 'bg-indigo-100'
                      }`}>
                        {isCompleted 
                          ? <CheckCircle2 className="w-5 h-5 text-white" />
                          : <span className="text-indigo-600 font-bold">{idx + 1}</span>
                        }
                      </div>
                      <div>
                        <h4 className="font-semibold">{module.title}</h4>
                        <p className="text-sm text-gray-600">{module.description}</p>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <Badge variant="outline" className="text-xs">
                            <Clock className="w-3 h-3 mr-1" />
                            {module.estimated_time}
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {module.difficulty}
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {module.content_type}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {!isCompleted && (
                      <Button 
                        size="sm"
                        onClick={() => markModuleComplete(module.module_id)}
                      >
                        <ChevronRight className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Quick Wins & Goals */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="bg-green-50 border-green-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-green-800">
              <TrendingUp className="w-4 h-4 inline mr-1" /> Quick Wins
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-green-700 space-y-1">
              {learningPath.quick_wins?.map((win, i) => (
                <li key={i}>✓ {win}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="bg-indigo-50 border-indigo-200">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-indigo-800">
              <Award className="w-4 h-4 inline mr-1" /> Long-term Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="text-sm text-indigo-700 space-y-1">
              {learningPath.long_term_goals?.map((goal, i) => (
                <li key={i}>🎯 {goal}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Button 
        variant="outline" 
        onClick={generateLearningPath}
        className="w-full"
      >
        <RefreshCw className="w-4 h-4 mr-2" />
        Regenerate Learning Path
      </Button>
    </div>
  );
}
import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap,
  BookOpen,
  HelpCircle,
  Play,
  Trophy,
  Target,
  Clock,
  CheckCircle2,
  Star,
  TrendingUp,
  Award
} from "lucide-react";

import AITrainingContentGenerator from "../components/training/AITrainingContentGenerator";
import InteractiveQuizModule from "../components/training/InteractiveQuizModule";
import ClinicalSimulationModule from "../components/training/ClinicalSimulationModule";
import NurseFeedbackAggregator from "../components/training/NurseFeedbackAggregator";
import PersonalizedTrainingPlan from "../components/training/PersonalizedTrainingPlan";
import TargetedLessonGenerator from "../components/training/TargetedLessonGenerator";
import AIPersonalizedTrainingPlan from "../components/training/AIPersonalizedTrainingPlan";
import AIInteractiveQuiz from "../components/training/AIInteractiveQuiz";
import AIPatientSimulation from "../components/training/AIPatientSimulation";

export default function StaffTrainingHub() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [skillGaps, setSkillGaps] = useState([]);
  const [activeModule, setActiveModule] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: trainingProgress = [] } = useQuery({
    queryKey: ['trainingProgress', currentUser?.email],
    queryFn: () => base44.entities.MicroLearningProgress.filter({ nurse_email: currentUser?.email }),
    enabled: !!currentUser?.email,
  });

  const { data: completions = [] } = useQuery({
    queryKey: ['trainingCompletions', currentUser?.email],
    queryFn: () => base44.entities.TrainingCompletion.filter({ nurse_email: currentUser?.email }),
    enabled: !!currentUser?.email,
  });

  const { data: complianceAudits = [] } = useQuery({
    queryKey: ['nurseAudits', currentUser?.email],
    queryFn: () => base44.entities.ComplianceAudit.filter({ nurse_email: currentUser?.email }),
    enabled: !!currentUser?.email,
  });

  const { data: recommendations = [] } = useQuery({
    queryKey: ['nurseRecommendations', currentUser?.email],
    queryFn: () => base44.entities.TrainingRecommendation.filter({ nurse_email: currentUser?.email }),
    enabled: !!currentUser?.email,
  });

  const [selectedQuizTopic, setSelectedQuizTopic] = useState(null);
  const [selectedSimScenario, setSelectedSimScenario] = useState(null);

  const saveProgressMutation = useMutation({
    mutationFn: (data) => base44.entities.MicroLearningProgress.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['trainingProgress'] })
  });

  const handleQuizCompleted = async (result) => {
    try {
      await saveProgressMutation.mutateAsync({
        nurse_email: currentUser?.email,
        skill_area: result.category,
        module_type: 'quiz',
        status: result.percentage >= 80 ? 'completed' : 'needs_review',
        score: result.percentage,
        time_spent_minutes: result.duration,
        source: 'manual'
      });
    } catch (error) {
      console.error("Error saving quiz progress:", error);
    }
  };

  const handleSimulationCompleted = async (result) => {
    try {
      await saveProgressMutation.mutateAsync({
        nurse_email: currentUser?.email,
        skill_area: result.scenario,
        module_type: 'scenario',
        status: result.score >= 70 ? 'completed' : 'needs_review',
        score: result.score,
        source: 'manual'
      });
    } catch (error) {
      console.error("Error saving simulation progress:", error);
    }
  };

  // Calculate stats
  const completedQuizzes = trainingProgress.filter(p => p.module_type === 'quiz' && p.status === 'completed').length;
  const completedSimulations = trainingProgress.filter(p => p.module_type === 'scenario' && p.status === 'completed').length;
  const averageScore = trainingProgress.length > 0 
    ? Math.round(trainingProgress.reduce((sum, p) => sum + (p.score || 0), 0) / trainingProgress.length)
    : 0;
  const totalTime = trainingProgress.reduce((sum, p) => sum + (p.time_spent_minutes || 0), 0);

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <GraduationCap className="w-7 h-7 text-indigo-600" />
          Staff Training Hub
        </h1>
        <p className="text-gray-600 mt-1">AI-powered training on documentation, compliance, and patient communication</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-xs">Quizzes Passed</p>
                <p className="text-2xl font-bold">{completedQuizzes}</p>
              </div>
              <HelpCircle className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-xs">Simulations</p>
                <p className="text-2xl font-bold">{completedSimulations}</p>
              </div>
              <Play className="w-8 h-8 text-purple-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-xs">Avg Score</p>
                <p className="text-2xl font-bold">{averageScore}%</p>
              </div>
              <Target className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-none">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-xs">Time Invested</p>
                <p className="text-2xl font-bold">{totalTime}m</p>
              </div>
              <Clock className="w-8 h-8 text-orange-200" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-5 w-full mb-6">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            <span className="hidden sm:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="myplan" className="flex items-center gap-2">
            <Target className="w-4 h-4" />
            <span className="hidden sm:inline">My Plan</span>
          </TabsTrigger>
          <TabsTrigger value="learn" className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Learn</span>
          </TabsTrigger>
          <TabsTrigger value="quiz" className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            <span className="hidden sm:inline">Quiz</span>
          </TabsTrigger>
          <TabsTrigger value="simulate" className="flex items-center gap-2">
            <Play className="w-4 h-4" />
            <span className="hidden sm:inline">Simulate</span>
          </TabsTrigger>
        </TabsList>

        {/* My Plan Tab - Personalized Training Based on AI Feedback */}
        <TabsContent value="myplan">
          {activeModule ? (
            <TargetedLessonGenerator
              module={activeModule}
              nurseEmail={currentUser?.email}
              onComplete={(result) => {
                queryClient.invalidateQueries({ queryKey: ['trainingProgress'] });
                setActiveModule(null);
              }}
              onExit={() => setActiveModule(null)}
            />
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="lg:col-span-1">
                <NurseFeedbackAggregator
                  nurseEmail={currentUser?.email}
                  onTrainingRecommendations={(gaps) => setSkillGaps(gaps)}
                />
              </div>
              <div className="lg:col-span-2">
                <PersonalizedTrainingPlan
                  nurseEmail={currentUser?.email}
                  skillGaps={skillGaps}
                  onStartModule={(module) => setActiveModule(module)}
                  onModuleComplete={(result) => {
                    queryClient.invalidateQueries({ queryKey: ['trainingProgress'] });
                  }}
                />
              </div>
            </div>
          )}
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Learning Progress */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Award className="w-4 h-4 text-yellow-500" />
                  Your Learning Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {['Documentation', 'Compliance', 'Communication', 'Safety'].map((area) => {
                  const areaProgress = trainingProgress.filter(p => 
                    p.skill_area?.toLowerCase().includes(area.toLowerCase())
                  );
                  const completed = areaProgress.filter(p => p.status === 'completed').length;
                  const progress = areaProgress.length > 0 ? (completed / Math.max(areaProgress.length, 3)) * 100 : 0;
                  
                  return (
                    <div key={area}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-medium text-gray-700">{area}</span>
                        <span className="text-xs text-gray-500">{Math.round(progress)}%</span>
                      </div>
                      <Progress value={progress} className="h-2" />
                    </div>
                  );
                })}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-500" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent>
                {trainingProgress.length === 0 ? (
                  <p className="text-sm text-gray-500 text-center py-4">
                    No training activity yet. Start with a quiz or simulation!
                  </p>
                ) : (
                  <div className="space-y-3">
                    {trainingProgress.slice(0, 5).map((activity, idx) => (
                      <div key={idx} className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                          activity.status === 'completed' ? 'bg-green-100' : 'bg-yellow-100'
                        }`}>
                          {activity.module_type === 'quiz' ? (
                            <HelpCircle className={`w-4 h-4 ${activity.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}`} />
                          ) : (
                            <Play className={`w-4 h-4 ${activity.status === 'completed' ? 'text-green-600' : 'text-yellow-600'}`} />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-gray-900 truncate">{activity.skill_area}</p>
                          <p className="text-xs text-gray-500">{activity.module_type} • {activity.score}%</p>
                        </div>
                        <Badge className={activity.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}>
                          {activity.status === 'completed' ? 'Passed' : 'Review'}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Start */}
            <Card className="lg:col-span-2 bg-gradient-to-r from-indigo-50 to-purple-50 border-indigo-200">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Start Training</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex flex-col items-center gap-2 bg-white hover:bg-blue-50"
                    onClick={() => setActiveTab('learn')}
                  >
                    <BookOpen className="w-6 h-6 text-blue-600" />
                    <span className="font-medium">Learn Best Practices</span>
                    <span className="text-xs text-gray-500">AI-generated content</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex flex-col items-center gap-2 bg-white hover:bg-green-50"
                    onClick={() => setActiveTab('quiz')}
                  >
                    <HelpCircle className="w-6 h-6 text-green-600" />
                    <span className="font-medium">Take a Quiz</span>
                    <span className="text-xs text-gray-500">Test your knowledge</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-auto py-4 flex flex-col items-center gap-2 bg-white hover:bg-purple-50"
                    onClick={() => setActiveTab('simulate')}
                  >
                    <Play className="w-6 h-6 text-purple-600" />
                    <span className="font-medium">Run Simulation</span>
                    <span className="text-xs text-gray-500">Practice scenarios</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Learn Tab */}
        <TabsContent value="learn">
          <AITrainingContentGenerator 
            nurseEmail={currentUser?.email}
            onContentGenerated={(content) => console.log('Content generated:', content)}
          />
        </TabsContent>

        {/* Quiz Tab */}
        <TabsContent value="quiz">
          <InteractiveQuizModule 
            nurseEmail={currentUser?.email}
            onQuizCompleted={handleQuizCompleted}
          />
        </TabsContent>

        {/* Simulate Tab */}
        <TabsContent value="simulate">
          <ClinicalSimulationModule 
            nurseEmail={currentUser?.email}
            onSimulationCompleted={handleSimulationCompleted}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
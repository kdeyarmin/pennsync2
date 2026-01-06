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
  Award,
  UserPlus
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
import SkillGapRemediationSection from "../components/training/SkillGapRemediationSection";
import StateSurveyVideos from "../components/training/StateSurveyVideos";
import EducationVideos from "../components/training/EducationVideos";
import AIPersonalizedTrainingHub from "../components/training/AIPersonalizedTrainingHub";
import TrainingProgressDashboard from "../components/training/TrainingProgressDashboard";
import StaffEducationComplianceReport from "../components/training/StaffEducationComplianceReport";
import ModuleViewer from "../components/training/ModuleViewer";
import AIQuizGenerator from "../components/training/AIQuizGenerator";
import MyCompletedTraining from "../components/training/MyCompletedTraining";
import AdminTrainingAssignment from "../components/training/AdminTrainingAssignment";

export default function StaffTrainingHub() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === 'admin';

  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("overview");
  const [skillGaps, setSkillGaps] = useState([]);
  const [activeModule, setActiveModule] = useState(null);

  // Only fetch current user's training data
  const { data: trainingProgress = [] } = useQuery({
    queryKey: ['myTrainingProgress', currentUser?.email],
    queryFn: () => base44.entities.MicroLearningProgress.filter({ nurse_email: currentUser?.email }),
    enabled: !!currentUser?.email,
  });

  const { data: completions = [] } = useQuery({
    queryKey: ['myTrainingCompletions', currentUser?.email],
    queryFn: () => base44.entities.TrainingCompletion.filter({ nurse_email: currentUser?.email }),
    enabled: !!currentUser?.email,
  });

  const { data: complianceAudits = [] } = useQuery({
    queryKey: ['myComplianceAudits', currentUser?.email],
    queryFn: () => base44.entities.ComplianceAudit.filter({ nurse_email: currentUser?.email }),
    enabled: !!currentUser?.email,
  });

  const { data: recommendations = [] } = useQuery({
    queryKey: ['myTrainingRecommendations', currentUser?.email],
    queryFn: () => base44.entities.TrainingRecommendation.filter({ nurse_email: currentUser?.email }),
    enabled: !!currentUser?.email,
  });

  const [selectedQuizTopic, setSelectedQuizTopic] = useState(null);
  const [selectedSimScenario, setSelectedSimScenario] = useState(null);
  const [selectedModule, setSelectedModule] = useState(null);

  const { data: trainingModules = [] } = useQuery({
    queryKey: ['trainingModules'],
    queryFn: () => base44.entities.TrainingModule.filter({ is_active: true }),
    initialData: [],
  });

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
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6 md:mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
            <GraduationCap className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-gray-900">My Training Hub</h1>
            <p className="text-sm md:text-base text-gray-600">Your personalized training on documentation, compliance, and patient communication</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-6 md:mb-8">
        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white shadow-lg">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-blue-100 text-sm mb-1">Quizzes Passed</p>
                <p className="text-3xl md:text-4xl font-bold">{completedQuizzes}</p>
              </div>
              <HelpCircle className="w-10 h-10 md:w-12 md:h-12 text-blue-200 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white shadow-lg">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-purple-100 text-sm mb-1">Simulations</p>
                <p className="text-3xl md:text-4xl font-bold">{completedSimulations}</p>
              </div>
              <Play className="w-10 h-10 md:w-12 md:h-12 text-purple-200 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white shadow-lg">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-green-100 text-sm mb-1">Avg Score</p>
                <p className="text-3xl md:text-4xl font-bold">{averageScore}%</p>
              </div>
              <Target className="w-10 h-10 md:w-12 md:h-12 text-green-200 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white shadow-lg">
          <CardContent className="p-4 md:p-6">
            <div className="flex items-center justify-between">
              <div className="min-w-0 flex-1">
                <p className="text-orange-100 text-sm mb-1">Time Invested</p>
                <p className="text-3xl md:text-4xl font-bold">{totalTime}m</p>
              </div>
              <Clock className="w-10 h-10 md:w-12 md:h-12 text-orange-200 flex-shrink-0" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Module Viewer Modal */}
      {selectedModule && (
        <div className="mb-6">
          <Card className="border-2 border-purple-300 shadow-xl">
            <CardHeader className="bg-purple-50 p-4 md:p-6">
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                <CardTitle className="text-base md:text-lg flex-1 min-w-0">Currently Viewing: {selectedModule.title}</CardTitle>
                <Button
                  variant="outline"
                  onClick={() => setSelectedModule(null)}
                  className="min-h-[44px] w-full sm:w-auto"
                >
                  Close
                </Button>
              </div>
            </CardHeader>
            <CardContent className="p-4 md:p-6">
              <ModuleViewer
                module={selectedModule}
                userEmail={currentUser?.email}
                onComplete={() => {
                  setSelectedModule(null);
                  queryClient.invalidateQueries({ queryKey: ['myTrainingCompletions'] });
                }}
              />
            </CardContent>
          </Card>
        </div>
      )}

      {/* Individual User Training Hub */}
      <Tabs defaultValue="aipath" className="w-full">
          <TabsList className={`grid ${isAdmin ? 'grid-cols-4 sm:grid-cols-8 lg:grid-cols-13' : 'grid-cols-3 sm:grid-cols-6 lg:grid-cols-12'} w-full mb-6 gap-1 h-auto`}>
            <TabsTrigger value="modules" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
              <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden lg:inline">Modules</span>
            </TabsTrigger>
            <TabsTrigger value="certificates" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm bg-gradient-to-r from-yellow-50 to-orange-50 data-[state=active]:bg-yellow-100">
              <Award className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden lg:inline">Certificates</span>
            </TabsTrigger>
            {isAdmin && (
              <TabsTrigger value="assign" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm bg-gradient-to-r from-blue-50 to-indigo-50 data-[state=active]:bg-blue-100">
                <UserPlus className="w-3 h-3 sm:w-4 sm:h-4" />
                <span className="hidden lg:inline">Assign</span>
              </TabsTrigger>
            )}
            <TabsTrigger value="aipath" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm bg-gradient-to-r from-purple-50 to-indigo-50 data-[state=active]:bg-purple-100">
              <Star className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden lg:inline">AI Path</span>
            </TabsTrigger>
            <TabsTrigger value="progress" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
              <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="hidden lg:inline">Progress</span>
            </TabsTrigger>
          <TabsTrigger value="overview" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
            <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden lg:inline">Overview</span>
          </TabsTrigger>
          <TabsTrigger value="survey" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm bg-gradient-to-r from-red-50 to-orange-50 data-[state=active]:bg-red-100">
            <Trophy className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden lg:inline">Survey</span>
          </TabsTrigger>
          <TabsTrigger value="videos" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
            <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden lg:inline">Videos</span>
          </TabsTrigger>
          <TabsTrigger value="remediation" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
            <Target className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden lg:inline">Remediation</span>
          </TabsTrigger>
          <TabsTrigger value="myplan" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
            <Star className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden lg:inline">My Plan</span>
          </TabsTrigger>
          <TabsTrigger value="learn" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
            <BookOpen className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden lg:inline">Learn</span>
          </TabsTrigger>
          <TabsTrigger value="quiz" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
            <HelpCircle className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden lg:inline">Quiz</span>
          </TabsTrigger>
          <TabsTrigger value="simulate" className="flex items-center gap-1 sm:gap-2 py-2 sm:py-3 text-xs sm:text-sm">
            <Play className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="hidden lg:inline">Simulate</span>
          </TabsTrigger>
          </TabsList>

          {/* Training Modules Tab */}
          <TabsContent value="modules">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {trainingModules.map((module) => {
                const userCompletion = completions.find(c => c.training_module_id === module.id);
                const isCompleted = userCompletion?.status === 'completed';
                
                return (
                  <Card key={module.id} className={`cursor-pointer hover:shadow-lg transition-all duration-300 ${
                    isCompleted ? 'border-green-300 bg-green-50' : ''
                  }`} onClick={() => setSelectedModule(module)}>
                    <CardContent className="p-4 md:p-6">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-gray-900 text-base mb-2">{module.title}</h3>
                          <p className="text-sm text-gray-600 line-clamp-2">{module.description}</p>
                        </div>
                        {isCompleted && (
                          <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0 ml-2" />
                        )}
                      </div>
                      
                      <div className="flex flex-wrap gap-2 mb-3">
                        <Badge variant="outline">{module.category}</Badge>
                        <Badge variant="outline">{module.difficulty_level}</Badge>
                        <Badge variant="outline" className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {module.duration_minutes}m
                        </Badge>
                      </div>

                      {userCompletion && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-600">Progress</span>
                            <span className="font-medium">{userCompletion.status}</span>
                          </div>
                          {userCompletion.score && (
                            <div className="flex justify-between text-sm">
                              <span className="text-gray-600">Score</span>
                              <Badge className="bg-blue-600">{userCompletion.score}%</Badge>
                            </div>
                          )}
                        </div>
                      )}

                      {module.is_required && (
                        <Badge className="mt-2 bg-red-600">Required</Badge>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
              {trainingModules.length === 0 && (
                <Card className="col-span-3">
                  <CardContent className="text-center py-16">
                    <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500 text-lg">No training modules available yet</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          {/* AI Personalized Training Path */}
          <TabsContent value="aipath">
            {currentUser && <AIPersonalizedTrainingHub nurseEmail={currentUser.email} />}
          </TabsContent>

          {/* Training Progress Dashboard */}
          <TabsContent value="progress">
            {currentUser && <TrainingProgressDashboard nurseEmail={currentUser.email} />}
          </TabsContent>

          {/* My Certificates */}
          <TabsContent value="certificates">
            {currentUser && <MyCompletedTraining nurseEmail={currentUser.email} />}
          </TabsContent>

          {/* Admin Training Assignment */}
          {isAdmin && (
            <TabsContent value="assign">
              <AdminTrainingAssignment />
            </TabsContent>
          )}

          {/* State Survey Preparation Tab */}
        <TabsContent value="survey">
          <StateSurveyVideos />
        </TabsContent>

        {/* Education Videos Tab */}
        <TabsContent value="videos">
          <EducationVideos />
        </TabsContent>

        {/* Skill Gap Remediation Tab */}
        <TabsContent value="remediation">
          <SkillGapRemediationSection
            nurseEmail={currentUser?.email}
            onComplete={() => queryClient.invalidateQueries({ queryKey: ['trainingProgress'] })}
          />
        </TabsContent>

        {/* My Plan Tab - AI-Powered Personalized Training */}
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
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* AI-Generated Training Plan */}
              <AIPersonalizedTrainingPlan
                nurseEmail={currentUser?.email}
                audits={complianceAudits}
                recommendations={recommendations}
                onStartModule={(module) => {
                  setSelectedQuizTopic(module.weak_area_addressed);
                  setActiveTab('quiz');
                }}
              />
              
              {/* Feedback Aggregator */}
              <div className="space-y-4">
                <NurseFeedbackAggregator
                  nurseEmail={currentUser?.email}
                  onTrainingRecommendations={(gaps) => setSkillGaps(gaps)}
                />
                
                {/* Quick Actions based on weak areas */}
                {skillGaps.length > 0 && (
                  <Card className="border-2 border-orange-300 bg-orange-50">
                    <CardHeader className="p-4">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Target className="w-5 h-5 text-orange-600" />
                        Recommended Actions
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-3">
                      {skillGaps.slice(0, 3).map((gap, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 bg-white rounded-lg border border-orange-200 min-h-[44px]">
                          <span className="text-sm truncate flex-1 mr-2 font-medium text-gray-900">{gap.area || gap.skill_area}</span>
                          <div className="flex gap-2 flex-shrink-0">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedQuizTopic(gap.area || gap.skill_area);
                                setActiveTab('quiz');
                              }}
                            >
                              Quiz
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedSimScenario(gap.area?.toLowerCase().replace(/\s+/g, '_') || 'general');
                                setActiveTab('simulate');
                              }}
                            >
                              Sim
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </div>
            </div>
          )}
        </TabsContent>

        {/* Overview Tab */}
        <TabsContent value="overview">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Learning Progress */}
            <Card>
              <CardHeader className="p-6">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Award className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                  Your Learning Progress
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6 space-y-4">
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
              <CardHeader className="p-6">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  Recent Activity
                </CardTitle>
              </CardHeader>
              <CardContent className="p-6">
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
            <Card className="lg:col-span-2 bg-gradient-to-r from-indigo-50 to-purple-50 border-2 border-indigo-200">
              <CardContent className="p-6">
                <h3 className="text-xl font-semibold text-gray-900 mb-6">Quick Start Training</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Button 
                    variant="outline" 
                    className="h-auto py-6 flex flex-col items-center gap-3 bg-white hover:bg-blue-50 shadow-sm hover:shadow-md transition-all duration-300"
                    onClick={() => setActiveTab('learn')}
                  >
                    <BookOpen className="w-8 h-8 text-blue-600" />
                    <span className="font-medium text-base">Learn Best Practices</span>
                    <span className="text-sm text-gray-500">AI-generated content</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-auto py-6 flex flex-col items-center gap-3 bg-white hover:bg-green-50 shadow-sm hover:shadow-md transition-all duration-300"
                    onClick={() => setActiveTab('quiz')}
                  >
                    <HelpCircle className="w-8 h-8 text-green-600" />
                    <span className="font-medium text-base">Take a Quiz</span>
                    <span className="text-sm text-gray-500">Test your knowledge</span>
                  </Button>
                  
                  <Button 
                    variant="outline" 
                    className="h-auto py-6 flex flex-col items-center gap-3 bg-white hover:bg-purple-50 shadow-sm hover:shadow-md transition-all duration-300"
                    onClick={() => setActiveTab('simulate')}
                  >
                    <Play className="w-8 h-8 text-purple-600" />
                    <span className="font-medium text-base">Run Simulation</span>
                    <span className="text-sm text-gray-500">Practice scenarios</span>
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI Interactive Quiz */}
            <AIInteractiveQuiz
              topic={selectedQuizTopic || "Medicare Home Health Documentation"}
              difficulty="intermediate"
              questionCount={5}
              onComplete={(result) => {
                handleQuizCompleted({ ...result, category: selectedQuizTopic || 'General' });
                setSelectedQuizTopic(null);
              }}
            />
            
            {/* Classic Quiz Module */}
            <div>
              <h3 className="text-base font-semibold mb-4 text-gray-700">Or choose a category:</h3>
              <InteractiveQuizModule 
                nurseEmail={currentUser?.email}
                onQuizCompleted={handleQuizCompleted}
              />
            </div>
          </div>
        </TabsContent>

        {/* Simulate Tab */}
        <TabsContent value="simulate">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* AI Patient Simulation */}
            <AIPatientSimulation
              scenario={selectedSimScenario || "general"}
              difficulty="intermediate"
              onComplete={(result) => {
                handleSimulationCompleted(result);
                setSelectedSimScenario(null);
              }}
            />
            
            {/* Classic Simulation Module */}
            <div>
              <h3 className="text-base font-semibold mb-4 text-gray-700">Or choose a scenario:</h3>
              <ClinicalSimulationModule 
                nurseEmail={currentUser?.email}
                onSimulationCompleted={handleSimulationCompleted}
              />
            </div>
          </div>
        </TabsContent>
        </Tabs>
        </div>
        );
        }
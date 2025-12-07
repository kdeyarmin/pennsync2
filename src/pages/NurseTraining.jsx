import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  GraduationCap,
  Target,
  Award,
  TrendingUp,
  BookOpen,
  CheckCircle2,
  AlertCircle,
  Brain,
  FileText,
  BarChart3
} from "lucide-react";
import InteractiveDocumentationScenarios from "../components/training/InteractiveDocumentationScenarios";
import AIComplianceQuizGenerator from "../components/training/AIComplianceQuizGenerator";
import NurseLearningDashboard from "../components/training/NurseLearningDashboard";
import PersonalizedTrainingRecommender from "../components/training/PersonalizedTrainingRecommender";
import { logActivity, ActivityActions } from "../components/utils/activityLogger";

export default function NurseTraining() {
  const [activeTab, setActiveTab] = useState("personalized");
  const [selectedScenarioId, setSelectedScenarioId] = useState(null);
  const [selectedQuizId, setSelectedQuizId] = useState(null);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  React.useEffect(() => {
    logActivity(ActivityActions.PAGE_VISIT, { page: 'NurseTraining' });
  }, []);

  const { data: trainingProgress = [] } = useQuery({
    queryKey: ['myTrainingProgress', currentUser?.email],
    queryFn: () => base44.entities.MicroLearningProgress.filter({ 
      nurse_email: currentUser?.email 
    }),
    enabled: !!currentUser?.email,
  });

  const { data: recommendations = [] } = useQuery({
    queryKey: ['myRecommendations', currentUser?.email],
    queryFn: () => base44.entities.TrainingRecommendation.filter({ 
      nurse_email: currentUser?.email,
      addressed: false
    }),
    enabled: !!currentUser?.email,
  });

  const completedCount = trainingProgress.filter(p => p.status === 'completed').length;
  const avgScore = trainingProgress.length > 0
    ? trainingProgress.reduce((sum, p) => sum + (p.score || 0), 0) / trainingProgress.length
    : 0;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <GraduationCap className="w-8 h-8 text-indigo-600" />
          <h1 className="text-3xl font-bold text-gray-900">Nurse Training Hub</h1>
        </div>
        <p className="text-gray-600">
          Improve your documentation skills with AI-powered training and practice scenarios
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-700 font-medium">Completed</p>
                <p className="text-3xl font-bold text-blue-900">{completedCount}</p>
              </div>
              <CheckCircle2 className="w-10 h-10 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-700 font-medium">Avg Score</p>
                <p className="text-3xl font-bold text-green-900">{avgScore.toFixed(0)}%</p>
              </div>
              <Award className="w-10 h-10 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-700 font-medium">In Progress</p>
                <p className="text-3xl font-bold text-orange-900">
                  {trainingProgress.filter(p => p.status === 'in_progress').length}
                </p>
              </div>
              <TrendingUp className="w-10 h-10 text-orange-600" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-700 font-medium">Recommendations</p>
                <p className="text-3xl font-bold text-purple-900">{recommendations.length}</p>
              </div>
              <Target className="w-10 h-10 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Active Recommendations Banner */}
      {recommendations.length > 0 && (
        <Card className="mb-6 bg-gradient-to-r from-amber-50 to-orange-50 border-amber-200">
          <CardContent className="p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h3 className="font-semibold text-amber-900 mb-1">
                  You have {recommendations.length} training recommendation{recommendations.length !== 1 ? 's' : ''}
                </h3>
                <p className="text-sm text-amber-700">
                  Complete practice scenarios and quizzes to address these areas: {' '}
                  {recommendations.slice(0, 3).map(r => r.recommendation_type).join(', ')}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Training Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 h-auto">
          <TabsTrigger value="personalized" className="flex items-center gap-2 py-3">
            <Target className="w-4 h-4" />
            <span>For You</span>
          </TabsTrigger>
          <TabsTrigger value="scenarios" className="flex items-center gap-2 py-3">
            <FileText className="w-4 h-4" />
            <span>Scenarios</span>
          </TabsTrigger>
          <TabsTrigger value="quizzes" className="flex items-center gap-2 py-3">
            <Brain className="w-4 h-4" />
            <span>Quizzes</span>
          </TabsTrigger>
          <TabsTrigger value="progress" className="flex items-center gap-2 py-3">
            <BarChart3 className="w-4 h-4" />
            <span>Progress</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="personalized" className="space-y-6">
          <PersonalizedTrainingRecommender
            nurseEmail={currentUser?.email}
            onStartTraining={(area, module) => {
              setSelectedScenarioId(module);
              setActiveTab('scenarios');
            }}
          />
        </TabsContent>

        <TabsContent value="scenarios" className="space-y-6">
          <InteractiveDocumentationScenarios
            nurseEmail={currentUser?.email}
            recommendations={recommendations}
            initialScenarioId={selectedScenarioId}
          />
        </TabsContent>

        <TabsContent value="quizzes" className="space-y-6">
          <AIComplianceQuizGenerator
            nurseEmail={currentUser?.email}
            recommendations={recommendations}
            initialTopicId={selectedQuizId}
          />
        </TabsContent>

        <TabsContent value="progress" className="space-y-6">
          <NurseLearningDashboard
            nurseEmail={currentUser?.email}
            trainingProgress={trainingProgress}
            recommendations={recommendations}
            onStartScenario={(scenarioId) => {
              setSelectedScenarioId(scenarioId);
              setActiveTab('scenarios');
            }}
            onStartQuiz={(quizId) => {
              setSelectedQuizId(quizId);
              setActiveTab('quizzes');
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
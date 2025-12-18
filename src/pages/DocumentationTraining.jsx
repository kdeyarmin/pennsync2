import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  GraduationCap,
  BookOpen,
  FileText,
  Users,
  BarChart3,
  Award,
  Target,
  TrendingUp,
  Sparkles
} from "lucide-react";
import InteractiveTutorials from "../components/training/InteractiveTutorials";
import PracticeNoteSubmission from "../components/training/PracticeNoteSubmission";
import ScenarioSimulator from "../components/training/ScenarioSimulator";
import TrainingProgressTracker from "../components/training/TrainingProgressTracker";
import AISkillAssessment from "../components/training/AISkillAssessment";

export default function DocumentationTraining() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = React.useState("tutorials");

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const { data: trainingProgress = [] } = useQuery({
    queryKey: ['trainingProgress', currentUser?.email],
    queryFn: () => base44.entities.TrainingCompletion.filter({ 
      nurse_email: currentUser?.email,
      training_module_id: { $regex: 'documentation' }
    }),
    enabled: !!currentUser?.email
  });

  const { data: practiceSubmissions = [] } = useQuery({
    queryKey: ['practiceSubmissions', currentUser?.email],
    queryFn: () => base44.entities.MicroLearningProgress.filter({ 
      nurse_email: currentUser?.email,
      module_type: 'practice_exercise'
    }, '-created_date'),
    enabled: !!currentUser?.email
  });

  const completedTutorials = trainingProgress.filter(t => t.status === 'completed').length;
  const averageScore = practiceSubmissions.length > 0
    ? practiceSubmissions.reduce((sum, s) => sum + (s.score || 0), 0) / practiceSubmissions.length
    : 0;

  return (
    <div className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-2 flex items-center gap-2">
          <GraduationCap className="w-8 h-8 text-indigo-600" />
          AI Documentation Training
        </h1>
        <p className="text-gray-600">Master Medicare-compliant documentation with interactive AI-powered training</p>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-blue-600 font-medium">Tutorials Completed</p>
                <p className="text-2xl font-bold text-blue-900">{completedTutorials}</p>
              </div>
              <BookOpen className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-green-200 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-green-600 font-medium">Practice Notes</p>
                <p className="text-2xl font-bold text-green-900">{practiceSubmissions.length}</p>
              </div>
              <FileText className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-purple-200 bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-purple-600 font-medium">Average Score</p>
                <p className="text-2xl font-bold text-purple-900">{Math.round(averageScore)}%</p>
              </div>
              <Target className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-orange-200 bg-orange-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-orange-600 font-medium">Skill Level</p>
                <p className="text-2xl font-bold text-orange-900">
                  {averageScore >= 90 ? 'Expert' :
                   averageScore >= 75 ? 'Advanced' :
                   averageScore >= 60 ? 'Intermediate' : 'Beginner'}
                </p>
              </div>
              <Award className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Training Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="tutorials" className="gap-2">
            <BookOpen className="w-4 h-4" />
            <span className="hidden sm:inline">Tutorials</span>
          </TabsTrigger>
          <TabsTrigger value="practice" className="gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Practice</span>
          </TabsTrigger>
          <TabsTrigger value="scenarios" className="gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Scenarios</span>
          </TabsTrigger>
          <TabsTrigger value="assessment" className="gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">AI Skills</span>
          </TabsTrigger>
          <TabsTrigger value="progress" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Progress</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="tutorials" className="mt-6">
          <InteractiveTutorials
            userEmail={currentUser?.email}
            onComplete={(tutorialId) => {
              queryClient.invalidateQueries({ queryKey: ['trainingProgress'] });
            }}
          />
        </TabsContent>

        <TabsContent value="practice" className="mt-6">
          <PracticeNoteSubmission
            userEmail={currentUser?.email}
            onSubmit={() => {
              queryClient.invalidateQueries({ queryKey: ['practiceSubmissions'] });
            }}
          />
        </TabsContent>

        <TabsContent value="scenarios" className="mt-6">
          <ScenarioSimulator
            userEmail={currentUser?.email}
            onComplete={() => {
              queryClient.invalidateQueries({ queryKey: ['practiceSubmissions'] });
            }}
          />
        </TabsContent>

        <TabsContent value="assessment" className="mt-6">
          <AISkillAssessment userEmail={currentUser?.email} />
        </TabsContent>

        <TabsContent value="progress" className="mt-6">
          <TrainingProgressTracker
            userEmail={currentUser?.email}
            trainingProgress={trainingProgress}
            practiceSubmissions={practiceSubmissions}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
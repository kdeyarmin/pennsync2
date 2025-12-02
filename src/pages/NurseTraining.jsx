import React from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  GraduationCap,
  Award,
  Sparkles,
  Building2,
  Brain,
  Trophy
} from "lucide-react";

import SkillsTracker from "../components/training/SkillsTracker";
import MyTrainingDashboard from "../components/training/MyTrainingDashboard";
import TrainingRecommendations from "../components/training/TrainingRecommendations";
import AgencyTrainingManager from "../components/training/AgencyTrainingManager";
import SkillGapLearningHub from "../components/training/SkillGapLearningHub";
import GamificationDashboard from "../components/gamification/GamificationDashboard";

export default function NurseTraining() {
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me()
  });

  const isAdmin = currentUser?.role === 'admin';

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
          Skills & Training
        </h1>
        <p className="text-gray-600">
          Track your skills, complete training, and grow your career
        </p>
      </div>

      {/* Gamification Header */}
      <GamificationDashboard userEmail={currentUser?.email} compact={true} />

      <Tabs defaultValue="achievements" className="space-y-6">
        <TabsList className="flex flex-wrap h-auto gap-1 p-1 md:grid md:grid-cols-6 w-full">
          <TabsTrigger value="achievements" className="flex-1 min-w-[60px] gap-1 px-2 py-1.5 text-xs md:text-sm">
            <Trophy className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Achievements</span>
          </TabsTrigger>
          <TabsTrigger value="skill-gaps" className="flex-1 min-w-[60px] gap-1 px-2 py-1.5 text-xs md:text-sm">
            <Brain className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Skill Gaps</span>
          </TabsTrigger>
          <TabsTrigger value="my-training" className="flex-1 min-w-[60px] gap-1 px-2 py-1.5 text-xs md:text-sm">
            <GraduationCap className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Training</span>
          </TabsTrigger>
          <TabsTrigger value="skills" className="flex-1 min-w-[60px] gap-1 px-2 py-1.5 text-xs md:text-sm">
            <Award className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">Skills</span>
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="flex-1 min-w-[60px] gap-1 px-2 py-1.5 text-xs md:text-sm">
            <Sparkles className="w-3 h-3 md:w-4 md:h-4" />
            <span className="hidden sm:inline">AI Recs</span>
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="admin" className="flex-1 min-w-[60px] gap-1 px-2 py-1.5 text-xs md:text-sm">
              <Building2 className="w-3 h-3 md:w-4 md:h-4" />
              <span className="hidden sm:inline">Admin</span>
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="achievements">
          <GamificationDashboard userEmail={currentUser?.email} />
        </TabsContent>

        <TabsContent value="skill-gaps">
          <SkillGapLearningHub nurseEmail={currentUser?.email} />
        </TabsContent>

        <TabsContent value="my-training">
          <MyTrainingDashboard nurseEmail={currentUser?.email} />
        </TabsContent>

        <TabsContent value="skills">
          <SkillsTracker nurseEmail={currentUser?.email} />
        </TabsContent>

        <TabsContent value="recommendations">
          <TrainingRecommendations nurseEmail={currentUser?.email} />
        </TabsContent>

        {isAdmin && (
          <TabsContent value="admin">
            <AgencyTrainingManager />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
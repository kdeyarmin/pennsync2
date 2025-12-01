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
  Building2
} from "lucide-react";

import SkillsTracker from "../components/training/SkillsTracker";
import MyTrainingDashboard from "../components/training/MyTrainingDashboard";
import TrainingRecommendations from "../components/training/TrainingRecommendations";
import AgencyTrainingManager from "../components/training/AgencyTrainingManager";

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

      <Tabs defaultValue="my-training" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-grid">
          <TabsTrigger value="my-training" className="gap-2">
            <GraduationCap className="w-4 h-4" />
            <span className="hidden sm:inline">My Training</span>
          </TabsTrigger>
          <TabsTrigger value="skills" className="gap-2">
            <Award className="w-4 h-4" />
            <span className="hidden sm:inline">Skills</span>
          </TabsTrigger>
          <TabsTrigger value="recommendations" className="gap-2">
            <Sparkles className="w-4 h-4" />
            <span className="hidden sm:inline">AI Recommendations</span>
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="admin" className="gap-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Admin</span>
            </TabsTrigger>
          )}
        </TabsList>

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
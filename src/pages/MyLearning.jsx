import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { GraduationCap, FileText, Award, Sparkles, Calendar, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import MyTrainingDashboard from "@/components/training/MyTrainingDashboard";
import MyAnnualEducationDashboard from "@/components/training/MyAnnualEducationDashboard";
import EmployeeTranscriptCenter from "@/components/learning/EmployeeTranscriptCenter";
import AnnualTranscriptCenter from "@/components/learning/AnnualTranscriptCenter";

export default function MyLearning() {
  const { isLoading } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <GraduationCap className="w-8 h-8 text-indigo-600" />
            My Learning
          </h1>
          <p className="text-sm sm:text-base text-slate-600 mt-2">
            All your training, courses, transcripts, and continuing education
          </p>
        </div>
        <Link to={createPageUrl('LearningCenter')}>
          <Button variant="outline" size="sm">
            Learning Center
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="courses" className="space-y-6">
        <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
          <TabsList className="inline-flex w-max min-w-full gap-1 h-auto p-1">
            <TabsTrigger value="courses" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
              <FileText className="w-4 h-4 mr-2" />
              All Courses
            </TabsTrigger>
            <TabsTrigger value="in-services" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
              <Sparkles className="w-4 h-4 mr-2" />
              Compliance In-Services
            </TabsTrigger>
            <TabsTrigger value="annual" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
              <Calendar className="w-4 h-4 mr-2" />
              Annual Education
            </TabsTrigger>
            <TabsTrigger value="transcript" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
              <Award className="w-4 h-4 mr-2" />
              Course Transcript
            </TabsTrigger>
            <TabsTrigger value="annual-transcript" className="min-h-[44px] px-4 text-sm whitespace-nowrap">
              <Award className="w-4 h-4 mr-2" />
              Annual Transcript
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="courses">
          <MyTrainingDashboard />
        </TabsContent>

        <TabsContent value="in-services">
          <MyTrainingDashboard filterByType="in_service" />
        </TabsContent>

        <TabsContent value="annual">
          <MyAnnualEducationDashboard />
        </TabsContent>

        <TabsContent value="transcript">
          <EmployeeTranscriptCenter />
        </TabsContent>

        <TabsContent value="annual-transcript">
          <AnnualTranscriptCenter />
        </TabsContent>
      </Tabs>
    </div>
  );
}

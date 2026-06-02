import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Users } from "lucide-react";
import CourseManager from "../components/training/CourseManager";
import LearningPlanManager from "../components/training/LearningPlanManager";
import AIComplianceInServicesHub from "../components/training/AIComplianceInServicesHub";

export default function TrainingManagement() {
  const [currentUser, setCurrentUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then((user) => {
      setCurrentUser(user);
      if (user?.role !== 'admin') {
        window.location.href = '/';
      }
    });
  }, []);

  return (
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto">
      <div className="mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">Training Management</h1>
        <p className="text-sm sm:text-base text-slate-600">Manage courses, create learning plans, and assign training</p>
      </div>

      <Tabs defaultValue="courses" className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
          <TabsList className="inline-flex w-max min-w-full gap-1 h-auto p-1">
            <TabsTrigger value="courses" className="min-h-[44px] px-4 text-sm whitespace-nowrap">Courses</TabsTrigger>
            <TabsTrigger value="learning-plans" className="min-h-[44px] px-4 text-sm whitespace-nowrap">Learning Plans</TabsTrigger>
            <TabsTrigger value="enrollments" className="min-h-[44px] px-4 text-sm whitespace-nowrap">Enrollments</TabsTrigger>
            <TabsTrigger value="ai-inservices" className="min-h-[44px] px-4 text-sm whitespace-nowrap">AI In-Services</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="courses">
          <CourseManager />
        </TabsContent>

        <TabsContent value="learning-plans">
          <LearningPlanManager />
        </TabsContent>

        <TabsContent value="enrollments">
          <EnrollmentManager />
        </TabsContent>

        <TabsContent value="ai-inservices">
          <AIComplianceInServicesHub />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function EnrollmentManager() {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const queryClient = useQueryClient();

  const { data: plans = [] } = useQuery({
    queryKey: ['learning-plans'],
    queryFn: () => base44.entities.LearningPlan.list('-created_date', 50),
    initialData: [],
  });

  const { data: enrollments = [] } = useQuery({
    queryKey: ['enrollments', selectedPlan?.id],
    queryFn: () => selectedPlan ? base44.entities.PlanEnrollment.filter({
      plan_id: selectedPlan.id
    }, '-enrolled_at') : Promise.resolve([]),
    initialData: [],
    enabled: !!selectedPlan,
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
      <div className="lg:col-span-1">
        <h3 className="font-semibold mb-3 text-base sm:text-lg">Learning Plans</h3>
        <div className="space-y-2 max-h-[500px] overflow-y-auto">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`cursor-pointer transition-all hover:shadow-md ${selectedPlan?.id === plan.id ? 'border-indigo-600 bg-indigo-50 border-2' : ''}`}
              onClick={() => setSelectedPlan(plan)}
            >
              <CardContent className="p-3 sm:p-4">
                <p className="font-medium text-sm">{plan.name}</p>
                <p className="text-xs text-slate-600 mt-1">{plan.year}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="lg:col-span-2">
        {selectedPlan ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg sm:text-xl">{selectedPlan.name} - Enrollments</CardTitle>
            </CardHeader>
            <CardContent className="p-3 sm:p-6">
              {enrollments.length > 0 ? (
                <div className="space-y-3">
                  {enrollments.map((enrollment) => (
                    <div key={enrollment.id} className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 border rounded-lg bg-slate-50">
                      <div className="flex-1">
                        <p className="font-medium text-sm sm:text-base">{enrollment.user_name}</p>
                        <p className="text-xs sm:text-sm text-slate-600 truncate">{enrollment.user_id}</p>
                        <p className="text-xs text-slate-500 mt-1">
                          {enrollment.courses_completed}/{enrollment.courses_total} courses completed
                        </p>
                      </div>
                      <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
                        <Badge className={`text-xs ${enrollment.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}`}>
                          {enrollment.status}
                        </Badge>
                        <p className="text-sm font-semibold text-slate-700">{enrollment.progress_percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-slate-600 py-8">No enrollments yet</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 sm:mb-4 text-slate-300" />
              <p className="text-sm sm:text-base text-slate-600">Select a learning plan to view enrollments</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
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
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Training Management</h1>
        <p className="text-gray-600">Manage courses, create learning plans, and assign training</p>
      </div>

      <Tabs defaultValue="courses" className="space-y-6">
        <TabsList>
          <TabsTrigger value="courses">Courses</TabsTrigger>
          <TabsTrigger value="learning-plans">Learning Plans</TabsTrigger>
          <TabsTrigger value="enrollments">Enrollments</TabsTrigger>
          <TabsTrigger value="ai-inservices">AI Compliance In-Services</TabsTrigger>
        </TabsList>

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
    <div className="grid grid-cols-3 gap-6">
      <div>
        <h3 className="font-semibold mb-3">Learning Plans</h3>
        <div className="space-y-2">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`cursor-pointer ${selectedPlan?.id === plan.id ? 'border-indigo-600 bg-indigo-50' : ''}`}
              onClick={() => setSelectedPlan(plan)}
            >
              <CardContent className="p-4">
                <p className="font-medium text-sm">{plan.name}</p>
                <p className="text-xs text-gray-600 mt-1">{plan.year}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      <div className="col-span-2">
        {selectedPlan ? (
          <Card>
            <CardHeader>
              <CardTitle>{selectedPlan.name} - Enrollments</CardTitle>
            </CardHeader>
            <CardContent>
              {enrollments.length > 0 ? (
                <div className="space-y-3">
                  {enrollments.map((enrollment) => (
                    <div key={enrollment.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div>
                        <p className="font-medium">{enrollment.user_name}</p>
                        <p className="text-sm text-gray-600">{enrollment.user_id}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {enrollment.courses_completed}/{enrollment.courses_total} courses
                        </p>
                      </div>
                      <div className="text-right">
                        <Badge className={enrollment.status === 'completed' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'}>
                          {enrollment.status}
                        </Badge>
                        <p className="text-sm text-gray-600 mt-1">{enrollment.progress_percentage}%</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-600">No enrollments yet</p>
              )}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-600">Select a learning plan to view enrollments</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
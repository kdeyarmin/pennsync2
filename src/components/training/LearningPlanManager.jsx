import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Target, X } from "lucide-react";
import LearningPlanForm from "./LearningPlanForm";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function LearningPlanManager() {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showCourseDialog, setShowCourseDialog] = useState(false);
  const queryClient = useQueryClient();

  const { data: plans = [] } = useQuery({
    queryKey: ['learning-plans'],
    queryFn: () => base44.entities.LearningPlan.list('-created_date', 50),
    initialData: [],
  });

  const { data: planCourses = [] } = useQuery({
    queryKey: ['plan-courses', selectedPlan?.id],
    queryFn: () => selectedPlan ? base44.entities.LearningPlanCourse.filter({
      plan_id: selectedPlan.id
    }, 'order_index') : Promise.resolve([]),
    initialData: [],
    enabled: !!selectedPlan,
  });

  const { data: allCourses = [] } = useQuery({
    queryKey: ['all-courses'],
    queryFn: () => base44.entities.TrainingCourse.filter({ status: 'published' }),
    initialData: [],
  });

  const deletePlanMutation = useMutation({
    mutationFn: (planId) => base44.entities.LearningPlan.delete(planId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['learning-plans'] });
      setSelectedPlan(null);
    },
  });

  const addCourseMutation = useMutation({
    mutationFn: (courseId) => base44.entities.LearningPlanCourse.create({
      plan_id: selectedPlan.id,
      course_id: courseId,
      course_title: allCourses.find(c => c.id === courseId)?.title,
      order_index: planCourses.length,
      is_required: true,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-courses'] });
      setShowCourseDialog(false);
    },
  });

  const removeCourseMutation = useMutation({
    mutationFn: (planCourseId) => base44.entities.LearningPlanCourse.delete(planCourseId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plan-courses'] });
    },
  });

  const usedCourseIds = new Set(planCourses.map(pc => pc.course_id));
  const availableCourses = allCourses.filter(c => !usedCourseIds.has(c.id));

  return (
    <div className="grid grid-cols-3 gap-6">
      {/* Plans List */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-semibold">Learning Plans</h3>
          <Dialog open={showForm} onOpenChange={setShowForm}>
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus className="w-4 h-4" />
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Create Learning Plan</DialogTitle>
              </DialogHeader>
              <LearningPlanForm onSuccess={() => {
                setShowForm(false);
                queryClient.invalidateQueries({ queryKey: ['learning-plans'] });
              }} />
            </DialogContent>
          </Dialog>
        </div>

        <div className="space-y-2">
          {plans.map((plan) => (
            <Card
              key={plan.id}
              className={`cursor-pointer transition-all ${selectedPlan?.id === plan.id ? 'border-indigo-600 bg-indigo-50' : ''}`}
              onClick={() => setSelectedPlan(plan)}
            >
              <CardContent className="p-4">
                <p className="font-medium text-sm">{plan.name}</p>
                <p className="text-xs text-gray-600 mt-1">{plan.year}</p>
                <div className="flex gap-1 mt-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={(e) => {
                      e.stopPropagation();
                      deletePlanMutation.mutate(plan.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3 text-red-600" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {/* Plan Details and Courses */}
      <div className="col-span-2">
        {selectedPlan ? (
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-xl">{selectedPlan.name}</CardTitle>
                <p className="text-sm text-gray-600 mt-2">{selectedPlan.description}</p>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-600">Year:</span>
                    <p className="font-medium">{selectedPlan.year}</p>
                  </div>
                  <div>
                    <span className="text-gray-600">Type:</span>
                    <p className="font-medium">{selectedPlan.plan_type}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between items-center">
              <h4 className="font-semibold">Courses ({planCourses.length})</h4>
              <Dialog open={showCourseDialog} onOpenChange={setShowCourseDialog}>
                <DialogTrigger asChild>
                  <Button size="sm">
                    <Plus className="w-4 h-4 mr-1" />
                    Add Course
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Course to Plan</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-2">
                    {availableCourses.map((course) => (
                      <Card key={course.id} className="cursor-pointer hover:bg-gray-50">
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium text-sm">{course.title}</p>
                              <Badge className="mt-1">{course.category}</Badge>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => addCourseMutation.mutate(course.id)}
                              disabled={addCourseMutation.isLoading}
                            >
                              Add
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-2">
              {planCourses.length > 0 ? (
                planCourses.map((pc) => (
                  <Card key={pc.id}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <p className="font-medium">{pc.course_title}</p>
                        <p className="text-xs text-gray-600">{pc.due_date_offset_days} days to complete</p>
                      </div>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => removeCourseMutation.mutate(pc.id)}
                      >
                        <X className="w-4 h-4 text-red-600" />
                      </Button>
                    </CardContent>
                  </Card>
                ))
              ) : (
                <p className="text-sm text-gray-600 text-center py-8">No courses added yet</p>
              )}
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center">
              <Target className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p className="text-gray-600">Select a learning plan to manage courses</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
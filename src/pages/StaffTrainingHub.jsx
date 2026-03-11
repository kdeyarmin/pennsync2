import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BookOpen, CheckCircle2, Clock, AlertCircle } from "lucide-react";

export default function StaffTrainingHub() {
  const [currentUser, setCurrentUser] = React.useState(null);

  React.useEffect(() => {
    base44.auth.me().then(setCurrentUser);
  }, []);

  // Fetch enrolled learning plans
  const { data: enrollments = [] } = useQuery({
    queryKey: ['plan-enrollments', currentUser?.email],
    queryFn: () => base44.entities.PlanEnrollment.filter({
      user_id: currentUser?.email
    }, '-enrolled_at'),
    initialData: [],
    enabled: !!currentUser?.email,
  });

  // Fetch training assignments
  const { data: assignments = [] } = useQuery({
    queryKey: ['training-assignments', currentUser?.email],
    queryFn: () => base44.entities.TrainingAssignment.filter({
      assigned_to_user_id: currentUser?.email
    }, '-created_date'),
    initialData: [],
    enabled: !!currentUser?.email,
  });

  // Fetch completed certificates
  const { data: certificates = [] } = useQuery({
    queryKey: ['certificates', currentUser?.email],
    queryFn: () => base44.entities.TrainingCertificate.filter({
      user_id: currentUser?.email
    }, '-issued_at'),
    initialData: [],
    enabled: !!currentUser?.email,
  });

  const getStatusColor = (status) => {
    switch(status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'in_progress': return 'bg-blue-100 text-blue-800';
      case 'overdue': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getProgressPercentage = (enrollment) => {
    return enrollment.progress_percentage || 0;
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Training Center</h1>
        <p className="text-gray-600">View your assigned courses and track your learning progress</p>
      </div>

      <Tabs defaultValue="learning-plans" className="space-y-6">
        <TabsList>
          <TabsTrigger value="learning-plans">Learning Plans</TabsTrigger>
          <TabsTrigger value="assignments">Individual Courses</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
        </TabsList>

        <TabsContent value="learning-plans">
          <div className="space-y-4">
            {enrollments.length > 0 ? (
              enrollments.map((enrollment) => (
                <Card key={enrollment.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle>{enrollment.plan_name}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">
                          {enrollment.courses_completed} of {enrollment.courses_total} courses completed
                        </p>
                      </div>
                      <Badge className={getStatusColor(enrollment.status)}>
                        {enrollment.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-indigo-600 h-2 rounded-full transition-all"
                          style={{ width: `${getProgressPercentage(enrollment)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-600">{getProgressPercentage(enrollment)}% Complete</span>
                        {enrollment.due_date && (
                          <span className="flex items-center gap-1 text-gray-600">
                            <Clock className="w-4 h-4" />
                            Due: {new Date(enrollment.due_date).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-600">No learning plans assigned yet</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="assignments">
          <div className="space-y-4">
            {assignments.length > 0 ? (
              assignments.map((assignment) => (
                <Card key={assignment.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{assignment.course_title}</CardTitle>
                        {assignment.due_date && (
                          <p className="text-sm text-gray-600 mt-1">
                            Due: {new Date(assignment.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <Badge className={getStatusColor(assignment.status)}>
                        {assignment.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">{assignment.progress_percentage || 0}% Complete</p>
                      <Button>Continue Course</Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <BookOpen className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-600">No courses assigned</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

        <TabsContent value="certificates">
          <div className="space-y-4">
            {certificates.length > 0 ? (
              certificates.map((cert) => (
                <Card key={cert.id}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-5 h-5 text-green-600" />
                          <CardTitle className="text-lg">{cert.course_title}</CardTitle>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">
                          Issued: {new Date(cert.issued_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-indigo-600">{cert.score}%</p>
                        <p className="text-sm text-gray-600">Score</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    {cert.expiration_date ? (
                      <div className="flex items-center gap-2 text-sm text-orange-600">
                        <AlertCircle className="w-4 h-4" />
                        Expires: {new Date(cert.expiration_date).toLocaleDateString()}
                      </div>
                    ) : (
                      <p className="text-sm text-green-600">No expiration</p>
                    )}
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card>
                <CardContent className="py-12 text-center">
                  <CheckCircle2 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-gray-600">No certificates yet</p>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Award, Printer } from "lucide-react";
import { Link } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { generateTrainingCertificate } from "@/functions/generateTrainingCertificate";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import LearningPathProgress from "./LearningPathProgress";

const formatDate = (value) => value ? new Date(value).toLocaleDateString() : "—";

export default function MyAnnualEducationDashboard() {
  const currentYear = new Date().getFullYear();
  const { data: currentUser } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });
  const { data: assignments = [] } = useQuery({
    queryKey: ["my-annual-assignments", currentUser?.email],
    queryFn: async () => {
      const all = await base44.entities.TrainingAssignment.filter({ assigned_to_user_id: currentUser?.email }, '-due_date', 500);
      return all.filter((assignment) => assignment.annual_cycle_year === currentYear);
    },
    enabled: !!currentUser?.email,
    initialData: []
  });
  const { data: courses = [] } = useQuery({
    queryKey: ["annual-courses"],
    queryFn: async () => {
      const all = await base44.entities.TrainingCourse.list('-updated_date', 500);
      return all.filter((course) => course.training_type === 'annual_mandatory');
    },
    initialData: []
  });
  const { data: certificates = [] } = useQuery({
    queryKey: ["annual-certificates", currentUser?.email],
    queryFn: async () => {
      const all = await base44.entities.TrainingCertificate.filter({ user_id: currentUser?.email }, '-issued_at', 300);
      return all.filter((certificate) => certificate.annual_cycle_year === currentYear);
    },
    enabled: !!currentUser?.email,
    initialData: []
  });
  const { data: enrollments = [] } = useQuery({
    queryKey: ["annual-plan-enrollments", currentUser?.email],
    queryFn: async () => {
      const all = await base44.entities.PlanEnrollment.filter({ user_id: currentUser?.email }, '-enrolled_at', 100);
      return all.filter((enrollment) => enrollment.plan_name?.includes(String(currentYear)) || enrollment.status);
    },
    enabled: !!currentUser?.email,
    initialData: []
  });

  const courseMap = useMemo(() => Object.fromEntries(courses.map((course) => [course.id, course])), [courses]);
  const stats = {
    assigned: assignments.length,
    completed: assignments.filter((assignment) => assignment.status === 'completed').length,
    overdue: assignments.filter((assignment) => assignment.status === 'overdue').length,
    failed: assignments.filter((assignment) => assignment.pass_fail_result === 'failed').length,
  };

  const certificateBlobUrl = async (certificate) => {
    const response = await generateTrainingCertificate({
      moduleName: certificate.course_title,
      completionDate: certificate.completion_date || certificate.issued_at,
      score: certificate.score
    });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    return window.URL.createObjectURL(blob);
  };

  const printCertificate = async (certificate) => {
    const url = await certificateBlobUrl(certificate);
    const printWindow = window.open(url, '_blank');
    setTimeout(() => printWindow?.print(), 600);
  };

  const downloadCertificate = async (certificate) => {
    const url = await certificateBlobUrl(certificate);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${certificate.course_title.replace(/\s+/g, '_')}_annual_certificate.pdf`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-blue-800 to-indigo-700 text-white p-6 shadow-xl">
        <h1 className="text-3xl font-bold mb-2">My Annual Education</h1>
        <p className="text-blue-100">Track required yearly education, annual bundles, scores, certificates, and renewal dates.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[['Assigned', stats.assigned], ['Completed', stats.completed], ['Overdue', stats.overdue], ['Failed', stats.failed]].map(([label, value]) => (
          <Card key={label}><CardContent className="p-5"><p className="text-sm text-slate-500">{label}</p><p className="text-3xl font-bold text-slate-900">{value}</p></CardContent></Card>
        ))}
      </div>

      <Tabs defaultValue="assignments" className="space-y-6">
        <TabsList>
          <TabsTrigger value="assignments">My Annual Modules</TabsTrigger>
          <TabsTrigger value="plans">Annual Learning Plans</TabsTrigger>
          <TabsTrigger value="transcript">Annual Transcript</TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="space-y-4">
          {assignments.map((assignment) => {
            const course = courseMap[assignment.course_id] || {};
            return (
              <Card key={assignment.id}>
                <CardContent className="p-5 flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div className="space-y-2 min-w-0 flex-1">
                    <div className="flex flex-wrap gap-2 items-center">
                      <h2 className="text-lg font-semibold text-slate-900">{assignment.course_title}</h2>
                      <Badge variant="outline">{course.business_line_scope || 'all'}</Badge>
                      <Badge className={assignment.status === 'completed' ? 'bg-green-100 text-green-800' : assignment.status === 'overdue' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}>{assignment.status}</Badge>
                    </div>
                    <p className="text-sm text-slate-500">{course.employee_audience || assignment.assigned_to_role || 'employee audience'}</p>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-slate-600">
                      <div><span className="font-medium">Due:</span> {formatDate(assignment.due_date)}</div>
                      <div><span className="font-medium">Estimated:</span> {course.estimated_minutes || 0} min</div>
                      <div><span className="font-medium">Latest score:</span> {assignment.score_percentage ?? '—'}%</div>
                      <div><span className="font-medium">Attempts:</span> {assignment.latest_attempt_number || 0}</div>
                      <div><span className="font-medium">Passing score:</span> {assignment.passing_score_required || 80}%</div>
                      <div><span className="font-medium">Renewal:</span> {formatDate(assignment.renewal_due_date)}</div>
                    </div>
                    <Progress value={assignment.progress_percentage || 0} className="h-2" />
                  </div>
                  <div className="lg:w-56">
                    <Link to={`${createPageUrl('TrainingCoursePlayer')}?assignment=${assignment.id}`}><Button className="w-full">Open annual education</Button></Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          {assignments.length === 0 && <Card><CardContent className="p-10 text-center text-slate-500">No annual education assigned for this cycle.</CardContent></Card>}
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          {enrollments.map((enrollment) => (
            <LearningPathProgress 
              key={enrollment.id}
              planId={enrollment.plan_id}
              userId={currentUser?.email}
            />
          ))}
          {enrollments.length === 0 && <Card><CardContent className="p-10 text-center text-slate-500">No annual learning plans assigned.</CardContent></Card>}
        </TabsContent>

        <TabsContent value="transcript" className="space-y-4">
          <div className="flex justify-end"><Link to={createPageUrl('AnnualEducationTranscript')}><Button variant="outline">Open full annual transcript</Button></Link></div>
          {certificates.map((certificate) => (
            <Card key={certificate.id}>
              <CardContent className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1"><Award className="w-5 h-5 text-amber-500" /><h3 className="font-semibold text-slate-900">{certificate.course_title}</h3></div>
                  <p className="text-sm text-slate-500">Completed {formatDate(certificate.completion_date || certificate.issued_at)} • Score {certificate.score}%</p>
                  <p className="text-sm text-slate-500">Certificate ID: {certificate.certificate_id}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={() => printCertificate(certificate)}><Printer className="w-4 h-4 mr-2" />Print</Button>
                  <Button variant="outline" onClick={() => downloadCertificate(certificate)}>Download PDF</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {certificates.length === 0 && <Card><CardContent className="p-10 text-center text-slate-500">No annual certificates available yet.</CardContent></Card>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
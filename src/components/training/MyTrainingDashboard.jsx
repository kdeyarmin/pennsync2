import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Award, BookOpen, CheckCircle2, RefreshCcw, TriangleAlert } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { generateTrainingCertificate } from "@/functions/generateTrainingCertificate";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

const formatDate = (value) => value ? new Date(value).toLocaleDateString() : "—";

export default function MyTrainingDashboard() {
  const { data: currentUser } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });
  const { data: assignments = [] } = useQuery({ queryKey: ["my-training-assignments", currentUser?.email], queryFn: () => base44.entities.TrainingAssignment.filter({ assigned_to_user_id: currentUser?.email }, '-due_date', 300), enabled: !!currentUser?.email, initialData: [] });
  const { data: courses = [] } = useQuery({ queryKey: ["my-training-courses"], queryFn: () => base44.entities.TrainingCourse.list('-updated_date', 300), initialData: [] });
  const { data: attempts = [] } = useQuery({ queryKey: ["my-training-attempts", currentUser?.email], queryFn: () => base44.entities.TrainingAttempt.filter({ user_id: currentUser?.email }, '-submitted_at', 500), enabled: !!currentUser?.email, initialData: [] });
  const { data: certificates = [] } = useQuery({ queryKey: ["my-training-certificates", currentUser?.email], queryFn: () => base44.entities.TrainingCertificate.filter({ user_id: currentUser?.email }, '-issued_at', 200), enabled: !!currentUser?.email, initialData: [] });
  const { data: enrollments = [] } = useQuery({ queryKey: ["my-plan-enrollments", currentUser?.email], queryFn: () => base44.entities.PlanEnrollment.filter({ user_id: currentUser?.email }, '-enrolled_at', 100), enabled: !!currentUser?.email, initialData: [] });

  const courseMap = useMemo(() => Object.fromEntries(courses.map((course) => [course.id, course])), [courses]);
  const latestAttempts = useMemo(() => {
    const map = {};
    attempts.forEach((attempt) => {
      if (!map[attempt.assignment_id]) map[attempt.assignment_id] = [];
      map[attempt.assignment_id].push(attempt);
    });
    return map;
  }, [attempts]);

  const stats = {
    assigned: assignments.length,
    overdue: assignments.filter((assignment) => assignment.status === 'overdue').length,
    passed: assignments.filter((assignment) => assignment.pass_fail_result === 'passed').length,
    failed: assignments.filter((assignment) => assignment.pass_fail_result === 'failed').length,
  };

  const downloadCertificate = async (certificate) => {
    const response = await generateTrainingCertificate({ moduleName: certificate.course_title, completionDate: certificate.completion_date || certificate.issued_at, score: certificate.score });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${certificate.course_title.replace(/\s+/g, '_')}_certificate.pdf`;
    anchor.click();
    window.URL.revokeObjectURL(url);
  };

  const printCertificate = async (certificate) => {
    const response = await generateTrainingCertificate({ moduleName: certificate.course_title, completionDate: certificate.completion_date || certificate.issued_at, score: certificate.score });
    const blob = new Blob([response.data], { type: 'application/pdf' });
    const url = window.URL.createObjectURL(blob);
    const printWindow = window.open(url, '_blank');
    setTimeout(() => printWindow?.print(), 600);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-800 text-white p-6 shadow-xl">
        <h1 className="text-3xl font-bold mb-2">My Training</h1>
        <p className="text-blue-100">Assigned in-services, due dates, scores, certificates, and learning plan progress in one place.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[{ label: 'Assigned', value: stats.assigned, icon: BookOpen }, { label: 'Overdue', value: stats.overdue, icon: TriangleAlert }, { label: 'Passed', value: stats.passed, icon: CheckCircle2 }, { label: 'Failed', value: stats.failed, icon: RefreshCcw }].map((item) => {
          const Icon = item.icon;
          return <Card key={item.label}><CardContent className="p-5 flex items-center justify-between"><div><p className="text-sm text-slate-500">{item.label}</p><p className="text-3xl font-bold text-slate-900">{item.value}</p></div><Icon className="w-8 h-8 text-indigo-500" /></CardContent></Card>;
        })}
      </div>

      <Tabs defaultValue="assignments" className="space-y-6">
        <TabsList>
          <TabsTrigger value="assignments">Assigned In-Services</TabsTrigger>
          <TabsTrigger value="plans">Learning Plans</TabsTrigger>
          <TabsTrigger value="transcript">Transcript & Certificates</TabsTrigger>
        </TabsList>

        <TabsContent value="assignments" className="space-y-4">
          {assignments.map((assignment) => {
            const course = courseMap[assignment.course_id] || {};
            const attemptsForAssignment = latestAttempts[assignment.id] || [];
            return <Card key={assignment.id}><CardContent className="p-5"><div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4"><div className="space-y-2 min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-lg font-semibold text-slate-900">{assignment.course_title}</h2><Badge variant="outline">{course.category || 'in-service'}</Badge><Badge className={assignment.pass_fail_result === 'passed' ? 'bg-green-100 text-green-800' : assignment.pass_fail_result === 'failed' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}>{assignment.status}</Badge>{assignment.status === 'overdue' && <Badge className="bg-red-100 text-red-800">overdue</Badge>}</div><p className="text-sm text-slate-500">{course.business_line_scope || 'all'} • {course.employee_audience || assignment.assigned_to_role || 'assigned audience'}</p><div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm text-slate-600"><div><span className="font-medium">Due:</span> {formatDate(assignment.due_date)}</div><div><span className="font-medium">Estimated:</span> {course.estimated_minutes || 0} min</div><div><span className="font-medium">Latest score:</span> {assignment.score_percentage ?? '—'}%</div><div><span className="font-medium">Attempts:</span> {assignment.latest_attempt_number || attemptsForAssignment.length || 0}</div><div><span className="font-medium">Passing score:</span> {assignment.passing_score_required || course.passing_score || 80}%</div><div><span className="font-medium">Renewal:</span> {formatDate(assignment.renewal_due_date)}</div></div><Progress value={assignment.progress_percentage || 0} className="h-2" /></div><div className="flex flex-col gap-2 lg:w-56"><Link to={`${createPageUrl('TrainingCoursePlayer')}?assignment=${assignment.id}`}><Button className="w-full">{assignment.status === 'in_progress' ? 'Continue In-Service' : 'Open In-Service'}</Button></Link></div></div></CardContent></Card>;
          })}
          {assignments.length === 0 && <Card><CardContent className="p-10 text-center text-slate-500">No in-services assigned yet.</CardContent></Card>}
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          {enrollments.map((enrollment) => {
            const overdue = enrollment.status === 'overdue' || (enrollment.due_date && new Date(enrollment.due_date) < new Date() && enrollment.status !== 'completed');
            return <Card key={enrollment.id}><CardHeader><div className="flex items-center justify-between gap-3"><CardTitle>{enrollment.plan_name}</CardTitle><Badge className={overdue ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}>{overdue ? 'overdue' : enrollment.status}</Badge></div></CardHeader><CardContent className="space-y-3"><div className="flex items-center justify-between text-sm text-slate-600"><span>{enrollment.courses_completed}/{enrollment.courses_total} completed</span><span>Due {formatDate(enrollment.due_date)}</span></div><Progress value={enrollment.progress_percentage || 0} className="h-2" /></CardContent></Card>;
          })}
          {enrollments.length === 0 && <Card><CardContent className="p-10 text-center text-slate-500">No learning plans assigned.</CardContent></Card>}
        </TabsContent>

        <TabsContent value="transcript" className="space-y-4">
          <div className="flex justify-end"><Link to={createPageUrl('EmployeeTranscript')}><Button variant="outline">Open full transcript page</Button></Link></div>
          {certificates.map((certificate) => (
            <Card key={certificate.id}>
              <CardContent className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 mb-1"><Award className="w-5 h-5 text-amber-500" /><h3 className="font-semibold text-slate-900">{certificate.course_title}</h3></div>
                  <p className="text-sm text-slate-500">Completed {formatDate(certificate.completion_date || certificate.issued_at)} • Score {certificate.score}%</p>
                  <p className="text-sm text-slate-500">Certificate ID: {certificate.certificate_id}</p>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button variant="outline" onClick={() => printCertificate(certificate)}>Print</Button>
                  <Button variant="outline" onClick={() => downloadCertificate(certificate)}>Download PDF</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {certificates.length === 0 && <Card><CardContent className="p-10 text-center text-slate-500">No certificates available yet.</CardContent></Card>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, BarChart3, CheckCircle2, Copy, PlusCircle, Send, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { generateTrainingCourse } from "@/functions/generateTrainingCourse";
import { assignInService } from "@/functions/assignInService";
import { duplicateInService } from "@/functions/duplicateInService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AdminComplianceStats from "@/components/training/AdminComplianceStats";
import TemplateLibraryPanel from "@/components/training/TemplateLibraryPanel";
import AssignmentWizard from "@/components/training/AssignmentWizard";
import RetakeSettingsPanel from "@/components/training/RetakeSettingsPanel";

const formatDate = (value) => value ? new Date(value).toLocaleDateString() : "—";

export default function AIComplianceInServicesHub() {
  const queryClient = useQueryClient();
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [generator, setGenerator] = useState({
    topic: "",
    training_category: "compliance",
    business_line: "all",
    audience_roles: ["employee"],
    purpose_of_training: "",
    reading_level: "plain professional",
    lesson_length: 30,
    question_count: 10,
    question_types: ["mcq", "true_false"],
    include_case_scenarios: true,
    include_key_takeaways: true,
    include_policy_section: true,
    include_references: true,
    include_acknowledgement: true,
    custom_instructions: ""
  });
  const [manualDraft, setManualDraft] = useState({ title: "", description: "", category: "compliance", business_line_scope: "all", passing_score: 80 });
  const [assignmentSettings, setAssignmentSettings] = useState({
    passingScoreRequired: 80,
    maxAttempts: 3,
    waitingPeriodHours: 24,
    regenerateTestOnRetake: true,
    showCorrectAnswers: false,
    attestationRequired: true,
    required: true,
    priority: 'high',
    remediationMessage: 'Please review the lesson content and complete a new retake.'
  });
  const [pendingAssignmentPayload, setPendingAssignmentPayload] = useState(null);

  const { data: currentUser } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });
  const { data: users = [] } = useQuery({ queryKey: ["learning-users"], queryFn: () => base44.entities.User.list('-created_date', 500), initialData: [] });
  const { data: courses = [] } = useQuery({ queryKey: ["in-service-courses"], queryFn: () => base44.entities.TrainingCourse.list('-updated_date', 300), initialData: [] });
  const { data: assignments = [] } = useQuery({ queryKey: ["in-service-assignments"], queryFn: () => base44.entities.TrainingAssignment.list('-created_date', 1000), initialData: [] });
  const { data: certificates = [] } = useQuery({ queryKey: ["in-service-certificates"], queryFn: () => base44.entities.TrainingCertificate.list('-issued_at', 500), initialData: [] });
  const { data: templates = [] } = useQuery({ queryKey: ["training-templates"], queryFn: () => base44.entities.TrainingTemplate.list('-created_date', 100), initialData: [] });
  const { data: planEnrollments = [] } = useQuery({ queryKey: ["plan-enrollments-admin"], queryFn: () => base44.entities.PlanEnrollment.list('-enrolled_at', 300), initialData: [] });

  const inServices = useMemo(() => courses.filter((course) => course.training_type === 'in_service' || course.ai_generated), [courses]);
  const now = new Date();
  const dueSoonCount = assignments.filter((assignment) => {
    if (!assignment.due_date || ['completed', 'failed', 'locked'].includes(assignment.status)) return false;
    const diff = Math.ceil((new Date(assignment.due_date) - now) / (1000 * 60 * 60 * 24));
    return diff >= 0 && diff <= 7;
  }).length;
  const averageScore = Math.round((assignments.filter((assignment) => typeof assignment.score_percentage === 'number').reduce((sum, assignment) => sum + assignment.score_percentage, 0) / Math.max(assignments.filter((assignment) => typeof assignment.score_percentage === 'number').length, 1)) || 0);
  const reportStats = {
    totalAssigned: assignments.length,
    dueSoon: dueSoonCount,
    overdue: assignments.filter((assignment) => assignment.status === 'overdue').length,
    completed: assignments.filter((assignment) => assignment.status === 'completed').length,
    passed: assignments.filter((assignment) => assignment.pass_fail_result === 'passed').length,
    failed: assignments.filter((assignment) => assignment.pass_fail_result === 'failed').length,
    averageScore,
  };

  const createAuditLog = async (action, entityId, afterJson, reason = "") => {
    await base44.entities.TrainingAuditLog.create({
      actor_id: currentUser?.email,
      actor_name: currentUser?.full_name,
      action,
      entity_type: 'TrainingCourse',
      entity_id: entityId,
      after_json: afterJson,
      reason,
      severity: 'info'
    });
  };

  const useTemplate = (template) => {
    setGenerator((prev) => ({
      ...prev,
      topic: template.topic,
      training_category: template.training_category,
      purpose_of_training: template.purpose_of_training,
      audience_roles: template.audience_roles,
    }));
  };

  const runAIGeneration = async () => {
    await generateTrainingCourse(generator);
    queryClient.invalidateQueries({ queryKey: ["in-service-courses"] });
  };

  const savePromptAsTemplate = async () => {
    await base44.entities.TrainingTemplate.create({
      name: generator.topic || 'Custom template',
      description: generator.purpose_of_training,
      training_category: generator.training_category,
      business_line: generator.business_line,
      prompt_json: generator,
      active: true
    });
    queryClient.invalidateQueries({ queryKey: ["training-templates"] });
  };

  const createManualDraft = async () => {
    const created = await base44.entities.TrainingCourse.create({
      ...manualDraft,
      training_type: 'in_service',
      status: 'draft',
      employee_audience: 'employee',
      learning_objectives: [],
      ai_generated: false,
      requires_attestation: true,
      enable_certificate: true,
      short_description: manualDraft.description,
      test_settings_json: { show_correct_answers_after_completion: false }
    });
    await createAuditLog('course_created', created.id, { title: created.title, status: 'draft' }, 'created');
    setManualDraft({ title: "", description: "", category: "compliance", business_line_scope: "all", passing_score: 80 });
    queryClient.invalidateQueries({ queryKey: ["in-service-courses"] });
  };

  const confirmAssignment = async () => {
    if (!pendingAssignmentPayload) return;
    await assignInService({
      courseId: selectedCourseId,
      dueDate,
      userEmails: pendingAssignmentPayload.userEmails,
      filters: pendingAssignmentPayload.filters,
      settings: assignmentSettings
    });
    setPendingAssignmentPayload(null);
    queryClient.invalidateQueries({ queryKey: ["in-service-assignments"] });
  };

  const updateCourseStatus = async (course, status) => {
    await base44.entities.TrainingCourse.update(course.id, {
      status,
      published_by: status === 'published' ? currentUser?.email : course.published_by,
      published_date: status === 'published' ? new Date().toISOString() : course.published_date,
      archived_status: status === 'archived'
    });
    await createAuditLog(status === 'published' ? 'course_published' : 'course_archived', course.id, { status }, status === 'published' ? 'published' : 'archived');
    queryClient.invalidateQueries({ queryKey: ["in-service-courses"] });
  };

  const duplicateCourse = async (courseId) => {
    await duplicateInService({ courseId });
    queryClient.invalidateQueries({ queryKey: ["in-service-courses"] });
  };

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-indigo-700 to-purple-700 text-white p-6 shadow-xl">
        <h1 className="text-3xl font-bold mb-2">AI Compliance In-Services</h1>
        <p className="text-indigo-100">AI-powered in-services, competency testing, certificates, learning plan tracking, and compliance reporting inside your current learning center.</p>
      </div>

      <AdminComplianceStats stats={reportStats} />

      <Tabs defaultValue="builder" className="space-y-6">
        <TabsList>
          <TabsTrigger value="builder">AI Builder</TabsTrigger>
          <TabsTrigger value="templates">Template Library</TabsTrigger>
          <TabsTrigger value="library">In-Service Library</TabsTrigger>
          <TabsTrigger value="assignments">Assignment Wizard</TabsTrigger>
          <TabsTrigger value="reports">Reports</TabsTrigger>
          <TabsTrigger value="plans">Learning Plans</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-600" />AI In-Service Generator</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Topic" value={generator.topic} onChange={(e) => setGenerator({ ...generator, topic: e.target.value })} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select value={generator.training_category} onValueChange={(value) => setGenerator({ ...generator, training_category: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="compliance">Compliance</SelectItem><SelectItem value="clinical">Clinical</SelectItem><SelectItem value="safety">Safety</SelectItem><SelectItem value="documentation">Documentation</SelectItem><SelectItem value="hospice">Hospice</SelectItem><SelectItem value="home_health">Home Health</SelectItem></SelectContent></Select>
                <Select value={generator.business_line} onValueChange={(value) => setGenerator({ ...generator, business_line: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="home_health">Home Health</SelectItem><SelectItem value="hospice">Hospice</SelectItem></SelectContent></Select>
              </div>
              <Textarea placeholder="Purpose of training" value={generator.purpose_of_training} onChange={(e) => setGenerator({ ...generator, purpose_of_training: e.target.value })} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input type="number" placeholder="Lesson length" value={generator.lesson_length} onChange={(e) => setGenerator({ ...generator, lesson_length: Number(e.target.value) })} />
                <Input type="number" placeholder="Question count" value={generator.question_count} onChange={(e) => setGenerator({ ...generator, question_count: Number(e.target.value) })} />
                <Input placeholder="Audience" value={generator.audience_roles.join(', ')} onChange={(e) => setGenerator({ ...generator, audience_roles: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} />
              </div>
              <Textarea placeholder="Custom instructions" value={generator.custom_instructions} onChange={(e) => setGenerator({ ...generator, custom_instructions: e.target.value })} />
              <div className="grid grid-cols-2 gap-3 text-sm">
                {[
                  ['include_case_scenarios', 'Case scenarios'],
                  ['include_key_takeaways', 'Key takeaways'],
                  ['include_policy_section', 'Policy section'],
                  ['include_references', 'References'],
                  ['include_acknowledgement', 'Acknowledgement'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2 rounded-xl border p-3">
                    <Checkbox checked={generator[key]} onCheckedChange={(checked) => setGenerator({ ...generator, [key]: !!checked })} />
                    <span>{label}</span>
                  </label>
                ))}
              </div>
              <div className="flex gap-3">
                <Button className="flex-1" onClick={runAIGeneration}>Generate AI in-service</Button>
                <Button variant="outline" onClick={savePromptAsTemplate}>Save prompt as template</Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><PlusCircle className="w-5 h-5 text-indigo-600" />Manual in-service draft</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="In-service title" value={manualDraft.title} onChange={(e) => setManualDraft({ ...manualDraft, title: e.target.value })} />
              <Textarea placeholder="Description" value={manualDraft.description} onChange={(e) => setManualDraft({ ...manualDraft, description: e.target.value })} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select value={manualDraft.category} onValueChange={(value) => setManualDraft({ ...manualDraft, category: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="compliance">Compliance</SelectItem><SelectItem value="clinical">Clinical</SelectItem><SelectItem value="safety">Safety</SelectItem><SelectItem value="documentation">Documentation</SelectItem></SelectContent></Select>
                <Select value={manualDraft.business_line_scope} onValueChange={(value) => setManualDraft({ ...manualDraft, business_line_scope: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="home_health">Home Health</SelectItem><SelectItem value="hospice">Hospice</SelectItem></SelectContent></Select>
                <Input type="number" value={manualDraft.passing_score} onChange={(e) => setManualDraft({ ...manualDraft, passing_score: Number(e.target.value) })} />
              </div>
              <Button variant="outline" className="w-full" onClick={createManualDraft}>Create draft</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates" className="space-y-6">
          <TemplateLibraryPanel onUseTemplate={useTemplate} />
          {templates.length > 0 && (
            <Card>
              <CardHeader><CardTitle>Saved prompt templates</CardTitle></CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {templates.map((template) => (
                  <div key={template.id} className="rounded-2xl border p-4 bg-white shadow-sm">
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <h3 className="font-semibold text-slate-900">{template.name}</h3>
                      <Badge variant="outline">{template.training_category}</Badge>
                    </div>
                    <p className="text-sm text-slate-500 mb-3">{template.description}</p>
                    <Button variant="outline" className="w-full" onClick={() => setGenerator(template.prompt_json)}>Load saved template</Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="library" className="space-y-4">
          {inServices.map((course) => (
            <Card key={course.id}>
              <CardContent className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold text-slate-900">{course.title}</h2>
                    <Badge variant="outline">{course.category}</Badge>
                    <Badge variant="outline">{course.business_line_scope}</Badge>
                    <Badge className={course.status === 'published' ? 'bg-green-100 text-green-800' : course.status === 'archived' ? 'bg-slate-100 text-slate-800' : 'bg-amber-100 text-amber-800'}>{course.status}</Badge>
                    {course.ai_generated && <Badge className="bg-purple-100 text-purple-800">AI generated</Badge>}
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{course.short_description || course.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => updateCourseStatus(course, 'published')}><CheckCircle2 className="w-4 h-4 mr-2" />Publish</Button>
                  <Button variant="outline" onClick={() => duplicateCourse(course.id)}><Copy className="w-4 h-4 mr-2" />Duplicate</Button>
                  <Button variant="outline" onClick={() => updateCourseStatus(course, 'archived')}><Archive className="w-4 h-4 mr-2" />Archive</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {inServices.length === 0 && <Card><CardContent className="p-10 text-center text-slate-500">No in-services created yet.</CardContent></Card>}
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
            <Card>
              <CardHeader><CardTitle>Course & due date</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedCourseId} onValueChange={setSelectedCourseId}><SelectTrigger><SelectValue placeholder="Select in-service" /></SelectTrigger><SelectContent>{inServices.map((course) => <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>)}</SelectContent></Select>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </CardContent>
            </Card>
            <RetakeSettingsPanel settings={assignmentSettings} onChange={setAssignmentSettings} />
          </div>
          <AssignmentWizard users={users} onAssign={setPendingAssignmentPayload} />
          {pendingAssignmentPayload && (
            <Card>
              <CardContent className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <div>
                  <h3 className="font-semibold text-slate-900">Assignment ready</h3>
                  <p className="text-sm text-slate-500">Course will be assigned using the current wizard selection and retake settings.</p>
                </div>
                <Button disabled={!selectedCourseId || !dueDate} onClick={confirmAssignment}><Send className="w-4 h-4 mr-2" />Create assignments</Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <AdminComplianceStats stats={reportStats} />
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-indigo-600" />Assignment compliance snapshot</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {assignments.slice(0, 25).map((assignment) => (
                <div key={assignment.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded-xl border p-3">
                  <div>
                    <p className="font-medium text-slate-900">{assignment.course_title}</p>
                    <p className="text-sm text-slate-500">{assignment.assigned_to_user_id} • Due {formatDate(assignment.due_date)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{assignment.status}</Badge>
                    <Badge className={assignment.pass_fail_result === 'passed' ? 'bg-green-100 text-green-800' : assignment.pass_fail_result === 'failed' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}>{assignment.pass_fail_result || 'pending'}</Badge>
                    <Badge variant="outline">{assignment.score_percentage ?? '—'}%</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-4">
          {planEnrollments.map((enrollment) => {
            const overdue = enrollment.status === 'overdue' || (enrollment.due_date && new Date(enrollment.due_date) < now && enrollment.status !== 'completed');
            return (
              <Card key={enrollment.id}>
                <CardContent className="p-5 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-slate-900">{enrollment.plan_name}</h3>
                      <p className="text-sm text-slate-500">{enrollment.user_name} • Due {formatDate(enrollment.due_date)}</p>
                    </div>
                    <Badge className={overdue ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}>{overdue ? 'overdue' : enrollment.status}</Badge>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden"><div className="bg-indigo-600 h-full rounded-full" style={{ width: `${enrollment.progress_percentage || 0}%` }} /></div>
                  <p className="text-sm text-slate-500">{enrollment.courses_completed}/{enrollment.courses_total} completed • {enrollment.progress_percentage || 0}% progress</p>
                </CardContent>
              </Card>
            );
          })}
          {planEnrollments.length === 0 && <Card><CardContent className="p-10 text-center text-slate-500">No learning plan progress records yet.</CardContent></Card>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
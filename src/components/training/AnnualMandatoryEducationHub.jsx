import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, CheckCircle2, Copy, Send, Sparkles } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { generateTrainingCourse } from "@/functions/generateTrainingCourse";
import { assignInService } from "@/functions/assignInService";
import { assignAnnualLearningPlan } from "@/functions/assignAnnualLearningPlan";
import { duplicateInService } from "@/functions/duplicateInService";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AnnualMandatoryStats from "@/components/training/AnnualMandatoryStats";
import RetakeSettingsPanel from "@/components/training/RetakeSettingsPanel";
import AssignmentWizard from "@/components/training/AssignmentWizard";
import AnnualEducationTemplateLibrary from "@/components/training/AnnualEducationTemplateLibrary";
import AnnualLearningPlanPanel from "@/components/training/AnnualLearningPlanPanel";
import TrainingAttachmentManager from "@/components/training/TrainingAttachmentManager";

const formatDate = (value) => value ? new Date(value).toLocaleDateString() : "—";

export default function AnnualMandatoryEducationHub() {
  const queryClient = useQueryClient();
  const year = new Date().getFullYear();
  const [selectedCourseId, setSelectedCourseId] = useState("");
  const [selectedPlanId, setSelectedPlanId] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [pendingAssignmentPayload, setPendingAssignmentPayload] = useState(null);
  const [pendingPlanAssignmentPayload, setPendingPlanAssignmentPayload] = useState(null);
  const [generator, setGenerator] = useState({
    topic: "",
    training_category: "compliance",
    business_line: "all",
    audience_roles: ["all employees"],
    purpose_of_training: "Annual mandatory education",
    reading_level: "plain professional",
    lesson_length: 30,
    question_count: 10,
    question_types: ["mcq", "true_false"],
    include_case_scenarios: true,
    include_key_takeaways: true,
    include_policy_section: true,
    include_references: true,
    include_acknowledgement: true,
    custom_instructions: "Keep it practical for frontline healthcare staff."
  });
  const [manualDraft, setManualDraft] = useState({ title: "", description: "", category: "compliance", business_line_scope: "all", passing_score: 80 });
  const [retakeSettings, setRetakeSettings] = useState({
    passingScoreRequired: 80,
    maxAttempts: 3,
    waitingPeriodHours: 24,
    regenerateTestOnRetake: true,
    showCorrectAnswers: false,
    attestationRequired: true,
    required: true,
    priority: 'high',
    remediationMessage: 'Please review the annual education content and complete a retake.'
  });

  const { data: currentUser } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });
  const isAdminUser = currentUser?.role === 'admin' || currentUser?.account_type === 'agency_admin' || currentUser?.account_type === 'super_admin';
  const { data: users = [] } = useQuery({ queryKey: ["annual-users"], queryFn: () => base44.entities.User.list('-created_date', 500), initialData: [] });
  const { data: courses = [] } = useQuery({ queryKey: ["annual-courses"], queryFn: () => base44.entities.TrainingCourse.list('-updated_date', 500), initialData: [] });
  const { data: assignments = [] } = useQuery({ queryKey: ["annual-assignments"], queryFn: () => base44.entities.TrainingAssignment.list('-created_date', 1000), initialData: [] });
  const { data: certificates = [] } = useQuery({ queryKey: ["annual-certificates"], queryFn: () => base44.entities.TrainingCertificate.list('-issued_at', 500), initialData: [] });
  const { data: plans = [] } = useQuery({ queryKey: ["annual-plans"], queryFn: () => base44.entities.LearningPlan.list('-created_date', 200), initialData: [] });

  const annualCourses = useMemo(() => courses.filter((course) => course.training_type === 'annual_mandatory' || course.annual_cycle_year === year), [courses, year]);
  const annualAssignments = useMemo(() => assignments.filter((assignment) => assignment.annual_cycle_year === year), [assignments, year]);
  const annualCertificates = useMemo(() => certificates.filter((certificate) => certificate.annual_cycle_year === year), [certificates, year]);
  const dueSoon = annualAssignments.filter((assignment) => {
    if (!assignment.due_date || assignment.status === 'completed' || assignment.status === 'overdue') return false;
    const daysUntilDue = (new Date(assignment.due_date) - new Date()) / (1000 * 60 * 60 * 24);
    return daysUntilDue >= 0 && daysUntilDue <= 7;
  }).length;
  const averageScore = Math.round((annualAssignments.filter((assignment) => typeof assignment.score_percentage === 'number').reduce((sum, assignment) => sum + assignment.score_percentage, 0) / Math.max(annualAssignments.filter((assignment) => typeof assignment.score_percentage === 'number').length, 1)) || 0);
  const stats = {
    totalAssigned: annualAssignments.length,
    dueSoon,
    overdue: annualAssignments.filter((assignment) => assignment.status === 'overdue').length,
    completed: annualAssignments.filter((assignment) => assignment.status === 'completed').length,
    passed: annualAssignments.filter((assignment) => assignment.pass_fail_result === 'passed').length,
    failed: annualAssignments.filter((assignment) => assignment.pass_fail_result === 'failed').length,
    averageScore,
  };

  const useTemplate = (template) => {
    setGenerator((prev) => ({
      ...prev,
      topic: template.topic,
      training_category: template.training_category,
      business_line: template.business_line,
      audience_roles: template.audience_roles,
    }));
  };

  const createManualDraft = async () => {
    const created = await base44.entities.TrainingCourse.create({
      ...manualDraft,
      training_type: 'annual_mandatory',
      annual_cycle_year: year,
      status: 'draft',
      employee_audience: 'annual mandatory education audience',
      learning_objectives: [],
      ai_generated: false,
      requires_attestation: true,
      enable_certificate: true,
      recurrence_rule: 'annual',
      short_description: manualDraft.description,
      test_settings_json: { show_correct_answers_after_completion: false }
    });
    await base44.entities.TrainingAuditLog.create({
      actor_id: currentUser?.email,
      actor_name: currentUser?.full_name,
      action: 'course_created',
      entity_type: 'TrainingCourse',
      entity_id: created.id,
      after_json: { title: created.title, training_type: 'annual_mandatory', annual_cycle_year: year, status: 'draft' },
      reason: 'created',
      severity: 'info'
    });
    queryClient.invalidateQueries({ queryKey: ["annual-courses"] });
    setManualDraft({ title: "", description: "", category: "compliance", business_line_scope: "all", passing_score: 80 });
  };

  const generateAnnualModule = async () => {
    await generateTrainingCourse({ ...generator, training_type: 'annual_mandatory', annual_cycle_year: year, status: 'draft' });
    queryClient.invalidateQueries({ queryKey: ["annual-courses"] });
  };

  const confirmModuleAssignment = async () => {
    await assignInService({ courseId: selectedCourseId, dueDate, settings: retakeSettings, userEmails: pendingAssignmentPayload?.userEmails || [], filters: pendingAssignmentPayload?.filters || {}, annualCycleYear: year });
    setPendingAssignmentPayload(null);
    queryClient.invalidateQueries({ queryKey: ["annual-assignments"] });
  };

  const confirmPlanAssignment = async () => {
    await assignAnnualLearningPlan({ planId: selectedPlanId, dueDate, settings: retakeSettings, userEmails: pendingPlanAssignmentPayload?.userEmails || [], filters: pendingPlanAssignmentPayload?.filters || {} });
    setPendingPlanAssignmentPayload(null);
    queryClient.invalidateQueries({ queryKey: ["annual-assignments"] });
  };

  const updateCourseStatus = async (course, status) => {
    await base44.entities.TrainingCourse.update(course.id, { status, archived_status: status === 'archived', published_by: status === 'published' ? currentUser?.email : course.published_by, published_date: status === 'published' ? new Date().toISOString() : course.published_date });
    await base44.entities.TrainingAuditLog.create({
      actor_id: currentUser?.email,
      actor_name: currentUser?.full_name,
      action: status === 'published' ? 'course_published' : 'course_archived',
      entity_type: 'TrainingCourse',
      entity_id: course.id,
      after_json: { status, annual_cycle_year: course.annual_cycle_year || year },
      reason: status === 'published' ? 'published' : 'archived',
      severity: 'info'
    });
    queryClient.invalidateQueries({ queryKey: ["annual-courses"] });
  };

  const duplicateCourse = async (courseId) => {
    await duplicateInService({ courseId });
    queryClient.invalidateQueries({ queryKey: ["annual-courses"] });
  };

  if (currentUser && !isAdminUser) {
    return <div className="max-w-3xl mx-auto p-6 text-slate-600">This Penn annual education builder is available to Agency Admin and Super Admin users only.</div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-800 to-blue-700 text-white p-6 shadow-xl">
        <h1 className="text-3xl font-bold mb-2">Penn Annual Education & Competencies</h1>
        <p className="text-indigo-100">Build yearly required education bundles for Penn Hospice, Penn Home Health, office staff, and leadership while tracking competency, certificates, and renewal compliance.</p>
      </div>

      <AnnualMandatoryStats stats={{ ...stats, annualCompliancePercentage: stats.totalAssigned ? Math.round((stats.passed / stats.totalAssigned) * 100) : 0 }} />

      <Tabs defaultValue="builder" className="space-y-6">
        <TabsList>
          <TabsTrigger value="builder">Annual Education Builder</TabsTrigger>
          <TabsTrigger value="templates">Topic Library</TabsTrigger>
          <TabsTrigger value="library">Annual Education Library</TabsTrigger>
          <TabsTrigger value="assignments">Annual Assignments</TabsTrigger>
          <TabsTrigger value="plans">Annual Learning Plans</TabsTrigger>
          <TabsTrigger value="reports">Compliance Dashboard</TabsTrigger>
        </TabsList>

        <TabsContent value="builder" className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-purple-600" />AI Annual Education Generator</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Topic" value={generator.topic} onChange={(e) => setGenerator({ ...generator, topic: e.target.value })} />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Select value={generator.training_category} onValueChange={(value) => setGenerator({ ...generator, training_category: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="compliance">Compliance</SelectItem><SelectItem value="clinical">Clinical</SelectItem><SelectItem value="safety">Safety</SelectItem><SelectItem value="documentation">Documentation</SelectItem><SelectItem value="hospice">Hospice</SelectItem><SelectItem value="home_health">Home Health</SelectItem></SelectContent></Select>
                <Select value={generator.business_line} onValueChange={(value) => setGenerator({ ...generator, business_line: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="home_health">Home Health</SelectItem><SelectItem value="hospice">Hospice</SelectItem></SelectContent></Select>
              </div>
              <Textarea placeholder="Training purpose" value={generator.purpose_of_training} onChange={(e) => setGenerator({ ...generator, purpose_of_training: e.target.value })} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Input type="number" placeholder="Lesson length" value={generator.lesson_length} onChange={(e) => setGenerator({ ...generator, lesson_length: Number(e.target.value) })} />
                <Input type="number" placeholder="Question count" value={generator.question_count} onChange={(e) => setGenerator({ ...generator, question_count: Number(e.target.value) })} />
                <Input placeholder="Audience" value={generator.audience_roles.join(', ')} onChange={(e) => setGenerator({ ...generator, audience_roles: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} />
              </div>
              <Textarea placeholder="Optional custom instructions" value={generator.custom_instructions} onChange={(e) => setGenerator({ ...generator, custom_instructions: e.target.value })} />
              <Button className="w-full" onClick={generateAnnualModule}>Generate annual education module</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Manual annual draft</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Input placeholder="Annual education title" value={manualDraft.title} onChange={(e) => setManualDraft({ ...manualDraft, title: e.target.value })} />
              <Textarea placeholder="Description" value={manualDraft.description} onChange={(e) => setManualDraft({ ...manualDraft, description: e.target.value })} />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Select value={manualDraft.category} onValueChange={(value) => setManualDraft({ ...manualDraft, category: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="compliance">Compliance</SelectItem><SelectItem value="clinical">Clinical</SelectItem><SelectItem value="safety">Safety</SelectItem><SelectItem value="documentation">Documentation</SelectItem></SelectContent></Select>
                <Select value={manualDraft.business_line_scope} onValueChange={(value) => setManualDraft({ ...manualDraft, business_line_scope: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="home_health">Home Health</SelectItem><SelectItem value="hospice">Hospice</SelectItem></SelectContent></Select>
                <Input type="number" value={manualDraft.passing_score} onChange={(e) => setManualDraft({ ...manualDraft, passing_score: Number(e.target.value) })} />
              </div>
              <Button variant="outline" className="w-full" onClick={createManualDraft}>Create manual annual draft</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="templates"><AnnualEducationTemplateLibrary onUseTemplate={useTemplate} /></TabsContent>

        <TabsContent value="library" className="space-y-4">
          <div className="rounded-xl border bg-blue-50 p-4 text-sm text-blue-900">Select a module in the assignment target area below, then use the attachment manager here to add external policy PDFs, regulatory documents, or images to the course or a specific lesson.</div>
          {annualCourses.map((course) => (
            <Card key={course.id}>
              <CardContent className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold text-slate-900">{course.title}</h2>
                    <Badge variant="outline">{course.business_line_scope}</Badge>
                    <Badge variant="outline">Cycle {course.annual_cycle_year || year}</Badge>
                    <Badge className={course.status === 'published' ? 'bg-green-100 text-green-800' : course.status === 'archived' ? 'bg-slate-100 text-slate-800' : 'bg-amber-100 text-amber-800'}>{course.status}</Badge>
                  </div>
                  <p className="text-sm text-slate-500 mt-1">{course.short_description || course.description}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => updateCourseStatus(course, 'published')}><CheckCircle2 className="w-4 h-4 mr-2" />Publish</Button>
                  <Button variant="outline" onClick={() => duplicateCourse(course.id)}><Copy className="w-4 h-4 mr-2" />Duplicate Prior Year</Button>
                  <Button variant="outline" onClick={() => updateCourseStatus(course, 'archived')}><Archive className="w-4 h-4 mr-2" />Archive</Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {selectedCourseId && annualCourses.find((course) => course.id === selectedCourseId) && (
            <TrainingAttachmentManager course={annualCourses.find((course) => course.id === selectedCourseId)} />
          )}
        </TabsContent>

        <TabsContent value="assignments" className="space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
            <Card>
              <CardHeader><CardTitle>Assignment target</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedCourseId} onValueChange={setSelectedCourseId}><SelectTrigger><SelectValue placeholder="Select annual module" /></SelectTrigger><SelectContent>{annualCourses.map((course) => <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>)}</SelectContent></Select>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </CardContent>
            </Card>
            <RetakeSettingsPanel settings={retakeSettings} onChange={setRetakeSettings} />
          </div>
          <AssignmentWizard users={users} onAssign={setPendingAssignmentPayload} />
          {pendingAssignmentPayload && <Card><CardContent className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"><div><h3 className="font-semibold text-slate-900">Annual module assignment ready</h3><p className="text-sm text-slate-500">This will assign the selected annual education module for the {year} cycle.</p></div><Button disabled={!selectedCourseId || !dueDate} onClick={confirmModuleAssignment}><Send className="w-4 h-4 mr-2" />Create annual assignments</Button></CardContent></Card>}
        </TabsContent>

        <TabsContent value="plans" className="space-y-6">
          <AnnualLearningPlanPanel plans={plans} courses={annualCourses} year={year} onRefresh={() => queryClient.invalidateQueries({ queryKey: ['annual-plans'] })} />
          <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
            <Card>
              <CardHeader><CardTitle>Assign annual plan</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <Select value={selectedPlanId} onValueChange={setSelectedPlanId}><SelectTrigger><SelectValue placeholder="Select annual plan" /></SelectTrigger><SelectContent>{plans.filter((plan) => plan.plan_type === 'annual').map((plan) => <SelectItem key={plan.id} value={plan.id}>{plan.name}</SelectItem>)}</SelectContent></Select>
                <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              </CardContent>
            </Card>
            <AssignmentWizard users={users} onAssign={setPendingPlanAssignmentPayload} />
          </div>
          {pendingPlanAssignmentPayload && <Card><CardContent className="p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4"><div><h3 className="font-semibold text-slate-900">Annual learning plan assignment ready</h3><p className="text-sm text-slate-500">This will enroll matching employees into the selected annual plan and assign all required modules.</p></div><Button disabled={!selectedPlanId || !dueDate} onClick={confirmPlanAssignment}><Send className="w-4 h-4 mr-2" />Assign annual plan</Button></CardContent></Card>}
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <AnnualMandatoryStats stats={{ ...stats, annualCompliancePercentage: stats.totalAssigned ? Math.round((stats.passed / stats.totalAssigned) * 100) : 0 }} />
          <Card>
            <CardHeader><CardTitle>Annual compliance snapshot</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {annualAssignments.slice(0, 25).map((assignment) => (
                <div key={assignment.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded-xl border p-3">
                  <div>
                    <p className="font-medium text-slate-900">{assignment.course_title}</p>
                    <p className="text-sm text-slate-500">{assignment.assigned_to_user_id} • Due {formatDate(assignment.due_date)}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{assignment.status}</Badge>
                    <Badge variant="outline">{assignment.score_percentage ?? '—'}%</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
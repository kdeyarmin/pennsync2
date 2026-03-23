import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Archive, BarChart3, CheckCircle2, Copy, PlusCircle, Send, Sparkles, Loader2, AlertCircle } from "lucide-react";
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
import TrainingAttachmentManager from "@/components/training/TrainingAttachmentManager";

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
    question_types: ["mcq", "true_false", "scenario_based"],
    include_case_scenarios: true,
    include_key_takeaways: true,
    include_policy_section: true,
    include_references: true,
    include_acknowledgement: true,
    custom_instructions: "",
    skill_level: "intermediate",
    num_modules: 0,
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
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState("");
  const [generateSuccess, setGenerateSuccess] = useState(null);

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
    setGenerating(true);
    setGenerateError("");
    setGenerateSuccess(null);
    try {
      const result = await generateTrainingCourse(generator);
      queryClient.invalidateQueries({ queryKey: ["in-service-courses"] });
      setGenerateSuccess(result?.data || result);
    } catch (err) {
      setGenerateError(err?.message || "AI generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
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
    <div className="p-3 sm:p-4 md:p-6 lg:p-8 max-w-7xl mx-auto space-y-4 sm:space-y-6">
      <div className="rounded-2xl sm:rounded-3xl bg-gradient-to-r from-indigo-700 to-purple-700 text-white p-4 sm:p-6 shadow-xl">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">AI Compliance In-Services</h1>
        <p className="text-sm sm:text-base text-indigo-100">AI-powered in-services, competency testing, certificates, learning plan tracking, and compliance reporting inside your current learning center.</p>
      </div>

      <AdminComplianceStats stats={reportStats} />

      <Tabs defaultValue="builder" className="space-y-4 sm:space-y-6">
        <div className="overflow-x-auto -mx-3 sm:mx-0 px-3 sm:px-0">
          <TabsList className="inline-flex w-max min-w-full gap-1 h-auto p-1">
            <TabsTrigger value="builder" className="min-h-[44px] px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap">AI Builder</TabsTrigger>
            <TabsTrigger value="templates" className="min-h-[44px] px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap">Templates</TabsTrigger>
            <TabsTrigger value="library" className="min-h-[44px] px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap">Library</TabsTrigger>
            <TabsTrigger value="assignments" className="min-h-[44px] px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap">Assign</TabsTrigger>
            <TabsTrigger value="reports" className="min-h-[44px] px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap">Reports</TabsTrigger>
            <TabsTrigger value="plans" className="min-h-[44px] px-3 sm:px-4 text-xs sm:text-sm whitespace-nowrap">Plans</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="builder" className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          <Card className="shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-purple-50 to-indigo-50"><CardTitle className="flex items-center gap-2 text-lg sm:text-xl"><Sparkles className="w-5 h-5 text-purple-600" />AI In-Service Generator</CardTitle></CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div>
                <label className="text-sm font-semibold mb-2 block text-gray-700">Topic *</label>
                <Input placeholder="e.g., HIPAA Privacy Updates 2026" value={generator.topic} onChange={(e) => setGenerator({ ...generator, topic: e.target.value })} className="h-11" />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-semibold mb-2 block text-gray-700">Category</label>
                  <Select value={generator.training_category} onValueChange={(value) => setGenerator({ ...generator, training_category: value })}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="compliance">Compliance</SelectItem><SelectItem value="clinical">Clinical</SelectItem><SelectItem value="safety">Safety</SelectItem><SelectItem value="documentation">Documentation</SelectItem><SelectItem value="hospice">Hospice</SelectItem><SelectItem value="home_health">Home Health</SelectItem></SelectContent></Select>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block text-gray-700">Business Line</label>
                  <Select value={generator.business_line} onValueChange={(value) => setGenerator({ ...generator, business_line: value })}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="home_health">Home Health</SelectItem><SelectItem value="hospice">Hospice</SelectItem></SelectContent></Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block text-gray-700">Purpose of Training</label>
                <Textarea placeholder="What is the goal of this training?" value={generator.purpose_of_training} onChange={(e) => setGenerator({ ...generator, purpose_of_training: e.target.value })} rows={3} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="text-sm font-semibold mb-2 block text-gray-700">Duration (min)</label>
                  <Input type="number" min="10" max="120" placeholder="30" value={generator.lesson_length} onChange={(e) => setGenerator({ ...generator, lesson_length: Number(e.target.value) })} className="h-11" />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block text-gray-700">Questions</label>
                  <Input type="number" min="5" max="30" placeholder="10" value={generator.question_count} onChange={(e) => setGenerator({ ...generator, question_count: Number(e.target.value) })} className="h-11" />
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block text-gray-700">Audience</label>
                  <Input placeholder="RN, LPN, office" value={generator.audience_roles.join(', ')} onChange={(e) => setGenerator({ ...generator, audience_roles: e.target.value.split(',').map((item) => item.trim()).filter(Boolean) })} className="h-11" />
                </div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="text-sm font-semibold mb-2 block text-gray-700">Skill Level</label>
                  <Select value={generator.skill_level} onValueChange={(value) => setGenerator({ ...generator, skill_level: value })}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="beginner">Beginner — New to topic</SelectItem><SelectItem value="intermediate">Intermediate — Some familiarity</SelectItem><SelectItem value="advanced">Advanced — Experienced staff</SelectItem></SelectContent></Select>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block text-gray-700">Modules</label>
                  <Select value={String(generator.num_modules)} onValueChange={(value) => setGenerator({ ...generator, num_modules: Number(value) })}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="0">Auto (based on duration)</SelectItem><SelectItem value="1">1 Module</SelectItem><SelectItem value="2">2 Modules</SelectItem><SelectItem value="3">3 Modules</SelectItem><SelectItem value="4">4 Modules</SelectItem></SelectContent></Select>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block text-gray-700">Reading Level</label>
                  <Select value={generator.reading_level} onValueChange={(value) => setGenerator({ ...generator, reading_level: value })}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="plain professional">Plain Professional (8th-10th grade)</SelectItem><SelectItem value="simple">Simple (6th-8th grade)</SelectItem><SelectItem value="clinical professional">Clinical Professional</SelectItem></SelectContent></Select>
                </div>
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block text-gray-700">Custom Instructions (Optional)</label>
                <Textarea placeholder="Any specific requirements or focus areas..." value={generator.custom_instructions} onChange={(e) => setGenerator({ ...generator, custom_instructions: e.target.value })} rows={3} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Question Types</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-sm">
                  {[
                    ['mcq', 'Multiple Choice'],
                    ['true_false', 'True / False'],
                    ['scenario_based', 'Scenario-Based'],
                    ['multi_select', 'Select All That Apply'],
                    ['short_answer', 'Short Answer'],
                    ['matching', 'Matching'],
                  ].map(([type, label]) => (
                    <label key={type} className="flex items-center gap-2 rounded-xl border p-2.5 hover:bg-gray-50 cursor-pointer">
                      <Checkbox
                        checked={generator.question_types.includes(type)}
                        onCheckedChange={(checked) => {
                          const types = checked
                            ? [...generator.question_types, type]
                            : generator.question_types.filter(t => t !== type);
                          setGenerator({ ...generator, question_types: types.length > 0 ? types : ['mcq'] });
                        }}
                        className="w-4 h-4"
                      />
                      <span className="text-xs font-medium">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-semibold text-gray-700">Content Options</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3 text-sm">
                  {[
                    ['include_case_scenarios', 'Case scenarios with discussion questions'],
                    ['include_key_takeaways', 'Key takeaways & action items'],
                    ['include_policy_section', 'Policy & regulatory references'],
                    ['include_references', 'Source references & citations'],
                    ['include_acknowledgement', 'Attestation & acknowledgement'],
                  ].map(([key, label]) => (
                    <label key={key} className="flex items-center gap-2 rounded-xl border p-3 hover:bg-gray-50 cursor-pointer min-h-[48px]">
                      <Checkbox checked={generator[key]} onCheckedChange={(checked) => setGenerator({ ...generator, [key]: !!checked })} className="w-5 h-5" />
                      <span className="font-medium">{label}</span>
                    </label>
                  ))}
                </div>
              </div>
              {generateError && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-800 text-sm">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  {generateError}
                </div>
              )}
              <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-2">
                <Button
                  className="flex-1 bg-purple-600 hover:bg-purple-700 min-h-[48px] text-base font-semibold"
                  onClick={runAIGeneration}
                  disabled={generating || !generator.topic.trim()}
                >
                  {generating ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Generating Course...</>
                  ) : (
                    <><Sparkles className="w-4 h-4 mr-2" /> Generate AI In-Service</>
                  )}
                </Button>
                <Button variant="outline" onClick={savePromptAsTemplate} disabled={generating} className="min-h-[48px] sm:min-w-[180px]">Save as Template</Button>
              </div>
              {generateSuccess && (
                <div className="rounded-xl border-2 border-emerald-300 bg-emerald-50 p-4 space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                    <p className="font-semibold text-emerald-900">Course Generated Successfully</p>
                  </div>
                  <p className="text-sm text-emerald-700">
                    &ldquo;{generateSuccess.title || 'New course'}&rdquo; has been created as a draft. Review it in the Library tab, then publish when ready.
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div className="bg-white rounded-lg p-2 text-center border border-emerald-200">
                      <p className="font-bold text-emerald-800">Pre-Assessment</p>
                      <p className="text-emerald-600">Test-out enabled</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 text-center border border-emerald-200">
                      <p className="font-bold text-emerald-800">BrainSparks</p>
                      <p className="text-emerald-600">6 retention Qs</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 text-center border border-emerald-200">
                      <p className="font-bold text-emerald-800">Competencies</p>
                      <p className="text-emerald-600">Skills mapped</p>
                    </div>
                    <div className="bg-white rounded-lg p-2 text-center border border-emerald-200">
                      <p className="font-bold text-emerald-800">Regulatory</p>
                      <p className="text-emerald-600">Crosswalk included</p>
                    </div>
                  </div>
                  <p className="text-xs text-emerald-600">Relias-style two-pass AI generation with pre-assessment, spaced retention, competency mapping, and regulatory crosswalk.</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-lg">
            <CardHeader className="border-b bg-gradient-to-r from-indigo-50 to-blue-50"><CardTitle className="flex items-center gap-2 text-lg sm:text-xl"><PlusCircle className="w-5 h-5 text-indigo-600" />Manual In-Service Draft</CardTitle></CardHeader>
            <CardContent className="space-y-4 p-4 sm:p-6">
              <div>
                <label className="text-sm font-semibold mb-2 block text-gray-700">Title *</label>
                <Input placeholder="In-service title" value={manualDraft.title} onChange={(e) => setManualDraft({ ...manualDraft, title: e.target.value })} className="h-11" />
              </div>
              <div>
                <label className="text-sm font-semibold mb-2 block text-gray-700">Description</label>
                <Textarea placeholder="Brief description of the in-service" value={manualDraft.description} onChange={(e) => setManualDraft({ ...manualDraft, description: e.target.value })} rows={3} />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div>
                  <label className="text-sm font-semibold mb-2 block text-gray-700">Category</label>
                  <Select value={manualDraft.category} onValueChange={(value) => setManualDraft({ ...manualDraft, category: value })}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="compliance">Compliance</SelectItem><SelectItem value="clinical">Clinical</SelectItem><SelectItem value="safety">Safety</SelectItem><SelectItem value="documentation">Documentation</SelectItem></SelectContent></Select>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block text-gray-700">Business Line</label>
                  <Select value={manualDraft.business_line_scope} onValueChange={(value) => setManualDraft({ ...manualDraft, business_line_scope: value })}><SelectTrigger className="h-11"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">All</SelectItem><SelectItem value="home_health">Home Health</SelectItem><SelectItem value="hospice">Hospice</SelectItem></SelectContent></Select>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block text-gray-700">Passing %</label>
                  <Input type="number" placeholder="80" value={manualDraft.passing_score} onChange={(e) => setManualDraft({ ...manualDraft, passing_score: Number(e.target.value) })} className="h-11" />
                </div>
              </div>
              <Button variant="outline" className="w-full min-h-[48px] border-2 border-dashed hover:border-indigo-400 hover:bg-indigo-50" onClick={createManualDraft}>
                <PlusCircle className="w-4 h-4 mr-2" />
                Create Draft In-Service
              </Button>
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

        <TabsContent value="library" className="space-y-3 sm:space-y-4">
          {inServices.map((course) => (
            <Card key={course.id} className="shadow-md hover:shadow-lg transition-all">
              <CardContent className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sm:gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-2">
                    <h2 className="font-semibold text-base sm:text-lg text-slate-900">{course.title}</h2>
                    <Badge variant="outline" className="text-xs">{course.category}</Badge>
                    <Badge variant="outline" className="text-xs">{course.business_line_scope}</Badge>
                    <Badge className={`text-xs ${course.status === 'published' ? 'bg-green-100 text-green-800' : course.status === 'archived' ? 'bg-slate-100 text-slate-800' : 'bg-amber-100 text-amber-800'}`}>{course.status}</Badge>
                    {course.ai_generated && <Badge className="bg-purple-100 text-purple-800 text-xs">AI</Badge>}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-500 line-clamp-2">{course.short_description || course.description}</p>
                </div>
                <div className="flex flex-wrap gap-2 lg:flex-nowrap">
                  <Button variant="outline" onClick={() => updateCourseStatus(course, 'published')} className="flex-1 lg:flex-none min-h-[44px]" size="sm">
                    <CheckCircle2 className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Publish</span>
                  </Button>
                  <Button variant="outline" onClick={() => duplicateCourse(course.id)} className="flex-1 lg:flex-none min-h-[44px]" size="sm">
                    <Copy className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Duplicate</span>
                  </Button>
                  <Button variant="outline" onClick={() => updateCourseStatus(course, 'archived')} className="flex-1 lg:flex-none min-h-[44px]" size="sm">
                    <Archive className="w-4 h-4 sm:mr-2" />
                    <span className="hidden sm:inline">Archive</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
          {inServices.length === 0 && <Card><CardContent className="p-8 sm:p-10 text-center text-slate-500">No in-services created yet. Use the AI Builder or create a manual draft.</CardContent></Card>}
          {selectedCourseId && inServices.find((course) => course.id === selectedCourseId) && (
            <TrainingAttachmentManager course={inServices.find((course) => course.id === selectedCourseId)} />
          )}
        </TabsContent>

        <TabsContent value="assignments" className="space-y-4 sm:space-y-6">
          <div className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-4 sm:gap-6">
            <Card className="shadow-lg">
              <CardHeader className="border-b"><CardTitle className="text-base sm:text-lg">Course & Due Date</CardTitle></CardHeader>
              <CardContent className="space-y-4 p-4 sm:p-6">
                <div>
                  <label className="text-sm font-semibold mb-2 block text-gray-700">Select In-Service *</label>
                  <Select value={selectedCourseId} onValueChange={setSelectedCourseId}><SelectTrigger className="h-11"><SelectValue placeholder="Select in-service" /></SelectTrigger><SelectContent>{inServices.filter(c => c.status === 'published').map((course) => <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>)}</SelectContent></Select>
                </div>
                <div>
                  <label className="text-sm font-semibold mb-2 block text-gray-700">Due Date *</label>
                  <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} className="h-11" />
                </div>
              </CardContent>
            </Card>
            <RetakeSettingsPanel settings={assignmentSettings} onChange={setAssignmentSettings} />
          </div>
          <AssignmentWizard users={users} onAssign={setPendingAssignmentPayload} />
          {pendingAssignmentPayload && (
            <Card className="border-2 border-green-200 bg-green-50 shadow-lg">
              <CardContent className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-3 sm:gap-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-green-900 text-base sm:text-lg">Assignment Ready</h3>
                  <p className="text-sm text-green-700">Course will be assigned using the current wizard selection and retake settings.</p>
                </div>
                <Button disabled={!selectedCourseId || !dueDate} onClick={confirmAssignment} className="bg-green-600 hover:bg-green-700 min-h-[48px] w-full md:w-auto">
                  <Send className="w-4 h-4 mr-2" />
                  Create Assignments
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="reports" className="space-y-4 sm:space-y-6">
          <AdminComplianceStats stats={reportStats} />
          <Card className="shadow-lg">
            <CardHeader className="border-b"><CardTitle className="flex items-center gap-2 text-lg sm:text-xl"><BarChart3 className="w-5 h-5 text-indigo-600" />Assignment Compliance Snapshot</CardTitle></CardHeader>
            <CardContent className="space-y-2 sm:space-y-3 p-4 sm:p-6">
              {assignments.slice(0, 25).map((assignment) => (
                <div key={assignment.id} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 rounded-xl border p-3 sm:p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm sm:text-base text-slate-900 truncate">{assignment.course_title}</p>
                    <p className="text-xs sm:text-sm text-slate-500 truncate">{assignment.assigned_to_user_id} • Due {formatDate(assignment.due_date)}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <Badge variant="outline" className="text-xs">{assignment.status}</Badge>
                    <Badge className={`text-xs ${assignment.pass_fail_result === 'passed' ? 'bg-green-100 text-green-800' : assignment.pass_fail_result === 'failed' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{assignment.pass_fail_result || 'pending'}</Badge>
                    <Badge variant="outline" className="text-xs font-semibold">{assignment.score_percentage ?? '—'}%</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans" className="space-y-3 sm:space-y-4">
          {planEnrollments.map((enrollment) => {
            const overdue = enrollment.status === 'overdue' || (enrollment.due_date && new Date(enrollment.due_date) < now && enrollment.status !== 'completed');
            return (
              <Card key={enrollment.id} className="shadow-md">
                <CardContent className="p-4 sm:p-5 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-base sm:text-lg text-slate-900 truncate">{enrollment.plan_name}</h3>
                      <p className="text-xs sm:text-sm text-slate-500">{enrollment.user_name} • Due {formatDate(enrollment.due_date)}</p>
                    </div>
                    <Badge className={`text-xs ${overdue ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}`}>{overdue ? 'overdue' : enrollment.status}</Badge>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div className="bg-indigo-600 h-full rounded-full transition-all duration-500" style={{ width: `${enrollment.progress_percentage || 0}%` }} />
                  </div>
                  <p className="text-xs sm:text-sm text-slate-600 font-medium">{enrollment.courses_completed}/{enrollment.courses_total} completed • {enrollment.progress_percentage || 0}% progress</p>
                </CardContent>
              </Card>
            );
          })}
          {planEnrollments.length === 0 && <Card><CardContent className="p-8 sm:p-10 text-center text-slate-500 text-sm sm:text-base">No learning plan progress records yet.</CardContent></Card>}
        </TabsContent>
      </Tabs>
    </div>
  );
}
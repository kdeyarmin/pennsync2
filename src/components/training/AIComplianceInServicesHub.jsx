import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Sparkles, Send, Copy, Archive, CheckCircle2, BarChart3 } from "lucide-react";
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

export default function AIComplianceInServicesHub() {
  const queryClient = useQueryClient();
  const [selectedUsers, setSelectedUsers] = useState([]);
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
    attestationRequired: true,
    required: true,
    priority: 'high',
    remediationMessage: 'Please review the lesson content and complete a new retake.'
  });

  const { data: currentUser } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });
  const { data: users = [] } = useQuery({ queryKey: ["learning-users"], queryFn: () => base44.entities.User.list('-created_date', 500), initialData: [] });
  const { data: courses = [] } = useQuery({ queryKey: ["in-service-courses"], queryFn: () => base44.entities.TrainingCourse.list('-updated_date', 300), initialData: [] });
  const { data: assignments = [] } = useQuery({ queryKey: ["in-service-assignments"], queryFn: () => base44.entities.TrainingAssignment.list('-created_date', 500), initialData: [] });
  const { data: certificates = [] } = useQuery({ queryKey: ["in-service-certificates"], queryFn: () => base44.entities.TrainingCertificate.list('-issued_at', 500), initialData: [] });

  const inServices = useMemo(() => courses.filter((course) => course.training_type === 'in_service' || course.ai_generated), [courses]);
  const reportStats = {
    total: assignments.length,
    completed: assignments.filter((assignment) => assignment.status === 'completed').length,
    overdue: assignments.filter((assignment) => assignment.status === 'overdue').length,
    failed: assignments.filter((assignment) => assignment.pass_fail_result === 'failed').length,
    certificates: certificates.length,
  };

  const toggleUser = (email) => {
    setSelectedUsers((prev) => prev.includes(email) ? prev.filter((item) => item !== email) : [...prev, email]);
  };

  const runAIGeneration = async () => {
    await generateTrainingCourse(generator);
    queryClient.invalidateQueries({ queryKey: ["in-service-courses"] });
  };

  const createManualDraft = async () => {
    await base44.entities.TrainingCourse.create({
      ...manualDraft,
      training_type: 'in_service',
      status: 'draft',
      employee_audience: 'employee',
      learning_objectives: [],
      ai_generated: false,
      requires_attestation: true,
      enable_certificate: true,
      short_description: manualDraft.description
    });
    setManualDraft({ title: "", description: "", category: "compliance", business_line_scope: "all", passing_score: 80 });
    queryClient.invalidateQueries({ queryKey: ["in-service-courses"] });
  };

  const assignSelected = async () => {
    await assignInService({
      courseId: selectedCourseId,
      dueDate,
      userEmails: selectedUsers,
      settings: assignmentSettings
    });
    setSelectedUsers([]);
    queryClient.invalidateQueries({ queryKey: ["in-service-assignments"] });
  };

  const updateCourseStatus = async (course, status) => {
    await base44.entities.TrainingCourse.update(course.id, {
      status,
      published_by: status === 'published' ? currentUser?.email : course.published_by,
      published_date: status === 'published' ? new Date().toISOString() : course.published_date,
      archived_status: status === 'archived'
    });
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
        <p className="text-indigo-100">Generate AI-powered in-services, assign them to employees, and track compliance inside your existing learning center.</p>
      </div>

      <Tabs defaultValue="builder" className="space-y-6">
        <TabsList>
          <TabsTrigger value="builder">AI Builder</TabsTrigger>
          <TabsTrigger value="library">In-Service Library</TabsTrigger>
          <TabsTrigger value="assignments">Assignments</TabsTrigger>
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
              <Button className="w-full" onClick={runAIGeneration}>Generate AI in-service</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Manual draft</CardTitle></CardHeader>
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

        <TabsContent value="library" className="space-y-4">
          {inServices.map((course) => (
            <Card key={course.id}>
              <CardContent className="p-5 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-semibold text-slate-900">{course.title}</h2>
                    <Badge variant="outline">{course.category}</Badge>
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
        </TabsContent>

        <TabsContent value="assignments" className="grid grid-cols-1 xl:grid-cols-[360px_minmax(0,1fr)] gap-6">
          <Card>
            <CardHeader><CardTitle>Assignment settings</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}><SelectTrigger><SelectValue placeholder="Select in-service" /></SelectTrigger><SelectContent>{inServices.map((course) => <SelectItem key={course.id} value={course.id}>{course.title}</SelectItem>)}</SelectContent></Select>
              <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
              <div className="grid grid-cols-2 gap-3">
                <Input type="number" placeholder="Passing score" value={assignmentSettings.passingScoreRequired} onChange={(e) => setAssignmentSettings({ ...assignmentSettings, passingScoreRequired: Number(e.target.value) })} />
                <Input type="number" placeholder="Max attempts" value={assignmentSettings.maxAttempts} onChange={(e) => setAssignmentSettings({ ...assignmentSettings, maxAttempts: Number(e.target.value) })} />
                <Input type="number" placeholder="Retake wait (hrs)" value={assignmentSettings.waitingPeriodHours} onChange={(e) => setAssignmentSettings({ ...assignmentSettings, waitingPeriodHours: Number(e.target.value) })} />
                <Select value={assignmentSettings.priority} onValueChange={(value) => setAssignmentSettings({ ...assignmentSettings, priority: value })}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="critical">Critical</SelectItem></SelectContent></Select>
              </div>
              <Textarea placeholder="Remediation message" value={assignmentSettings.remediationMessage} onChange={(e) => setAssignmentSettings({ ...assignmentSettings, remediationMessage: e.target.value })} />
              <div className="space-y-2 text-sm">
                {[
                  ['required', 'Required assignment'],
                  ['attestationRequired', 'Require acknowledgement'],
                  ['regenerateTestOnRetake', 'New randomized retake version'],
                ].map(([key, label]) => (
                  <label key={key} className="flex items-center gap-2"><Checkbox checked={assignmentSettings[key]} onCheckedChange={(checked) => setAssignmentSettings({ ...assignmentSettings, [key]: !!checked })} /><span>{label}</span></label>
                ))}
              </div>
              <Button className="w-full" disabled={!selectedCourseId || !dueDate || selectedUsers.length === 0} onClick={assignSelected}><Send className="w-4 h-4 mr-2" />Assign selected employees</Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Select employees</CardTitle></CardHeader>
            <CardContent className="space-y-3 max-h-[700px] overflow-y-auto">
              {users.filter((candidate) => candidate.role !== 'admin').map((candidate) => (
                <label key={candidate.email} className="flex items-start gap-3 rounded-xl border p-3">
                  <Checkbox checked={selectedUsers.includes(candidate.email)} onCheckedChange={() => toggleUser(candidate.email)} />
                  <div>
                    <p className="font-medium text-slate-900">{candidate.full_name || candidate.email}</p>
                    <p className="text-sm text-slate-500">{candidate.department || 'No department'} • {candidate.job_title || candidate.credential_type || 'Employee'}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {candidate.business_line && <Badge variant="outline">{candidate.business_line}</Badge>}
                      {candidate.location && <Badge variant="outline">{candidate.location}</Badge>}
                    </div>
                  </div>
                </label>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
            {[['Total Assigned', reportStats.total], ['Completed', reportStats.completed], ['Overdue', reportStats.overdue], ['Failed', reportStats.failed], ['Certificates', reportStats.certificates]].map(([label, value]) => (
              <Card key={label}><CardContent className="p-5"><p className="text-sm text-slate-500">{label}</p><p className="text-3xl font-bold text-slate-900">{value}</p></CardContent></Card>
            ))}
          </div>
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><BarChart3 className="w-5 h-5 text-indigo-600" />Assignment compliance snapshot</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              {assignments.slice(0, 20).map((assignment) => (
                <div key={assignment.id} className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 rounded-xl border p-3">
                  <div>
                    <p className="font-medium text-slate-900">{assignment.course_title}</p>
                    <p className="text-sm text-slate-500">{assignment.assigned_to_user_id}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{assignment.status}</Badge>
                    <Badge className={assignment.pass_fail_result === 'passed' ? 'bg-green-100 text-green-800' : assignment.pass_fail_result === 'failed' ? 'bg-red-100 text-red-800' : 'bg-blue-100 text-blue-800'}>{assignment.pass_fail_result || 'pending'}</Badge>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plans">
          <Card>
            <CardHeader><CardTitle>Learning Plans</CardTitle></CardHeader>
            <CardContent>
              <p className="text-sm text-slate-500">Use the existing Learning Plans tab in Training Management to bundle in-services into annual or role-based education plans.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
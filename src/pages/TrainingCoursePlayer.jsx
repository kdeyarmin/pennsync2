import React, { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, ChevronRight, RotateCcw } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { createPageUrl } from "@/utils";
import { gradeTrainingAttempt } from "@/functions/gradeTrainingAttempt";
import { startTrainingAssignment } from "@/functions/startTrainingAssignment";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import TrainingModuleViewer from "@/components/training/TrainingModuleViewer";
import TrainingQuestionRenderer from "@/components/training/TrainingQuestionRenderer";

const shuffle = (items) => [...items].sort(() => Math.random() - 0.5);

export default function TrainingCoursePlayer() {
  const params = new URLSearchParams(window.location.search);
  const assignmentId = params.get('assignment');
  const [step, setStep] = useState('objectives');
  const [completedModules, setCompletedModules] = useState([]);
  const [answers, setAnswers] = useState({});
  const [attestationAccepted, setAttestationAccepted] = useState(false);
  const [signedName, setSignedName] = useState('');
  const [result, setResult] = useState(null);
  const [proofFiles, setProofFiles] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const startedAt = useMemo(() => new Date().toISOString(), []);

  useEffect(() => {
    if (assignmentId) startTrainingAssignment({ assignmentId });
  }, [assignmentId]);

  const { data: currentUser } = useQuery({ queryKey: ['currentUser'], queryFn: () => base44.auth.me() });
  const { data: assignment } = useQuery({ queryKey: ['training-assignment', assignmentId], queryFn: async () => (await base44.entities.TrainingAssignment.filter({ id: assignmentId }))[0], enabled: !!assignmentId });
  const { data: course } = useQuery({ queryKey: ['training-course', assignment?.course_id], queryFn: async () => (await base44.entities.TrainingCourse.filter({ id: assignment?.course_id }))[0], enabled: !!assignment?.course_id });
  const { data: modules = [] } = useQuery({ queryKey: ['training-modules', assignment?.course_id], queryFn: () => base44.entities.TrainingModule.filter({ course_id: assignment?.course_id }, 'order_index', 100), enabled: !!assignment?.course_id, initialData: [] });
  const { data: questions = [] } = useQuery({ queryKey: ['training-questions', assignment?.course_id], queryFn: () => base44.entities.TrainingQuestion.filter({ course_id: assignment?.course_id, active: true }, 'order_index', 200), enabled: !!assignment?.course_id, initialData: [] });

  const randomizedQuestions = useMemo(() => shuffle(questions).map((question) => ({ ...question, options_json: Array.isArray(question.options_json) ? shuffle(question.options_json) : question.options_json })), [questions]);
  const passingScore = assignment?.passing_score_required || course?.passing_score || 80;

  const completeModule = (moduleId) => {
    if (completedModules.includes(moduleId)) return;
    const next = [...completedModules, moduleId];
    setCompletedModules(next);
    if (next.length === Math.max(modules.length, 1)) setStep(course?.requires_attestation || assignment?.attestation_required ? 'attestation' : 'test');
  };

  const submitAttempt = async () => {
    setSubmitting(true);
    if (proofFiles.length > 0) {
      const uploaded = await Promise.all(proofFiles.map(async (file) => ({ name: file.name, url: (await base44.integrations.Core.UploadFile({ file })).file_url })));
      await base44.entities.TrainingAssignment.update(assignmentId, {
        external_proof_urls: uploaded.map((item) => item.url),
        external_proof_names: uploaded.map((item) => item.name),
        external_proof_submitted_at: new Date().toISOString(),
      });
    }
    const response = await gradeTrainingAttempt({
      assignmentId,
      responses: randomizedQuestions.map((question) => ({ questionId: question.id, answer: answers[question.id] })),
      attestation: { acknowledged: attestationAccepted, signedName, statement: course?.attestation_text, deviceMetadata: { userAgent: navigator.userAgent } },
      startedAt,
      timeSpentMinutes: 0,
      randomizedQuestionOrder: randomizedQuestions.map((question) => question.id)
    });
    setResult(response.data || response);
    setStep('result');
    setSubmitting(false);
  };

  if (!assignment || !course) return <div className="max-w-4xl mx-auto p-6 text-slate-500">Loading in-service...</div>;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      <Card className="border-0 shadow-lg bg-gradient-to-r from-indigo-700 to-blue-700 text-white">
        <CardContent className="p-6">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2">{assignment.course_title}</h1>
          <div className="flex flex-wrap gap-3 text-sm text-indigo-100">
            <span>Due {assignment.due_date ? new Date(assignment.due_date).toLocaleDateString() : '—'}</span>
            <span>Passing score {passingScore}%</span>
            <span>Attempt {assignment.latest_attempt_number + 1 || 1}</span>
          </div>
          <Progress value={step === 'objectives' ? 10 : step === 'content' ? 45 : step === 'attestation' ? 70 : step === 'test' ? 85 : 100} className="mt-4 h-2 bg-white/20" />
        </CardContent>
      </Card>

      {step === 'objectives' && <Card><CardHeader><CardTitle>Learning objectives</CardTitle></CardHeader><CardContent className="space-y-4"><p className="text-slate-600">{course.short_description || course.description}</p><ul className="list-disc pl-5 space-y-2 text-slate-700">{(course.learning_objectives || []).map((objective, index) => <li key={index}>{objective}</li>)}</ul>{(course.attachment_urls || []).length > 0 && <div className="rounded-xl border bg-slate-50 p-4"><p className="font-medium text-slate-900 mb-2">Attached resources</p><div className="flex flex-wrap gap-2">{(course.attachment_urls || []).map((url, index) => <a key={index} href={url} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 underline">{course.attachment_names?.[index] || `Resource ${index + 1}`}</a>)}</div></div>}<Button onClick={() => setStep('content')}>Start in-service <ChevronRight className="w-4 h-4 ml-2" /></Button></CardContent></Card>}

      {step === 'content' && <div className="space-y-4">{(modules.length > 0 ? modules : [{ id: 'fallback', title: 'Lesson Content', type: 'lesson', content_json: { intro: course.description, sections: [], case_scenarios: [], key_takeaways: [] }, attachment_urls: [], attachment_names: [] }]).map((module) => <div key={module.id} className="space-y-3"><TrainingModuleViewer module={module} />{(module.attachment_urls || []).length > 0 && <div className="rounded-xl border bg-slate-50 p-4"><p className="font-medium text-slate-900 mb-2">Lesson attachments</p><div className="flex flex-wrap gap-2">{(module.attachment_urls || []).map((url, index) => <a key={index} href={url} target="_blank" rel="noreferrer" className="text-sm text-indigo-600 underline">{module.attachment_names?.[index] || `Lesson File ${index + 1}`}</a>)}</div></div>}<div className="flex justify-end"><Button variant={completedModules.includes(module.id) ? 'outline' : 'default'} onClick={() => completeModule(module.id)}>{completedModules.includes(module.id) ? 'Completed' : 'Mark module complete'}</Button></div></div>)}</div>}

      {step === 'attestation' && <Card><CardHeader><CardTitle>Acknowledgement / Attestation</CardTitle></CardHeader><CardContent className="space-y-4"><Alert><AlertDescription>{course.attestation_text || 'I have reviewed and understand this training and agree to follow agency policy.'}</AlertDescription></Alert><div className="flex items-start gap-3"><Checkbox checked={attestationAccepted} onCheckedChange={(checked) => setAttestationAccepted(!!checked)} /><Label>I have reviewed and understand this training.</Label></div><div className="space-y-2"><Label>Type your full name</Label><Input value={signedName} onChange={(event) => setSignedName(event.target.value)} placeholder={currentUser?.full_name || 'Your name'} /></div><div className="space-y-2"><Label>Upload proof of external certification (optional)</Label><input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.webp" onChange={(event) => setProofFiles(Array.from(event.target.files || []))} className="block w-full text-sm" /></div><Button disabled={!attestationAccepted || !signedName} onClick={() => setStep('test')}>Proceed to final test</Button></CardContent></Card>}

      {step === 'test' && <div className="space-y-4"><Alert className="border-amber-200 bg-amber-50"><AlertTriangle className="w-4 h-4 text-amber-600" /><AlertDescription className="text-amber-900">You must answer every question before submitting.</AlertDescription></Alert>{randomizedQuestions.map((question, index) => <TrainingQuestionRenderer key={question.id} question={question} index={index} value={answers[question.id]} onChange={(answer) => setAnswers((prev) => ({ ...prev, [question.id]: answer }))} />)}<Button className="w-full" disabled={submitting || Object.keys(answers).length !== randomizedQuestions.length} onClick={submitAttempt}>{submitting ? 'Submitting...' : 'Submit competency test'}</Button></div>}

      {step === 'result' && result && <Card><CardContent className="p-6 space-y-4"><div className="flex items-center gap-3">{result.passed ? <CheckCircle2 className="w-8 h-8 text-green-600" /> : <RotateCcw className="w-8 h-8 text-red-600" />}<div><h2 className="text-2xl font-bold text-slate-900">{result.passed ? 'Passed' : 'Retake Required'}</h2><p className="text-slate-600">Score {result.score}% • Passing score {result.passing_score}%</p></div></div>{!result.passed && <Alert><AlertDescription>{result.remediation_message}</AlertDescription></Alert>}{result.show_correct_answers && result.graded_answers?.length > 0 && <div className="space-y-3"><h3 className="font-semibold text-slate-900">Answer review</h3>{result.graded_answers.map((item, index) => <div key={index} className="rounded-xl border p-3 text-sm"><p className="font-medium text-slate-900 mb-1">{item.prompt}</p><p className="text-slate-600">Your answer: {JSON.stringify(item.answer)}</p><p className="text-slate-600">Points: {item.points_earned}/{item.points_possible}</p>{item.rationale && <p className="text-slate-500 mt-1">Rationale: {item.rationale}</p>}{item.ai_feedback && <p className="text-slate-500 mt-1">Feedback: {item.ai_feedback}</p>}</div>)}</div>}<div className="flex flex-wrap gap-3"><Button asChild variant="outline"><a href={createPageUrl('MyTraining')}>Back to My Training</a></Button>{!result.passed && !result.locked && <Button onClick={() => { setStep('content'); setAnswers({}); setResult(null); setCompletedModules([]); setAttestationAccepted(false); setSignedName(''); setProofFiles([]); }}>Review content and retake</Button>}</div></CardContent></Card>}
    </div>
  );
}
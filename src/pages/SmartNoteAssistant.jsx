import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Sparkles, CheckCircle2, Loader2, ArrowRight, ClipboardList, User,
  Mic, Square
} from "lucide-react";
import { todayEastern } from "../components/utils/timezone";
import { logActivity, ActivityActions } from "../components/utils/activityLogger";
import { enhanceTranscription } from "../components/utils/medicalDictionary";
import SmartNoteHeader from "../components/smartNote/SmartNoteHeader";
import VisitSummaryGenerator from "../components/smartNote/VisitSummaryGenerator";
import NoteTemplateSelector from "../components/smartNote/NoteTemplateSelector";
import VitalSignValidator from "../components/smartNote/VitalSignValidator";
import StructuredNoteDrafter from "../components/smartNote/StructuredNoteDrafter";
import EnhancedAudioRecorder from "../components/smartNote/EnhancedAudioRecorder";
import SOAPAudioRecorder from "../components/smartNote/SOAPAudioRecorder";
import MedicationManagementTab from "../components/smartNote/MedicationManagementTab";
import VitalsTrendAnalysis from "../components/smartNote/VitalsTrendAnalysis";
import FinalNoteDisplay from "../components/smartNote/FinalNoteDisplay";
import FollowUpTasksPanel from "../components/smartNote/FollowUpTasksPanel";
import VoiceClinicalNoteRecorder from "../components/smartNote/VoiceClinicalNoteRecorder";
import ComplianceChecklist from "../components/smartNote/ComplianceChecklist";
import ConstrainedNoteReviewer from "../components/smartNote/ConstrainedNoteReviewer";
import { toNoteConversionFields, deriveStructuredVisitFields } from "../components/smartNote/compliance/coverageScore";
import { generateFollowUpTasks } from "@/functions/generateFollowUpTasks";
import { analyzeVisitForSupplyUsage } from "@/functions/analyzeVisitForSupplyUsage";
import { toast } from "sonner";
import SearchablePatientSelect from "@/components/ui/SearchablePatientSelect";

const HOME_HEALTH_VISIT_TYPES = [
  { value: "routine_visit", label: "Routine SN Visit" },
  { value: "admission", label: "Start of Care (SOC)" },
  { value: "recertification", label: "Recertification" },
  { value: "discharge", label: "Discharge" },
  { value: "prn", label: "PRN Visit" },
];

const HOSPICE_VISIT_TYPES = [
  { value: "routine_visit", label: "Routine Hospice Visit" },
  { value: "admission", label: "Hospice Admission" },
  { value: "recertification", label: "Recertification (Benefit Period)" },
  { value: "discharge", label: "Discharge / Revocation" },
  { value: "prn", label: "After-Hours / Crisis Visit" },
];

// Returns the right visit types based on care scope
const getVisitTypes = (careScope) => {
  if (careScope === "hospice") return HOSPICE_VISIT_TYPES;
  if (careScope === "both") return [...HOME_HEALTH_VISIT_TYPES, ...HOSPICE_VISIT_TYPES.filter(v => !HOME_HEALTH_VISIT_TYPES.find(h => h.value === v.value))];
  return HOME_HEALTH_VISIT_TYPES;
};

import StepIndicator from "../components/smartNote/StepIndicator";
import SmartNoteTabs from "../components/smartNote/SmartNoteTabs";
import PageContainer from "@/components/ui/PageContainer";

export default function SmartNoteAssistant() {
  const [patientId, setPatientId] = useState("");
  const [visitType, setVisitType] = useState("routine_visit");
  const visitDate = todayEastern();
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedVisitId, setSavedVisitId] = useState(null);
  const [step, setStep] = useState(1);
  const [copied, setCopied] = useState(false);
  const [listening, setListening] = useState(false);
  const [activeTab, setActiveTab] = useState("builder");
  const [hasDraft, setHasDraft] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [signatureImage, setSignatureImage] = useState(null);
  const [followUpTasks, setFollowUpTasks] = useState([]);
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const recRef = useRef(null);
  const textareaRef = useRef(null);
  const DRAFT_KEY = "smart_note_draft_v2";
  const SAVED_PATIENT_KEY = "smart_note_patient_v1";

  const { data: currentUser } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });
  const careScope = currentUser?.care_scope || "home_health";
  const VISIT_TYPES = getVisitTypes(careScope);
  const isHospice = careScope === "hospice";
  const serviceLine = isHospice ? "hospice" : "home_health";
  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: async () => {
        try {
            return await base44.entities.Patient.filter({ status: "active" }, "first_name", 200);
        } catch (e) {
            if (!navigator.onLine) {
                const { getPatientsLocally } = await import('@/lib/indexedDB');
                const local = await getPatientsLocally();
                return local || [];
            }
            throw e;
        }
    }
  });
  const patient = patients.find(p => p.id === patientId);
  // Full record for the selected patient (the list query may not include the
  // note history). Used to pre-fill carry-forward answers from the last visit.
  const { data: patientDetail } = useQuery({
    queryKey: ["patientDetail", patientId],
    queryFn: () => base44.entities.Patient.get(patientId),
    enabled: !!patientId,
  });
  const getPriorNote = (p) => {
    if (!p) return "";
    const hist = p.enhanced_notes_history;
    if (Array.isArray(hist) && hist.length) return hist[hist.length - 1]?.note || "";
    return p.clinical_notes || "";
  };

  useEffect(() => {
    if (currentUser?.email) logActivity(ActivityActions.PAGE_VISIT, { page: "SmartNoteAssistant" });
  }, [currentUser?.email]);

  // Restore saved patient context across tabs
  useEffect(() => {
    const saved = sessionStorage.getItem(SAVED_PATIENT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.patientId) setPatientId(parsed.patientId);
        if (parsed.visitType) setVisitType(parsed.visitType);
      } catch {}
    }
  }, []);

  // Persist patient context across tabs
  useEffect(() => {
    sessionStorage.setItem(SAVED_PATIENT_KEY, JSON.stringify({ patientId, visitType }));
  }, [patientId, visitType]);

  useEffect(() => {
    const saved = sessionStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.note?.trim().length > 20) setHasDraft(true);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (note.trim()) {
      sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ note, visitType, patientId }));
      import('@/lib/indexedDB').then(({ saveDraftNoteLocally }) => {
          saveDraftNoteLocally({ id: 'current_draft', note, visitType, patientId });
      }).catch(console.error);
    }
  }, [note, visitType, patientId]);

  useEffect(() => { if (step === 1) textareaRef.current?.focus(); }, [step]);

  useEffect(() => {
    return () => {
      if (recRef.current) {
        recRef.current.stop();
      }
    };
  }, []);

  const restoreDraft = () => {
    const saved = sessionStorage.getItem(DRAFT_KEY);
    if (!saved) return;
    let parsed;
    try {
      parsed = JSON.parse(saved);
    } catch {
      // Corrupted/partial draft — clear it and inform the user rather than
      // throwing out of the restore handler with no feedback.
      sessionStorage.removeItem(DRAFT_KEY);
      setHasDraft(false);
      toast.error("Saved draft could not be restored.");
      return;
    }
    setNote(parsed.note || "");
    setVisitType(parsed.visitType || "routine_visit");
    setPatientId(parsed.patientId || "");
    setHasDraft(false);
    setDraftRestored(true);
  };
  const dismissDraft = () => { sessionStorage.removeItem(DRAFT_KEY); setHasDraft(false); };

  const startDictation = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { toast.error("Speech recognition not supported in this browser."); return; }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.lang = "en-US";
    rec.onresult = (e) => {
      const t = Array.from(e.results).slice(e.resultIndex).map(r => r[0].transcript).join(" ");
      const enhanced = enhanceTranscription(t);
      setNote(prev => prev ? prev + " " + enhanced : enhanced);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recRef.current = rec;
    rec.start();
    setListening(true);
  };
  const stopDictation = () => { recRef.current?.stop(); setListening(false); };

  // Step 1 → 2. The deterministic scan + questions + generation + fact-check all
  // live in <ConstrainedNoteReviewer>, which scans `note` on mount.
  const startReview = () => {
    if (!note || note.trim().length < 20) return;
    setSaved(false);
    setSavedVisitId(null);
    setStep(2);
  };

  // Save to the patient's chart. Re-verifies any edits first (via the reviewer),
  // then persists — updating the same Visit on re-save so editing never creates a
  // duplicate. Optional: the note is fully usable (copy/PDF) without saving.
  const handleSave = async (api) => {
    if (!patientId || !currentUser?.email) {
      toast.error("Select a patient to save this note to their chart.");
      return;
    }
    setSaving(true);
    try {
      let result = api.result;
      if (api.dirty) {
        result = await api.recheck();
        if (!result) { setSaving(false); return; } // fact-check failed → reviewer shows the fix panel
      }
      await persistNote(result);
      setSaved(true);
    } catch (err) {
      console.error("Save to chart error:", err);
      toast.error("Saving to the chart failed.");
    } finally {
      setSaving(false);
    }
  };

  // Create-or-update the chart records from the reviewer's save-ready result,
  // with a real, deterministic coverage score.
  const persistNote = async (result) => {
    if (!result || !patientId || !currentUser?.email) return;
    const { finalNote: finalText, coverageScore, draftScore, presence, answeredIds, confirmedNegativeIds, answers } = result;
    const structured = deriveStructuredVisitFields(presence, { answeredIds, confirmedNegativeIds, textById: answers });

    if (!navigator.onLine) {
      const { addToSyncQueue } = await import('@/lib/indexedDB');
      // Stable client-generated idempotency key so the offline-sync drain can
      // dedupe: if Visit.create succeeds but the queue item isn't removed (tab
      // close, second `online` event, re-mount), the drain skips the re-create.
      // crypto.randomUUID is only defined in secure contexts; fall back so the
      // offline save (the whole point of this branch) never throws in the field.
      const clientRequestId = (typeof crypto !== 'undefined' && crypto.randomUUID)
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      await addToSyncQueue('CREATE_VISIT', { client_request_id: clientRequestId, patient_id: patientId, visit_date: visitDate, visit_type: visitType, status: "completed", nurse_notes: finalText, raw_transcription: note, compliance_score: coverageScore, ...structured });
      toast.success("Saved offline. Will sync when reconnected.");
      logActivity(ActivityActions.NOTE_ENHANCED, { patient_id: patientId, visit_type: visitType, overall_score: coverageScore });
      return;
    }

    // Re-save after an edit → update the same visit, never duplicate. Also keep
    // the appended enhanced_notes_history entry in sync, since getPriorNote()
    // prefers it for the next note's carry-forward pre-fill.
    if (savedVisitId) {
      const currentPatient = await base44.entities.Patient.get(patientId);
      const history = currentPatient.enhanced_notes_history || [];
      if (history.length) {
        history[history.length - 1] = { ...history[history.length - 1], note: finalText, compliance_score: coverageScore };
      }
      await Promise.all([
        base44.entities.Visit.update(savedVisitId, { nurse_notes: finalText, compliance_score: coverageScore, ...structured }),
        base44.entities.Patient.update(patientId, { clinical_notes: finalText, enhanced_notes_history: history }),
      ]);
      toast.success("Chart updated.");
      return;
    }

    const visit = await base44.entities.Visit.create({
      patient_id: patientId, visit_date: visitDate, visit_type: visitType,
      status: "completed", nurse_notes: finalText, raw_transcription: note,
      compliance_score: coverageScore, ...structured,
    });
    setSavedVisitId(visit.id);

    const currentPatient = await base44.entities.Patient.get(patientId);
    const enhancedHistory = currentPatient.enhanced_notes_history || [];
    enhancedHistory.push({
      date: visitDate, visit_type: visitType, note: finalText,
      compliance_score: coverageScore, created_by: currentUser.email,
      created_at: new Date().toISOString(),
    });

    await Promise.all([
      base44.entities.Patient.update(patientId, { enhanced_notes_history: enhancedHistory, clinical_notes: finalText }),
      base44.entities.NoteConversion.create(toNoteConversionFields({
        coverageScore, draftPresenceScore: draftScore,
        roughLen: note.length, enhancedLen: finalText.length,
        visitType, diagnosis: patient?.primary_diagnosis || "",
        nurseEmail: currentUser.email, patientId,
      })),
      base44.entities.ComplianceAudit.create({
        visit_id: visit.id, nurse_email: currentUser.email, patient_id: patientId,
        audit_date: new Date().toISOString(), compliance_score: coverageScore,
        status: coverageScore >= 90 ? "passed" : coverageScore >= 80 ? "flagged" : "critical",
        audit_type: "automated",
      }),
    ]);
    generateTasksFromNote(finalText, visit.id);
    analyzeSupplyUsage(finalText, visit.id);
    toast.success("Saved to the patient's chart.");
    logActivity(ActivityActions.NOTE_ENHANCED, { patient_id: patientId, visit_type: visitType, overall_score: coverageScore });
  };

  const analyzeSupplyUsage = async (noteText, visitId) => {
    if (!noteText || !patientId) return;
    try {
      await analyzeVisitForSupplyUsage({ visitId, visitNotes: noteText, patientId });
    } catch (err) {
      console.error("Supply analysis failed:", err);
    }
  };

  const generateTasksFromNote = async (noteText, visitId) => {
    if (!noteText || generatingTasks) return;
    setGeneratingTasks(true);
    try {
      const result = await generateFollowUpTasks({
        noteText,
        patientId: patientId || undefined,
        visitId: visitId || undefined,
        visitType,
        diagnosis: patient?.primary_diagnosis || "",
      });
      if (result?.data?.tasks?.length) {
        setFollowUpTasks(result.data.tasks);
      }
    } catch (err) {
      console.error("Failed to generate follow-up tasks:", err);
    } finally {
      setGeneratingTasks(false);
    }
  };

  const reset = () => {
    setNote(""); setSaved(false); setSavedVisitId(null);
    setStep(1); setDraftRestored(false); setSignatureImage(null); setFollowUpTasks([]);
    sessionStorage.removeItem(DRAFT_KEY);
  };

  const parseNoteSections = (text) => {
    if (!text) return null;
    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    const vitals = sentences.filter(s => /bp|blood pressure|hr|heart rate|o2|oxygen|temp|weight|respir|pain/i.test(s));
    const assessment = sentences.filter(s => /assess|exam|appear|ambul|mobil|wound|skin|edema|breath|lung|bowel/i.test(s));
    const education = sentences.filter(s => /teach|educat|instruct|verbali|understand|demonstrat/i.test(s));
    const safety = sentences.filter(s => /fall|safe|hazard|medic|adher|complian/i.test(s));
    const plan = sentences.filter(s => /plan|next|follow|return|notif|physician|refer|schedul/i.test(s));
    const rest = sentences.filter(s => ![...vitals, ...assessment, ...education, ...safety, ...plan].includes(s));
    const secs = [
      { key: "vitals", label: "Vital Signs", text: vitals.join(" ").trim() },
      { key: "assessment", label: "Assessment", text: assessment.join(" ").trim() },
      { key: "education", label: "Education / Teaching", text: education.join(" ").trim() },
      { key: "safety", label: "Safety", text: safety.join(" ").trim() },
      { key: "plan", label: "Plan", text: plan.join(" ").trim() },
      { key: "other", label: "Clinical Narrative", text: rest.join(" ").trim() },
    ].filter(s => s.text.length > 10);
    return secs.length > 1 ? secs : null;
  };

  const ready = note.trim().length >= 20;

  return (
    <PageContainer>

      <SmartNoteHeader careScope={careScope} onReset={reset} step={step} activeTab={activeTab} />

      <SmartNoteTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* ── TAB: MEDICATIONS ── */}
      {activeTab === "medications" && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <MedicationManagementTab
            patient={patient}
            patientId={patientId}
            onAddToNote={(medNote) => {
              setNote(prev => prev + "\n\n" + medNote);
              setActiveTab("builder");
            }}
          />
        </div>
      )}

      {/* ── TAB: DRAFT FROM VITALS ── */}
      {activeTab === "drafter" && (
        <StructuredNoteDrafter
          patient={patient}
          onDraftReady={(draft, vType) => {
            setNote(draft);
            setVisitType(vType);
            setActiveTab("builder");
          }}
        />
      )}

      {/* ── TAB: VISIT SUMMARY ── */}
      {activeTab === "summary" && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <VisitSummaryGenerator patientId={patientId} />
        </div>
      )}

      {/* ── TAB: VITAL TRENDS ── */}
      {activeTab === "trends" && (
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
          <VitalsTrendAnalysis patientId={patientId} />
        </div>
      )}



      {/* ── TAB: NOTE BUILDER ── */}
      {activeTab === "builder" && (
        <>
          {hasDraft && step === 1 && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 shadow-sm">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-amber-800">Unsaved draft found</p>
                <p className="text-xs text-amber-600">You have a note in progress from a previous session.</p>
              </div>
              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 text-white h-8 text-xs shrink-0" onClick={restoreDraft}>Restore</Button>
              <Button size="sm" variant="ghost" className="h-8 text-xs text-amber-600 shrink-0" onClick={dismissDraft}>Discard</Button>
            </div>
          )}
          {draftRestored && (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <p className="text-xs text-green-700 font-medium">Draft restored.</p>
            </div>
          )}

          <StepIndicator step={step} />

          {/* STEP 1: WRITE */}
          {step === 1 && (
            <div className="space-y-3">
              <div className="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 space-y-4">
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <User className="w-3.5 h-3.5 text-indigo-500" />
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Patient</label>
                    <span className="text-xs text-slate-400 font-normal normal-case ml-1">optional</span>
                  </div>
                  <SearchablePatientSelect
                    patients={patients}
                    value={patientId}
                    onValueChange={setPatientId}
                    className="bg-slate-50 border-slate-200 h-12 sm:h-11 text-sm rounded-xl"
                  />
                </div>
                <div className="border-t border-slate-100" />
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <ClipboardList className="w-3.5 h-3.5 text-indigo-500" />
                    <label className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Visit Type</label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {VISIT_TYPES.map(v => (
                      <button key={v.value} onClick={() => setVisitType(v.value)}
                        className={`py-3 sm:py-2 px-2 rounded-xl text-xs font-semibold border-2 transition-all text-center leading-tight min-h-[48px] sm:min-h-0 active:scale-95 ${visitType === v.value ? "bg-indigo-600 border-indigo-600 text-white shadow-md" : "bg-slate-50 border-slate-200 text-slate-600 hover:border-indigo-300 hover:bg-indigo-50"}`}>
                        {v.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {patient && (
                <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
                  <User className="w-3.5 h-3.5 shrink-0" />
                  <span>
                    <strong>{patient.first_name} {patient.last_name}</strong>
                    {patient.primary_diagnosis ? ` · ${patient.primary_diagnosis}` : ""}
                    {patient.current_medications?.length > 0 ? ` · ${patient.current_medications.length} meds` : ""}
                    {patient.functional_status?.fall_risk === "high" && <span className="ml-2 text-red-600 font-bold">⚠ High Fall Risk</span>}
                  </span>
                </div>
              )}

              <NoteTemplateSelector currentVisitType={visitType} onSelect={(content, type) => {
                setNote(content); setVisitType(type);
                setTimeout(() => textareaRef.current?.focus(), 100);
              }} />

              {/* Voice Clinical Note Recorder */}
              <VoiceClinicalNoteRecorder
                onTranscriptionComplete={(enhancedNote) => {
                  setNote(prev => (prev ? prev + "\n\n" + enhancedNote : enhancedNote));
                  setTimeout(() => textareaRef.current?.focus(), 100);
                }}
              />

              <ComplianceChecklist isHospice={isHospice} />

              <div className="bg-white border-2 border-indigo-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
                  <span className="text-xs font-semibold text-indigo-700">Your Rough Notes / Bullet Points</span>
                  <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-violet-600 hover:text-violet-800"
                    onClick={() => { setActiveTab("drafter"); }}>
                    <ClipboardList className="w-3.5 h-3.5" /> Use Structured Form
                  </Button>
                </div>
                {/* Enhanced Audio Recorder */}
                <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex flex-wrap gap-2 items-center">
                  <Button
                    variant={listening ? "destructive" : "default"}
                    className={`h-9 gap-2 text-xs font-semibold shadow-sm ${listening ? 'animate-pulse' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}
                    onClick={listening ? stopDictation : startDictation}
                  >
                    {listening ? <><Square className="w-4 h-4 fill-current" /> Stop Dictation</> : <><Mic className="w-4 h-4" /> Live Dictation</>}
                  </Button>
                  <EnhancedAudioRecorder
                    onTranscribed={(transcribed) => setNote(prev => prev ? prev + " " + transcribed : transcribed)}
                    disabled={false}
                  />
                  <SOAPAudioRecorder
                    onSOAPGenerated={(soapText) => setNote(prev => prev ? prev + "\n\n" + soapText : soapText)}
                    disabled={false}
                  />
                </div>
                <textarea ref={textareaRef} value={note} onChange={e => setNote(e.target.value)}
                  placeholder={"Enter bullet points or rough draft — AI will NOT invent information.\n\n• BP 148/90, HR 82, O2 95% RA, pain 3/10\n• homebound: unable to leave without considerable effort\n• skilled need: wound assessment and dressing change\n• wound R heel 2×3 cm granulating, no odor\n• taught med schedule, pt verbalized understanding\n• fall risk — clutter noted, discussed w/ family"}
                  className="w-full min-h-[240px] sm:min-h-[320px] text-sm border-0 px-4 py-3 focus:ring-0 bg-white font-mono resize-none outline-none leading-relaxed" spellCheck={false}
                />
                <div className="flex items-center justify-between px-4 py-3 border-t border-slate-100 bg-slate-50 gap-3">
                  <span className={`text-xs shrink-0 ${ready ? "text-green-600 font-medium" : "text-slate-400"}`}>
                    {ready ? `${note.length} chars — ready` : `${20 - note.trim().length} more chars needed`}
                  </span>
                  <Button onClick={startReview} disabled={!ready} className="bg-indigo-600 hover:bg-indigo-700 h-11 sm:h-9 px-5 gap-1.5 text-sm font-semibold w-full sm:w-auto">
                    <Sparkles className="w-4 h-4" /> Check Compliance <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <VitalSignValidator noteText={note} />

            </div>
          )}

          {/* STEP 2: QUESTIONS / GENERATE / REVIEW — shared constrained-scribe flow */}
          {step === 2 && (
            <ConstrainedNoteReviewer
              roughNote={note}
              serviceLine={serviceLine}
              visitType={visitType}
              priorNote={getPriorNote(patientDetail || patient)}
              currentUser={currentUser}
              onBack={() => setStep(1)}
              renderFinalNote={(api) => (
                <>
                  {generatingTasks && (
                    <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
                      <Loader2 className="w-4 h-4 animate-spin text-green-600 shrink-0" />
                      Generating follow-up tasks from your note…
                    </div>
                  )}
                  {followUpTasks.length > 0 && (
                    <FollowUpTasksPanel tasks={followUpTasks} onDismiss={() => setFollowUpTasks([])} />
                  )}
                  <FinalNoteDisplay
                    finalNote={api.finalNote}
                    setFinalNote={api.setFinalNote}
                    onCopy={async () => { await navigator.clipboard.writeText(api.finalNote); setCopied(true); setTimeout(() => setCopied(false), 2500); }}
                    copied={copied}
                    patient={patient}
                    visitType={visitType}
                    analysisScore={api.coverage}
                    analysis={{ overall_score: api.coverage, compliance_score: api.coverage, findings: [] }}
                    currentUser={currentUser}
                    signatureImage={signatureImage}
                    setSignatureImage={setSignatureImage}
                    onReset={reset}
                    originalNote={note}
                    noteSections={parseNoteSections(api.finalNote)}
                    onSave={() => handleSave(api)}
                    saving={saving}
                    saved={saved && !api.dirty}
                    saveDisabled={saving || !!(api.fixRequired && !api.fixRequired.offlinePending) || !patientId}
                  />
                </>
              )}
            />
          )}
        </>
      )}
    </PageContainer>
  );
}

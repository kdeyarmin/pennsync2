import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles, CheckCircle2, Loader2, ArrowRight, ClipboardList, User,
  Mic, Square, HelpCircle, AlertTriangle, ShieldCheck
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
import { normalizeDraft } from "../components/smartNote/compliance/normalize";
import { getRequiredElements } from "../components/smartNote/compliance/requiredElements";
import { detectPresence, computeGaps, computeCriticalGaps, computeCarryForward } from "../components/smartNote/compliance/presenceDetection";
import { splitSentences } from "../components/smartNote/compliance/factExtraction";
import { generateConstrainedNote, groundNote } from "../components/smartNote/compliance/generation";
import { valueGuard } from "../components/smartNote/compliance/valueGuard";
import { computeCoverageScore, computeDraftPresenceScore, toNoteConversionFields, deriveStructuredVisitFields } from "../components/smartNote/compliance/coverageScore";
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

export default function SmartNoteAssistant() {
  const [patientId, setPatientId] = useState("");
  const [visitType, setVisitType] = useState("routine_visit");
  const visitDate = todayEastern();
  const [note, setNote] = useState("");
  // `analysis` holds the deterministic compliance scan, not an LLM judgement:
  // { serviceLine, visitType, normalized, required[], presence[], gaps[], draftScore }
  const [analysis, setAnalysis] = useState(null);
  const [answers, setAnswers] = useState({});
  const [prefilledIds, setPrefilledIds] = useState(new Set()); // answers carried from the last visit
  const [confirmedNegatives, setConfirmedNegatives] = useState(new Set());
  const [finalNote, setFinalNote] = useState("");
  const [fixRequired, setFixRequired] = useState(null);
  const [verifiedNote, setVerifiedNote] = useState(""); // exact text that passed fact-check
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedVisitId, setSavedVisitId] = useState(null);
  const [step, setStep] = useState(1);
  const [building, setBuilding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [listening, setListening] = useState(false);
  const [activeTab, setActiveTab] = useState("builder");
  const [noteSections, setNoteSections] = useState(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [signatureImage, setSignatureImage] = useState(null);
  const [followUpTasks, setFollowUpTasks] = useState([]);
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const recRef = useRef(null);
  const textareaRef = useRef(null);
  const DRAFT_KEY = "smart_note_draft_v2";
  const ANALYSIS_KEY = "smart_note_analysis_v2";
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

  // Persist in-progress answers/negatives so a tab switch doesn't lose them
  useEffect(() => {
    if (analysis && step >= 2) {
      sessionStorage.setItem(ANALYSIS_KEY, JSON.stringify({ answers, confirmedNegatives: Array.from(confirmedNegatives) }));
    }
  }, [analysis, answers, confirmedNegatives, step]);

  // Save final note to sessionStorage
  useEffect(() => {
    if (finalNote.trim()) {
      sessionStorage.setItem("smart_note_final_v1", JSON.stringify({ finalNote, noteSections, timestamp: Date.now() }));
    }
  }, [finalNote, noteSections]);

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
    const parsed = JSON.parse(saved);
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

  const setAnswer = (id, value) => {
    setAnswers(prev => ({ ...prev, [id]: value }));
    // once the nurse edits a carried-forward answer it's their own input
    setPrefilledIds(prev => {
      if (!prev.has(id)) return prev;
      const n = new Set(prev);
      n.delete(id);
      return n;
    });
  };
  const toggleNegative = (id) => setConfirmedNegatives(prev => {
    const n = new Set(prev);
    n.has(id) ? n.delete(id) : n.add(id);
    return n;
  });

  // ── Step 1 → 2: instant, deterministic compliance scan (no LLM, offline-ok) ──
  const runComplianceScan = () => {
    if (!note || note.trim().length < 20) return;
    const normalized = normalizeDraft(note);
    const required = getRequiredElements(serviceLine, visitType);
    const presence = detectPresence(normalized, required);
    const gaps = computeGaps(presence, required);
    const draftScore = computeDraftPresenceScore({ requiredElements: required, presenceResults: presence });
    // Pre-fill carry-forward-safe gaps from the patient's last saved note (the
    // nurse confirms/edits each). Visit-specific findings are never carried.
    const prefill = computeCarryForward(getPriorNote(patientDetail || patient), gaps);
    setAnswers(prefill);
    setPrefilledIds(new Set(Object.keys(prefill)));
    setConfirmedNegatives(new Set());
    setFinalNote("");
    setVerifiedNote("");
    setSaved(false);
    setSavedVisitId(null);
    setFixRequired(null);
    setNoteSections(null);
    setAnalysis({ serviceLine, visitType, normalized, required, presence, gaps, draftScore });
    setStep(2);
  };

  // Non-critical required elements the nurse left blank → explicit, approved
  // "Not documented this visit." lines (deterministic boilerplate, never invented).
  const computeNotDocumented = () => {
    if (!analysis) return [];
    return analysis.gaps
      .filter(e => e.severity !== "critical" && !answers[e.id]?.trim() && !confirmedNegatives.has(e.id))
      .map(e => e.notDocumentedPhrase);
  };

  // Build the corpus the note is allowed to draw from: draft + answers + confirmed
  // negatives + the approved "not documented" boilerplate (so the fact-check
  // treats that boilerplate as supported source, not as an invented claim).
  const buildAllowedInput = () => {
    if (!analysis) return "";
    const answerTexts = analysis.required.filter(e => answers[e.id]?.trim()).map(e => answers[e.id].trim());
    const negPhrases = analysis.required.filter(e => confirmedNegatives.has(e.id) && e.standardNegative).map(e => e.standardNegative.phrase);
    return [analysis.normalized, ...answerTexts, ...negPhrases, ...computeNotDocumented()].join(" ");
  };

  // ── Step 2: constrained generation → value-guard + grounding → finalize ──
  const generateFinalNote = async () => {
    if (!analysis) return;
    const { required, presence } = analysis;
    const criticalUnanswered = computeCriticalGaps(presence, required).filter(e => !answers[e.id]?.trim());
    if (criticalUnanswered.length) {
      toast.error(`Required before generating: ${criticalUnanswered.map(e => e.label).join(", ")}`);
      return;
    }

    setBuilding(true);
    setFixRequired(null);
    try {
      const draftSentences = splitSentences(analysis.normalized);
      const answersPayload = required
        .filter(e => answers[e.id]?.trim())
        .map(e => ({ label: e.label, text: answers[e.id].trim() }));
      const confirmedNegativePhrases = required
        .filter(e => confirmedNegatives.has(e.id) && e.standardNegative)
        .map(e => e.standardNegative.phrase);
      const userKey = currentUser?.email || "anon";

      // 1. constrained generation (the only generative LLM call)
      let generated;
      try {
        const res = await generateConstrainedNote(
          { draftSentences, answers: answersPayload, confirmedNegatives: confirmedNegativePhrases },
          { userKey }
        );
        generated = res.note.trim();
      } catch (genErr) {
        console.error("Generation error:", genErr);
        const credits = genErr?.status === 402 || genErr?.data?.extra_data?.reason === 'integration_credits_limit_reached';
        toast.error(credits ? "Monthly integration limit reached. Please upgrade your plan to continue." : "Note generation failed. Please try again.");
        setBuilding(false);
        return;
      }

      // 2. deterministically append "Not documented this visit." for non-critical,
      //    unanswered, non-confirmed gaps (these are never produced by the LLM).
      const notDocumented = computeNotDocumented();
      const finalText = notDocumented.length ? `${generated}\n\n${notDocumented.join(" ")}` : generated;

      // 3. fact-check the note. This does NOT save anything — the nurse reviews
      //    the note, then optionally saves it to the chart (see saveToChart).
      setFinalNote(finalText);
      setNoteSections(parseNoteSections(finalText));
      setSaved(false);
      setSavedVisitId(null);
      const v = await verifyNote(finalText);
      if (!v.ok) {
        setVerifiedNote("");
        setFixRequired(v.fix);
      } else {
        setVerifiedNote(finalText);
        setFixRequired(v.offline ? { offlinePending: true } : null);
      }
    } catch (err) {
      console.error("generateFinalNote error:", err);
      toast.error("Something went wrong building the note.");
    } finally {
      setBuilding(false);
    }
  };

  // Fact-check `text` against the nurse's material: deterministic value-guard
  // always, AI grounding when online. Never persists.
  const verifyNote = async (text) => {
    const allowedInput = buildAllowedInput();
    const vg = valueGuard(text, allowedInput);
    if (!vg.ok) return { ok: false, fix: { values: vg.unverified, sentences: [], offlinePending: false } };
    if (navigator.onLine) {
      const grounding = await groundNote(text, allowedInput, { userKey: currentUser?.email || "anon" });
      if (!grounding.ok) {
        return { ok: false, fix: { values: [], sentences: grounding.unsupported || [], groundingError: grounding.error, offlinePending: false } };
      }
      return { ok: true, offline: false };
    }
    return { ok: true, offline: true };
  };

  // Re-run the fact-check after the nurse edits the note (no save)
  const recheckNote = async () => {
    if (!finalNote.trim() || !analysis) return;
    setBuilding(true);
    try {
      const v = await verifyNote(finalNote);
      if (!v.ok) {
        setVerifiedNote("");
        setFixRequired(v.fix);
      } else {
        setVerifiedNote(finalNote);
        setFixRequired(v.offline ? { offlinePending: true } : null);
      }
    } finally {
      setBuilding(false);
    }
  };

  // Save to the patient's chart so it can seed the next note. Re-verifies any
  // edits first (to keep the chart factual), and updates the same Visit on
  // re-save so editing never creates a duplicate record. Optional — the note is
  // fully usable (copy/PDF) without saving.
  const saveToChart = async () => {
    if (!finalNote.trim() || !analysis) return;
    if (!patientId || !currentUser?.email) {
      toast.error("Select a patient to save this note to their chart.");
      return;
    }
    setSaving(true);
    try {
      if (finalNote !== verifiedNote) {
        const v = await verifyNote(finalNote);
        if (!v.ok) { setVerifiedNote(""); setFixRequired(v.fix); setSaving(false); return; }
        setVerifiedNote(finalNote);
        setFixRequired(v.offline ? { offlinePending: true } : null);
      }
      await persistNote(finalNote);
      setSaved(true);
    } catch (err) {
      console.error("Save to chart error:", err);
      toast.error("Saving to the chart failed.");
    } finally {
      setSaving(false);
    }
  };

  // Create-or-update the chart records with a real, deterministic coverage score.
  const persistNote = async (finalText) => {
    if (!analysis || !patientId || !currentUser?.email) return;
    const { required, presence } = analysis;
    const answeredIds = required.filter(e => answers[e.id]?.trim()).map(e => e.id);
    const confirmedNegativeIds = Array.from(confirmedNegatives);
    const coverageScore = computeCoverageScore({ requiredElements: required, presenceResults: presence, answeredIds, confirmedNegativeIds });
    const structured = deriveStructuredVisitFields(presence, { answeredIds, confirmedNegativeIds, textById: answers });

    if (!navigator.onLine) {
      const { addToSyncQueue } = await import('@/lib/indexedDB');
      await addToSyncQueue('CREATE_VISIT', { patient_id: patientId, visit_date: visitDate, visit_type: visitType, status: "completed", nurse_notes: finalText, raw_transcription: note, compliance_score: coverageScore, ...structured });
      toast.success("Saved offline. Will sync when reconnected.");
      logActivity(ActivityActions.NOTE_ENHANCED, { patient_id: patientId, visit_type: visitType, overall_score: coverageScore });
      return;
    }

    // Re-save after an edit → update the same visit, never duplicate.
    if (savedVisitId) {
      await Promise.all([
        base44.entities.Visit.update(savedVisitId, { nurse_notes: finalText, compliance_score: coverageScore, ...structured }),
        base44.entities.Patient.update(patientId, { clinical_notes: finalText }),
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
        coverageScore, draftPresenceScore: analysis.draftScore,
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

  const copy = async () => { await navigator.clipboard.writeText(finalNote); setCopied(true); setTimeout(() => setCopied(false), 2500); };

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
    setNote(""); setAnalysis(null); setAnswers({}); setPrefilledIds(new Set()); setConfirmedNegatives(new Set());
    setFinalNote(""); setVerifiedNote(""); setSaved(false); setSavedVisitId(null);
    setFixRequired(null); setStep(1); setNoteSections(null);
    setDraftRestored(false); setSignatureImage(null); setFollowUpTasks([]);
    sessionStorage.removeItem(DRAFT_KEY);
    sessionStorage.removeItem(ANALYSIS_KEY);
    sessionStorage.removeItem("smart_note_final_v1");
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

  // ── derived view state ──
  const gaps = analysis?.gaps || [];
  const criticalUnanswered = analysis
    ? computeCriticalGaps(analysis.presence, analysis.required).filter(e => !answers[e.id]?.trim())
    : [];
  const answeredOrConfirmed = (id) => !!answers[id]?.trim() || confirmedNegatives.has(id);
  const answeredCount = gaps.filter(g => answeredOrConfirmed(g.id)).length;
  const documentedCount = analysis
    ? analysis.required.filter(e => {
        const p = analysis.presence.find(r => r.id === e.id);
        return (p && p.present) || answeredOrConfirmed(e.id);
      }).length
    : 0;
  const liveCoverage = analysis
    ? computeCoverageScore({
        requiredElements: analysis.required,
        presenceResults: analysis.presence,
        answeredIds: analysis.required.filter(e => answers[e.id]?.trim()).map(e => e.id),
        confirmedNegativeIds: Array.from(confirmedNegatives),
      })
    : 0;
  const coverageTone = liveCoverage >= 90 ? "green" : liveCoverage >= 70 ? "orange" : "red";
  const dirty = !!finalNote && finalNote !== verifiedNote; // edited since last verification
  const ready = note.trim().length >= 20;

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-5 space-y-3 sm:space-y-4">

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
                  <Button onClick={runComplianceScan} disabled={!ready} className="bg-indigo-600 hover:bg-indigo-700 h-11 sm:h-9 px-5 gap-1.5 text-sm font-semibold w-full sm:w-auto">
                    <Sparkles className="w-4 h-4" /> Check Compliance <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <VitalSignValidator noteText={note} />

            </div>
          )}

          {/* STEP 2: QUESTIONS / GENERATE / REVIEW */}
          {step === 2 && (
            <div className="space-y-4">
              {building ? (
                <div className="bg-white border border-slate-200 rounded-xl p-10 text-center shadow-sm">
                  <Loader2 className="w-10 h-10 text-indigo-500 mx-auto animate-spin mb-3" />
                  <p className="font-semibold text-slate-800">Building your note…</p>
                  <p className="text-sm text-slate-400 mt-1">Re-voicing your words and verifying every detail against what you wrote</p>
                </div>
              ) : (
                <>
                  {analysis && !finalNote && (
                    <>
                      {/* Coverage meter (deterministic, reproducible) */}
                      <div className={`rounded-xl border-2 p-4 ${coverageTone === "green" ? "border-green-300 bg-green-50" : coverageTone === "orange" ? "border-orange-300 bg-orange-50" : "border-red-300 bg-red-50"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <div>
                            <p className="text-sm font-semibold text-slate-700">Compliance Coverage</p>
                            <p className="text-xs text-slate-500 mt-0.5">{documentedCount} of {analysis.required.length} required elements documented</p>
                          </div>
                          <span className={`text-4xl font-bold ${coverageTone === "green" ? "text-green-600" : coverageTone === "orange" ? "text-orange-500" : "text-red-600"}`}>{liveCoverage}%</span>
                        </div>
                        <div className="h-2 bg-white rounded-full overflow-hidden">
                          <div className={`h-full transition-all ${coverageTone === "green" ? "bg-green-500" : coverageTone === "orange" ? "bg-orange-400" : "bg-red-400"}`} style={{ width: `${liveCoverage}%` }} />
                        </div>
                      </div>

                      {/* Critical gate */}
                      {criticalUnanswered.length > 0 && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-300 rounded-xl px-4 py-3">
                          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                          <p className="text-sm text-red-800">
                            <strong>Required before generating:</strong> {criticalUnanswered.map(e => e.label).join(", ")}. Medicare can deny the visit without these.
                          </p>
                        </div>
                      )}

                      {/* Questions derived from deterministic gaps */}
                      {gaps.length > 0 && (
                        <div className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm">
                          <div className="flex items-center justify-between mb-1">
                            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
                              <HelpCircle className="w-4 h-4 text-amber-500" /> Questions to Complete Your Note
                            </h3>
                            <span className="text-xs text-slate-500 shrink-0">{answeredCount}/{gaps.length} addressed</span>
                          </div>
                          <p className="text-xs text-slate-500 mb-2">
                            These required elements weren't in your draft. Answer what applies. Non-critical items left blank become an explicit "Not documented this visit." — never invented.
                          </p>
                          {prefilledIds.size > 0 && (
                            <p className="text-xs text-violet-700 bg-violet-50 border border-violet-200 rounded-lg px-3 py-2 mb-3">
                              Some answers were carried from this patient's last visit — confirm each still applies before generating.
                            </p>
                          )}
                          <div className="space-y-3">
                            {gaps.map(g => {
                              const negConfirmed = confirmedNegatives.has(g.id);
                              return (
                                <div key={g.id} className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
                                  <div className="flex items-start gap-2">
                                    <Badge className={`shrink-0 text-xs ${g.severity === 'critical' ? 'bg-red-100 text-red-800' : 'bg-amber-100 text-amber-800'}`}>
                                      {g.severity === 'critical' ? 'required' : 'optional'}
                                    </Badge>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-start justify-between gap-2">
                                        <p className="text-sm font-medium text-slate-900">{g.question}</p>
                                        {prefilledIds.has(g.id) && (
                                          <span className="shrink-0 text-[10px] font-semibold text-violet-700 bg-violet-100 px-1.5 py-0.5 rounded-full">from last visit · confirm</span>
                                        )}
                                      </div>
                                      <p className="text-xs text-slate-400 mt-0.5">{g.copReference}</p>
                                    </div>
                                  </div>
                                  {g.standardNegative && (
                                    <label className="mt-2 flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                                      <input type="checkbox" checked={negConfirmed} onChange={() => toggleNegative(g.id)} className="w-4 h-4 text-indigo-600 rounded" />
                                      <span>Confirm: “{g.standardNegative.phrase}”</span>
                                    </label>
                                  )}
                                  {!negConfirmed && (
                                    <textarea
                                      value={answers[g.id] || ""}
                                      onChange={e => setAnswer(g.id, e.target.value)}
                                      placeholder="Type your answer — written into the note in compliant language…"
                                      className="mt-2 w-full text-sm border border-slate-200 rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-amber-300 focus:border-amber-400 outline-none resize-none min-h-[56px] leading-relaxed"
                                    />
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      <div className="flex gap-3">
                        <Button onClick={generateFinalNote} disabled={criticalUnanswered.length > 0} className="flex-1 bg-indigo-600 hover:bg-indigo-700 h-12 font-semibold gap-2">
                          <Sparkles className="w-4 h-4" /> Generate Final Note <ArrowRight className="w-4 h-4" />
                        </Button>
                        <Button variant="outline" onClick={() => setStep(1)} className="h-12 px-4">← Back</Button>
                      </div>
                    </>
                  )}

                  {/* FINAL NOTE + FACT-CHECK RESULT */}
                  {finalNote && (
                    <>
                      {fixRequired && fixRequired.offlinePending ? (
                        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 space-y-1">
                          <h3 className="font-semibold text-amber-800 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Saved offline — verification pending</h3>
                          <p className="text-sm text-amber-800">Every value was checked against your input. The AI grounding pass will run when you reconnect. Review carefully before pasting into the EMR.</p>
                        </div>
                      ) : fixRequired ? (
                        <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4 space-y-2">
                          <h3 className="font-semibold text-red-800 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Fix required before finalizing</h3>
                          {fixRequired.values?.length > 0 && (
                            <p className="text-sm text-red-800">Values not found in your input: <strong>{fixRequired.values.map(v => v.value).join(", ")}</strong></p>
                          )}
                          {fixRequired.sentences?.length > 0 && (
                            <div className="text-sm text-red-800">
                              Sentences not supported by your input:
                              <ul className="list-disc ml-5 mt-1 space-y-0.5">
                                {fixRequired.sentences.slice(0, 6).map((s, i) => <li key={i}>{s.text}</li>)}
                              </ul>
                            </div>
                          )}
                          {fixRequired.groundingError && <p className="text-sm text-red-700">Verification error: {fixRequired.groundingError}</p>}
                          <p className="text-xs text-red-600">Edit the note below to remove anything you didn't document, then re-check.</p>
                          <Button onClick={recheckNote} disabled={building} className="bg-red-600 hover:bg-red-700 h-9 gap-2 text-sm font-semibold">
                            <ShieldCheck className="w-4 h-4" /> Re-check
                          </Button>
                        </div>
                      ) : dirty ? (
                        <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 space-y-1">
                          <h3 className="font-semibold text-amber-800 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Edited since verification</h3>
                          <p className="text-sm text-amber-800">You changed the note after it was checked. Saving will re-verify your edits against what you wrote first.</p>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
                          <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" />
                          {saved ? "Saved to the patient's chart." : "Every value and statement in this note was verified against what you wrote. Copy it into your EMR, or save it to the chart."}
                        </div>
                      )}

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
                        finalNote={finalNote}
                        setFinalNote={setFinalNote}
                        onCopy={copy}
                        copied={copied}
                        patient={patient}
                        visitType={visitType}
                        analysisScore={liveCoverage}
                        analysis={{ overall_score: liveCoverage, compliance_score: liveCoverage, findings: [] }}
                        currentUser={currentUser}
                        signatureImage={signatureImage}
                        setSignatureImage={setSignatureImage}
                        onReset={reset}
                        originalNote={note}
                        noteSections={noteSections}
                        onSave={saveToChart}
                        saving={saving}
                        saved={saved && !dirty}
                        saveDisabled={saving || !!(fixRequired && !fixRequired.offlinePending) || !patientId}
                      />
                    </>
                  )}
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

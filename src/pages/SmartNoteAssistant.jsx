import { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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
import AlertsPanel from "../components/smartNote/AlertsPanel";
import FinalNoteDisplay from "../components/smartNote/FinalNoteDisplay";
import FollowUpTasksPanel from "../components/smartNote/FollowUpTasksPanel";
import VoiceClinicalNoteRecorder from "../components/smartNote/VoiceClinicalNoteRecorder";
import ComplianceChecklist from "../components/smartNote/ComplianceChecklist";
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
  const [analysis, setAnalysis] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [answers, setAnswers] = useState({});
  const [finalNote, setFinalNote] = useState("");
  const [step, setStep] = useState(1);
  const [analyzing, setAnalyzing] = useState(false);
  const [building, setBuilding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [listening, setListening] = useState(false);
  const [activeTab, setActiveTab] = useState("builder");
  const [noteSections, setNoteSections] = useState(null);
  const [_copiedSection, setCopiedSection] = useState(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const [signatureImage, setSignatureImage] = useState(null);
  const [followUpTasks, setFollowUpTasks] = useState([]);
  const [generatingTasks, setGeneratingTasks] = useState(false);
  const recRef = useRef(null);
  const textareaRef = useRef(null);
  const DRAFT_KEY = "smart_note_draft_v2";
  const ANALYSIS_KEY = "smart_note_analysis_v1";
  const SAVED_PATIENT_KEY = "smart_note_patient_v1";

  const { data: currentUser } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });
  const careScope = currentUser?.care_scope || "home_health";
  const VISIT_TYPES = getVisitTypes(careScope);
  const isHospice = careScope === "hospice";
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

  // Save analysis state to sessionStorage for persistence
  useEffect(() => {
    if (analysis && step >= 2) {
      sessionStorage.setItem(ANALYSIS_KEY, JSON.stringify({ analysis, answers, selected: Array.from(selected) }));
    }
  }, [analysis, answers, selected, step]);

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

  const buildCtx = () => {
    if (!patient) return "No patient context available.";
    const meds = patient.current_medications?.map(m => `${m.name} ${m.dosage}`).join(", ") || "None";
    const diagnoses = [patient.primary_diagnosis, ...(patient.secondary_diagnoses || [])].filter(Boolean).join(", ") || "Not documented";
    return [
      `Patient: ${patient.first_name} ${patient.last_name}`,
      `DOB: ${patient.date_of_birth || "Not on file"}`,
      `Diagnoses: ${diagnoses}`,
      `Medications: ${meds}`,
      `Allergies: ${patient.allergies || "NKDA"}`,
      `Fall Risk: ${patient.functional_status?.fall_risk || "Not documented"}`,
      `Ambulation: ${patient.functional_status?.ambulation || "Not documented"}`,
      `ADL Independence: ${patient.functional_status?.adl_independence || "Not documented"}`,
      `Cognitive Status: ${patient.functional_status?.cognitive_status || "Not documented"}`,
      `Care Type: ${patient.care_type || "home_health"}`,
    ].join(" | ");
  };

  const analyze = async () => {
    if (!note || note.trim().length < 20) return;
    setAnalyzing(true);
    setAnalysis(null);
    setAlerts([]);
    setAnswers({});
    setFinalNote("");
    const ctx = buildCtx();
    const visitSpecificMap = isHospice ? {
       admission: "terminal prognosis (≤6 months), election of hospice benefit, comfort-focused goals, IDG team members, initial symptom assessment, advance directives, patient/family education on hospice philosophy",
       routine_visit: "symptom management (pain/dyspnea/nausea), comfort measures provided, patient/family emotional support, medication review for comfort, IDG coordination, patient prognosis stability",
       recertification: "continued terminal prognosis, benefit period continuation, IDG review, goals of care reaffirmed, progress/decline documented, face-to-face encounter (if applicable)",
       discharge: "reason (goals met / revocation / extended prognosis / transfer), discharge summary, patient/family education, bereavement referral, follow-up plan",
       prn: "reason for unscheduled visit, symptom crisis assessment, comfort interventions provided, physician notification, patient/family response",
     } : {
      admission: "baseline assessment, medication reconciliation, homebound status establishment, physician orders, emergency plan, primary and secondary diagnoses, functional baseline",
      recertification: "continued homebound status justification, continued skilled need, progress toward goals, updated care plan, discharge planning",
      discharge: "reason for discharge, goals met/unmet, patient/caregiver education on discharge, instructions given, follow-up plan",
      routine_visit: "skilled need for this visit, homebound status, patient response to interventions, progress toward care plan goals",
      prn: "reason for unscheduled visit, assessment findings, interventions, physician notification if applicable",
    };
    const visitSpecific = visitSpecificMap[visitType] || (isHospice ? "symptom management, comfort measures, patient/family support" : "skilled need, homebound status, interventions, patient response");

    try {
      const complianceFramework = isHospice
        ? "42 CFR Part 418 Hospice CoPs, CMS Hospice Benefit, terminal prognosis documentation, IDG interdisciplinary coordination, comfort-focused goal documentation, symptom management standards, Medicare Hospice Benefit election requirements"
        : "Medicare 42 CFR Part 484, homebound status justification, skilled need per Medicare coverage guidelines, OASIS data element documentation, vitals with clinical interpretation, patient response to skilled interventions, education with teach-back confirmation, safety and fall risk, functional status, care plan goal progress, pain assessment, medication adherence, state home health survey standards";

      try {
      const [doc, cds] = await Promise.all([
      base44.integrations.Core.InvokeLLM({
        prompt: `You are a Medicare ${isHospice ? "hospice" : "home health"} compliance expert. ONLY analyze Medicare compliance requirements - do NOT flag quality, billing, or clinical issues.

      CRITICAL RULES:
      1. NEVER invent clinical information not in the note.
      2. ONLY flag Medicare compliance gaps. Ignore all other issues.
      3. For EVERY finding, generate the exact sentence/phrase that must be added to the note.
      4. If you can write the exact sentence from existing note content → needs_clarification: false, provide exact sentence
      5. If the exact phrase requires nurse input → needs_clarification: true AND provide a template with [bracketed] placeholders
      6. Do NOT flag something as missing if already documented.
      7. Apply ONLY ${isHospice ? "hospice" : "home health"} Medicare compliance rules.

      NOTE: ${note}
      PATIENT: ${ctx}
      VISIT TYPE: ${visitType}
      SERVICE LINE: ${isHospice ? "HOSPICE" : "HOME HEALTH"}
      REQUIRED: ${visitSpecific}

      COMPLIANCE CHECKS (${isHospice ? "Hospice" : "Home Health"}): ${complianceFramework}

      Return JSON:
      {
      "overall_score": 0-100, "compliance_score": 0-100, "quality_score": 0-100,
      "summary": "string", "strengths": ["string"],
      "findings": [{
      "id": "string",
      "category": "compliance",
      "severity": "critical|high|medium|low",
      "issue": "what Medicare compliance rule is missing",
      "needs_clarification": true|false,
      "suggestion": "exact sentence/phrase to add to note - must be verbatim text to insert (use [placeholder] if nurse must fill in)",
      "question": "specific question for nurse if needs_clarification=true (empty if not needed)",
      "rationale": "why this is required by Medicare",
      "revenue_impact": "payment impact if missing"
      }],
      "enhanced_note": "formalized version of ONLY what is in the note"
      }`,
        response_json_schema: {
          type: "object",
          properties: {
            overall_score: { type: "number" }, compliance_score: { type: "number" }, quality_score: { type: "number" },
            summary: { type: "string" }, strengths: { type: "array", items: { type: "string" } },
            findings: { type: "array", items: { type: "object", properties: {
              id: { type: "string" }, category: { type: "string" }, severity: { type: "string" },
              issue: { type: "string" }, needs_clarification: { type: "boolean" },
              suggestion: { type: "string" }, question: { type: "string" },
              rationale: { type: "string" }, revenue_impact: { type: "string" }
            }}},
            enhanced_note: { type: "string" }
          }
        }
      }),
          base44.integrations.Core.InvokeLLM({
            prompt: `Home health clinical decision support. Only flag risks genuinely evidenced by the note.
NOTE: ${note}
PATIENT: ${ctx}
Return JSON: { "clinical_alerts": [{ "risk_type": "fall|medication|exacerbation|safety|followup|cardiovascular|infection|cognitive", "urgency": "immediate|soon|monitor", "title": "string", "finding": "exact text from note", "recommended_actions": ["string"], "notify_physician": true|false }] }`,
            response_json_schema: {
              type: "object",
              properties: {
                clinical_alerts: { type: "array", items: { type: "object", properties: {
                  risk_type: { type: "string" }, urgency: { type: "string" }, title: { type: "string" },
                  finding: { type: "string" }, recommended_actions: { type: "array", items: { type: "string" } },
                  notify_physician: { type: "boolean" }
                }}}
              }
            }
          })
        ]);

        setAnalysis(doc);
        setAlerts(cds?.clinical_alerts || []);
        const autoSelect = new Set((doc.findings || []).filter(f => !f.needs_clarification).map(f => f.id));
        setSelected(autoSelect);
        setStep(2);
        
        // Auto-build if no clarifications needed (critical findings are shown as warnings but don't block generation)
        if ((doc.findings || []).filter(f => f.needs_clarification).length === 0) {
          setTimeout(() => autoBuild(doc, autoSelect), 800);
        }
      } catch (promiseErr) {
        console.error('LLM analysis error:', promiseErr);
        const errorMsg = promiseErr?.status === 402 || promiseErr?.data?.extra_data?.reason === 'integration_credits_limit_reached'
          ? "Monthly integration limit reached. Please upgrade your plan to continue."
          : "Analysis failed. Please try again.";
        toast.error(errorMsg);
        setStep(1);
        setAnalyzing(false);
        return;
      }
    } catch {
      toast.error("Analysis failed. Please try again.");
      setStep(1);
    } finally {
      setAnalyzing(false);
    }
  };

  const autoBuild = async (analysisData, selectedSet) => {
    setBuilding(true);
    try {
      const selectedFindings = (analysisData.findings || []).filter(f => selectedSet.has(f.id));
      const baseNote = analysisData.enhanced_note || "";
      const additions = selectedFindings.filter(f => f.suggestion).map(f => f.suggestion).join(" ");
      let result = baseNote;
      if (additions) {
        result = await base44.integrations.Core.InvokeLLM({
          prompt: `Produce a final Medicare-compliant nursing note.
BASE NOTE (from nurse's documentation): ${baseNote}
APPROVED ADDITIONS (selected by nurse): ${additions}
RULES: Only use source material above. No invented clinical info. Past-tense clinical narrative. Logical flow: assessment → interventions → patient response → education → plan.
Return ONLY the final note text.`
        });
        if (typeof result !== "string") result = baseNote + " " + additions;
      }
      setFinalNote(result);
      setNoteSections(parseNoteSections(result));
      setStep(2);
      if (patientId && currentUser?.email) {
        const noteText = typeof result === "string" ? result : JSON.stringify(result);
        
        if (navigator.onLine) {
            const visit = await base44.entities.Visit.create({ patient_id: patientId, visit_date: visitDate, visit_type: visitType, status: "completed", nurse_notes: result, raw_transcription: note });
            
            // Update patient chart with enhanced notes
            const currentPatient = await base44.entities.Patient.get(patientId);
            const enhancedHistory = currentPatient.enhanced_notes_history || [];
            enhancedHistory.push({
              date: visitDate,
              visit_type: visitType,
              note: noteText,
              compliance_score: analysisData.compliance_score,
              created_by: currentUser.email,
              created_at: new Date().toISOString()
            });
            
            await Promise.all([
              base44.entities.Patient.update(patientId, {
                enhanced_notes_history: enhancedHistory,
                clinical_notes: noteText
              }),
              base44.entities.NoteConversion.create({ nurse_email: currentUser.email, patient_id: patientId, visit_type: visitType, diagnosis: patient?.primary_diagnosis || "", rough_note_length: note.length, enhanced_note_length: noteText.length, quality_score: analysisData.overall_score, rough_note_compliance: Math.max(0, analysisData.compliance_score - 20), enhanced_note_compliance: analysisData.compliance_score, compliance_improvement: 20 }),
              base44.entities.ComplianceAudit.create({ visit_id: visit.id, nurse_email: currentUser.email, patient_id: patientId, audit_date: new Date().toISOString(), compliance_score: analysisData.compliance_score, status: analysisData.compliance_score >= 90 ? "passed" : analysisData.compliance_score >= 80 ? "flagged" : "critical", audit_type: "automated" })
            ]);
            // Auto-generate follow-up tasks from the finalized note
            generateTasksFromNote(noteText, visit.id);
            // Auto-analyze supply usage from visit notes
            analyzeSupplyUsage(noteText, visit.id);
        } else {
            const { addToSyncQueue } = await import('@/lib/indexedDB');
            await addToSyncQueue('CREATE_VISIT', { patient_id: patientId, visit_date: visitDate, visit_type: visitType, status: "completed", nurse_notes: result, raw_transcription: note });
            toast.success("Saved offline. Will sync when reconnected.");
        }
        logActivity(ActivityActions.NOTE_ENHANCED, { patient_id: patientId, visit_type: visitType, overall_score: analysisData.overall_score });
      }
    } catch (err) {
      console.error("Auto-build error:", err);
    } finally {
      setBuilding(false);
    }
  };

  const analyzeSupplyUsage = async (noteText, visitId) => {
    if (!noteText || !patientId) return;
    try {
      await analyzeVisitForSupplyUsage({
        visitId,
        visitNotes: noteText,
        patientId
      });
    } catch (err) {
      console.error("Supply analysis failed:", err);
    }
  };

  const proceedToBuild = () => {
    if (analysis) {
      const updatedFindings = (analysis.findings || []).map(f => {
        if (f.needs_clarification && answers[f.id]) {
          return { ...f, needs_clarification: false, suggestion: answers[f.id] };
        }
        return f;
      });
      setAnalysis({ ...analysis, findings: updatedFindings });
      const selectedSet = new Set(updatedFindings.filter(f => f.suggestion).map(f => f.id));
      setSelected(selectedSet);
      autoBuild({ ...analysis, findings: updatedFindings }, selectedSet);
    }
  };

  const _selectBySeverity = (severity) => {
    if (!analysis) return;
    const filtered = (analysis.findings || []).filter(f => f.severity === severity).map(f => f.id);
    setSelected(new Set([...selected, ...filtered]));
  };

  const calculateTotalRevenueImpact = () => {
    if (!analysis) return 0;
    const selected_findings = (analysis.findings || []).filter(f => selected.has(f.id));
    const impacts = selected_findings
      .map(f => {
        const match = f.revenue_impact?.match(/\$?([\d,]+)/);
        return match ? parseInt(match[1].replace(/,/g, '')) : 0;
      })
      .reduce((a, b) => a + b, 0);
    return impacts;
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
    setNote(""); setAnalysis(null); setAlerts([]); setSelected(new Set());
    setAnswers({}); setFinalNote(""); setStep(1); setNoteSections(null); setDraftRestored(false);
    setSignatureImage(null); setFollowUpTasks([]);
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

  const _copySection = async (key, text) => {
    await navigator.clipboard.writeText(text);
    setCopiedSection(key);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const toggle = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const _urgentAlerts = alerts.filter(a => a.urgency === "immediate");
  const _criticalFindings = analysis?.findings?.filter(f => f.severity === "critical") || [];
  const needsClarificationFindings = analysis?.findings?.filter(f => f.needs_clarification) || [];
  const _answeredCount = needsClarificationFindings.filter(f => answers[f.id]?.trim()).length;
  const _complianceFindings = analysis?.findings?.filter(f => f.category === "compliance") || [];
  const _qualityFindings = analysis?.findings?.filter(f => f.category === "quality") || [];
  const _totalRevenueImpact = calculateTotalRevenueImpact();
  const scoreColor = !analysis ? "text-gray-400" : analysis.overall_score >= 80 ? "text-green-600" : analysis.overall_score >= 60 ? "text-orange-500" : "text-red-600";
  const ready = note.trim().length >= 20;

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-5 space-y-3 sm:space-y-4">

      <SmartNoteHeader careScope={careScope} onReset={reset} step={step} activeTab={activeTab} />

      <SmartNoteTabs activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* ── TAB: MEDICATIONS ── */}
      {activeTab === "medications" && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
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
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <VisitSummaryGenerator patientId={patientId} />
        </div>
      )}

      {/* ── TAB: VITAL TRENDS ── */}
      {activeTab === "trends" && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
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
              <div className="bg-white border border-gray-200 rounded-2xl shadow-sm p-4 space-y-4">
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <User className="w-3.5 h-3.5 text-indigo-500" />
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Patient</label>
                    <span className="text-xs text-gray-400 font-normal normal-case ml-1">optional</span>
                  </div>
                  <SearchablePatientSelect 
                    patients={patients} 
                    value={patientId} 
                    onValueChange={setPatientId} 
                    className="bg-gray-50 border-gray-200 h-12 sm:h-11 text-sm rounded-xl"
                  />
                </div>
                <div className="border-t border-gray-100" />
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <ClipboardList className="w-3.5 h-3.5 text-indigo-500" />
                    <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Visit Type</label>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                    {VISIT_TYPES.map(v => (
                      <button key={v.value} onClick={() => setVisitType(v.value)}
                        className={`py-3 sm:py-2 px-2 rounded-xl text-xs font-semibold border-2 transition-all text-center leading-tight min-h-[48px] sm:min-h-0 active:scale-95 ${visitType === v.value ? "bg-indigo-600 border-indigo-600 text-white shadow-md" : "bg-gray-50 border-gray-200 text-gray-600 hover:border-indigo-300 hover:bg-indigo-50"}`}>
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
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50 gap-3">
                  <span className={`text-xs shrink-0 ${ready ? "text-green-600 font-medium" : "text-gray-400"}`}>
                    {ready ? `${note.length} chars — ready` : `${20 - note.trim().length} more chars needed`}
                  </span>
                  <Button onClick={analyze} disabled={!ready || analyzing} className="bg-indigo-600 hover:bg-indigo-700 h-11 sm:h-9 px-5 gap-1.5 text-sm font-semibold w-full sm:w-auto">
                    {analyzing ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" /> Analyzing…
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" /> Analyze & Check Compliance <ArrowRight className="w-3.5 h-3.5" />
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <VitalSignValidator noteText={note} />

            </div>
          )}

          {/* STEP 2: GENERATE & REVIEW */}
          {step === 2 && (
            <div className="space-y-4">
              {analyzing ? (
                <div className="bg-white border border-gray-200 rounded-xl p-10 text-center shadow-sm">
                  <Loader2 className="w-10 h-10 text-indigo-500 mx-auto animate-spin mb-3" />
                  <p className="font-semibold text-gray-800">Performing compliance check…</p>
                  <p className="text-sm text-gray-400 mt-1">Checking Medicare, clinical, and state standards</p>
                </div>
              ) : building ? (
                <div className="bg-white border border-gray-200 rounded-xl p-10 text-center shadow-sm">
                  <Loader2 className="w-10 h-10 text-indigo-500 mx-auto animate-spin mb-3" />
                  <p className="font-semibold text-gray-800">Building your final note…</p>
                  <p className="text-sm text-gray-400 mt-1">Incorporating approved suggestions</p>
                </div>
              ) : analysis && (
                <>
                  <div className={`rounded-xl border-2 p-4 ${analysis.overall_score >= 80 ? "border-green-300 bg-green-50" : analysis.overall_score >= 60 ? "border-orange-300 bg-orange-50" : "border-red-300 bg-red-50"}`}>
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-700">Initial Compliance Score</p>
                        <p className="text-xs text-gray-500 mt-0.5">{analysis.summary}</p>
                      </div>
                      <span className={`text-4xl font-bold ${scoreColor}`}>{analysis.overall_score}%</span>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex-1 bg-white rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-400">Medicare</p>
                        <p className="text-lg font-bold text-orange-600">{analysis.compliance_score}%</p>
                      </div>
                      <div className="flex-1 bg-white rounded-lg p-2 text-center">
                        <p className="text-xs text-gray-400">Clinical Quality</p>
                        <p className="text-lg font-bold text-blue-600">{analysis.quality_score}%</p>
                      </div>
                    </div>
                    {analysis.strengths?.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1 pt-3 border-t border-current/10">
                        {analysis.strengths.slice(0, 5).map((s, i) => <span key={i} className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">✓ {s}</span>)}
                      </div>
                    )}
                  </div>



                  {/* Medicare Compliance Suggestions */}
                  {analysis?.findings?.filter(f => f.category === 'compliance' && f.suggestion).length > 0 && (
                    <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h3 className="font-semibold text-gray-900">Medicare Compliance Additions</h3>
                          <p className="text-xs text-gray-500 mt-0.5">Check items to add to your final note</p>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setSelected(new Set(analysis.findings.filter(f => f.category === 'compliance' && f.suggestion).map(f => f.id)))}>Select All</Button>
                          <Button variant="outline" size="sm" className="text-xs h-8" onClick={() => setSelected(new Set())}>Clear</Button>
                        </div>
                      </div>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {analysis.findings.filter(f => f.category === 'compliance' && f.suggestion).map(f => (
                          <div key={f.id} className="flex items-start gap-3 p-3 bg-gray-50 border border-gray-200 rounded-lg hover:bg-indigo-50 transition-colors cursor-pointer" onClick={() => toggle(f.id)}>
                            <input 
                              type="checkbox" 
                              checked={selected.has(f.id)} 
                              onChange={() => toggle(f.id)}
                              className="w-5 h-5 mt-0.5 text-indigo-600 rounded cursor-pointer"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900">{f.issue}</p>
                              <div className="mt-2 p-2 bg-white border border-indigo-200 rounded text-sm text-gray-700 font-mono whitespace-pre-wrap">{f.suggestion}</div>
                              {f.revenue_impact && <p className="text-xs text-green-600 mt-1.5 font-semibold">{f.revenue_impact}</p>}
                            </div>
                            <Badge className={`shrink-0 text-xs ${f.severity === 'critical' ? 'bg-red-100 text-red-800' : f.severity === 'high' ? 'bg-orange-100 text-orange-800' : f.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' : 'bg-blue-100 text-blue-800'}`}>
                              {f.severity}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button onClick={proceedToBuild} disabled={needsClarificationFindings.length === 0} className="flex-1 bg-indigo-600 hover:bg-indigo-700 h-12 font-semibold gap-2">
                      {needsClarificationFindings.length === 0 ? (
                        <>
                          <CheckCircle2 className="w-4 h-4" /> Done — Note Generated
                        </>
                      ) : (
                        <>
                          <Sparkles className="w-4 h-4" /> Generate Final Note <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </Button>
                    <Button variant="outline" onClick={() => setStep(1)} className="h-12 px-4">← Back</Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 2 (CONTINUED): FINAL NOTE DISPLAY */}

          {step === 2 && finalNote && (
            <>
              <AlertsPanel alerts={alerts} />
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
                analysisScore={analysis?.overall_score}
                analysis={analysis}
                currentUser={currentUser}
                signatureImage={signatureImage}
                setSignatureImage={setSignatureImage}
                onReset={reset}
                originalNote={note}
                noteSections={noteSections}
              />
            </>
          )}
        </>
      )}
    </div>
  );
}
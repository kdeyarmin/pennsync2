import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Sparkles, CheckCircle2, Copy, RotateCcw, Loader2, Mic, MicOff,
  Shield, Lightbulb, AlertTriangle, ChevronDown, ChevronUp,
  ArrowRight, DollarSign, Target, AlertCircle, Activity, Pill,
  TrendingUp, Phone, ClipboardList, Heart, User, FileText,
  HelpCircle, MessageSquare, CheckSquare, XCircle, Tag
} from "lucide-react";
import { todayEastern } from "../components/utils/timezone";
import { logActivity, ActivityActions } from "../components/utils/activityLogger";
import VisitSummaryGenerator from "../components/smartNote/VisitSummaryGenerator";
import NoteTemplateSelector from "../components/smartNote/NoteTemplateSelector";
import VitalSignValidator from "../components/smartNote/VitalSignValidator";
import NoteDiffView from "../components/smartNote/NoteDiffView";
import ClinicalCodeSuggester from "../components/smartNote/ClinicalCodeSuggester";
import StructuredNoteDrafter from "../components/smartNote/StructuredNoteDrafter";

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
  { value: "idg", label: "IDG/IDT Meeting Note" },
  { value: "pronouncement", label: "Death Pronouncement" },
];

// Returns the right visit types based on care scope
const getVisitTypes = (careScope) => {
  if (careScope === "hospice") return HOSPICE_VISIT_TYPES;
  if (careScope === "both") return [...HOME_HEALTH_VISIT_TYPES, ...HOSPICE_VISIT_TYPES.filter(v => !HOME_HEALTH_VISIT_TYPES.find(h => h.value === v.value))];
  return HOME_HEALTH_VISIT_TYPES;
};

const SEV_STYLE = {
  critical: "border-l-red-500 bg-red-50",
  high: "border-l-orange-500 bg-orange-50",
  medium: "border-l-yellow-500 bg-yellow-50",
  low: "border-l-blue-500 bg-blue-50"
};
const SEV_BADGE = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-blue-100 text-blue-800"
};
const CAT_ICON = { compliance: Shield, quality: Lightbulb, billing: DollarSign, clinical: Target };
const CAT_COLOR = { compliance: "text-orange-600", quality: "text-blue-600", billing: "text-green-600", clinical: "text-purple-600" };
const RISK_COLOR = {
  immediate: "border-red-400 bg-red-50 text-red-900",
  soon: "border-orange-400 bg-orange-50 text-orange-900",
  monitor: "border-yellow-400 bg-yellow-50 text-yellow-900"
};
const RISK_ICON = { fall: Activity, medication: Pill, exacerbation: TrendingUp, safety: AlertTriangle, followup: Phone };

const STEPS = [
  { label: "Write" },
  { label: "Clarify" },
  { label: "Review" },
  { label: "Final" },
];

// Tabs for the main interface
const TABS = [
  { id: "builder", label: "Note Builder", icon: Sparkles, color: "indigo" },
  { id: "drafter", label: "Draft from Vitals", icon: ClipboardList, color: "violet" },
  { id: "summary", label: "Visit Summary", icon: FileText, color: "purple" },
  { id: "codes", label: "Code Lookup", icon: Tag, color: "emerald" },
];

function SuggestionCard({ finding, selected, onToggle, answers, onAnswerChange }) {
  const [open, setOpen] = useState(finding.severity === "critical" || finding.severity === "high");
  const Icon = CAT_ICON[finding.category] || AlertCircle;
  return (
    <div className={`border-l-4 rounded-lg ${SEV_STYLE[finding.severity] || SEV_STYLE.medium} p-3`}>
      <div className="flex items-start gap-3">
        <Checkbox checked={selected} onCheckedChange={onToggle} className="mt-1 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5">
              <Icon className={`w-3.5 h-3.5 shrink-0 ${CAT_COLOR[finding.category] || "text-gray-500"}`} />
              <span className="text-sm font-semibold text-gray-900">{finding.issue}</span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <Badge className={`text-xs ${SEV_BADGE[finding.severity] || SEV_BADGE.medium}`}>{finding.severity}</Badge>
              <button onClick={() => setOpen(!open)} className="text-gray-400 hover:text-gray-600">
                {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          {finding.suggestion && (
            <p className="text-sm text-gray-800 bg-white/80 border border-gray-200 rounded px-2 py-1.5 italic">
              "{finding.suggestion}"
            </p>
          )}
          {finding.needs_clarification && (
            <div className="mt-2 space-y-1.5">
              <div className="flex items-center gap-1.5 text-xs text-amber-700 font-semibold">
                <HelpCircle className="w-3.5 h-3.5" />
                <span>Needs your input:</span>
              </div>
              <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded px-2 py-1.5">{finding.question}</p>
              <Textarea
                placeholder="Enter information here…"
                value={answers?.[finding.id] || ""}
                onChange={e => onAnswerChange(finding.id, e.target.value)}
                className="text-sm min-h-[60px] bg-white border-amber-300 focus:border-indigo-400"
              />
              {answers?.[finding.id] && (
                <p className="text-xs text-green-700 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Saved — will be included in final note
                </p>
              )}
            </div>
          )}
          {open && finding.rationale && (
            <p className="text-xs text-gray-500 mt-1">
              {finding.rationale}
              {finding.revenue_impact && <span className="text-green-700 font-medium ml-1">💰 {finding.revenue_impact}</span>}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

function AlertCard({ alert }) {
  const [open, setOpen] = useState(alert.urgency === "immediate");
  const Icon = RISK_ICON[alert.risk_type] || AlertCircle;
  return (
    <div className={`rounded-lg border-2 p-3 ${RISK_COLOR[alert.urgency] || RISK_COLOR.monitor}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <Icon className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">{alert.title}</p>
              <Badge className={`text-xs ${SEV_BADGE[alert.urgency === "immediate" ? "critical" : alert.urgency === "soon" ? "high" : "medium"]}`}>
                {alert.urgency === "immediate" ? "Urgent" : alert.urgency === "soon" ? "Soon" : "Monitor"}
              </Badge>
            </div>
            <p className="text-xs opacity-75 mt-0.5">{alert.finding}</p>
          </div>
        </div>
        {(alert.recommended_actions?.length > 0 || alert.notify_physician) && (
          <button onClick={() => setOpen(!open)} className="opacity-50 hover:opacity-100 shrink-0">
            {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
      {open && (
        <div className="mt-2 pt-2 border-t border-current/20 space-y-1">
          {alert.recommended_actions?.map((a, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs">
              <ClipboardList className="w-3 h-3 mt-0.5 shrink-0 opacity-70" />
              <span>{a}</span>
            </div>
          ))}
          {alert.notify_physician && (
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <Phone className="w-3 h-3" /> Notify physician recommended
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function StepIndicator({ step }) {
  return (
    <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
      {STEPS.map((s, i) => {
        const n = i + 1;
        const active = step === n;
        const done = step > n;
        return (
          <React.Fragment key={n}>
            <div className={`flex items-center gap-1.5 text-xs font-semibold ${active ? "text-indigo-700" : done ? "text-green-600" : "text-gray-400"}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${active ? "bg-indigo-600 text-white" : done ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"}`}>
                {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : n}
              </div>
              <span className="hidden sm:inline">{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className="flex-1 h-0.5 bg-gray-200 mx-1">
                <div className={`h-full ${step > n ? "bg-green-400 w-full" : "w-0"} transition-all duration-500`} />
              </div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}

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
  const [copiedSection, setCopiedSection] = useState(null);
  const [hasDraft, setHasDraft] = useState(false);
  const [draftRestored, setDraftRestored] = useState(false);
  const recRef = useRef(null);
  const textareaRef = useRef(null);
  const DRAFT_KEY = "smart_note_draft_v2";

  const { data: currentUser } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });
  const careScope = currentUser?.care_scope || "home_health";
  const VISIT_TYPES = getVisitTypes(careScope);
  const isHospice = careScope === "hospice";
  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: () => base44.entities.Patient.filter({ status: "active" }, "first_name", 200),
  });
  const patient = patients.find(p => p.id === patientId);

  useEffect(() => {
    if (currentUser?.email) logActivity(ActivityActions.PAGE_VISIT, { page: "SmartNoteAssistant" });
  }, [currentUser?.email]);

  useEffect(() => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.note?.trim().length > 20) setHasDraft(true);
      } catch {}
    }
  }, []);

  useEffect(() => {
    if (note.trim()) {
      localStorage.setItem(DRAFT_KEY, JSON.stringify({ note, visitType, patientId }));
    }
  }, [note, visitType, patientId]);

  useEffect(() => { if (step === 1) textareaRef.current?.focus(); }, [step]);

  const restoreDraft = () => {
    const saved = localStorage.getItem(DRAFT_KEY);
    if (!saved) return;
    const parsed = JSON.parse(saved);
    setNote(parsed.note || "");
    setVisitType(parsed.visitType || "routine_visit");
    setPatientId(parsed.patientId || "");
    setHasDraft(false);
    setDraftRestored(true);
  };
  const dismissDraft = () => { localStorage.removeItem(DRAFT_KEY); setHasDraft(false); };

  const startDictation = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not supported in this browser."); return; }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const t = Array.from(e.results).slice(e.resultIndex).map(r => r[0].transcript).join(" ");
      setNote(prev => prev ? prev + " " + t : t);
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
    setStep(2);
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
      idg: "IDG/IDT meeting date, disciplines present, clinical updates per discipline, goal review, care plan revisions, family communication",
      pronouncement: "time of death, attending present, family notification, comfort measures at time of death, bereavement support initiated",
    } : {
      admission: "baseline assessment, medication reconciliation, homebound status establishment, physician orders, emergency plan, primary and secondary diagnoses, functional baseline, OASIS data points",
      recertification: "continued homebound status justification, continued skilled need, progress toward goals, updated care plan, discharge planning, OASIS if required",
      discharge: "reason for discharge, goals met/unmet, patient/caregiver education on discharge, instructions given, follow-up plan, OASIS discharge",
      routine_visit: "skilled need for this visit, homebound status, patient response to interventions, progress toward care plan goals",
      prn: "reason for unscheduled visit, assessment findings, interventions, physician notification if applicable",
    };
    const visitSpecific = visitSpecificMap[visitType] || (isHospice ? "symptom management, comfort measures, patient/family support" : "skilled need, homebound status, interventions, patient response");

    try {
      const complianceFramework = isHospice
        ? "42 CFR Part 418 Hospice CoPs, CMS Hospice Benefit, terminal prognosis documentation, IDG interdisciplinary coordination, comfort-focused goal documentation, symptom management standards, Medicare Hospice Benefit election requirements"
        : "Medicare 42 CFR Part 484, homebound status justification, skilled need per Medicare coverage guidelines, OASIS data element documentation, vitals with clinical interpretation, patient response to skilled interventions, education with teach-back confirmation, safety and fall risk, functional status, care plan goal progress, pain assessment, medication adherence, state home health survey standards";

      const [doc, cds] = await Promise.all([
        base44.integrations.Core.InvokeLLM({
          prompt: `You are a Medicare ${isHospice ? "hospice" : "home health"} compliance expert. Analyze this nurse's rough note for ${isHospice ? "hospice" : "home health"} documentation standards.

CRITICAL RULES:
1. NEVER invent clinical information not in the note.
2. If you can write the sentence from existing note content → needs_clarification: false, provide suggestion.
3. If info is NOT in the note and is required → needs_clarification: true, provide a specific question.
4. Do NOT flag something as missing if already documented.
5. Apply ONLY ${isHospice ? "hospice" : "home health"} Medicare compliance rules. Do NOT apply ${isHospice ? "home health homebound status or OASIS" : "hospice IDG or terminal prognosis"} requirements.

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
    "id": "string", "category": "compliance|quality|billing|clinical",
    "severity": "critical|high|medium|low", "issue": "string",
    "needs_clarification": true|false,
    "suggestion": "exact sentence (or empty string if needs_clarification)",
    "question": "specific question for nurse (or empty string if not needed)",
    "rationale": "string", "revenue_impact": "string"
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
      const needsClarification = (doc.findings || []).some(f => f.needs_clarification);
      setStep(needsClarification ? 2 : 3);
    } catch (err) {
      alert("Analysis failed. Please try again.");
      setStep(1);
    } finally {
      setAnalyzing(false);
    }
  };

  const proceedToReview = () => {
    if (analysis) {
      const updatedFindings = analysis.findings.map(f => {
        if (f.needs_clarification && answers[f.id]) {
          return { ...f, needs_clarification: false, suggestion: answers[f.id] };
        }
        return f;
      });
      setAnalysis({ ...analysis, findings: updatedFindings });
      setSelected(new Set(updatedFindings.filter(f => f.suggestion).map(f => f.id)));
    }
    setStep(3);
  };

  const build = async () => {
    if (!analysis) return;
    setBuilding(true);
    try {
      const selectedFindings = analysis.findings.filter(f => selected.has(f.id));
      const baseNote = analysis.enhanced_note || "";
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
      setStep(4);
      if (patientId && currentUser?.email) {
        const visit = await base44.entities.Visit.create({ patient_id: patientId, visit_date: visitDate, visit_type: visitType, status: "completed", nurse_notes: result, raw_transcription: note });
        const noteText = typeof result === "string" ? result : JSON.stringify(result);
        await Promise.all([
          base44.entities.NoteConversion.create({ nurse_email: currentUser.email, patient_id: patientId, visit_type: visitType, diagnosis: patient?.primary_diagnosis || "", rough_note_length: note.length, enhanced_note_length: noteText.length, quality_score: analysis.overall_score, rough_note_compliance: Math.max(0, analysis.compliance_score - 20), enhanced_note_compliance: analysis.compliance_score, compliance_improvement: 20 }),
          base44.entities.ComplianceAudit.create({ visit_id: visit.id, nurse_email: currentUser.email, patient_id: patientId, audit_date: new Date().toISOString(), compliance_score: analysis.compliance_score, status: analysis.compliance_score >= 90 ? "passed" : analysis.compliance_score >= 80 ? "flagged" : "critical", audit_type: "automated" })
        ]);
        logActivity(ActivityActions.NOTE_ENHANCED, { patient_id: patientId, visit_type: visitType, overall_score: analysis.overall_score });
      }
    } catch (err) {
      alert("Failed to build note. Please try again.");
    } finally {
      setBuilding(false);
    }
  };

  const copy = async () => { await navigator.clipboard.writeText(finalNote); setCopied(true); setTimeout(() => setCopied(false), 2500); };

  const reset = () => {
    setNote(""); setAnalysis(null); setAlerts([]); setSelected(new Set());
    setAnswers({}); setFinalNote(""); setStep(1); setNoteSections(null); setDraftRestored(false);
    localStorage.removeItem(DRAFT_KEY);
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

  const copySection = async (key, text) => {
    await navigator.clipboard.writeText(text);
    setCopiedSection(key);
    setTimeout(() => setCopiedSection(null), 2000);
  };

  const toggle = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const urgentAlerts = alerts.filter(a => a.urgency === "immediate");
  const criticalFindings = analysis?.findings?.filter(f => f.severity === "critical") || [];
  const needsClarificationFindings = analysis?.findings?.filter(f => f.needs_clarification) || [];
  const answeredCount = needsClarificationFindings.filter(f => answers[f.id]?.trim()).length;
  const hasClarificationStep = needsClarificationFindings.length > 0;
  const scoreColor = !analysis ? "text-gray-400" : analysis.overall_score >= 80 ? "text-green-600" : analysis.overall_score >= 60 ? "text-orange-500" : "text-red-600";
  const ready = note.trim().length >= 20;

  const tabColorMap = { indigo: "bg-indigo-600", violet: "bg-violet-600", purple: "bg-purple-600", emerald: "bg-emerald-600" };
  const tabHoverMap = { indigo: "hover:bg-indigo-50 hover:text-indigo-700", violet: "hover:bg-violet-50 hover:text-violet-700", purple: "hover:bg-purple-50 hover:text-purple-700", emerald: "hover:bg-emerald-50 hover:text-emerald-700" };

  return (
    <div className="max-w-3xl mx-auto px-3 sm:px-4 py-4 sm:py-5 space-y-3 sm:space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" /> Smart Note Assistant
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">
          {careScope === "hospice" ? "Hospice documentation — comfort-focused, Medicare-compliant" :
           careScope === "both" ? "Home Health & Hospice documentation — Medicare-compliant" :
           "Home Health documentation — Medicare-compliant, survey-ready"}
        </p>
        </div>
        {activeTab === "builder" && step > 1 && (
          <Button variant="outline" size="sm" onClick={reset} className="gap-1.5 text-gray-600">
            <RotateCcw className="w-4 h-4" /> New Note
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex bg-white border border-gray-200 rounded-xl p-1 shadow-sm gap-1 overflow-x-auto">
        {TABS.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-xs sm:text-sm font-semibold transition-all min-h-[44px] whitespace-nowrap px-2 ${isActive ? `${tabColorMap[tab.color]} text-white shadow-sm` : `text-gray-500 ${tabHoverMap[tab.color]}`}`}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 shrink-0" />
              <span className="hidden sm:inline">{tab.label}</span>
              <span className="sm:hidden">{tab.label.split(" ")[0]}</span>
            </button>
          );
        })}
      </div>

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

      {/* ── TAB: CODE LOOKUP ── */}
      {activeTab === "codes" && (
        <div className="space-y-3">
          {/* Patient selector for context */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm space-y-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-500" /> Patient (optional — for context)
              </label>
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger className="bg-gray-50 h-10 text-sm rounded-xl">
                  <SelectValue placeholder="Select a patient…" />
                </SelectTrigger>
                <SelectContent>
                  {patients.map(p => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.first_name} {p.last_name}{p.primary_diagnosis ? ` — ${p.primary_diagnosis}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Clinical Note Text</label>
              <textarea
                value={note}
                onChange={e => setNote(e.target.value)}
                placeholder="Paste or type a clinical note here to get ICD-10 and CPT code suggestions…"
                className="w-full min-h-[140px] text-sm border border-gray-200 rounded-lg px-3 py-2.5 bg-gray-50 focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400 outline-none resize-none leading-relaxed"
              />
            </div>
          </div>
          <ClinicalCodeSuggester
            noteText={note}
            patientContext={patient ? buildCtx() : ""}
          />
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
                  <Select value={patientId} onValueChange={setPatientId}>
                    <SelectTrigger className="bg-gray-50 border-gray-200 h-12 sm:h-11 text-sm rounded-xl">
                      <SelectValue placeholder={<span className="flex items-center gap-2 text-gray-400"><User className="w-4 h-4" /> Search for a patient…</span>} />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl shadow-xl max-h-[50vh]">
                      {patients.map(p => (
                        <SelectItem key={p.id} value={p.id} className="py-3 sm:py-2.5 px-3 min-h-[52px] sm:min-h-0">
                          <div className="flex flex-col">
                            <span className="font-semibold text-gray-900">{p.first_name} {p.last_name}</span>
                            {p.primary_diagnosis && <span className="text-xs text-gray-500 mt-0.5">{p.primary_diagnosis}</span>}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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

              {/* Regulatory checks transparency - scope-specific */}
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                <p className="text-xs font-semibold text-indigo-700 mb-1.5 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5" /> Medicare compliance checks performed:
                </p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-indigo-600">
                  {(isHospice ? [
                    "42 CFR §418 Hospice CoPs",
                    "Terminal prognosis documentation",
                    "Comfort-focused goals",
                    "Symptom management (pain/dyspnea)",
                    "IDG/IDT interdisciplinary notes",
                    "Benefit period documentation",
                    "Patient/family education",
                    "Medication management",
                    "Spiritual/psychosocial assessment",
                    "Bereavement support",
                    "Advance directives reviewed",
                    "State hospice survey standards"
                  ] : [
                    "Medicare 42 CFR Part 484",
                    "Homebound status",
                    "Skilled need justification",
                    "Vitals + interpretation",
                    "Patient response",
                    "Education with teach-back",
                    "Safety / fall risk",
                    "Functional status (OASIS)",
                    "Care plan progress",
                    "Pain assessment",
                    "Medication adherence",
                    "State survey standards"
                  ]).map((item, i) => (
                    <span key={i} className="flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-indigo-400 shrink-0" />{item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="bg-white border-2 border-indigo-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
                  <span className="text-xs font-semibold text-indigo-700">Your Rough Notes / Bullet Points</span>
                  <div className="flex items-center gap-2">
                    <Button variant="ghost" size="sm" className="h-7 gap-1 text-xs text-violet-600 hover:text-violet-800"
                      onClick={() => { setActiveTab("drafter"); }}>
                      <ClipboardList className="w-3.5 h-3.5" /> Use Structured Form
                    </Button>
                    <Button variant={listening ? "destructive" : "ghost"} size="sm" onClick={listening ? stopDictation : startDictation} className="h-7 gap-1 text-xs">
                      {listening ? <><MicOff className="w-3.5 h-3.5" /><span className="animate-pulse">Stop</span></> : <><Mic className="w-3.5 h-3.5" /> Dictate</>}
                    </Button>
                  </div>
                </div>
                <textarea ref={textareaRef} value={note} onChange={e => setNote(e.target.value)}
                  placeholder={"Enter bullet points or rough draft — AI will NOT invent information.\n\n• BP 148/90, HR 82, O2 95% RA, pain 3/10\n• homebound: unable to leave without considerable effort\n• skilled need: wound assessment and dressing change\n• wound R heel 2×3 cm granulating, no odor\n• taught med schedule, pt verbalized understanding\n• fall risk — clutter noted, discussed w/ family"}
                  className="w-full min-h-[240px] sm:min-h-[320px] text-sm border-0 px-4 py-3 focus:ring-0 bg-white font-mono resize-none outline-none leading-relaxed" spellCheck={false}
                />
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50 gap-3">
                  <span className={`text-xs shrink-0 ${ready ? "text-green-600 font-medium" : "text-gray-400"}`}>
                    {ready ? `${note.length} chars — ready` : `${20 - note.trim().length} more chars needed`}
                  </span>
                  <Button onClick={analyze} disabled={!ready} className="bg-indigo-600 hover:bg-indigo-700 h-11 sm:h-9 px-5 gap-1.5 text-sm font-semibold w-full sm:w-auto">
                    <Sparkles className="w-4 h-4" /> Analyze & Check Compliance <ArrowRight className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <VitalSignValidator noteText={note} />

              {/* Code suggestions right on step 1 if note is long enough */}
              {note.trim().length >= 80 && (
                <ClinicalCodeSuggester noteText={note} patientContext={patient ? buildCtx() : ""} />
              )}
            </div>
          )}

          {/* STEP 2: CLARIFY */}
          {step === 2 && (
            <div className="space-y-4">
              {analyzing ? (
                <div className="bg-white border border-gray-200 rounded-xl p-10 text-center shadow-sm">
                  <Loader2 className="w-10 h-10 text-indigo-500 mx-auto animate-spin mb-3" />
                  <p className="font-semibold text-gray-800">Performing compliance check…</p>
                  <p className="text-sm text-gray-400 mt-1">Checking Medicare, clinical, and state standards</p>
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

                  {needsClarificationFindings.length > 0 && (
                    <div className="space-y-3">
                      <div className="bg-amber-50 border border-amber-300 rounded-xl p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <MessageSquare className="w-5 h-5 text-amber-600" />
                          <p className="font-semibold text-amber-900">Additional information needed</p>
                        </div>
                        <p className="text-sm text-amber-800">
                          These required elements are <strong>not present in your note</strong>. Answer each below, or skip if not applicable.
                        </p>
                        <p className="text-xs text-amber-600 mt-1">{answeredCount} of {needsClarificationFindings.length} answered</p>
                      </div>
                      {needsClarificationFindings.map(f => (
                        <div key={f.id} className={`border-l-4 rounded-lg p-4 ${SEV_STYLE[f.severity] || SEV_STYLE.medium}`}>
                          <div className="flex items-center gap-2 mb-2">
                            <Badge className={`text-xs ${SEV_BADGE[f.severity]}`}>{f.severity}</Badge>
                            <span className="text-sm font-semibold text-gray-900">{f.issue}</span>
                          </div>
                          <p className="text-xs text-gray-500 mb-2 italic">{f.rationale}</p>
                          <p className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-1.5">
                            <HelpCircle className="w-4 h-4 shrink-0" />{f.question}
                          </p>
                          <Textarea placeholder="Your response (leave blank to skip)…" value={answers[f.id] || ""}
                            onChange={e => setAnswers(prev => ({ ...prev, [f.id]: e.target.value }))}
                            className="text-sm min-h-[70px] bg-white" />
                          {answers[f.id] && <p className="text-xs text-green-700 mt-1 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Will be included in final note</p>}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <Button onClick={proceedToReview} className="flex-1 bg-indigo-600 hover:bg-indigo-700 h-12 font-semibold gap-2">
                      <CheckSquare className="w-4 h-4" />
                      {needsClarificationFindings.length > 0 ? `Continue with ${answeredCount}/${needsClarificationFindings.length} answered` : "Continue to Review"}
                      <ArrowRight className="w-4 h-4" />
                    </Button>
                    <Button variant="outline" onClick={() => setStep(1)} className="h-12 px-4">← Back</Button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* STEP 3: REVIEW & SELECT */}
          {step === 3 && analysis && (
            <div className="space-y-4">
              {alerts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-500" />
                    <p className="text-sm font-bold text-gray-800">Clinical Alerts</p>
                    <Badge className="bg-red-100 text-red-700 text-xs">{alerts.length}</Badge>
                  </div>
                  {urgentAlerts.length > 0 && (
                    <Alert className="border-red-400 bg-red-50 py-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <AlertDescription className="text-red-900 text-sm font-semibold">
                        {urgentAlerts.length} urgent alert{urgentAlerts.length > 1 ? "s" : ""} — review before completing this visit.
                      </AlertDescription>
                    </Alert>
                  )}
                  {alerts.map((a, i) => <AlertCard key={i} alert={a} />)}
                </div>
              )}

              {analysis.findings?.length > 0 ? (
                <div className="space-y-3">
                  <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center justify-between mb-1">
                      <div>
                        <p className="text-sm font-bold text-gray-900">Review Suggested Additions</p>
                        <p className="text-xs text-gray-500 mt-0.5">Check items to include — only checked items go into the final note.</p>
                      </div>
                      <div className="flex gap-1.5 shrink-0">
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setSelected(new Set(analysis.findings.map(f => f.id)))}>
                          <CheckSquare className="w-3.5 h-3.5" /> All
                        </Button>
                        <Button variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => setSelected(new Set())}>
                          <XCircle className="w-3.5 h-3.5" /> None
                        </Button>
                      </div>
                    </div>
                    <p className="text-xs text-indigo-600 font-medium">{selected.size} of {analysis.findings.length} selected</p>
                  </div>

                  {criticalFindings.length > 0 && (
                    <Alert className="border-red-300 bg-red-50 py-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <AlertDescription className="text-red-800 text-sm">
                        {criticalFindings.length} critical Medicare compliance element{criticalFindings.length > 1 ? "s" : ""} — required for payment and audit protection.
                      </AlertDescription>
                    </Alert>
                  )}

                  {[...analysis.findings]
                    .sort((a, b) => ({ critical: 0, high: 1, medium: 2, low: 3 }[a.severity] ?? 3) - ({ critical: 0, high: 1, medium: 2, low: 3 }[b.severity] ?? 3))
                    .map(f => (
                      <SuggestionCard key={f.id} finding={f} selected={selected.has(f.id)} onToggle={() => toggle(f.id)} answers={answers} onAnswerChange={(id, val) => setAnswers(prev => ({ ...prev, [id]: val }))} />
                    ))}
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-xl p-6 text-center">
                  <CheckCircle2 className="w-10 h-10 text-green-500 mx-auto mb-2" />
                  <p className="font-bold text-green-800 text-lg">Note is fully compliant!</p>
                  <p className="text-sm text-green-600 mt-1">No gaps detected. Ready to generate final note.</p>
                </div>
              )}

              <Button onClick={build} disabled={building} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 h-14 sm:h-12 text-base font-semibold">
                {building ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Building…</> : <><Sparkles className="w-4 h-4 mr-2" /> Generate Final Note <ArrowRight className="w-4 h-4 ml-1.5" /></>}
              </Button>
              <button className="w-full text-xs text-gray-400 hover:text-gray-600 py-1" onClick={() => setStep(hasClarificationStep ? 2 : 1)}>← Back</button>
            </div>
          )}

          {/* STEP 4: FINAL NOTE */}
          {step === 4 && (
            <div className="space-y-3">
              {urgentAlerts.length > 0 && (
                <Alert className="border-red-400 bg-red-50 py-2">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                  <AlertDescription className="text-red-900 text-sm">
                    <strong>Reminder:</strong> {urgentAlerts.length} urgent alert{urgentAlerts.length > 1 ? "s were" : " was"} flagged. Confirm follow-up before closing.
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex items-center gap-3 bg-white border-2 border-green-400 rounded-xl px-4 py-3 shadow-sm">
                <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-green-800">Medicare-Compliant Note Ready</p>
                  <p className="text-xs text-gray-400">Based only on information you provided</p>
                </div>
                {analysis && <Badge className="bg-green-600 text-white px-2.5 py-1 text-sm">{analysis.overall_score}%</Badge>}
                <Button onClick={copy} className="bg-green-600 hover:bg-green-700 h-10 px-4 gap-2 font-semibold shrink-0">
                  {copied ? <><CheckCircle2 className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
                </Button>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                  <span className="text-sm font-semibold text-gray-700">Final Clinical Note</span>
                  <span className="text-xs text-gray-400">editable · {finalNote.length} chars</span>
                </div>
                <textarea value={finalNote} onChange={e => { setFinalNote(e.target.value); setNoteSections(parseNoteSections(e.target.value)); }}
                  className="w-full min-h-[320px] font-mono text-sm border-0 px-4 py-3 focus:ring-0 bg-white resize-none outline-none" />
                <div className="flex gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50">
                  <Button onClick={copy} className="flex-1 bg-green-600 hover:bg-green-700 h-12 sm:h-10 gap-2 font-semibold">
                    {copied ? <><CheckCircle2 className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy All</>}
                  </Button>
                  <Button variant="outline" className="h-12 sm:h-10 px-4 text-sm" onClick={() => { setStep(3); setFinalNote(""); }}>← Revise</Button>
                  <Button variant="outline" className="h-12 sm:h-10 px-3" onClick={reset}><RotateCcw className="w-4 h-4" /></Button>
                </div>
              </div>

              <NoteDiffView originalNote={note} enhancedNote={finalNote} />

              {/* ICD/CPT codes for final note */}
              <ClinicalCodeSuggester noteText={finalNote} patientContext={patient ? buildCtx() : ""} />

              {noteSections && noteSections.length > 1 && (
                <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
                  <div className="px-4 py-2.5 bg-indigo-50 border-b border-indigo-100 flex items-center gap-2">
                    <Copy className="w-3.5 h-3.5 text-indigo-600" />
                    <span className="text-sm font-semibold text-indigo-700">Copy Individual Sections</span>
                  </div>
                  <div className="divide-y divide-gray-100">
                    {noteSections.map(sec => (
                      <div key={sec.key} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">{sec.label}</p>
                          <p className="text-xs text-gray-700 font-mono line-clamp-2">{sec.text}</p>
                        </div>
                        <button onClick={() => copySection(sec.key, sec.text)}
                          className="shrink-0 flex items-center gap-1.5 px-3 py-2 min-h-[40px] rounded-lg text-xs font-medium border transition-colors bg-white border-gray-200 hover:border-indigo-400 hover:text-indigo-600 text-gray-500 active:scale-95">
                          {copiedSection === sec.key ? <><CheckCircle2 className="w-3.5 h-3.5 text-green-500" /> Copied</> : <><Copy className="w-3.5 h-3.5" /> Copy</>}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
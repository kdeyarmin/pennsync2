import React, { useState, useRef, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sparkles, CheckCircle2, Copy, RotateCcw, Loader2, Mic, MicOff,
  Shield, Lightbulb, AlertTriangle, ChevronDown, ChevronUp,
  ArrowRight, DollarSign, Target, AlertCircle, Activity, Pill,
  TrendingUp, Phone, ClipboardList, Heart, User, FileText
} from "lucide-react";
import { todayEastern } from "../components/utils/timezone";
import { logActivity, ActivityActions } from "../components/utils/activityLogger";
import VisitSummaryGenerator from "../components/smartNote/VisitSummaryGenerator";

const VISIT_TYPES = [
  { value: "routine_visit", label: "Routine Visit" },
  { value: "admission", label: "Admission" },
  { value: "recertification", label: "Recertification" },
  { value: "discharge", label: "Discharge" },
  { value: "prn", label: "PRN Visit" },
];

const SEV_STYLE = { critical: "border-l-red-500 bg-red-50", high: "border-l-orange-500 bg-orange-50", medium: "border-l-yellow-500 bg-yellow-50", low: "border-l-blue-500 bg-blue-50" };
const SEV_BADGE = { critical: "bg-red-100 text-red-800", high: "bg-orange-100 text-orange-800", medium: "bg-yellow-100 text-yellow-800", low: "bg-blue-100 text-blue-800" };
const CAT_ICON  = { compliance: Shield, quality: Lightbulb, billing: DollarSign, clinical: Target };
const CAT_COLOR = { compliance: "text-orange-600", quality: "text-blue-600", billing: "text-green-600", clinical: "text-purple-600" };
const RISK_ICON = { fall: Activity, medication: Pill, exacerbation: TrendingUp, safety: AlertTriangle, followup: Phone };
const RISK_COLOR = { immediate: "border-red-400 bg-red-50 text-red-900", soon: "border-orange-400 bg-orange-50 text-orange-900", monitor: "border-yellow-400 bg-yellow-50 text-yellow-900" };

function SuggestionCard({ finding, selected, onToggle }) {
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
          <p className="text-sm text-gray-800 bg-white/80 border border-gray-200 rounded px-2 py-1.5 italic">"{finding.suggestion}"</p>
          {open && <p className="text-xs text-gray-500 mt-1">{finding.rationale}{finding.revenue_impact && <span className="text-green-700 font-medium ml-1">💰 {finding.revenue_impact}</span>}</p>}
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
            <div key={i} className="flex items-start gap-1.5 text-xs"><ClipboardList className="w-3 h-3 mt-0.5 shrink-0 opacity-70" /><span>{a}</span></div>
          ))}
          {alert.notify_physician && <div className="flex items-center gap-1.5 text-xs font-semibold"><Phone className="w-3 h-3" /> Notify physician recommended</div>}
        </div>
      )}
    </div>
  );
}

export default function SmartNoteAssistant() {
  const [patientId, setPatientId] = useState("");
  const [visitType, setVisitType] = useState("routine_visit");
  const [visitDate] = useState(todayEastern());
  const [note, setNote] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [selected, setSelected] = useState(new Set());
  const [finalNote, setFinalNote] = useState("");
  const [step, setStep] = useState(1);
  const [analyzing, setAnalyzing] = useState(false);
  const [building, setBuilding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [listening, setListening] = useState(false);
  const [activeTab, setActiveTab] = useState("write"); // "write" | "summary"
  const [noteSections, setNoteSections] = useState(null);
  const [copiedSection, setCopiedSection] = useState(null);
  const recRef = useRef(null);
  const textareaRef = useRef(null);

  const { data: currentUser } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });
  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: () => base44.entities.Patient.filter({ status: "active" }, "first_name", 200),
  });
  const patient = patients.find(p => p.id === patientId);

  useEffect(() => {
    if (currentUser?.email) logActivity(ActivityActions.PAGE_VISIT, { page: "SmartNoteAssistant" });
  }, [currentUser?.email]);

  // Auto-focus textarea on step 1
  useEffect(() => { if (step === 1) textareaRef.current?.focus(); }, [step]);

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
    if (!patient) return "No patient selected";
    const meds = patient.current_medications?.map(m => `${m.name} ${m.dosage}`).join(", ") || "None";
    return `${patient.first_name} ${patient.last_name} | DOB: ${patient.date_of_birth || "?"} | Dx: ${patient.primary_diagnosis || "?"} | Meds: ${meds} | Allergies: ${patient.allergies || "NKDA"} | Fall Risk: ${patient.functional_status?.fall_risk || "?"} | Ambulation: ${patient.functional_status?.ambulation || "?"}`;
  };

  const analyze = async () => {
    if (!note || note.trim().length < 20) return;
    setAnalyzing(true);
    setStep(2);
    setAnalysis(null);
    setAlerts([]);
    setFinalNote("");

    const ctx = buildCtx();
    try {
      const [doc, cds] = await Promise.all([
        base44.integrations.Core.InvokeLLM({
          prompt: `You are a Medicare home health documentation specialist. Analyze this nursing note for compliance gaps.

NOTE: ${note}
PATIENT: ${ctx}
VISIT TYPE: ${visitType}

Check for: homebound status, skilled need justification, vital signs with interpretation, patient response to interventions, education with teach-back, safety assessment, functional status, care plan progress${visitType === "admission" ? ", baseline assessment, medication reconciliation, emergency plan" : ""}${visitType === "recertification" ? ", continued homebound status, continued skilled need, discharge planning" : ""}${visitType === "discharge" ? ", reason for discharge, goals met/unmet, discharge instructions" : ""}.

For each gap provide the EXACT clinical sentence to add — not instructions like "document X".

Also produce a complete Medicare-compliant enhanced note (no headers, no patient names inline, just clinical narrative).

Return JSON: { "overall_score": 0-100, "compliance_score": 0-100, "quality_score": 0-100, "summary": "string", "findings": [{ "id": "string", "category": "compliance|quality|billing|clinical", "severity": "critical|high|medium|low", "issue": "string", "suggestion": "string", "rationale": "string", "revenue_impact": "string" }], "strengths": ["string"], "enhanced_note": "string" }`,
          response_json_schema: {
            type: "object",
            properties: {
              overall_score: { type: "number" }, compliance_score: { type: "number" }, quality_score: { type: "number" },
              summary: { type: "string" },
              findings: { type: "array", items: { type: "object", properties: { id: { type: "string" }, category: { type: "string" }, severity: { type: "string" }, issue: { type: "string" }, suggestion: { type: "string" }, rationale: { type: "string" }, revenue_impact: { type: "string" } } } },
              strengths: { type: "array", items: { type: "string" } },
              enhanced_note: { type: "string" }
            }
          }
        }),
        base44.integrations.Core.InvokeLLM({
          prompt: `You are a home health clinical decision support system. Review this note for safety risks and required follow-up.

NOTE: ${note}
PATIENT: ${ctx}

Flag only issues genuinely evidenced by the notes. Check: fall risk, medication concerns, condition exacerbation, vital sign alerts, wound/infection signs, cognitive changes, safety hazards, required follow-up actions.

Return JSON: { "clinical_alerts": [{ "risk_type": "fall|medication|exacerbation|safety|followup|cardiovascular|infection|cognitive", "urgency": "immediate|soon|monitor", "title": "string", "finding": "string", "recommended_actions": ["string"], "notify_physician": true|false }] }`,
          response_json_schema: {
            type: "object",
            properties: {
              clinical_alerts: { type: "array", items: { type: "object", properties: { risk_type: { type: "string" }, urgency: { type: "string" }, title: { type: "string" }, finding: { type: "string" }, recommended_actions: { type: "array", items: { type: "string" } }, notify_physician: { type: "boolean" } } } }
            }
          }
        })
      ]);

      setAnalysis(doc);
      setAlerts(cds?.clinical_alerts || []);
      // Auto-select ALL findings by default
      setSelected(new Set((doc.findings || []).map(f => f.id)));
    } catch (err) {
      alert("Analysis failed. Please try again.");
      setStep(1);
    } finally {
      setAnalyzing(false);
    }
  };

  const build = async () => {
    if (!analysis) return;
    setBuilding(true);
    try {
      const selectedFindings = analysis.findings.filter(f => selected.has(f.id));
      let result = analysis.enhanced_note || "";
      const extras = selectedFindings.filter(f => f.suggestion && !result.toLowerCase().includes(f.suggestion.toLowerCase().substring(0, 30))).map(f => f.suggestion).join(" ");

      if (extras) {
        const woven = await base44.integrations.Core.InvokeLLM({
          prompt: `Seamlessly incorporate these observations into the nursing note. Return ONLY the final clinical narrative — no headers, dates, or names.\n\nNOTE:\n${result}\n\nADD:\n${extras}`
        });
        result = typeof woven === "string" ? woven : result + " " + extras;
      }

      setFinalNote(result);
      setStep(3);

      if (patientId && currentUser?.email) {
        const visit = await base44.entities.Visit.create({ patient_id: patientId, visit_date: visitDate, visit_type: visitType, status: "completed", nurse_notes: result, raw_transcription: note });
        await Promise.all([
          base44.entities.NoteConversion.create({ nurse_email: currentUser.email, patient_id: patientId, visit_type: visitType, diagnosis: patient?.primary_diagnosis || "", rough_note_length: note.length, enhanced_note_length: result.length, quality_score: analysis.overall_score, rough_note_compliance: Math.max(0, analysis.compliance_score - 20), enhanced_note_compliance: analysis.compliance_score, compliance_improvement: 20 }),
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
  const reset = () => { setNote(""); setAnalysis(null); setAlerts([]); setSelected(new Set()); setFinalNote(""); setStep(1); };
  const toggle = (id) => setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const urgentAlerts = alerts.filter(a => a.urgency === "immediate");
  const criticalCount = analysis?.findings?.filter(f => f.severity === "critical").length || 0;
  const scoreColor = !analysis ? "text-gray-400" : analysis.overall_score >= 80 ? "text-green-600" : analysis.overall_score >= 60 ? "text-orange-500" : "text-red-600";
  const ready = note.trim().length >= 20;

  return (
    <div className="max-w-3xl mx-auto px-4 py-5 space-y-4">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-indigo-600" /> Smart Note Assistant
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">Type or dictate rough notes → AI builds a Medicare-compliant note</p>
        </div>
        {step > 1 && (
          <Button variant="outline" size="sm" onClick={reset} className="gap-1.5 text-gray-600">
            <RotateCcw className="w-4 h-4" /> New Note
          </Button>
        )}
      </div>

      {/* ── Step pills ── */}
      <div className="flex items-center gap-1 bg-white border border-gray-200 rounded-xl px-4 py-2.5 shadow-sm">
        {["Write", "Review", "Copy"].map((label, i) => {
          const n = i + 1;
          const active = step === n;
          const done = step > n;
          return (
            <React.Fragment key={n}>
              <div className={`flex items-center gap-1.5 text-xs font-semibold ${active ? "text-indigo-700" : done ? "text-green-600" : "text-gray-400"}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${active ? "bg-indigo-600 text-white" : done ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"}`}>
                  {done ? <CheckCircle2 className="w-3.5 h-3.5" /> : n}
                </div>
                <span className="hidden sm:inline">{label}</span>
              </div>
              {i < 2 && <div className="flex-1 h-0.5 bg-gray-200 mx-1"><div className={`h-full ${step > n ? "bg-green-400 w-full" : "w-0"} transition-all duration-500`} /></div>}
            </React.Fragment>
          );
        })}
      </div>

      {/* ══ STEP 1: WRITE ══ */}
      {step === 1 && (
        <div className="space-y-3">
          {/* Context row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Patient <span className="text-gray-400">(optional)</span></label>
              <Select value={patientId} onValueChange={setPatientId}>
                <SelectTrigger className="bg-white h-10 text-sm"><SelectValue placeholder="Select patient…" /></SelectTrigger>
                <SelectContent>
                  {patients.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}{p.primary_diagnosis ? ` — ${p.primary_diagnosis}` : ""}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Visit Type</label>
              <Select value={visitType} onValueChange={setVisitType}>
                <SelectTrigger className="bg-white h-10 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{VISIT_TYPES.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          {patient && (
            <div className="flex items-center gap-2 text-xs text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <User className="w-3.5 h-3.5 shrink-0" />
              <span><strong>{patient.first_name} {patient.last_name}</strong>{patient.primary_diagnosis ? ` · ${patient.primary_diagnosis}` : ""}{patient.current_medications?.length > 0 ? ` · ${patient.current_medications.length} meds` : ""}{patient.functional_status?.fall_risk === "high" && <span className="ml-2 text-red-600 font-bold">⚠ High Fall Risk</span>}</span>
            </div>
          )}

          {/* Main note textarea — hero element */}
          <div className="bg-white border-2 border-indigo-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
              <span className="text-xs font-semibold text-indigo-700">Your Notes</span>
              <Button
                variant={listening ? "destructive" : "ghost"}
                size="sm"
                onClick={listening ? stopDictation : startDictation}
                className="h-7 gap-1 text-xs"
              >
                {listening
                  ? <><MicOff className="w-3.5 h-3.5" /><span className="animate-pulse">Stop recording</span></>
                  : <><Mic className="w-3.5 h-3.5" /> Dictate</>}
              </Button>
            </div>
            <textarea
              ref={textareaRef}
              value={note}
              onChange={e => setNote(e.target.value)}
              placeholder={"Jot bullet points or rough sentences — AI does the rest.\n\n• BP 148/90, HR 82, O2 95% RA\n• pt c/o SOB with exertion, uses walker\n• wound on R heel 2×3 cm, granulating, no odor\n• taught med schedule, pt verbalized understanding\n• fall risk — clutter in hallway, discussed w/ family"}
              className="w-full min-h-[320px] text-sm border-0 px-4 py-3 focus:ring-0 bg-white font-mono resize-none outline-none leading-relaxed"
              spellCheck={false}
            />
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50">
              <span className={`text-xs ${ready ? "text-green-600 font-medium" : "text-gray-400"}`}>
                {ready ? `${note.length} chars — ready` : `${20 - note.trim().length} more chars needed`}
              </span>
              <Button onClick={analyze} disabled={!ready} className="bg-indigo-600 hover:bg-indigo-700 h-9 px-5 gap-1.5 text-sm font-semibold">
                <Sparkles className="w-4 h-4" /> Analyze <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ══ STEP 2: REVIEW ══ */}
      {step === 2 && (
        <div className="space-y-4">
          {analyzing ? (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center shadow-sm">
              <Loader2 className="w-10 h-10 text-indigo-500 mx-auto animate-spin mb-3" />
              <p className="font-semibold text-gray-800">Analyzing your note…</p>
              <p className="text-sm text-gray-400 mt-1">Checking Medicare compliance & clinical risks</p>
            </div>
          ) : analysis && (
            <>
              {/* Score bar */}
              <div className={`rounded-xl border-2 p-4 ${analysis.overall_score >= 80 ? "border-green-300 bg-green-50" : analysis.overall_score >= 60 ? "border-orange-300 bg-orange-50" : "border-red-300 bg-red-50"}`}>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Note Quality Score</p>
                    <p className="text-xs text-gray-500 mt-0.5">{analysis.summary}</p>
                  </div>
                  <span className={`text-4xl font-bold ${scoreColor}`}>{analysis.overall_score}%</span>
                </div>
                <div className="flex gap-3">
                  <div className="flex-1 bg-white rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-400">Compliance</p>
                    <p className="text-lg font-bold text-orange-600">{analysis.compliance_score}%</p>
                  </div>
                  <div className="flex-1 bg-white rounded-lg p-2 text-center">
                    <p className="text-xs text-gray-400">Quality</p>
                    <p className="text-lg font-bold text-blue-600">{analysis.quality_score}%</p>
                  </div>
                </div>
                {analysis.strengths?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1 pt-3 border-t border-current/10">
                    {analysis.strengths.slice(0, 5).map((s, i) => <span key={i} className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">✓ {s}</span>)}
                  </div>
                )}
              </div>

              {/* Clinical alerts */}
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
                      <AlertDescription className="text-red-900 text-sm font-semibold">{urgentAlerts.length} urgent alert{urgentAlerts.length > 1 ? "s" : ""} — review before completing this visit.</AlertDescription>
                    </Alert>
                  )}
                  {alerts.map((a, i) => <AlertCard key={i} alert={a} />)}
                </div>
              )}

              {/* Documentation suggestions */}
              {analysis.findings?.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Suggested Additions <span className="text-gray-400 font-normal">({analysis.findings.length})</span></p>
                      <p className="text-xs text-gray-400">{selected.size} of {analysis.findings.length} selected — uncheck any you don't want</p>
                    </div>
                    <div className="flex gap-1.5">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setSelected(new Set(analysis.findings.map(f => f.id)))}>All</Button>
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setSelected(new Set())}>None</Button>
                    </div>
                  </div>
                  {criticalCount > 0 && (
                    <Alert className="border-red-300 bg-red-50 py-2">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <AlertDescription className="text-red-800 text-sm">{criticalCount} critical element{criticalCount > 1 ? "s" : ""} missing — required for Medicare compliance.</AlertDescription>
                    </Alert>
                  )}
                  {[...analysis.findings]
                    .sort((a, b) => ({ critical: 0, high: 1, medium: 2, low: 3 }[a.severity] ?? 3) - ({ critical: 0, high: 1, medium: 2, low: 3 }[b.severity] ?? 3))
                    .map(f => <SuggestionCard key={f.id} finding={f} selected={selected.has(f.id)} onToggle={() => toggle(f.id)} />)}
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-xl p-5 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="font-semibold text-green-800">Documentation looks complete!</p>
                  <p className="text-sm text-green-600 mt-1">No gaps detected. Ready to build your note.</p>
                </div>
              )}

              <Button onClick={build} disabled={building} className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 h-12 text-base font-semibold">
                {building
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Building…</>
                  : <><Sparkles className="w-4 h-4 mr-2" /> Build Final Note{selected.size > 0 ? ` (${selected.size} additions)` : ""} <ArrowRight className="w-4 h-4 ml-1.5" /></>}
              </Button>
              <button className="w-full text-xs text-gray-400 hover:text-gray-600 py-1" onClick={() => setStep(1)}>← Back to edit</button>
            </>
          )}
        </div>
      )}

      {/* ══ STEP 3: COPY ══ */}
      {step === 3 && (
        <div className="space-y-3">
          {urgentAlerts.length > 0 && (
            <Alert className="border-red-400 bg-red-50 py-2">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-900 text-sm"><strong>Reminder:</strong> {urgentAlerts.length} urgent alert{urgentAlerts.length > 1 ? "s were" : " was"} flagged. Confirm follow-up actions before closing.</AlertDescription>
            </Alert>
          )}

          {/* CTA banner */}
          <div className="flex items-center gap-3 bg-white border-2 border-green-400 rounded-xl px-4 py-3 shadow-sm">
            <CheckCircle2 className="w-6 h-6 text-green-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-green-800">Note Ready!</p>
              <p className="text-xs text-gray-400">Review below, then copy to your EMR</p>
            </div>
            {analysis && <Badge className="bg-green-600 text-white px-2.5 py-1 text-sm">{analysis.overall_score}%</Badge>}
            <Button onClick={copy} className="bg-green-600 hover:bg-green-700 h-10 px-4 gap-2 font-semibold shrink-0">
              {copied ? <><CheckCircle2 className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
            </Button>
          </div>

          {/* Note editor */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-100">
              <span className="text-sm font-semibold text-gray-700">Medicare-Compliant Note</span>
              <span className="text-xs text-gray-400">editable · {finalNote.length} chars</span>
            </div>
            <textarea
              value={finalNote}
              onChange={e => setFinalNote(e.target.value)}
              className="w-full min-h-[400px] font-mono text-sm border-0 px-4 py-3 focus:ring-0 bg-white resize-none outline-none"
            />
            <div className="flex gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50">
              <Button onClick={copy} className="flex-1 bg-green-600 hover:bg-green-700 h-10 gap-2 font-semibold">
                {copied ? <><CheckCircle2 className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy to EMR</>}
              </Button>
              <Button variant="outline" className="h-10 px-4 text-sm" onClick={() => { setStep(2); setFinalNote(""); }}>← Review</Button>
              <Button variant="outline" className="h-10 px-3" onClick={reset}><RotateCcw className="w-4 h-4" /></Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
import React, { useState, useEffect, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sparkles, CheckCircle2, Copy, RotateCcw, Loader2, Mic, MicOff,
  Shield, Lightbulb, AlertTriangle, User, ChevronDown, ChevronUp,
  ArrowRight, Target, DollarSign, AlertCircle, HelpCircle,
  Activity, Pill, TrendingUp, Phone, ClipboardList, Heart
} from "lucide-react";
import { todayEastern } from "../components/utils/timezone";
import { logActivity, ActivityActions } from "../components/utils/activityLogger";
import SmartSuggestionsPanel from "../components/smartNote/SmartSuggestionsPanel";
import PatientSummaryGenerator from "../components/smartNote/PatientSummaryGenerator";

const VISIT_TYPES = [
  { value: "routine_visit", label: "Routine Visit" },
  { value: "admission", label: "Admission" },
  { value: "recertification", label: "Recertification" },
  { value: "discharge", label: "Discharge" },
  { value: "prn", label: "PRN Visit" },
];

const SEVERITY_STYLES = {
  critical: "border-l-red-500 bg-red-50",
  high:     "border-l-orange-500 bg-orange-50",
  medium:   "border-l-yellow-500 bg-yellow-50",
  low:      "border-l-blue-500 bg-blue-50",
};
const SEVERITY_BADGE = {
  critical: "bg-red-100 text-red-800",
  high:     "bg-orange-100 text-orange-800",
  medium:   "bg-yellow-100 text-yellow-800",
  low:      "bg-blue-100 text-blue-800",
};
const CATEGORY_ICON  = { compliance: Shield, quality: Lightbulb, billing: DollarSign, clinical: Target };
const CATEGORY_COLOR = { compliance: "text-orange-600", quality: "text-blue-600", billing: "text-green-600", clinical: "text-purple-600" };

const RISK_ICON = { fall: Activity, medication: Pill, exacerbation: TrendingUp, safety: AlertTriangle, followup: Phone, default: AlertCircle };
const RISK_COLOR = {
  critical: "border-red-400 bg-red-50 text-red-900",
  high:     "border-orange-400 bg-orange-50 text-orange-900",
  medium:   "border-yellow-400 bg-yellow-50 text-yellow-900",
};

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepBadge({ n, label, active, done }) {
  return (
    <div className={`flex items-center gap-2 text-sm font-medium ${active ? "text-indigo-700" : done ? "text-green-600" : "text-gray-400"}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${active ? "bg-indigo-600 text-white" : done ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"}`}>
        {done ? <CheckCircle2 className="w-4 h-4" /> : n}
      </div>
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}

// ─── Documentation suggestion card ───────────────────────────────────────────
function SuggestionCard({ finding, selected, onToggle }) {
  const [expanded, setExpanded] = useState(finding.severity === "critical" || finding.severity === "high");
  const Icon = CATEGORY_ICON[finding.category] || AlertCircle;
  return (
    <div className={`border-l-4 rounded-lg ${SEVERITY_STYLES[finding.severity] || SEVERITY_STYLES.medium} p-3`}>
      <div className="flex items-start gap-3">
        <Checkbox checked={selected} onCheckedChange={onToggle} className="mt-1 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 flex-1 min-w-0">
              <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${CATEGORY_COLOR[finding.category] || "text-gray-500"}`} />
              <span className="text-sm font-semibold text-gray-900">{finding.issue}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Badge className={`text-xs ${SEVERITY_BADGE[finding.severity] || SEVERITY_BADGE.medium}`}>{finding.severity}</Badge>
              <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-gray-600">
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
          <div className="bg-white/80 border border-gray-200 rounded p-2 text-sm text-gray-800 italic mb-1.5">
            "{finding.suggestion}"
          </div>
          {expanded && (
            <p className="text-xs text-gray-600">{finding.rationale}
              {finding.revenue_impact && <span className="text-green-700 font-medium ml-1">💰 {finding.revenue_impact}</span>}
              {finding.regulation_reference && <span className="text-gray-500 ml-1">· {finding.regulation_reference}</span>}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Clinical risk / CDS alert card ──────────────────────────────────────────
function ClinicalAlertCard({ alert }) {
  const [expanded, setExpanded] = useState(alert.urgency === "immediate");
  const Icon = RISK_ICON[alert.risk_type] || RISK_ICON.default;
  const colorClass = RISK_COLOR[alert.urgency] || RISK_COLOR.medium;

  return (
    <div className={`rounded-lg border-2 p-3 ${colorClass}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <Icon className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-0.5">
              <p className="text-sm font-semibold">{alert.title}</p>
              <Badge className={`text-xs ${SEVERITY_BADGE[alert.urgency === "immediate" ? "critical" : alert.urgency === "soon" ? "high" : "medium"]}`}>
                {alert.urgency === "immediate" ? "Urgent" : alert.urgency === "soon" ? "Soon" : "Monitor"}
              </Badge>
            </div>
            <p className="text-xs opacity-80">{alert.finding}</p>
          </div>
        </div>
        <button onClick={() => setExpanded(!expanded)} className="opacity-60 hover:opacity-100 flex-shrink-0">
          {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
        </button>
      </div>
      {expanded && (
        <div className="mt-2 pt-2 border-t border-current/20 space-y-1.5">
          {alert.recommended_actions?.map((action, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs">
              <ClipboardList className="w-3 h-3 mt-0.5 flex-shrink-0 opacity-70" />
              <span>{action}</span>
            </div>
          ))}
          {alert.notify_physician && (
            <div className="flex items-center gap-1.5 text-xs font-semibold mt-1">
              <Phone className="w-3 h-3" />
              Notify physician / MD communication recommended
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SmartNoteAssistant() {
  const queryClient = useQueryClient();

  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [visitType, setVisitType] = useState("routine_visit");
  const [visitDate] = useState(todayEastern());
  const [roughNote, setRoughNote] = useState("");
  const [analysis, setAnalysis] = useState(null);
  const [clinicalAlerts, setClinicalAlerts] = useState([]);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [enhancedNote, setEnhancedNote] = useState("");
  const [step, setStep] = useState(1);
  const [analyzing, setAnalyzing] = useState(false);
  const [building, setBuilding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [listening, setListening] = useState(false);
  const [savedVisitId, setSavedVisitId] = useState(null);

  const recognitionRef = useRef(null);

  const { data: currentUser } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });
  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: () => base44.entities.Patient.filter({ status: "active" }, "first_name", 200),
  });
  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  useEffect(() => {
    if (currentUser?.email) logActivity(ActivityActions.PAGE_VISIT, { page: "SmartNoteAssistant" });
  }, [currentUser?.email]);

  // ── Speech recognition ────────────────────────────────────────────────────
  const startDictation = () => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { alert("Speech recognition not supported in this browser."); return; }
    const rec = new SR();
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = Array.from(e.results).slice(e.resultIndex).map(r => r[0].transcript).join(" ");
      setRoughNote(prev => prev ? prev + " " + transcript : transcript);
    };
    rec.onerror = () => setListening(false);
    rec.onend   = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };
  const stopDictation = () => { recognitionRef.current?.stop(); setListening(false); };

  // ── Build patient/vitals context for AI ──────────────────────────────────
  const buildPatientContext = () => {
    if (!selectedPatient) return "No patient selected";
    const p = selectedPatient;
    const meds = p.current_medications?.map(m => `${m.name} ${m.dosage}`).join(", ") || "None listed";
    const vitals = p.baseline_vitals ? Object.entries(p.baseline_vitals).filter(([,v]) => v).map(([k,v]) => `${k}: ${v}`).join(", ") : "None";
    return `
Name: ${p.first_name} ${p.last_name}
DOB / Age: ${p.date_of_birth || "Unknown"}
Primary Diagnosis: ${p.primary_diagnosis || "Unknown"}
Secondary Diagnoses: ${p.secondary_diagnoses?.join(", ") || "None"}
Current Medications: ${meds}
Allergies: ${p.allergies || "NKDA"}
Functional Status: Ambulation=${p.functional_status?.ambulation || "Unknown"}, Cognition=${p.functional_status?.cognitive_status || "Unknown"}, Fall Risk=${p.functional_status?.fall_risk || "Unknown"}
Baseline Vitals: ${vitals}
Wounds: ${p.wounds?.map(w => `${w.type} on ${w.location} stage ${w.stage}`).join("; ") || "None"}
Care Type: ${p.care_type || "home_health"}
`.trim();
  };

  // ── Step 1 → 2: Analyze ──────────────────────────────────────────────────
  const analyzeNote = async () => {
    if (!roughNote || roughNote.trim().length < 20) return;
    setAnalyzing(true);
    setStep(2);
    setAnalysis(null);
    setClinicalAlerts([]);
    setSelectedIds(new Set());
    setEnhancedNote("");

    try {
      const patientCtx = buildPatientContext();

      // Run documentation analysis + clinical decision support in parallel
      const [docResult, cdsResult] = await Promise.all([
        // ── 1. Documentation compliance analysis ──────────────────────────
        base44.integrations.Core.InvokeLLM({
          prompt: `You are an expert Medicare home health documentation specialist. Analyze this nurse's rough notes and provide specific, actionable documentation improvement suggestions.

NURSE'S ROUGH NOTE:
${roughNote}

PATIENT CONTEXT:
${patientCtx}

VISIT TYPE: ${visitType}

ANALYZE FOR THESE MEDICARE COMPLIANCE ELEMENTS (42 CFR 484):
1. Homebound status — specific physical limitation preventing leaving home without taxing effort
2. Skilled need justification — why RN/LPN required, not a non-skilled person
3. Patient response to interventions — objective, measurable response
4. Vital signs documented with clinical interpretation/significance
5. Patient/caregiver education with teach-back confirmation
6. Safety assessment — fall risk, medication safety, home environment hazards
7. Functional status / ADL limitations documented
8. Progress toward measurable care plan goals with data
9. Condition-specific clinical findings for ${selectedPatient?.primary_diagnosis || "the diagnosis"}
${visitType === "admission" ? "10. ADMISSION: baseline assessment, medication reconciliation, patient rights, emergency plan, care goals with patient input" : ""}
${visitType === "recertification" ? "10. RECERTIFICATION: progress toward each goal, continued homebound justification, continued skilled need, discharge planning" : ""}
${visitType === "discharge" ? "10. DISCHARGE: reason for discharge, goals met/unmet with outcomes, written discharge instructions, patient verbalized self-care understanding" : ""}

FOR EACH GAP — provide the EXACT clinical sentence a nurse could add (not instructions like "document X"):
WRONG: "Document homebound status"
RIGHT: "Patient is homebound due to severe dyspnea on exertion requiring supplemental O2; leaving home requires considerable and taxing effort"

Also produce an enhanced note that:
- Converts all bullet points into flowing clinical narrative
- Incorporates ALL required compliance elements
- Uses professional medical terminology
- Is fully compliant with Medicare 42 CFR 484
- Contains ONLY clinical documentation (no headers, patient names inline, dates, or closing remarks)
- Starts directly with the clinical assessment

Return JSON:
{
  "overall_score": <0-100>,
  "compliance_score": <0-100>,
  "quality_score": <0-100>,
  "summary": "<one sentence overview>",
  "findings": [
    {
      "id": "<unique string id>",
      "category": "<compliance|quality|billing|clinical>",
      "severity": "<critical|high|medium|low>",
      "issue": "<what is missing or weak>",
      "suggestion": "<exact clinical text to add>",
      "rationale": "<why this matters>",
      "revenue_impact": "<optional billing impact or empty string>",
      "regulation_reference": "<42 CFR 484.XX or empty string>"
    }
  ],
  "strengths": ["<element already well documented>"],
  "enhanced_note": "<complete compliant narrative note>"
}`,
          response_json_schema: {
            type: "object",
            properties: {
              overall_score: { type: "number" },
              compliance_score: { type: "number" },
              quality_score: { type: "number" },
              summary: { type: "string" },
              findings: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    id: { type: "string" },
                    category: { type: "string" },
                    severity: { type: "string" },
                    issue: { type: "string" },
                    suggestion: { type: "string" },
                    rationale: { type: "string" },
                    revenue_impact: { type: "string" },
                    regulation_reference: { type: "string" }
                  }
                }
              },
              strengths: { type: "array", items: { type: "string" } },
              enhanced_note: { type: "string" }
            }
          }
        }),

        // ── 2. Clinical Decision Support ─────────────────────────────────
        base44.integrations.Core.InvokeLLM({
          prompt: `You are an expert home health clinical decision support system. Review this nursing note and patient profile for safety risks, clinical deterioration signs, and necessary follow-up actions.

NURSE'S ROUGH NOTE:
${roughNote}

PATIENT PROFILE:
${patientCtx}

VISIT TYPE: ${visitType}

IDENTIFY ALL of the following if present or suggested by the notes:

1. FALL RISK — e.g., gait instability, new dizziness, medication side effects, environmental hazards, recent falls
2. MEDICATION CONCERNS — e.g., high-risk medications (anticoagulants, insulin, digoxin, diuretics), adherence issues, signs of toxicity/side effects, interactions with new symptoms
3. CONDITION EXACERBATION SIGNS — e.g., worsening SOB, weight gain in CHF, blood glucose trends in diabetes, wound deterioration, pain escalation
4. CARDIOVASCULAR / VITAL SIGN ALERTS — e.g., BP >180/100 or <90/60, HR >100 or <55, O2 sat <92%, significant changes from baseline
5. INFECTION / WOUND RISKS — e.g., fever, wound signs of infection, swelling, redness, purulent drainage
6. MENTAL STATUS / COGNITIVE CHANGES — e.g., new confusion, worsening depression, medication non-adherence related to cognition
7. SAFETY CONCERNS — e.g., home hazards, caregiver stress/burnout, abuse indicators, medication storage
8. REQUIRED FOLLOW-UP ACTIONS — e.g., physician notification, lab orders, care plan updates, specialist referrals

For each alert, provide:
- A clear title
- Specific finding from the note that triggers this alert
- Recommended clinical actions for the nurse
- Whether physician notification is recommended
- Urgency level

Only flag items that are genuinely supported by the note content or patient data. Do NOT fabricate concerns not evidenced by the notes.

Return JSON:
{
  "clinical_alerts": [
    {
      "risk_type": "<fall|medication|exacerbation|safety|followup|cardiovascular|infection|cognitive>",
      "urgency": "<immediate|soon|monitor>",
      "title": "<short alert title>",
      "finding": "<specific finding from note that triggered this>",
      "recommended_actions": ["<action 1>", "<action 2>"],
      "notify_physician": <true|false>
    }
  ]
}`,
          response_json_schema: {
            type: "object",
            properties: {
              clinical_alerts: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    risk_type: { type: "string" },
                    urgency: { type: "string" },
                    title: { type: "string" },
                    finding: { type: "string" },
                    recommended_actions: { type: "array", items: { type: "string" } },
                    notify_physician: { type: "boolean" }
                  }
                }
              }
            }
          }
        })
      ]);

      setAnalysis(docResult);
      setClinicalAlerts(cdsResult?.clinical_alerts || []);

      // Auto-select critical + high documentation findings
      const autoIds = new Set(
        (docResult.findings || [])
          .filter(f => f.severity === "critical" || f.severity === "high")
          .map(f => f.id)
      );
      setSelectedIds(autoIds);

    } catch (err) {
      console.error("Analysis failed:", err);
      alert("Analysis failed. Please try again.");
      setStep(1);
    } finally {
      setAnalyzing(false);
    }
  };

  // ── Step 2 → 3: Build final note ─────────────────────────────────────────
  const buildFinalNote = async () => {
    if (!analysis) return;
    setBuilding(true);
    try {
      const selectedFindings = analysis.findings.filter(f => selectedIds.has(f.id));
      let finalNote = analysis.enhanced_note || "";

      const extras = selectedFindings
        .filter(f => f.suggestion && !finalNote.toLowerCase().includes(f.suggestion.toLowerCase().substring(0, 40)))
        .map(f => f.suggestion)
        .join(" ");

      if (extras) {
        const woven = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a clinical documentation specialist. Seamlessly incorporate these additional clinical observations into the existing nursing note. Do not add headers, dates, patient names, or closing remarks. Return ONLY the updated note text as a single flowing clinical narrative.

EXISTING NOTE:
${finalNote}

ADDITIONAL OBSERVATIONS TO INCORPORATE:
${extras}`
        });
        finalNote = typeof woven === "string" ? woven : finalNote + "\n\n" + extras;
      }

      setEnhancedNote(finalNote);
      setStep(3);

      if (selectedPatientId && currentUser?.email) {
        const visit = await base44.entities.Visit.create({
          patient_id: selectedPatientId,
          visit_date: visitDate,
          visit_type: visitType,
          status: "completed",
          nurse_notes: finalNote,
          raw_transcription: roughNote,
        });
        setSavedVisitId(visit.id);

        await Promise.all([
          base44.entities.NoteConversion.create({
            nurse_email: currentUser.email,
            patient_id: selectedPatientId,
            visit_type: visitType,
            diagnosis: selectedPatient?.primary_diagnosis || "",
            rough_note_length: roughNote.length,
            enhanced_note_length: finalNote.length,
            quality_score: analysis.overall_score,
            rough_note_compliance: Math.max(0, analysis.compliance_score - 20),
            enhanced_note_compliance: analysis.compliance_score,
            compliance_improvement: 20,
          }),
          base44.entities.ComplianceAudit.create({
            visit_id: visit.id,
            nurse_email: currentUser.email,
            patient_id: selectedPatientId,
            audit_date: new Date().toISOString(),
            compliance_score: analysis.compliance_score,
            status: analysis.compliance_score >= 90 ? "passed" : analysis.compliance_score >= 80 ? "flagged" : "critical",
            audit_type: "automated",
          }),
        ]);

        logActivity(ActivityActions.NOTE_ENHANCED, {
          patient_id: selectedPatientId,
          visit_type: visitType,
          overall_score: analysis.overall_score,
          suggestions_applied: selectedFindings.length,
          clinical_alerts: clinicalAlerts.length,
          page: "SmartNoteAssistant",
        });

        queryClient.invalidateQueries({ queryKey: ["patientRecentVisits", selectedPatientId] });
      }
    } catch (err) {
      console.error("Build failed:", err);
      alert("Failed to build note. Please try again.");
    } finally {
      setBuilding(false);
    }
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(enhancedNote);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleReset = () => {
    setRoughNote(""); setAnalysis(null); setClinicalAlerts([]);
    setSelectedIds(new Set()); setEnhancedNote(""); setStep(1); setSavedVisitId(null);
  };

  const toggleId = (id) => {
    setSelectedIds(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });
  };

  const immediateAlerts = clinicalAlerts.filter(a => a.urgency === "immediate");
  const criticalFindings = analysis?.findings?.filter(f => f.severity === "critical").length || 0;
  const scoreColor = !analysis ? "text-gray-400" : analysis.overall_score >= 80 ? "text-green-600" : analysis.overall_score >= 60 ? "text-orange-500" : "text-red-600";

  return (
    <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6 space-y-4">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-indigo-600" /> Smart Note Assistant
          </h1>
          <p className="text-sm text-gray-500">Write rough notes → AI reviews → copy compliant note to EMR</p>
        </div>
        {step > 1 && (
          <Button variant="outline" size="sm" onClick={handleReset} className="gap-1.5 text-gray-600">
            <RotateCcw className="w-4 h-4" /> New Note
          </Button>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-1 sm:gap-3 bg-white border border-gray-200 rounded-xl px-4 py-3 shadow-sm">
        <StepBadge n={1} label="Write Notes"     active={step === 1} done={step > 1} />
        <div className="flex-1 h-0.5 bg-gray-200 mx-1"><div className={`h-full transition-all duration-500 ${step > 1 ? "bg-green-400 w-full" : "w-0"}`}/></div>
        <StepBadge n={2} label="Review & Select" active={step === 2} done={step > 2} />
        <div className="flex-1 h-0.5 bg-gray-200 mx-1"><div className={`h-full transition-all duration-500 ${step > 2 ? "bg-green-400 w-full" : "w-0"}`}/></div>
        <StepBadge n={3} label="Copy to EMR"     active={step === 3} done={false} />
      </div>

      {/* ── STEP 1: WRITE ────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-3">
          {/* Patient + Visit Type row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Patient (optional — enables AI risk analysis)</label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger className="bg-white h-11">
                  <SelectValue placeholder="Select patient..." />
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
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Visit Type</label>
              <Select value={visitType} onValueChange={setVisitType}>
                <SelectTrigger className="bg-white h-11"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {VISIT_TYPES.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedPatient && (
            <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <User className="w-4 h-4 flex-shrink-0" />
              <span>
                <strong>{selectedPatient.first_name} {selectedPatient.last_name}</strong>
                {selectedPatient.primary_diagnosis ? ` · ${selectedPatient.primary_diagnosis}` : ""}
                {selectedPatient.current_medications?.length > 0 && ` · ${selectedPatient.current_medications.length} meds`}
                {selectedPatient.functional_status?.fall_risk === "high" && <span className="ml-2 text-red-600 font-semibold">⚠ High Fall Risk</span>}
              </span>
            </div>
          )}

          {/* Smart Suggestions Panel */}
          <SmartSuggestionsPanel
            patient={selectedPatient}
            visitType={visitType}
            onInsert={(text) => setRoughNote(prev => prev ? prev + "\n• " + text : "• " + text)}
          />

          {/* Main note area */}
          <div className="bg-white border-2 border-indigo-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100">
              <span className="text-sm font-semibold text-indigo-800 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" /> Rough Notes
              </span>
              <div className="flex items-center gap-2">
                {listening && (
                  <span className="flex items-center gap-1 text-red-600 text-xs font-medium animate-pulse">
                    <div className="w-2 h-2 bg-red-500 rounded-full" /> Recording...
                  </span>
                )}
                <Button
                  variant={listening ? "destructive" : "ghost"}
                  size="sm"
                  onClick={listening ? stopDictation : startDictation}
                  className="h-8 gap-1.5 text-xs"
                >
                  {listening ? <><MicOff className="w-3.5 h-3.5" /> Stop</> : <><Mic className="w-3.5 h-3.5" /> Dictate</>}
                </Button>
              </div>
            </div>
            <textarea
              value={roughNote}
              onChange={e => setRoughNote(e.target.value)}
              placeholder={`Write bullet points or rough sentences — AI builds the compliant note.\n\nExamples:\n• pt c/o SOB with exertion, uses walker at home\n• BP 150/92, HR 88, O2 94% RA\n• wound on R heel 2x3cm, pink granulation, no odor\n• taught compression stocking use, pt verbalized understanding\n• fall risk high, clutter in hallway, discussed with family\n• on warfarin, last INR not checked in 6 weeks`}
              className="w-full min-h-[380px] text-base border-0 px-4 py-3 focus:ring-0 bg-white font-mono resize-none outline-none"
              spellCheck={false}
            />
            <div className="flex items-center justify-between px-4 py-2.5 border-t border-gray-100 bg-gray-50">
              <span className={`text-xs ${roughNote.length >= 20 ? "text-green-600 font-medium" : "text-gray-400"}`}>
                {roughNote.length < 20 ? `${20 - roughNote.length} more chars needed` : `${roughNote.length} chars — ready`}
              </span>
              <Button
                onClick={analyzeNote}
                disabled={roughNote.trim().length < 20}
                className="bg-indigo-600 hover:bg-indigo-700 h-10 px-6 gap-2 font-semibold"
              >
                <Sparkles className="w-4 h-4" /> Analyze &amp; Review <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Tips */}
          <div className="bg-amber-50 border border-amber-200 rounded-lg px-4 py-3">
            <p className="text-xs font-semibold text-amber-800 mb-1.5 flex items-center gap-1"><HelpCircle className="w-3.5 h-3.5" /> Tips for a compliant note:</p>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-0.5 text-xs text-amber-700">
              <span>• Vital signs with readings</span>
              <span>• Why patient can't leave home</span>
              <span>• What you taught the patient</span>
              <span>• Wound size &amp; appearance</span>
              <span>• Patient's response to care</span>
              <span>• Medications &amp; adherence</span>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: REVIEW ───────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          {analyzing ? (
            <Card className="border-2 border-purple-300">
              <CardContent className="p-10 text-center space-y-4">
                <Loader2 className="w-12 h-12 text-purple-600 mx-auto animate-spin" />
                <p className="font-semibold text-gray-900">Analyzing your note...</p>
                <p className="text-sm text-gray-500">Checking Medicare compliance, clinical decision support & safety risks</p>
              </CardContent>
            </Card>
          ) : analysis && (
            <>
              {/* Score card */}
              <Card className={`border-2 ${analysis.overall_score >= 80 ? "border-green-300 bg-green-50" : analysis.overall_score >= 60 ? "border-orange-300 bg-orange-50" : "border-red-300 bg-red-50"}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Note Score</p>
                      <p className="text-xs text-gray-500">{analysis.summary}</p>
                    </div>
                    <span className={`text-4xl font-bold ${scoreColor}`}>{analysis.overall_score}%</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 mt-3">
                    <div className="bg-white rounded p-2 text-center">
                      <Shield className="w-4 h-4 text-orange-600 mx-auto mb-0.5" />
                      <p className="text-xs text-gray-500">Compliance</p>
                      <p className="text-lg font-bold text-orange-600">{analysis.compliance_score}%</p>
                    </div>
                    <div className="bg-white rounded p-2 text-center">
                      <Lightbulb className="w-4 h-4 text-blue-600 mx-auto mb-0.5" />
                      <p className="text-xs text-gray-500">Quality</p>
                      <p className="text-lg font-bold text-blue-600">{analysis.quality_score}%</p>
                    </div>
                  </div>
                  {analysis.strengths?.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-current/10">
                      <p className="text-xs font-semibold text-green-700 mb-1">✓ Already well documented:</p>
                      <div className="flex flex-wrap gap-1">
                        {analysis.strengths.slice(0, 4).map((s, i) => (
                          <span key={i} className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full">{s}</span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* ── CLINICAL DECISION SUPPORT SECTION ── */}
              {clinicalAlerts.length > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <Heart className="w-4 h-4 text-red-600" />
                    <p className="text-sm font-bold text-gray-800">Clinical Decision Support</p>
                    <Badge className="bg-red-100 text-red-700 text-xs">{clinicalAlerts.length} alert{clinicalAlerts.length > 1 ? "s" : ""}</Badge>
                  </div>
                  <p className="text-xs text-gray-500">AI-identified safety risks and recommended interventions based on your notes and patient profile.</p>

                  {/* Immediate alerts first */}
                  {immediateAlerts.length > 0 && (
                    <Alert className="border-red-400 bg-red-50">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <AlertDescription className="text-red-900 text-sm font-semibold">
                        {immediateAlerts.length} urgent alert{immediateAlerts.length > 1 ? "s" : ""} require immediate attention — review before completing this visit.
                      </AlertDescription>
                    </Alert>
                  )}

                  {clinicalAlerts.map((alert, i) => (
                    <ClinicalAlertCard key={i} alert={alert} />
                  ))}
                </div>
              )}

              {/* ── DOCUMENTATION SUGGESTIONS ── */}
              {analysis.findings?.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">Documentation Suggestions ({analysis.findings.length})</p>
                      <p className="text-xs text-gray-500">{selectedIds.size} selected · Check the ones you want added to the final note</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set(analysis.findings.map(f => f.id)))} className="text-xs">All</Button>
                      <Button variant="outline" size="sm" onClick={() => setSelectedIds(new Set())} className="text-xs">None</Button>
                    </div>
                  </div>

                  {criticalFindings > 0 && (
                    <Alert className="border-red-300 bg-red-50">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <AlertDescription className="text-red-800 text-sm">
                        {criticalFindings} critical documentation element{criticalFindings > 1 ? "s" : ""} missing — required for Medicare compliance.
                      </AlertDescription>
                    </Alert>
                  )}

                  {[...analysis.findings]
                    .sort((a, b) => ({ critical: 0, high: 1, medium: 2, low: 3 }[a.severity] || 3) - ({ critical: 0, high: 1, medium: 2, low: 3 }[b.severity] || 3))
                    .map(finding => (
                      <SuggestionCard
                        key={finding.id}
                        finding={finding}
                        selected={selectedIds.has(finding.id)}
                        onToggle={() => toggleId(finding.id)}
                      />
                    ))}
                </div>
              ) : (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
                  <CheckCircle2 className="w-8 h-8 text-green-600 mx-auto mb-2" />
                  <p className="font-semibold text-green-800">Documentation looks complete!</p>
                  <p className="text-sm text-green-700 mt-1">No significant gaps detected. Ready to build the final note.</p>
                </div>
              )}

              <Button
                onClick={buildFinalNote}
                disabled={building}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 min-h-[48px] text-base"
              >
                {building
                  ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Building your note...</>
                  : <><Sparkles className="w-4 h-4 mr-2" /> Build Final Note{selectedIds.size > 0 ? ` (+ ${selectedIds.size} suggestions)` : ""} <ArrowRight className="w-4 h-4 ml-2" /></>
                }
              </Button>
              <Button variant="ghost" size="sm" className="w-full text-gray-500" onClick={() => setStep(1)}>
                ← Back to Edit Notes
              </Button>
            </>
          )}
        </div>
      )}

      {/* ── STEP 3: DONE ─────────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-3">
          {/* Urgent reminders */}
          {immediateAlerts.length > 0 && (
            <Alert className="border-red-400 bg-red-50">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-900 text-sm">
                <strong>Reminder:</strong> {immediateAlerts.length} urgent clinical alert{immediateAlerts.length > 1 ? "s were" : " was"} identified. Ensure appropriate follow-up actions have been taken before closing this visit.
              </AlertDescription>
            </Alert>
          )}

          {/* Big copy CTA at top */}
          <div className="flex items-center gap-3 bg-white border-2 border-green-400 rounded-xl px-4 py-3 shadow-sm">
            <CheckCircle2 className="w-6 h-6 text-green-600 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-green-800">Note Ready!</p>
              <p className="text-xs text-gray-500">Review below, then copy to your EMR</p>
            </div>
            {analysis && <Badge className="bg-green-600 text-white text-sm px-3 py-1">{analysis.overall_score}%</Badge>}
            <Button onClick={handleCopy} className="bg-green-600 hover:bg-green-700 h-11 px-5 gap-2 font-bold text-base flex-shrink-0">
              {copied ? <><CheckCircle2 className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy to EMR</>}
            </Button>
          </div>

          {/* Note text */}
          <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 border-b border-gray-200">
              <span className="text-sm font-semibold text-gray-700">Medicare-Compliant Note</span>
              <span className="text-xs text-gray-400">{enhancedNote.length} characters · editable</span>
            </div>
            <textarea
              value={enhancedNote}
              onChange={e => setEnhancedNote(e.target.value)}
              className="w-full min-h-[480px] font-mono text-sm border-0 px-4 py-3 focus:ring-0 bg-white resize-none outline-none"
            />
            <div className="flex gap-2 px-4 py-3 border-t border-gray-100 bg-gray-50">
              <Button onClick={handleCopy} className="flex-1 bg-green-600 hover:bg-green-700 h-11 gap-2 font-semibold">
                {copied ? <><CheckCircle2 className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy to EMR</>}
              </Button>
              <Button variant="outline" className="h-11 px-4" onClick={() => { setStep(2); setEnhancedNote(""); }}>
                ← Review
              </Button>
              <Button variant="outline" className="h-11 px-4" onClick={handleReset}>
                <RotateCcw className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {savedVisitId && (
            <Alert className="bg-green-50 border-green-200">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-800 text-sm">Note saved to patient chart.</AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </div>
  );
}
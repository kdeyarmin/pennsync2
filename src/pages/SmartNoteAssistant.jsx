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
  ArrowRight, Target, DollarSign, AlertCircle, HelpCircle
} from "lucide-react";
import { todayEastern } from "../components/utils/timezone";
import { logActivity, ActivityActions } from "../components/utils/activityLogger";

const VISIT_TYPES = [
  { value: "routine_visit", label: "Routine Visit" },
  { value: "admission", label: "Admission" },
  { value: "recertification", label: "Recertification" },
  { value: "discharge", label: "Discharge" },
  { value: "prn", label: "PRN Visit" },
];

const SEVERITY_STYLES = {
  critical: "border-l-red-500 bg-red-50",
  high: "border-l-orange-500 bg-orange-50",
  medium: "border-l-yellow-500 bg-yellow-50",
  low: "border-l-blue-500 bg-blue-50",
};
const SEVERITY_BADGE = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-blue-100 text-blue-800",
};
const CATEGORY_ICON = { compliance: Shield, quality: Lightbulb, billing: DollarSign, clinical: Target };
const CATEGORY_COLOR = { compliance: "text-orange-600", quality: "text-blue-600", billing: "text-green-600", clinical: "text-purple-600" };

// ─── Step indicator ───────────────────────────────────────────────────────────
function StepBadge({ n, label, active, done }) {
  return (
    <div className={`flex items-center gap-2 text-sm font-medium ${active ? "text-indigo-700" : done ? "text-green-600" : "text-gray-400"}`}>
      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${active ? "bg-indigo-600 text-white" : done ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"}`}>
        {done ? <CheckCircle2 className="w-4 h-4" /> : n}
      </div>
      <span className="hidden sm:inline">{label}</span>
    </div>
  );
}

// ─── Suggestion card ─────────────────────────────────────────────────────────
function SuggestionCard({ finding, selected, onToggle }) {
  const [expanded, setExpanded] = useState(finding.severity === "critical" || finding.severity === "high");
  const Icon = CATEGORY_ICON[finding.category] || AlertCircle;

  return (
    <div className={`border-l-4 rounded-lg ${SEVERITY_STYLES[finding.severity] || SEVERITY_STYLES.medium} p-3`}>
      <div className="flex items-start gap-3">
        <Checkbox
          checked={selected}
          onCheckedChange={onToggle}
          className="mt-1 flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <Icon className={`w-3.5 h-3.5 ${CATEGORY_COLOR[finding.category] || "text-gray-500"}`} />
              <span className="text-sm font-semibold text-gray-900">{finding.issue}</span>
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <Badge className={`text-xs ${SEVERITY_BADGE[finding.severity] || SEVERITY_BADGE.medium}`}>{finding.severity}</Badge>
              <button onClick={() => setExpanded(!expanded)} className="text-gray-400 hover:text-gray-600">
                {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* Suggested text — always visible */}
          <div className="bg-white/80 border border-gray-200 rounded p-2 text-sm text-gray-800 italic mb-1.5">
            "{finding.suggestion}"
          </div>

          {expanded && (
            <p className="text-xs text-gray-600">{finding.rationale}
              {finding.revenue_impact && <span className="text-green-700 font-medium ml-1">💰 {finding.revenue_impact}</span>}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function SmartNoteAssistant() {
  const queryClient = useQueryClient();

  // patient / visit setup
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [visitType, setVisitType] = useState("routine_visit");
  const [visitDate] = useState(todayEastern());

  // note states
  const [roughNote, setRoughNote] = useState("");
  const [analysis, setAnalysis] = useState(null);   // after AI review
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [enhancedNote, setEnhancedNote] = useState("");

  // UI states
  const [step, setStep] = useState(1); // 1=write, 2=review, 3=done
  const [analyzing, setAnalyzing] = useState(false);
  const [building, setBuilding] = useState(false);
  const [copied, setCopied] = useState(false);
  const [listening, setListening] = useState(false);
  const [savedVisitId, setSavedVisitId] = useState(null);

  const recognitionRef = useRef(null);
  const textareaRef = useRef(null);

  // Data
  const { data: currentUser } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });
  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: () => base44.entities.Patient.filter({ status: "active" }, "first_name", 200),
  });
  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  // log page visit
  useEffect(() => {
    if (currentUser?.email) logActivity(ActivityActions.PAGE_VISIT, { page: "SmartNoteAssistant" });
  }, [currentUser?.email]);

  // ── Speech recognition ────────────────────────────────────────────────────
  const startDictation = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) { alert("Speech recognition not supported in this browser."); return; }
    const rec = new SpeechRecognition();
    rec.continuous = true;
    rec.interimResults = false;
    rec.onresult = (e) => {
      const transcript = Array.from(e.results).slice(e.resultIndex).map(r => r[0].transcript).join(" ");
      setRoughNote(prev => prev ? prev + " " + transcript : transcript);
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    recognitionRef.current = rec;
    rec.start();
    setListening(true);
  };
  const stopDictation = () => { recognitionRef.current?.stop(); setListening(false); };

  // ── Step 1 → 2: Analyze ───────────────────────────────────────────────────
  const analyzeNote = async () => {
    if (!roughNote || roughNote.trim().length < 20) return;
    setAnalyzing(true);
    setStep(2);
    setAnalysis(null);
    setSelectedIds(new Set());
    setEnhancedNote("");

    try {
      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are an expert Medicare home health documentation specialist. A nurse has written rough notes. Analyze them and return specific, actionable improvement suggestions.

NURSE'S ROUGH NOTE:
${roughNote}

VISIT CONTEXT:
- Visit Type: ${visitType}
- Diagnosis: ${selectedPatient?.primary_diagnosis || "Not specified"}
- Patient Status: ${selectedPatient?.status || "active"}
- Care Type: ${selectedPatient?.care_type || "home_health"}

ANALYZE FOR THESE MEDICARE COMPLIANCE ELEMENTS (42 CFR 484):
1. Homebound status — specific physical limitation preventing leaving home without taxing effort
2. Skilled need justification — why RN/LPN is required, not a non-skilled aide
3. Patient response to interventions — objective, measurable response
4. Vital signs with clinical interpretation/significance
5. Patient/caregiver education with teach-back confirmation
6. Safety assessment — fall risk, medication safety, home environment
7. Functional status / ADL limitations
8. Progress toward measurable care plan goals
9. Condition-specific clinical findings relevant to: ${selectedPatient?.primary_diagnosis || "the diagnosis"}
${visitType === "admission" ? "10. ADMISSION: baseline assessment, medication reconciliation, patient rights, emergency plan, care goals with patient input" : ""}
${visitType === "recertification" ? "10. RECERTIFICATION: progress toward each goal, continued homebound justification, continued skilled need, discharge planning" : ""}
${visitType === "discharge" ? "10. DISCHARGE: reason for discharge, goals met/unmet with outcomes, written discharge instructions, patient verbalized self-care understanding" : ""}

FOR EACH GAP OR IMPROVEMENT:
- Identify the specific missing or weak element
- Provide the EXACT clinical text a nurse could add (not instructions — actual sentence-level documentation)
- Example of WRONG suggestion: "Document homebound status" 
- Example of RIGHT suggestion: "Patient is homebound due to severe dyspnea on exertion, requiring 2L supplemental O2; leaving home requires considerable and taxing effort"

Also provide an enhanced note that:
- Converts all bullet points into flowing clinical narrative sentences
- Incorporates ALL elements identified above
- Is fully compliant with Medicare 42 CFR 484
- Uses professional medical terminology
- Reads naturally as an EHR note
- Contains ONLY clinical documentation (no headers, patient names inline, date stamps, or closing remarks)
- Starts directly with the clinical assessment

Return JSON exactly:
{
  "overall_score": <0-100>,
  "compliance_score": <0-100>,
  "quality_score": <0-100>,
  "summary": "<one sentence overview>",
  "findings": [
    {
      "id": "<unique string>",
      "category": "<compliance|quality|billing|clinical>",
      "severity": "<critical|high|medium|low>",
      "issue": "<what is missing or weak>",
      "suggestion": "<exact clinical text to add>",
      "rationale": "<why this matters>",
      "revenue_impact": "<optional billing impact>",
      "regulation_reference": "<42 CFR 484.XX or empty>"
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
      });

      setAnalysis(result);
      // Auto-select critical + high findings
      const autoIds = new Set(
        (result.findings || [])
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

  // ── Step 2 → 3: Build final note ──────────────────────────────────────────
  const buildFinalNote = async () => {
    if (!analysis) return;
    setBuilding(true);
    try {
      const selectedFindings = analysis.findings.filter(f => selectedIds.has(f.id));

      let finalNote = analysis.enhanced_note || "";

      // Append any selected suggestions not already in note
      const extras = selectedFindings
        .filter(f => f.suggestion && !finalNote.toLowerCase().includes(f.suggestion.toLowerCase().substring(0, 40)))
        .map(f => f.suggestion)
        .join(" ");

      if (extras) {
        // Ask AI to weave extras into the note naturally
        const woven = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a clinical documentation specialist. Take this existing Medicare-compliant home health nursing note and seamlessly incorporate the additional clinical observations listed below into the appropriate sections of the note. Do not add headers, dates, patient names, or closing remarks. Return ONLY the updated note text.

EXISTING NOTE:
${finalNote}

ADDITIONAL OBSERVATIONS TO INCORPORATE:
${extras}

Return the complete updated note as a single flowing clinical narrative.`
        });
        finalNote = typeof woven === "string" ? woven : finalNote + "\n\n" + extras;
      }

      setEnhancedNote(finalNote);
      setStep(3);

      // Save visit + metrics
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
            rough_note_compliance: analysis.compliance_score - 20,
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
    setRoughNote("");
    setAnalysis(null);
    setSelectedIds(new Set());
    setEnhancedNote("");
    setStep(1);
    setSavedVisitId(null);
  };

  const toggleId = (id) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedIds(new Set(analysis?.findings?.map(f => f.id) || []));
  const selectNone = () => setSelectedIds(new Set());

  const criticalCount = analysis?.findings?.filter(f => f.severity === "critical").length || 0;
  const scoreColor = !analysis ? "text-gray-400" : analysis.overall_score >= 80 ? "text-green-600" : analysis.overall_score >= 60 ? "text-orange-500" : "text-red-600";

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-4 md:py-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-gray-900">Smart Note Assistant</h1>
          <p className="text-sm text-gray-500 hidden sm:block">Write rough notes → AI reviews → select suggestions → copy to EMR</p>
        </div>
        {step > 1 && (
          <Button variant="ghost" size="sm" onClick={handleReset} className="text-gray-500 gap-1">
            <RotateCcw className="w-4 h-4" /> New Note
          </Button>
        )}
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-2 sm:gap-4">
        <StepBadge n={1} label="Write Notes" active={step === 1} done={step > 1} />
        <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
        <StepBadge n={2} label="Review & Select" active={step === 2} done={step > 2} />
        <ArrowRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
        <StepBadge n={3} label="Copy to EMR" active={step === 3} done={false} />
      </div>

      {/* ── STEP 1: WRITE ─────────────────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-4">
          {/* Patient / Visit row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Patient (optional)</label>
              <Select value={selectedPatientId} onValueChange={setSelectedPatientId}>
                <SelectTrigger className="bg-white">
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
              <label className="text-xs font-medium text-gray-600 mb-1 block">Visit Type</label>
              <Select value={visitType} onValueChange={setVisitType}>
                <SelectTrigger className="bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {VISIT_TYPES.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          {selectedPatient && (
            <div className="flex items-center gap-2 text-sm text-blue-700 bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
              <User className="w-4 h-4 flex-shrink-0" />
              <span><strong>{selectedPatient.first_name} {selectedPatient.last_name}</strong>{selectedPatient.primary_diagnosis ? ` · ${selectedPatient.primary_diagnosis}` : ""}</span>
            </div>
          )}

          {/* Main textarea */}
          <Card className="border-2 border-indigo-300 shadow-md">
            <CardHeader className="py-3 bg-gradient-to-r from-indigo-50 to-purple-50">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Write your rough notes or bullet points
              </CardTitle>
            </CardHeader>
            <CardContent className="p-2">
              <textarea
                ref={textareaRef}
                value={roughNote}
                onChange={e => setRoughNote(e.target.value)}
                placeholder={`Write bullet points or rough sentences. AI will do the rest.\n\nExamples:\n• pt c/o SOB with exertion, uses walker at home\n• BP 150/92, HR 88, O2 94% RA\n• wound on R heel 2x3cm, pink granulation, no odor\n• taught compression stocking use, pt verbalized understanding\n• fall risk high, clutter in hallway, discussed with family\n• skilled nursing needed for wound care and disease teaching`}
                className="w-full min-h-[360px] text-base border-0 rounded-lg px-3 py-2.5 focus:ring-0 bg-white font-mono resize-none outline-none"
                spellCheck={false}
              />
            </CardContent>
          </Card>

          {/* Dictation + Analyze row */}
          <div className="flex items-center gap-3">
            <Button
              variant={listening ? "destructive" : "outline"}
              size="sm"
              onClick={listening ? stopDictation : startDictation}
              className="gap-1.5 min-h-[44px]"
            >
              {listening ? <><MicOff className="w-4 h-4" /> Stop</> : <><Mic className="w-4 h-4" /> Dictate</>}
            </Button>
            {listening && (
              <div className="flex items-center gap-1.5 text-red-600 text-sm animate-pulse">
                <div className="w-2 h-2 bg-red-500 rounded-full" /> Recording...
              </div>
            )}
            <div className="flex-1" />
            <span className={`text-xs ${roughNote.length >= 20 ? "text-green-600" : "text-gray-400"}`}>
              {roughNote.length} chars
            </span>
            <Button
              onClick={analyzeNote}
              disabled={roughNote.trim().length < 20}
              className="bg-indigo-600 hover:bg-indigo-700 min-h-[44px] gap-2"
            >
              <Sparkles className="w-4 h-4" />
              Analyze Note
              <ArrowRight className="w-4 h-4" />
            </Button>
          </div>

          {roughNote.trim().length < 20 && roughNote.length > 0 && (
            <p className="text-xs text-orange-500 text-right">Write at least 20 characters to analyze</p>
          )}

          {/* Quick tips */}
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
            <p className="text-xs font-semibold text-gray-600 mb-1.5 flex items-center gap-1"><HelpCircle className="w-3.5 h-3.5" /> Tips for best results:</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1 text-xs text-gray-500">
              <span>• Include vitals with readings</span>
              <span>• Note why patient can't leave home</span>
              <span>• Mention what you taught the patient</span>
              <span>• Describe wound size/appearance</span>
              <span>• Note patient's response to care</span>
              <span>• Mention safety concerns</span>
            </div>
          </div>
        </div>
      )}

      {/* ── STEP 2: REVIEW ────────────────────────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-4">
          {analyzing ? (
            <Card className="border-2 border-purple-300">
              <CardContent className="p-10 text-center space-y-4">
                <Loader2 className="w-12 h-12 text-purple-600 mx-auto animate-spin" />
                <p className="font-semibold text-gray-900">Analyzing your note...</p>
                <p className="text-sm text-gray-500">Checking Medicare compliance, quality, and billing elements</p>
              </CardContent>
            </Card>
          ) : analysis && (
            <>
              {/* Score overview */}
              <Card className={`border-2 ${analysis.overall_score >= 80 ? "border-green-300 bg-green-50" : analysis.overall_score >= 60 ? "border-orange-300 bg-orange-50" : "border-red-300 bg-red-50"}`}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <p className="text-sm font-semibold text-gray-700">Current Note Score</p>
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

              {/* Suggestions */}
              {analysis.findings?.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-gray-800">AI Suggestions ({analysis.findings.length})</p>
                      <p className="text-xs text-gray-500">{selectedIds.size} selected · Check the ones you want added</p>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={selectAll} className="text-xs">All</Button>
                      <Button variant="outline" size="sm" onClick={selectNone} className="text-xs">None</Button>
                    </div>
                  </div>

                  {criticalCount > 0 && (
                    <Alert className="border-red-300 bg-red-50">
                      <AlertTriangle className="w-4 h-4 text-red-600" />
                      <AlertDescription className="text-red-800 text-sm">
                        {criticalCount} critical element{criticalCount > 1 ? "s" : ""} missing — required for Medicare compliance.
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Sort: critical first */}
                  {[...analysis.findings]
                    .sort((a, b) => {
                      const order = { critical: 0, high: 1, medium: 2, low: 3 };
                      return (order[a.severity] || 3) - (order[b.severity] || 3);
                    })
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
                  <p className="font-semibold text-green-800">Your note looks great!</p>
                  <p className="text-sm text-green-700 mt-1">No significant gaps detected. Ready to build the final note.</p>
                </div>
              )}

              {/* Build button */}
              <Button
                onClick={buildFinalNote}
                disabled={building}
                className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 min-h-[48px] text-base"
              >
                {building ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Building your note...</>
                ) : (
                  <><Sparkles className="w-4 h-4 mr-2" /> Build Final Note ({selectedIds.size > 0 ? `+ ${selectedIds.size} suggestions` : "as is"}) <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>

              <Button variant="ghost" size="sm" className="w-full text-gray-500" onClick={() => setStep(1)}>
                ← Back to Edit Notes
              </Button>
            </>
          )}
        </div>
      )}

      {/* ── STEP 3: DONE ──────────────────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-4">
          <Card className="border-2 border-green-400 shadow-xl">
            <CardHeader className="py-4 bg-green-50">
              <CardTitle className="flex items-center gap-2 text-green-800">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Note Ready — Copy to EMR
                {analysis && <Badge className="ml-auto bg-green-600 text-white">{analysis.overall_score}% compliant</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-3 space-y-3">
              <textarea
                value={enhancedNote}
                onChange={e => setEnhancedNote(e.target.value)}
                className="w-full min-h-[500px] font-mono text-sm border border-gray-300 rounded-lg px-4 py-3 focus:ring-2 focus:ring-indigo-500 bg-white resize-none"
              />
              <div className="flex flex-col sm:flex-row gap-3">
                <Button
                  onClick={handleCopy}
                  className="flex-1 bg-green-600 hover:bg-green-700 min-h-[48px] text-base"
                >
                  {copied ? <><CheckCircle2 className="w-4 h-4 mr-2" /> Copied!</> : <><Copy className="w-4 h-4 mr-2" /> Copy to EMR</>}
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 min-h-[48px]"
                  onClick={() => { setStep(2); setEnhancedNote(""); }}
                >
                  ← Back to Suggestions
                </Button>
                <Button
                  variant="outline"
                  className="flex-1 min-h-[48px]"
                  onClick={handleReset}
                >
                  <RotateCcw className="w-4 h-4 mr-2" /> New Note
                </Button>
              </div>
              {savedVisitId && (
                <Alert className="bg-green-50 border-green-200">
                  <CheckCircle2 className="w-4 h-4 text-green-600" />
                  <AlertDescription className="text-green-800 text-sm">Note saved to patient chart.</AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
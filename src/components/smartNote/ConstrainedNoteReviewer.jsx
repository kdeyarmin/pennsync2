import { useState, useEffect, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sparkles, ArrowRight, HelpCircle, AlertTriangle, ShieldCheck, Loader2, Copy, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { normalizeDraft } from "./compliance/normalize";
import { getRequiredElements } from "./compliance/requiredElements";
import { detectPresence, computeGaps, computeCriticalGaps, computeCarryForward } from "./compliance/presenceDetection";
import { splitSentences } from "./compliance/factExtraction";
import { generateConstrainedNote, groundNote } from "./compliance/generation";
import { valueGuard } from "./compliance/valueGuard";
import { computeCoverageScore, computeDraftPresenceScore } from "./compliance/coverageScore";
import NoteDiffView from "./NoteDiffView";

/**
 * The canonical "constrained scribe" review flow, reusable across pages:
 * deterministic scan → questions (with pre-fill + confirm-only negatives) →
 * critical gating → constrained generation → value-guard + AI grounding →
 * verified note. The LLM only ever re-voices the nurse's own material, and a
 * note can't be marked verified unless every value traces back to that input.
 *
 * Props:
 *   roughNote      — the rough draft to convert
 *   serviceLine    — "home_health" | "hospice"
 *   visitType      — routine_visit | admission | recertification | discharge | prn
 *   priorNote      — (optional) the patient's last note, for carry-forward pre-fill
 *   currentUser    — (optional) for the grounding call's rate-limit key
 *   onFinalNote    — (optional) called with the verified note text
 *   onBack         — (optional) renders a Back button next to Generate
 *   renderFinalNote — (optional) host render-prop for the final-note area. Receives
 *                     an `api` with { finalNote, setFinalNote, building, copy,
 *                     copied, verified, dirty, fixRequired, coverage, recheck,
 *                     result }. `recheck()` re-verifies and resolves to the
 *                     save-ready `result` (or null if it fails). When provided,
 *                     the reviewer renders the fact-check banner but defers the
 *                     note display + actions (e.g. Save-to-chart, PDF) to the host.
 */
export default function ConstrainedNoteReviewer({ roughNote, serviceLine = "home_health", visitType = "routine_visit", priorNote = "", currentUser, onFinalNote, onBack, renderFinalNote }) {
  const [answers, setAnswers] = useState({});
  const [prefilledIds, setPrefilledIds] = useState(new Set());
  const [confirmedNegatives, setConfirmedNegatives] = useState(new Set());
  const [finalNote, setFinalNote] = useState("");
  const [verifiedNote, setVerifiedNote] = useState("");
  const [fixRequired, setFixRequired] = useState(null);
  const [building, setBuilding] = useState(false);
  const [copied, setCopied] = useState(false);

  // Deterministic, instant, offline scan — no LLM, no invented score.
  const analysis = useMemo(() => {
    if (!roughNote || roughNote.trim().length < 20) return null;
    const normalized = normalizeDraft(roughNote);
    const required = getRequiredElements(serviceLine, visitType);
    const presence = detectPresence(normalized, required);
    const gaps = computeGaps(presence, required);
    const draftScore = computeDraftPresenceScore({ requiredElements: required, presenceResults: presence });
    return { normalized, required, presence, gaps, draftScore };
  }, [roughNote, serviceLine, visitType]);

  // Reset + pre-fill carry-forward answers whenever the SCAN changes. Keyed on
  // `analysis` only (not priorNote) and reads priorNote via a ref, so a late-
  // arriving prior note (async patient fetch) can't wipe answers the nurse has
  // already typed. Switching patient/visit re-mounts this component, which
  // re-prefills from the new patient.
  const priorNoteRef = useRef("");
  priorNoteRef.current = priorNote;
  useEffect(() => {
    setFinalNote(""); setVerifiedNote(""); setFixRequired(null);
    if (!analysis) { setAnswers({}); setPrefilledIds(new Set()); setConfirmedNegatives(new Set()); return; }
    const prefill = computeCarryForward(priorNoteRef.current || "", analysis.gaps);
    setAnswers(prefill);
    setPrefilledIds(new Set(Object.keys(prefill)));
    setConfirmedNegatives(new Set());
  }, [analysis]);

  const setAnswer = (id, value) => {
    setAnswers(prev => ({ ...prev, [id]: value }));
    setPrefilledIds(prev => { if (!prev.has(id)) return prev; const n = new Set(prev); n.delete(id); return n; });
  };
  const toggleNegative = (id) => setConfirmedNegatives(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n; });

  const computeNotDocumented = () => {
    if (!analysis) return [];
    return analysis.gaps
      .filter(e => e.severity !== "critical" && !answers[e.id]?.trim() && !confirmedNegatives.has(e.id))
      .map(e => e.notDocumentedPhrase);
  };
  const buildAllowedInput = () => {
    if (!analysis) return "";
    const answerTexts = analysis.required.filter(e => answers[e.id]?.trim()).map(e => answers[e.id].trim());
    const negPhrases = analysis.required.filter(e => confirmedNegatives.has(e.id) && e.standardNegative).map(e => e.standardNegative.phrase);
    return [analysis.normalized, ...answerTexts, ...negPhrases, ...computeNotDocumented()].join(" ");
  };

  // Save-ready snapshot the host (e.g. SmartNoteAssistant) persists to the chart.
  const computeResult = (text) => {
    if (!analysis) return null;
    const answeredIds = analysis.required.filter(e => answers[e.id]?.trim()).map(e => e.id);
    const confirmedNegativeIds = Array.from(confirmedNegatives);
    const coverageScore = computeCoverageScore({ requiredElements: analysis.required, presenceResults: analysis.presence, answeredIds, confirmedNegativeIds });
    return { finalNote: text, coverageScore, draftScore: analysis.draftScore, presence: analysis.presence, required: analysis.required, answeredIds, confirmedNegativeIds, answers };
  };

  const verifyNote = async (text) => {
    const allowed = buildAllowedInput();
    const vg = valueGuard(text, allowed);
    if (!vg.ok) return { ok: false, fix: { values: vg.unverified, sentences: [], offlinePending: false } };
    if (navigator.onLine) {
      const g = await groundNote(text, allowed, { userKey: currentUser?.email || "anon" });
      if (!g.ok) return { ok: false, fix: { values: [], sentences: g.unsupported || [], groundingError: g.error, offlinePending: false } };
      return { ok: true, offline: false };
    }
    return { ok: true, offline: true };
  };

  const applyVerification = (text, v) => {
    if (!v.ok) { setVerifiedNote(""); setFixRequired(v.fix); return; }
    setVerifiedNote(text);
    setFixRequired(v.offline ? { offlinePending: true } : null);
    onFinalNote?.(text);
  };

  const generate = async () => {
    if (!analysis) return;
    const { required, presence } = analysis;
    const criticalUnanswered = computeCriticalGaps(presence, required).filter(e => !answers[e.id]?.trim());
    if (criticalUnanswered.length) {
      toast.error(`Required before generating: ${criticalUnanswered.map(e => e.label).join(", ")}`);
      return;
    }
    setBuilding(true); setFixRequired(null);
    try {
      const draftSentences = splitSentences(analysis.normalized);
      const answersPayload = required.filter(e => answers[e.id]?.trim()).map(e => ({ label: e.label, text: answers[e.id].trim() }));
      const negPhrases = required.filter(e => confirmedNegatives.has(e.id) && e.standardNegative).map(e => e.standardNegative.phrase);
      let generated;
      try {
        const res = await generateConstrainedNote({ draftSentences, answers: answersPayload, confirmedNegatives: negPhrases }, { userKey: currentUser?.email || "anon" });
        generated = res.note.trim();
      } catch (genErr) {
        const credits = genErr?.status === 402 || genErr?.data?.extra_data?.reason === "integration_credits_limit_reached";
        toast.error(credits ? "Monthly integration limit reached. Please upgrade your plan to continue." : "Note generation failed. Please try again.");
        setBuilding(false);
        return;
      }
      const notDoc = computeNotDocumented();
      const finalText = notDoc.length ? `${generated}\n\n${notDoc.join(" ")}` : generated;
      setFinalNote(finalText);
      applyVerification(finalText, await verifyNote(finalText));
    } catch (err) {
      console.error("ConstrainedNoteReviewer generate error:", err);
      toast.error("Something went wrong building the note.");
    } finally {
      setBuilding(false);
    }
  };

  // Re-verify the (possibly edited) note. Resolves to the save-ready result, or null.
  const recheck = async () => {
    if (!finalNote.trim()) return null;
    setBuilding(true);
    try {
      const v = await verifyNote(finalNote);
      applyVerification(finalNote, v);
      return v.ok ? computeResult(finalNote) : null;
    } finally {
      setBuilding(false);
    }
  };

  // If the note was built offline, its LLM grounding pass was deferred. When the
  // browser reconnects, run grounding automatically (fulfilling the "will run
  // when you reconnect" promise shown in the pending banner) and surface the
  // result. This never blocks the offline save — it upgrades a pending note to
  // fully verified, or flags any sentences to review before finalizing.
  useEffect(() => {
    if (!finalNote || !fixRequired?.offlinePending) return;
    const onReconnect = async () => {
      try {
        const v = await verifyNote(finalNote);
        applyVerification(finalNote, v);
        if (v.ok) toast.success("Reconnected — every value re-verified against your input.");
        else toast.error("Reconnected — grounding flagged items to review before finalizing.");
      } catch (err) {
        console.error("Reconnect grounding failed:", err);
        toast.error("Reconnected, but verification couldn't run. Use Re-check before finalizing.");
      }
    };
    window.addEventListener("online", onReconnect);
    return () => window.removeEventListener("online", onReconnect);
  }, [finalNote, fixRequired]);

  const copy = async () => { await navigator.clipboard.writeText(finalNote); setCopied(true); setTimeout(() => setCopied(false), 2500); };

  // derived
  const gaps = analysis?.gaps || [];
  const answeredOrConfirmed = (id) => !!answers[id]?.trim() || confirmedNegatives.has(id);
  const answeredCount = gaps.filter(g => answeredOrConfirmed(g.id)).length;
  const criticalUnanswered = analysis ? computeCriticalGaps(analysis.presence, analysis.required).filter(e => !answers[e.id]?.trim()) : [];
  const documentedCount = analysis ? analysis.required.filter(e => { const p = analysis.presence.find(r => r.id === e.id); return (p && p.present) || answeredOrConfirmed(e.id); }).length : 0;
  const liveCoverage = analysis ? computeCoverageScore({ requiredElements: analysis.required, presenceResults: analysis.presence, answeredIds: analysis.required.filter(e => answers[e.id]?.trim()).map(e => e.id), confirmedNegativeIds: Array.from(confirmedNegatives) }) : 0;
  const tone = liveCoverage >= 90 ? "green" : liveCoverage >= 70 ? "orange" : "red";
  const dirty = !!finalNote && finalNote !== verifiedNote;

  if (!analysis) {
    return <div className="text-sm text-slate-500 p-4 bg-slate-50 border border-slate-200 rounded-xl">Add a rough note (at least 20 characters) to check Medicare compliance and generate a fully factual note.</div>;
  }

  if (building) {
    return (
      <div className="bg-white border border-slate-200 rounded-xl p-10 text-center shadow-sm">
        <Loader2 className="w-10 h-10 text-indigo-500 mx-auto animate-spin mb-3" />
        <p className="font-semibold text-slate-800">Building your note…</p>
        <p className="text-sm text-slate-400 mt-1">Re-voicing your words and verifying every detail against what you wrote</p>
      </div>
    );
  }

  const finalApi = {
    finalNote, setFinalNote, building, copy, copied,
    verified: !dirty && !fixRequired,
    dirty, fixRequired,
    coverage: liveCoverage,
    recheck,
    result: computeResult(finalNote),
  };

  return (
    <div className="space-y-4">
      {!finalNote && (
        <>
          {/* Coverage meter (deterministic, reproducible) */}
          <div className={`rounded-xl border-2 p-4 ${tone === "green" ? "border-green-300 bg-green-50" : tone === "orange" ? "border-orange-300 bg-orange-50" : "border-red-300 bg-red-50"}`}>
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-sm font-semibold text-slate-700">Compliance Coverage</p>
                <p className="text-xs text-slate-500 mt-0.5">{documentedCount} of {analysis.required.length} required elements documented</p>
              </div>
              <span className={`text-4xl font-bold ${tone === "green" ? "text-green-600" : tone === "orange" ? "text-orange-500" : "text-red-600"}`}>{liveCoverage}%</span>
            </div>
            <div className="h-2 bg-white rounded-full overflow-hidden">
              <div className={`h-full transition-all ${tone === "green" ? "bg-green-500" : tone === "orange" ? "bg-orange-400" : "bg-red-400"}`} style={{ width: `${liveCoverage}%` }} />
            </div>
          </div>

          {criticalUnanswered.length > 0 && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-300 rounded-xl px-4 py-3">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <p className="text-sm text-red-800"><strong>Required before generating:</strong> {criticalUnanswered.map(e => e.label).join(", ")}. Medicare can deny the visit without these.</p>
            </div>
          )}

          {gaps.length > 0 && (
            <div className="bg-white border border-amber-200 rounded-xl p-4 shadow-sm">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-semibold text-slate-900 flex items-center gap-2"><HelpCircle className="w-4 h-4 text-amber-500" /> Questions to Complete Your Note</h3>
                <span className="text-xs text-slate-500 shrink-0">{answeredCount}/{gaps.length} addressed</span>
              </div>
              <p className="text-xs text-slate-500 mb-2">These required elements weren't in your draft. Answer what applies. Non-critical items left blank become an explicit "Not documented this visit." — never invented.</p>
              {prefilledIds.size > 0 && (
                <p className="text-xs text-navy-700 bg-navy-50 border border-navy-200 rounded-lg px-3 py-2 mb-3">Some answers were carried from this patient's last visit — confirm each still applies before generating.</p>
              )}
              <div className="space-y-3">
                {gaps.map(g => {
                  const negConfirmed = confirmedNegatives.has(g.id);
                  return (
                    <div key={g.id} className="p-3 bg-amber-50/70 border border-amber-200 rounded-lg">
                      <div className="flex items-start gap-2">
                        <Badge className={`shrink-0 text-xs ${g.severity === "critical" ? "bg-red-100 text-red-800" : "bg-amber-100 text-amber-800"}`}>{g.severity === "critical" ? "required" : "optional"}</Badge>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-slate-900">{g.question}</p>
                            {prefilledIds.has(g.id) && <span className="shrink-0 text-[10px] font-semibold text-navy-700 bg-navy-100 px-1.5 py-0.5 rounded-full">from last visit · confirm</span>}
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
            <Button onClick={generate} disabled={criticalUnanswered.length > 0} className="flex-1 bg-indigo-600 hover:bg-indigo-700 h-12 font-semibold gap-2">
              <Sparkles className="w-4 h-4" /> Generate Final Note <ArrowRight className="w-4 h-4" />
            </Button>
            {onBack && <Button variant="outline" onClick={onBack} className="h-12 px-4">← Back</Button>}
          </div>
        </>
      )}

      {finalNote && (
        <>
          {fixRequired && fixRequired.offlinePending ? (
            <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 space-y-1">
              <h3 className="font-semibold text-amber-800 flex items-center gap-2"><ShieldCheck className="w-4 h-4" /> Verification pending</h3>
              <p className="text-sm text-amber-800">Every value was checked against your input. The AI grounding pass will run when you reconnect. Review carefully before pasting into the EMR.</p>
            </div>
          ) : fixRequired ? (
            <div className="rounded-xl border-2 border-red-300 bg-red-50 p-4 space-y-2">
              <h3 className="font-semibold text-red-800 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Fix required before finalizing</h3>
              {fixRequired.values?.length > 0 && <p className="text-sm text-red-800">Values not found in your input: <strong>{fixRequired.values.map(v => v.value).join(", ")}</strong></p>}
              {fixRequired.sentences?.length > 0 && (
                <div className="text-sm text-red-800">Sentences not supported by your input:
                  <ul className="list-disc ml-5 mt-1 space-y-0.5">{fixRequired.sentences.slice(0, 6).map((s, i) => <li key={i}>{s.text}</li>)}</ul>
                </div>
              )}
              {fixRequired.groundingError && <p className="text-sm text-red-700">Verification error: {fixRequired.groundingError}</p>}
              <p className="text-xs text-red-600">Edit the note below to remove anything you didn't document, then re-check.</p>
              <Button onClick={recheck} className="bg-red-600 hover:bg-red-700 h-9 gap-2 text-sm font-semibold"><ShieldCheck className="w-4 h-4" /> Re-check</Button>
            </div>
          ) : dirty ? (
            <div className="rounded-xl border-2 border-amber-300 bg-amber-50 p-4 space-y-2">
              <h3 className="font-semibold text-amber-800 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> Edited since verification</h3>
              <p className="text-sm text-amber-800">You changed the note after it was checked. Re-check to verify your edits against what you wrote.</p>
              <Button onClick={recheck} className="bg-amber-600 hover:bg-amber-700 h-9 gap-2 text-sm font-semibold"><ShieldCheck className="w-4 h-4" /> Re-check</Button>
            </div>
          ) : (
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-4 py-3 text-sm text-green-800">
              <ShieldCheck className="w-4 h-4 text-green-600 shrink-0" /> Every value and statement in this note was verified against what you wrote. Copy it into your EMR.
            </div>
          )}

          {renderFinalNote ? (
            renderFinalNote(finalApi)
          ) : (
            <>
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                  <span className="text-sm font-semibold text-slate-700">Final Clinical Note</span>
                  <span className="text-xs text-slate-400">editable · {finalNote.length} chars</span>
                </div>
                <textarea value={finalNote} onChange={e => setFinalNote(e.target.value)} className="w-full min-h-[280px] font-mono text-sm border-0 px-4 py-3 focus:ring-0 bg-white resize-none outline-none" />
                <div className="flex gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50">
                  <Button onClick={copy} className="flex-1 bg-green-600 hover:bg-green-700 h-11 gap-2 font-semibold">
                    {copied ? <><CheckCircle2 className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy</>}
                  </Button>
                  <Button variant="outline" className="h-11 px-4" onClick={() => { setFinalNote(""); setVerifiedNote(""); setFixRequired(null); }}>Back</Button>
                </div>
              </div>
              <NoteDiffView originalNote={roughNote} enhancedNote={finalNote} />
            </>
          )}
        </>
      )}
    </div>
  );
}

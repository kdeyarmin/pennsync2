import React, { useState, useRef } from "react";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, Loader2, Copy, CheckCircle2, ClipboardList, ChevronDown, ChevronUp } from "lucide-react";
import VoiceNoteIntegration from "./VoiceNoteIntegration";

const VISIT_TYPES = [
  { value: "routine_visit", label: "Routine Visit" },
  { value: "admission", label: "Admission" },
  { value: "recertification", label: "Recertification" },
  { value: "discharge", label: "Discharge" },
  { value: "prn", label: "PRN Visit" },
];

const BLANK_VITALS = {
  bp_systolic: "", bp_diastolic: "", heart_rate: "", resp_rate: "",
  o2_sat: "", temperature: "", weight: "", pain_level: ""
};

export default function StructuredNoteDrafter({ patient, onDraftReady }) {
  const [visitType, setVisitType] = useState("routine_visit");
  const [vitals, setVitals] = useState(BLANK_VITALS);
  const [symptoms, setSymptoms] = useState("");
  const [interventions, setInterventions] = useState("");
  const [education, setEducation] = useState("");
  const [plan, setPlan] = useState("");
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const symptomsRef = useRef(null);
  const interventionsRef = useRef(null);
  const educationRef = useRef(null);
  const planRef = useRef(null);

  const setVital = (k, v) => setVitals(prev => ({ ...prev, [k]: v }));

  const hasContent = symptoms.trim() || Object.values(vitals).some(v => v.trim());

  const generate = async () => {
    if (!hasContent) return;
    setLoading(true);
    setDraft("");
    try {
      const vitalsLine = [
        vitals.bp_systolic && vitals.bp_diastolic ? `BP ${vitals.bp_systolic}/${vitals.bp_diastolic} mmHg` : null,
        vitals.heart_rate ? `HR ${vitals.heart_rate} bpm` : null,
        vitals.resp_rate ? `RR ${vitals.resp_rate} breaths/min` : null,
        vitals.o2_sat ? `O2 sat ${vitals.o2_sat}%` : null,
        vitals.temperature ? `Temp ${vitals.temperature}°F` : null,
        vitals.weight ? `Weight ${vitals.weight} lbs` : null,
        vitals.pain_level ? `Pain ${vitals.pain_level}/10` : null,
      ].filter(Boolean).join(", ") || "Not provided";

      const patientCtx = patient
        ? `Patient: ${patient.first_name} ${patient.last_name}, Dx: ${patient.primary_diagnosis || "Not documented"}, Meds: ${patient.current_medications?.map(m => m.name).join(", ") || "None"}`
        : "No patient context";

      const result = await base44.integrations.Core.InvokeLLM({
        prompt: `You are a Medicare home health clinical documentation specialist. Draft a complete, Medicare-compliant nursing note from the structured input below.

RULES:
1. Only use information provided in the structured input. Do not invent or assume clinical details.
2. Write in professional past-tense clinical narrative (no bullet points, no headers).
3. Include: homebound status statement, skilled need justification, vital sign interpretation, assessment findings, interventions performed, patient response, education with comprehension assessment, safety assessment, and plan.
4. If a section has no input, include a brief standard statement (e.g., "No new complaints reported" for symptoms if blank).
5. The note must stand alone as a complete legal clinical document.

PATIENT: ${patientCtx}
VISIT TYPE: ${visitType}

VITAL SIGNS: ${vitalsLine}
SYMPTOMS / CHIEF COMPLAINT: ${symptoms || "No specific complaints reported by patient."}
INTERVENTIONS PERFORMED: ${interventions || "Standard skilled nursing assessment performed."}
PATIENT EDUCATION: ${education || "Patient education provided as appropriate to visit type."}
PLAN: ${plan || "Continue current plan of care."}

Return ONLY the clinical narrative note text — nothing else.`
      });

      const noteText = typeof result === "string" ? result : JSON.stringify(result);
      setDraft(noteText);
    } catch (err) {
      alert("Failed to generate draft. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    await navigator.clipboard.writeText(draft);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const useInNoteBuilder = () => {
    if (onDraftReady) onDraftReady(draft, visitType);
  };

  const handleInsertVoiceText = (field, text) => {
    const fieldRefs = {
      symptoms: { ref: symptomsRef, state: symptoms, setState: setSymptoms },
      interventions: { ref: interventionsRef, state: interventions, setState: setInterventions },
      education: { ref: educationRef, state: education, setState: setEducation },
      plan: { ref: planRef, state: plan, setState: setPlan },
    };

    const fieldConfig = fieldRefs[field];
    if (!fieldConfig) return;

    const newValue = fieldConfig.state ? fieldConfig.state + ' ' + text : text;
    fieldConfig.setState(newValue);
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
      <button
        className="w-full px-4 py-3 bg-gradient-to-r from-violet-50 to-purple-50 border-b border-violet-100 flex items-center justify-between"
        onClick={() => setCollapsed(v => !v)}
      >
        <div className="flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-violet-600" />
          <span className="text-sm font-bold text-violet-800">Structured Note Drafter</span>
          <Badge className="bg-violet-100 text-violet-700 text-xs">AI</Badge>
        </div>
        {collapsed ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronUp className="w-4 h-4 text-gray-400" />}
      </button>

      {!collapsed && (
        <div className="p-4 space-y-4">
          <p className="text-xs text-gray-500">Fill in structured fields to generate a complete clinical note draft.</p>

          {/* Visit Type */}
          <div>
            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Visit Type</Label>
            <Select value={visitType} onValueChange={setVisitType}>
              <SelectTrigger className="h-9 text-sm bg-gray-50">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {VISIT_TYPES.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          {/* Vitals grid */}
          <div>
            <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-1.5 block">Vital Signs</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { key: "bp_systolic", placeholder: "Systolic", label: "BP Sys" },
                { key: "bp_diastolic", placeholder: "Diastolic", label: "BP Dia" },
                { key: "heart_rate", placeholder: "bpm", label: "HR" },
                { key: "resp_rate", placeholder: "br/min", label: "RR" },
                { key: "o2_sat", placeholder: "%", label: "O2 Sat" },
                { key: "temperature", placeholder: "°F", label: "Temp" },
                { key: "weight", placeholder: "lbs", label: "Weight" },
                { key: "pain_level", placeholder: "0-10", label: "Pain" },
              ].map(f => (
                <div key={f.key}>
                  <Label className="text-xs text-gray-500 mb-0.5 block">{f.label}</Label>
                  <Input
                    value={vitals[f.key]}
                    onChange={e => setVital(f.key, e.target.value)}
                    placeholder={f.placeholder}
                    className="h-8 text-sm bg-gray-50"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Text fields */}
          {[
            { label: "Symptoms / Chief Complaint", val: symptoms, set: setSymptoms, ref: symptomsRef, fieldName: "symptoms", placeholder: "e.g., Patient complains of increased shortness of breath on exertion, bilateral ankle edema noted..." },
            { label: "Interventions Performed", val: interventions, set: setInterventions, ref: interventionsRef, fieldName: "interventions", placeholder: "e.g., Wound assessment and dressing change to right heel, medication reconciliation reviewed..." },
            { label: "Patient Education", val: education, set: setEducation, ref: educationRef, fieldName: "education", placeholder: "e.g., Educated on medication schedule and signs of infection; patient verbalized understanding..." },
            { label: "Plan / Follow-up", val: plan, set: setPlan, ref: planRef, fieldName: "plan", placeholder: "e.g., Continue wound care every visit, notify physician if wound deteriorates, next visit in 3 days..." },
          ].map(f => (
            <div key={f.label}>
              <div className="flex items-center justify-between mb-1.5">
                <Label className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{f.label}</Label>
                <VoiceNoteIntegration 
                  onInsertText={(text) => handleInsertVoiceText(f.fieldName, text)}
                  disabled={loading}
                />
              </div>
              <textarea
                ref={f.ref}
                value={f.val}
                onChange={e => f.set(e.target.value)}
                placeholder={f.placeholder}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 bg-gray-50 focus:ring-2 focus:ring-violet-300 focus:border-violet-400 outline-none resize-none min-h-[70px] leading-relaxed"
              />
            </div>
          ))}

          <Button
            onClick={generate}
            disabled={!hasContent || loading}
            className="w-full bg-violet-600 hover:bg-violet-700 h-10 gap-2 font-semibold"
          >
            {loading
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Drafting Note…</>
              : <><Sparkles className="w-4 h-4" /> Generate Note Draft</>}
          </Button>

          {/* Draft output */}
          {draft && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-green-500" />
                  <span className="text-sm font-semibold text-gray-800">Draft Ready</span>
                </div>
                <div className="flex gap-2">
                  {onDraftReady && (
                    <Button size="sm" variant="outline" className="h-7 text-xs gap-1" onClick={useInNoteBuilder}>
                      <Sparkles className="w-3 h-3" /> Use in Note Builder
                    </Button>
                  )}
                  <Button size="sm" className="h-7 bg-green-600 hover:bg-green-700 gap-1 text-xs" onClick={copy}>
                    {copied ? <><CheckCircle2 className="w-3 h-3" /> Copied</> : <><Copy className="w-3 h-3" /> Copy</>}
                  </Button>
                </div>
              </div>
              <textarea
                value={draft}
                onChange={e => setDraft(e.target.value)}
                className="w-full min-h-[200px] text-sm font-mono border border-gray-200 rounded-lg px-3 py-2.5 bg-white focus:ring-2 focus:ring-violet-300 outline-none resize-none"
              />
              <p className="text-xs text-gray-400 italic">Review and edit before using. Click "Use in Note Builder" to run full compliance check.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
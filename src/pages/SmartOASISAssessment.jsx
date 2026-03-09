import React, { useState, useMemo, useCallback } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ChevronDown, ChevronUp, Users, Search, Save, CheckCircle2,
  Loader2, AlertCircle, Brain, ArrowRight, ChevronRight, Activity
} from "lucide-react";
import { toast } from "sonner";
import { evaluateOASIS, computeCareScope } from "@/components/oasis/oasisScoringEngine";
import OASISSuggestionPanel from "@/components/oasis/OASISSuggestionPanel";
import { INTERVENTIONS_LIBRARY } from "@/components/carePlan/InterventionLibrary";

// ─── OASIS Question Definitions ──────────────────────────────────────────────
const OASIS_SECTIONS = [
  {
    id: "demographics",
    title: "Clinical Record & Status",
    icon: "👤",
    questions: [
      {
        id: "m0069",
        label: "M0069 — Prognosis",
        description: "Does this patient have a condition that has a life expectancy of a year or less?",
        type: "radio",
        options: [{ value: 0, label: "0 — No" }, { value: 1, label: "1 — Yes" }],
      },
      {
        id: "m1020",
        label: "M1020 — Primary Diagnosis",
        description: "Primary diagnosis that prompted home care admission.",
        type: "select",
        options: [
          { value: 0, label: "Select primary diagnosis..." },
          { value: 1, label: "Diabetes Mellitus" },
          { value: 2, label: "Heart Failure / CHF" },
          { value: 3, label: "COPD / Asthma" },
          { value: 4, label: "Hypertension" },
          { value: 5, label: "Wound / Pressure Ulcer" },
          { value: 6, label: "Orthopedic (Hip/Knee)" },
          { value: 7, label: "Stroke / CVA" },
          { value: 8, label: "Other" },
        ],
      },
      {
        id: "m1030",
        label: "M1030 — Therapies at Home",
        description: "Intravenous/infusion therapy, parenteral nutrition, or enteral nutrition received at home.",
        type: "radio",
        options: [
          { value: 0, label: "0 — None" },
          { value: 1, label: "1 — IV/Infusion therapy" },
          { value: 2, label: "2 — Parenteral/Enteral nutrition" },
        ],
      },
    ],
  },
  {
    id: "living",
    title: "Living Arrangements & Supports",
    icon: "🏠",
    questions: [
      {
        id: "m1100",
        label: "M1100 — Patient Living Situation",
        description: "Which of the following best describes the patient's residential circumstance and availability of assistance?",
        type: "radio",
        options: [
          { value: 0, label: "01 — Patient lives alone with no assistance available" },
          { value: 1, label: "02 — Patient lives alone with scheduled assistance" },
          { value: 2, label: "03 — Patient lives with others with no assistance from them" },
          { value: 3, label: "04 — Patient lives with others who provide assistance" },
        ],
      },
    ],
  },
  {
    id: "sensory",
    title: "Sensory Status",
    icon: "👁",
    questions: [
      {
        id: "m1730",
        label: "M1730 — Depression Screening",
        description: "PHQ-2 positive screen — 'Little interest or pleasure in doing things' or 'Feeling down, depressed, or hopeless' in last 2 weeks?",
        type: "radio",
        options: [
          { value: 0, label: "0 — No (negative screen)" },
          { value: 1, label: "1 — Yes to one question (positive screen)" },
          { value: 2, label: "2 — Yes to both questions (positive screen)" },
        ],
        alert: { threshold: 1, message: "Positive depression screen — psychosocial assessment indicated." }
      },
      {
        id: "m1740",
        label: "M1740 — Cognitive, Behavioral & Psychiatric Symptoms",
        description: "Behavioral symptoms that could be due to a cognitive, mental, or behavioral impairment.",
        type: "radio",
        options: [
          { value: 0, label: "0 — None of the behaviors" },
          { value: 1, label: "1 — Memory deficit / recall difficulty" },
          { value: 2, label: "2 — Impaired decision-making" },
          { value: 3, label: "3 — Verbal disruption / disruptive behavior" },
          { value: 4, label: "4 — Physical aggression" },
        ],
      },
      {
        id: "m1700",
        label: "M1700 — Cognitive Functioning",
        description: "Patient's current (day of assessment) level of alertness, orientation, comprehension, concentration, and immediate memory.",
        type: "radio",
        options: [
          { value: 0, label: "0 — Alert/oriented, able to focus and shift attention" },
          { value: 1, label: "1 — Requires prompting (cues) to focus" },
          { value: 2, label: "2 — Requires assistance and clinical supervision" },
          { value: 3, label: "3 — Requires considerable assistance — very short attention span" },
          { value: 4, label: "4 — Totally dependent due to disturbances" },
        ],
      },
    ],
  },
  {
    id: "respiratory",
    title: "Respiratory Status",
    icon: "🫁",
    questions: [
      {
        id: "m1400",
        label: "M1400 — Respiratory Status: Dyspnea",
        description: "Shortness of breath or labored breathing observed at assessment.",
        type: "radio",
        alert: { threshold: 2, message: "Significant dyspnea — respiratory management interventions strongly recommended." },
        options: [
          { value: 0, label: "0 — Not short of breath" },
          { value: 1, label: "1 — Short of breath when walking over 20 feet" },
          { value: 2, label: "2 — Short of breath with moderate exertion" },
          { value: 3, label: "3 — Short of breath with minimal exertion at rest" },
          { value: 4, label: "4 — Short of breath with minimal exertion or at rest" },
        ],
      },
    ],
  },
  {
    id: "cardiac",
    title: "Cardiac & Elimination",
    icon: "❤️",
    questions: [
      {
        id: "m1340",
        label: "M1340 — Surgical Wound",
        description: "Does the patient have a surgical wound?",
        type: "radio",
        options: [
          { value: 0, label: "0 — No" },
          { value: 1, label: "1 — Yes — not infected" },
          { value: 2, label: "2 — Yes — infected/complications" },
        ],
        alert: { threshold: 1, message: "Surgical wound present — wound care protocol required." }
      },
      {
        id: "m1306",
        label: "M1306 — Unhealed Pressure Ulcer(s)",
        description: "Does the patient have at least one unhealed pressure ulcer/injury at any stage?",
        type: "radio",
        options: [
          { value: 0, label: "0 — No" },
          { value: 1, label: "1 — Yes" },
        ],
        alert: { threshold: 1, message: "Pressure ulcer present — wound care interventions required for compliance." }
      },
      {
        id: "m1350",
        label: "M1350 — Skin Lesion or Open Wound",
        description: "Does the patient have a skin lesion or open wound, excluding pressure ulcers and surgical wounds?",
        type: "radio",
        options: [
          { value: 0, label: "0 — No" },
          { value: 1, label: "1 — Yes" },
        ],
      },
    ],
  },
  {
    id: "functional",
    title: "Functional Status & ADLs",
    icon: "🧍",
    questions: [
      {
        id: "m1800",
        label: "M1800 — Grooming",
        description: "Current ability to tend to personal hygiene needs (i.e., washing face and hands, hair care, shaving).",
        type: "radio",
        options: [
          { value: 0, label: "0 — Able to groom self unaided" },
          { value: 1, label: "1 — Grooming utensils must be placed within reach" },
          { value: 2, label: "2 — Someone must assist the patient" },
          { value: 3, label: "3 — Patient depends entirely upon someone else" },
        ],
      },
      {
        id: "m1860",
        label: "M1860 — Ambulation/Locomotion",
        description: "Current ability to walk safely, once in a standing position.",
        type: "radio",
        alert: { threshold: 2, message: "Impaired ambulation detected — fall prevention interventions strongly recommended." },
        options: [
          { value: 0, label: "0 — Able to ambulate on even/uneven surfaces" },
          { value: 1, label: "1 — With minor difficulty on uneven surfaces" },
          { value: 2, label: "2 — Requires use of a one-handed device" },
          { value: 3, label: "3 — Requires use of a two-handed device" },
          { value: 4, label: "4 — Requires use of a wheelchair" },
          { value: 5, label: "5 — Unable to ambulate" },
        ],
      },
      {
        id: "m1810",
        label: "M1810 — Upper Body Dressing",
        description: "Current ability to dress upper body safely (excluding prostheses).",
        type: "radio",
        options: [
          { value: 0, label: "0 — No assistance needed" },
          { value: 1, label: "1 — With minor difficulty or helper makes adaptations" },
          { value: 2, label: "2 — Someone must assist" },
          { value: 3, label: "3 — Totally dependent" },
        ],
      },
      {
        id: "m1820",
        label: "M1820 — Lower Body Dressing",
        description: "Current ability to dress lower body safely (excluding prostheses).",
        type: "radio",
        options: [
          { value: 0, label: "0 — No assistance needed" },
          { value: 1, label: "1 — With minor difficulty or helper makes adaptations" },
          { value: 2, label: "2 — Someone must assist" },
          { value: 3, label: "3 — Totally dependent" },
        ],
      },
    ],
  },
  {
    id: "medications",
    title: "Medications",
    icon: "💊",
    questions: [
      {
        id: "m2001",
        label: "M2001 — Drug Regimen Review",
        description: "Was a complete drug regimen review conducted? Did any identified drug issues require follow-up?",
        type: "radio",
        alert: { threshold: 1, message: "Drug regimen issues identified — medication management education is required." },
        options: [
          { value: 0, label: "0 — No issues found during review" },
          { value: 1, label: "1 — Issues found, physician contacted within 24 hours" },
          { value: 2, label: "2 — Issues found, physician not contacted" },
        ],
      },
      {
        id: "m2010",
        label: "M2010 — High-Risk Drug Education",
        description: "Has the patient/caregiver received education on high-risk drug?",
        type: "radio",
        options: [
          { value: 0, label: "0 — Not applicable — no high-risk drugs" },
          { value: 1, label: "1 — Education completed" },
          { value: 2, label: "2 — Education not completed" },
        ],
      },
      {
        id: "m2020",
        label: "M2020 — Management of Oral Medications",
        description: "Patient's current ability to prepare and take all oral medications reliably and safely.",
        type: "radio",
        options: [
          { value: 0, label: "0 — Able to independently take correct medications" },
          { value: 1, label: "1 — Able if given daily reminders" },
          { value: 2, label: "2 — Able to take only if medication is prepared" },
          { value: 3, label: "3 — Unable to take medication" },
        ],
      },
    ],
  },
  {
    id: "fallrisk",
    title: "Fall Risk",
    icon: "⚠️",
    questions: [
      {
        id: "m1910",
        label: "M1910 — Fall Risk Assessment",
        description: "Has the patient had two or more falls in the past year or any fall with injury?",
        type: "radio",
        alert: { threshold: 1, message: "Fall history identified — comprehensive fall prevention protocol is required." },
        options: [
          { value: 0, label: "0 — No falls in past year" },
          { value: 1, label: "1 — One fall or any fall with injury" },
          { value: 2, label: "2 — Two or more falls" },
        ],
      },
      {
        id: "m1900",
        label: "M1900 — Prior Functioning",
        description: "In the 2 weeks prior to the current illness, exacerbation, or injury, patient's ADL ability was:",
        type: "radio",
        options: [
          { value: 0, label: "0 — Independent — no assistance needed" },
          { value: 1, label: "1 — Required some assistance" },
          { value: 2, label: "2 — Required considerable assistance" },
          { value: 3, label: "3 — Mostly or totally dependent" },
          { value: 4, label: "4 — Unknown" },
        ],
      },
    ],
  },
];

function QuestionField({ question, value, onChange }) {
  const numVal = value !== undefined && value !== "" ? parseInt(value, 10) : undefined;
  const showAlert = question.alert && numVal !== undefined && numVal >= question.alert.threshold;

  if (question.type === "select") {
    return (
      <div className="space-y-2">
        <select
          value={value ?? ""}
          onChange={e => onChange(question.id, e.target.value === "" ? "" : parseInt(e.target.value, 10))}
          className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:ring-2 focus:ring-indigo-400 outline-none bg-white"
        >
          {question.options.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {question.options.map(opt => {
        const isSelected = numVal === opt.value;
        return (
          <label
            key={opt.value}
            className={`flex items-center gap-3 p-2.5 rounded-lg border cursor-pointer transition-all ${
              isSelected
                ? "border-indigo-400 bg-indigo-50 ring-1 ring-indigo-200"
                : "border-gray-100 hover:border-gray-200 hover:bg-gray-50"
            }`}
          >
            <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${
              isSelected ? "border-indigo-500 bg-indigo-500" : "border-gray-300"
            }`}>
              {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
            </div>
            <span className="text-sm text-gray-700">{opt.label}</span>
            <input type="radio" className="hidden" checked={isSelected} onChange={() => onChange(question.id, opt.value)} />
          </label>
        );
      })}

      {showAlert && (
        <div className="flex items-start gap-2 mt-2 p-2.5 bg-amber-50 border border-amber-300 rounded-lg">
          <AlertCircle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-800 font-medium">{question.alert.message}</p>
        </div>
      )}
    </div>
  );
}

function SectionCard({ section, answers, onChange }) {
  const [open, setOpen] = useState(true);
  const answeredCount = section.questions.filter(q => answers[q.id] !== undefined && answers[q.id] !== "").length;

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
      <button
        onClick={() => setOpen(v => !v)}
        className="w-full flex items-center gap-3 px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors"
      >
        <span className="text-xl leading-none">{section.icon}</span>
        <span className="text-sm font-bold text-gray-800 flex-1 text-left">{section.title}</span>
        <span className="text-xs text-gray-400">{answeredCount}/{section.questions.length} answered</span>
        <div className={`w-4 h-4 rounded-full border-2 ml-1 ${answeredCount === section.questions.length ? "border-green-500 bg-green-500" : "border-gray-300"}`}>
          {answeredCount === section.questions.length && <CheckCircle2 className="w-3 h-3 text-white" />}
        </div>
        {open ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {open && (
        <div className="divide-y divide-gray-100">
          {section.questions.map(q => (
            <div key={q.id} className="px-4 py-4">
              <div className="mb-2">
                <p className="text-sm font-semibold text-gray-800">{q.label}</p>
                <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{q.description}</p>
              </div>
              <QuestionField
                question={q}
                value={answers[q.id]}
                onChange={onChange}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function SmartOASISAssessment() {
  const queryClient = useQueryClient();
  const [answers, setAnswers] = useState({});
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const [saving, setSaving] = useState(false);
  const [addedToCarePlan, setAddedToCarePlan] = useState([]);

  const { data: patients = [] } = useQuery({
    queryKey: ["patients-list"],
    queryFn: () => base44.entities.Patient.list("-updated_date", 100),
    initialData: [],
  });

  const { data: existingCarePlans = [] } = useQuery({
    queryKey: ["care-plans", selectedPatientId],
    queryFn: () => base44.entities.CarePlan.filter({ patient_id: selectedPatientId }),
    enabled: !!selectedPatientId,
    initialData: [],
  });

  const filteredPatients = patients.filter(p =>
    `${p.first_name} ${p.last_name}`.toLowerCase().includes(patientSearch.toLowerCase())
  );
  const selectedPatient = patients.find(p => p.id === selectedPatientId);

  const handleAnswer = useCallback((questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  }, []);

  const suggestions = useMemo(() => evaluateOASIS(answers), [answers]);
  const careScope = useMemo(() => computeCareScope(answers), [answers]);

  const answeredTotal = Object.values(answers).filter(v => v !== "" && v !== undefined).length;
  const totalQuestions = OASIS_SECTIONS.reduce((sum, s) => sum + s.questions.length, 0);

  const existingCarePlanInterventionNames = new Set(existingCarePlans.map(p => p.problem));

  const handleAddToCarePlan = async (interventionIds) => {
    if (!selectedPatientId) { toast.error("Please select a patient first."); return; }

    const newInterventions = interventionIds.filter(id => !addedToCarePlan.includes(id));
    if (newInterventions.length === 0) return;

    setSaving(true);
    try {
      const allItems = INTERVENTIONS_LIBRARY.flatMap(cat => cat.items);
      const toAdd = newInterventions.map(id => allItems.find(i => i.id === id)).filter(Boolean);

      await Promise.all(toAdd.map(item =>
        base44.entities.CarePlan.create({
          patient_id: selectedPatientId,
          problem: item.name,
          goal: `Achieve and maintain ${item.name.toLowerCase()} goals as documented in the care plan.`,
          interventions: [item.description],
          status: "active",
        })
      ));

      setAddedToCarePlan(prev => [...new Set([...prev, ...newInterventions])]);
      queryClient.invalidateQueries(["care-plans", selectedPatientId]);
      toast.success(`${newInterventions.length} intervention${newInterventions.length > 1 ? "s" : ""} added to care plan!`);
    } catch (e) {
      toast.error("Failed to add interventions.");
    }
    setSaving(false);
  };

  const handleSaveAssessment = async () => {
    if (!selectedPatientId) { toast.error("Please select a patient first."); return; }
    setSaving(true);
    try {
      await base44.entities.Patient.update(selectedPatientId, {
        care_type: careScope === "hospice" ? "hospice" : "home_health",
      });

      await base44.entities.OASISAssessment.create({
        patient_id: selectedPatientId,
        assessment_type: "SOC",
        responses: answers,
        status: "completed",
        completed_date: new Date().toISOString(),
      });

      toast.success("OASIS assessment saved successfully.");
    } catch (e) {
      toast.error("Failed to save assessment.");
    }
    setSaving(false);
  };

  const careScopeBadge = {
    home_health: { label: "Home Health", color: "bg-blue-100 text-blue-800 border-blue-200" },
    hospice: { label: "Hospice", color: "bg-purple-100 text-purple-800 border-purple-200" },
    both: { label: "Home Health + Hospice", color: "bg-indigo-100 text-indigo-800 border-indigo-200" },
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 px-4 py-3 flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <Brain className="w-5 h-5 text-indigo-600" />
          <span className="text-sm font-bold text-gray-800">Smart OASIS Assessment</span>
        </div>

        {/* Patient picker */}
        <div className="relative">
          <button
            onClick={() => setShowDropdown(v => !v)}
            className="flex items-center gap-2 text-sm border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50 transition-colors"
          >
            <Users className="w-4 h-4 text-gray-400" />
            <span className={selectedPatient ? "text-gray-800 font-medium" : "text-gray-400"}>
              {selectedPatient ? `${selectedPatient.first_name} ${selectedPatient.last_name}` : "Select Patient"}
            </span>
            <ChevronDown className="w-3 h-3 text-gray-400" />
          </button>
          {showDropdown && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-xl z-50">
              <div className="p-2 border-b">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                  <input
                    autoFocus
                    value={patientSearch}
                    onChange={e => setPatientSearch(e.target.value)}
                    placeholder="Search patients..."
                    className="w-full pl-8 pr-3 py-1.5 text-sm border border-gray-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-400"
                  />
                </div>
              </div>
              <div className="max-h-48 overflow-y-auto py-1">
                {filteredPatients.map(p => (
                  <button key={p.id} onClick={() => { setSelectedPatientId(p.id); setShowDropdown(false); setPatientSearch(""); setAddedToCarePlan([]); }}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-indigo-50 ${selectedPatientId === p.id ? "bg-indigo-50 text-indigo-700 font-medium" : "text-gray-700"}`}>
                    <div className="font-medium">{p.first_name} {p.last_name}</div>
                    {p.primary_diagnosis && <div className="text-xs text-gray-400 truncate">{p.primary_diagnosis}</div>}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Dynamic care scope badge */}
        {answeredTotal > 0 && (
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-400">Suggested Care Scope:</span>
            <span className={`text-xs font-semibold border rounded-full px-2.5 py-0.5 ${careScopeBadge[careScope].color}`}>
              {careScopeBadge[careScope].label}
            </span>
          </div>
        )}

        <div className="ml-auto flex items-center gap-2">
          <span className="text-xs text-gray-400">{answeredTotal}/{totalQuestions} answered</span>
          <Button size="sm" onClick={handleSaveAssessment} disabled={saving || answeredTotal === 0 || !selectedPatientId}>
            {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Save className="w-3.5 h-3.5 mr-1.5" />}
            Save Assessment
          </Button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 flex overflow-hidden" onClick={() => showDropdown && setShowDropdown(false)}>
        {/* Left — OASIS Questions */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {OASIS_SECTIONS.map(section => (
            <SectionCard
              key={section.id}
              section={section}
              answers={answers}
              onChange={handleAnswer}
            />
          ))}
        </div>

        {/* Right — Dynamic Suggestions */}
        <div className="w-80 flex-shrink-0 bg-white border-l border-gray-200 flex flex-col overflow-hidden">
          <div className="flex-shrink-0 px-4 pt-3 pb-2 border-b bg-gradient-to-r from-indigo-50 to-purple-50">
            <div className="flex items-center gap-2">
              <Brain className="w-4 h-4 text-indigo-600" />
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">AI-Driven Recommendations</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Updates live as you complete the assessment</p>
          </div>
          <div className="flex-1 overflow-hidden flex flex-col">
            <OASISSuggestionPanel
              suggestions={suggestions}
              onAddToCarePlan={handleAddToCarePlan}
              addedIds={addedToCarePlan}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
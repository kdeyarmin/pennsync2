import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Pill, Plus, Trash2, Copy, AlertTriangle, CheckCircle2,
  Loader2, RefreshCw, ChevronDown, ChevronUp, PenLine
} from "lucide-react";
import { base44 } from "@/api/base44Client";

// ─── Status config ────────────────────────────────────────────────────────────
const STATUS_OPTIONS = [
  { value: "active",        label: "Active",        color: "bg-green-100 text-green-800 border-green-300" },
  { value: "held",          label: "Held",          color: "bg-yellow-100 text-yellow-800 border-yellow-300" },
  { value: "discontinued",  label: "Discontinued",  color: "bg-red-100 text-red-800 border-red-300" },
];

function statusBadgeClass(status) {
  return STATUS_OPTIONS.find(s => s.value === status)?.color || STATUS_OPTIONS[0].color;
}

// ─── Drug-Drug Interaction checker ───────────────────────────────────────────
const COMMON_INTERACTIONS = {
  "warfarin":      ["aspirin", "ibuprofen", "naproxen", "acetaminophen", "antibiotics"],
  "metformin":     ["contrast dye", "alcohol"],
  "lisinopril":    ["potassium supplements", "spironolactone", "nsaids"],
  "metoprolol":    ["verapamil", "diltiazem", "clonidine"],
  "simvastatin":   ["clarithromycin", "erythromycin", "ketoconazole"],
  "fluoxetine":    ["maois", "tramadol", "dextromethorphan"],
  "digoxin":       ["verapamil", "amiodarone", "quinidine"],
  "acetaminophen": ["warfarin"],
};

function checkInteractions(medications) {
  const active = medications.filter(m => m.status !== "discontinued");
  const interactions = [];
  const medNames = active.map(m => m.name.toLowerCase());
  for (let i = 0; i < medNames.length; i++) {
    for (let j = i + 1; j < medNames.length; j++) {
      const m1 = medNames[i], m2 = medNames[j];
      if (
        COMMON_INTERACTIONS[m1]?.some(k => m2.includes(k)) ||
        COMMON_INTERACTIONS[m2]?.some(k => m1.includes(k))
      ) {
        interactions.push({
          id: `${i}-${j}`,
          med1: active[i].name,
          med2: active[j].name,
          finding: `Potential interaction: ${active[i].name} ↔ ${active[j].name}`,
          recommendation: "Verify dosing and monitor for adverse effects. Consider notifying prescriber.",
        });
      }
    }
  }
  return interactions;
}

// ─── Reconciliation note generator ───────────────────────────────────────────
function buildReconciliationNote(medications, interactions) {
  if (medications.length === 0) return "";

  const active        = medications.filter(m => m.status === "active");
  const held          = medications.filter(m => m.status === "held");
  const discontinued  = medications.filter(m => m.status === "discontinued");

  let note = "MEDICATION RECONCILIATION:\n";
  note += `Total medications reviewed: ${medications.length} (Active: ${active.length}`;
  if (held.length)         note += `, Held: ${held.length}`;
  if (discontinued.length) note += `, Discontinued: ${discontinued.length}`;
  note += ").\n\n";

  if (active.length > 0) {
    note += "ACTIVE MEDICATIONS:\n";
    active.forEach(m => {
      note += `• ${m.name}${m.dosage ? ` ${m.dosage}` : ""}${m.frequency ? ` — ${m.frequency}` : ""}${m.prescriber ? ` (Rx: ${m.prescriber})` : ""}\n`;
    });
    note += "\n";
  }

  if (held.length > 0) {
    note += "MEDICATIONS ON HOLD:\n";
    held.forEach(m => {
      note += `• ${m.name}${m.dosage ? ` ${m.dosage}` : ""}${m.hold_reason ? ` — Reason: ${m.hold_reason}` : ""}\n`;
    });
    note += "\n";
  }

  if (discontinued.length > 0) {
    note += "DISCONTINUED MEDICATIONS:\n";
    discontinued.forEach(m => {
      note += `• ${m.name}${m.dosage ? ` ${m.dosage}` : ""}${m.dc_reason ? ` — Reason: ${m.dc_reason}` : ""}\n`;
    });
    note += "\n";
  }

  if (interactions.length > 0) {
    note += `CLINICAL ALERTS: ${interactions.length} potential drug interaction(s) identified among active medications — reviewed with patient; prescribing physician notified as indicated.\n\n`;
  }

  note += "Patient verbalized understanding of current medication regimen, expected effects, and adherence plan.";
  return note;
}

// ─── Component ────────────────────────────────────────────────────────────────
export default function MedicationManagementTab({ patient, patientId, onAddToNote }) {
  const initMeds = (patient?.current_medications || []).map((m, i) => ({
    ...m,
    _id: m.id || `init-${i}`,
    status: m.status || "active",
  }));

  const [medications, setMedications]         = useState(initMeds);
  const [newMed, setNewMed]                   = useState({ name: "", dosage: "", frequency: "", prescriber: "", status: "active" });
  const [generating, setGenerating]           = useState(false);
  const [reconciliationNote, setRecon]        = useState("");
  const [copied, setCopied]                   = useState(false);
  const [expandedInteraction, setExpandedInt] = useState(null);
  const [editingId, setEditingId]             = useState(null);
  const [editReason, setEditReason]           = useState("");
  const [savingPatient, setSavingPatient]     = useState(false);
  const [savedToPatient, setSavedToPatient]   = useState(false);

  const interactions = useMemo(() => checkInteractions(medications), [medications]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const addMedication = () => {
    if (!newMed.name.trim()) return;
    setMedications(prev => [...prev, { ...newMed, _id: `new-${Date.now()}` }]);
    setNewMed({ name: "", dosage: "", frequency: "", prescriber: "", status: "active" });
  };

  const removeMedication = (id) => setMedications(prev => prev.filter(m => m._id !== id));

  const changeStatus = (id, newStatus) => {
    if (newStatus !== "active") {
      setEditingId(id);
      setEditReason("");
    } else {
      applyStatusChange(id, newStatus, "");
    }
  };

  const applyStatusChange = (id, status, reason) => {
    setMedications(prev => prev.map(m => {
      if (m._id !== id) return m;
      const update = { ...m, status };
      if (status === "held")         update.hold_reason = reason;
      if (status === "discontinued") update.dc_reason   = reason;
      return update;
    }));
    setEditingId(null);
    setEditReason("");
  };

  const generateReconciliation = async () => {
    setGenerating(true);
    try {
      const baseNote = buildReconciliationNote(medications, interactions);
      if (interactions.length > 0) {
        const enhanced = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a clinical medication specialist. Enhance the following medication reconciliation note to be professional and clinical. Keep it concise. Return ONLY the note text.\n\n${baseNote}`,
        });
        setRecon(typeof enhanced === "string" ? enhanced : baseNote);
      } else {
        setRecon(baseNote);
      }
    } catch {
      setRecon(buildReconciliationNote(medications, interactions));
    } finally {
      setGenerating(false);
    }
  };

  const syncToPatient = async () => {
    if (!patientId) return;
    setSavingPatient(true);
    try {
      const medsPayload = medications.map(({ _id, ...rest }) => rest);
      await base44.entities.Patient.update(patientId, { current_medications: medsPayload });
      setSavedToPatient(true);
      setTimeout(() => setSavedToPatient(false), 3000);
    } catch (err) {
      console.error("Failed to sync medications:", err);
    } finally {
      setSavingPatient(false);
    }
  };

  const copyRecon = () => {
    navigator.clipboard.writeText(reconciliationNote);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeMeds = medications.filter(m => m.status === "active");
  const heldMeds   = medications.filter(m => m.status === "held");
  const dcMeds     = medications.filter(m => m.status === "discontinued");

  return (
    <div className="space-y-4">

      {/* ── Summary row ─────────────────────────────────────────────────── */}
      {medications.length > 0 && (
        <div className="flex gap-2 flex-wrap">
          <Badge className="bg-green-100 text-green-800 border border-green-300 px-3 py-1 text-xs font-semibold">
            Active: {activeMeds.length}
          </Badge>
          {heldMeds.length > 0 && (
            <Badge className="bg-yellow-100 text-yellow-800 border border-yellow-300 px-3 py-1 text-xs font-semibold">
              Held: {heldMeds.length}
            </Badge>
          )}
          {dcMeds.length > 0 && (
            <Badge className="bg-red-100 text-red-800 border border-red-300 px-3 py-1 text-xs font-semibold">
              Discontinued: {dcMeds.length}
            </Badge>
          )}
          {patientId && (
            <Button
              onClick={syncToPatient}
              disabled={savingPatient}
              size="sm"
              variant="outline"
              className="ml-auto h-7 text-xs gap-1.5"
            >
              {savingPatient ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Saving…</>
              ) : savedToPatient ? (
                <><CheckCircle2 className="w-3 h-3 text-green-600" /> Saved to Patient</>
              ) : (
                <><RefreshCw className="w-3 h-3" /> Sync to Patient Record</>
              )}
            </Button>
          )}
        </div>
      )}

      {/* ── Add Medication ──────────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <p className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Plus className="w-4 h-4 text-indigo-600" /> Add Medication
        </p>
        <div className="space-y-2">
          <Input
            placeholder="Medication name (e.g., Lisinopril)"
            value={newMed.name}
            onChange={e => setNewMed({ ...newMed, name: e.target.value })}
            className="h-10 bg-gray-50"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Dosage (e.g., 10mg)"
              value={newMed.dosage}
              onChange={e => setNewMed({ ...newMed, dosage: e.target.value })}
              className="h-10 bg-gray-50"
            />
            <Input
              placeholder="Frequency (e.g., twice daily)"
              value={newMed.frequency}
              onChange={e => setNewMed({ ...newMed, frequency: e.target.value })}
              className="h-10 bg-gray-50"
            />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Prescriber (optional)"
              value={newMed.prescriber}
              onChange={e => setNewMed({ ...newMed, prescriber: e.target.value })}
              className="h-10 bg-gray-50"
            />
            {/* Status selector */}
            <div className="flex gap-1">
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s.value}
                  onClick={() => setNewMed({ ...newMed, status: s.value })}
                  className={`flex-1 text-xs font-semibold rounded-lg border px-1 py-2 transition-all ${
                    newMed.status === s.value
                      ? s.color + " border-2"
                      : "bg-gray-50 border-gray-200 text-gray-500 hover:border-gray-400"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <Button
            onClick={addMedication}
            className="bg-indigo-600 hover:bg-indigo-700 w-full h-10 gap-2"
          >
            <Plus className="w-4 h-4" /> Add Medication
          </Button>
        </div>
      </div>

      {/* ── Medication List ─────────────────────────────────────────────── */}
      {medications.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <p className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-1.5">
            <Pill className="w-4 h-4 text-indigo-600" /> All Medications ({medications.length})
          </p>
          <div className="space-y-2">
            {medications.map(med => (
              <div key={med._id}>
                <div
                  className={`flex items-start gap-3 p-3 rounded-lg border transition-colors ${
                    med.status === "discontinued"
                      ? "bg-red-50 border-red-200 opacity-75"
                      : med.status === "held"
                      ? "bg-yellow-50 border-yellow-200"
                      : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className={`text-sm font-medium text-gray-900 ${med.status === "discontinued" ? "line-through text-gray-400" : ""}`}>
                        {med.name}
                      </p>
                      <Badge className={`text-xs px-2 py-0.5 border ${statusBadgeClass(med.status)}`}>
                        {STATUS_OPTIONS.find(s => s.value === med.status)?.label || "Active"}
                      </Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {med.dosage && <span>{med.dosage}</span>}
                      {med.frequency && <span> · {med.frequency}</span>}
                      {med.prescriber && <span> · Rx: {med.prescriber}</span>}
                    </p>
                    {med.hold_reason && (
                      <p className="text-xs text-yellow-700 mt-0.5 italic">Hold reason: {med.hold_reason}</p>
                    )}
                    {med.dc_reason && (
                      <p className="text-xs text-red-600 mt-0.5 italic">DC reason: {med.dc_reason}</p>
                    )}
                    {/* Inline reason input when changing status */}
                    {editingId === med._id && (
                      <div className="mt-2 flex gap-2 items-center">
                        <Input
                          autoFocus
                          placeholder={`Reason for ${newMed.pendingStatus === "held" ? "hold" : "discontinuation"}...`}
                          value={editReason}
                          onChange={e => setEditReason(e.target.value)}
                          className="h-8 text-xs flex-1 bg-white"
                        />
                        <Button
                          size="sm"
                          className="h-8 text-xs bg-indigo-600 hover:bg-indigo-700"
                          onClick={() => applyStatusChange(med._id, med._pendingStatus, editReason)}
                        >
                          Save
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-8 text-xs"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* Status change buttons */}
                  <div className="flex gap-1 shrink-0">
                    {STATUS_OPTIONS.filter(s => s.value !== med.status).map(s => (
                      <button
                        key={s.value}
                        title={`Mark as ${s.label}`}
                        onClick={() => {
                          // For non-active statuses, show a reason prompt inline
                          if (s.value !== "active") {
                            setMedications(prev => prev.map(m => m._id === med._id ? { ...m, _pendingStatus: s.value } : m));
                            setEditingId(med._id);
                            setEditReason("");
                          } else {
                            applyStatusChange(med._id, s.value, "");
                          }
                        }}
                        className={`text-xs px-2 py-1 rounded border font-medium transition-all ${s.color} hover:opacity-80`}
                      >
                        {s.label}
                      </button>
                    ))}
                    <button
                      onClick={() => removeMedication(med._id)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Drug Interactions ───────────────────────────────────────────── */}
      {interactions.length > 0 && (
        <>
          <Alert className="border-orange-300 bg-orange-50 py-3">
            <AlertTriangle className="w-5 h-5 text-orange-600" />
            <AlertDescription className="text-orange-900 text-sm">
              <strong>{interactions.length} potential drug interaction(s)</strong> among active medications — review recommended
            </AlertDescription>
          </Alert>

          <div className="bg-white border border-orange-200 rounded-xl p-4 shadow-sm space-y-2">
            <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-orange-600" /> Drug Interactions
            </p>
            {interactions.map((interaction, idx) => (
              <div key={interaction.id} className="border border-orange-200 rounded-lg bg-orange-50 overflow-hidden">
                <button
                  onClick={() => setExpandedInt(expandedInteraction === idx ? null : idx)}
                  className="w-full flex items-center justify-between gap-2 p-3 hover:bg-orange-100 transition-colors text-left"
                >
                  <p className="text-sm font-medium text-orange-900">{interaction.finding}</p>
                  {expandedInteraction === idx
                    ? <ChevronUp className="w-4 h-4 text-orange-600 shrink-0" />
                    : <ChevronDown className="w-4 h-4 text-orange-600 shrink-0" />}
                </button>
                {expandedInteraction === idx && (
                  <div className="border-t border-orange-200 p-3 bg-white text-sm text-gray-700">
                    <p className="font-medium mb-1">Recommendation:</p>
                    <p>{interaction.recommendation}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ── Reconciliation Note ─────────────────────────────────────────── */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <PenLine className="w-4 h-4 text-indigo-600" /> Reconciliation Note
          </p>
          <Button
            onClick={generateReconciliation}
            disabled={generating || medications.length === 0}
            size="sm"
            variant="outline"
            className="gap-1.5 h-8 text-xs"
          >
            {generating ? (
              <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating…</>
            ) : (
              <><RefreshCw className="w-3.5 h-3.5" /> Generate Note</>
            )}
          </Button>
        </div>

        {reconciliationNote ? (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <textarea
                  value={reconciliationNote}
                  onChange={e => setRecon(e.target.value)}
                  className="flex-1 bg-white border border-green-200 rounded-lg p-2 text-xs font-mono min-h-[120px] resize-none"
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={copyRecon} variant="outline" size="sm" className="flex-1 gap-2 h-10">
                {copied
                  ? <><CheckCircle2 className="w-4 h-4" /> Copied</>
                  : <><Copy className="w-4 h-4" /> Copy</>}
              </Button>
              {onAddToNote && (
                <Button
                  onClick={() => onAddToNote(reconciliationNote)}
                  size="sm"
                  className="flex-1 bg-indigo-600 hover:bg-indigo-700 h-10 gap-2"
                >
                  <Plus className="w-4 h-4" /> Add to Note
                </Button>
              )}
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-500">
            {medications.length === 0
              ? "Add medications above to generate a reconciliation note."
              : "Click \"Generate Note\" to create a clinical medication reconciliation summary including all status changes."}
          </p>
        )}
      </div>

    </div>
  );
}
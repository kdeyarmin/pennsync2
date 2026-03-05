import React, { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Pill, Plus, Trash2, Copy, AlertTriangle, CheckCircle2,
  Loader2, Search, ChevronDown, ChevronUp, RefreshCw
} from "lucide-react";
import { base44 } from "@/api/base44Client";

const COMMON_INTERACTIONS = {
  "warfarin": ["aspirin", "ibuprofen", "naproxen", "acetaminophen", "antibiotics"],
  "metformin": ["contrast dye", "alcohol"],
  "lisinopril": ["potassium supplements", "spironolactone", "nsaids"],
  "metoprolol": ["verapamil", "diltiazem", "clonidine"],
  "simvastatin": ["clarithromycin", "erythromycin", "ketoconazole"],
  "fluoxetine": ["maois", "tramadol", "dextromethorphan"],
  "digoxin": ["verapamil", "amiodarone", "quinidine"],
  "acetaminophen": ["warfarin"],
};

function checkInteractions(medications) {
  const interactions = [];
  const medNames = medications.map(m => m.name.toLowerCase());

  for (let i = 0; i < medNames.length; i++) {
    for (let j = i + 1; j < medNames.length; j++) {
      const med1 = medNames[i];
      const med2 = medNames[j];

      // Check direct interactions
      if (COMMON_INTERACTIONS[med1]?.some(int => med2.includes(int))) {
        interactions.push({
          id: `${i}-${j}`,
          severity: "high",
          med1: medications[i].name,
          med2: medications[j].name,
          finding: `Potential interaction between ${medications[i].name} and ${medications[j].name}`,
          recommendation: "Verify dosing and monitor for adverse effects. Consider consulting prescriber."
        });
      }
      if (COMMON_INTERACTIONS[med2]?.some(int => med1.includes(int))) {
        interactions.push({
          id: `${j}-${i}`,
          severity: "high",
          med1: medications[i].name,
          med2: medications[j].name,
          finding: `Potential interaction between ${medications[i].name} and ${medications[j].name}`,
          recommendation: "Verify dosing and monitor for adverse effects. Consider consulting prescriber."
        });
      }
    }
  }

  return interactions;
}

function generateReconciliationNote(medications, interactions) {
  if (medications.length === 0) return "";

  let note = "MEDICATION RECONCILIATION:\n";
  note += `Current active medications verified with patient (${medications.length} total):\n`;

  medications.forEach(med => {
    note += `• ${med.name} ${med.dosage || ""}${med.frequency ? ` - ${med.frequency}` : ""}${med.prescriber ? ` (prescribed by ${med.prescriber})` : ""}\n`;
  });

  if (interactions.length > 0) {
    note += `\nCLINICAL ALERTS: ${interactions.length} potential drug interaction(s) identified — reviewed with patient and prescribing physician notified if indicated.\n`;
  }

  note += "\nPatient verbalized understanding of medication regimen, side effects, and adherence expectations.";
  return note;
}

export default function MedicationManagementTab({ patient, patientId, onAddToNote }) {
  const [medications, setMedications] = useState(patient?.current_medications || []);
  const [newMed, setNewMed] = useState({ name: "", dosage: "", frequency: "", prescriber: "" });
  const [searching, setSearching] = useState("");
  const [generating, setGenerating] = useState(false);
  const [reconciliationNote, setReconciliationNote] = useState("");
  const [copied, setCopied] = useState(false);
  const [expandedInteraction, setExpandedInteraction] = useState(null);

  const interactions = useMemo(() => checkInteractions(medications), [medications]);

  const addMedication = () => {
    if (!newMed.name.trim()) return;
    setMedications([...medications, { ...newMed, id: Date.now() }]);
    setNewMed({ name: "", dosage: "", frequency: "", prescriber: "" });
  };

  const removeMedication = (id) => {
    setMedications(medications.filter((m, i) => (m.id || i) !== id));
  };

  const generateReconciliation = async () => {
    setGenerating(true);
    try {
      const baseNote = generateReconciliationNote(medications, interactions);

      // Enhance with AI if interactions present
      if (interactions.length > 0) {
        const enhanced = await base44.integrations.Core.InvokeLLM({
          prompt: `You are a clinical medication specialist. Create a professional medication reconciliation note.

MEDICATIONS: ${medications.map(m => `${m.name} ${m.dosage || ""} ${m.frequency || ""}`).join("; ")}

INTERACTIONS IDENTIFIED: ${interactions.map(i => `${i.med1} + ${i.med2}: ${i.finding}`).join("; ")}

BASE NOTE: ${baseNote}

Enhance this note to be more clinical and detailed while keeping it concise. Return ONLY the enhanced note text.`,
        });
        setReconciliationNote(typeof enhanced === "string" ? enhanced : baseNote);
      } else {
        setReconciliationNote(baseNote);
      }
    } catch (err) {
      console.error("Error generating reconciliation:", err);
      setReconciliationNote(generateReconciliationNote(medications, interactions));
    } finally {
      setGenerating(false);
    }
  };

  const copyReconciliation = () => {
    navigator.clipboard.writeText(reconciliationNote);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const addToNote = () => {
    if (reconciliationNote && onAddToNote) {
      onAddToNote(reconciliationNote);
    }
  };

  const filteredMeds = medications.filter(m =>
    m.name.toLowerCase().includes(searching.toLowerCase()) ||
    (m.dosage && m.dosage.toLowerCase().includes(searching.toLowerCase()))
  );

  return (
    <div className="space-y-4">
      {/* Add New Medication */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <p className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
          <Pill className="w-4 h-4 text-indigo-600" /> Add Medication
        </p>
        <div className="space-y-3">
          <Input
            placeholder="Medication name (e.g., Lisinopril, Metformin)"
            value={newMed.name}
            onChange={(e) => setNewMed({ ...newMed, name: e.target.value })}
            className="h-10 bg-gray-50"
          />
          <div className="grid grid-cols-2 gap-2">
            <Input
              placeholder="Dosage (e.g., 10mg)"
              value={newMed.dosage}
              onChange={(e) => setNewMed({ ...newMed, dosage: e.target.value })}
              className="h-10 bg-gray-50"
            />
            <Input
              placeholder="Frequency (e.g., twice daily)"
              value={newMed.frequency}
              onChange={(e) => setNewMed({ ...newMed, frequency: e.target.value })}
              className="h-10 bg-gray-50"
            />
          </div>
          <Input
            placeholder="Prescriber (optional)"
            value={newMed.prescriber}
            onChange={(e) => setNewMed({ ...newMed, prescriber: e.target.value })}
            className="h-10 bg-gray-50"
          />
          <Button onClick={addMedication} className="bg-indigo-600 hover:bg-indigo-700 w-full h-10 gap-2">
            <Plus className="w-4 h-4" /> Add Medication
          </Button>
        </div>
      </div>

      {/* Current Medications */}
      {medications.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold text-gray-900">Active Medications ({medications.length})</p>
            {medications.length > 2 && (
              <Input
                placeholder="Search medications..."
                value={searching}
                onChange={(e) => setSearching(e.target.value)}
                className="h-8 w-40 text-xs"
              />
            )}
          </div>
          <div className="space-y-2">
            {filteredMeds.map((med, idx) => (
              <div
                key={med.id || idx}
                className="flex items-center justify-between gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{med.name}</p>
                  <p className="text-xs text-gray-500">
                    {med.dosage && <span>{med.dosage}</span>}
                    {med.frequency && <span> • {med.frequency}</span>}
                    {med.prescriber && <span> • {med.prescriber}</span>}
                  </p>
                </div>
                <button
                  onClick={() => removeMedication(med.id || idx)}
                  className="text-gray-400 hover:text-red-600 p-2 rounded-lg hover:bg-red-50 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Drug-Drug Interactions */}
      {interactions.length > 0 && (
        <Alert className="border-orange-300 bg-orange-50 py-3">
          <AlertTriangle className="w-5 h-5 text-orange-600" />
          <AlertDescription className="text-orange-900 text-sm">
            <strong>{interactions.length} potential drug interaction(s) detected</strong> — review recommended
          </AlertDescription>
        </Alert>
      )}

      {interactions.length > 0 && (
        <div className="bg-white border border-orange-200 rounded-xl p-4 shadow-sm space-y-2">
          <p className="text-sm font-semibold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-orange-600" /> Drug Interactions
          </p>
          {interactions.map((interaction, idx) => (
            <div
              key={interaction.id}
              className="border border-orange-200 rounded-lg bg-orange-50 overflow-hidden"
            >
              <button
                onClick={() => setExpandedInteraction(expandedInteraction === idx ? null : idx)}
                className="w-full flex items-center justify-between gap-2 p-3 hover:bg-orange-100 transition-colors text-left"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-orange-900">
                    {interaction.med1} ↔ {interaction.med2}
                  </p>
                  <p className="text-xs text-orange-700">{interaction.finding}</p>
                </div>
                {expandedInteraction === idx ? (
                  <ChevronUp className="w-4 h-4 text-orange-600 shrink-0" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-orange-600 shrink-0" />
                )}
              </button>
              {expandedInteraction === idx && (
                <div className="border-t border-orange-200 p-3 bg-white text-sm text-gray-700">
                  <p className="font-medium text-gray-900 mb-1">Recommendation:</p>
                  <p>{interaction.recommendation}</p>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Reconciliation Note */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <p className="text-sm font-semibold text-gray-900">Medication Reconciliation Note</p>
          <Button
            onClick={generateReconciliation}
            disabled={generating || medications.length === 0}
            size="sm"
            variant="outline"
            className="gap-1.5 h-8 text-xs"
          >
            {generating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" /> Generating...
              </>
            ) : (
              <>
                <RefreshCw className="w-3.5 h-3.5" /> Generate Note
              </>
            )}
          </Button>
        </div>

        {reconciliationNote && (
          <div className="space-y-3">
            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0 mt-0.5" />
                <textarea
                  value={reconciliationNote}
                  onChange={(e) => setReconciliationNote(e.target.value)}
                  className="flex-1 bg-white border border-green-200 rounded-lg p-2 text-xs font-mono min-h-[120px] resize-none"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button
                onClick={copyReconciliation}
                variant="outline"
                size="sm"
                className="flex-1 gap-2 h-10"
              >
                {copied ? (
                  <>
                    <CheckCircle2 className="w-4 h-4" /> Copied
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" /> Copy
                  </>
                )}
              </Button>
              {onAddToNote && (
                <Button onClick={addToNote} size="sm" className="flex-1 bg-indigo-600 hover:bg-indigo-700 h-10 gap-2">
                  <Plus className="w-4 h-4" /> Add to Note
                </Button>
              )}
            </div>
          </div>
        )}

        {!reconciliationNote && medications.length > 0 && (
          <p className="text-xs text-gray-500">Click "Generate Note" to create a reconciliation summary.</p>
        )}
      </div>
    </div>
  );
}
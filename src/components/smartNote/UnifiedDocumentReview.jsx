import { useState } from "react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ConstrainedNoteReviewer from "./ConstrainedNoteReviewer";

// Thin adapter: hosts (e.g. the VisitScribe page) pass a rough note and get back
// a fully-factual, fact-checked note via the shared constrained-scribe pipeline.
// (Previously this ran a single LLM that judged compliance, invented a score,
// and rewrote the note unverified — that approach has been replaced.)

const VISIT_TYPES = [
  { value: "routine_visit", label: "Routine Visit" },
  { value: "admission", label: "Start of Care (SOC)" },
  { value: "recertification", label: "Recertification" },
  { value: "discharge", label: "Discharge" },
  { value: "prn", label: "PRN / Crisis Visit" },
];

function priorNoteOf(patientData) {
  if (!patientData) return "";
  const hist = patientData.enhanced_notes_history;
  if (Array.isArray(hist) && hist.length) return hist[hist.length - 1]?.note || "";
  return patientData.clinical_notes || "";
}

export default function UnifiedDocumentReview({ roughNote, visitType, patientData, currentUser, onEnhancedNoteReady }) {
  const [vt, setVt] = useState(visitType || "routine_visit");
  const serviceLine = patientData?.care_type === "hospice" ? "hospice" : "home_health";

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5 block">Visit Type</Label>
        <Select value={vt} onValueChange={setVt}>
          <SelectTrigger className="h-9 text-sm bg-slate-50 max-w-xs"><SelectValue /></SelectTrigger>
          <SelectContent>
            {VISIT_TYPES.map(v => <SelectItem key={v.value} value={v.value}>{v.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <ConstrainedNoteReviewer
        roughNote={roughNote}
        serviceLine={serviceLine}
        visitType={vt}
        priorNote={priorNoteOf(patientData)}
        currentUser={currentUser}
        onFinalNote={(note) => onEnhancedNoteReady?.({ enhancedNote: note })}
      />
    </div>
  );
}

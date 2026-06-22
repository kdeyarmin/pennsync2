import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import SearchablePatientSelect from "@/components/ui/SearchablePatientSelect";
import ScribeNoteRecorder from "@/components/scribe/ScribeNoteRecorder";
import ConstrainedNoteReviewer from "@/components/smartNote/ConstrainedNoteReviewer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle, Mic } from "lucide-react";
import PageContainer from "@/components/ui/PageContainer";
import PageHeader from "@/components/ui/PageHeader";
import { toast } from 'sonner';

const VISIT_TYPES = [
  "skilled_nursing",
  "admission",
  "recertification",
  "discharge",
  "routine_visit",
  "prn"
];

const COMMON_DIAGNOSES = [
  "Congestive Heart Failure",
  "COPD",
  "Diabetes Mellitus",
  "Hypertension",
  "Pneumonia",
  "Wound Care",
  "Pain Management",
  "Post-Surgical Recovery",
  "Infection Management",
  "Other"
];

export default function VisitScribePage() {
  const [selectedPatient, setSelectedPatient] = useState("");
  const [visitType, setVisitType] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [customDiagnosis, setCustomDiagnosis] = useState("");
  const [generatedNote, setGeneratedNote] = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: () => base44.entities.Patient.list("-updated_date", 100),
    initialData: []
  });
  const { data: currentUser } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });

  const handleNoteGenerated = (noteData) => {
    setGeneratedNote(noteData);
    setShowReview(true);
  };

  // Persist the reviewer's verified note with a REAL deterministic coverage score
  // (replaces the old hardcoded quality_score: 95). Re-verifies edits first.
  const saveToChart = async (api) => {
    if (!selectedPatient) { toast.error("Select a patient first."); return; }
    setSaving(true);
    try {
      let result = api.result;
      if (api.dirty) {
        result = await api.recheck();
        if (!result) { setSaving(false); return; } // fact-check failed → reviewer shows the fix panel
      }
      const finalNote = result.finalNote;
      const coverageScore = result.coverageScore;

      await base44.entities.Visit.create({
        patient_id: selectedPatient,
        visit_date: new Date().toISOString().split("T")[0],
        visit_type: visitType,
        nurse_notes: finalNote,
        status: "completed",
        compliance_score: coverageScore,
      });

      // Re-fetch the patient immediately before appending so we don't clobber
      // history written since the cached list loaded. This is a read-modify-write
      // on an array; using the (possibly minutes-old) list cache loses entries
      // from concurrent saves. Fall back to the cached record only if get fails.
      let patient = null;
      try {
        patient = await base44.entities.Patient.get(selectedPatient);
      } catch {
        patient = patients.find(p => p.id === selectedPatient) || null;
      }
      if (patient) {
        const enhancedNotesHistory = Array.isArray(patient.enhanced_notes_history)
          ? [...patient.enhanced_notes_history]
          : [];
        enhancedNotesHistory.push({
          date: new Date().toISOString(),
          visit_type: visitType,
          diagnosis: finalDiagnosis,
          enhanced_note: finalNote,
          rough_note: generatedNote.transcription,
          compliance_score: coverageScore,
          nurse_email: currentUser?.email,
        });
        await base44.entities.Patient.update(selectedPatient, {
          enhanced_notes_history: enhancedNotesHistory,
        });
      }

      setSaved(true);
      setSaveSuccess(true);
      setTimeout(() => {
        setSelectedPatient("");
        setVisitType("");
        setDiagnosis("");
        setCustomDiagnosis("");
        setGeneratedNote(null);
        setShowReview(false);
        setSaveSuccess(false);
        setSaved(false);
      }, 2000);
    } catch (error) {
      console.error("Error saving note:", error);
      toast.error("Failed to save note. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleDiscard = () => {
    setGeneratedNote(null);
    setShowReview(false);
    setSaved(false);
  };

  const finalDiagnosis = diagnosis === "Other" ? customDiagnosis : diagnosis;
  const isReadyToRecord = selectedPatient && visitType && diagnosis;

  return (
    <PageContainer>
      <PageHeader
        icon={Mic}
        eyebrow="Documentation"
        title="Medical Scribe"
        description="Record your patient interaction and let AI generate your clinical documentation"
        favoritePage="MedicalScribe"
      />

        {saveSuccess && (
          <Alert className="bg-emerald-50 border-emerald-200">
            <CheckCircle className="h-4 w-4 text-emerald-600" />
            <AlertDescription className="text-emerald-800">
              Note saved successfully! You can now create another note.
            </AlertDescription>
          </Alert>
        )}

        {!showReview ? (
          <div className="space-y-6">
            {/* Patient Selection Section */}
            <Card>
              <CardHeader>
                <CardTitle>Visit Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Patient Selection */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Patient</label>
                  <SearchablePatientSelect
                    patients={patients}
                    value={selectedPatient}
                    onValueChange={setSelectedPatient}
                    placeholder="Select a patient..."
                  />
                </div>

                {/* Visit Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Visit Type</label>
                  <Select value={visitType} onValueChange={setVisitType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select visit type..." />
                    </SelectTrigger>
                    <SelectContent>
                      {VISIT_TYPES.map(type => (
                        <SelectItem key={type} value={type}>
                          {type.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Diagnosis */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-700">Primary Diagnosis</label>
                  <Select value={diagnosis} onValueChange={setDiagnosis}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select diagnosis..." />
                    </SelectTrigger>
                    <SelectContent>
                      {COMMON_DIAGNOSES.map(diag => (
                        <SelectItem key={diag} value={diag}>
                          {diag}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Custom Diagnosis Input */}
                {diagnosis === "Other" && (
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-slate-700">Specify Diagnosis</label>
                    <input
                      type="text"
                      value={customDiagnosis}
                      onChange={(e) => setCustomDiagnosis(e.target.value)}
                      placeholder="Enter diagnosis..."
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recording Section */}
            {isReadyToRecord ? (
              <ScribeNoteRecorder
                patientId={selectedPatient}
                visitType={visitType}
                diagnosis={finalDiagnosis}
                onNoteGenerated={handleNoteGenerated}
              />
            ) : (
              <Alert className="bg-amber-50 border-amber-200">
                <AlertCircle className="h-4 w-4 text-amber-600" />
                <AlertDescription className="text-amber-800">
                  Please select a patient, visit type, and diagnosis to begin recording.
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          /* Review Section — shared factual constrained-scribe pipeline */
          <ConstrainedNoteReviewer
            roughNote={generatedNote.transcription}
            serviceLine="home_health"
            visitType={visitType}
            currentUser={currentUser}
            onBack={handleDiscard}
            renderFinalNote={(api) => (
              <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
                <div className="flex items-center justify-between px-4 py-2.5 bg-slate-50 border-b border-slate-100">
                  <span className="text-sm font-semibold text-slate-700">Final Clinical Note</span>
                  <span className="text-xs text-slate-400">editable · {api.coverage}% coverage</span>
                </div>
                <textarea
                  value={api.finalNote}
                  onChange={e => api.setFinalNote(e.target.value)}
                  className="w-full min-h-[280px] font-mono text-sm border-0 px-4 py-3 bg-white resize-none outline-none"
                />
                <div className="flex gap-2 px-4 py-3 border-t border-slate-100 bg-slate-50">
                  <Button onClick={api.copy} className="flex-1 bg-emerald-600 hover:bg-emerald-700 h-11 gap-2 font-semibold">
                    {api.copied ? "Copied!" : "Copy"}
                  </Button>
                  <Button
                    onClick={() => saveToChart(api)}
                    disabled={saving || saved || !!(api.fixRequired && !api.fixRequired.offlinePending)}
                    className="h-11 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold"
                  >
                    {saving ? "Saving…" : saved ? "Saved" : "Save to Chart"}
                  </Button>
                </div>
              </div>
            )}
          />
        )}
    </PageContainer>
  );
}
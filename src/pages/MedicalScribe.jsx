import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import SearchablePatientSelect from "@/components/ui/SearchablePatientSelect";
import ScribeNoteRecorder from "@/components/scribe/ScribeNoteRecorder";
import NoteReviewPanel from "@/components/scribe/NoteReviewPanel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertCircle, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

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

export default function MedicalScribePage() {
  const [selectedPatient, setSelectedPatient] = useState("");
  const [visitType, setVisitType] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [customDiagnosis, setCustomDiagnosis] = useState("");
  const [generatedNote, setGeneratedNote] = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const { data: patients = [] } = useQuery({
    queryKey: ["patients"],
    queryFn: () => base44.entities.Patient.list("-updated_date", 100),
    initialData: []
  });

  const handleNoteGenerated = (noteData) => {
    setGeneratedNote(noteData);
    setShowReview(true);
  };

  const handleSaveNote = async (finalNote) => {
    try {
      // Create visit record
      const visitData = {
        patient_id: selectedPatient,
        visit_date: new Date().toISOString().split("T")[0],
        visit_type: visitType,
        nurse_notes: finalNote,
        status: "completed"
      };

      await base44.entities.Visit.create(visitData);

      // Save to patient's enhanced notes history
      const patient = patients.find(p => p.id === selectedPatient);
      if (patient) {
        const enhancedNotesHistory = patient.enhanced_notes_history || [];
        enhancedNotesHistory.push({
          date: new Date().toISOString(),
          visit_type: visitType,
          diagnosis: diagnosis === "Other" ? customDiagnosis : diagnosis,
          enhanced_note: finalNote,
          rough_note: generatedNote.transcription,
          quality_score: 95,
          nurse_email: (await base44.auth.me()).email
        });

        await base44.entities.Patient.update(selectedPatient, {
          enhanced_notes_history: enhancedNotesHistory
        });
      }

      setSaveSuccess(true);
      setTimeout(() => {
        // Reset form
        setSelectedPatient("");
        setVisitType("");
        setDiagnosis("");
        setCustomDiagnosis("");
        setGeneratedNote(null);
        setShowReview(false);
        setSaveSuccess(false);
      }, 2000);
    } catch (error) {
      console.error("Error saving note:", error);
      alert("Failed to save note. Please try again.");
    }
  };

  const handleDiscard = () => {
    setGeneratedNote(null);
    setShowReview(false);
  };

  const finalDiagnosis = diagnosis === "Other" ? customDiagnosis : diagnosis;
  const isReadyToRecord = selectedPatient && visitType && diagnosis;

  return (
    <div className="min-h-screen bg-gradient-to-br from-sky-50 to-blue-100 p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">Medical Scribe Assistant</h1>
          <p className="text-gray-600">
            Record your patient interaction and let AI generate your clinical documentation
          </p>
        </div>

        {saveSuccess && (
          <Alert className="bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">
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
                  <label className="text-sm font-medium text-gray-700">Patient</label>
                  <SearchablePatientSelect
                    patients={patients}
                    value={selectedPatient}
                    onValueChange={setSelectedPatient}
                    placeholder="Select a patient..."
                  />
                </div>

                {/* Visit Type */}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-gray-700">Visit Type</label>
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
                  <label className="text-sm font-medium text-gray-700">Primary Diagnosis</label>
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
                    <label className="text-sm font-medium text-gray-700">Specify Diagnosis</label>
                    <input
                      type="text"
                      value={customDiagnosis}
                      onChange={(e) => setCustomDiagnosis(e.target.value)}
                      placeholder="Enter diagnosis..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
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
              <Alert className="bg-yellow-50 border-yellow-200">
                <AlertCircle className="h-4 w-4 text-yellow-600" />
                <AlertDescription className="text-yellow-800">
                  Please select a patient, visit type, and diagnosis to begin recording.
                </AlertDescription>
              </Alert>
            )}
          </div>
        ) : (
          /* Review Section */
          <NoteReviewPanel
            transcription={generatedNote.transcription}
            generatedNote={generatedNote.generatedNote}
            patientId={selectedPatient}
            visitType={visitType}
            diagnosis={finalDiagnosis}
            onSave={handleSaveNote}
            onDiscard={handleDiscard}
          />
        )}
      </div>
    </div>
  );
}
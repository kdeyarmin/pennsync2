import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, AlertCircle, Edit2, Save, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export default function NoteReviewPanel({
  transcription,
  generatedNote,
  patientId,
  visitType,
  diagnosis,
  onSave,
  onDiscard,
  treatmentSuggestions = []
}) {
  const [editedNote, setEditedNote] = useState(generatedNote);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editedNote);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">Review Clinical Note</h2>
        <p className="text-gray-600">
          Review and edit the AI-generated note before saving to patient record
        </p>
      </div>

      <Tabs defaultValue="note" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="note">Generated Note</TabsTrigger>
          <TabsTrigger value="transcription">Transcription</TabsTrigger>
          <TabsTrigger value="treatments">Treatment Suggestions</TabsTrigger>
        </TabsList>

        {/* Generated Note Tab */}
        <TabsContent value="note" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>AI-Generated Clinical Note</CardTitle>
              {!isEditing && (
                <Button
                  onClick={() => setIsEditing(true)}
                  variant="outline"
                  size="sm"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              )}
            </CardHeader>
            <CardContent className="space-y-4">
              {isEditing ? (
                <div className="space-y-4">
                  <Textarea
                    value={editedNote}
                    onChange={(e) => setEditedNote(e.target.value)}
                    className="font-mono text-sm h-96 p-4"
                    placeholder="Clinical note content..."
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={() => {
                        setEditedNote(generatedNote);
                        setIsEditing(false);
                      }}
                      variant="outline"
                    >
                      <X className="w-4 h-4 mr-2" />
                      Cancel
                    </Button>
                    <Button
                      onClick={() => setIsEditing(false)}
                      className="bg-blue-600 hover:bg-blue-700"
                    >
                      <Save className="w-4 h-4 mr-2" />
                      Done Editing
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="bg-gray-50 p-4 rounded-lg border whitespace-pre-wrap font-sans text-sm leading-relaxed text-gray-800">
                  {editedNote}
                </div>
              )}

              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  Note generated from transcription on {new Date().toLocaleString()}
                </AlertDescription>
              </Alert>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Transcription Tab */}
        <TabsContent value="transcription" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Audio Transcription</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-gray-50 p-4 rounded-lg border text-sm leading-relaxed text-gray-800 max-h-96 overflow-y-auto">
                {transcription}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Treatment Suggestions Tab */}
        <TabsContent value="treatments" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Treatment Suggestions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {treatmentSuggestions.length > 0 ? (
                <div className="space-y-3">
                  {treatmentSuggestions.map((treatment, idx) => (
                    <div key={idx} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-gray-900">{treatment.treatment}</h4>
                        <Badge 
                          variant="outline"
                          className={
                            treatment.category === 'medication' ? 'bg-blue-50 text-blue-700' :
                            treatment.category === 'therapy' ? 'bg-purple-50 text-purple-700' :
                            treatment.category === 'monitoring' ? 'bg-orange-50 text-orange-700' :
                            'bg-green-50 text-green-700'
                          }
                        >
                          {treatment.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{treatment.rationale}</p>
                      <div className="flex items-center gap-2">
                        <div className="h-2 bg-gray-200 rounded-full flex-1">
                          <div
                            className="h-2 bg-indigo-600 rounded-full"
                            style={{ width: `${treatment.confidence}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-gray-500">
                          {treatment.confidence}%
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <Alert className="bg-yellow-50 border-yellow-200">
                  <AlertCircle className="h-4 w-4 text-yellow-600" />
                  <AlertDescription className="text-yellow-800">
                    No treatment suggestions available for this visit.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Action Buttons */}
      <div className="flex gap-3 pt-6 border-t">
        <Button
          onClick={onDiscard}
          variant="outline"
          size="lg"
          className="flex-1"
        >
          <X className="w-4 h-4 mr-2" />
          Discard & Re-record
        </Button>
        <Button
          onClick={handleSave}
          disabled={isSaving}
          size="lg"
          className="flex-1 bg-green-600 hover:bg-green-700"
        >
          {isSaving ? (
            <>
              <div className="w-4 h-4 mr-2 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Save to Patient Record
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
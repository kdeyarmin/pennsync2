import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CheckCircle, AlertCircle, Edit2, Save, X, Loader2, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { base44 } from "@/api/base44Client";

export default function NoteReviewPanel({
  transcription,
  generatedNote,
  _patientId,
  _visitType,
  _diagnosis,
  onSave,
  onDiscard,
  treatmentSuggestions = []
}) {
  const [editedNote, setEditedNote] = useState(generatedNote);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [summary, setSummary] = useState(null);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(editedNote);
    } finally {
      setIsSaving(false);
    }
  };

  const generateSummary = async () => {
    setIsGeneratingSummary(true);
    try {
      const response = await base44.asServiceRole.integrations.Core.InvokeLLM({
        prompt: `Create a concise executive summary (3-4 bullet points) of this clinical note highlighting key findings, diagnoses, and recommended actions:

${editedNote}`,
        add_context_from_internet: false
      });
      setSummary(typeof response === 'string' ? response : response.text || '');
    } catch (error) {
      console.error('Error generating summary:', error);
      alert('Failed to generate summary');
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-slate-900 mb-2">Review Clinical Note</h2>
        <p className="text-slate-600">
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
          {summary && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader className="pb-3">
                <CardTitle className="text-base flex items-center gap-2 text-blue-900">
                  <Sparkles className="w-4 h-4" />
                  Executive Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm text-blue-900 whitespace-pre-wrap">
                {summary}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>AI-Generated Clinical Note</CardTitle>
              <div className="flex gap-2">
                {!summary && !isEditing && (
                  <Button
                    onClick={generateSummary}
                    disabled={isGeneratingSummary}
                    variant="outline"
                    size="sm"
                    className="bg-blue-50 hover:bg-blue-100 text-blue-700 border-blue-200"
                  >
                    {isGeneratingSummary ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Summarizing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 mr-2" />
                        Summarize
                      </>
                    )}
                  </Button>
                )}
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
              </div>
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
                <div className="bg-slate-50 p-4 rounded-lg border whitespace-pre-wrap font-sans text-sm leading-relaxed text-slate-800">
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
              <div className="bg-slate-50 p-4 rounded-lg border text-sm leading-relaxed text-slate-800 max-h-96 overflow-y-auto">
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
                    <div key={idx} className="border rounded-lg p-4 hover:bg-slate-50 transition">
                      <div className="flex items-start justify-between mb-2">
                        <h4 className="font-semibold text-slate-900">{treatment.treatment}</h4>
                        <Badge 
                          variant="outline"
                          className={
                            treatment.category === 'medication' ? 'bg-blue-50 text-blue-700' :
                            treatment.category === 'therapy' ? 'bg-navy-50 text-navy-700' :
                            treatment.category === 'monitoring' ? 'bg-orange-50 text-orange-700' :
                            'bg-green-50 text-green-700'
                          }
                        >
                          {treatment.category}
                        </Badge>
                      </div>
                      <p className="text-sm text-slate-600 mb-2">{treatment.rationale}</p>
                      <div className="flex items-center gap-2">
                        <div className="h-2 bg-slate-200 rounded-full flex-1">
                          <div
                            className="h-2 bg-indigo-600 rounded-full"
                            style={{ width: `${treatment.confidence}%` }}
                          />
                        </div>
                        <span className="text-xs font-medium text-slate-500">
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
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Edit2, Copy, Check, AlertCircle, FileText } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function NoteReviewPanel({ 
  transcription, 
  generatedNote, 
  patientId,
  visitType,
  diagnosis,
  onSave,
  onDiscard 
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedNote, setEditedNote] = useState(generatedNote);
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(editedNote);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSave = () => {
    onSave(editedNote);
    setIsEditing(false);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-indigo-600" />
              Review Generated Note
            </CardTitle>
            <div className="flex gap-2 flex-wrap">
              {visitType && <Badge variant="outline">{visitType}</Badge>}
              {diagnosis && <Badge variant="outline">{diagnosis}</Badge>}
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="note" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="note">Clinical Note</TabsTrigger>
            <TabsTrigger value="transcription">Transcription</TabsTrigger>
          </TabsList>

          {/* Clinical Note Tab */}
          <TabsContent value="note" className="space-y-4 mt-4">
            <Alert className="bg-blue-50 border-blue-200">
              <AlertCircle className="h-4 w-4 text-blue-600" />
              <AlertDescription className="text-blue-800">
                Review the AI-generated note below. Edit as needed to ensure accuracy and completeness before saving.
              </AlertDescription>
            </Alert>

            {!isEditing ? (
              <div className="space-y-4">
                <div className="prose prose-sm max-w-none p-4 bg-gray-50 rounded-lg border border-gray-200 whitespace-pre-wrap text-sm text-gray-800 font-family-mono leading-relaxed max-h-96 overflow-y-auto">
                  {editedNote}
                </div>
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={handleCopy}
                    className="gap-2 flex-1"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        Copy Note
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setIsEditing(true)}
                    className="gap-2 flex-1"
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit Note
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <Textarea
                  value={editedNote}
                  onChange={(e) => setEditedNote(e.target.value)}
                  className="min-h-96 font-mono text-sm"
                  placeholder="Edit your clinical note here..."
                />
                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setEditedNote(generatedNote);
                      setIsEditing(false);
                    }}
                    className="flex-1"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </TabsContent>

          {/* Transcription Tab */}
          <TabsContent value="transcription" className="space-y-4 mt-4">
            <Alert className="bg-gray-50 border-gray-200">
              <AlertCircle className="h-4 w-4 text-gray-600" />
              <AlertDescription>
                This is the raw transcription from your voice recording.
              </AlertDescription>
            </Alert>

            <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 whitespace-pre-wrap text-sm text-gray-800 leading-relaxed max-h-96 overflow-y-auto">
              {transcription}
            </div>
          </TabsContent>
        </Tabs>

        {/* Action Buttons */}
        <div className="flex gap-3 border-t pt-4">
          <Button
            variant="outline"
            onClick={onDiscard}
            className="flex-1"
          >
            Discard
          </Button>
          <Button
            onClick={handleSave}
            disabled={isEditing}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700"
          >
            <Check className="w-4 h-4 mr-2" />
            Complete Note
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
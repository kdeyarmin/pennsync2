import React, { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Send, Flag } from "lucide-react";
import { format } from "date-fns";

export default function TeamNotes({ visitId, patientId }) {
  const queryClient = useQueryClient();
  const [newNote, setNewNote] = useState("");
  const [showNotes, setShowNotes] = useState(false);

  // For demo purposes, using visit entity to store team notes
  // In production, you'd create a TeamNote entity
  const { data: notes } = useQuery({
    queryKey: ['teamNotes', patientId],
    queryFn: async () => {
      // Placeholder - would query TeamNote entity
      return [];
    },
    initialData: [],
  });

  const addNoteMutation = useMutation({
    mutationFn: async (noteData) => {
      // Placeholder - would create TeamNote record
      return { id: Date.now(), ...noteData };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teamNotes', patientId] });
      setNewNote("");
    },
  });

  const handleAddNote = async () => {
    if (!newNote.trim()) return;

    const user = await base44.auth.me();
    await addNoteMutation.mutateAsync({
      patient_id: patientId,
      visit_id: visitId,
      note: newNote,
      created_by: user.email,
      created_date: new Date().toISOString(),
      flagged: false
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            Team Collaboration Notes
            {notes.length > 0 && <Badge variant="outline">{notes.length}</Badge>}
          </CardTitle>
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowNotes(!showNotes)}
          >
            {showNotes ? 'Hide' : 'Show'} Notes
          </Button>
        </div>
      </CardHeader>

      {showNotes && (
        <CardContent className="space-y-4">
          <div className="space-y-3">
            {notes.length > 0 ? (
              notes.map((note) => (
                <div key={note.id} className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {note.created_by}
                      </Badge>
                      <span className="text-xs text-gray-500">
                        {format(new Date(note.created_date), 'MMM d, h:mm a')}
                      </span>
                    </div>
                    {note.flagged && (
                      <Flag className="w-4 h-4 text-red-600" />
                    )}
                  </div>
                  <p className="text-sm text-gray-700">{note.note}</p>
                </div>
              ))
            ) : (
              <p className="text-sm text-gray-500 text-center py-4">
                No team notes yet. Add one to communicate with other nurses.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Textarea
              placeholder="Leave a note for the next nurse (e.g., 'Patient prefers morning visits', 'Dog in backyard - use front door')"
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              rows={3}
            />
            <Button
              onClick={handleAddNote}
              disabled={!newNote.trim()}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              <Send className="w-4 h-4 mr-2" />
              Add Team Note
            </Button>
          </div>

          <p className="text-xs text-gray-600 italic">
            💡 Team notes are visible to all nurses caring for this patient. Use for continuity tips, safety alerts, or patient preferences.
          </p>
        </CardContent>
      )}
    </Card>
  );
}
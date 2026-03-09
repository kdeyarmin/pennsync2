import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Video, Plus, Calendar, Users, Clock, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import VideoRoom from "../components/telehealth/VideoRoom";
import SessionCard from "../components/telehealth/SessionCard";

const visitTypes = [
  { value: "routine_followup", label: "Routine Follow-up" },
  { value: "urgent_care", label: "Urgent Care" },
  { value: "medication_review", label: "Medication Review" },
  { value: "care_plan_review", label: "Care Plan Review" },
  { value: "admission_assessment", label: "Admission Assessment" },
  { value: "discharge_planning", label: "Discharge Planning" }
];

export default function Telehealth() {
  const [activeSession, setActiveSession] = useState(null);
  const [showNewSession, setShowNewSession] = useState(false);
  const [postNotes, setPostNotes] = useState("");
  const queryClient = useQueryClient();

  const { data: currentUser } = useQuery({
    queryKey: ["currentUser"],
    queryFn: () => base44.auth.me()
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ["telehealth-sessions"],
    queryFn: () => base44.entities.TelehealthSession.list("-created_date", 50),
    refetchInterval: 30000
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["patients-list"],
    queryFn: () => base44.entities.Patient.list("-created_date", 100)
  });

  const createSession = useMutation({
    mutationFn: (data) => base44.entities.TelehealthSession.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["telehealth-sessions"] });
      setShowNewSession(false);
      toast.success("Session created successfully");
    }
  });

  const updateSession = useMutation({
    mutationFn: ({ id, data }) => base44.entities.TelehealthSession.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["telehealth-sessions"] })
  });

  const handleJoin = async (session) => {
    await updateSession.mutateAsync({ id: session.id, data: { status: "active", started_at: new Date().toISOString() } });
    setActiveSession(session);
    setPostNotes("");
  };

  const handleDisconnect = async () => {
    if (activeSession) {
      const endTime = new Date();
      const startTime = activeSession.started_at ? new Date(activeSession.started_at) : endTime;
      const durationMinutes = Math.round((endTime - startTime) / 60000);
      await updateSession.mutateAsync({
        id: activeSession.id,
        data: {
          status: "completed",
          ended_at: endTime.toISOString(),
          duration_minutes: durationMinutes,
          notes: postNotes || undefined
        }
      });
      toast.success("Session ended");
    }
    setActiveSession(null);
  };

  const handleCancel = async (session) => {
    await updateSession.mutateAsync({ id: session.id, data: { status: "cancelled" } });
    toast.success("Session cancelled");
  };

  const upcoming = sessions.filter(s => s.status === "scheduled" || s.status === "active");
  const past = sessions.filter(s => s.status === "completed" || s.status === "cancelled");

  const stats = {
    total: sessions.length,
    completed: sessions.filter(s => s.status === "completed").length,
    scheduled: sessions.filter(s => s.status === "scheduled").length,
    totalMinutes: sessions.reduce((sum, s) => sum + (s.duration_minutes || 0), 0)
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Video className="w-6 h-6 text-blue-600" />
            Telehealth
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">Secure video visits with patients via Twilio</p>
        </div>
        <Button onClick={() => setShowNewSession(true)} className="gap-2 bg-blue-600 hover:bg-blue-700">
          <Plus className="w-4 h-4" /> New Session
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Total Sessions", value: stats.total, icon: Video, color: "text-blue-600" },
          { label: "Completed", value: stats.completed, icon: CheckCircle2, color: "text-green-600" },
          { label: "Upcoming", value: stats.scheduled, icon: Calendar, color: "text-amber-600" },
          { label: "Total Minutes", value: stats.totalMinutes, icon: Clock, color: "text-purple-600" }
        ].map(s => (
          <Card key={s.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <s.icon className={`w-8 h-8 ${s.color} flex-shrink-0`} />
              <div>
                <p className="text-2xl font-bold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-500">{s.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Active session banner */}
      {activeSession && (
        <Card className="border-green-400 bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 bg-green-500 rounded-full animate-pulse" />
                <span className="font-semibold text-green-800">Active Session — {activeSession.patient_name}</span>
              </div>
              <Button size="sm" variant="outline" onClick={handleDisconnect} className="text-red-600 border-red-300">
                End Session
              </Button>
            </div>
            <VideoRoom
              roomName={activeSession.room_name}
              identity={currentUser?.full_name || currentUser?.email}
              onDisconnect={handleDisconnect}
            />
            <div className="mt-4">
              <Label className="text-sm font-medium text-gray-700">Post-visit notes</Label>
              <Textarea
                className="mt-1"
                placeholder="Document clinical observations, patient response, follow-up needed..."
                value={postNotes}
                onChange={e => setPostNotes(e.target.value)}
                rows={3}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session lists */}
      <Tabs defaultValue="upcoming">
        <TabsList>
          <TabsTrigger value="upcoming">
            Upcoming <Badge className="ml-1.5 bg-blue-100 text-blue-700">{upcoming.length}</Badge>
          </TabsTrigger>
          <TabsTrigger value="past">
            Past <Badge className="ml-1.5 bg-gray-100 text-gray-600">{past.length}</Badge>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upcoming" className="mt-4 space-y-3">
          {upcoming.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Video className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>No upcoming sessions. Create one to get started.</p>
            </div>
          ) : upcoming.map(s => (
            <SessionCard key={s.id} session={s} onJoin={handleJoin} onCancel={handleCancel} />
          ))}
        </TabsContent>

        <TabsContent value="past" className="mt-4 space-y-3">
          {past.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Clock className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p>No completed sessions yet.</p>
            </div>
          ) : past.map(s => (
            <SessionCard key={s.id} session={s} onJoin={() => {}} onCancel={() => {}} />
          ))}
        </TabsContent>
      </Tabs>

      {/* New Session Dialog */}
      <Dialog open={showNewSession} onOpenChange={setShowNewSession}>
        <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
          <DialogTitle>New Telehealth Session</DialogTitle>
          <NewSessionForm
            patients={patients}
            currentUser={currentUser}
            onSubmit={(data) => createSession.mutate(data)}
            loading={createSession.isPending}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NewSessionForm({ patients, currentUser, onSubmit, loading }) {
  const [form, setForm] = useState({
    patient_id: "",
    visit_type: "routine_followup",
    scheduled_at: ""
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const patient = patients.find(p => p.id === form.patient_id);
    const roomName = `session-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const inviteLink = `${window.location.origin}/join-telehealth?room=${roomName}`;
    onSubmit({
      room_name: roomName,
      patient_id: form.patient_id,
      patient_name: patient ? `${patient.first_name} ${patient.last_name}` : "Unknown",
      host_email: currentUser?.email,
      host_name: currentUser?.full_name,
      visit_type: form.visit_type,
      scheduled_at: form.scheduled_at || new Date().toISOString(),
      status: "scheduled",
      invite_link: inviteLink
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 py-4">
      <div className="space-y-2">
        <Label className="font-semibold text-gray-900">Patient</Label>
        <Select value={form.patient_id} onValueChange={v => setForm(f => ({ ...f, patient_id: v }))}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select patient..." />
          </SelectTrigger>
          <SelectContent>
            {patients.map(p => (
              <SelectItem key={p.id} value={p.id}>{p.first_name} {p.last_name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="font-semibold text-gray-900">Visit Type</Label>
        <Select value={form.visit_type} onValueChange={v => setForm(f => ({ ...f, visit_type: v }))}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {visitTypes.map(t => (
              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="font-semibold text-gray-900">Scheduled Date & Time</Label>
        <Input
          type="datetime-local"
          className="w-full"
          value={form.scheduled_at}
          onChange={e => setForm(f => ({ ...f, scheduled_at: e.target.value }))}
        />
      </div>

      <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 gap-2 h-11" disabled={loading || !form.patient_id}>
        <Video className="w-4 h-4" />
        {loading ? "Creating..." : "Create Session"}
      </Button>
    </form>
  );
}
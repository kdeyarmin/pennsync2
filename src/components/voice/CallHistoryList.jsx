import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  PhoneIncoming, PhoneOutgoing, PhoneForwarded, PhoneMissed, Clock, Voicemail, StickyNote, Save,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { formatPhoneDisplay, last10 } from "@/components/voice/phoneUtils";

const STATUS_STYLES = {
  completed: "bg-green-100 text-green-800",
  bridged: "bg-green-100 text-green-800",
  ringing: "bg-blue-100 text-blue-800",
  initiated: "bg-blue-100 text-blue-800",
  no_answer: "bg-amber-100 text-amber-800",
  failed: "bg-red-100 text-red-800",
  forwarded_office: "bg-purple-100 text-purple-800",
};

const MODE_LABEL = {
  masked_bridge: "Inbound (masked)",
  off_duty_transfer: "Off-duty transfer",
  outbound_clicktocall: "Outbound (masked)",
};

// Post-call disposition options the nurse can tag a call with.
const DISPOSITIONS = [
  { value: "resolved", label: "Resolved" },
  { value: "follow_up_needed", label: "Follow-up needed" },
  { value: "callback_requested", label: "Callback requested" },
  { value: "left_voicemail", label: "Left voicemail" },
  { value: "no_action", label: "No action" },
];
const DISPOSITION_LABEL = Object.fromEntries(DISPOSITIONS.map((d) => [d.value, d.label]));

function formatDuration(seconds) {
  if (!seconds && seconds !== 0) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

function CallIcon({ call }) {
  if (call.call_mode === "off_duty_transfer") return <PhoneForwarded className="w-4 h-4 text-purple-600" />;
  if (call.direction === "outbound") return <PhoneOutgoing className="w-4 h-4 text-blue-600" />;
  if (call.status === "no_answer" || call.status === "failed") return <PhoneMissed className="w-4 h-4 text-red-600" />;
  return <PhoneIncoming className="w-4 h-4 text-green-600" />;
}

/**
 * CallHistoryList — the nurse's masked call log (inbound bridges, off-duty
 * transfers, outbound click-to-call). Shows who called when the number maps to
 * one of the nurse's patients, surfaces voicemails, highlights live/ringing
 * calls, and lets the nurse tag a disposition + note after the call.
 */
export default function CallHistoryList() {
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });

  const { data: calls = [], isLoading } = useQuery({
    queryKey: ["call-logs", user?.email],
    queryFn: () => base44.entities.CallLog.filter({ nurse_email: user.email }, "-created_date", 200),
    enabled: !!user?.email,
    refetchInterval: 30000,
    initialData: [],
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["call-patients", user?.email],
    queryFn: () => base44.entities.Patient.filter({ assigned_nurses: user.email }, "-created_date", 500),
    enabled: !!user?.email,
    initialData: [],
  });
  const patientById = useMemo(() => Object.fromEntries(patients.map((p) => [p.id, p])), [patients]);
  const patientByPhone = useMemo(() => {
    const map = {};
    patients.forEach((p) => { const k = last10(p.phone); if (k) map[k] = p; });
    return map;
  }, [patients]);

  const [editing, setEditing] = useState(null); // the CallLog row being annotated
  const [note, setNote] = useState("");
  const [disposition, setDisposition] = useState("");

  const saveAnnotation = useMutation({
    mutationFn: ({ id, note: n, disposition: d }) => base44.entities.CallLog.update(id, { note: n, disposition: d || null }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-logs", user?.email] });
      setEditing(null);
      toast.success("Call updated");
    },
    onError: (err) => toast.error(err?.message || "Failed to update call"),
  });

  const openEditor = (call) => {
    setEditing(call);
    setNote(call.note || "");
    setDisposition(call.disposition || "");
  };

  const sorted = useMemo(
    () => [...calls].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)),
    [calls]
  );

  const labelFor = (call) => {
    const otherNumber = call.direction === "outbound" ? call.to_number : call.from_number;
    const p = (call.patient_id && patientById[call.patient_id]) || patientByPhone[last10(otherNumber)];
    return p ? `${p.first_name} ${p.last_name}` : formatPhoneDisplay(otherNumber);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <PhoneIncoming className="w-4 h-4" />
          Call History
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-slate-500 text-center py-4">Loading…</p>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">No calls yet.</p>
        ) : (
          sorted.map((call) => {
            const active = call.status === "ringing" || call.status === "initiated";
            return (
              <div
                key={call.id}
                className={`p-3 rounded-lg border ${active ? "bg-blue-50 border-blue-300 animate-pulse" : "bg-slate-50 border-slate-200"}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <CallIcon call={call} />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{labelFor(call)}</p>
                      <p className="text-xs text-slate-500">{MODE_LABEL[call.call_mode] || call.call_mode}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {call.has_voicemail && (
                      <Badge className="bg-indigo-100 text-indigo-800 text-xs">
                        <Voicemail className="w-3 h-3 mr-1" /> VM
                      </Badge>
                    )}
                    <span className="text-xs text-slate-500 hidden sm:flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(call.duration_seconds)}
                    </span>
                    <Badge className={`text-xs ${STATUS_STYLES[call.status] || "bg-slate-100 text-slate-700"}`}>
                      {(call.status || "").replace(/_/g, " ")}
                    </Badge>
                    <span className="text-xs text-slate-400 hidden md:inline">
                      {format(new Date(call.created_date), "MMM d, h:mm a")}
                    </span>
                    <Button variant="ghost" size="sm" className="h-7 px-2" onClick={() => openEditor(call)} title="Add note / disposition">
                      <StickyNote className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
                {call.has_voicemail && call.voicemail_url && (
                  <audio controls preload="none" src={call.voicemail_url} className="w-full h-8 mt-2" />
                )}
                {(call.disposition || call.note) && (
                  <div className="mt-2 pt-2 border-t border-slate-200 flex items-start gap-2">
                    {call.disposition && (
                      <Badge variant="outline" className="text-[11px]">{DISPOSITION_LABEL[call.disposition] || call.disposition}</Badge>
                    )}
                    {call.note && <p className="text-xs text-slate-600">{call.note}</p>}
                  </div>
                )}
              </div>
            );
          })
        )}
      </CardContent>

      <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Call notes</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1.5">Disposition</p>
              <div className="flex flex-wrap gap-1.5">
                {DISPOSITIONS.map((d) => (
                  <button
                    key={d.value}
                    type="button"
                    onClick={() => setDisposition((cur) => (cur === d.value ? "" : d.value))}
                    className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                      disposition === d.value
                        ? "bg-blue-600 text-white border-blue-600"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:border-blue-300"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1.5">Note (avoid clinical detail / PHI)</p>
              <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={4} className="resize-none" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button
              className="bg-blue-600 hover:bg-blue-700"
              disabled={saveAnnotation.isPending}
              onClick={() => saveAnnotation.mutate({ id: editing.id, note: note.trim(), disposition })}
            >
              <Save className="w-4 h-4 mr-2" />
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}

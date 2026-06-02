import { useMemo, useState, useEffect } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { MessageSquare, Clock, Info } from "lucide-react";
import { format } from "date-fns";
import SmsThreadView from "@/components/messaging/SmsThreadView";
import { last10, formatPhoneDisplay } from "@/components/voice/phoneUtils";

/**
 * SmsConversationList — a nurse's text inbox. Groups SmsMessage rows into
 * patient conversations, shows unread counts, and renders the selected thread.
 */
export default function SmsConversationList() {
  const queryClient = useQueryClient();
  const [selectedThreadId, setSelectedThreadId] = useState(null);

  const { data: user } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });

  const { data: messages = [], isLoading } = useQuery({
    queryKey: ["sms-messages", user?.email],
    queryFn: () => base44.entities.SmsMessage.filter({ nurse_email: user.email }, "-created_date", 300),
    enabled: !!user?.email,
    refetchInterval: 30000,
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["sms-patients", user?.email],
    queryFn: () => base44.entities.Patient.filter({ assigned_nurses: user.email }, "-created_date", 500),
    enabled: !!user?.email,
    initialData: [],
  });

  const { data: consents = [] } = useQuery({
    queryKey: ["sms-consents"],
    queryFn: () => base44.entities.SmsConsent.list("-captured_at", 500),
    initialData: [],
  });

  // phone (last10) -> latest opt-out flag
  const optOutByPhone = useMemo(() => {
    const map = {};
    consents.forEach((c) => {
      const key = last10(c.phone_e164);
      if (!(key in map)) map[key] = c.consent_status === "opted_out"; // list is already newest-first
    });
    return map;
  }, [consents]);

  const patientById = useMemo(() => Object.fromEntries(patients.map((p) => [p.id, p])), [patients]);
  const patientByPhone = useMemo(() => {
    const map = {};
    patients.forEach((p) => { const k = last10(p.phone); if (k) map[k] = p; });
    return map;
  }, [patients]);

  const threads = useMemo(() => {
    const grouped = {};
    messages.forEach((m) => {
      const key = m.thread_id || m.id;
      (grouped[key] = grouped[key] || []).push(m);
    });
    return Object.entries(grouped)
      .map(([threadId, msgs]) => {
        const sorted = msgs.sort((a, b) => new Date(a.created_date) - new Date(b.created_date));
        const last = sorted[sorted.length - 1];
        const otherNumber = last.direction === "outbound" ? last.to_number : last.from_number;
        const pid = sorted.find((m) => m.patient_id)?.patient_id || null;
        const patient = (pid && patientById[pid]) || patientByPhone[last10(otherNumber)] || null;
        const label = patient ? `${patient.first_name} ${patient.last_name}` : formatPhoneDisplay(otherNumber);
        return {
          threadId,
          messages: sorted,
          lastMessage: last,
          otherNumber,
          patientId: patient?.id || pid,
          label,
          unreadCount: sorted.filter((m) => m.direction === "inbound" && !m.is_read).length,
          optedOut: !!optOutByPhone[last10(otherNumber)],
        };
      })
      .sort((a, b) => new Date(b.lastMessage.created_date) - new Date(a.lastMessage.created_date));
  }, [messages, patientById, patientByPhone, optOutByPhone]);

  const selected = threads.find((t) => t.threadId === selectedThreadId) || null;

  // Mark inbound messages read while a thread is open. Keyed on the set of
  // unread ids so it also fires when new messages arrive via polling — not only
  // when the thread is first selected.
  const selectedUnreadKey = (selected?.messages || [])
    .filter((m) => m.direction === "inbound" && !m.is_read)
    .map((m) => m.id)
    .join(",");
  useEffect(() => {
    if (!user?.email || !selectedUnreadKey) return;
    Promise.all(
      selectedUnreadKey.split(",").map((id) => base44.entities.SmsMessage.update(id, { is_read: true }))
    )
      .then(() => queryClient.invalidateQueries({ queryKey: ["sms-messages", user?.email] }))
      .catch(() => {});
  }, [selectedUnreadKey, user?.email]);

  if (!user?.work_phone_number) {
    return (
      <Alert className="bg-amber-50 border-amber-200">
        <Info className="w-4 h-4 text-amber-600" />
        <AlertDescription className="text-amber-800">
          You don't have a work number assigned yet. Ask an administrator to provision one before you can
          send or receive patient texts.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      <Card className="lg:col-span-1">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Conversations
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? (
            <p className="text-sm text-slate-500 text-center py-4">Loading…</p>
          ) : threads.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-4">No text conversations yet.</p>
          ) : (
            threads.map((t) => (
              <div
                key={t.threadId}
                onClick={() => setSelectedThreadId(t.threadId)}
                className={`p-3 rounded-lg cursor-pointer transition-colors ${
                  selectedThreadId === t.threadId
                    ? "bg-blue-100 border-2 border-blue-500"
                    : "bg-slate-50 hover:bg-slate-100 border border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <p className="text-sm font-semibold text-slate-900 line-clamp-1">{t.label}</p>
                  {t.unreadCount > 0 && <Badge className="bg-red-600 text-white text-xs">{t.unreadCount}</Badge>}
                </div>
                <p className="text-xs text-slate-600 line-clamp-2 mb-1">{t.lastMessage.body}</p>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <Clock className="w-3 h-3" />
                  {format(new Date(t.lastMessage.created_date), "MMM d, h:mm a")}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <SmsThreadView
        thread={selected}
        otherPartyLabel={selected?.label}
        otherPartyNumber={selected?.otherNumber}
        patientId={selected?.patientId}
        optedOut={selected?.optedOut}
        onSent={() => queryClient.invalidateQueries({ queryKey: ["sms-messages", user?.email] })}
      />
    </div>
  );
}

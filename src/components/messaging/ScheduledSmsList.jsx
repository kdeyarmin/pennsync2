import { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CalendarClock, X, CheckCircle2, XCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { formatPhoneDisplay, last10 } from "@/components/voice/phoneUtils";
import { canCancel } from "@/components/messaging/scheduledSms";

const STATUS_STYLES = {
  pending: "bg-blue-100 text-blue-800",
  sending: "bg-amber-100 text-amber-800",
  sent: "bg-green-100 text-green-800",
  failed: "bg-red-100 text-red-800",
  canceled: "bg-slate-200 text-slate-600",
};

/**
 * ScheduledSmsList — a nurse's upcoming and recent scheduled texts. Pending ones
 * can be canceled before they send; sent/failed/canceled stay as a record.
 */
export default function ScheduledSmsList() {
  const queryClient = useQueryClient();
  const { data: user } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["scheduled-sms", user?.email],
    queryFn: () => base44.entities.ScheduledSms.filter({ nurse_email: user.email }, "send_at", 200),
    enabled: !!user?.email,
    refetchInterval: 30000,
    initialData: [],
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["scheduled-patients", user?.email],
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

  const cancel = useMutation({
    mutationFn: (id) => base44.functions.invoke("cancelScheduledSms", { scheduled_id: id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scheduled-sms", user?.email] });
      toast.success("Scheduled message canceled");
    },
    onError: (err) => toast.error(err?.message || "Failed to cancel"),
  });

  const sorted = useMemo(() => {
    const rank = { pending: 0, sending: 1, failed: 2, sent: 3, canceled: 4 };
    return [...rows].sort((a, b) => {
      const r = (rank[a.status] ?? 9) - (rank[b.status] ?? 9);
      return r !== 0 ? r : new Date(a.send_at) - new Date(b.send_at);
    });
  }, [rows]);

  const labelFor = (row) => {
    const p = (row.patient_id && patientById[row.patient_id]) || patientByPhone[last10(row.to_number)];
    return p ? `${p.first_name} ${p.last_name}` : formatPhoneDisplay(row.to_number);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <CalendarClock className="w-4 h-4" />
          Scheduled Texts
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-slate-500 text-center py-4">Loading…</p>
        ) : sorted.length === 0 ? (
          <p className="text-sm text-slate-500 text-center py-4">No scheduled texts. Use “Schedule” when composing a message.</p>
        ) : (
          sorted.map((row) => (
            <div key={row.id} className="p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">{labelFor(row)}</p>
                  <p className="text-xs text-slate-600 line-clamp-2">{row.body}</p>
                  <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
                    <CalendarClock className="w-3 h-3" />
                    {format(new Date(row.send_at), "EEE MMM d, h:mm a")}
                    {row.status === "sent" && <CheckCircle2 className="w-3 h-3 text-green-600 ml-1" />}
                    {row.status === "failed" && <XCircle className="w-3 h-3 text-red-600 ml-1" />}
                  </p>
                  {row.status === "failed" && row.failure_reason && (
                    <p className="text-[11px] text-red-700 mt-0.5">{row.failure_reason}</p>
                  )}
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <Badge className={`text-xs ${STATUS_STYLES[row.status] || "bg-slate-100 text-slate-700"}`}>
                    {row.status}
                  </Badge>
                  {canCancel(row) && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-red-600 hover:bg-red-50"
                      disabled={cancel.isPending}
                      onClick={() => cancel.mutate(row.id)}
                    >
                      <X className="w-3.5 h-3.5 mr-1" /> Cancel
                    </Button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

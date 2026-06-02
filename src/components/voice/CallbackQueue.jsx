import { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PhoneCall, Voicemail, CheckCircle2, Clock, PhoneMissed, ArrowRightCircle } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { formatPhoneDisplay, last10 } from "@/components/voice/phoneUtils";
import { buildCallbackQueue } from "@/components/voice/callbackQueue";

const REASON_STYLES = {
  "Callback requested": "bg-purple-100 text-purple-800",
  "Voicemail": "bg-indigo-100 text-indigo-800",
  "Follow-up needed": "bg-amber-100 text-amber-800",
  "Missed call": "bg-red-100 text-red-800",
};

const ReasonIcon = ({ reason }) => {
  if (reason === "Voicemail") return <Voicemail className="w-4 h-4 text-indigo-600" />;
  if (reason === "Callback requested") return <ArrowRightCircle className="w-4 h-4 text-purple-600" />;
  return <PhoneMissed className="w-4 h-4 text-red-600" />;
};

/**
 * CallbackQueue — a nurse's prioritized "needs a call back" worklist (missed
 * masked calls, requested callbacks, follow-ups, and voicemails), with one-tap
 * masked call-back and a way to mark an item resolved. Derived from the call log
 * via the unit-tested buildCallbackQueue helper.
 */
export default function CallbackQueue() {
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
    queryKey: ["callback-patients", user?.email],
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

  const queue = useMemo(() => buildCallbackQueue(calls), [calls]);

  const callBack = useMutation({
    mutationFn: ({ patient_id, to_number }) => base44.functions.invoke("startMaskedCall", { patient_id: patient_id || undefined, to_number: to_number || undefined }),
    onSuccess: () => toast.success("Connecting… your phone will ring shortly, then we'll dial the patient."),
    onError: (err) => toast.error(err?.message || "Failed to start call"),
  });

  const resolve = useMutation({
    mutationFn: (id) => base44.entities.CallLog.update(id, { disposition: "resolved" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["call-logs", user?.email] });
      toast.success("Marked resolved");
    },
    onError: (err) => toast.error(err?.message || "Failed to update"),
  });

  const otherNumberOf = (call) => (call.direction === "outbound" ? call.to_number : call.from_number);
  const labelFor = (call) => {
    const p = (call.patient_id && patientById[call.patient_id]) || patientByPhone[last10(otherNumberOf(call))];
    return p ? `${p.first_name} ${p.last_name}` : formatPhoneDisplay(otherNumberOf(call));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm flex items-center gap-2">
          <PhoneCall className="w-4 h-4" />
          Needs a Call Back
          {queue.length > 0 && <Badge className="bg-red-600 text-white text-xs">{queue.length}</Badge>}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {isLoading ? (
          <p className="text-sm text-gray-500 text-center py-4">Loading…</p>
        ) : queue.length === 0 ? (
          <p className="text-sm text-gray-500 text-center py-6">
            <CheckCircle2 className="w-8 h-8 text-green-300 mx-auto mb-2" />
            You're all caught up — no calls need a callback.
          </p>
        ) : (
          queue.map((call) => (
            <div key={call.id} className="p-3 rounded-lg bg-gray-50 border border-gray-200">
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-start gap-3 min-w-0">
                  <ReasonIcon reason={call.reason} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{labelFor(call)}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge className={`text-[11px] ${REASON_STYLES[call.reason] || "bg-gray-100 text-gray-700"}`}>{call.reason}</Badge>
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {format(new Date(call.created_date), "MMM d, h:mm a")}
                      </span>
                    </div>
                    {call.note && <p className="text-xs text-gray-600 mt-1">{call.note}</p>}
                    {call.has_voicemail && call.voicemail_url && (
                      <audio controls preload="none" src={call.voicemail_url} className="w-full h-8 mt-2" />
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                  <Button
                    size="sm"
                    className="h-8 bg-blue-600 hover:bg-blue-700"
                    disabled={callBack.isPending}
                    onClick={() => callBack.mutate({ patient_id: call.patient_id, to_number: otherNumberOf(call) })}
                  >
                    <PhoneCall className="w-3.5 h-3.5 mr-1.5" /> Call back
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-7 px-2 text-xs text-gray-600"
                    disabled={resolve.isPending}
                    onClick={() => resolve.mutate(call.id)}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Resolve
                  </Button>
                </div>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

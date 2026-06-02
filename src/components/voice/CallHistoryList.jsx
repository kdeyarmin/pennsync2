import { useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhoneIncoming, PhoneOutgoing, PhoneForwarded, PhoneMissed, Clock } from "lucide-react";
import { format } from "date-fns";
import { formatPhoneDisplay } from "@/components/voice/phoneUtils";

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
 * transfers, and outbound click-to-call).
 */
export default function CallHistoryList() {
  const { data: user } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });

  const { data: calls = [], isLoading } = useQuery({
    queryKey: ["call-logs", user?.email],
    queryFn: () => base44.entities.CallLog.filter({ nurse_email: user.email }, "-created_date", 200),
    enabled: !!user?.email,
    refetchInterval: 30000,
    initialData: [],
  });

  const sorted = useMemo(
    () => [...calls].sort((a, b) => new Date(b.created_date) - new Date(a.created_date)),
    [calls]
  );

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
          sorted.map((call) => (
            <div key={call.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 border border-slate-200">
              <div className="flex items-center gap-3 min-w-0">
                <CallIcon call={call} />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900 truncate">
                    {formatPhoneDisplay(call.direction === "outbound" ? call.to_number : call.from_number)}
                  </p>
                  <p className="text-xs text-slate-500">{MODE_LABEL[call.call_mode] || call.call_mode}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
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
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}

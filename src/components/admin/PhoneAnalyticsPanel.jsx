import { useMemo, useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { BarChart3, MessageSquare, PhoneCall, ShieldCheck, Users } from "lucide-react";
import { summarizePhoneActivity, formatDuration } from "@/components/admin/phoneAnalytics";

const WINDOWS = [
  { label: "7 days", days: 7 },
  { label: "30 days", days: 30 },
  { label: "90 days", days: 90 },
  { label: "All time", days: 0 },
];

function Stat({ label, value, sub }) {
  return (
    <div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-600">{label}</p>
      {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

/**
 * PhoneAnalyticsPanel — admin read-only overview of texting/calling activity,
 * delivery health, consent posture, and provisioning coverage. All numbers are
 * derived client-side via the unit-tested summarizePhoneActivity helper.
 */
export default function PhoneAnalyticsPanel() {
  const [windowDays, setWindowDays] = useState(30);

  const { data: currentUser } = useQuery({ queryKey: ["currentUser"], queryFn: () => base44.auth.me() });
  const isAdmin = currentUser?.role === "admin";

  const { data: smsMessages = [] } = useQuery({
    queryKey: ["analytics-sms"],
    queryFn: () => base44.entities.SmsMessage.list("-created_date", 1000),
    enabled: isAdmin,
    initialData: [],
  });
  const { data: callLogs = [] } = useQuery({
    queryKey: ["analytics-calls"],
    queryFn: () => base44.entities.CallLog.list("-created_date", 1000),
    enabled: isAdmin,
    initialData: [],
  });
  const { data: consents = [] } = useQuery({
    queryKey: ["analytics-consents"],
    queryFn: () => base44.entities.SmsConsent.list("-captured_at", 1000),
    enabled: isAdmin,
    initialData: [],
  });
  const { data: users = [] } = useQuery({
    queryKey: ["analytics-users"],
    queryFn: () => base44.entities.User.list("full_name", 1000),
    enabled: isAdmin,
    initialData: [],
  });

  const stats = useMemo(
    () => summarizePhoneActivity({ smsMessages, callLogs, consents, users, sinceDays: windowDays }),
    [smsMessages, callLogs, consents, users, windowDays]
  );

  if (!isAdmin) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between gap-2 flex-wrap">
          <span className="flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-indigo-600" />
            Phone &amp; SMS Analytics
          </span>
          <div className="flex gap-1">
            {WINDOWS.map((w) => (
              <Button
                key={w.label}
                type="button"
                size="sm"
                variant={windowDays === w.days ? "default" : "outline"}
                onClick={() => setWindowDays(w.days)}
                className="h-7 px-2 text-xs"
              >
                {w.label}
              </Button>
            ))}
          </div>
        </CardTitle>
        <CardDescription>Texting and calling activity, delivery health, consent, and nurse coverage.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <MessageSquare className="w-3.5 h-3.5" /> Text messages
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Total texts" value={stats.sms.total} sub={`${stats.sms.inbound} in · ${stats.sms.outbound} out`} />
            <Stat label="Delivered" value={`${stats.sms.deliveryRate}%`} sub={`${stats.sms.delivered} of ${stats.sms.outbound} sent`} />
            <Stat label="Failed" value={stats.sms.failed} sub={`${stats.sms.failureRate}% of sent`} />
            <Stat label="Inbound" value={stats.sms.inbound} />
          </div>
        </div>

        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
            <PhoneCall className="w-3.5 h-3.5" /> Calls
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat label="Total calls" value={stats.calls.total} sub={`${stats.calls.inbound} in · ${stats.calls.outbound} out`} />
            <Stat label="Completed" value={stats.calls.completed} />
            <Stat label="Missed" value={stats.calls.missed} sub={`${stats.calls.missedRate}% of calls`} />
            <Stat label="Avg duration" value={formatDuration(stats.calls.avgDurationSec)} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5" /> Consent (TCPA)
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="Opted in" value={stats.consent.optedIn} />
              <Stat label="Opted out" value={stats.consent.optedOut} sub={`${stats.consent.tracked} numbers tracked`} />
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> Nurse coverage
            </p>
            <div className="grid grid-cols-2 gap-2">
              <Stat label="With work #" value={`${stats.provisioning.coverageRate}%`} sub={`${stats.provisioning.withWorkNumber} of ${stats.provisioning.totalUsers}`} />
              <Stat label="Fully set up" value={stats.provisioning.fullyProvisioned} sub="work # + bridge cell" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

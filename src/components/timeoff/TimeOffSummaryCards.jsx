import { useMemo } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Hourglass, CalendarCheck, CalendarClock } from "lucide-react";
import { approvedDaysInYear, isUpcoming, totalRequestedDays } from "./timeOffUtils";

function StatCard({ icon: Icon, label, value, sub, accent }) {
  return (
    <Card className="border-l-4" style={{ borderLeftColor: accent }}>
      <CardContent className="p-4 flex items-center gap-4">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: `${accent}1a`, color: accent }}
        >
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <p className="text-2xl font-bold text-slate-900 leading-tight">{value}</p>
          <p className="text-sm font-medium text-slate-600 truncate">{label}</p>
          {sub && <p className="text-xs text-slate-400 truncate">{sub}</p>}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TimeOffSummaryCards({ requests = [] }) {
  const stats = useMemo(() => {
    const year = new Date().getFullYear();
    const pending = requests.filter((r) => r.status === "pending");
    const upcoming = requests.filter((r) => r.status === "approved" && isUpcoming(r));
    const upcomingDays = upcoming.reduce(
      (sum, r) => sum + (Number(r.total_days) || totalRequestedDays(r.start_date, r.end_date, r.half_day)),
      0
    );
    return {
      pendingCount: pending.length,
      upcomingCount: upcoming.length,
      upcomingDays,
      usedThisYear: approvedDaysInYear(requests, year),
      year,
    };
  }, [requests]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <StatCard
        icon={Hourglass}
        label="Awaiting approval"
        value={stats.pendingCount}
        sub={stats.pendingCount === 1 ? "1 request pending" : `${stats.pendingCount} requests pending`}
        accent="#d97706"
      />
      <StatCard
        icon={CalendarClock}
        label="Upcoming time off"
        value={stats.upcomingCount}
        sub={`${stats.upcomingDays} day${stats.upcomingDays === 1 ? "" : "s"} scheduled`}
        accent="#2563eb"
      />
      <StatCard
        icon={CalendarCheck}
        label={`Days off in ${stats.year}`}
        value={stats.usedThisYear}
        sub="Approved this calendar year"
        accent="#059669"
      />
    </div>
  );
}

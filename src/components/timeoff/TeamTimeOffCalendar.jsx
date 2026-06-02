import { useMemo, useState } from "react";
import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  format,
  isSameMonth,
  isToday,
} from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { toISODate, requestCoversDate, typeLabel } from "./timeOffUtils";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TYPE_DOT = {
  vacation: "bg-blue-500",
  sick: "bg-amber-500",
  personal: "bg-violet-500",
  bereavement: "bg-slate-500",
  jury_duty: "bg-slate-500",
  parental: "bg-pink-500",
  unpaid: "bg-slate-400",
  other: "bg-slate-400",
};

export default function TeamTimeOffCalendar({ requests = [] }) {
  const [cursor, setCursor] = useState(() => new Date());

  const approved = useMemo(() => requests.filter((r) => r.status === "approved"), [requests]);

  const days = useMemo(() => {
    const gridStart = startOfWeek(startOfMonth(cursor), { weekStartsOn: 0 });
    const gridEnd = endOfWeek(endOfMonth(cursor), { weekStartsOn: 0 });
    return eachDayOfInterval({ start: gridStart, end: gridEnd });
  }, [cursor]);

  const peopleOn = (day) => {
    const iso = toISODate(day);
    return approved.filter((r) => requestCoversDate(r, iso));
  };

  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <CalendarDays className="w-5 h-5 text-blue-600" />
            Team Calendar
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCursor((c) => subMonths(c, 1))}>
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span className="text-sm font-semibold text-slate-700 w-32 text-center">
              {format(cursor, "MMMM yyyy")}
            </span>
            <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => setCursor((c) => addMonths(c, 1))}>
              <ChevronRight className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" className="text-xs" onClick={() => setCursor(new Date())}>
              Today
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-7 gap-px bg-slate-200 rounded-lg overflow-hidden border border-slate-200">
          {WEEKDAYS.map((wd) => (
            <div key={wd} className="bg-slate-50 text-center text-[11px] font-semibold text-slate-500 py-2 uppercase tracking-wide">
              {wd}
            </div>
          ))}
          {days.map((day) => {
            const inMonth = isSameMonth(day, cursor);
            const today = isToday(day);
            const people = peopleOn(day);
            return (
              <div
                key={day.toISOString()}
                className={`min-h-[86px] p-1.5 ${inMonth ? "bg-white" : "bg-slate-50/60"} ${today ? "ring-2 ring-inset ring-blue-400" : ""}`}
              >
                <div className={`text-xs font-medium mb-1 ${inMonth ? "text-slate-700" : "text-slate-300"} ${today ? "text-blue-600 font-bold" : ""}`}>
                  {format(day, "d")}
                </div>
                <div className="space-y-0.5">
                  {people.slice(0, 3).map((r) => (
                    <div
                      key={r.id}
                      title={`${r.employee_name || r.employee_email} — ${typeLabel(r.request_type)}`}
                      className="flex items-center gap-1 text-[11px] text-slate-700 truncate"
                    >
                      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${TYPE_DOT[r.request_type] || "bg-slate-400"}`} />
                      <span className="truncate">{(r.employee_name || r.employee_email || "").split(" ")[0]}</span>
                    </div>
                  ))}
                  {people.length > 3 && (
                    <div className="text-[10px] text-slate-400 font-medium">+{people.length - 3} more</div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-3 text-[11px] text-slate-500">
          {[
            ["Vacation", "bg-blue-500"],
            ["Sick", "bg-amber-500"],
            ["Personal", "bg-violet-500"],
            ["Parental", "bg-pink-500"],
            ["Other", "bg-slate-400"],
          ].map(([label, dot]) => (
            <span key={label} className="inline-flex items-center gap-1">
              <span className={`w-2 h-2 rounded-full ${dot}`} />
              {label}
            </span>
          ))}
          <span className="text-slate-400">· Approved time off only</span>
        </div>
      </CardContent>
    </Card>
  );
}

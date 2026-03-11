import React from "react";
import { Award, BarChart3, CalendarClock, CheckCircle2, Clock3, TriangleAlert, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

const ITEMS = [
  { key: "totalAssigned", label: "Total assigned", icon: BarChart3, color: "text-blue-600" },
  { key: "dueSoon", label: "Due soon", icon: CalendarClock, color: "text-amber-600" },
  { key: "overdue", label: "Overdue", icon: TriangleAlert, color: "text-red-600" },
  { key: "completed", label: "Completed", icon: CheckCircle2, color: "text-emerald-600" },
  { key: "passed", label: "Passed", icon: Award, color: "text-indigo-600" },
  { key: "failed", label: "Failed", icon: XCircle, color: "text-rose-600" },
  { key: "averageScore", label: "Average score", icon: Clock3, color: "text-slate-600", suffix: "%" },
];

export default function AdminComplianceStats({ stats }) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
      {ITEMS.map((item) => {
        const Icon = item.icon;
        return (
          <Card key={item.key} className="border-0 shadow-sm bg-white">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{item.label}</p>
                  <p className="text-3xl font-bold text-slate-900 mt-2">{stats[item.key]}{item.suffix || ""}</p>
                </div>
                <Icon className={`w-6 h-6 ${item.color}`} />
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
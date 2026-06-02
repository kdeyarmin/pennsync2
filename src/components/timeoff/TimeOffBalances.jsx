import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Wallet } from "lucide-react";
import { typeLabel } from "./timeOffUtils";

const BAR_COLOR = {
  vacation: "bg-blue-500",
  sick: "bg-amber-500",
  personal: "bg-violet-500",
  parental: "bg-pink-500",
};

function BalanceRow({ balance }) {
  const { type, allowance, used, pending, remaining } = balance;
  const denom = allowance > 0 ? allowance : Math.max(used + pending, 1);
  const usedPct = Math.min(100, (used / denom) * 100);
  const pendingPct = Math.min(100 - usedPct, (pending / denom) * 100);
  const over = remaining < 0;

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-sm font-medium text-slate-700">{typeLabel(type)}</span>
        <span className={`text-sm font-semibold ${over ? "text-red-600" : "text-slate-900"}`}>
          {Math.max(0, remaining)}
          <span className="text-xs font-normal text-slate-400"> / {allowance} left</span>
        </span>
      </div>
      <div className="h-2.5 w-full rounded-full bg-slate-100 overflow-hidden flex">
        <div className={`${BAR_COLOR[type] || "bg-slate-500"} h-full`} style={{ width: `${usedPct}%` }} />
        <div className={`${BAR_COLOR[type] || "bg-slate-500"} opacity-40 h-full`} style={{ width: `${pendingPct}%` }} />
      </div>
      <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
        <span>{used} used</span>
        {pending > 0 && <span>{pending} pending</span>}
        {over && <span className="text-red-500 font-medium">over by {Math.abs(remaining)}</span>}
      </div>
    </div>
  );
}

export default function TimeOffBalances({ balances = [], year = new Date().getFullYear() }) {
  if (!balances.length) return null;
  return (
    <Card className="shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Wallet className="w-4 h-4 text-emerald-600" />
          My Balances
          <span className="text-sm font-normal text-slate-400">({year})</span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {balances.map((b) => (
          <BalanceRow key={b.type} balance={b} />
        ))}
      </CardContent>
    </Card>
  );
}

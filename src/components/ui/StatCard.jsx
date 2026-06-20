import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * StatCard — the app's premium metric card: a clean white surface with a thin
 * top accent rule and a colored icon chip, instead of a fully-saturated gradient
 * tile (which reads as "cheap"). `tone` selects an on-brand color family; navy
 * and gold are the brand colors, with emerald/amber/red reserved for clinical
 * status (good / caution / critical) and slate for neutral counts.
 *
 *   <StatCard label="Open Incidents" value={12} sub="3 high severity" icon={AlertTriangle} tone="red" />
 *
 * Use this for dashboard metric rows so every page shares one stat treatment.
 */
const TONES = {
  navy:    { tile: "bg-navy-50 text-navy-600 ring-navy-100",         accent: "from-navy-500 to-navy-600" },
  gold:    { tile: "bg-gold-100 text-gold-600 ring-gold-200",        accent: "from-gold-400 to-gold-500" },
  emerald: { tile: "bg-emerald-50 text-emerald-600 ring-emerald-100", accent: "from-emerald-400 to-emerald-500" },
  amber:   { tile: "bg-amber-50 text-amber-600 ring-amber-100",      accent: "from-amber-400 to-amber-500" },
  red:     { tile: "bg-red-50 text-red-600 ring-red-100",            accent: "from-red-400 to-red-500" },
  slate:   { tile: "bg-slate-100 text-slate-600 ring-slate-200",     accent: "from-slate-400 to-slate-500" },
};

export default function StatCard({ label, value, sub, icon: Icon, tone = "navy", className }) {
  const t = TONES[tone] || TONES.navy;
  return (
    <Card className={cn("relative overflow-hidden", className)}>
      <span className={cn("absolute inset-x-0 top-0 h-1 bg-gradient-to-r", t.accent)} aria-hidden="true" />
      <CardContent className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[10px] sm:text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">{value}</p>
            {sub != null && sub !== "" && (
              <p className="mt-0.5 text-[10px] sm:text-xs text-slate-400">{sub}</p>
            )}
          </div>
          {Icon && (
            <div className={cn("flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl ring-1 ring-inset", t.tile)}>
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

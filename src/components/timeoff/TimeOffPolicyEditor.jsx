import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShieldCheck, Plus, Trash2, CalendarOff, Info, Wallet } from "lucide-react";
import { toast } from "sonner";
import { BALANCE_TRACKABLE_TYPES, typeLabel } from "./timeOffUtils";

function emptyBlackout() {
  return { label: "", start_date: "", end_date: "" };
}

export default function TimeOffPolicyEditor({ policy }) {
  const queryClient = useQueryClient();
  const [form, setForm] = useState({
    minimum_notice_days: 0,
    coverage_threshold: 0,
    blackout_periods: [],
    default_allowances: {},
  });
  const [error, setError] = useState("");

  // Hydrate the form once the policy record loads.
  useEffect(() => {
    if (policy) {
      setForm({
        minimum_notice_days: Number(policy.minimum_notice_days) || 0,
        coverage_threshold: Number(policy.coverage_threshold) || 0,
        blackout_periods: Array.isArray(policy.blackout_periods)
          ? policy.blackout_periods.map((p) => ({ label: p.label || "", start_date: p.start_date || "", end_date: p.end_date || "" }))
          : [],
        default_allowances: policy.default_allowances || {},
      });
    }
  }, [policy?.id]);

  const updateBlackout = (index, patch) =>
    setForm((prev) => ({
      ...prev,
      blackout_periods: prev.blackout_periods.map((p, i) => (i === index ? { ...p, ...patch } : p)),
    }));

  const save = useMutation({
    mutationFn: async () => {
      // Drop incomplete rows and reject any with end before start.
      const cleaned = form.blackout_periods
        .filter((p) => p.start_date && p.end_date)
        .map((p) => ({ label: p.label?.trim() || "", start_date: p.start_date, end_date: p.end_date }));
      for (const p of cleaned) {
        if (p.end_date < p.start_date) {
          throw new Error(`Blackout "${p.label || p.start_date}" ends before it starts.`);
        }
      }
      // Keep only the allowances the admin actually filled in.
      const allowances = {};
      for (const type of BALANCE_TRACKABLE_TYPES) {
        const raw = form.default_allowances[type];
        if (raw !== "" && raw != null && !Number.isNaN(Number(raw))) {
          allowances[type] = Math.max(0, Number(raw));
        }
      }
      const payload = {
        minimum_notice_days: Math.max(0, Number(form.minimum_notice_days) || 0),
        coverage_threshold: Math.max(0, Number(form.coverage_threshold) || 0),
        blackout_periods: cleaned,
        default_allowances: allowances,
      };
      return policy?.id
        ? base44.entities.TimeOffPolicy.update(policy.id, payload)
        : base44.entities.TimeOffPolicy.create(payload);
    },
    onSuccess: () => {
      toast.success("Time-off policy saved.");
      setError("");
      queryClient.invalidateQueries({ queryKey: ["timeoff"] });
    },
    onError: (err) => setError(err?.message || "Could not save the policy."),
  });

  return (
    <Card className="shadow-sm max-w-3xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-lg">
          <ShieldCheck className="w-5 h-5 text-emerald-600" />
          Time-Off Policy
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="bg-blue-50 border-blue-200">
          <Info className="h-4 w-4 text-blue-600" />
          <AlertDescription className="text-blue-800 text-sm">
            These rules are enforced when employees submit requests and shape the team calendar's coverage warnings.
          </AlertDescription>
        </Alert>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="notice">Minimum advance notice (days)</Label>
            <Input
              id="notice"
              type="number"
              min={0}
              className="mt-1"
              value={form.minimum_notice_days}
              onChange={(e) => setForm((p) => ({ ...p, minimum_notice_days: e.target.value }))}
            />
            <p className="text-xs text-slate-400 mt-1">0 = no notice required.</p>
          </div>
          <div>
            <Label htmlFor="coverage">Coverage warning threshold</Label>
            <Input
              id="coverage"
              type="number"
              min={0}
              className="mt-1"
              value={form.coverage_threshold}
              onChange={(e) => setForm((p) => ({ ...p, coverage_threshold: e.target.value }))}
            />
            <p className="text-xs text-slate-400 mt-1">Flag days with at least this many people off. 0 = off.</p>
          </div>
        </div>

        <div>
          <Label className="flex items-center gap-2 mb-2">
            <Wallet className="w-4 h-4 text-slate-500" /> Default annual allowances (days)
          </Label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {BALANCE_TRACKABLE_TYPES.map((type) => (
              <div key={type}>
                <Label className="text-xs text-slate-500">{typeLabel(type)}</Label>
                <Input
                  type="number"
                  min={0}
                  className="mt-1"
                  placeholder="—"
                  value={form.default_allowances[type] ?? ""}
                  onChange={(e) =>
                    setForm((p) => ({ ...p, default_allowances: { ...p.default_allowances, [type]: e.target.value } }))
                  }
                />
              </div>
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-1">Leave blank to leave a type untracked (no balance / no limit).</p>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="flex items-center gap-2">
              <CalendarOff className="w-4 h-4 text-slate-500" /> Blackout periods
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setForm((p) => ({ ...p, blackout_periods: [...p.blackout_periods, emptyBlackout()] }))}
            >
              <Plus className="w-4 h-4 mr-1" /> Add period
            </Button>
          </div>
          {form.blackout_periods.length === 0 ? (
            <p className="text-sm text-slate-400 py-2">No blackout periods. Employees can request any available dates.</p>
          ) : (
            <div className="space-y-2">
              {form.blackout_periods.map((p, i) => (
                <div key={i} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto_auto] gap-2 items-end border border-slate-200 rounded-lg p-2">
                  <div>
                    <Label className="text-xs text-slate-500">Label</Label>
                    <Input
                      placeholder="e.g. State survey window"
                      value={p.label}
                      onChange={(e) => updateBlackout(i, { label: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">Start</Label>
                    <Input type="date" value={p.start_date} onChange={(e) => updateBlackout(i, { start_date: e.target.value })} />
                  </div>
                  <div>
                    <Label className="text-xs text-slate-500">End</Label>
                    <Input type="date" value={p.end_date} min={p.start_date || undefined} onChange={(e) => updateBlackout(i, { end_date: e.target.value })} />
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="text-slate-400 hover:text-red-600"
                    onClick={() => setForm((prev) => ({ ...prev, blackout_periods: prev.blackout_periods.filter((_, idx) => idx !== i) }))}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </div>

        {error && (
          <Alert variant="destructive">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <div className="flex justify-end">
          <Button onClick={() => save.mutate()} disabled={save.isPending} className="min-w-[120px]">
            {save.isPending ? "Saving…" : "Save policy"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

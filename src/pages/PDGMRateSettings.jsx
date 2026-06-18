import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { isAdminLike } from "@/lib/superAdmin";
import { DEFAULT_PDGM_RATES, mergePdgmRates } from "@/components/pdgm/pdgmRates";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription } from "@/components/ui/alert";
import AccessDeniedState from "@/components/ui/AccessDeniedState";
import { PieChart, Save, RotateCcw, Info, ShieldCheck } from "lucide-react";
import { toast } from "sonner";

// The four editable 2-level rate tables (everything except the single base rate).
const TABLES = [
  { key: "clinicalGroupWeights", title: "Clinical-group case-mix weights", help: "Weight per clinical group × admission source / episode timing." },
  { key: "functionalThresholds", title: "Functional-impairment thresholds", help: "Point cutoffs: Low ≤ low; Medium < high; otherwise High." },
  { key: "functionalMultipliers", title: "Functional-level multipliers", help: "Payment multiplier for each functional level." },
  { key: "comorbidityMultipliers", title: "Comorbidity multipliers", help: "Payment multiplier for each comorbidity adjustment level." },
];

const prettify = (k) =>
  String(k).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

// Convert a rates object's numbers → strings for free-text editing.
const ratesToForm = (rates) => {
  const out = { basePaymentRate: String(rates.basePaymentRate ?? "") };
  for (const { key } of TABLES) {
    out[key] = {};
    for (const row of Object.keys(rates[key] || {})) {
      out[key][row] = {};
      for (const col of Object.keys(rates[key][row] || {})) {
        out[key][row][col] = String(rates[key][row][col]);
      }
    }
  }
  return out;
};

// Convert the string form → a rates object of finite numbers (blanks dropped, so
// they fall back to the built-in default on the server via mergePdgmRates).
const formToRates = (form) => {
  const num = (s) => {
    const n = Number(s);
    return Number.isFinite(n) ? n : undefined;
  };
  const out = {};
  if (num(form.basePaymentRate) !== undefined) out.basePaymentRate = num(form.basePaymentRate);
  for (const { key } of TABLES) {
    out[key] = {};
    for (const row of Object.keys(form[key] || {})) {
      out[key][row] = {};
      for (const col of Object.keys(form[key][row] || {})) {
        const v = num(form[key][row][col]);
        if (v !== undefined) out[key][row][col] = v;
      }
    }
  }
  return out;
};

function RateTable({ title, help, table, onCell }) {
  const rows = Object.keys(table || {});
  const cols = rows.length ? Object.keys(table[rows[0]]) : [];
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">{title}</CardTitle>
        <p className="text-xs text-slate-500">{help}</p>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full text-sm border-separate border-spacing-1">
          <thead>
            <tr>
              <th className="text-left text-xs font-medium text-slate-500 px-2"> </th>
              {cols.map((c) => (
                <th key={c} className="text-left text-xs font-medium text-slate-500 px-2">{prettify(c)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row}>
                <td className="text-xs font-medium text-slate-700 px-2 whitespace-nowrap">{prettify(row)}</td>
                {cols.map((col) => (
                  <td key={col}>
                    <Input
                      type="number"
                      step="any"
                      inputMode="decimal"
                      aria-label={`${prettify(row)} ${prettify(col)}`}
                      value={table[row][col]}
                      onChange={(e) => onCell(row, col, e.target.value)}
                      className="h-8 w-28 text-sm"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
}

export default function PDGMRateSettings() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const canEdit = isAdminLike(user);

  const { data: config, isLoading } = useQuery({
    queryKey: ["pdgm-rate-config"],
    queryFn: async () => {
      const rows = await base44.entities.PDGMRateConfig.list("-created_date", 1);
      return rows?.[0] || null;
    },
    enabled: canEdit,
    initialData: null,
  });

  const [form, setForm] = useState(() => ratesToForm(DEFAULT_PDGM_RATES));
  const [meta, setMeta] = useState({ label: "", effective_year: "", is_official: false, notes: "" });

  // Seed the editor from the saved config (merged over defaults) once it loads.
  useEffect(() => {
    if (config) {
      setForm(ratesToForm(mergePdgmRates(config.rates)));
      setMeta({
        label: config.label || "",
        effective_year: config.effective_year || "",
        is_official: config.is_official === true,
        notes: config.notes || "",
      });
    }
  }, [config]);

  const setCell = (section, row, col, value) =>
    setForm((f) => ({
      ...f,
      [section]: { ...f[section], [row]: { ...f[section][row], [col]: value } },
    }));

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        ...meta,
        rates: formToRates(form),
        updated_by_email: user?.email || null,
      };
      if (config?.id) return base44.entities.PDGMRateConfig.update(config.id, payload);
      return base44.entities.PDGMRateConfig.create(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["pdgm-rate-config"] });
      toast.success("PDGM rates saved. New estimates use these numbers.");
    },
    onError: (err) => {
      console.error("Failed to save PDGM rates:", err);
      toast.error("Could not save PDGM rates. Please try again.");
    },
  });

  const resetToDefaults = () => {
    setForm(ratesToForm(DEFAULT_PDGM_RATES));
    setMeta((m) => ({ ...m, is_official: false }));
    toast.message("Reset to built-in defaults (not yet saved).");
  };

  const effectivePreview = useMemo(() => formToRates(form), [form]);

  if (!canEdit) {
    return <AccessDeniedState description="PDGM rate settings are restricted to administrators." />;
  }

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-5">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
          <PieChart className="w-5 h-5 text-blue-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">PDGM Rate Settings</h1>
          <p className="text-sm text-slate-500">
            Enter and update your case-mix weights, base rate, and multipliers. Saved numbers
            are applied to every PDGM payment estimate immediately.
          </p>
        </div>
      </div>

      <Alert className={meta.is_official ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}>
        {meta.is_official ? <ShieldCheck className="h-4 w-4 text-green-600" /> : <Info className="h-4 w-4 text-amber-600" />}
        <AlertDescription className="text-sm">
          {meta.is_official
            ? "Marked as official CMS rates — PDGM results are treated as authoritative (not labeled an estimate)."
            : "These weights are treated as an ESTIMATE until you enter your official CMS numbers and toggle “Official CMS rates” below. They are not billable amounts."}
        </AlertDescription>
      </Alert>

      {isLoading ? (
        <p className="text-sm text-slate-500">Loading…</p>
      ) : (
        <>
          {/* Metadata + base rate */}
          <Card>
            <CardHeader><CardTitle className="text-base">Rate set</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="rate-label">Label</Label>
                <Input id="rate-label" value={meta.label} placeholder="e.g. CY2025 Official CMS"
                  onChange={(e) => setMeta({ ...meta, label: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="rate-year">Effective rate year</Label>
                <Input id="rate-year" value={meta.effective_year} placeholder="e.g. 2025"
                  onChange={(e) => setMeta({ ...meta, effective_year: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label htmlFor="base-rate">Base 30-day payment rate ($)</Label>
                <Input id="base-rate" type="number" step="any" inputMode="decimal" value={form.basePaymentRate}
                  onChange={(e) => setForm({ ...form, basePaymentRate: e.target.value })} className="mt-1 w-40" />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch id="is-official" checked={meta.is_official}
                  onCheckedChange={(v) => setMeta({ ...meta, is_official: v })} />
                <Label htmlFor="is-official" className="cursor-pointer">These are official CMS rates</Label>
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="rate-notes">Notes</Label>
                <Textarea id="rate-notes" value={meta.notes} rows={2}
                  placeholder="Source of the numbers, who verified them, etc."
                  onChange={(e) => setMeta({ ...meta, notes: e.target.value })} className="mt-1" />
              </div>
            </CardContent>
          </Card>

          {TABLES.map(({ key, title, help }) => (
            <RateTable
              key={key}
              title={title}
              help={help}
              table={form[key]}
              onCell={(row, col, value) => setCell(key, row, col, value)}
            />
          ))}

          <div className="flex flex-wrap items-center gap-3 sticky bottom-0 bg-white/80 backdrop-blur py-3 border-t">
            <Button onClick={() => saveMutation.mutate()} disabled={saveMutation.isPending}>
              <Save className="w-4 h-4 mr-2" />
              {saveMutation.isPending ? "Saving…" : "Save rates"}
            </Button>
            <Button variant="outline" onClick={resetToDefaults} disabled={saveMutation.isPending}>
              <RotateCcw className="w-4 h-4 mr-2" />
              Reset to defaults
            </Button>
            <span className="text-xs text-slate-500">
              Base rate preview: ${Number(effectivePreview.basePaymentRate ?? DEFAULT_PDGM_RATES.basePaymentRate).toFixed(2)}
            </span>
          </div>
        </>
      )}
    </div>
  );
}

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ClipboardList, CheckCircle2, Clock, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { toast } from "sonner";

const STATUS_CONFIG = {
  active: { label: "Active", color: "bg-blue-100 text-blue-800", icon: Clock },
  completed: { label: "Completed", color: "bg-green-100 text-green-800", icon: CheckCircle2 },
  on_hold: { label: "On Hold", color: "bg-amber-100 text-amber-800", icon: AlertCircle },
  discontinued: { label: "Discontinued", color: "bg-red-100 text-red-800", icon: AlertCircle },
};

function CarePlanCard({ plan, currentUser, onUpdated }) {
  const [expanded, setExpanded] = useState(false);
  const [newStatus, setNewStatus] = useState(plan.status || "active");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const cfg = STATUS_CONFIG[plan.status] || STATUS_CONFIG.active;
  const Icon = cfg.icon;

  const handleSave = async () => {
    setSaving(true);
    await base44.entities.CarePlan.update(plan.id, {
      status: newStatus,
      clinical_notes: note
        ? `[${new Date().toLocaleDateString()} - ${currentUser?.full_name}] ${note}\n\n${plan.clinical_notes || ""}`
        : plan.clinical_notes,
    });
    toast.success("Care plan updated");
    setSaving(false);
    setNote("");
    onUpdated();
  };

  return (
    <Card className="shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-1">
              <h3 className="font-semibold text-slate-900 text-sm">{plan.title || plan.diagnosis || "Care Plan"}</h3>
              <Badge className={`text-xs ${cfg.color}`}>
                <Icon className="w-3 h-3 mr-1" />
                {cfg.label}
              </Badge>
            </div>
            {plan.goals?.length > 0 && (
              <p className="text-xs text-slate-500 line-clamp-1">
                Goals: {plan.goals.slice(0, 2).join(" · ")}
              </p>
            )}
          </div>
          <Button variant="ghost" size="sm" onClick={() => setExpanded((v) => !v)} className="shrink-0">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>

        {expanded && (
          <div className="mt-4 space-y-3 border-t pt-4">
            {plan.interventions?.length > 0 && (
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-2">Interventions</p>
                <ul className="space-y-1">
                  {plan.interventions.map((item, i) => (
                    <li key={i} className="text-sm text-slate-600 flex items-start gap-2">
                      <span className="text-teal-500 mt-0.5">•</span> {item}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {plan.clinical_notes && (
              <div>
                <p className="text-xs font-semibold text-slate-700 mb-1">Notes</p>
                <p className="text-sm text-slate-600 bg-slate-50 rounded-lg p-3 whitespace-pre-wrap max-h-32 overflow-y-auto">
                  {plan.clinical_notes}
                </p>
              </div>
            )}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Update Status</label>
                <Select value={newStatus} onValueChange={setNewStatus}>
                  <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                      <SelectItem key={val} value={val}>{cfg.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-700 mb-1 block">Add Note</label>
                <Textarea
                  rows={2}
                  placeholder="Clinical note…"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="text-sm resize-none"
                />
              </div>
            </div>
            <Button size="sm" onClick={handleSave} disabled={saving} className="bg-teal-600 hover:bg-teal-700 min-h-[36px]">
              {saving ? "Saving…" : "Save Update"}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function CarePlanInteractive({ patientId, currentUser }) {
  const queryClient = useQueryClient();

  const { data: carePlans = [], isLoading } = useQuery({
    queryKey: ["chart-care-plans", patientId],
    queryFn: () => base44.entities.CarePlan.filter({ patient_id: patientId }, "-updated_date", 50),
    enabled: !!patientId,
    initialData: [],
  });

  const onUpdated = () => queryClient.invalidateQueries({ queryKey: ["chart-care-plans", patientId] });

  if (isLoading) return <div className="h-40 animate-pulse bg-slate-100 rounded-xl" />;

  if (carePlans.length === 0) {
    return (
      <Card>
        <CardContent className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
          <ClipboardList className="w-10 h-10" />
          <p>No care plans found for this patient.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <CardHeader className="px-0 pt-0 pb-2">
        <CardTitle className="flex items-center gap-2 text-base">
          <ClipboardList className="w-4 h-4 text-teal-600" />
          {carePlans.length} Care Plan{carePlans.length !== 1 ? "s" : ""}
        </CardTitle>
      </CardHeader>
      {carePlans.map((plan) => (
        <CarePlanCard key={plan.id} plan={plan} currentUser={currentUser} onUpdated={onUpdated} />
      ))}
    </div>
  );
}
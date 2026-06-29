import { useState } from "react";
import { base44 } from "@/api/base44Client";
import { useQueryClient } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Stethoscope, Briefcase, HeartHandshake, Sparkles, CheckCircle2, IdCard } from "lucide-react";
import { STAFF_ROLE_OPTIONS, getStaffRole } from "@/lib/roles";

// Onboarding / settings selector for the user's staff discipline (staff_role).
// This is the "choose your role at sign-in" step: a nurse continues to the care-
// scope question; everyone else is set up for the non-clinical experience.
const ICONS = {
  nurse: Stethoscope,
  office_staff: Briefcase,
  social_worker: HeartHandshake,
  spiritual_care: Sparkles,
};
const COLORS = {
  nurse: { base: "border-blue-300 bg-blue-50", selected: "bg-blue-600 border-blue-600 text-white", icon: "text-blue-600" },
  office_staff: { base: "border-slate-300 bg-slate-50", selected: "bg-slate-700 border-slate-700 text-white", icon: "text-slate-600" },
  social_worker: { base: "border-emerald-300 bg-emerald-50", selected: "bg-emerald-600 border-emerald-600 text-white", icon: "text-emerald-600" },
  spiritual_care: { base: "border-indigo-300 bg-indigo-50", selected: "bg-indigo-600 border-indigo-600 text-white", icon: "text-indigo-600" },
};

export default function StaffRoleSelector({ currentUser, onSaved }) {
  const queryClient = useQueryClient();
  const [selected, setSelected] = useState(currentUser?.staff_role || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await base44.auth.updateMe({ staff_role: selected });
      queryClient.invalidateQueries({ queryKey: ["currentUser"] });
      if (onSaved) onSaved(selected);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="border-2 border-indigo-200 shadow-xl">
      <CardContent className="p-6 sm:p-8">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-3">
            <IdCard className="w-7 h-7 text-indigo-600" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">What is your role?</h2>
          <p className="text-sm text-slate-500 mt-1">
            This tailors your navigation and dashboard. Nurses see clinical tools; office, social work, and spiritual care see what fits their role.
          </p>
        </div>

        <div className="space-y-3 mb-6">
          {STAFF_ROLE_OPTIONS.map((opt) => {
            const Icon = ICONS[opt.value];
            const color = COLORS[opt.value];
            const isSelected = selected === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setSelected(opt.value)}
                className={`w-full text-left rounded-xl border-2 p-4 transition-all active:scale-98 ${
                  isSelected ? color.selected : `${color.base} hover:shadow-md`
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`mt-0.5 w-8 h-8 rounded-lg flex items-center justify-center ${isSelected ? "bg-white/20" : "bg-white"} flex-shrink-0`}>
                    <Icon className={`w-4 h-4 ${isSelected ? "text-white" : color.icon}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`font-semibold text-sm ${isSelected ? "text-white" : "text-slate-900"}`}>{opt.label}</p>
                    <p className={`text-xs mt-0.5 ${isSelected ? "text-white/80" : "text-slate-500"}`}>{opt.description}</p>
                  </div>
                  {isSelected && <CheckCircle2 className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />}
                </div>
              </button>
            );
          })}
        </div>

        <Button
          onClick={handleSave}
          disabled={!selected || saving}
          className="w-full bg-indigo-600 hover:bg-indigo-700 h-12 font-semibold"
        >
          {saving ? "Saving…" : "Save & Continue"}
        </Button>
      </CardContent>
    </Card>
  );
}

// Re-export the resolver so callers importing the selector get the role helper too.
export { getStaffRole };

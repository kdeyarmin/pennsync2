import React, { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AlertTriangle, Heart, ChevronDown, ChevronUp, Phone, ClipboardList, Activity, Pill, TrendingUp } from "lucide-react";

const RISK_COLOR = {
  immediate: "border-red-400 bg-red-50 text-red-900",
  soon: "border-orange-400 bg-orange-50 text-orange-900",
  monitor: "border-yellow-400 bg-yellow-50 text-yellow-900"
};

const SEV_BADGE = {
  critical: "bg-red-100 text-red-800",
  high: "bg-orange-100 text-orange-800",
  medium: "bg-yellow-100 text-yellow-800",
};

const RISK_ICON = { fall: Activity, medication: Pill, exacerbation: TrendingUp, safety: AlertTriangle, followup: Phone };

function AlertCard({ alert }) {
  const [open, setOpen] = useState(alert.urgency === "immediate");
  const Icon = RISK_ICON[alert.risk_type] || AlertTriangle;

  return (
    <div className={`rounded-lg border-2 p-3 ${RISK_COLOR[alert.urgency] || RISK_COLOR.monitor}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2 flex-1 min-w-0">
          <Icon className="w-4 h-4 mt-0.5 shrink-0" />
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold">{alert.title}</p>
              <Badge className={`text-xs ${SEV_BADGE[alert.urgency === "immediate" ? "critical" : alert.urgency === "soon" ? "high" : "medium"]}`}>
                {alert.urgency === "immediate" ? "Urgent" : alert.urgency === "soon" ? "Soon" : "Monitor"}
              </Badge>
            </div>
            <p className="text-xs opacity-75 mt-0.5">{alert.finding}</p>
          </div>
        </div>
        {(alert.recommended_actions?.length > 0 || alert.notify_physician) && (
          <button onClick={() => setOpen(!open)} className="opacity-50 hover:opacity-100 shrink-0">
            {open ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        )}
      </div>
      {open && (
        <div className="mt-2 pt-2 border-t border-current/20 space-y-1">
          {alert.recommended_actions?.map((a, i) => (
            <div key={i} className="flex items-start gap-1.5 text-xs">
              <ClipboardList className="w-3 h-3 mt-0.5 shrink-0 opacity-70" />
              <span>{a}</span>
            </div>
          ))}
          {alert.notify_physician && (
            <div className="flex items-center gap-1.5 text-xs font-semibold">
              <Phone className="w-3 h-3" /> Notify physician recommended
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function AlertsPanel({ alerts }) {
  const urgentAlerts = alerts.filter(a => a.urgency === "immediate");

  if (!alerts || alerts.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Heart className="w-4 h-4 text-red-500" />
        <p className="text-sm font-bold text-gray-800">Clinical Alerts</p>
        <Badge className="bg-red-100 text-red-700 text-xs">{alerts.length}</Badge>
      </div>
      {urgentAlerts.length > 0 && (
        <Alert className="border-red-400 bg-red-50 py-2">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          <AlertDescription className="text-red-900 text-sm font-semibold">
            {urgentAlerts.length} urgent alert{urgentAlerts.length > 1 ? "s" : ""} — confirm follow-up before closing.
          </AlertDescription>
        </Alert>
      )}
      {alerts.map((a, i) => (
        <AlertCard key={i} alert={a} />
      ))}
    </div>
  );
}
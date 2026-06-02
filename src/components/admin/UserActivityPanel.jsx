import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { format, formatDistanceToNow } from "date-fns";
import {
  LogIn, LogOut, FileText, Brain, Users, Shield, Settings,
  CheckSquare, AlertTriangle, BookOpen, Send, Eye, Star,
  Activity, Clock, Loader2
} from "lucide-react";

const ACTION_META = {
  login:               { icon: LogIn,       color: "text-green-600",  bg: "bg-green-50",  label: "Login" },
  logout:              { icon: LogOut,       color: "text-slate-500",   bg: "bg-slate-50",   label: "Logout" },
  page_visit:          { icon: Eye,          color: "text-blue-500",   bg: "bg-blue-50",   label: "Page View" },
  note_enhanced:       { icon: Brain,        color: "text-indigo-600", bg: "bg-indigo-50", label: "Note Enhanced" },
  note_ai_generated:   { icon: Brain,        color: "text-purple-600", bg: "bg-purple-50", label: "AI Note" },
  note_compliance_check:{ icon: Shield,      color: "text-orange-600", bg: "bg-orange-50", label: "Compliance Check" },
  visit_complete:      { icon: CheckSquare,  color: "text-green-600",  bg: "bg-green-50",  label: "Visit Completed" },
  visit_start:         { icon: Activity,     color: "text-blue-600",   bg: "bg-blue-50",   label: "Visit Started" },
  care_plan_create:    { icon: FileText,     color: "text-teal-600",   bg: "bg-teal-50",   label: "Care Plan Created" },
  care_plan_update:    { icon: FileText,     color: "text-teal-600",   bg: "bg-teal-50",   label: "Care Plan Updated" },
  incident_report:     { icon: AlertTriangle,color: "text-red-600",    bg: "bg-red-50",    label: "Incident Reported" },
  training_complete:   { icon: BookOpen,     color: "text-blue-600",   bg: "bg-blue-50",   label: "Training Completed" },
  document_uploaded:   { icon: FileText,     color: "text-slate-600",   bg: "bg-slate-50",   label: "Document Uploaded" },
  document_generated:  { icon: FileText,     color: "text-indigo-600", bg: "bg-indigo-50", label: "Document Generated" },
  document_signed:     { icon: FileText,     color: "text-green-600",  bg: "bg-green-50",  label: "Document Signed" },
  invitation_sent:     { icon: Send,         color: "text-blue-600",   bg: "bg-blue-50",   label: "Invite Sent" },
  invitation_resent:   { icon: Send,         color: "text-orange-600", bg: "bg-orange-50", label: "Invite Resent" },
  user_created:        { icon: Users,        color: "text-green-600",  bg: "bg-green-50",  label: "User Created" },
  user_role_changed:   { icon: Shield,       color: "text-purple-600", bg: "bg-purple-50", label: "Role Changed" },
  user_enabled:        { icon: Users,        color: "text-green-600",  bg: "bg-green-50",  label: "User Enabled" },
  user_disabled:       { icon: Users,        color: "text-red-600",    bg: "bg-red-50",    label: "User Disabled" },
  user_deleted:        { icon: Users,        color: "text-red-600",    bg: "bg-red-50",    label: "User Deleted" },
  user_password_reset: { icon: Settings,     color: "text-orange-600", bg: "bg-orange-50", label: "Password Reset" },
  settings_updated:    { icon: Settings,     color: "text-slate-600",   bg: "bg-slate-50",   label: "Settings Updated" },
  ai_feature_used:     { icon: Star,         color: "text-purple-600", bg: "bg-purple-50", label: "AI Feature" },
  error:               { icon: AlertTriangle,color: "text-red-600",    bg: "bg-red-50",    label: "Error" },
};

const DEFAULT_META = { icon: Activity, color: "text-slate-500", bg: "bg-slate-50", label: "Action" };

function getActionMeta(action) {
  return ACTION_META[action] || DEFAULT_META;
}

function ActionRow({ activity }) {
  const meta = getActionMeta(activity.action);
  const Icon = meta.icon;
  const detailLabel = activity.details?.page || activity.details?.patient_id
    ? `${activity.details?.page ? `• ${activity.details.page}` : ""}${activity.details?.patient_id ? ` • Patient` : ""}`
    : "";

  return (
    <div className="flex items-start gap-3 py-2 border-b border-slate-50 last:border-0">
      <div className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${meta.bg}`}>
        <Icon className={`w-3.5 h-3.5 ${meta.color}`} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-800">{meta.label}</span>
          {detailLabel && <span className="text-xs text-slate-400 truncate">{detailLabel}</span>}
        </div>
        <p className="text-xs text-slate-400 mt-0.5">
          {formatDistanceToNow(new Date(activity.created_date), { addSuffix: true })}
          {" · "}{format(new Date(activity.created_date), "MMM d, h:mm a")}
        </p>
      </div>
    </div>
  );
}

export default function UserActivityPanel({ userEmail, _userName }) {
  const { data: activities = [], isLoading } = useQuery({
    queryKey: ["user-activity-detail", userEmail],
    queryFn: () =>
      base44.entities.UserActivity.filter(
        { user_email: userEmail },
        "-created_date",
        100
      ),
    enabled: !!userEmail,
    staleTime: 30000,
  });

  const stats = useMemo(() => {
    const logins = activities.filter(a => a.action === "login").length;
    const notes = activities.filter(a => a.action === "note_enhanced" || a.action === "note_ai_generated").length;
    const visits = activities.filter(a => a.action === "visit_complete").length;
    const aiUses = activities.filter(a => a.action === "ai_feature_used" || a.action === "note_enhanced" || a.action === "note_compliance_check").length;
    const lastSeen = activities[0]?.created_date;
    return { logins, notes, visits, aiUses, lastSeen, total: activities.length };
  }, [activities]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-5 h-5 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {[
          { label: "Logins", value: stats.logins, icon: LogIn, color: "text-green-600" },
          { label: "Notes", value: stats.notes, icon: Brain, color: "text-indigo-600" },
          { label: "Visits Done", value: stats.visits, icon: CheckSquare, color: "text-teal-600" },
          { label: "AI Uses", value: stats.aiUses, icon: Star, color: "text-purple-600" },
        ].map(s => {
          const SIcon = s.icon;
          return (
            <div key={s.label} className="bg-slate-50 rounded-lg p-3 text-center">
              <SIcon className={`w-4 h-4 mx-auto mb-1 ${s.color}`} />
              <p className="text-lg font-bold text-slate-900">{s.value}</p>
              <p className="text-xs text-slate-500">{s.label}</p>
            </div>
          );
        })}
      </div>

      {stats.lastSeen && (
        <div className="flex items-center gap-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-3 py-2">
          <Clock className="w-3.5 h-3.5" />
          Last active: <strong>{format(new Date(stats.lastSeen), "MMM d, yyyy 'at' h:mm a")}</strong>
        </div>
      )}

      {/* Activity Feed */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Recent Activity ({stats.total})</p>
        </div>
        {activities.length === 0 ? (
          <div className="text-center py-6 text-slate-400 text-sm">No activity recorded yet</div>
        ) : (
          <div className="max-h-72 overflow-y-auto">
            {activities.map(a => <ActionRow key={a.id} activity={a} />)}
          </div>
        )}
      </div>
    </div>
  );
}
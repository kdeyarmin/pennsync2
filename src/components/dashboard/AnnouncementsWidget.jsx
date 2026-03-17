import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Bell, AlertCircle, CheckCircle, AlertTriangle, Info } from "lucide-react";
import { format } from "date-fns";

const TYPE_CONFIG = {
  urgent:  { border: "border-red-200",    bg: "bg-red-50",    bar: "bg-red-500",    icon: AlertCircle,   iconColor: "text-red-500",    label: "Urgent" },
  success: { border: "border-green-200",  bg: "bg-green-50",  bar: "bg-green-500",  icon: CheckCircle,   iconColor: "text-green-600",  label: "Update" },
  warning: { border: "border-amber-200",  bg: "bg-amber-50",  bar: "bg-amber-500",  icon: AlertTriangle, iconColor: "text-amber-500",  label: "Notice" },
  info:    { border: "border-blue-200",   bg: "bg-blue-50",   bar: "bg-blue-500",   icon: Info,          iconColor: "text-blue-500",   label: "Info" },
};

export default function AnnouncementsWidget() {
  const { data: announcements = [], isLoading } = useQuery({
    queryKey: ['announcements'],
    queryFn: () => base44.entities.Announcement.filter({ is_active: true }, '-created_date'),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (isLoading || announcements.length === 0) return null;

  return (
    <div className="mb-4 sm:mb-6">
      {/* Section header */}
      <div className="flex items-center gap-2 mb-3">
        <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-blue-100">
          <Bell className="w-4 h-4 text-blue-600" />
        </div>
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Announcements</h2>
        <span className="ml-auto text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded-full">{announcements.length}</span>
      </div>

      <div className="space-y-2.5">
        {announcements.map((announcement) => {
          const cfg = TYPE_CONFIG[announcement.type] || TYPE_CONFIG.info;
          const Icon = cfg.icon;
          return (
            <div
              key={announcement.id}
              className={`relative flex gap-3 p-4 rounded-xl border ${cfg.border} ${cfg.bg} shadow-sm overflow-hidden`}
            >
              {/* Left accent bar */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 rounded-l-xl ${cfg.bar}`} />

              <div className={`shrink-0 mt-0.5 ml-1 ${cfg.iconColor}`}>
                <Icon className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <h4 className="font-semibold text-gray-900 text-sm leading-tight">{announcement.title}</h4>
                  <span className="shrink-0 text-xs text-gray-400 mt-0.5">
                    {format(new Date(announcement.created_date), 'MMM d')}
                  </span>
                </div>
                <p className="text-xs text-gray-600 mt-1 leading-relaxed whitespace-pre-wrap">{announcement.content}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
} = useQuery({
    queryKey: ['announcements'],
    queryFn: () => base44.entities.Announcement.filter({ is_active: true }, '-created_date'),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-600" />
            Announcements
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (announcements.length === 0) {
    return (
      <Card className="mb-6">
        <CardContent className="p-4">
          <p className="text-sm text-gray-500 text-center">No announcements at this time.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-gray-900">
          <Bell className="w-5 h-5 text-blue-600" />
          Announcements
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4">
        <ScrollArea className="h-[200px] pr-3">
          <div className="space-y-3">
            {announcements.map((announcement) => (
              <div
                key={announcement.id}
                className={`p-3 rounded-lg border-l-4 ${
                  announcement.type === 'urgent' ? 'border-l-red-500 bg-red-50' :
                  announcement.type === 'success' ? 'border-l-green-500 bg-green-50' :
                  announcement.type === 'warning' ? 'border-l-yellow-500 bg-yellow-50' :
                  'border-l-blue-500 bg-blue-50'
                }`}
              >
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <h4 className="font-semibold text-gray-900 text-sm">{announcement.title}</h4>
                    <p className="text-xs text-gray-600 mt-1 whitespace-pre-wrap">{announcement.content}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      {format(new Date(announcement.created_date), 'MMM d, yyyy')}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
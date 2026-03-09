import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Home, Users, Brain, BookUser, Mail } from "lucide-react";

const BOTTOM_NAV_ITEMS = [
  { page: "Dashboard",          Icon: Home,     label: "Home" },
  { page: "Patients",           Icon: Users,    label: "Patients" },
  { page: "SmartNoteAssistant", Icon: Brain,    label: "Notes" },
  { page: "SendFax",            Icon: BookUser, label: "Fax" },
  { page: "Messages",           Icon: Mail,     label: "Messages", hasBadge: true },
];

export default function MobileBottomNav({ isActive, unreadMessageCount }) {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-gray-200 shadow-lg print:hidden safe-bottom">
      <div className="grid grid-cols-5 h-16">
        {BOTTOM_NAV_ITEMS.map(({ page, Icon, label, hasBadge }) => {
          const badge = hasBadge ? unreadMessageCount : 0;
          return (
            <Link key={page} to={createPageUrl(page)}
              className={`flex flex-col items-center justify-center gap-0.5 relative transition-colors active:scale-95 ${isActive(page) ? "text-indigo-600" : "text-gray-500 hover:text-gray-800"}`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {badge > 0 && (
                  <span className="absolute -top-1 -right-1.5 bg-red-500 text-white text-[10px] rounded-full min-w-[14px] h-[14px] flex items-center justify-center px-0.5 font-bold">{badge}</span>
                )}
              </div>
              <span className="text-[10px] font-medium leading-tight">{label}</span>
              {isActive(page) && <div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 bg-indigo-600 rounded-full" />}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
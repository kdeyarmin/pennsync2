import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, LogOut } from "lucide-react";
import FeedbackButton from "@/components/feedback/FeedbackButton";

export default function MobileMenu({ open, onClose, navCategories, adminItems, isAdmin, isActive, currentUser, onLogout }) {
  if (!open) return null;

  return (
    <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={onClose}>
      <div className="absolute left-0 top-0 bottom-0 w-72 bg-white flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 flex-shrink-0">
          <span className="font-bold text-lg text-gray-900">Menu</span>
          <Button variant="ghost" size="icon" onClick={onClose}><X className="w-5 h-5" /></Button>
        </div>

        <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
          {navCategories.map((category, catIndex) => (
            <div key={catIndex}>
              {category.category && (
                <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase mt-3">{category.category}</p>
              )}
              {category.items.map((item) => (
                <Link key={item.page} to={createPageUrl(item.page)} onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${isActive(item.page) ? "bg-indigo-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="flex items-center gap-2 flex-1">
                    {item.name}
                    {item.badge > 0 && <Badge className="bg-red-600 text-white ml-auto">{item.badge}</Badge>}
                  </span>
                </Link>
              ))}
              {catIndex === 0 && <div className="border-t border-gray-200 my-2" />}
            </div>
          ))}

          {isAdmin && (
            <>
              <div className="border-t border-gray-200 my-3" />
              <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase">Admin</p>
              {adminItems.map((item) =>
                item.action ? (
                  <button key={item.name} onClick={() => { item.action(); onClose(); }}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 w-full"
                  >
                    <item.icon className="w-5 h-5" />
                    <span className="flex items-center gap-2 flex-1">
                      {item.name}
                      {item.badge > 0 && <Badge className="bg-red-600 text-white ml-auto">{item.badge}</Badge>}
                    </span>
                  </button>
                ) : (
                  <Link key={item.page} to={createPageUrl(item.page)} onClick={onClose}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${isActive(item.page) ? "bg-indigo-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}
                  >
                    <item.icon className="w-5 h-5" />
                    {item.name}
                  </Link>
                )
              )}
            </>
          )}
        </nav>

        <div className="flex-shrink-0 border-t border-gray-200 p-3 space-y-1">
          <FeedbackButton />
          <Button variant="ghost" size="sm" onClick={onLogout} className="w-full justify-start text-red-600">
            <LogOut className="w-4 h-4 mr-2" /> Logout
          </Button>
          <div className="flex items-center gap-3 pt-2 border-t border-gray-200">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {currentUser?.full_name?.charAt(0) || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{currentUser?.full_name}</p>
              <p className="text-xs text-gray-500 truncate">{currentUser?.email}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
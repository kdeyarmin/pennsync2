import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X, LogOut, Shield } from "lucide-react";
import FeedbackButton from "@/components/feedback/FeedbackButton";

export default function MobileMenu({ open, onClose, navCategories, adminItems, isAdmin, isActive, currentUser, onLogout }) {
  if (!open) return null;

  return (
    <div className="md:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="absolute left-0 top-0 bottom-0 w-72 bg-slate-900 flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="h-16 flex items-center justify-between px-4 border-b border-slate-700/60 flex-shrink-0">
          <div className="flex items-center gap-2">
            <img
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee80d98929370f9e8f2932/02eed9872_pennsynclogoupdated.png"
              alt="Penn Sync"
              className="w-7 h-7 rounded-md"
            />
            <span className="font-bold text-base text-white">Penn Sync</span>
          </div>
          <Button variant="ghost" size="icon" onClick={onClose} className="text-slate-400 hover:text-white hover:bg-slate-800">
            <X className="w-5 h-5" />
          </Button>
        </div>

        {/* Secure indicator */}
        <div className="px-4 py-2 flex-shrink-0">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-emerald-900/40 border border-emerald-700/40 rounded-lg">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-semibold text-emerald-400">Secure Session</span>
          </div>
        </div>

        <nav className="flex-1 overflow-y-auto py-2 px-2 space-y-0.5">
          {navCategories.map((category, catIndex) => (
            <div key={catIndex}>
              {category.category && (
                <p className="px-3 pt-3 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  {category.category}
                </p>
              )}
              {category.items.map((item) => (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.page) ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <item.icon className="w-4 h-4 flex-shrink-0" />
                  <span className="flex items-center gap-2 flex-1">
                    <span className="truncate">{item.name}</span>
                    {item.badge > 0 && (
                      <Badge className="bg-red-500 text-white text-[10px] ml-auto px-1.5">{item.badge}</Badge>
                    )}
                  </span>
                </Link>
              ))}
              {catIndex === 0 && <div className="border-t border-slate-700/60 my-2" />}
            </div>
          ))}

          {isAdmin && (
            <>
              <div className="border-t border-slate-700/60 my-2" />
              {adminItems.map((category, catIndex) => (
                <div key={catIndex}>
                  {category.category && (
                    <p className="px-3 pt-3 pb-1 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      {category.category}
                    </p>
                  )}
                  {category.items.map((item) =>
                    item.action ? (
                      <button
                        key={item.name}
                        onClick={() => { item.action(); onClose(); }}
                        className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white w-full"
                      >
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        <span className="flex items-center gap-2 flex-1">
                          <span className="truncate">{item.name}</span>
                          {item.badge > 0 && (
                            <Badge className="bg-red-500 text-white text-[10px] ml-auto px-1.5">{item.badge}</Badge>
                          )}
                        </span>
                      </button>
                    ) : (
                      <Link
                        key={item.page}
                        to={createPageUrl(item.page)}
                        onClick={onClose}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                          isActive(item.page) ? "bg-blue-600 text-white" : "text-slate-300 hover:bg-slate-800 hover:text-white"
                        }`}
                      >
                        <item.icon className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{item.name}</span>
                      </Link>
                    )
                  )}
                  {catIndex === 0 && <div className="border-t border-slate-700/60 my-2" />}
                </div>
              ))}
            </>
          )}
        </nav>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-slate-700/60 p-3 space-y-2">
          <FeedbackButton />
          <div className="flex items-center gap-3 pt-2">
            <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
              {currentUser?.full_name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-white truncate">{currentUser?.full_name}</p>
              <p className="text-xs text-slate-400 truncate capitalize">{currentUser?.role || 'user'}</p>
            </div>
            <Button
              variant="ghost" size="icon"
              onClick={onLogout}
              className="h-8 w-8 text-slate-400 hover:text-red-400 hover:bg-slate-800 flex-shrink-0"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
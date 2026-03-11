import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Shield, ChevronLeft, ChevronRight, Sparkles, Users, LogOut } from "lucide-react";
import FeedbackButton from "@/components/feedback/FeedbackButton";

export default function DesktopSidebar({
  collapsed, onToggleCollapse,
  currentUser, isAdmin,
  navCategories, adminItems,
  isActive, onLogout,
}) {
  return (
    <aside className={`hidden md:flex flex-col bg-gradient-to-br from-sky-50 to-blue-100 shadow-lg border-r border-gray-200 transition-all duration-300 ${collapsed ? 'w-16' : 'w-56'} print:hidden h-screen sticky top-0`}>
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-3 border-b border-gray-200">
        <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2">
          <img src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee80d98929370f9e8f2932/52cac091f_20170AA9-BB95-4BA4-B4E7-793615312CC4.png" alt="Penn Sync Logo" className="w-8 h-8 rounded-lg flex-shrink-0" />
          {!collapsed && <span className="font-bold text-lg text-gray-900">Penn Sync</span>}
        </Link>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onToggleCollapse}>
          {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
        {!collapsed && (
          <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-green-50 border border-green-200 rounded-lg">
            <Shield className="w-4 h-4 text-green-600" />
            <span className="text-xs font-semibold text-green-700">Secure Session</span>
          </div>
        )}

        {/* Favorites */}
        {(currentUser?.favorited_pages?.length > 0 || currentUser?.favorited_patients?.length > 0) && (
          <>
            {!collapsed && (
              <p className="px-3 py-1 text-xs font-semibold text-yellow-600 uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Favorites
              </p>
            )}
            {currentUser?.favorited_pages?.map((pageName) => {
              const allItems = navCategories.flatMap(cat => cat.items).concat(adminItems);
              const pageItem = allItems.find(item => item.page === pageName);
              if (!pageItem) return null;
              return (
                <Link key={`fav-${pageName}`} to={createPageUrl(pageName)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(pageName) ? "bg-amber-500 text-white" : "text-gray-700 hover:bg-gray-100"}`}
                  title={collapsed ? pageItem.name : undefined}
                >
                  <pageItem.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span>{pageItem.name}</span>}
                </Link>
              );
            })}
            {currentUser?.favorited_patients?.map((patient) => (
              <Link key={`fav-patient-${patient.id}`} to={createPageUrl(`PatientDetails?id=${patient.id}`)}
                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100"
                title={collapsed ? patient.name : undefined}
              >
                <Users className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span className="truncate">{patient.name}</span>}
              </Link>
            ))}
            <div className="border-t border-gray-200 my-3" />
          </>
        )}

        {navCategories.map((category, catIndex) => (
          <div key={catIndex}>
            {category.category && !collapsed && (
              <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase mt-3">{category.category}</p>
            )}
            {category.items.map((item) => (
              <Link key={item.page} to={createPageUrl(item.page)}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(item.page) ? "bg-indigo-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}
                title={collapsed ? item.name : undefined}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && (
                  <span className="flex items-center gap-2 flex-1">
                    {item.name}
                    {item.badge > 0 && <Badge className="bg-red-600 text-white ml-auto">{item.badge}</Badge>}
                  </span>
                )}
                {collapsed && item.badge > 0 && <div className="absolute right-1 top-1 w-2 h-2 bg-red-600 rounded-full" />}
              </Link>
            ))}
            {catIndex === 0 && <div className="border-t border-gray-200 my-3" />}
          </div>
        ))}

        {isAdmin && (
          <>
            <div className="border-t border-gray-200 my-3" />
            {adminItems.map((category, catIndex) => (
              <div key={catIndex}>
                {category.category && !collapsed && (
                  <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase mt-3">{category.category}</p>
                )}
                {category.items.map((item) =>
                  item.action ? (
                    <button key={item.name} onClick={item.action}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-gray-600 hover:bg-gray-100 w-full relative"
                      title={collapsed ? item.name : undefined}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && (
                        <span className="flex items-center gap-2 flex-1">
                          {item.name}
                          {item.badge > 0 && <Badge className="bg-red-600 text-white ml-auto">{item.badge}</Badge>}
                        </span>
                      )}
                      {collapsed && item.badge > 0 && <div className="absolute right-1 top-1 w-2 h-2 bg-red-600 rounded-full" />}
                    </button>
                  ) : (
                    <Link key={item.page} to={createPageUrl(item.page)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isActive(item.page) ? "bg-indigo-600 text-white" : "text-gray-700 hover:bg-gray-100"}`}
                      title={collapsed ? item.name : undefined}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      {!collapsed && <span>{item.name}</span>}
                    </Link>
                  )
                )}
                {catIndex === 0 && <div className="border-t border-gray-200 my-3" />}
              </div>
            ))}
          </>
        )}
      </nav>

      {/* User Section */}
      <div className="border-t border-gray-200 p-3">
        {!collapsed && <FeedbackButton />}
        <Button variant="ghost" size="sm" onClick={onLogout}
          className={`mt-2 text-red-600 hover:text-red-700 hover:bg-red-50 ${collapsed ? 'w-full justify-center px-0' : 'w-full justify-start'}`}
        >
          <LogOut className="w-4 h-4" />
          {!collapsed && <span className="ml-2">Logout</span>}
        </Button>
        <div className={`flex items-center gap-3 mt-2 ${collapsed ? 'justify-center' : ''}`}>
          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
            {currentUser?.full_name?.charAt(0) || 'U'}
          </div>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">{currentUser?.full_name || 'User'}</p>
              <p className="text-xs text-gray-500 truncate">{currentUser?.email}</p>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}
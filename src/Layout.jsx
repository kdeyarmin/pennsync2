import React, { useState } from "react";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Home,
  Users,
  FileText,
  Calendar,
  ClipboardList,
  Shield,
  GraduationCap,
  BarChart3,
  Settings,
  Menu,
  X,
  Brain,
  Target,
  Bell,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Sparkles
} from "lucide-react";

export default function Layout({ children, currentPageName }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  const isAdmin = currentUser?.role === 'admin';

  const navItems = [
    { name: "Dashboard", icon: Home, page: "Dashboard" },
    { name: "Patients", icon: Users, page: "Patients" },
    { name: "Smart Notes", icon: Brain, page: "SmartNoteAssistant" },
    
    { name: "Care Plans", icon: Target, page: "CarePlanManagement" },
    { name: "Alerts", icon: Bell, page: "PatientAlerts" },
    { name: "Compliance", icon: Shield, page: "ComplianceDashboard" },
    { name: "Training", icon: GraduationCap, page: "NurseTraining" },
    { name: "Features", icon: FileText, page: "Features" },
  ];

  const adminItems = [
    { name: "Admin", icon: Settings, page: "AdminDashboard" },
    { name: "Import Patients", icon: Users, page: "ImportPatients" },
    { name: "Performance", icon: BarChart3, page: "NursePerformanceDashboard" },
    { name: "Analytics", icon: BarChart3, page: "PredictiveAnalytics" },
    { name: "Regulatory", icon: ClipboardList, page: "RegulatoryCompliance" },
  ];

  const handleLogout = () => {
    base44.auth.logout();
  };

  const isActive = (pageName) => {
    return currentPageName === pageName;
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Desktop Sidebar */}
      <aside className={`hidden lg:flex flex-col bg-white border-r border-gray-200 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-56'}`}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-3 border-b border-gray-200">
          <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            {!sidebarCollapsed && <span className="font-bold text-lg text-gray-900">Penn Sync</span>}
          </Link>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </Button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-4 px-2 space-y-1 overflow-y-auto">
          {navItems.map((item) => (
            <Link
              key={item.page}
              to={createPageUrl(item.page)}
              className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                isActive(item.page)
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
              }`}
              title={sidebarCollapsed ? item.name : undefined}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!sidebarCollapsed && <span>{item.name}</span>}
            </Link>
          ))}

          {isAdmin && (
            <>
              <div className="border-t border-gray-200 my-3" />
              {!sidebarCollapsed && <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase">Admin</p>}
              {adminItems.map((item) => (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.page)
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span>{item.name}</span>}
                </Link>
              ))}
            </>
          )}
        </nav>

        {/* User Section */}
        <div className="border-t border-gray-200 p-3">
          <div className={`flex items-center gap-3 ${sidebarCollapsed ? 'justify-center' : ''}`}>
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-medium flex-shrink-0">
              {currentUser?.full_name?.charAt(0) || 'U'}
            </div>
            {!sidebarCollapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{currentUser?.full_name || 'User'}</p>
                <p className="text-xs text-gray-500 truncate">{currentUser?.email}</p>
              </div>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className={`mt-2 text-red-600 hover:text-red-700 hover:bg-red-50 ${sidebarCollapsed ? 'w-full justify-center px-0' : 'w-full justify-start'}`}
          >
            <LogOut className="w-4 h-4" />
            {!sidebarCollapsed && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-50 bg-white border-b border-gray-200 h-14 flex items-center justify-between px-4">
        <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-lg flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-lg text-gray-900">Penn Sync</span>
        </Link>
        <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </Button>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="lg:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-64 bg-white" onClick={(e) => e.stopPropagation()}>
            <div className="h-14 flex items-center px-4 border-b border-gray-200">
              <span className="font-bold text-lg text-gray-900">Menu</span>
            </div>
            <nav className="py-4 px-2 space-y-1">
              {navItems.map((item) => (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  onClick={() => setMobileMenuOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
                    isActive(item.page)
                      ? "bg-blue-100 text-blue-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  <item.icon className="w-5 h-5" />
                  {item.name}
                </Link>
              ))}
              {isAdmin && (
                <>
                  <div className="border-t border-gray-200 my-3" />
                  <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase">Admin</p>
                  {adminItems.map((item) => (
                    <Link
                      key={item.page}
                      to={createPageUrl(item.page)}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
                        isActive(item.page)
                          ? "bg-blue-100 text-blue-700"
                          : "text-gray-600 hover:bg-gray-100"
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      {item.name}
                    </Link>
                  ))}
                </>
              )}
            </nav>
            <div className="absolute bottom-0 left-0 right-0 border-t border-gray-200 p-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {currentUser?.full_name?.charAt(0) || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{currentUser?.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">{currentUser?.email}</p>
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={handleLogout} className="w-full justify-start text-red-600">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 lg:overflow-auto pt-14 lg:pt-0">{children}</main>
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "./utils";
import { LayoutDashboard, Users, FileText, Menu, TrendingUp, Shield, Sparkles, Target, BarChart3, Award, Wand2, LogOut, AlertCircle, Brain, ClipboardCheck, Activity, GraduationCap, BookOpen } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "./api/base44Client";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "./components/ui/sidebar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./components/ui/dialog";
import { Button } from "./components/ui/button";
import { Alert, AlertDescription } from "./components/ui/alert";
import { SessionManager, logSecurityEvent, clearSensitiveData } from "./components/utils/security";

export default function Layout({ children }) {
  const location = useLocation();
  const [showTimeoutWarning, setShowTimeoutWarning] = useState(false);
  const [sessionManager] = useState(() => new SessionManager(15)); // 15 minute timeout
  
  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        const user = await base44.auth.me();
        return user;
      } catch (error) {
        return null;
      }
    },
  });

  const isAdmin = currentUser?.role === 'admin';

  // Session timeout management
  useEffect(() => {
    if (!currentUser) return;

    const handleTimeout = async () => {
      await logSecurityEvent('SESSION_TIMEOUT_LOGOUT', {
        last_page: location.pathname
      });
      
      alert('Your session has expired for security reasons. You will be logged out.');
      await base44.auth.logout();
    };

    const handleWarning = () => {
      setShowTimeoutWarning(true);
    };

    sessionManager.startMonitoring(handleTimeout, handleWarning);

    return () => {
      sessionManager.stopMonitoring();
    };
  }, [currentUser, location.pathname]);

  const handleExtendSession = () => {
    setShowTimeoutWarning(false);
    sessionManager.resetTimeout();
    logSecurityEvent('SESSION_EXTENDED', {});
  };

  const handleLogout = async () => {
    await logSecurityEvent('USER_LOGOUT', {
      page: location.pathname
    });
    
    // Clear sensitive data from memory (if any state managers exist)
    sessionStorage.clear();
    
    await base44.auth.logout();
  };

  const navigationItems = [
    {
      title: "Today's Visits",
      url: createPageUrl("Dashboard"),
      icon: LayoutDashboard,
    },
    {
      title: "Smart Note Assistant",
      url: createPageUrl("SmartNoteAssistant"),
      icon: Wand2,
    },
    {
      title: "Compliance",
      url: createPageUrl("ComplianceDashboard"),
      icon: ClipboardCheck,
    },
    {
      title: "Analytics",
      url: createPageUrl("AnalyticsDashboard"),
      icon: BarChart3,
    },
    {
      title: "Productivity",
      url: createPageUrl("ProductivityDashboard"),
      icon: TrendingUp,
    },
    {
      title: "Patients",
      url: createPageUrl("Patients"),
      icon: Users,
    },
    {
      title: "Features",
      url: createPageUrl("Features"),
      icon: Sparkles,
    },
    {
      title: "Patient Triage",
      url: createPageUrl("PatientTriage"),
      icon: Brain,
    },
    {
      title: "Predictive AI",
      url: createPageUrl("PredictiveAnalytics"),
      icon: Activity,
    },
    {
      title: "Template Library",
      url: createPageUrl("TemplateLibrary"),
      icon: FileText,
    },
    {
      title: "Staff Training",
      url: createPageUrl("StaffTraining"),
      icon: GraduationCap,
    },
    {
      title: "Patient Education",
      url: createPageUrl("PatientEducation"),
      icon: BookOpen,
    },
    ];

  if (isAdmin) {
    navigationItems.push({
      title: "Quality & Stars",
      url: createPageUrl("QualityDashboard"),
      icon: Award,
    });
    navigationItems.push({
      title: "Admin",
      url: createPageUrl("AdminDashboard"),
      icon: Shield,
    });
    navigationItems.push({
      title: "Survey Prep",
      url: createPageUrl("SurveyPreparation"),
      icon: FileText,
    });
    navigationItems.push({
      title: "Auto Care Plans",
      url: createPageUrl("AutomaticCarePlans"),
      icon: Target,
    });
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-blue-50 to-indigo-50">
        <Sidebar className="border-r border-blue-100 bg-white">
          <SidebarHeader className="border-b border-blue-100 p-4 bg-gradient-to-r from-blue-600 to-indigo-600">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-md">
                <FileText className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <h2 className="font-bold text-white text-lg">Penn Sync</h2>
                <p className="text-xs text-blue-100">Home Health Documentation</p>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-3">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
                Navigation
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`hover:bg-blue-50 hover:text-blue-700 transition-all duration-200 rounded-xl mb-1 ${
                          location.pathname === item.url ? 'bg-blue-100 text-blue-700 shadow-sm' : ''
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-3 px-4 py-3">
                          <item.icon className="w-5 h-5" />
                          <span className="font-medium">{item.title}</span>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>

          <SidebarFooter className="border-t border-blue-100 p-4 bg-gray-50">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-full flex items-center justify-center shadow-md">
                  <span className="text-white font-semibold text-sm">
                    {currentUser?.full_name?.substring(0, 2).toUpperCase() || 'RN'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm truncate">
                    {currentUser?.full_name || 'Registered Nurse'}
                  </p>
                  <p className="text-xs text-gray-500 truncate">
                    {isAdmin ? 'Administrator' : 'Home Health & Hospice'}
                  </p>
                </div>
              </div>
              
              <Button
                onClick={handleLogout}
                variant="outline"
                size="sm"
                className="w-full gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </Button>
            </div>
          </SidebarFooter>
        </Sidebar>

        <main className="flex-1 flex flex-col overflow-hidden">
          <header className="bg-white border-b border-blue-100 px-6 py-4 lg:hidden shadow-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-blue-50 p-2 rounded-lg transition-colors duration-200">
                <Menu className="w-6 h-6 text-gray-700" />
              </SidebarTrigger>
              <h1 className="text-xl font-bold text-gray-900">Penn Sync</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>

      {/* Session Timeout Warning Dialog */}
      <Dialog open={showTimeoutWarning} onOpenChange={setShowTimeoutWarning}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              Session Timeout Warning
            </DialogTitle>
            <DialogDescription>
              Your session will expire in 2 minutes due to inactivity. Any unsaved changes may be lost.
            </DialogDescription>
          </DialogHeader>
          
          <Alert className="bg-orange-50 border-orange-200">
            <AlertDescription className="text-orange-900">
              <p className="font-semibold mb-2">For your security:</p>
              <p>Penn Sync automatically logs you out after 15 minutes of inactivity to protect patient information.</p>
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button onClick={handleExtendSession} className="bg-blue-600 hover:bg-blue-700">
              Continue Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
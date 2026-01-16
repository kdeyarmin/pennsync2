import React, { useState, useEffect } from "react";
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
  Sparkles,
  Clock,
  BookOpen,
  WifiOff,
  Mail,
  AlertCircle,
  CheckSquare,
  Mic
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import OfflineIndicator from "../components/mobile/OfflineIndicator";
import FeedbackButton from "../components/feedback/FeedbackButton";
import NotificationCenter from "../components/notifications/NotificationCenter";
import SessionTimeoutManager from "../components/security/SessionTimeoutManager";
import Breadcrumbs from "../components/navigation/Breadcrumbs";
import { Toaster } from "sonner";

export default function Layout({ children, currentPageName }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  // Scroll to top when page changes
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [currentPageName]);

  const isAdmin = currentUser?.role === 'admin';
  const isApproved = currentUser?.is_approved === true || isAdmin;

  // Track user login and session
  useEffect(() => {
    if (currentUser?.email) {
      const sessionKey = `login_tracked_${currentUser.email}`;
      const hasTrackedLogin = sessionStorage.getItem(sessionKey);
      
      if (!hasTrackedLogin) {
        // Track via backend function
        base44.functions.invoke('trackUserLogin').then(() => {
          sessionStorage.setItem(sessionKey, 'true');
        }).catch(err => {
          console.error('Login tracking failed:', err);
        });
        
        // Also log directly to UserActivity
        base44.entities.UserActivity.create({
          user_email: currentUser.email,
          user_name: currentUser.full_name,
          action: 'login',
          details: {
            timestamp: new Date().toISOString(),
            user_role: currentUser.role,
            session_start: true
          },
          page: 'login'
        }).catch(err => {
          console.error('Direct login logging failed:', err);
        });
        
        sessionStorage.setItem(sessionKey, 'true');
      }
    }
  }, [currentUser?.email]);

  // Fetch unread message count
  const { data: messages = [] } = useQuery({
    queryKey: ['messages'],
    queryFn: () => base44.entities.Message.list('-created_date', 200),
    initialData: [],
    refetchInterval: 60000, // Refetch every minute
  });

  // Fetch active patient alerts (only for favorited patients)
  const { data: allActiveAlerts = [] } = useQuery({
    queryKey: ['active-alerts'],
    queryFn: () => base44.entities.PatientAlert.filter({ status: 'active' }, '-created_date', 50),
    initialData: [],
    refetchInterval: 60000,
    enabled: !!currentUser,
  });

  // Filter alerts to only favorited patients
  const activeAlerts = React.useMemo(() => {
    if (!currentUser?.favorited_patients) return [];
    return allActiveAlerts.filter(alert => 
      currentUser.favorited_patients.some(fav => fav.id === alert.patient_id)
    );
  }, [allActiveAlerts, currentUser]);

  // Fetch pending tasks
  const { data: pendingTasks = [] } = useQuery({
    queryKey: ['pending-tasks', currentUser?.email],
    queryFn: () => base44.entities.Task.filter({ 
      status: 'pending',
      assigned_to: currentUser?.email 
    }, '-created_date', 50),
    initialData: [],
    refetchInterval: 60000,
    enabled: !!currentUser?.email,
  });

  // Fetch in-app notifications
  const { data: inAppNotifications = [] } = useQuery({
    queryKey: ['notifications', currentUser?.email],
    queryFn: () => base44.entities.Notification.filter(
      { user_email: currentUser?.email },
      '-created_date',
      50
    ),
    initialData: [],
    refetchInterval: 30000,
    enabled: !!currentUser?.email,
  });

  const unreadMessageCount = messages.filter(m => 
    m.recipients?.includes(currentUser?.email) && !m.read_by?.includes(currentUser?.email)
  ).length;

  const unreadNotificationCount = inAppNotifications.filter(n => !n.is_read).length;

  const totalNotificationCount = unreadMessageCount + activeAlerts.length + pendingTasks.length + unreadNotificationCount;

  const navCategories = [
    {
      category: "Overview",
      items: [
        { name: "Dashboard", icon: Home, page: "Dashboard" }
      ]
    },
    {
      category: "Patient Care",
      items: [
        { name: "Patients", icon: Users, page: "Patients" },
        { name: "Care Plans", icon: Target, page: "CarePlanManagement" }
      ]
    },
    {
      category: "Communication",
      items: [
        { name: "Messages", icon: Mail, page: "Messages", badge: unreadMessageCount }
      ]
    },
    {
      category: "Documentation",
      items: [
        { name: "Smart Notes", icon: Brain, page: "SmartNoteAssistant" },
        { name: "Visit Scribe", icon: Mic, page: "VisitScribe" },
        { name: "Documents", icon: FileText, page: "DocumentHub" },
        { name: "Clinical Library", icon: BookOpen, page: "ClinicalLibrary" },
        { name: "Referrals", icon: FileText, page: "ReferralIntake" },
        { name: "Patient Education", icon: BookOpen, page: "PatientEducationHub" },
        { name: "Offline", icon: WifiOff, page: "OfflineMode" }
      ]
    },
    {
      category: "Quality & Compliance",
      items: [
        { name: "Compliance", icon: Shield, page: "MedicareComplianceDashboard" },
        { name: "Training", icon: GraduationCap, page: "StaffTrainingHub" },
        { name: "Guidelines", icon: BookOpen, page: "MedicareGuidelinesLibrary" }
      ]
    }
  ];

  const adminItems = [
        { name: "Dashboard", icon: BarChart3, page: "AdminDashboard" },
        { name: "Reports", icon: BarChart3, page: "Reports" },
        { name: "Users", icon: Users, page: "UserManagement" },
        { name: "Training", icon: GraduationCap, page: "TrainingManagement" },
        { name: "Compliance", icon: Shield, page: "ComplianceRegulatory" },
        { name: "Clinical", icon: ClipboardList, page: "ClinicalPathwayManager" },
        { name: "Data", icon: Users, page: "PatientDataManagement" },
        { name: "Security", icon: Shield, page: "SecurityCompliance" },
        { name: "Alerts", icon: Bell, page: null, badge: totalNotificationCount, action: () => setNotificationCenterOpen(true) },
        { name: "Settings", icon: Settings, page: "UserSettings" }
      ];

  const handleLogout = async () => {
    // Log logout before actually logging out
    try {
      await base44.entities.UserActivity.create({
        user_email: currentUser?.email,
        user_name: currentUser?.full_name,
        action: 'logout',
        details: { logout_time: new Date().toISOString() },
        page: 'logout'
      });
    } catch (error) {
      console.error('Failed to log logout:', error);
    }
    
    base44.auth.logout();
  };

  const isActive = (pageName) => {
    return currentPageName === pageName;
  };

  // Show pending approval screen for unapproved users
  if (currentUser && !isApproved) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="border-yellow-300 shadow-xl">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-yellow-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">
                Account Pending Approval
              </h1>
              <p className="text-gray-600 mb-6">
                Your account has been created successfully. Please wait for an administrator to approve your access.
              </p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-900">
                  <strong>Account Details:</strong><br />
                  {currentUser.full_name}<br />
                  {currentUser.email}
                </p>
              </div>
              <p className="text-sm text-gray-500 mb-6">
                You will receive an email notification once your account is approved.
              </p>
              <Button
                onClick={handleLogout}
                variant="outline"
                className="w-full"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <>
      <Toaster position="top-right" richColors closeButton />
      <div className="min-h-screen flex">

      {/* Desktop Sidebar */}
      <aside className={`hidden md:flex flex-col bg-gradient-to-br from-sky-50 to-blue-100 shadow-lg border-r border-gray-200 transition-all duration-300 ${sidebarCollapsed ? 'w-16' : 'w-56'} print:hidden h-screen sticky top-0`}>
        {/* Logo */}
        <div className="h-16 flex items-center justify-between px-3 border-b border-gray-200">
          <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee80d98929370f9e8f2932/52cac091f_20170AA9-BB95-4BA4-B4E7-793615312CC4.png" 
              alt="Penn Sync Logo" 
              className="w-8 h-8 rounded-lg flex-shrink-0"
            />
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
          {/* Secure Session Indicator */}
          {!sidebarCollapsed && (
            <div className="flex items-center gap-2 px-3 py-2 mb-2 bg-green-50 border border-green-200 rounded-lg">
              <Shield className="w-4 h-4 text-green-600" />
              <span className="text-xs font-semibold text-green-700">Secure Session</span>
            </div>
          )}
          
          {/* Favorites Section */}
          {(currentUser?.favorited_pages?.length > 0 || currentUser?.favorited_patients?.length > 0) && (
            <>
              {!sidebarCollapsed && <p className="px-3 py-1 text-xs font-semibold text-yellow-600 uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3" /> Favorites
              </p>}
              {currentUser?.favorited_pages?.map((pageName) => {
                const allItems = navCategories.flatMap(cat => cat.items).concat(adminItems);
                const pageItem = allItems.find(item => item.page === pageName);
                if (!pageItem) return null;
                return (
                  <Link
                    key={`fav-${pageName}`}
                    to={createPageUrl(pageName)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(pageName)
                        ? "bg-amber-500 text-white"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                    title={sidebarCollapsed ? pageItem.name : undefined}
                  >
                    <pageItem.icon className="w-5 h-5 flex-shrink-0" />
                    {!sidebarCollapsed && <span>{pageItem.name}</span>}
                  </Link>
                );
              })}
              {currentUser?.favorited_patients?.map((patient) => (
                <Link
                  key={`fav-patient-${patient.id}`}
                  to={createPageUrl(`PatientDetails?id=${patient.id}`)}
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  title={sidebarCollapsed ? patient.name : undefined}
                >
                  <Users className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && <span className="truncate">{patient.name}</span>}
                </Link>
              ))}
              <div className="border-t border-gray-200 my-3" />
            </>
          )}

          {navCategories.map((category, catIndex) => (
            <React.Fragment key={catIndex}>
              {category.category && !sidebarCollapsed && (
                <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase mt-3">
                  {category.category}
                </p>
              )}
              {category.items.map((item) => (
                <Link
                  key={item.page}
                  to={createPageUrl(item.page)}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive(item.page)
                      ? "bg-indigo-600 text-white"
                      : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                  }`}
                  title={sidebarCollapsed ? item.name : undefined}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!sidebarCollapsed && (
                    <span className="flex items-center gap-2 flex-1">
                      {item.name}
                      {item.badge > 0 && (
                        <Badge className="bg-red-600 text-white ml-auto">{item.badge}</Badge>
                      )}
                    </span>
                  )}
                  {sidebarCollapsed && item.badge > 0 && (
                    <div className="absolute right-1 top-1 w-2 h-2 bg-red-600 rounded-full" />
                  )}
                </Link>
              ))}
              {catIndex === 0 && <div className="border-t border-gray-200 my-3" />}
            </React.Fragment>
          ))}

          {isAdmin && (
                    <>
                      <div className="border-t border-gray-200 my-3" />
                      {!sidebarCollapsed && <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase">Admin</p>}
              {adminItems.map((item) => (
                item.action ? (
                  <button
                    key={item.name}
                    onClick={item.action}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-gray-600 hover:bg-gray-100 hover:text-gray-900 w-full relative"
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!sidebarCollapsed && (
                      <span className="flex items-center gap-2 flex-1">
                        {item.name}
                        {item.badge > 0 && (
                          <Badge className="bg-red-600 text-white ml-auto">{item.badge}</Badge>
                        )}
                      </span>
                    )}
                    {sidebarCollapsed && item.badge > 0 && (
                      <div className="absolute right-1 top-1 w-2 h-2 bg-red-600 rounded-full" />
                    )}
                  </button>
                ) : (
                  <Link
                    key={item.page}
                    to={createPageUrl(item.page)}
                    className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive(item.page)
                        ? "bg-indigo-600 text-white"
                        : "text-gray-700 hover:bg-gray-100 hover:text-gray-900"
                    }`}
                    title={sidebarCollapsed ? item.name : undefined}
                  >
                    <item.icon className="w-5 h-5 flex-shrink-0" />
                    {!sidebarCollapsed && <span>{item.name}</span>}
                  </Link>
                )
              ))}
            </>
          )}
        </nav>

        {/* User Section */}
        <div className="border-t border-gray-200 p-3">
          {!sidebarCollapsed && <FeedbackButton />}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleLogout}
            className={`mt-2 text-red-600 hover:text-red-700 hover:bg-red-50 ${sidebarCollapsed ? 'w-full justify-center px-0' : 'w-full justify-start'}`}
          >
            <LogOut className="w-4 h-4" />
            {!sidebarCollapsed && <span className="ml-2">Logout</span>}
          </Button>
          <div className={`flex items-center gap-3 mt-2 ${sidebarCollapsed ? 'justify-center' : ''}`}>
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
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-slate-800 shadow-md border-b border-slate-700 h-16 flex items-center justify-between px-4 print:hidden">
        <div className="flex items-center gap-2">
          <Link to={createPageUrl("Dashboard")} className="flex items-center gap-2">
            <img 
              src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68ee80d98929370f9e8f2932/52cac091f_20170AA9-BB95-4BA4-B4E7-793615312CC4.png" 
              alt="Penn Sync Logo" 
              className="w-8 h-8 rounded-lg"
            />
            <span className="font-bold text-lg text-white">Penn Sync</span>
          </Link>
          <div className="hidden sm:flex items-center gap-1 text-green-300 text-xs font-medium ml-2">
            <Shield className="w-3 h-3" />
            Secure
          </div>
        </div>
        <div className="flex items-center gap-2">
          {/* Mobile Notifications */}
          <Button 
            variant="ghost" 
            size="icon" 
            className="relative text-white hover:bg-slate-700 h-12 w-12"
            onClick={() => setNotificationCenterOpen(true)}
          >
            <Bell className="w-5 h-5" />
            {totalNotificationCount > 0 && (
              <span className="absolute top-2 right-2 bg-red-600 text-white text-xs rounded-full px-1.5 py-0.5 min-w-[18px] text-center">
                {totalNotificationCount}
              </span>
            )}
          </Button>

            <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-white hover:bg-slate-700 h-12 w-12">
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </Button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/50" onClick={() => setMobileMenuOpen(false)}>
          <div className="absolute left-0 top-0 bottom-0 w-72 bg-white flex flex-col shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 flex-shrink-0">
              <span className="font-bold text-lg text-gray-900">Menu</span>
              <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)}>
                <X className="w-5 h-5" />
              </Button>
            </div>
            <nav className="flex-1 overflow-y-auto py-4 px-2 space-y-1">
              {navCategories.map((category, catIndex) => (
                <React.Fragment key={catIndex}>
                  {category.category && (
                    <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase mt-3">
                      {category.category}
                    </p>
                  )}
                  {category.items.map((item) => (
                    <Link
                      key={item.page}
                      to={createPageUrl(item.page)}
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
                        isActive(item.page)
                          ? "bg-indigo-600 text-white"
                          : "text-gray-700 hover:bg-gray-100"
                      }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span className="flex items-center gap-2 flex-1">
                        {item.name}
                        {item.badge > 0 && (
                          <Badge className="bg-red-600 text-white ml-auto">{item.badge}</Badge>
                        )}
                      </span>
                    </Link>
                  ))}
                  {catIndex === 0 && <div className="border-t border-gray-200 my-2" />}
                </React.Fragment>
              ))}
              {isAdmin && (
                <>
                  <div className="border-t border-gray-200 my-3" />
                  <p className="px-3 py-1 text-xs font-semibold text-gray-400 uppercase">Admin</p>
                  {adminItems.map((item) => (
                    item.action ? (
                      <button
                        key={item.name}
                        onClick={() => {
                          item.action();
                          setMobileMenuOpen(false);
                        }}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 w-full relative"
                      >
                        <item.icon className="w-5 h-5" />
                        <span className="flex items-center gap-2 flex-1">
                          {item.name}
                          {item.badge > 0 && (
                            <Badge className="bg-red-600 text-white ml-auto">{item.badge}</Badge>
                          )}
                        </span>
                      </button>
                    ) : (
                      <Link
                        key={item.page}
                        to={createPageUrl(item.page)}
                        onClick={() => setMobileMenuOpen(false)}
                        className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium ${
                          isActive(item.page)
                            ? "bg-indigo-600 text-white"
                            : "text-gray-700 hover:bg-gray-100"
                        }`}
                      >
                        <item.icon className="w-5 h-5" />
                        {item.name}
                      </Link>
                    )
                  ))}
                </>
              )}
            </nav>
            <div className="flex-shrink-0 border-t border-gray-200 p-3 space-y-1">
              <FeedbackButton />
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={handleLogout} 
                className="w-full justify-start text-red-600"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Logout
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
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto pt-16 md:pt-0 pb-24 md:pb-0 min-h-screen bg-gradient-to-br from-sky-50 to-blue-100">
        <div className="p-3 sm:p-4 md:p-5 lg:p-6">
          <Breadcrumbs currentPageName={currentPageName} />
          {children}
        </div>
      </main>

      {/* Offline Indicator */}
      <OfflineIndicator />
      
      {/* HIPAA Security - Session Timeout */}
      <SessionTimeoutManager timeoutMinutes={15} warningMinutes={2} />

      {/* Notification Center Dialog */}
      <Dialog open={notificationCenterOpen} onOpenChange={setNotificationCenterOpen}>
        <DialogContent className="max-w-2xl p-0 border-0">
          <div className="sr-only">
            <DialogTitle>Notifications</DialogTitle>
          </div>
          <NotificationCenter 
            currentUser={currentUser} 
            onClose={() => setNotificationCenterOpen(false)} 
          />
        </DialogContent>
      </Dialog>
      </div>
    </>
  );
}
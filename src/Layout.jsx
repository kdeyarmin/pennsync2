import { useState, useEffect, useMemo } from "react";
import { useState, useEffect, useMemo, useCallback } from "react";

import { createPageUrl } from "@/utils";
import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Home, Users, FileText, ClipboardList, Shield, GraduationCap,
  BarChart3, Settings, Brain, Target, Bell, LogOut, ChevronLeft,
  BookOpen, WifiOff, Mail, Mic, BookUser, Video
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Toaster } from "sonner";

import DesktopSidebar from "../components/layout/DesktopSidebar";
import MobileHeader from "../components/layout/MobileHeader";
import MobileMenu from "../components/layout/MobileMenu";
import MobileBottomNav from "../components/layout/MobileBottomNav";
import OfflineIndicator from "../components/mobile/OfflineIndicator";
import FeedbackButton from "../components/feedback/FeedbackButton";
import NotificationCenter from "../components/notifications/NotificationCenter";
import SessionTimeoutManager from "../components/security/SessionTimeoutManager";
import Breadcrumbs from "../components/navigation/Breadcrumbs";

export default function Layout({ children, currentPageName }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const update = (isDark) => document.documentElement.classList.toggle('dark', isDark);
    update(mq.matches);
    mq.addEventListener('change', e => update(e.matches));
    return () => mq.removeEventListener('change', e => update(e.matches));
  }, []);

  const { data: currentUser } = useQuery({
    queryKey: ['currentUser'],
    queryFn: () => base44.auth.me(),
  });

  useEffect(() => { window.scrollTo(0, 0); }, [currentPageName]);

  const isAdmin = currentUser?.role === 'admin';
  const isApproved = currentUser?.is_approved === true || isAdmin;

  useEffect(() => {
    if (!currentUser?.email) return;
    const key = `login_tracked_${currentUser.email}`;
    if (sessionStorage.getItem(key)) return;
    base44.entities.UserActivity.create({
      user_email: currentUser.email,
      user_name: currentUser.full_name,
      action: 'login',
      device_type: /mobile|android|iphone/i.test(navigator.userAgent) ? 'mobile' : /tablet|ipad/i.test(navigator.userAgent) ? 'tablet' : 'desktop',
      details: { timestamp: new Date().toISOString(), user_role: currentUser.role, session_start: true },
      user_agent: navigator.userAgent,
    }).catch(() => {});
    sessionStorage.setItem(key, 'true');
  }, [currentUser?.email]);

  const { data: messages = [] } = useQuery({
    queryKey: ['unreadMessages', currentUser?.email],
    queryFn: () => base44.entities.Message.filter({ recipients: currentUser.email }, '-created_date', 50),
    initialData: [], refetchInterval: 60000, enabled: !!currentUser?.email,
  });

  const { data: allActiveAlerts = [] } = useQuery({
    queryKey: ['active-alerts'],
    queryFn: () => base44.entities.PatientAlert.filter({ status: 'active' }, '-created_date', 50),
    initialData: [], refetchInterval: 60000, enabled: !!currentUser?.favorited_patients?.length,
  });

  const activeAlerts = useMemo(() => {
    if (!currentUser?.favorited_patients?.length) return [];
    const favIds = new Set(currentUser.favorited_patients.map(f => f.id));
    return allActiveAlerts.filter(a => favIds.has(a.patient_id));
  }, [allActiveAlerts, currentUser]);

  const { data: pendingTasks = [] } = useQuery({
    queryKey: ['pending-tasks', currentUser?.email],
    queryFn: () => base44.entities.Task.filter({ status: 'pending', assigned_to: currentUser?.email }, '-created_date', 50),
    initialData: [], refetchInterval: 60000, enabled: !!currentUser?.email,
  });

  const { data: inAppNotifications = [] } = useQuery({
    queryKey: ['notifications', currentUser?.email],
    queryFn: () => base44.entities.Notification.filter({ user_email: currentUser?.email }, '-created_date', 50),
    initialData: [], refetchInterval: 30000, enabled: !!currentUser?.email,
  });

  const unreadMessageCount = messages.filter(m => !m.read_by?.includes(currentUser?.email)).length;
  const unreadNotificationCount = inAppNotifications.filter(n => !n.is_read).length;
  const totalNotificationCount = unreadMessageCount + activeAlerts.length + pendingTasks.length + unreadNotificationCount;

  const navCategories = useMemo(() => [
    { category: "Overview", items: [{ name: "Dashboard", icon: Home, page: "Dashboard" }] },
    {
      category: "Patient Care",
      items: [
        { name: "Patients", icon: Users, page: "Patients" },
        { name: "Care Plans", icon: Target, page: "CarePlanManagement" },
        { name: "Plan Builder", icon: Target, page: "CarePlanBuilder" },
        { name: "OASIS Assessment", icon: Brain, page: "SmartOASISAssessment" },
      ],
    },
    {
      category: "Communication",
      items: [
        { name: "Messages", icon: Mail, page: "Messages", badge: unreadMessageCount },
        { name: "Send a Fax", icon: BookUser, page: "SendFax" },
        { name: "Fax Dashboard", icon: BarChart3, page: "FaxDashboard" },
        { name: "Telehealth", icon: Video, page: "Telehealth" },
      ],
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
        { name: "Offline", icon: WifiOff, page: "OfflineMode" },
      ],
    },
    {
      category: "Quality & Compliance",
      items: [
        { name: "Compliance", icon: Shield, page: "MedicareComplianceDashboard" },
        { name: "Training", icon: GraduationCap, page: "StaffTrainingHub" },
        { name: "Guidelines", icon: BookOpen, page: "MedicareGuidelinesLibrary" },
      ],
    },
  ];

  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [unreadMessageCount]);

  const adminItems = useMemo(() => [
    { name: "Dashboard", icon: BarChart3, page: "AdminDashboard" },
    { name: "Reports", icon: BarChart3, page: "Reports" },
    { name: "Users", icon: Users, page: "UserManagement" },
    { name: "Training", icon: GraduationCap, page: "TrainingManagement" },
    { name: "Compliance", icon: Shield, page: "ComplianceRegulatory" },
    { name: "Clinical", icon: ClipboardList, page: "ClinicalPathwayManager" },
    { name: "Data", icon: Users, page: "PatientDataManagement" },
    { name: "Security", icon: Shield, page: "SecurityCompliance" },
    { name: "Alerts", icon: Bell, page: null, badge: totalNotificationCount, action: () => setNotificationCenterOpen(true) },
    { name: "Settings", icon: Settings, page: "UserSettings" },
  // eslint-disable-next-line react-hooks/exhaustive-deps
  ], [totalNotificationCount, isAdmin]);

  const handleLogout = useCallback(async () => {
    try {
      await base44.entities.UserActivity.create({
        user_email: currentUser?.email, user_name: currentUser?.full_name, action: 'logout',
        device_type: /mobile|android|iphone/i.test(navigator.userAgent) ? 'mobile' : /tablet|ipad/i.test(navigator.userAgent) ? 'tablet' : 'desktop',
        details: { logout_time: new Date().toISOString(), user_role: currentUser?.role },
        user_agent: navigator.userAgent,
      });
    } catch {}
    base44.auth.logout();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.email]);

  const isActive = useCallback((pageName) => currentPageName === pageName, [currentPageName]);

  if (currentUser && !isApproved) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <Card className="border-yellow-300 shadow-xl">
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-10 h-10 text-yellow-600" />
              </div>
              <h1 className="text-2xl font-bold text-gray-900 mb-3">Account Pending Approval</h1>
              <p className="text-gray-600 mb-6">Your account has been created successfully. Please wait for an administrator to approve your access.</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-900"><strong>Account Details:</strong><br />{currentUser.full_name}<br />{currentUser.email}</p>
              </div>
              <p className="text-sm text-gray-500 mb-6">You will receive an email notification once your account is approved.</p>
              <Button onClick={handleLogout} variant="outline" className="w-full">
                <LogOut className="w-4 h-4 mr-2" /> Sign Out
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
        <DesktopSidebar
          collapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(v => !v)}
          currentUser={currentUser}
          isAdmin={isAdmin}
          navCategories={navCategories}
          adminItems={adminItems}
          isActive={isActive}
          onLogout={handleLogout}
        />

        <MobileHeader
          currentPageName={currentPageName}
          totalNotificationCount={totalNotificationCount}
          mobileMenuOpen={mobileMenuOpen}
          onToggleMobileMenu={() => setMobileMenuOpen(v => !v)}
          onOpenNotificationCenter={() => setNotificationCenterOpen(true)}
        />

        <MobileMenu
          open={mobileMenuOpen}
          onClose={() => setMobileMenuOpen(false)}
          navCategories={navCategories}
          adminItems={adminItems}
          isAdmin={isAdmin}
          isActive={isActive}
          currentUser={currentUser}
          onLogout={handleLogout}
        />

        <main className="flex-1 overflow-auto pt-16 md:pt-0 pb-20 md:pb-0 min-h-screen bg-gradient-to-br from-sky-50 to-blue-100">
          <div className="p-3 sm:p-4 md:p-5 lg:p-6">
            <Breadcrumbs currentPageName={currentPageName} />
            {children}
          </div>
        </main>

        <MobileBottomNav isActive={isActive} unreadMessageCount={unreadMessageCount} />

        <OfflineIndicator />
        <SessionTimeoutManager timeoutMinutes={15} warningMinutes={2} />

        <Dialog open={notificationCenterOpen} onOpenChange={setNotificationCenterOpen}>
          <DialogContent className="max-w-2xl p-0 border-0">
            <div className="sr-only"><DialogTitle>Notifications</DialogTitle></div>
            <NotificationCenter currentUser={currentUser} onClose={() => setNotificationCenterOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
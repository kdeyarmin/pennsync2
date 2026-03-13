import { useState, useEffect, useMemo, useCallback } from "react";

import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import {
  Home, Users, FileText, ClipboardList, Shield, GraduationCap,
  BarChart3, Settings, Brain, Target, Bell, LogOut,
  BookOpen, WifiOff, Mail, Mic, BookUser, Video, HelpCircle, AlertTriangle, CheckCircle2, Database, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Clock } from "lucide-react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Toaster } from "sonner";

import DesktopSidebar from "@/components/layout/DesktopSidebar";
import MobileHeader from "@/components/layout/MobileHeader";
import MobileMenu from "@/components/layout/MobileMenu";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import OfflineIndicator from "@/components/mobile/OfflineIndicator";
import OfflineSyncService from "@/components/offline/OfflineSyncService";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import SessionTimeoutManager from "@/components/security/SessionTimeoutManager";
import Breadcrumbs from "@/components/navigation/Breadcrumbs";

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

  const { data: currentUser, error: userError } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        return await base44.auth.me();
      } catch (error) {
        if (error.status === 403) {
          return null;
        }
        throw error;
      }
    },
    retry: false,
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

  // Fetch charted visits to filter alerts
  const { data: chartedVisits = [] } = useQuery({
    queryKey: ['my-charted-visits', currentUser?.email],
    queryFn: () => base44.entities.Visit.filter(
      { created_by: currentUser?.email },
      '-visit_date',
      500
    ),
    initialData: [],
    enabled: !!currentUser?.email && currentUser?.role !== 'admin',
  });

  const { data: allActiveAlerts = [] } = useQuery({
    queryKey: ['active-alerts', currentUser?.email],
    queryFn: async () => {
      const alerts = await base44.entities.PatientAlert.filter({ status: 'active' }, '-created_date', 50);
      // Filter to only alerts for patients this clinician has charted on
      const chartedPatientIds = new Set(chartedVisits.map(v => v.patient_id));
      return alerts.filter(a => chartedPatientIds.has(a.patient_id));
    },
    initialData: [], 
    refetchInterval: 60000, 
    enabled: !!currentUser?.email && currentUser?.role !== 'admin' && chartedVisits.length > 0,
  });

  const activeAlerts = useMemo(() => isAdmin ? [] : allActiveAlerts, [allActiveAlerts, isAdmin]);

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
        { name: "Incident Reports", icon: AlertTriangle, page: "IncidentReporting" },
      ],
    },
    {
      category: "Documentation & Notes",
      items: [
        { name: "Smart Notes", icon: Brain, page: "SmartNoteAssistant" },
        { name: "Visit Scribe", icon: Mic, page: "VisitScribe" },
        { name: "Documents", icon: FileText, page: "DocumentHub" },
        { name: "Referrals", icon: FileText, page: "ReferralIntake" },
      ],
    },
    {
      category: "Education & Resources",
      items: [
        { name: "Clinical Library", icon: BookOpen, page: "ClinicalLibrary" },
        { name: "Patient Education", icon: BookOpen, page: "PatientEducationHub" },
        { name: "Guidelines", icon: Shield, page: "MedicareGuidelinesLibrary" },
      ],
    },
    {
      category: "Communication",
      items: [
        { name: "Messages", icon: Mail, page: "Messages", badge: unreadMessageCount },
        { name: "Fax", icon: BookUser, page: "SendFax" },
        { name: "Providers", icon: Users, page: "PhysicianDirectory" },
        { name: "Telehealth", icon: Video, page: "Telehealth" },
      ],
    },
    {
      category: "Compliance & Training",
      items: [
        { name: "Compliance", icon: Shield, page: "MedicareComplianceDashboard" },
        { name: "Training", icon: GraduationCap, page: "StaffTrainingHub" },
        { name: "Annual Education", icon: GraduationCap, page: "MyAnnualEducation" },
        { name: "Skills Checklists", icon: CheckCircle2, page: "ClinicalSkillsChecklist" },
      ],
    },
    {
      category: "Tools",
      items: [
        { name: "Offline Mode", icon: WifiOff, page: "OfflineMode" },
        { name: "Help & Manual", icon: HelpCircle, page: "Help" },
      ],
    },
  ], [unreadMessageCount]);

  const adminItems = useMemo(() => [
    { category: "Admin Overview", items: [{ name: "Admin Dashboard", icon: BarChart3, page: "AdminDashboard" }] },
    { 
      category: "Manage", 
      items: [
        { name: "Users", icon: Users, page: "UserManagement" },
        { name: "Training Manager", icon: GraduationCap, page: "TrainingManagement" },
        { name: "Clinical Pathways", icon: ClipboardList, page: "ClinicalPathwayManager" },
      ] 
    },
    { 
      category: "Monitor & Analytics", 
      items: [
        { name: "Reports", icon: BarChart3, page: "Reports" },
        { name: "Population Health", icon: Users, page: "PopulationHealthAnalytics" },
        { name: "Alerts", icon: Bell, page: null, badge: totalNotificationCount, action: () => setNotificationCenterOpen(true) },
      ] 
    },
    { 
      category: "Compliance & Security", 
      items: [
        { name: "Compliance", icon: Shield, page: "ComplianceRegulatory" },
        { name: "Security", icon: Shield, page: "SecurityCompliance" },
      ] 
    },
    { 
      category: "Configuration", 
      items: [
        { name: "Data Management", icon: Users, page: "PatientDataManagement" },
        { name: "Data Quality", icon: Database, page: "DataQualityMonitor" },
        { name: "System Health", icon: Activity, page: "SystemHealthMonitor" },
        { name: "Settings", icon: Settings, page: "UserSettings" },
      ] 
    },

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

        {/* Floating Sync Status */}
        <div className="fixed bottom-20 md:bottom-4 right-4 z-40 max-w-sm">
          <OfflineSyncService />
        </div>
        <SessionTimeoutManager timeoutMinutes={15} warningMinutes={2} />

        <Dialog open={notificationCenterOpen} onOpenChange={setNotificationCenterOpen}>
          <DialogContent className="max-w-2xl p-0 border-0 bg-white">
            <div className="sr-only"><DialogTitle>Notifications</DialogTitle></div>
            <NotificationCenter currentUser={currentUser} onClose={() => setNotificationCenterOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>
    </>
  );
}
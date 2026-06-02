import { useState, useEffect, useMemo, useCallback } from "react";

import { base44 } from "@/api/base44Client";
import { useQuery } from "@tanstack/react-query";
import { queryClientInstance } from "@/lib/query-client";
<<<<<<< HEAD
import { Bell, LogOut } from "lucide-react";
=======
import { clearCachedPHI } from "@/lib/phiStorage";
import { Bell, LogOut, Clock } from "lucide-react";
>>>>>>> origin/main
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Toaster } from "sonner";
import { buildNavCategories, buildAdminItems, NAV_MANIFEST } from "@/lib/nav.manifest";

import DesktopSidebar from "@/components/layout/DesktopSidebar";
import MobileHeader from "@/components/layout/MobileHeader";
import MobileMenu from "@/components/layout/MobileMenu";
import MobileBottomNav from "@/components/layout/MobileBottomNav";
import OfflineIndicator from "@/components/mobile/OfflineIndicator";
import OfflineSyncService from "@/components/offline/OfflineSyncService";
import NotificationCenter from "@/components/notifications/NotificationCenter";
import SessionTimeoutManager from "@/components/security/SessionTimeoutManager";
import Breadcrumbs from "@/components/navigation/Breadcrumbs";
import CommandPalette from "@/components/navigation/CommandPalette";
import { getPageMeta } from "@/components/navigation/navConfig";

// Build a sidebar item from the shared navConfig manifest so label + icon stay
// in sync with the command palette and breadcrumbs. `extra` carries the
// sidebar-only bits (dynamic unread badges, etc.).
const navItem = (page, extra = {}) => {
  const meta = getPageMeta(page);
  return { name: meta.label, icon: meta.icon, page, ...extra };
};

export default function Layout({ children, currentPageName }) {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationCenterOpen, setNotificationCenterOpen] = useState(false);

  // PennSync ships a single, fully-designed light theme: every page and
  // component uses explicit light styles and none provide `dark:` variants.
  // Previously this effect mirrored the OS `prefers-color-scheme`, toggling the
  // `dark` class on <html>. That flipped only the CSS-variable tokens (popovers,
  // dropdown menus, charts, `muted` text) to dark while the hardcoded
  // `bg-white` / `text-slate-900` surfaces stayed light — producing an
  // inconsistent, partially-unreadable UI for anyone on a dark-mode device.
  // Keep the app in its intended light theme so every screen renders the same.
  useEffect(() => {
    document.documentElement.classList.remove('dark');
  }, []);

  const { data: currentUser } = useQuery({
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

  useEffect(() => {
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
  }, [currentPageName]);

  const isAdmin = currentUser?.role === 'admin';
  const isApproved = currentUser?.is_approved === true || isAdmin;
  const isTimeOffApprover = isAdmin || currentUser?.is_manager === true;

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

  // Time-off requests awaiting this user's review (admins see all pending;
  // managers see their direct reports'). Drives the "Time Off" nav badge.
  const { data: pendingTimeOff = [] } = useQuery({
    queryKey: ['pending-timeoff', currentUser?.email, isAdmin],
    queryFn: () => isAdmin
      ? base44.entities.TimeOffRequest.filter({ status: 'pending' }, '-created_date', 100)
      : base44.entities.TimeOffRequest.filter({ manager_email: currentUser.email, status: 'pending' }, '-created_date', 100),
    initialData: [], refetchInterval: 120000, enabled: !!currentUser?.email && isTimeOffApprover,
  });
  // Exclude the reviewer's own requests — they can't approve those.
  const pendingTimeOffCount = pendingTimeOff.filter((r) => r.employee_email !== currentUser?.email).length;

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

  const { data: unreadSmsMessages = [] } = useQuery({
    queryKey: ['unread-sms', currentUser?.email],
    queryFn: () => base44.entities.SmsMessage.filter({ nurse_email: currentUser?.email, is_read: false }, '-created_date', 50),
    initialData: [], refetchInterval: 30000, enabled: !!currentUser?.email,
  });

  const unreadMessageCount = messages.filter(m => !m.read_by?.includes(currentUser?.email)).length;
  const unreadSmsCount = unreadSmsMessages.length;
  const unreadNotificationCount = inAppNotifications.filter(n => !n.is_read).length;
  const totalNotificationCount = unreadMessageCount + activeAlerts.length + pendingTasks.length + unreadNotificationCount;

<<<<<<< HEAD
  // Badge value map — keys match the `badge` field in nav.manifest entries
  const badgeValues = useMemo(() => ({
    messages: unreadMessageCount,
    sms: unreadSmsCount,
    notifications: unreadNotificationCount,
  }), [unreadMessageCount, unreadSmsCount, unreadNotificationCount]);

  // Action map — keys match the `action` field in nav.manifest entries
  const actionHandlers = useMemo(() => ({
    openNotifications: () => setNotificationCenterOpen(true),
  }), []);
=======
  const navCategories = useMemo(() => [
    { category: "Overview", items: [navItem("Dashboard")] },
    {
      category: "Patient Care",
      items: [
        navItem("Patients"),
        navItem("CarePlanManagement"),
        navItem("SmartOASISAssessment"),
        navItem("Incidents"),
      ],
    },
    {
      category: "Documentation",
      items: [
        navItem("ClinicalDocumentation"),
        navItem("DocumentHub"),
        navItem("ReferralIntake"),
      ],
    },
    {
      category: "Communication",
      items: [
        navItem("Messages", { badge: unreadMessageCount }),
        navItem("PhoneCenter", { badge: unreadSmsCount }),
        navItem("SendFax"),
        navItem("PhysicianDirectory"),
        navItem("Telehealth"),
      ],
    },
    {
      category: "Resources",
      items: [navItem("ResourceLibrary")],
    },
    {
      category: "My Learning",
      items: [
        navItem("LearningCenter"),
        navItem("MyLearning"),
        navItem("ClinicalSkillsChecklist"),
      ],
    },
    {
      category: "Workplace",
      items: [
        navItem("TimeOff", { badge: pendingTimeOffCount }),
      ],
    },
    {
      category: "Tools",
      items: [
        navItem("UserSettings"),
        navItem("OfflineMode"),
        navItem("Help"),
      ],
    },
  ], [unreadMessageCount, unreadSmsCount, pendingTimeOffCount]);

  const adminItems = useMemo(() => [
    { category: "Admin", items: [navItem("AdminOperations")] },
    {
      category: "Manage",
      items: [
        navItem("UserManagement"),
        navItem("AdminTraining"),
        navItem("ClinicalPathwayManager"),
      ]
    },
    { 
      category: "Analytics", 
      items: [
        navItem("ReportsAnalytics"),
        navItem("ComplianceCenter"),
        { name: "Alerts", icon: Bell, page: null, badge: unreadNotificationCount, action: () => setNotificationCenterOpen(true) },
      ] 
    },
    {
      category: "Configuration",
      items: [
        navItem("PatientDataManagement"),
        navItem("SecurityCompliance"),
      ]
    },
>>>>>>> origin/main

  // Build nav arrays from manifest, then inject runtime badges/actions
  const navCategories = useMemo(() => {
    const cats = buildNavCategories(NAV_MANIFEST);
    return cats.map(cat => ({
      ...cat,
      items: cat.items.map(({ _badgeKey, ...item }) => ({
        ...item,
        badge: _badgeKey ? (badgeValues[_badgeKey] ?? 0) : 0,
      })),
    }));
  }, [badgeValues]);

  const adminItems = useMemo(() => {
    const cats = buildAdminItems(NAV_MANIFEST);
    // Append the special Alerts action item to the Analytics category
    const withAlerts = cats.map(cat => {
      if (cat.category !== "Analytics") {
        return {
          ...cat,
          items: cat.items.map(({ _badgeKey, _actionKey, ...item }) => ({
            ...item,
            badge: _badgeKey ? (badgeValues[_badgeKey] ?? 0) : 0,
          })),
        };
      }
      return {
        ...cat,
        items: [
          ...cat.items.map(({ _badgeKey, _actionKey, ...item }) => ({
            ...item,
            badge: _badgeKey ? (badgeValues[_badgeKey] ?? 0) : 0,
          })),
          {
            name: "Alerts",
            icon: Bell,
            page: null,
            badge: unreadNotificationCount,
            action: actionHandlers.openNotifications,
          },
        ],
      };
    });
    return withAlerts;
  }, [badgeValues, actionHandlers, unreadNotificationCount]);

  const handleLogout = useCallback(async () => {
    try {
      await base44.entities.UserActivity.create({
        user_email: currentUser?.email, user_name: currentUser?.full_name, action: 'logout',
        device_type: /mobile|android|iphone/i.test(navigator.userAgent) ? 'mobile' : /tablet|ipad/i.test(navigator.userAgent) ? 'tablet' : 'desktop',
        details: { logout_time: new Date().toISOString(), user_role: currentUser?.role },
        user_agent: navigator.userAgent,
      });
    } catch {}
    // HIPAA: purge cached PHI before logging out (shared-device safety). Await
    // the storage purge so the IndexedDB clear isn't abandoned by the redirect.
    try { queryClientInstance.clear(); } catch { /* no-op */ }
    try { await clearCachedPHI(); } catch { /* no-op */ }
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
              <h1 className="text-2xl font-bold text-slate-900 mb-3">Account Pending Approval</h1>
              <p className="text-slate-600 mb-6">Your account has been created successfully. Please wait for an administrator to approve your access.</p>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-900"><strong>Account Details:</strong><br />{currentUser.full_name}<br />{currentUser.email}</p>
              </div>
              <p className="text-sm text-slate-500 mb-6">You will receive an email notification once your account is approved.</p>
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
      <Toaster position="top-right" richColors closeButton theme="light" />
      <a href="#main-content" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-[100] focus:bg-white focus:px-4 focus:py-2 focus:rounded-md focus:shadow-lg focus:text-blue-700 focus:font-medium">
        Skip to content
      </a>
      <CommandPalette isAdmin={isAdmin} />
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

        <main id="main-content" className="flex-1 overflow-x-hidden overflow-y-auto pt-16 md:pt-0 pb-20 md:pb-0 min-h-screen bg-gradient-to-br from-slate-50 via-slate-50/80 to-slate-100 w-0 md:w-auto">
          <div className="p-3 sm:p-4 md:p-5 lg:p-6 min-w-0 animate-fade-in">
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
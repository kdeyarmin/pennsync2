// Routes are defined in src/routes.jsx (the single source of truth shared with
// NavigationTracker). Not every page file under src/pages is routed — add a page
// to ROUTES there to make it reachable, or add a REDIRECT for a renamed page.

import './App.css'
import { lazy, Suspense } from 'react';
import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import VisualEditAgent from '@/lib/VisualEditAgent'
import NavigationTracker from '@/lib/NavigationTracker'
import OfflineManager from '@/components/offline/OfflineManager'
import { BrowserRouter as Router, Route, Routes, Navigate, useLocation } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import SignerPortal from '@/pages/SignerPortal';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from '@/components/Layout';
import ErrorBoundary from '@/components/utils/ErrorBoundary';
import { ROUTES, REDIRECTS, MAIN_PAGE } from '@/routes';
import { isSuperAdmin } from '@/lib/superAdmin';

// Public (no-login) patient telehealth join page.
const JoinTelehealth = lazy(() => import('@/pages/JoinTelehealth'));

const LayoutWrapper = ({ children, currentPageName }) => Layout ?
  <Layout currentPageName={currentPageName}>{children}</Layout>
  : <>{children}</>;

// Shown when a non-admin navigates directly to an admin-only route. Admin pages
// are hidden from the sidebar/palette for non-admins, but routes are reachable
// by URL, so this is the client-side authorization gate (server RLS is the real
// boundary). Rendered inside the layout so the user keeps their navigation.
const AdminOnlyFallback = () => (
  <div className="flex min-h-[60vh] flex-col items-center justify-center p-8 text-center">
    <h1 className="text-2xl font-bold text-slate-900">Administrator access required</h1>
    <p className="mt-2 max-w-md text-slate-600">
      You don’t have permission to view this page. If you believe this is a mistake,
      contact your agency administrator.
    </p>
  </div>
);

const AuthenticatedApp = () => {
  const location = useLocation();
  const { user, isLoadingAuth, isLoadingPublicSettings, authError, isAuthenticated, navigateToLogin } = useAuth();
  // The platform super admin (owner email or super_admin account_type) reaches
  // admin routes even before their `role` is `admin`. This is what lets the
  // owner land on SuperAdminConfig on first sign-in so its ensureSuperAdmin
  // self-bootstrap can run — without it, an unpromoted owner hits the
  // AdminOnlyFallback and the chicken-and-egg never resolves.
  const isAdmin = user?.role === 'admin' || isSuperAdmin(user);

  // Public patient join/signer routes render WITHOUT authentication — they are
  // gated by capability tokens in the link, not by an app login. This is
  // checked before the auth gate below so external users are never bounced to login.
  const normalizedPath = location.pathname.toLowerCase();
  if (normalizedPath.startsWith('/join') || normalizedPath.startsWith('/signer')) {
    return (
      <Suspense fallback={
        <div className="fixed inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-4 border-slate-200 border-t-navy-700 rounded-full animate-spin"></div>
        </div>
      }>
        <Routes>
          <Route path="/join" element={<JoinTelehealth />} />
          <Route path="/signer" element={<SignerPortal />} />
        </Routes>
      </Suspense>
    );
  }

  // Show loading spinner while checking app public settings or auth
  if (isLoadingPublicSettings || isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-navy-700 rounded-full animate-spin"></div>
      </div>
    );
  }

  // Handle authentication errors
  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      // Redirect to login automatically
      navigateToLogin();
      return null;
    }
  }

  // Gate the whole app on authentication. The no-token path does NOT set an
  // authError, so without this an unauthenticated user would render every
  // route and fire PHI queries. Never rely on authError alone here.
  if (!isAuthenticated) {
    navigateToLogin();
    return null;
  }

  // Render the main app
  return (
    <Suspense fallback={
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-navy-700 rounded-full animate-spin"></div>
      </div>
    }>
      <Routes>
        <Route path="/" element={<Navigate to={`/${MAIN_PAGE}`} replace />} />
        {ROUTES.map(({ name, Component, adminOnly }) => (
          <Route
            key={name}
            path={`/${name}`}
            element={
              <LayoutWrapper currentPageName={name}>
                {/* Per-route boundary: a render error in one page shows a
                    contained error here while the nav shell stays mounted, and
                    navigating to another route remounts a fresh boundary (no
                    full-app reload). The app-level boundary in App() still
                    catches errors in the layout/providers themselves. */}
                <ErrorBoundary key={name}>
                  {adminOnly && !isAdmin ? <AdminOnlyFallback /> : <Component />}
                </ErrorBoundary>
              </LayoutWrapper>
            }
          />
        ))}
        {REDIRECTS.map(({ from, to }) => (
          <Route key={from} path={from} element={<Navigate to={to} replace />} />
        ))}
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Suspense>
  );
};


function App() {

  return (
    <ErrorBoundary>
      <AuthProvider>
        <QueryClientProvider client={queryClientInstance}>
          <Router>
            <NavigationTracker />
            <AuthenticatedApp />
          </Router>
          <Toaster />
          <OfflineManager />
          <VisualEditAgent />
        </QueryClientProvider>
      </AuthProvider>
    </ErrorBoundary>
  )
}

export default App